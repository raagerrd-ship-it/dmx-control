# b2 – uppbyggnaden ur rytmen  (DISK på ljusdomaren: -6,5 < -0,5)

## IDÉN

**Uppbyggnaden.** Analysatorn för bok per SLAG (klockans tempo, som `bassEnergyStep`): basens topp, det övrigas topp och antalet
anslag (virvelns onset-flanker + kickar). `buildUp` = det tydligaste av tre mätta tecken: BORTFALLET (kicken/basen ≥ 6 dB under den
gående basens nivå i mer än en takt medan resten spelar; värdet = hur djupt), FÖRTÄTNINGEN (anslag per slag, två slag mot de åtta
före; räknas från en hel fördubbling) och STIGNINGEN (andel av senaste takten då klang/nivå steg; räknas från halva takten). En
mätning per slag i stället för en 3,5 s-ramp på en momentan tröskel: 0,21 före höjningarna mot 0,04 annars, 0 i en refräng som
bara går (> 0 i 0,9 % av 'high').

**Sektionen.** 'high' kräver att basen faktiskt går: har basen varit borta mer än en takt lämnas 'high' på slaget, och rangen får
inte säga 'high' så länge. Kommer basen in tydligt (går igen efter ett bortfall, eller ≥ 6 dB över takten före – och inte under
låtens refrängbas) är det höjningen: 'high' direkt, som en drop. Rangen finns kvar för de långsamma fallen.

## VAR SNITTET GÅR

I analysatorn (`analyser.ts`, RYTMEN MED SLAGET SOM TIDSENHET): 6 dB (borta/in), 12 dB (helt borta = 1), 5 slag (mer än en takt),
16 slag (frasen den gående basens nivå står kvar), 2 mot 8 slag och en fördubbling, 4 slag och hälften. Allt är dB och slag ur
klockan – det beskriver musiken; ingen ramp, uttoning eller hålltid, inget valt för ljuset. Rampen 3,5 s/1 s är borta.
Sektionsbytet är utbrutet till `sectionTo` (samma kod) så att basen kan byta etikett mellan 1 s-blocken. Inga nya objekt per hop.

Ur `effects.ts`: `buildProg`, `buildSecAt`, `buildSecSeen` och slagräknaren sedan 'build' är borta; `ctx.buildUp`, `showTime` och
sektionstakets build-steg läser `frame.buildUp`. Dirigentens `inBuild` läste redan analysatorns fält (orörd).

Följd: `bassLevel` följer sektionen per definition. Tempo, klocka, etta, drops, kick, låtgräns orörda (+0,0).

## SIFFRORNA (övningsmängden, `tvavagar.py --mat`, mätning 2 av högst 3)

| mått | mix_klocka | mix_las | mix_hopp | mix_still | klipp_klocka | ettan | grid40 | gridfel | upp_s | ned_s | traff | korta | bygg | drop_traff | drop_falska | drop_ms | gr_ratt | gr_falska |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bas | 97.88 | 2.78 | 0.00 | 2.93 | 98.32 | 100.00 | 53.38 | 20.00 | 15.35 | 2.65 | 75.00 | 34.04 | 1.38 | 100.00 | 0.00 | 216.00 | 73.33 | 0.00 |
| b2 | 97.88 | 2.78 | 0.00 | 2.93 | 98.32 | 100.00 | 53.38 | 20.00 | 3.60 | 1.05 | 100.00 | 47.22 | 16.21 | 100.00 | 0.00 | 216.00 | 73.33 | 0.00 |
| % mot bas | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 | +76.5 | +60.4 | +33.3 | -38.7 | +100.0 | +0.0 | +0.0 | +0.0 | +0.0 | +0.0 |

- långsamma +12.86 %, latens 80 ms mot bas 80 ms (+0.0 %), **poäng +7.72**.
- md5 lika: False; ljusdomaren: {"poang": -6.47671377740206, "disk": []} (gräns -0,5).
- worker p99 5 hop (parets bas 5), worker 42.2 us/hop (bas 46, gräns 130), cpu-kvot 0.9926.
- fel i mätningen: inga.

