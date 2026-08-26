/**
 * ALSA capture via `arecord` subprocess. Simplest reliable path — no native
 * addon to maintain, ~15 ms latency which is well within our 40-80 ms budget.
 *
 * Emits Float32 mono samples (L+R averaged) in fixed-size chunks matching
 * the analyser's hop size. Auto-restarts on subprocess exit.
 */

import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { EventEmitter } from "node:events";

export interface AudioCaptureOptions {
  device: string;
  rate: number;
  channels: 1 | 2;
  hopSamples: number;   // emit chunks of this many mono samples
}

export class AudioCapture extends EventEmitter {
  private proc: ChildProcessByStdio<null, Readable, Readable> | null = null;
  private stopped = false;
  private leftover: Buffer = Buffer.alloc(0);
  private readonly bytesPerFrame: number;   // S16LE = 2 bytes/sample × channels
  private readonly chunkBytes: number;
  /** Katastrofgräns: bara när ETT batch bär mer ljud än så är det så gammalt att
   *  en lucka är bättre än att spela det. MÄTT: normala batchar når 32 ms, värsta
   *  vid uppstart 163 ms, och enstaka event-loop-stalls ger 341 ms → 1500 ms ger
   *  4× marginal till det värsta uppmätta. Ren försäkring, fyrar aldrig i drift. */
  private static readonly STALE_MS = 1500;
  /** TYST STALL: arecord kan LEVA men sluta leverera (ALSA-enheten hänger, t.ex.
   *  när codec-zero:n byter ingång under drift). Då fyrar varken 'exit' eller
   *  'error', så den befintliga respawn-vägen ser ingenting — riggen tonar ned
   *  till svart och står så tills någon startar om tjänsten. Vakten dödar
   *  processen i stället; 'exit'-handlern respawnar den om 1 s.
   *  1500 ms = samma marginal som STALE_MS (värsta uppmätta batch-lucka 341 ms). */
  private static readonly STALL_MS = 1500;
  private lastDataAt = 0;
  private stallTimer: NodeJS.Timeout | null = null;
  /** Se toMonoFloat32: återanvänd mono-buffert, giltig bara under 'chunk'-handlern. */
  private readonly mono: Float32Array;

  constructor(private opts: AudioCaptureOptions) {
    super();
    this.bytesPerFrame = 2 * opts.channels;
    this.chunkBytes = opts.hopSamples * this.bytesPerFrame;
    this.mono = new Float32Array(opts.hopSamples);
  }

  start() {
    this.stopped = false;
    this.spawnArecord();
    if (!this.stallTimer) {
      this.stallTimer = setInterval(() => this.checkStall(), 500);
      this.stallTimer.unref?.();
    }
  }

  stop() {
    this.stopped = true;
    if (this.stallTimer) { clearInterval(this.stallTimer); this.stallTimer = null; }
    this.proc?.kill("SIGTERM");
    this.proc = null;
  }

  /** Dödar en levande men tyst arecord. Respawn sker via 'exit'-handlern. */
  private checkStall() {
    if (this.stopped || !this.proc || this.lastDataAt === 0) return;
    const gap = Date.now() - this.lastDataAt;
    if (gap < AudioCapture.STALL_MS) return;
    this.emit("stall", gap);
    this.lastDataAt = 0;          // ingen andra dödsstöt innan nästa process levererat
    this.proc.kill("SIGKILL");    // TERM kan hänga i samma ALSA-anrop som tystnade
  }


  private spawnArecord() {
    this.leftover = Buffer.alloc(0);
    const args = [
      "-D", this.opts.device,
      "-f", "S16_LE",
      "-r", String(this.opts.rate),
      "-c", String(this.opts.channels),
      "-t", "raw",
      "--buffer-size=1024",   // ~21 ms — håll capture-latensen låg, låt drift droppa via overrun
      "--period-size=128",
      "-q",
    ];
    const p = spawn("arecord", args, { stdio: ["ignore", "pipe", "pipe"] });
    // Pinna ljudinfångningen till kärna 0 — den ÄRVER annars motorns affinitet
    // (CPUAffinity=1 2) och slåss då om kärna med analys/render. Egen kärna =
    // ALSA-bufferten töms i tid även när motorn har en burst. Fire-and-forget:
    // saknas taskset fortsätter arecord ändå, bara utan pinning.
    if (p.pid) spawn("taskset", ["-pc", "0", String(p.pid)], { stdio: "ignore" }).on("error", () => {});
    this.proc = p;

    p.stdout.on("data", (buf: Buffer) => this.onData(buf));
    p.stderr.on("data", (buf: Buffer) => {
      const s = buf.toString().trim();
      if (s) this.emit("stderr", s);
    });
    p.on("exit", (code) => {
      this.emit("exit", code);
      if (!this.stopped) setTimeout(() => this.spawnArecord(), 1000);
    });
    // 'error' fyrar om själva spawn:en failar (arecord saknas på PATH, eller
    // EAGAIN när fork inte får minne på 512MB-Pi:n). Utan denna lyssnare skulle
    // ChildProcess kasta ett ohanterat fel → hela motorn kraschar; och 'exit'
    // fyrar INTE vid spawn-fel, så respawn:en ovan uteblir. Respawna här i stället.
    p.on("error", (err) => {
      this.emit("stderr", `spawn: ${(err as Error).message}`);
      if (!this.stopped) setTimeout(() => this.spawnArecord(), 1000);
    });
  }

