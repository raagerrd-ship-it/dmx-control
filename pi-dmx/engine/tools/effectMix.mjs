/** EFFEKTMIX (2026-09-23, agaren: "verkade som att vi korde pa hoga effekter och hade inte sa manga"): spelar en WAV genom
 *  analysator + dirigent i smart-lage (ladans env satts av anroparen) och raknar VILKA effekter som valdes, hur lange, ur vilken
 *  tier, hur ofta det byttes och hur stor poolen var. Utan DMX-utgang - bara dirigentens beslut.
 *    DMX_SECTION=1 DMX_SECTION_SWITCH=1 DMX_GRID_PHASE=1 node tools/effectMix.mjs tools/pop_ladan.wav [startS] [sekunder] */
import { readFileSync } from "node:fs";
const { Analyser } = await import("../dist/analyser.js");
const { EffectEngine } = await import("../dist/effects.js");
const { defaultConfig } = await import("../dist/config.js");
const { EFFECTS, TIER } = await import("../dist/effects/registry.js");
const f = process.argv[2] || "tools/pop_ladan.wav", startS = Number(process.argv[3] || 0), secs = Number(process.argv[4] || 600);
const d = readFileSync(f); const n = (d.readUInt32LE(40) || d.length - 44) / 2; const SR = 48000, HOP = 128;
const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.beatPulse = true; cfg.mode = "smart"; cfg.energyDrivesMode = true;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
const eng = new EffectEngine(cfg);
const logs = []; const origLog = console.log; console.log = (...a) => { const s = a.join(" "); if (s.startsWith("[dirigent]")) logs.push(s); };
const buf = new Float32Array(HOP); let ms0 = 1700000000000; let lastRender = -1;
const share = new Map(); const tierShare = { lugn: 0, fart: 0, full: 0 }; let switches = 0; let last = ""; let lastAt = 0; const dwells = []; const secShare = {};
for (let off = 0; off + HOP <= n && off < (startS + secs) * SR; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const ms = ms0 + (off / SR) * 1000; an.setVirtualClock(ms);
  Date.now = () => ms; performance.now = () => ms - 1700000000000;
  const fr = an.process(buf);
  if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence };
  if (off / SR >= startS && ms - lastRender >= 25) {
    lastRender = ms; eng.render(fr); const t = off / SR;
    const m = eng.activeMode || eng.smartMode || "?"; share.set(m, (share.get(m) || 0) + 0.025);
    const sec = fr.section || "?"; secShare[sec] = (secShare[sec] || 0) + 0.025;
    if (m !== last) { if (last) { switches++; dwells.push(t - lastAt); } last = m; lastAt = t; }
  }
}
console.log = origLog;
const tot = [...share.values()].reduce((a, b) => a + b, 0);
const rows = [...share.entries()].sort((a, b) => b[1] - a[1]);
const tierOf = (m) => TIER.lugn.includes(m) ? "lugn" : TIER.fart.includes(m) ? "fart" : TIER.full.includes(m) ? "full" : "?";
for (const [m, s] of rows) tierShare[tierOf(m)] = (tierShare[tierOf(m)] || 0) + s;
const med = (a) => a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : 0;
console.log(`${f} ${startS}-${startS + secs}s: ${rows.length} olika effekter av ${EFFECTS.length}, ${switches} byten, uppehall median ${med(dwells).toFixed(0)} s (min ${Math.min(...dwells).toFixed(0)}, max ${Math.max(...dwells).toFixed(0)})`);
console.log("tid per tier: " + Object.entries(tierShare).map(([k, v]) => `${k} ${(100 * v / tot).toFixed(0)} %`).join(", ") + " | sektioner: " + Object.entries(secShare).map(([k, v]) => `${k} ${(100 * v / tot).toFixed(0)} %`).join(", "));
console.log("effekter (andel av tiden): " + rows.map(([m, s]) => `${m} ${(100 * s / tot).toFixed(0)}%[${tierOf(m)[0]}]`).join("  "));
const notUsed = EFFECTS.map((e) => e.key).filter((k) => !share.has(k));
console.log(`aldrig valda (${notUsed.length}): ` + notUsed.join(" "));
const tiers = logs.map((l) => (l.match(/tier (\w+)/) || [])[1]).filter(Boolean); const tc = {}; for (const t of tiers) tc[t] = (tc[t] || 0) + 1;
console.log(`[dirigent]-rader: ${logs.length}, 'ny look' per tier ${JSON.stringify(tc)}; exempel: ` + logs.slice(0, 6).map((l) => l.replace("[dirigent] ", "")).join(" | "));
