/**
 * OUTPUT-TJÄNSTEN — översätter ljus till inkopplade lampor.
 *
 * LAMPKONTRAKTET (ägaren 2026-11-07: 'effekterna skall inte veta något om hur mina specifika lampor är mappade - det skall göras i
 * output' + 'köper jag andra lampor vill jag bara kalibrera dom, och det skall användas av output'): effekterna, dirigenten och stunderna
 * bestämmer fritt hur ljuset ser ut i 0..1 per kanal och lampa; den här filen gör det rätt på JUST DEN lampan. Allt som är lampfysik
 * finns BARA här och i lampans kalibrering (cfg.fixtures[i].cal: on/onR..onW = tändpunkt, full, gamma = kurva, top = tak):
 * kurvan (gamma), taket, tändpunkt/dödzon, minsta tända nivå (keepLit), ljusmatchning mellan kulörer (sameLight) och
 * översättningen andel ljus <-> nivå (lampLevel, lampFadeK). En ny lampa = ny kalibrering, ingen annan kod.
 *
 * Här bor också vilken kanal som är färg, dimmer eller specialroll (strobe/hazer/uv/blinder/laser/co2) och rökmaskinens skydd.
 */

import type { FixtureConfig } from "./config.js";
import { fixtureRoles } from "./config.js";

/** Specialsignaler som inte är färg: rök, UV, blinder osv. Motorn sätter dem,
 *  output-tjänsten placerar dem på rätt kanal. */
export interface SpecialtyValues {
  hazer: number; uv: number; blinder: number; strobe: number; laser: number; co2: number;
}

/** Standardkurva och standardtak för en lampa utan cal.gamma/cal.top. Effektens 0..1 -> DMX som v^GAMMA (1,6, ladan 10-09);
 *  taket MAP_TOP = 95 % - bara en FULL drop öppnar de sista 5 %. */
const GAMMA = 1.6;
const MAP_TOP = 0.95;
/** MINSTA PÅ-TID (lampfysik, EN plats - DUBBLA KÄLLOR 6, 11-09; värdena orörda, DMX-md5-identiskt): tre hålltider mot diodflimmer.
 *  De är olika för att de håller olika saker - en gemensam tid ändrar ljuset:
 *   MIN_ON_MS 150: lampans nivå hålls innan uttoningen börjar (effects/toning.ts, ägaren 10-10) - korta blixtar blir en puls;
 *   CH_MIN_ON_MS 100: en tänd färgkanal hålls med sin senaste andel av lampans ljus (effects/toning.ts, ägaren 10-10);
 *   HOLD_MS 120: monokrom dimmer - sista värdet hålls över enstaka nollor (calibrate nedan).
 *  fastLight-effekter hoppar över de två första (effects/types.ts fastLight). */
export const FADE_MIN_S = 0.25, MIN_ON_MS = 150, CH_MIN_ON_MS = 100;   // FADE_MIN_S = outputs golv mot strobe (LampGuard nedan) och effekternas snabbaste uttoning; de två hålltiderna är standardvärden för effects/toning.ts
const HOLD_MS = 120;
const FOG_HEAT_MAX = 45000;   // datablad: 40–50 s sprutning i sträck
const FOG_RECOVER = 0.15;     // vila dränerar 15 % av realtid

/** Kalibrering per lampa: cal.gamma (1..3) och cal.top (0,5..1); saknas/utanför = standard. */
const lampGamma = (fx: FixtureConfig | undefined): number => { const g = fx?.cal?.gamma; return g !== undefined && g >= 1 && g <= 3 ? g : GAMMA; };
const lampTopOf = (fx: FixtureConfig | undefined): number => { const t = fx?.cal?.top; return t !== undefined && t >= 0.5 && t <= 1 ? t : MAP_TOP; };
const invOf = (fx: FixtureConfig | undefined): number => 1 / lampGamma(fx);
/** Gamma-tabell per kurva (1024 steg), byggs en gång per gamma. */
const LUTS = new Map<number, Uint8Array>();
function lutFor(g: number): Uint8Array {
  let l = LUTS.get(g);
  if (!l) { l = new Uint8Array(1024); for (let i = 0; i < 1024; i++) l[i] = Math.round(Math.pow(i / 1023, g) * 255); LUTS.set(g, l); }
  return l;
}

/* LAMPANS SPRÅK FÖR MOTORN OCH STUNDERNA: ljus uttrycks som ANDEL av lampans ljus (0..1) eller som en tidskonstant i ljus; funktionerna
 * nedan översätter till effektens 0..1-skala för JUST DEN lampan (cal.gamma). Ingen annan fil räknar med gamman. fx saknas = GAMMA. */

