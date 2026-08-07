/**
 * LÅTMINNE — motorn lär sig varje låt som spelas och kör showen från minnet
 * nästa gång samma inspelning dyker upp.
 *
 * Tre delar:
 *   1. INLÄRNING  — medan en låt spelas samlas landmärkes-hashar (fingerprint.ts)
 *      plus en tidslinje: var dropsen låg, tempot, och energikurvan.
 *   2. IGENKÄNNING — varje ny hash slås upp i ett invers-index. Rösterna läggs i
 *      offset-fack (offset = tid_i_låt − tid_nu). När ett fack får tydlig majoritet
 *      vet vi både VILKEN låt och VAR i den vi är.
 *   3. REPLAY     — igenkänd låt → drops triggas från tidslinjen (120 ms FÖRE, så
 *      lamporna hinner), tempot låses direkt, och energikurvan styr dramaturgin.
 *
 * Lagring: en binär fil (atomisk skrivning) utanför config.json — inlärningen
 * ska inte slita på SD-kortet vid varje inställningsändring.
 */

import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Fingerprinter, FRAME_MS, type Landmark } from "./fingerprint.js";

const PATH = process.env.SONGS_PATH ?? "/var/lib/audio-dmx-engine/songs.bin";
const MAGIC = 0x444d5331;      // "DMS1"
const MAX_SONGS = 500;
const PRE_FIRE_MS = 120;       // trigga dropen strax före → lamporna hinner
const SILENCE_END_MS = 3000;   // tystnad så länge = låten är slut
const OFFSET_BUCKET = 250;     // ms per offset-fack
const VOTES_NEEDED = 10;
const MARGIN = 2;        // vinnaren måste ha dubbelt så många röster som bästa ANNAN låt
const LEARN_QUARANTINE_MS = 30000; // nyss känd låt = breakdown/tillfälligt tapp, inte ny låt

// LÅTGRÄNS UTAN TYSTNAD. Spotify/Apple Music spelar gaplöst eller crossfadar —
// 3 s tystnad inträffar aldrig, och utan de här signalerna blir hela kvällen
// "en låt". Mätt på riktig Spotify-ström via AUX fyrar nivådipp under 55 % av
// snittet ungefär en gång per tre minuter och får därför ensam sätta en gräns.
// Övriga signaler vägs fortfarande som SAMLAD EVIDENS: temposkifte + klangskifte.
// Två vakter gör det robust: minsta låtlängd (en drop/breakdown sker alltid inom
// den) och ett maxtak (aldrig 22 minuters gröt igen). Missas en gräns tappar vi
// bara inlärningen för spåret och realtidsdetektorn kör som förut — ren uppsida.
const MIN_SEG_MS = 110000;     // MÄTT: 75 s triggade direkt (två segment exakt 75 s) → höjt
const MAX_SEG_MS = 600000;     // 10 min utan gräns → tvinga fram en
// MÄTT PÅ HÅRDVARA: tempoföljaren vacklar systematiskt INOM samma låt
// (126→91, 129→92, 129→93, 129→92 på 28 s — kvot 1.39–1.40 varje gång, en
// tolkningsmiss som ingen kvotlista fångar). Ett tempohopp får därför ALDRIG
// fyra en gräns ensamt: BPM är en STÖDsignal, en av två. Den bärande gränsen är
// nivådipp + klangskifte, så klangskiftet är gjort känsligare för att kompensera.
const EVIDENCE_NEEDED = 2;       // alltid minst två signaler
const BPM_JUMP = 0.07;           // >7 % tempoändring = en (av två) signaler
const BPM_HOLD_MS = 4000;        // ...som håller i 4 s (inte en halvtaktsmiss)
const DIP_RATIO = 0.55;          // nivå under 55 % av snittet (min/snitt mätt 0.505)

const DIP_WIN_MS = 6000;       // dipp räknas som evidens så länge efteråt
const START_LEVEL = 0.15;      // volymgrind: starta bara på tydlig musik
const START_HOLD_MS = 1000;    // ...som hållit i en sekund
const NOV_WIN_MS = 1500;       // klangprofil per 1.5 s
const NOV_TH = 0.30;           // L1-avstånd (0..2): absolut golv
const NOV_FACTOR = 2.2;        // ...och minst så många gånger låtens egen variation (sänkt: bär gränsen nu)
const NOV_HITS = 2;            // två fönster i rad (3 s) → inte en enstaka spik
const NOV_WIN_KEEP_MS = 6000;  // klangskifte räknas som evidens så länge efteråt
const NOV_BANDS = [40, 80, 160, 320, 640, 1280, 2560, 5120, 11000];
// IGENKÄNNING SOM GRÄNS. Känner igenkännaren en ANNAN känd låt mitt i ett segment,
// och matchen pekar på låtens BÖRJAN, är det en nära-säker låtgräns — gratis, allt
// är redan uträknat. Övertrumfar evidens-regeln och minsta längd: exakta gränser
// för kända låtar, dvs varje repris skärper minnet.
const RECOG_SPLIT_MIN_MS = MIN_SEG_MS;   // aldrig committa under minsta låtlängd — annars ger en smutsig blob en kaskad
const RECOG_POS_MS = 20000;         // ...och matchen ligga inom låtens första 20 s




