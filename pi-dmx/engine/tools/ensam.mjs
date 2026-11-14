/** EN ANALYS FÖR SIG (2026-11-14, efter uppdelningen av analysatorn). Två steg:
 *
 *  1. TAPPA: kör hela analysatorn över en inspelning EN gång och spara vad en del får in vid varje steg.
 *       node tools/ensam.mjs tappa <del> <metod> <wav> <ut.tap> [--ut fält,fält] [--extra signal,signal]
 *       t.ex.  node tools/ensam.mjs tappa drop dropStep tools/ladan-2026-11-13/lang-20261113T160345.wav .arena/tap/drop-160345.tap --ut dropCount,miniDropCount
 *     <del> = fältet på analysatorn (drop, sections, riser, kicks, bass, levels, character), <metod> = dess stegmetod.
 *     --extra = signaler på analysatorn som delen INTE läser i dag men som ska finnas att tillgå i uppspelningen (inför en arena:
 *     t.ex. --extra bandDbRaw,centSmooth,levelCeil). De tappas med och nås som this.a.<signal> av den som ändrar delen.
 *     Insignalerna är allt delen läser via this.a (hämtas ur källkoden, så listan är komplett även för grenar som inte gick).
 *
 *  2. KÖR: spela upp bara den delen på tappen - bråkdelen av en sekund i stället för en hel körning.
 *       node tools/ensam.mjs kor <ut.tap> [--set NAMN=värde ...] [--marks <fil.marks-fin.json>]
 *     Utan --set ska resultatet vara IDENTISKT med hela analysatorn (kontrolleras mot de sparade utfälten).
 *     --set byter en konstant i delens kompilerade fil (en tillfällig kopia; src och dist rörs inte) -> svep på sekunder.
 *     --marks: räknare i --ut jämförs med ägarens markeringar (drop inom -0,5..+1,0 s).
 *
 *  Gränser: ÅTERKOPPLING genom andra delar följer inte med (ändrar ett svep delens utdata, och de påverkar dess egna insignaler via en
 *  annan del, är insignalerna i tappen fortfarande de gamla) - bekräfta alltid ett valt värde med en hel körning. Insignaler som är stora fält (hela spektrum) tappas inte (> 64 tal per steg) - spektrum-delen går inte att köra så här.
 *  Metoder på analysatorn som delen ANROPAR för att göra något (inte läsa) blir tomma i uppspelningen och listas. */
import ts from "typescript"; import { readFileSync, writeFileSync, mkdirSync } from "node:fs"; import path from "node:path"; import { pathToFileURL } from "node:url";
import { ladanCfg } from "./benchCfg.mjs";
const [cmd, ...rest] = process.argv.slice(2); const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const DIST = path.resolve(opt("--dist", "dist")), U = f => pathToFileURL(path.join(DIST, f)).href;
const FILES = { drop: "analyserDrop", sections: "analyserSection", riser: "analyserRiser", kicks: "analyserKick", bass: "analyserBass", levels: "analyserLevel", character: "analyserCharacter", bands: "analyserSpectrum" };
const READERS = new Set(["wallNow", "perfNow"]);   // metoder som bara läser en klocka (allt annat anrop räknas som en handling)