/** Nivån (effektens 0..1, före lampans kurva) som ger andelen `share` av lampans ljus. */
export function lampLevel(fx: FixtureConfig | undefined, share: number): number {
  return Math.pow(share, invOf(fx));
}
/** Uttoningens faktor för en ruta på dtSec: lampans LJUS faller med tidskonstanten tauS (i nivå blir tidskonstanten tauS x gamma). */
export function lampFadeK(fx: FixtureConfig | undefined, dtSec: number, tauS: number): number {
  return Math.exp(-dtSec / (tauS / invOf(fx)));
}
/** Håll en tänd lampa synlig: under lampans minsta tända nivå (första DMX-steget -> tändpunkt+1, ägarens 1 %) lyfts alla kanaler
 *  med samma faktor (kulören bevaras). */
export function keepLit(fx: FixtureConfig | undefined, rgb: [number, number, number]): void {
  const m = rgb[0] > rgb[1] ? (rgb[0] > rgb[2] ? rgb[0] : rgb[2]) : (rgb[1] > rgb[2] ? rgb[1] : rgb[2]);
  const mL = Math.pow(1 / 255, invOf(fx)) * 1.02;
  if (m < mL) { const g = mL / Math.max(1e-9, m); rgb[0] *= g; rgb[1] *= g; rgb[2] *= g; }
}
/** Kulörtoningen: skriv glidkulören o i rgb med SAMMA LJUS på lampan som rgb (kanalsumman efter lampans kurva). false = går inte
 *  (någon kanal skulle gå över rgb:s starkaste, eller o är svart) - rgb orörd, motorn byter skarpt. */
export function sameLight(fx: FixtureConfig | undefined, rgb: [number, number, number], o: [number, number, number]): boolean {
  const r = rgb[0], g = rgb[1], b = rgb[2], v = r > g ? (r > b ? r : b) : (g > b ? g : b);
  const G = lampGamma(fx), so = o[0] ** G + o[1] ** G + o[2] ** G;
  const k = so > 0 ? ((r ** G + g ** G + b ** G) / so) ** (1 / G) : 0;
  if (k * v > v * 1.0001 || k <= 0) return false;
  rgb[0] = o[0] * k; rgb[1] = o[1] * k; rgb[2] = o[2] * k;
  return true;
}

/** Kanalens roll i calibrate (bestäms i build). */
const K_DIM = 1;                                   // dimmer på en färglampa: konstant (fullpunkten) - ljuset bärs av färgen
const K_R = 2, K_G = 3, K_B = 4, K_W = 5;          // färg
const K_MONO = 6;                                  // dimmer på en lampa utan färg: mappas som färgen

interface Lamp {
  base: number;
  roles: string[];
  hasColor: boolean;
  hasDim: boolean;
  hasW: boolean;
  lut: Uint8Array;   // lampans gamma (cal.gamma)
  mapTop: number;    // lampans tak (cal.top)
  chs: number[];     // kanaler calibrate rör, med roll i kinds
  kinds: number[];
}

/** OUTPUTS GOLV MOT STROBE (ägaren 11-12: 'på lotus la vi bara in ett golv för toning som gör att det inte skall bli strobe. jag
 *  tänker samma i dmx output. Sen skall det ju ligga i effekterna'): lampan får inte slockna snabbare än FADE_MIN_S (ägaren 09-29:
 *  snabbare är förbjudet), vad effekten än gör. Ett rent golv, ingen toning. Golvet är brutet först när BÅDE lampans nivå (starkaste
 *  kanalen) OCH lampans ljus (kanalsumman efter lampans kurva) fallit snabbare än tidskonstanten: effekternas uttoning
 *  (effects/toning.ts) håller alltid minst ett av dem (nivån vid skarpt kulörbyte, ljuset vid kulörtoning), så golvet griper bara in
 *  om en effekt bryter kontraktet. Då lyfts rutans kulör till golvets nivå (svart ruta: förra rutans kulör). */
