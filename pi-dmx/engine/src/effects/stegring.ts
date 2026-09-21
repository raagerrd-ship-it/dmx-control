import type { EffectDef } from "./types.js";

// STEGRING (build, 2026-09-21): spanningen stiger med sektionens alder. Borjar morkt och mattat i en farg, smalnar
// mot vitt och lyfter mot taket ju langre uppbyggnaden pagatt (antagen langd ~16 s, klamp), takten markeras med en
// allt tatare puls (var fjarde -> varannan -> varje slag), UV och hazer foljer med. Nar dropen landar (dropEnv) onskas
// blinder. Dirigenten valjer den vid 'build'-gransen (section-tagg) och haller den till refrangen.
export const stegring: EffectDef = {
  key: "stegring", label: "Stegring", tier: "fart", section: ["build"],
  desc: "Uppbyggnad: morkt till vitt, tatare puls och UV ju narmare dropen.",
  drives: ["uv", "hazer", "blinder"],
  render(c) {
    const u = Math.min(1, (c.sectionAgeMs / 16000) + c.frame.buildUp * 0.5);   // 0 = borjan, 1 = strax fore dropen
    const every = u < 0.35 ? 4 : u < 0.7 ? 2 : 1;                                  // pulsen tatnar
    const onBeat = c.hasBeat && c.beatIdx % every === 0;
    const pulse = onBeat ? Math.exp(-c.beatFrac / 0.12) : 0;
    const hue = c.mixedSector(Math.floor(c.t / 9)) / 6;
    const sat = 1 - u * 0.85;                                                       // smalnar mot vitt
    const base = 0.12 + 0.55 * u * u;                                               // lyfter mot taket
    const spatial = 1 - Math.abs((c.idx + 0.5) / c.count - 0.5) * (1 - u) * 0.6;    // mitten forst, kanterna kommer med
    c.want.uv = u; c.want.hazer = 0.3 + 0.7 * u;
    if (c.dropEnv > 0.7) c.want.blinder = c.dropEnv;
    return c.hsv(hue, sat, Math.min(1, (base + pulse * (0.3 + 0.5 * u)) * spatial + c.dropEnv * 0.6));
  },
};
