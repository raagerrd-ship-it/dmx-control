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
}

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../tools/refineSong.mjs");
const MAX_TRIES = 2;

export class RefineQueue {
  private proc: ChildProcess | null = null;
  private tries = 0;

  /** @param dir datakatalogen (samma som songs.bin) */
  constructor(private readonly dir: string, private readonly apply: (t: RefinedTimeline) => void) {}

  get busy(): boolean { return this.proc !== null; }

  /** Städa kvarglömda filer efter strömavbrott mitt i en låt. */
  cleanStale(): void {
    for (const f of safeReaddir(this.dir)) {
      if (f.endsWith(".refined.json") || f === "learn.wav") rm(join(this.dir, f));
    }
  }

  /** Låten är committad och WAV:en stängd → tvätta nu (tystnad = ingen last). */
  start(wav: string, songId: number): void {
    if (this.proc) { rm(wav); return; }        // en åt gången
    this.tries = 0;
    this.run(wav, songId);
  }

  private run(wav: string, songId: number): void {
    const out = join(this.dir, `${songId}.refined.json`);
    this.tries++;
    // `nice` finns på varje Debian; saknas den kör vi ändå (fire and forget).
    const p = spawn("nice", ["-n", "19", process.execPath, SCRIPT, wav, String(songId), out], { stdio: ["ignore", "pipe", "pipe"] });
    this.proc = p;
    p.stdout.on("data", (b: Buffer) => { const s = b.toString().trim(); if (s) console.log(s); });
    p.stderr.on("data", (b: Buffer) => { const s = b.toString().trim(); if (s) console.error(`[refine] ${s}`); });
    p.on("error", (e) => { console.error("[refine] kunde inte starta:", e.message); this.proc = null; rm(wav); rm(out); });
    p.on("exit", (code) => {
      this.proc = null;
      if (code === 0 && this.load(out)) { rm(wav); rm(out); return; }
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
      if (t.v !== 1 || !Array.isArray(t.drops)) return false;
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
