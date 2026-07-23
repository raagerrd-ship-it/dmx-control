/**
 * BLE sidecar for pi-dmx.
 *
 * Owns hci0 exclusively and pushes RGB frames to paired BLEDOM strips at up
 * to ~60 Hz. Lives in its own process pinned to CPU 0 so noble's scan/GATT
 * spikes never touch the ALSA loop (cores 1-2) or dmx-helper (core 3, hard
 * real-time PL011 timing). If noble crashes on a bad connection it takes
 * only this process down; systemd respawns it while DMX keeps playing.
 *
 * Protocol on /run/pi-dmx/ble.sock (line-delimited JSON, both directions):
 *   engine → sidecar
 *     {type:"color", r, g, b, brightness}   set target for all paired
 *     {type:"scan"}                         start 8 s scan (returns "scanResults")
 *     {type:"pair",   mac}                  connect + remember + write test frame
 *     {type:"unpair", mac}                  disconnect + forget
 *     {type:"paired"}                       ask for current paired list
 *     {type:"setKnown", devices}            engine's persisted list on boot
 *   sidecar → engine
 *     {type:"scanResults", devices:[{mac,name,chip,rssi}]}
 *     {type:"paired",      devices:[{mac,name,chip,connected}]}
 *     {type:"active",      count}           count of connected paired strips
 *
 * BLEDOM packet (single characteristic write, no response):
 *   [0x7e, 0x00, 0x05, 0x03, R, G, B, 0x00, 0xef]
 * There is also a brightness command (0x01) but shipping brightness inside
 * RGB (pre-multiplied) keeps the pipeline to ONE write per frame per strip
 * → half the airtime, and matches Lotus.
 */

import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import noble from "@abandonware/noble";

const SOCK = "/run/pi-dmx/ble.sock";

// BLEDOM write characteristic (see Lotus project — same across every clone
// we've tested). If a strip doesn't respond it just gets flagged "unknown"
// and we stop wasting airtime on it.
const BLEDOM_SERVICE = "fff0";
const BLEDOM_CHAR    = "fff3";

// Rate limit per strip. BLEDOM chips choke over ~30 writes/s and start
// stuttering; 16 ms (~60 Hz) is the sweet spot Lotus settled on. keep-alive
// forces one write every second even during silence so the connection
// interval negotiation stays healthy.
const MIN_WRITE_INTERVAL_MS = 16;
const KEEPALIVE_MS = 1000;

type Chip = "bledom" | "unknown";

interface StripCal {
  rGain: number;         // 0..1 per-channel vitbalans
  gGain: number;
  bGain: number;
  maxBrightness: number; // 0..1 global tak för slingan
}
const DEFAULT_CAL: StripCal = { rGain: 1, gGain: 1, bGain: 1, maxBrightness: 1 };

interface Strip {
  mac: string;
  name: string;
  chip: Chip;
  peripheral: any | null;
  char: any | null;
  lastWriteMs: number;
  lastFrame: [number, number, number];      // last (r,g,b) actually sent
  target:    [number, number, number];      // next (r,g,b) requested
  connecting: boolean;
  identifyUntil: number;                    // 0 = normal; >now = blinka i identifieringsfärg
  transient: boolean;                        // true = added by identify, drop after blink om ej parad
  cal: StripCal;                             // per-slinga vitbalans + max-ljus
}

const known = new Map<string, Strip>();     // paired, persisted list
const seen  = new Map<string, { name: string; chip: Chip; rssi: number }>();
let target: [number, number, number] = [0, 0, 0];
let clients: net.Socket[] = [];

/* ─────────────── noble lifecycle ─────────────── */

let nobleReady = false;
noble.on("stateChange", (state: string) => {
  nobleReady = state === "poweredOn";
  if (!nobleReady) console.error("[ble] adapter state:", state);
});

// Any advertisement whose name looks BLEDOM-ish. Chinese clones use a
// handful of prefixes; we accept them all and mark the rest "unknown" so
// they still show up in the setup UI (dimmed) instead of vanishing.
const BLEDOM_NAME = /^(ELK-BLEDOM|MELK|LEDBLE|LED|MohuanLED|KLED|LEDnet|Triones)/i;

noble.on("discover", (p: any) => {
  const name = p.advertisement?.localName || "";
  const chip: Chip = BLEDOM_NAME.test(name) ? "bledom" : "unknown";
  const mac = normalizeMac(p.address);
  if (!mac) return;
  seen.set(mac, { name, chip, rssi: p.rssi });
});

/* ─────────────── connection management ─────────────── */

