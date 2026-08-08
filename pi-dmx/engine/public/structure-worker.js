/**
 * STRUKTURANALYS I WEBBLÄSAREN — körs i en Web Worker, aldrig på Pi:n.
 *
 * Pi:n har 416 MB RAM och ska köra showen. Datorn som visar det här UI:t är
 * ändå uppkopplad när ägaren spelar in, så den gör det tunga jobbet. Finns
 * ingen dator uppkopplad ligger WAV:erna kvar på kortet tills en dyker upp —
 * kön blir ett felläge i stället för huvudfallet.
 *
 * KEDJAN: kroma per ram → självlikhetsmatris → Foote-novelty → gränser →
 *         klustring → sektioner MED IDENTITET ("det här är samma som vid 1:12").
 *
 * Identiteten är hela poängen. Minnet lagrar i dag bara TIDPUNKTER för
 * karaktärsskiften (SongMeta.sections), så dirigenten vet att en gräns
 * passerade men inte VAD som börjar. Med identitet kan den ta tillbaka samma
 * look varje gång refrängen kommer — det beteende riktiga ljustekniker har.
 *
 * MÄTT 2026-08-08 på två friska inspelningar (facit3, session_mono): varje
 * analyserat fönster gav en dominant period på 46–66 s, och alla motsvarade
 * 128 taktslag (= 32 takter) vid rimligt tempo. Strukturen finns i musiken.
 * Kroma MÅSTE medelvärdescentreras: utan det låg likheten på 0.997 med
 * spridning 0.000 — allt liknade allt, och måttet mätte ingenting.
 */

const FPS = 5;              // ramtakt för kroma (0,2 s upplösning räcker för sektioner)
const N = 4096;             // FFT-fönster
const MIN_SEG_S = 8;        // en sektion kortare än så är en fras, inte en sektion
// TROSKELN AR INTE LANGRE EN KONSTANT — den satts per lat i latens EGET
// uppmatta gap. MATT 2026-08-08: det naturliga gapet lag pa 0.547, 0.170 och
// 0.027 i tre latar. En global konstant kan omojligt passa alla tre.
const T_MIN = 0.15, T_MAX = 0.85;   // rimlighetsgrans runt det uppmatta gapet
// KLANGFARGEN DOMINERAR. MATT 2026-08-08: klangfargens gap var 1,7x / 1,9x /
// 3,6x storre an kromans i samma latar — sektioner i loopbaserad dansmusik
// skiljs at av instrumentering, inte av ackord. En 50/50-blandning var SAMRE
// an bada delarna var for sig (0.056 mot 0.094 och 0.162).
const W_TIMBRE = 0.8;

/** Radix-2 FFT, in-place. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/** WAV → { rate, samples (Float32, mono) }. Bara 16-bit PCM, som recordern skriver. */
function parseWav(buf) {
  const dv = new DataView(buf);
  const rd = (o) => String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
  if (rd(0) !== "RIFF" || rd(8) !== "WAVE") throw new Error("inte en WAV");
  let p = 12, rate = 0, ch = 1, off = 0, len = 0;
  while (p + 8 <= dv.byteLength) {
    const id = rd(p), sz = dv.getUint32(p + 4, true);
    if (id === "fmt ") { ch = dv.getUint16(p + 10, true); rate = dv.getUint32(p + 12, true); }
    else if (id === "data") { off = p + 8; len = Math.min(sz, dv.byteLength - off); break; }
    p += 8 + sz + (sz & 1);
  }
  if (!rate || !len) throw new Error("saknar fmt/data");
  const i16 = new Int16Array(buf, off, len >> 1);
  const n = Math.floor(i16.length / ch);
  const out = new Float32Array(n);
  if (ch === 1) for (let i = 0; i < n; i++) out[i] = i16[i] / 32768;
  else for (let i = 0, j = 0; i < n; i++, j += ch) out[i] = (i16[j] + i16[j + 1]) / 65536;
  return { rate, samples: out };
}

/** Mel-liknande bandindelning: NB trianglar log-spridda 50 Hz – 8 kHz. */
const NB = 20, NT = 8;
function melBands(rate) {
  const mel = (f) => 2595 * Math.log10(1 + f / 700);
  const hz = (m) => 700 * (10 ** (m / 2595) - 1);
  const m0 = mel(50), m1 = mel(Math.min(8000, rate / 2 - 1));
  const edges = [];
  for (let i = 0; i <= NB + 1; i++) edges.push(hz(m0 + (m1 - m0) * i / (NB + 1)) * N / rate);
  return edges;
}

