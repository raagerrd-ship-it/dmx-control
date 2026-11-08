/**
 * LABBET (stunden 'lab', ägaren i ladan 2026-11-07: 'nu har vi testat detta och fick en grym effekt. Nu kör vi ett set med nya idéer.
 * helt nya'). Ett EXPERIMENT för inspiration, inte en del av festshowen. Fyra idéer, var och en på sitt läge i musiken:
 *   KANON        (build): varje lampa spelar trummorna ett halvt slag efter grannen - rytmen vandrar som ett eko genom rummet
 *   MINNET       (refräng): första refrängen IMPROVISERAR ett lampmönster per slag och spelar in det; när refrängen kommer tillbaka
 *                spelas EXAKT samma koreografi upp igen - ljuset känner igen låten
 *   SLOW MOTION  (break/intro/lugnt): de 4 s efter förra dropen (labbets eget ljus) spelas upp i fjärdedels fart, i loop
 *   DRAGKAMPEN   (okänd takt + övrigt): bas mot diskant - fronten mellan varmt (bas) och kallt (diskant) flyttas efter balansen,
 *                frontlampan starkast
 * Bara rena kulörer (inget vitt), ingen strobe, högst en puls per lampa och slag; nedgången tas av motorns uttoning (aldrig snabbare).
 */
import { lampLevel } from "./output.js";
import type { FixtureConfig } from "./config.js";

export interface LabIn {
  beatIdx: number; beatFrac: number; hasBeat: boolean; bassBody: number; dropEnv: number; section: string;
  drum: { kick: number; snare: number; hat: number; bass: number } | null;
  frame: { bpm: number; spec: { sub: number; kick: number; bass: number; lowMid: number; mid: number; highMid: number; treble: number; air: number } } | null;
}

const SECT: [number, number, number][] = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1], [1, 0, 1]];
const TOP = 0.95;
const toV = (fx: FixtureConfig | undefined, share: number) => lampLevel(fx, Math.max(0, Math.min(1, share)));   // ljusandel -> lampans nivå (output.ts)
const HIST = 256;                       // ruthistorik för kanon (~6 s vid 25 ms)
const SLOW_FRAMES = 160;                // 4 s efter dropen
const PATTERNS = [0b1000, 0b0001, 0b0100, 0b0010, 0b1001, 0b0110, 0b1010, 0b0101, 0b1100, 0b0011, 0b1111];

export class Lab {
  fx: FixtureConfig[] = [];   // lamporna (sätts av moment.ts), bara för output.ts lampLevel
  out = new Float32Array(0);
  /** Vilken idé som kör + de senaste bytena [väggklocka ms, idé] (GET /api/moment, ägaren: 'den som kör nu'). */
  mode = ''; log: [number, string][] = []; private pend = ''; private pendAt = 0;
  private n = 0; private at = 0;
  private hist = new Float32Array(HIST); private histT = new Float64Array(HIST); private hi = 0;
  private bal = 0.5;
  private lastSec = ''; private highCount = 0; private highStartBeat = 0; private mem = new Map<number, number>();
  private lastBeat = -1; private curMask = 0; private curSect = 0; private seed = 7;
  private slow = new Float32Array(0); private slowN = 0; private recUntil = 0; private lastDrop = 0; private slowPos = 0;

