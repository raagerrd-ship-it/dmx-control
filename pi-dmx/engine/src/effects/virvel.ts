import type { EffectDef } from "./types.js";

// VIRVEL (build, 2026-10-11): uppbyggnader har ofta en virvelrulle som tätnar. Varje virvelslag (drum.snare-flank) flyttar ljuset
// till nästa lampa runt riggen - rullen syns som en snurr som går fortare och fortare. Utan virvel: stegar på slaget. En kulör.
let pos = 0, armed = true, lastBeat = -1, stepBeat = -1;
export const virvel: EffectDef = {
  key: "virvel", label: "Virvel", tier: "fart", modulate: { energy: true, pulse: false }, section: ["build"], toggle: true,
  desc: "Uppbyggnad: varje virvelslag flyttar ljuset till nästa lampa - rullen snurrar runt riggen.",
  render(c) {
    const n = Math.max(1, c.count);
    if (c.idx === 0) {                                                // en gång per ruta (lampa 0 renderas först)
      const s = c.drum.snare;
      if (armed && s > 0.5 && c.beatIdx !== stepBeat) { pos = (pos + 1) % n; armed = false; stepBeat = c.beatIdx; }   // högst ett steg per slag (ägaren 10-12: 'inte kännas som en strobe')
      else if (s < 0.25) armed = true;
      if (c.beatIdx !== lastBeat && s < 0.1 && c.beatIdx !== stepBeat) { lastBeat = c.beatIdx; pos = (pos + 1) % n; stepBeat = c.beatIdx; }   // ingen virvel: steg på slaget
      else if (c.beatIdx !== lastBeat) lastBeat = c.beatIdx;
    }
    const hue = c.mixedSector(Math.floor(c.hueIdx / 16)) / 6;
    if (c.idx === pos) return c.hsv(hue, 1, 0.6 + 0.35 * c.buildUp);   // starkare mot dropen
    return c.hsv(hue, 1, 0);
  },
};
