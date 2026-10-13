import type { EffectDef } from "./types.js";

// DROPPAR (lugn x refräng, situationsrutnätet 2026-10-12 - syskon svall/famn/kaskad): en lugn refräng med basgång. Varje basnot
// (c.bassNoteIdx, vid tydlig basgång) faller som en droppe i en ny lampa (hash) och klingar av långsamt; förra droppen syns ännu
// svagare i grannkulören. Utan tydlig basgång faller en droppe per två slag. Övriga lampor ligger nästan mörka.
export const droppar: EffectDef = {
  key: "droppar", label: "Droppar", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["high"],
  desc: "Lugn refräng: varje basnot faller som en droppe i en ny lampa och klingar av långsamt.",
  render(c) {
    const n = Math.max(1, c.count);
    const clear = c.bassline >= 0.6;
    const beatS = c.cfg.beat?.bpm ? 60 / c.cfg.beat.bpm : 0.5;
    const idx = clear ? c.bassNoteIdx : Math.floor(c.beatIdx / 2);     // utan basgång: halvtakt (en droppe per två slag)
    const age = clear ? c.bassNoteAge : ((((c.beatIdx % 2) + 2) % 2) + c.beatFrac) * beatS;   // sekunder sedan droppen
    const h = (x: number) => (Math.imul(x + 11, 2654435761) >>> 0) % n;
    const cur = h(idx);
    let prev = h(idx - 1); if (prev === cur) prev = (cur + 1) % n;
    // EFFEKTGENOMGÅNGEN 10-13 (effectDyn: 70,9 kulörhopp/min - lampan bytte kulör när den gick från 'droppe' till 'förra droppen'
    // till vila, varje basnot): FAST kulör per lampa (grannkulörer), bara ljuset faller och klingar av. Vilan 0,04 -> 0,015 (motorns
    // grundnivå lyfte 0,04 till en tredjedel).
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = (((c.lamp & 1) ? base + 1 : base) % 6) / 6;
    if (c.lamp === cur) return c.hsv(hue, 0.95, Math.min(1, 0.08 + 0.85 * Math.exp(-age / 1.4)));
    if (c.lamp === prev) return c.hsv(hue, 0.95, 0.06 + 0.45 * Math.exp(-(age + 0.4) / 1.4));
    return c.hsv(hue, 1, 0.015);
  },
};
