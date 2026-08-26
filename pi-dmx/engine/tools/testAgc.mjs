/** AGC-bänk: mäter hur ofta analysatorns `level` ligger pinnad i taket och hur
 *  mycket av insignalen som klipper efter gain. Mic-vägen (gain OLÅST).
 *
 *  Acceptans (Lotus-mätt): pinnad (level >= 0.95) < 15 %, klipp ~0 %, och en
 *  uppbyggnad ska SYNAS — level ska stiga när musiken svälls, inte redan ligga i tak.
 *  Kör: node tools/testAgc.mjs   (kräver npm run build)
 */
const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");
const RATE = 48000, HOP = 128;

let _s = 1;
const resetNoise = (seed) => { _s = seed >>> 0; };
const rnd = () => { _s = (_s + 0x6d2b79f5) >>> 0; let t = _s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** Rumsmic på 128 BPM: låg grundnivå, tydlig uppbyggnad 20→30 s, drop vid 30 s. */
function track(t) {
  const beat = 128 / 60;
  const env = Math.exp(-((t * beat) % 1) * 6);
  const build = t < 20 ? 0.35 : t < 30 ? 0.35 + 0.65 * ((t - 20) / 10) : 1;
  const kick = Math.sin(2 * Math.PI * 55 * t) * env;
  const bed = Math.sin(2 * Math.PI * 220 * t) * 0.25 + Math.sin(2 * Math.PI * 880 * t) * 0.12;
  return (kick + bed) * 0.05 * build + (rnd() - 0.5) * 0.002;   // ~ -30 dBFS mic
}

function run(seed) {
  resetNoise(seed);
  const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
  an.resetGain(20);                 // mic-seed, AGC olåst
  const buf = new Float32Array(HOP);
  let t = 0, pinned = 0, clip = 0, n = 0, sumLvl = 0;
  const phases = { intro: [], build: [], drop: [] };
  const hops = Math.floor(45 * RATE / HOP);
  for (let hop = 0; hop < hops; hop++) {
    for (let i = 0; i < HOP; i++, t++) buf[i] = track(t / RATE);
    const ms = hop * HOP / RATE * 1000;
    an.setVirtualClock(ms);
    const f = an.process(buf);
    const s = ms / 1000;
    if (s < 5) continue;            // hoppa AGC-inkörningen
    n++; sumLvl += f.level;
    if (f.level >= 0.95) pinned++;
    if (f.level >= 0.999) clip++;
    if (s < 18) phases.intro.push(f.level);
    else if (s > 22 && s < 29) phases.build.push(f.level);
    else if (s > 32) phases.drop.push(f.level);
  }
  const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
  return {
    pinnedPct: 100 * pinned / n,
    clipPct: 100 * clip / n,
    avg: sumLvl / n,
    intro: med(phases.intro), build: med(phases.build), drop: med(phases.drop),
  };
}

const rows = [];
for (let s = 0; s < 8; s++) rows.push(run(0x9e3779b9 + s * 0x85ebca6b));
const med = (f) => { const b = rows.map(f).sort((x, y) => x - y); return b[b.length >> 1]; };
const fmt = (x) => x.toFixed(2);

console.log("AGC-bänk (8 seeder, median):");
console.log(`  pinnad (level>=0.95): ${fmt(med(r => r.pinnedPct))} %   (krav < 15)`);
console.log(`  klipp  (level>=1.00): ${fmt(med(r => r.clipPct))} %   (krav ~0)`);
console.log(`  snittnivå:            ${fmt(med(r => r.avg))}`);
console.log(`  nivå intro/build/drop: ${fmt(med(r => r.intro))} / ${fmt(med(r => r.build))} / ${fmt(med(r => r.drop))}`);
const ok = med(r => r.pinnedPct) < 15 && med(r => r.clipPct) < 1 && med(r => r.build) > med(r => r.intro);
console.log(ok ? "\nOK — dynamiken syns och taket är fritt." : "\nFAIL — se kraven ovan.");
process.exit(ok ? 0 : 1);
