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
import { GAMMA } from "./output.js";

export interface LabIn {
  beatIdx: number; beatFrac: number; hasBeat: boolean; bassBody: number; dropEnv: number; section: string;
  drum: { kick: number; snare: number; hat: number; bass: number } | null;
  frame: { bpm: number; spec: { sub: number; kick: number; bass: number; lowMid: number; mid: number; highMid: number; treble: number; air: number } } | null;
}

const SECT: [number, number, number][] = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1], [1, 0, 1]];
const TOP = 0.95;
const toV = (share: number) => Math.pow(Math.max(0, Math.min(1, share)), 1 / GAMMA);
const HIST = 256;                       // ruthistorik för kanon (~6 s vid 25 ms)
const SLOW_FRAMES = 160;                // 4 s efter dropen
const PATTERNS = [0b1000, 0b0001, 0b0100, 0b0010, 0b1001, 0b0110, 0b1010, 0b0101, 0b1100, 0b0011, 0b1111];

export class Lab {
  out = new Float32Array(0);
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
    const quiet = sec === 'break' || sec === 'intro' || presence < 0.35;
    if (quiet && this.slowN > 20) this.slowMotion(n, dt);
    else if (!c.hasBeat) this.tug(sp, n, dt, presence);
    else if (sec === 'build') this.canon(c, n, now, presence);
    else if (sec === 'high') this.memory(c, n, presence);
    else this.tug(sp, n, dt, presence);
    if (now < this.recUntil && this.slowN < SLOW_FRAMES) { this.slow.set(this.out, this.slowN * n * 3); this.slowN++; }
    return this.out;
  }

  private put(i: number, sect: number, share: number) {
    const v = toV(TOP * Math.max(0, Math.min(1, share))), s = SECT[((sect % 6) + 6) % 6], o = i * 3;
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
    const pulse = Math.exp(-c.beatFrac * 3) * (0.55 + 0.45 * Math.min(1, c.bassBody));
    for (let i = 0; i < n; i++) if (this.curMask & (1 << (3 - (i % 4)))) this.put(i, this.curSect + (i >= n / 2 ? 3 : 0), pulse * presence);
  }

  /** SLOW MOTION: dropens 4 s i fjärdedels fart, loop. */
  private slowMotion(n: number, dt: number) {
    this.slowPos = (this.slowPos + dt / 0.025 / 4) % this.slowN;
    const a = Math.floor(this.slowPos), b = (a + 1) % this.slowN, f = this.slowPos - a, w = n * 3;
    for (let q = 0; q < w; q++) this.out[q] = this.slow[a * w + q] * (1 - f) + this.slow[b * w + q] * f;
  }

  /** DRAGKAMPEN: bas mot diskant, fronten flyttas efter balansen. */
  private tug(sp: NonNullable<LabIn["frame"]>["spec"], n: number, dt: number, presence: number) {
    const low = sp.sub + sp.kick + sp.bass, high = sp.highMid + sp.treble + sp.air + 1e-6;
    this.bal += (low / (low + high) - this.bal) * Math.min(1, dt / 0.15);
    const x = this.bal * n, energy = Math.min(1, (low + high) / 3);
    for (let i = 0; i < n; i++) {
      const d = i + 0.5 - x;
      if (Math.abs(d) < 0.75) this.put(i, 5, (0.6 + 0.4 * energy) * presence);                  // fronten: magenta
      else if (d < 0) this.put(i, i % 2 ? 1 : 0, (0.15 + 0.35 * Math.min(1, low / 1.5)) * presence);   // basens sida: röd/gul
      else this.put(i, i % 2 ? 3 : 4, (0.15 + 0.35 * Math.min(1, high / 1.5)) * presence);           // diskantens sida: blå/cyan
    }
  }
}
