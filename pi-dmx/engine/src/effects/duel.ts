import type { EffectDef } from "./types.js";
import { hsv, soft } from "./color.js";

// DUELL v2 (2026-09-21): call/response mellan kick och virvel med FARGMINNE. Kicken "ropar" i palettens grundfarg pa
// de inre lamporna, virveln "svarar" i kontrastfargen pa de yttre - och varje anslag lamnar ett avklingande eko sa
// duellen laser som en dialog, inte som en binar rod/bla-vaxling (v1). Hi-haten glittrar svagt i mitten emellan.
export const duel: EffectDef = {
  key: "duel", label: "Duell", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
  desc: "Kick ropar i palettfargen, virveln svarar i kontrastfargen - med eko.",
  render(c) {
    const d = c.drum;
    const isOuter = c.group === 1;   // inre/yttre eller jamn/udda (c.grouping)
    const base = c.mixedSector(Math.floor(c.hueIdx / 8));
    const hueCall = base / 6, hueResp = ((base + 3) % 6) / 6;
    // EFFEKTSVEPET 11-02 (ägaren: 'fixa direkt de effekterna'; effectDyn alla effekter pop+mega 5 min): trumdetektorns branta envelopes (d.kick/d.snare) slog AV/PÅ (hopp 0,032). Nu ropar
    // kicken på 1 och 3 och virveln svarar på 2 och 4 på effektklockan, med mjuk stigning och ett eko som klingar in i nästa slag.
    const f = c.hasBeat ? c.beatFrac : 1 - c.kickEnv;
    const back = (c.beatIdx & 1) === 1;                              // 2 och 4
    const call = soft(back ? 1 + f : f, 0.12, 0.5), resp = soft(back ? f : 1 + f, 0.12, 0.5);
    if (isOuter) return hsv(hueResp, 1, Math.min(1, 0.15 + resp * 0.85 + call * 0.15 + c.punch * 0.3));
    const glitter = d.hat * 0.1;
    return hsv(hueCall, 1, Math.min(1, 0.15 + call * 0.8 + resp * 0.1 + glitter + c.punch * 0.3));
  },
};
