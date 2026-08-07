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
const OFFSET_KEY_STRIDE = 100000;
const OFFSET_KEY_BIAS = 10000; // negativa offset-fack måste fortfarande avkodas till rätt låt-id
const VOTES_NEEDED = 10;
const VOTES_NEEDED_START = 6;  // matchen pekar på låtens BÖRJAN → egen korroborerande signal, lås snabbare
const MARGIN = 2;        // vinnaren måste ha dubbelt så många röster som bästa ANNAN låt
// BIBLIOTEKSKÄNSLIGT BEVISKRAV. Med få lagrade låtar finns ingen konkurrent att
// slå, så MARGIN är nästan gratis och hela beviset vilar på röstantalet — och 10
// landmärkespar kan en generisk loop leverera. Därför: (a) fler röster krävs när
// biblioteket är litet, (b) rösterna måste ligga i ett SAMMANHÄNGANDE offset-
// kluster som spänner minst ett par sekunder ljud (en loop ger röster i en
// klump, en riktig match ger dem utspridda över tiden).
const SMALL_LIB = 10;          // under så många låtar räknas biblioteket som litet
const VOTES_SMALL_LIB = 6;     // extra röster som krävs då
const SPAN_MIN_MS = 2500;      // vinnarklustret måste spänna så mycket livetid
const SYNC_SAMPLES = 9;        // robust median innan tidspositionen korrigeras
const SYNC_SAMPLES_FAST = 5;   // ...men FÖRSTA korrigeringen efter ett lås ska komma direkt
const SYNC_INTERVAL_MS = 750;
const SYNC_NUDGE_MS = 25;      // korrekt lås får aldrig börja vandra
const SEEK_ERROR_MS = 1500;    // större stabilt hopp = seek/ny uppspelningsposition
// AUTOMATISK RE-LOCK. Nudgen rättar bara 25 ms/750 ms (≈33 ms/s) — ett medelstort
// fel (t.ex. crossfade, DSP-buffertbyte, klockdrift) under seek-tröskeln tar då
// tiotals sekunder att äta upp, och under tiden sitter droparna fel. Därför
// verifieras låset ofta mot ett OBEROENDE offset-estimat (medianen av de senaste
// råträffarna). Korrigeringen är GLIDANDE och proportionell mot driften: ju större
// drift, desto snabbare glid — så synken är hemma på ett par sekunder utan att
// showklockan hoppar (ett hopp syns som ryck i ljusprofilen). Bara en riktig seek
// (drift över RELOCK_SNAP_MS) snappar, för då ÄR positionen en annan.
const RELOCK_INTERVAL_MS = 1500;   // täta kontroller → driften hinner aldrig växa
const RELOCK_ERROR_MS = 120;       // under det här hörs/syns ingen skillnad
const RELOCK_MIN_HITS = 6;         // estimatet måste vila på flera träffar
const RELOCK_SNAP_MS = 900;        // så stort fel är en seek, inte drift → snappa
const RELOCK_GLIDE_MIN = 60;       // ms/s: mjukaste gliden (liten drift)
const RELOCK_GLIDE_MAX = 400;      // ms/s: snabbaste gliden (drift nära snap)
const MATCH_FRESH_MS = 6000;        // en aktiv match måste få nya, positionsenliga träffar
const MATCH_STABLE_MS = 5000;       // ...och ha hållit så länge innan den får dela ett segment
const FALSE_ZONE_MS = 15000;        // låttidszon runt en falskmatchad position som blockeras


const FALSE_HITS_MAX = 3;          // fler falskmatchningar än så i ett segment → låten tystas helt
const LEARN_QUARANTINE_MS = 30000; // nyss känd låt = breakdown/tillfälligt tapp, inte ny låt
// SKYDDSNÄT MOT ORENT SEGMENT. Missas en låtgräns svälver segmentet början av
// NÄSTA låt (mätt: 272 s i stället för 201 s). Spelas den låten sedan matchar
// den mot det orena segmentet och motorn kör FEL låts tidslinje — aktivt fel
// show, sämre än realtid. En match vars position gått förbi den lagrade låtens
// slut har definitionsmässigt inget mer att spela upp: släpp den då.
const TRIM_MIN_HALF_MS = 60000;    // en trimmad halva under 60 s är inte en låt


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
// MÄTT OFFLINE MOT FACIT (3 gaplösa Spotify-låtar, kända gränser 165 s / 317 s):
//  - Nivådippen är DÖD vid crossfade: dipp-kvot 0.979 och 0.906 vid gränserna,
//    mot DIP_RATIO 0.55. Inte ens 0.85 hade fångat gräns 1.
//  - Tempot var IDENTISKT 125 BPM på båda sidor om gräns 2.
//  - Klangskiftet såg BÅDA (percentil 88 och 92).
// Därför bär KLANGSKIFTET gränsen ENSAMT; nivådipp och tempo är extrasignaler
// som gör detektionen känsligare när de finns, men aldrig nödvändiga.
const BPM_JUMP = 0.07;           // >7 % tempoändring = extrasignal
const BPM_HOLD_MS = 4000;        // ...som håller i 4 s (inte en halvtaktsmiss)
const DIP_RATIO = 0.55;          // nivå under 55 % av snittet (extrasignal)

