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

export const MOMENTS = ["fest", "middag", "tal", "forstadans", "tartan", "show"] as const;
export type Moment = typeof MOMENTS[number];
/** Motorns takt till showen (effects.ts ctx, satt före stunden varje ruta). */
export interface ShowBeat { beatIdx: number; beatFrac: number; hasBeat: boolean; bassBody: number }
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
          if (entering || m === "show") this.look[q] = tv;   // showen: direkt (uttoningen per lampa i motorn tar nedgången)
          else this.look[q] += Math.max(-down, Math.min(up, tv - this.look[q]));
        }
      }
    }
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
    else share = TARTAN_TOP;
    const v = toV(share), s = SECT[sect];
    this.tgt[0] = s[0] * v; this.tgt[1] = s[1] * v; this.tgt[2] = s[2] * v;
    return this.tgt;
  }

  /** SHOWEN (ägaren i ladan 2026-11-07: 'ett specialläge med en show där du festar till det riktigt fint på dessa 4 lamporna - ej vanliga
   *  effekterna' + 'tänk helt utanför boxen'): en PROGRAMMERAD koreografi i takt (motorns beatIdx/beatFrac; utan takt en egen 124 BPM-klocka),
   *  8 akter x 8 takter (64 takter ~2 min, sedan nytt färgpar och om igen):
   *   1 RÄKNA       lamporna räknar takten: slag 1 = en lampa, slag 4 = alla fyra
   *   2 KOMETEN     en komet med svans studsar fram och tillbaka, ett varv per två slag
   *   3 PINGPONG    ytterparet på 1 och 3, innerparet på 2 och 4, motfärger
   *   4 SOLUPPGÅNG  uppbyggnad: röd -> orange -> gul över 8 takter, starkare för varje takt; sista taktens andra halva MÖRK
   *   5 DROPEN      smäll på ettan, sedan halvorna växelvis i basens styrka, färgparet byts varannan takt
   *   6 IMPLOSION   kanterna på 1, mitten på 2, alla svagt på 3, mörkt på 4 - och explosion på nästa etta
   *   7 REGNBÅGEN   varje lampa en kulör längre fram, hjulet snurrar ett steg per slag, pulsen rinner över raden (en våg)
   *   8 HJÄRTAT     andhämtning: rött hjärtslag (dubbelslag) i mitten på 1 och 3, kanterna glöder i djupblått
   *  Bara rena kulörer (inget vitt), ingen strobe, högst en puls per lampa och slag (hjärtat: två slag per halvtakt). Nivån följer musikens
   *  närvaro (vol); nedgången tas av motorns uttoning per lampa (aldrig snabbare). */
  private beat?: ShowBeat;
  private show(i: number, n: number, nowWall: number): [number, number, number] {
    const b = this.beat, has = !!b && b.hasBeat;
    const clockBeats = (nowWall / 1000) * (124 / 60);
    const bi = has ? b!.beatIdx : Math.floor(clockBeats), f = has ? b!.beatFrac : clockBeats - Math.floor(clockBeats);
    const mod = (x: number, m: number) => ((x % m) + m) % m;
    const bar = Math.floor(bi / 4), beat = mod(bi, 4), barIn = mod(bar, 8), act = Math.floor(mod(bar, 64) / 8);
    const bass = b ? Math.max(0, Math.min(1, b.bassBody)) : 0.7;
    const pulse = (ff: number) => (ff < 0 ? 0 : Math.exp(-ff * 3.2));          // slaget: upp direkt, klingar över slaget
    const PAIRS: [number, number][] = [[5, 1], [0, 3], [4, 1], [2, 5]];       // magenta/gul, röd/cyan, blå/gul, grön/magenta
    const pair = PAIRS[mod(Math.floor(bar / 64), 4)];
    const pos = n > 1 ? i / (n - 1) : 0;                                         // lampans plats i raden 0..1
    let sect = pair[0], amp = 0;
    if (act === 0) {            // RÄKNA
      sect = mod(bar, 2) === 0 ? pair[0] : pair[1];
      amp = i <= beat ? (i === beat ? pulse(f) : 0.35 + 0.3 * pulse(f)) : 0;
    } else if (act === 1) {     // KOMETEN
      const ph = (mod(bi, 2) + f) / 2, x = ph < 0.5 ? ph * 2 : 2 - ph * 2;      // 0 -> 1 -> 0 över två slag
      const d = Math.abs(pos - x) * (n - 1);
      amp = Math.max(0, 1 - d * 0.7) ** 2; sect = d < 0.5 ? pair[0] : pair[1];
    } else if (act === 2) {     // PINGPONG
      const outer = i === 0 || i === n - 1;
      sect = outer ? pair[0] : pair[1];
      amp = outer === (mod(beat, 2) === 0) ? pulse(f) : 0.08;
    } else if (act === 3) {     // SOLUPPGÅNG
      sect = barIn < 3 ? 0 : barIn < 6 ? (pos < 0.5 ? 0 : 1) : 1;             // röd -> orange (halva röd, halva gul) -> gul
      amp = (0.25 + 0.75 * (barIn + beat / 4) / 8) * (0.4 + 0.6 * pulse(f));
      if (barIn === 7 && beat >= 2) amp = 0;                                    // andningen före dropen
    } else if (act === 4) {     // DROPEN
      const swap = mod(Math.floor(barIn / 2), 2) === 1;
      if (barIn === 0 && beat === 0) { amp = Math.max(pulse(f), 0.5); sect = pair[0]; }
      else {
        const left = i < n / 2, mine = left === (mod(beat, 2) === 0);
        sect = left !== swap ? pair[0] : pair[1];
        amp = mine ? (0.45 + 0.55 * bass) * pulse(f) : 0.1 * bass;
      }
    } else if (act === 5) {     // IMPLOSION
      const outer = i === 0 || i === n - 1;
      if (beat === 0) { amp = outer ? pulse(f) : 0.15; sect = pair[0]; }
      else if (beat === 1) { amp = outer ? 0.15 : pulse(f); sect = pair[1]; }
      else if (beat === 2) { amp = 0.3 * pulse(f); sect = pair[0]; }
      else amp = 0;
    } else if (act === 6) {     // REGNBÅGEN
      sect = mod(bi + i, 6);
      amp = 0.25 + 0.75 * pulse(f - pos * 0.35);                                  // pulsen rinner över raden
    } else {                    // HJÄRTAT
      const mid = !(i === 0 || i === n - 1);
      if (mid) { sect = 0; amp = mod(beat, 2) === 0 ? Math.max(pulse(f), 0.7 * pulse(f - 0.28)) : 0.06; }
      else { sect = 4; amp = 0.18 + 0.08 * Math.sin(2 * Math.PI * (bar * 4 + beat + f) / 8); }
    }
    const presence = Math.min(1, this.vol / VOL_REF);
    const v = toV(SHOW_TOP * Math.max(0, Math.min(1, amp)) * presence), s = SECT[sect];
    this.tgt[0] = s[0] * v; this.tgt[1] = s[1] * v; this.tgt[2] = s[2] * v;
    return this.tgt;
  }
}
