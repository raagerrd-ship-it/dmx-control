import type { EffectDef } from "./types.js";

// GLIMT (fart x break, situationsrutnätet 2026-10-12 - rutan hade en effekt): breaket i en fartfylld låt - basen är borta men hi-hats
// och cymbaler fortsätter. Riggen glöder svagt och varje diskantanslag (c.trebleEnv) tänder en glimt i EN lampa som byter för varje
// åttondel (hash), så det gnistrar runt riggen utan att lysa upp allt.
export const glimt: EffectDef = {
  key: "glimt", label: "Glimt", tier: "fart", modulate: { energy: true, pulse: false }, section: ["break"],
  desc: "Break i fart: nästan mörkt, en mjuk glimt per slag i en ny lampa - starkare när diskanten hörs.",
  render(c) {
    const n = Math.max(1, c.count);
    // EFFEKTGENOMGÅNGEN 10-13 (effectDyn i breaket: 104 kulörhopp/min - den valda lampan bytte till motfärg varje åttondel, och
    // trebleEnv som NIVÅ gav fladder; golvet 0,1 lyftes av motorns grundnivå): en glimt per SLAG i en ny lampa (aldrig samma två slag
    // i rad), mjuk avklingning, fast kulör per lampa. Diskanten avgör bara hur stark glimten blir.
    const sel0 = (b: number) => (Math.imul(b + 5, 2654435761) >>> 0) % n;
    let sel = sel0(c.beatIdx); if (n > 1 && sel === sel0(c.beatIdx - 1)) sel = (sel + 1) % n;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    const hue = (((c.lamp & 1) ? base + 3 : base) % 6) / 6;
    const g = c.idx === sel ? Math.exp(-c.beatFrac / 0.3) * (0.5 + 0.5 * Math.min(1, c.trebleEnv * 1.5)) : 0;
    return c.hsv(hue, 0.9, Math.min(1, 0.015 + 0.85 * g));
  },
};
