/**
 * LABBET 6 (stunden 'lab6', ägaren i ladan 2026-11-13: "köra igång effektlabbet igen och testa lite nya effekter nu när vi har 8
 * lampor"). Idéer som BEHÖVER åtta lampor - en takt har åtta åttondelar, och åtta lampor är två körer om fyra:
 *   LINJALEN   (vers/övrigt): takten ritad över raden - varje SLAG (bastakten) flyttar löparen en lampa, ettan störst;
 *              alla lampor andas med basen i en kulör (golv..65 %); löparen är fyra takter en lampa i motkulören (95 %) och fyra takter ett HÅL
 *              (en släckt lampa); hållet byter efter varje varv (två takter)
 *   VÅGEN      (refräng): en vågkam rullar över raden en gång per takt, kammen står på lampa 1 på ettan; kicken lyfter alla lite
 *   TRAPPAN    (build): raden fylls lampa för lampa under uppbyggnaden, varje virvelslag blinkar i den översta - full rad när det landar
 *   SVARET     (8 takter efter en build som landar): alla på 1 och 3, vänster kör svarar på 2, höger kör på 4
 *   TVÅ KÖRER  (lugnt / okänd takt): vänster kör andas in medan höger andas ut, en takt var (2,5 s utan takt)
 * Läxorna från labb 1-5 gäller: händelser i takt, kulörbyte bara på ettan eller på mörk lampa, inget mot takten, basen avbryter det lugna.
 * Lamporna antas stå i nummerordning i en rad (1 längst till vänster); vänster kör = första halvan.
 */
import { lampLevel } from "./output.js";
import type { FixtureConfig } from "./config.js";
import type { LabIn } from "./lab.js";

const TOP = 0.95;
const toV = (fx: FixtureConfig | undefined, share: number) => lampLevel(fx, Math.max(0, Math.min(1, share)));   // ljusandel -> lampans nivå (output.ts)
const SECT: [number, number, number][] = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1], [1, 0, 1]];
const col = (s: number) => SECT[((Math.round(s) % 6) + 6) % 6];

export class Lab6 {
  fx: FixtureConfig[] = [];   // lamporna (sätts av moment.ts), bara för output.ts lampLevel
  out = new Float32Array(0);
  mode = ''; log: [number, string][] = []; force = '';
  private n = 0; private at = 0; private pend = ''; private pendAt = 0; private bassAt = 0; private lastSec = ''; private buildAt = 0;
  private lastDrop = 0; private answerUntilBeat = -1; private sect = 0; private sectBar = -1; private sPrev = 0;
  private flash = 0; private eSm = 0; private eHi = 0; private eLo = 1; private runLv = new Float32Array(64); private runK = -1; private runPeak = 0; private choirSect = [0, 3]; private choirDark = [false, false];

  private put(i: number, s: number, share: number) {
    const v = toV(this.fx[i], TOP * Math.max(0, Math.min(1, share))), o = i * 3, c = col(s);
    if (v > Math.max(this.out[o], this.out[o + 1], this.out[o + 2])) { this.out[o] = c[0] * v; this.out[o + 1] = c[1] * v; this.out[o + 2] = c[2] * v; }
  }

