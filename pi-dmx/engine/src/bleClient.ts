/**
 * Engine-side Unix-socket client for the BLE sidecar.
 *
 * The engine renders DMX at 100 Hz. We forward the rig's dominant color to
 * the sidecar at up to 60 Hz — the sidecar has its own per-strip rate
 * limiter, so oversampling here is harmless and keeps latency low when a
 * new mood arrives between DMX frames.
 *
 * Failure model: if the socket isn't there (sidecar down, no bluetooth
 * hardware, first boot before install) every call is a no-op. The engine
 * MUST NOT know or care whether BLE is running. Reconnect is silent.
 */

import net from "node:net";

const SOCK = "/run/pi-dmx/ble.sock";
const MIN_SEND_MS = 16;     // ~60 Hz cap on the wire

export interface BlePairedDevice {
  mac: string;
  name: string;
  chip: "bledom" | "unknown";
  connected: boolean;
}
export interface BleScanDevice {
  mac: string;
  name: string;
  chip: "bledom" | "unknown";
  rssi: number;
}
export interface BleClientListeners {
  onPaired?: (devices: BlePairedDevice[]) => void;
  onScan?:   (devices: BleScanDevice[]) => void;
  onActive?: (count: number) => void;
}

export class BleClient {
  private sock: net.Socket | null = null;
  private buf = "";
  private lastSendMs = 0;
  private connectTimer: NodeJS.Timeout | null = null;
  private listeners: BleClientListeners = {};
  private knownOnConnect: unknown[] = [];   // engine's persisted paired list
  public activeCount = 0;
  public pairedCache: BlePairedDevice[] = [];

  setListeners(l: BleClientListeners) { this.listeners = l; }
  setKnownDevices(devices: unknown[]) { this.knownOnConnect = devices; this.send({ type: "setKnown", devices }); }

  start() { this.connect(); }

  private connect() {
    if (this.sock) return;
    const s = net.createConnection(SOCK);
    s.on("connect", () => {
      this.sock = s;
      // Reply with our persisted list so the sidecar can restore state
      // after a respawn without asking anyone.
      if (this.knownOnConnect.length) this.send({ type: "setKnown", devices: this.knownOnConnect });
      this.send({ type: "paired" });
    });
    s.on("data", (chunk) => {
      this.buf += chunk.toString();
      let nl;
      while ((nl = this.buf.indexOf("\n")) >= 0) {
        const line = this.buf.slice(0, nl);
        this.buf = this.buf.slice(nl + 1);
        if (!line.trim()) continue;
        try { this.handle(JSON.parse(line)); } catch { /* */ }
      }
    });
    const drop = () => {
      if (this.sock === s) this.sock = null;
      // Backoff: sidecar respawn is ~3 s, don't hammer.
      if (!this.connectTimer) this.connectTimer = setTimeout(() => { this.connectTimer = null; this.connect(); }, 2000);
    };
    s.on("close", drop);
    s.on("error", () => { /* logged via close */ });
  }

  private handle(msg: any) {
    if (msg.type === "paired") { this.pairedCache = msg.devices || []; this.listeners.onPaired?.(this.pairedCache); }
    else if (msg.type === "scanResults") { this.listeners.onScan?.(msg.devices || []); }
    else if (msg.type === "active") { this.activeCount = msg.count || 0; this.listeners.onActive?.(this.activeCount); }
  }

  private send(obj: unknown) {
    if (!this.sock) return;
    try { this.sock.write(JSON.stringify(obj) + "\n"); } catch { /* dropped */ }
  }

  /** r/g/b/brightness all 0..1 — sidecar does gamma + premultiply. */
  setColor(r: number, g: number, b: number, brightness: number) {
    const now = performance.now();
    if (now - this.lastSendMs < MIN_SEND_MS) return;
    this.lastSendMs = now;
    // Engine speaks in 0..1 floats; sidecar converts to 0..255 bytes.
    this.send({ type: "color", r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), brightness });
  }

  scan() { this.send({ type: "scan" }); }
  pair(mac: string) { this.send({ type: "pair", mac }); }
  unpair(mac: string) { this.send({ type: "unpair", mac }); }
}