  tick(c: LabIn | undefined, n: number, now: number, presence: number): Float32Array {
    if (this.n !== n) { this.n = n; this.out = new Float32Array(n * 3); this.slow = new Float32Array(SLOW_FRAMES * n * 3); this.slowN = 0; }
    const dt = this.at > 0 ? Math.min(0.2, (now - this.at) / 1000) : 0.025; this.at = now;
    this.out.fill(0);
    const sp = c?.frame?.spec, dr = c?.drum;
    if (!c || !sp || !dr) return this.out;
    // historik för kanon (alltid, så kanon kan starta direkt)
    this.hist[this.hi] = Math.max(dr.kick, dr.snare * 0.8); this.histT[this.hi] = now; this.hi = (this.hi + 1) % HIST;
    // dropen: spela in labbets eget ljus 4 s
    if (c.dropEnv > 0.6 && this.lastDrop <= 0.6) { this.recUntil = now + 4000; this.slowN = 0; }
    this.lastDrop = c.dropEnv;
    const sec = c.section ?? '';
    if (sec !== this.lastSec) { if (sec === 'high') { this.highCount++; this.highStartBeat = c.beatIdx; } this.lastSec = sec; }
    // basen tillbaka = inte lugnt längre, oavsett vad sektionen säger (ägaren 11-07: 'gick inte över när basen började' - sektionen hänger efter)
    if (dr.kick > 0.55 || (c.bassBody > 0.6 && presence > 0.6)) this.bassAt = now;   // kicken, eller basens kropp när musiken är på (bassBody är relativ)
    const bassBack = now - this.bassAt < 1200;
    const quiet = !bassBack && (sec === 'break' || sec === 'intro' || presence < 0.35);
    // lugnt = SÅNGAREN (ägaren 11-07: dragkampen 'passar inte lugnt parti'); slow motion bara om en drop finns inspelad; dragkamp = okänd takt MED energi
    const wantRaw = quiet ? (this.slowN > 20 && Math.floor(now / 2000) % 2 === 1 ? 'slowmotion' : 'sangare') : !c.hasBeat ? 'dragkamp' : sec === 'build' ? 'kanon' : sec === 'high' ? 'minnet' : 'dragkamp';
    // byt idé först när den nya har hållit 2 s (loggen 11-07: minnet <-> slowmotion slog om på 0,1-0,7 s); dropen byter direkt
    const want = !quiet && bassBack && (wantRaw === 'dragkamp' || wantRaw === 'kanon') && c.hasBeat && (sec === 'break' || sec === 'intro') ? 'minnet' : wantRaw;   // basen i ett 'break' = refrängens minne
    if (want !== this.pend) { this.pend = want; this.pendAt = now; }
    const calmSwap = (want === 'sangare' || want === 'slowmotion') && (this.mode === 'sangare' || this.mode === 'slowmotion');   // ägaren: 'nice' - sångaren och dropens repris varannan sekund
    // basen tillbaka: sångaren/reprisen avbryts DIREKT (ägaren 11-07: 'avbryt sångaren så fort hög bas aktiveras')
    if (want !== this.mode && (this.mode === '' || calmSwap || now - this.pendAt >= 2000 || c.dropEnv > 0.6 || ((this.mode === 'sangare' || this.mode === 'slowmotion') && !quiet))) { this.mode = want; this.log.push([Math.round(now), want]); if (this.log.length > 12) this.log.shift(); }
    const mode = this.mode;
    if (mode === 'slowmotion') this.slowMotion(n, dt);
    else if (mode === 'kanon') this.canon(c, n, now, presence);
    else if (mode === 'minnet') this.memory(c, n, presence);
    else if (mode === 'sangare') this.singer(sp, n, dt, now);
    else this.tug(sp, n, dt, presence);
    if (now < this.recUntil && this.slowN < SLOW_FRAMES) { this.slow.set(this.out, this.slowN * n * 3); this.slowN++; }
    return this.out;
  }

  private put(i: number, sect: number, share: number) {
    const v = toV(this.fx[i], TOP * Math.max(0, Math.min(1, share))), s = SECT[((sect % 6) + 6) % 6], o = i * 3;
    // starkast vinner per lampa (ingen blandning -> inget vitt)
    if (v > Math.max(this.out[o], this.out[o + 1], this.out[o + 2])) { this.out[o] = s[0] * v; this.out[o + 1] = s[1] * v; this.out[o + 2] = s[2] * v; }
  }

  /** KANON: lampa i = trummorna i * ett halvt slag sedan. */
  private canon(c: LabIn, n: number, now: number, presence: number) {
    const bpm = c.frame && c.frame.bpm > 40 ? c.frame.bpm : 120, half = 30000 / bpm;
    const base = Math.floor(c.beatIdx / 16);
    for (let i = 0; i < n; i++) {
      const tWant = now - i * half;
      let best = 0, bestD = 1e9;
      for (let k = 1; k <= HIST; k++) { const q = (this.hi - k + HIST) % HIST, d = Math.abs(this.histT[q] - tWant); if (d < bestD) { bestD = d; best = this.hist[q]; } if (this.histT[q] < tWant - 100) break; }
      this.put(i, base + i, best * presence);
    }
  }

