import type { EffectDef } from "./types.js";

// Lugnast: hela riggen andas UNISONT i EN långsamt vandrande färg — djup,
// symmetrisk swell (lång mjuk in-/utandning). Golv 30% så den aldrig släcks.
export const breathe: EffectDef = {
  key: "breathe", label: "Andas", tier: "lugn",
  desc: "Hela riggen andas som en – djup mjuk våg i en färg.",
  render(c) {
    const hue = c.mixedSector(Math.floor(c.t / 11) + Math.round(c.frame.centroid * 3)) / 6;   // centroid → palett-läge
    // Andetagets DJUP följer sektionsenergin: i en svacka blir andningen grund
    // och mörk, i ett refräng djup och full. Utan detta var breathe strukturellt
    // identisk med aurora och twin — samma sinus, bara olika fasvinkel — och tre
    // likadana effekter i en 10-effekters lugn-pool gör att chill upprepar sig.
    // Hela riggen andas SAMTIDIGT (ingen per-lampa-fas) — det är det som skiljer
    // den från aurora (rumslig gradient) och twin (varannan lampa).
    const djup = 0.35 + c.frame.intensity * 0.65;
    const breath = 0.5 + 0.5 * Math.sin(c.t * 0.7) * djup;
    const m = Math.min(1, breath * 0.85 + c.audio * 0.2 + c.punch * 0.2);   // riktig dunk → mjuk svall
    return c.hsv(hue, 1, 0.3 + 0.7 * m);
  },
};
