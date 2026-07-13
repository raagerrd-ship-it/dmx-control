/**
 * Physical push-button → cycle through modes.
 *
 * Uses `gpiomon` from libgpiod (apt install gpiod) as a subprocess — no
 * native Node addon to maintain. Wires up internal pull-up bias so you only
 * need one wire from the GPIO to GND through a normally-open push-button.
 *
 * Debounced: ignores repeat edges within `debounceMs`.
 */

import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";

export interface ButtonOptions {
  chip: string;              // e.g. "gpiochip0"
  line: number;              // BCM GPIO number (e.g. 17 = pin 11)
  debounceMs?: number;       // edge-level noise filter, default 40
  longPressMs?: number;      // hold threshold for long-press, default 700
  minPressIntervalMs?: number; // rate-limit between emitted "press" events, default 300
}

/**
 * Emits:
 *   "press"     — short click (release before longPressMs)
 *   "longPress" — held longer than longPressMs (fires on release)
 */
export class Button extends EventEmitter {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private stopped = false;
  private lastEdge = 0;
  private lastPressEmit = 0;
  private pressedAt: number | null = null;

  constructor(private opts: ButtonOptions) { super(); }

  start() {
    this.stopped = false;
    this.spawn();
  }

  stop() {
    this.stopped = true;
    this.proc?.kill("SIGTERM");
    this.proc = null;
  }

  private spawn() {
    // libgpiod v1 gpiomon: watch both edges so we can time press-and-hold.
    // Pull-up wired to GND: falling = press (event "2"), rising = release ("1").
    const args = [
      "--bias=pull-up",
      "--rising-edge",
      "--falling-edge",
      "--format=%e",
      this.opts.chip,
      String(this.opts.line),
    ];
    const p = spawn("gpiomon", args, { stdio: ["ignore", "pipe", "pipe"] });
    this.proc = p;

    const debounceMs = this.opts.debounceMs ?? 40;
    const longPressMs = this.opts.longPressMs ?? 700;

    let buf = "";
    p.stdout.on("data", (b) => {
      buf += b.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        const now = performance.now();
        if (now - this.lastEdge < debounceMs) continue;
        this.lastEdge = now;
        if (line === "2") {
          // Falling → button pressed down.
          this.pressedAt = now;
        } else if (line === "1") {
          // Rising → released.
          if (this.pressedAt == null) continue;
          const held = now - this.pressedAt;
          this.pressedAt = null;
          if (held >= longPressMs) this.emit("longPress");
          else this.emit("press");
        }
      }
    });
    p.stderr.on("data", (b) => {
      const s = b.toString().trim();
      if (s) this.emit("stderr", s);
    });
    p.on("exit", (code) => {
      this.emit("exit", code);
      if (!this.stopped) setTimeout(() => this.spawn(), 2000);
    });
  }
}
