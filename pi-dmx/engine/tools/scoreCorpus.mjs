// Kor HELA den inspelade korpusen genom analysatorn och jamfor mot katalogfacit.
// FARSKA instanser per klipp -- se carryOver.mjs for det som speglar live-motorn.
//
//   node tools/scoreCorpus.mjs <korpuskatalog>
//   OLD=1 ...    kor dist/analyserOld.js i stallet (A/B)
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadCatalog, lookup, fold, relation } from "./catalog.mjs";

const mod = process.env.OLD ? "../dist/analyserOld.js" : "../dist/analyser.js";
const { Analyser } = await import(mod);
const { defaultConfig } = await import("../dist/config.js");

const DIR = process.argv[2] || "tools/corpus";
const HOP = 128, SR = 48000;
const cat = loadCatalog();

const man = new Map();
const mp = join(DIR, "manifest.tsv");
if (existsSync(mp)) {
  for (const line of readFileSync(mp, "utf8").split("\n").slice(1)) {
    const c = line.split("\t");
    if (c.length >= 6) man.set(c[5].trim(), { artist: c[1], title: c[2] });
  }
}

// TAK PER LAT. Spellistan rullar runt, sa korpusen far manga inspelningar av
// samma lat. De ar korrelerade och tillfor knappt nagon statistik -- men all
// kortid. MAXPER=3 kortar en svepning fran >10 min till nagra minuter utan att
// andra slutsatserna. MAXPER=0 stanger av taket.
const MAXPER = process.env.MAXPER === undefined ? 3 : Number(process.env.MAXPER);
const seenCount = new Map();

const rows = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".wav")).sort()) {
  const meta = man.get(f);
  if (!meta) continue;
  if (MAXPER > 0) {
    const k = (meta.artist + "|" + meta.title).toLowerCase();
    const c = (seenCount.get(k) || 0) + 1;
    seenCount.set(k, c);
    if (c > MAXPER) continue;
  }
  const rec = lookup(cat, meta.artist, meta.title);
  if (!rec) { rows.push({ f, artist: meta.artist, title: meta.title, truth: null }); continue; }

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
    if (ms >= 5000 && fr.bpm > 0) got.push(fr.bpm);   // 5 s inlasning bort
  }
  if (!got.length) continue;
  // SLUTLASET ar minst lika viktigt som medianen: klippen ar 40 s men latarna
  // 3-4 minuter. En rattning som sker vid 30 s drar ner medianen kraftigt men ar
  // RATT under resten av laten. Utan det har mattet ser en sen men korrekt
  // sjalvrattning ut som ett misslyckande.
  const endLock = got.length ? got[got.length - 1] : 0;   // sista i insamlingsordning
  got.sort((a, b) => a - b);
  const med = got[got.length >> 1];
  const tf = fold(rec.bpm);
  // Alternativfacit far racka om det viker till nagot annat (annan inspelning).
  const hit = (t) => got.filter((b) => Math.abs(b / fold(t) - 1) <= 0.04).length;
  const best = rec.alt ? Math.max(hit(rec.bpm), hit(rec.alt)) : hit(rec.bpm);
  const endOk = Math.abs(endLock / tf - 1) <= 0.06 ||
                (rec.alt ? Math.abs(endLock / fold(rec.alt) - 1) <= 0.06 : false);
  rows.push({ f, artist: meta.artist, title: meta.title, truth: rec.bpm, variable: rec.variable, tf, med, endLock, endOk,
              ok: (100 * best) / got.length });
}

// VARIABELT tempo raknas SEPARAT. De latarna driver av konstruktion och har inget
// stabilt tempo att traffa -- att rakna dem som fel mater fel sak.
const varRows = rows.filter((r) => r.truth && r.med && r.variable);
const scored = rows.filter((r) => r.truth && r.med && !r.variable);
const catOf = (r) => (r.ok >= 60 ? "RATT" : relation(r.med / r.tf));
scored.sort((a, b) => a.ok - b.ok);
for (const r of scored)
  console.log(`  ${String(Math.round(r.ok)).padStart(3)}%  ${String(r.med).padStart(3)} mot ${String(r.tf).padStart(3)}` +
              ` (facit ${String(r.truth).padStart(3)})  ${catOf(r).padEnd(5)} ${(r.artist + " – " + r.title).slice(0, 44)}`);

// Korpusen innehaller ofta FLERA inspelningar av samma lat (spellistan rullar runt).
// 62 inspelningar kan vara 8 unika latar -- redovisa BADA, annars overdriver siffran:
// upprepade inspelningar av samma lat ar korrelerade, inte oberoende test.
const byTitle = new Map();
for (const r of scored) {
  const k = (r.artist + "|" + r.title).toLowerCase();
  if (!byTitle.has(k)) byTitle.set(k, []);
  byTitle.get(k).push(r);
}
const uniqOk = [...byTitle.values()].filter((v) => v.every((r) => r.ok >= 60)).length;
const nOk = scored.filter((r) => r.ok >= 60).length;
const avg = scored.reduce((s, r) => s + r.ok, 0) / Math.max(1, scored.length);

const endOkN = scored.filter((r) => r.endOk).length;
console.log(`\n  SLUTLAS ratt: ${endOkN}/${scored.length} (${Math.round((100 * endOkN) / Math.max(1, scored.length))} %)` +
            `   <- det varde som galler resten av laten`);
console.log(`  ${byTitle.size} UNIKA latar, ratt i ALLA sina inspelningar: ${uniqOk}/${byTitle.size}`);
console.log(`  ${scored.length} inspelningar | RATT (>=60 %): ${nOk} (${Math.round((100 * nOk) / Math.max(1, scored.length))} %) | snitt ${avg.toFixed(1)} %`);
const by = {};
for (const r of scored) by[catOf(r)] = (by[catOf(r)] || 0) + 1;
console.log("  felkategorier:", Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" "));

if (varRows.length) {
  const vOk = varRows.filter((r) => r.ok >= 60).length;
  console.log(`  (utanfor: ${varRows.length} inspelningar av latar med VARIABELT tempo, ${vOk} inom troskeln — raknas ej)`);
}
const miss = [...new Set(rows.filter((r) => !r.truth).map((r) => `${r.artist} – ${r.title}`))];
if (miss.length) console.log(`\n  ${miss.length} UTAN FACIT:\n    ` + miss.join("\n    "));
