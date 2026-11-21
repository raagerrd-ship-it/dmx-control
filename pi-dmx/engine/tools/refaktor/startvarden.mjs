// STARTVÄRDEN (flytten 2026-11-21): varje flyttat fält har dagens värde före första hoppet.
//   node tools/refaktor/startvarden.mjs <ref/analyser.js> <ny/analyser.js> <flyttkarta.json>
// Kartan: { "gammalt.falt": "nytt.falt", ... } (punktvägar). Båda stilarna (dmx-konfig, lotus platt konfig), roll all/fast/slow, Object.is.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const [A, B, K] = process.argv.slice(2);
const karta = Object.entries(JSON.parse(readFileSync(K, 'utf8')));
const imp = (p) => import(pathToFileURL(p).href);
const { defaultConfig } = await imp(join(dirname(B), 'config.js'));
const styles = { dmx: () => JSON.parse(JSON.stringify(defaultConfig)),
  lotus: () => ({ sampleRate: 48000, hopSize: 128, autoGainTarget: 0.75, maxGain: 200, noiseFloor: 0.0015, onsetEnhancements: false }) };
const make = async (p) => { const { Analyser } = await imp(p), { createSplitBuffers } = await imp(join(dirname(p), 'split.js'));
  const out = {};
  for (const [s, c] of Object.entries(styles)) {
    out[s + ' all'] = new Analyser(c());
    for (const role of ['fast', 'slow']) out[s + ' ' + role] = new Analyser(c(), { role, split: createSplitBuffers(true) });
  }
  return out; };
const get = (o, path) => path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
const log = console.log; console.log = () => {};
const ra = await make(A), rb = await make(B);
console.log = log;
let fel = 0; const s = (x) => (Object.is(x, -0) ? '-0' : String(x)) + ` (${typeof x})`;
for (const v of Object.keys(ra)) for (const [g, n] of karta) {
  const a = get(ra[v], g), b = get(rb[v], n);
  if (a === undefined || !Object.is(a, b)) { fel++; if (fel <= 10) log(`  ${v}: ref ${g} = ${s(a)}, ny ${n} = ${s(b)}`); }
}
log(`startvärden: ${karta.length} fält × ${Object.keys(ra).length} varianter, avvikande ${fel}`);
process.exit(fel ? 1 : 0);
