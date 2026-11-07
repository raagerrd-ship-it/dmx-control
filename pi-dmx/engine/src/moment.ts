/**
 * BRÖLLOPSLÄGET - KVÄLLENS STUNDER (natt-todo 2026-11-01, ägaren: 'ja'; byggt 11-02). Ett bröllop är ~70 % middag/tal - showen står och
 * väntar på dansmusik. cfg.moment väljer stund; 'fest' (standard) = dagens show, orörd och bit-identisk (lagret är avstängt, w = 0).
 *   middag      stilla ljus i parets färger (cfg.themeColors, 1-3 av de sex rena kulörerna), varje lampa sin färg, långsam andning
 *               ~10 s, nivån följer musikens volym MJUKT (5 s) - ingen takt, inga drops, ingen rök, ingen strobe. Tak 50 % av mastern.
 *   tal         stilla och dämpat (25 %), parets första färg, ingen musikkoppling alls (talarens röst får inte pumpa ljuset).
 *   forstadans  gult (röd+grön, en av de sex rena), mittlamporna högre och kanterna svaga, långsam andning (8 s) - inte takt/drops.
 *               En rökpuff vid start om röken är på.
 *   tartan      'ta-da': alla upp mjukt på ~1 s i parets färger, håll 20 s, tillbaka till stunden före.
 * Lagret blandas in i STEG 1 (effekten): festens ljus (efter energin) * (1 - w) + stundens ljus * w. Stundens ljus följer inte
 * släckgränsen eller ingången (tal utan musik ska lysa). Övergångar: w och stundens färger glider linjärt 2,5 s (tårtan upp på 1 s) -
 * långsammare än uttoningen (0,25 s), så nedgången blir aldrig snabbare än i dag (låst regel). Dirigenten kör vidare under, så
 * tillbaka till fest = som om inget hänt.
 * EN VÄG IN: pressMoment (ws setMoment, POST /api/moment, gästsidans knappar och de fysiska knapparna) - tryck på aktiv stund = fest.
 */
import type { EngineConfig } from "./config.js";
import { GAMMA } from "./output.js";
import { Lab, type LabIn } from "./lab.js";
import { Lab2 } from "./lab2.js";
import { Lab3 } from "./lab3.js";
import { Lab4 } from "./lab4.js";

export const MOMENTS = ["fest", "middag", "tal", "forstadans", "tartan", "show", "lab", "lab2", "lab3", "lab4"] as const;
export type Moment = typeof MOMENTS[number];
/** Motorns takt till showen (effects.ts ctx, satt före stunden varje ruta). */
export interface ShowBeat { beatIdx: number; beatFrac: number; hasBeat: boolean; bassBody: number; bassline: number; bassNoteIdx: number; dropEnv: number; section: string;
  drum: { kick: number; snare: number; hat: number; bass: number } | null; frame: { spec: { sub: number; kick: number; bass: number; lowMid: number; mid: number; highMid: number } } | null }
export const isMoment = (m: unknown): m is Moment => typeof m === "string" && (MOMENTS as readonly string[]).includes(m);

/** Parets färger när inga är valda: magenta + röd (sektor 0 röd, 1 gul, 2 grön, 3 cyan, 4 blå, 5 magenta). */
export const THEME_DEFAULT = [5, 0];
export function cleanTheme(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  const out: number[] = [];
  for (const x of v) { const s = Math.round(Number(x)); if (Number.isFinite(s) && s >= 0 && s <= 5 && !out.includes(s)) out.push(s); }
  return out.length ? out.slice(0, 3) : null;
}

/** Den enda vägen in (webbknapp, /api/moment, fysisk knapp). Tryck på aktiv stund (utom fest) = tillbaka till fest. */
export function pressMoment(cfg: EngineConfig, m: Moment): Moment {
  const cur = cfg.moment ?? "fest";
  cfg.moment = m !== "fest" && m === cur ? "fest" : m;
  return cfg.moment;
}

const XFADE_S = 2.5, TARTAN_UP_S = 1, TARTAN_HOLD_MS = 20000;
const SHOW_TOP = 0.95;   // showen: lampans tak (output lägger sina 95 % ovanpå)
const MIDDAG_TOP = 0.5, TAL_TOP = 0.25, DANS_TOP = 0.6, TARTAN_TOP = 1;   // andel DMX-ljus (efter gamman) av mastern
const VOL_TAU_S = 5, VOL_REF = 0.2;   // middagens volym: följd över 5 s, ladans musik har level-median ~0,19
const SECT: [number, number, number][] = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1], [1, 0, 1]];
const toV = (share: number) => Math.pow(Math.max(0, Math.min(1, share)), 1 / GAMMA);   // DMX-andel -> effektens 0..1

