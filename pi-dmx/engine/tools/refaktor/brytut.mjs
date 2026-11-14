/** BRYT UT EN ANALYS UR ANALYSATORN (refaktorn 2026-11-14) - mekaniskt, med kompilatorns symboltabell.
 *    node tools/refaktor/brytut.mjs <config.json> [--dry]
 *  config: { file: "analyserDrop.ts", cls: "DropDetector", prop: "drop", header: "...", methods: [...],
 *            plumbing?: [...], fields?: { add?: [], skip?: [] }, consts?: { skip?: [] } }
 *  GÖR: flyttar metoderna i `methods` ur klassen Analyser till en egen klass i src/<file>, tillsammans med
 *    - de privata instansfält som bara analysen SKRIVER (rörledningen - split, konstruktorn, ramen - får skriva och läsa),
 *    - de privata statiska fält och toppnivåkonstanter/funktioner som bara analysen använder (och som inte beror på annat i filen).
 *  Analysatorn får fältet `<prop> = new <cls>(this)`; den nya klassen når analysatorn via `this.a`. Varje referens skrivs om via
 *  symbolen (inte texten): `x.fält` -> `x.<prop>.fält` överallt i src/, `this.annat` -> `this.a.annat` i det flyttade.
 *  Kommentarer följer med sina medlemmar ordagrant. Ingen kod ändras i övrigt - beviset är tools/refaktor/bevis.sh. */
import ts from "typescript"; import fs from "node:fs"; import path from "node:path";
const cfg = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), DRY = process.argv.includes("--dry");
const norm = p => path.resolve(p).replace(/\\/g, "/").toLowerCase();
const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile("tsconfig.json", ts.sys.readFile).config, ts.sys, process.cwd());
const program = ts.createProgram(parsed.fileNames, parsed.options), checker = program.getTypeChecker();
const files = program.getSourceFiles().filter(f => !f.isDeclarationFile && norm(f.fileName).startsWith(norm("src") + "/"));
const sf = files.find(f => norm(f.fileName) === norm("src/analyser.ts")), text = sf.text;
const A = sf.statements.find(s => ts.isClassDeclaration(s) && s.name?.text === "Analyser");
const fail = m => { console.error("FEL: " + m); process.exit(1); };
const warn = []; const W = m => warn.push(m);
const G = new Set(cfg.methods), PLUMB = new Set(cfg.plumbing ?? ["constructor", "pullSlowState", "pushSlowRecord", "pushBig", "drainBig", "drainRecords", "slowStep", "fillFrame", "hintTrackChange", "setVirtualClock", "sectionReset", "debugCandidates"]);
for (const g of G) PLUMB.delete(g);
const ADD = new Set(cfg.fields?.add ?? []), SKIP = new Set(cfg.fields?.skip ?? []), CSKIP = new Set(cfg.consts?.skip ?? []);
const has = (n, k) => (ts.getModifiers(n) ?? []).some(m => m.kind === k);
const mname = m => ts.isConstructorDeclaration(m) ? "constructor" : m.name && ts.isIdentifier(m.name) ? m.name.text : null;

