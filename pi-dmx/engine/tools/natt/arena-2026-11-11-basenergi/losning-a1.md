# a1 – FÖLJANDE FÖNSTER, flyttat och renat

## Idén
`frame.bassEnergy` är dagens DMX-mätning – sub+kick i dB (vikt 0,25/0,75) i ett följande fönster (topp direkt upp/10 s ner, dal direkt
ner/0,25 s upp, minst 6 dB, tystnad flyttar inte fönstret) – men räknad i analysatorn VARJE hop (375 Hz) i stället för på renderns takt
(200 Hz, varannan hop osedd), som rå mätning 0..1 utan uttoning, kurva eller golv. `frame.bassEnergyShort` är samma mätning mot en kort
referens (toppen 1 s ner, samma dal): analysatorn publicerar två tidsskalor och vet ingenting om drops.

## Var snittet går
- ANALYSATORN (`analyser.ts` `fillFrame`, snabba vägen, samma kod odelad och delad – mätt bit-lika, 0 ogiltiga hop): dB-värdet, tre
  följare (lång topp, kort topp, dal) och de två fälten. Bara skalärer, två `log10` per hop.
- EFFEKTSIDAN (`effects.ts` `stepEnergy`): `bHi/bLo` och rattarna `DMX_B_LO_S/B_MIN_DB/B_WIN_S/B_TOP/B_RELEASE_MS/B_SUBW/DROP_WIN_S/
  DROP_TOP` är borta. Kvar är ljusstyrningen: val av referens, `E_TOP` 0,95, uttoningen upp direkt/ner 100 ms (orörd), kurvan ^3, golvet,
  lyften. `ctx.bassBody` och lampspridningen läser samma `eBass` som förr.
- EFTER EN DROP: dropläget (`dropLiftUntil` + fallet, exakt dagens villkor) LÄSER DEN KORTA REFERENSEN i stället för att växla fart på
  mätningens topp. Tillbakabytet jämnas ut av uttoningen. Analysatorn känner varken till droppen eller lyftet.

## Siffrorna (3 av 4 bänkningar använda; bänk 2 och 3 identiska)
Domaren: `| a1 | +1.1 | takt +0.2 | dynamik +0.2 | koreografi +2.7 | jitter lang 25.9 | betoning 0.273 | rA 0.331 | rK 0.272 | slagK 0.422 |
ljusSteg 2.16 | ljus -0.7 % | lampspr -0.2/-0.4/-0.1 | t90 20 | - |`  (kopia = +0,0)

basenergi.json: `{"finns": true, "gainDiff": 0.0123, "falt": "c7e79cd43dfef3936d97d84a0480d467", "p05": 0, "p50": 0.326, "p95": 0.896, "tyst": 0.007, "slagDjup": 0.643, "kickar": 637, "usPerHop": 108.34, "sek": 180, "hop": 67500}`
(p05/p50/slagDjup skiljer mot referensen 0,22/0,56/0,36 därför att fältet är RÅTT – referensen hade topp 0,95 och släpp 100 ms inräknat.)

Det är en ren flytt: +1,1 ligger inom bänkens brus (jitter och ljusSteg är kvantiserade). SÄMRE: pop slagK -1,3 %, djup -1,2 %, rK -0,7 %;
dynSets ljusSteg 2,23 -> 2,16 (kontrast 1,84 -> 1,91); betoning -0,001..-0,002 på alla tre. Ljuset -0,5..-1,0 %: toppen ser nu varje
hop och hamnar en aning högre.

FÖRKASTAT (bänk 1, -3,7): samma mätning med uttoningen (upp direkt/ner 100 ms) i analysatorn per hop. Den fångar varje vågtopp i basen
och fyller dalarna: ljus +2,1 %, djup -2,8 % på alla tre filer. Uttoningen är ljus och hör hemma på effektsidan.
EJ BÄNKAT (bara hop-simulering): en dal som följer ner på 15–40 ms ger slagK +3..7 %, djup +4..14 %, men genom 5–10 % mindre ljus och
ett i praktiken snabbare fall – bortvalt (fade-down är låst, mindre ljus ska inte vinna).