/**
 * Per ram: KROMA (harmonik) och KLANGFÄRG (MFCC-liknande).
 *
 * Båda behövs, och mätningen visar varför. MÄTT 2026-08-08: kroma skilde vers
 * från refräng i en låt med ackordbyten (A-B-A-B-A, rent), men gav EN enda
 * sektionstyp i två loopbaserade låtar — där står ackorden still hela låten och
 * kroma bär ingen sektionsinformation alls. Det som skiljer vers från drop där
 * är instrumentering, alltså klangfärg.
 */
function features(samples, rate, onProgress) {
  const hop = Math.round(rate / FPS);
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const pcOf = new Int16Array(N / 2);
  for (let k = 0; k < N / 2; k++) {
    const f = k * rate / N;
    pcOf[k] = (f > 65 && f < 2000) ? ((Math.round(12 * Math.log2(f / 440) + 69) % 12) + 12) % 12 : -1;
  }
  const edges = melBands(rate);
  const count = Math.max(0, Math.floor((samples.length - N) / hop));
  const chroma = [], timbre = [];
  const re = new Float32Array(N), im = new Float32Array(N);
  const mag = new Float32Array(N / 2), band = new Float32Array(NB);
  for (let fi = 0; fi < count; fi++) {
    const s = fi * hop;
    im.fill(0);
    for (let i = 0; i < N; i++) re[i] = samples[s + i] * win[i];
    fft(re, im);
    for (let k = 1; k < N / 2; k++) mag[k] = Math.hypot(re[k], im[k]);

    // --- KROMA (harmonik) ---
    const c = new Float32Array(12);
    for (let k = 1; k < N / 2; k++) if (pcOf[k] >= 0) c[pcOf[k]] += mag[k];
    let mean = 0;
    for (let i = 0; i < 12; i++) { c[i] = Math.log1p(c[i] * 20); mean += c[i]; }
    mean /= 12;
    let ss = 0;
    for (let i = 0; i < 12; i++) { c[i] -= mean; ss += c[i] * c[i]; }
    const nn = Math.sqrt(ss) || 1;
    for (let i = 0; i < 12; i++) c[i] /= nn;
    chroma.push(c);

    // --- KLANGFÄRG: mel-band → log → DCT-II ---
    for (let b = 0; b < NB; b++) {
      const lo = edges[b], mid = edges[b + 1], hi = edges[b + 2];
      let acc = 0;
      for (let k = Math.max(1, Math.ceil(lo)); k < Math.min(N / 2, hi); k++) {
        const w = k <= mid ? (k - lo) / (mid - lo || 1) : (hi - k) / (hi - mid || 1);
        if (w > 0) acc += mag[k] * w;
      }
      band[b] = Math.log1p(acc * 20);
    }
    const tv = new Float32Array(NT);
    // c0 hoppas över med flit: den är ren LJUDSTYRKA och skulle få varje lugnt
    // parti att likna varje annat lugnt parti oavsett instrumentering.
    for (let q = 0; q < NT; q++) {
      let acc = 0;
      for (let b = 0; b < NB; b++) acc += band[b] * Math.cos(Math.PI * (q + 1) * (b + 0.5) / NB);
      tv[q] = acc / NB;
    }
    let ts = 0;
    for (let q = 0; q < NT; q++) ts += tv[q] * tv[q];
    const tn = Math.sqrt(ts) || 1;
    for (let q = 0; q < NT; q++) tv[q] /= tn;
    timbre.push(tv);

    if ((fi & 255) === 0) onProgress(fi / count);
  }
  return { chroma, timbre };
}

/** Skalarprodukt mellan tva L2-normaliserade vektorer = kosinuslikhet. */
const dot = (a, b) => {
  let d = 0;
  for (let q = 0; q < a.length; q++) d += a[q] * b[q];
  return d;
};

/** Slar ihop kroma och klangfarg till EN vektor med lika vikt, sa dot() ger
 *  0,5 x harmonisk likhet + 0,5 x klanglikhet. Matningen avgor vikten. */
function fuse(chroma, timbre, wT) {
  const wC = Math.sqrt(1 - wT), w = Math.sqrt(wT);
  const out = [];
  for (let i = 0; i < chroma.length; i++) {
    const v = new Float32Array(12 + NT);
    for (let q = 0; q < 12; q++) v[q] = chroma[i][q] * wC;
    for (let q = 0; q < NT; q++) v[12 + q] = timbre[i][q] * w;
    out.push(v);
  }
  return out;
}

