/** SVÅRA fall för BPM: nivådrift, svag bas, halvtakt-tvetydighet, låtbyte, brus. */
const mod = process.env.OLD ? "../dist/analyserOld.js" : "../dist/analyser.js";
const { Analyser } = await import(mod);
const { defaultConfig } = await import("../dist/config.js");
const RATE = 48000, HOP = 128;

const SEEDS = (process.env.SEEDS ? +process.env.SEEDS : 8);
const FLOOR_MS = 500;   // computeBpm() returnerar innan envFilled>=50 (0.5 s @100 Hz)

function run(gen, truth, durS, seed) {
  resetNoise(seed);
  const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
  an.setGainLock(true, 1);
  const buf = new Float32Array(HOP);
  let t = 0, lockMs = 0, ok = 0, tot = 0, cpu = 0;
  const hops = Math.floor(durS * RATE / HOP);
  for (let hop = 0; hop < hops; hop++) {
    for (let i = 0; i < HOP; i++, t++) buf[i] = gen(t / RATE);
    const ms = hop * HOP / RATE * 1000;
    an.setVirtualClock(ms);
    const a = process.hrtime.bigint();
    const f = an.process(buf);
    cpu += Number(process.hrtime.bigint() - a) / 1e6;
    const want = truth(ms / 1000);
    if (!lockMs && f.bpm > 0 && Math.abs(f.bpm - want) < want * 0.04) lockMs = ms;
    if (ms > durS * 1000 * 0.5) { tot++; if (Math.abs(f.bpm - want) < want * 0.04) ok++; }
  }
  return { lockMs: lockMs || NaN, acc: 100 * ok / tot, cpu: cpu / hops * 1000 };
}

const med = (a) => { const b = a.slice().sort((x, y) => x - y); const n = b.length;
  return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };

function sim(name, durS, gen, truth) {
  const r = [];
  for (let s = 0; s < SEEDS; s++) r.push(run(gen, truth, durS, 0x9e3779b9 + s * 0x85ebca6b));
  const locks = r.map(x => x.lockMs), accs = r.map(x => x.acc);
  const mL = med(locks), mA = med(accs);
  const floor = locks.filter(x => x <= FLOOR_MS).length;
  console.log(name.padEnd(26),
    "lås med", mL.toFixed(0).padStart(6), "ms",
    "[" + Math.min(...locks).toFixed(0) + "–" + Math.max(...locks).toFixed(0) + "]",
    floor ? ("golv " + floor + "/" + SEEDS).padEnd(11) : "".padEnd(11),
    "rätt med", mA.toFixed(0).padStart(3) + "%",
    "[" + Math.min(...accs).toFixed(0) + "–" + Math.max(...accs).toFixed(0) + "]",
    "cpu", med(r.map(x => x.cpu)).toFixed(0) + " µs/hop");
}
// Seedat brus (mulberry32) → bänken är bit-identisk mellan körningar.
let rngState = 0x9e3779b9;
const noise = () => {
  rngState = (rngState + 0x6d2b79f5) | 0;
  let x = rngState;
  x = Math.imul(x ^ (x >>> 15), 1 | x);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return (((x ^ (x >>> 14)) >>> 0) / 4294967296) * 2 - 1;
};
const resetNoise = (seed = 0x9e3779b9) => { rngState = seed | 0; };
const kick = (tt, beat, decay = 25) => Math.exp(-((tt % beat) / beat) * beat * decay) * Math.sin(2 * Math.PI * 58 * tt);

// 1. NIVÅDRIFT: långsam fade in/out över fönstret (testar whitening)
{ const b = 60 / 124;
  sim("nivådrift 124", 30, tt => (0.15 + 0.85 * (0.5 + 0.5 * Math.sin(tt / 3))) * (0.6 * kick(tt, b) + 0.2 * Math.exp(-((tt % (b/2))/(b/2))*b*80) * noise()) + 0.01 * noise(), () => 124); }
// 2. SVAG BAS, stark sång/pad (testar flerband: helbandsflux utsmetad)
{ const b = 60 / 132;
  sim("svag bas + pad 132", 30, tt => 0.12 * kick(tt, b) + 0.5 * Math.sin(2*Math.PI*300*tt) * (0.7+0.3*Math.sin(tt*1.7)) + 0.35 * Math.sin(2*Math.PI*440*tt+Math.sin(tt)) + 0.02*noise(), () => 132); }
// 3. HALVTAKT-TVETYDIGHET: kick bara på 1 och 3, hats på åttondelar
{ const b = 60 / 90, B = b * 2;
  sim("kick 1&3 (90)", 30, tt => 0.6 * Math.exp(-((tt % B)/B)*B*22) * Math.sin(2*Math.PI*58*tt) + 0.3 * Math.exp(-((tt % (b/2))/(b/2))*b*70)*noise() + 0.01*noise(), () => 90); }
// 4. LÅTBYTE utan tystnad: 128 → 146 vid 20 s
{ const b1 = 60/128, b2 = 60/146;
  sim("crossfade 128→146", 45, tt => { const b = tt < 20 ? b1 : b2; return 0.6*kick(tt,b) + 0.25*Math.exp(-((tt%(b/2))/(b/2))*b*80)*noise() + 0.02*noise(); }, s => s < 20 ? 128 : 146); }
// 5. BRUSIGT rum (mic): kick dränkt i brus
{ const b = 60/136;
  sim("brusigt rum 136", 30, tt => 0.35*kick(tt,b) + 0.22*noise() + 0.15*Math.sin(2*Math.PI*220*tt), () => 136); }

// 6. BREAKDOWN: basen försvinner 12–20 s (bara pad), sedan tillbaka. Takten ska HÅLLA.
{ const b = 60/142;
  sim("breakdown 142", 40, tt => { const on = tt < 12 || tt > 20;
    return (on ? 0.6*kick(tt,b) + 0.25*Math.exp(-((tt%(b/2))/(b/2))*b*80)*noise() : 0)
      + 0.3*Math.sin(2*Math.PI*280*tt)*(0.7+0.3*Math.sin(tt*2)) + 0.02*noise(); }, () => 142); }
// 7. SHUFFLE/triolkänsla 116 — mellanslag med egen accent
{ const b = 60/116;
  sim("shuffle 116", 30, tt => { const p = (tt % b)/b;
    return 0.6*Math.exp(-p*b*24)*Math.sin(2*Math.PI*58*tt)
      + 0.3*Math.exp(-(((tt+b*0.66)%b)/b)*b*60)*noise() + 0.02*noise(); }, () => 116); }
// 8. NÄRA OKTAVGRÄNS 158
{ const b = 60/158; sim("158 (nära gräns)", 30, tt => 0.6*kick(tt,b)+0.2*noise()*Math.exp(-((tt%(b/2))/(b/2))*b*80)+0.02*noise(), () => 158); }