async function connect(strip: Strip): Promise<boolean> {
  if (strip.connecting || strip.char) return !!strip.char;
  if (!nobleReady) return false;
  strip.connecting = true;
  try {
    // noble caches peripherals internally; if we lost it (adapter reset),
    // trigger a short scan so it re-surfaces before connect() throws.
    if (!strip.peripheral) {
      await new Promise<void>((res) => {
        const done = () => { noble.removeListener("discover", h); noble.stopScanning(); res(); };
        const h = (p: any) => { if (normalizeMac(p.address) === strip.mac) { strip.peripheral = p; done(); } };
        noble.on("discover", h);
        noble.startScanning([], false);
        setTimeout(done, 4000);
      });
    }
    if (!strip.peripheral) { strip.connecting = false; return false; }
    await strip.peripheral.connectAsync();
    const { characteristics } = await strip.peripheral
      .discoverSomeServicesAndCharacteristicsAsync([BLEDOM_SERVICE], [BLEDOM_CHAR]);
    strip.char = characteristics[0] ?? null;
    strip.peripheral.once("disconnect", () => {
      strip.char = null;
      // Auto-reconnect after a small backoff. Random-jittered so 10 strips
      // dropping at once don't stampede the radio.
      setTimeout(() => { connect(strip).catch(() => {}); }, 800 + Math.random() * 1500);
    });
  } catch (e) {
    console.error("[ble] connect", strip.mac, (e as Error).message);
    strip.char = null;
  }
  strip.connecting = false;
  broadcastPaired();
  broadcastActive();
  return !!strip.char;
}

async function writeStrip(strip: Strip, r: number, g: number, b: number) {
  if (!strip.char || strip.chip !== "bledom") return;
  const now = Date.now();
  if (now - strip.lastWriteMs < MIN_WRITE_INTERVAL_MS) return;
  // Skip writes that would just re-send the last frame (except keep-alive).
  const [pr, pg, pb] = strip.lastFrame;
  const changed = pr !== r || pg !== g || pb !== b;
  if (!changed && now - strip.lastWriteMs < KEEPALIVE_MS) return;
  const pkt = Buffer.from([0x7e, 0x00, 0x05, 0x03, r, g, b, 0x00, 0xef]);
  try {
    await strip.char.writeAsync(pkt, true);   // withoutResponse: half airtime
    strip.lastWriteMs = now;
    strip.lastFrame = [r, g, b];
  } catch (e) {
    // Write failed → char likely stale after a silent drop. Force reconnect.
    strip.char = null;
    console.error("[ble] write", strip.mac, (e as Error).message);
  }
}

/* ─────────────── render loop ─────────────── */

// Single loop that services every paired strip. Runs at ~60 Hz; each strip
// is written at most once per MIN_WRITE_INTERVAL_MS. Node's async writes are
// enqueued in parallel — no strip blocks another.
setInterval(() => {
  const [gr, gg, gb] = target;
  const now = Date.now();
  for (const strip of known.values()) {
    // Identify: en distinkt magenta-puls så användaren enkelt ser vilken
    // fysisk slinga en post i listan motsvarar. Pulsar ~1.5 Hz.
    let r = gr, g = gg, b = gb;
    if (strip.identifyUntil > now) {
      const phase = 0.5 - 0.5 * Math.cos((now / 1000) * Math.PI * 3); // 0..1 @ ~1.5 Hz
      const v = Math.round(60 + phase * 195);
      r = v; g = 0; b = v;                              // magenta-puls
    } else if (strip.identifyUntil !== 0) {
      // Identify just klar
      strip.identifyUntil = 0;
      if (strip.transient) {
        // Aldrig parad → koppla ner och glöm
        if (strip.peripheral) { try { strip.peripheral.disconnectAsync(); } catch { /* */ } }
        known.delete(strip.mac);
        broadcastPaired();
        broadcastActive();
        continue;
      }
    }
    if (strip.char) writeStrip(strip, r, g, b).catch(() => {});
    else connect(strip).catch(() => {});   // idempotent, guarded by .connecting
  }
}, 16);

/* ─────────────── socket protocol ─────────────── */

function send(sock: net.Socket, obj: unknown) {
  try { sock.write(JSON.stringify(obj) + "\n"); } catch { /* client gone */ }
}
function broadcast(obj: unknown) {
  const line = JSON.stringify(obj) + "\n";
  for (const c of clients) { try { c.write(line); } catch { /* */ } }
}
function pairedSnapshot() {
  return [...known.values()].map((s) => ({
    mac: s.mac, name: s.name, chip: s.chip, connected: !!s.char,
  }));
}
function broadcastPaired() { broadcast({ type: "paired", devices: pairedSnapshot() }); }
function broadcastActive() {
  let n = 0;
  for (const s of known.values()) if (s.char) n++;
  broadcast({ type: "active", count: n });
}