/**
 * FOOTE-NOVELTY: skjut en schackbrädeskärna längs diagonalen. Hög novelty =
 * före-och-efter liknar sig själva men inte varandra → en gräns.
 */
function novelty(frames, kernelS) {
  const F = frames.length;
  const K = Math.max(4, Math.round(kernelS * FPS));
  const nov = new Float32Array(F);
  for (let i = K; i < F - K; i++) {
    let aa = 0, bb = 0, ab = 0, n = 0;
    for (let x = 0; x < K; x += 2) {
      for (let y = 0; y < K; y += 2) {
        aa += dot(frames[i - 1 - x], frames[i - 1 - y]);
        bb += dot(frames[i + x], frames[i + y]);
        ab += dot(frames[i - 1 - x], frames[i + y]);
        n++;
      }
    }
    nov[i] = (aa + bb - 2 * ab) / (4 * n);
  }
  return nov;
}

/** Dominant upprepningsperiod (s) — sanity-mått och bra att visa ägaren. */
function dominantPeriod(frames) {
  const F = frames.length;
  const DIAG = Math.round(4 * FPS);
  // HALVA materialet: längre fördröjningar har för lite överlappning kvar och blir brus.
  const maxLag = Math.min(Math.floor(F / 2), Math.round(180 * FPS));
  let best = 0, bestL = 0;
  const scores = new Float32Array(maxLag);
  for (let L = Math.round(8 * FPS); L < maxLag; L++) {
    let acc = 0, n = 0;
    for (let i = 0; i + L + DIAG < F; i += 2) {
      let d = 0;
      for (let k = 0; k < DIAG; k += 2) d += dot(frames[i + k], frames[i + L + k]);
      acc += d / Math.ceil(DIAG / 2); n++;
    }
    scores[L] = n ? acc / n : 0;
    if (scores[L] > best) { best = scores[L]; bestL = L; }
  }
  const sorted = Array.from(scores.slice(Math.round(8 * FPS))).sort((a, b) => a - b);
  const med = sorted[sorted.length >> 1] || 0;
  const spread = (sorted[Math.floor(sorted.length * 0.84)] - med) || 1e-6;
  return { periodS: bestL / FPS, strength: (best - med) / spread };
}

/** Gränser ur novelty: topp-plockning med minsta sektionslängd. */
function boundaries(nov) {
  const F = nov.length;
  const minGap = Math.round(MIN_SEG_S * FPS);
  let mean = 0, n = 0;
  for (let i = 0; i < F; i++) if (nov[i] > 0) { mean += nov[i]; n++; }
  mean = n ? mean / n : 0;
  let sd = 0;
  for (let i = 0; i < F; i++) if (nov[i] > 0) sd += (nov[i] - mean) ** 2;
  sd = Math.sqrt(sd / Math.max(1, n)) || 1e-6;

  const cand = [];
  for (let i = 1; i < F - 1; i++) {
    if (nov[i] > nov[i - 1] && nov[i] >= nov[i + 1] && (nov[i] - mean) / sd > 1.0) {
      cand.push({ i, z: (nov[i] - mean) / sd });
    }
  }
  cand.sort((a, b) => b.z - a.z);
  const picked = [];
  for (const c of cand) {
    if (picked.every((p) => Math.abs(p - c.i) >= minGap)) picked.push(c.i);
  }
  picked.sort((a, b) => a - b);
  return picked;
}

