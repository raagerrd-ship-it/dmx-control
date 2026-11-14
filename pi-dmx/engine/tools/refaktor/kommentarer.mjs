/** KOMMENTARERNA UT UR KODEN (refaktorn 2026-11-14, ägaren: "Flytta ut alla kommentarer").
 *    node tools/refaktor/kommentarer.mjs <src/fil.ts> [...] [--ut docs/analysator] [--dry]
 *  Varje kommentar flyttas ORDAGRANT till <ut>/<fil>.md, under den konstant, det fält eller den metod den hörde till (kommentarer
 *  inne i en metod får en kodrad som ankare). Kvar i koden: filhuvudet (en mening + pekare till anteckningarna) och EN kort etikett
 *  per deklaration som hade en kommentar (frasen före första parentes/kolon/tankstreck/punkt). Direktiv (@ts-, eslint, ///) rörs inte.
 *  Koden ändras inte: beviset är att tsc --removeComments ger samma JS före och efter (tools/refaktor/kommentarbevis.sh). */
import ts from "typescript"; import fs from "node:fs"; import path from "node:path";
const argv = process.argv.slice(2), DRY = argv.includes("--dry"), ui = argv.indexOf("--ut"), UT = ui >= 0 ? argv[ui + 1] : "docs/analysator";
const filer = argv.filter((a, i) => a.endsWith(".ts") && argv[i - 1] !== "--ut");
const NL = String.fromCharCode(10);
const clean = c => {   // kommentarens text utan markörer, radvis
  let t = c;
  if (t.startsWith("//")) return [t.replace(/^\/\/+ ?/, "").trimEnd()];
  t = t.replace(/^\/\*+/, "").replace(/\*+\/$/, "");
  return t.split(NL).map(l => l.replace(/^\s*\* ?/, "").trimEnd()).filter((l, i, a) => !(l === "" && (i === 0 || i === a.length - 1)));
};
const label = lines => {   // kort etikett: frasen före första parentes/kolon/tankstreck/punkt
  let s = (lines.find(l => l.trim()) ?? "").trim().replace(/^[─\-=\s]+|[─\-=\s]+$/g, "");
  let cut = s.length; for (const d of [" (", ": ", " - ", " — ", " – ", ". ", " = ", "; ", ", se ", " -> "]) { const i = s.indexOf(d); if (i >= 6 && i < cut) cut = i; }
  s = s.slice(0, cut).replace(/[.:,;]+$/, "").trim(); if (s.length > 80) s = s.slice(0, 77).replace(/\s+\S*$/, "") + "...";
  return s.length >= 3 && /^[A-Za-zÅÄÖåäö0-9]/.test(s) ? s : "";   // en fortsättningsrad ("(ser alla hops ...") är ingen etikett
};
let totC = 0, totL = 0;
for (const file of filer) {
  const text = fs.readFileSync(file, "utf8"), sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true), bas = path.basename(file);
  const lineStart = p => text.lastIndexOf(NL, p - 1) + 1, lineEnd = p => { const i = text.indexOf(NL, p); return i < 0 ? text.length : i; };
  // alla kommentarer (trivia före varje token, både "ledande" och "efterföljande" på samma rad)
  const cm = new Map();
  const visit = n => { if (n.kind === ts.SyntaxKind.JSDoc) return; const p = n.getFullStart();
    for (const r of [...(ts.getLeadingCommentRanges(text, p) ?? []), ...(ts.getTrailingCommentRanges(text, p) ?? [])]) cm.set(r.pos, r);
    for (const c of n.getChildren(sf)) visit(c); };
  visit(sf);
  const comments = [...cm.values()].sort((a, b) => a.pos - b.pos).filter(c => !/^\/\/\/\s*<|^\/\/\s*@ts-|^\/\*\s*@ts-|eslint-|^\/\*!/.test(text.slice(c.pos, c.end)));
  // ägare: toppsatser, och medlemmar i klasser/gränssnitt
  const owners = [];
  const nameOf = n => ts.isVariableStatement(n) ? n.declarationList.declarations.map(d => d.name.getText(sf)).join(", ") : ts.isConstructorDeclaration(n) ? "constructor" : n.name ? n.name.getText(sf) + (ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n) ? "()" : "") : ts.isImportDeclaration(n) ? "import" : ts.SyntaxKind[n.kind];
  for (const s of sf.statements) { owners.push({ n: s, name: nameOf(s), parent: "" });
    if (ts.isClassDeclaration(s) || ts.isInterfaceDeclaration(s)) for (const m of s.members) owners.push({ n: m, name: nameOf(m), parent: s.name?.text ?? "" }); }
  const deep = pos => { let best = null; for (const o of owners) if (pos >= o.n.getFullStart() && pos < o.n.end && (!best || o.n.getFullStart() >= best.n.getFullStart())) best = o; return best; };
  const notes = new Map();   // ägare -> { lead: [], trail: [], body: [] }
  const N = o => notes.get(o) ?? notes.set(o, { lead: [], trail: [], body: [] }).get(o);
  const loose = [], edits = [], labelFor = new Map(), headLines = [];
  let first = true;
  for (const c of comments) {
    const raw = text.slice(c.pos, c.end), lines = clean(raw), ls = lineStart(c.pos), before = text.slice(ls, c.pos), after = text.slice(c.end, lineEnd(c.end));
    const ownLine = /^\s*$/.test(before) && /^\s*$/.test(after);
    // filhuvudet = första kommentaren om den står före all kod
    if (first && sf.statements.length && c.end <= sf.statements[0].getStart(sf)) { first = false; headLines.push(...lines); edits.push({ pos: ls, end: Math.min(text.length, lineEnd(c.end) + 1), text: "" }); continue; }
    first = false;
    // efterföljande på samma rad som en ägares slut?
    let o = null, kind = "";
    if (!ownLine && /\S/.test(before)) { const prev = [...owners].reverse().find(x => x.n.end <= c.pos && x.n.end >= ls); if (prev) { o = prev; kind = "trail"; } }
    if (!o) { const d = deep(c.pos); if (d) { o = d; kind = c.pos < d.n.getStart(sf) ? "lead" : "body"; } }
    if (!o) { loose.push(lines); }
    else if (kind === "body") {
      let anchor = before.trim(); if (!anchor) { let p = lineEnd(c.end) + 1; while (p < text.length) { const l = text.slice(p, lineEnd(p)).trim(); if (l && !l.startsWith("//") && !l.startsWith("*") && !l.startsWith("/*")) { anchor = l; break; } p = lineEnd(p) + 1; } }
      anchor = anchor.replace(/\s*\/\/.*$/, ""); if (anchor.length > 90) anchor = anchor.slice(0, 87) + "...";
      N(o).body.push({ anchor, lines });
    } else N(o)[kind].push(lines);
    if (o && kind !== "body" && !labelFor.has(o)) { const l = label(lines); if (l) labelFor.set(o, l); }
    // ta bort ur koden
    if (ownLine) edits.push({ pos: ls, end: Math.min(text.length, lineEnd(c.end) + 1), text: "" });
    else if (/^\s*$/.test(after)) edits.push({ pos: c.pos - (before.length - before.trimEnd().length), end: c.end, text: "" });
    else edits.push({ pos: c.pos, end: c.end, text: /\S$/.test(before) && /^\S/.test(after) ? " " : "" });
  }
  // etiketter: metoder/funktioner/klasser/typer får en rad ovanför, konstanter/fält en kort kommentar sist på sin sista rad
  const tailDone = new Set();
  for (const [o, l] of labelFor) {
    const n = o.n, block = ts.isMethodDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n) || ts.isInterfaceDeclaration(n) || ts.isConstructorDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n) || ts.isTypeAliasDeclaration(n);
    if (block) { const st = n.getStart(sf), ls = lineStart(st), ind = text.slice(ls, st); if (/^\s*$/.test(ind)) edits.push({ pos: ls, end: ls, text: `${ind}/** ${l}. */${NL}`, ins: 1 }); }
    else { const le = lineEnd(n.end); if (tailDone.has(le)) continue; tailDone.add(le); edits.push({ pos: le, end: le, text: `   // ${l}`, ins: 2 }); }
  }
  const head = headLines.length ? (headLines.join(" ").replace(/\s+/g, " ").split(/(?<=\.)\s/)[0] || headLines[0]).slice(0, 220) : "";
  edits.push({ pos: 0, end: 0, text: `/** ${head ? head + " " : ""}Anteckningar (kommentarerna som stod i koden): ${UT}/${bas.replace(/\.ts$/, ".md")} */${NL}`, ins: 0 });
  // tillämpa bakifrån (insättningar efter borttagningar på samma position)
  edits.sort((a, b) => b.pos - a.pos || (a.ins ?? -1) - (b.ins ?? -1));   // samma position: borttagningen först, sedan insättningarna
  let out = text; for (const e of edits) out = out.slice(0, e.pos) + e.text + out.slice(e.end);
  out = out.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, NL + NL);
  // anteckningarna
  const blk = lines => "```text" + NL + lines.join(NL) + NL + "```" + NL;
  let md = `# ${bas} - anteckningar${NL}${NL}Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.${NL}Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.${NL}${NL}`;
  if (headLines.length) md += `## Filhuvudet${NL}${NL}${blk(headLines)}${NL}`;
  let lastParent = null;
  for (const o of owners) { const x = notes.get(o); if (!x) continue;
    if (o.parent !== lastParent) { lastParent = o.parent; md += o.parent ? `## ${o.parent}${NL}${NL}` : `## Toppnivå${NL}${NL}`; }
    md += `### ${o.name}${NL}${NL}`;
    for (const l of x.lead) md += blk(l);
    for (const l of x.trail) md += `På raden: ${l.join(" ")}${NL}${NL}`;
    for (const b of x.body) md += `Vid \`${b.anchor.replace(/`/g, "'")}\`:${NL}${NL}${blk(b.lines)}`;
    md += NL; }
  if (loose.length) { md += `## Övrigt${NL}${NL}`; for (const l of loose) md += blk(l); }
  totC += comments.length; totL += text.split(NL).length - out.split(NL).length;
  console.log(`${file}: ${comments.length} kommentarer ut, ${text.split(NL).length} -> ${out.split(NL).length} rader, etiketter kvar ${labelFor.size}, anteckningar ${md.split(NL).length} rader`);
  if (!DRY) { fs.mkdirSync(UT, { recursive: true }); fs.writeFileSync(path.join(UT, bas.replace(/\.ts$/, ".md")), md); fs.writeFileSync(file, out); }
  else if (argv.includes("--visa")) console.log(out.split(NL).slice(0, Number(argv[argv.indexOf("--visa") + 1]) || 60).join(NL));
}
console.log(`SUMMA: ${totC} kommentarer, ${totL} rader mindre kod`);
