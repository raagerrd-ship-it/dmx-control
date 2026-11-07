import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// MINNET (labbet, ägaren i ladan 2026-11-07: 'jag gillar denna' + 'saknade att lamporna körde på energi'): första refrängen i låten
// IMPROVISERAR ett lampmönster per slag och spelar in det (nyckel = slag sedan sektionens start, ctx.sectionBars); när refrängen kommer
// tillbaka spelas EXAKT samma koreografi upp igen - ljuset känner igen låten. Slagets styrka ur kicken/basens kropp. Ny låt
// (sektionsindex går bakåt) = nytt minne. Kulören byts bara på taktens etta.
const PATTERNS = [0b1000, 0b0001, 0b0100, 0b0010, 0b1001, 0b0110, 0b1010, 0b0101, 0b1100, 0b0011, 0b1111];
const st = { at: 0, mem: new Map<number, number>(), firstIdx: -1, lastIdx: -1, lastBeat: -1e9, mask: 0, sect: 0, seed: 7 };
export const minnet: EffectDef = {
  key: "minnet", label: "Minnet", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
  desc: "Första refrängen improviserar ett mönster per slag - nästa refräng får exakt samma koreografi.",
  render(c) {
    if (c.now !== st.at) {
      st.at = c.now;
      if (c.sectionIndex < st.lastIdx) { st.mem.clear(); st.firstIdx = -1; }   // ny låt
      st.lastIdx = c.sectionIndex;
      const rel = Math.floor(c.sectionBars * 4);
      if (rel !== st.lastBeat) {
        st.lastBeat = rel;
        if (st.firstIdx < 0 && c.section === "high") st.firstIdx = c.sectionIndex;
        const recording = c.sectionIndex === st.firstIdx, known = recording ? undefined : st.mem.get(rel);
        if (known !== undefined) { st.mask = known & 0xff; st.sect = known >> 8; }
        else {
          st.seed = (st.seed * 1103515245 + 12345) & 0x7fffffff;
          const r = st.seed / 0x7fffffff, one = ((rel % 4) + 4) % 4 === 0, fyra = ((rel % 16) + 16) % 16 === 0;   // kulör var 4:e takt (blinket)
          st.mask = one && r < 0.5 ? 0b1111 : PATTERNS[Math.floor(r * (PATTERNS.length - 1))];
          if (fyra) st.sect = c.mixedSector(Math.floor(rel / 16) + Math.floor(r * 3));
          if (recording) st.mem.set(rel, st.mask | (st.sect << 8));
        }
      }
    }
    const n = Math.max(1, c.count), i = c.lamp;
    if (!(st.mask & (1 << (3 - (i % 4))))) return [0, 0, 0];
    const hit = Math.max(c.drum.kick, Math.min(1, c.bassBody));
    const v = Math.exp(-c.beatFrac * 3) * (0.2 + 0.8 * hit);
    return hsv(((((st.sect + (i >= n / 2 ? 3 : 0)) % 6) + 6) % 6) / 6, 1, v);
  },
};
