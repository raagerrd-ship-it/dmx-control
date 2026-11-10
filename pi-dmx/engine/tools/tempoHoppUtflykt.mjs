// UTFLYKTER: klockans tempo lämnar ett hållet tempo (> 4 %) och kommer TILLBAKA (inom 2 %) inom 15 s = ett hopp som var fel åt ena hållet.
// node tools/tempoHoppUtflykt.mjs <tempoHoppDiag-ut.json> [...]   -> per fil: utflykter/min, andel tid i utflykt, varav harmoniska syskon, tillit under utflykten
import { readFileSync } from 'node:fs';
const SIB = [2 / 3, 3 / 2, 3 / 4, 4 / 3];
const fold = (b) => { while (b >= 160) b /= 2; while (b < 80) b *= 2; return b; };
const isSib = (a, b) => SIB.some((q) => Math.abs(fold(a) / fold(b * q) - 1) <= 0.04);
let G = { min: 0, n: 0, sib: 0, ms: 0, cf: [] };
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(f, 'utf8')); const s = d.samp.filter((r) => r[1] > 0);
  let held = 0, hs = 0, exc = null; const out = []; const conf = [];
  for (let i = 0; i < s.length; i++) {
    const [t, k, c] = s[i];
    if (!held) { held = k; hs = t; continue; }
    if (!exc) {
      if (Math.abs(k / held - 1) <= 0.04) { held = held * 0.98 + k * 0.02; continue; }
      if (t - hs < 2) { held = k; hs = t; continue; }   // inget hållet tempo än
      exc = { t0: t, to: k, conf: s[Math.max(0, i - 5)][2] };
    } else {
      if (Math.abs(k / held - 1) <= 0.02) { out.push({ t: exc.t0, from: +held.toFixed(1), to: +exc.to.toFixed(1), dur: +(t - exc.t0).toFixed(1), sib: isSib(exc.to, held), conf: exc.conf }); exc = null; continue; }
      if (t - exc.t0 > 15) { held = k; hs = t; exc = null; }
    }
  }
  const min = (s.length ? s[s.length - 1][0] - s[0][0] : 0) / 60, ms = out.reduce((a, e) => a + e.dur, 0);
  const nsib = out.filter((e) => e.sib).length;
  console.log(`${f.split(/[\\/]/).pop().padEnd(28)} ${min.toFixed(1)} min  utflykter ${out.length} (${(out.length / min).toFixed(2)}/min, syskon ${nsib})  tid i utflykt ${(100 * ms / 60 / min).toFixed(2)} %  tillit före medel ${(out.reduce((a, e) => a + e.conf, 0) / Math.max(1, out.length)).toFixed(2)}`);
  if (process.env.V) for (const e of out) console.log('   ', JSON.stringify(e));
  G.min += min; G.n += out.length; G.sib += nsib; G.ms += ms;
}
console.log(`TOTALT ${G.min.toFixed(1)} min  utflykter ${G.n} (${(G.n / G.min).toFixed(2)}/min, syskon ${G.sib})  tid i utflykt ${(100 * G.ms / 60 / G.min).toFixed(2)} %`);