export class LampGuard {
  private lvl = new Float32Array(64); private light = new Float32Array(64); private prev = new Float32Array(192);
  /** UTTRYCKLIGT SVART (effects.ts, ägaren 11-13 'svart är avstängd'): lampan släcks nu, golvet börjar om från noll. */
  cut(i: number): void { const o = i * 3; this.lvl[i] = 0; this.light[i] = 0; this.prev[o] = 0; this.prev[o + 1] = 0; this.prev[o + 2] = 0; }
  step(i: number, fx: FixtureConfig | undefined, rgb: [number, number, number], dtSec: number): void {
    const G = lampGamma(fx), o = i * 3, l = this.lvl[i];
    let mT = rgb[0] > rgb[1] ? (rgb[0] > rgb[2] ? rgb[0] : rgb[2]) : (rgb[1] > rgb[2] ? rgb[1] : rgb[2]), L = rgb[0] ** G + rgb[1] ** G + rgb[2] ** G;
    const fl = l * lampFadeK(fx, dtSec, FADE_MIN_S);
    if (l > 0 && mT < fl * 0.999 && L < this.light[i] * Math.exp(-dtSec / FADE_MIN_S) * 0.999) {
      if (mT > 0) { const k = fl / mT; rgb[0] *= k; rgb[1] *= k; rgb[2] *= k; }
      else { const k = fl / l; rgb[0] = this.prev[o] * k; rgb[1] = this.prev[o + 1] * k; rgb[2] = this.prev[o + 2] * k; }
      mT = fl; L = rgb[0] ** G + rgb[1] ** G + rgb[2] ** G;
    }
    this.lvl[i] = mT; this.light[i] = L;
    this.prev[o] = rgb[0]; this.prev[o + 1] = rgb[1]; this.prev[o + 2] = rgb[2];
  }
}

export class FixtureOutput {
  /** 1 = effekten BEGÄR färgkanalen den här rutan (före kalibreringen) - mätvärde för tools/dynBench (ofrivillig blink). */
  intent = new Uint8Array(512);
  private holdVal = new Float32Array(512);
  private holdUntil = new Float32Array(512);
  private builtFor: unknown = null;
  private lamps: Lamp[] = [];
  private byBase = new Map<number, Lamp>();
  // Rökmaskinens tillstånd — enhetens egen, inte musikens.
  private fogUntil = 0;         // pågående puff till (wall-clock ms)
  private lastFogMs = -1e9;     // senaste puff (cooldown)
  private fogHeat = 0;          // värmekonto (ms)
  private fogWasEnabled = false;

  /** Förbered lamporna när fixture-listan byts (referensjämförelse → gratis per ruta). */
  build(fixtures: FixtureConfig[]): void {
    if (this.builtFor === fixtures) return;
    this.builtFor = fixtures;
    this.lamps = []; this.byBase.clear();
    // Kanalmaskerna gäller hela universet (överlappande lampor delar kanal).
    const cal = new Uint8Array(512), dimCal = new Uint8Array(512);
    const rolesOf = fixtures.map((fx) => fixtureRoles(fx));
    for (let f = 0; f < fixtures.length; f++) {
      const roles = rolesOf[f], hasColor = roles.some(isColor);
      for (let r = 0; r < roles.length; r++) {
        const ch = fixtures[f].address - 1 + r;
        if (ch < 0 || ch >= 512) continue;   // hög adress får aldrig skriva utanför universet
        if (isColor(roles[r]) || (roles[r] === "dim" && !hasColor)) cal[ch] = 1;
        else if (roles[r] === "dim") dimCal[ch] = 1;
      }
    }
    for (let f = 0; f < fixtures.length; f++) {
      const fx = fixtures[f], roles = rolesOf[f], base = fx.address - 1, chs: number[] = [], kinds: number[] = [];
      for (let r = 0; r < roles.length; r++) {
        const ch = base + r, ro = roles[r];
        if (ch < 0 || ch >= 512) continue;
        const kind = dimCal[ch] ? K_DIM : !cal[ch] ? 0 : ro === "r" ? K_R : ro === "g" ? K_G : ro === "b" ? K_B : ro === "w" ? K_W : K_MONO;
        if (kind) { chs.push(ch); kinds.push(kind); }
      }
      const lamp: Lamp = { base, roles, hasColor: roles.some(isColor), hasDim: roles.includes("dim"), hasW: roles.includes("w"), lut: lutFor(lampGamma(fx)), mapTop: lampTopOf(fx), chs, kinds };
      this.lamps.push(lamp);
      if (!this.byBase.has(base)) this.byBase.set(base, lamp);
    }
  }

  /** Kalibreringens tal via fält, inte argument (10-18: decimaltal som argument packades in varje ruta). Sätts av motorn direkt före
   *  anropet; startvärdena är decimaltal så fälten har decimalform från början. */
  calMaster = 0.5; calNow = 0.5; calDrop = 0.5; calCeil = 0.5; calRamp = 0.5; fogNow = 0.5; fogDt = 0.5;

