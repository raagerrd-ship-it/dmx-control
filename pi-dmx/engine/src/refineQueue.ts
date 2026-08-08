/**
 * REFINE-KÖ — spawnar refinern i tystnaden och applicerar resultatet.
 *
 * Tvätten körs som en EGEN process med nice 19: analysen tar sekunder och
 * skulle frysa renderloopen om den låg på huvudtråden. En låt i taget, och
 * temp-WAV:en raderas ALLTID — även när det gick fel.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync, unlinkSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface RefinedTimeline {
  v: number; songId: number;
  drops: { t: number; s: number }[];
  bpm: number; beatPhaseMs: number; intensity: number[];
  /** v2: dramaturgi. Saknas i v1-filer → motorn kör som förut. */
  risers?: { start: number; end: number; drop: number }[];
  sections?: number[];
  phrase?: { barMs: number; p8: number; p16: number; p32: number } | null;
  /** v2: tvätten hittade en låtgräns INNE i segmentet → motorn trimmar låten. */
  trimAt?: number;
  /** v2: hur mycket ljud tvätten byggde på (ms) — skydd mot att en partiell tvätt skriver över en komplett. */
  durMs?: number;

}


const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../tools/refineSong.mjs");
const MAX_TRIES = 2;

export class RefineQueue {
  private proc: ChildProcess | null = null;
  private tries = 0;
  private id = 0;

  /** @param dir datakatalogen (samma som songs.bin) */
  constructor(private readonly dir: string, private readonly apply: (t: RefinedTimeline) => void) {}

  get busy(): boolean { return this.proc !== null; }

  /** Låten som tvättas just nu (0 = ingen) — UI visar "Tvättar #1". */
  get songId(): number { return this.proc ? this.id : 0; }

  /** Avstängning: döda en pågående tvätt. Temp-WAV:en städas vid nästa start. */
  stop(): void { this.proc?.kill("SIGTERM"); this.proc = null; }

  /** ÅTERUPPTA EN AVBRUTEN TVÄTT.
   *  En tvätt tar ~70 s på en Zero 2 W. Avbryts motorn under tiden (deploy, strömavbrott,
   *  krasch) kastades ljudet förr och låten blev liggande otvättad för alltid — utan att
   *  någonting sa till. MÄTT 2026-08-07: fyra deployer i rad slog ut tvätten av en låt som
   *  därmed stod kvar med 0 drops. En <songId>.wav utan färdig .refined.json är en
   *  oavslutad tvätt, inte skräp: kör den igen. Övriga rester städas som förut. */
  cleanStale(): void {
    let resume: { wav: string; id: number } | null = null;
    for (const f of safeReaddir(this.dir)) {
      if (f.endsWith(".refined.json")) { rm(join(this.dir, f)); continue; }
      if (!f.endsWith(".wav")) continue;
      const id = Number(f.slice(0, -4));
      // learn.wav (pågående inspelning) har inget numeriskt namn → städas som förr.
      if (Number.isInteger(id) && id > 0 && !resume) { resume = { wav: join(this.dir, f), id }; continue; }
      rm(join(this.dir, f));
    }
    if (resume) {
      console.log(`[refine] återupptar avbruten tvätt av låt #${resume.id}`);
      this.start(resume.wav, resume.id);
    }
  }


  /** Låten är committad och WAV:en stängd → tvätta nu (tystnad = ingen last). */
  start(wav: string, songId: number): void {
    if (this.proc) { rm(wav); return; }        // en åt gången
    this.tries = 0;
    this.id = songId;
    this.run(wav, songId);
  }


  private run(wav: string, songId: number): void {
    const out = join(this.dir, `${songId}.refined.json`);
    this.tries++;
    // taskset -c 0: barnprocessen ÄRVER annars motorns CPUAffinity=1 2 och skulle
    // konkurrera med FFT/analysen. Kärna 0 delas med arecord (nästan bara DMA) och
    // BLE-sidecarn (idle mellan skrivningar); kärna 3 är DMX:ens och rörs aldrig.
    // `taskset`/`nice` finns på varje Debian; saknas de kör vi ändå (fire and forget).
    const p = spawn("taskset", ["-c", "0", "nice", "-n", "19", process.execPath, SCRIPT, wav, String(songId), out], { stdio: ["ignore", "pipe", "pipe"] });
    this.proc = p;
    p.stdout.on("data", (b: Buffer) => { const s = b.toString().trim(); if (s) console.log(s); });
    p.stderr.on("data", (b: Buffer) => { const s = b.toString().trim(); if (s) console.error(`[refine] ${s}`); });
    p.on("error", (e) => { console.error("[refine] kunde inte starta:", e.message); this.proc = null; rm(wav); rm(out); });
    p.on("exit", (code) => {
      this.proc = null;
      // DIAGNOSTIK: KEEP_WAV=1 sparar ljudet i stället för att radera det, så en post
      // kan jämföras mot det ljud den FAKTISKT byggdes på. Normalt av — ljud hoardas aldrig.
      if (code === 0 && this.load(out)) { if (!process.env.KEEP_WAV) rm(wav); else console.log(`[refine] KEEP_WAV: sparade ${wav}`); rm(out); return; }
      rm(out);
      if (this.tries < MAX_TRIES) { console.log(`[refine] försök ${this.tries} misslyckades (kod ${code}) — provar igen`); this.run(wav, songId); return; }
      console.error(`[refine] gav upp låt #${songId} (kod ${code})`);
      rm(wav);   // hoarda aldrig ljud
    });
  }

  /** Läs in en sidecar och applicera den. */
  private load(path: string): boolean {
    if (!existsSync(path)) return false;
    try {
      const t = JSON.parse(readFileSync(path, "utf8")) as RefinedTimeline;
      if ((t.v !== 1 && t.v !== 2) || !Array.isArray(t.drops)) return false;   // v1 fungerar fortsatt
      this.apply(t);
      return true;
    } catch (e) {
      console.error("[refine] trasig sidecar:", (e as Error).message);
      return false;
    }
  }
}

function rm(p: string): void { try { unlinkSync(p); } catch { /* fanns inte */ } }
function safeReaddir(d: string): string[] { try { return readdirSync(d); } catch { return []; } }
