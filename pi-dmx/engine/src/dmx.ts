/**
 * Sends variable-length DMX frames to the C sidecar over a Unix STREAM socket.
 * Wire protocol per frame:
 *   [2 bytes LE: slot count N]  [N bytes: DMX slots 1..N]
 * 24 <= N <= 512. Fewer slots → shorter wire time → higher achievable refresh.
 *
 * Auto-reconnects if the sidecar restarts. Rate-limited by dmxMaxHz;
 * the sidecar caps its own refresh at 200 Hz regardless.
 */

import { Socket } from "node:net";

export class DmxSender {
  private sock: Socket | null = null;
  private connected = false;
  private closed = false;             // close() begärd → sluta återansluta
  private reconnectScheduled = false; // undvik dubbla reconnect-timers
  private lastSent = 0;
  private minIntervalMs = 5;   // 200 Hz default; overridden by setMaxHz()
  // Pre-allokerad wire-buffert (max: 512 kanaler + 2 bytes header). Återanvänds
  // per frame → ingen Buffer-wrapper-alloc/frame. SÄKER ENBART pga drop-guarden i
  // send(): `writableLength > 0 → return` garanterar att en pågående write() har
  // släppt bufferten (kärnan har kopierat ut den) innan vi skriver över den nästa
  // frame. INFÖR ALDRIG en send-kö utan att först ge varje kö-post en egen buffert.
  private outBuf = Buffer.alloc(514);
  /** Vyn som skrivs (header + n kanaler) - skapas bara nar n andras (skrapjakten 10-01: forr tva nya vyer per ram). */
  private outView: Buffer = this.outBuf.subarray(0, 2);
  private outN = -1;

  constructor(private sockPath = "/run/dmx.sock") {
    this.connect();
  }

  setMaxHz(hz: number) {
    const clamped = Math.max(30, Math.min(500, hz | 0));
    this.minIntervalMs = 1000 / clamped;
  }

  /** True när sockeln mot dmx-helper är öppen. UI:t visar en varningsbanner
   *  om helpern är nere så hyresgästen ser problemet innan showen. */
  isConnected() { return this.connected; }

  private scheduleReconnect() {
    // EN reconnect åt gången: en misslyckad anslutning avger BÅDE 'error' och
    // 'close', och en tappad anslutning 'close' — utan denna vakt schemalade
    // varje event en ny connect() → socketarna dubblades varje sekund (fd-storm).
    if (this.closed || this.reconnectScheduled) return;
    this.reconnectScheduled = true;
    setTimeout(() => { this.reconnectScheduled = false; this.connect(); }, 1000);
  }

  private connect() {
    if (this.closed) return;
    const s = new Socket();
    s.connect(this.sockPath);
    s.on("connect", () => { this.connected = true; });
    s.on("error", () => { this.connected = false; });   // 'close' följer och driver den enda reconnecten
    s.on("close", () => { this.connected = false; this.scheduleReconnect(); });
    this.sock = s;
  }

  /**
   * Send the first `slots` bytes of `universe` (typically the top-most
   * used channel). Rate-limited to dmxMaxHz.
   */
  send(universe: Uint8Array, slots: number) {
    if (!this.connected || !this.sock) return;
    // No queue: if the previous frame hasn't flushed to the sidecar yet, drop
    // this one. Guarantees the wire always carries the LATEST frame, never a
    // growing backlog (which read as accumulating light latency).
    if (this.sock.writableLength > 0) return;
    const now = performance.now();
    if (now - this.lastSent < this.minIntervalMs) return;
    this.lastSent = now;

    const n = Math.max(24, Math.min(512, slots | 0));
    this.outBuf[0] = n & 0xff;
    this.outBuf[1] = (n >> 8) & 0xff;
    // = outBuf.set(universe.subarray(0, n), 2) utan ny vy: kopiera hogst universe.length, resten ororda som forr
    const m = n < universe.length ? n : universe.length;
    for (let i = 0; i < m; i++) this.outBuf[2 + i] = universe[i];
    if (n !== this.outN) { this.outN = n; this.outView = this.outBuf.subarray(0, 2 + n); }
    this.sock.write(this.outView);   // samma vy over outBuf, ingen kopia — säker pga guarden ovan
  }

  close() { this.closed = true; this.sock?.destroy(); this.sock = null; }
}