  /** MINNET: improvisera + spela in per slag i första refrängen, spela upp exakt i nästa. */
  private memory(c: LabIn, n: number, presence: number) {
    const rel = c.beatIdx - this.highStartBeat;
    if (c.beatIdx !== this.lastBeat) {
      this.lastBeat = c.beatIdx;
      const known = this.highCount > 1 ? this.mem.get(rel) : undefined;
      if (known !== undefined) { this.curMask = known & 0xff; this.curSect = known >> 8; }
      else {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        const r = this.seed / 0x7fffffff, beatInBar = ((c.beatIdx % 4) + 4) % 4;
        this.curMask = beatInBar === 0 && r < 0.5 ? 0b1111 : PATTERNS[Math.floor(r * (PATTERNS.length - 1))];
        if (beatInBar === 0) this.curSect = (this.curSect + 1 + Math.floor(r * 3)) % 6;
        this.mem.set(rel, this.curMask | (this.curSect << 8));
      }
    }
    // slagets styrka ur ENERGIN (ägaren 11-07: 'saknade att lamporna körde på energi'): kickens topp + basens kropp, svaga slag svaga
    const hit = Math.max(c.drum ? c.drum.kick : 0, Math.min(1, c.bassBody));
    const pulse = Math.exp(-c.beatFrac * 3) * (0.2 + 0.8 * hit);
    for (let i = 0; i < n; i++) if (this.curMask & (1 << (3 - (i % 4)))) this.put(i, this.curSect + (i >= n / 2 ? 3 : 0), pulse * presence);
  }

  /** SLOW MOTION: dropens 4 s i fjärdedels fart, loop. */
  private slowMotion(n: number, dt: number) {
    this.slowPos = (this.slowPos + dt / 0.025 / 4) % this.slowN;
    const a = Math.floor(this.slowPos), b = (a + 1) % this.slowN, f = this.slowPos - a, w = n * 3;
    for (let q = 0; q < w; q++) this.out[q] = this.slow[a * w + q] * (1 - f) + this.slow[b * w + q] * f;
  }

  /** DRAGKAMPEN: bas mot diskant, fronten flyttas efter balansen (lugn: 1,5 s glättning, hysteres per lampa, mjuk övergång -
   *  ägaren 11-07: 'för fladdrig' med 0,15 s och hårda gränser). */
  private front = -1;
  private tug(sp: NonNullable<LabIn["frame"]>["spec"], n: number, dt: number, presence: number) {
    const low = sp.sub + sp.kick + sp.bass, high = sp.highMid + sp.treble + sp.air + 1e-6;
    this.bal += (low / (low + high) - this.bal) * Math.min(1, dt / 1.5);
    this.eng += (Math.min(1, (low + high) / 3) - this.eng) * Math.min(1, dt / 0.6);
    const x = this.bal * (n - 1);
    if (this.front < 0 || Math.abs(x - this.front) > 0.75) this.front = Math.max(0, Math.min(n - 1, Math.round(x)));   // hysteres
    for (let i = 0; i < n; i++) {
      const d = i - this.front;
      if (d === 0) this.put(i, 5, (0.55 + 0.3 * this.eng) * presence);                                     // fronten: magenta
      else if (d < 0) this.put(i, 0, (0.12 + 0.28 * Math.min(1, low / 1.5)) * (1 - 0.15 * -d) * presence);   // basens sida: röd
      else this.put(i, 4, (0.12 + 0.28 * Math.min(1, high / 1.5)) * (1 - 0.15 * d) * presence);              // diskantens sida: blå
    }
  }
  private eng = 0; private bassAt = 0;
  /** SÅNGAREN (från showen, ägaren: 'klockren - vi behåller den'): EN lampa, ljusstyrkan = röstbandet, ny fras = ny lampa + ny kulör.
   *  Varannat lugnt parti får slow motion i stället (om en drop finns inspelad). */
  private slowTurn = false; private vS = 0; private vFloor = 1; private vQuietAt = 0; private lone = -1; private loneHop = 0; private singSect = 5;
  private singer(sp: NonNullable<LabIn["frame"]>["spec"], n: number, dt: number, now: number) {
    this.vS += (0.25 * sp.lowMid + 0.5 * sp.mid + 0.25 * sp.highMid - this.vS) * Math.min(1, dt / 0.06);
    this.vFloor = Math.min(this.vS, this.vFloor + dt * 0.02);
    const voice = Math.max(0, Math.min(1, (this.vS - this.vFloor - 0.04) * 2.2));
    if (voice > 0.08) {
      if (now - this.vQuietAt > 350 || this.lone < 0) {
        let k = this.lone + (this.loneHop++ % 2 ? 1 : 2); if (n > 1) { k = ((k % n) + n) % n; if (k === this.lone) k = (k + 1) % n; } else k = 0;
        this.lone = k; this.singSect = [5, 0, 3, 1, 4][this.loneHop % 5];
      }
      this.vQuietAt = now;
    }
    if (this.lone >= 0) this.put(this.lone, this.singSect, voice);
  }
}
