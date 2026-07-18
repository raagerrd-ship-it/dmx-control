import type { EffectDef } from "./types.js";

// HJÄRTSLAG: dubbelslaget. Ett kraftigt slag på taktslaget och ett svagare strax
// efter (lub-DUB), taktlåst så det alltid ligger rätt i tempot. Ger en organisk,
// nästan kroppslig känsla som en vanlig enkelpuls inte har — och den syns även
// på lugnare partier eftersom den inte behöver hårda transienter.
export const hjarta: EffectDef = {
  key: "hjarta", label: "Hjärtslag", tier: "fart",
  desc: "Dubbelpuls i takten — ett kraftigt slag och ett svagare efterslag, som ett hjärta.",
  render(c) {
    const f = c.beatFrac;
    const lub = Math.exp(-f / 0.10);                      // huvudslaget
    const dub = Math.exp(-Math.max(0, f - 0.22) / 0.09) * (f > 0.22 ? 0.55 : 0);
    const beat = Math.max(lub, dub);
    // Ytterlamporna slår aningen senare → slaget "sprider sig" utåt i rummet.
    const spread = Math.exp(-Math.max(0, f - c.idx * 0.04) / 0.12) * 0.25;
    const hue = 0.98 + c.frame.spec.bass * 0.04;          // djupröd → varmare med basen
    const v = 0.10 + beat * 0.75 + spread + c.frame.spec.kick * 0.15;
    return c.hsv(hue % 1, 1 - beat * 0.25, Math.min(1, v));
  },
};
