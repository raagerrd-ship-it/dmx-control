/**
 * LABBET 5 (stunden 'lab5', ägaren i ladan 2026-11-07: 'nästa set' + 'tänk fest, ljuset skall hjälpa dom som dansar att dansa i takt').
 * Varje idé härmar något i dansen:
 *   GUNGET      (refräng): ljuset lutar som en kropp - vänster på ettan, höger på trean, mjukt emellan, kicken ovanpå
 *   DANSSTEGET  (vers/övrigt): steg åt sidan - vänster par på 1 och 3, höger par på 2 och 4, en liten 'klapp' i mitten på 2 och 4
 *   VIRVELN     (build): varje virvelslag tänder nästa lampa i tur och ordning - tätare och tätare som uppbyggnadens trumvirvel
 *   HOPPET      (8 takter efter en build som landar): alla lampor i samma kulör på varje slag, ettan störst - alla hoppar tillsammans
 *   STJÄRNFALL  (lugnt / okänd takt): ett stjärnfall per takt (2,5 s utan takt) sveper över raden, varannan gång åt andra hållet
 * Kvällens läxor: händelser i takt (inte drift), kulörbyte bara på ettan eller på mörk lampa, inget mot takten, basen avbryter det lugna.
 */
import { GAMMA } from "./output.js";
import type { LabIn } from "./lab.js";

const TOP = 0.95;
const FORCE = process.env.DMX_LAB5_FORCE ?? '';
const toV = (share: number) => Math.pow(Math.max(0, Math.min(1, share)), 1 / GAMMA);
const SECT: [number, number, number][] = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1], [1, 0, 1]];
const col = (s: number) => SECT[((Math.round(s) % 6) + 6) % 6];

export class Lab5 {
  out = new Float32Array(0);
  mode = ''; log: [number, string][] = []; force = '';
  private n = 0; private at = 0; private pend = ''; private pendAt = 0; private bassAt = 0; private lastSec = ''; private buildAt = 0;
  private lastDrop = 0; private jumpUntilBeat = -1; private sect = 0; private sectBar = -1; private sPrev = 0;
  private roll = new Float32Array(64); private rollNext = 0; private starBar = -1; private starAt = -1e9; private starDir = 1;

  private put(i: number, s: number, share: number) {
    const v = toV(TOP * Math.max(0, Math.min(1, share))), o = i * 3, c = col(s);
    if (v > Math.max(this.out[o], this.out[o + 1], this.out[o + 2])) { this.out[o] = c[0] * v; this.out[o + 1] = c[1] * v; this.out[o + 2] = c[2] * v; }
  }

  tick(c: LabIn | undefined, n: number, now: number, presence: number): Float32Array {
    if (this.n !== n) { this.n = n; this.out = new Float32Array(n * 3); }
    const dt = this.at > 0 ? Math.min(0.2, (now - this.at) / 1000) : 0.025; this.at = now;
    this.out.fill(0);
    const sp = c?.frame?.spec, dr = c?.drum;
    if (!c || !sp || !dr) return this.out;
    const sec = c.section ?? '';
    if (c.dropEnv > 0.6 && this.lastDrop <= 0.6 && (this.mode === 'virveln' || this.lastSec === 'build')) this.jumpUntilBeat = c.beatIdx + 32;
    this.lastDrop = c.dropEnv;
    if (sec !== this.lastSec) { if (sec === 'build') this.buildAt = now; this.lastSec = sec; }
    const bar = Math.floor(c.beatIdx / 4);
    if (bar !== this.sectBar) { if (((bar % 8) + 8) % 8 === 0) this.sect = (this.sect + 1) % 6; this.sectBar = bar; }
    const snHit = dr.snare > 0.55 && this.sPrev <= 0.4; this.sPrev = dr.snare;
    if (dr.kick > 0.55 || (c.bassBody > 0.6 && presence > 0.6)) this.bassAt = now;
    const quiet = now - this.bassAt >= 1200 && (sec === 'break' || sec === 'intro' || presence < 0.35);
    const f = FORCE || this.force;
    const want = f ? f : c.beatIdx < this.jumpUntilBeat && c.hasBeat ? 'hoppet' : quiet || !c.hasBeat ? 'stjarnfall' : sec === 'build' ? 'virveln' : sec === 'high' ? 'gunget' : 'danssteget';
    if (want !== this.pend) { this.pend = want; this.pendAt = now; }
    if (want !== this.mode && (this.mode === '' || want === 'hoppet' || now - this.pendAt >= 2000 || (this.mode === 'stjarnfall' && !quiet && c.hasBeat))) {
      this.mode = want; this.log.push([Math.round(now), want]); if (this.log.length > 12) this.log.shift();
    }
    const energy = 0.4 + 0.6 * Math.min(1, Math.max(dr.kick, c.bassBody));
    const beat = ((c.beatIdx % 4) + 4) % 4;
    if (this.mode === 'hoppet') {
      const a = Math.exp(-c.beatFrac * 3) * (beat === 0 ? 1 : 0.75) * energy * presence;
      for (let i = 0; i < n; i++) this.put(i, this.sect, a);
    } else if (this.mode === 'gunget') {
      const ph = ((c.beatIdx % 4) + 4 + c.beatFrac) % 4, lean = Math.cos(Math.PI * ph / 2);   // +1 på ettan (vänster), -1 på trean (höger)
      const kick = Math.exp(-c.beatFrac * 4) * 0.35;
      for (let i = 0; i < n; i++) {
        const side = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;                   // -1 vänster .. +1 höger
        const w = Math.max(0, -lean * side * 0.5 + 0.5) ** 1.5;            // lutningen
        this.put(i, i < n / 2 ? this.sect : this.sect + 3, (0.12 + 0.6 * w + kick) * energy * presence);
      }
    } else if (this.mode === 'danssteget') {
      const left = beat % 2 === 0, step = Math.exp(-c.beatFrac * 3) * energy * presence;
      for (let i = 0; i < n; i++) {
        const isLeft = i < n / 2, mid = n > 2 && (i === Math.floor((n - 1) / 2) || i === Math.ceil((n - 1) / 2));
        if (isLeft === left) this.put(i, left ? this.sect : this.sect + 3, step);
        if (mid && !left) this.put(i, isLeft ? this.sect : this.sect + 3, Math.exp(-c.beatFrac * 6) * 0.45 * presence);   // klappen på 2 och 4
      }
    } else if (this.mode === 'virveln') {
      const rise = Math.min(1, (now - this.buildAt) / 16000);
      if (snHit) { this.roll[this.rollNext % n] = 1; this.rollNext++; }
      for (let i = 0; i < n; i++) { this.roll[i] *= Math.exp(-dt / 0.18); this.put(i, this.sect, (0.06 + 0.25 * rise + 0.7 * this.roll[i]) * presence); }
    } else {   // STJÄRNFALL
      const b2 = c.hasBeat ? bar : Math.floor(now / 2500);
      if (b2 !== this.starBar) { this.starBar = b2; this.starAt = now; this.starDir = -this.starDir; }
      const t = (now - this.starAt) / 1000, x = t / 0.45 * (n + 1) - 1;    // svepet över raden på 0,45 s
      for (let i = 0; i < n; i++) {
        const p = this.starDir > 0 ? i : n - 1 - i, d = x - p;
        const a = d < 0 ? 0 : Math.exp(-d * 1.4) * (d < 0.6 ? 1 : 0.6);  // huvudet + svansen
        this.put(i, 3, a * 0.7 * Math.max(0.6, presence));
      }
    }
    return this.out;
  }
}
