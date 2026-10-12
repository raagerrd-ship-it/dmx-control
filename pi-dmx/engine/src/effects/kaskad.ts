import type { EffectDef } from "./types.js";

// KASKAD (lugn x refräng, situationsrutnätet 2026-10-12 - rutan hade två effekter, syskon svall/famn): en lugn refräng som fylls
// och töms i varje takt. Slag 1, 2 och 3 tänder en lampa var (c.idx-ordningen) som LIGGER KVAR och växer sakta, på slag 4 släpper
// alla tre mjukt - som en bassäng som fylls och rinner över. Den fjärde lampan tänds aldrig och flyttar en plats per takt.
// Svall andas i två grupper, famn blommar på ettan; kaskad bygger takten lampa för lampa och släpper den.
export const kaskad: EffectDef = {
  key: "kaskad", label: "Kaskad", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["high"],
  desc: "Lugn refräng: slag 1-3 tänder en lampa var som ligger kvar, på slag 4 släpper alla mjukt.",
  render(c) {
    const n = Math.max(1, c.count);
    const bib = ((c.beatIdx % 4) + 4) % 4;
    const start = ((Math.floor(c.beatIdx / 4) % n) + n) % n;
    const rank = (c.idx - start + n) % n;                              // 0..2 tänds på slag 1..3, n-1 vilar
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (rank >= Math.min(3, n - 1)) return c.hsv(base / 6, 1, 0.03);
    let v: number;
    if (bib === 3) v = (0.35 + 0.1 * (2 - rank)) * Math.exp(-c.beatFrac / 0.35);                 // slag 4: alla släpper
    else if (rank < bib) v = 0.35 + 0.1 * (bib - rank) + 0.05 * c.beatFrac;                      // tända tidigare i takten, växer
    else if (rank === bib) v = 0.15 + 0.45 * (1 - Math.exp(-c.beatFrac / 0.12));                // tänds nu, mjuk attack
    else v = 0.03;
    return c.hsv(((base + (rank & 1)) % 6) / 6, 0.95, Math.min(1, v));
  },
};