// ── medlemmar och symboler ──
const memBySym = new Map(), members = [];
for (const m of A.members) { const n = mname(m); if (!n) continue; members.push(m); if (m.name) { const s = checker.getSymbolAtLocation(m.name); if (s) memBySym.set(s, m); } }
for (const g of G) if (!members.some(m => mname(m) === g)) fail(`metoden ${g} finns inte i Analyser`);
const topBySym = new Map(), topStmts = [];
for (const s of sf.statements) {
  if (ts.isVariableStatement(s)) { topStmts.push(s); for (const d of s.declarationList.declarations) if (ts.isIdentifier(d.name)) topBySym.set(checker.getSymbolAtLocation(d.name), s); }
  else if (ts.isFunctionDeclaration(s) && s.name) { topStmts.push(s); topBySym.set(checker.getSymbolAtLocation(s.name), s); }
  else if ((ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isClassDeclaration(s) || ts.isEnumDeclaration(s)) && s.name) topBySym.set(checker.getSymbolAtLocation(s.name), s);
}
const real = s => s && (s.flags & ts.SymbolFlags.Alias) ? checker.getAliasedSymbol(s) : s;
/** närmaste klassmedlem (eller toppsats) som noden ligger i */
const home = n => { for (let p = n; p; p = p.parent) { if (p.parent && ts.isClassLike(p.parent) && p.parent.members.includes(p)) return { cls: p.parent.name?.text ?? "", member: p, name: mname(p) ?? "" }; if (p.parent && ts.isSourceFile(p.parent)) return { cls: "", member: p, name: "" }; } return { cls: "", member: null, name: "" }; };
const isWrite = n => { const p = n.parent; return (ts.isBinaryExpression(p) && p.left === n && p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && p.operatorToken.kind <= ts.SyntaxKind.LastAssignment) || ((ts.isPostfixUnaryExpression(p) || ts.isPrefixUnaryExpression(p)) && (p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken)); };
const memRefs = new Map(), topRefs = new Map();   // medlem/toppsats -> [{ node, file, home, write }]
for (const f of files) {
  const walk = n => {
    if (ts.isPropertyAccessExpression(n)) { const m = memBySym.get(checker.getSymbolAtLocation(n.name)); if (m) (memRefs.get(m) ?? memRefs.set(m, []).get(m)).push({ node: n, file: f, home: home(n), write: isWrite(n) }); }
    else if (ts.isIdentifier(n) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) {
      const s = topBySym.get(real(checker.getSymbolAtLocation(n)));
      if (s && !(ts.isVariableDeclaration(n.parent) && n.parent.name === n) && !(ts.isFunctionDeclaration(n.parent) && n.parent.name === n) && !ts.isImportSpecifier(n.parent) && !ts.isExportSpecifier(n.parent)) (topRefs.get(s) ?? topRefs.set(s, []).get(s)).push({ node: n, file: f, home: home(n) });
    }
    ts.forEachChild(n, walk);
  };
  walk(f);
}
// ── vad flyttar ──
const moving = new Set(members.filter(m => G.has(mname(m))));
const inMoving = h => h.cls === "Analyser" && moving.has(h.member);
let changed = true;
while (changed) {
  changed = false;
  for (const m of members) {
    if (moving.has(m) || !ts.isPropertyDeclaration(m)) continue;
    const n = mname(m), refs = memRefs.get(m) ?? [];
    if (SKIP.has(n)) continue;
    if (!(has(m, ts.SyntaxKind.PrivateKeyword) || ADD.has(n))) continue;
    if (!refs.some(r => inMoving(r.home))) continue;
    if (has(m, ts.SyntaxKind.StaticKeyword)) {
      if (!refs.every(r => inMoving(r.home))) continue;
      // statiska initierare körs när modulen laddas: får inte röra något som ligger kvar i analyser.ts
      let ok = true; const chk = x => { if (ts.isIdentifier(x)) { const s = real(checker.getSymbolAtLocation(x)); if (s === checker.getSymbolAtLocation(A.name)) ok = false; const t = topBySym.get(s); if (t && !moving.has(t)) ok = false; if (s && s !== real(s)) ok = false; } ts.forEachChild(x, chk); };
      if (m.initializer) chk(m.initializer);
      if (!ok) continue;
      moving.add(m); changed = true; continue;
    }
    const plumb = r => r.home.cls === "Analyser" && PLUMB.has(r.home.name);
    const other = refs.filter(r => !inMoving(r.home) && !plumb(r));
    const wOther = other.filter(r => r.write), wGroup = refs.filter(r => r.write && inMoving(r.home));
    if (ADD.has(n) || (wOther.length === 0 && (wGroup.length > 0 || other.length === 0))) { moving.add(m); changed = true; }
  }
}
// toppnivå: bara det som enbart används i det flyttade och som inte beror på annat i filen vid laddning
const tmoving = new Set();
for (const s of topStmts) {
  if (has(s, ts.SyntaxKind.ExportKeyword)) continue;
  const names = ts.isVariableStatement(s) ? s.declarationList.declarations.map(d => d.name.getText(sf)) : [s.name.text];
  if (names.some(n => CSKIP.has(n))) continue;
  const refs = topRefs.get(s) ?? [];
  if (refs.length && refs.every(r => inMoving(r.home))) tmoving.add(s);
}
changed = true;
while (changed) {
  changed = false;
  for (const s of [...tmoving]) {
    if (!ts.isVariableStatement(s)) continue;
    let ok = true;
    const chk = x => { if (ts.isIdentifier(x) && !(ts.isPropertyAccessExpression(x.parent) && x.parent.name === x)) { const raw = checker.getSymbolAtLocation(x), s2 = real(raw); if (raw && raw !== s2) ok = false; const t = topBySym.get(s2); if (t && t !== s && !tmoving.has(t)) ok = false; } ts.forEachChild(x, chk); };
    for (const d of s.declarationList.declarations) if (d.initializer) chk(d.initializer);
    if (!ok) { tmoving.delete(s); changed = true; }
  }
}
for (const s of topStmts) if (!tmoving.has(s) && (topRefs.get(s) ?? []).some(r => r.home.member && tmoving.has(r.home.member))) fail(`toppsats beror på flyttad konstant: ${s.getText(sf).slice(0, 60)}`);
const isMoving = n => { for (let p = n; p; p = p.parent) if (moving.has(p) || tmoving.has(p)) return true; return false; };

