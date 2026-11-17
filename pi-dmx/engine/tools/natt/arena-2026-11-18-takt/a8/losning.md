# a8 - TVÅ KLOCKOR, EN KÄLLA

**IDÉN.** En tvillingklocka i en egen worker-tråd vikar högmittens anslag (virvel/clap/kickens klick) i ett eget slagrutnät med långt minne (8 s). Klockan behåller sin egen fas, men när tvillingen ihållande säger att klockan står på motslaget och dess röst är starkare än basvikningens, tar klockan andra halvslaget. Ut går fortfarande EN klocka. Halvslagsbyten var det största felet: motslag, glider och dubbelt var oftast vippor mellan 0 och 0,5 slag.

Underlag (fri analys på övningens egna features mot Beat This): basanslaget (klockans vikning) står fel i motslagsfönstren, men högmittens 8 s-ackumulator står rätt i 66-90 % av dem.

## DELARNA

| del | vad den gör | mått (m2) |
|---|---|---|
| `TwinClock` (analyserTwin.ts) | 48 fack av högmittens anslag, eget rutnät med eget ankare, decay 8 s, nollas vid tempobyte > 3 % | grunden |
| `twinPh` (analyserClock.ts, onsetStep) | halvslagsbyte när tvillingens topp ligger 0,5 ± 0,15 slag från klockans topp och log(topp/mot) är 0,3 större än basvikningens | motslag 6,3 -> 2,3 |
| hysteres `twRun`/`twOn` (0..6 steg à 250 ms) | byter efter 1,5 s, släpper efter 1,5 s, ingen vippa | dubbelt 151659 14 -> 6 %, glider 14,2 -> 9,1 |
| tvillingtråden (analyserTwinWorker.ts + split.ts + analyser.ts + slowWorker.ts) | läser taktvägens ring som andra läsare, publicerar i SAB (seqlock, ctrl-ord 12) | lika logik som i bänken |

## KOSTNADEN

Huvudtråden: ingenting nytt. Den nya worker-tråden: en addition per hopp plus 48 multiplikationer var 250 ms, vaknar var 20 ms. Klockans worker: ett fack-kopierande per bästa kandidat och 48 läsningar var 250 ms. I bänken och inline-läget körs tvillingen lokalt i BeatFeed. Nytt minne: cirka 1 kB plus en tråd (~3-5 MB V8-isolat). Faller tvillingtråden kör klockan som i dag (färskhetsgrind 1 s).

## SIFFRORNA (m2)

| fil | FEL bas -> a8 | motslag | glider | lead | etta bas -> a8 |
|---|---|---|---|---|---|
| 151659 | 32,7 -> 14,3 | 12,2 -> 2,0 | 10,2 -> 4,1 | -53 / -53 | 97,8 -> 97,7 |
| 160345 | 33,9 -> 26,8 | 3,6 -> 1,8 | 21,4 -> 14,3 | -60 / -60 | 90,4 -> **82,2** |
| 200719 | 23,0 -> 24,0 | 3,0 -> 3,0 | 11 -> 9 | -60 / **-67** | 68,9 -> 66,5 |

Medel: FEL 29,9 -> 21,7 (**+8,2**), oktav 10,4 -> 9,1. **DISK: etta 82,1 < 85,7 - 3.** Sämre blev ettan (främst 160345), feltempo (+0,6) och 200719 (+1).

m1 (en fusion av båda vikningarna, utan halvslagsgrind) blev FEL 46: tvillingens 5 s-vikning var för brusig och fasen hoppade. Det ledde till ackumulatorn och halvslagsgrinden.

**Varför ettan faller (inte provat, budgeten tog slut):** ett halvslagsbyte flyttar ankaret ±0,5 slag. `barCommit` räknar om `barJ` med `(tb - barPT)/per`, och avrundningen av ±0,5 går åt slumpmässigt håll, så ettan hoppar ett slag. Lagningen till jokern: välj det håll för bytet (+0,5 eller -0,5) som `barJ` redan rundar mot, eller lägg tillbaka halvslaget i `barJ` när `twOn` slår om.

