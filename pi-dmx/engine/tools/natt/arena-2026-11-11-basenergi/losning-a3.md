# a3 – basenergin med SLAGET SOM TIDSENHET

## Idén
`frame.bassEnergy` mäter bastrycket (sub+kick i rå dB, 0,25/0,75) mellan basens dal och de senaste slagens topp, där ALLA tider räknas i
slag ur analysatorns klocka: toppen följer direkt upp och glöms på 16 slag (fyra takter), dalen följer direkt ner och är tillbaka på ett
kvarts slag. Skalan hinner ikapp i musikens egen takt, varje bastryck mäts från sin egen dal oavsett tempo, och mätningen är nivåoberoende
på riktigt (bara dB-skillnader, ingen tystnadsgrind i statistiken).

## Var snittet går
- ANALYSATORN (`analyser.ts` `bassEnergyStep`, snabba vägen i `fillFrame`, båda vägarna): två fält ur samma dal -
  `bassEnergy` (toppen glöms på 16 slag = frasens skala) och `bassEnergyShort` (toppen glöms på 2 slag = taktens skala). Fyra tal i
  tillstånd, två log10 per hop, inga objekt. Slagets längd = 60000/bpm ur klockan, hållet inom 300-600 ms; utan klocka 500 ms (reserven).
  Inget vet vad en lampa eller en drop är. Fälten är 0 när ramen är tyst.
- EFFEKTEN (`effects.ts` `stepEnergy`): fönstret `bHi/bLo` och dess rattar är borta. Kvar är bara ljusstyrning: E_TOP 0,95, uttoningen
  100 ms, kurvan ^3, lyftet. `md`, `ctx.bassBody` och lampspridningen läser `eBass` = fältet efter topp och uttoning.
- EFTER EN DROP: effektens dropläge VÄLJER SKALA - medan lyftet bär (`dropLiftUntil`, hålls i refrängen) följer ljuset
  `bassEnergyShort` (varje slag fullt mot sina grannar, det ladan godkände 11-07) och glider tillbaka till `bassEnergy` på fallets 3 s.
  Analysatorn mäter alltid båda; dropen rör aldrig mätningen.
- Orört: volymfönstret `eSm` (bara dropens efterkontroll läser det; dropsen är desamma).

## Kortet på riktigt - och vad som föll
Bänk 1-2 var kortets bokstav: toppen = kvantil (0,66/0,6) av de 32 senaste slagtopparna, med omstart vid nivåsprång. Bänken sa nej:
-1,1 (DISK lampspr/slocknat) och -6,2 (plattare ljus: slagK -10 %, ljusSteg -18 %). Orsaken syns i lampmodellen (150 ms håll + 0,25 s
uttoning): ljuset följer slagens TOPPAR, och en kvantil lägger de flesta refrängslag under 1 medan tysta partier skalas upp. Det som
bar var kortets kärna - slaget som tidsenhet - på en topp som följer direkt upp (bänk 3-4).

## Siffrorna (bänk 4 av 4)
Domaren: `| 1 | a3 | +1.9 | takt -1.9 | dynamik +1.4 | koreografi +4.6 | jitter lang 25.9 | betoning 0.269 | rA 0.327 | rK 0.269 | slagK 0.433 | ljusSteg 2.22 | ljus -2.4 | lampspr -1.2/-0.0/-0.9 | t90 20 | - |`
basenergi.json: `finns true, gainDiff 0.0039 (dagens fönster 0,014), falt = bas, p05/p50/p95 0/0.256/0.873, tyst 0, slagDjup 0.654 (dagens 0,36)`
Bättre: slagK +3,8/+3,0/+4,3 % (lang/pop/megamix), jitter -9,8/-10,0/-9,1 %, djup +1,2/+2,2/+2,8 %.
Sämre: takt (rK -0,7/-4,7/-3,9 %, rA -0,6/-1,3/-2,5 %), betoning lang -0,005, ljus -2,4 %, slocknat +0,24 pe, dynSets rDb 0,56 -> 0,52.
Med 24 slag i stället för 16 (bänk 3): +1,7, men lampspr lang -5,1 % - för nära spärren för kontrollmängden, därför 16.

## Lotus
Lotus läser `frame.bassEnergy` rakt av som pulsens styrka (eller `bassEnergyShort` om remsan alltid ska slå fullt): nivåoberoende
(mic), 0 vid tystnad, och tiderna följer samma klocka som styr pulsen.

