import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";

// SPEKTRUM: en spatial spektrumanalysator. Riggen sprids över dubbel-FFT:ns
// separerade band (låg-bas → luft) med en rainbow-färg per band (varmt lågt →
// kallt högt) och ljusstyrkan = bandets nivå. Per-band-AGC gör att varje band
// nyttjar full range oavsett mix — det AUTOMATISERAR den gamla handtrimmade
// per-band-gainen (diskanten behövde ×2.0 för att synas). Gamma 1.6 ger kontrast
// så ett tyst band blir mörkt. En enda lampa = full R/G/B-mix (låg/mel/hög).
// (Effekten är omedveten om master/beatPulse/VU — de ligger uniformt efter.)
// gamma-kontrast, golv 4% (skrapjakten 10-01: forr en closure + en 6x2-tabell per lampa och ruta; nu modulniva)
const bri = (v: number) => 0.04 + 0.96 * Math.pow(Math.min(1, v), 1.6);
const COL_HUE = [0.00, 0.08, 0.28, 0.40, 0.52, 0.62];
const HUE8 = [0.00, 0.04, 0.08, 0.14, 0.25, 0.38, 0.50, 0.62];   // sub röd, kick, bas orange, låg-mel, mel gulgrön, hög-mel grön, diskant cyan, luft blå
export const eq: EffectDef = {
  key: "eq", label: "Spektrum", tier: "fart", section: ["low", "build"],
  desc: "Spatial spektrumanalysator: låg-bas→röd … diskant→blå, ljus = bandets nivå.",
  render(c) {
    const s = c.frame.spec, o = c.frame.onset;
    // Rainbow-kolumner: band + representativ färg, låg (varm) → hög (kall).
    // LÅG halva på NIVÅ (spec) → sustained bas som "andas". HÖG halva på ANSLAG
    // (onset) → perkussion "tickar" skarpt i st.f. att sång/pads smetar kolumnerna.
    //   0 låg-bas  → röd    (nivå)    max(sub, bass)
    //   1 låg-mel  → orange (nivå)    lowMid
    //   2 mel      → gulgrön(nivå)    mid
    //   3 hög-mel  → grön   (anslag)  onset.highMid
    //   4 diskant  → cyan   (anslag)  onset.treble
    //   5 luft     → blå    (anslag)  onset.air        (nyanserna i COL_HUE)
    if (c.count <= 1) {
      // Enda lampa: klassisk full mix (låg=röd, mel=grön, hög=blå).
      const low = Math.max(s.sub, s.bass, s.kick);
      const hi = Math.max(s.treble, s.air);
      return [bri(low), bri(s.mid), bri(hi)];
    }
    // ÅTTA LAMPOR ELLER FLER (ägaren i ladan 2026-11-13: "fixa för 8"): analysatorn har åtta band - varje lampa får sitt eget (förr sex
    // kolumner, så orange och cyan låg dubbelt). Sub, bas, låg-mel och mel följer NIVÅN och pumpar i takten; kickbandet och de tre
    // översta följer ANSLAGEN (kicken slår i lampa 2, virvel/hi-hat/cymbal tickar i 6-8). Under åtta lampor: sex kolumner som förr.
    if (c.count >= 8) {
      const b = Math.round((c.idx / (c.count - 1)) * 7);
      const l8 = b === 0 ? s.sub : b === 1 ? o.kick : b === 2 ? s.bass : b === 3 ? s.lowMid : b === 4 ? s.mid : b === 5 ? o.highMid : b === 6 ? o.treble : o.air;
      return hsv(HUE8[b], 1, bri(l8) * (b === 0 || (b >= 2 && b <= 4) ? c.heart(0.55) : 1));
    }
    // Sprid lamporna jämnt över kolumnerna → ett lågt-till-högt spektrum i rummet.
    const ci = Math.round((c.idx / (c.count - 1)) * (COL_HUE.length - 1));
    const lvl = ci === 0 ? Math.max(s.sub, s.bass) : ci === 1 ? s.lowMid : ci === 2 ? s.mid : ci === 3 ? o.highMid : ci === 4 ? o.treble : o.air;
    // NIVA-kolumnerna (bas/mellan, index 0-2) ar sustained -> pa fyra lampor lag lampa 0-1 konstant tanda medan
    // anslagskolumnerna 2-3 tickade (agaren 09-27: "en lampa som lyser konstant"). Nu pumpar nivakolumnerna djupt i
    // takten; anslagskolumnerna lamnas ororda (de tickar redan).
    return hsv(COL_HUE[ci], 1, bri(lvl) * (ci <= 2 ? c.heart(0.55) : 1));
  },
};
