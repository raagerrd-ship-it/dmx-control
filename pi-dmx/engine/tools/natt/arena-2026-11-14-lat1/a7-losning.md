# a7 – FÖRSTA VALET (klockan)

## IDÉN
Klockans första val efter en återställning (kallstart, tystnad, låtgräns) avgörs nu mellan SLÄKTINGAR av det befintliga vittnet
(upprepar sig mönstret 2 och 4 slag bort?) direkt, i stället för att första varvets gissning kröns och står kvar; och en låtgräns
som sägs MEDAN DET LÅTER kastar inte längre de senaste sekundernas bevis (de hör redan till nya låten – formvägen säger gränsen
tidigast 9 s efter skarven). Musikaliskt: tempogrammet frågar "ligger energin på slaget?" och det klarar 3:4-fantomen också (de
riktiga slagen landar på fyra jämna faser); "kommer mönstret tillbaka efter 2 och 4 slag?" klarar bara det riktiga tempot.

## DELAR (bara `analyserClock.ts`)
| del | vad | bär |
|---|---|---|
| A FÖRSTA VALET | `first` = från tgReset till första säkra låsningen (eller låtens minne). Då tiger vittnet inte i 10 s och kräver inte 5 varv: är ett syskon till varvets val TYDLIGT (>= PW_MIN, TG_HOLD x valets eget) och finns mönstret i fönstrets senare halva tar klockan syskonet direkt. Ingen säker låsning på ett varv där vittnet sa emot. | takt, lastid |
| C MJUK LÅTGRÄNS | `relock(soft)`: sägs gränsen medan det låter (quietMs = 0) behålls tempogrammets två korta minnen och vittnets ring; regent, långt minne, klasslås, röst och etta släpps som förr. Vid tystnad: allt som förr. | takt, utanfor (falsk/sen gräns) |
| B FINTEMPOTS BAND | fintempot får ligga högst 1,25 % (finsökningens halva bredd) från tempogrammets tempo, förr 3 % (TG_SNAP). | utanfor |

A utan C ger nästan inget efter en låtgräns (vittnets ring var tom i 5,3 s); C utan A lämnar 3:4-fantomen. B: det publicerade
tempot vandrade 137–143 kring sanna 139,88 (tempogrammet: 139,9); facit är kvantiserat (20 ms-steg -> 142,9), så vandringen föll
över 4 %-kanten slumpvis: A ensam gav +2,5 s vid låtbytet men −5,5 s sådant brus. Fasen mot facit-slagen blev inte sämre (inom
35 ms: 69,4 -> 72,7 % / 66,1 -> 66,8 %, `verktyg/jmf.mjs`).

## MASSPROV (fritt, `verktyg/omstart.mjs`): fyra låtbyten räcker inte som bevis
Konstgjorda låtgränser var 20:e s inne i låtarna (79 st; fel tempo de 15 s efteråt, summa): bas 129 s (syskon 72) -> a7 68 s
(syskon 26). Oberoende upprepning (61 andra tidpunkter): 107 -> 62 s. Kallstarter (79 st, 3–18 s efter): 132 -> 107 s.
Per del (79 gränser): utan vittnets ring 91, utan de korta minnena 83, utan B 74, bara A+B 121. Kvar: break och svaga partier
(80–88 i st f 130) – inte syskonfel.

## MARGINALER (ensam-prov, fel sekunder övningen; a7 = 58, bas = 64)
| gräns | −25 % | +25 % | massprovet (68 s) |
|---|---|---|---|
| vittnets golv i första valet (PW_MIN 0,5) | 58 | 60 | 68 / 68 |
| vittnets marginal (TG_HOLD 1,35) | 59 | 59 | 92 / 68 |
| senare halvans golv (0,5) | 58 | 58 | – / 69 |
| TG_FINE_MAX 0,0125 | 58 | 58 | – |

