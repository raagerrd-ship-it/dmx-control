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
  /** Kasta en chunk när så mycket FÄRSKARE ljud redan står på kö bakom den.
   *  Normaldrift mäter 0.0 ms kö, så detta fyrar bara vid en verklig stall. */
  private static readonly STALE_MS = 50;

  constructor(private opts: AudioCaptureOptions) {
    super();
    this.bytesPerFrame = 2 * opts.channels;
    this.chunkBytes = opts.hopSamples * this.bytesPerFrame;
  }

  start() {
    this.stopped = false;
    this.spawnArecord();
  }

  stop() {
    this.stopped = true;
    this.proc?.kill("SIGTERM");
    this.proc = null;
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

      // Släng gammalt ljud när event-loopen har stallat: allt som redan står på
      // kö bakom den här chunken är FÄRSKARE, så att analysera den vore att visa
      // gårdagens musik. Kön = resten av det här batchet + det ALSA hunnit fylla
      // i strömmen. MÄTT i normaldrift: 0.0 ms snitt OCH 0.0 ms max — vakten är
      // rent skydd mot stall, den fyrar aldrig när allt är friskt.
      //
      // Detta ersätter en väggklocks-drift (`behind`) som mätte fel storhet: den
      // räknade väggtid minus ljud som KOMMIT UR pipen, vilket bara kan glida vid
      // en ALSA-overrun — alltså samples som aldrig fanns, inte kö. Den drift
      // kunde bara växa (varje overrun lade på ~40 ms) och kunde aldrig repareras
      // av att droppa, eftersom man omöjligt konsumerar snabbare än arecord matar.
      // Vid >120 ms droppades därför VARJE chunk för alltid och riggen frös. Kön
      // nedan är momentan och kan aldrig fastna, så inget resynk-lappverk behövs.
      const queued = (combined.length - offset)
        + (this.proc?.stdout.readableLength ?? 0);
      const staleMs = (queued / this.bytesPerFrame / this.opts.rate) * 1000;
      if (staleMs > AudioCapture.STALE_MS) continue;

      this.emit("chunk", this.toMonoFloat32(chunk));
    }
    this.leftover = combined.subarray(offset);
  }

  private toMonoFloat32(buf: Buffer): Float32Array {
    const n = this.opts.hopSamples;
    const out = new Float32Array(n);
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
