import type { EffectDef } from "./types.js";

// Snabb LÖPARE: skarpt huvud som hoppar ETT steg per taktslag, kort svans, och
// BYTER ren färg medan det springer → rytmiskt och gles, inte en full färgvåg
// (wave). + hi-hat-glitter: diskant-anslaget (onset.treble) ger en snabb gnista
// på huvudet, samma pigga tick som wave fick.
export const chase: EffectDef = {
  key: "chase", label: "Jakt", tier: "fart", modulate: { energy: true, pulse: false }, section: ["low", "high"], toggle: true,
  desc: "En ljuspunkt springer i takt och byter färg.",
  render(c) {
    // BASNOTER (2026-09-23): vid tydlig basgang (bassline >= 0,6) hoppar huvudet ett steg per BASNOT (ping-pong) i stallet for
    // per slag, och svansen klingar med noten - loparen foljer basgangen, inte bara takten.
    const onBass = c.bassline >= 0.6;
    // LOPARE MED SVANS (2026-09-27): huvudet springer ETT VARV v->h och borjar om (wrap), svansen ligger BAKOM i lopriktningen.
    // Forut ping-pongade huvudet (chasePos, cfg.chaseStyle 'pingpong') med symmetrisk svans = samma figur som bounce (som ocksa
    // ping-pongar ett steg per slag) - pa fyra lampor tva likadana effekter i samma pool. Steg: basnot vid tydlig basgang,
    // annars slaget (mclk faller tillbaka pa klockan utan takt).
    const n = Math.max(1, c.count);
    const pos = (onBass ? c.bassNoteIdx : c.mclk(1, 0.5)) % n;
    const d = (pos - c.idx + n) % n;                                      // 0 = huvudet, 1 = lampan bakom, ... (framfor = morkt)
    const tail = Math.exp(-d * 1.6) * (onBass ? 0.55 + 0.45 * Math.exp(-c.bassNoteAge / 0.3) : 1);
    // KULOR PER TAKT (ladan 2026-10-09, fladder pa sekundarfargen): forr mixedSector(pos + ...) - hela riggen bytte kulor pa VARJE steg
    // och sidokanalen slog av/pa (bank: chase 102 korta sidoblink, flest av alla). Loparen springer som forr; kuloren byts per takt.
    const hue = c.mixedSector(Math.floor(c.beatIdx / 4)) / 6;   // beatIdx stegar pa grid eller kick - en klocka, inget hopp nar laset fladdrar
    const v = Math.min(1, tail * c.shaped(0.22, 0.55 + c.audio * 0.55 + c.kickEnv * 0.5 + c.trebleEnv * 0.35 + (onBass ? c.frame.onset.bass * 0.4 : 0)) + c.punch * 0.3);
    return c.hsv(hue, 1 - c.punch * 0.25, v * c.heart(0.3));   // riktig dunk → hela svansen blixtrar; egen hjartpuls (09-27)
  },
};
