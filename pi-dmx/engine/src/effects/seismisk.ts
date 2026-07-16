import type { EffectDef } from "./types.js";

// Full fart: SEISMISK SKORPA — riggen delas i två kontrasterande färgblock, men
// GRÄNSEN ("sprickan") mellan dem är inte fast: den djupa sub-basen får den att
// gunga trögt fram och tillbaka, och skarpa snare/clap-anslag (onset.highMid)
// skjuter den blixtsnabbt i sidled (kicken drar tillbaka). En smal morf-zon i
// skarven. Rörlig gräns = helt annan karaktär än split (fast inre/yttre).
// (Gemini-idé.)
export const seismisk: EffectDef = {
  key: "seismisk", label: "Seismisk", tier: "full",
  desc: "Två färgblock vars gräns gungar av sub-bas och slits i sidled av hårda anslag.",
  render(c) {
    const hueA = c.mixedSector(1) / 6;
    const hueB = c.mixedSector(4) / 6;
    const subSwing = Math.sin(c.t * 3.5) * c.frame.spec.sub * 1.3;          // trög gungning
    const transient = c.frame.onset.highMid * 1.7 - c.frame.onset.kick;     // våldsam knuff
    const faultline = (c.count - 1) / 2 + subSwing + transient;             // gränsens position
    const w = 0.15;                                                         // smal morf-zon
    const blend = Math.max(0, Math.min(1, (c.idx - faultline + w) / (w * 2)));
    const hue = hueA * blend + hueB * (1 - blend);
    const v = c.shaped(0.25, Math.max(c.frame.spec.kick, c.frame.spec.bass));
    return c.hsv(hue, 0.95, v);
  },
};
