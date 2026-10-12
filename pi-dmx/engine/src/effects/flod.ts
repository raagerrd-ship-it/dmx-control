import type { EffectDef } from "./types.js";

// FLOD (lugn x uppbyggnad, situationsrutnätet 2026-10-12 - andra effekten i rutan, syskon gryning): en mjuk våg som rullar över
// riggen (c.idx-ordningen, så hållet växlar) och växer med uppbyggnaden (c.buildUp): långsam och låg i början, snabbare och djupare
// mot dropen. Gryning tänder lampor; flod rör ljuset.
export const flod: EffectDef = {
  key: "flod", label: "Flod", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["build"],
  desc: "Lugn uppbyggnad: en mjuk våg rullar över riggen och blir snabbare och djupare mot dropen.",
  render(c) {
    const n = Math.max(1, c.count), p = c.buildUp;
    const beats = c.beatIdx + c.beatFrac;
    const cyc = p >= 0.5 ? 2 : 4;                                      // ett varv per 4 slag, 2 efter halva uppbyggnaden
    const w = 0.5 + 0.5 * Math.cos(2 * Math.PI * (beats / cyc - c.idx / n));
    const depth = 0.4 + 0.5 * p;
    const hue = c.mixedSector(Math.floor(c.hueIdx / 32)) / 6;
    return c.hsv(hue, 0.95, Math.min(1, (0.12 + 0.3 * p) + depth * w * (0.55 + 0.45 * p)));
  },
};
