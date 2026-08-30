/** PRESENTATIONSTAKT: över 135 BPM ska hjärtslaget pulsa på VARANNAT slag, och
 *  hysteresen (15 BPM) ska hålla nivån kvar hela vägen ner till 120.
 *  Mäter pulstoppar per minut direkt på DMX-utgången. */
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

/** Räknar pulstoppar/min på master-dimmern under `sec` sekunder vid `bpm`. */
function pulsesPerMin(eng, cfg, bpm, sec, startMs) {
  cfg.beat = { anchorMs: startMs, bpm, confidence: 1 };
  let prev = 0, rising = false, peaks = 0;
  const STEP = 5;
  for (let ms = startMs; ms < startMs + sec * 1000; ms += STEP) {
    Date.now = () => ms;
    const u = eng.render({ ...frame, bpm });
    let v = 0;
    for (let i = 0; i < u.length; i++) v = Math.max(v, u[i]);
    if (v > prev + 1) rising = true;
    else if (rising && v < prev - 1) { peaks++; rising = false; }
    prev = v;
  }
  return peaks / sec * 60;
}

const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.beatPulse = true;
const eng = new EffectEngine(cfg);
const realNow = Date.now;
let t0 = realNow();

const cases = [
  { bpm: 100, want: [92, 108] },    // under tröskeln → full takt
  { bpm: 157, want: [72, 86] },     // över 135 → halverad
  { bpm: 128, want: [58, 70] },     // hysteres: kvar halverad (>120)
  { bpm: 110, want: [102, 118] },   // under 120 → släpper
];
let fail = 0;
for (const c of cases) {
  t0 += 120000;
  const ppm = pulsesPerMin(eng, cfg, c.bpm, 40, t0);
  const ok = ppm >= c.want[0] && ppm <= c.want[1];
  console.log(`bpm ${c.bpm}  puls ${ppm.toFixed(1)}/min  förväntat ${c.want[0]}–${c.want[1]}  ${ok ? "OK" : "FEL"}`);
  if (!ok) fail++;
}
Date.now = realNow;
if (fail) { console.log("MISSLYCKADES"); process.exit(1); }
console.log("OK");
