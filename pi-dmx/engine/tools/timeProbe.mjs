import { pathToFileURL } from "node:url";
/** TIDSOND (2026-10-08): analyser.process per hop och EffectEngine.render per ruta i en riktig show (samma loop som showTight),
 *  med process.hrtime (performance.now ar virtuell i banken). DIST=<dist-mapp> valjer bygget, sa fore/efter kan jamforas:
 *    DIST=dist node tools/timeProbe.mjs tools/pop_ladan.wav
 *  Ett gammalt bygge maste ligga INOM engine/ (paketen loses darifran) - aldrig lankar till node_modules (09-21). */
/**
 * SHOW-TAJTHET (2026-10-06). Agaren: "analysera mot nya motorn hur effekterna syns/visualiseras sa de blir
 * tight mot latarna och en snygg ljusshow". Den har banken mater precis de tva sakerna, pa EN korning genom
 * den RIKTIGA analysatorn och den RIKTIGA effektmotorn i smart-lage pa virtuell klocka - alltsa showen som
 * den faktiskt blir i ladan, inte en modell av den.
 *
 *   node tools/showTight.mjs <wav> [--json ut.json] [--agc] [--start S] [--sek S] [--tyst]
 *
 * TAJT MOT LATEN (foljer ljuset musiken?)
 *   kickLag      median ms fran analysatorns kick till att riggens ljus natt 90 % av sin topp (ljusvagen)
 *   kickTraff    andel kickar som alls ger en synlig uppgang (>= 15 % over nivan precis fore)
 *   energiR      korrelation riggens ljus mot frame.intensity  <- "ljusstyrka foljer energi"
 *   nivaR        korrelation riggens ljus mot frame.level
 *   musikByten   andel look-byten med musikalisk orsak (allt utom 'dwell'), + byten/min och orsaksfordelning
 *   dropSprang   riggens ljussprang vid drops (fore -> topp inom 0,8 s), lugna och hoga partier skilt
 *
 * SNYGG LJUSSHOW (ser det bra ut?)
 *   alla3        andel tanda lamprutor dar R, G och B alla lyser = vitaktigt (lagre = renare kulorer)
 *   matt         median mattnad (max-min)/max per lampa, 1 = ren farg
 *   lampspr      medelspridning MELLAN lampor i DMX-steg = rumslighet (hogre = mindre "allt lika")
 *   lookar       distinkta lookar, median looklangd, langsta oavbrutna stund i EN look
 *   morkt        andel tid riggen ar i praktiken slackt
 *   spann        riggens ljus p10/p50/p90 - anvander showen sitt omfang eller ligger den still?
 *
 * VARFOR KORRELATION OCH INTE BARA NIVA: energilagret ar det ENDA som far dampa (agarens arkitektur: effekter
 * bestammer farg/styrka/lampa, energilagret polerar precis innan utskick). Da ar fragan inte hur ljust det ar
 * utan om ljuset ROR SIG med musiken. r ar det matt som svarar pa det, och det ar jamforbart natt mot natt.
 *
 * LATGRANS/KARAKTAR/TEMPOVAXLING (bank v2, natt-agenten 2026-10-07): index.ts matar BoundaryDetector fran
 * analysatorns spektrum och ger motorn bytesskal (noteCharShift: karaktarsskifte + tempovaxling uppat) och
 * latgranser (softenRange + analyser.hintTrackChange). Bank v1 hade INTE den sidokedjan - "tempovaxlingen fyrade
 * 0 ganger pa mixarna" 10-06 var darfor banken, inte motorn (matfalla 34). Speglas har rad for rad fran index.ts.
 * --norm DBFS (bank v2): frozen6-klippen ligger ~28 dB under ladans aux-inspelningar (median 100 ms-RMS -31,7 mot
 * pop -3,4 / megamix -4,1 dBFS) och aux kor med last gain 1 - utan nivaanpassning matar korpusen en rigg som far
 * en tjugondel av signalen (matfalla 35). --norm skalar klippet sa medianen hamnar pa DBFS (hard klippning vid +-1).
 * --trace ut.json skriver per-ruta-serier + handelser (tempoShiftBench.mjs laser den).
 *
 * MATFALLA: analysatorn ateranvander SAMMA ruta-objekt varje hop - allt som sparas maste klonas (det var felet
 * som gav 0 i alla effektbankar i tre dygn). Och den virtuella klockan maste sta FORE motorn skapas, annars blir
 * forsta dt negativ och tystnadsgrinden oppnar aldrig.
 */
import { readFileSync, writeFileSync } from "node:fs";

// Motorn stanger av console.log i tyst lage - bankens utskrift maste ga direkt till stdout.
const say = (...a) => process.stdout.write(a.join(" ") + "\n");
const args = process.argv.slice(2);
const flag = (k) => args.includes(k);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

const path = args.find((a) => a.endsWith(".wav"));
if (!path) { say("ange en wav-fil"); process.exit(2); }
const startS = Number(opt("--start", 0));
const maxS = Number(opt("--sek", 1e9));
const QUIET = flag("--tyst");

