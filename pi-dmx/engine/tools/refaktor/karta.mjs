/** KARTA ÖVER ANALYSATORN (refaktorn 2026-11-14): vilka fält varje metod läser/skriver och vilka metoder den anropar - underlaget för
 *  att bryta ut en analys i taget.   node tools/refaktor/karta.mjs [src/analyser.ts] [--json ut.json]
 *  Skriver per metod: rader, anrop, antal egna fält; och per fält: vilka metoder som rör det. */
import ts from "typescript"; import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2), file = args.find(a => !a.startsWith("--")) || "src/analyser.ts";
const src = readFileSync(file, "utf8"), sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true);
const line = pos => sf.getLineAndCharacterOfPosition(pos).line + 1;
const classes = sf.statements.filter(ts.isClassDeclaration);
const out = { file, classes: [] };
for (const c of classes) {
  const members = {}, fields = {}, methods = {};
  for (const m of c.members) {
    const name = m.name && (ts.isIdentifier(m.name) || ts.isPrivateIdentifier(m.name)) ? m.name.text : ts.isConstructorDeclaration(m) ? "constructor" : null;
    if (!name) continue;
    const mods = (ts.getModifiers(m) || []).map(x => ts.SyntaxKind[x.kind].replace("Keyword", "").toLowerCase());
    const kind = ts.isPropertyDeclaration(m) ? "field" : ts.isMethodDeclaration(m) ? "method" : ts.isGetAccessor(m) ? "get" : ts.isSetAccessor(m) ? "set" : ts.isConstructorDeclaration(m) ? "ctor" : "other";
    const rec = { name, kind, mods, from: line(m.getStart(sf)), to: line(m.end), uses: {}, calls: {}, writes: {}, statics: {} };
    const walk = n => {
      if (ts.isPropertyAccessExpression(n) && n.expression.kind === ts.SyntaxKind.ThisKeyword) {
        const f = n.name.text; rec.uses[f] = (rec.uses[f] || 0) + 1;
        const p = n.parent;
        if (ts.isCallExpression(p) && p.expression === n) rec.calls[f] = (rec.calls[f] || 0) + 1;
        if ((ts.isBinaryExpression(p) && p.left === n && p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && p.operatorToken.kind <= ts.SyntaxKind.LastAssignment)
          || ((ts.isPostfixUnaryExpression(p) || ts.isPrefixUnaryExpression(p)) && (p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken))) rec.writes[f] = (rec.writes[f] || 0) + 1;
      }
      if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === c.name.text) rec.statics[n.name.text] = (rec.statics[n.name.text] || 0) + 1;
      ts.forEachChild(n, walk);
    };
    walk(m);
    (kind === "field" ? fields : methods)[name + (kind === "get" ? " (get)" : kind === "set" ? " (set)" : "")] = rec;
    members[name] = kind;
  }
  out.classes.push({ name: c.name.text, from: line(c.getStart(sf)), to: line(c.end), fields, methods, members });
}
// toppnivå: konstanter/funktioner och var de används
const top = [];
for (const s of sf.statements) {
  if (ts.isVariableStatement(s)) for (const d of s.declarationList.declarations) if (ts.isIdentifier(d.name)) top.push({ name: d.name.text, kind: "const", from: line(s.getStart(sf)), to: line(s.end), exported: !!(ts.getModifiers(s) || []).some(m => m.kind === ts.SyntaxKind.ExportKeyword) });
  if (ts.isFunctionDeclaration(s) && s.name) top.push({ name: s.name.text, kind: "function", from: line(s.getStart(sf)), to: line(s.end), exported: !!(ts.getModifiers(s) || []).some(m => m.kind === ts.SyntaxKind.ExportKeyword) });
  if (ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s)) top.push({ name: s.name.text, kind: "type", from: line(s.getStart(sf)), to: line(s.end), exported: true });
}
out.top = top;
const j = args.indexOf("--json"); if (j >= 0) writeFileSync(args[j + 1], JSON.stringify(out));
for (const c of out.classes) {
  const F = Object.keys(c.fields), M = Object.values(c.methods);
  console.log(`klass ${c.name} rad ${c.from}-${c.to}: ${F.length} fält, ${M.length} metoder`);
  // fält -> metoder som rör dem
  const users = {}; for (const m of M) for (const f of Object.keys(m.uses)) (users[f] = users[f] || []).push(m.name);
  for (const m of M.sort((a, b) => a.from - b.from)) {
    const own = Object.keys(m.uses).filter(f => c.members[f] === "field");
    const only = own.filter(f => users[f].length === 1);
    console.log(`${String(m.from).padStart(5)}-${String(m.to).padEnd(5)} ${String(m.to - m.from + 1).padStart(4)} r  ${(m.mods.join(" ") + " " + m.name).trim().padEnd(34)} fält ${String(own.length).padStart(3)} (bara här ${String(only.length).padStart(3)})  anropar: ${Object.keys(m.calls).join(" ")}`);
  }
}
console.log(`toppnivå: ${top.filter(t => t.kind === "const").length} konstanter, ${top.filter(t => t.kind === "function").length} funktioner, ${top.filter(t => t.kind === "type").length} typer`);
