// BOXNINGSHITTAREN (2026-10-18): läser V8:s --trace-turbo-JSON och listar varje ställe där TurboFan boxar ett decimaltal
// (ChangeFloat64ToTagged* = en ny HeapNumber, 16 B skräp per körning) med fil:rad i dist - även i inlinade funktioner.
// Använd: node --trace-turbo --turbo-filter=<funktion> --trace-turbo-path=<kat> tools/liveLab.mjs --sek=5 --varm=50 --gcrakna
//         node tools/boxFinder.mjs <kat> [filnamnsdel=effects.js] [funktion]
// Senaste optimeringen per funktion räknas (tidigare versioner kan vara deoptade). Visar rad + källtext.
import fs from "node:fs";
import path from "node:path";

const [dir, fileHint = "effects.js", fnHint] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f));
const latest = new Map();   // funktion@fil -> {file, id}
for (const f of files) {
  const id = Number(/-(\d+)\.json$/.exec(f)?.[1] ?? 0);
  let j; try { j = JSON.parse(fs.readFileSync(f, "utf8")); } catch { continue; }   // halvskriven (processen avslutades mitt i en kompilering)
  const srcName = j.function.sourceName;
  if (!srcName?.includes(fileHint) || (fnHint && j.function.functionName !== fnHint)) continue;
  const key = j.function.functionName + "@" + path.basename(srcName) + ":" + j.function.startPosition;
  if (!latest.has(key) || latest.get(key).id < id) latest.set(key, { file: f, id });
}
const lineOf = new Map();
function line(sourceName, offset) {
  let t = lineOf.get(sourceName);
  if (!t) { const txt = fs.readFileSync(new URL(sourceName), "utf8"); t = { txt, nl: [0] }; for (let i = 0; i < txt.length; i++) if (txt[i] === "\n") t.nl.push(i + 1); lineOf.set(sourceName, t); }
  let lo = 0, hi = t.nl.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (t.nl[mid] <= offset) lo = mid; else hi = mid - 1; }
  return { n: lo + 1, text: t.txt.slice(t.nl[lo], t.nl[lo + 1] ? t.nl[lo + 1] - 1 : undefined).trim() };
}
for (const [key, { file }] of latest) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  // sista grafen där boxningsnoderna fortfarande syns (före EffectControlLinearization)
  let phase = null;
  for (const p of j.phases) if (p.type === "graph" && p.data?.nodes?.some((n) => /ChangeFloat64ToTagged|ChangeFloat64HoleToTagged/.test(n.label))) phase = p;
  if (!phase) { console.log(`${key}: inga boxningar`); continue; }
  const hits = new Map();
  for (const n of phase.data.nodes) {
    if (!/ChangeFloat64ToTagged|ChangeFloat64HoleToTagged/.test(n.label)) continue;
    const sp = n.sourcePosition; let srcName = j.function.sourceName, off = sp?.scriptOffset ?? -1;
    if (sp && sp.inliningId >= 0 && j.inlinings?.[sp.inliningId]) { const inl = j.inlinings[sp.inliningId]; srcName = j.sources[inl.sourceId]?.sourceName ?? srcName; }
    if (off < 0) continue;
    const L = line(srcName, off), k = `${path.basename(new URL(srcName).pathname)}:${L.n}`;
    const h = hits.get(k) ?? { n: 0, text: L.text }; h.n++; hits.set(k, h);
  }
  console.log(`\n== ${key}  (fas ${phase.name}, ${[...hits.values()].reduce((a, h) => a + h.n, 0)} boxningsnoder)`);
  for (const [k, h] of [...hits].sort((a, b) => b[1].n - a[1].n)) console.log(String(h.n).padStart(3), k.padEnd(22), h.text.slice(0, 130));
}
