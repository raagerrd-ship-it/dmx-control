import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// SÖKLJUSET (labbet 2, ägaren i ladan 2026-11-07: 'Sökljus är nice'): EN stråle glider till en ny lampa varje takt (300 ms), och på
// virveln HITTAR den något - hela raden blinkar kort i strålens färg (tonar 0,4 s). Utan takt byter strålen plats var 2,5 s. Kulören
// (blå/cyan) byts var 8:e steg, när strålen flyttar.
const st = { at: 0, from: 0, to: 0, moveAt: 0, step: -1, sect: 4, reveal: 0, sPrev: 0, seed: 3 };
export const sokljus: EffectDef = {
  key: "sokljus", label: "Sökljuset", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["break", "intro", "low"],
  desc: "En stråle byter lampa varje takt; på virveln blinkar hela raden kort i strålens färg.",
  render(c) {
    const n = Math.max(1, c.count);
    if (c.now !== st.at) {
      const dt = st.at > 0 ? Math.min(0.2, Math.max(0, (c.now - st.at) / 1000)) : 0.025; st.at = c.now;
      const step = c.mclk(4, 2.5);
      if (step !== st.step) {
        st.step = step; st.from = st.to;
        st.seed = (st.seed * 1103515245 + 12345) & 0x7fffffff;
        let k = Math.floor((st.seed / 0x7fffffff) * n); if (n > 1 && k === st.to) k = (k + 1) % n;
        st.to = k; st.moveAt = c.now; if (step % 8 === 0) st.sect = st.sect === 4 ? 3 : 4;
      }
      if (c.drum.snare > 0.55 && st.sPrev <= 0.4) st.reveal = 0.55;
      st.sPrev = c.drum.snare;
      st.reveal *= Math.exp(-dt / 0.4);
    }
    const g = Math.min(1, (c.now - st.moveAt) / 300), i = c.lamp;
    const beam = (i === st.to ? g : 0) + (i === st.from ? 1 - g : 0);
    return hsv(st.sect / 6, 1, Math.max(0.6 * beam, st.reveal));
  },
};