  /** SISTA STEGET FÖRE UTGÅNG - EN mappning per kanal: 0 = släckt, 1..255 -> kanalens tändpunkt+1 .. lampans tak
   *  (cal.top x sektionens tak calCeil x master; en full drop calDrop öppnar resten upp till 100 %). VARJE färgkanal mappas för sig
   *  (ägaren 11-07: 'varför inte köra varje kanal lika strikt R/G/B?') så ingen bikanal hamnar i diodens dödzon. RAMPEN (calRamp,
   *  effects.ts RAMPEN OVANFÖR SLÄCKGRÄNSEN) låter taket glida från starkaste kanalens tändpunkt+1 upp till taket. Dimmern på en
   *  färglampa står konstant på fullpunkten (cal.full x master). */
  calibrate(universe: Uint8Array, fixtures: FixtureConfig[]): void {
    const master = this.calMaster, nowMs = this.calNow, ramp = this.calRamp;
    const top = (255 * master + 0.5) | 0, tc = top * this.calCeil, d = Math.max(0, Math.min(1, this.calDrop));
    for (let f = 0; f < fixtures.length; f++) {
      const c = fixtures[f].cal, L = this.lamps[f], chs = L.chs, kinds = L.kinds;
      const on = c ? (c.on || 0) : 0;
      const colTop = Math.round(tc * L.mapTop + (tc - tc * L.mapTop) * d);
      const dimTop = c && c.full && c.full < 255 ? Math.round(c.full * master) : top;
      let lampTop = colTop;
      if (c) {   // rampen räknas från lampans starkaste kanals tändpunkt (lägsta steget rörs inte)
        let mxRaw = 0, mxOn = on;
        for (let k = 0; k < chs.length; k++) {
          const kind = kinds[k];
          if (kind >= K_R && kind <= K_W && universe[chs[k]] > mxRaw) { mxRaw = universe[chs[k]]; mxOn = onOf(c, kind, on); }
        }
        lampTop = ramp >= 1 || colTop <= mxOn + 1 ? colTop : mxOn + 1 + Math.round((colTop - mxOn - 1) * ramp);
      }
      for (let k = 0; k < chs.length; k++) {
        const ch = chs[k], kind = kinds[k], raw = universe[ch];
        if (kind === K_DIM) { universe[ch] = dimTop; continue; }
        if (kind === K_MONO) {   // monokrom dimmer: samma mappning med lampans tändpunkt, sista värdet hålls HOLD_MS över enstaka nollor
          let out: number;
          if (raw > 0) {
            const mTop = ramp >= 1 || colTop <= on + 1 ? colTop : on + 1 + Math.round((colTop - on - 1) * ramp);
            out = Math.min(mTop, on + 1 + Math.round((mTop - on - 1) * (raw - 1) / 254));
            this.holdVal[ch] = out; this.holdUntil[ch] = nowMs + HOLD_MS;
          } else out = nowMs < this.holdUntil[ch] ? this.holdVal[ch] : 0;
          universe[ch] = out;
          continue;
        }
        if (raw === 0) continue;   // färg: noll är noll, ingen hållning
        let v: number;
        if (c) { const onC = onOf(c, kind, on); v = Math.round(onC + 1 + (lampTop - onC - 1) * (raw - 1) / 254); }
        else v = Math.round(raw * (ramp < 1 ? ramp : 1));   // okalibrerad lampa: ingen tändpunkt, rampen skalar färgen rakt
        universe[ch] = v > lampTop ? lampTop : v;
      }
    }
  }