// ── intervall (kommentaren ovanför följer med; kommentaren efter på samma rad likaså om medlemmen är sist på raden) ──
const lineStart = p => text.lastIndexOf("\n", p - 1) + 1, lineEnd = p => { const i = text.indexOf("\n", p); return i < 0 ? text.length : i + 1; };
const range = n => {
  const tok = n.getStart(sf), full = n.getFullStart();
  const first = /^\s*$/.test(text.slice(lineStart(tok), tok));
  let start = tok;
  if (first) { const nl = text.indexOf("\n", full); start = nl >= 0 && nl < tok ? nl + 1 : lineStart(tok); }
  let end = n.end; const rest = text.slice(end, lineEnd(end));
  if (/^\s*(\/\/.*)?\r?\n?$/.test(rest)) end = lineEnd(end);
  return [start, end];
};
// ── redigeringar ──
const edits = new Map();   // fil -> [{ pos, end, text }]
const E = (f, pos, end, t) => (edits.get(f) ?? edits.set(f, []).get(f)).push({ pos, end, text: t });
const movedInst = new Set([...moving].filter(m => !has(m, ts.SyntaxKind.StaticKeyword))), movedStat = new Set([...moving].filter(m => has(m, ts.SyntaxKind.StaticKeyword)));
const inputs = new Set(), outputs = new Set(), unPrivate = new Set(), keepPrivate = new Set(moving), needExport = new Set(), otherFilesStatic = new Set();
for (const [m, refs] of memRefs) for (const r of refs) {
  const n = r.node, inside = isMoving(n), thisRecv = n.expression.kind === ts.SyntaxKind.ThisKeyword;
  if (moving.has(m)) {
    if (movedStat.has(m)) { if (!inside) fail(`statiskt ${mname(m)} används utanför`); if (ts.isIdentifier(n.expression) && n.expression.text === "Analyser") E(r.file, n.expression.getStart(), n.expression.end, cfg.cls); continue; }
    if (inside && thisRecv) continue;
    E(r.file, n.expression.end, n.expression.end, "." + cfg.prop); outputs.add(mname(m)); keepPrivate.delete(m);
  } else if (inside) { inputs.add(mname(m)); if (has(m, ts.SyntaxKind.PrivateKeyword) || has(m, ts.SyntaxKind.ProtectedKeyword)) unPrivate.add(m); }
}
// `this` i det flyttade: allt som inte är ett flyttat instansfält går via this.a
for (const m of moving) {
  const walk = n => {
    if (n.kind === ts.SyntaxKind.ThisKeyword) {
      const p = n.parent, own = ts.isPropertyAccessExpression(p) && p.expression === n && movedInst.has(memBySym.get(checker.getSymbolAtLocation(p.name)));
      if (!own) { E(sf, n.getStart(sf), n.end, "this.a"); if (!(ts.isPropertyAccessExpression(p) && p.expression === n)) W(`naket this i ${mname(m)} (rad ${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}) -> this.a`); if (ts.isPropertyDeclaration(m)) W(`fältinitieraren ${mname(m)} läser analysatorn (this.a finns inte då) - flytta initieringen för hand`); }
    }
    if (ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n)) W(`function-uttryck i ${mname(m)}: this byter betydelse där - kontrollera`);
    ts.forEachChild(n, walk);
  };
  walk(m);
}
for (const [s, refs] of topRefs) for (const r of refs) if (!tmoving.has(s) && isMoving(r.node) && (ts.isVariableStatement(s) || ts.isFunctionDeclaration(s))) needExport.add(s);
for (const m of [...moving, ...unPrivate]) { if (keepPrivate.has(m)) continue; const mod = (ts.getModifiers(m) ?? []).find(x => x.kind === ts.SyntaxKind.PrivateKeyword || x.kind === ts.SyntaxKind.ProtectedKeyword); if (mod) E(sf, mod.getStart(sf), mod.end + (text[mod.end] === " " ? 1 : 0), ""); }
for (const s of needExport) if (!has(s, ts.SyntaxKind.ExportKeyword)) E(sf, s.getStart(sf), s.getStart(sf), "export ");

