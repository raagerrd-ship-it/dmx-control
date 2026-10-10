/**
 * LANG INSPELNING (2026-10-10, natt-todo uppgift 2 - agaren: "lagg in bada for nattagenten"): knappen "Spela in 5 min" i /setup tar ETT
 * sammanhangande stycke av ingangen (48 kHz mono, samma hop som analysatorn) + motorns handelser till snippets-mappen, sa banken far hela
 * latar med historik (dropklippen 10-10 borjade 15 s fore dropen - for kort: analysatorn ser aldrig kropp -> borta -> tillbaka).
 * Egen DMX-modul: recorder/recorder.ts ar delad med lotus (ANALYSER_SHARED.md5) och ror vi inte.
 * REALTIDSPRINCIPEN: ingen kostnad i vila (en null-koll per hop, inget minne, ingen forbuffert). Under inspelning: en kopiering per hop
 * till en forallokerad Int16Array (5 min = 28,8 MB) och en 10 Hz-handelsrad. Filen skrivs asynkront efterat. Max 10 min.
 */
import { mkdir, writeFile } from "node:fs/promises";
import type { Frame } from "./analyser.js";

export interface LongRecordStatus { active: boolean; seconds: number; target: number; file: string; error: string }
export interface LongRecordHooks {
  latestFrame: () => Frame | null;
  look: () => string;
  why: () => string;
  beat: () => { bpm: number; confidence: number } | null;
}

export class LongRecord {
  private buf: Int16Array | null = null; private len = 0; private target = 0;
  private startWall = 0; private file = ''; private error = '';
  private events: unknown[][] = []; private tick: ReturnType<typeof setInterval> | null = null; private lastKey = '';
  constructor(private readonly dir: string, private readonly sr: number, private readonly hooks: LongRecordHooks) {}

  status(): LongRecordStatus { return { active: !!this.buf, seconds: this.len / this.sr, target: this.target / this.sr, file: this.file, error: this.error }; }

  /** Starta (sekunder 10..600). Pagaende inspelning startas inte om. */
  start(seconds: number): LongRecordStatus {
    if (this.buf) return this.status();
    const sec = Math.max(10, Math.min(600, Math.round(Number(seconds) || 300)));
    this.target = sec * this.sr; this.len = 0; this.error = ''; this.file = '';
    try { this.buf = new Int16Array(this.target); } catch (e) { this.error = 'minne: ' + (e as Error).message; return this.status(); }
    this.startWall = Date.now(); this.events = []; this.lastKey = '';
    this.tick = setInterval(() => this.sample(), 100);
    return this.status();
  }

  /** Avbryt och spara det som finns (minst 10 s), annars kasta. */
  stop(): LongRecordStatus { if (this.buf) this.finish(); return this.status(); }

  /** Per hop fran index.ts (samma prov som analysatorn). Kostnad i vila: en null-koll. */
  push(samples: Float32Array): void {
    const b = this.buf; if (!b) return;
    const n = Math.min(samples.length, this.target - this.len);
    for (let i = 0; i < n; i++) { const x = samples[i]; b[this.len + i] = x >= 1 ? 32767 : x <= -1 ? -32768 : Math.round(x * 32767); }
    this.len += n;
    if (this.len >= this.target) this.finish();
  }

  /** 10 Hz: en rad nar nagot andrats (som recorder.ts flags) + look/orsak/takt - det banken behover for facit. */
  private sample(): void {
    try {
      const f = this.hooks.latestFrame(); if (!f) return;
      const bt = this.hooks.beat();
      const row = [Date.now(), f.dropCount, f.miniDropCount ?? 0, f.section ?? '', f.sectionIndex ?? 0, Math.round((f.buildUp ?? 0) * 100) / 100,
        f.breaking ? 1 : 0, Math.round(f.bpm ?? 0), bt ? Math.round(bt.confidence * 100) / 100 : 0, this.hooks.look(), this.hooks.why()];
      const key = row.slice(1).join('|');
      if (key !== this.lastKey) { this.lastKey = key; this.events.push(row); }
    } catch { /* loggen far aldrig falla motorn */ }
  }

  private finish(): void {
    if (this.tick) { clearInterval(this.tick); this.tick = null; }
    const b = this.buf, len = this.len; this.buf = null;
    if (!b || len < this.sr * 10) { this.error = len ? 'for kort (under 10 s) - kastad' : ''; return; }
    const id = 'lang-' + new Date(this.startWall).toISOString().replace(/[-:]/g, '').slice(0, 15);
    const dataBytes = len * 2, wav = Buffer.alloc(44 + dataBytes);
    wav.write('RIFF', 0); wav.writeUInt32LE(36 + dataBytes, 4); wav.write('WAVE', 8);
    wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(this.sr, 24); wav.writeUInt32LE(this.sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write('data', 36); wav.writeUInt32LE(dataBytes, 40);
    Buffer.from(b.buffer, b.byteOffset, dataBytes).copy(wav, 44);
    const seconds = len / this.sr;
    const events = { id, kind: 'lang', captureStartWallMs: this.startWall, rate: this.sr, seconds,
      columns: ['wallMs', 'dropCount', 'miniDropCount', 'section', 'sectionIndex', 'buildUp', 'breaking', 'bpm', 'beatConf', 'look', 'why'], flags: this.events };
    this.file = id + '.wav';
    // Asynkront: en 29 MB-fil pa SD-kortet far inte stalla event-loopen. Index-json SIST (hamtaren ser aldrig en halv fangst).
    (async () => {
      await mkdir(this.dir, { recursive: true });
      await writeFile(`${this.dir}/${id}.wav`, wav);
      await writeFile(`${this.dir}/${id}.events.json`, JSON.stringify(events));
      await writeFile(`${this.dir}/${id}.json`, JSON.stringify({ id, key: id, kind: 'lang', artist: 'dmx', title: id, capturedAt: Date.now(), rate: this.sr, seconds, hasEvents: true }));
      console.error(`[langinspelning] sparad ${id} (${seconds.toFixed(0)} s, ${(wav.length / 1e6).toFixed(1)} MB)`);
    })().catch((e) => { this.error = 'kunde inte sparas: ' + (e as Error).message; console.error('[langinspelning] ' + this.error); });
  }
}
