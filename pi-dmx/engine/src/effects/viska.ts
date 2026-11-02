import type { EffectDef } from "./types.js";
import { hsv, soft } from "./color.js";
import { slotSize } from "./rig.js";

// VISKA: nästan svart rum där bara PERKUSSIONEN syns. Ingen grundnivå att tala
// om — virvel och hi-hat tänder korta gnistor på var sin lampa, kicken ger en
// dov mörkröd puls. Byggd för en bar tidigt på kvällen: närvaro utan blink.
// Använder trum-envelopen (drum), som numera slår diskret i stället för att glöda.
export const viska: EffectDef = {
  key: "viska", label: "Viska", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["intro", "break"],
  desc: "Nästan mörkt — en mjuk glimt vandrar runt riggen på åttondelarna, starkare när hi-haten hörs.",
  flat: true,   // statiskt svep → kortare dwell
  render(c) {
    const d = c.drum;
    // VANDRANDE GNISTOR (2026-09-27): forut en fast trumrost per lampa (idx % 3) = samma figur som drumkit (rPerm 0,78-0,96 pa
    // ladans facit). Nu vandrar hi-hat-gnistan ett steg per attondel runt riggen, virveln slar pa en grupp i taget (jamn/udda
    // eller inre/yttre via c.grouping) och kicken ar en dov rod puls pa ALLA - viskningen ror sig, drumkit star.
    const g = slotSize(c.count), n = Math.max(1, Math.ceil(c.count / g)), me = Math.floor(c.idx / g), slot = Math.floor(c.lamp / g);   // hyrkitet: platser om g lampor
    const hatPos = c.hasBeat ? Math.floor((c.beatIdx + c.beatFrac) * 2) % n : c.mclk(0.5, 0.12) % n;
    // EFFEKTGENOMGÅNGEN 10-13 (effectDyn i intro/break: 144 kulörhopp/min per lampa - kulören hoppade mellan iskall/varmvit/röd
    // efter vilken trumma som gnistrade; vilo-glöden 0,20 lyftes av motorns grundnivå så 'nästan mörkt' blev halvljust): varje lampa
    // har nu en FAST kulör ur paletten (grannkulörer, byts per fras), vilan är nästan mörk, och gnistan är en mjuk glimt som vandrar
    // ett steg per åttondel (varje lampa högst en glimt per två slag) - hi-haten avgör bara hur stark glimten blir, aldrig om den
    // flimrar. Kick-pulsen (kick som NIVÅ mot basenergin) borttagen.
    const age = c.hasBeat ? (((c.beatIdx + c.beatFrac) * 2) % 1) : 0.5;
    // EFFEKTSVEPET 11-02 (ägaren: 'fixa direkt de effekterna'; effectDyn alla effekter pop+mega 5 min): glimten slog från nästan svart till fullt på en ruta (hopp 0,032) - nu mjuk uppgång.
    // Varje lampa klingar från SIN glimt (åttondelar sedan den träffades), så svansen inte klipps när glimten går vidare.
    const own = c.hasBeat ? ((((c.beatIdx + c.beatFrac) * 2 - me) % n) + n) % n : (hatPos === me ? age : n);
    const hat = soft(own, 0.3, 0.35) * (0.45 + 0.4 * Math.min(1, d.hat * 1.5));
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = (((slot & 1) ? base + 1 : base) % 6) / 6;
    return hsv(hue, 1, Math.min(1, 0.015 + hat));
  },
};
