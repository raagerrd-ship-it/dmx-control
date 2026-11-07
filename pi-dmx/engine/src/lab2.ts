/**
 * LABBET 2 (stunden 'lab2', ägaren i ladan 2026-11-07: 'kör nytt set nu'). Experiment för inspiration, inte festshowen.
 *   SÖKLJUSET  (lugnt): EN blå stråle glider till en ny lampa varje takt; på virveln HITTAR den något - raden blinkar kort i strålens färg
 *   GLÖDEN     (build): glöd sprakar slumpvis i lamporna, tätare ju längre uppbyggnaden pågår (högst ~2,4 gnistor/lampa/s)
 *   DOMINO     (4 s efter dropen): varje kick välter lamporna i kedja, 70 ms mellan dem, åt omväxlande håll
 *   FRÅGA-SVAR (refräng): vänster par FRÅGAR två takter (spelar rytmen), höger par SVARAR två takter med exakt samma rytm i motfärgen
 *   KLANGFÄRG  (övrigt): färgen = ljudets klang (spektral tyngdpunkt: mörkt ljud röd -> ljust blått), ljuset rinner som en våg över raden
 * Basen tillbaka avbryter det lugna direkt; annars byter idé först efter 2 s. Inget vitt (en kulör per lampa), ingen strobe.
 */
import { GAMMA } from "./output.js";
import type { LabIn } from "./lab.js";

const TOP = 0.95;
const FORCE = process.env.DMX_LAB2_FORCE ?? '';   // bänk: tvinga en idé
const toV = (share: number) => Math.pow(Math.max(0, Math.min(1, share)), 1 / GAMMA);
/** Kulör 0..6 (0 röd, 1 gul, 2 grön, 3 cyan, 4 blå, 5 magenta) -> RGB, mellan sektorerna en ren blandning av TVÅ kanaler (aldrig vitt). */
function hue6(h: number): [number, number, number] {
  // bara ren kulör eller exakt halv blandning: en glidande bikanal passerade diodens tändpunkt hela tiden (bänken: 40 blink/min)
  const x = ((Math.round(h * 2) / 2 % 6) + 6) % 6, k = Math.floor(x), f = x - k;
  switch (k) { case 0: return [1, f, 0]; case 1: return [1 - f, 1, 0]; case 2: return [0, 1, f]; case 3: return [0, 1 - f, 1]; case 4: return [f, 0, 1]; default: return [1, 0, 1 - f]; }
}

export class Lab2 {
  out = new Float32Array(0);
  mode = ''; log: [number, string][] = [];
  private n = 0; private at = 0; private pend = ''; private pendAt = 0; private bassAt = 0; private lastSec = ''; private buildAt = 0;
  private lastDrop = 0; private dominoUntil = 0; private kPrev = 0; private sPrev = 0; private seed = 11;
  // klangfärg
  private cent = 0.5; private loud = new Float32Array(64); private li = 0;
  // sökljuset
  private beamFrom = 0; private beamTo = 0; private beamAt = 0; private beamBar = -1; private beamSect = 4; private reveal = 0;
  // glöden
  private ember = new Float32Array(0); private chainBar = -1; private emberH = new Float32Array(64); private hq = 0;
  // domino
  private chainAt = -1e9; private chainDir = 1; private chainSect = 5;
  // fråga-svar
  private rec = new Float32Array(2 * 4 * 16); private recSect = 0; private recCyc = -1;

  private rnd() { this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff; return this.seed / 0x7fffffff; }
  private put(i: number, rgb: [number, number, number], share: number) {
    const v = toV(TOP * Math.max(0, Math.min(1, share))), o = i * 3;
    if (v > Math.max(this.out[o], this.out[o + 1], this.out[o + 2])) { this.out[o] = rgb[0] * v; this.out[o + 1] = rgb[1] * v; this.out[o + 2] = rgb[2] * v; }
  }

  tick(c: LabIn | undefined, n: number, now: number, presence: number): Float32Array {
    if (this.n !== n) { this.n = n; this.out = new Float32Array(n * 3); this.ember = new Float32Array(n); }
    const dt = this.at > 0 ? Math.min(0.2, (now - this.at) / 1000) : 0.025; this.at = now;
    this.out.fill(0);
    const sp = c?.frame?.spec, dr = c?.drum;
    if (!c || !sp || !dr) return this.out;
    const kickHit = dr.kick > 0.6 && this.kPrev <= 0.45, snHit = dr.snare > 0.6 && this.sPrev <= 0.45; this.kPrev = dr.kick; this.sPrev = dr.snare;
    if (c.dropEnv > 0.6 && this.lastDrop <= 0.6) this.dominoUntil = now + 4000;
    this.lastDrop = c.dropEnv;
    const sec = c.section ?? '';
    if (sec !== this.lastSec) { if (sec === 'build') this.buildAt = now; this.lastSec = sec; }
    if (dr.kick > 0.55 || (c.bassBody > 0.6 && presence > 0.6)) this.bassAt = now;
    const quiet = now - this.bassAt >= 1200 && (sec === 'break' || sec === 'intro' || presence < 0.35);
    const want = FORCE ? FORCE : now < this.dominoUntil ? 'domino' : quiet ? 'sokljus' : sec === 'build' ? 'glod' : sec === 'high' && c.hasBeat ? 'fragasvar' : 'klangfarg';
    if (want !== this.pend) { this.pend = want; this.pendAt = now; }
    if (want !== this.mode && (this.mode === '' || want === 'domino' || now - this.pendAt >= 2000 || (this.mode === 'sokljus' && !quiet))) {
      this.mode = want; this.log.push([Math.round(now), want]); if (this.log.length > 12) this.log.shift();
    }
    // klangens tyngdpunkt (alltid, glättad 0,8 s) och ljudstyrkans historik (för vågen)
    const bands = [sp.sub, sp.kick, sp.bass, sp.lowMid, sp.mid, sp.highMid, sp.treble, sp.air];
    let sw = 0, sx = 0; for (let k = 0; k < bands.length; k++) { sw += bands[k]; sx += k * bands[k]; }
    this.cent += ((sw > 0 ? sx / sw / 7 : 0.5) - this.cent) * Math.min(1, dt / 0.8);
    this.loud[this.li] = Math.min(1, sw / 3.2); this.li = (this.li + 1) % this.loud.length;

    if (this.mode === 'domino') this.domino(n, now, kickHit, presence);
    else if (this.mode === 'sokljus') this.sokljus(c, n, now, dt, snHit);
    else if (this.mode === 'glod') this.glod(n, now, dt, presence);
    else if (this.mode === 'fragasvar') this.fragasvar(c, n, presence);
    else this.klangfarg(n, kickHit, presence);
    return this.out;
  }

