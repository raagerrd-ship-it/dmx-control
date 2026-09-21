/**
 * DROP-BANK MOT FACIT (2026-09-21 natt). Kör en WAV (48 kHz mono 16-bit) genom den RIKTIGA analysatorn
 * hop-för-hop på virtuell klocka, fångar [dropfire]-raderna, och mäter mot ett facit:
 *
 *   node tools/dropBench.mjs <wav> [--marks <fil>] [--from <s>] [--json <ut>] [--quiet]
 *
 * FACIT = ägarens 19 "nu"-markeringar (corpus_notes.txt, session_mono.wav). Markeringarna är stämplade mot
 * filstorleken på Pi:n + reaktionstid, alltså brusiga (memory: spred 9 s). De pekar ut VILKEN
 * händelse; flanken tas ur kurvan: för varje markering söks den största bas-kroppslyftet i [mark-1,5 s, mark+4,5 s] (marken är stämplade mot filstorleken: arecord-buffring lägger dem TIDIGT i filens tid, reaktionstiden sent)
 * (icke-kausalt: medel 400 ms efter minus min 500 ms före på rå bodyDb), och facit-tiden = första hoppet där
 * kroppen (20 ms-EMA) passerat 60 % av lyftet. Facit-definitionen (vilka 19 händelser) ändras INTE här.
 *
 * Träff = fyrning inom [edge-1,0 s, edge+2,0 s]; varje fyrning matchar högst en facit-drop. Tidsfel = fyr - edge.
 * Utan facit (pop/megamix): antal fyrningar + "landad underPeak" (peak - max bodyFast 400 ms efter fyr;
 * memory 09-08: riktig <4, falsk >=7) + sektion/buildUp/levelVsHighDb vid fyrningen.
 * Alla env-rattar läses av analysatorn vid modulladdning -> en process per variant (se dropSweep.mjs).
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const flag = (k) => args.includes(k);
const path = args.find(a => a.endsWith(".wav"));
if (!path) { console.error("ange en wav-fil"); process.exit(2); }
const marksFile = opt("--marks", null);
const fromS = Number(opt("--from", 0));
const jsonOut = opt("--json", null);
const quiet = flag("--quiet");

const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");

const d = readFileSync(path);
if (d.toString("ascii", 0, 4) !== "RIFF") { console.error("inte en WAV"); process.exit(2); }
const rate = d.readUInt32LE(24), bits = d.readUInt16LE(34), ch = d.readUInt16LE(22);
if (rate !== 48000 || bits !== 16 || ch !== 1) { console.error(`kräver 48 kHz mono 16-bit, fick ${rate}/${ch}/${bits}`); process.exit(2); }
const nSamples = (d.length - 44) >> 1;
const HOP = 128, EPOCH = 1700000000000, dtHop = HOP / 48000;
const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
an.setGainLock(true, 1);
const buf = new Float32Array(HOP);
const BODY_FAST_S = Number(process.env.BODY_FAST_S ?? 0.12);

// Fånga analysatorns egna loggrader (fyrningar + spår)
const fires = [];   // {t, rise, peak, fast, underPeak, edgeAgo, kind}
const origLog = console.log;
console.log = (...a) => {
  const s = a.join(" ");
  if (s.startsWith("[dropfire]")) {
    const num = (k) => { const m = s.match(new RegExp(k + " (-?[\\d.]+)")); return m ? Number(m[1]) : NaN; };
    fires.push({ t: (num("wall") - EPOCH) / 1000, rise: num("rise"), peak: num("peak"), fast: num("fast"), underPeak: num("underPeak"), edgeAgo: num("edgeAgo"), kind: s.includes("KICKFIRST") ? "kickfirst" : s.includes("CALM") ? "calm" : "body" });
  } else if (!quiet && (s.startsWith("[dropcalm]") || s.startsWith("[dropkick]"))) origLog(s);
};

const nHops = Math.floor(nSamples / HOP);
const minis = []; let lastMini = 0;
const body = new Float32Array(nHops), kickT = [], sect = new Array(nHops), build = new Float32Array(nHops), lvh = new Float32Array(nHops), phase = new Float64Array(nHops), bpmA = new Float32Array(nHops);
let lastDrop = 0;
for (let k = 0; k < nHops; k++) {
  const off = k * HOP;
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  an.setVirtualClock((off / 48000) * 1000);
  const f = an.process(buf);
  body[k] = f.bodyDb; if (f.kick) kickT.push(k * dtHop); sect[k] = f.section; build[k] = f.buildUp; lvh[k] = f.levelVsHighDb; phase[k] = f.beatPhaseMs; bpmA[k] = f.bpm;
  if (f.miniDropCount !== lastMini) { lastMini = f.miniDropCount; minis.push(k * dtHop); }
  if (f.dropCount !== lastDrop) { lastDrop = f.dropCount; if (fires.length === 0 || Math.abs(fires[fires.length - 1].t - k * dtHop) > 0.02) fires.push({ t: k * dtHop, rise: NaN, peak: NaN, fast: NaN, underPeak: NaN, edgeAgo: NaN, kind: "unlogged" }); }
}
console.log = origLog;

// ── Offline-kurvor (icke-kausala; bara för mätning) ──
const ema = (arr, tau) => { const a = Math.min(1, dtHop / tau); let y = arr[0]; const o = new Float32Array(arr.length); for (let i = 0; i < arr.length; i++) { y += (arr[i] - y) * a; o[i] = y; } return o; };
const b20 = ema(body, 0.02), bFast = ema(body, BODY_FAST_S);
const W_AFTER = Math.round(0.4 / dtHop), W_BEFORE = Math.round(0.5 / dtHop);
function edgeIn(t0, t1) {   // största lyftet i [t0,t1] -> {edge, lift, i}
  const i0 = Math.max(W_BEFORE, Math.floor(t0 / dtHop)), i1 = Math.min(nHops - W_AFTER - 1, Math.floor(t1 / dtHop));
  let best = -Infinity, bi = -1, bmin = 0;
  for (let i = i0; i <= i1; i += 2) {
    let after = 0; for (let k = i; k < i + W_AFTER; k++) after += b20[k]; after /= W_AFTER;
    let mn = Infinity; for (let k = i - W_BEFORE; k < i; k++) if (b20[k] < mn) mn = b20[k];
    const lift = after - mn;
    if (lift > best) { best = lift; bi = i; bmin = mn; }
  }
  if (bi < 0) return null;
  const thr = bmin + 0.6 * best;
  let jm = bi; for (let k = bi - W_BEFORE; k < bi; k++) if (b20[k] === bmin) { jm = k; break; }   // fran svackans botten, inte fran fonstrets borjan
  let j = jm; while (j < bi + W_AFTER && b20[j] < thr) j++;
  return { edge: j * dtHop, lift: best, i: bi };
}
// Offline-replika av detektorns sega signaler (bodyEnv 0,35 s, tak -0,15 dB/s, seg topp -0,04 dB/s, gone = env < tak-5 dB)
// for att kunna saga VILKEN grind som stoppar en facit-drop. Samma formler som analyser.ts, icke-kausalt bara i avlasningen.
const bEnv = ema(body, 0.35), goneRun = new Float32Array(nHops), peakS = new Float32Array(nHops);
{ let ceil = -300, peak = -300, g = 0; for (let i = 0; i < nHops; i++) { ceil = Math.max(bEnv[i], ceil - dtHop * 0.15); peak = Math.max(bEnv[i], peak - dtHop * 0.04); g = bEnv[i] < ceil - 5 ? g + dtHop * 1000 : 0; goneRun[i] = g; peakS[i] = peak; } }
const gates = (edge) => { const ie = Math.floor(edge / dtHop); let mg = 0; for (let k = Math.max(0, ie - Math.round(6 / dtHop)); k <= ie; k++) if (goneRun[k] > mg) mg = goneRun[k];
  let mxF = -Infinity; for (let k = ie; k < Math.min(nHops, ie + W_AFTER); k++) if (bFast[k] > mxF) mxF = bFast[k];
  let mnF = Infinity; for (let k = Math.max(0, ie - W_BEFORE); k < ie; k++) if (bFast[k] < mnF) mnF = bFast[k];
  return { goneBeforeMs: mg, landedAtEdge: peakS[ie] - mxF, riseFast: mxF - mnF }; };
const landed = (t) => { const i0 = Math.floor(t / dtHop); let mx = -Infinity; for (let k = i0; k < Math.min(nHops, i0 + W_AFTER); k++) if (bFast[k] > mx) mx = bFast[k]; return mx; };
const q = (arr, p) => { if (!arr.length) return NaN; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const nextKick = (t, maxMs) => { for (const kt of kickT) { if (kt >= t - 0.003 && kt <= t + maxMs / 1000) return kt; if (kt > t + maxMs / 1000) break; } return NaN; };
const prevKick = (t) => { let p = NaN; for (const kt of kickT) { if (kt <= t + 0.003) p = kt; else break; } return p; };

for (const f of fires) { const i = Math.min(nHops - 1, Math.floor(f.t / dtHop)); f.section = sect[i]; f.buildUp = build[i]; f.levelVsHighDb = lvh[i]; f.landedUnder = (Number.isFinite(f.peak) ? f.peak : -Infinity) - landed(f.t); f.nextKickMs = (nextKick(f.t, 400) - f.t) * 1000; f.prevKickMs = (f.t - prevKick(f.t)) * 1000; f.bpm = bpmA[i]; }

const result = { wav: path, nMinis: minis.length, env: Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(DROP|BODY|MINI|DMX_|BPM_|KICK)/.test(k))), nFires: fires.length, fires };
if (marksFile) {
  const marks = readFileSync(marksFile, "utf8").split(/\r?\n/).map(l => l.trim()).filter(l => /^[\d.]+\s+DROP/.test(l)).map(l => Number(l.split(/\s+/)[0]));
  // Markeringarna ar stamplade mot FILSTORLEKEN (arecord buffrar -> filen slapar efter ljudet -> marken hamnar TIDIGT i
  // filens tid) plus reaktionstid (sent). Uppmatt mot kurvan: storsta lyften ligger -1,5..+4,5 s fran marken. Fonster darefter.
  const MW0 = Number(opt("--mw0", -1.5)), MW1 = Number(opt("--mw1", 4.5));
  const facit = marks.map(m => { const e = edgeIn(m + MW0, m + MW1); return { mark: m, ...e, ...gates(e.edge) }; });
  const used = new Set(); const rows = [];
  for (const fc of facit) {
    let best = null;
    for (let i = 0; i < fires.length; i++) { if (used.has(i)) continue; const dtF = fires[i].t - fc.edge; if (dtF >= -1.0 && dtF <= 2.0 && (!best || Math.abs(dtF) < Math.abs(best.dt))) best = { i, dt: dtF }; }
    if (best) used.add(best.i);
    const fire = best ? fires[best.i] : null;
    const miniNear = minis.find(m => m - fc.edge >= -1.0 && m - fc.edge <= 2.0);
    rows.push({ mark: fc.mark, edge: fc.edge, miniMs: miniNear !== undefined ? (miniNear - fc.edge) * 1000 : NaN, lift: fc.lift, goneBeforeMs: fc.goneBeforeMs, landedAtEdge: fc.landedAtEdge, riseFast: fc.riseFast, hit: !!best, errMs: best ? best.dt * 1000 : NaN, fireT: fire?.t, underPeak: fire?.underPeak, landedUnder: fire?.landedUnder, section: fire?.section, nextKickMs: fire?.nextKickMs, prevKickMs: fire?.prevKickMs, edgeKickMs: (nextKick(fc.edge, 400) - fc.edge) * 1000 });
  }
  const errs = rows.filter(r => r.hit).map(r => r.errMs);
  const absErrs = errs.map(Math.abs);
  const unmatched = fires.filter((f, i) => !used.has(i) && f.t >= fromS);
  result.facit = { n: facit.length, hits: errs.length, miniHits: rows.filter(r => !r.hit && Number.isFinite(r.miniMs)).length, errMedian: q(errs, 0.5), errP10: q(errs, 0.1), errP90: q(errs, 0.9), absP90: q(absErrs, 0.9), unmatchedInSpan: unmatched.length, unmatched: unmatched.map(f => ({ t: f.t, underPeak: f.underPeak, landedUnder: f.landedUnder, section: f.section, buildUp: f.buildUp, levelVsHighDb: f.levelVsHighDb })), rows };
  if (!quiet) {
    origLog(`facit ${facit.length}: träff ${errs.length}/${facit.length}, tidsfel median ${q(errs, 0.5)?.toFixed(0)} ms (p10 ${q(errs, 0.1)?.toFixed(0)}, p90 ${q(errs, 0.9)?.toFixed(0)}), omatchade fyrningar från ${fromS}s: ${unmatched.length}`);
    for (const r of rows) origLog(`  mark ${r.mark.toFixed(1)} edge ${r.edge.toFixed(2)} (${(r.edge - r.mark).toFixed(1)}) lift ${r.lift.toFixed(1)} gone ${r.goneBeforeMs.toFixed(0)} landed@edge ${r.landedAtEdge.toFixed(1)} riseF ${r.riseFast.toFixed(1)} ${Number.isFinite(r.miniMs) ? `mini ${r.miniMs.toFixed(0)} ` : ""}${r.hit ? `HIT err ${r.errMs.toFixed(0)} ms underPeak ${r.underPeak?.toFixed(1)} landed ${r.landedUnder?.toFixed(1)} sect ${r.section} nextKick ${r.nextKickMs?.toFixed(0)} prevKick ${r.prevKickMs?.toFixed(0)}` : `MISS`} edgeKick ${r.edgeKickMs.toFixed(0)}`);
    for (const u of unmatched) origLog(`  omatchad ${u.t.toFixed(2)} underPeak ${u.underPeak?.toFixed(1)} landed ${u.landedUnder?.toFixed(1)} sect ${u.section} build ${u.buildUp?.toFixed(2)} lvh ${u.levelVsHighDb?.toFixed(1)}`);
  }
}
if (flag("--cands")) {   // offline-kandidater: lokala lyft-maxima >= 10 dB, minst 3 s isär (strukturbild för att döma markeringarna)
  const t0 = Number(opt("--cands", 0)); const i0 = Math.max(W_BEFORE, Math.floor(t0 / dtHop)); const lifts = [];
  for (let i = i0; i < nHops - W_AFTER - 1; i += 4) { let after = 0; for (let k = i; k < i + W_AFTER; k++) after += b20[k]; after /= W_AFTER; let mn = Infinity; for (let k = i - W_BEFORE; k < i; k++) if (b20[k] < mn) mn = b20[k]; lifts.push([i, after - mn]); }
  const picked = [];
  for (const [i, l] of [...lifts].sort((a, b) => b[1] - a[1])) { if (l < 10) break; if (picked.every(p => Math.abs(p[0] - i) * dtHop > 3)) picked.push([i, l]); }
  picked.sort((a, b) => a[0] - b[0]);
  origLog(`kandidater (lyft>=10 dB, 3 s isär) från ${t0}s:`);
  for (const [i, l] of picked) { const t = i * dtHop; const fr = fires.find(f => Math.abs(f.t - t) < 1.5); origLog(`  ${t.toFixed(1)} lift ${l.toFixed(1)} sect ${sect[i]} lvh ${lvh[i].toFixed(1)} build ${build[i].toFixed(2)}${fr ? ` FYR ${fr.t.toFixed(2)} (${((fr.t - t) * 1000).toFixed(0)} ms) underPeak ${fr.underPeak?.toFixed(1)}` : ""}`); }
}
const real = fires.filter(f => f.landedUnder < 4).length, falseC = fires.filter(f => f.landedUnder >= 7).length;
result.classes = { real, mid: fires.length - real - falseC, false: falseC };
if (!quiet) {
  origLog(`${path.split(/[\\/]/).pop()}: ${fires.length} fyrningar (landad <4: ${real}, 4–7: ${fires.length - real - falseC}, >=7: ${falseC})`);
  for (const f of fires) origLog(`  ${f.t.toFixed(2)} ${f.kind} rise ${f.rise?.toFixed(1)} underPeak ${f.underPeak?.toFixed(1)} landed ${f.landedUnder?.toFixed(1)} sect ${f.section} build ${f.buildUp?.toFixed(2)} lvh ${f.levelVsHighDb?.toFixed(1)} nextKick ${f.nextKickMs?.toFixed(0)} prevKick ${f.prevKickMs?.toFixed(0)} bpm ${f.bpm?.toFixed(0)}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(result, null, 1));