/** Greedy klustring: ge varje sektion en identitet (0,1,2 …). */
function labelSegments(frames, bounds) {
  const edges = [0, ...bounds, frames.length];
  const segs = [];
  for (let s = 0; s < edges.length - 1; s++) {
    const a = edges[s], b = edges[s + 1];
    if (b - a < Math.round(MIN_SEG_S * FPS)) continue;
    // DIMENSIONEN TAS UR DATAN. Var 12 hardkodat har, vilket gav NaN sa fort
    // funktionen matades med klangvektorer (8 element) i stallet for kroma (12):
    // platserna 8-11 lastes som undefined och forgiftade hela profilen.
    const D = frames[0].length;
    const prof = new Float32Array(D);
    for (let i = a; i < b; i++) for (let q = 0; q < D; q++) prof[q] += frames[i][q];
    let ss = 0;
    for (let q = 0; q < D; q++) ss += prof[q] * prof[q];
    const nn = Math.sqrt(ss) || 1;
    for (let q = 0; q < D; q++) prof[q] /= nn;
    segs.push({ t: Math.round((a / FPS) * 1000), prof, label: -1 });
  }
  // ADAPTIV TROSKEL: lagg den i det STORSTA gapet i latens egen fordelning av
  // parvisa likheter. Samma princip som engangskollen — trosklar sätts i ett
  // uppmatt gap, aldrig pa en gissad konstant.
  const pairs = [];
  for (let a = 0; a < segs.length; a++) {
    for (let b = a + 1; b < segs.length; b++) pairs.push(dot(segs[a].prof, segs[b].prof));
  }
  pairs.sort((x, y) => x - y);
  let gap = 0, thr = (T_MIN + T_MAX) / 2;
  for (let i = 1; i < pairs.length; i++) {
    if (pairs[i] - pairs[i - 1] > gap) { gap = pairs[i] - pairs[i - 1]; thr = (pairs[i] + pairs[i - 1]) / 2; }
  }
  thr = Math.max(T_MIN, Math.min(T_MAX, thr));

  // KOMPLETT LANKNING, inte glidande centroid. Ett centroid som uppdateras for
  // varje ny medlem DRIVER, och da kedjas sektioner ihop steg for steg tills
  // allt hamnar i samma klump — precis vad som hande: sex sektioner, alla "A".
  // Har kravs likhet mot ALLA medlemmar i klustret.
  const clusters = [];
  for (const sg of segs) {
    let bestI = -1, bestMin = -2;
    for (let c = 0; c < clusters.length; c++) {
      let mn = 2;
      for (const m of clusters[c]) mn = Math.min(mn, dot(sg.prof, m.prof));
      if (mn > bestMin) { bestMin = mn; bestI = c; }
    }
    if (bestI >= 0 && bestMin >= thr) { sg.label = bestI; clusters[bestI].push(sg); }
    else { sg.label = clusters.length; clusters.push([sg]); }
  }
  // Parvis likhet mellan sektionsprofiler följer med ut. Den är diagnostik, inte
  // pynt: den visar OM sektionerna alls går att skilja åt, eller om tröskeln bara
  // flyttar runt en gräns i en enda klump. Tröskeln ska sättas i ett uppmätt gap.
  const sim = [];
  for (let a = 0; a < segs.length; a++) {
    const row = [];
    for (let b = 0; b < segs.length; b++) row.push(+dot(segs[a].prof, segs[b].prof).toFixed(3));
    sim.push(row);
  }
  return { parts: segs.map((s) => ({ t: s.t, label: s.label })), sim, threshold: +thr.toFixed(3) };
}

self.onmessage = async (ev) => {
  const { songId, buf } = ev.data;
  const post = (m) => self.postMessage(Object.assign({ songId }, m));
  try {
    const { rate, samples } = parseWav(buf);
    const durS = samples.length / rate;
    post({ type: "progress", phase: "features", pct: 0 });
    const { chroma, timbre } = features(samples, rate, (p) => post({ type: "progress", phase: "features", pct: p }));
    if (chroma.length < MIN_SEG_S * FPS * 3) throw new Error(`för kort (${durS.toFixed(0)} s)`);

    post({ type: "progress", phase: "struktur", pct: 0 });
    // Perioden mäts på KROMA: en upprepad sektion har samma harmonik, och
    // klangfärgen varierar mer inom en sektion än harmoniken gör.
    const { periodS, strength } = dominantPeriod(chroma);
    post({ type: "progress", phase: "struktur", pct: 0.5 });
    // Kärnan skalas mot sektionslängden: hittade vi en period är en fjärdedel av
    // den en bra kärna, annars 12 s som fallback.
    const kernelS = periodS > 8 ? Math.max(6, Math.min(20, periodS / 4)) : 12;

    // Gränser tas på den SAMMANSLAGNA signalen — ett sektionsbyte kan höras
    // antingen som ett ackordbyte eller som byte av instrumentering.
    const fused = fuse(chroma, timbre, W_TIMBRE);
    const bounds = boundaries(novelty(fused, kernelS));

    // Identiteten klustras på samma sammanslagna profil. De två andra
    // likhetsmatriserna följer med som DIAGNOSTIK: de visar vilken av
    // signalerna som faktiskt skiljer sektionerna åt i just den här låten.
    const main = labelSegments(fused, bounds);
    const diagC = labelSegments(chroma, bounds);
    const diagT = labelSegments(timbre, bounds);

    post({
      type: "done",
      result: {
        v: 1, songId, durMs: Math.round(durS * 1000),
        periodS: +periodS.toFixed(2), periodStrength: +strength.toFixed(2),
        parts: main.parts, sim: main.sim,
        diag: { chroma: diagC.sim, timbre: diagT.sim },
      },
    });
  } catch (e) {
    post({ type: "error", message: (e && e.message) || String(e) });
  }
};
