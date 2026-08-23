const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");
const RATE = 48000, HOP = 128;
const cfg = JSON.parse(JSON.stringify(defaultConfig));
const an = new Analyser(cfg); an.setGainLock(true, 1);
const bpm = 128, beat = 60 / bpm; const buf = new Float32Array(HOP);
let t = 0; const vals = [];
for (let hop = 0; hop < Math.floor(60 * RATE / HOP); hop++) {
  for (let i = 0; i < HOP; i++, t++) {
    const tt = t / RATE, ph = (tt % beat) / beat, e8 = (tt % (beat/2)) / (beat/2);
    const kEnv = Math.exp(-ph * beat * 25), hEnv = Math.exp(-e8 * beat * 90) * 0.7;
    buf[i] = 0.6*kEnv*Math.sin(2*Math.PI*58*tt) + 0.25*hEnv*(Math.random()*2-1)
           + 0.25*Math.sin(2*Math.PI*330*tt)*(0.6+0.4*Math.sin(tt)) + 0.01*(Math.random()*2-1);
  }
  an.setVirtualClock(hop*HOP/RATE*1000);
  const f = an.process(buf);
  if (hop > 400) vals.push(f.centroid);
}
vals.sort((a,b)=>a-b);
const p = q => vals[Math.floor(q*(vals.length-1))].toFixed(4);
console.log("centroid p10/p50/p90:", p(0.1), p(0.5), p(0.9));
