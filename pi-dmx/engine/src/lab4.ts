/**
 * LABBET 4 (stunden 'lab4', ägaren i ladan 2026-11-07: 'nytt set'). Experiment för inspiration.
 *   DANSPARET     (refräng): två ljuspunkter i motfärger dansar ett steg per slag - mot varandra, isär, förbi; varannan takt byter de plats
 *   UPPLADDNINGEN (build): raden laddas som ett batteri vänster -> höger, kanten starkast och pulserar på slagen; dropen laddar ur allt
 *   KARUSELLEN    (vers/övrigt): fyra kulörer på fyra lampor vrider sig ett steg per takt; slagen pulserar med energin, ettan störst
 *   MÅNEN         (lugnt / okänd takt): en blek måne vandrar långsamt över raden (~30 s per varv) och andas med rösten
 * Kvällens läxor: kulörbyte på tänd lampa bara på taktens etta, allt på slagen (ingen polyrytm), explosion/urladdning bara efter en build,
 * basen tillbaka avbryter det lugna direkt. Inget vitt, ingen strobe.
 */
import { GAMMA } from "./output.js";
import type { LabIn } from "./lab.js";

const TOP = 0.95;
const FORCE = process.env.DMX_LAB4_FORCE ?? '';
const toV = (share: number) => Math.pow(Math.max(0, Math.min(1, share)), 1 / GAMMA);
const SECT: [number, number, number][] = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1], [1, 0, 1]];
const col = (s: number) => SECT[((Math.round(s) % 6) + 6) % 6];
// dansparets steg (A:s lampa per slag över två takter; B speglad): mot varandra, möts, förbi, tillbaka
const STEPS = [0, 1, 1, 0, 0, 1, 2, 3];

export class Lab4 {
  out = new Float32Array(0);
  mode = ''; log: [number, string][] = [];
  /** Tvinga en idé live (POST /api/labforce {idea}), '' = musiken väljer. */
  force = '';
  private n = 0; private at = 0; private pend = ''; private pendAt = 0; private bassAt = 0; private lastSec = ''; private buildAt = 0;
  private lastDrop = 0; private dischargeAt = -1e9; private sect = 0; private sectBar = -1;
  private vS = 0; private vFloor = 1;

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
    if (c.dropEnv > 0.6 && this.lastDrop <= 0.6 && (this.mode === 'laddning' || this.lastSec === 'build')) this.dischargeAt = now;
    this.lastDrop = c.dropEnv;
    if (sec !== this.lastSec) { if (sec === 'build') this.buildAt = now; this.lastSec = sec; }
    const bar = Math.floor(c.beatIdx / 4);
    if (bar !== this.sectBar) { if (((bar % 8) + 8) % 8 === 0) this.sect = (this.sect + 1) % 6; this.sectBar = bar; }   // kulör per 8 takter, på ettan
    this.vS += (0.25 * sp.lowMid + 0.5 * sp.mid + 0.25 * sp.highMid - this.vS) * Math.min(1, dt / 0.08);
    this.vFloor = Math.min(this.vS, this.vFloor + dt * 0.02);
    if (dr.kick > 0.55 || (c.bassBody > 0.6 && presence > 0.6)) this.bassAt = now;
    const quiet = now - this.bassAt >= 1200 && (sec === 'break' || sec === 'intro' || presence < 0.35);
    const f = FORCE || this.force;
    const want = f ? f : now - this.dischargeAt < 1200 ? 'urladdning' : quiet || !c.hasBeat ? 'manen' : sec === 'build' ? 'laddning' : sec === 'high' ? 'dansparet' : 'karusellen';
    if (want !== this.pend) { this.pend = want; this.pendAt = now; }
    if (want !== this.mode && (this.mode === '' || want === 'urladdning' || now - this.pendAt >= 2000 || (this.mode === 'manen' && !quiet && c.hasBeat))) {
      this.mode = want; this.log.push([Math.round(now), want]); if (this.log.length > 12) this.log.shift();
    }
    const energy = 0.4 + 0.6 * Math.min(1, Math.max(dr.kick, c.bassBody));
    if (this.mode === 'urladdning') { const a = Math.exp(-(now - this.dischargeAt) / 500); for (let i = 0; i < n; i++) this.put(i, i < n / 2 ? 0 : 1, a); }
    else if (this.mode === 'manen') this.manen(n, now, presence);
    else if (this.mode === 'laddning') this.laddning(c, n, now, presence, energy);
    else if (this.mode === 'dansparet') this.dansparet(c, n, presence, energy);
    else this.karusellen(c, n, presence, energy);
    return this.out;
  }

  private dansparet(c: LabIn, n: number, presence: number, energy: number) {
    const k = ((c.beatIdx % 8) + 8) % 8, prev = (k + 7) % 8, scale = (n - 1) / 3;
    const swap = Math.floor(c.beatIdx / 8) % 2 === 1;                       // varannan takt byter de plats (snurren)
    const a = Math.round(STEPS[k] * scale), b = n - 1 - a, ap = Math.round(STEPS[prev] * scale), bp = n - 1 - ap;
    const pulse = Math.exp(-c.beatFrac * 2.5) * energy * presence;
    const sA = swap ? this.sect + 3 : this.sect, sB = swap ? this.sect : this.sect + 3;
    if (ap !== a) this.put(ap, sA, 0.22 * presence * (1 - c.beatFrac));      // spåret efter steget
    if (bp !== b) this.put(bp, sB, 0.22 * presence * (1 - c.beatFrac));
    if (a === b) this.put(a, k % 2 ? sB : sA, pulse);                       // de möts: den vars tur det är
    else { this.put(a, sA, pulse); this.put(b, sB, pulse); }
  }

  private laddning(c: LabIn, n: number, now: number, presence: number, energy: number) {
    const rise = Math.min(1, (now - this.buildAt) / 16000), fill = rise * n, edge = Math.min(n - 1, Math.floor(fill));
    const pulse = 0.55 + 0.45 * Math.exp(-c.beatFrac * 3);
    for (let i = 0; i < n; i++) {
      const s = i < n / 2 ? 0 : 1;                                           // röd -> gul längs batteriet
      if (i < edge) this.put(i, s, (0.3 + 0.3 * rise) * presence);
      else if (i === edge) this.put(i, s, (0.35 + 0.6 * Math.max(fill - edge, 0.3)) * pulse * energy * presence);
    }
  }

  private karusellen(c: LabIn, n: number, presence: number, energy: number) {
    const bar = Math.floor(c.beatIdx / 4), one = ((c.beatIdx % 4) + 4) % 4 === 0;
    const H = [this.sect, this.sect + 2, this.sect + 3, this.sect + 5];
    const pulse = Math.exp(-c.beatFrac * 3) * (one ? 1 : 0.6) * energy * presence;
    for (let i = 0; i < n; i++) this.put(i, H[(((i + bar) % 4) + 4) % 4], 0.08 * presence + pulse);
  }

  private manen(n: number, now: number, presence: number) {
    const voice = Math.max(0, Math.min(1, (this.vS - this.vFloor - 0.03) * 2.2));
    const span = Math.max(1, n - 1), ph = (now / 30000) % 2, x = (ph < 1 ? ph : 2 - ph) * span;   // fram och tillbaka på ~30 s
    for (let i = 0; i < n; i++) {
      const w = Math.max(0, 1 - Math.abs(i - x));                          // månen delas mjukt mellan två lampor
      if (w > 0) this.put(i, 3, w * (0.35 + 0.5 * voice) * Math.max(0.6, presence));   // ljusare (ägaren: 'jag ser ingen måne')
    }
  }
}