## RISKEN

- Live-mic: högmitten är känslig för prat och publikljud i rummet. Grinden (starkare röst + 1,5 s) skyddar, men det är inte provat i ladan.
- Halvt tempo (88/176): virveln på 2 och 4 ligger på motorns motslag. Då byter tvillingen till BT:s andra slag. Takten blir rätt, men ettan blir fel (se ovan).
- Låtbyten och breaks: rutnätet nollas vid tempobyte > 3 %, minnet behöver 4 s.
- Musik utan trumma: utan högmittsanslag blir tvillingens kvot låg och den säger aldrig emot.
- Lead på 200719 flyttade 7 ms (ett kvantsteg). Spärren ligger vid 10 ms, så det kan slå över på okänd musik.
- `docs/analysator/analyserTwin.md`, som kodhuvudet pekar på, finns inte än. Den skrivs vid inläggning, med innehållet härifrån.

## DIFFEN

```diff
diff --git a/src/analyser.ts b/.arena/takt/a8/src/analyser.ts
index 5dcd901..76957c0 100644
--- a/src/analyser.ts
+++ b/.arena/takt/a8/src/analyser.ts
@@ -1017,7 +1017,7 @@ export function createAnalyser(cfg: AnalyserConfig, modeIn?: 'worker' | 'inline'
     const parts: Array<'all' | 'lane' | 'slow'> = ['all'];
     const workers: Array<{ postMessage: (m: unknown) => void }> = [];
     const start = (part: 'all' | 'lane' | 'slow', resumeSeq: number, why: string) => {
-      const data: WorkerData = { cfg: { ...cfg }, buffers, resumeSeq, sync, part };
+      const data: WorkerData = { cfg: { ...cfg }, buffers, resumeSeq, sync, part, twin: !sync && !!buffers.twin };
       const w = new Worker(new URL('./slowWorker.js', import.meta.url), { workerData: data });
       w.on('error', (e) => console.error('[analyser-split] worker FEL:', e?.message ?? e));
       w.on('exit', (code) => {
@@ -1044,6 +1044,11 @@ export function createAnalyser(cfg: AnalyserConfig, modeIn?: 'worker' | 'inline'
       for (const w of workers) w?.postMessage({ type: 'stop' });
     };
     for (const p of parts) start(p, 0, 'start');
+    if (!sync && buffers.twin) {   // TVÅ KLOCKOR: tvillingklockan i egen tråd
+      const tw = new Worker(new URL('./analyserTwinWorker.js', import.meta.url), { workerData: { cfg: null, buffers, resumeSeq: 0 } as WorkerData });
+      tw.on('error', (e) => console.error('[analyser-twin] FEL:', e?.message ?? e)); tw.unref(); workers.push(tw);
+      console.log('[analyser-twin] tvillingklockan i egen tråd startad');
+    }
   };
   if (sync) withWorker((process as unknown as { getBuiltinModule(id: string): typeof import('node:worker_threads') }).getBuiltinModule('node:worker_threads'));
   else import('node:worker_threads').then(withWorker).catch((e) => console.error('[analyser-split] kunde inte starta worker:', e?.message ?? e));
diff --git a/src/analyserClock.ts b/.arena/takt/a8/src/analyserClock.ts
index 0bbcb78..1357dea 100644
--- a/src/analyserClock.ts
+++ b/.arena/takt/a8/src/analyserClock.ts
@@ -1,5 +1,6 @@
 /** TAKTMATNINGEN (utbruten ur index.ts 2026-10-10, ordagrant): fasprediktionstilliten, den löpande takten (10-19, ersatte kick-PLL:en och fasfoljaren), taktfasen (ettan) och coasten som haller cfg.beat (ankare + bpm + konfi Anteckningar (kommentarerna som stod i koden): docs/analysator/analyserClock.md */
-import type { Frame } from "./analyser.js";   // ANALYSATORNS KLOCKA
+import type { Frame } from "./analyser.js";
+import { TwinClock, type TwinSource } from "./analyserTwin.js";   // ANALYSATORNS KLOCKA
 export const MIN_BEAT_CONFIDENCE = 0.20;   // Klockans grind
 export const SYNC_ERR_FRAC = 0.2, TRUST_TAU_MS = 81;   // TILLITEN TILL TAKTEN
 export function trustStep(prev: number, conf: number, beatErr: number, dtMs: number): number {
@@ -41,6 +42,7 @@ const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5,
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
 const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
+const TW_AGREE = 0.02, TW_FRESH_MS = 1000, TW_HALF = 0.15, TW_MARGIN = 0.3, TW_RUN = 6;   // TVÅ KLOCKOR, EN KÄLLA (a8)
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -101,6 +103,27 @@ export class BeatFeed {
 
   private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0;   // Sökningen sprids över hoppen
   private bestScore = 0; private bestBpm = 0; private bestPh = 0; private scanFar = 0;
+  twin: TwinSource = new TwinClock(); private twLocal = true; private pubAnchor = 0; private pubBpm = 0; twinUses = 0; private twRun = 0; private twOn = false;   // TVÅ KLOCKOR
+  private readonly bestFold = new Float64Array(ONSET_BINS);
+  /** Tvillingen i egen tråd (slowWorker). */
+  useTwin(src: TwinSource): void { this.twin = src; this.twLocal = false; }
+  /** Klockans fas, eller motsatt halvslag när tvillingen ihållande säger emot med starkare röst. */
+  private twinPh(nb: number, ref: number, now: number): number {
+    const tw = this.twin.view(), B = ONSET_BINS, H = tw?.hist, E = this.bestFold;
+    if (!tw || !H || now - tw.at > TW_FRESH_MS || Math.abs(tw.bpm / this.bestBpm - 1) > TW_AGREE) { this.twRun = 0; this.twOn = false; return this.bestPh; }
+    let ib = 0, sb = -1;
+    for (let b = 0; b < B; b++) { const v = H[(b + B - 1) % B] + H[b] + H[(b + 1) % B]; if (v > sb) { sb = v; ib = b; } }
+    const o = (ib + (B >> 1)) % B, so = H[(o + B - 1) % B] + H[o] + H[(o + 1) % B];
+    const ie = Math.floor(this.bestPh * B) % B, oe = (ie + (B >> 1)) % B;
+    const se = E[(ie + B - 1) % B] + E[ie] + E[(ie + 1) % B], seo = E[(oe + B - 1) % B] + E[oe] + E[(oe + 1) % B];
+    const tq = Math.log((sb + 1e-9) / (so + 1e-9)), eq = Math.log((se + 1e-9) / (seo + 1e-9));
+    let d = (ib + 0.5) / B + ((((tw.anchorMs - ref) % nb) + nb) % nb) / nb - this.bestPh; d -= Math.round(d);
+    if (Math.abs(Math.abs(d) - 0.5) > TW_HALF) return this.bestPh;
+    this.twRun = tq > eq + TW_MARGIN ? Math.min(TW_RUN, this.twRun + 1) : Math.max(0, this.twRun - 1);
+    if (this.twRun === TW_RUN) this.twOn = true; else if (this.twRun === 0) this.twOn = false;
+    if (!this.twOn) return this.bestPh;
+    this.twinUses++; const p = this.bestPh + 0.5; return p - Math.floor(p);
+  }
 
   /** LÖPANDE TAKT. */
   private onsetStep(cfg: EngineConfig, now: number): void {
@@ -135,6 +158,7 @@ export class BeatFeed {
         const a = this.foldMean(mb - 1), cc = this.foldMean(mb), d = this.foldMean(mb + 1), den = a - 2 * cc + d;
         const off = den < 0 ? 0.5 * (a - d) / den : 0;
         this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS;
+        for (let b = 0; b < ONSET_BINS; b++) this.bestFold[b] = this.foldN[b] ? this.foldS[b] / this.foldN[b] : 0;
       }
     }
     if (c < this.scanEnd || this.bestScore < ONSET_MIN_PEAK) return;
@@ -144,7 +168,7 @@ export class BeatFeed {
     const nb = 60000 / this.bestBpm;
     beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
     const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;
-    let err = this.bestPh - shift; err -= Math.round(err);
+    let err = this.twinPh(nb, ref, now) - shift; err -= Math.round(err);
     beat.anchorMs += err * nb;
     this.onsetFixes++;
   }
@@ -476,8 +500,8 @@ export class BeatFeed {
       this.innerAnchor = b.anchorMs; this.innerBpm = b.bpm; this.innerValid = true;
       const g = this.anaGrid; g.anchorMs = b.anchorMs + KICK_PHASE_MS; g.bpm = b.bpm; g.confidence = b.confidence ?? 0;
       an.setClockGrid?.(this.gridWeakSince === 0 ? g as EngineConfig["beat"] : null);
-      b.anchorMs += this.barOff * (60000 / b.bpm) - GRID_EARLY_MS - TG_GRID_EXTRA_MS;
-    } else { this.innerValid = false; an.setClockGrid?.(null); }
+      b.anchorMs += this.barOff * (60000 / b.bpm) - GRID_EARLY_MS - TG_GRID_EXTRA_MS; this.pubAnchor = b.anchorMs; this.pubBpm = b.bpm;
+    } else { this.innerValid = false; an.setClockGrid?.(null); this.pubBpm = 0; }
     frame.bpm = b ? b.bpm : 0; frame.bpmConfidence = b ? (b.confidence ?? 0) : 0;
     an.setClock?.(frame.bpm, frame.bpmConfidence);
     { const dt = this.trustAt > 0 ? now - this.trustAt : 0; this.trustAt = now; frame.beatTrust = this.trustSm = trustStep(this.trustSm, frame.bpmConfidence, cfg.beatErr ?? 0, dt > 250 ? 250 : dt); }
@@ -529,6 +553,7 @@ export class BeatFeed {
         this.onPos = (this.onPos + 1) % ONSET_RING; if (this.onN < ONSET_RING) this.onN++; }
       this.onPrev = ok; this.hiPrev = hi; this.onHalf = !this.onHalf;
       this.tgStep(now);
+      if (this.twLocal) { this.twin.push!(now, frame.onset?.highMid ?? 0); this.twin.step!(now, this.pubBpm, this.pubAnchor); }
       if (!cfg.beat && this.tempoBpm > 0) cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: this.tempoBpm, confidence: 0 };
       this.onsetStep(cfg, now);
     }
diff --git a/.arena/takt/a8/src/analyserTwin.ts b/.arena/takt/a8/src/analyserTwin.ts
new file mode 100644
index 0000000..71120af
--- /dev/null
+++ b/.arena/takt/a8/src/analyserTwin.ts
@@ -0,0 +1,52 @@
+/** TVILLINGKLOCKAN (a8 takt 11-17): en andra, oberoende fasskattning - högmittens anslag i ett eget slagrutnät med långt minne. Klockan (analyserClock) låter den avgöra halvslaget; en klocka ut. Anteckningar: docs/analysator/analyserTwin.md */
+import { C_TWIN_SEQ, stateWrite, StateReader, type SplitBuffers } from "./split.js";
+
+export const TW_BINS = 48;
+const TW_TAU_MS = 8000, TW_MIN_MS = 4000, TW_RESET = 0.03, TW_EVERY_MS = 250;
+export const TW_AT = 0, TW_BPM = 1, TW_ANCHOR = 2, TW_Q = 3, TW_H0 = 4, TW_LEN = TW_H0 + TW_BINS;
+
+/** Tvillingens rutnät: hist = högmittens anslag per fack (fack b = fasen (b + 0.5) / 48 efter anchorMs), bpm = rutnätets tempo. */
+export interface TwinView { at: number; bpm: number; anchorMs: number; q: number; hist: Float64Array }
+export interface TwinSource { view(): TwinView | null; push?(now: number, highMid: number): void; step?(now: number, bpm: number, anchorMs: number): void }
+
+export class TwinClock implements TwinSource {
+  private readonly H = new Float64Array(TW_BINS); private ref = 0; private per = 0; private next = 0; private last = 0; private age = 0;
+  readonly out: TwinView = { at: 0, bpm: 0, anchorMs: 0, q: 0, hist: new Float64Array(TW_BINS) };
+  steps = 0;
+  push(now: number, highMid: number): void {
+    if (!(this.per > 0) || !(highMid > 0)) return;
+    const x = ((now - this.ref) / this.per) % 1;
+    this.H[Math.floor((x < 0 ? x + 1 : x) * TW_BINS) % TW_BINS] += highMid;
+  }
+  step(now: number, bpm: number, anchorMs: number): void {
+    if (now < this.next) return;
+    const dt = this.last > 0 ? now - this.last : 0; this.next = now + TW_EVERY_MS; this.last = now;
+    if (!(bpm > 40)) { this.per = 0; this.out.at = 0; return; }
+    const per = 60000 / bpm;
+    if (!(this.per > 0) || Math.abs(per / this.per - 1) > TW_RESET) { this.H.fill(0); this.ref = anchorMs; this.per = per; this.age = 0; this.out.at = 0; return; }
+    this.ref += Math.round((now - this.ref) / this.per) * this.per; this.per = per;
+    const k = Math.exp(-dt / TW_TAU_MS); for (let b = 0; b < TW_BINS; b++) this.H[b] *= k;
+    this.age += dt;
+    if (this.age < TW_MIN_MS) { this.out.at = 0; return; }
+    this.out.at = now; this.out.bpm = bpm; this.out.anchorMs = this.ref; this.out.hist.set(this.H); this.steps++;
+  }
+  view(): TwinView | null { return this.out.at > 0 ? this.out : null; }
+}
+
+/** Publicera tvillingen i delat minne (tvillingtråden). */
+export function twinWrite(ctrl: Int32Array, st: Float64Array, o: TwinView): void {
+  stateWrite(ctrl, st, (s) => { s[TW_AT] = o.at; s[TW_BPM] = o.bpm; s[TW_ANCHOR] = o.anchorMs; s[TW_Q] = o.q; for (let b = 0; b < TW_BINS; b++) s[TW_H0 + b] = o.hist[b]; }, C_TWIN_SEQ);
+}
+
+/** Läs tvillingen ur delat minne (klockans tråd). */
+export class TwinShared implements TwinSource {
+  private readonly ctrl: Int32Array; private readonly st: Float64Array; private readonly s = new Float64Array(TW_LEN); private readonly sr = new StateReader();
+  private readonly o: TwinView = { at: 0, bpm: 0, anchorMs: 0, q: 0, hist: new Float64Array(TW_BINS) };
+  constructor(b: SplitBuffers) { this.ctrl = new Int32Array(b.ctrl); this.st = new Float64Array(b.twin!); }
+  view(): TwinView | null {
+    if (!this.sr.read(this.ctrl, this.st, this.s, C_TWIN_SEQ)) return null;
+    const s = this.s, o = this.o; if (!(s[TW_AT] > 0)) return null;
+    o.at = s[TW_AT]; o.bpm = s[TW_BPM]; o.anchorMs = s[TW_ANCHOR]; o.q = s[TW_Q]; for (let b = 0; b < TW_BINS; b++) o.hist[b] = s[TW_H0 + b];
+    return o;
+  }
+}
diff --git a/.arena/takt/a8/src/analyserTwinWorker.ts b/.arena/takt/a8/src/analyserTwinWorker.ts
new file mode 100644
index 0000000..35d83d8
--- /dev/null
+++ b/.arena/takt/a8/src/analyserTwinWorker.ts
@@ -0,0 +1,23 @@
+/** TVILLINGTRÅDEN (a8 takt): läser taktvägens ring som andra läsare, kör TwinClock, publicerar i delat minne. Anteckningar: docs/analysator/analyserTwin.md */
+import { workerData, parentPort, receiveMessageOnPort } from 'node:worker_threads';
+import { TwinClock, twinWrite } from './analyserTwin.js';
+import { C_HOP_WRITE, C_FEED_SEQ, HOP_RING_N, HOP_REC_LEN, H_SEQ, H_NOW, H_ON_HIMID, FEED_STATE_LEN, FS_BEAT, FS_ANCHOR, FS_BPM, RING_MARGIN,
+  StateReader, seqDelta, type WorkerData, type WorkerMsg } from './split.js';
+
+const { buffers } = workerData as WorkerData;
+const ctrl = new Int32Array(buffers.ctrl), ring = new Float64Array(buffers.hop!), fst = new Float64Array(buffers.hopState!), tst = new Float64Array(buffers.twin!);
+const fs = new Float64Array(FEED_STATE_LEN), fr = new StateReader(), tw = new TwinClock();
+const C_IDLE = 13, POLL_MS = 20, PUB_MS = 250;
+let seq = Atomics.load(ctrl, C_HOP_WRITE), stop = false, pubAt = 0;
+while (!stop) {
+  const w = seq + seqDelta(Atomics.load(ctrl, C_HOP_WRITE), seq);
+  if (w - seq > HOP_RING_N - RING_MARGIN) seq = w - (HOP_RING_N - RING_MARGIN);
+  let now = 0;
+  while (seq < w) { const s = ++seq, o = (s % HOP_RING_N) * HOP_REC_LEN; if (ring[o + H_SEQ] !== s) continue; now = ring[o + H_NOW]; tw.push(now, ring[o + H_ON_HIMID]); }
+  if (now > 0 && fr.read(ctrl, fst, fs, C_FEED_SEQ)) {
+    tw.step(now, fs[FS_BEAT] === 1 ? fs[FS_BPM] : 0, fs[FS_ANCHOR]);
+    if (now - pubAt >= PUB_MS) { pubAt = now; twinWrite(ctrl, tst, tw.out); }
+  }
+  if (parentPort) for (let m = receiveMessageOnPort(parentPort); m; m = receiveMessageOnPort(parentPort)) if ((m.message as WorkerMsg)?.type === 'stop') stop = true;
+  Atomics.wait(ctrl, C_IDLE, 0, POLL_MS);
+}
diff --git a/src/slowWorker.ts b/.arena/takt/a8/src/slowWorker.ts
index 7fcc165..456c747 100644
--- a/src/slowWorker.ts
+++ b/.arena/takt/a8/src/slowWorker.ts
@@ -1,16 +1,19 @@
 /** Den LANGSAMMA analysatortraden (se split.ts). Anteckningar (kommentarerna som stod i koden): docs/analysator/slowWorker.md */
 import { workerData, parentPort, receiveMessageOnPort } from 'node:worker_threads';
 import { Analyser, hopFeedFactory, type AnalyserConfig } from './analyser.js';
-import { PROFILE } from './analyserProfile.js';
+import { PROFILE } from './analyserProfile.js';
+import { TwinShared, type TwinSource } from './analyserTwin.js';
 import { C_WRITE, C_WAITING, C_WAITING_B, C_WAKE, C_HOP_WRITE, seqLow, HopLaneSlow, type HopFeed, type WorkerData, type WorkerMsg } from './split.js';
 
-const { cfg, buffers, resumeSeq, sync, part = 'all' } = workerData as WorkerData & { cfg: AnalyserConfig };   // TVÅ TRÅDAR
+const { cfg, buffers, resumeSeq, sync, part = 'all', twin } = workerData as WorkerData & { cfg: AnalyserConfig };   // TVÅ TRÅDAR
 const ctrl = new Int32Array(buffers.ctrl);
 const an = part === 'lane' ? null : new Analyser(cfg, { role: 'slow', split: buffers, resumeSeq, sync });
 const wantLane = !!buffers.hop && part !== 'slow';
 const feedMk = hopFeedFactory();   // analysatorns klocka
 if (wantLane && !feedMk) throw new Error('analyser-split: taktvagen utan klocka i profilen (BEAT_FEED)');
-const lane = wantLane && feedMk ? new HopLaneSlow(buffers, feedMk(), sync === true) : null;
+const feed = wantLane && feedMk ? feedMk() : null;
+if (feed && twin && buffers.twin) (feed as HopFeed & { useTwin?(s: TwinSource): void }).useTwin?.(new TwinShared(buffers));   // tvillingen i egen tråd
+const lane = feed ? new HopLaneSlow(buffers, feed, sync === true) : null;
 if (lane && an) an.bigYield = () => { lane.drain(); };   // en tråd
 const TEST_CRASH = process.env[PROFILE.envPrefix + 'SPLIT_TEST_CRASH'] === '1';
 let stop = false;
diff --git a/src/split.ts b/.arena/takt/a8/src/split.ts
index 3997f13..520a9e5 100644
--- a/src/split.ts
+++ b/.arena/takt/a8/src/split.ts
@@ -39,7 +39,9 @@ export function lostFlags(before: number, after: number, ownFlags: number): numb
 export const C_WRITE = 0;   // Kontrollord
 export const C_READ = 1;   // antal lästa records
 export const C_STATE_SEQ = 2;   // seqlock för tillståndsblocket
-export const C_WAITING = 3;   // 1 = workern ligger i Atomics.wait
+export const C_WAITING = 3;
+export const C_TWIN_SEQ = 12, TWIN_STATE_LEN = 52;   // tvillingklockan (analyserTwin.ts)
+   // 1 = workern ligger i Atomics.wait
 
 /** SEQ-WRAP. */
 export function seqLow(seq: number): number { return seq | 0; }
@@ -56,13 +58,13 @@ export const SECTIONS = ['', 'intro', 'low', 'build', 'high', 'break'];
 export function sectionCode(s: string): number { const i = SECTIONS.indexOf(s); return i < 0 ? 0 : i; }
 
 export interface SplitBuffers { ctrl: SharedArrayBuffer; ring: SharedArrayBuffer; state: SharedArrayBuffer; hop?: SharedArrayBuffer; hopState?: SharedArrayBuffer ;   // taktvägen
-  big?: SharedArrayBuffer; bigPcm?: SharedArrayBuffer; bigState?: SharedArrayBuffer; spec?: SharedArrayBuffer  }   // stora vägen
+  big?: SharedArrayBuffer; bigPcm?: SharedArrayBuffer; bigState?: SharedArrayBuffer; spec?: SharedArrayBuffer; twin?: SharedArrayBuffer  }   // stora vägen
 
 /** Meddelanden main ↔ worker. */
 export type WorkerMsg = { type: 'stop' } | { type: 'crash' };
 /** cfg ar en KOPIA. */
 export interface WorkerData { cfg: unknown; buffers: SplitBuffers; resumeSeq: number ; sync?: boolean ;   // senast lästa record
-  part?: 'all' | 'lane' | 'slow'  }   // två trådar med stora vägen
+  part?: 'all' | 'lane' | 'slow'; twin?: boolean  }   // två trådar med stora vägen
 
 export function createSplitBuffers(hopLane = false): SplitBuffers {
   const b: SplitBuffers = {
@@ -70,7 +72,7 @@ export function createSplitBuffers(hopLane = false): SplitBuffers {
     ring: new SharedArrayBuffer(RING_N * REC_LEN * 8),
     state: new SharedArrayBuffer(STATE_LEN * 8),
   };
-  if (hopLane) { b.hop = new SharedArrayBuffer(HOP_RING_N * HOP_REC_LEN * 8); b.hopState = new SharedArrayBuffer(FEED_STATE_LEN * 8); }
+  if (hopLane) { b.hop = new SharedArrayBuffer(HOP_RING_N * HOP_REC_LEN * 8); b.hopState = new SharedArrayBuffer(FEED_STATE_LEN * 8); b.twin = new SharedArrayBuffer(TWIN_STATE_LEN * 8); }
   b.big = new SharedArrayBuffer(BIG_RING_N * BIG_REC_LEN * 8); b.bigPcm = new SharedArrayBuffer(BIG_RING_N * BIG_HOP_MAX * 4);
   b.bigState = new SharedArrayBuffer(BIG_STATE_LEN * 8); b.spec = new SharedArrayBuffer(SPEC_SLOTS * SPEC_MAX * 4);
   return b;
```
