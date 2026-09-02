// Poangsatter LIVE-motorns las mot katalogfacit, ur korpusmanifestet.
// `bpm_end` ar motorns las ~45 s in i laten -- det ar den enda matningen som
// speglar vad anvandaren faktiskt ser.
//
//   node tools/scoreLive.mjs [manifest.tsv]
import { readFileSync } from "node:fs";
import { loadCatalog, lookup, fold, relation } from "./catalog.mjs";

const MAN = process.argv[2] || "tools/corpus/manifest.tsv";
const cat = loadCatalog();

const rows = [], miss = [];
for (const l of readFileSync(MAN, "utf8").split("\n").slice(1)) {
  const c = l.split("\t");
  if (c.length < 6) continue;
  const rec = lookup(cat, c[1], c[2]);
  if (!rec) { miss.push(`${c[1]} – ${c[2]}`); continue; }
  const got = Number(c[4]);          // bpm_end
  if (!got) continue;
  const tf = fold(rec.bpm);
  const ok = Math.abs(got / tf - 1) <= 0.06 ||
             (rec.alt ? Math.abs(got / fold(rec.alt) - 1) <= 0.06 : false);
  rows.push({ artist: c[1], title: c[2], truth: rec.bpm, tf, got, ok,
              cat: ok ? "RATT" : relation(got / tf) });
}

rows.sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? 1 : -1));
for (const r of rows)
  console.log(`  ${r.ok ? "OK  " : "FEL "} ${String(r.got).padStart(3)} mot ${String(r.tf).padStart(3)}` +
              ` (facit ${String(r.truth).padStart(3)})  ${r.cat.padEnd(5)} ${(r.artist + " – " + r.title).slice(0, 42)}`);

const n = rows.length, ok = rows.filter((r) => r.ok).length;
console.log(`\n  LIVE: ${ok}/${n} ratt (${n ? Math.round((100 * ok) / n) : 0} %)`);
const by = {};
for (const r of rows) if (!r.ok) by[r.cat] = (by[r.cat] || 0) + 1;
if (Object.keys(by).length)
  console.log("  felkategorier:", Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(" "));

const uniqMiss = [...new Set(miss)];
if (uniqMiss.length) console.log(`\n  ${uniqMiss.length} UTAN FACIT:\n    ` + uniqMiss.join("\n    "));
