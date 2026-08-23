/** TAKTFAS: fyrtakt där ettan är dubbelt så tung. Efter att motorn applicerat
 *  frame.barShift ska takträknaren (beatIdx) räkna 0 på ettan. */
const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");
const { beatIndex } = await import("../dist/beatClock.js");

const RATE = 48000, HOP = 128, BPM = 128, B = 60 / BPM;
const cfg = JSON.parse(JSON.stringify(defaultConfig));
const an = new Analyser(cfg);
an.setGainLock(true, 1);

// Ljud: kick på varje slag, ettan (var 4:e) dubbelt så hård.
const gen = (t) => {
  const beat = Math.floor(t / B);
  const w = beat % 4 === 0 ? 1.0 : 0.45;
  const p = (t % B) / B;
  return w * Math.exp(-p * B * 26) * Math.sin(2 * Math.PI * 58 * t)
    + 0.02 * (Math.random() * 2 - 1);
};

const buf = new Float32Array(HOP);
let t = 0, shifts = 0;
const hops = Math.floor(90 * RATE / HOP);
for (let hop = 0; hop < hops; hop++) {
  for (let i = 0; i < HOP; i++, t++) buf[i] = gen(t / RATE);
  const ms = hop * HOP / RATE * 1000;
  an.setVirtualClock(ms);
  const f = an.process(buf);
  // Minimal motor-koppling: ankare vid lås + fas-PLL + taktfas (som index.ts).
  if (f.bpm > 0) {
    if (!cfg.beat) cfg.beat = { anchorMs: f.beatAnchorMs, bpm: f.bpm, confidence: f.bpmConfidence };
    if (f.kickAtMs > 0) {
      const bMs = 60000 / cfg.beat.bpm;
      const ph = ((((f.kickAtMs - cfg.beat.anchorMs) % bMs) + bMs) % bMs) / bMs;
      const err = ph < 0.5 ? ph : ph - 1;
      if (Math.abs(err) < 0.25) cfg.beat.anchorMs += err * bMs * 0.18;
    }
    if (f.barShift > 0) { cfg.beat.anchorMs += f.barShift * (60000 / cfg.beat.bpm); an.resetBar(); shifts++; }
  }
}

// Kontroll: var ligger beatIdx % 4 på musikens ettor de sista 20 s?
const epoch = 1700000000000;
let ok = 0, tot = 0;
for (let beat = Math.ceil(70 / B); beat * B < 90; beat++) {
  if (beat % 4 !== 0) continue;
  const idx = beatIndex(cfg.beat, epoch + beat * B * 1000 + 5);
  tot++; if (((idx % 4) + 4) % 4 === 0) ok++;
}
console.log(`bpm ${cfg.beat?.bpm.toFixed(1)}  taktfas-justeringar ${shifts}  ettan rätt ${ok}/${tot}`);
if (tot === 0 || ok !== tot) { console.log("MISSLYCKADES"); process.exit(1); }
console.log("OK");
