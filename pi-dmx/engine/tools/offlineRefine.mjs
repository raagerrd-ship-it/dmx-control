// SIDOSPARSTEST: hur mycket battre blir tempot om man far analysera i EFTERHAND?
//
// Iden (anvandarens): Sonos ger latnamnet vid varje byte. Spela in laten, analysera
// den utan realtidskrav, spara "artist - titel -> BPM". Nasta gang samma lat spelas
// behovs ingen analys alls -- bara fassynk, vilket ar ett mycket lattare problem.
//
// Lotus behover INTE pi-dmx:s fingeravtryckslager (rostning, offset-fack,
// biblioteksberoende trosklar) eftersom identiteten kommer gratis fran Sonos.
//
// Detta script ror INTE enheten. Det jamfor tre saker mot facit:
//   REALTID  = latslasets median (vad motorn gor idag)
//   EFTERAT  = det ackumulerade tempogrammets argmax vid klippets SLUT
//              (allt bevis vagt samman, ingen tidig commit)
//   FACIT    = publicerat varde
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadCatalog, lookup, fold } from "./catalog.mjs";
const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");

const DIR = process.argv[2] || "tools/corpus";
const HOP = 128, SR = 48000, HZ = 100;
const cat = loadCatalog();

const man = new Map();
for (const line of readFileSync(join(DIR, "manifest.tsv"), "utf8").split("\n").slice(1)) {
  const c = line.split("\t");
  if (c.length >= 6) man.set(c[5].trim(), { artist: c[1], title: c[2] });
}

const seen = new Map();
const rows = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".wav")).sort()) {
  const meta = man.get(f);
  if (!meta) continue;
  const rec = lookup(cat, meta.artist, meta.title);
  if (!rec || rec.variable) continue;            // variabelt tempo: inget att traffa
  const key = (meta.artist + "|" + meta.title).toLowerCase();
  if ((seen.get(key) || 0) >= 2) continue;        // tva inspelningar per lat racker
  seen.set(key, (seen.get(key) || 0) + 1);

  const d = readFileSync(join(DIR, f));
  const n = d.readUInt32LE(40) / 2;
  const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
  an.setGainLock(true, 1);
  const buf = new Float32Array(HOP);
  const got = [];
  for (let off = 0; off + HOP <= n; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
    const ms = (off / SR) * 1000;
    an.setVirtualClock(ms);
    const fr = an.process(buf);
    if (ms >= 5000 && fr.bpm > 0) got.push(fr.bpm);
  }
  if (!got.length) continue;
  const sorted = [...got].sort((a, b) => a - b);
  const realtime = sorted[sorted.length >> 1];

  // EFTERAT: argmax i det ackumulerade tempogrammet, vikt som analysatorn gor.
  const tg = an.tempoGramSnapshot;
  const [lo, hi] = an.lagBounds;
  let bestLag = 0, bestVal = -1e9;
  for (let L = lo; L <= hi; L++) if (tg[L] > bestVal) { bestVal = tg[L]; bestLag = L; }
  const offline = bestLag ? fold((HZ * 60) / bestLag) : 0;

  const tf = fold(rec.bpm);
  const near = (x) => Math.abs(x / tf - 1) <= 0.06 ||
    (rec.alt ? Math.abs(x / fold(rec.alt) - 1) <= 0.06 : false);
  rows.push({ artist: meta.artist, title: meta.title, tf, truth: rec.bpm,
              realtime, offline, rOk: near(realtime), oOk: near(offline) });
}

for (const r of rows) {
  const mark = (ok) => (ok ? "OK " : "FEL");
  console.log(`  facit ${String(r.tf).padStart(3)} | realtid ${String(r.realtime).padStart(3)} ${mark(r.rOk)}` +
    ` | efterat ${String(Math.round(r.offline)).padStart(3)} ${mark(r.oOk)}  ` +
    (r.artist + " – " + r.title).slice(0, 40));
}
const rN = rows.filter((r) => r.rOk).length, oN = rows.filter((r) => r.oOk).length;
console.log(`\n  ${rows.length} inspelningar (max 2 per lat, variabla uteslutna)`);
console.log(`  REALTID  ratt: ${rN}/${rows.length} (${Math.round((100 * rN) / rows.length)} %)`);
console.log(`  EFTERAT  ratt: ${oN}/${rows.length} (${Math.round((100 * oN) / rows.length)} %)`);
const won = rows.filter((r) => r.oOk && !r.rOk).length;
const lost = rows.filter((r) => r.rOk && !r.oOk).length;
console.log(`  efterat vinner pa ${won}, forlorar pa ${lost}`);
