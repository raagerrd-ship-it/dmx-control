/** DROP-REPLAY: matar en RIKTIG WAV genom analysatorn hop-för-hop, deterministiskt,
 *  och listar varje drop-fyrning med ljud-tid. Till skillnad från replayWav läser
 *  den INTE header-storleken (DROPCAP-WAV:en stängs aldrig → data-size=0), utan
 *  räknar sampel ur filstorleken. [dropfire]-raderna printas av analysatorn själv;
 *  wall = virtualEpoch(1.7e12)+ljud-ms, så ljud-tid = (wall-1.7e12)/1000.
 *
 *  Kör:            node tools/replayDrops.mjs <wav>
 *  Svep tröskel:   BODY_PEAK_DB=5 node tools/replayDrops.mjs <wav>
 */
import { readFileSync } from "node:fs";

const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");

const path = process.argv[2];
if (!path) { console.error("ange en wav-fil"); process.exit(2); }
const d = readFileSync(path);
if (d.toString("ascii", 0, 4) !== "RIFF") { console.error("inte en WAV"); process.exit(2); }
const rate = d.readUInt32LE(24), bits = d.readUInt16LE(34), ch = d.readUInt16LE(22);
if (rate !== 48000 || bits !== 16 || ch !== 1) {
  console.error(`kräver 48 kHz mono 16-bit, fick ${rate}/${ch}/${bits}`); process.exit(2);
}
// STÄNGS ALDRIG → header-data-size opålitlig. Räkna ur filstorleken.
const nSamples = (d.length - 44) >> 1;
const secs = (nSamples / 48000).toFixed(1);

const HOP = 128;
const EPOCH = 1700000000000;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
an.setGainLock(true, 1);
const buf = new Float32Array(HOP);

let lastDrop = 0, fires = 0;
const origLog = console.log;
// Analysatorns [dropfire] går genom console.log; låt den printa, vi räknar också.
for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  an.setVirtualClock((off / 48000) * 1000);
  const f = an.process(buf);
  if (f.dropCount !== lastDrop) { lastDrop = f.dropCount; fires++; }
}
origLog(`\n=== ${secs}s ljud | BODY_PEAK_DB=${process.env.BODY_PEAK_DB ?? 10} BODY_GONE_MIN_MS=${process.env.BODY_GONE_MIN_MS ?? 2000} → ${fires} fyrningar ===`);
