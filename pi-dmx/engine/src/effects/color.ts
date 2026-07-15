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
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  s = s >= 0.5 ? 1 : 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}
