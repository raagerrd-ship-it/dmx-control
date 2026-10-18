import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// DYNING (fart x break, situationsrutnätet 2026-10-12 - syskon hjarta/glimt/glesna): breaket där bara basen (eller en pad) ligger
// kvar. En smal dyning rullar långsamt över riggen på klockan (2,5 s per varv, ingen takt) och dess höjd är basens sustain
// (c.drum.bass, annars halva intensiteten) - utan bas ligger havet nästan stilla. Flod och wave rör sig i takt; dyning gör det inte.
export const dyning: EffectDef = {
  key: "dyning", label: "Dyning", tier: "fart", modulate: { energy: true, pulse: false }, section: ["break"],
  desc: "Break i fart: en smal dyning rullar långsamt över riggen, lika hög som basen.",
  render(c) {
    const n = Math.max(1, c.count);
    const w = 0.5 + 0.5 * Math.cos(2 * Math.PI * (c.t / 2.5 - c.idx / n));
    // EFFEKTGENOMGÅNGEN 10-13 (effectDyn i breaket: 48 kulörhopp/min - lampan bytte kulör varje gång vågen passerade mitten; basens
    // sustain som NIVÅ dubbelmodulerade mot basenergin, som redan gör dyningen hög med basen): fast kulör per lampa, fast höjd.
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    return hsv((((c.lamp & 1) ? base + 1 : base) % 6) / 6, 0.95, Math.min(1, 0.015 + 0.85 * w ** 3));
  },
};