Domen på övningen står (58–60 mot 64). Svag punkt: marginalen nära 1,0 släpper igenom 2:3-syskonet i massprovet (raka kickar
upprepar sig på 3 och 6 slag också) – 1,35 behövs. Vid låtbytet 265 ligger vittnet precis över golvet (0,52): med 0,625 kommer
rätt tempo 2 s senare.

## SIFFRORNA
| mätning | poäng | takt | fel s | utanför | låstid | 160345 | 171840 | kostnad |
|---|---|---|---|---|---|---|---|---|
| bas | 93,06 | 92,6 | 64 | 95,2 | 7,1 | 93,3 %, 13/9 | 91,1 %, 2/5 | x1,00 |
| m1 (A+B) | 93,47 | 92,9 | 61 | 95,5 | 6,5 | 93,7 %, 11/9 | 91,2 %, 2/5 | (last på maskinen) |
| m2 (A+B+C, provbygge) | 93,88 | 93,3 | 58 | 96,1 | 6,5 | 94,3 %, 11/9 | 91,2 %, 2/5 | x1,00 |
| m3 (slutkoden, identiskt svar per hopp som m2) | 93,88 | 93,3 | 58 | 96,1 | 6,5 | 94,3 %, 11/9 | 91,2 %, 2/5 | x1,02 |

Låtgränser 3/4 och 1 falsk som bas (låtgränsdetektorn orörd), drop oförändrade. Vunnet: 275,7–277,7 (105 -> 140 efter
tystnadsgränsen, A) och 200,5–204 (84 -> 130 efter den falska gränsen, C). Sämre: enstaka halvsekunder där bas vandring råkade
ligga rätt (256,7; 409–413,6: fintempot lutar inte längre mot nästa låts tempo; 229,6–230 i 171840).
INTE löst: 171840 31,6–38,6 (97/108 i st f 146 i ett svagt intro – vittnet ligger på 0,5-strecket, allt annat pekar fel),
266–275 (ingen bevisning finns förrän takten kommer in vid 273), break (136–142) och uttoningen (256–265).

## RISKEN
- Två låtar i följd i syskonförhållande (135 -> 90) med gräns MITT i bytet: ringen rymmer förra låten och vittnet kan hålla den
  tills dess mönster är borta ur senare halvan (högst ~5 s). Formvägens 9 s gör det osannolikt; exakta gränser (lotus/Sonos)
  drabbas om låtarna går ihop utan tystnad.
- Tyst intro / tal mellan låtar: vittnet tiger (inget tydligt mönster) = som bas. Första valet kan vara länge (15 % av 160345):
  då dömer vittnet utan 5-varvskravet; på övningen ingrep det en enda gång (265), aldrig i de svaga introna.
- Tempobyte mitt i en låt / långa mixar utan gräns: orört (regenten och bevissumman som förr).
- 2:3-syskon och halvtempo: vittnet skiljer dem INTE på raka kickar (lika tydligt på båda) – där gäller tempogrammet som förr.
- B: en låt vars tempo glider snabbare än tempogrammet hinner med (> 1,25 % inom ~2 s) får fintempot hållet; fasen sätts ändå
  ur vikningen varje sökning.

