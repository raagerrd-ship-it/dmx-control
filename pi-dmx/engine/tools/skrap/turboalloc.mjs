// Statiska allokeringsplatser i TurboFans graf for render: Allocate/AllocateRaw-noder + anrop till allokerande builtins, per kallrad.
import fs from 'node:fs';
let s = fs.readFileSync(process.argv[2], 'utf8');
{ const k = s.indexOf('"bytecodeSources"'); if (k > 0) { const c = s.lastIndexOf(',', k); s = s.slice(0, c) + '}'; } }
let j; try { j = JSON.parse(s); } catch (e) { const m = /position (\d+)/.exec(e.message); console.log(e.message.slice(0, 100), m && JSON.stringify(s.slice(+m[1] - 150, +m[1] + 50))); process.exit(1); }
const phaseName = process.argv[3] || null;
const graphs = j.phases.filter((p) => p.type === 'graph');
console.log(graphs.map((p) => p.name).join(' | '));
const ph = phaseName ? graphs.find((p) => p.name.includes(phaseName)) : graphs[graphs.length - 1];
console.log('fas:', ph.name, 'noder', ph.data.nodes.length);
const srcs = j.sources; const inl = j.inlinings || {};
const lineOf = (sp) => {
  if (!sp) return '?';
  let id = sp.inliningId ?? -1; const src = id === -1 ? srcs[String(j.function?.sourceId ?? Object.keys(srcs)[0])] : srcs[String(inl[id]?.inliningPosition ? inl[id].sourceId : id)];
  const S = id === -1 ? srcs[String(j.function?.sourceId ?? -1)] ?? srcs[Object.keys(srcs).find((k) => srcs[k].functionName === j.function?.functionName) ?? Object.keys(srcs)[0]] : srcs[String(inl[id]?.sourceId)];
  if (!S) return `inl${id}@${sp.scriptOffset}`;
  const rel = sp.scriptOffset - S.startPosition; const pre = S.sourceText.slice(0, Math.max(0, rel));
  const line = pre.split('\n').length; const txt = S.sourceText.split('\n')[line - 1]?.trim().slice(0, 110);
  return `${S.functionName || '?'}+L${line}: ${txt}`;
};
const cnt = new Map();
const RX = /^(Allocate|AllocateRaw|Call|JSCreateClosure|JSCreateLiteral|JSCreateArray|JSCreateEmptyLiteral|CreateClosure|ChangeFloat64ToTagged|ChangeFloat64ToTaggedPointer|ChangeInt64ToTagged|ChangeUint32ToTagged|NewConsString|StringConcat|JSCall|JSCallWithSpread)/;
for (const n of ph.data.nodes) {
  const op = (n.title || n.label || '').split('[')[0].split('(')[0];
  if (!RX.test(op)) continue;
  if (op === 'Call' && !/Allocate|NewClosure|CreateArray|Clone|Literal|Map|Filter|Sort|Splice|StringAdd|NumberToString|Construct|Spread|Apply|ArrayPrototype|MathMin|MathMax|Math|JSCall|Call_|CallFunction|CallWithSpread|ArrayIncludes/i.test(n.label || n.title || '')) continue;
  const k = `${op.padEnd(28)} ${lineOf(n.sourcePosition)}`;
  cnt.set(k, (cnt.get(k) || 0) + 1);
}
for (const [k, v] of [...cnt].sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k);
