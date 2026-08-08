/**
 * STRUKTURKÖ — skickar en inlärd låt på analys EN gång, sparar svaret för alltid.
 *
 * VARFÖR INTE LOKALT: analysen ska ge FUNKTIONSETIKETTER (intro/verse/chorus/
 * bridge/outro) plus taktslag och nedslag. Modellen som gör det bra (`allin1`,
 * ISMIR 2023) kör PyTorch med källseparation och vill ha ett par GB RAM. Pi:n
 * har 416 MB TOTALT (mätt 2026-08-08) och ska dessutom köra showen. En kö löser
 * inte det — det är minne som saknas, inte tid.
 *   Egen kroma/klangfärgs-analys byggdes och mättes först (se structure-worker.js):
 *   den gav två användbara sektionstyper i EN låt av tre. Den ligger kvar som
 *   reservväg, men den är inte i närheten av en tränad modell.
 *
 * SÅ: ljudet skickas till en hostad körning, svaret sparas i structure.json och
 * WAV:en raderas. En låt analyseras en gång i sitt liv.
 *
 * OFFLINE ÄR ETT NORMALTILLSTÅND, inte ett fel. På fest är Pi:n accesspunkt utan
 * internet — då ligger WAV:erna kvar och kön betar av dem när den kommer hem.
 * Inget i showen väntar på det här.
 *
 * DISKEN ÄR TAKET: ~3,8 GB fritt och en oanalyserad låt väger ~7,7 MB nedsamplad.
 * Kön har ett hårt tak (MAX_PENDING) så ett långvarigt internetbortfall aldrig
 * kan fylla kortet och stoppa inspelningen.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, renameSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Sektion med FUNKTION — inte bara en tidpunkt. Det är hela poängen: minnet
 *  lagrar i dag `sections: number[]` (tidpunkter), så dirigenten vet att en gräns
 *  passerade men inte VAD som börjar. Med label kan den ta tillbaka samma look
 *  varje refräng, och bygga mot en som den vet kommer. */
export interface SongPart {
  /** ms från låtens början */
  t: number;
  /** intro | verse | chorus | bridge | outro | inst | solo … modellens eget ord */
  label: string;
}

export interface SongStructure {
  v: number;
  bpm?: number;
  /** ms för varje nedslag (taktettan) — ger frasgrid utan gissning */
  downbeats?: number[];
  parts: SongPart[];
  analysedMs: number;
  /** vilken väg som gav svaret, så en senare läsare vet vad den litar på */
  via: string;
}

const MAX_PENDING = 40;              // ~310 MB tak på kön
const POLL_MS = 5000;                // hur ofta en pågående körning kollas
const RETRY_BASE_MS = 60000;         // backoff efter misslyckande
const RETRY_MAX_MS = 3600000;
const TARGET_RATE = 16000;           // nedsampling före uppladdning
const MODEL = "sakemin/all-in-one-music-structure-analyzer";
/**
 * VERSIONS-ID KRAVS. Community-modeller kan INTE koras via
 * /v1/models/{agare}/{namn}/predictions — den formen ar bara for officiella
 * modeller och svarar 404 (uppmatt 2026-08-08). Publika modeller startas i
 * stallet via /v1/predictions med ett explicit version-hash.
 * Uppdateras modellen maste hashen bytas har; da svarar API:et 404 igen och
 * felet syns i UI:ets statusrad.
 */
const VERSION = "001b4137be6ac67bdc28cb5cffacf128b874f530258d033de23121e785cb7290";

export class StructureQueue {
  private store: Record<string, SongStructure> = {};
  private busy = false;
  private failures = 0;
  private nextTryAt = 0;
  private lastError = "";

  constructor(
    private readonly dir: string,
    private readonly getToken: () => string | undefined,
    private readonly onApplied: (songId: number, s: SongStructure) => void,
  ) {
    this.load();
  }

  private get file(): string { return join(this.dir, "structure.json"); }

  private load(): void {
    try {
      if (existsSync(this.file)) this.store = JSON.parse(readFileSync(this.file, "utf8"));
      // Slå ihop grannar med samma etikett aven i REDAN sparade analyser, sa de
      // som lagrades innan hopslagningen fanns inte behover kostas om.
      let cleaned = 0;
      for (const s of Object.values(this.store)) {
        const before = s.parts.length;
        s.parts = s.parts.filter((p, i) => i === 0 || s.parts[i - 1].label !== p.label);
        if (s.parts.length !== before) cleaned++;
      }
      if (cleaned) { this.save(); console.log(`[struktur] slog ihop sektioner i ${cleaned} tidigare analys(er)`); }
      const n = Object.keys(this.store).length;
      if (n) console.log(`[struktur] ${n} analyserade låtar i minnet`);
    } catch (e) {
      console.error("[struktur] kunde inte läsa structure.json:", (e as Error).message);
      this.store = {};
    }
  }

