/**
 * Regi-lagrets palett-state. Motorn väljer en palett per musikalisk fras
 * (setPalette), och effekterna hämtar sina färger via mixedSector() som
 * begränsar det gyllene-snitt-vandrande färgvalet till den aktiva paletten.
 */

export const ALL_SECTORS = [0, 1, 2, 3, 4, 5];

// Kurerade RGB-vänliga paletter för regi-lagret. temp styr centroid-valet
// (mörk klang → warm, ljus klang → cool). Färg-sektorer: 0=röd 1=gul 2=grön
// 3=cyan 4=blå 5=magenta.
export const PALETTES: { name: string; sectors: number[]; temp: "warm" | "cool" | "neutral" }[] = [
  { name: "Eld",      sectors: [0, 1, 5], temp: "warm" },    // röd / gul / magenta
  { name: "Guldfest", sectors: [0, 1, 2], temp: "warm" },    // röd / gul / grön
  { name: "Primär",   sectors: [0, 2, 4], temp: "neutral" }, // röd / grön / blå
  { name: "Skogsdis", sectors: [1, 2, 3], temp: "cool" },    // gul / grön / cyan
  { name: "Djupblå",  sectors: [3, 4, 5], temp: "cool" },    // cyan / blå / magenta
];

// Regi-lagret sätter denna varje frame; mixedSector begränsar färgvalet till den.
let CURRENT_PALETTE: number[] = ALL_SECTORS;

/** Sätt aktiv palett (anropas av motorn per frame). */
export function setPalette(sectors: number[]): void { CURRENT_PALETTE = sectors; }

/** Aktiv palett (för t.ex. scenic-anchor-tonen). */
export function currentPalette(): number[] { return CURRENT_PALETTE; }

/** Gyllene-snitt-vandring 0–5, mappad in i den aktiva paletten. */
export function mixedSector(n: number): number {
  const g = Math.floor(((((n * 0.61803398875) % 1) + 1) % 1) * 6);   // golden-vandring 0–5
  return CURRENT_PALETTE[g % CURRENT_PALETTE.length];                 // mappa in i aktiv palett
}
