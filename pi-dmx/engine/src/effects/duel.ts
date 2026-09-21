import type { EffectDef } from "./types.js";

// DUELL v2 (2026-09-21): call/response mellan kick och virvel med FARGMINNE. Kicken "ropar" i palettens grundfarg pa
// de inre lamporna, virveln "svarar" i kontrastfargen pa de yttre - och varje anslag lamnar ett avklingande eko sa
// duellen laser som en dialog, inte som en binar rod/bla-vaxling (v1). Hi-haten glittrar svagt i mitten emellan.
export const duel: EffectDef = {
  key: "duel", label: "Duell", tier: "full", section: ["high"], toggle: true,
  desc: "Kick ropar i palettfargen, virveln svarar i kontrastfargen - med eko.",
  render(c) {
    const d = c.drum;
    const isOuter = c.count < 3 ? c.idx % 2 === 1 : (c.idx === 0 || c.idx === c.count - 1);
    const base = c.mixedSector(Math.floor(c.beatIdx / 8));
    const hueCall = base / 6, hueResp = ((base + 3) % 6) / 6;
    // anslag med eko: kick/snare ar redan envelopes (0..1) med avklingning i analysatorn
    const call = Math.pow(d.kick, 0.8), resp = Math.pow(d.snare, 0.7);
    if (isOuter) return c.hsv(hueResp, 1 - resp * 0.5, Math.min(1, 0.06 + resp * 0.9 + call * 0.15 + c.punch * 0.3));
    const glitter = d.hat * 0.15;
    return c.hsv(hueCall, 1 - call * 0.2, Math.min(1, 0.08 + call * 0.85 + resp * 0.1 + glitter + c.punch * 0.3));
  },
};
