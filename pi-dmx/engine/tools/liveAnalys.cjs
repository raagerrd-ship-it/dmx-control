/** LIVE-ANALYS (2026-11-13, ägaren i ladan: "kör analys i några minuter över hur systemet fungerar idag. så vi har det som grund till
 *  bänken också"). Lyssnar på motorns ramar (20 Hz) i N sekunder och skriver dem rad för rad till en csv + en sammanfattning.
 *    node tools/liveAnalys.cjs <värd> <sekunder> <ut.csv>
 *  Kör samtidigt en inspelning i /setup (POST /api/longrec) så finns ljudet + motorns händelser till samma minuter. */
const WebSocket = require("../node_modules/ws"), fs = require("fs");
const [host, secS, ut] = process.argv.slice(2); const secs = Number(secS || 300);
const ws = new WebSocket("ws://" + host + "/ws"); const rows = []; const t0 = Date.now(); let cfgMode = "";
const KOL = ["ms", "level", "energy", "kick", "bpm", "bpmConfidence", "intensity", "dropCount", "buildUp", "inRiser", "inZone", "beat", "mode", "inNow", "inPeak", "inState", "dmxOk"];
ws.on("message", (m) => {
  let d; try { d = JSON.parse(m.toString()); } catch { return; }
  if (d.type === "config" || d.config) { cfgMode = (d.config || d).mode || cfgMode; return; }
  if (d.type !== "frame") return;
  rows.push([Date.now() - t0, d.level, d.energy, d.kick ? 1 : 0, d.bpm, d.bpmConfidence, d.intensity, d.dropCount, d.buildUp, d.inRiser ? 1 : 0, d.inZone ? 1 : 0, d.beat ? 1 : 0, d.mode, d.inNow, d.inPeak, d.inState, d.dmxOk === false ? 0 : 1]);
});
ws.on("error", (e) => { console.log("fel", e.message); process.exit(1); });
setTimeout(() => {
  fs.writeFileSync(ut, KOL.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n") + "\n");
  const col = (k) => rows.map((r) => r[KOL.indexOf(k)]), num = (k) => col(k).filter((v) => typeof v === "number" && v === v);
  const q = (a, p) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const f = (v, n = 2) => (typeof v === "number" && v === v ? v.toFixed(n) : "-");
  const dur = rows.length ? rows[rows.length - 1][0] / 1000 : 0;
  console.log(`ramar ${rows.length} på ${dur.toFixed(0)} s (${(rows.length / Math.max(1, dur)).toFixed(1)}/s), läge ${cfgMode || "?"}`);
  for (const k of ["level", "energy", "intensity", "buildUp", "inPeak", "bpmConfidence"]) { const a = num(k); console.log(`${k.padEnd(14)} p10 ${f(q(a, 0.1))}  median ${f(q(a, 0.5))}  p90 ${f(q(a, 0.9))}  max ${f(q(a, 1))}`); }
  // tempo: andel av tiden per avrundat bpm + antal byten > 4 %
  const bpm = col("bpm"); const hist = {}; let byten = 0, prev = 0;
  for (const b of bpm) { if (!(b > 0)) continue; const k = Math.round(b); hist[k] = (hist[k] || 0) + 1; if (prev > 0 && Math.abs(b / prev - 1) > 0.04) byten++; prev = b; }
  const tot = Object.values(hist).reduce((a, b) => a + b, 0);
  console.log("tempo: " + Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} bpm ${(100 * v / tot).toFixed(0)} %`).join(", ") + `  | byten över 4 %: ${byten} (${(byten / Math.max(1, dur) * 60).toFixed(2)}/min)`);
  // effekter: andel av tiden + byten
  const md = col("mode"); const mh = {}; let mb = 0;
  for (let i = 0; i < md.length; i++) { mh[md[i]] = (mh[md[i]] || 0) + 1; if (i && md[i] !== md[i - 1]) mb++; }
  console.log("effekter: " + Object.entries(mh).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / md.length).toFixed(0)} %`).join(", ") + `  | byten ${mb} (${(mb / Math.max(1, dur) * 60).toFixed(1)}/min)`);
  const dc = num("dropCount"); console.log(`drop: ${dc.length ? dc[dc.length - 1] - dc[0] : 0} st  | i uppbyggnad (inRiser) ${(100 * num("inRiser").reduce((a, b) => a + b, 0) / Math.max(1, rows.length)).toFixed(1)} % av tiden  | i zon (inZone) ${(100 * num("inZone").reduce((a, b) => a + b, 0) / Math.max(1, rows.length)).toFixed(1)} %`);
  const st = col("inState"); const sh = {}; for (const s of st) sh[s] = (sh[s] || 0) + 1;
  console.log("ingången: " + Object.entries(sh).map(([k, v]) => `${k} ${(100 * v / st.length).toFixed(0)} %`).join(", ") + `  | dmxOk ${(100 * num("dmxOk").reduce((a, b) => a + b, 0) / Math.max(1, rows.length)).toFixed(1)} %`);
  // luckor i ramflödet (motorn/nätet hängde)
  let gap = 0, gmax = 0; for (let i = 1; i < rows.length; i++) { const g = rows[i][0] - rows[i - 1][0]; if (g > 150) gap++; if (g > gmax) gmax = g; }
  console.log(`luckor över 150 ms i ramflödet: ${gap}, längsta ${gmax} ms`);
  process.exit(0);
}, secs * 1000);
