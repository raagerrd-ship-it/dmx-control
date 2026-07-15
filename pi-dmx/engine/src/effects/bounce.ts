import type { EffectDef } from "./types.js";

// Full fart: en SKARP ljuspunkt studsar fram och tillbaka, ett steg per takt,
// kort efterglöd, mörk rigg emellan. Gles och kinetisk; ny ren färg vid varje
// studs-steg.
export const bounce: EffectDef = {
  key: "bounce", label: "Studs", tier: "full",
  desc: "En skarp ljuspunkt studsar fram och tillbaka.",
  render(c) {
    const span = Math.max(1, c.count - 1);
    const cyc = c.beatIdx % (span * 2);
    const pos = cyc <= span ? cyc : span * 2 - cyc;   // triangel-våg
    const d = Math.abs(c.idx - pos);
    const hue = c.mixedSector(c.beatIdx) / 6;
    const v = Math.exp(-d * 1.7) * Math.min(1, 0.85 + c.beatPulse * 0.15 + c.kickEnv * 0.4);
    return c.hsv(hue, 1, v);
  },
};
