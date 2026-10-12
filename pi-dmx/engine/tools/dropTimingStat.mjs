/**
 * DROP-TIMING, analysen (2026-10-12): läser utfilerna från tools/dropTiming.mjs och mäter varje drop mot LJUDET (baskroppen, frame.bodyDb):
 *   FLANK  = sista uppåtkorsningen före fyrningen (+50 ms) där kroppen (30 ms-EMA) passerar landningsnivån - 6 dB; landningsnivån =
 *            median av kroppen 0..2 s efter fyrningen. Fördröjning = fyr - flank (ljuset: + fade-in 30 ms, BLE/DMX ~0).
 *   LYFT   = medel(kroppen 0,1..2,1 s efter flanken) - medel(3..0,1 s före), i dB på 100 ms-toppar. >= 8 dB = IHÅLLANDE BASLYFT.
 *   BREAK  = hur länge kroppen (350 ms-EMA) låg >= 8 dB under landningsnivån i sträck före flanken.
 *   Klass: utan lyft = FALSK; med lyft: rätt <= 120 ms, sen > 120 ms (tidig < -50 ms).
 *   node tools/dropTimingStat.mjs <katalog> [--src show|fire] [--list]
 */
import { readFileSync, readdirSync } from "node:fs";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DIR = /dropTimingStat\.mjs$/.test(process.argv[1] ?? "") ? args[0] : null, SRC = opt("--src", "show"), LIST = args.includes("--list");
export function load(f) {
  const j = JSON.parse(readFileSync(f, "utf8"));
  const raw = Buffer.from(j.body, "base64"); const body = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  return { ...j, body: Float32Array.from(body) };
}
export function analyse(j) {
  const H = j.hopS, b = j.body, n = b.length;
  const ema = (tau) => { const o = new Float32Array(n); let v = b[0]; const a = Math.min(1, H / tau); for (let i = 0; i < n; i++) { v += (b[i] - v) * a; o[i] = v; } return o; };
  const f30 = ema(0.03), s350 = ema(0.35);
  const idx = (t) => Math.max(0, Math.min(n - 1, Math.round(t / H)));
  const pk100 = (t) => { let m = -200; for (let k = idx(t); k < idx(t + 0.1); k++) m = Math.max(m, b[k]); return m; };
  const meanPk = (t0, t1) => { let s = 0, c = 0; for (let t = t0; t < t1 - 1e-6; t += 0.1) { s += Math.max(-30, pk100(t)); c++; } return c ? s / c : 0; };
  const median = (t0, t1) => { const a = []; for (let k = idx(t0); k < idx(t1); k++) a.push(f30[k]); a.sort((x, y) => x - y); return a[a.length >> 1]; };
  function flank(tf) {
    const land = median(tf, tf + 2), thr = land - 6;
    let k = idx(tf + 0.05);
    while (k > 0 && f30[k] >= thr) k--;               // tillbaka till senaste punkten under
    if (k <= 0 || tf - k * H > 20) return null;
    const tE = (k + 1) * H;
    const lift = meanPk(tE + 0.1, tE + 2.1) - meanPk(tE - 3, tE - 0.1);
    let kb = k; while (kb > 0 && s350[kb] < land - 8) kb--;
    const brk = (k - kb) * H;
    return { tE, delay: tf - tE, lift, brk, land };
  }
  return { flank, meanPk, pk100, f30, s350, idx };
}
if (DIR) {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
  const all = []; let minutes = 0, miniN = 0;
  for (const f of files) {
    const j = load(`${DIR}/${f}`); const A = analyse(j); minutes += j.body.length * j.hopS / 60; miniN += j.ev.miniLook.length - (SRC === "show" ? 0 : 0);
    const ts = SRC === "show" ? j.ev.show : j.ev.fire;
    for (const tf of ts) {
      const r = A.flank(tf); const line = j.lines.find((l) => Math.abs(l[0] - tf) < 0.02 && l[1].startsWith("[dropfire]"));
      const edge = line ? Number((line[1].match(/edgeAgo (\d+)/) ?? [])[1]) : NaN;
      const cls = !r ? "?" : r.lift < 8 ? "FALSK" : r.delay < -0.05 ? "tidig" : r.delay <= 0.12 ? "rätt" : "sen";
      all.push({ f: f.slice(5, 20), tf, ...r, edge, cls });
    }
  }
  if (LIST) for (const a of all) console.log(`${a.f} ${a.tf.toFixed(2).padStart(7)} delay ${a.delay != null ? (a.delay * 1000).toFixed(0).padStart(6) : '     ?'} ms lift ${a.lift?.toFixed(1).padStart(5)} break ${a.brk?.toFixed(1).padStart(5)} s land ${a.land?.toFixed(0)} edgeAgo ${a.edge} ${a.cls}`);
  const c = (k) => all.filter((a) => a.cls === k).length;
  const lifted = all.filter((a) => a.cls !== "FALSK" && a.cls !== "?").map((a) => a.delay * 1000).sort((x, y) => x - y);
  const q = (p) => lifted.length ? lifted[Math.min(lifted.length - 1, Math.floor(p * lifted.length))].toFixed(0) : '-';
  console.log(`${SRC}: ${all.length} drops på ${minutes.toFixed(0)} min = ${(all.length / minutes).toFixed(3)}/min | på baslyft ${all.length - c("FALSK") - c("?")} (${(100 * (all.length - c("FALSK") - c("?")) / Math.max(1, all.length)).toFixed(0)} %) | rätt ${c("rätt")} sen ${c("sen")} tidig ${c("tidig")} falsk ${c("FALSK")} | fördröjning (på lyft) p25 ${q(0.25)} p50 ${q(0.5)} p75 ${q(0.75)} max ${q(0.999)} ms | minidrop-looker ${miniN} (${(miniN / minutes).toFixed(2)}/min)`);
}
