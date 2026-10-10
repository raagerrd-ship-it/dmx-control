/**
 * EFTERBEHANDLING — sista formningen av ljuset innan output.
 *
 * Effekterna har sagt VAD som ska lysa. Den här modulen bestämmer HUR MYCKET, i
 * rätt ordning, och lämnar sedan över till output-tjänsten som vet hur lamporna
 * tar emot det. Ingen av dem behöver veta något om den andra.
 *
 * ORDNINGEN ÄR MÄTT FRAM (2026-08-07) och får inte kastas om:
 *
 *   1. ballistik   mjuk attack + peak-hold decay. Städar effekternas EGET fladder.
 *   2. ljustak     följer ljudnivån. Skalar även ballistikbufferten, annars ligger
 *                  en okapad topp kvar och blixtrar fram när taket släpper.
 *   3. hjärtslag   ALLRA SIST och i egen pass. Låg det före ballistiken smetades
 *                  pulsen ut av utgångens decay (0,42 s mot pulsens egna 121 ms) —
 *                  autokorrelationen på DMX-utgången visade då ingen periodicitet
 *                  vid takten alls. Bufferten lämnas orörd: matas pulsen tillbaka
 *                  in i ballistiken börjar den släpa och tappar anslaget.
 *   4. blackout    stenhård klippning förbi ballistiken.
 *   5. kalibrering tändpunkt + ljus-tak (output-tjänsten).
 *   (6. headroom borttagen 2026-10-07 - utgangens LIN_MAP: effekt 100 % = 95 %, drop oppnar resten)
 *
 * BÅDE taket och hjärtslaget har DROP-UNDANTAG (`Math.max(..., dropEnv)`) — en drop
 * som landar mellan två slag ska inte dämpas av pulsen.
 */

import type { FixtureConfig } from "./config.js";
import type { FixtureOutput } from "./output.js";

/** Utgångens attack. Kort nog att inte röra hjärtslagets 45 ms-anslag, lång nog att
 *  dämpa effekternas fladder kring 10 Hz. */
const ATTACK_S = Math.max(0.005, Number(process.env.DMX_ATTACK_MS ?? 20) / 1000);   // 2026-09-21: env (ladan 20 ms; lotus kor attack 0) - 90 ms smetade ut varje slag
const INV_ATTACK_S = 1 / ATTACK_S;
/** SISTA FADE-SPARREN (ladan 2026-09-24, DMX-sonden: enramsspikar 2-3/s per armatur = 'flimmer'; agaren: 'upp far den garna vara snabb men
 *  alltid fade nerat'): allra sist far ingen ljuskanal falla snabbare an en fade med tidskonstant DMX_FINAL_FADE_S (0,12 s); uppat omedelbart.
 *  Specialkanaler (strobe/hazer/uv/blinder/laser/co2) undantas. 0 = av. */
const FINAL_FADE_S = Number(process.env.DMX_FINAL_FADE_S ?? 0.12);
/** FADE MELLAN LOOKER (agaren i ladan 2026-09-24: 'ev fade mellan dom'): vid lookbyte tonas nya looken IN over DMX_LOOK_FADE_S
 *  (smoothstep 0->1) medan den gamla bilden klingar ut med halva den tiden - bada lever (ny look med energin), inget hart klipp. 0 = av. */
const LOOK_FADE_S = Number(process.env.DMX_LOOK_FADE_S ?? 0.6);
/** EFTER HUVUDTRADS-STALL (ladan 09-24, DMX-sonden: renderluckor 40-240 ms 1,6-3,4/s, 22 av 24 enramsspikar vid luckor): dtSec klampas
 *  till 0,1 s, sa forsta ramen efter en stall fick falla 57 % = frys + ryck ned. DMX_FINAL_FADE_MAX_DT_S > 0 klampar sparrens dt sa fallet
 *  fortsatter som fade. 0 = av. Offline med emulerade luckor (0,0075): fall >20 % efter lucka 3 010 -> 0, utan luckor identiskt (0/81 750). */
