/** IDENTITETSBEVIS for den delade analysatorn (portat fran lotus-light 2026-09-22, se src/split.ts).
 *
 *  Kor samma latar genom (A) en ODELAD analysator och (B) snabb+langsam i INLINE-lage (den langsamma
 *  sidan kors synkront efter varje record) med identisk matning (virtuell klocka, deterministiskt),
 *  och jamfor per hop: bpm, konfidens, gridfas, sektion, tier, upprepning.
 *
 *  KRAVET: tempo och gridfas ska vara BIT-identiska.
 *
 *  SEKTIONEN skiljer sig daremot vid hop 128, och det ar VANTAT och MATT (2026-09-22):
 *  dmx-analysatorn anropar sectionHop en gang per HOP (2,67 ms) i odelat lage, medan den delade
 *  sidan far blocksummorna en gang per ENV-SAMPEL (10 ms). 1 s-blocket stanger darfor pa ett
 *  rutnat med 10 ms upplosning i stallet for 2,67 ms, och rang-/percentillogiken (tier) ar kaotisk
 *  precis vid sina trosklar - nagra block hamnar over/under och etiketten hoppar.
 *  KONTROLLFORSOKET som bevisar just det: SPLIT_HOP=480 ger exakt ETT hop per env-sampel, dvs samma
 *  blockupplosning i bada lagen -> sektionen skiljer da 2 hop per lat (0,04 %).
 *  (Lotus slipper detta for att DESS odelade lage ocksa aggregerar per env-sampel; har ar kravet att
 *  odelat lage ska vara ororts, sa den skillnaden ar priset.)
 *
 *    node tools/splitProof.mjs [--n 12] [--worker]
 *    SPLIT_DIR=<katalog med 48 kHz mono wav>   annan korpus an tools/ (laser bara)
 *    SPLIT_MAX_S=120                           klipp varje fil (0 = hela)
 *    SPLIT_HOP=128                             hopstorlek; 480 = kontrollforsoket ovan
 *    --worker                                  aven en rokning av den RIKTIGA workern (dist/slowWorker.js)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Sektion och gridfas ar opt-in och lases som STATISKA falt nar klassen definieras -> maste sattas
// FORE importen av dist/analyser.js.
process.env.DMX_SECTION ??= '1';
process.env.DMX_GRID_PHASE ??= '1';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const N = Number(arg('--n', 12));
const WORKER = process.argv.includes('--worker');
const CORPUS = process.env.SPLIT_DIR || here;
const MAX_S = Number(process.env.SPLIT_MAX_S ?? 120);

const { createAnalyser } = await import(pathToFileURL(join(here, '..', 'dist', 'analyser.js')).href);
const { defaultConfig } = await import(pathToFileURL(join(here, '..', 'dist', 'config.js')).href);

function readWav(path) {
  const b = readFileSync(path);
  const ch = b.readUInt16LE(22), rate = b.readUInt32LE(24);
  let off = 12, dataOff = 44, dataLen = b.length - 44;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4), len = b.readUInt32LE(off + 4);
    if (id === 'data') { dataOff = off + 8; dataLen = len === 0 ? b.length - dataOff : Math.min(len, b.length - dataOff); break; }
    off += 8 + len + (len & 1);
  }   // len 0 = strom-skriven fil (pop_ladan/megamix_ladan)
  let n = Math.floor(dataLen / 2 / ch);
  if (MAX_S > 0) n = Math.min(n, Math.floor(MAX_S * rate));
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < ch; c++) s += b.readInt16LE(dataOff + (i * ch + c) * 2); y[i] = s / ch / 32768; }
  return { y, rate };
}

const HOP = Number(process.env.SPLIT_HOP || 128);
function makeCfg(rate) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  cfg.audio.rate = rate; cfg.fft.hop = HOP;
  return cfg;
}

function run(y, rate, mode) {
  process.env.DMX_ANALYSER_SPLIT = mode;
  const an = createAnalyser(makeCfg(rate));
  an.setGainLock(true, 1);   // fast gain: AGC:n lever helt i snabba vagen och ska inte kunna forvirra jamforelsen
  const buf = new Float32Array(HOP); const out = [];
  let h = 0;
  for (let i = 0; i + HOP <= y.length; i += HOP) {
    buf.set(y.subarray(i, i + HOP));
    an.setVirtualClock((h * HOP / rate) * 1000);
    const f = an.process(buf); h++;
    out.push([f.bpm, f.bpmConfidence, f.beatPhaseMs, f.beatPhaseConf, f.section, f.sectionTier, f.repeatSim, f.expectHighInMs, f.levelVsHighDb]);
  }
  return { out, an };
}

const files = readdirSync(CORPUS).filter((f) => f.endsWith('.wav')).sort().slice(0, N);
if (!files.length) { console.error(`inga .wav i ${CORPUS} — satt SPLIT_DIR`); process.exit(2); }
let totHops = 0, tempoDiff = 0, phaseDiff = 0, secDiff = 0, tierDiff = 0, repDiff = 0;
const perFile = [];
for (const f of files) {
  const { y, rate } = readWav(join(CORPUS, f));
  const A = run(y, rate, '').out, B = run(y, rate, 'inline').out;
  let td = 0, pd = 0, sd = 0, tr = 0, rd = 0, firstT = -1;
  for (let i = 0; i < A.length; i++) {
    const a = A[i], b = B[i];
    if (a[0] !== b[0] || a[1] !== b[1]) { td++; if (firstT < 0) firstT = i * HOP / rate; }
    if (a[2] !== b[2] || a[3] !== b[3]) pd++;
    if (a[4] !== b[4]) sd++;
    if (a[5] !== b[5]) tr++;
    if (a[6] !== b[6] || a[7] !== b[7] || a[8] !== b[8]) rd++;
  }
  totHops += A.length; tempoDiff += td; phaseDiff += pd; secDiff += sd; tierDiff += tr; repDiff += rd;
  perFile.push(`${f.slice(0, 40).padEnd(40)} hop ${String(A.length).padStart(6)}  tempo!= ${td}${firstT >= 0 ? ` (forsta ${firstT.toFixed(1)} s)` : ''}  fas!= ${pd}  sektion!= ${sd}  tier!= ${tr}  rep!= ${rd}`);
}
console.log(perFile.join('\n'));
console.log(`\nSUMMA ${files.length} filer, ${totHops} hop: tempo/konf olika ${tempoDiff} (${(100 * tempoDiff / totHops).toFixed(3)} %), gridfas olika ${phaseDiff} (${(100 * phaseDiff / totHops).toFixed(3)} %), sektion olika ${secDiff} (${(100 * secDiff / totHops).toFixed(3)} %), tier ${tierDiff}, upprepning ${repDiff}`);

if (WORKER) {
  // Rokning av den RIKTIGA workern: mata i realtidstakt 15 s, se att tempot kommer och att workern
  // haller jamna steg (behind/lagMs sma, skipped 0).
  const { y, rate } = readWav(join(CORPUS, files[0]));
  process.env.DMX_ANALYSER_SPLIT = 'worker';
  const an = createAnalyser(makeCfg(rate)); an.setGainLock(true, 1);
  const buf = new Float32Array(HOP); let h = 0; const t0 = performance.now(); let lastBpm = 0;
  await new Promise((res) => {
    const iv = setInterval(() => {
      const want = Math.floor((performance.now() - t0) / 1000 * rate / HOP);
      while (h < want && (h + 1) * HOP <= y.length) { buf.set(y.subarray(h * HOP, (h + 1) * HOP)); lastBpm = an.process(buf).bpm; h++; }
      if (performance.now() - t0 > 15000 || (h + 1) * HOP > y.length) { clearInterval(iv); res(); }
    }, 5);
  });
  console.log(`\nWORKER-ROKNING ${files[0]}: ${h} hop pa 15 s, bpm ${lastBpm}, stats ${JSON.stringify(an.getSplitStats())}`);
  an.__stopWorker?.();
}
