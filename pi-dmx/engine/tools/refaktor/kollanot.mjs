import ts from "typescript"; import fs from "node:fs"; import { execSync } from "node:child_process";
const NL = String.fromCharCode(10); let tot = 0, miss = 0;
for (const f of process.argv.slice(2)) {
  const text = execSync(`git show HEAD:pi-dmx/engine/src/${f}.ts`, { cwd: "../..", maxBuffer: 1e8 }).toString("utf8"), sf = ts.createSourceFile(f, text, ts.ScriptTarget.ES2022, true);
  const md = fs.readFileSync(`docs/analysator/${f}.md`, "utf8"); const cm = new Map();
  const visit = n => { if (n.kind === ts.SyntaxKind.JSDoc) return; const p = n.getFullStart(); for (const r of [...(ts.getLeadingCommentRanges(text, p) ?? []), ...(ts.getTrailingCommentRanges(text, p) ?? [])]) cm.set(r.pos, r); for (const c of n.getChildren(sf)) visit(c); };
  visit(sf);
  for (const c of cm.values()) { let t = text.slice(c.pos, c.end); const lines = t.startsWith("//") ? [t.replace(/^\/\/+ ?/, "")] : t.replace(/^\/\*+/, "").replace(/\*+\/$/, "").split(NL).map(l => l.replace(/^\s*\* ?/, ""));
    for (const l of lines) { const s = l.trim(); if (s.length < 4) continue; tot++; if (!md.includes(s)) { miss++; if (miss <= 5) console.log("SAKNAS i", f, ":", s.slice(0, 100)); } } }
}
console.log(`kommentarrader kontrollerade ${tot}, saknas i anteckningarna ${miss}`);
