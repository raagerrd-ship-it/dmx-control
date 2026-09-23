/**
 * RUMSLIGHET (2026-09-23). Mater vad de FYRA lamporna gor MOT VARANDRA, i riktiga DMX-steg, for varje effekt.
 * Bakgrund: agaren sager "ser ut som samma effekter" trots att dirigenten byter look 4-5 ganger i minuten och
 * bara 6-13 % av bytena gar till en nara dubblett. Da ar forklaringen inte VILKEN look som valjs utan att
 * lookarna ser likadana ut PA RIGGEN. Pa fyra PAR ar det spridningen mellan lamporna som ogat laser som
 * "en effekt" - inte den exakta ljuskurvan.
 *
 *   node tools/spreadBench.mjs <wav> [startS] [sekunder]
 *
 * spridning = medel over rutor av (ljusaste lampan - morkaste lampan) i DMX-steg 0-255, efter HELA kedjan
 * (effekt -> md -> tak -> puls -> kalibrering -> golv). tandtid = andel rutor dar minst en lampa ligger pa
 * golvet medan en annan ar minst 3x sa ljus (dvs en verklig "nagra lampor pa, andra av"-bild).
 */
import { readFileSync } from "node:fs";
const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { defaultConfig } = await import("../dist/config.js");
const { EFFECTS } = await import("../dist/effects/registry.js");

const f = process.argv[2] || "tools/pop_ladan.wav";
const startS = Number(process.argv[3] || 60), secs = Number(process.argv[4] || 90);
const d = readFileSync(f); const n = (d.length - 44) / 2; const SR = 48000, HOP = 128, EPOCH = 1700000000000;

// 1) frames en gang
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
if (process.argv.includes("--agc") === false) an.setGainLock(true, 1);
const frames = []; const buf = new Float32Array(HOP); let lastT = -1;
for (let off = 0; off + HOP <= n && off < (startS + secs) * SR; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = EPOCH + (off / SR) * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  if (off / SR >= startS && ms - lastT >= 25) { lastT = ms; frames.push({ fr: { ...fr }, ms }); }
}

// 2) varje effekt genom hela kedjan, per-lampa i DMX-steg
const rows = [];
for (const e of EFFECTS) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  cfg.mode = e.key; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true; cfg.energyDrivesMode = true;
  const eng = new EffectEngine(cfg);
  let spread = 0, nn = 0, onOff = 0, lit = 0;
  for (const { fr, ms } of frames) {
    Date.now = () => ms; performance.now = () => ms - EPOCH;
    if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence };
    const u = eng.render(fr);
    // Lampans ljus = storsta ljusbarande kanalen i dess kanalblock. Max tacker bade rgb7 (R,G,B,DIM) och ladans
    // custom-ordning (DIM,R,G,B) utan att behova veta vilken preset som galler.
    const v = cfg.fixtures.map((fx) => { const a = (fx.address ?? 1) - 1; let m = 0; for (let k = 0; k < 4; k++) { const x = u[a + k] ?? 0; if (x > m) m = x; } return m; });
    const mx = Math.max(...v), mn = Math.min(...v);
    spread += mx - mn; nn++;
    if (mx > 0) { lit++; if (mx >= 3 * Math.max(1, mn)) onOff++; }
  }
  rows.push({ key: e.key, tier: e.tier, spread: spread / Math.max(1, nn), onOff: 100 * onOff / Math.max(1, lit) });
}
rows.sort((a, b) => b.spread - a.spread);
console.log(`${f} ${startS}-${startS + secs}s, ${frames.length} rutor, ${rows.length} effekter`);
console.log(`spridning = medel(ljusast - morkast) i DMX-steg | pa/av = andel rutor dar en lampa ar >= 3x en annan\n`);
for (const r of rows) console.log(`  ${r.key.padEnd(12)} ${r.tier.padEnd(5)} spridning ${r.spread.toFixed(1).padStart(6)}  pa/av ${r.onOff.toFixed(0).padStart(3)} %`);
const med = rows.map((r) => r.spread).sort((a, b) => a - b)[rows.length >> 1];
console.log(`\nMEDIAN spridning over alla effekter: ${med.toFixed(1)} DMX-steg av 255`);