export class MomentLayer {
  /** Stundens vikt mot festen 0..1 (0 = festen orörd). */
  w = 0;
  private look = new Float32Array(0);
  private live: Moment = "fest";      // stunden lagret visar (cfg.moment efter tårtans återgång)
  private beforeTartan: Moment = "fest";
  private tartanAt = 0;
  private vol = 0;
  /** Sant den ruta forstadans startar (motorn tänder en rökpuff om röken är på). */
  puff = false;

  /** En gång per ruta. Sant om lagret syns (w > 0). */
  step(cfg: EngineConfig, level: number, nowWall: number, dtSec: number, count: number, beat?: ShowBeat): boolean {
    this.beat = beat;
    this.labForce = typeof (cfg as unknown as { labForce?: unknown }).labForce === 'string' ? (cfg as unknown as { labForce: string }).labForce : '';
    let m: Moment = isMoment(cfg.moment) ? cfg.moment : "fest";
    if (m === "tartan") {
      if (this.live !== "tartan") { this.beforeTartan = this.live; this.tartanAt = nowWall; }
      else if (nowWall - this.tartanAt > TARTAN_HOLD_MS) { m = this.beforeTartan; cfg.moment = m; }
    }
    this.puff = m === "forstadans" && this.live !== "forstadans";
    const entering = this.w <= 0 && m !== "fest";
    this.live = m;
    if (this.w <= 0 && m === "fest") return false;
    this.vol += (level - this.vol) * Math.min(1, dtSec / VOL_TAU_S);
    if (this.look.length !== count * 3) { this.look = new Float32Array(count * 3); }
    const up = dtSec / (m === "tartan" ? TARTAN_UP_S : XFADE_S), down = dtSec / XFADE_S;
    if (m !== "fest") {   // stundens färger glider mot målet (fest: står kvar medan w går ner)
      const theme = cleanTheme(cfg.themeColors) ?? THEME_DEFAULT;
      for (let i = 0; i < count; i++) {
        const t = this.target(m, i, count, theme, nowWall);
        for (let c = 0; c < 3; c++) {
          const q = i * 3 + c, tv = t[c];
          if (entering || m === "show" || m === "lab" || m === "lab2" || m === "lab3" || m === "lab4") this.look[q] = tv;   // showen: direkt (uttoningen per lampa i motorn tar nedgången)
          else this.look[q] += Math.max(-down, Math.min(up, tv - this.look[q]));
        }
      }
    }
    if (m === "lab" || m === "lab2" || m === "lab3" || m === "lab4") Object.defineProperty(cfg, "labState", { value: { now: this.labMode, log: this.labLog }, enumerable: false, configurable: true, writable: true });   // GET /api/moment (sparas inte)
    const tw = m === "fest" ? 0 : 1;
    this.w += Math.max(-down, Math.min(up, tw - this.w));
    if (this.w < 1e-4) this.w = 0;
    return this.w > 0;
  }

  /** Stundens färg för lampa i (efter step). */
  r(i: number) { return this.look[i * 3]; }
  g(i: number) { return this.look[i * 3 + 1]; }
  b(i: number) { return this.look[i * 3 + 2]; }