  fogTick(want: boolean, fog: {
    enabled?: boolean; burstMs: number; cooldownMs: number;
    warmStartMs?: number; sprayMs?: number; bursts?: number;
  }, manual = false): boolean {
    const nowMs = this.fogNow, dtMs = this.fogDt;   // (se calMaster)
    if (!fog.enabled) {
      if (this.fogWasEnabled) {   // avstängd → glöm uppvärmning och släpp pågående puff,
        this.fogWasEnabled = false;   // annars fastnar rök-kanalen tänd
        fog.warmStartMs = 0;
        this.fogUntil = 0;
      }
      return false;
    }
    // Flank: maskinen slogs precis på → starta uppvärmningsklockan. Sätts bara om den
    // saknas, så en omstart ärver den riktiga påslagstiden.
    if (!this.fogWasEnabled) { this.fogWasEnabled = true; if (!fog.warmStartMs) fog.warmStartMs = nowMs; }
    const spraying = nowMs < this.fogUntil;
    if (spraying) {
      this.fogHeat += dtMs;
      fog.sprayMs = (fog.sprayMs ?? 0) + dtMs;   // drifträknare (vätska + värmearbete)
    } else {
      this.fogHeat = Math.max(0, this.fogHeat - dtMs * FOG_RECOVER);
    }
    if (spraying && this.fogHeat >= FOG_HEAT_MAX) this.fogUntil = 0;   // nödstopp
    const gapOk = manual || nowMs - this.lastFogMs > fog.cooldownMs;   // manuell puff (Rök nu) kringgår cooldownen
    const heatOk = this.fogHeat + fog.burstMs <= FOG_HEAT_MAX;
    if (want && !spraying && gapOk && heatOk) {
      this.fogUntil = nowMs + fog.burstMs;
      this.lastFogMs = nowMs;
      fog.bursts = (fog.bursts ?? 0) + 1;
    }
    return nowMs < this.fogUntil;
  }

  fogState(nowMs: number): { spraying: boolean; heat: number } {
    return { spraying: nowMs < this.fogUntil, heat: Math.min(1, this.fogHeat / FOG_HEAT_MAX) };
  }

  writeFog(u: Uint8Array, address: number, level: number): void {
    const ch = address - 1;
    if (ch >= 0 && ch < 512) u[ch] = Math.max(0, Math.min(255, (level + 0.5) | 0));
  }

  /**
   * SKRIV EN FIXTUR: abstrakt färg [r,g,b] 0..1 + specialsignaler → dess kanaler, genom lampans gammakurva.
   * RGBW: vitt = min(r,g,b) så färgkanalerna behåller sin mättnad. Dimmern på en färglampa skrivs här men calibrate sätter den
   * till fullpunkten (testlägena kör utan calibrate).
   */
  writeFixture(
    u: Uint8Array,
    fx: FixtureConfig,
    rgb: [number, number, number],
    master: number,
    strobeVal = 0,
    specialty?: SpecialtyValues,
  ): void {
    const L = this.byBase.get(fx.address - 1);
    if (!L) return;

    const base = L.base;
    const m = clamp01(master);
    const r = rgb[0], g = rgb[1], b = rgb[2];
    const w = Math.min(r, g, b);
    const dim = Math.max(r, g, b);
    const colorScale = L.hasDim ? 1 : m;
    const lut = L.lut;

    for (let i = 0; i < L.roles.length; i++) {
      const ch = base + i;
      if (ch < 0 || ch >= 512) continue;

      switch (L.roles[i]) {
        case "r":       { const x = clamp01((r - (L.hasW ? w : 0)) * colorScale); u[ch] = lut[(x * 1023) | 0]; this.intent[ch] = x > 0 ? 1 : 0; break; }
        case "g":       { const x = clamp01((g - (L.hasW ? w : 0)) * colorScale); u[ch] = lut[(x * 1023) | 0]; this.intent[ch] = x > 0 ? 1 : 0; break; }
        case "b":       { const x = clamp01((b - (L.hasW ? w : 0)) * colorScale); u[ch] = lut[(x * 1023) | 0]; this.intent[ch] = x > 0 ? 1 : 0; break; }
        case "w":       u[ch] = lut[(clamp01(w * colorScale) * 1023) | 0]; break;
        case "dim":     u[ch] = lut[(clamp01(L.hasColor ? m : dim * m) * 1023) | 0]; break;
        case "strobe":  u[ch] = Math.max(0, Math.min(255, Math.max(strobeVal, specialty?.strobe ?? 0))); break;
        case "hazer":   u[ch] = specialty?.hazer   ?? 0; break;
        case "uv":      u[ch] = specialty?.uv      ?? 0; break;
        case "blinder": u[ch] = specialty?.blinder ?? 0; break;
        case "laser":   u[ch] = specialty?.laser   ?? 0; break;
        case "co2":     u[ch] = specialty?.co2     ?? 0; break;
      }
    }
  }
}

const isColor = (ro: string): boolean => ro === "r" || ro === "g" || ro === "b" || ro === "w";
/** Färgkanalens tändpunkt: egen (onR..onW) om satt, annars lampans `on`. */
const onOf = (c: NonNullable<FixtureConfig["cal"]>, kind: number, on: number): number =>
  (kind === K_R ? c.onR : kind === K_G ? c.onG : kind === K_B ? c.onB : c.onW) ?? on;
const clamp01 = (x: number) => x < 0 ? 0 : x > 1 ? 1 : x;