/** insignalerna ur källan: varje kedja this.a.x(.y) i delens fil */
function inputsOf(del) {
  const file = `src/${FILES[del]}.ts`, sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ES2022, true), set = new Set();
  const walk = n => { if (ts.isPropertyAccessExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.kind === ts.SyntaxKind.ThisKeyword && n.expression.name.text === "a") {
      let top = n; const chain = [n.name.text]; while (ts.isPropertyAccessExpression(top.parent) && top.parent.expression === top) { top = top.parent; chain.push(top.name.text); }
      set.add(chain.join(".")); }
    ts.forEachChild(n, walk); };
  walk(sf); return [...set];
}
if (cmd === "tappa") {
  const [del, metod, wav, ut] = rest, utF = (opt("--ut", "") || "").split(",").filter(Boolean);
  process.env.DMX_ANALYSER_SPLIT = "inline";
  const { createAnalyser } = await import(U("analyser.js")); const { defaultConfig } = await import(U("config.js")); const { BeatFeed } = await import(U("analyserClock.js"));
  const mod = await import(U(FILES[del] + ".js")), Cls = Object.values(mod).find(v => typeof v === "function" && v.prototype && metod in v.prototype);
  if (!Cls) { console.error(`hittar inte ${metod} i ${FILES[del]}.js`); process.exit(1); }
  const cfg = ladanCfg(defaultConfig), an = createAnalyser(ladanCfg(defaultConfig), undefined), feed = new BeatFeed(); an.setGainLock(true, 1);
  // vilka kedjor är värden (tal/bool/sträng/litet fält), klockläsare eller handlingar? Avgörs på den riktiga analysatorn vid första steget.
  const chains = [...inputsOf(del), ...(opt("--extra", "") || "").split(",").filter(Boolean)]; let plan = null; const rows = [], strs = [""], S = s => { let i = strs.indexOf(s); if (i < 0) { i = strs.length; strs.push(s); } return i; };
  const get = (o, ch) => { let v = o; for (const k of ch.split(".")) { if (v == null) return undefined; v = v[k]; } return v; };
  const mkPlan = a => { const p = [], acts = [], skipped = []; const seen = new Set();
    for (const ch of chains) { const parts = ch.split("."); let v = a, i = 0, pathSoFar = [];
      for (; i < parts.length; i++) { const nx = v?.[parts[i]]; pathSoFar.push(parts[i]);
        if (typeof nx === "function") { const key = pathSoFar.join("."); if (!seen.has(key)) { seen.add(key); if (READERS.has(parts[i]) && pathSoFar.length === 1) p.push({ key, kind: "fn", n: 1 }); else acts.push(key); } break; }
        if (nx == null || typeof nx === "number" || typeof nx === "boolean" || typeof nx === "string") { const key = pathSoFar.join("."); if (!seen.has(key)) { seen.add(key); p.push({ key, kind: typeof nx === "string" ? "str" : typeof nx === "boolean" ? "bool" : "num", n: 1 }); } break; }
        if (ArrayBuffer.isView(nx) || Array.isArray(nx)) { const key = pathSoFar.join("."); if (!seen.has(key)) { seen.add(key); if (nx.length <= 64) p.push({ key, kind: "arr", n: nx.length, ctor: nx.constructor.name }); else skipped.push(`${key}[${nx.length}]`); } break; }
        v = nx; } }
    return { p, acts, skipped }; };
  const orig = Cls.prototype[metod]; let curT = 0, nArgs = 0;
  Cls.prototype[metod] = function (...args) {
    const a = this.a; if (!plan) { plan = mkPlan(a); nArgs = args.length; }
    const r = [curT, ...args.map(x => typeof x === "number" ? x : typeof x === "boolean" ? +x : NaN)];
    for (const f of plan.p) { const v = f.kind === "fn" ? a[f.key]() : get(a, f.key); if (f.kind === "arr") for (let i = 0; i < f.n; i++) r.push(v[i]); else r.push(f.kind === "str" ? S(v ?? "") : f.kind === "bool" ? +!!v : (v ?? NaN)); }
    const ret = orig.apply(this, args);
    for (const f of utF) { const v = this[f]; r.push(typeof v === "string" ? S(v) : +v); }
    r.push(typeof ret === "boolean" ? +ret : typeof ret === "number" ? ret : NaN);
    rows.push(r); return ret;
  };
  const d = readFileSync(wav); let o = 12, start = 44, len = d.length - 44;
  while (o + 8 <= d.length) { const id = d.toString("latin1", o, o + 4), ln = d.readUInt32LE(o + 4); if (id === "data") { start = o + 8; len = Math.min(ln || d.length - start, d.length - start); break; } o += 8 + ln + (ln & 1); }
  const ch = d.readUInt16LE(22), SR = d.readUInt32LE(24), n = Math.floor(len / 2 / ch), HOP = 128, EPOCH = 1700000000000, buf = new Float32Array(HOP), log = console.log; console.log = () => {};
  for (let off = 0; off + HOP <= n; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(start + (off + i) * 2 * ch) / 32768;
    curT = off / SR; const ms = EPOCH + curT * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf); if (an.hopLane) an.hopLane.feed(fr, cfg, an); else feed.update(fr, cfg, an);
  }
  console.log = log;
  const W = rows[0].length, m = new Float64Array(rows.length * W); rows.forEach((r, i) => m.set(r, i * W));
  const head = { v: 1, del, metod, wav, cls: Cls.name, fil: FILES[del], nArgs, in: plan.p, ut: utF, acts: plan.acts, skipped: plan.skipped, strs, W, rows: rows.length };
  const hb = Buffer.from(JSON.stringify(head), "utf8"), lenB = Buffer.alloc(4); lenB.writeUInt32LE(hb.length);
  mkdirSync(path.dirname(path.resolve(ut)), { recursive: true }); writeFileSync(ut, Buffer.concat([lenB, hb, Buffer.from(m.buffer)]));
  console.log(`${ut}: ${rows.length} steg x ${W} tal (${(m.byteLength / 1e6).toFixed(1)} MB). In: ${plan.p.map(f => f.key + (f.kind === "fn" ? "()" : f.kind === "arr" ? `[${f.n}]` : "")).join(" ")}`);
  if (plan.acts.length) console.log(`  handlingar (tomma i uppspelningen): ${plan.acts.join(" ")}`);
  if (plan.skipped.length) console.log(`  EJ TAPPADE (för stora): ${plan.skipped.join(" ")} - uppspelningen blir inte trogen`);
  process.exit(0);
}
if (cmd === "kor") {
  const tap = readFileSync(rest[0]), hl = tap.readUInt32LE(0), head = JSON.parse(tap.subarray(4, 4 + hl).toString("utf8"));
  const m = new Float64Array(tap.buffer.slice(tap.byteOffset + 4 + hl, tap.byteOffset + tap.length)), W = head.W;
  const sets = []; rest.forEach((a, i) => { if (a === "--set") sets.push(rest[i + 1].split("=")); });
  let js = readFileSync(path.join(DIST, head.fil + ".js"), "utf8");
  for (const [k, v] of sets) { const re = new RegExp(`(\\b${k} = )([^,;]+)`); if (!re.test(js)) { console.error(`hittar inte konstanten ${k} i ${head.fil}.js`); process.exit(1); } js = js.replace(re, `$1${v}`); }
  js = js.replace(/from\s+(["'])\.\/([^"']+)\1/g, (_, q, f) => `from ${q}${U(f)}${q}`);
  const tmpDir = path.resolve(".arena/ensam"); mkdirSync(tmpDir, { recursive: true }); const tmp = path.join(tmpDir, `${head.fil}-${process.pid}.mjs`); writeFileSync(tmp, js);
  const log = console.log; console.log = () => {};
  const mod = await import(pathToFileURL(tmp).href), Cls = mod[head.cls];
  const a = {}; const put = (key, v) => { const ps = key.split("."); let o = a; for (let i = 0; i < ps.length - 1; i++) o = o[ps[i]] ??= {}; o[ps[ps.length - 1]] = v; };
  for (const act of head.acts) put(act, () => {});
  const arrs = {}; for (const f of head.in) if (f.kind === "arr") { arrs[f.key] = new (globalThis[f.ctor] ?? Float64Array)(f.n); put(f.key, arrs[f.key]); }
  const fnVal = {}; for (const f of head.in) if (f.kind === "fn") put(f.key, () => fnVal[f.key]);
  const det = new Cls(a), t0 = performance.now(); let diff = 0, firstDiff = ""; const ev = Object.fromEntries(head.ut.map(f => [f, []])), prev = {};
  for (let i = 0, o = 0; i < head.rows; i++, o += W) {
    let c = o + 1; const args = []; for (let k = 0; k < head.nArgs; k++) args.push(m[c++]);
    for (const f of head.in) { if (f.kind === "arr") { const x = arrs[f.key]; for (let k = 0; k < f.n; k++) x[k] = m[c++]; } else { const v = m[c++]; if (f.kind === "fn") fnVal[f.key] = v; else put(f.key, f.kind === "str" ? head.strs[v] : f.kind === "bool" ? !!v : v); } }
    det[head.metod](...args);
    for (const f of head.ut) { const want = m[c++], v = det[f], got = typeof v === "string" ? head.strs.indexOf(v) : +v; if (!sets.length && !(got === want || (got !== got && want !== want))) { diff++; if (!firstDiff) firstDiff = `${f} vid ${m[o].toFixed(2)} s: ensam ${got}, hela ${want}`; }
      if (prev[f] !== undefined && got !== prev[f]) ev[f].push(+m[o].toFixed(2)); prev[f] = got; }
  }
  const ms = performance.now() - t0; console.log = log;
  console.log(`${path.basename(rest[0])}: ${head.rows} steg på ${ms.toFixed(0)} ms${sets.length ? "  [" + sets.map(s => s.join("=")).join(" ") + "]" : diff ? `  AVVIKER från hela analysatorn i ${diff} steg (${firstDiff})` : "  IDENTISK med hela analysatorn"}`);
  let marks = null; if (opt("--marks")) marks = JSON.parse(readFileSync(opt("--marks"), "utf8")).marks.filter(x => !x.skip);
  for (const f of head.ut) { const e = ev[f]; if (e.length > 60) { console.log(`  ${f}: ${e.length} ändringar`); continue; }
    let extra = ""; if (marks && /drop/i.test(f) && !/mini/i.test(f)) { const dr = marks.filter(x => x.kind === "drop"), hit = dr.filter(x => e.some(t => t - x.fineS >= -0.5 && t - x.fineS <= 1.0)).length, ok = e.filter(t => dr.some(x => t - x.fineS >= -0.5 && t - x.fineS <= 1.0)).length; extra = `   -> ägarens drop ${hit}/${dr.length}, motorns drop som är hans ${ok}/${e.length}`; }
    console.log(`  ${f}: ${e.join(" ")}${extra}`); }
  process.exit(0);
}
console.log("node tools/ensam.mjs tappa <del> <metod> <wav> <ut.tap> [--ut fält,...]   |   node tools/ensam.mjs kor <ut.tap> [--set NAMN=värde] [--marks fil]");
