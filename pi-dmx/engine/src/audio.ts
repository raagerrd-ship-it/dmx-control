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
  private readonly chunkMs: number;
  private wallStart = 0;    // Date.now() vid första chunk
  private audioMs = 0;      // ms audio vi HAR släppt vidare

  constructor(private opts: AudioCaptureOptions) {
    super();
    this.bytesPerFrame = 2 * opts.channels;
    this.chunkBytes = opts.hopSamples * this.bytesPerFrame;
    this.chunkMs = (opts.hopSamples / opts.rate) * 1000;
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
    // Re-basera wall-clock-pacingen vid varje (om)start. Annars fortsätter
    // audioMs mot en wallStart från FÖRE avbrottet → 'behind' fastnar över
    // 120 ms och ALLA chunks droppas efter en capture-lucka (arecord dog /
    // ljudkortet tappade kontakt). Utan detta återhämtar sig auto-omstarten
    // aldrig på egen hand — bara en hel process-omstart (watchdog) räddar den.
    this.wallStart = 0;
    this.audioMs = 0;
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
  }

  private onData(buf: Buffer) {
    // Concat leftover + new; slice into fixed chunks; keep remainder.
    const combined = this.leftover.length
      ? Buffer.concat([this.leftover, buf])
      : buf;

    if (this.wallStart === 0) this.wallStart = Date.now();

    let offset = 0;
    while (combined.length - offset >= this.chunkBytes) {
      const chunk = combined.subarray(offset, offset + this.chunkBytes);
      offset += this.chunkBytes;
      this.audioMs += this.chunkMs;

      // Wall-clock pacing: if processing has fallen more than ~120 ms behind
      // real time (audio piling up faster than we consume it — the slow, steady
      // accumulation that a burst-cap misses), DROP this stale chunk instead of
      // rendering it. Keeps the light within ~120 ms of the music indefinitely.
      const behind = (Date.now() - this.wallStart) - this.audioMs;
      // SJÄLVLÄKANDE: en ALSA-overrun (samples TAPPAS när event-loopen stallar en
      // stund — t.ex. vid ett WiFi-omkopplingsevent) lämnar audioMs permanent
      // efter väggklockan → 'behind' fastnar högt → annars droppas VARJE chunk för
      // alltid och lamporna slutar reagera tills watchdogen hinner starta om.
      // >500 ms ur synk = ett verkligt tapp, inte en normal transient: re-basera
      // klockan och släpp igenom, så capturen resynkar direkt i stället.
      if (behind > 500) {
        this.wallStart = Date.now() - this.audioMs;   // behind ≈ 0 → resynk nu
      } else if (behind > 120) {
        continue;   // normalt: droppa EN eftersläpande chunk för att hålla realtid
      }

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