const FINAL_FADE_MAX_DT_S = Number(process.env.DMX_FINAL_FADE_MAX_DT_S ?? 0.0075); // Multiplikation är snabbare än division i loopen

/** Minsta mörker under ljuset (DMX-steg över tändpunkten) så hjärtslaget syns även
 *  i lugna effekter. 44 ⇒ en lampa med tändpunkt 16 lyser lägst på 60. */
// DMX_PULSE_ROOM: hur hogt pulsutrymmet lyfter (DMX-steg over tandpunkten). DMX_PULSE_ROOM_DIM=0 later det
// galla aven fargkanaler som forr — men da ADDERAS ljus per fargkanal, vilket vitnar: matt 2026-10-06 pa
// ladans egen inspelning (tools/colorBench.mjs) nedan. Standard: bara DIM.
const PULSE_ROOM = Number(process.env.DMX_PULSE_ROOM ?? 44);
/** KULOR DIREKT, LJUSSTYRKAN TONAR (prov DMX_HUE_CUT 2026-10-09, ENDA VAGEN sedan 10-10; agaren: "det ar ju bara energi som har begransning pa sin
 *  nedtoning"). Ballistiken (peak-hold decay, FADE_MIN_S) och sista fade-sparren kordes PER FARGKANAL: vid ett kulorbyte klingade den
 *  gamla kanalen ut medan den nya tandes -> alla tre dioderna tanda en stund efter varje byte (snap 76 %, party 73 % i colorBench).
 *  Nu kors de per LAMPA pa dess ljusstyrka (starkaste fargkanalen): ljusstyrkan stiger och faller EXAKT som forr, kulorens
 *  forhallanden tas direkt ur effektens bild. Slacker effekten lampan tonar den ut i sin sista kulor. DIM/special rors inte. */
// (DMX_HUE_CUT_MS - kulorblandningen glider - provat 10-09, 29 -> 21 sidoblink, borttaget 10-10; fladdret rattades i effekterna.)
const PULSE_ROOM_DIM_ONLY = process.env.DMX_PULSE_ROOM_DIM !== '0';

/** HUE_CUT: en lampas fargkanaler som EN ljusstyrka (starkaste kanalen). Upp: attack mot malet; ner: peak-hold med decay - exakt som
 *  kanalvisa ballistiken gjorde for den starkaste kanalen. Kulorens forhallanden tas ur malbilden (effekten), sa ett kulorbyte
 *  lamnar ingen svans. Mal 0 (lampan slackt) = tona ut i sista kulor. */
function lampFade(buf: Float32Array, u: Uint8Array, g: number[], decay: number, att: number, win: number): void {
  let T = 0, H = 0;
  for (let i = 0; i < g.length; i++) { const ch = g[i]; const t = u[ch] * win; if (t > T) T = t; const h = buf[ch] * decay; if (h > H) H = h; }
  const B = T >= H ? H + (T - H) * att : H;
  if (T > 0) { const k = B / T; for (let i = 0; i < g.length; i++) { const ch = g[i]; const v = u[ch] * win * k; buf[ch] = v; u[ch] = (v + 0.5) | 0; } }
  else for (let i = 0; i < g.length; i++) { const ch = g[i]; const v = buf[ch] * decay; buf[ch] = v; u[ch] = (v + 0.5) | 0; }
}

export class PostProcess {
  /** Ballistikens buffert — per kanal, i flyttal så decayn inte kvantiseras bort. */
  private smooth = new Float32Array(512);
  private finalOut = new Float32Array(512);
  /** LUGN MJUKHET (DMX_CALM_FADE_S): effektmotorn satter langre attack i lugna partier; standard = ATTACK_S. */
  attackS = ATTACK_S;
  private lookFadeAt = -1e9;   // DMX_LOOK_FADE_S: tid for senaste lookbyte
  lookChanged(nowMs: number): void { if (LOOK_FADE_S > 0) this.lookFadeAt = nowMs; }   // SISTA FADE-SPARREN (se FINAL_FADE_S)

