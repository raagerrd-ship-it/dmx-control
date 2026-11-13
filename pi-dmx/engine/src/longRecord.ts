/**
 * LANG INSPELNING (2026-10-10, natt-todo uppgift 2 - agaren: "lagg in bada for nattagenten"): knappen i /setup tar ETT
 * sammanhangande stycke av ingangen (48 kHz mono, samma hop som analysatorn) + motorns handelser till snippets-mappen, sa banken far hela
 * latar med historik (dropklippen 10-10 borjade 15 s fore dropen - for kort: analysatorn ser aldrig kropp -> borta -> tillbaka).
 * Egen DMX-modul: recorder/recorder.ts ar delad med lotus (ANALYSER_SHARED.md5) och ror vi inte.
 *
 * 30 MINUTER, SKRIVS LÖPANDE (2026-11-13, ägaren: "så spelar du in kanske 30 min per gång" + knapparna Låtbyte / Drop / Minidrop /
 * Uppbyggnad under inspelningen). Förr hölls hela stycket i minnet (5 min = 28,8 MB, och lika mycket till när filen byggdes) - 30 min
 * hade varit 173 + 173 MB. Nu går ljudet i block om BLOCK_S sekunder till en skrivström; minnet är POOL block (~2 MB) oavsett längd.
 * REALTIDSPRINCIPEN: ingen kostnad i vila (en null-koll per hop, inget minne). Under inspelning: en kopiering per hop till ett block ur
 * en fast pool, en asynkron skrivning var BLOCK_S:e sekund och en 10 Hz-handelsrad. WAV-huvudet fylls i när inspelningen är klar.
 */
import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import { mkdir, open, unlink, writeFile, appendFile } from "node:fs/promises";
import type { Frame } from "./analyser.js";

export interface LongRecordStatus { active: boolean; seconds: number; target: number; file: string; error: string; marks: number;
  /** De senaste markeringarna i den pågående inspelningen (i = plats i listan, s = sekunder in) - /setup listar dem så de kan ändras/tas bort. */
  recent?: { i: number; s: number; kind: string }[] }
export interface LongRecordHooks {
  latestFrame: () => Frame | null;
  look: () => string;
  why: () => string;
  beat: () => { bpm: number; confidence: number } | null;
}
const MAX_S = 3600, BLOCK_S = 5, POOL = 4;   // ägaren: "eller tills jag trycker på stop" - 60 min är bara skyddet mot en glömd inspelning (346 MB)

export class LongRecord {
  private out: WriteStream | null = null; private path = ''; private id = '';
  private blk: Int16Array | null = null; private blkLen = 0; private readonly free: Int16Array[] = [];
  private len = 0; private target = 0;
  private startWall = 0; private file = ''; private error = '';
  private events: unknown[][] = []; private marks: { wallMs: number; kind: string }[] = []; private tick: ReturnType<typeof setInterval> | null = null; private lastKey = '';
  constructor(private readonly dir: string, private readonly sr: number, private readonly hooks: LongRecordHooks) {}

  status(): LongRecordStatus {
    const st: LongRecordStatus = { active: !!this.out, seconds: this.len / this.sr, target: this.target / this.sr, file: this.file, error: this.error, marks: this.marks.length };
    if (this.out) { const n = this.marks.length, a = Math.max(0, n - 6); st.recent = this.marks.slice(a).map((m, k) => ({ i: a + k, s: (m.wallMs - this.startWall) / 1000, kind: m.kind })); }
    return st;
  }

  /** ÄNDRA ELLER TA BORT en markering i den pågående inspelningen (ägaren 11-13: "om de senaste listas så jag enkelt kan ändra/ta
   *  bort"). kind = null tar bort. Ändringen loggas i marks.jsonl (ref = markeringens tid); events.json får listan som den slutar. */
  editMark(i: number, kind: string | null): LongRecordStatus {
    const m = this.out ? this.marks[i] : undefined; if (!m) return this.status();
    const rad = { wallMs: Date.now(), kind: kind === null ? 'struken' : 'andrad', ref: m.wallMs, from: m.kind, to: kind };
    if (kind === null) this.marks.splice(i, 1); else m.kind = String(kind).slice(0, 20);
    appendFile(`${this.dir}/marks.jsonl`, JSON.stringify(rad) + '\n').catch(() => {});
    return this.status();
  }

  /** Starta (sekunder 10..3600; /setup startar med taket och ägaren stoppar själv). Pagaende inspelning startas inte om. */
  start(seconds: number): LongRecordStatus {
    if (this.out) return this.status();
    const sec = Math.max(10, Math.min(MAX_S, Math.round(Number(seconds) || 300)));
    this.target = sec * this.sr; this.len = 0; this.error = ''; this.file = '';
    this.startWall = Date.now(); this.events = []; this.marks = []; this.lastKey = '';
    this.id = 'lang-' + new Date(this.startWall).toISOString().replace(/[-:]/g, '').slice(0, 15); this.path = `${this.dir}/${this.id}.wav`;
    try {
      mkdirSync(this.dir, { recursive: true });
      while (this.free.length < POOL) this.free.push(new Int16Array(this.sr * BLOCK_S));
      this.blk = this.free.pop()!; this.blkLen = 0;
      const out = createWriteStream(this.path);
      out.on('error', (e) => { this.error = 'kunde inte skrivas: ' + e.message; console.error('[langinspelning] ' + this.error); this.abort(); });
      out.write(Buffer.alloc(44));   // plats för WAV-huvudet, fylls i av finish()
      this.out = out;
    } catch (e) { this.error = 'start: ' + (e as Error).message; this.out = null; this.blk = null; return this.status(); }
    this.tick = setInterval(() => this.sample(), 100);
    return this.status();
  }