  private save(): void {
    // Skriv till temp + rename: ett strömavbrott mitt i skrivningen får aldrig
    // lämna en trasig fil som tar med sig ALLA tidigare analyser i fallet.
    const tmp = this.file + ".tmp";
    try {
      writeFileSync(tmp, JSON.stringify(this.store));
      renameSync(tmp, this.file);
    } catch (e) {
      console.error("[struktur] kunde inte spara:", (e as Error).message);
    }
  }

  get(songId: number): SongStructure | undefined { return this.store[String(songId)]; }

  /** Allt som redan analyserats — motorn matar in det i minnet vid uppstart. */
  all(): Record<string, SongStructure> { return this.store; }

  /** Lage per lat for UI:t: vantar den, analyseras den just nu, eller ar den klar? */
  info(songId: number): { parts: number; kinds: string[]; pending: boolean; active: boolean } {
    const s = this.store[String(songId)];
    const pending = existsSync(join(this.dir, `${songId}.pending.wav`));
    return {
      parts: s?.parts.length ?? 0,
      kinds: s ? [...new Set(s.parts.map((p) => p.label))] : [],
      pending,
      active: pending && this.busy && this.pendingIds()[0] === songId,
    };
  }

  status(): { pending: number; analysed: number; busy: boolean; error: string } {
    return { pending: this.pendingIds().length, analysed: Object.keys(this.store).length, busy: this.busy, error: this.lastError };
  }

  /** Ljudet ligger kvar som `<id>.pending.wav` tills analysen är klar. */
  private pendingIds(): number[] {
    const out: number[] = [];
    try {
      for (const f of readdirSync(this.dir)) {
        const m = /^(\d+)\.pending\.wav$/.exec(f);
        if (m) out.push(Number(m[1]));
      }
    } catch { /* katalogen kan saknas vid första start */ }
    return out.sort((a, b) => a - b);
  }

  /**
   * Refinern anropar detta i stället för att radera WAV:en.
   *
   * @param durationMs latens langd ENLIGT MINNET, efter tvattens trimning.
   *
   * TIDSBASEN MASTE VARA GEMENSAM. Tvatten skriver ett `trimAt` som kortar
   * minnets tidslinje (den hittade en latgrans inne i segmentet, eller tystnad i
   * slutet), men WAV:en pa disk ar OTRIMMAD. Skickas den rakt upp beskriver
   * strukturen ett langre ljud an tidslinjen, och sektionstiderna pekar fel ju
   * langre in i laten man kommer. Darfor klipps ljudet till minnets langd HAR,
   * innan det lamnar Pi:n — samma ljud, samma nollpunkt.
   *   Att lata modellen hitta gransen sjalv racker inte: MATT 2026-08-08 satte
   *   den en sektionsgrans vid 212 s dar facit sager 208 s. Fyra sekunder fel,
   *   och den sager "ny sektion", inte "ny lat". Bra nog for att bekrafta en
   *   grans, for grovt for att klippa efter.
   */
  enqueue(wav: string, songId: number, durationMs?: number): void {
    if (this.store[String(songId)]) { rm(wav); return; }        // redan analyserad
    const pend = this.pendingIds();
    if (pend.length >= MAX_PENDING) {
      console.log(`[struktur] kön full (${pend.length}) — hoppar över låt #${songId}`);
      rm(wav);
      return;
    }
    try {
      // Nedsamplas till 16 kHz mono: strukturanalys behöver inte mer, och det tar
      // uppladdningen från ~23 MB till ~7,7 MB. Ingen ffmpeg finns på Pi:n.
      const small = join(this.dir, `${songId}.pending.wav`);
      downsampleWav(wav, small, TARGET_RATE, durationMs);
      rm(wav);
      console.log(`[struktur] låt #${songId} köad för analys (${pend.length + 1} i kö)`);
    } catch (e) {
      console.error(`[struktur] kunde inte köa #${songId}:`, (e as Error).message);
      rm(wav);
    }
  }