## Risken
- Dalen på ett kvarts slag gör pulsen smalare: rullande bas utan kick kan se hackigare ut i ladan än bänken visar, och takt-måtten föll.
- Skalan lutar sig mot klockans tempo; halv-/dubbeltempo ändrar tiderna x2 (begränsat av 300-600 ms).
- Dropläget är en korstoning mellan två skalor, inte dagens fönsterbyte - lika vid 120 BPM (2 slag = 1 s), inte godkänt i ögat.
- Jittervinsten (-10 %) kan delvis vara lookval som flyttat sig; bänkens brus är ungefär +-1 poäng.
- Vid inlägg: `src/ANALYSER_SHARED.md5` måste räknas om (jag fick inte röra den) och lotus portas.

## Diffen (`git diff --no-index src .arena/basenergi/a3/src`)
```diff
diff --git a/src/analyser.ts b/.arena/basenergi/a3/src/analyser.ts
index cefd9a8..e1561d5 100644
--- a/src/analyser.ts
+++ b/.arena/basenergi/a3/src/analyser.ts
@@ -222,6 +222,14 @@ export interface Frame {
   specAbs: Spectrum;
   /** BASKROPPEN I RA dB (negativt tal, medel av sub+kick+bas), utan AGC - drop-detektorns kropp. */
   bodyDb: number;
+  /** BASENERGIN 0..1 (arenan basenergi 2026-11-11, EN mätning för båda systemen; förr DMX effects.ts bHi/bLo/eBass): bastrycket
+   *  (sub+kick i rå dB, vikt 0,25/0,75) mätt med SLAGET SOM TIDSENHET (klockans tempo; utan klocka 500 ms). 1 = så starkt som de
+   *  starkaste slagen på senare tid, 0 = basens dal (direkt ner, tillbaka på ett kvarts slag). TVÅ SKALOR, samma dal:
+   *  bassEnergy = mot FRASEN (toppen glöms på BE_TOP_BEATS slag: starka och svaga partier skiljs åt), bassEnergyShort = mot TAKTEN
+   *  (toppen glöms på BE_FAST_BEATS slag: varje slag mot sina närmaste grannar, ikapp två slag efter ett nivåbyte). bassEnergyShort >=
+   *  bassEnergy. Bara dB-skillnader: oberoende av ingångsnivån; 0 när ramen är tyst. Ren mätning - vilken skala ljuset följer, kurva,
+   *  uttoning och dropläge ligger i effekterna. Se bassEnergyStep. */
+  bassEnergy: number; bassEnergyShort: number;
   /** ABSOLUT mid+diskant-niva i dB (band 3-7, >250 Hz), RMS-kombinerad, ingen AGC. */
   midHiDb: number;
   /** KICKENS STIGNING, OMÄTTAD (10-28, fynd 10-22/10-27): basens (specAbs sub+kick) stigning i dB mot KICK_RISE_HOPS hop sedan,
@@ -399,6 +407,31 @@ export class Analyser {
   private bandOn = new Float32Array(8);    // scratch: per-band onset denna frame
   private static readonly KICK_RISE_HOPS = 6;   // kickRise-fönstret (16 ms), = DMX:s FEED_RISE_HOPS
   private kickRiseDb = new Float64Array(Analyser.KICK_RISE_HOPS); private kickRisePos = 0;
+  /** BASENERGIN MED SLAGET SOM TIDSENHET (frame.bassEnergy / bassEnergyShort). Alla tider räknas i SLAG ur klockans tempo (60000 / bpm,
+   *  hållet inom BE_BEAT_MIN_MS..BE_BEAT_MAX_MS så ett halv-/dubbeltempo inte flyttar skalan långt; utan klocka BE_FALLBACK_MS):
+   *  TOPPEN följer basen direkt upp och glöms mot den på BE_TOP_BEATS slag (frasens skala) resp. BE_FAST_BEATS slag (taktens skala),
+   *  DALEN följer direkt ner och glider tillbaka på BE_LO_BEATS slag - varje bastryck mäts från sin egen dal, och hur fort skalan
+   *  hinner ikapp ett nivåbyte följer musikens tempo i stället för en klocka i sekunder. Minst BE_MIN_DB brett. Bara dB-SKILLNADER:
+   *  ingen tystnadsgrind och ingen absolut nivå i mätningen (oberoende av ingångsnivån). Fyra tal i tillstånd, inga objekt per hop.
+   *  (Provat och förkastat i arenan: toppen som kvantil/median av de 32 senaste slagtopparna - plattare ljus, sämre takt i bänken.) */
+  private static readonly BE_TOP_BEATS = 16; private static readonly BE_FAST_BEATS = 2; private static readonly BE_LO_BEATS = 0.25; private static readonly BE_MIN_DB = 6;
+  private static readonly BE_BEAT_MIN_MS = 300; private static readonly BE_BEAT_MAX_MS = 600; private static readonly BE_FALLBACK_MS = 500;
+  private beHi = NaN; private beHiShort = NaN; private beLo = NaN; private beShort = 0;
+  /** Stegar skalorna ett hop; returnerar frasens värde, taktens ligger i beShort. */
+  private bassEnergyStep(sub: number, kick: number): number {
+    const x = 5 * Math.log10(sub + 1e-7) + 15 * Math.log10(kick + 1e-7), hopMs = this.dtHop * 1000;   // 0,25 x sub dB + 0,75 x kick dB
+    let per = this.localBpm > 40 ? 60000 / this.localBpm : Analyser.BE_FALLBACK_MS;   // slagets längd ur klockan
+    per = per < Analyser.BE_BEAT_MIN_MS ? Analyser.BE_BEAT_MIN_MS : per > Analyser.BE_BEAT_MAX_MS ? Analyser.BE_BEAT_MAX_MS : per;
+    this.beHi = !(x <= this.beHi) ? x : this.beHi + (x - this.beHi) * (hopMs / (Analyser.BE_TOP_BEATS * per));
+    this.beHiShort = !(x <= this.beHiShort) ? x : this.beHiShort + (x - this.beHiShort) * (hopMs / (Analyser.BE_FAST_BEATS * per));
+    this.beLo = !(x >= this.beLo) ? x : this.beLo + (x - this.beLo) * (hopMs / (Analyser.BE_LO_BEATS * per));
+    const lo = this.beLo, m = Analyser.BE_MIN_DB;
+    let span = this.beHiShort - lo > m ? this.beHiShort - lo : m, e = (x - (this.beHiShort - span)) / span;
+    this.beShort = e > 0 ? (e < 1 ? e : 1) : 0;
+    span = this.beHi - lo > m ? this.beHi - lo : m; e = (x - (this.beHi - span)) / span;
+    return e > 0 ? (e < 1 ? e : 1) : 0;
+  }
+
   private bigCounter = 0;                  // decimering av 2048-FFT:n (se BIG_EVERY)
   private static readonly BIG_EVERY = 3;   // kor stor-FFT var N:e hop → analysen ryms i realtid
   /** bandPeak-decay per stor-FFT (τ ≈ 3.8 s oavsett BIG_EVERY). */
@@ -2006,7 +2039,7 @@ export class Analyser {
     this.outFrame = {
       silent: true, level: 0, levelRaw: 0, levelVU: 0, energy: 0, centroid: 0, flux: 0,
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
-      dropCount: 0, miniDropCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, midHiDb: -120, kickRise: 0, inZone: false, breaking: false, buildUp: 0, inRiser: false, profile: this.outProfile, beatAnchorMs: 0,
+      dropCount: 0, miniDropCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, midHiDb: -120, kickRise: 0, inZone: false, breaking: false, buildUp: 0, inRiser: false, profile: this.outProfile, beatAnchorMs: 0,
       kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
       spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
     };
@@ -3062,7 +3095,7 @@ export class Analyser {
     f.energy = this.engSmooth;
     f.centroid = this.centSmooth; f.flux = fluxNorm; f.kick = kick; f.gain = this.gain;
     f.bpm = this.localBpm; f.bpmConfidence = this.localBpmConfidence; f.intensity = intensity; f.beatAnchorMs = this.beatAnchorMs;
-    f.bodyDb = bodyNow;
+    f.bodyDb = bodyNow; { const be = this.bassEnergyStep(A[0], A[1]); f.bassEnergy = f.silent ? 0 : be; f.bassEnergyShort = f.silent ? 0 : this.beShort; }
     {   // kickRise: basens dB mot KICK_RISE_HOPS hop sedan (ringen håller de senaste), halvvåg
       const db = 20 * Math.log10(A[0] + A[1] + 1e-7), old = this.kickRiseDb[this.kickRisePos];
       this.kickRiseDb[this.kickRisePos] = db; this.kickRisePos = (this.kickRisePos + 1) % Analyser.KICK_RISE_HOPS;
diff --git a/src/effects/types.ts b/.arena/basenergi/a3/src/effects/types.ts
index 367a15c..1b1d08d 100644
--- a/src/effects/types.ts
+++ b/.arena/basenergi/a3/src/effects/types.ts
@@ -78,7 +78,7 @@ export interface EffectContext {
   bassline: number; bassNoteIdx: number; bassNoteAge: number;
   /** Kick-/beat-envelope (0..1). */
   kickEnv: number;
-  /** BASGÅNGEN SJÄLV (arenan puls1 2026-11-07): energilagrets baskropp (eBass, sub/kick-banden i följande fönster: 0 = basens senaste dal,
+  /** BASGÅNGEN SJÄLV (arenan puls1 2026-11-07): energilagrets baskropp (eBass = analysatorns frame.bassEnergy, i dropläget bassEnergyShort, efter E_TOP och uttoning: 0 = basens senaste dal,
    *  1 = toppen). Med DMX_BASGANG=1 tar de mest spelade effekterna slagets STYRKA härifrån och rutnätet bara VEM som tänds. */
   bassBody: number;
   /** GLITTER-ENVELOPER (2026-10-10): diskant- (hi-hat/cymbal) och luftanslaget (frame.onset.treble/air) med direkt uppgang och
diff --git a/src/effects.ts b/.arena/basenergi/a3/src/effects.ts
index 70df38c..f31fb28 100644
--- a/src/effects.ts
+++ b/.arena/basenergi/a3/src/effects.ts
@@ -407,26 +407,25 @@ const FX_FLOOR = 0.6;   // 0 -> 0,6 (ladan 10-09, standard 10-10)
 const E_TOP = Math.max(0.5, Math.min(1, 0.95));   // 1 -> 0,95 (ladan 10-09, standard 10-10)
 /** BASENERGIN (ägaren 10-12: "följa basgången mer än diskant. Samma känsla som man får i magen av en sub vill jag ha i ögonen av ljuset.
  *  De får gärna svänga mycket, bara att sänka taket beroende på var i låten man är" + "kör inte energilagret på två ställen - då dämpas
- *  allt bara"). EN energi ur baskroppen (frame.bodyDb) i stället för volymen (levelVU): topp direkt upp, glider ner på E_WIN_S; dal
+ *  allt bara"). MÄTNINGEN LIGGER I ANALYSATORN sedan arenan basenergi 11-11 (frame.bassEnergy/bassEnergyShort: bastrycket med slaget som tidsenhet;
+ *  analyser.ts bassEnergyStep) - här bara E_TOP, uttoningen och kurvan. Förr ett eget fönster här: topp direkt upp, glider ner på E_WIN_S; dal
  *  direkt ner, glider upp på B_LO_S (1 s) - energin följer bastrycken och basgången över hela skalan i stället för att parkera högt i en
  *  tät refräng. Minst B_MIN_DB brett, E_TOP, upp direkt / ner E_RELEASE_MS (uttoningen som förr), upphöjd till B_CURVE (3; förr E_CURVE
  *  10 = nästan av/på). Golvet = "Lägsta nivå" (cfg.energyFloor). Sektionen sätter bara TAKET (secCeil), effekten mönstret, drops och
  *  minidrops lyfter. ERSATTE (bänk tools/energiMatt.mjs, 23 ladan-filer): konsertgolvet 0,4, refränggolvet 0,8, buildladdningen och
  *  TIER_OPEN (golv som gjorde energin verkningslös), taktdippen KICK_E/KICK_E_HIGH på kickEnv (dubbel kickmodulering ovanpå effektens
  *  egen c.heart), SPOT-regeln och UNIFORM:s ovalda par (förbivägar runt energin). */
-const B_CURVE = 3, B_MIN_DB = 6, B_LO_S = 0.25;   // B_LO_S 1 -> 0,25 (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108))
+const B_CURVE = 3;   // (fönstret - B_MIN_DB, B_LO_S, sub/kick-vikten - ligger i analysatorn sedan arenan basenergi 11-11: frame.bassEnergy)
 /** PROVRATTAR 2026-11-07 (dagkörningen med flera agenter; ägaren: 'kan man få takten att följa själva basrytmen bättre (energilagret)' och
  *  'efter drop räkna med att det är refräng så taket är 95 %, men golvet 70 % dödar bara dynamiken'). Bara för bänken: osatt = dagens
  *  värde och dagens uttryck (json-identiskt). Det som bevisar sig byggs in som standard och ratten tas bort (ägarens regel: inga flaggor).
- *  DMX_B_LO_S/B_CURVE/B_MIN_DB/B_WIN_S/B_TOP/B_RELEASE_MS = basfönstrets dal/kurva/minsta bredd/toppens fall/topp/uttoning (aldrig under
- *  E_RELEASE_MS: fade-down låst), DMX_B_SUBW = subbandets vikt mot kickbandet (0,5 = medel som i dag); DMX_DROP_WIN_S/DROP_TOP = toppens
- *  fall och E_TOP medan dropens lyft pågår (basfönstret ankras om på refrängen i stället för ett golv); DMX_MINI_LIFT_FLOOR = minidropens
- *  lyft som golv (1 = som i dag). */
+ *  DMX_B_CURVE/B_TOP/B_RELEASE_MS = basenergins kurva/topp/uttoning (aldrig under E_RELEASE_MS: fade-down låst); DMX_DROP_TOP = energins
+ *  topp medan dropens lyft pågår; DMX_MINI_LIFT_FLOOR = minidropens lyft som golv (1 = som i dag). Fönstrets rattar
+ *  (DMX_B_LO_S/B_MIN_DB/B_WIN_S/B_SUBW/DROP_WIN_S) är borta: mätningen ligger i analysatorn (frame.bassEnergy). */
 const envN = (k: string, d: number): number => { const v = process.env[k]; return v === undefined || v === '' ? d : Number(v); };
-const PB_LO_S = envN('DMX_B_LO_S', B_LO_S), PB_CURVE = envN('DMX_B_CURVE', B_CURVE), PB_MIN_DB = envN('DMX_B_MIN_DB', B_MIN_DB);
-const PB_WIN_S = envN('DMX_B_WIN_S', 0), PB_TOP = envN('DMX_B_TOP', 0), PB_RELEASE_MS = envN('DMX_B_RELEASE_MS', 0), PB_SUBW = envN('DMX_B_SUBW', 0.25);   // 0,5 -> 0,25 (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108))
-const PD_WIN_S = envN('DMX_DROP_WIN_S', 1),   // 0 -> 1 (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108))
-      PD_TOP = envN('DMX_DROP_TOP', 0), PM_LIFT_FLOOR = envN('DMX_MINI_LIFT_FLOOR', 1);
+const PB_CURVE = envN('DMX_B_CURVE', B_CURVE);
+const PB_TOP = envN('DMX_B_TOP', 0), PB_RELEASE_MS = envN('DMX_B_RELEASE_MS', 0);
+const PD_TOP = envN('DMX_DROP_TOP', 0), PM_LIFT_FLOOR = envN('DMX_MINI_LIFT_FLOOR', 1);
 /** BASENERGIN BARA SUB+KICK (opt-in DMX_BASS_SUBKICK=1, porterat från lotus 10-15: ägaren i källaren 'känns dock som att den följer inte bara
  *  bas' med baskroppen 20-250 Hz, 'känns bättre' med sub+kick 20-120 Hz). Basenergins källa = medel av sub- och kickbandets rå dB ur
  *  frame.specAbs (samma bandmedel som bodyDb, utan bandet 120-250 Hz där röstens grundton och virvelns kropp ligger). Flank-dropen läser
@@ -594,7 +593,7 @@ export class EffectEngine {
   private dropColEnv = 0;        // BARA full drop: dropfarg + vit karna (minidrop/nastan-drop lyfter bara ljusstyrkan)
   private lastLiveSection = '';   // DMX_SECTION_SWITCH
   dropCalmDenied = 0; dropFalse = 0; private dropCheckAt = 0; private preDropLevel = 0; private preDropTier = 0;
-  private eSm = 0; eSimple = 0; private eBass = 0; private bHi = NaN; private bLo = NaN; private eHi = NaN; private eLo = NaN; private fxPeak = 0; private fxPeakNow = 0; private fxNorm = 1; private spreadM0 = new Float64Array(64);   // ENERGIN (se E_WIN_S); spreadM0 = BASGANG
+  private eSm = 0; eSimple = 0; private eBass = 0; private eHi = NaN; private eLo = NaN; private fxPeak = 0; private fxPeakNow = 0; private fxNorm = 1; private spreadM0 = new Float64Array(64);   // ENERGIN (se E_WIN_S); spreadM0 = BASGANG
   private trebleEnv = 0; private airEnv = 0; private punchEnv = 0; private belowSince = 0;   // glitter-enveloper (ctx.trebleEnv/airEnv)
   private glH = new Float32Array(64); private glV = new Float32Array(64); private glOn = new Uint8Array(64);   // KULÖRTONING per lampa (visad kulör, förra ljuset)
   private lampLvl = new Float32Array(64); private lampPeakAt = new Float64Array(64); private chOnAt = new Float64Array(192); private lampRatio = new Float32Array(192);   // STEG 2: uttoningen per lampa (ljusstyrka + senaste kulor)
@@ -1329,19 +1328,13 @@ export class EffectEngine {
       if (E_TOP < 1) e = e >= E_TOP ? 1 : e / E_TOP;   // ENERGINS TOPP (se E_TOP)
       this.eSm = e > this.eSm ? e : this.eSm + (e - this.eSm) * (1 - Math.exp(-dtSec * 1000 / E_RELEASE_MS));
       // (volymfönstret ovan - eSm - styr inte ljuset längre, bara dropens efterkontroll (DROP_LAND_GAIN); orört så dropsen är desamma)
-      // BASENERGIN (se B_CURVE): baskroppen (frame.bodyDb, sub+kick+bas i rå dB) i ett följande fönster - topp direkt upp/E_WIN_S ner,
-      // dal direkt ner/B_LO_S upp - energin mäter hur långt över basens senaste dal vi är: varje bastryck svänger över skalan.
-      const bdb = frame.specAbs ? (PB_SUBW === 0.5 ? (20 * Math.log10(frame.specAbs.sub + 1e-7) + 20 * Math.log10(frame.specAbs.kick + 1e-7)) / 2
-        : PB_SUBW * 20 * Math.log10(frame.specAbs.sub + 1e-7) + (1 - PB_SUBW) * 20 * Math.log10(frame.specAbs.kick + 1e-7)) : (frame.bodyDb ?? -90);   // BASS_SUBKICK: bara 20-120 Hz (PROV DMX_B_SUBW)
-      const inDropLift = nowWall < this.dropLiftUntil + DROP_LIFT_FALL_MS;   // PROV DMX_DROP_WIN_S/DROP_TOP
-      const bWin = inDropLift && PD_WIN_S > 0 ? PD_WIN_S : PB_WIN_S, kB = bWin > 0 ? Math.min(1, dtSec / bWin) : k;
-      if (Number.isNaN(this.bHi) && !frame.silent) { this.bHi = bdb; this.bLo = bdb; }
-      if (!frame.silent) {   // tystnad flyttar inte fönstret
-        this.bHi = bdb > this.bHi ? bdb : this.bHi + (bdb - this.bHi) * kB;
-        this.bLo = bdb < this.bLo ? bdb : this.bLo + (bdb - this.bLo) * Math.min(1, dtSec / PB_LO_S);
-      }
-      const bSpan = Math.max(PB_MIN_DB, this.bHi - this.bLo);
-      let eb = (bdb - (this.bHi - bSpan)) / bSpan; eb = eb < 0 ? 0 : eb > 1 ? 1 : eb; if (eb !== eb) eb = 0;
+      // BASENERGIN (se B_CURVE): analysatorn MÄTER (frame.bassEnergy mot frasen, frame.bassEnergyShort mot takten) - här bara vilken skala
+      // ljuset följer och ljusets form (topp, uttoning, kurva, lyft). DROPLÄGET (se DROP_LIFT_MS): medan dropens lyft bär följer ljuset
+      // TAKTENS skala (varje slag fullt mot sina grannar; ladan 11-07: "energin efter drop dör fort" -> "känns bra nu") och glider
+      // tillbaka till frasens på DROP_LIFT_FALL_MS. Förr bytte dropen mätfönstrets längd här (10 s -> 1 s).
+      const dropLeft = this.dropLiftUntil - nowWall, inDropLift = dropLeft > -DROP_LIFT_FALL_MS;   // PROV DMX_DROP_TOP
+      let eb = frame.bassEnergy ?? 0;
+      if (inDropLift) eb += ((frame.bassEnergyShort ?? eb) - eb) * (dropLeft >= 0 ? 1 : 1 + dropLeft / DROP_LIFT_FALL_MS);
       const bTop = inDropLift && PD_TOP > 0 ? PD_TOP : PB_TOP > 0 ? PB_TOP : E_TOP, bRel = PB_RELEASE_MS > E_RELEASE_MS ? PB_RELEASE_MS : E_RELEASE_MS;
       if (bTop < 1) eb = eb >= bTop ? 1 : eb / bTop;   // ENERGINS TOPP (se E_TOP)
       this.eBass = eb > this.eBass ? eb : this.eBass + (eb - this.eBass) * (1 - Math.exp(-dtSec * 1000 / bRel));   // upp direkt, ner E_RELEASE_MS (som förr)
```
