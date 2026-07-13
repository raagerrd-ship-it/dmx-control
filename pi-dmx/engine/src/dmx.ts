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
  private lastSent = 0;
  private minIntervalMs = 5;   // 200 Hz default; overridden by setMaxHz()

  constructor(private sockPath = "/run/dmx.sock") {
    this.connect();
  }

  setMaxHz(hz: number) {
    const clamped = Math.max(30, Math.min(500, hz | 0));
    this.minIntervalMs = 1000 / clamped;
  }

  private connect() {
    const s = new Socket();
    s.connect(this.sockPath);
    s.on("connect", () => { this.connected = true; });
    s.on("error", (e) => {
      this.connected = false;
      if ((e as NodeJS.ErrnoException).code === "ECONNREFUSED"
          || (e as NodeJS.ErrnoException).code === "ENOENT") {
        setTimeout(() => this.connect(), 1000);
      }
    });
    s.on("close", () => {
      this.connected = false;
      setTimeout(() => this.connect(), 1000);
    });
    this.sock = s;
  }

  /**
   * Send the first `slots` bytes of `universe` (typically the top-most
   * used channel). Rate-limited to dmxMaxHz.
   */
  send(universe: Uint8Array, slots: number) {
    if (!this.connected || !this.sock) return;
    const now = performance.now();
    if (now - this.lastSent < this.minIntervalMs) return;
    this.lastSent = now;

    const n = Math.max(24, Math.min(512, slots | 0));
    const out = Buffer.allocUnsafe(2 + n);
    out[0] = n & 0xff;
    out[1] = (n >> 8) & 0xff;
    out.set(universe.subarray(0, n), 2);
    this.sock.write(out);
  }

  close() { this.sock?.destroy(); this.sock = null; }
}
