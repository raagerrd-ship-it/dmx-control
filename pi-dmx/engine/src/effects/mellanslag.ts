import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// MELLANSLAG (full x intro, situationsrutnätet 2026-10-12 - syskon kickregn/startskott/blixtnedslag): introt med house-basens
// offbeat. Ljuset slår på "och"-et mellan slagen (halvt slag efter kicken) och flyttar en lampa per offbeat (c.idx-ordningen),
// med basens sustain (c.drum.bass) som extra lyft; kicken själv syns bara som en svag glöd i lampan mittemot. Takten känns i
// luckan mellan slagen. Gallop delar grupper beat/off-beat; mellanslag vandrar på offbeaten.
export const mellanslag: EffectDef = {
  key: "mellanslag", label: "Mellanslag", tier: "full", modulate: { energy: true, pulse: false }, section: ["intro"],
  desc: "Intro i full fart: ljuset slår på offbeaten mellan kickarna och vandrar en lampa per slag.",
  render(c) {
    const n = Math.max(1, c.count);
    const ph = (c.beatFrac + 0.5) % 1;                                 // tid sedan "och"-et
    const off = c.beatFrac >= 0.5 ? c.beatIdx : c.beatIdx - 1;         // vilket offbeat som senast slog
    const pos = ((off % n) + n) % n;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (c.idx === pos) return hsv(base / 6, 1, Math.min(1, 0.05 + (0.7 + 0.25 * Math.min(1, c.drum.bass * 1.5)) * Math.exp(-ph / 0.22)));
    if (c.idx === (pos + 2) % n) return hsv(((base + 3) % 6) / 6, 1, 0.03 + 0.3 * c.kickEnv);
    return hsv(base / 6, 1, 0.02);
  },
};
