import type { EffectDef } from "./types.js";

// Snabb LÖPARE: skarpt huvud som hoppar ETT steg per taktslag, kort svans, och
// BYTER ren färg medan det springer → rytmiskt och gles, inte en full färgvåg
// (wave). + hi-hat-glitter: diskant-anslaget (onset.treble) ger en snabb gnista
// på huvudet, samma pigga tick som wave fick.
export const chase: EffectDef = {
  key: "chase", label: "Jakt", tier: "fart", section: ["low", "high"], toggle: true,
  desc: "En ljuspunkt springer i takt och byter färg.",
  render(c) {
    // BASNOTER (2026-09-23): vid tydlig basgang (bassline >= 0,6) hoppar huvudet ett steg per BASNOT (ping-pong) i stallet for
    // per slag, och svansen klingar med noten - loparen foljer basgangen, inte bara takten.
    const onBass = c.bassline >= 0.6;
    const span = Math.max(1, c.count - 1);
    const cyc = c.bassNoteIdx % (span * 2);
    const pos = onBass ? (cyc <= span ? cyc : span * 2 - cyc) : c.chasePos;
    const d = Math.abs(c.idx - pos);
    const tail = Math.exp(-d * 1.6) * (onBass ? 0.55 + 0.45 * Math.exp(-c.bassNoteAge / 0.3) : 1);
    const hue = c.mixedSector(pos + Math.floor(c.t / 4)) / 6;
    const v = Math.min(1, tail * c.shaped(0.22, 0.55 + c.audio * 0.55 + c.kickEnv * 0.5 + c.frame.onset.treble * 0.35 + (onBass ? c.frame.onset.bass * 0.4 : 0)) + c.punch * 0.3);
    return c.hsv(hue, 1 - c.punch * 0.25, v);   // riktig dunk → hela svansen blixtrar
  },
};