// DOUBLE_FROM_START: flyttade namn ur analysatorns lista, in i modulens
const dbl = [];
{ const st = sf.statements.find(s => ts.isVariableStatement(s) && s.declarationList.declarations.some(d => d.name.getText(sf) === "DOUBLE_FROM_START"));
  if (st) { let arr = st.declarationList.declarations[0].initializer; while (arr && !ts.isArrayLiteralExpression(arr)) arr = arr.expression;
    const mv = new Set([...movedInst].map(mname));
    const keep = []; for (const el of arr.elements) if (ts.isStringLiteral(el)) (mv.has(el.text) ? dbl : keep).push(el.text);
    if (dbl.length) { const rows = []; for (let i = 0; i < keep.length; i += 10) rows.push("  " + keep.slice(i, i + 10).map(k => `'${k}'`).join(", ") + ","); const NL = String.fromCharCode(10); E(sf, arr.getStart(sf), arr.end, "[" + NL + rows.join(NL) + NL + "]"); } } }

// ── importer till modulen ──
const impA = new Map(), impO = new Map();   // namn -> typeOnly ; spec -> Map(text -> typeOnly)
const typePos = n => { for (let p = n.parent; p; p = p.parent) { if (ts.isTypeNode(p)) return true; if (ts.isStatement(p) || ts.isClassElement(p)) return false; } return false; };
const scan = root => { const walk = n => {
  if (ts.isIdentifier(n) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(ts.isPropertyAssignment(n.parent) && n.parent.name === n) && !(ts.isClassElement(n.parent) && n.parent.name === n)) {
    const raw = checker.getSymbolAtLocation(n), s = real(raw), tp = typePos(n);
    if (raw && raw !== s && raw.declarations?.[0] && raw.declarations[0].getSourceFile() === sf) {
      const d = raw.declarations[0]; let imp = d; while (imp && !ts.isImportDeclaration(imp)) imp = imp.parent;
      if (imp) { const spec = imp.moduleSpecifier.getText(sf), t = ts.isImportSpecifier(d) ? (d.propertyName ? `${d.propertyName.text} as ${d.name.text}` : d.name.text) : ts.isImportClause(d) ? `default:${d.name.text}` : `*:${d.name.text}`;
        const mp = impO.get(spec) ?? impO.set(spec, new Map()).get(spec); mp.set(t, (mp.get(t) ?? true) && tp); }
    } else if (s && (topBySym.has(s)) && !tmoving.has(topBySym.get(s)) && s.declarations?.[0]?.getSourceFile() === sf) impA.set(n.text, (impA.get(n.text) ?? true) && (tp || ts.isInterfaceDeclaration(topBySym.get(s)) || ts.isTypeAliasDeclaration(topBySym.get(s))));
  }
  ts.forEachChild(n, walk); }; walk(root); };
for (const m of moving) scan(m); for (const s of tmoving) scan(s);
impA.set("Analyser", (impA.get("Analyser") ?? true));

// ── bygg modulen ──
const fe = edits.get(sf) ?? [];
const within = (e, a, b) => e.pos >= a && e.end <= b && !(e.pos === e.end && e.pos === b);   // en ren insättning precis efter intervallet hör till nästa sats
const piece = n => { const [a, b] = range(n); let t = text.slice(a, b); const inner = fe.filter(e => within(e, a, b)).sort((x, y) => y.pos - x.pos || y.end - x.end); for (const e of inner) t = t.slice(0, e.pos - a) + e.text + t.slice(e.end - a); return t; };
const ordered = [...moving].sort((x, y) => x.pos - y.pos), tordered = [...tmoving].sort((x, y) => x.pos - y.pos);
const impLines = [];
{ const names = [...impA].sort((a, b) => a[0].localeCompare(b[0])).map(([n, t]) => (t ? "type " : "") + n); impLines.push(`import { ${names.join(", ")} } from "./analyser.js";`);
  for (const [spec, mp] of impO) { const def = [...mp.keys()].find(k => k.startsWith("default:")), ns = [...mp.keys()].find(k => k.startsWith("*:")), named = [...mp].filter(([k]) => !k.includes(":")).map(([k, t]) => (t ? "type " : "") + k);
    if (ns) impLines.push(`import * as ${ns.slice(2)} from ${spec};`);
    if (def || named.length) impLines.push(`import ${[def ? def.slice(8) : "", named.length ? `{ ${named.join(", ")} }` : ""].filter(Boolean).join(", ")} from ${spec};`); } }
