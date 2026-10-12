import type { EffectDef } from "./types.js";

// GLIMT (fart x break, situationsrutnätet 2026-10-12 - rutan hade en effekt): breaket i en fartfylld låt - basen är borta men hi-hats
// och cymbaler fortsätter. Riggen glöder svagt och varje diskantanslag (c.trebleEnv) tänder en glimt i EN lampa som byter för varje
// åttondel (hash), så det gnistrar runt riggen utan att lysa upp allt.
export const glimt: EffectDef = {
  key: "glimt", label: "Glimt", tier: "fart", modulate: { energy: true, pulse: false }, section: ["break"],
  desc: "Break i fart: svag glöd och en glimt i en lampa på varje diskantanslag.",
  render(c) {
    const n = Math.max(1, c.count);
    const k = Math.imul(c.beatIdx * 2 + (c.beatFrac >= 0.5 ? 1 : 0), 2654435761) >>> 0;   // åttondelens hash
    const sel = k % n;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = ((c.idx === sel ? base + 3 : base) % 6) / 6;
    const g = c.idx === sel ? Math.min(1, c.trebleEnv * 1.2) : 0;
    return c.hsv(hue, 0.9, Math.min(1, 0.1 + 0.85 * g));
  },
};
