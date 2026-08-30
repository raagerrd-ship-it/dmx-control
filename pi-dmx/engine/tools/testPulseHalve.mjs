/** PRESENTATIONSTAKT: över 135 BPM ska hjärtslaget pulsa på VARANNAT slag, och
 *  hysteresen (15 BPM) ska hålla halveringen kvar hela vägen ner till 120.
 *  Mäter pulstoppar per minut på DMX-utgången med virtuell klocka. */
const { EffectEngine } = await import("../dist/effects.js");
const { defaultConfig } = await import("../dist/config.js");

const frame = {
  level: 0.6, levelRaw: 0.6, levelVU: 0.6, energy: 0.5, centroid: 0.4, flux: 0.1,
  kick: false, gain: 1, bpm: 0, bpmConfidence: 0.9, intensity: 0.5,
  dropCount: 0, inZone: false, breaking: false, buildUp: 0, inRiser: false,
  punch: 0.5, glide: 0.5, warmth: 0.5, busy: 0.5,
  spec: { bass: 0.5, mid: 0.4, treble: 0.3, kick: 0.4, sub: 0.3, bands: new Float32Array(9) },
  onset: { kick: 0.2, sub: 0.15 },
  beatAnchorMs: 0, kickAtMs: 0, barShift: 0, silence: false,
};

const realNow = Date.now, realPerf = performance.now.bind(performance);

/** Kör en tempo-sekvens på EN motor (så hysteresen mäts) och returnerar
 *  pulstoppar/min för varje steg. Toppar räknas som uppåtkorsningar av mittnivån. */
function run(seq, secPerStep) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  cfg.beatPulse = true;
  cfg.mode = "mono";
  const eng = new EffectEngine(cfg);
  const out = [];
  let ms = 1700000000000;
  const STEP = 5;
  for (const bpm of seq) {
    cfg.beat = { anchorMs: ms, bpm, confidence: 1 };
    const samples = [];
    for (let k = 0; k < (secPerStep * 1000) / STEP; k++, ms += STEP) {
      Date.now = () => ms;
      performance.now = () => ms - 1700000000000;
      const u = eng.render({ ...frame, bpm });
      let v = 0;
      for (let i = 0; i < u.length; i++) v += u[i];
      samples.push(v);
    }
    // Sista halvan (inkörd) → mittnivå-korsningar uppåt = pulser.
    const tail = samples.slice(samples.length >> 1);
    const lo = Math.min(...tail), hi = Math.max(...tail), mid = (lo + hi) / 2;
    let above = tail[0] > mid, cross = 0;
    for (const v of tail) {
      if (!above && v > mid) { cross++; above = true; }
      else if (above && v < mid) above = false;
    }
    const sec = (tail.length * STEP) / 1000;
    out.push({ bpm, ppm: (cross / sec) * 60, span: hi - lo });
  }
  return out;
}

// 100 (full takt) → 157 (halveras) → 128 (hysteres: kvar halverad) → 110 (släpper)
const seq = [
  { bpm: 100, want: [92, 108] },
  { bpm: 157, want: [72, 86] },
  { bpm: 128, want: [58, 70] },
  { bpm: 110, want: [102, 118] },
];
const res = run(seq.map((s) => s.bpm), 40);
Date.now = realNow; performance.now = realPerf;

let fail = 0;
res.forEach((r, i) => {
  const w = seq[i].want;
  const ok = r.ppm >= w[0] && r.ppm <= w[1];
  if (!ok) fail++;
  console.log(`bpm ${r.bpm}  puls ${r.ppm.toFixed(1)}/min  förväntat ${w[0]}–${w[1]}  amplitud ${r.span.toFixed(0)}  ${ok ? "OK" : "FEL"}`);
});
if (fail) { console.log("MISSLYCKADES"); process.exit(1); }
console.log("OK");
