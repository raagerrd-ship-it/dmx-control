import type { EffectDef } from "./types.js";

// NEDRAKNING (build, 2026-09-21): en visuell nedrakning i 8-slagscykler: slag 0-6 slacks lamporna en i taget utifran och in,
// slag 7 tands ALLT i vitt - och cykeln borjar om, tatare mot slutet av risern (buildUp). Nar dropen kommer (dropEnv) landar
// den i blinder + fullt ljus. Hazer stiger med risern.
export const nedrakning: EffectDef = {
  key: "nedrakning", label: "Nedrakning", tier: "fart", modulate: { energy: true, pulse: false }, section: ["build"],
  desc: "Uppbyggnad: lamporna slacks en i taget utifran och in, allt tands pa attan - om och om igen till dropen.",
  drives: ["hazer", "blinder"],
  render(c) {
    const b = c.frame.buildUp;
    // FORUTSEDD REFRANG (2026-09-23): med expectHighInMs raknas STEGEN bakat fran refrangen sa att "allt tands" (sista steget)
    // landar exakt pa det forutsedda slaget - inte pa en godtycklig atta. Tatare (4-cykel) sista 16 slagen. Utan
    // forutsagelse: 8-slagscykler pa beatIdx som forr.
    const bpm = c.cfg.beat?.bpm ?? 0; const beatMs = bpm > 0 ? 60000 / bpm : 500;
    const beatsLeft = c.expectHighInMs > 0 ? c.expectHighInMs / beatMs : -1;
    const cyc = beatsLeft >= 0 ? (beatsLeft > 16 ? 8 : 4) : (b > 0.7 ? 4 : 8);   // tatare nedrakning sist
    const step = beatsLeft >= 0 ? ((cyc - 1 - Math.floor(beatsLeft)) % cyc + cyc) % cyc : ((c.beatIdx % cyc) + cyc) % cyc;
    const half = (c.count - 1) / 2;
    const ring = Math.abs(c.idx - half);                             // 0 = mitten, storst i kanten
    const maxRing = Math.max(1, half);
    const off = step < cyc - 1 && ring > maxRing * (1 - step / (cyc - 1)) - 1e-6;   // slackt om lampan "raknats ner"
    const all = step === cyc - 1 ? Math.exp(-c.beatFrac / 0.15) : 0;
    const hue = c.mixedSector(Math.floor(c.beatIdx / cyc)) / 6;
    c.want.hazer = 0.3 + 0.7 * b; if (c.dropEnv > 0.6) c.want.blinder = c.dropEnv;
    const base = off ? 0.03 : 0.35 + 0.35 * b + c.beatPulse * 0.25;
    const v = Math.min(1, base + all * 0.9 + c.dropEnv);
    return c.hsv(hue, 1 - all * 0.9, v);
  },
};