const { Analyser } = await import(pathToFileURL(process.env.DIST + "/analyser.js").href);
const { EffectEngine } = await import(pathToFileURL(process.env.DIST + "/effects.js").href);
const { defaultConfig, fixtureRoles } = await import(pathToFileURL(process.env.DIST + "/config.js").href);
const { EFFECT_KEYS } = await import(pathToFileURL(process.env.DIST + "/effects/registry.js").href);
const { BoundaryDetector } = await import(pathToFileURL(process.env.DIST + "/boundaryDetector.js").href);

const d = readFileSync(path);
if (d.toString("ascii", 0, 4) !== "RIFF") { say("inte en WAV"); process.exit(2); }
if (d.readUInt32LE(24) !== 48000 || d.readUInt16LE(34) !== 16 || d.readUInt16LE(22) !== 1) {
  say("kraver 48 kHz mono 16-bit"); process.exit(2);
}
const nSamples = (d.length - 44) >> 1;
let GAIN = 1;
if (opt("--norm", null) !== null) {   // median 100 ms-RMS -> malniva (se huvudet, matfalla 35)
  const blk = 4800, rms = [];
  for (let o = 0; o + blk <= nSamples; o += blk) { let q = 0; for (let i = 0; i < blk; i++) { const x = d.readInt16LE(44 + (o + i) * 2) / 32768; q += x * x; } const r = Math.sqrt(q / blk); if (r > 1e-4) rms.push(r); }
  rms.sort((a, b) => a - b);
  if (rms.length) GAIN = Math.pow(10, Number(opt("--norm")) / 20) / rms[rms.length >> 1];
}
const SR = 48000, HOP = 128, EPOCH = 1700000000000, STEP_MS = 25;   // 25 ms = riggens egen takt

// LADANS CONFIG: smart-lage, alla lookar pa, master 1. Annars matas en annan rigg an den som star i ladan.
const cfg = JSON.parse(JSON.stringify(defaultConfig));
cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true;
cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;

// ROLLKARTAN ur motorns egen fixtureRoles() - ingen gissning om vilken kanal som ar r/g/b/dim.
const lamps = cfg.fixtures.map((fx) => {
  const roles = fixtureRoles(fx), base = (fx.address ?? 1) - 1;
  const at = (r) => { const i = roles.indexOf(r); return i < 0 ? -1 : base + i; };
  return { r: at("r"), g: at("g"), b: at("b"), dim: at("dim") };
});

const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig)));
// GAIN: motorn laser forstarkningen bara pa aux (index.ts: setGainLock(cfg.audioInput !== "mic", 1)).
// Kor ladan pa mikrofon ar AGC:n aktiv dar men inte har; --agc kor som mikrofoningang.
if (!flag("--agc")) an.setGainLock(true, 1);
// LATGRANSENS SIDOKEDJA som i index.ts (se huvudet). Klockan ar Date.now = den virtuella.
const bounds = new BoundaryDetector(() => Date.now());   // INTE standardklockan: den fangar Date.now-funktionen vid konstruktion, och banken byter den per hop
an.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 };
let lastCharShift = 0, lastTempoShift = 0, lastBoundary = 0;
const EV = [];   // {t, typ, txt}

// Klockan FORE motorn skapas (matfallan ovan).
const t00 = EPOCH + startS * 1000;
Date.now = () => t00; performance.now = () => t00 - EPOCH;
const eng = new EffectEngine(cfg);

// Motorns rader fangas sa de inte sloar ner korningen; [dirigent] ar enda raden som sager nagot om VARFOR.
const dirigent = [];
const origLog = console.log;
console.log = (...a) => { const s = a.join(" "); if (s.startsWith("[dirigent]")) dirigent.push(s); };

const buf = new Float32Array(HOP);
const tA = [], tR = []; let lastRender = -1;
const hr = () => Number(process.hrtime.bigint()) / 1e6;
for (let off = 0; off + HOP <= nSamples; off += HOP) {
  for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
  const tS = off / SR, ms = EPOCH + tS * 1000;
  an.setVirtualClock(ms); Date.now = () => ms; performance.now = () => ms - EPOCH;
  let t0 = hr(); const fr = an.process(buf); tA.push(hr() - t0);
  boundsArg.level = fr.level; boundsArg.bpm = fr.bpm; boundsArg.bpmConfidence = fr.bpmConfidence; bounds.tick(boundsArg);
  if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence };
  if (ms - lastRender < STEP_MS && lastRender >= 0) continue;
  lastRender = ms; t0 = hr(); eng.render(fr); tR.push(hr() - t0);
}
const st = (a) => { const s = [...a].sort((x, y) => x - y); const m = a.reduce((x, y) => x + y, 0) / a.length; return `medel ${(m * 1000).toFixed(0)} µs  p99 ${(s[Math.floor(.99 * (s.length - 1))] * 1000).toFixed(0)} µs  max ${s[s.length - 1].toFixed(2)} ms`; };
say(`analyser.process/hop: ${st(tA)} | render/ruta: ${st(tR)}`);
