import type { EffectDef } from "./types.js";

// Full fart: TVÅFÄRGS-VÄXELSPEL — riggen delas varannan lampa i två grupper med
// KONTRASTFÄRGER (motsatta sidor av hjulet) som PINGPONGAR plats varje takt,
// HELT släckt grupp emellan. Färgparet är STABILT i 4 takter så ögat ser tydligt
// "A / B / A / B" (på 3 lampor: 0,2 mot 1) — inte färgbyte varje slag som gör
// den lik party/snap.
export const rave: EffectDef = {
  key: "rave", label: "Rave", tier: "full",
  desc: "Varannan lampa blinkar i motfärger – hård växling.",
  render(c) {
    const even = c.idx % 2 === 0;
    const flip = c.beatIdx % 2 === 0;
    const lit = even === flip;
    const pairBase = c.mixedSector(Math.floor(c.beatIdx / 4));
    const hue = ((even ? pairBase : pairBase + 3) % 6) / 6;
    return c.hsv(hue, 1, lit ? 1 : 0);
  },
};