  /** ÄGARENS MARKERING (knapparna i /setup: latbyte / drop / mini / uppbyggnad / intedrop): facit. Sparas i .events.json (marks) om en inspelning
   *  pågår, och alltid i marks.jsonl i snippets-mappen. Tiden är knapptryckets - räkna med ~0,5-1 s reaktionstid när facit används. */
  mark(kind: string): { ok: boolean; recording: boolean; kind: string; marks: number } {
    const m = { wallMs: Date.now(), kind: String(kind).slice(0, 20) };
    if (this.out) this.marks.push(m);
    (async () => { await mkdir(this.dir, { recursive: true }); await appendFile(`${this.dir}/marks.jsonl`, JSON.stringify(m) + '\n'); })().catch(() => {});
    return { ok: true, recording: !!this.out, kind: m.kind, marks: this.marks.length };
  }

  /** Senast sparade inspelningens sökväg ('' om ingen sparats sedan motorn startade) - för uppspelning i /setup. */
  lastPath(): string { return this.file && !this.out ? `${this.dir}/${this.file}` : ''; }

  /** Avbryt och spara det som finns (minst 10 s), annars kasta. */
  stop(): LongRecordStatus { if (this.out) this.finish(); return this.status(); }

  /** Per hop fran index.ts (samma prov som analysatorn). Kostnad i vila: en null-koll. */
  push(samples: Float32Array): void {
    const out = this.out; if (!out) return;
    let b = this.blk!, at = this.blkLen; const n = Math.min(samples.length, this.target - this.len);
    for (let i = 0; i < n; i++) {
      const x = samples[i]; b[at++] = x >= 1 ? 32767 : x <= -1 ? -32768 : Math.round(x * 32767);
      if (at === b.length) { this.flush(b, at); b = this.blk = this.free.pop() ?? new Int16Array(this.sr * BLOCK_S); at = 0; }
    }
    this.blkLen = at; this.len += n;
    if (this.len >= this.target) this.finish();
  }

  /** Ett fullt (eller sista) block till skrivströmmen; blocket går tillbaka till poolen när skrivningen är klar. */
  private flush(b: Int16Array, n: number): void {
    const out = this.out; if (!out || n === 0) { this.free.push(b); return; }
    out.write(Buffer.from(b.buffer, b.byteOffset, n * 2), () => { if (this.free.length < POOL) this.free.push(b); });
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

  /** Skrivfel: släpp inspelningen utan att röra motorn. */
  private abort(): void {
    if (this.tick) { clearInterval(this.tick); this.tick = null; }
    const out = this.out; this.out = null; if (this.blk) { this.free.push(this.blk); this.blk = null; }
    try { out?.destroy(); } catch { /* redan stängd */ }
  }

  private finish(): void {
    if (this.tick) { clearInterval(this.tick); this.tick = null; }
    const out = this.out, b = this.blk, len = this.len, id = this.id, path = this.path, sr = this.sr; if (!out) return;
    if (b) this.flush(b, this.blkLen);
    this.out = null; this.blk = null; this.blkLen = 0;
    const seconds = len / sr, kort = len < sr * 10;
    const events = { id, kind: 'lang', captureStartWallMs: this.startWall, rate: sr, seconds,
      columns: ['wallMs', 'dropCount', 'miniDropCount', 'section', 'sectionIndex', 'buildUp', 'breaking', 'bpm', 'beatConf', 'look', 'why'], flags: this.events, marks: this.marks };
    if (kort) this.error = len ? 'for kort (under 10 s) - kastad' : ''; else this.file = id + '.wav';
    // Asynkront: stäng strömmen, fyll i WAV-huvudet, skriv händelserna. Index-json SIST (hamtaren ser aldrig en halv fangst).
    out.end(() => {
      (async () => {
        if (kort) { await unlink(path).catch(() => {}); return; }
        const dataBytes = len * 2, h = Buffer.alloc(44);
        h.write('RIFF', 0); h.writeUInt32LE(36 + dataBytes, 4); h.write('WAVE', 8);
        h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
        h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
        h.write('data', 36); h.writeUInt32LE(dataBytes, 40);
        const fh = await open(path, 'r+'); try { await fh.write(h, 0, 44, 0); } finally { await fh.close(); }
        await writeFile(`${this.dir}/${id}.events.json`, JSON.stringify(events));
        await writeFile(`${this.dir}/${id}.json`, JSON.stringify({ id, key: id, kind: 'lang', artist: 'dmx', title: id, capturedAt: Date.now(), rate: sr, seconds, hasEvents: true }));
        console.error(`[langinspelning] sparad ${id} (${seconds.toFixed(0)} s, ${((44 + dataBytes) / 1e6).toFixed(1)} MB, ${events.marks.length} markeringar)`);
      })().catch((e) => { this.error = 'kunde inte sparas: ' + (e as Error).message; console.error('[langinspelning] ' + this.error); });
    });
  }
}
