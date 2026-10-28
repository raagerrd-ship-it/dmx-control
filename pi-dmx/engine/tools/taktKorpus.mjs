/**
 * TAKTKLOCKAN MOT KATALOGFACIT (natt 10-13, taktsäkerheten). scoreCorpus.mjs dömer ANALYSATORNS bpm; effekterna stegar på
 * TAKTKLOCKAN (cfg.beat ur beatFeed.ts). Här körs båda som live: analysatorn får motorns cfg (MÄTFÄLLA 47 - kickgrinden mot
 * taktgridet är på live) + BeatFeed per hop, och varje klipp döms mot bpm_catalog.tsv (vikt till [80,160), ±4 %):
 *   ana %    andel tid (efter 5 s) analysatorns bpm = facit       klocka %  andel tid taktklockans bpm = facit
 *   hopp     taktklockans tempobyten (> 4 %, håller >= 2 s)       konf      median frame.bpmConfidence efter beatFeed
 *   node tools/taktKorpus.mjs <korpuskatalog med manifest.tsv> [--json ut.json]    (MAXPER som scoreCorpus, standard 0 = alla)
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadCatalog, lookup, fold, relation } from "./catalog.mjs";
const { Analyser } = await import("../dist/analyser.js");
const { BeatFeed } = await import("../dist/beatFeed.js");
const { defaultConfig } = await import("../dist/config.js");
const args = process.argv.slice(2);
const DIR = args[0]; const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const HOP = 128, SR = 48000, EPOCH = 1700000000000;
const cat = loadCatalog();
const man = new Map();
for (const line of readFileSync(join(DIR, "manifest.tsv"), "utf8").split("\n").slice(1)) { const c = line.split("\t"); if (c.length >= 6) man.set(c[5].trim(), { artist: c[1], title: c[2] }); }
const MAXPER = Number(process.env.MAXPER ?? 0); const seen = new Map();
const out = (s) => process.stdout.write(s + "\n"); console.log = () => {};
const rows = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".wav")).sort()) {
  const meta = man.get(f); if (!meta) continue;
  if (MAXPER > 0) { const k = (meta.artist + "|" + meta.title).toLowerCase(); const c = (seen.get(k) || 0) + 1; seen.set(k, c); if (c > MAXPER) continue; }
  const rec = lookup(cat, meta.artist, meta.title); if (!rec || rec.variable) continue;
  const d = readFileSync(join(DIR, f)); const n = d.readUInt32LE(40) / 2;
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  const an = new Analyser(BeatFeed.analyserCfg(cfg)); an.setGainLock(true, 1);
  const feed = new BeatFeed(); const buf = new Float32Array(HOP);
  const tf = [fold(rec.bpm), ...(rec.alt ? [fold(rec.alt)] : [])];
  const ok = (b) => b > 0 && tf.some((t) => Math.abs(fold(b) / t - 1) <= 0.04);
  let nA = 0, nK = 0, nT = 0, nextRow = 0; const conf = [], kser = [];
  for (let off = 0; off + HOP <= n; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
    const ms = (off / SR) * 1000; const wall = EPOCH + ms;
    an.setVirtualClock(ms); Date.now = () => wall;   // analysatorns väggklocka = 1,7e12 + ms = wall (MÄTFÄLLA 48)
    const fr = an.process(buf);
    feed.update(fr, cfg, an);
    if (ms >= nextRow) {
      nextRow += 100;
      const kb = cfg.beat?.bpm ?? 0; kser.push(kb);
      if (ms >= 5000) { nT++; if (ok(fr.bpm)) nA++; if (ok(kb)) nK++; if (fr.bpm > 0) conf.push(fr.bpmConfidence); }
    }
  }
  let hops = 0, held = 0, cand = 0, cn = 0;
  for (const b of kser) { if (!(b > 0)) continue; if (!held) { held = b; continue; } if (Math.abs(b / held - 1) <= 0.04) { cand = 0; continue; }
    if (cand && Math.abs(b / cand - 1) <= 0.03) { if (++cn >= 20) { hops++; held = cand; cand = 0; } } else { cand = b; cn = 1; } }
  conf.sort((a, b) => a - b);
  const r = { f, title: `${meta.artist} – ${meta.title}`, facit: tf[0], ana: nT ? nA / nT : 0, klocka: nT ? nK / nT : 0, hopp: hops, konf: conf.length ? conf[conf.length >> 1] : 0,
    slut: kser[kser.length - 1] ?? 0, rel: relation(fold(kser[kser.length - 1] || 1) / tf[0]) };
  rows.push(r);
}
const m = (k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;
const n60 = (k) => rows.filter((r) => r[k] >= 0.6).length;
const rel = {}; for (const r of rows) rel[r.rel] = (rel[r.rel] || 0) + 1;
out(`${rows.length} klipp med facit (${DIR})`);
out(`analysator: snitt ${(100 * m("ana")).toFixed(1)} %, rätt (>= 60 %) ${n60("ana")}`);
out(`taktklocka: snitt ${(100 * m("klocka")).toFixed(1)} %, rätt (>= 60 %) ${n60("klocka")}, slutläge ${Object.entries(rel).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" ")}`);
out(`klockans tempobyten ${rows.reduce((s, r) => s + r.hopp, 0)} (${(m("hopp")).toFixed(2)}/klipp), konf median-snitt ${m("konf").toFixed(3)}`);
if (opt("--json")) writeFileSync(opt("--json"), JSON.stringify(rows, null, 0));