## Lotus
Lotus läser `frame.bassEnergy` som nivå per tick (egen uttoning och kurva ovanpå, klockan sköter pulsen) och kan ersätta `bassBody.ts`
`BassBodyWindow`; fältet är nivåoberoende (gainDiff 0,012 vid -12 dB), så micens okända nivå spelar ingen roll.

## Risken
- Mätningen beror inte längre på renderns takt (live: kick-bypass, ojämna rutor); ljuset i ladan kan skilja någon procent från bänken.
- Bytet kort -> lång referens när lyftets fall tar slut är hårt (förr gled toppen vidare från sitt snabba läge). Uttoningen döljer det,
  men efter en lång refräng kan nivån mellan slagen sjunka ett snäpp på ~0,1 s. Syns det: korsa de två fälten över fallets 3 s.
- Volymfönstret `eHi/eLo/eSm` (bara dropens efterkontroll) ligger kvar i effects.ts, orört så dropsen är identiska – nästa att flytta.
- `src/ANALYSER_SHARED.md5` (manifestet) fick jag inte röra: det ska räknas om, och lotus kopia av analyser.ts ska få samma fält.

## Diffen (`git diff --no-index src .arena/basenergi/a1/src`)
```diff
diff --git a/src/analyser.ts b/.arena/basenergi/a1/src/analyser.ts
index cefd9a8..9ce1a8c 100644
--- a/src/analyser.ts
+++ b/.arena/basenergi/a1/src/analyser.ts
@@ -236,6 +236,14 @@ export interface Frame {
    *  ocksa pa av onset.kick (bandOn[1]), men det bandet domineras av sustained
    *  bas — MATT 816-1377 anslag/min dar ~110 fanns, dvs 8x for manga. */
   drum: { kick: number; snare: number; hat: number; bass: number };
+  /** BASENERGIN 0..1 (arenan basenergi 11-11): MÄTNINGEN av bastrycket, varje hop (375 Hz) i den snabba vägen. Sub+kick i dB (vikt
+   *  BASS_E_SUBW/1-BASS_E_SUBW, ur specAbs) placerad i ett FÖLJANDE FÖNSTER: toppen följer direkt upp och BASS_E_TOP_S ner, dalen direkt
+   *  ner och BASS_E_DAL_S upp, minst BASS_E_MIN_DB brett; tystnad (frame.silent) flyttar inte fönstret. 0 = basens senaste dal, 1 = dess
+   *  senaste topp - nivåoberoende (bara dB-skillnader). Rå mätning: ingen uttoning, ingen kurva, inget golv, ingen kännedom om drops
+   *  eller lampor - det är konsumentens sak (DMX: effects.ts stepEnergy).
+   *  bassEnergyShort = SAMMA mätning mot en KORT referens (toppen BASS_E_TOP_SHORT_S ner, samma dal): basen mot den senaste sekundens
+   *  topp i stället för de senaste tio; aldrig under bassEnergy. Konsumenten väljer tidsskala (DMX: dropläget läser den korta). */
+  bassEnergy: number; bassEnergyShort: number;
 }
 
 // ── DROP-DETEKTOR ──────────────────────────────────────────────────────────────────────────────
@@ -334,6 +342,7 @@ const DOUBLE_FROM_START = [
   'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt',
   'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS',
   'nearDropDb', 'nearDipDb', 'liftDb', 'stopS',   // byter forst vid forsta drop-episoden (sags i andra matningen)
+  'beTop', 'beTopS', 'beDal', 'beKTop', 'beKTopS', 'beKDal',   // basenergins fönster (11-11)
 ] as const;
 /** TYPSTABILA TALFALT (2026-09-27, realtidsprincipen): skriv ett icke-heltal och sedan ursprungsvardet, sa V8 ger faltet
  *  Double-representation fran start. Ett Smi-initierat falt (0, -1 ...) som senare far ett decimaltal deprecerar objektets
@@ -399,6 +408,12 @@ export class Analyser {
   private bandOn = new Float32Array(8);    // scratch: per-band onset denna frame
   private static readonly KICK_RISE_HOPS = 6;   // kickRise-fönstret (16 ms), = DMX:s FEED_RISE_HOPS
   private kickRiseDb = new Float64Array(Analyser.KICK_RISE_HOPS); private kickRisePos = 0;
+  /** BASENERGIN (frame.bassEnergy, se Frame): fönstrets tider och mått. Flyttat ur DMX:s effects.ts stepEnergy 11-11 (samma tal som där:
+   *  topp 10 s, dal 0,25 s, 6 dB, subvikt 0,25; den korta toppen 1 s var effektsidans dropfönster DMX_DROP_WIN_S). */
+  private static readonly BASS_E_TOP_S = 10; private static readonly BASS_E_TOP_SHORT_S = 1; private static readonly BASS_E_DAL_S = 0.25;
+  private static readonly BASS_E_MIN_DB = 6; private static readonly BASS_E_SUBW = 0.25;
+  private beOn = false; private beTop = 0; private beTopS = 0; private beDal = 0;   // fönstret (dB): lång topp, kort topp, dal
+  private beKTop = 0; private beKTopS = 0; private beKDal = 0;   // förberäknade steg per hop
   private bigCounter = 0;                  // decimering av 2048-FFT:n (se BIG_EVERY)
   private static readonly BIG_EVERY = 3;   // kor stor-FFT var N:e hop → analysen ryms i realtid
   /** bandPeak-decay per stor-FFT (τ ≈ 3.8 s oavsett BIG_EVERY). */
@@ -2002,13 +2017,15 @@ export class Analyser {
     this.aSpecSlow = 1 - Math.exp(-dtHop / 2.0);
     this.aNovSlow = 1 - Math.exp(-dtHop / 1.5);
     this.aProf = 1 - Math.exp(-dtHop / 8.0);
+    this.beKTop = Math.min(1, dtHop / Analyser.BASS_E_TOP_S); this.beKTopS = Math.min(1, dtHop / Analyser.BASS_E_TOP_SHORT_S);
+    this.beKDal = Math.min(1, dtHop / Analyser.BASS_E_DAL_S);
     // Ett återanvänt Frame (spec/onset pekar på de pre-allokerade objekten).
     this.outFrame = {
       silent: true, level: 0, levelRaw: 0, levelVU: 0, energy: 0, centroid: 0, flux: 0,
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
       dropCount: 0, miniDropCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, midHiDb: -120, kickRise: 0, inZone: false, breaking: false, buildUp: 0, inRiser: false, profile: this.outProfile, beatAnchorMs: 0,
       kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
-      spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
+      spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum, bassEnergy: 0, bassEnergyShort: 0,
     };
     // Ramen och dess delobjekt skrivs varje hop av optimerad kod: ge alla talfalt Double-form redan har (se stabiliseNumbers).
     for (const o of [this.outFrame, this.outProfile, this.outSpec, this.outSpecAbs, this.outOnset, this.outDrum]) stabiliseNumbers(o);
@@ -3068,6 +3085,22 @@ export class Analyser {
       this.kickRiseDb[this.kickRisePos] = db; this.kickRisePos = (this.kickRisePos + 1) % Analyser.KICK_RISE_HOPS;
       f.kickRise = old !== 0 && db > old ? db - old : 0;
     }
+    {   // BASENERGIN (se Frame.bassEnergy): sub+kick i dB i det följande fönstret, mot lång och kort topp, samma dal
+      const db = Analyser.BASS_E_SUBW * 20 * Math.log10(A[0] + 1e-7) + (1 - Analyser.BASS_E_SUBW) * 20 * Math.log10(A[1] + 1e-7);
+      if (!f.silent) {   // tystnad flyttar inte fönstret
+        if (!this.beOn) { this.beOn = true; this.beTop = db; this.beTopS = db; this.beDal = db; }
+        this.beTop = db > this.beTop ? db : this.beTop + (db - this.beTop) * this.beKTop;
+        this.beTopS = db > this.beTopS ? db : this.beTopS + (db - this.beTopS) * this.beKTopS;
+        this.beDal = db < this.beDal ? db : this.beDal + (db - this.beDal) * this.beKDal;
+      }
+      let e = 0, eS = 0;
+      if (this.beOn) {   // (före första ljudet finns inget fönster: 0)
+        const span = Math.max(Analyser.BASS_E_MIN_DB, this.beTop - this.beDal), spanS = Math.max(Analyser.BASS_E_MIN_DB, this.beTopS - this.beDal);
+        e = (db - (this.beTop - span)) / span; eS = (db - (this.beTopS - spanS)) / spanS;
+        e = e > 0 ? (e < 1 ? e : 1) : 0; eS = eS > 0 ? (eS < 1 ? eS : 1) : 0;   // 0..1 (NaN -> 0)
+      }
+      f.bassEnergy = e; f.bassEnergyShort = eS;
+    }
     { let s2 = 1e-12; for (let b = 3; b < 8; b++) { const lin = Math.pow(10, (FB ? this.fbDbRaw : this.bandDbRaw)[b] / 20); s2 += lin * lin; } f.midHiDb = 20 * Math.log10(Math.sqrt(s2)); }
     f.dropCount = this.dropCount; f.miniDropCount = this.miniDropCount; f.dropDemoted = this.dropDemoted; f.dropSpaced = this.dropSpaced; f.dropRiseDb = this.dropRiseDb;
     f.nearDropDb = this.nearDropDb; f.nearDipDb = this.nearDipDb; f.liftDb = this.liftDb; f.stopCount = this.stopCount; f.stopS = this.stopS; f.inZone = inZone; f.breaking = breaking; f.buildUp = this.buildUp; f.inRiser = inRiser;
diff --git a/src/effects.ts b/.arena/basenergi/a1/src/effects.ts
index 70df38c..4463142 100644
--- a/src/effects.ts
+++ b/.arena/basenergi/a1/src/effects.ts
@@ -407,26 +407,23 @@ const FX_FLOOR = 0.6;   // 0 -> 0,6 (ladan 10-09, standard 10-10)
 const E_TOP = Math.max(0.5, Math.min(1, 0.95));   // 1 -> 0,95 (ladan 10-09, standard 10-10)
 /** BASENERGIN (ägaren 10-12: "följa basgången mer än diskant. Samma känsla som man får i magen av en sub vill jag ha i ögonen av ljuset.
  *  De får gärna svänga mycket, bara att sänka taket beroende på var i låten man är" + "kör inte energilagret på två ställen - då dämpas
- *  allt bara"). EN energi ur baskroppen (frame.bodyDb) i stället för volymen (levelVU): topp direkt upp, glider ner på E_WIN_S; dal
- *  direkt ner, glider upp på B_LO_S (1 s) - energin följer bastrycken och basgången över hela skalan i stället för att parkera högt i en
- *  tät refräng. Minst B_MIN_DB brett, E_TOP, upp direkt / ner E_RELEASE_MS (uttoningen som förr), upphöjd till B_CURVE (3; förr E_CURVE
- *  10 = nästan av/på). Golvet = "Lägsta nivå" (cfg.energyFloor). Sektionen sätter bara TAKET (secCeil), effekten mönstret, drops och
+ *  allt bara"). EN energi ur basen i stället för volymen (levelVU): MÄTNINGEN är analysatorns (frame.bassEnergy, 11-11 - sub+kick i dB
+ *  i ett följande fönster, topp direkt upp/10 s ner, dal direkt ner/0,25 s upp, minst 6 dB; förr räknat här i stepEnergy) - energin
+ *  följer bastrycken och basgången över hela skalan i stället för att parkera högt i en tät refräng. Här formas LJUSET ur den: E_TOP,
+ *  upp direkt / ner E_RELEASE_MS (uttoningen som förr), upphöjd till B_CURVE (3; förr E_CURVE 10 = nästan av/på), och DROPLÄGET läser
+ *  den korta referensen (frame.bassEnergyShort, toppen 1 s) medan dropens lyft bär (godkänt i ladan 11-07 som DMX_DROP_WIN_S 1).
+ *  Golvet = "Lägsta nivå" (cfg.energyFloor). Sektionen sätter bara TAKET (secCeil), effekten mönstret, drops och
  *  minidrops lyfter. ERSATTE (bänk tools/energiMatt.mjs, 23 ladan-filer): konsertgolvet 0,4, refränggolvet 0,8, buildladdningen och
  *  TIER_OPEN (golv som gjorde energin verkningslös), taktdippen KICK_E/KICK_E_HIGH på kickEnv (dubbel kickmodulering ovanpå effektens
  *  egen c.heart), SPOT-regeln och UNIFORM:s ovalda par (förbivägar runt energin). */
-const B_CURVE = 3, B_MIN_DB = 6, B_LO_S = 0.25;   // B_LO_S 1 -> 0,25 (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108))
+const B_CURVE = 3;
 /** PROVRATTAR 2026-11-07 (dagkörningen med flera agenter; ägaren: 'kan man få takten att följa själva basrytmen bättre (energilagret)' och
  *  'efter drop räkna med att det är refräng så taket är 95 %, men golvet 70 % dödar bara dynamiken'). Bara för bänken: osatt = dagens
  *  värde och dagens uttryck (json-identiskt). Det som bevisar sig byggs in som standard och ratten tas bort (ägarens regel: inga flaggor).
- *  DMX_B_LO_S/B_CURVE/B_MIN_DB/B_WIN_S/B_TOP/B_RELEASE_MS = basfönstrets dal/kurva/minsta bredd/toppens fall/topp/uttoning (aldrig under
- *  E_RELEASE_MS: fade-down låst), DMX_B_SUBW = subbandets vikt mot kickbandet (0,5 = medel som i dag); DMX_DROP_WIN_S/DROP_TOP = toppens
- *  fall och E_TOP medan dropens lyft pågår (basfönstret ankras om på refrängen i stället för ett golv); DMX_MINI_LIFT_FLOOR = minidropens
- *  lyft som golv (1 = som i dag). */
+ *  DMX_B_CURVE = basenergins kurva; DMX_MINI_LIFT_FLOOR = minidropens lyft som golv (1 = som i dag). (Basfönstrets rattar - DMX_B_LO_S/
+ *  B_MIN_DB/B_WIN_S/B_TOP/B_RELEASE_MS/B_SUBW och DMX_DROP_WIN_S/DROP_TOP - borta 11-11: mätningen ligger i analysatorn, frame.bassEnergy.) */
 const envN = (k: string, d: number): number => { const v = process.env[k]; return v === undefined || v === '' ? d : Number(v); };
-const PB_LO_S = envN('DMX_B_LO_S', B_LO_S), PB_CURVE = envN('DMX_B_CURVE', B_CURVE), PB_MIN_DB = envN('DMX_B_MIN_DB', B_MIN_DB);
-const PB_WIN_S = envN('DMX_B_WIN_S', 0), PB_TOP = envN('DMX_B_TOP', 0), PB_RELEASE_MS = envN('DMX_B_RELEASE_MS', 0), PB_SUBW = envN('DMX_B_SUBW', 0.25);   // 0,5 -> 0,25 (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108))
-const PD_WIN_S = envN('DMX_DROP_WIN_S', 1),   // 0 -> 1 (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108))
-      PD_TOP = envN('DMX_DROP_TOP', 0), PM_LIFT_FLOOR = envN('DMX_MINI_LIFT_FLOOR', 1);
+const PB_CURVE = envN('DMX_B_CURVE', B_CURVE), PM_LIFT_FLOOR = envN('DMX_MINI_LIFT_FLOOR', 1);
 /** BASENERGIN BARA SUB+KICK (opt-in DMX_BASS_SUBKICK=1, porterat från lotus 10-15: ägaren i källaren 'känns dock som att den följer inte bara
  *  bas' med baskroppen 20-250 Hz, 'känns bättre' med sub+kick 20-120 Hz). Basenergins källa = medel av sub- och kickbandets rå dB ur
  *  frame.specAbs (samma bandmedel som bodyDb, utan bandet 120-250 Hz där röstens grundton och virvelns kropp ligger). Flank-dropen läser
@@ -594,7 +591,7 @@ export class EffectEngine {
   private dropColEnv = 0;        // BARA full drop: dropfarg + vit karna (minidrop/nastan-drop lyfter bara ljusstyrkan)
   private lastLiveSection = '';   // DMX_SECTION_SWITCH
   dropCalmDenied = 0; dropFalse = 0; private dropCheckAt = 0; private preDropLevel = 0; private preDropTier = 0;
-  private eSm = 0; eSimple = 0; private eBass = 0; private bHi = NaN; private bLo = NaN; private eHi = NaN; private eLo = NaN; private fxPeak = 0; private fxPeakNow = 0; private fxNorm = 1; private spreadM0 = new Float64Array(64);   // ENERGIN (se E_WIN_S); spreadM0 = BASGANG
+  private eSm = 0; eSimple = 0; private eBass = 0; private eHi = NaN; private eLo = NaN; private fxPeak = 0; private fxPeakNow = 0; private fxNorm = 1; private spreadM0 = new Float64Array(64);   // ENERGIN (se E_WIN_S); spreadM0 = BASGANG
   private trebleEnv = 0; private airEnv = 0; private punchEnv = 0; private belowSince = 0;   // glitter-enveloper (ctx.trebleEnv/airEnv)
   private glH = new Float32Array(64); private glV = new Float32Array(64); private glOn = new Uint8Array(64);   // KULÖRTONING per lampa (visad kulör, förra ljuset)
   private lampLvl = new Float32Array(64); private lampPeakAt = new Float64Array(64); private chOnAt = new Float64Array(192); private lampRatio = new Float32Array(192);   // STEG 2: uttoningen per lampa (ljusstyrka + senaste kulor)
@@ -1308,7 +1305,7 @@ export class EffectEngine {
     this.tickNow = beatTick; this.rBeatEnv = beatEnv;
   }
 
-  /** ENERGIN (steg 2): basenergin i följande fönster, lyft efter drop/minidrop (utbrutet ur render 10-16, GC-jakten: ordagrant flyttat, samma ordning). */
+  /** ENERGIN (steg 2): analysatorns basenergi (frame.bassEnergy) -> nivån, dropläge, lyft efter drop/minidrop (utbrutet ur render 10-16, GC-jakten: ordagrant flyttat, samma ordning). */
   private stepEnergy(frame: Frame): void {
     const dtSec = this.rDt, nowWall = this.rNowWall, drive = this.rDrive;
     let md: number;
@@ -1329,22 +1326,13 @@ export class EffectEngine {
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
-      const bTop = inDropLift && PD_TOP > 0 ? PD_TOP : PB_TOP > 0 ? PB_TOP : E_TOP, bRel = PB_RELEASE_MS > E_RELEASE_MS ? PB_RELEASE_MS : E_RELEASE_MS;
-      if (bTop < 1) eb = eb >= bTop ? 1 : eb / bTop;   // ENERGINS TOPP (se E_TOP)
-      this.eBass = eb > this.eBass ? eb : this.eBass + (eb - this.eBass) * (1 - Math.exp(-dtSec * 1000 / bRel));   // upp direkt, ner E_RELEASE_MS (som förr)
+      // BASENERGIN (se B_CURVE): analysatorn MÄTER (frame.bassEnergy = bastrycket i sitt följande fönster mot toppen ~10 s,
+      // frame.bassEnergyShort = samma mätning mot toppen ~1 s) - effekten VÄLJER tidsskala och formar ljuset (topp, uttoning, kurva).
+      // DROPLÄGET (se DROP_LIFT_MS): medan dropens lyft bär och faller läser nivån den KORTA referensen - refrängens bas fyller skalan
+      // direkt i stället för att mätas mot dropens smäll i 10 s ('energin efter drop dör fort'); uttoningen nedan jämnar ut bytet tillbaka.
+      let eb = (nowWall < this.dropLiftUntil + DROP_LIFT_FALL_MS ? frame.bassEnergyShort : frame.bassEnergy) ?? 0;
+      if (E_TOP < 1) eb = eb >= E_TOP ? 1 : eb / E_TOP;   // ENERGINS TOPP (se E_TOP)
+      this.eBass = eb > this.eBass ? eb : this.eBass + (eb - this.eBass) * (1 - Math.exp(-dtSec * 1000 / E_RELEASE_MS));   // upp direkt, ner E_RELEASE_MS (som förr)
       this.eSimple = this.eBass;
       const eFloor = Math.max(0, Math.min(0.5, this.cfg.energyFloor ?? 0.2));   // "Lägsta nivå" i /setup
       let lift = this.dropEnv;   // DROPS OCH MINIDROPS LYFTER (se DROP_LIFT_MS / MINI_LIFT_MS): energin släpper helt och glider tillbaka
```