interface Drop { t: number; s: number; c: number; }
/** v2-dramaturgi ur offline-tvätten. Alla fält är VALFRIA: en låt som lärdes in
 *  före v2 (eller aldrig tvättats) saknar dem och körs exakt som förut. */
interface Riser { start: number; end: number; drop: number; }
interface SongMeta {
  id: number; createdMs: number; lastMs: number; plays: number; durationMs: number;
  bpm: number; beatPhaseMs: number; drops: Drop[]; intensity: number[];   // 1 värde/s, 0–255
  risers?: Riser[];        // uppbyggnader med känt mål
  sections?: number[];     // tidpunkter (ms) där låtens karaktär skiftar
  phraseMs?: number;       // längden på en 16-taktersfras (frasgrid, fas = beatPhaseMs)
}
interface Song { meta: SongMeta; hashes: Uint32Array; times: Uint32Array; }


export interface SongMemoryState {
  songs: number;        // antal lärda låtar
  known: boolean;       // känd låt just nu
  plays: number;        // hur många gånger den har spelats tidigare
  confidence: number;   // 0..1
  positionMs: number;   // var i låten vi är
  learning: boolean;    // spelar just nu in en ny låt
  learningId: number;   // id som inlärningen kommer att skrivas till (0 = ingen)
  lastEvidence: string[];   // gränssignaler som var aktiva vid senaste kontrollen (diagnostik)

}

export class SongMemory {
  /** Klockan är injicerbar enbart för test (simulerad tid → snabb replay-verifiering). */
  constructor(private readonly clock: () => number = Date.now) {}

  private songs = new Map<number, Song>();
  /** INVERS-INDEX, kompakt. Ett Map<hash, number[]> kostade ~450 MB RAM för 500
   *  låtar (en liten JS-array per hash) — otänkbart på en Pi Zero 2W med 512 MB.
   *  Nu: två sorterade typade arrayer (~7 MB) + binärsökning.
   *  idxVal = slot(20 bit) << 12 | ruta(12 bit), där slot pekar i slotIds och
   *  ruta är låt-tid / FRAME_MS. */
  private idxHash = new Uint32Array(0);
  private idxVal = new Uint32Array(0);
  private slotIds: number[] = [];

  private nextId = 1;
  private dirty = false;

  private fp = new Fingerprinter();
  private lm: Landmark[] = [];

  // Inlärning
  private playStart = 0;          // väggklocka då låten började
  private lastLoud = 0;
  private learnHash: number[] = [];
  private learnTime: number[] = [];
  private learnDrops: Drop[] = [];
  private learnIntensity: number[] = [];
  private bpmSamples: number[] = [];
  private bpmAnchor = 0;
  private learnMode = true;       // false = mikrofon: känn igen, men lär inget

  // Låtgräns utan tystnad
  private segBpm = 0;             // tempot den pågående sekvensen etablerat
  private segBpmConf = 0;         // konfidensen tempot etablerades med
  private bpmOffSince = 0;        // väggklocka då tempot började avvika
  private novAcc = new Float32Array(NOV_BANDS.length - 1);
  private novN = 0;
  private novStart = 0;
  private novRef: Float32Array | null = null;
  private novAt = 0;              // väggklocka för senaste klangskiftet
  private novAvg = 0;             // låtens normala fönster-till-fönster-variation
  private novHits = 0;            // fönster i rad över tröskeln
  private levAvg = 0;             // långsamt nivåsnitt (dippdetektering)
  private dipAt = 0;              // väggklocka för senaste nivådippen
  private lastEvidence: string[] = [];   // senast aktiva gränssignaler (diagnostik)
  /** Räknare som tickar vid varje satt låtgräns → motorn kan kalibrera om dynamiken. */
  boundaryCount = 0;
  private loudSince = 0;          // volymgrind: sedan när nivån är tydlig musik
  private recogSplit = -1;        // ≥0: igenkänningen pekar på gräns, matchens position i ms
  private lastMatchedAt = 0;       // håll inlärning i karantän efter senast etablerade match
  private quarantinedSegment = false;




  // Matchning
  private votes = new Map<number, number>();   // songId*100000 + bucket → röster
  private lastDecay = 0;
  private matchId = 0;
  private matchOffset = 0;
  private matchVotes = 0;
  private replayIdx = 0;
  private pendingDrop = 0;        // styrka på en drop som ska fyras av