  /** Anropas från motorns långsamma tick. Gör ingenting utan nyckel eller kö. */
  tick(): void {
    if (this.busy) return;
    if (Date.now() < this.nextTryAt) return;
    const token = this.getToken();
    if (!token) return;
    const ids = this.pendingIds();
    if (!ids.length) return;
    this.busy = true;
    this.run(ids[0], token)
      .then(() => { this.failures = 0; this.lastError = ""; })
      .catch((e: Error) => {
        this.failures++;
        this.lastError = e.message;
        const wait = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (this.failures - 1));
        this.nextTryAt = Date.now() + wait;
        console.error(`[struktur] misslyckades (${this.failures}): ${e.message} — nytt försök om ${Math.round(wait / 60000)} min`);
      })
      .finally(() => { this.busy = false; });
  }

  private async run(songId: number, token: string): Promise<void> {
    const wav = join(this.dir, `${songId}.pending.wav`);
    if (!existsSync(wav)) return;
    const mb = (statSync(wav).size / 1048576).toFixed(1);
    console.log(`[struktur] analyserar låt #${songId} (${mb} MB) …`);

    const url = await uploadFile(wav, token);
    const out = await predict(url, token);
    const parsed = parseAllInOne(out);
    if (!parsed.parts.length) throw new Error("svaret innehöll inga sektioner");

    const s: SongStructure = { v: 1, ...parsed, analysedMs: Date.now(), via: MODEL };
    this.store[String(songId)] = s;
    this.save();
    // FÖRST NU raderas ljudet. Ordningen är avsiktlig: sparas analysen inte
    // ligger WAV:en kvar och jobbet görs om — vi tappar aldrig en låt.
    rm(wav);
    const kinds = [...new Set(s.parts.map((p) => p.label))].join(", ");
    console.log(`[struktur] låt #${songId} klar: ${s.parts.length} sektioner (${kinds})${s.bpm ? `, ${s.bpm.toFixed(1)} BPM` : ""}`);
    this.onApplied(songId, s);
  }
}

/* ---------------------------------------------------------------- Replicate */

async function uploadFile(path: string, token: string): Promise<string> {
  const data = readFileSync(path);
  const boundary = "----pidmx" + data.length.toString(36);
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="content"; filename="song.wav"\r\nContent-Type: audio/wav\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const res = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: Buffer.concat([head, data, tail]),
  });
  if (!res.ok) throw new Error(`uppladdning ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j: any = await res.json();
  const url = j?.urls?.get ?? j?.urls?.download;
  if (!url) throw new Error("uppladdningen gav ingen URL");
  return url;
}

async function predict(fileUrl: string, token: string): Promise<any> {
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    // visualize/sonify AV med flit: de producerar bilder och ljudfiler vi inte
    // anvander, och varje extra utdata kostar tid och bandbredd.
    body: JSON.stringify({ version: VERSION, input: { music_input: fileUrl, visualize: false, sonify: false } }),
  });
  if (!res.ok) throw new Error(`start ${res.status}: ${(await res.text()).slice(0, 200)}`);
  let pred: any = await res.json();

  // Körningen tar ~80 s enligt modellens egen uppgift; kallstart kan ta längre.
  // Taket på 15 min är generöst med flit — ett avbrott här kostar en ny körning.
  const deadline = Date.now() + 900000;
  while (pred.status === "starting" || pred.status === "processing") {
    if (Date.now() > deadline) throw new Error("tidsgräns (15 min)");
    await new Promise((r) => setTimeout(r, POLL_MS));
    const p = await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${token}` } });
    if (!p.ok) throw new Error(`poll ${p.status}`);
    pred = await p.json();
  }
  if (pred.status !== "succeeded") throw new Error(`körning ${pred.status}: ${String(pred.error).slice(0, 200)}`);
  // UTDATA AR EN ARRAY AV FIL-URL:er, inte ett JSON-objekt (schemat sager
  // {type: array, items: {type: string, format: uri}} — uppmatt 2026-08-08).
  // Analysen ligger alltsa i en fil som maste hamtas separat.
  const urls: string[] = (Array.isArray(pred.output) ? pred.output : [pred.output]).filter((x: any) => typeof x === "string");
  const jsonUrl = urls.find((u) => u.toLowerCase().endsWith(".json")) ?? urls[0];
  if (!jsonUrl) throw new Error("körningen gav inga filer");
  const f = await fetch(jsonUrl);
  if (!f.ok) throw new Error(`hämtning av resultatet ${f.status}`);
  const txt = await f.text();
  try { return JSON.parse(txt); } catch { throw new Error(`resultatet var inte JSON: ${txt.slice(0, 120)}`); }
}

/**
 * Tolka modellens svar.
 *
 * FÄLTNAMNEN ÄR INTE VERIFIERADE mot en riktig körning (det kräver en API-nyckel
 * som inte finns här). Därför läses flera stavningar, och HELA svaret loggas
 * första gången det inte går att tolka — så anpassningen kan göras på riktig
 * data i stället för på en gissning.
 */