  private onData(buf: Buffer) {
    // Concat leftover + new; slice into fixed chunks; keep remainder.
    const combined = this.leftover.length
      ? Buffer.concat([this.leftover, buf])
      : buf;

    let offset = 0;
    while (combined.length - offset >= this.chunkBytes) {
      const chunk = combined.subarray(offset, offset + this.chunkBytes);
      offset += this.chunkBytes;

      // Ett STORT batch betyder inte att vi ligger efter — det betyder att node
      // buntade ihop läsningar och gav oss ikapp-ljudet på en gång. MÄTT: normala
      // batchar bär upp till 32 ms, uppstart 163 ms. Ljudet är redan i handen och
      // vi kör på ~47 % av realtidsbudgeten, så att bearbeta HELA batchet är både
      // rätt och snabbast — vi hinner ikapp av oss själva. Att slänga det är att
      // slänga riktig musik: en tidigare version av den här vakten sköt på 50 ms
      // och kastade då 28 % av ljudet i varje burst, vilket syntes som fladder i
      // låga partier (kalibreringsmappningen förstorar varje lucka).
      //
      // Två tidigare mått som ledde fel, så de inte provas igen:
      //   • `behind` (väggtid − ljud ur pipen) mätte ALSA-overruns, inte kö. Den
      //     kunde bara växa och drop kunde inte reparera den → vid >120 ms
      //     droppades varje chunk för alltid och riggen frös.
      //   • `stdout.readableLength` är alltid 0: backloggen ligger i OS-pipen,
      //     osynlig härifrån. Den mätte ingenting.
      const staleMs = ((combined.length - offset) / this.bytesPerFrame / this.opts.rate) * 1000;
      if (staleMs > AudioCapture.STALE_MS) continue;   // katastrofal stall → lucka slår gammalt ljud

      this.emit("chunk", this.toMonoFloat32(chunk));
    }
    this.leftover = combined.subarray(offset);
  }

  /**
   * ÅTERANVÄND BUFFERT — chunkarna kommer ~375 gånger i sekunden, och en ny
   * Float32Array per chunk är konstant sopmängd på en maskin där en GC-paus
   * syns som fladder i ljuset.
   *
   * KONTRAKT: den utsända arrayen gäller BARA under 'chunk'-handlern. Båda
   * konsumenterna kopierar synkront innan de släpper den (analyser.process →
   * `buffer.set(samples)`, recorder.write → egen Int16-buffert), och onData
   * emittar en chunk i taget så nästa skrivning sker efter att den förra är
   * konsumerad. EN KONSUMENT SOM SPARAR ARRAYEN MELLAN CHUNKAR MÅSTE KOPIERA.
   */
  private toMonoFloat32(buf: Buffer): Float32Array {
    const n = this.opts.hopSamples;
    const out = this.mono;
    // Zero-copy Int16Array view over the incoming buffer. Pi Zero 2 W is
    // little-endian, matching S16_LE, so no byteswap needed. ~3-4× faster
    // than readInt16LE() in a hot loop.
    const i16 = new Int16Array(
      buf.buffer,
      buf.byteOffset,
      buf.byteLength >> 1,
    );
    if (this.opts.channels === 1) {
      const INV = 1 / 32768;
      for (let i = 0; i < n; i++) out[i] = i16[i] * INV;
    } else {
      const INV = 1 / 65536;
      for (let i = 0, j = 0; i < n; i++, j += 2) {
        out[i] = (i16[j] + i16[j + 1]) * INV;
      }
    }
    return out;
  }
}
