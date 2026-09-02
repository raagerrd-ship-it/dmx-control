// MATER OVERHANGANDE TILLSTAND MELLAN LATAR.
// Live-motorn ser latarna i foljd genom EN analysator; banken har hittills bara
// kort FARSKA instanser per klipp. Skillnaden ar stor: samma ljud gav 100 % ratt
// offline och helt fel lock live. Detta harness reproducerar live-fallet:
// spelar lat A, anropar hintTrackChange(), spelar lat B -- och poangsatter B.
//
//   node tools/carryOver.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");

const HOP = 128, SR = 48000;
import { loadCatalog, lookup, fold } from "./catalog.mjs";
const cat = loadCatalog();
// Klipp utanfor korpusen, med facit fran anvandaren
const extra = [["tools/utandig.wav", 90], ["tools/drickervin.wav", 124], ["tools/stranden.wav", 114]];

const clips = [];
const DIR = process.argv[2] || "tools/corpus", mp = join(DIR, "manifest.tsv");
if (existsSync(mp)) {
  for (const l of readFileSync(mp, "utf8").split("\n").slice(1)) {
    const c = l.split("\t");
    if (c.length < 6) continue;
    const rec = lookup(cat, c[1], c[2]);
    const p = join(DIR, c[5].trim());
    if (rec && existsSync(p)) clips.push({ p, name: c[2], bpm: rec.bpm });
  }
}
for (const [p, b] of extra) if (existsSync(p)) clips.push({ p, name: p.split("/").pop(), bpm: b });
if (clips.length < 2) { console.log("  behover minst 2 markta klipp"); process.exit(0); }

const pcm = (p) => {
  const d = readFileSync(p);
  return { d, n: d.readUInt32LE(40) / 2 };
};
// spelar ett klipp genom `an` fran tiden t0; returnerar {bpms, tEnd}
function run(an, clip, t0, collectFrom) {
  const { d, n } = pcm(clip.p);
  const buf = new Float32Array(HOP);
  const out = [];
  let ms = t0;
  for (let off = 0; off + HOP <= n; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
    ms = t0 + (off / SR) * 1000;
    an.setVirtualClock(ms);
    const fr = an.process(buf);
    if (collectFrom != null && ms - t0 >= collectFrom && fr.bpm > 0) out.push(fr.bpm);
  }
  return { out, tEnd: ms };
}
const score = (bpms, bpm) => {
  if (!bpms.length) return { ok: 0, med: 0 };
  const s = [...bpms].sort((a, b) => a - b);
  const tf = fold(bpm);
  return { ok: (100 * bpms.filter((b) => Math.abs(b / tf - 1) <= 0.04).length) / bpms.length, med: s[s.length >> 1] };
};

console.log(`  ${clips.length} markta klipp -> ${clips.length - 1} overgangar\n`);
let sumF = 0, sumC = 0, n = 0;
for (let i = 1; i < clips.length; i++) {
  const A = clips[i - 1], B = clips[i];

  const fresh = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
  fresh.setGainLock(true, 1);
  const f = score(run(fresh, B, 0, 5000).out, B.bpm);

  const carry = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
  carry.setGainLock(true, 1);
  const a = run(carry, A, 0, null);
  carry.hintTrackChange(5000);
  const c = score(run(carry, B, a.tEnd + 20, 5000).out, B.bpm);

  sumF += f.ok; sumC += c.ok; n++;
  const flag = f.ok - c.ok >= 20 ? "  <== TAPP" : "";
  console.log(`  ${B.name.slice(0, 30).padEnd(30)} facit ${String(B.bpm).padStart(3)}` +
    ` | farsk ${String(Math.round(f.ok)).padStart(3)}% (${f.med})` +
    ` | efter "${A.name.slice(0, 16)}" ${String(Math.round(c.ok)).padStart(3)}% (${c.med})${flag}`);
}
console.log(`\n  SNITT  farsk ${(sumF / n).toFixed(1)} %   med overhang ${(sumC / n).toFixed(1)} %` +
            `   -> tillstandet kostar ${((sumF - sumC) / n).toFixed(1)} procentenheter`);
