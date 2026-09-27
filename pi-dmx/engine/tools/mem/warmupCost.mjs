/**
 * UPPVARMNINGENS MINNESKOSTNAD (minnesgranskningen 09-27): warmup.ts laser hela warmup.wav (Buffer, extern) och skapar
 * skrap-instanser av Analyser + EffectEngine. Hur mycket RSS/external/heap tar det, och slapps det efter done()?
 *
 *   node --expose-gc tools/mem/warmupCost.mjs [warmup/warmup.wav]
 */
import { pathToFileURL } from "node:url";
import { statSync } from "node:fs";
const ENG = process.env.ENG ? pathToFileURL(process.env.ENG.replace(/\/?$/, "/")).href : new URL("../../", import.meta.url).href;
const wav = process.argv[2] || decodeURIComponent(new URL("warmup/warmup.wav", ENG).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const { warmUpInBackground } = await import(ENG + "dist/warmup.js");
const { defaultConfig } = await import(ENG + "dist/config.js");
console.log = () => {}; console.warn = () => {};
const w = (s) => process.stdout.write(s + "\n");
const MB = (b) => (b / 1048576).toFixed(1).padStart(6);
const snap = (label, gc) => { if (gc) { global.gc(); global.gc(); } const m = process.memoryUsage(); w(`| ${label} | ${MB(m.rss)} | ${MB(m.heapTotal)} | ${MB(m.heapUsed)} | ${MB(m.external)} | ${MB(m.arrayBuffers)} |`); return m; };
const cfg = JSON.parse(JSON.stringify(defaultConfig)); cfg.fft.hop = 128;
w(`# warmupCost  ${wav}  (${MB(statSync(wav).size)} MB)`);
w(`| steg | rss | heapTotal | heapUsed | external | arrayBuffers |`); w(`|---|---:|---:|---:|---:|---:|`);
snap("fore (efter gc)", true);
let peak = 0;
const t = setInterval(() => { peak = Math.max(peak, process.memoryUsage.rss()); }, 20);
const t0 = performance.now();
await new Promise((res) => warmUpInBackground(cfg, wav, (r) => { clearInterval(t); w(`| done(): ${r ? `${r.hops} hop, ${r.secs.toFixed(0)} s klipp, ${(performance.now() - t0).toFixed(0)} ms` : "ingen fil"} | | | | | |`); snap("direkt efter done() (utan gc)", false); res(); }));
w(`| RSS-topp under uppvarmningen | ${MB(peak)} | | | | |`);
await new Promise((r) => setTimeout(r, 200));
snap("efter done() + gc", true);
