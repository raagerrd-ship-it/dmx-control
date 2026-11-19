import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";
import { halva, slotSize } from "./rig.js";

// KASKAD (lugn x refräng, situationsrutnätet 2026-10-12 - rutan hade två effekter, syskon svall/famn): en lugn refräng som fylls
// och töms i varje takt. Slag 1, 2 och 3 tänder en lampa var (c.idx-ordningen) som LIGGER KVAR och växer sakta, på slag 4 släpper
// alla tre mjukt - som en bassäng som fylls och rinner över. Den fjärde lampan tänds aldrig och flyttar en plats per takt.
// Svall andas i två grupper, famn blommar på ettan; kaskad bygger takten lampa för lampa och släpper den.
// 1AN-3AN-STILEN (ägaren 11-19): två kaskader i motfas, en per halva (B speglad) - A fylls på 1-3 och släpper på 4, B fylls på 3-1
// och släpper på 2. Hamnar ettan på trean byter bara halvorna plats.
// OMTAGGNING 2026-11-05 (ägaren: "fixa" - dynamik.md varför-tabellen, aldrig vald): lugn-tier men bara high (refrängen sällan lugn) -> även vers och break.
export const kaskad: EffectDef = {
  key: "kaskad", label: "Kaskad", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["high", "low", "break"],
  desc: "Lugn refräng: två halvor fylls lampa för lampa i motfas - ena från ettan, andra från trean - och släpper mjukt.",
  render(c) {
    const h0 = halva(c.lamp, c.count), h = h0 < 0 ? 0 : h0, a = Math.floor(c.count / 2);
    const half = h0 < 0 ? c.count : h === 0 ? a : c.count - a, loc = h === 0 ? c.lamp : c.count - 1 - c.lamp;   // B speglad
    const g = slotSize(half), n = Math.max(1, Math.ceil(half / g)), me = Math.floor(loc / g);   // hyrkitet: platser om g lampor
    const t = c.beatIdx + 2 * h, bib = ((t % 4) + 4) % 4;           // B går två slag efter A
    const start = ((Math.floor(t / 4) % n) + n) % n;
    const rank = (me - start + n) % n;                              // 0..2 tänds på slag 1..3, n-1 vilar
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((h ? base + 1 : base) % 6) / 6;   // en kulör per halva (10-13: aldrig kulör per rang = kulörhopp)
    if (rank >= Math.min(3, n - 1)) return hsv(hue, 1, 0.015);
    let v: number;
    if (bib === 3) v = (0.35 + 0.1 * (2 - rank)) * Math.exp(-c.beatFrac / 0.35);                 // slag 4: alla släpper
    else if (rank < bib) v = 0.35 + 0.1 * (bib - rank) + 0.05 * c.beatFrac;                      // tända tidigare i takten, växer
    else if (rank === bib) v = 0.15 + 0.45 * (1 - Math.exp(-c.beatFrac / 0.12));                // tänds nu, mjuk attack
    else v = 0.015;
    return hsv(hue, 0.95, Math.min(1, v));
  },
};
