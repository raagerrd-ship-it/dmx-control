import type { EffectDef } from "./types.js";

// DYNING (fart x break, situationsrutnätet 2026-10-12 - syskon hjarta/glimt/glesna): breaket där bara basen (eller en pad) ligger
// kvar. En smal dyning rullar långsamt över riggen på klockan (2,5 s per varv, ingen takt) och dess höjd är basens sustain
// (c.drum.bass, annars halva intensiteten) - utan bas ligger havet nästan stilla. Flod och wave rör sig i takt; dyning gör det inte.
export const dyning: EffectDef = {
  key: "dyning", label: "Dyning", tier: "fart", modulate: { energy: true, pulse: false }, section: ["break"],
  desc: "Break i fart: en smal dyning rullar långsamt över riggen, lika hög som basen.",
  render(c) {
    const n = Math.max(1, c.count);
    const w = 0.5 + 0.5 * Math.cos(2 * Math.PI * (c.t / 2.5 - c.idx / n));
    const amp = 0.15 + 0.75 * Math.min(1, Math.max(c.drum.bass * 1.3, 0.5 * (c.frame.intensity ?? 0)));
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    return c.hsv(((base + (w > 0.5 ? 0 : 1)) % 6) / 6, 0.95, Math.min(1, 0.03 + amp * w ** 3));
  },
};