  tick(c: LabIn | undefined, n: number, now: number, presence: number): Float32Array {
    if (this.n !== n) { this.n = n; this.out = new Float32Array(n * 3); }
    const dt = this.at > 0 ? Math.min(0.2, (now - this.at) / 1000) : 0.025; this.at = now;
    this.out.fill(0);
    const sp = c?.frame?.spec, dr = c?.drum;
    if (!c || !sp || !dr) return this.out;
    const sec = c.section ?? '';
    if (c.dropEnv > 0.6 && this.lastDrop <= 0.6 && (this.mode === 'trappan' || this.lastSec === 'build')) this.answerUntilBeat = c.beatIdx + 32;
    this.lastDrop = c.dropEnv;
    if (sec !== this.lastSec) { if (sec === 'build') this.buildAt = now; this.lastSec = sec; }
    const bar = Math.floor(c.beatIdx / 4);
    if (bar !== this.sectBar) { if (((bar % 8) + 8) % 8 === 0) this.sect = (this.sect + 1) % 6; this.sectBar = bar; }
    const snHit = dr.snare > 0.55 && this.sPrev <= 0.4; this.sPrev = dr.snare;
    if (dr.kick > 0.55 || (c.bassBody > 0.6 && presence > 0.6)) this.bassAt = now;
    const quiet = now - this.bassAt >= 1200 && (sec === 'break' || sec === 'intro' || presence < 0.35);
    const f = this.force;
    const want = f ? f : c.beatIdx < this.answerUntilBeat && c.hasBeat ? 'svaret' : quiet || !c.hasBeat ? 'tvakorer' : sec === 'build' ? 'trappan' : sec === 'high' ? 'vagen' : 'linjalen';
    if (want !== this.pend) { this.pend = want; this.pendAt = now; }
    if (want !== this.mode && (this.mode === '' || want === 'svaret' || now - this.pendAt >= 2000 || (this.mode === 'tvakorer' && !quiet && c.hasBeat))) {
      this.mode = want; this.log.push([Math.round(now), want]); if (this.log.length > 12) this.log.shift();
    }
    const energy = 0.4 + 0.6 * Math.min(1, Math.max(dr.kick, c.bassBody));
    const beat = ((c.beatIdx % 4) + 4) % 4, half = n / 2;
    if (this.mode === 'linjalen') {
      // Ägaren 11-13: "den borde ju flytta sig till bastakten" -> ETT STEG PER SLAG (där basen slår), åtta slag = två takter över raden.
      const k = ((c.beatIdx % 8) + 8) % 8, fr = c.beatFrac;                                 // slaget i tvåtaktsfrasen (0..7) och hur långt in i det
      // Ägaren 11-13: "snyggt om linjalen ibland körde samma färg på alla och då en färg på den som åker, och inte alltid från samma
      // håll"; sedan: "när den kör med annan färg ser det nice ut, men när den istället skall släcka samma lampa så ser det inte snyggt
      // ut" -> ALLTID alla i en kulör + löparen i motkulören; hållet byter var fjärde takt, på ettan.
      const rev = ((Math.floor(c.beatIdx / 8) % 2) + 2) % 2 === 1;                          // hållet byter efter varje varv (två takter)
      const at = (kk: number) => { const x = Math.min(n - 1, Math.floor(kk * n / 8)); return rev ? n - 1 - x : x; };
      // Ägaren 11-13: "de andra lamporna vill jag skall följa energin fast inte fullt, bara så de inte ser döda ut": grunden andas med
      // basen/kicken (snabbt upp, mjukt ner).
      // Sedan: "övriga lampor andas inte med musiken. säg att de andra går mellan floor och säg 65%, så får löparen köra upp till 95%".
      // Basens/kickens nivå räknas mot sitt EGET spann de senaste sekunderna (lägst..högst), så andningen syns oavsett hur stark basen är.
      const x0 = Math.min(1, Math.max(dr.kick, c.bassBody)); this.eHi = Math.max(x0, this.eHi - dt * 0.15); this.eLo = Math.min(x0, this.eLo + dt * 0.15);
      const eNow = this.eHi - this.eLo > 0.08 ? (x0 - this.eLo) / (this.eHi - this.eLo) : 0; this.eSm += (eNow - this.eSm) * (eNow > this.eSm ? Math.min(1, dt / 0.03) : Math.min(1, dt / 0.25));
      // Sedan: "försök få till den inverterade att istället för annan färg så blir den lampan släckt" -> fyra takter färglöpare, fyra takter
      // HÅLET: löparen är en SLÄCKT lampa som vandrar genom de tända (mörk hela slaget, tänds igen när hålet gått vidare).
      // I hålvarianten ligger grundens golv högre (0,22) så hålet syns även när basen andas ut.
      // Ägaren: "tänk att svart är avstängd" -> lampan som hålet ska till NÄSTA slag börjar tona ner redan nu (uttoningen 0,25 s får inte
      // brytas), så den är nere på ~15 % när hålet kommer och ~2 % när det går vidare: svart är släckt, inte bara dämpad.
      const hole = ((Math.floor(c.beatIdx / 16) % 2) + 2) % 2 === 1, i = at(k), nx = k < 7 ? at(k + 1) : -1;
      // (11-13 kväll: ägaren såg aldrig hålet - det var mörkt bara 0,45 slag (~210 ms), och lampans uttoning (cfg.fadeMinS 0,25 s) hann
      // då bara ner till ~43 %. Nu är lampan släckt hela slaget: nere på ~15 % innan hålet går vidare.)
      // "hoppande färgen kanske bara får vara Röd, Grön, Blå eller Svart": löparen är alltid en REN grundfärg som inte är grundens -
      // motkulören när grunden är en blandfärg (gul -> blå), nästa grundfärg när grunden själv är ren (röd -> grön). Svart = hålet.
      // "färgen måste alltid vara en annan än vad alla lampor kör": löparens lampa bär BARA löparens färg hela slaget, aldrig svagare än
      // grunden (förr tog grundfärgen över lampan så fort löparen tonat under grundens nivå, ~15 % in i slaget).
      const run = this.sect % 2 === 1 ? this.sect + 3 : this.sect + 2;
      // "justera fade in out, lägg på en lång fade out på löparen, gör inget om två lampor smetas": varje lampa minns löparens färg
      // (runLv) och tonar ut den över ~2 slag (tidskonstant 0,8 slag) - två-tre lampor bär löparens färg samtidigt. Intoningen är kort
      // (~40 ms, slaget ska fortfarande slå). Grundfärgen kommer tillbaka på lampan först när löparens färg nästan slocknat (under
      // 0,12): kulörbytet sker på mörk lampa, och färgerna blandas aldrig (gul grund + blå löpare skulle annars gå mot vitt).
      const bpmNow = c.frame && c.frame.bpm > 40 ? c.frame.bpm : 120, dec = Math.exp(-(dt * bpmNow / 60) / 0.8);
      for (let x = 0; x < n; x++) this.runLv[x] *= dec;
      if (k !== this.runK) { this.runK = k; this.runPeak = 0; }
      if (!hole) {
        if (fr < 0.25) this.runPeak = Math.max(this.runPeak, (k % 4 === 0 ? 1 : 0.9) * energy * presence);   // löparen upp till 95 %, ettan störst
        const up = 40 * bpmNow / 60000;                                                              // intoningen 40 ms, räknat i slag
        this.runLv[i] = Math.max(this.runLv[i], this.runPeak * (fr < up ? fr / up : Math.exp(-(fr - up) / 0.8)));
      }
      for (let x = 0; x < n; x++) {
        const g = ((hole ? 0.22 : 0.05) + (hole ? 0.46 : 0.63) * this.eSm * presence) / TOP * 0.95;        // alla i samma kulör: golv .. 65 %
        const r = this.runLv[x], back = r < 0.12 ? 1 - r / 0.12 : 0;                                         // grunden tillbaka när löparens färg slocknat
        if (r > 0.01) this.put(x, run, r);
        this.put(x, this.sect, hole && (x === i || x === nx) ? 0 : g * back);                               // hålet: släckt hela slaget + lampan före börjar tona ner
      }
    } else if (this.mode === 'vagen') {
      const p = (beat + c.beatFrac) / 4, kick = Math.exp(-c.beatFrac * 4) * 0.25;           // 0..1 över takten
      for (let i = 0; i < n; i++) {
        let d = p - i / n; d -= Math.floor(d);                                              // hur långt efter kammen lampan ligger (0 = kammen här nu)
        const w = d < 0.5 ? Math.cos(Math.PI * d) ** 3 : 0;                                 // brant fram, lång rygg bakom kammen
        this.put(i, i < half ? this.sect : this.sect + 3, (0.08 + 0.72 * w + kick) * energy * presence);
      }
    } else if (this.mode === 'trappan') {
      const rise = Math.min(1, (now - this.buildAt) / 16000), top = Math.min(n - 1, Math.floor(rise * n));
      if (snHit) this.flash = 1; this.flash *= Math.exp(-dt / 0.15);
      for (let i = 0; i <= top; i++) this.put(i, this.sect, (i === top ? 0.2 + 0.75 * this.flash : 0.12 + 0.25 * rise) * presence);
    } else if (this.mode === 'svaret') {
      const all = beat % 2 === 0, a = Math.exp(-c.beatFrac * 3) * energy * presence;
      for (let i = 0; i < n; i++) {
        if (all) this.put(i, this.sect, a * (beat === 0 ? 1 : 0.8));
        else if ((i < half) === (beat === 1)) this.put(i, this.sect + 3, a * 0.7);          // vänster kör svarar på 2, höger på 4
      }
    } else {   // TVÅ KÖRER
      const ph = c.hasBeat ? (bar % 2) + (beat + c.beatFrac) / 4 : (now / 2500) % 2;          // 0..2: en takt in, en takt ut
      for (let q = 0; q < 2; q++) {
        const lv = Math.sin(Math.PI * (((ph + q) % 2) / 2)) ** 2;                            // kör 2 ligger en takt efter kör 1
        if (lv < 0.02) { if (!this.choirDark[q]) { this.choirDark[q] = true; this.choirSect[q] = (this.choirSect[q] + 1) % 6; } } else this.choirDark[q] = false;   // kulörbyte på mörk kör
        for (let i = 0; i < n; i++) if ((i < half) === (q === 0)) this.put(i, this.choirSect[q], (0.04 + 0.5 * lv) * Math.max(0.6, presence));
      }
    }
    return this.out;
  }
}
