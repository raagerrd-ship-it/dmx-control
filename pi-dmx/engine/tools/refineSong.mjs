/**
 * REFINER — "tvättar" en inlärd låt EN gång, offline.
 *
 * Körs som en EGEN process (nice 19) när låten tystnat, aldrig på motorns
 * huvudtråd. Realtidsanalysen är kausal: den ser inte framåt, så dropsen
 * släpar och BPM/energi blir grövre. Här har vi hela låten på disk och kan
 * titta både bakåt OCH framåt.
 *
 *   node tools/refineSong.mjs <wav> <songId> <outJson>
 *
 * Skriver en liten sidecar-JSON. Rör ALDRIG songs.bin — motorn är enda
 * skrivaren av minnesfilen.
 */
import { writeFileSync } from "node:fs";
import { replay } from "./replay.mjs";

const [wav, songId, out] = process.argv.slice(2);
if (!wav || !songId || !out) { console.error("usage: refineSong.mjs <wav> <songId> <outJson>"); process.exit(2); }

const t0 = Date.now();
const fr = replay(wav);
if (fr.length < 100) { console.error("[refine] för få ramar"); process.exit(3); }
const dur = fr[fr.length - 1].t;
const dt = fr.length > 1 ? fr[1].t - fr[0].t : 128 / 48000;   // sekunder per hop

// ── Baskropp: sub + kick + bas. Dropen hörs i kroppen, inte i diskanten. ──
const body = new Float32Array(fr.length);
for (let i = 0; i < fr.length; i++) body[i] = fr[i].sub + fr[i].kickB + fr[i].bass;
// Lätt utjämning (~40 ms) så enstaka anslag inte räknas som ett lyft.
const sm = new Float32Array(body.length);
{
  const n = Math.max(1, Math.round(0.04 / dt));
  let acc = 0;
  for (let i = 0; i < body.length; i++) {
    acc += body[i];
    if (i >= n) acc -= body[i - n];
    sm[i] = acc / Math.min(i + 1, n);
  }
}

const mean = (a, from, to) => {
  const lo = Math.max(0, from), hi = Math.min(a.length, to);
  if (hi <= lo) return 0;
  let s = 0;
  for (let i = lo; i < hi; i++) s += a[i];
  return s / (hi - lo);
};

// ── DROPS, ICKE-KAUSALT ───────────────────────────────────────────────────
// Kandidat: kroppen har varit BORTA (break/riser) och kommer tillbaka — och
// framtidsfönstret visar att lyftet HÅLLER. Tidpunkten sätts på flanken, inte
// där realtid hann reagera.
const F = (s) => Math.round(s / dt);
const PRE = F(1.5), PRE_GAP = F(0.35), POST = F(1.5), POST_LEAD = F(0.1), RISE = F(0.09);
const REFRACT = F(4.0);
const drops = [];
let lastDrop = -REFRACT;
for (let i = PRE; i < fr.length - POST; i++) {
  if (i - lastDrop < REFRACT) continue;
  const before = mean(sm, i - PRE, i - PRE_GAP);
  const after = mean(sm, i + POST_LEAD, i + POST);
  if (after < 0.12) continue;                    // tyst parti → ingen drop
  if (after < before * 2.6 + 0.04) continue;     // lyftet måste vara stort
  const rise = sm[Math.min(sm.length - 1, i + RISE)] - sm[i - RISE];
  if (rise < after * 0.35) continue;             // ...och skarpt
  // Lyftet måste ha börjat HÄR, inte någon gång i framtidsfönstret: annars
  // fyrar detektorn upp till en sekund före anslaget.
  if (mean(sm, i + F(0.05), i + F(0.3)) < after * 0.75) continue;
  // Flanken: den brantaste stigningen i ett smalt fönster runt kandidaten.
  // (Att gå bakåt till breakets nivå landade i en dal MELLAN kickarna, upp till
  // en sekund för tidigt — dropen måste ligga på anslaget.)
  let k = i, bestRise = -Infinity;
  for (let j = Math.max(RISE, i - F(0.4)); j < Math.min(sm.length - RISE, i + F(0.2)); j++) {
    const r = sm[j + RISE] - sm[j - RISE];
    if (r > bestRise) { bestRise = r; k = j; }
  }
  // Styrkan graderas EFTERÅT (relativt kvällens övriga drops) — se nedan.
  drops.push({ i: k, t: Math.round(fr[k].t * 1000), lift: after / (before + 0.05), s: 0.5 });
  lastDrop = i;
}


