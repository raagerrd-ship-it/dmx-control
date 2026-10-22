/**
 * Färg-primitiver som delas av alla effekter och motorn.
 * Rena funktioner — ingen delad state, inga beroenden mot motorn.
 */

/**
 * HSV → RGB, anpassad för fysiska PAR-kannor med stora diskreta R/G/B-lysdioder
 * som inte kan blanda toner: mättnaden snäpps till ren färg/vitt. All mjukhet
 * ligger i ljusstyrkan (v) i stället. Färgtonen kommer redan sektor-snäppt
 * (mixedSector() ger heltalssektorer / 6).
 */
// ÅTERANVÄNDA FÄRGER (10-16, GC-jakten): resultatet är en av 32 arrayer i en ring i stället för en ny array per anrop (~800/s live).
// KONTRAKT: använd resultatet direkt eller kopiera det - spara det aldrig mellan rutor (motorn kopierar effektens färg till en egen
// buffert per lampa direkt efter effect.render; ingen effekt sparar c.hsv-resultat, granskat 10-16). 32 täcker många anrop per lampa.
const RING: [number, number, number][] = Array.from({ length: 32 }, () => [0.5, 0.5, 0.5] as [number, number, number]);
let ringAt = 0;
// hsv-grenarna som tabell (10-18, liten bytekod): vilket av v/q/p/t som blir r, g, b för sektor 0..4 och default (5).
const VQPT = new Float64Array(4);   // 0 v, 1 q, 2 p, 3 t
const SEL = new Uint8Array([0, 3, 2, /*1*/ 1, 0, 2, /*2*/ 2, 0, 3, /*3*/ 2, 1, 0, /*4*/ 3, 2, 0, /*default*/ 0, 2, 1]);
/** EFFEKTERNAS FÄRG (10-18, skräpjakten på Node 18): samma räkning som hsvToRgb + mättnadsgolvet DMX_SAT_FLOOR (förr ett omslag i
 *  motorns ctx.hsv). Effekterna importerar den DIREKT i stället för att anropa c.hsv: på Node 18 (Pi:ernas V8 10) slutade V8 inlina
 *  anropet genom ctx i den långkörande processen och packade då in h/s/v vid varje anrop (16-48 B per lampa och ruta, ~34 kB/s);
 *  en modulfunktion är en konstant som V8 kan inlina. Egen kopia av räkningen (inte ett anrop till hsvToRgb) - samma kontrakt
 *  som hsvToRgb: resultatet är en av ringens arrayer, använd direkt eller kopiera. */
export function hsv(h: number, s: number, v: number): [number, number, number] {
  s = s >= 0.5 ? 1 : 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  // EN skrivning till ringen (10-18): sex inlinade out()-anrop gjorde funktionen så stor (274 + 183 byte bytekod) att V8 10 slutade
  // inlina den i effekterna när den väl optimerats - då packades h/s/v in vid varje anrop. Samma värden per gren som förr.
  const k = i % 6, j = k >= 0 && k <= 4 ? k * 3 : 15;   // 15 = default-grenen (5, negativt, NaN) som förr
  VQPT[0] = v; VQPT[1] = q; VQPT[2] = p; VQPT[3] = t;
  const o = RING[ringAt]; ringAt = (ringAt + 1) & 31;
  o[0] = VQPT[SEL[j]]; o[1] = VQPT[SEL[j + 1]]; o[2] = VQPT[SEL[j + 2]]; return o;
}
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s = s >= 0.5 ? 1 : 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  // EN skrivning till ringen (10-18): sex inlinade out()-anrop gjorde funktionen så stor (274 + 183 byte bytekod) att V8 10 slutade
  // inlina den i effekterna när den väl optimerats - då packades h/s/v in vid varje anrop. Samma värden per gren som förr.
  const k = i % 6, j = k >= 0 && k <= 4 ? k * 3 : 15;   // 15 = default-grenen (5, negativt, NaN) som förr
  VQPT[0] = v; VQPT[1] = q; VQPT[2] = p; VQPT[3] = t;
  const o = RING[ringAt]; ringAt = (ringAt + 1) & 31;
  o[0] = VQPT[SEL[j]]; o[1] = VQPT[SEL[j + 1]]; o[2] = VQPT[SEL[j + 2]]; return o;
}
