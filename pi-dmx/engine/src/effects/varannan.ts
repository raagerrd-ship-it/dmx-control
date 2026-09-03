import type { EffectDef } from "./types.js";
// Fart: VARANNAN lampa tar VARANNAN takt — jämna lampor slår på taktslaget, udda på
// off-beatet (halva takten mellan). Ger en spatial DUBBELTAKT / ping-pong i stället
// för att hela riggen blinkar dubbelt. De två grupperna har skilda palettfärger.
export const varannan: EffectDef = {
  key: "varannan", label: "Varannan", tier: "fart",
  desc: "Varannan lampa tar varannan takt — spatial dubbeltakt.",
  render(c) {
    const off = c.idx % 2;                                       // 0 = jämn (på slaget), 1 = udda (off-beat)
    const phase = off === 0 ? c.beatFrac : (c.beatFrac + 0.5) % 1;
    const pulse = Math.pow(Math.max(0, 1 - phase * 1.8), 2.2);   // skarp topp vid slaget, snabb decay
    const hue = c.mixedSector(Math.floor(c.beatIdx / 2) * 2 + off) / 6;
    const v = c.shaped(0.08, pulse * (0.6 + c.audio * 0.4) + c.punch * 0.25);
    return c.hsv(hue, 1, Math.min(1, v));
  },
};