  async load(): Promise<void> {
    let buf: Buffer;
    try { buf = await readFile(PATH); } catch { return; }
    try {
      if (buf.length < 8 || buf.readUInt32LE(0) !== MAGIC) return;
      const n = buf.readUInt32LE(4);
      let p = 8;
      for (let i = 0; i < n; i++) {
        const metaLen = buf.readUInt32LE(p); p += 4;
        const meta = JSON.parse(buf.subarray(p, p + metaLen).toString("utf8")) as SongMeta; p += metaLen;
        const h = buf.readUInt32LE(p); p += 4;
        const hashes = new Uint32Array(h), times = new Uint32Array(h);
        for (let k = 0; k < h; k++) { hashes[k] = buf.readUInt32LE(p); times[k] = buf.readUInt32LE(p + 4); p += 8; }
        this.songs.set(meta.id, { meta, hashes, times });
        if (meta.id >= this.nextId) this.nextId = meta.id + 1;
      }
      this.rebuildIndex();
      console.log(`[song] ${this.songs.size} lärda låtar i minnet`);
    } catch (e) {
      console.error("[song] kunde inte läsa låtminnet:", (e as Error).message);
      this.songs.clear(); this.idxHash = new Uint32Array(0); this.idxVal = new Uint32Array(0); this.slotIds = [];
    }
  }

  /** Bygg om det sorterade indexet. Körs vid start och när en låt lagts till /
   *  rensats bort — aldrig på ljudvägen. */
  private rebuildIndex(): void {
    let total = 0;
    for (const s of this.songs.values()) total += s.hashes.length;
    // Sortera som 64-bitars (hash<<32 | val) i EN typad array: en vanlig
    // JS-array med index hade boxat ~850k tal och kostat hundratals MB.
    const pack = new BigUint64Array(total);
    this.slotIds = [];
    let p = 0;
    for (const s of this.songs.values()) {
      const slot = this.slotIds.push(s.meta.id) - 1;
      for (let k = 0; k < s.hashes.length; k++) {
        const val = (slot << 12) | Math.min(4095, Math.round(s.times[k] / FRAME_MS));
        pack[p++] = (BigInt(s.hashes[k]) << 32n) | BigInt(val);
      }
    }
    pack.sort();
    const hash = new Uint32Array(total), value = new Uint32Array(total);
    for (let i = 0; i < total; i++) {
      hash[i] = Number(pack[i] >> 32n);
      value[i] = Number(pack[i] & 0xffffffffn);
    }
    this.idxHash = hash;
    this.idxVal = value;
  }

