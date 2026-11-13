/** PROV AV LABB 6 (lab6.ts): varje idé körs 16 takter i 128 BPM på 8 lampor. Kontrollerar: inga NaN, allt inom 0..1, varje lampa används,
 *  ingen lampa tänds oftare än 3 ggr/s (strobe-regeln), och skriver en liten bild av en takt per idé.   node tools/lab6Prov.mjs */
const { Lab6 } = await import("../dist/lab6.js");
const N = 8, BPM = 128, DT = 25, beatMs = 60000 / BPM; let fel = 0;
const fx = Array.from({ length: N }, () => ({ name: "x", address: 1, preset: "custom", roles: ["dim", "r", "g", "b"], cal: { off: 0, on: 16 } }));
for (const idea of ["linjalen", "vagen", "trappan", "svaret", "tvakorer"]) {
  const lab = new Lab6(); lab.fx = fx; lab.force = idea;
  const on = new Array(N).fill(false), ups = new Array(N).fill(0), mx = new Array(N).fill(0); let bad = 0; const bild = [];
  for (let t = 0; t < 16 * 4 * beatMs; t += DT) {
    const b = t / beatMs, beatIdx = Math.floor(b), beatFrac = b - beatIdx, kick = Math.exp(-beatFrac * 6), snare = beatIdx % 2 === 1 ? Math.exp(-beatFrac * 8) : (idea === "trappan" && (b * 4) % 1 < 0.2 ? 0.9 : 0);
    const c = { beatIdx, beatFrac, hasBeat: true, bassBody: 0.7, dropEnv: 0, section: idea === "trappan" ? "build" : "high", drum: { kick, snare, hat: 0, bass: 0.6 }, frame: { bpm: BPM, spec: { sub: 0, kick: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0 } } };
    const o = lab.tick(c, N, 1e6 + t, 1);
    for (let i = 0; i < N; i++) {
      const v = Math.max(o[i * 3], o[i * 3 + 1], o[i * 3 + 2]); if (!(v >= 0 && v <= 1)) bad++;
      if (v > mx[i]) mx[i] = v;
      if (!on[i] && v > 0.25) { on[i] = true; ups[i]++; } else if (on[i] && v < 0.12) on[i] = false;
    }
    if (beatIdx >= 8 && beatIdx < 12 && Math.round(t / DT) % Math.round(beatMs / 4 / DT) === 0) bild.push(Array.from({ length: N }, (_, i) => " .:-=+*#%@"[Math.min(9, Math.floor(Math.max(o[i * 3], o[i * 3 + 1], o[i * 3 + 2]) * 10))]).join(""));
  }
  const s = 16 * 4 * beatMs / 1000, rate = Math.max(...ups) / s, ok = bad === 0 && rate <= 3 && (idea === "trappan" || mx.every((v) => v > 0.2));
  if (!ok) fel++;
  console.log(`${ok ? "OK " : "FEL"} ${idea.padEnd(9)} tändningar/s per lampa högst ${rate.toFixed(2)}  toppnivå per lampa ${mx.map((v) => v.toFixed(2)).join(" ")}  utanför 0..1: ${bad}`);
  console.log("    en takt, 16-delar (lampa 1..8 per kolumn):  " + bild.join(" | "));
}
console.log(fel ? `\n${fel} FEL` : "\nALLT OK"); process.exit(fel ? 1 : 0);
