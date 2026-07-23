/**
 * KY-040 rotary encoder → stämnings-intensitet 0..1 (Chill → Galet).
 *
 * Följer samma mönster som `button.ts`: spawn `gpiomon` från libgpiod som
 * subprocess, ingen native addon. Två linjer bevakas samtidigt (CLK + DT) med
 * `--format="%e %o"` så vi vet edge-typ OCH offset per event. Kvadratur-
 * avkodning: på fallande CLK avgör DT:s senaste-kända logic-nivå riktningen.
 *
 *   DT hög på CLK↓ → medurs (+step)     KY-040 är pull-up (aktiv låg)
 *   DT låg på CLK↓ → moturs  (–step)
 *
 * Debounce: `debounceMs` mellan CLK-flanker (mekanisk kontakt studsar
 * ~1–2 ms — 3 ms räcker). Step: 0.05 per detent = 20 steg mellan 0 och 1
 * (matchar hyresgäst-uppfattningen "vred 1..10" med enkla halv-steg).
 *
 * Push-knappen (SW) hanteras separat via befintliga `Button`-klassen (se
 * index.ts) — den använder redan gpiomon på ett enda ben.
 */

import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { EventEmitter } from "node:events";

export interface IntensityKnobOptions {
  chip: string;           // "gpiochip0"
  clk: number;            // BCM GPIO för CLK
  dt: number;             // BCM GPIO för DT
  debounceMs?: number;    // default 3
  stepPerDetent?: number; // default 0.05 (20 detents över 0..1)
  initial?: number;       // startvärde 0..1 (default 0.5 = Fest)
}

/** Emits "change" med det nya värdet (clamped 0..1). */
export class IntensityKnob extends EventEmitter {
  private proc: ChildProcessByStdio<null, Readable, Readable> | null = null;
  private stopped = false;
  private value: number;
  private lastClkEdge = 0;
  private dtState = 1; // KY-040 pull-up: vilar högt

  constructor(private opts: IntensityKnobOptions) {
    super();
    this.value = Math.max(0, Math.min(1, opts.initial ?? 0.5));
  }

  get() { return this.value; }

  /** Extern setter (t.ex. UI skickar setIntensity). Broadcastar INTE change. */
  set(v: number) { this.value = Math.max(0, Math.min(1, v)); }

  start() { this.stopped = false; this.spawn(); }
  stop()  { this.stopped = true; this.proc?.kill("SIGTERM"); this.proc = null; }

  private spawn() {
    // Bevaka BÅDA benen. `%e` = 1 (rising) / 2 (falling); `%o` = offset (line).
    const args = [
      "--bias=pull-up",
      "--rising-edge",
      "--falling-edge",
      "--format=%e %o",
      this.opts.chip,
      String(this.opts.clk),
      String(this.opts.dt),
    ];
    const p = spawn("gpiomon", args, { stdio: ["ignore", "pipe", "pipe"] });
    this.proc = p;

    const debounceMs = this.opts.debounceMs ?? 3;
    const step = this.opts.stepPerDetent ?? 0.05;

    let buf = "";
    p.stdout.on("data", (b) => {
      buf += b.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const raw = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!raw) continue;
        const [edgeStr, offStr] = raw.split(/\s+/);
        const edge = Number(edgeStr);        // 1=rising, 2=falling
        const off  = Number(offStr);         // GPIO-nummer
        if (!Number.isFinite(edge) || !Number.isFinite(off)) continue;

        if (off === this.opts.dt) {
          // Spåra DT-nivån så vi kan läsa den vid CLK-flanken.
          this.dtState = edge === 1 ? 1 : 0;
          continue;
        }
        if (off !== this.opts.clk) continue;

        // KY-040: läs bara fallande CLK → en detent per hakk.
        if (edge !== 2) continue;
        const now = performance.now();
        if (now - this.lastClkEdge < debounceMs) continue;
        this.lastClkEdge = now;

        // Fallande CLK: DT hög = CW (öka), DT låg = CCW (minska).
        const dir = this.dtState === 1 ? +1 : -1;
        const next = Math.max(0, Math.min(1, this.value + dir * step));
        if (next !== this.value) {
          this.value = next;
          this.emit("change", this.value);
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
    p.on("error", (err) => {
      this.emit("stderr", `spawn: ${(err as Error).message}`);
      if (!this.stopped) setTimeout(() => this.spawn(), 2000);
    });
  }
}
