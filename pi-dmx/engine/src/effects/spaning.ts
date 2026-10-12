import type { EffectDef } from "./types.js";

// SPANING (fart x intro, situationsrutnätet 2026-10-12 - andra effekten i rutan, syskon ankomst): introt presenterar baktakten.
// Ytterlamporna turas om på slag 2 och 4 (virveln, c.drum.snare, eller rastret), mittlamporna glöder svagt och växer med introt
// (sectionAgeMs, 16 s). Ankomst går en lampa per slag; spaning svarar bara på baktakten.
export const spaning: EffectDef = {
  key: "spaning", label: "Spaning", tier: "fart", modulate: { energy: true, pulse: false }, section: ["intro"],
  desc: "Intro i fart: ytterlamporna turas om på baktakten, mitten glöder och växer med introt.",
  render(c) {
    const n = Math.max(1, c.count);
    const grow = Math.min(1, c.sectionAgeMs / 16000);
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const outer = c.lamp === 0 || c.lamp === n - 1;
    if (!outer) return c.hsv(((base + 3) % 6) / 6, 1, 0.05 + 0.2 * grow);
    const beatInBar = ((c.beatIdx % 4) + 4) % 4;
    const back = beatInBar === 1 || beatInBar === 3;
    const mine = back && ((beatInBar === 1) === (c.lamp === 0));      // slag 2 vänster, slag 4 höger
    const hit = mine ? Math.max(Math.exp(-c.beatFrac / 0.2), c.drum.snare) : 0;
    return c.hsv(base / 6, 1, Math.min(1, 0.08 + 0.9 * hit));
  },
};
