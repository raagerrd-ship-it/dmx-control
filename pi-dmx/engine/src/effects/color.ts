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
function out(a: number, b: number, c: number): [number, number, number] {
  const o = RING[ringAt]; ringAt = (ringAt + 1) & 31;
  o[0] = a; o[1] = b; o[2] = c; return o;
}
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s = s >= 0.5 ? 1 : 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return out(v, t, p);
    case 1: return out(q, v, p);
    case 2: return out(p, v, t);
    case 3: return out(p, q, v);
    case 4: return out(t, p, v);
    default: return out(v, p, q);
  }
}