  private tgt: [number, number, number] = [0, 0, 0];
  private target(m: Moment, i: number, n: number, theme: number[], nowWall: number): [number, number, number] {
    const t = nowWall / 1000;
    let sect = theme[i % theme.length], share: number;
    if (m === "middag") {
      const breath = 0.85 + 0.15 * Math.sin((2 * Math.PI * t) / 10 + i * 1.3);
      share = MIDDAG_TOP * (0.6 + 0.4 * Math.min(1, this.vol / VOL_REF)) * breath;
    } else if (m === "tal") {
      sect = theme[0]; share = TAL_TOP;
    } else if (m === "forstadans") {
      sect = 1;
      const d = n > 1 ? Math.abs(i - (n - 1) / 2) / ((n - 1) / 2) : 0;   // 0 i mitten, 1 i kanten (lampans plats i raden)
      share = DANS_TOP * (1 - 0.6 * d) * (0.8 + 0.2 * Math.sin((2 * Math.PI * t) / 8));
    } else if (m === "show") return this.show(i, n, nowWall);
    else if (m === "lab4") {   // LABBET 4 (lab4.ts)
      if (i === 0) { this.lab4.force = this.labForce; this.lab4.tick(this.beat as unknown as LabIn, n, nowWall, Math.min(1, this.vol / VOL_REF)); this.labMode = this.lab4.mode; this.labLog = this.lab4.log; }
      const o = this.lab4.out; this.tgt[0] = o[i * 3]; this.tgt[1] = o[i * 3 + 1]; this.tgt[2] = o[i * 3 + 2]; return this.tgt;
    }
    else if (m === "lab3") {   // LABBET 3 (lab3.ts)
      if (i === 0) { this.lab3.tick(this.beat as unknown as LabIn, n, nowWall, Math.min(1, this.vol / VOL_REF)); this.labMode = this.lab3.mode; this.labLog = this.lab3.log; }
      const o = this.lab3.out; this.tgt[0] = o[i * 3]; this.tgt[1] = o[i * 3 + 1]; this.tgt[2] = o[i * 3 + 2]; return this.tgt;
    }
    else if (m === "lab2") {   // LABBET 2 (lab2.ts)
      if (i === 0) { this.lab2.tick(this.beat as unknown as LabIn, n, nowWall, Math.min(1, this.vol / VOL_REF)); this.labMode = this.lab2.mode; this.labLog = this.lab2.log; }
      const o = this.lab2.out; this.tgt[0] = o[i * 3]; this.tgt[1] = o[i * 3 + 1]; this.tgt[2] = o[i * 3 + 2]; return this.tgt;
    }
    else if (m === "lab") {   // LABBET (lab.ts)
      if (i === 0) { this.lab.tick(this.beat as unknown as LabIn, n, nowWall, Math.min(1, this.vol / VOL_REF)); this.labMode = this.lab.mode; this.labLog = this.lab.log; }
      const o = this.lab.out; this.tgt[0] = o[i * 3]; this.tgt[1] = o[i * 3 + 1]; this.tgt[2] = o[i * 3 + 2]; return this.tgt;
    }
    else share = TARTAN_TOP;
    const v = toV(share), s = SECT[sect];
    this.tgt[0] = s[0] * v; this.tgt[1] = s[1] * v; this.tgt[2] = s[2] * v;
    return this.tgt;
  }