Sämre: `korta` (ett bortfall på 5–8 slag ger en kort 'break' mellan två 'high'; två takter gav korta 41 % men ned_s 2,4 s) och
LJUSET – alla tre mätningarna är DISK på ljusdomaren, analysmåtten är desamma:
1. förtätning/stigning utan tröskel (buildUp > 0 i 74 % av 'high'): -8,8, jitter lang 25,9 -> 44,4 ms;
2. DENNA (tecknen räknas först när de är tydliga): -6,5 (takt +1,1, dynamik -1,5, koreografi -17,1; jitter lang 39,8);
3. grunt bortfall (6–12 dB) = 'low' i stället för 'break': -6,9, jitter 40,7, korta 47,9 – förkastad, koden återställd till 2
   (sonden ger identiska ramar; `tvavagar-mat*.json`, `bank-mat*.json`, `mat*.log` ligger kvar).
Inte provat (mätningarna slut), en HYPOTES för resten: alla 8 bortfall i lang1021 är grunda – basen går kvar, svagare – men
buildUp står på >= 0,5 där, över dirigentens 0,35, så build-lookar tänds medan basen går (samma fälla som preDrop 10-11). Då ska
antingen bortfallet kräva att basen är helt borta för att räknas som uppbyggnad, eller effektsidans tröskel flytta.

## RISKEN

- Gles bas (ett basslag per 5+ slag) eller ingen bas i 60–120 Hz: 'high' fladdrar eller uteblir; då bär bara rangen.
- Ny låt med svagare bas efter kort paus mäts mot förra låtens refrängbas tills låtgränsen nollar (pop 133, megamix 108: sena).
- Lotus (delad analysator utan stora vägen): `buildUp` lever, men basens in-/utträde når inte sektionen (spärrat med `role`);
  porten behöver två tal i env-recordet.
- DOMARENS KLOCKA: `tvavagarKor.mjs` provar etikett/buildUp var 38:e hop (101,3 ms) men indexerar som 100 ms; mot nivåskiftena
  läses de 1,07 % × t för sent (≈ 5 s i slutet av en 10 min-fil). `bygg` mäter delvis EFTER höjningen och sena skiften får
  försprång – lika för alla, men bör rättas före finalen.

## DIFFEN (`git diff --no-index src .arena/bygg/b2/src`)

