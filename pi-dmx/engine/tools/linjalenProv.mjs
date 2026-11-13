/** PROV: effekten linjalen (effects/linjalen.ts, 'own') ska ge SAMMA ljus som labb 6:s linjalen (lab6.ts) som ägaren godkände i ladan
 *  2026-11-13. Båda matas med samma 32 takter i 128 BPM på 8 lampor; effektens andel av ljuset görs om till nivå med output.ts lampLevel
 *  (det motorn gör för en effekt som äger ljuset) och jämförs med labbets nivå, lampa för lampa, efter 8 s insvängning.
 *  Dessutom: löparen har alltid en REN grundfärg som inte är grundens, och hålets lampa är exakt 0/0/0.   node tools/linjalenProv.mjs */
const { Lab6 } = await import("../dist/lab6.js");
const { linjalen } = await import("../dist/effects/linjalen.js");
const { lampLevel } = await import("../dist/output.js");
const N = 8, BPM = 128, DT = 25, beatMs = 60000 / BPM;
const fx = Array.from({ length: N }, () => ({ name: "x", address: 1, preset: "custom", roles: ["dim", "r", "g", "b"], cal: { off: 0, on: 16 } }));
const lab = new Lab6(); lab.fx = fx; lab.force = "linjalen";
let maxDiff = 0, n = 0, holes = 0, holeBad = 0, runBad = 0, runs = 0, fel = 0;
for (let t = 0; t < 32 * 4 * beatMs; t += DT) {
  const b = t / beatMs, beatIdx = Math.floor(b), beatFrac = b - beatIdx, kick = Math.exp(-beatFrac * 6), body = 0.35 + 0.3 * Math.sin(b * 0.7);
  const frame = { bpm: BPM, level: 1, spec: { sub: 0, kick: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0 } };
  const drum = { kick, snare: 0, hat: 0, bass: 0.5 };
  const lo = lab.tick({ beatIdx, beatFrac, hasBeat: true, bassBody: body, dropEnv: 0, section: "low", drum, frame }, N, 1e6 + t, 1);
  const hole = Math.floor(beatIdx / 16) % 2 === 1, k = beatIdx % 8, rev = Math.floor(beatIdx / 8) % 2 === 1, pos = rev ? N - 1 - k : k;
  let baseCol = "";
  const rows = [];
  for (let i = 0; i < N; i++) {
    const c = { count: N, lamp: i, now: 1e6 + t, beatIdx, beatFrac, hasBeat: true, bassBody: body, drum, frame, mixedSector: (x) => x, want: {} };
    const e = linjalen.render(c), m = Math.max(e[0], e[1], e[2]), lvl = m > 0 ? lampLevel(fx[i], m) : 0, lm = Math.max(lo[i * 3], lo[i * 3 + 1], lo[i * 3 + 2]);
    rows.push({ e, m, lvl, lm });
    if (t > 8000) { const d = Math.abs(lvl - lm); if (d > maxDiff) maxDiff = d; n++; }
  }
  if (t > 8000) {
    if (hole) { holes++; if (rows[pos].m !== 0) holeBad++; }
    else if (beatFrac > 0.15 && beatFrac < 0.9) {
      runs++; const r = rows[pos].e, other = rows[(pos + 4) % N].e;       // lampan mitt emot bär grundens kulör
      const pure = [r[0] > 0, r[1] > 0, r[2] > 0].filter(Boolean).length === 1, same = (r[0] > 0) === (other[0] > 0) && (r[1] > 0) === (other[1] > 0) && (r[2] > 0) === (other[2] > 0);
      if (!pure || (same && Math.max(...other) > 0)) runBad++;
    }
  }
}
const ok = (namn, v, detalj) => { if (!v) fel++; console.log(`${v ? "OK " : "FEL"} ${namn}  ${detalj}`); };
ok("samma ljus som labbversionen", maxDiff < 0.01, `största skillnad i nivå ${maxDiff.toFixed(4)} över ${n} lamprutor`);
ok("hålets lampa är exakt 0/0/0", holes > 0 && holeBad === 0, `${holeBad} av ${holes} rutor`);
ok("löparen har en ren grundfärg som inte är grundens", runs > 0 && runBad === 0, `${runBad} av ${runs} rutor`);
console.log(fel ? `\n${fel} FEL` : "\nALLT OK"); process.exit(fel ? 1 : 0);