const STAB = "(this as unknown as Record<string, number>)";
let mod = `/** ${cfg.header} */\n${impLines.join("\n")}\n\n${tordered.map(piece).join("")}`;
if (dbl.length) mod += `/** Talfält som ska vara flyttal från start (se stabiliseringen i analyser.ts). */\nconst DOUBLE_FROM_START = [${dbl.map(d => `'${d}'`).join(", ")}] as const;\n`;
mod += `\nexport class ${cfg.cls} {\n  /** analysatorn som äger den här delen (delade signaler läses via den) */\n  a: Analyser;\n  constructor(a: Analyser) {\n    this.a = a;\n`;
if (dbl.length) mod += `    for (const k of DOUBLE_FROM_START) { const v = ${STAB}[k]; if (typeof v === 'number') { ${STAB}[k] = 0.5; ${STAB}[k] = v; } }\n`;
mod += `  }\n${ordered.map(piece).join("")}}\n`;
// ── analyser.ts: ta bort det flyttade, lägg till fältet och importen ──
const del = [...ordered, ...tordered].map(n => range(n));
let rest = fe.filter(e => !del.some(([a, b]) => within(e, a, b)));
for (const [a, b] of del) rest.push({ pos: a, end: b, text: "" });
const close = A.end - 1;
rest.push({ pos: lineStart(close), end: lineStart(close), text: `  /** ${cfg.short ?? cfg.header.split(". ")[0]} (${cfg.file}) */\n  readonly ${cfg.prop} = new ${cfg.cls}(this);\n` });
const lastImp = [...sf.statements].filter(ts.isImportDeclaration).pop();
rest.push({ pos: lineEnd(lastImp.end), end: lineEnd(lastImp.end), text: `import { ${cfg.cls} } from "./${cfg.file.replace(/\.ts$/, ".js")}";\n` });
const apply = (t, es) => { es.sort((x, y) => y.pos - x.pos || y.end - x.end); for (const e of es) t = t.slice(0, e.pos) + e.text + t.slice(e.end); return t; };
const outA = apply(text, rest);
// ── rapport ──
const nm = s => [...s].map(mname);
console.log(`${cfg.file}: klass ${cfg.cls}, fält ${cfg.prop}`);
console.log(`  metoder (${nm(ordered.filter(ts.isMethodDeclaration)).length}): ${nm(ordered.filter(ts.isMethodDeclaration)).join(" ")}`);
console.log(`  fält (${ordered.filter(m => ts.isPropertyDeclaration(m) && !has(m, ts.SyntaxKind.StaticKeyword)).length}): ${nm(ordered.filter(m => ts.isPropertyDeclaration(m) && !has(m, ts.SyntaxKind.StaticKeyword))).join(" ")}`);
console.log(`  statiska (${movedStat.size}): ${nm(movedStat).join(" ")}`);
console.log(`  toppnivå (${tordered.length}): ${tordered.map(s => ts.isVariableStatement(s) ? s.declarationList.declarations.map(d => d.name.getText(sf)).join(",") : s.name.text).join(" ")}`);
console.log(`  IN (läser ur analysatorn, ${inputs.size}): ${[...inputs].sort().join(" ")}`);
console.log(`  UT (läses utifrån, ${outputs.size}): ${[...outputs].sort().join(" ")}`);
console.log(`  importerar ur analyser.ts: ${[...impA.keys()].join(" ")}`);
console.log(`  flyttal från start: ${dbl.length}; rader: modul ${mod.split("\n").length}, analyser.ts ${text.split("\n").length} -> ${outA.split("\n").length}`);
for (const w of new Set(warn)) console.log("  VARNING: " + w);
// privata metoder som bara anropas från det flyttade men inte står i listan
for (const m of members) if (ts.isMethodDeclaration(m) && !moving.has(m) && has(m, ts.SyntaxKind.PrivateKeyword)) { const r = memRefs.get(m) ?? []; if (r.length && r.every(x => inMoving(x.home))) console.log(`  TIPS: ${mname(m)} anropas bara härifrån - lägg den i methods`); }
if (DRY) process.exit(0);
fs.writeFileSync("src/analyser.ts", outA);
fs.writeFileSync("src/" + cfg.file, mod);
for (const [f, es] of edits) if (f !== sf) fs.writeFileSync(f.fileName, apply(f.text, es));
console.log("  skrivet.");