const DIP_WIN_MS = 6000;       // dipp räknas som evidens så länge efteråt
const START_LEVEL = 0.15;      // volymgrind: starta bara på tydlig musik
const START_HOLD_MS = 1000;    // ...som hållit i en sekund
const NOV_WIN_MS = 1500;       // klangprofil per 1.5 s
const NOV_LAG_MS = 8000;       // jämför mot profilen så långt bakåt (facitmätningens fönster)
const NOV_STRONG = 0.68;        // MÄTT: platå 0.60–0.75 gav 2/2 träff, 0 falska → mitten
const NOV_WEAK = 0.55;          // ...räcker om nivådipp eller temposkifte också fyrar
const NOV_BACK_MS = NOV_LAG_MS / 2;  // novelty reagerar när nya materialet fyllt fönstret (mätt 10–11 s för tidigt)
const NOV_WIN_KEEP_MS = 6000;  // klangskifte räknas som evidens så länge efteråt
const NOV_BANDS = [40, 80, 160, 320, 640, 1280, 2560, 5120, 11000];
// IGENKÄNNING SOM GRÄNS. Känner igenkännaren en ANNAN känd låt mitt i ett segment,
// och matchen pekar på låtens BÖRJAN, är det en nära-säker låtgräns — gratis, allt
// är redan uträknat. Övertrumfar evidens-regeln och minsta längd: exakta gränser
// för kända låtar, dvs varje repris skärper minnet.
const RECOG_SPLIT_MIN_MS = MIN_SEG_MS;   // aldrig committa under minsta låtlängd — annars ger en smutsig blob en kaskad
const RECOG_POS_MS = 20000;         // ...och matchen ligga inom låtens första 20 s
// FÖRETRÄDE: igenkänningen är den SÄKRASTE gränsen (den vet vilken låt som börjat),
// klangskiftet är en heuristik som dessutom ligger ~10 s för tidigt. Fyrar noveltyn
// först får en bekräftad match inom det här fönstret REVIDERA nollpunkten till
// låtens exakta position — ingen ny gräns sätts, bara tidslinjen rättas.
const RECOG_REVISE_MS = 20000;





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
  refinedFromMs?: number;  // hur mycket LJUD tvätten byggde på — en kortare tvätt får aldrig ersätta en längre
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
  songId: number;
  matchVotes: number;
  matchMargin: number;
  rawOffsetMs: number;
  correctedOffsetMs: number;
  lastBoundary: string;
  driftMs: number;
  relocks: number;

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
  /** Ringbuffert med klangprofiler → jämförelse mot NOV_LAG_MS bakåt. */
  private novHist: Float32Array[] = [];
  private novIdx = 0;             // nästa slot i ringen
  private novFilled = 0;          // antal skrivna profiler
  private novAt = 0;              // väggklocka för senaste klangskiftet
  private novPeak = 0;            // L1-avståndet vid det skiftet
  private levAvg = 0;             // långsamt nivåsnitt (dippdetektering)
  private dipAt = 0;              // väggklocka för senaste nivådippen
  private lastEvidence: string[] = [];   // senast aktiva gränssignaler (diagnostik)
  /** Räknare som tickar vid varje satt låtgräns → motorn kan kalibrera om dynamiken. */
  boundaryCount = 0;
  private loudSince = 0;          // volymgrind: sedan när nivån är tydlig musik
  /** Kandidat till igenkänning-gräns. Överriden får INTE dela ett segment på
   *  första röstmajoriteten — en falsk match dör inom MATCH_FRESH_MS, så gränsen
   *  väntar in en BEKRÄFTAD match (stabil ≥ MATCH_STABLE_MS med färska träffar).
   *  revise = klangskiftet hann före: gränsen finns redan, men på ungefärlig tid
   *  → matchens exakta position ska ersätta noveltyns (ingen ny gräns). */
  private recogPending: { id: number; at: number; revise?: boolean } | null = null;
  /** Väggklocka för senaste gräns satt av klangskifte/heuristik (revideringsfönster). */
  private heurBoundaryAt = 0;

  private lastMatchedAt = 0;       // håll inlärning i karantän efter senast etablerade match
  private quarantinedSegment = false;




  // Matchning
  private votes = new Map<number, number>();   // songId*100000 + bucket → röster
  private lastDecay = 0;
  private matchId = 0;
  private matchOffset = 0;
  private matchVotes = 0;
  private matchMargin = 0;
  private lastFreshMatchHit = 0;
  private blockedMatchId = 0;
  /** Hash-kluster (låttidszoner) som falskmatchat i DETTA segment → räknas inte
   *  igen. En låt som falskmatchas upprepat vid ~samma position har en för
   *  generisk sekvens där; att blockera bara låt-id:t räcker inte. */
  private blockedZones: { id: number; from: number; to: number }[] = [];
  /** Låt-id som falskmatchat för många gånger i detta segment → rösta inte på den alls. */
  private bannedIds = new Set<number>();
  private falseHits = new Map<number, number>();
  /** När nuvarande match låstes, och om den nått BEKRÄFTAD status (stabil + färska träffar). */
  private matchSince = 0;
  private matchConfirmed = false;
  private releasedAt = new Map<number, number>();   // id → senaste släppta position
  private rawOffset = 0;
  private syncBucket = 0;
  private syncOffsets: number[] = [];
  private lastSyncAt = 0;
  private syncFast = true;        // första korrigeringen efter ett lås ska komma direkt
  private lastRelockAt = 0;       // senaste periodiska låsverifieringen
  private relocks = 0;            // antal gånger synken tvingats tillbaka (diagnostik)
  private driftMs = 0;            // senast mätta drift mot oberoende estimat
  private relockTarget: number | null = null;  // pågående glid mot verifierat offset
  private glideAt = 0;            // klocka för glidens senaste steg

  /** Rullande råoffset per träff (id + off). Ger etableringen en median UNDER
   *  fack-upplösningen → låtstarten låses direkt, inte ±125 ms fel. */
  private recentId: number[] = [];
  private recentOff: number[] = [];
  private recentT: number[] = [];
  private lastBoundary = "";
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
   *  och jämförs var 1.5 s med profilen NOV_LAG_MS bakåt — exakt måttet som mättes
   *  mot facit (percentil 88 och 92 vid de verkliga gränserna). Tröskeln är
   *  ABSOLUT: den adaptiva varianten drog upp ribban i just de partier där en
   *  gaplös övergång sker, och missade båda facitgränserna. */
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
    this.novN = 0;
    if (sum <= 0) { this.novAcc.fill(0); return; }
    const lag = Math.max(1, Math.round(NOV_LAG_MS / NOV_WIN_MS));
    const size = lag + 1;
    if (this.novHist.length !== size) {
      this.novHist = [];
      for (let i = 0; i < size; i++) this.novHist.push(new Float32Array(this.novAcc.length));
      this.novIdx = 0; this.novFilled = 0;
    }
    const prof = this.novHist[this.novIdx];
    for (let b = 0; b < prof.length; b++) prof[b] = this.novAcc[b] / sum;
    this.novAcc.fill(0);
    this.novIdx = (this.novIdx + 1) % size;
    this.novFilled++;
    if (this.novFilled > lag) {
      const past = this.novHist[this.novIdx];   // efter framflyttningen pekar idx på äldsta = lag fönster bakåt
      let d = 0;
      for (let b = 0; b < prof.length; b++) d += Math.abs(prof[b] - past[b]);
      if (d >= NOV_WEAK) { this.novAt = now; this.novPeak = d; }
    }
  }

  private resetNovelty(): void {
    this.novAt = 0; this.novPeak = 0; this.novAcc.fill(0); this.novN = 0; this.novStart = 0;
    this.novHist = []; this.novIdx = 0; this.novFilled = 0;
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
      if (id === this.blockedMatchId || this.bannedIds.has(id)) continue;
      const tSong = (v0 & 0xfff) * FRAME_MS;
      if (this.inBlockedZone(id, tSong)) continue;
      const off = tSong - l.t;
      // Negativ offset är förväntad när en ny känd låt börjar mitt i ett
      // gaplöst segment: dess låttid är nära noll medan l.t fortfarande avser
      // föregående segments långa live-tidslinje.
      const bucket = Math.round(off / OFFSET_BUCKET);
      const key = this.voteKey(id, bucket);
      const v = (this.votes.get(key) ?? 0) + 1;
      this.votes.set(key, v);
      this.recentId.push(id); this.recentOff.push(off); this.recentT.push(l.t);
      if (this.recentId.length > 256) { this.recentId.shift(); this.recentOff.shift(); this.recentT.shift(); }
      const winner = this.bestFor(id);
      const other = this.bestCompetitor(id, winner.bucket);
      // START-LÅS: pekar vinnaren på låtens första sekunder är själva
      // startjusteringen en extra signal — då räcker färre röster, och en ny låt
      // i en gaplös ström låses innan första refrängen.
      const atStart = l.t + winner.bucket * OFFSET_BUCKET < RECOG_POS_MS;
      const need = (atStart ? VOTES_NEEDED_START : VOTES_NEEDED)
        + (this.songs.size < SMALL_LIB ? VOTES_SMALL_LIB : 0);
      const spread = this.clusterSpan(id, winner.bucket) >= SPAN_MIN_MS;
      const establishes = !this.matchId && spread && winner.votes >= need && winner.votes >= other * MARGIN;
      const replaces = !!this.matchId && id !== this.matchId && spread && winner.votes >= need && winner.votes > this.bestFor(this.matchId).votes;
      if (id !== this.matchId && (establishes || replaces)) {
        const wasMatch = this.matchId;
        this.matchId = id;
        this.lastMatchedAt = this.clock();
        this.quarantinedSegment = false;
        this.matchOffset = this.clusterOffset(id, winner.bucket);
        this.rawOffset = this.matchOffset;
        this.syncBucket = winner.bucket;
        this.syncOffsets = [];
        this.lastSyncAt = 0;
        this.syncFast = true;
        this.lastRelockAt = 0; this.driftMs = 0; this.relockTarget = null; this.glideAt = 0;
        this.matchVotes = winner.votes;
        this.matchMargin = winner.votes / Math.max(1, other);
        this.lastFreshMatchHit = this.clock();
        this.matchSince = this.clock();
        this.matchConfirmed = false;
        this.replayIdx = 0;
        const s = this.songs.get(id);
        const pos = l.t + this.matchOffset;
        console.log(`[song] känd låt #${id} (${s?.meta.plays ?? 0} tidigare spelningar), position ${(pos / 1000).toFixed(1)}s`);
        // Ny känd låt som just börjat mitt i ett rullande segment → KANDIDAT till
        // låtgräns. Beslutet tas först när matchen bekräftats (se tick).
        const tLive = this.playStart ? this.clock() - this.playStart : 0;
        const now = this.clock();
        if (this.playStart && pos < RECOG_POS_MS && wasMatch !== id && tLive - pos > RECOG_POS_MS) this.recogPending = { id, at: now };
        // Klangskiftet hann före: gränsen är redan satt, men ungefärlig. Matchen
        // vet exakt var låten började → revidera nollpunkten i stället.
        else if (this.playStart && pos < RECOG_POS_MS && this.heurBoundaryAt && now - this.heurBoundaryAt < RECOG_REVISE_MS
                 && Math.abs(tLive - pos) > 1000) this.recogPending = { id, at: now, revise: true };
        else this.recogPending = null;

      }

      if (id === this.matchId) this.trackSync(off, winner, other);
    }
  }

  /** Livetidsspann för träffarna i vinnarfacket (± ett fack). En generisk loop
   *  ger många röster i en tät klump; en riktig match ger dem utspridda. */
  private clusterSpan(id: number, bucket: number): number {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < this.recentId.length; i++) {
      if (this.recentId[i] !== id) continue;
      if (Math.abs(Math.round(this.recentOff[i] / OFFSET_BUCKET) - bucket) > 1) continue;
      if (this.recentT[i] < lo) lo = this.recentT[i];
      if (this.recentT[i] > hi) hi = this.recentT[i];
    }
    return hi > lo ? hi - lo : 0;
  }

  /** Median av de råoffset som ligger i vinnarfacket (± ett fack). Facket är
   *  250 ms grovt; medianen ger millisekunder. */
  private clusterOffset(id: number, bucket: number): number {
    const c: number[] = [];
    for (let i = 0; i < this.recentId.length; i++) {
      if (this.recentId[i] !== id) continue;
      if (Math.abs(Math.round(this.recentOff[i] / OFFSET_BUCKET) - bucket) > 1) continue;
      c.push(this.recentOff[i]);
    }
    return c.length >= 3 ? median(c) : bucket * OFFSET_BUCKET;
  }


  private inBlockedZone(id: number, tSong: number): boolean {
    for (const z of this.blockedZones) if (z.id === id && tSong >= z.from && tSong <= z.to) return true;
    return false;
  }

  private voteKey(id: number, bucket: number): number {
    return id * OFFSET_KEY_STRIDE + bucket + OFFSET_KEY_BIAS;
  }

  private voteId(key: number): number {
    return Math.floor(key / OFFSET_KEY_STRIDE);
  }

  private voteBucket(key: number): number {
    return key - this.voteId(key) * OFFSET_KEY_STRIDE - OFFSET_KEY_BIAS;
  }

  /** Starkaste konkurrerande förklaring: annan låt ELLER ett avlägset offsetfack
   *  i samma låt. Det senare är avgörande för repetitiv musik; MARGIN mot bara
   *  andra låtar kunde annars ge en falsk match maximal konfidens. */
  private bestCompetitor(id: number, winnerBucket: number): number {
    let best = 1;
    for (const [k, v] of this.votes) {
      const otherId = this.voteId(k);
      const bucket = this.voteBucket(k);
      if (otherId === id && Math.abs(bucket - winnerBucket) <= 2) continue;
      const clustered = v
        + (this.votes.get(this.voteKey(otherId, bucket - 1)) ?? 0)
        + (this.votes.get(this.voteKey(otherId, bucket + 1)) ?? 0);
      best = Math.max(best, clustered);
    }
    return best;
  }

  private bestFor(id: number): { votes: number; bucket: number } {
    let votes = 0, bucket = 0;
    for (const [k, v] of this.votes) {
      if (this.voteId(k) !== id) continue;
      const b = this.voteBucket(k);
      const clustered = v + (this.votes.get(this.voteKey(id, b - 1)) ?? 0) + (this.votes.get(this.voteKey(id, b + 1)) ?? 0);
      if (clustered > votes) { votes = clustered; bucket = b; }
    }
    return { votes, bucket };
  }

  /** Fortsatta fingerprint-träffar är en positionssensor, inte bara identifiering.
   *  Medianen tar bort hash-krockar. Små fel nudgas; ett stort stabilt fel är en seek. */
  private trackSync(off: number, winner: { votes: number; bucket: number }, other: number): void {
    this.matchVotes = winner.votes;
    this.matchMargin = winner.votes / Math.max(1, other);
    const now = this.clock();
    // Före fack-grinden: en drift gör att nya träffar hamnar UTANFÖR vinnarfacket,
    // och just då behövs re-locken mest.
    this.verifyLock(now);
    const bucket = Math.round(off / OFFSET_BUCKET);
    // Efter seek/re-lock kan det historiska vinnarfacket ligga kvar en stund.
    // En råträff nära den AKTUELLA korrigerade offseten är ändå färsk evidens;
    // avlägsna hash-krockar får däremot inte hålla matchen vid liv.
    if (Math.abs(off - this.matchOffset) <= OFFSET_BUCKET * 2) this.lastFreshMatchHit = now;
    if (Math.abs(bucket - winner.bucket) > 1) return;
    if (Math.abs(this.syncBucket - winner.bucket) > 1) { this.syncBucket = winner.bucket; this.syncOffsets = []; }
    this.syncOffsets.push(off);
    if (this.syncOffsets.length > 31) this.syncOffsets.shift();
    const needSamples = this.syncFast ? SYNC_SAMPLES_FAST : SYNC_SAMPLES;
    if (this.syncOffsets.length < needSamples || (!this.syncFast && now - this.lastSyncAt < SYNC_INTERVAL_MS)) return;
    const wasFast = this.syncFast;
    this.syncFast = false;
    this.lastSyncAt = now;
    const raw = median(this.syncOffsets);
    this.rawOffset = raw;
    const error = raw - this.matchOffset;
    // Första korrigeringen efter ett lås SNAPPAR (låset ska sitta direkt);
    // därefter nudgas bara, så ett korrekt lås aldrig vandrar.
    if (wasFast || Math.abs(error) >= SEEK_ERROR_MS) {
      this.matchOffset = raw;
      this.replayIdx = this.nextDropIndex(this.songs.get(this.matchId), now - this.playStart + this.matchOffset);
      this.cuePrevT = -1;
      if (!wasFast) console.log(`[song] synk hoppade ${(error / 1000).toFixed(2)}s till ny position`);
    } else if (this.relockTarget === null) {
      // Under en pågående glid äger re-locken offseten — annars drar de mot varandra.
      this.matchOffset += Math.max(-SYNC_NUDGE_MS, Math.min(SYNC_NUDGE_MS, error));
    }
  }

  /** PERIODISK RE-LOCK. Var RELOCK_INTERVAL_MS jämförs det aktiva offsetet med
   *  medianen av de senaste råträffarna för matchen (oberoende estimat, utan
   *  beroende av vinnarfacket som hänger efter vid drift). Driften glidar hem med
   *  en hastighet som växer med felet; bara ett seek-stort fel snappar. */
  private verifyLock(now: number): void {
    if (!this.lastRelockAt) { this.lastRelockAt = now; return; }
    if (now - this.lastRelockAt < RELOCK_INTERVAL_MS) return;
    this.lastRelockAt = now;
    const c: number[] = [];
    for (let i = this.recentId.length - 1; i >= 0 && c.length < 48; i--) {
      if (this.recentId[i] === this.matchId) c.push(this.recentOff[i]);
    }
    if (c.length < RELOCK_MIN_HITS) return;
    const est = median(c);
    this.driftMs = est - (this.relockTarget ?? this.matchOffset);
    if (Math.abs(this.driftMs) < RELOCK_ERROR_MS) { this.relockTarget = null; return; }
    if (Math.abs(est - this.matchOffset) >= RELOCK_SNAP_MS) {
      // Riktig seek: positionen ÄR en annan, glid skulle bara ge fel ljus länge.
      this.matchOffset = est;
      this.rawOffset = est;
      this.relockTarget = null;
      this.syncOffsets = [];
      this.syncBucket = Math.round(est / OFFSET_BUCKET);
      this.recentId = []; this.recentOff = []; this.recentT = [];
      this.replayIdx = this.nextDropIndex(this.songs.get(this.matchId), now - this.playStart + this.matchOffset);
      this.cuePrevT = -1;
      this.relocks++;
      console.log(`[song] re-lock: hoppade ${(this.driftMs / 1000).toFixed(2)}s`);
      return;
    }
    if (this.relockTarget === null) this.relocks++;
    this.relockTarget = est;
    this.rawOffset = est;
    this.glideAt = this.glideAt || now;
  }

  /** Glidande korrigering, körs varje tick. Hastigheten skalar med kvarvarande
   *  fel → stor drift är hemma på ~2 s, små fel kryper hem osynligt. */
  private glideLock(now: number): void {
    if (this.relockTarget === null || !this.matchId) { this.glideAt = now; return; }
    const dt = Math.max(0, Math.min(500, now - this.glideAt));
    this.glideAt = now;
    const err = this.relockTarget - this.matchOffset;
    const span = Math.max(1, RELOCK_SNAP_MS - RELOCK_ERROR_MS);
    const k = Math.max(0, Math.min(1, (Math.abs(err) - RELOCK_ERROR_MS) / span));
    const rate = RELOCK_GLIDE_MIN + (RELOCK_GLIDE_MAX - RELOCK_GLIDE_MIN) * k;   // ms/s
    const step = Math.min(Math.abs(err), rate * dt / 1000);
    this.matchOffset += Math.sign(err) * step;
    if (Math.abs(this.relockTarget - this.matchOffset) < 5) {
      this.matchOffset = this.relockTarget;
      this.relockTarget = null;
      this.syncOffsets = [];
      this.syncBucket = Math.round(this.matchOffset / OFFSET_BUCKET);
      console.log(`[song] re-lock: synk hemma (drift ${(this.driftMs / 1000).toFixed(2)}s)`);
    }
    // Drop-indexet följer den glidande klockan, annars fyras en drop två gånger.
    this.replayIdx = this.nextDropIndex(this.songs.get(this.matchId), now - this.playStart + this.matchOffset);
  }




  private nextDropIndex(song: Song | undefined, positionMs: number): number {
    if (!song) return 0;
    let lo = 0, hi = song.meta.drops.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (song.meta.drops[mid].t < positionMs + PRE_FIRE_MS) lo = mid + 1;
      else hi = mid;
    }
    return lo;
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
    this.glideLock(now);
    if (o.level > 0.02) this.lastLoud = now;
    if (!this.playStart) {
      // Volymgrind: starta bara på tydlig musik som hållit en sekund, aldrig på brusgolvet.
      if (o.level >= START_LEVEL) {
        if (!this.loudSince) this.loudSince = now;
        else if (now - this.loudSince >= START_HOLD_MS) {
          // Fingerprint och temp-WAV börjar först när grinden öppnar. Samma
          // nollpunkt här gör att den tvättade tidslinjen inte hamnar 1 s snett.
          this.playStart = now; this.lastLoud = now; this.loudSince = 0; this.fp.reset();
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

    const tLive = now - this.playStart;
    // Tidslinjen har tagit slut, eller nya positionsenliga fingeravtryck har
    // upphört → släpp omedelbart. Blockera samma id resten av segmentet så gamla
    // röster inte kan låsa tillbaka mot samma felaktiga tidslinje.
    // BEKRÄFTAD MATCH: samma krav som för att få dela ett segment. Bara en
    // bekräftad match får sätta inlärningskarantän när den släpps — annars
    // stoppade varje falsklarm ALL inlärning (mätt: 4 låtar spelade, 1 inlärd).
    if (this.matchId && !this.matchConfirmed && now - this.matchSince >= MATCH_STABLE_MS
        && this.lastFreshMatchHit > 0 && now - this.lastFreshMatchHit < MATCH_FRESH_MS / 2
        && this.matchVotes >= VOTES_NEEDED && this.matchMargin >= MARGIN) this.matchConfirmed = true;

    if (this.matchId) {
      const m = this.songs.get(this.matchId);
      const position = tLive + this.matchOffset;
      if (m && position > m.meta.durationMs) this.releaseMatch(m.meta.id, "tidslinjen tog slut");
      else if (this.lastFreshMatchHit && now - this.lastFreshMatchHit > MATCH_FRESH_MS) this.releaseMatch(this.matchId, "inga färska träffar");
    }

    // Igenkänning-som-gräns: bara en BEKRÄFTAD match får dela segmentet — stabil
    // en stund, med löpande färska träffar och full röstmajoritet med marginal.
    if (this.recogPending) {
      const p = this.recogPending;
      const fresh = this.lastFreshMatchHit > 0 && now - this.lastFreshMatchHit < MATCH_FRESH_MS / 2;
      if (this.matchId !== p.id || !fresh) this.recogPending = null;
      else if (now - p.at >= MATCH_STABLE_MS && this.matchVotes >= VOTES_NEEDED && this.matchMargin >= MARGIN) {
        this.recogPending = null;
        if (p.revise) this.reviseBoundary(now, tLive + this.matchOffset);
        else this.splitOnRecognition(now, tLive + this.matchOffset);
        return;
      }
    }


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

  /** LÅTGRÄNS I EN GAPLÖS STRÖM. KLANGSKIFTET bär gränsen ensamt (mätt mot facit);
   *  nivådipp och temposkifte sänker bara tröskeln när de finns. Allt grindas av
   *  min/max-längd. Returnerar true om vi delade. */
  private boundary(now: number, tLive: number, o: { bpm: number; bpmConfidence: number; level: number }): boolean {
    // Nivådipp: extrasignal. Vid Spotify-crossfade faller nivån knappt alls
    // (mätt: kvot 0.98 och 0.91 vid facitgränserna), så den får aldrig krävas.
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

    // Gränsen backdateras NOV_BACK_MS (novelty reagerar när nya materialet fyllt
    // fönstret), så minsta längd mäts på det backdaterade segmentet.
    if (tLive < MIN_SEG_MS + NOV_BACK_MS) return false;

    const novFresh = this.novAt > 0 && now - this.novAt < NOV_WIN_KEEP_MS;
    const ev: string[] = [];
    if (novFresh) ev.push(`klangskifte ${this.novPeak.toFixed(2)}`);
    if (bpmShift) ev.push(bpmShift);
    if (this.dipAt && now - this.dipAt < DIP_WIN_MS) ev.push("nivådipp");
    this.lastEvidence = ev;

    let why = "";
    let back = NOV_BACK_MS;
    if (novFresh && (this.novPeak >= NOV_STRONG || ev.length >= 2)) why = ev.join(" + ");
    else if (tLive > MAX_SEG_MS) { why = "maxlängd"; back = 0; }   // aldrig en 22-minuters gröt igen
    if (!why) return false;

    const bAt = now - back;
    console.log(`[song] låtgräns efter ${((bAt - this.playStart) / 1000).toFixed(0)}s (${why})`);
    this.lastBoundary = why;
    this.lastLoud = bAt;   // segmentets längd räknas till den backdaterade gränsen
    this.commit();
    // Starta nästa sekvens direkt — strömmen tystnar aldrig.
    this.playStart = bAt;
    this.lastLoud = now;
    this.heurBoundaryAt = now;   // en bekräftad match får revidera nollpunkten
    this.quarantinedSegment = this.learnMode && now - this.lastMatchedAt < LEARN_QUARANTINE_MS;
    return true;
  }

  /** IGENKÄNNINGEN HAR FÖRETRÄDE. Klangskiftet satte redan gränsen, men på
   *  ungefärlig tid. En bekräftad match vet exakt var låten började → flytta
   *  nollpunkten dit och märk gränsen som igenkänd. Ingen ny gräns, ingen ny
   *  commit — bara tidslinjen rättad, så replayen ligger i fas. */
  private reviseBoundary(now: number, pos: number): void {
    const id = this.matchId;
    const delta = (now - this.playStart) - pos;
    console.log(`[song] gräns reviderad av igenkänning: låt #${id} vid ${(pos / 1000).toFixed(1)}s (flytt ${(delta / 1000).toFixed(1)}s)`);
    this.lastBoundary = `igenkänd låt #${id}`;
    this.heurBoundaryAt = 0;
    this.playStart = now - pos;
    this.lastLoud = now;
    // NOLLPUNKTEN ÄR NU EXAKT → offseten måste nollas, annars läggs den på en
    // andra gång (positionen blev tidigare pos + matchOffset, dvs ~backdateringen fel).
    this.matchOffset = 0;
    this.rawOffset = 0;
    this.syncBucket = 0;
    this.syncOffsets = [];
    this.lastSyncAt = 0;
    this.syncFast = true;
    this.relockTarget = null;
    this.dropLearning();   // de sekunderna hörde till fel låt
    this.replayIdx = this.nextDropIndex(this.songs.get(id), pos);
    this.cuePrevT = -1;
  }



  /** Gräns satt av igenkännaren: skriv in det gångna segmentet och starta nästa
   *  med matchen behållen, tidsställd på låtens faktiska position.
   *  Är segmentet kortare än minsta låtlängd committas inget (det vore en smutsig
   *  blob) — men tidslinjen ställs om ändå, så showen är i synk direkt. */
  private splitOnRecognition(now: number, pos: number): void {
    const id = this.matchId;
    const tLive = now - this.playStart;
    console.log(`[song] låtgräns efter ${(tLive / 1000).toFixed(0)}s (igenkänd låt #${id} vid ${(pos / 1000).toFixed(1)}s)`);
    this.lastBoundary = `igenkänd låt #${id}`;
    if (tLive >= RECOG_SPLIT_MIN_MS) this.commit();   // nollställer bl.a. matchId och recogSplit
    else {
      this.boundaryCount++;
      this.dropLearning();
      this.votes.clear();
      this.recentId = []; this.recentOff = []; this.recentT = [];
      this.fp.reset();
    }
    this.playStart = now - pos;
    this.lastLoud = now;
    this.recogPending = null; this.heurBoundaryAt = 0;
    this.quarantinedSegment = false;
    this.matchId = id;
    this.matchOffset = 0;
    this.rawOffset = 0;
    this.matchVotes = VOTES_NEEDED;
    this.matchSince = now;
    this.matchConfirmed = true;
    this.lastFreshMatchHit = now;
    this.blockedMatchId = 0;
    this.lastMatchedAt = now;
    this.syncBucket = 0;
    this.syncOffsets = [];
    this.lastSyncAt = 0;
    this.syncFast = true;
    this.cuePrevT = -1;
    this.replayIdx = this.nextDropIndex(this.songs.get(id), pos);
    // Segmentets gränsdetektorer hör nu en ny låt.
    this.segBpm = 0; this.segBpmConf = 0; this.bpmOffSince = 0;
    this.resetNovelty();
    this.dipAt = 0;
  }

  /** Släpp en etablerad match utan att röra inlärningen. Rösterna nollas så
   *  samma låt inte låser om sig på nästa hop. */
  private releaseMatch(id: number, why: string): void {
    console.log(`[song] släppte match #${id}: ${why}`);
    this.blockedMatchId = id;
    this.recogPending = null;
    // UPPREPAD FALSKMATCH VID ~SAMMA POSITION: låt-id:t räcker inte som spärr
    // (det nollas vid nästa commit) — det är hash-klustret runt just den
    // positionen som är för generiskt. Blockera zonen resten av segmentet.
    const pos = (this.playStart ? this.clock() - this.playStart : 0) + this.matchOffset;
    const prev = this.releasedAt.get(id);
    if (prev !== undefined && Math.abs(prev - pos) < FALSE_ZONE_MS) {
      this.blockedZones.push({ id, from: pos - FALSE_ZONE_MS, to: pos + FALSE_ZONE_MS });
      console.log(`[song] blockerar låt #${id} runt ${(pos / 1000).toFixed(1)}s (upprepad falskmatch)`);
    }
    this.releasedAt.set(id, pos);

    // TAK: samma lagrade låt som falskmatchar om och om igen i ett segment är
    // bara generisk — sluta rösta på den helt resten av segmentet (bredare än
    // hash-zon-spärren, som bara täcker en position).
    if (!this.matchConfirmed) {
      const n = (this.falseHits.get(id) ?? 0) + 1;
      this.falseHits.set(id, n);
      if (n > FALSE_HITS_MAX) { this.bannedIds.add(id); console.log(`[song] slutar rösta på låt #${id} resten av segmentet (${n} falskmatchningar)`); }
    }

    // Karantän BARA efter en bekräftad match: då är svansen troligen samma låt
    // och får inte sparas som dubblett. En match som släpps som FALSK avbryter
    // sin egen karantän — materialet var en ny låt hela tiden, och de hashar som
    // samlats under matchen ligger redan kvar i learnHash.
    if (this.matchConfirmed) { this.lastMatchedAt = this.clock(); this.quarantinedSegment = this.learnMode; }
    else this.quarantinedSegment = false;
    this.matchConfirmed = false;
    this.matchSince = 0;
    this.matchId = 0; this.matchVotes = 0; this.matchMargin = 0;
    this.lastFreshMatchHit = 0;
    this.matchOffset = 0; this.rawOffset = 0;
    this.votes.clear();
    this.recentId = []; this.recentOff = []; this.recentT = [];
    this.syncOffsets = []; this.syncBucket = 0; this.lastSyncAt = 0; this.syncFast = true;
    this.lastRelockAt = 0; this.driftMs = 0; this.relockTarget = null; this.glideAt = 0;
    this.replayIdx = 0; this.cuePrevT = -1;
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
      songId: s?.meta.id ?? 0,
      matchVotes: this.matchVotes,
      matchMargin: this.matchMargin,
      rawOffsetMs: this.rawOffset,
      correctedOffsetMs: this.matchOffset,
      lastBoundary: this.lastBoundary,
      driftMs: this.driftMs,
      relocks: this.relocks,
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
    this.matchId = 0; this.matchVotes = 0; this.matchMargin = 0; this.rawOffset = 0; this.matchOffset = 0; this.nextId = 1;
    this.lastFreshMatchHit = 0; this.blockedMatchId = 0; this.blockedZones = []; this.releasedAt.clear(); this.bannedIds.clear(); this.falseHits.clear(); this.matchSince = 0; this.matchConfirmed = false;
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
    this.resetNovelty();
    this.levAvg = 0; this.dipAt = 0; this.recogPending = null;
    this.votes.clear(); this.matchVotes = 0; this.matchMargin = 0; this.rawOffset = 0; this.matchOffset = 0;
    this.lastFreshMatchHit = 0; this.blockedMatchId = 0; this.blockedZones = []; this.releasedAt.clear(); this.bannedIds.clear(); this.falseHits.clear(); this.matchSince = 0; this.matchConfirmed = false;
    this.syncOffsets = []; this.syncBucket = 0; this.lastSyncAt = 0; this.syncFast = true; this.lastRelockAt = 0; this.driftMs = 0; this.relockTarget = null; this.glideAt = 0; this.replayIdx = 0; this.pendingDrop = 0;
    this.recentId = []; this.recentOff = []; this.recentT = [];
    this.fp.reset();
  }

  /** Anropas när en låt är slut: id på låten som lärdes in/uppdaterades, eller
   *  null när inget lärdes (för kort, mikrofon, ingångsbyte). Motorn använder
   *  det för att trigga offline-tvätten. */
  onCommit?: (songId: number | null, fresh: boolean) => void;
  /** Anropas när pågående inlärning kastas → temp-inspelningen ska avbrytas. */
  onDropLearning?: () => void;

  /** Ersätt tidslinjen med de offline-tvättade värdena. Fingeravtrycket
   *  (hashar + tider) och spelräknaren rörs INTE 
   *  — de är för matchning.
   *  v1-sidecars saknar dramaturgi-fälten; då lämnas de orörda. */
  applyRefined(songId: number, t: {
    drops: { t: number; s: number }[]; bpm: number; beatPhaseMs: number; intensity: number[];
    risers?: Riser[]; sections?: number[]; phrase?: { p16: number } | null; trimAt?: number;
    /** hur många ms ljud tvätten byggde på */ durMs?: number;
  }): void {
    const s = this.songs.get(songId);
    if (!s) return;
    // EN SÄMRE TVÄTT FÅR INTE SKRIVA ÖVER EN BÄTTRE (mätt: 106 s-segment ersatte
    // en 234 s-tvätt med 0 drops). Bygger den nya tvätten på mindre ljud än den
    // befintliga är den per definition partiell → kasta den.
    const from = t.durMs ?? 0;
    const had = s.meta.refinedFromMs ?? 0;
    if (had && from < had) {
      console.log(`[song] låt #${songId}: tvätt förkastad (${(from / 1000).toFixed(0)}s ljud < befintliga ${(had / 1000).toFixed(0)}s)`);
      return;
    }
    // OREN INSPELNING: tvätten såg en låtgräns INNE i segmentet (permanent tempo-
    // OCH klangskifte). Behåll bara första halvan — annars matchar nästa låt mot
    // det här fingeravtrycket och får fel tidslinje.
    if (t.trimAt && t.trimAt > 0) { this.trimSong(s, t.trimAt); if (!this.songs.has(songId)) return; }
    s.meta.drops = t.drops.map((d) => ({ t: d.t, s: d.s, c: Math.max(2, s.meta.plays) }));   // tvättade drops är bekräftade
    if (t.bpm > 40) { s.meta.bpm = t.bpm; s.meta.beatPhaseMs = t.beatPhaseMs; }
    if (t.intensity.length) s.meta.intensity = t.intensity;
    if (t.risers) s.meta.risers = t.risers;
    if (t.sections) s.meta.sections = t.sections;
    if (t.phrase?.p16) s.meta.phraseMs = t.phrase.p16;
    if (from) s.meta.refinedFromMs = from;
    if (t.trimAt && t.trimAt > 0) {
      // Tvättens tidslinje täcker hela det orena segmentet → klipp den också.
      s.meta.drops = s.meta.drops.filter((d) => d.t <= t.trimAt!);
      s.meta.intensity = s.meta.intensity.slice(0, Math.ceil(t.trimAt / 1000));
      if (s.meta.risers) s.meta.risers = s.meta.risers.filter((r) => r.end <= t.trimAt!);
      if (s.meta.sections) s.meta.sections = s.meta.sections.filter((x) => x <= t.trimAt!);
    }
    this.dirty = true;
    void this.save();
    console.log(`[song] låt #${songId} tvättad: ${t.drops.length} drops, ${t.risers?.length ?? 0} risers, ${t.sections?.length ?? 0} sektioner, ${t.bpm} BPM`);
  }

  /** Klipp bort allt efter en intern låtgräns: hashar, tider och längd. Är första
   *  halvan för kort finns ingen låt att behålla — kasta hela posten. */
  private trimSong(s: Song, trimAt: number): void {
    const was = s.meta.durationMs;
    if (trimAt < TRIM_MIN_HALF_MS) {
      this.songs.delete(s.meta.id);
      this.rebuildIndex();
      this.dirty = true;
      console.log(`[song] låt #${s.meta.id} kastad: intern gräns redan vid ${(trimAt / 1000).toFixed(0)}s`);
      return;
    }
    let n = 0;
    for (let k = 0; k < s.times.length; k++) if (s.times[k] <= trimAt) n++;
    const hashes = new Uint32Array(n), times = new Uint32Array(n);
    let p = 0;
    for (let k = 0; k < s.times.length; k++) if (s.times[k] <= trimAt) { hashes[p] = s.hashes[k]; times[p] = s.times[k]; p++; }
    s.hashes = hashes; s.times = times;
    s.meta.durationMs = trimAt;
    this.rebuildIndex();
    this.dirty = true;
    console.log(`[song] låt #${s.meta.id} trimmad: ${(was / 1000).toFixed(0)}s → ${(trimAt / 1000).toFixed(0)}s (intern gräns), ${n} hashar kvar`);
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
    this.segBpm = 0; this.segBpmConf = 0; this.bpmOffSince = 0; this.resetNovelty();
    this.levAvg = 0; this.dipAt = 0; this.loudSince = 0; this.recogPending = null; this.heurBoundaryAt = 0; this.quarantinedSegment = false;


    this.votes.clear(); this.matchId = 0; this.matchVotes = 0; this.matchMargin = 0; this.rawOffset = 0; this.matchOffset = 0;
    this.lastFreshMatchHit = 0; this.blockedMatchId = 0; this.blockedZones = []; this.releasedAt.clear(); this.bannedIds.clear(); this.falseHits.clear(); this.matchSince = 0; this.matchConfirmed = false;
    this.syncOffsets = []; this.syncBucket = 0; this.lastSyncAt = 0; this.syncFast = true; this.lastRelockAt = 0; this.driftMs = 0; this.relockTarget = null; this.glideAt = 0; this.replayIdx = 0; this.pendingDrop = 0;
    this.recentId = []; this.recentOff = []; this.recentT = [];
    this.fp.reset();
    this.onCommit?.(committed, !matched);
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