  /** Första positionen i idxHash med `h` (eller -1). */
  private find(h: number): number {
    let lo = 0, hi = this.idxHash.length - 1, res = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.idxHash[mid] < h) lo = mid + 1;
      else { if (this.idxHash[mid] === h) res = mid; hi = mid - 1; }
    }
    return res;
  }


  private saving: Promise<void> = Promise.resolve();

  /** Skrivningar serialiseras — två parallella skrivningar delade temp-filnamn
   *  och den ena renamade bort den andras fil (ENOENT). */
  private save(): Promise<void> {
    this.saving = this.saving.then(() => this.saveNow());
    return this.saving;
  }

  private async saveNow(): Promise<void> {
    if (!this.dirty) return;
    this.dirty = false;
    const parts: Buffer[] = [];
    const head = Buffer.alloc(8);
    head.writeUInt32LE(MAGIC, 0); head.writeUInt32LE(this.songs.size, 4);
    parts.push(head);
    for (const s of this.songs.values()) {
      const meta = Buffer.from(JSON.stringify(s.meta), "utf8");
      const b = Buffer.alloc(4 + meta.length + 4 + s.hashes.length * 8);
      b.writeUInt32LE(meta.length, 0);
      meta.copy(b, 4);
      let p = 4 + meta.length;
      b.writeUInt32LE(s.hashes.length, p); p += 4;
      for (let k = 0; k < s.hashes.length; k++) { b.writeUInt32LE(s.hashes[k], p); b.writeUInt32LE(s.times[k], p + 4); p += 8; }
      parts.push(b);
    }
    const all = Buffer.concat(parts);
    try {
      await mkdir(dirname(PATH), { recursive: true });
      await writeFile(`${PATH}.tmp`, all);
      await rename(`${PATH}.tmp`, PATH);
    } catch (e) {
      console.error("[song] kunde inte spara låtminnet:", (e as Error).message);
    }
  }

  /** Matas varje gång analysatorn har en ny 2048-magnitud (låt-tid ur klockan).
   *  `learn` = false (mikrofon) → vi känner igen men lär oss inget: mikens 20×
   *  gain drar in sorl och rumsljud, och ett smutsigt fingeravtryck är värre än
   *  inget. */
  pushSpectrum(mag: Float32Array, binHz: number, learn = true): void {
    if (!this.playStart) return;
    const tLive = this.clock() - this.playStart;
    this.lm.length = 0;
    this.fp.push(mag, binHz, tLive, this.lm);
    for (const l of this.lm) {
      if (learn && !this.quarantinedSegment && l.store) { this.learnHash.push(l.hash); this.learnTime.push(l.t); }
      this.vote(l);
    }

    this.pushNovelty(mag, binHz);
  }

  /** KLANGSKIFTE. Energin samlas i oktavband, normaliseras (form, inte volym)
   *  och jämförs var 1.5 s med ett långsamt referensspektrum.
   *
   *  Tröskeln är ADAPTIV: hur mycket profilen normalt rör sig skiljer sig
   *  enormt mellan en jämn housemix och sparsam akustisk musik, så ett fast
   *  tal ger antingen falska gränser eller inga alls. Vi kräver att avståndet
   *  är flera gånger större än låtens EGEN normala variation — och att det
   *  håller två fönster i rad (3 s), vilket ett nytt spår gör men en
   *  refrängövergång inte. */
  private pushNovelty(mag: Float32Array, binHz: number): void {
    const now = this.clock();
    if (!this.novStart) this.novStart = now;
    for (let b = 0; b < this.novAcc.length; b++) {
      const lo = Math.max(1, Math.round(NOV_BANDS[b] / binHz));
      const hi = Math.min(mag.length - 1, Math.round(NOV_BANDS[b + 1] / binHz));
      let s = 0;
      for (let i = lo; i <= hi; i++) s += mag[i];
      this.novAcc[b] += hi >= lo ? s / (hi - lo + 1) : 0;
    }
    this.novN++;
    if (now - this.novStart < NOV_WIN_MS) return;
    this.novStart = now;
    let sum = 0;
    for (let b = 0; b < this.novAcc.length; b++) sum += this.novAcc[b];
    const prof = new Float32Array(this.novAcc.length);
    if (sum > 0) for (let b = 0; b < prof.length; b++) prof[b] = this.novAcc[b] / sum;
    this.novAcc.fill(0); this.novN = 0;
    if (sum <= 0) return;
    if (!this.novRef) { this.novRef = prof; return; }
    let d = 0;
    for (let b = 0; b < prof.length; b++) d += Math.abs(prof[b] - this.novRef[b]);
    const bar = Math.max(NOV_TH, this.novAvg * NOV_FACTOR);
    if (this.novAvg > 0 && d > bar) {
      this.novHits++;
      if (this.novHits >= NOV_HITS) this.novAt = this.clock();
    } else this.novHits = 0;
    this.novAvg = this.novAvg > 0 ? this.novAvg * 0.9 + d * 0.1 : d;
    for (let b = 0; b < prof.length; b++) this.novRef[b] = this.novRef[b] * 0.75 + prof[b] * 0.25;
  }



  private vote(l: Landmark): void {
    const start = this.find(l.hash);
    if (start < 0) return;
    let end = start;
    while (end < this.idxHash.length && this.idxHash[end] === l.hash) end++;
    // ÖVERPOPULÄR HASH → ingen information. Ett par som återkommer i hundratals
    // lägen (en loop, en drone, en stadig hi-hat) pekar inte ut någon låt utan
    // sprider bara röster; att räkna den ger falska träffar.
    if (end - start > 60) return;
    for (let i = start; i < end; i++) {
      const v0 = this.idxVal[i];
      const id = this.slotIds[v0 >>> 12];
      const tSong = (v0 & 0xfff) * FRAME_MS;
      const off = tSong - l.t;
      if (off < -2000) continue;   // låten kan inte vara "före" sin egen början
      const key = id * 100000 + Math.round(off / OFFSET_BUCKET);
      const v = (this.votes.get(key) ?? 0) + 1;
      this.votes.set(key, v);
      const establishes = !this.matchId && v >= VOTES_NEEDED && v >= this.bestOther(id) * MARGIN;
      const replaces = !!this.matchId && id !== this.matchId && v >= VOTES_NEEDED && v > this.bestFor(this.matchId);
      if (id !== this.matchId && (establishes || replaces)) {
        const wasMatch = this.matchId;
        this.matchId = id;
        this.lastMatchedAt = this.clock();
        this.quarantinedSegment = false;
        this.matchOffset = Math.round(off / OFFSET_BUCKET) * OFFSET_BUCKET;
        this.replayIdx = 0;
        const s = this.songs.get(id);
        const pos = l.t + this.matchOffset;
        console.log(`[song] känd låt #${id} (${s?.meta.plays ?? 0} tidigare spelningar), position ${(pos / 1000).toFixed(1)}s`);
        // Ny känd låt som just börjat mitt i ett rullande segment → låtgräns.
        // (En match nära låtens början direkt efter segmentstart är samma låt, ej gräns.)
        if (this.playStart && this.clock() - this.playStart >= RECOG_SPLIT_MIN_MS && pos < RECOG_POS_MS && wasMatch !== id) this.recogSplit = pos;
      }

      if (id === this.matchId) this.matchVotes = Math.max(this.matchVotes, v);
    }
  }

  /** Bästa röstfack som tillhör en ANNAN låt än `id` — marginalkravet.
   *  Utan det räcker slumpmässiga hash-krockar för att peka ut fel låt. */
  private bestOther(id: number): number {
    let best = 1;
    for (const [k, v] of this.votes) if (Math.floor(k / 100000) !== id && v > best) best = v;
    return best;
  }

  private bestFor(id: number): number {
    let best = 0;
    for (const [k, v] of this.votes) if (Math.floor(k / 100000) === id && v > best) best = v;
    return best;
  }

  /**
   * Matas varje hop. Sköter låtgränser (start/slut), tidslinje-inspelning och
   * plockar fram nästa replay-drop.
   */
  tick(o: { level: number; dropped: boolean; bpm: number; bpmConfidence: number; intensity: number; beatAnchorMs: number; learn?: boolean }): void {
    const now = this.clock();
    const learn = o.learn !== false;
    // Byte av ingång mitt i en inlärning → kasta det halva materialet, annars
    // hamnar ett halvt mik-fingeravtryck i minnet.
    if (learn !== this.learnMode) { this.learnMode = learn; this.dropLearning(); }
    if (o.level > 0.02) this.lastLoud = now;
    if (!this.playStart) {
      // Volymgrind: starta bara på tydlig musik som hållit en sekund, aldrig på brusgolvet.
      if (o.level >= START_LEVEL) {
        if (!this.loudSince) this.loudSince = now;
        else if (now - this.loudSince >= START_HOLD_MS) {
          this.playStart = now - START_HOLD_MS; this.lastLoud = now; this.loudSince = 0; this.fp.reset();
          this.quarantinedSegment = learn && now - this.lastMatchedAt < LEARN_QUARANTINE_MS;
        }
      } else this.loudSince = 0;
      return;
    }

    if (now - this.lastLoud > SILENCE_END_MS) { this.commit(); return; }

    // En etablerad match hålls genom breakdowns och andra spektralt svaga partier.
    // Bara tystnad/commit eller en annan låt med fler röster får ersätta den.
    if (this.matchId) {
      this.lastMatchedAt = now;
      this.quarantinedSegment = false;
    } else if (this.quarantinedSegment) {
      if (now - this.lastMatchedAt < LEARN_QUARANTINE_MS) return;
      // Ingen känd låt återfanns under karantänen. Börja en ren inlärning NU så
      // WAV, fingeravtryck och tidslinje får samma nollpunkt.
      this.restartLearningAt(now);
      return;
    }

    // Igenkänning-som-gräns: säkrare än all heuristik → egen väg, före evidensen.
    if (this.recogSplit >= 0) { this.splitOnRecognition(now, this.recogSplit); return; }

    const tLive = now - this.playStart;
    if (this.boundary(now, tLive, o)) return;


    // Tidslinje-inspelning (alltid — även för en känd låt, så minnet förbättras).
    const songT = this.matchId ? tLive + this.matchOffset : tLive;
    if (learn) {
      if (o.dropped) this.learnDrops.push({ t: songT, s: Math.min(1, 0.5 + o.intensity * 0.5), c: 1 });
      const sec = Math.floor(songT / 1000);
      if (sec >= 0 && this.learnIntensity.length <= sec) {
        while (this.learnIntensity.length < sec) this.learnIntensity.push(128);
        this.learnIntensity.push(Math.round(Math.max(0, Math.min(1, o.intensity)) * 255));
      }
      if (o.bpm > 0 && o.bpmConfidence > 0.4) {
        if (this.bpmSamples.length < 4000) this.bpmSamples.push(o.bpm);
        if (!this.bpmAnchor && o.beatAnchorMs) this.bpmAnchor = ((o.beatAnchorMs - this.playStart) % 60000 + 60000) % 60000;
      }
    }

    // Röstförfall: gamla röster ska inte hålla en match vid liv i en ny låt.
    if (now - this.lastDecay > 4000) {
      this.lastDecay = now;
      for (const [k, v] of this.votes) { const nv = v * 0.6; if (nv < 1) this.votes.delete(k); else this.votes.set(k, nv); }
      if (this.matchId) {
        this.matchVotes *= 0.6;
      }
    }

    // REPLAY: nästa drop ur tidslinjen, PRE_FIRE_MS före.
    const s = this.matchId ? this.songs.get(this.matchId) : undefined;
    if (s) {
      const drops = s.meta.drops;
      while (this.replayIdx < drops.length && drops[this.replayIdx].t + PRE_FIRE_MS < songT) this.replayIdx++;
      if (this.replayIdx < drops.length && drops[this.replayIdx].t - PRE_FIRE_MS <= songT) {
        this.pendingDrop = drops[this.replayIdx].s;
        this.replayIdx++;
      }
    }
  }

  /** LÅTGRÄNS I EN GAPLÖS STRÖM. Nivådipp räcker ensam; övriga signaler kräver
   *  samlad evidens. Allt grindas av min/max-längd. Returnerar true om vi delade. */
  private boundary(now: number, tLive: number, o: { bpm: number; bpmConfidence: number; level: number }): boolean {
    // Nivådipp: även en crossfade har oftast ett ögonblick där nivån faller.
    this.levAvg = this.levAvg > 0 ? this.levAvg * 0.995 + o.level * 0.005 : o.level;
    if (this.levAvg > 0.05 && o.level < this.levAvg * DIP_RATIO) this.dipAt = now;

    if (o.bpmConfidence > 0.5 && o.bpm > 40 && !this.segBpm) { this.segBpm = o.bpm; this.segBpmConf = o.bpmConfidence; }
    let bpmShift = "";
    if (o.bpmConfidence > 0.5 && o.bpm > 40 && this.segBpm) {
      const dev = Math.abs(o.bpm - this.segBpm) / this.segBpm;
      if (dev > BPM_JUMP) {
        if (!this.bpmOffSince) this.bpmOffSince = now;
        if (now - this.bpmOffSince > BPM_HOLD_MS) bpmShift = `tempo ${this.segBpm.toFixed(0)}→${o.bpm.toFixed(0)} BPM`;
      } else {
        this.bpmOffSince = 0;
        this.segBpm = this.segBpm * 0.95 + o.bpm * 0.05;
        this.segBpmConf = Math.max(this.segBpmConf, o.bpmConfidence);
      }
    }

    if (tLive < MIN_SEG_MS) return false;   // en drop/breakdown ligger alltid inom minsta längd

    const ev: string[] = [];
    if (bpmShift) ev.push(bpmShift);
    if (this.novAt && now - this.novAt < NOV_WIN_KEEP_MS) ev.push("klangskifte");
    if (this.dipAt && now - this.dipAt < DIP_WIN_MS) ev.push("nivådipp");
    this.lastEvidence = ev;

    let why = "";
    if (ev.length >= EVIDENCE_NEEDED) why = ev.join(" + ");
    else if (tLive > MAX_SEG_MS) why = "maxlängd";   // aldrig en 22-minuters gröt igen
    if (!why) return false;

    console.log(`[song] låtgräns efter ${(tLive / 1000).toFixed(0)}s (${why})`);
    this.commit();
    // Starta nästa sekvens direkt — strömmen tystnar aldrig.
    this.playStart = now;
    this.lastLoud = now;
    this.quarantinedSegment = this.learnMode && now - this.lastMatchedAt < LEARN_QUARANTINE_MS;
    return true;
  }

  /** Gräns satt av igenkännaren: skriv in det gångna segmentet och starta nästa
   *  med matchen behållen, tidsställd på låtens faktiska position. */
  private splitOnRecognition(now: number, pos: number): void {
    const id = this.matchId;
    console.log(`[song] låtgräns efter ${((now - this.playStart) / 1000).toFixed(0)}s (igenkänd låt #${id} vid ${(pos / 1000).toFixed(1)}s)`);
    this.commit();   // nollställer bl.a. matchId och recogSplit
    this.playStart = now - pos;
    this.lastLoud = now;
    this.matchId = id;
    this.matchOffset = 0;
    this.matchVotes = VOTES_NEEDED;
    this.replayIdx = 0;
  }




  /** Drop ur minnet som ska fyras av denna renderframe (0 = ingen). */
  takeDrop(): number {
    const d = this.pendingDrop;
    this.pendingDrop = 0;
    return d;
  }

  /** Lär just nu in en NY låt (aux, ej igenkänd) → temp-inspelningen ska rulla.
   *  Egen getter i stället för state() på ljudvägen: state() allokerar ett
   *  objekt, och den här frågan ställs 375 gånger i sekunden. */
  get learningNew(): boolean { return !!this.playStart && !this.matchId && this.learnMode && !this.quarantinedSegment; }

  /** Igenkänd låt → true medan replayen äger showen. */
  get recognized(): boolean { return this.matchId !== 0; }

  /** Tempo + taktfas ur minnet (väggklocka-ankare) — låser beat-klockan direkt. */
  lockedBeat(): { bpm: number; anchorMs: number } | null {
    const s = this.matchId ? this.songs.get(this.matchId) : undefined;
    if (!s || !s.meta.bpm) return null;
    return { bpm: s.meta.bpm, anchorMs: this.playStart + s.meta.beatPhaseMs };
  }

  /** Energikurvan ur minnet (0..1) på nuvarande position, eller null.
   *  LINJÄRT INTERPOLERAD mellan sekundvärdena: en förberäknad, mjuk kurva kan
   *  aldrig fladdra som live-VU:n gjorde. */
  replayIntensity(): number | null {
    const s = this.matchId ? this.songs.get(this.matchId) : undefined;
    if (!s || s.meta.intensity.length === 0) return null;
    const x = (this.clock() - this.playStart + this.matchOffset) / 1000;
    const i = Math.floor(x);
    if (i < 0 || i >= s.meta.intensity.length) return null;
    const a = s.meta.intensity[i] / 255;
    const b = (s.meta.intensity[i + 1] ?? s.meta.intensity[i]) / 255;
    return a + (b - a) * (x - i);
  }

  /** DRAMATURGI UR MINNET (bara igenkända, tvättade låtar). Mutera-och-återanvänd:
   *  frågan ställs på ljudvägen 375 gånger i sekunden → ingen allokering.
   *   build   = riser-ramp 0..1 som når 1.0 exakt på dropen (null = ingen riser)
   *   ceiling = normaliserad energikurva som ljustak (null = kör som idag)
   *   section = true den hop en sektionsgräns passeras
   *   phrase  = true den hop en 16-taktersfras börjar
   *   hasGrid = låten har sektioner/frasgrid → dirigenten får vänta in dem */
  private cues = { build: null as number | null, ceiling: null as number | null, section: false, phrase: false, hasGrid: false };
  private cuePrevT = -1;
  replayCues(): { build: number | null; ceiling: number | null; section: boolean; phrase: boolean; hasGrid: boolean } {
    const c = this.cues;
    c.build = null; c.ceiling = null; c.section = false; c.phrase = false; c.hasGrid = false;
    const s = this.matchId ? this.songs.get(this.matchId) : undefined;
    if (!s) { this.cuePrevT = -1; return c; }
    const t = this.clock() - this.playStart + this.matchOffset;
    const prev = this.cuePrevT < 0 || t < this.cuePrevT ? t : this.cuePrevT;
    this.cuePrevT = t;
    c.ceiling = this.replayIntensity();
    const m = s.meta;
    if (m.risers) for (const r of m.risers) {
      if (t >= r.start && t < r.end && r.end > r.start) { c.build = (t - r.start) / (r.end - r.start); break; }
    }
    if (m.sections?.length) {
      c.hasGrid = true;
      for (const st of m.sections) if (st > prev && st <= t) { c.section = true; break; }
    }
    if (m.phraseMs && m.phraseMs > 1000) {
      c.hasGrid = true;
      const ph = m.beatPhaseMs;
      c.phrase = Math.floor((prev - ph) / m.phraseMs) !== Math.floor((t - ph) / m.phraseMs);
    }
    return c;
  }


  state(): SongMemoryState {
    const s = this.matchId ? this.songs.get(this.matchId) : undefined;
    return {
      songs: this.songs.size,
      known: !!s,
      plays: s?.meta.plays ?? 0,
      confidence: s ? 1 : Math.max(0, Math.min(1, this.matchVotes / (VOTES_NEEDED * 3))),
      positionMs: this.playStart ? this.clock() - this.playStart + (s ? this.matchOffset : 0) : 0,
      learning: !!this.playStart && !s && this.learnMode && !this.quarantinedSegment,
      learningId: !!this.playStart && !s && this.learnMode && !this.quarantinedSegment ? this.nextId : 0,
      lastEvidence: this.lastEvidence.slice(),
    };

  }

  /** Avstängning: skriv in pågående låt och spara innan processen dör. */
  async flush(): Promise<void> {
    if (this.playStart) this.commit();
    await this.save();
  }

  /** Glöm allt (UI-knapp). */
  forget(): void {
    this.songs.clear(); this.votes.clear(); this.rebuildIndex();
    this.matchId = 0; this.matchVotes = 0; this.nextId = 1;
    this.dirty = true;
    void this.save();
  }

  /** Kasta pågående inlärning (ingången bytte mitt i låten). */
  private dropLearning(): void {
    this.learnHash = []; this.learnTime = []; this.learnDrops = []; this.learnIntensity = [];
    this.bpmSamples = []; this.bpmAnchor = 0;
    this.onDropLearning?.();
  }

  private restartLearningAt(now: number): void {
    this.dropLearning();
    this.playStart = now;
    this.lastLoud = now;
    this.quarantinedSegment = false;
    this.segBpm = 0; this.segBpmConf = 0; this.bpmOffSince = 0;
    this.novAt = 0; this.novRef = null; this.novAcc.fill(0); this.novN = 0; this.novStart = 0; this.novAvg = 0; this.novHits = 0;
    this.levAvg = 0; this.dipAt = 0; this.recogSplit = -1;
    this.votes.clear(); this.matchVotes = 0; this.replayIdx = 0; this.pendingDrop = 0;
    this.fp.reset();
  }

  /** Anropas när en låt är slut: id på låten som lärdes in/uppdaterades, eller
   *  null när inget lärdes (för kort, mikrofon, ingångsbyte). Motorn använder
   *  det för att trigga offline-tvätten. */
  onCommit?: (songId: number | null) => void;
  /** Anropas när pågående inlärning kastas → temp-inspelningen ska avbrytas. */
  onDropLearning?: () => void;

  /** Ersätt tidslinjen med de offline-tvättade värdena. Fingeravtrycket
   *  (hashar + tider) och spelräknaren rörs INTE 
   *  — de är för matchning.
   *  v1-sidecars saknar dramaturgi-fälten; då lämnas de orörda. */
  applyRefined(songId: number, t: {
    drops: { t: number; s: number }[]; bpm: number; beatPhaseMs: number; intensity: number[];
    risers?: Riser[]; sections?: number[]; phrase?: { p16: number } | null;
  }): void {
    const s = this.songs.get(songId);
    if (!s) return;
    s.meta.drops = t.drops.map((d) => ({ t: d.t, s: d.s, c: Math.max(2, s.meta.plays) }));   // tvättade drops är bekräftade
    if (t.bpm > 40) { s.meta.bpm = t.bpm; s.meta.beatPhaseMs = t.beatPhaseMs; }
    if (t.intensity.length) s.meta.intensity = t.intensity;
    if (t.risers) s.meta.risers = t.risers;
    if (t.sections) s.meta.sections = t.sections;
    if (t.phrase?.p16) s.meta.phraseMs = t.phrase.p16;
    this.dirty = true;
    void this.save();
    console.log(`[song] låt #${songId} tvättad: ${t.drops.length} drops, ${t.risers?.length ?? 0} risers, ${t.sections?.length ?? 0} sektioner, ${t.bpm} BPM`);
  }


  /** Låten är slut: skriv in i minnet (ny låt) eller förbättra den kända. */
  private commit(): void {
    this.boundaryCount++;   // gräns passerad → motorns auto-range får kalibrera om
    const dur = this.lastLoud - this.playStart;
    const matched = this.matchId ? this.songs.get(this.matchId) : undefined;
    let committed: number | null = null;
    if (this.learnMode && !this.quarantinedSegment && dur >= MIN_SEG_MS && this.learnHash.length > 60) {
      const bpm = median(this.bpmSamples);
      if (matched) { this.mergeInto(matched, dur, bpm); committed = matched.meta.id; }
      else committed = this.addSong(dur, bpm);
      this.dirty = true;
      void this.save();
    }
    // Nollställ för nästa låt.
    this.playStart = 0;
    this.learnHash = []; this.learnTime = []; this.learnDrops = []; this.learnIntensity = [];
    this.bpmSamples = []; this.bpmAnchor = 0;
    this.segBpm = 0; this.segBpmConf = 0; this.bpmOffSince = 0; this.novAt = 0; this.novRef = null; this.novAcc.fill(0); this.novN = 0; this.novStart = 0; this.novAvg = 0; this.novHits = 0;
    this.levAvg = 0; this.dipAt = 0; this.loudSince = 0; this.recogSplit = -1; this.quarantinedSegment = false;


    this.votes.clear(); this.matchId = 0; this.matchVotes = 0; this.replayIdx = 0; this.pendingDrop = 0;
    this.fp.reset();
    this.onCommit?.(committed);
  }


  private addSong(dur: number, bpm: number): number {
    if (this.songs.size >= MAX_SONGS) this.evict();
    // BUGG (mätt): samma id loggades två gånger — nextId kunde hamna efter en
    // redan använd id (t.ex. efter omladdning). Härled alltid ur befintliga låtar.
    for (const s of this.songs.values()) if (s.meta.id >= this.nextId) this.nextId = s.meta.id + 1;
    const id = this.nextId++;
    const meta: SongMeta = {
      id, createdMs: this.clock(), lastMs: this.clock(), plays: 1, durationMs: dur,
      bpm, beatPhaseMs: this.bpmAnchor,
      drops: this.learnDrops, intensity: this.learnIntensity,
    };
    const hashes = new Uint32Array(this.learnHash), times = new Uint32Array(this.learnTime);
    this.songs.set(id, { meta, hashes, times });
    this.rebuildIndex();
    console.log(`[song] lärde in ny låt #${id} (${(dur / 1000).toFixed(0)}s, ${hashes.length} hashar, ${meta.drops.length} drops)`);
    return id;
  }

  /** Andra (eller femte) gången samma låt: bekräftade drops vinner, engångs-
   *  falsklarm rensas bort. Fingeravtrycket behålls som det är. */
  private mergeInto(s: Song, dur: number, bpm: number): void {
    const m = s.meta;
    m.plays++; m.lastMs = this.clock();
    if (dur > m.durationMs) m.durationMs = dur;
    if (bpm > 0) m.bpm = m.bpm ? m.bpm * 0.7 + bpm * 0.3 : bpm;
    for (const d of this.learnDrops) {
      const hit = m.drops.find((x) => Math.abs(x.t - d.t) < 500);
      if (hit) { hit.c++; hit.t = Math.round(hit.t * 0.7 + d.t * 0.3); }
      else m.drops.push({ ...d });
    }
    if (m.plays >= 3) m.drops = m.drops.filter((d) => d.c / m.plays >= 0.4);
    m.drops.sort((a, b) => a.t - b.t);
    // Energikurvan: glidande medel över spelningarna → dramaturgin stabiliseras.
    for (let i = 0; i < this.learnIntensity.length; i++) {
      m.intensity[i] = m.intensity[i] === undefined
        ? this.learnIntensity[i]
        : Math.round(m.intensity[i] * 0.7 + this.learnIntensity[i] * 0.3);
    }
    console.log(`[song] uppdaterade låt #${m.id} (spelning ${m.plays}, ${m.drops.length} drops)`);
  }

  /** Minnet fullt → kasta den som spelats minst och senast hördes längst bak. */
  private evict(): void {
    let worst: Song | null = null;
    for (const s of this.songs.values()) {
      if (!worst) { worst = s; continue; }
      const a = s.meta.plays * 1e10 + s.meta.lastMs;
      const b = worst.meta.plays * 1e10 + worst.meta.lastMs;
      if (a < b) worst = s;
    }
    if (!worst) return;
    this.songs.delete(worst.meta.id);
    this.rebuildIndex();
  }
}

function median(a: number[]): number {
  if (a.length === 0) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[s.length >> 1];
}