  private klangfarg(n: number, kickHit: boolean, presence: number) {
    const h = 4.2 * Math.max(0, Math.min(1, (this.cent - 0.15) / 0.5));   // mörkt -> röd (0), ljust -> blå (4,2)
    if (Math.abs(h - this.hq) > 0.8) this.hq = Math.round(h * 2) / 2;   // hysteres: kulören byts först när klangen flyttat sig tydligt
    const L = this.loud.length;
    for (let i = 0; i < n; i++) {
      const lv = this.loud[(this.li - 1 - i * 3 + L * 4) % L];          // lampa i = ljudet för i * 75 ms sedan (vågen)
      this.put(i, hue6(this.hq + (i % 2) * 0.5), (0.12 + 0.75 * lv) * presence);
    }
    void kickHit;
  }

  private sokljus(c: LabIn, n: number, now: number, dt: number, snHit: boolean) {
    const bar = c.hasBeat ? Math.floor(c.beatIdx / 4) : Math.floor(now / 2500);
    if (bar !== this.beamBar) {
      this.beamBar = bar; this.beamFrom = this.beamTo;
      let k = Math.floor(this.rnd() * n); if (n > 1 && k === this.beamTo) k = (k + 1 + Math.floor(this.rnd() * (n - 1))) % n;
      this.beamTo = k; this.beamAt = now; if (bar % 8 === 0) this.beamSect = this.beamSect === 4 ? 3 : 4;
    }
    if (snHit) this.reveal = 0.55;
    this.reveal *= Math.exp(-dt / 0.4);
    const g = Math.min(1, (now - this.beamAt) / 300), col = hue6(this.beamSect);
    for (let i = 0; i < n; i++) {
      const beam = (i === this.beamTo ? g : 0) + (i === this.beamFrom ? 1 - g : 0);
      this.put(i, col, Math.max(0.6 * beam, this.reveal));
    }
  }

  private glod(n: number, now: number, dt: number, presence: number) {
    const rise = Math.min(1, (now - this.buildAt) / 14000);
    for (let i = 0; i < n; i++) {
      this.ember[i] *= Math.exp(-dt / 0.35);
      if (this.rnd() < (0.4 + 2 * rise) * dt) { this.ember[i] = Math.max(this.ember[i], 0.4 + 0.6 * this.rnd()); }
      this.put(i, hue6(i % 2 ? 0.5 : 0),   // fast kulör per lampa under hela uppbyggnaden (bänken: 28 blink/min)
        (0.08 + 0.3 * rise + 0.6 * this.ember[i]) * presence);
    }
  }

  private domino(n: number, now: number, kickHit: boolean, presence: number) {
    if (kickHit) { this.chainAt = now; this.chainDir = -this.chainDir; }
    const bar = Math.floor(now / 2000); if (bar !== this.chainBar) { this.chainBar = bar; this.chainSect = (this.chainSect + 2) % 6; }   // kulör per takt, inte per kick (bänken: 119 blink/min)
    for (let i = 0; i < n; i++) {
      const pos = this.chainDir > 0 ? i : n - 1 - i, t = now - this.chainAt - pos * 70;
      const a = t < 0 ? 0 : Math.exp(-t / 250);
      this.put(i, hue6(this.chainSect), a * presence);   // mörkt mellan kedjorna
    }
  }

  private fragasvar(c: LabIn, n: number, presence: number) {
    const bar = Math.floor(c.beatIdx / 4), inCycle = ((bar % 4) + 4) % 4, asking = inCycle < 2;
    const slot = ((inCycle % 2) * 4 + (((c.beatIdx % 4) + 4) % 4)) * 16 + Math.min(15, Math.floor(c.beatFrac * 16));
    const dr = c.drum!, rhythm = Math.max(dr.kick, dr.snare * 0.8);   // (hi-hat borta: 16-delar = fladder)
    const cyc = Math.floor(bar / 4); if (cyc !== this.recCyc) { this.recCyc = cyc; this.recSect = (this.recSect + 1) % 6; }   // en gång per varv
    if (asking) this.rec[slot] = rhythm;
    const half = n / 2;
    for (let i = 0; i < n; i++) {
      const left = i < half;
      if (asking && left) this.put(i, hue6(this.recSect), rhythm * presence);
      else if (!asking && !left) this.put(i, hue6(this.recSect + 3), this.rec[slot] * presence);
      // tysta sidan mörk (en glöd i annan kulör bytte kulör på tänd lampa)
    }
  }
}
