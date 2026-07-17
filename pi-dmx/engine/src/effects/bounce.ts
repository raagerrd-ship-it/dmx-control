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
    // LANDNING: på steget (beatHit) landar huvudet på sin nya lampa → kort vit pop
    // just där, exakt på slaget (även svag bas / utan BPM-lås). Övriga riggen blixtrar
    // fortfarande på en riktig dunk (punch). fastMode → kort utklang.
    const land = (d < 0.5 && c.beatHit) ? 0.8 : 0;
    const gnista = Math.max(c.punch, land);
    const v = Math.exp(-d * 1.7) * Math.min(1, 0.85 + c.beatPulse * 0.15 + c.kickEnv * 0.4 + land * 0.2) + c.punch * 0.35;
    return c.hsv(hue, 1 - gnista * 0.3, Math.min(1, v));   // dunk/landning → vit gnista
  },
};
