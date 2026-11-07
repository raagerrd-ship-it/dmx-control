import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";
import { dansparet } from "./dansparet.js";

// SÅNGAREN (showen/labbet, ägaren i ladan 2026-11-07: 'den effekten är klockren och vi behåller den' + 'perfekt om takten blev okänd pga
// inte mycket bas och takt' + 'avbryt sångaren så fort hög bas aktiveras'): EN lampa sjunger - ljusstyrkan = röstbandet (lowMid/mid/highMid,
// ~250 Hz-3,5 kHz) glättat 60 ms över ett krypande golv; ny FRAS (rösten åter efter >= 350 ms) = ny lampa (aldrig samma två gånger i rad)
// och ny kulör (bara när lampan byts). Kommer kicken tillbaka tar DANSPARET över direkt (samma ruta) tills dirigenten byter look.
const st = { at: 0, vS: 0, vFloor: 1, voice: 0, quietAt: 0, lone: -1, hop: 0, sect: 5, kickAt: -1e9 };
export const sangare: EffectDef = {
  key: "sangare", label: "Sångaren", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["break", "intro", "low"],
  desc: "En lampa sjunger med rösten; varje ny fras på en ny lampa - kommer basen tar dansparet över.",
  render(c) {
    const n = Math.max(1, c.count);
    if (c.now !== st.at) {   // en gång per ruta
      const dt = st.at > 0 ? Math.min(0.2, Math.max(0, (c.now - st.at) / 1000)) : 0.025; st.at = c.now;
      const sp = c.frame.spec;
      st.vS += (0.25 * sp.lowMid + 0.5 * sp.mid + 0.25 * sp.highMid - st.vS) * Math.min(1, dt / 0.06);
      st.vFloor = Math.min(st.vS, st.vFloor + dt * 0.02);
      st.voice = Math.max(0, Math.min(1, (st.vS - st.vFloor - 0.04) * 2.2));
      if (c.drum.kick > 0.55) st.kickAt = c.now;
      if (st.voice > 0.08) {
        if (c.now - st.quietAt > 350 || st.lone < 0) {
          let k = st.lone + (st.hop++ % 2 ? 1 : 2); if (n > 1) { k = ((k % n) + n) % n; if (k === st.lone) k = (k + 1) % n; } else k = 0;
          st.lone = k; st.sect = c.mixedSector(st.hop);
        }
        st.quietAt = c.now;
      }
    }
    if (c.hasBeat && c.now - st.kickAt < 1200) return dansparet.render(c);   // basen tillbaka: dansparet direkt
    if (c.lamp !== st.lone) return [0, 0, 0];
    return hsv((((st.sect % 6) + 6) % 6) / 6, 1, st.voice);
  },
};
