import type { EffectDef } from "./types.js";

// Full fart: KRUSNING från MITTEN — riggen delas i två grupper efter AVSTÅND
// från centrum (ytterlamporna vs de inre). Varannan takt tänds mitten, nästa
// ytterkanten → en puls som slår ut från mitten och in igen. Med 4 lampor:
// mitten-2 ena takten, ytter-2 nästa. Kontrastfärger per ring (som rave, fast
// RADIELLT i stället för varannan lampa). <3 lampor: faller tillbaka på paritet.
export const ripple: EffectDef = {
  key: "ripple", label: "Krusning", tier: "full",
  desc: "Puls från mitten och ut – inre lampor ena takten, yttre nästa.",
  render(c) {
    const center = (c.count - 1) / 2;
    const d = Math.abs(c.idx - center);                      // avstånd från mitten
    const maxD = center || 1;
    const isOuter = c.count < 3 ? c.idx % 2 === 0 : d > maxD - 0.01;   // ytterlamporna
    const litOuter = c.beatIdx % 2 === 1;                    // varannan takt: mitten / ytter
    const lit = isOuter === litOuter;
    const pairBase = c.mixedSector(Math.floor(c.beatIdx / 4));
    const hue = ((litOuter ? pairBase + 3 : pairBase) % 6) / 6;   // motfärg mitt vs ytter
    const v = 0.6 + 0.4 * Math.min(1, c.beatPulse * 0.7 + c.audio * 0.3);
    return c.hsv(hue, 1, lit ? v : 0);
  },
};
