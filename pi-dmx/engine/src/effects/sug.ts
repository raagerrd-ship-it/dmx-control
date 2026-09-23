import type { EffectDef } from "./types.js";

// SUG (build, 2026-09-21): slutet av uppbyggnaden. Nar analysatorns riser (buildUp) passerar 0,6 SUGS ljuset ner mot
// nastan svart - bara en smal, allt snabbare puls i mitten - medan hazern stiger, sa dropen far landa i tom luft
// (blinder + fullt ljus via dropEnv). Fore 0,6 beter den sig som en morkare stegring. Dirigenten valjer den i build
// tillsammans med stegring; band vald look for hela sektionen.
export const sug: EffectDef = {
  key: "sug", label: "Sug", tier: "fart", modulate: { energy: true, pulse: false }, section: ["build"],
  desc: "Uppbyggnadens slut: ljuset sugs ner, pulsen tatnar, hazer upp - dropen landar i tomrum.",
  drives: ["hazer", "blinder", "uv"],
  render(c) {
    const b = c.frame.buildUp;
    // FORUTSEDD REFRANG (2026-09-23): de sista 4 takterna fore en vantad refrang (expectHighInMs) sugs ljuset ner aven om
    // risern inte hors - suget landar pa forutsagelsen. Storsta av riser och forutsagelse.
    const bpm = c.cfg.beat?.bpm ?? 0; const barMs = bpm > 0 ? 240000 / bpm : 2000;
    const lateEx = c.expectHighInMs > 0 ? Math.max(0, 1 - c.expectHighInMs / (4 * barMs)) : 0;
    const late = Math.max(lateEx, (b - 0.6) / 0.4);                             // 0 -> 1 sista biten av risern
    const every = late > 0.66 ? 1 : late > 0.33 ? 2 : 4;
    const onBeat = c.hasBeat && c.beatIdx % every === 0;
    const pulse = onBeat ? Math.exp(-c.beatFrac / 0.08) : 0;
    const center = 1 - Math.abs((c.idx + 0.5) / c.count - 0.5) * 2;              // 1 i mitten, 0 i kanten
    const hue = c.mixedSector(Math.floor(c.t / 9)) / 6;
    const base = (0.35 + 0.3 * Math.min(1, b / 0.6)) * (1 - late * 0.92);        // sugs ner mot svart
    c.want.hazer = 0.4 + 0.6 * Math.max(late, b * 0.5); c.want.uv = late * 0.8;
    if (c.dropEnv > 0.6) c.want.blinder = c.dropEnv;
    const v = base + pulse * (0.25 + 0.6 * late) * (0.4 + 0.6 * center) + c.dropEnv;
    return c.hsv(hue, 1 - late * 0.5, Math.min(1, v));
  },
};
