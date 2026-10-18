import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// SKUGGOR (full x break, situationsrutnätet 2026-10-12 - andra effekten i rutan, syskon efterskalv): breaket efter dropen. Ljuset
// vandrar symmetriskt in mot mitten: ytterparet på slagen 1 och 3, innerparet på 2 och 4, halv styrka och i var sin kulör - som
// skuggor av refrängen. Efterskalv slår halvtakt i en grupp; skuggor går ytter -> inner varje slag.
export const skuggor: EffectDef = {
  key: "skuggor", label: "Skuggor", tier: "full", modulate: { energy: true, pulse: false }, section: ["break"],
  desc: "Break i full fart: ytterparet och innerparet turas om på slagen, halv styrka, var sin kulör.",
  render(c) {
    const n = Math.max(1, c.count);
    const outer = c.lamp === 0 || c.lamp === n - 1;
    const on = ((c.beatIdx & 1) === 0) === outer;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((outer ? base : base + 2) % 6) / 6;
    // 10-13 (effectDyn): motorns grundnivå (FX_FLOOR 0,6) lyfter allt över ~0,1 till minst 64 % - "låg glöd" måste ligga på ~0,01-0,03.
    //   Spridningen var 0,27: vilan 0,05 -> 0,01 och pulsen klingar av till 0,02.
    return hsv(hue, 1, on ? 0.02 + 0.6 * Math.exp(-c.beatFrac / 0.3) : 0.01);
  },
};
