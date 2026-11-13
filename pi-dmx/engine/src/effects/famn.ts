import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// FAMN (lugn x refräng, situationsrutnätet 2026-10-12 - andra effekten i rutan, syskon svall): en lugn refräng som öppnar sig.
// Mittlamporna håller en varm, stilla glöd; ytterlamporna blommar ut på taktens etta och klingar av över hela takten - riggen
// omfamnar mitten. Svall andas fram och tillbaka på två slag; famn slår en gång per takt.
// OMTAGGNING 2026-11-05 (dagkörning 2, dynamik.md): fart-tier men refrängen med full tier har bara full-poolen -> tier full (natt --snabb: kvällen unika 69->70, resten lika).
export const famn: EffectDef = {
  key: "famn", label: "Famn", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"],
  desc: "Lugn refräng: famnen sluter sig från kanterna på ettan och öppnar sig från mitten på trean, över en stilla glöd.",
  render(c) {
    // ÅTTA LAMPOR (ägaren i ladan 2026-11-13: "är rätt tråkig, så förändra som du känner"): på åtta lampor blommade bara lampa 1 och 8
    // medan sex låg på svag glöd. Nu rör sig famnen över hela raden, i takt: på ETTAN sluter den sig - kanterna tänds först och ljuset
    // rullar inåt en åttondel per lamppar; på TREAN öppnar den sig igen, svagare, från mitten och utåt. Varje lampa klingar länge
    // (1,4 slag), så vågorna flyter i varandra. Under vågen ligger den stilla glöden kvar i grundkulören.
    const n = Math.max(1, c.count), R = Math.ceil(n / 2), e = Math.min(c.lamp, n - 1 - c.lamp);   // e = 0 på kanten .. R-1 i mitten
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const tb = (((c.beatIdx % 4) + 4) % 4) + c.beatFrac;               // slag in i takten, 0..4
    const env = (s: number) => { let a = tb - s; if (a < 0) a += 4; return Math.min(1, a / 0.08) * Math.exp(-a / 1.4); };
    const wave = c.hasBeat ? Math.max(env(e * 0.5), 0.55 * env(2 + (R - 1 - e) * 0.5)) : 0;
    // 10-13 (effectDyn): motorns grundnivå (FX_FLOOR 0,6) lyfter allt över ~0,1 till minst 64 % - "låg glöd" måste ligga på ~0,01-0,03.
    if (wave < 0.04) return hsv(base / 6, 0.9, 0.03 * c.heart(0.15));  // glöden; kulörbytet till vågens kulör sker härnere, på mörk lampa
    return hsv(((base + 1) % 6) / 6, 1, Math.min(1, 0.01 + 0.9 * wave));
  },
};
