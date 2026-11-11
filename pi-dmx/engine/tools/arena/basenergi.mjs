// ARENAN BASENERGI (2026-11-11) - analysmåttet på fältet frame.bassEnergy, utan lampor.  node tools/arena/basenergi.mjs <mapp> [--bas] [--s 180]
// Kör analysatorn ur <mapp>/dist (--bas: engine/dist) som konsertReplay --delad-cfg (delad analysator inline, motorns cfg, BeatFeed) över
// lang1021 två gånger: insignalen x 1 och x 0,25 (-12 dB). Skriver <mapp>/basenergi.json. Inget lås, ~20 s, räknas inte mot bänkbudgeten.
//   finns     frame.bassEnergy är ett ändligt tal i 0..1 varje hop
//   gainDiff  medel |fält(x1) - fält(x0,25)| över hop där ingen av körningarna är tyst. KRAV <= 0,05: fältet ska mäta MUSIKEN, inte
//             ingångsnivån (lotus har mic med okänd nivå, DMX linje) - annars DISK i domaren.
//   falt      md5 över de BEFINTLIGA ramfälten per hop (x1). KRAV = bas: arenan lägger till ett fält, den ändrar inga andra - annars DISK.
//   p05/p50/p95, tyst (medel under frame.silent), slagDjup (median: fältets topp 0..150 ms efter frame.kick minus dalen 150 ms före),
//   usPerHop (analysatorns CPU per hop, x1) = information.
import { readFileSync, writeFileSync } from "node:fs"; import { createHash } from "node:crypto"; import { pathToFileURL } from "node:url"; import path from "node:path";
const args = process.argv.slice(2), mapp = path.resolve(args[0]); const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const ENGINE = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
const DIST = pathToFileURL(args.includes("--bas") ? path.join(ENGINE, "dist") : path.join(mapp, "dist")).href + "/";
const WAV = path.join(ENGINE, "tools/ladan-2026-10-21/lang-20261021T203952.wav"), S = Number(opt("--s", 180));
const { Analyser } = await import(DIST + "analyser.js"); const { BeatFeed } = await import(DIST + "beatFeed.js");
const { defaultConfig } = await import(DIST + "config.js"); const { createSplitBuffers } = await import(DIST + "split.js");
const d = readFileSync(WAV); let p = 12, o0 = 44, len = d.length - 44;
while (p + 8 <= d.length) { const id = d.toString("ascii", p, p + 4), sz = d.readUInt32LE(p + 4); if (id === "data") { o0 = p + 8; len = sz > 0 ? Math.min(sz, d.length - p - 8) : d.length - p - 8; break; } p += 8 + sz + (sz & 1); }
const SR = 48000, HOP = 128, EPOCH = 1700000000000, n = Math.min(len >> 1, S * SR), hops = Math.floor(n / HOP);
const realNow = Date.now, realPerf = performance.now.bind(performance), log = console.log; console.log = () => {};
function run(gain) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig)); const c = BeatFeed.analyserCfg(cfg), b = createSplitBuffers();
  const an = new Analyser(c, { role: "fast", split: b }); an.setInlinePeer(new Analyser(structuredClone(c), { role: "slow", split: b })); an.setGainLock(true, 1);
  const feed = new BeatFeed(), buf = new Float32Array(HOP), e = new Float32Array(hops), sil = new Uint8Array(hops), kick = new Uint8Array(hops);
  const h = createHash("md5"), row = new Float64Array(17); let ok = true; const cpu0 = process.threadCpuUsage();
  for (let i = 0; i < hops; i++) {
    for (let k = 0; k < HOP; k++) buf[k] = d.readInt16LE(o0 + (i * HOP + k) * 2) / 32768 * gain;
    const ms = EPOCH + i * HOP / SR * 1000; an.setVirtualClock(ms - EPOCH); Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf); feed.update(fr, cfg, an);
    const v = fr.bassEnergy; if (!(typeof v === "number" && v >= 0 && v <= 1)) ok = false; e[i] = ok ? v : 0; sil[i] = fr.silent ? 1 : 0; kick[i] = fr.kick ? 1 : 0;
    row[0] = fr.bpm; row[1] = fr.bpmConfidence; row[2] = fr.level; row[3] = fr.energy; row[4] = fr.intensity; row[5] = fr.bodyDb ?? 0; row[6] = fr.kick ? 1 : 0;
    row[7] = fr.dropCount; row[8] = fr.miniDropCount; row[9] = fr.section.length + fr.section.charCodeAt(0); row[10] = fr.sectionTier; row[11] = fr.buildUp;
    row[12] = fr.levelVsHighDb; row[13] = fr.specAbs?.sub ?? 0; row[14] = fr.specAbs?.kick ?? 0; row[15] = fr.onset?.kick ?? 0; row[16] = fr.beatTrust ?? 0;
    h.update(Buffer.from(row.buffer));
  }
  const cpu = process.threadCpuUsage(cpu0); an.__stopWorker?.();
  return { e, sil, kick, ok, falt: h.digest("hex"), usPerHop: +((cpu.user + cpu.system) / hops).toFixed(2) };
}
const a = run(1), b = run(0.25); Date.now = realNow; performance.now = realPerf; console.log = log;
let sd = 0, sn = 0, ts = 0, tn = 0; const act = [];
for (let i = 0; i < hops; i++) { if (!a.sil[i] && !b.sil[i]) { sd += Math.abs(a.e[i] - b.e[i]); sn++; } if (a.sil[i]) { ts += a.e[i]; tn++; } else act.push(a.e[i]); }
act.sort((x, y) => x - y); const q = (f) => (act.length ? +act[Math.min(act.length - 1, Math.floor(f * act.length))].toFixed(3) : null);
const W = Math.round(0.15 * SR / HOP), dj = [];
for (let i = W; i < hops - W; i++) if (a.kick[i]) { let hi = 0, lo = 1; for (let k = 0; k <= W; k++) { if (a.e[i + k] > hi) hi = a.e[i + k]; if (a.e[i - k] < lo) lo = a.e[i - k]; } dj.push(hi - lo); }
dj.sort((x, y) => x - y);
const out = { finns: a.ok && b.ok, gainDiff: sn ? +(sd / sn).toFixed(4) : null, falt: a.falt, p05: q(0.05), p50: q(0.5), p95: q(0.95), tyst: tn ? +(ts / tn).toFixed(3) : null,
  slagDjup: dj.length ? +dj[dj.length >> 1].toFixed(3) : null, kickar: dj.length, usPerHop: a.usPerHop, sek: S, hop: hops };
writeFileSync(path.join(mapp, "basenergi.json"), JSON.stringify(out, null, 1)); process.stdout.write(JSON.stringify(out) + String.fromCharCode(10));
