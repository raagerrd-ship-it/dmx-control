import type { EffectDef } from "./types.js";

// Lugnast: riggen andas - djup, symmetrisk swell (lång mjuk in-/utandning) som rullar från mitten och ut (10-13; var unison).
export const breathe: EffectDef = {
  key: "breathe", label: "Andas", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["intro", "break"],
  desc: "Riggen andas från mitten och ut - mittparet först, kanten efter, långsamt och djupt.",
  flat: true,   // statiskt svep → kortare dwell
  render(c) {
    // EFFEKTGENOMGÅNGEN 10-13 (effectDyn i intro/break: spridning 0,23 - alla fyra lika, mot regeln 'lamporna ska lysa olika'; 41,6
    // kulörhopp/min - kulören hoppade när centroiden fladdrade över en avrundningsgräns; c.audio/punch som NIVÅ dubbelmodulerade mot
    // basenergin; golvet 0,18 lyftes av motorns grundnivå så andetaget nästan inte syntes): andetaget går nu UTIFRÅN MITTEN - mittparet
    // andas först, ytterparet en kvarts andetag efter, ett andetag per två takter, ner i nästan mörker mellan. Mitten i palettens
    // kulör, kanten i grannkulören, kulören per fras.
    const half = (c.count - 1) / 2;
    const ring = c.count > 2 ? (Math.abs(c.lamp - half) > 1 ? 1 : 0) : (c.lamp & 1);   // 0 mittparet, 1 ytterparet
    const ph = (c.hasBeat ? (c.beatIdx + c.beatFrac) / 8 : c.t / 8) - ring * 0.25;
    const b = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph);
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    return c.hsv(((ring ? base + 1 : base) % 6) / 6, 1, 0.01 + 0.9 * b * b);
  },
};