export function parseAllInOne(out: any): { bpm?: number; downbeats?: number[]; parts: SongPart[] } {
  const o = typeof out === "string" ? safeJson(out) : out;
  const root = o?.segments || o?.segment ? o : (o?.output ?? o);
  const segs = root?.segments ?? root?.segment ?? root?.sections ?? [];
  const parts: SongPart[] = [];
  for (const s of Array.isArray(segs) ? segs : []) {
    const start = num(s?.start ?? s?.t ?? s?.begin);
    const label = String(s?.label ?? s?.name ?? s?.function ?? "").trim().toLowerCase();
    if (start === null || !label) continue;
    parts.push({ t: Math.round(start * 1000), label });
  }
  parts.sort((a, b) => a.t - b.t);
  // SLA IHOP GRANNAR MED SAMMA ETIKETT. Modellen delar langa sektioner vid
  // frasgranser, sa svaret innehaller sekvenser som "INT INT", "CHO CHO",
  // "VER VER". MATT 2026-08-08 pa agarens egna latar: 11 sektioner blev 9 och
  // 13 blev 8 efter hopslagning — och det ar de hopslagna som motsvarar vad
  // laten FAKTISKT bestar av. For dirigenten ar skillnaden viktig: den ska byta
  // look nar refrangen borjar, inte mitt i den.
  const merged: SongPart[] = [];
  for (const p of parts) {
    if (merged.length && merged[merged.length - 1].label === p.label) continue;
    merged.push(p);
  }
  parts.length = 0;
  parts.push(...merged);
  const dbRaw = root?.downbeats ?? root?.downbeat ?? [];
  const downbeats = (Array.isArray(dbRaw) ? dbRaw : []).map((x: any) => Math.round(num(x)! * 1000)).filter((x) => Number.isFinite(x));
  const bpm = num(root?.bpm ?? root?.tempo) ?? undefined;
  if (!parts.length) console.error("[struktur] kunde inte tolka svaret:", JSON.stringify(o).slice(0, 600));
  return { bpm: bpm ?? undefined, downbeats: downbeats.length ? downbeats : undefined, parts };
}

/* ------------------------------------------------------------------ hjälpare */

function num(x: any): number | null {
  const v = typeof x === "string" ? parseFloat(x) : x;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function safeJson(s: string): any { try { return JSON.parse(s); } catch { return null; } }
function rm(p: string): void { try { unlinkSync(p); } catch { /* fanns inte */ } }

/**
 * Nedsampling till mono med heltalsdecimering + medelvärde över klustret.
 * Enkelt lågpass, men fullt tillräckligt: strukturanalysen tittar på sektioner
 * på tiotals sekunder, inte på diskantdetaljer.
 */
export function downsampleWav(src: string, dst: string, targetRate: number, maxMs?: number): void {
  const b = readFileSync(src);
  let p = 12, ch = 1, rate = 0, dOff = 0, dLen = 0;
  while (p + 8 <= b.length) {
    const id = b.toString("ascii", p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === "fmt ") { ch = b.readUInt16LE(p + 10); rate = b.readUInt32LE(p + 12); }
    else if (id === "data") { dOff = p + 8; dLen = Math.min(sz, b.length - dOff); break; }
    p += 8 + sz + (sz & 1);
  }
  if (!rate || !dLen) throw new Error("trasig WAV");
  const i16 = new Int16Array(b.buffer, b.byteOffset + dOff, dLen >> 1);
  let frames = Math.floor(i16.length / ch);
  // Klipp till minnets langd sa uppladdningen och tidslinjen delar nollpunkt OCH slut.
  if (maxMs && maxMs > 1000) frames = Math.min(frames, Math.floor((maxMs / 1000) * rate));
  const step = Math.max(1, Math.round(rate / targetRate));
  const outRate = Math.round(rate / step);
  const outN = Math.floor(frames / step);
  const out = Buffer.alloc(44 + outN * 2);
  out.write("RIFF", 0); out.writeUInt32LE(36 + outN * 2, 4); out.write("WAVE", 8);
  out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22); out.writeUInt32LE(outRate, 24);
  out.writeUInt32LE(outRate * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write("data", 36); out.writeUInt32LE(outN * 2, 40);
  for (let i = 0; i < outN; i++) {
    let acc = 0, n = 0;
    for (let k = 0; k < step; k++) {
      const f = i * step + k;
      if (f >= frames) break;
      if (ch === 1) acc += i16[f];
      else acc += (i16[f * ch] + i16[f * ch + 1]) / 2;
      n++;
    }
    let v = Math.round(acc / Math.max(1, n));
    if (v > 32767) v = 32767; else if (v < -32768) v = -32768;
    out.writeInt16LE(v, 44 + i * 2);
  }
  writeFileSync(dst, out);
}
