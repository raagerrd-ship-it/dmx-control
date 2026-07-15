/**
 * Färg-primitiver som delas av alla effekter och motorn.
 * Rena funktioner — ingen delad state, inga beroenden mot motorn.
 */

/**
 * HSV → RGB, anpassad för fysiska PAR-kannor med stora diskreta R/G/B-lysdioder
 * som inte kan blanda toner: färgtonen snäpps till 60°-steg och mättnaden till
 * ren färg/vitt. All mjukhet ligger i ljusstyrkan (v) i stället.
 * Färgtonen kommer redan sektor-snäppt (via mixedSector()); mättnaden hålls
 * ren/vit.
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

// Per-fixture hue-sector hold: råa toner nära en 60°-gräns skulle annars
// flippa mellan två rena färger många gånger i sekunden (läses som färgflimmer).
// Lämna den hållna sektorn först när den råa tonen tydligt passerat gränsen.
const sectorHold: number[] = [];
export function snapHue(idx: number, h: number): number {
  const raw = (((h * 6) % 6) + 6) % 6;
  let cur = sectorHold[idx];
  if (cur === undefined) cur = sectorHold[idx] = Math.round(raw) % 6;
  let d = raw - cur;
  if (d > 3) d -= 6; else if (d < -3) d += 6;
  if (Math.abs(d) > 0.65) sectorHold[idx] = cur = ((Math.round(raw) % 6) + 6) % 6;
  return cur / 6;
}
