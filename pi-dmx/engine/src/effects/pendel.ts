import type { EffectDef } from "./types.js";

// PENDEL: en enda mjuk ljustopp svänger fram och tillbaka över riggen — men
// TAKTLÅST, ett helt svep per 8 taktslag. Lugn i tempot, ändå musikalisk: den
// vänder exakt på frasgränsen i stället för att glida ur fas med låten.
// (mclk stegar på taktslag när takt finns, annars på tid → fryser aldrig.)
export const pendel: EffectDef = {
  key: "pendel", label: "Pendel", tier: "lugn",
  desc: "En mjuk ljustopp svänger taktlåst över riggen, ett svep per fras.",
  render(c) {
    const step = c.mclk(1, 0.5);                      // ett steg per taktslag
    const phase = (step % 16) / 16;                   // 16 slag = fram och åter
    const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2;   // 0..1..0
    const pos = tri * (c.count - 1);
    const d = Math.abs(c.idx - pos);
    const glow = Math.exp(-d * 1.5);
    const hue = c.mixedSector(Math.floor(step / 16)) / 6;
    return c.hsv(hue, 1, Math.min(1, 0.08 + glow * (0.55 + c.audio * 0.45) + c.punch * 0.2));
  },
};