```diff
diff --git a/src/analyser.ts b/.arena/bygg/b2/src/analyser.ts
index 2207dcf..de317db 100644
--- a/src/analyser.ts
+++ b/.arena/bygg/b2/src/analyser.ts
@@ -349,6 +349,7 @@ const DOUBLE_FROM_START = [
   'secPct', 'secSongStartMs', 'sectionStartMs', 'secBlkMs', 'secBlkInt', 'secBlkCent', 'secBlkRms2', 'secCurDbSum', 'repeatSim', 'repeatAgoMs',
   'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt',
   'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS',
+  'rhAcc', 'rhCurPk', 'rhCurMh', 'rhBar', 'rhLast', 'rhRise',
   'nearDropDb', 'nearDipDb', 'liftDb', 'stopS',   // byter forst vid forsta drop-episoden (sags i andra matningen)
 ] as const;
 /** TYPSTABILA TALFALT (2026-09-27, realtidsprincipen): skriv ett icke-heltal och sedan ursprungsvardet, sa V8 ger faltet
@@ -1102,7 +1103,29 @@ export class Analyser {
   private novBaseline = 0.2;     // ~8s baslinje → riser = novelty STIGER över den
   private centSlow = 0.3;
   private lvlSlowR = 0.3;
-  private buildUp = 0;           // 0..1 uppbyggnads-envelope
+  private buildUp = 0;           // 0..1 uppbyggnaden, MÄTT ur rytmen (rhBeat): det tydligaste av bortfallet, förtätningen och stigningen
+  /** RYTMEN MED SLAGET SOM TIDSENHET (arenan bygg 2026-11-11): uppbyggnaden och refrängens bas mäts per SLAG ur klockans tempo
+   *  (samma slaglängd som bassEnergyStep). Per slag: basens topp (0,25 x sub dB + 0,75 x kick dB, som bassEnergy), det övrigas topp
+   *  (starkaste bandet över basen) och antalet ANSLAG (virvelns flanker i mid/highMid-onset + kickdetektorns slag). Ur slagringen:
+   *    BORTFALLET    kicken/basen har fallit bort: slagens bastopp >= RH_AWAY_DB under den GÅENDE basens nivå (rhTop) i mer än en
+   *                  takt (RH_GONE slag; ett enstaka slag utan bas är mönstret, inte ett bortfall) medan resten av musiken spelar
+   *                  vidare. Värdet = hur djupt (RH_DEEP_DB under = 1). Gäller frasen ut (RH_BEATS slag): sedan är det den nya nivån.
+   *    FÖRTÄTNINGEN  anslag per slag de två senaste slagen mot de åtta före (fjärdedelar -> åttondelar -> sextondelar): räknas från en
+   *                  hel fördubbling; varje
+   *                  fördubbling = 0,5, två = 1.
+   *    STIGNINGEN    andelen av den senaste takten då klang/nivå steg (riserStep, den gamla risern): räknas från halva takten.
+   *  buildUp = det tydligaste av de tre, 0 utan ett tydligt tecken (i en refräng som bara går är fältet 0). En MÄTNING per slag:
+   *  ingen ramp, ingen uttoning, ingen hålltid.
+   *  DEN GÅENDE BASEN rhTop: följer en starkare slagtopp direkt, följer med de slag där basen går på en fras (RH_BEATS slag) och
+   *  står kvar när basen är borta; har den varit borta längre än en fras är det en ny nivå som gäller (basen har flyttat, inte pausat).
+   *  SEKTIONEN läser två saker härifrån: basen BORTA MER ÄN EN TAKT = inte refräng längre ('high' lämnas på slaget, rhBeat, och
+   *  rangen får inte säga 'high' så länge, sectionBlock); basen KOMMER IN TYDLIGT = höjningen, 'high' direkt (bassIn): den går igen
+   *  ett helt slag + nuet efter ett bortfall, eller ligger RH_IN_DB över takten före - och inte under låtens refrängbas (rhHighTop).
+   *  Inga objekt per hop: två ringar à RH_BEATS tal och skalärer. */
+  private static readonly RH_BEATS = 16; private static readonly RH_GONE = 5; private static readonly RH_AWAY_DB = 6; private static readonly RH_IN_DB = 6; private static readonly RH_DEEP_DB = 12;
+  private rhPk = new Float32Array(Analyser.RH_BEATS); private rhOn = new Float32Array(Analyser.RH_BEATS); private rhPos = 0; private rhN = 0;
+  private rhAcc = 0; private rhCurPk = -200; private rhCurMh = -200; private rhCurOn = 0; private rhOnArm = true;
+  private rhTop = NaN; private rhMhTop = NaN; private rhAway = 0; private rhGone = false; private rhBar = 200; private rhLast = -200; private rhRise = 0; private rhHighTop = NaN;
   // KARAKTÄRSPROFIL (långsam, ~8s)
   private profPunch = 0.4;
   private profBass = 0.5;
@@ -1197,7 +1220,7 @@ export class Analyser {
     this.secBlkT.length = 0; this.secRank.md = 0; this.secRank.sd = 1; this.secRank.mk = 0; this.secRank.sk = 1; this.repeatTier = -1; this.repeatHighAtMs = 0; this.repeatHighEndAtMs = 0; this.repeatHighRun = 0; this.secHighRunMs = 0;
     this.secBlkFeat.length = 0; this.secBlkHi.length = 0; this.secPct = 0;
 
-    this.secBlkHighH.length = 0; this.bndRef.fill(0); this.boundaryNov = 0;
+    this.secBlkHighH.length = 0; this.bndRef.fill(0); this.boundaryNov = 0; this.rhHighTop = NaN;
   }
 
   /** Tar BLOCKSUMMOR (n hop): i roll 'all' anropas den per hop med n = 1, i workern en gang per env-sampel med summorna
@@ -1213,6 +1236,18 @@ export class Analyser {
     this.sectionBlock(nowMs, breaking);
   }
 
+  /** Sektionsbytet (ur sectionBlock; basens inträde byter också här, mellan blocken). */
+  private sectionTo(label: string, nowMs: number, blkDb: number): void {
+    const prev = this.section;
+    // MINNE: avslutad sektion till loggen (medel-dB, kickar/s); refrangens dB blir referensen for levelVsHighDb.
+    const dbMean = this.secCurDbN ? this.secCurDbSum / this.secCurDbN : blkDb;
+    this.secLog.push({ label: prev, startMs: this.sectionStartMs, endMs: nowMs, db: dbMean, dens: this.secCurDbN ? this.secCurDens / this.secCurDbN : 0 });
+    if (this.secLog.length > 48) this.secLog.shift();
+    if (prev === 'high') { this.lastHighDb = dbMean; }
+    this.prevSection = prev; this.secCurDbSum = 0; this.secCurDbN = 0; this.secCurDens = 0;
+    this.sectionStartMs = nowMs; if (label === 'high') { this.sectionIndex++; this.secHiStartMs = nowMs; } this.section = label;
+  }
+
   /** Blockets sardrag och etikett (1 s): den kalla delen av sectionHop, egen funktion sa att dess sallan korda grenar inte deoptimerar 100 Hz-ackumuleringen. */
   private sectionBlock(nowMs: number, breaking: boolean): void {
     const n = this.secBlkN || 1; const bInt = this.secBlkInt / n; const bKicks = this.secBlkKicks; const bCent = this.secBlkCent / n;
@@ -1282,6 +1317,9 @@ export class Analyser {
       // 'high' efter en drop om tier >= 1; tier 0 slapper. Standard i koden sedan 11-03 (agaren; backup/fore-drop-hold-20261103).
       if (dropped && label === 'high') this.secDropHoldUntil = nowMs + (Analyser.RANK_WIN + Analyser.RANK_RUN) * 1000;
       else if (prev === 'high' && label !== 'high' && st >= 1 && nowMs < this.secDropHoldUntil) label = 'high';
+      // 'HIGH' KRÄVER ATT BASEN GÅR (arenan bygg 11-11, se RYTMEN MED SLAGET SOM TIDSENHET): har basen varit borta mer än en takt är det
+      // inte refräng, vad rangen än säger (rhBeat lämnar 'high' på samma villkor, på slaget).
+      if (label === 'high' && !dropped && this.rhAway >= Analyser.RH_GONE) label = prev === 'high' || prev === 'break' ? 'break' : this.secBlkDb.length < 20 ? 'intro' : 'build';
       // UTGANG VIA LAG (bit 128): det forflutnas high-SLUT + lag. Sa lange det forflutna fortfarande ar high halls high (st 1);
       // nar slutet ar NU (-1,5..+1,5 s) och rangen inte langre sager high -> 'break' direkt (minnets grans i stallet for uppehallets slut).
       // NIVAMINNE (LEVELREF, se flaggan): absolut referens fran refrang 1 i stallet for den troga percentilrangen. Drop vinner alltid.
@@ -1292,15 +1330,7 @@ export class Analyser {
     // uppehallstid 8 s (var 4: build/low/high bytte var 4 s pa pop 14:30), utom in i 'high' (4 s) och high -> break (direkt)
     const dwellMs = label === 'high' ? 4000 : 8000;
     const dwellOk = nowMs - this.sectionStartMs >= dwellMs || (prev === 'high' && label === 'break') || (Analyser.BODY_HIGH_MS > 0 && dropped && label === 'high');
-    if (label !== prev && dwellOk) {
-      // MINNE: avslutad sektion till loggen (medel-dB, kickar/s); refrangens dB blir referensen for levelVsHighDb.
-      const dbMean = this.secCurDbN ? this.secCurDbSum / this.secCurDbN : blkDb;
-      this.secLog.push({ label: prev, startMs: this.sectionStartMs, endMs: nowMs, db: dbMean, dens: this.secCurDbN ? this.secCurDens / this.secCurDbN : 0 });
-      if (this.secLog.length > 48) this.secLog.shift();
-      if (prev === 'high') { this.lastHighDb = dbMean; }
-      this.prevSection = prev; this.secCurDbSum = 0; this.secCurDbN = 0; this.secCurDens = 0;
-      this.sectionStartMs = nowMs; if (label === 'high') { this.sectionIndex++; this.secHiStartMs = nowMs; } this.section = label;
-    }
+    if (label !== prev && dwellOk) this.sectionTo(label, nowMs, blkDb);
     this.secCurDbSum += blkDb; this.secCurDbN++; this.secCurDens += bKicks;
     if (this.secDump) { const row = [(nowMs - this.secSongStartMs) / 1000, blkDb, bKicks, bCent, bInt, breaking ? 1 : 0, dropped ? 1 : 0]; for (let i = 0; i < 8; i++) row.push(this.secBlkSpec[i] / n); row.push(st, ['intro', 'low', 'build', 'high', 'break'].indexOf(this.section)); this.secDump.push(row); }
     if (this.section === 'high') { this.lastHighDb = this.secCurDbSum / this.secCurDbN; }   // pagaende refrang = farskaste referensen
@@ -1655,6 +1685,7 @@ export class Analyser {
       this.hNowWall = wall; this.hBody = (this.bandDbRaw[0] + this.bandDbRaw[1] + this.bandDbRaw[2]) / 3;
       this.dSec = SECTIONS[r[o + B_SEC]]; this.dLvh = r[o + B_LVH];
       this.dropStep();
+      this.hKick = r[o + B_KICK] === 1;
       this.hInRiser = this.riserStep();
       this.dConf = r[o + B_CONF];
       this.profileStep();
@@ -3030,12 +3061,71 @@ export class Analyser {
     // kunna aterinforas nu nar riser-signalen faktiskt lever (se `bandDb`).
     // Nagot "4000 ms-fonster" finns inte i filen; den formuleringen var kvar
     // fran en tidigare version av villkoret.
-    const bTarget = inRiser ? 1 : 0;
-    const bRate = bTarget > this.buildUp ? dtHop / 3.5 : dtHop / 1.0;   // bygg ~3.5s, klinga ~1s
-    this.buildUp += Math.max(-bRate, Math.min(bRate, bTarget - this.buildUp));
+    this.rhythmStep(inRiser);
     return inRiser;
   }
 
+  /** Rytmens hop-steg (se RYTMEN MED SLAGET SOM TIDSENHET): slagets toppar och anslag, stigningens andel, basens inträde. */
+  private rhythmStep(riser: boolean): void {
+    const hopMs = this.dtHop * 1000, R = this.bandDbRaw, O = this.bandOn;
+    let per = this.localBpm > 40 ? 60000 / this.localBpm : Analyser.BE_FALLBACK_MS;   // slagets längd ur klockan (som bassEnergyStep)
+    per = per < Analyser.BE_BEAT_MIN_MS ? Analyser.BE_BEAT_MIN_MS : per > Analyser.BE_BEAT_MAX_MS ? Analyser.BE_BEAT_MAX_MS : per;
+    const x = 0.25 * R[0] + 0.75 * R[1];
+    if (x > this.rhCurPk) this.rhCurPk = x;
+    let m = R[3]; for (let b = 4; b < 8; b++) if (R[b] > m) m = R[b];
+    if (m > this.rhCurMh) this.rhCurMh = m;
+    const o = O[4] > O[5] ? O[4] : O[5];
+    if (this.rhOnArm) { if (o >= 0.5) { this.rhCurOn++; this.rhOnArm = false; } } else if (o < 0.25) this.rhOnArm = true;
+    if (this.hKick) this.rhCurOn++;
+    this.rhRise += ((riser ? 1 : 0) - this.rhRise) * (hopMs / (4 * per));
+    // BASEN KOMMER IN TYDLIGT: den går (förra slaget OCH nuet) efter ett bortfall, eller ligger RH_IN_DB över takten före -
+    // och inte under låtens refrängbas -> höjningen.
+    if (this.section !== 'high' && this.activeMs > 0 && this.rhAway === 0 && x > this.rhTop - Analyser.RH_AWAY_DB
+      && (this.rhGone || (x >= this.rhBar + Analyser.RH_IN_DB && this.rhLast >= this.rhBar + Analyser.RH_IN_DB))
+      && !(x < this.rhHighTop - Analyser.RH_AWAY_DB)) this.bassIn();
+    this.rhAcc += hopMs;
+    if (this.rhAcc >= per) { this.rhAcc -= per; if (this.rhAcc > per) this.rhAcc = 0; this.rhBeat(); }
+  }
+
+  /** Slagets bokslut: den gående basens nivå, bortfallet, förtätningen -> buildUp; lämnar 'high' när basen varit borta mer än en takt. */
+  private rhBeat(): void {
+    const N = Analyser.RH_BEATS, pk = this.rhCurPk, mh = this.rhCurMh, on = this.rhCurOn, active = this.activeMs > 0;
+    this.rhCurPk = -200; this.rhCurMh = -200; this.rhCurOn = 0;
+    if (!(pk <= this.rhTop)) { this.rhTop = pk; this.rhAway = 0; }
+    else if (pk > this.rhTop - Analyser.RH_AWAY_DB) { this.rhTop += (pk - this.rhTop) / N; this.rhAway = 0; }
+    else if (++this.rhAway > N) { this.rhTop = pk; this.rhAway = 0; this.rhGone = false; }
+    if (this.rhAway === Analyser.RH_GONE) this.rhGone = true;
+    const mhGoing = !(mh <= this.rhMhTop - Analyser.RH_AWAY_DB);
+    if (!(mh <= this.rhMhTop)) this.rhMhTop = mh; else this.rhMhTop += (mh - this.rhMhTop) / N;
+    if (this.section === 'high') {
+      if (this.rhAway === 0) { this.rhHighTop = this.rhTop; this.rhGone = false; }   // låtens refrängbas (nollas med sektionerna)
+      else if (this.rhAway === Analyser.RH_GONE && this.secSongStartMs > 0 && this.role !== 'fast') this.sectionTo('break', this.hNowWall, this.secBlkN > 0 ? 10 * Math.log10(this.secBlkRms2 / this.secBlkN + 1e-10) : -60);   // BASEN BORTA MER ÄN EN TAKT: inte refräng längre
+    }
+    const P = this.rhPk, C = this.rhOn, p = this.rhPos;
+    P[p] = pk; C[p] = on; this.rhPos = (p + 1) % N; if (this.rhN < N) this.rhN++;
+    // takten före det senaste slaget (basens inträde jämförs mot den) och det senaste slagets topp
+    let bar = -200; for (let k = 1; k <= 4; k++) { const v = P[(p - k + N) % N]; if (v > bar) bar = v; }
+    this.rhBar = this.rhN >= 6 ? bar : 200; this.rhLast = pk;
+    let bort = 0, dens = 0;
+    if (active) {
+      if (this.rhAway >= Analyser.RH_GONE && mhGoing) { bort = (this.rhTop - pk) / Analyser.RH_DEEP_DB; if (bort > 1) bort = 1; }
+      if (this.rhN >= 10) {
+        let ref = 0; for (let k = 2; k <= 9; k++) ref += C[(p - k + N) % N];
+        dens = Math.log2(((on + C[(p - 1 + N) % N]) / 2 + 1) / (ref / 8 + 1)) / 2; dens = dens < 0.5 ? 0 : dens > 1 ? 1 : dens;   // räknas från en hel fördubbling
+      }
+    }
+    let b = bort > dens ? bort : dens; if (active && this.rhRise >= 0.5 && this.rhRise > b) b = this.rhRise;   // stigningen räknas när den hållit halva takten
+    this.buildUp = b;
+  }
+
+  /** Basen kom in tydligt (rhythmStep): höjningen -> 'high' direkt, som en drop (förbi uppehållstiden; rangens fönster hinner ikapp). */
+  private bassIn(): void {
+    const nowMs = this.hNowWall;
+    if (this.secSongStartMs === 0 || this.role === 'fast') return;   // sektionen ägs av långsamma sidan
+    this.rhGone = false; this.secDropHoldUntil = nowMs + (Analyser.RANK_WIN + Analyser.RANK_RUN) * 1000;
+    this.sectionTo('high', nowMs, this.secBlkN > 0 ? 10 * Math.log10(this.secBlkRms2 / this.secBlkN + 1e-10) : -60);
+  }
+
   /** Karaktarsprofilen (~8 s) → outProfile. */
   private profileStep(): void {
     // ── KARAKTÄRSPROFIL (~8s) — musikens KARAKTÄR, inte dess energinivå ──
diff --git a/src/effects.ts b/.arena/bygg/b2/src/effects.ts
index 8e0561d..a0d569f 100644
--- a/src/effects.ts
+++ b/.arena/bygg/b2/src/effects.ts
@@ -596,7 +596,7 @@ export class EffectEngine {
    private tickNow = false; private rNowP = 0; private rNowWall = 0; private rDt = 0; private rDtT = 0; private rBeatMs = 0; private rBeatEnv = 0; private rDTarget = 0; private rMd = 0; private rT = 0; private rAnchorHue = 0; private rDrive = 0; private rInputGate = 0;   // RUTANS TAL (se EN KLOCKA PER RUTA): fält i stället för argument - ett decimaltal som skickas till en metod packas in (GC-jakten 10-16)
   private anaDropAt = -1e12;   // analysatorns drop som blev minidrop (se REFRÄNGEN DIREKT EFTER EN MINIDROP-DROP)
   private nearAt = -1e12; nearCount = 0;   // NASTAN-DROP
-  private secCeil = 1; private histAt = -1e12; private rampLvl = 0; private levelRamp = 1; private buildLookAt = 0; private buildSecAt = 0; private buildSecSeen = 0; buildProg = 0; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
+  private secCeil = 1; private histAt = -1e12; private rampLvl = 0; private levelRamp = 1; private buildLookAt = 0; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
   private miniBodyFast = -90; private miniBodySlow = -90; private miniPre = -90; private miniPeak = -200;   // minidrop efter energin
   private miniBangUntil = 0; private lastMiniWall = -1e12; private miniColEnv = 0; private miniLiftUntil = 0; private dropLiftUntil = 0; private liftAt = -1e12; liftCount = 0; private prevRawSec = ''; private lastHighWall = -1e12;   // ENERGILYFT + SEKTIONSLYFT   // minidrop-flank + kort stot
   private dropBangUntil = 0;     // drop-fönster (max-håll upp till ~8s efter träff)
@@ -1622,7 +1622,7 @@ export class EffectEngine {
     this.showVel = Math.min(5, this.showVel * friction + this.pendingKick * 2.0);
     this.pendingKick = 0;
     // upp till 2.5× snabbare vid full uppbyggnad + kick-ryck ovanpå
-    this.showTime += _dtT * (1 + Math.max(frame.buildUp, this.buildProg) * 1.5 + this.showVel);
+    this.showTime += _dtT * (1 + frame.buildUp * 1.5 + this.showVel);
     const t = this.showTime;
     if (kickHit) this.lastKickBoost = nowP;
 
@@ -2000,14 +2000,8 @@ export class EffectEngine {
     // 32:a slag som grupperingen. Svep, pendlar och ekon går då åt olika håll; c.group (två grupper) är oförändrad.
     const ordSel = (this.smartCount * 3 + (beatIdx >> 5)) & 3;
     ctx.beatHit = beatHit; ctx.hasBeat = hasBeat;
-    // UPPBYGGNADENS FÖRLOPP (ladan 10-11 22:05: "kändes inte som den laddade för en drop"): analysatorns buildUp är död på ladans
-    // material (max 0,17 på 115 min), så build-effekterna trappade aldrig upp. buildProg = slag sedan sektionen blev build / 32
-    // (0..1), räknat från uppbyggnadens START (inte lookens - looken kan bytas mitt i), håller över < 2 s sektionsfladder.
-    { const nw = nowWall;
-      if (frame.section === 'build') { if (this.buildSecAt === 0 || nw - this.buildSecSeen > 2000) this.buildSecAt = nw; this.buildSecSeen = nw; }
-      const beatMs = rawBeatMs > 0 ? rawBeatMs : 500;
-      this.buildProg = this.buildSecAt > 0 && nw - this.buildSecSeen <= 2000 ? Math.min(1, (nw - this.buildSecAt) / (32 * beatMs)) : 0; }
-    ctx.wavePhase = this.wavePhase; ctx.buildUp = Math.max(frame.buildUp, this.buildProg);
+    // UPPBYGGNADEN: analysatorn mäter den (frame.buildUp, ur rytmen) - här räknas ingen egen.
+    ctx.wavePhase = this.wavePhase; ctx.buildUp = frame.buildUp;
     ctx.phaseSpread = 1 + ctx.buildUp * 2.5; ctx.punchFloor = punchFloor;
     ctx.chasePos = this.chasePos; ctx.dropFired = this.dropFired;
     ctx.dropHue = this.dropHue; ctx.now = nowP;
@@ -2075,7 +2069,7 @@ export class EffectEngine {
     {
       const sec = frame.section ?? '';
       const vc = Math.max(0.3, Math.min(1, this.cfg.verseCeil ?? SEC_CEIL)), bc = Math.max(vc, SEC_CEIL_BUILD);   // "Tak i vers" i /setup
-      let tgt = sec === 'high' || sec === '' ? 1 : sec === 'build' ? vc + (bc - vc) * this.buildProg : vc;
+      let tgt = sec === 'high' || sec === '' ? 1 : sec === 'build' ? vc + (bc - vc) * frame.buildUp : vc;
       if (nowWall < this.dropBangUntil) { tgt = 1; this.secCeil = 1; }                       // dropen direkt till fullt som minidropen (ladan 10-30: 'lyfter först som en minidrop, sen drop' = taket klättrade 0,3 s)
       else if (this.dropColEnv > 0.005 || nowWall < this.dropLiftUntil + DROP_LIFT_FALL_MS) tgt = 1;   // dropen alltid fullt
       else if (nowWall < this.miniBangUntil) { tgt = 1; this.secCeil = 1; }                   // minidrop-looken alltid till 95 % (ägaren 10-12), direkt
```

