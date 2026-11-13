/**
 * MOTORNS DROP/MINIDROP MOT ÄGARENS FINJUSTERADE MARKERINGAR (2026-11-13). Spelar en inspelning genom analysatorn offline, vid en eller
 * flera nivåer (skalar ljudet in i analysatorn - för att se om domen beror på ingångsnivån), och jämför med <namn>.marks-fin.json
 * (tools/natt/bygg-facit/finjustera.py).
 *   node tools/natt/bygg-facit/dropMotFacit.mjs <lang-*.wav> [skala ...]      (standard: 1)
 * Träff = motorns händelse inom -0,5 .. +1,5 s från markeringens ljudtid. Per skala: ägarens drop -> drop/mini/missad, ägarens mini ->
 * mini/drop/missad, och motorns händelser utan markering, per sort.
 * FACIT ÄR INTE HELTÄCKANDE FÖR MINIDROP (ägaren 11-13: "mina minidrop kan vara på fler ställen än vad jag hinner markera"): en
 * omarkerad minidrop från motorn är INTE bevisat falsk. Döm på träffarna (hittar motorn det ägaren markerat, och som rätt sort) och
 * på ägarens uttryckliga "Inte drop"; antalet omarkerade är bara en upplysning (rimligt antal eller en per taktslag).
 */
import { readFileSync } from "node:fs";
const [wav, ...sk] = process.argv.slice(2); const skalor = sk.length ? sk.map(Number) : [1];
const { Analyser } = await import("../../../dist/analyser.js");
const { defaultConfig } = await import("../../../dist/config.js");
const fin = JSON.parse(readFileSync(wav.replace(/\.wav$/, ".marks-fin.json"), "utf8")).marks.filter((m) => !m.skip);   // feltryck (inget i ljudet) är inte facit
const d = readFileSync(wav); let o = 12, start = 44, len = d.length - 44;
while (o + 8 <= d.length) { const id = d.toString("latin1", o, o + 4), ln = d.readUInt32LE(o + 4); if (id === "data") { start = o + 8; len = Math.min(ln || d.length - start, d.length - start); break; } o += 8 + ln + (ln & 1); }
const ch = d.readUInt16LE(22), SR = d.readUInt32LE(24), n = Math.floor(len / 2 / ch), HOP = 128, EPOCH = 1700000000000;
const origNow = Date.now, origPerf = performance.now.bind(performance), log = console.log; console.log = () => {};
const ut = [];
for (const k of skalor) {
  const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
  const buf = new Float32Array(HOP); let lastD = 0, lastM = 0; const ev = []; const lv = [];
  for (let off = 0; off + HOP <= n; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = Math.max(-1, Math.min(1, d.readInt16LE(start + (off + i) * 2 * ch) / 32768 * k));
    const t = off / SR, ms = EPOCH + t * 1000; an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf);
    if (fr.dropCount !== lastD) { lastD = fr.dropCount; ev.push([t, "drop"]); }
    if ((fr.miniDropCount ?? 0) !== lastM) { lastM = fr.miniDropCount ?? 0; ev.push([t, "mini"]); }
    if ((off / HOP) % 375 === 0) lv.push(fr.level);
  }
  lv.sort((a, b) => a - b); const used = new Set(); const rad = { drop: { drop: 0, mini: 0, missad: 0 }, mini: { drop: 0, mini: 0, missad: 0 } }; const det = [];
  for (const m of fin) {
    if (m.kind !== "drop" && m.kind !== "mini") continue;
    let best = -1, bd = 9;
    for (const want of [m.kind, m.kind === "drop" ? "mini" : "drop"]) {            // helst rätt sort, annars den andra
      ev.forEach(([t, s], j) => { const dt = t - m.fineS; if (s === want && !used.has(j) && dt >= -0.5 && dt <= 1.5 && Math.abs(dt) < bd) { bd = Math.abs(dt); best = j; } });
      if (best >= 0) break;
    }
    if (best >= 0) { used.add(best); rad[m.kind][ev[best][1]]++; det.push(`${m.kind}@${m.fineS.toFixed(1)}->${ev[best][1]}${(ev[best][0] - m.fineS >= 0 ? "+" : "") + (ev[best][0] - m.fineS).toFixed(2)}`); }
    else { rad[m.kind].missad++; det.push(`${m.kind}@${m.fineS.toFixed(1)}->MISSAD`); }
  }
  const falsk = ev.filter((_, j) => !used.has(j));
  ut.push({ k, median: lv[lv.length >> 1], p95: lv[Math.floor(lv.length * 0.95)], nD: ev.filter((e) => e[1] === "drop").length, nM: ev.filter((e) => e[1] === "mini").length, rad, fD: falsk.filter((e) => e[1] === "drop").length, fM: falsk.filter((e) => e[1] === "mini").length, det,
            inte: fin.filter((m) => m.kind === "intedrop").map((m) => ev.filter(([t]) => t >= m.pressS - 3 && t <= m.pressS + 0.3).length).join(",") || "-" });
}
Date.now = origNow; performance.now = origPerf; console.log = log;
console.log(`${wav}  (${(n / SR).toFixed(0)} s, ägaren: ${fin.filter((m) => m.kind === "drop").length} drop, ${fin.filter((m) => m.kind === "mini").length} mini)`);
console.log("skala  nivå med/p95   motorn drop/mini   ägarens DROP blev drop/mini/missad   ägarens MINI blev mini/drop/missad   omarkerade drop/mini   händelser vid 'inte drop'");
for (const u of ut) console.log(`${String(u.k).padEnd(5)}  ${u.median.toFixed(2)}/${u.p95.toFixed(2)}      ${String(u.nD).padStart(3)} /${String(u.nM).padStart(4)}        ${u.rad.drop.drop} / ${u.rad.drop.mini} / ${u.rad.drop.missad}                             ${u.rad.mini.mini} / ${u.rad.mini.drop} / ${u.rad.mini.missad}                             ${u.fD} / ${u.fM}                  ${u.inte}`);
if (process.env.DETALJ) for (const u of ut) console.log(`\nskala ${u.k}: ${u.det.join("  ")}`);
