/**
 * LABBET 3 (stunden 'lab3', ägaren i ladan 2026-11-07: 'nytt set med innovativa lösningar'). Experiment för inspiration.
 *   FÖRVÄNTAN    (vers/övrigt): ljuset FÖRUTSER i stället för att reagera - växer från mitten ut över slag 2-4 och toppar exakt på
 *                taktens etta; var 4:e takt större
 *   SPÄNNINGEN   (build): energin pressas ihop - 4 lampor -> 3 -> 2 -> 1, allt ljusare; dropen exploderar ut i alla fyra
 *   POLYRYTM 3:4 (refräng): vänster par på slagen, höger par var 3:e åttondel - de möts var 3:e slag (ett gung musiken inte spelar)
 *   MÅLNINGEN    (lugnt / okänd takt): varje ny sektion målar en lampa i sin kulör; i lugna partier glöder låtens historia svagt
 * Kvällens läxor: aldrig kulörbyte på tänd lampa (byten bara på taktens/varvets gräns eller när lampan är mörk), ingen snabb flimmer
 * (högst ~2 pulser/lampa/s), basen tillbaka avbryter det lugna direkt. Inget vitt, ingen strobe.
 */
import { GAMMA } from "./output.js";
import type { LabIn } from "./lab.js";

const TOP = 0.95;
const FORCE = process.env.DMX_LAB3_FORCE ?? '';   // bänk: tvinga en idé
const toV = (share: number) => Math.pow(Math.max(0, Math.min(1, share)), 1 / GAMMA);
const SECT: [number, number, number][] = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1], [1, 0, 1]];
const col = (s: number) => SECT[((Math.round(s) % 6) + 6) % 6];

export class Lab3 {
  out = new Float32Array(0);
  mode = ''; log: [number, string][] = [];
  private n = 0; private at = 0; private pend = ''; private pendAt = 0; private bassAt = 0; private lastSec = ''; private buildAt = 0;
  private lastDrop = 0; private burstAt = -1e9;
  private paint = new Int8Array(64).fill(-1); private paintNext = 0; private paintSect = 0;
  private phraseSect = 0; private phraseBar = -1;

  private put(i: number, s: number, share: number) {
    const v = toV(TOP * Math.max(0, Math.min(1, share))), o = i * 3, c = col(s);
    if (v > Math.max(this.out[o], this.out[o + 1], this.out[o + 2])) { this.out[o] = c[0] * v; this.out[o + 1] = c[1] * v; this.out[o + 2] = c[2] * v; }
  }

  tick(c: LabIn | undefined, n: number, now: number, presence: number): Float32Array {
    if (this.n !== n) { this.n = n; this.out = new Float32Array(n * 3); }
    this.at = now;
    this.out.fill(0);
    const sp = c?.frame?.spec, dr = c?.drum;
    if (!c || !sp || !dr) return this.out;
    // explosionen BARA när spänningen (build) landar i en drop - minidropparnas kuvert fyrade den var 4-8 s ('tappar takten väldigt ofta')
    if (c.dropEnv > 0.6 && this.lastDrop <= 0.6 && (this.mode === 'spanning' || this.lastSec === 'build')) this.burstAt = now;
    this.lastDrop = c.dropEnv;
    const sec = c.section ?? '';
    if (sec !== this.lastSec) {   // MÅLNINGEN: ny sektion -> nästa lampa får sektionens kulör
      if (sec === 'build') this.buildAt = now;
      this.paintSect = (this.paintSect + 2 + (sec === 'high' ? 1 : 0)) % 6;
      this.paint[this.paintNext % n] = this.paintSect; this.paintNext++;
      this.lastSec = sec;
    }
    const bar = Math.floor(c.beatIdx / 4);
    if (bar !== this.phraseBar && ((bar % 4) + 4) % 4 === 0) this.phraseSect = (this.phraseSect + 1) % 6;   // kulör per 4 takter, byts på ettan
    this.phraseBar = bar;
    if (dr.kick > 0.55 || (c.bassBody > 0.6 && presence > 0.6)) this.bassAt = now;
    const quiet = now - this.bassAt >= 1200 && (sec === 'break' || sec === 'intro' || presence < 0.35);
    const want = FORCE ? FORCE : now - this.burstAt < 1500 ? 'explosion' : quiet || !c.hasBeat ? 'malning' : sec === 'build' ? 'spanning' : sec === 'high' ? 'polyrytm' : 'forvantan';
    if (want !== this.pend) { this.pend = want; this.pendAt = now; }
    if (want !== this.mode && (this.mode === '' || want === 'explosion' || now - this.pendAt >= 2000 || (this.mode === 'malning' && !quiet && c.hasBeat))) {
      this.mode = want; this.log.push([Math.round(now), want]); if (this.log.length > 12) this.log.shift();
    }
    if (this.mode === 'explosion') this.explosion(n, now);
    else if (this.mode === 'malning') this.malning(n, presence);
    else if (this.mode === 'spanning') this.spanning(c, n, now, presence);
    else if (this.mode === 'polyrytm') this.polyrytm(c, n, presence);
    else this.forvantan(c, n, presence);
    return this.out;
  }