  apply(
    universe: Uint8Array,
    out: FixtureOutput,
    fixtures: FixtureConfig[],
    dtSec: number,
    decay: number,
    pulseMul: number,
    pulseActive: boolean,
    blackout: boolean,
    master: number,
    nowMs: number,
    dropOpen = 0   // FULL drop 0..1 (dropColEnv) - utgangens mappning oppnar till 255 med den (se output.ts)
  ): void {
    const maxCh = out.maxCh;

    // 1. BALLISTIK: mjuk attack, oförändrad decay (peak-hold). En 1-frames-spik når
    //    bara en bit och klingar sen. Specialroller (strobe/hazer/…) hoppar över —
    //    en 255 som tonar nedåt skulle få strobe att fara mellan takter.
    const att = 1 - Math.exp(-dtSec * (this.attackS > ATTACK_S ? 1 / this.attackS : INV_ATTACK_S));
    for (let ch = 0; ch < maxCh; ch++) {
      if (out.direct[ch]) {
        this.smooth[ch] = universe[ch];
        continue;
      }
      if (out.colorMask[ch]) continue;   // fargkanaler: per lampa nedan (lampFade)
      const held = this.smooth[ch] * decay;
      const target = universe[ch];
      const v = target >= held ? held + (target - held) * att : held;
      this.smooth[ch] = v;
      universe[ch] = (v + 0.5) | 0; // Bitvis avrundning sparar ett funktionsanrop per kanal
    }
    for (const g of out.colorGroups) lampFade(this.smooth, universe, g, decay, att, 1);

    // (2. LJUSTAK borttaget 2026-10-08: energin appliceras en gang, pa effektens RGB i effects.ts - se ENERGY_SIMPLE.)

    // 3. HJÄRTSLAG — sist, i egen pass, buffert orörd.
    //    Först ges ljuset utrymme att pulsa i: en lugn effekt kan ligga så nära
    //    tändpunkten att hela slaget klipps bort av kalibreringsgolvet.
    if (pulseActive && pulseMul < 0.999) {
      out.ensurePulseRoom(universe, fixtures, PULSE_ROOM, PULSE_ROOM_DIM_ONLY);
      out.scale(universe, pulseMul);
    }

    // 4. BLACKOUT — kolsvart nu, och nolla bufferten så explosionen efteråt reser sig
    //    rent från svart utan pop från en kvarhållen nivå.
    if (blackout) {
      for (let ch = 0; ch < maxCh; ch++) {
        if (!out.direct[ch]) {
          universe[ch] = 0;
          this.smooth[ch] = 0;
        }
      }
    }

    // 5. KALIBRERING + LJUS-TAK (output-tjänsten äger lampkunskapen).
    out.calibrate(universe, fixtures, master, nowMs, dropOpen);
    if (blackout) this.finalOut.fill(0);   // efter blackout: ingen gammal niva att tona ner fran
    else if (FINAL_FADE_S > 0) {
      const xf = LOOK_FADE_S > 0 ? Math.min(1, (nowMs - this.lookFadeAt) / (LOOK_FADE_S * 1000)) : 1;
      const win = xf < 1 ? xf * xf * (3 - 2 * xf) : 1;
      const fdt = FINAL_FADE_MAX_DT_S > 0 && dtSec > FINAL_FADE_MAX_DT_S ? FINAL_FADE_MAX_DT_S : dtSec;
      const fk = Math.exp(-fdt / (xf < 1 ? Math.max(FINAL_FADE_S, LOOK_FADE_S * 0.5) : FINAL_FADE_S));
      for (let ch = 0; ch < maxCh; ch++) {
        if (out.direct[ch]) { this.finalOut[ch] = universe[ch]; continue; }
        if (out.colorMask[ch]) continue;   // fargkanaler: per lampa nedan
        const held = this.finalOut[ch] * fk, v = universe[ch] * win;
        const o = v >= held ? v : held; this.finalOut[ch] = o; universe[ch] = (o + 0.5) | 0;
      }
      for (const g of out.colorGroups) lampFade(this.finalOut, universe, g, fk, 1, win);
    }

    // (6. DROP-HEADROOM borttagen 2026-10-07: dubblett av utgangens LIN_MAP, dar dropen oppnar de sista 5 %.)
  }
}