// ── BPM över HELA låten ───────────────────────────────────────────────────
// Autokorrelation på onset-kurvan i 100 Hz, längd-normaliserad (annars vinner
// alltid den kortaste lagen).
// Steget måste vara ett helt antal hopar → den FAKTISKA kurvfrekvensen räknas
// ur steget. (Att anta 100 Hz gav 6,7 % fel tempo: 128 BPM lästes som 136,5.)
const step = Math.max(1, Math.round(1 / (100 * dt)));
const HZ = 1 / (step * dt);
const on = [];
for (let i = step; i < fr.length; i += step) on.push(Math.max(0, sm[i] - sm[i - step]));
const onMean = on.reduce((a, b) => a + b, 0) / (on.length || 1);
for (let i = 0; i < on.length; i++) on[i] -= onMean;
const LAG_MIN = Math.round(HZ * 60 / 200), LAG_MAX = Math.round(HZ * 60 / 60);
const ac = new Float64Array(LAG_MAX * 4 + 2);
for (let lag = LAG_MIN; lag < ac.length; lag++) {
  let s = 0;
  for (let i = lag; i < on.length; i++) s += on[i] * on[i - lag];
  ac[lag] = s / Math.max(1, on.length - lag);   // längd-normaliserat
}
// Kamscore: en riktig taktperiod har toppar även på 2×, 3× och 4× lagen. Utan
// det vinner ofta en granne till rätt lag och tempot hamnar några BPM fel.
let bestLag = 0, bestScore = -Infinity;
for (let lag = LAG_MIN; lag <= LAG_MAX; lag++) {
  const s = ac[lag] + 0.5 * (ac[2 * lag] ?? 0) + 0.25 * (ac[3 * lag] ?? 0) + 0.125 * (ac[4 * lag] ?? 0);
  if (s > bestScore) { bestScore = s; bestLag = lag; }
}
// Subsampel-topp (parabel) → BPM med decimal i stället för kvantiserad till lag.
let lagF = bestLag;
if (bestLag > LAG_MIN && bestLag < LAG_MAX) {
  const a = ac[bestLag - 1], b = ac[bestLag], c = ac[bestLag + 1], den = a - 2 * b + c;
  if (den !== 0) lagF = bestLag + Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / den));
}
let bpm = lagF ? 60 * HZ / lagF : 0;
// Oktavval: håll tempot i 80–160, där dansmusik faktiskt bor.
while (bpm > 0 && bpm < 80) bpm *= 2;
while (bpm > 165) bpm /= 2;

// Taktfas: vik onset-kurvan över perioden och ta maxfasen.
let beatPhaseMs = 0;
if (bpm > 0) {
  const per = Math.max(2, Math.round(HZ * 60 / bpm));
  const fold = new Float64Array(per);
  for (let i = 0; i < on.length; i++) fold[i % per] += on[i];
  let bi = 0;
  for (let i = 1; i < per; i++) if (fold[i] > fold[bi]) bi = i;
  beatPhaseMs = Math.round((bi / HZ) * 1000);
}

// ── Energikurva, 1 värde/sekund ───────────────────────────────────────────
const secs = Math.ceil(dur);
const intensity = new Array(secs).fill(0);
{
  const cnt = new Array(secs).fill(0);
  for (const f of fr) {
    const s = Math.floor(f.t);
    if (s >= 0 && s < secs) { intensity[s] += f.intensity; cnt[s]++; }
  }
  for (let s = 0; s < secs; s++) intensity[s] = cnt[s] ? intensity[s] / cnt[s] : (intensity[s - 1] ?? 0.5) / 255;
  // Lätt utjämning så dramaturgin inte hackar sekund för sekund.
  for (let s = 1; s < secs; s++) intensity[s] = intensity[s] * 0.7 + intensity[s - 1] * 0.3;
  for (let s = 0; s < secs; s++) intensity[s] = Math.round(Math.max(0, Math.min(1, intensity[s])) * 255);
}

writeFileSync(out, JSON.stringify({ v: 1, songId: Number(songId), drops, bpm: Math.round(bpm * 10) / 10, beatPhaseMs, intensity }));
const cpu = process.cpuUsage();
console.log(`[refine] låt #${songId}: ${dur.toFixed(0)}s ljud, ${drops.length} drops, ${bpm.toFixed(1)} BPM — vägg ${((Date.now() - t0) / 1000).toFixed(1)}s, CPU ${((cpu.user + cpu.system) / 1e6).toFixed(1)}s`);