  /** FÖRVÄNTAN: stiger mjukt från mitten ut över slag 2-4, topp på ettan, sedan ner (motorns uttoning). */
  private forvantan(c: LabIn, n: number, presence: number) {
    const b = (((c.beatIdx % 4) + 4) % 4) + c.beatFrac, big = (((Math.floor(c.beatIdx / 4)) % 4) + 4) % 4 === 3;
    const energy = 0.45 + 0.55 * Math.min(1, Math.max(c.drum!.kick, c.bassBody));
    for (let i = 0; i < n; i++) {
      const d = n > 1 ? Math.abs(i - (n - 1) / 2) / ((n - 1) / 2) : 0;   // 0 mitten, 1 kant
      let a: number;
      if (b < 0.35) a = Math.exp(-b * 4);                                  // ettan: toppen, klingar
      else { const r = Math.max(0, (b - 1 - d * 0.6) / (3 - d * 0.6)); a = r * r * (3 - 2 * r) * (big ? 0.85 : 0.55); }   // mitten först, kanterna sist
      this.put(i, this.phraseSect + (d > 0.5 ? 3 : 0), a * energy * presence);
    }
  }

  /** SPÄNNINGEN: allt färre lampor, allt ljusare, puls på slagen. */
  private spanning(c: LabIn, n: number, now: number, presence: number) {
    const rise = Math.min(1, (now - this.buildAt) / 16000), lit = Math.max(1, Math.round(n - rise * (n - 1))), start = Math.floor((n - lit) / 2);
    const pulse = 0.5 + 0.5 * Math.exp(-c.beatFrac * 3);
    for (let i = 0; i < n; i++) if (i >= start && i < start + lit) this.put(i, this.phraseSect, (0.25 + 0.75 * rise) * pulse * presence);
  }

  /** EXPLOSIONEN efter spänningen: alla fyra ut från mitten. */
  private explosion(n: number, now: number) {
    const t = (now - this.burstAt) / 1000;
    for (let i = 0; i < n; i++) {
      const d = n > 1 ? Math.abs(i - (n - 1) / 2) / ((n - 1) / 2) : 0, a = t < d * 0.12 ? 0 : Math.exp(-(t - d * 0.12) / 0.6);
      this.put(i, this.phraseSect + (d > 0.5 ? 3 : 0), a);
    }
  }

  /** POLYRYTM 3:4: vänster på slagen, höger var 3:e åttondel. */
  private polyrytm(c: LabIn, n: number, presence: number) {
    const pos = c.beatIdx + c.beatFrac, f3 = (pos / 0.75) % 1;
    const energy = 0.4 + 0.6 * Math.min(1, Math.max(c.drum!.kick, c.bassBody));
    for (let i = 0; i < n; i++) {
      const left = i < n / 2;
      this.put(i, this.phraseSect + (left ? 0 : 3), (left ? Math.exp(-c.beatFrac * 3.5) : Math.exp(-f3 * 0.75 * 3.5)) * energy * presence);
    }
  }

  /** MÅLNINGEN: låtens kulörer, svag glöd som andas med rösten/mellanregistret. */
  private malning(n: number, presence: number) {
    for (let i = 0; i < n; i++) if (this.paint[i] >= 0) this.put(i, this.paint[i], (0.1 + 0.12 * presence));
  }
}
