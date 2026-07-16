import type { EffectDef } from "./types.js";

// SPEKTRUM: en spatial spektrumanalysator. Riggen sprids över dubbel-FFT:ns
// separerade band (låg-bas → luft) med en rainbow-färg per band (varmt lågt →
// kallt högt) och ljusstyrkan = bandets nivå. Per-band-AGC gör att varje band
// nyttjar full range oavsett mix — det AUTOMATISERAR den gamla handtrimmade
// per-band-gainen (diskanten behövde ×2.0 för att synas). Gamma 1.6 ger kontrast
// så ett tyst band blir mörkt. En enda lampa = full R/G/B-mix (låg/mel/hög).
// (Effekten är omedveten om master/beatPulse/VU — de ligger uniformt efter.)
export const eq: EffectDef = {
  key: "eq", label: "Spektrum", tier: "fart",
  desc: "Spatial spektrumanalysator: låg-bas→röd … diskant→blå, ljus = bandets nivå.",
  render(c) {
    const s = c.frame.spec;
    const bri = (v: number) => 0.04 + 0.96 * Math.pow(Math.min(1, v), 1.6);   // gamma-kontrast, golv 4%
    // Rainbow-kolumner: band + representativ färg, låg (varm) → hög (kall).
    const COLS: [number, number][] = [
      [Math.max(s.sub, s.bass), 0.00],   // låg-bas  → röd
      [s.lowMid,                0.08],   // låg-mel  → orange
      [s.mid,                   0.28],   // mel      → gulgrön
      [s.highMid,               0.40],   // hög-mel  → grön
      [s.treble,                0.52],   // diskant  → cyan
      [s.air,                   0.62],   // luft     → blå
    ];
    if (c.count <= 1) {
      // Enda lampa: klassisk full mix (låg=röd, mel=grön, hög=blå).
      const low = Math.max(s.sub, s.bass, s.kick);
      const hi = Math.max(s.treble, s.air);
      return [bri(low), bri(s.mid), bri(hi)];
    }
    // Sprid lamporna jämnt över kolumnerna → ett lågt-till-högt spektrum i rummet.
    const col = COLS[Math.round((c.idx / (c.count - 1)) * (COLS.length - 1))];
    return c.hsv(col[1], 1, bri(col[0]));
  },
};
