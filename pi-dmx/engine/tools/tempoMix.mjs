/**
 * TEMPOMIXEN (2026-10-30, ägaren: 'få rutnätet att ha rätt tempo'). Korpusklippen med katalogfacit (frozen6) skarvas till EN kontinuerlig
 * mix med likeffekt-övertoning (som en DJ-mix utan beatmatch) och körs som live: delad analysator (fast + inline slow), låtgränsen,
 * BeatFeed per hop. Facit per tidpunkt = klippets katalog-bpm (vikt till [80,160), ±4 %, alt-bpm godkänns). Mäts var 100 ms från
 * övertoningens slut till nästa övertonings start:
 *   ana %     analysatorns bpm (frame.bpm) rätt          klocka %  effektklockans rutnät (cfg.beat) rätt
 *   agrid %   analysatorns eget rutnät (TVÅ RUTNÄT) rätt
 *   annat %   andel tid klockan står på ett tempo som inte är rätt, oktav eller 2/3, 3/2, 3/4, 4/3 (icke-harmoniskt fel)
 *   lås s     median tid från övertoningens slut tills klockan är rätt och håller >= 2 s (miss = segmentet ut)
 *   hopp/min  klockans tempobyten inom låt (> 4 %, nya tempot håller >= 2 s, från 8 s efter övertoningen); oktav = byten x2 / x0,5
 *   node tools/tempoMix.mjs [tools/frozen6] [--n 80] [--all = alla klipp, inte en per låt] [--fade 3] [--seed 7] [--json ut.json]
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadCatalog, lookup, fold } from "./catalog.mjs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DIR = args[0] && !args[0].startsWith("--") ? args[0] : "tools/frozen6";
const ALL = args.includes("--all"), NMAX = Number(opt("--n", 80)), FADE_S = Number(opt("--fade", 3)); let seed = Number(opt("--seed", 7));
const DIST = new URL("../dist/", import.meta.url).href;
const { Analyser } = await import(DIST + "analyser.js");
const { BeatFeed } = await import(DIST + "beatFeed.js");
const { defaultConfig } = await import(DIST + "config.js");
const { BoundaryDetector } = await import(DIST + "boundaryDetector.js");
const { createSplitBuffers } = await import(DIST + "split.js");
console.log = () => {};
const SR = 48000, HOP = 128, EPOCH = 1700000000000, HMS = HOP / SR * 1000;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

// klipp med facit, en per låt, blandad ordning (fast frö)
const cat = loadCatalog(); const man = new Map();
for (const line of readFileSync(join(DIR, "manifest.tsv"), "utf8").split("\n").slice(1)) { const c = line.split("\t"); if (c.length >= 6) man.set(c[5].trim(), { artist: c[1], title: c[2] }); }
const seen = new Set(); let clips = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".wav")).sort()) {
  const m = man.get(f); if (!m) continue; const k = (m.artist + "|" + m.title).toLowerCase(); if (seen.has(k) && !ALL) continue;
  const rec = lookup(cat, m.artist, m.title); if (!rec || rec.variable) continue; seen.add(k);
  clips.push({ f, title: `${m.artist} – ${m.title}`, tf: [fold(rec.bpm), ...(rec.alt ? [fold(rec.alt)] : [])] });
}
for (let i = clips.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [clips[i], clips[j]] = [clips[j], clips[i]]; }
for (let i = 1; i < clips.length; i++) if (clips[i].title === clips[i - 1].title) { const j = clips.findIndex((c, x) => x > i && c.title !== clips[i].title); if (j > 0) [clips[i], clips[j]] = [clips[j], clips[i]]; }   // --all: aldrig samma låt två i rad
clips = clips.slice(0, NMAX);

// skarva: likeffektövertoning FADE_S, mono 48 k
const pcm = clips.map((c) => { const d = readFileSync(join(DIR, c.f)); const n = d.readUInt32LE(40) / 2; const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = d.readInt16LE(44 + i * 2) / 32768; return a; });
const FADE = Math.round(FADE_S * SR); let total = 0; const starts = [];
for (let i = 0; i < pcm.length; i++) { starts.push(total); total += pcm[i].length - (i < pcm.length - 1 ? FADE : 0); }
const mix = new Float32Array(total);
for (let i = 0; i < pcm.length; i++) {
  const a = pcm[i], s = starts[i], last = i === pcm.length - 1;
  for (let k = 0; k < a.length; k++) {
    let g = 1;
    if (i > 0 && k < FADE) g = Math.sin((k / FADE) * Math.PI / 2);
    if (!last && k >= a.length - FADE) g = Math.cos(((k - (a.length - FADE)) / FADE) * Math.PI / 2);
    mix[s + k] += a[k] * g;
  }
}
// segment: [övertoningens slut, nästa övertonings start)
const seg = clips.map((c, i) => ({ ...c, t0: (starts[i] + (i ? FADE : 0)) / SR * 1000, t1: (i < clips.length - 1 ? starts[i + 1] : total) / SR * 1000 }));

const cfg = JSON.parse(JSON.stringify(defaultConfig));
const b = createSplitBuffers(); const an = new Analyser(BeatFeed.analyserCfg(cfg), { role: "fast", split: b }); an.setInlinePeer(new Analyser(structuredClone(cfg), { role: "slow", split: b }));
an.setGainLock(true, 1);
const feed = new BeatFeed(); const bounds = new BoundaryDetector(() => Date.now());
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const bArg = { level: 0, bpm: 0, bpmConfidence: 0 }; let lastB = 0;
const H = Math.floor(total / HOP); const buf = new Float32Array(HOP);
const STEP = Math.round(100 / HMS); const samp = [];   // [tMs, ana, klocka, agrid]
for (let h = 0; h < H; h++) {
  buf.set(mix.subarray(h * HOP, h * HOP + HOP));
  const ms = EPOCH + h * HMS; an.setVirtualClock(ms - EPOCH); Date.now = () => ms; performance.now = () => ms - EPOCH;
  const fr = an.process(buf);
  bArg.level = fr.level; bArg.bpm = fr.bpm; bArg.bpmConfidence = fr.bpmConfidence; bounds.tick(bArg);
  if (bounds.boundaryCount !== lastB) { lastB = bounds.boundaryCount; an.hintTrackChange(5000); }
  feed.update(fr, cfg, an);
  if (h % STEP === 0) samp.push([h * HMS, fr.bpm, cfg.beat?.bpm ?? 0, feed.anaGrid?.beat?.bpm ?? 0]);
}

const HARM = [1, 2 / 3, 1.5, 0.75, 4 / 3];
const ok = (bpm, tf) => bpm > 0 && tf.some((t) => Math.abs(fold(bpm) / t - 1) <= 0.04);
const harm = (bpm, tf) => bpm > 0 && tf.some((t) => HARM.some((k) => Math.abs(fold(bpm) / (t * k) - 1) <= 0.04 || Math.abs(fold(bpm) / (fold(t * k)) - 1) <= 0.04));
const rows = []; const T = { n: 0, a: 0, k: 0, g: 0, other: 0, gOther: 0, lock: [], hops: 0, oct: 0, hopMin: 0 };
let si = 0;
for (const s of seg) {
  const r = { title: s.title, facit: s.tf[0], n: 0, a: 0, k: 0, g: 0, other: 0, gOther: 0, lock: NaN, kEnd: 0 };
  let run = 0, held = 0, cand = 0, cn = 0;
  while (si < samp.length && samp[si][0] < s.t0) si++;
  for (let j = si; j < samp.length && samp[j][0] < s.t1; j++) {
    const [t, a, k, g] = samp[j]; r.n++;
    if (ok(a, s.tf)) r.a++; if (ok(g, s.tf)) r.g++; else if (g > 0 && !harm(g, s.tf)) r.gOther++;
    if (ok(k, s.tf)) { r.k++; if (++run === 20 && isNaN(r.lock)) r.lock = (t - 1900 - s.t0) / 1000; } else { run = 0; if (k > 0 && !harm(k, s.tf)) r.other++; }
    r.kEnd = k;
    if (t - s.t0 >= 8000 && k > 0) {   // tempobyten inom låten
      T.hopMin += 0.1 / 60;
      if (!held) held = k; else if (Math.abs(k / held - 1) <= 0.04) cand = 0;
      else if (cand && Math.abs(k / cand - 1) <= 0.03) { if (++cn >= 20) { T.hops++; const q = cand / held; if (Math.abs(q / 2 - 1) < 0.05 || Math.abs(q * 2 - 1) < 0.05) T.oct++; held = cand; cand = 0; } }
      else { cand = k; cn = 1; }
    }
  }
  if (isNaN(r.lock)) r.lock = (s.t1 - s.t0) / 1000;
  rows.push(r); T.n += r.n; T.a += r.a; T.k += r.k; T.g += r.g; T.other += r.other; T.gOther += r.gOther; T.lock.push(r.lock);
}
const pc = (x) => (100 * x / Math.max(1, T.n)).toFixed(1);
const med = (a) => { const q = a.slice().sort((x, y) => x - y); return q[q.length >> 1]; };
const out = (s) => process.stdout.write(s + "\n");
out(`${rows.length} klipp, ${(total / SR / 60).toFixed(1)} min, övertoning ${FADE_S} s (${DIR})`);
out(`  ana ${pc(T.a)} %   klocka ${pc(T.k)} %   agrid ${pc(T.g)} %   annat: klocka ${pc(T.other)} % / agrid ${pc(T.gOther)} %`);
out(`  klockans tempohopp inom låt ${(T.hops / T.hopMin).toFixed(2)}/min (${T.hops}, varav oktav ${T.oct})`);
out(`  klockans lås efter övertoningen: median ${med(T.lock).toFixed(1)} s, segment rätt inom 5 s ${T.lock.filter((x) => x <= 5).length}/${rows.length}, aldrig ${rows.filter((r) => r.k === 0).length}`);
if (opt("--json")) writeFileSync(opt("--json"), JSON.stringify({ T: { ...T, lock: undefined, lockMed: med(T.lock), inom5: T.lock.filter((x) => x <= 5).length, aldrig: rows.filter((r) => r.k === 0).length, segment: rows.length }, rows }, null, 0));
