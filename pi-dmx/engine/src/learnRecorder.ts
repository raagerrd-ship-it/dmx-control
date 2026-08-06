/**
 * TEMP-INSPELNING för offline-tvätten.
 *
 * Medan en NY låt lärs in på aux strömmas exakt samma mono-signal som
 * analysatorn ser till en temp-WAV. Refinern (tools/refineSong.mjs) läser den
 * efteråt och räknar om drops/BPM/energi FRAMÅTBLICKANDE — något realtid inte
 * kan göra.
 *
 * Streamas till disk, aldrig till RAM: en 3-minuterslåt är ~17 MB.
 * En låt i taget, och filen raderas alltid efter tvätten.
 */

import { createWriteStream, statSync, unlinkSync, openSync, writeSync, closeSync, type WriteStream } from "node:fs";
import { statfsSync } from "node:fs";

const MIN_FREE_BYTES = 100 * 1024 * 1024;   // under 100 MB ledigt → spela inte in
const MAX_SECONDS = 600;                    // tak: 10 min ljud per låt

/** WAV-header för mono 16-bit PCM. Storleksfälten patchas vid stängning. */
function header(rate: number, bytes: number): Buffer {
  const b = Buffer.alloc(44);
  b.write("RIFF", 0, "ascii"); b.writeUInt32LE(36 + bytes, 4); b.write("WAVE", 8, "ascii");
  b.write("fmt ", 12, "ascii"); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);          // PCM, 1 kanal
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36, "ascii"); b.writeUInt32LE(bytes, 40);
  return b;
}

export class LearnRecorder {
  private ws: WriteStream | null = null;
  private bytes = 0;
  private skipped = 0;
  private full = false;
  private buf = Buffer.alloc(0);

  constructor(private readonly path: string, private readonly rate: number) {}

  get active(): boolean { return this.ws !== null; }

  /** Börja spela in. Returnerar false om disken är för full (då tvättas låten
   *  inte — realtidsminnet fungerar som förut). */
  start(): boolean {
    if (this.ws) return true;
    try {
      const fs = statfsSync(this.path.replace(/\/[^/]+$/, ""));
      if (fs.bsize * fs.bavail < MIN_FREE_BYTES) {
        console.log("[refine] hoppar över inspelning: mindre än 100 MB ledigt");
        return false;
      }
    } catch { /* statfs saknas → fortsätt, taket nedan skyddar ändå */ }
    try {
      this.ws = createWriteStream(this.path);
      this.ws.on("error", (e) => { console.error("[refine] skrivfel:", e.message); this.abort(); });
      this.ws.write(header(this.rate, 0));
      this.bytes = 0; this.skipped = 0; this.full = false;
      return true;
    } catch (e) {
      console.error("[refine] kunde inte öppna temp-WAV:", (e as Error).message);
      this.ws = null;
      return false;
    }
  }

  /** Mata en hop. Samma Float32-mono som analysatorn får → refinern ser
   *  identisk signal. */
  write(samples: Float32Array): void {
    const ws = this.ws;
    if (!ws || this.full) return;
    if (this.bytes >= MAX_SECONDS * this.rate * 2) { this.full = true; return; }
    if (this.buf.length !== samples.length * 2) this.buf = Buffer.alloc(samples.length * 2);
    for (let i = 0; i < samples.length; i++) {
      const v = Math.max(-1, Math.min(1, samples[i])) * 32767;
      this.buf.writeInt16LE(v < 0 ? Math.ceil(v) : Math.floor(v), i * 2);
    }
    // Backpressure: hellre en lucka än en växande kö i RAM på en 512 MB-Pi.
    if (ws.writableLength > 1 << 20) { this.skipped++; return; }
    ws.write(Buffer.from(this.buf));
    this.bytes += this.buf.length;
  }

  /** Stäng filen och patcha headern. Returnerar sökvägen, eller null om
   *  inspelningen inte gick att använda. */
  finish(): string | null {
    const ws = this.ws;
    if (!ws) return null;
    this.ws = null;
    const bytes = this.bytes;
    ws.end();
    if (bytes < this.rate * 2 * 30) { this.remove(); return null; }   // < 30 s: inte värt en tvätt
    try {
      const fd = openSync(this.path, "r+");
      const h = header(this.rate, bytes);
      writeSync(fd, h, 0, 44, 0);
      closeSync(fd);
      const mb = (statSync(this.path).size / 1048576).toFixed(1);
      console.log(`[refine] temp-WAV ${mb} MB (${(bytes / (this.rate * 2)).toFixed(0)}s ljud${this.skipped ? `, ${this.skipped} hoppade hopar` : ""})`);
      return this.path;
    } catch (e) {
      console.error("[refine] kunde inte stänga temp-WAV:", (e as Error).message);
      this.remove();
      return null;
    }
  }

  /** Avbryt och radera (ingångsbyte, låten var för kort, fel). */
  abort(): void {
    if (this.ws) { this.ws.end(); this.ws = null; }
    this.remove();
  }

  private remove(): void {
    try { unlinkSync(this.path); } catch { /* fanns inte */ }
  }
}
