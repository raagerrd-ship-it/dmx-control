import type { EffectDef } from "./types.js";
import { hsv, soft } from "./color.js";
const FX_REN = process.env.DMX_FX_REN === '1';   // PROV 2026-11-08 (kontraktet B): effektens diodanpassning bort, output (RGB_STRICT) tar dioderna

// Full fart: KRUSNING från MITTEN. v2 (2026-09-23): varje slag slar ner i MITTEN och krusningen VANDRAR utat - de inre
// lamporna tands pa slaget, de yttre en fjardedels slag senare, och varje ring klingar av som en vag som rullar ut.
// (v1 var "mitten ena takten, ytter nasta" - ett flip som matte rPerm 0,92-0,94 mot rave; publiken sag samma A/B-vaxling.
// Nu ar det en RORELSE ut fran mitten, inte en vaxling.) Krusningens HOJD skalas mot latens egen refrang (levelVsHighDb):
// 9 dB under refrangen ar den en liten krusning i mitten, vid refrangens niva slar den ut till kanterna med vit kam.
// Kontrastfarg pa ytterringen (som forr). <3 lampor: paritet = ring.
export const ripple: EffectDef = {
  key: "ripple", label: "Krusning", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
  desc: "Slaget slar ner i mitten och krusningen rullar utat, hogre ju narmare refrangens niva.",
  render(c) {
    const center = (c.count - 1) / 2;
    const d = Math.abs(c.lamp - center);                      // avstånd från mitten
    const maxD = center || 1;
    const ring = c.count < 3 ? (c.lamp % 2) : d / maxD;       // 0 = mitten .. 1 = kanten
    const isOuter = ring > 0.99;
    const lv = c.levelVsHighDb;
    const amp = lv !== 0 || c.section === 'high' ? Math.max(0.35, Math.min(1, 1 + lv / 9)) : 0.8;   // refrangskala
    const delay = ring * 0.25;                               // fjardedels slag ut till kanten
    let age = c.beatFrac - delay; if (age < 0) age += 1;     // slag sedan krusningen nadde DEN HAR ringen
    // EFFEKTSVEPET 11-02 (ägaren: 'fixa direkt de effekterna'; effectDyn alla effekter pop+mega 5 min): vågen slog på en ruta och klingade på 0,16 slag (hopp 0,033), den vita kammen tände
    // den släckta dioden och kulörparet byttes var 4:e slag. Nu mjuk våg (soft), kammen i kulör (ljusare, inte vit), paret per fras.
    const wave = soft(age, 0.1, 0.25) * (1 - ring * (1 - amp) * 0.8);   // yttre ringar svagare nar amp ar lag
    const pairBase = c.mixedSector(Math.floor(c.hueIdx / (FX_REN ? 4 : 16)));   // FX_REN: paret var 4:e slag (före 11-02)
    const hue = ((isOuter ? pairBase + 3 : pairBase) % 6) / 6;   // motfärg mitt vs ytter
    const crest = amp > 0.9 && isOuter ? wave * 0.25 : 0;        // kammen i kanten vid refrangens niva
    const v = 0.08 + wave * (0.45 + 0.45 * amp) + crest + c.audio * 0.15 + c.punch * 0.3;
    return hsv(hue, 1, Math.min(1, v));
  },
};
