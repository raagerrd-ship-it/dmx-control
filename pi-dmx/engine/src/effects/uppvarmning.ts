import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// UPPVÄRMNING (fart x intro, situationsrutnätet 2026-10-12 - rutan hade två effekter, syskon ankomst/spaning): introt värms upp på
// hi-hatten. Lamporna som "lyssnar" fladdrar på varje hi-hat (c.drum.hat), resten är mörka; antalet lyssnande lampor växer med
// introt (sectionAgeMs: 1 -> 2 -> 3 på 16 s, aldrig alla) och gänget flyttar en plats per takt (c.idx-ordningen).
// Ankomst slår på slaget, spaning på baktakten; uppvärmning lever på hi-hatten.
export const uppvarmning: EffectDef = {
  key: "uppvarmning", label: "Uppvärmning", tier: "fart", modulate: { energy: true, pulse: false }, section: ["intro"],
  desc: "Intro i fart: lamporna fladdrar på hi-hatten, en lampa till lyssnar efter hand.",
  render(c) {
    const n = Math.max(1, c.count);
    const k = Math.min(n - 1, 1 + Math.floor(Math.min(1, c.sectionAgeMs / 16000) * 2.99));
    const start = ((Math.floor(c.beatIdx / 4) % n) + n) % n;
    const rank = (c.idx - start + n) % n;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (rank >= k) return hsv(base / 6, 1, 0.02);
    return hsv(((base + 2 * (rank & 1)) % 6) / 6, 0.9, Math.min(1, 0.06 + 0.9 * Math.min(1, c.drum.hat * 1.2)));
  },
};
