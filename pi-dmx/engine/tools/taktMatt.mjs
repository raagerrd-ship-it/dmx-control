/**
 * TAKTSÄKERHETEN (natt 10-13, ägarens punkt 4): läser konsertReplay-json (kolumnerna bpm/conf/trust/cbpm/lock) och mäter
 *   - tempobyten inom låt (låt = mellan 'LATGRANS' i loggen): ett byte = nytt tempo (> 4 % från det hållna) som håller >= 2 s;
 *     klass efter kvot: oktav (x2 / /2), 2:3 (x1,5 / /1,5), 3:4 (x1,33 / /1,33), nära (< 19 %, tempolyft), fel (annat)
 *     - mäts både på analysatorns bpm ('ana') och taktklockans bpm ('klocka' = cfg.beat, det effekterna stegar på)
 *   - andel av låtens musiktid på låtens vanligaste tempo (±3 %)
 *   - fördelning av bpmConfidence (efter beatFeed) och motorns beatTrust på musik (bodyDb > -60, bpm > 0)
 *   - andel låst tid (hasBeat) och andel med tillit > 0,5 (dirigentens/dropens grindar)
 *   - kontroll: drops, minidrops (analysatorns räknare + showens minidrop-looker), lookbyten (ska inte ändras oväntat)
 *   node tools/taktMatt.mjs <katalog med json> [--json ut.json] [--per-fil]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const dir = args[0];
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const files = readdirSync(dir).filter((f) => /^lang-.*\.json$/.test(f)).sort();
const q = (a, p) => { if (!a.length) return NaN; const b = Float64Array.from(a).sort(); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; };
const near = (r, x) => Math.abs(r / x - 1) < 0.06;
const klass = (r) => near(r, 2) || near(r, 0.5) ? "oktav" : near(r, 1.5) || near(r, 2 / 3) ? "2:3" : near(r, 4 / 3) || near(r, 0.75) ? "3:4"
  : (r > 0.84 && r < 1.19) ? "nära" : "fel";
function changes(rows, col) {   // byten i en serie (10 Hz)
  const ev = []; let held = 0, cand = 0, candN = 0, candT = 0;
  for (const r of rows) {
    const b = r[col]; if (!(b > 0)) continue;
    if (!held) { held = b; continue; }
    if (Math.abs(b / held - 1) <= 0.04) { cand = 0; candN = 0; continue; }
    if (cand && Math.abs(b / cand - 1) <= 0.03) { if (++candN >= 20) { ev.push({ t: candT, from: held, to: cand, k: klass(cand / held) }); held = cand; cand = 0; candN = 0; } }
    else { cand = b; candN = 1; candT = r[0]; }
  }
  return ev;
}
const KL = ["oktav", "2:3", "3:4", "nära", "fel"];
const tot = { filer: 0, min: 0, latar: 0, ana: Object.fromEntries(KL.map((k) => [k, 0])), klocka: Object.fromEntries(KL.map((k) => [k, 0])), anaN: 0, klockaN: 0,
  conf: [], trust: [], musik: 0, miniL: 0, last: 0, trygg: 0, dom: 0, domN: 0, drops: 0, mini: 0, looks: 0, latarMedHopp: 0 };
const per = [];
for (const f of files) {
  const j = JSON.parse(readFileSync(`${dir}/${f}`, "utf-8"));
  const C = Object.fromEntries(j.columns.map((c, i) => [c, i]));
  const rows = j.rows;
  const cuts = [0, ...j.log.filter((l) => l[1] === "LATGRANS").map((l) => l[0]), 1e9];
  let fAna = 0, fKl = 0, fMus = 0, fLast = 0, fTrygg = 0;
  for (let s = 0; s + 1 < cuts.length; s++) {
    const seg = rows.filter((r) => r[0] >= cuts[s] && r[0] < cuts[s + 1]);
    const mus = seg.filter((r) => r[C.bodyDb] > -60 && r[C.bpm] > 0);
    if (mus.length < 150) continue;   // < 15 s musik: ingen låt
    tot.latar++;
    const ea = changes(seg, C.bpm), ek = changes(seg, C.cbpm);
    for (const e of ea) tot.ana[e.k]++; for (const e of ek) tot.klocka[e.k]++;
    tot.anaN += ea.length; tot.klockaN += ek.length; fAna += ea.length; fKl += ek.length; if (ek.length) tot.latarMedHopp++;
    // vanligaste tempot (2 % hinkar) och andelen på det
    const h = new Map(); for (const r of mus) { const k = Math.round(Math.log(r[C.cbpm] || r[C.bpm]) / 0.02); h.set(k, (h.get(k) ?? 0) + 1); }
    let best = 0, bk = 0; for (const [k, n] of h) { const nn = n + (h.get(k - 1) ?? 0) + (h.get(k + 1) ?? 0); if (nn > best) { best = nn; bk = k; } }
    tot.dom += best; tot.domN += mus.length;
  }
  for (const r of rows) {
    if (!(r[C.bodyDb] > -60 && r[C.bpm] > 0)) continue;
    tot.conf.push(r[C.conf]); tot.trust.push(r[C.trust]); tot.musik++; fMus++;
    if (r[C.lock]) { tot.last++; fLast++; } if (r[C.trust] > 0.5) { tot.trygg++; fTrygg++; }
  }
  let looks = 0, miniL = 0; for (let i = 1; i < rows.length; i++) { if (rows[i][C.look] !== rows[i - 1][C.look]) looks++; if (rows[i][C.miniLook] && !rows[i - 1][C.miniLook]) miniL++; }
  const last = rows[rows.length - 1];
  tot.drops += last[C.drops]; tot.mini += last[C.aMini]; tot.looks += looks; tot.miniL += miniL; tot.filer++; tot.min += (last[0] ?? 0) / 60;
  per.push({ fil: f, ana: fAna, klocka: fKl, last: +(fLast / Math.max(1, fMus)).toFixed(3), trygg: +(fTrygg / Math.max(1, fMus)).toFixed(3), drops: last[C.drops], mini: last[C.aMini], looks });
}
const pct = (x) => (100 * x).toFixed(1) + " %";
const res = {
  filer: tot.filer, minuter: +tot.min.toFixed(1), latar: tot.latar,
  hoppAnaPerLat: +(tot.anaN / tot.latar).toFixed(2), hoppKlockaPerLat: +(tot.klockaN / tot.latar).toFixed(2), latarMedKlockhopp: tot.latarMedHopp,
  hoppAna: tot.ana, hoppKlocka: tot.klocka, domTempo: +(tot.dom / tot.domN).toFixed(3),
  conf: { p10: q(tot.conf, 0.1), p25: q(tot.conf, 0.25), p50: q(tot.conf, 0.5), p75: q(tot.conf, 0.75), p90: q(tot.conf, 0.9) },
  trust: { p10: q(tot.trust, 0.1), p25: q(tot.trust, 0.25), p50: q(tot.trust, 0.5), p75: q(tot.trust, 0.75), p90: q(tot.trust, 0.9) },
  last: +(tot.last / tot.musik).toFixed(3), trygg: +(tot.trygg / tot.musik).toFixed(3), drops: tot.drops, mini: tot.mini, miniLook: tot.miniL, lookbyten: tot.looks,
};
console.log(`${res.filer} filer, ${res.minuter} min, ${res.latar} låtar (LATGRANS-segment >= 15 s musik)`);
console.log(`tempobyten/låt: analysator ${res.hoppAnaPerLat}  taktklocka ${res.hoppKlockaPerLat}  (låtar med klockhopp ${res.latarMedKlockhopp}/${res.latar})`);
console.log(`  analysator: ${KL.map((k) => `${k} ${tot.ana[k]}`).join("  ")}`);
console.log(`  taktklocka: ${KL.map((k) => `${k} ${tot.klocka[k]}`).join("  ")}`);
console.log(`andel musiktid på låtens vanligaste tempo: ${pct(res.domTempo)}`);
console.log(`bpmConfidence p10/25/50/75/90: ${Object.values(res.conf).map((x) => x.toFixed(2)).join(" / ")}`);
console.log(`beatTrust      p10/25/50/75/90: ${Object.values(res.trust).map((x) => x.toFixed(2)).join(" / ")}`);
console.log(`låst (hasBeat) ${pct(res.last)}   tillit > 0,5 ${pct(res.trygg)}`);
console.log(`kontroll: drops ${res.drops}  analysatorns minidrops ${res.mini}  minidrop-looker ${res.miniLook}  lookbyten ${res.lookbyten}`);
if (args.includes("--per-fil")) for (const p of per) console.log(JSON.stringify(p));
if (opt("--json")) writeFileSync(opt("--json"), JSON.stringify({ ...res, per }, null, 1));