function normalizeMac(mac: string): string {
  return (mac || "").toLowerCase().replace(/-/g, ":");
}

async function handle(sock: net.Socket, msg: any) {
  if (msg.type === "color") {
    // brightness is 0..1; premultiply into RGB so BLEDOM only sees one
    // channel of dynamics. Saves a whole packet per frame vs. sending both.
    const br = clamp01(msg.brightness ?? 1);
    target = [
      byte((msg.r ?? 0) * br),
      byte((msg.g ?? 0) * br),
      byte((msg.b ?? 0) * br),
    ];
    return;
  }
  if (msg.type === "paired") { send(sock, { type: "paired", devices: pairedSnapshot() }); return; }
  if (msg.type === "setKnown" && Array.isArray(msg.devices)) {
    // Engine boot handshake — restore persisted list.
    for (const d of msg.devices) {
      const mac = normalizeMac(d.mac);
      if (!mac) continue;
      const existing = known.get(mac);
      if (existing) { existing.transient = false; continue; }
      known.set(mac, {
        mac, name: d.name || mac, chip: d.chip === "bledom" ? "bledom" : "unknown",
        peripheral: null, char: null, lastWriteMs: 0, lastFrame: [-1, -1, -1],
        target: [0, 0, 0], connecting: false, identifyUntil: 0, transient: false,
      });
    }
    broadcastPaired();
    return;
  }
  if (msg.type === "scan") {
    if (!nobleReady) { send(sock, { type: "scanResults", devices: [], error: "adapter off" }); return; }
    seen.clear();
    noble.startScanning([], true);
    setTimeout(() => {
      noble.stopScanning();
      const devices = [...seen.entries()].map(([mac, v]) => ({ mac, ...v }));
      send(sock, { type: "scanResults", devices });
    }, 8000);
    return;
  }
  if (msg.type === "pair" && typeof msg.mac === "string") {
    const mac = normalizeMac(msg.mac);
    const existing = known.get(mac);
    if (existing) {
      // Kan ha lagts till transient via "identify" — markera nu som permanent.
      existing.transient = false;
    } else {
      const s = seen.get(mac);
      known.set(mac, {
        mac, name: s?.name || mac, chip: s?.chip || "unknown",
        peripheral: null, char: null, lastWriteMs: 0, lastFrame: [-1, -1, -1],
        target: [0, 0, 0], connecting: false, identifyUntil: 0, transient: false,
      });
    }
    const strip = known.get(mac)!;
    await connect(strip);
    return;
  }
  if (msg.type === "identify" && typeof msg.mac === "string") {
    // "Blinka lampan" — hjälp användaren identifiera vilken fysisk slinga
    // en post i listan motsvarar. Skapar transient-post om ej redan parad.
    const mac = normalizeMac(msg.mac);
    const durationMs = Math.max(1000, Math.min(15000, msg.durationMs ?? 6000));
    if (!known.has(mac)) {
      const s = seen.get(mac);
      known.set(mac, {
        mac, name: s?.name || mac, chip: s?.chip || "unknown",
        peripheral: null, char: null, lastWriteMs: 0, lastFrame: [-1, -1, -1],
        target: [0, 0, 0], connecting: false, identifyUntil: 0, transient: true,
      });
    }
    const strip = known.get(mac)!;
    strip.identifyUntil = Date.now() + durationMs;
    connect(strip).catch(() => {});
    return;
  }
  if (msg.type === "unpair" && typeof msg.mac === "string") {
    const mac = normalizeMac(msg.mac);
    const strip = known.get(mac);
    if (strip?.peripheral) { try { await strip.peripheral.disconnectAsync(); } catch { /* */ } }
    known.delete(mac);
    broadcastPaired();
    broadcastActive();
    return;
  }
}

/* ─────────────── server ─────────────── */

function ensureSockDir() {
  try { fs.mkdirSync(path.dirname(SOCK), { recursive: true }); } catch { /* */ }
  try { fs.unlinkSync(SOCK); } catch { /* */ }
}

ensureSockDir();
const server = net.createServer((sock) => {
  clients.push(sock);
  let buf = "";
  sock.on("data", (chunk) => {
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (!line.trim()) continue;
      try { handle(sock, JSON.parse(line)); } catch { /* ignore malformed */ }
    }
  });
  sock.on("close", () => { clients = clients.filter((c) => c !== sock); });
  sock.on("error", () => { /* client gone */ });
});
server.listen(SOCK, () => {
  try { fs.chmodSync(SOCK, 0o666); } catch { /* */ }
  console.log("[ble] listening on", SOCK);
});

function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function byte(x: number) { return Math.max(0, Math.min(255, Math.round(x))); }