## DIFFEN (`git diff --no-index src .arena/lat1/a7/src`)
```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/lat1/a7/src/ANALYSER_SHARED.md5
index dbe0948..269eaa5 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/lat1/a7/src/ANALYSER_SHARED.md5
@@ -10,5 +10,5 @@ e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
 dbb860c7483c4e7e938d610712337b96 analyserCharacter.ts
 a8846ca6595ddef8409a6ab432acf375 split.ts
 c7a59a6760df39770f3aca2332dac5c2 slowWorker.ts
-d0a49e4f782e81bdfdf8293eb0b45bf4 analyserClock.ts
+70ca75c98a6f856516fc29c8a1526017 analyserClock.ts
 d94c850c565827c9075e63127132213f recorder.ts
diff --git a/src/analyserClock.ts b/.arena/lat1/a7/src/analyserClock.ts
index cea56ed..0f65161 100644
--- a/src/analyserClock.ts
+++ b/.arena/lat1/a7/src/analyserClock.ts
@@ -38,6 +38,7 @@ const TG_BRK_DB = 24, TG_BRK_MAX_MS = 30000;   // BREAK OCH DROP ÄR SAMMA LÅT
 const HV_R = [4 / 3, 3 / 4, 3 / 2, 2 / 3, 5 / 4, 4 / 5], HV_K = 1.25, HV_N = 5, HV_AGE = 30, TG_OCT_LO = 79.6, TG_OCT_LO_N = 8;   // a3 TOPPRÖSTEN
 const PW_RING = 4096, PW_WIN_MS = 10000, PW_MIN = 0.5, PW_Q = [4 / 3, 3 / 4, 3 / 2, 2 / 3];   // TAKTENS SJÄLVLIKHET
 const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;
+const TG_FINE_MAX = 0.0125;   // FINTEMPOTS BAND
 
 /** FAS-PREDIKTIONSTILLIT. */
 export function publishPhase(f: { beatPhaseMs: number; beatPhaseConf: number; barShift: number }, b: ClockCfg["beat"], barKnown: boolean,
@@ -70,7 +71,7 @@ export class BeatFeed {
   private readonly tgAccF = new Float64Array(TG_K).fill(-1); private tgSw = 0; tgSwitches = 0;   // TVÅ MINNEN
   private readonly tgF = new Float64Array(TG_K); private readonly tgW = new Float64Array(TG_K); private readonly tgQ = new Float64Array(TG_K);   // HÅLLEN TOLKNING
   private brkAt = -1e12; private brkArm = false; private brkFrom = 0;   // BREAK-HÅLLET
-  private sure = false;   // LÅTENS MINNE
+  private sure = false; private first = true;   // LÅTENS MINNE
   private readonly tgD = new Float64Array(TG_K); private tgR = -1; private tgHl = 0; private tgLk = 0; private tgLkK = -1;
   private readonly tgAccL = new Float64Array(TG_K).fill(-1); private tgLN = 0;   // k4b (lånat av k2b)
   tempoBpm = 0;   // EN TEMPOSÖKNING
@@ -103,7 +104,7 @@ export class BeatFeed {
       this.onNext = now + ONSET_EVERY_MS;
       this.scanRef = beat.anchorMs; this.scanNow = now;
       const cb = this.scanFar > 0 ? this.scanFar : beat.bpm; this.scanFar = 0;
-      if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > TG_SNAP) { this.scanC0 = this.tempoBpm; this.scanStep = TG_FINE; this.scanEnd = 5; }
+      if (this.tempoBpm > 0 && Math.abs(cb / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanC0 = this.tempoBpm; this.scanStep = TG_FINE; this.scanEnd = 5; }
       else if (this.tempoBpm > 0) { this.scanC0 = cb; this.scanStep = 0.005; this.scanEnd = 5; }
       else { this.scanC0 = beat.bpm; this.scanStep = 0.005; this.scanEnd = 5; }
 
@@ -132,7 +133,7 @@ export class BeatFeed {
     }
     if (c < this.scanEnd || this.bestScore < ONSET_MIN_PEAK) return;
     if (this.tempoBpm > 0) this.bestBpm = Math.min(159.9, Math.max(80, this.bestBpm));
-    if (this.tempoBpm > 0 && Math.abs(this.bestBpm / this.tempoBpm - 1) > TG_SNAP) { this.scanFar = this.bestBpm; return; }
+    if (this.tempoBpm > 0 && Math.abs(this.bestBpm / this.tempoBpm - 1) > TG_FINE_MAX) { this.scanFar = this.bestBpm; return; }
     const oldMs = 60000 / beat.bpm, idx = Math.floor((now - beat.anchorMs) / oldMs), fr = (now - beat.anchorMs) / oldMs - idx;
     const nb = 60000 / this.bestBpm;
     beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
@@ -195,7 +196,7 @@ export class BeatFeed {
         Q.sort(); nc = Q[TG_K >> 1] + TG_NOISE;
       }
       const song = this.sure && this.tgLN * TG_LA >= 1;
-      if (song) { this.tgR = -1; this.tgLk = 0; this.tgLkK = -1; this.tgSw = 0; }
+      if (song) { this.tgR = -1; this.tgLk = 0; this.tgLkK = -1; this.tgSw = 0; this.first = false; }
       if (this.tgR >= 0 && any) {
         const r0 = this.tgR, e = Math.max(0, W[r0] - nc); let nk = r0, mx = 0;
         this.tgHl += TG_HL_A * (e - this.tgHl); D[r0] += e; mx = D[r0];
@@ -247,7 +248,7 @@ export class BeatFeed {
         const dl = Math.abs(bk - this.tgLkK), same = this.tgLkK >= 0 && Math.min(dl, TG_K - dl) <= 2;
         const e = any ? W[bk] - nc : 0;
         this.tgLk = same && e > 0 && this.tgN >= TG_FULL_N ? this.tgLk + 1 : 0; this.tgLkK = bk;
-        if (this.tgLk >= TG_LOCK_N) { this.tgR = bk; this.tgLk = 0; D.fill(0); this.tgHl = e; }
+        if (this.tgLk >= TG_LOCK_N) { this.tgR = bk; this.tgLk = 0; D.fill(0); this.tgHl = e; this.first = false; }
       }
       const a = A[(bk + TG_K - 1) % TG_K], c = A[(bk + 1) % TG_K], den = a - 2 * bv + c;
       const off = a >= 0 && c >= 0 && den < 0 ? Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / den)) : 0;
@@ -259,6 +260,7 @@ export class BeatFeed {
         if (this.octN === 1) this.octHi = this.octR >= TG_OCT_UP; else if (this.octHi ? this.octR < TG_OCT_DN : this.octR >= TG_OCT_UP) this.octHi = !this.octHi;
         t = this.octHi || this.octLoN >= TG_OCT_LO_N ? 2 * lo : lo; }
       { const r0 = this.tempoBpm, pc = Math.min(159.9, Math.max(80, this.peakVote(t, now))), pj = this.pwJudge(pc, now); this.tempoBpm = pj;
+        if (pj !== pc && this.first) this.tgLk = 0;
         if (pj !== pc && pj !== r0 && this.tgR >= 0) { this.tgR = ((Math.round(Math.log(pj / 80) / Math.log(TG_STEP)) % TG_K) + TG_K) % TG_K; this.tgD.fill(0); } }
       return;
     }
@@ -328,15 +330,21 @@ export class BeatFeed {
   }
   /** TAKTENS SJÄLVLIKHET. */
   private pwJudge(cand: number, now: number): number {
-    const reg = this.tempoBpm;
-    if (!(reg > 0)) { this.pwQuietAt = now + PW_WIN_MS; this.pwRun = 0; return cand; }
-    const moved = Math.abs(cand / reg - 1) > TG_SNAP, sib = moved && this.pwSib(cand, reg);
-    if (moved && !sib) { this.pwQuietAt = now + PW_WIN_MS; this.pwRun = 0; return cand; }
-    if (now < this.pwQuietAt) return cand;
+    const reg = this.tempoBpm, fc = this.first;
+    if (!(reg > 0)) { this.pwQuietAt = now + PW_WIN_MS; this.pwRun = 0; if (!fc) return cand; }
+    const moved = reg > 0 && Math.abs(cand / reg - 1) > TG_SNAP, sib = moved && this.pwSib(cand, reg);
+    if (moved && !sib) { this.pwQuietAt = now + PW_WIN_MS; this.pwRun = 0; if (!fc) return cand; }
+    if (!fc && now < this.pwQuietAt) return cand;
     const M = PW_RING - 1; let lo = 0, hi = this.pwN;
     while (lo < hi) { const m = (lo + hi) >> 1; if (now - this.pwT[(this.pwPos - 1 - m + 2 * PW_RING) & M] > PW_WIN_MS) hi = m; else lo = m + 1; }
     if (lo < 1000) return cand;
     this.pwWn = lo; this.pwDt = (this.pwT[(this.pwPos - 1 + PW_RING) & M] - this.pwT[(this.pwPos - lo + 2 * PW_RING) & M]) / (lo - 1); if (!(this.pwDt > 0)) return cand;
+    if (fc) {
+      const sC = this.pwSim(cand); let bs = 0, bb = 0;
+      for (let i = 0; i < PW_Q.length; i++) { let c = cand * PW_Q[i]; while (c >= 160) c /= 2; while (c < 80) c *= 2; const v = this.pwSim(c); if (v > bs) { bs = v; bb = c; } }
+      if (!(bs >= PW_MIN && bs > (sC > 0 ? sC * TG_HOLD : 0))) return cand;
+      this.pwWn = lo >> 1; return this.pwSim(bb) >= PW_MIN ? bb : cand;
+    }
     const sR = this.pwSim(reg);
     if (sib) {
       const sC = this.pwSim(cand);
@@ -354,7 +362,7 @@ export class BeatFeed {
     } else this.pwRun = 0;
     return cand;
   }
-  private tgReset(): void { this.pwN = 0; this.pwRun = 0; this.tgAcc.fill(-1); this.tgAccF.fill(-1); this.tgSw = 0; this.tgR = -1; this.brkArm = false; this.brkFrom = 0; this.tgLk = 0; this.tgLkK = -1; this.tgHl = 0; this.tgAccL.fill(-1); this.tgLN = 0; this.tgK = 0; this.tempoBpm = 0; this.octN = 0; this.hvRun = 0; this.hvAge = 0; this.hvVoted = false; this.hvKeep = 0; this.hvEver = false; }
+  private tgReset(soft = false): void { if (!soft) { this.pwN = 0; this.tgAcc.fill(-1); this.tgAccF.fill(-1); } this.pwRun = 0; this.tgSw = 0; this.tgR = -1; this.brkArm = false; this.brkFrom = 0; this.tgLk = 0; this.tgLkK = -1; this.tgHl = 0; this.tgAccL.fill(-1); this.tgLN = 0; this.tgK = 0; this.tempoBpm = 0; this.octN = 0; this.hvRun = 0; this.hvAge = 0; this.hvVoted = false; this.hvKeep = 0; this.hvEver = false; this.first = true; }
 
   /** Kom en tidigare kick. */
   private kickRepeats(t: number, lag: number, tol: number): boolean {
@@ -404,16 +412,16 @@ export class BeatFeed {
   }
 
   /** LÅTGRÄNSEN. */
-  private relock(): void {
+  private relock(soft: boolean): void {
     if (this.innerValid && this.innerBpm > 0) this.innerAnchor += this.barOff * (60000 / this.innerBpm);
-    this.tgReset(); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
+    this.tgReset(soft); this.barReset(); this.goodRep = 0; this.goodOn = 0; this.onNext = 0;
   }
 
   /** EN KÄLLA. */
   update(frame: Frame, cfg: EngineConfig, an: { resetTempo(): void; resetBar(): void; setClockGrid?(g: EngineConfig["beat"]): void; trackBoundaries?: number; quietMs?: number; boundSure?: boolean; bodyUnderDb?: number; setClock?(bpm: number, conf: number): void }, now = Date.now()): void {
     this.sure = !!an.boundSure; if ((an.bodyUnderDb ?? 0) >= TG_BRK_DB) this.brkAt = now;
     const nb = an.trackBoundaries ?? 0;
-    if (nb !== this.boundSeen) { this.boundSeen = nb; this.relock(); }
+    if (nb !== this.boundSeen) { this.boundSeen = nb; this.relock(!((an.quietMs ?? 0) > 0)); }
     if (cfg.beat && this.innerValid) { cfg.beat.anchorMs = this.innerAnchor; cfg.beat.bpm = this.innerBpm; }
     this.updateInner(frame, cfg, now, an.quietMs ?? 0);
     const b = cfg.beat;
```
