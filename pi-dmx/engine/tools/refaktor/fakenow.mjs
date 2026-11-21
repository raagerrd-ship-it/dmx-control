// LOTUSGRINDEN (flytten 2026-11-21): Date.now() följer ljudklockan, så att lotus klockväg (hopSelf) blir deterministisk.
//   node tools/refaktor/fakenow.mjs <samma argument som tools/analyserParity.mjs>
import { pathToFileURL } from 'node:url';
const argv = process.argv.slice(2);
const opt = (k) => argv[argv.indexOf(k) + 1];
let ms = 0; const EPOCH = 1795274000000;
Date.now = () => EPOCH + ms;
for (const p of [opt('--old'), opt('--new')]) {
  const m = await import(pathToFileURL(p).href);
  const orig = m.Analyser.prototype.setAudioClockMs;
  m.Analyser.prototype.setAudioClockMs = function (x) { ms = x; return orig.call(this, x); };
}
await import(new URL('../analyserParity.mjs', import.meta.url).href);
