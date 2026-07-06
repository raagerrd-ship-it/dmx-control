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
  chip: string;          // e.g. "gpiochip0"
  line: number;          // BCM GPIO number (e.g. 17 = pin 11)
  debounceMs?: number;   // default 80
}

export class Button extends EventEmitter {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private stopped = false;
  private lastEdge = 0;

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
    // gpiomon (libgpiod v1) or gpio-mon (v2). Use v1 syntax which is the
    // apt default on Bookworm. Falling edge = press (pull-up wired to GND).
    const args = [
      "--bias=pull-up",
      "--falling-edge",
      "--format=%e",   // print just edge kind per event
      this.opts.chip,
      String(this.opts.line),
    ];
    const p = spawn("gpiomon", args, { stdio: ["ignore", "pipe", "pipe"] });
    this.proc = p;

    p.stdout.on("data", () => {
      const now = performance.now();
      if (now - this.lastEdge < (this.opts.debounceMs ?? 80)) return;
      this.lastEdge = now;
      this.emit("press");
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
