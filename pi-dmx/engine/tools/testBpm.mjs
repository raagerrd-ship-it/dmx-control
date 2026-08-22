/** Tid-till-lås + träffsäkerhet för BPM. Syntetisk "låt": kick fyra-på-golvet,
 *  hi-hat på åttondelar, plus sångliknande sustain-lager och brus. */
const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");

const RATE = 48000, HOP = 128;
function run(bpm, { swing = false, sustain = 0.25 } = {}) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  const an = new Analyser(cfg);
  an.setGainLock(true, 1);
  const beat = 60 / bpm;
  const buf = new Float32Array(HOP);
  let t = 0, lockMs = 0, ok = 0, tot = 0, lastBpm = 0;
  for (let hop = 0; hop < Math.floor(30 * RATE / HOP); hop++) {
    for (let i = 0; i < HOP; i++, t++) {
      const tt = t / RATE;
      const ph = (tt % beat) / beat;
      const eighth = (tt % (beat / 2)) / (beat / 2);
      // kick: 60 Hz sinus med snabb decay på slaget
      const kEnv = Math.exp(-ph * beat * 25);
      const hEnv = Math.exp(-eighth * beat * 90) * (swing && Math.floor(tt / (beat / 2)) % 2 ? 0.4 : 0.7);
      buf[i] = 0.6 * kEnv * Math.sin(2 * Math.PI * 58 * tt)
             + 0.25 * hEnv * (Math.random() * 2 - 1)
             + sustain * Math.sin(2 * Math.PI * 330 * tt) * (0.6 + 0.4 * Math.sin(tt))
             + 0.01 * (Math.random() * 2 - 1);
    }
    an.setVirtualClock(hop * HOP / RATE * 1000);
    const f = an.process(buf);
    const ms = hop * HOP / RATE * 1000;
    if (!lockMs && f.bpm > 0 && Math.abs(f.bpm - bpm) < bpm * 0.03) lockMs = ms;
    if (ms > 15000) { tot++; if (Math.abs(f.bpm - bpm) < bpm * 0.03) ok++; }
    lastBpm = f.bpm;
  }
  return { bpm, lockMs, hold: tot ? (100 * ok / tot).toFixed(0) + "%" : "-", last: lastBpm.toFixed(1) };
}
const t0 = Date.now();
for (const b of [92, 100, 118, 128, 140, 150])
  console.log(JSON.stringify(run(b)));
console.log(JSON.stringify(run(128, { swing: true, sustain: 0.5 })), "swing+sång");
console.log("bänk-tid", ((Date.now() - t0) / 1000).toFixed(1), "s");
