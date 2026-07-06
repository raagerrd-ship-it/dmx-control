/**
 * Sends 512-byte DMX universes to the C sidecar over a Unix STREAM socket.
 * Fixed-length frames, no framing header needed.
 *
 * Auto-reconnects if the sidecar restarts. Rate-limited to 200 Hz push;
 * the sidecar handles its own 40 Hz refresh regardless.
 */

import { Socket } from "node:net";

export class DmxSender {
  private sock: Socket | null = null;
  private connected = false;
  private lastSent = 0;
  private readonly minIntervalMs = 5;

  constructor(private sockPath = "/run/dmx.sock") {
    this.connect();
  }

  private connect() {
    const s = new Socket();
    s.connect(this.sockPath);
    s.on("connect", () => { this.connected = true; });
    s.on("error", (e) => {
      this.connected = false;
      // Retry — sidecar may not be up yet, or restarted
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

  send(universe: Uint8Array) {
    if (!this.connected || !this.sock) return;
    const now = performance.now();
    if (now - this.lastSent < this.minIntervalMs) return;
    this.lastSent = now;
    this.sock.write(Buffer.from(universe.buffer, universe.byteOffset, universe.byteLength));
  }

  close() { this.sock?.destroy(); this.sock = null; }
}
