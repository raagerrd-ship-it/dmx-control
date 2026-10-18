import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// STJÄRNOR (lugn x uppbyggnad, situationsrutnätet 2026-10-12 - rutan hade två effekter, syskon gryning/flod): en lugn låts
// uppbyggnad utan takt i ljuset. Varje lampa tindrar på sin egen tid (hash per lampa och tidslucka, ingen takt), och himlen tätnar
// med uppbyggnaden (c.buildUp): få, svaga stjärnor i början, tätt och ljust mot dropen. Diskanten (c.trebleEnv) skimrar i de tända.
// Gryning tänder lampor i ordning, flod rör en våg; stjärnor är slumpvis tindrande täthet.
export const stjarnor: EffectDef = {
  key: "stjarnor", label: "Stjärnor", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["build"],
  desc: "Lugn uppbyggnad: lamporna tindrar var för sig, himlen tätnar och ljusnar mot dropen.",
  render(c) {
    const p = c.buildUp;
    const tt = c.t / 0.7 + c.lamp * 0.37;                              // egen tidslucka per lampa (0,7 s), förskjuten
    const slot = Math.floor(tt), ph = tt - slot;
    const r = ((Math.imul(slot * 7 + c.lamp + 1, 2654435761) >>> 0) % 1000) / 1000;
    const tw = r < 0.2 + 0.55 * p ? Math.sin(Math.PI * ph) ** 2 : 0;   // tindring: upp och ned över luckan
    const base = c.mixedSector(Math.floor(c.hueIdx / 32));
    const hue = ((c.lamp & 1 ? base + 1 : base) % 6) / 6;
    return hsv(hue, 0.9, Math.min(1, 0.04 + (0.3 + 0.55 * p + 0.15 * c.trebleEnv) * tw));
  },
};