  /** SHOWEN (ägaren i ladan 2026-11-07: 'ett specialläge med en show ... ej vanliga effekterna' + 'tänk helt utanför boxen' + 'detta är bara
   *  för att få inspiration'): ljuset följer MUSIKENS DRAMATURGI, inte ett takt-schema och inte effekternas pulser.
   *   MÖRKRET     (lugnt / intro / break): allt svart; EN lampa glöder upp på varje basnot, på tonens plats (låg vänster, hög höger)
   *   SOLUPPGÅNG  (build): pulsfritt sken röd -> orange -> gul som stiger med uppbyggnadens ålder
   *   FRYS        (drop): en stilla bild i fyra kulörer i 0,5 s (ägaren: 4 s låste lamporna), sedan ORKESTERN i 8 s (stop-motion utan strobe:
   *               lampornas strobe är okalibrerad, 127 = ~10 Hz, och uttoningen tar mörkret mellan RGB-blixtar)
   *   ORKESTERN   (refräng, var 8:e takt): varje lampa en musiker - kick (röd), bas (blå), virvel (gul), röst/synth (magenta)
   *   PIANOT      (refräng annars + övrigt): basgången vandrar över lamporna efter tonhöjd (bandkvoten bas/(sub+kick+bas))
   *  Inget vitt, ingen strobe; nedgången tas av motorns uttoning per lampa (aldrig snabbare). */
  private beat?: ShowBeat;
  /** POST /api/labforce: tvinga en idé i labbet (sätts av motorn via cfg.labForce). */
  labForce = '';
  private lab = new Lab(); private lab2 = new Lab2(); private lab3 = new Lab3(); private lab4 = new Lab4(); labMode = ''; labLog: [number, string][] = [];
  private sh = new Float32Array(0); private shAt = 0; private pitchS = 0.5; private lastNote = -1; private lastDrop = 0;
  private lone = -1; private lonePitch = 0.5; private loneHop = 0; private voiceS = 0; private voiceFloor = 1; private voiceQuietAt = 0; private singerSect = 5; private balls = [0, 2, 3, -2]; private ballSect = [5, 0]; private kPrev = 0; private sPrev = 0; private freezeUntil = 0; private dropOrchUntil = 0; private freezeN = 0; private buildAt = 0; private lastSec = ''; private glow = new Float32Array(0); private glowS = new Int8Array(0);
  private show(i: number, n: number, nowWall: number): [number, number, number] {
    if (this.sh.length !== n * 3) { this.sh = new Float32Array(n * 3); this.glow = new Float32Array(n); this.glowS = new Int8Array(n); }
    if (i === 0) this.showTick(n, nowWall);
    this.tgt[0] = this.sh[i * 3]; this.tgt[1] = this.sh[i * 3 + 1]; this.tgt[2] = this.sh[i * 3 + 2];
    return this.tgt;
  }
  private put(i: number, sect: number, share: number, presence: number) {
    const v = toV(SHOW_TOP * Math.max(0, Math.min(1, share)) * presence), s = SECT[sect];
    this.sh[i * 3] = s[0] * v; this.sh[i * 3 + 1] = s[1] * v; this.sh[i * 3 + 2] = s[2] * v;
  }
  private showTick(n: number, now: number) {
    const dt = this.shAt > 0 ? Math.min(0.2, (now - this.shAt) / 1000) : 0.025; this.shAt = now;
    const c = this.beat, fr = c?.frame, sp = fr?.spec, dr = c?.drum;
    const presence = Math.min(1, this.vol / VOL_REF);
    this.sh.fill(0);
    if (!c || !sp || !dr) { for (let i = 0; i < n; i++) this.put(i, 4, 0.15, presence); return; }
    // tonhöjden i basen: andelen övre bas mot sub + kick (0 = djup ton, 1 = hög), glättad 80 ms
    const tot = sp.sub + sp.kick + sp.bass + 1e-6, pitch = Math.max(0, Math.min(1, (0.5 * sp.kick + sp.bass) / tot * 1.4 - 0.2));
    this.pitchS += (pitch - this.pitchS) * Math.min(1, dt / 0.08);
    const note = c.bassNoteIdx !== this.lastNote; this.lastNote = c.bassNoteIdx;
    const noteLamp = Math.round(this.pitchS * (n - 1)), noteSect = [0, 5, 4, 3][Math.min(3, Math.floor(this.pitchS * 4))];
    // dropen: kanten -> FRYS
    if (c.dropEnv > 0.6 && this.lastDrop <= 0.6) { this.freezeUntil = now + 500; this.dropOrchUntil = now + 8000; this.freezeN++; }
    this.lastDrop = c.dropEnv;
    const sec = c.section ?? ''; if (sec !== this.lastSec) { if (sec === 'build') this.buildAt = now; this.lastSec = sec; }
    for (let i = 0; i < n; i++) this.glow[i] *= Math.exp(-dt / 0.45);
    if (now < this.freezeUntil) {                                   // FRYS
      const pal = [[5, 1, 3, 0], [0, 3, 1, 4], [4, 1, 5, 2], [2, 5, 0, 3]][this.freezeN % 4];
      for (let i = 0; i < n; i++) this.put(i, pal[i % 4], 1, 1);
      return;
    }
    const quiet = this.vol < VOL_REF * 0.35 || sec === 'break' || sec === 'intro' || !c.hasBeat;   // + okänd takt (ägaren 11-07: sångaren är perfekt då)
    if (quiet) {                                                    // MÖRKRET: en lampa per basnot
      // SÅNGAREN (ägaren 11-07: 'jag gillade den ensamma, typ som sångaren sjunger själv' + 'följ energin på högre Hz så den följer sången'):
      // EN lampa, ljusstyrkan = röstbandet (lowMid/mid/highMid, ~250 Hz-3,5 kHz) glättat 60 ms; ny FRAS (rösten tillbaka efter >= 350 ms
      // tystnad) = ny plats (aldrig samma lampa två gånger i rad) och ny kulör.
      const vRaw = 0.25 * sp.lowMid + 0.5 * sp.mid + 0.25 * sp.highMid;
      this.voiceS += (vRaw - this.voiceS) * Math.min(1, dt / 0.06);
      this.voiceFloor = Math.min(this.voiceS, this.voiceFloor + dt * 0.02);   // golvet kryper upp långsamt, faller direkt
      const voice = Math.max(0, Math.min(1, (this.voiceS - this.voiceFloor - 0.04) * 2.2));
      if (voice > 0.08) {
        if (now - this.voiceQuietAt > 350 || this.lone < 0) {   // ny fras
          let k = this.lone + (this.loneHop++ % 2 ? 1 : 2); if (n > 1) { k = ((k % n) + n) % n; if (k === this.lone) k = (k + 1) % n; } else k = 0;
          this.lone = k; this.singerSect = [5, 0, 3, 1, 4][this.loneHop % 5];
        }
        this.voiceQuietAt = now;
      }
      if (this.lone >= 0) this.put(this.lone, this.singerSect, voice, 1);
      return;
    }
    if (sec === 'build') {                                          // SOLUPPGÅNG
      const age = (now - this.buildAt) / 1000, rise = Math.min(1, age / 14);
      const sect = rise < 0.4 ? 0 : 1, mixOrange = rise >= 0.4 && rise < 0.75;
      for (let i = 0; i < n; i++) this.put(i, mixOrange && i % 2 === 0 ? 0 : sect, 0.12 + 0.75 * rise * rise, presence);
      return;
    }
    // BOLLARNA (ägaren 11-07: 'när refräng körs och bra bastakt, hitta på något nytt'): FYSIK i stället för takt. Två ljusbollar med massa
    // rullar över raden: kicken knuffar kickbollen (hårdare kick = längre), virveln knuffar virvelbollen åt andra hållet; friktion, studs mot
    // väggarna (ny kulör vid varje studs). Lampan visar den starkaste bollen (ingen blandning -> inget vitt). Basens kropp glöder svagt under.
    if (sec === 'high' && (c.bassline >= 0.55 || c.bassBody > 0.6) && now >= this.dropOrchUntil) {
      const kickHit = dr.kick > 0.6 && this.kPrev <= 0.45, snHit = dr.snare > 0.6 && this.sPrev <= 0.45; this.kPrev = dr.kick; this.sPrev = dr.snare;
      const W = Math.max(1, n - 1), B = this.balls;
      if (kickHit) B[1] += (B[1] >= 0 ? 1 : -1) * (3 + 5 * dr.kick);
      if (snHit) B[3] += (B[3] >= 0 ? 1 : -1) * (2.5 + 4 * dr.snare);
      for (const k of [0, 2]) {
        B[k + 1] *= Math.exp(-dt * 2.2);                                   // friktion
        B[k] += B[k + 1] * dt;
        if (B[k] < 0) { B[k] = -B[k]; B[k + 1] = Math.abs(B[k + 1]) * 0.8; this.ballSect[k / 2] = (this.ballSect[k / 2] + 1) % 6; }
        if (B[k] > W) { B[k] = 2 * W - B[k]; B[k + 1] = -Math.abs(B[k + 1]) * 0.8; this.ballSect[k / 2] = (this.ballSect[k / 2] + 1) % 6; }
      }
      for (let i = 0; i < n; i++) {
        const a1 = Math.max(0, 1 - Math.abs(i - B[0]) * 0.9) ** 2 * Math.min(1, 0.35 + Math.abs(B[1]) / 4);
        const a2 = Math.max(0, 1 - Math.abs(i - B[2]) * 0.9) ** 2 * Math.min(1, 0.3 + Math.abs(B[3]) / 4) * 0.85;
        const glow = 0.08 * Math.min(1, c.bassBody);
        if (a1 >= a2) this.put(i, this.ballSect[0], Math.max(a1, glow), presence); else this.put(i, (this.ballSect[1] + 3) % 6, Math.max(a2, glow), presence);
      }
      return;
    }
    const orch = now < this.dropOrchUntil || (sec === 'high' && Math.floor(c.beatIdx / 32) % 2 === 0);   // efter frysen: orkestern tar dropen
    if (orch) {                                                     // ORKESTERN
      const voice = Math.max(0, Math.min(1, (sp.mid - 0.25) * 1.6));
      const parts: [number, number][] = [[0, dr.kick], [4, Math.pow(sp.bass, 1.5)], [1, dr.snare], [5, voice]];
      for (let i = 0; i < n; i++) { const [sect, lvl] = parts[i % 4]; this.put(i, sect, lvl, presence); }
      return;
    }
    // PIANOT: basnoten tänder lampan på sin tonhöjd, styrkan ur basen
    if (note) { this.glow[noteLamp] = Math.max(this.glow[noteLamp], 0.35 + 0.65 * Math.min(1, c.bassBody)); this.glowS[noteLamp] = noteSect; }
    for (let i = 0; i < n; i++) if (this.glow[i] > 0.01) this.put(i, this.glowS[i], this.glow[i], presence);
  }
}
