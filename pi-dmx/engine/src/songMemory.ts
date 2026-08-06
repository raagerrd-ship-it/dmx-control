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
const MIN_LEARN_MS = 45000;    // kortare än så: inte värt att minnas
const OFFSET_BUCKET = 250;     // ms per offset-fack
const VOTES_NEEDED = 10;
const MARGIN = 2;        // vinnaren måste ha dubbelt så många röster som bästa ANNAN låt

interface Drop { t: number; s: number; c: number; }
interface SongMeta {
  id: number; createdMs: number; lastMs: number; plays: number; durationMs: number;
  bpm: number; beatPhaseMs: number; drops: Drop[]; intensity: number[];   // 1 värde/s, 0–255
}
interface Song { meta: SongMeta; hashes: Uint32Array; times: Uint32Array; }

export interface SongMemoryState {
  songs: number;        // antal lärda låtar
  known: boolean;       // känd låt just nu
  plays: number;        // hur många gånger den har spelats tidigare
  confidence: number;   // 0..1
  positionMs: number;   // var i låten vi är
  learning: boolean;    // spelar just nu in en ny låt
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
      if (learn) { this.learnHash.push(l.hash); this.learnTime.push(l.t); }
      this.vote(l);
    }
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
      if (v >= VOTES_NEEDED && id !== this.matchId && v >= this.bestOther(id) * MARGIN) {
        this.matchId = id;
        this.matchOffset = Math.round(off / OFFSET_BUCKET) * OFFSET_BUCKET;
        this.replayIdx = 0;
        const s = this.songs.get(id);
        console.log(`[song] känd låt #${id} (${s?.meta.plays ?? 0} tidigare spelningar), position ${((l.t + this.matchOffset) / 1000).toFixed(1)}s`);
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
      if (o.level > 0.05) { this.playStart = now; this.lastLoud = now; this.fp.reset(); }
      return;
    }
    if (now - this.lastLoud > SILENCE_END_MS) { this.commit(); return; }

    const tLive = now - this.playStart;
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
        if (this.matchVotes < VOTES_NEEDED * 0.5) { this.matchId = 0; this.matchVotes = 0; }   // tappad match → realtidsläge
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

  /** Drop ur minnet som ska fyras av denna renderframe (0 = ingen). */
  takeDrop(): number {
    const d = this.pendingDrop;
    this.pendingDrop = 0;
    return d;
  }

  /** Igenkänd låt → true medan replayen äger showen. */
  get recognized(): boolean { return this.matchId !== 0; }

  /** Tempo + taktfas ur minnet (väggklocka-ankare) — låser beat-klockan direkt. */
  lockedBeat(): { bpm: number; anchorMs: number } | null {
    const s = this.matchId ? this.songs.get(this.matchId) : undefined;
    if (!s || !s.meta.bpm) return null;
    return { bpm: s.meta.bpm, anchorMs: this.playStart + s.meta.beatPhaseMs };
  }

  /** Energikurvan ur minnet (0..1) på nuvarande position, eller null. */
  replayIntensity(): number | null {
    const s = this.matchId ? this.songs.get(this.matchId) : undefined;
    if (!s || s.meta.intensity.length === 0) return null;
    const sec = Math.floor((this.clock() - this.playStart + this.matchOffset) / 1000);
    if (sec < 0 || sec >= s.meta.intensity.length) return null;
    return s.meta.intensity[sec] / 255;
  }

  state(): SongMemoryState {
    const s = this.matchId ? this.songs.get(this.matchId) : undefined;
    return {
      songs: this.songs.size,
      known: !!s,
      plays: s?.meta.plays ?? 0,
      confidence: Math.max(0, Math.min(1, this.matchVotes / (VOTES_NEEDED * 3))),
      positionMs: this.playStart ? this.clock() - this.playStart + (s ? this.matchOffset : 0) : 0,
      learning: !!this.playStart && !s && this.learnMode,
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
  }

  /** Låten är slut: skriv in i minnet (ny låt) eller förbättra den kända. */
  private commit(): void {
    const dur = this.lastLoud - this.playStart;
    const matched = this.matchId ? this.songs.get(this.matchId) : undefined;
    if (this.learnMode && dur >= MIN_LEARN_MS && this.learnHash.length > 60) {
      const bpm = median(this.bpmSamples);
      if (matched) this.mergeInto(matched, dur, bpm);
      else this.addSong(dur, bpm);
      this.dirty = true;
      void this.save();
    }
    // Nollställ för nästa låt.
    this.playStart = 0;
    this.dropLearning();
    this.votes.clear(); this.matchId = 0; this.matchVotes = 0; this.replayIdx = 0; this.pendingDrop = 0;
    this.fp.reset();
  }

  private addSong(dur: number, bpm: number): void {
    if (this.songs.size >= MAX_SONGS) this.evict();
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
