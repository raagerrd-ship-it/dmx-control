import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// DUELL v2 (2026-09-21): call/response mellan kick och virvel med FARGMINNE. Kicken "ropar" i palettens grundfarg pa
// de inre lamporna, virveln "svarar" i kontrastfargen pa de yttre - och varje anslag lamnar ett avklingande eko sa
// duellen laser som en dialog, inte som en binar rod/bla-vaxling (v1). Hi-haten glittrar svagt i mitten emellan.
// ANSATS PA SLAGET (11-03, natten 11-03: effektklockan i 428e5d9 gjorde 10-21:s ljuslag 90 % 40 -> 130 ms): trumdetektorns
// envelopes igen - de ligger pa ljudet - men stigningen begransad till RISE_S och fallet till ekots TAU_S, sa anslaget varken
// slar pa en ruta eller slacks direkt (det som var AV/PA 11-02).
const RISE_S = 0.05, TAU_S = 0.4;   // 0,03 -> 0,05: lika ljuslag (90 % 40 ms), hopp pop/mega 0,030/0,026 -> 0,028/0,024
const val: number[] = [], at: number[] = [];
function env(i: number, now: number, x: number): number {
  const prev = val[i] ?? 0, dt = Math.max(0, Math.min(0.2, (now - (at[i] ?? now)) / 1000));
  const y = x >= prev ? prev + (x - prev) * Math.min(1, dt / RISE_S) : Math.max(x, prev * Math.exp(-dt / TAU_S));
  val[i] = y; at[i] = now; return y;
}

export const duel: EffectDef = {
  key: "duel", label: "Duell", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
  desc: "Kick ropar i palettfargen, virveln svarar i kontrastfargen - med eko.",
  render(c) {
    const d = c.drum;
    const isOuter = c.group === 1;   // inre/yttre eller jamn/udda (c.grouping)
    const base = c.mixedSector(Math.floor(c.hueIdx / 8));
    const hueCall = base / 6, hueResp = ((base + 3) % 6) / 6;
    const call = env(c.idx * 2, c.now, Math.pow(d.kick, 0.8)), resp = env(c.idx * 2 + 1, c.now, Math.pow(d.snare, 0.7));
    if (isOuter) return hsv(hueResp, 1, Math.min(1, 0.15 + resp * 0.85 + call * 0.15 + c.punch * 0.3));
    const glitter = d.hat * 0.1;
    return hsv(hueCall, 1, Math.min(1, 0.15 + call * 0.8 + resp * 0.1 + glitter + c.punch * 0.3));
  },
};
