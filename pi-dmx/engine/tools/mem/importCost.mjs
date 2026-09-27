/**
 * IMPORTKOSTNAD (minnesgranskningen 09-27): vad kostar varje modul som index.ts/server.ts drar in live?
 * Tva matt per modul:
 *   isolerad  = heapUsed-delta (efter gc) i en FARSK node-process som bara importerar den modulen (inkl. dess beroenden)
 *   marginal  = heapUsed-delta nar modulen importeras EFTER alla foregaende i listan (samma ordning som index.ts)
 *
 *   node --expose-gc tools/mem/importCost.mjs            (skriver en markdown-tabell)
 *   node --expose-gc tools/mem/importCost.mjs --one <spec>   (internt: mater en modul isolerat)
 */
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
const ENG = process.env.ENG ? pathToFileURL(process.env.ENG.replace(/\/?$/, "/")).href : new URL("../../", import.meta.url).href;
const gc = () => { global.gc(); global.gc(); };
const heap = () => { gc(); const m = process.memoryUsage(); return { h: m.heapUsed, r: m.rss, e: m.external }; };
const args = process.argv.slice(2);

const MODS = [
  ["fastify", "fastify", "server.ts"],
  ["@fastify/static", "@fastify/static", "server.ts (statiska UI-filer)"],
  ["@fastify/websocket", "@fastify/websocket", "server.ts (ws)"],
  ["dist/analyser.js", ENG + "dist/analyser.js", "index.ts (fft.js, tempoTracker, split, analyserProfile)"],
  ["dist/effects.js", ENG + "dist/effects.js", "index.ts (alla effekter + registry)"],
  ["dist/server.js", ENG + "dist/server.js", "index.ts"],
  ["dist/audio.js", ENG + "dist/audio.js", "index.ts (arecord)"],
  ["dist/boundaryDetector.js", ENG + "dist/boundaryDetector.js", "index.ts"],
  ["dist/warmup.js", ENG + "dist/warmup.js", "index.ts (uppvarmning vid start)"],
  ["dist/dmx.js", ENG + "dist/dmx.js", "index.ts"],
  ["dist/persist.js", ENG + "dist/persist.js", "index.ts"],
  ["dist/button.js", ENG + "dist/button.js", "index.ts (GPIO-knapp)"],
  ["dist/intensityKnob.js", ENG + "dist/intensityKnob.js", "index.ts (ADC-vred)"],
  ["dist/knobRing.js", ENG + "dist/knobRing.js", "index.ts (spi-device, native)"],
  ["dist/bleClient.js", ENG + "dist/bleClient.js", "index.ts (BLE-ring)"],
  ["dist/moods.js", ENG + "dist/moods.js", "index.ts/server.ts"],
  ["dist/beatClock.js", ENG + "dist/beatClock.js", "index.ts"],
  ["dist/runtimeHealth.js", ENG + "dist/runtimeHealth.js", "index.ts/server.ts"],
  ["dist/healthLog.js", ENG + "dist/healthLog.js", "index.ts/server.ts"],
  ["dist/heartbeat/heartbeat.js", ENG + "dist/heartbeat/heartbeat.js", "(ej importerad av index.ts?)"],
  ["dist/recorder/recorder.js", ENG + "dist/recorder/recorder.js", "index.ts: dynamisk import bara med DMX_RECORDER=1"],
];

if (args[0] === "--one") {
  const spec = args[1]; const b = heap();
  try { await import(spec); } catch (e) { console.log(JSON.stringify({ err: String(e.message).slice(0, 80) })); process.exit(0); }
  const a = heap();
  console.log(JSON.stringify({ dh: a.h - b.h, dr: a.r - b.r, de: a.e - b.e }));
  process.exit(0);
}

const MB = (b) => (b / 1048576).toFixed(2).padStart(6);
const base = heap();
const rows = [];
let prev = base;
for (const [name, spec, where] of MODS) {
  const iso = spawnSync(process.execPath, ["--expose-gc", new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "--one", spec], { encoding: "utf8" });
  let isoR; try { isoR = JSON.parse(iso.stdout.trim().split("\n").pop()); } catch { isoR = { err: (iso.stderr || "").split("\n")[0] }; }
  let marg = null, err = null;
  try { await import(spec); const now = heap(); marg = { dh: now.h - prev.h, dr: now.r - prev.r }; prev = now; } catch (e) { err = String(e.message).slice(0, 60); }
  rows.push({ name, where, isoR, marg, err });
}
console.log(`| modul | var | isolerad ΔheapUsed | isolerad Δrss | marginell ΔheapUsed | marginell Δrss |`);
console.log(`|---|---|---:|---:|---:|---:|`);
for (const r of rows) {
  const i = r.isoR.err ? `fel: ${r.isoR.err}` : `${MB(r.isoR.dh)} MB`;
  const ir = r.isoR.err ? "" : `${MB(r.isoR.dr)} MB`;
  const m = r.err ? `fel: ${r.err}` : r.marg ? `${MB(r.marg.dh)} MB` : "";
  const mr = r.marg ? `${MB(r.marg.dr)} MB` : "";
  console.log(`| ${r.name} | ${r.where} | ${i} | ${ir} | ${m} | ${mr} |`);
}
const end = heap();
console.log(`\nSumma marginell (allt ovan som laddade): heapUsed +${MB(end.h - base.h)} MB, rss +${MB(end.r - base.r)} MB (tom node: heapUsed ${MB(base.h)} MB, rss ${MB(base.r)} MB)`);
