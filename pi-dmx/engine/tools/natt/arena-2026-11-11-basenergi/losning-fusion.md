# fusion – basens nivå mot frasens tak (a3) + partiet mot låtens referens (a4), pulsen på effektsidan

## Rakt svar
Leveransen (`fusion`, 36 dB-spann) får **+1,9 OK – lika med a3 (+1,9), inte bättre**: den vinner på dynamik (+3,8 mot +1,4) och takt
(+0,2 mot −1,9) men förlorar a3:s jittersteg (koreografi +0,5 mot +4,6). Delkombinationen `fusion-c` (samma kod, 24 dB-spann) får
**+3,4 OK** och slår a3 på bänken, men släcker riggen i baslösa partier (slocknat +0,60 pe, megamix ensam +1,6) – se Risken.
Varför delarna inte gick ihop fullt: a3:s vinst var den snabba dalen (kvarts slag = smalare puls), och den är nu ljusstyrning och
låst till minst 0,25 s. a2:s taktvinst kom ur motsatsen (ett golv som står still = bredare puls). Båda sitter i samma ratt (`B_LO_S`).

## Idén
`frame.bassEnergy` är basens nivå (sub+kick i rå dB, 0,25/0,75) som dB-avstånd till frasens tak över ett fast spann – ren mätning
utan dal, uttoning eller kurva; `bassEnergyShort` är samma mot taktens tak och `bassLevel` är frasens tak mot refrängens tak.
Taken räknas i slag ur klockan (a3), versen skiljs från refrängen i ett eget fält (a4) i stället för att normeras bort.

## Var snittet går (tal per sida)
- ANALYSATORN (`analyser.ts` `bassEnergyStep`, varje hop, snabba vägen, båda vägarna; tre följare + ett värde, inga objekt):
  vikten 0,25/0,75; `BE_TOP_BEATS 16` (frasens tak: direkt upp, glöms på 16 slag); `BE_FAST_BEATS 2` (taktens tak);
  `BE_SPAN_DB 36` (fältet = 1 − (tak − bas)/36, fast spann, inget rörligt golv); `BE_MEM_BEATS 240` (låtens referens = frasens tak
  medan sektionen är `high`, annars minne); slagets längd 300–600 ms, utan klocka 500 ms. Ingen tystnadsgrind, bara dB-skillnader.
- EFFEKTEN (`effects.ts` `stepEnergy`, läser bara fälten – inget `specAbs`/`bodyDb` för basen):
  `B_LO_S 0,25 s` (pulsens dal: följer FÄLTET direkt ner, tillbaka på 0,25 s – samma tid som före arenan, aldrig kortare);
  `B_MIN_SPAN 1/6` (= förr 6 dB); `E_TOP 0,95`; `E_RELEASE_MS 100`; `B_CURVE 3`; `B_PART_DIM 0,7` (ljuset × (1 − 0,7·(1 − bassLevel)));
  `B_PART_AT 0,5` (partinivån byts bara mellan pulserna – ett byte i pulsen flyttar ljusets topp).
- EFTER EN DROP: droplägets vikt (lyftet 8 s, hålls i refrängen, fall 3 s) väljer `bassEnergyShort` och stänger partidämpningen.
  Analysatorn mäter alltid allt; dropen rör aldrig mätningen. Volymfönstret `eSm` (dropens efterkontroll) orört.

## Siffrorna (5 av 5 bänkningar)
| # | mapp | innehåll | poäng | takt | dynamik | koreografi | jitter lang/pop/mega | slocknat pe |
|---|---|---|---|---|---|---|---|---|
| – | a3 (inlagd) | dal kvarts slag i analysatorn | +1,9 | −1,9 | +1,4 | +4,6 | 25,9/33,3/37,0 | +0,24 |
| 1 | fusion-b | nya snittet, spann 24, utan parti | +1,3 | −0,1 | +0,1 | +3,7 | 26,9/33,3/37,0 | +0,44 |
| 3 | sond/arkiv/S36-utan-parti | spann 36, utan parti | −0,1 | +0,5 | −1,4 | +1,2 | 29,6/33,3/37,0 | +0,04 |
| 2 | **fusion** | spann 36 + parti | **+1,9** | +0,2 | +3,8 | +0,5 | 29,6/37,0/37,0 | +0,20 |
| 4 | fusion-c | spann 24 + parti | +3,4 | −0,4 | +5,3 | +3,0 | 25,9/37,0/39,8 | +0,60 |
| 5 | sond/arkiv/S24-parti-baslosa | 4 + "aldrig under halva taktskalan" | +3,2 | −0,5 | +5,2 | +2,6 | 25,9/37,0/40,7 | +0,75 |

Domaren, fusion: `| 2 | fusion | +1.9 | +0.2 | +3.8 | +0.5 | 29.6 | 0.272 | 0.0 | 0.328 | 0.269 | 0.425 | 2.28 | -2.1 | -0.3/-0.5/-2.4 | 25 | - |`
basenergi.json: `finns true, gainDiff 0.0006, falt = bas, p05/p50/p95 0.512/0.799/0.972, tyst 0, slagDjup 0.247` (lägre slagDjup väntat: dalen är ute).
Bättre mot bas: slagK +1,9/+0,9/+1,9 %, djup +2,1/+2,3/+2,0 %, kontrast 1,84 → 2,01, ljusSteg 2,23 → 2,28, versen ('low' lang) slagK
0,369 → 0,416, djup 0,423 → 0,485. Sämre: jitter lang +3 %, t90 20 → 25 ms, ljus −2,1 %, lampspr megamix −2,4 %.

## Del – från vem – behölls/ströks – varför
| del | från | utfall | varför |
|---|---|---|---|
| taket i slag (16) + taktens skala (2) som dropläge | a3 | behölls | jitter pop/megamix −10/−9 % följer med (bänk 1), gainDiff 0,0006 |
| dalen på ett kvarts slag | a3 | ströks | ägarens krav: pulsens bredd är ljus; på effektsidan låst 0,25 s. Kostar slagK +3,7 → 0, ger takten −1,9 → ±0 (bänk 1) |
| rått fält, uttoning/topp i effekten | a1 | behölls | a1 bänk 1: uttoning i analysatorn = jitter +16 % |
| låtens referens → `bassLevel` + dämpning | a4 | behölls | +2,0 poäng (bänk 3 → 2: dynamik −1,4 → +3,8, betoning +1,1) |
| topp 0,95 / släpp 100 ms i mätningen, avläsning på kicken, `bassNow` | a4 | ströks | ljusval; ersatta av effektens `E_TOP`/uttoning, `B_PART_AT`, a3:s korta skala |
| percentiltak | a2 | ströks | sex bänkar (a2 ×4, a3 ×2): alltid plattare och sämre jitter; sonden: slagK −10 % |
| golv som står still (taktvinsten) | a2 | ströks | en dal inom slaget = ljusform, och bredare puls gav jitter +13 % |
| spann 24 dB | ny | ej leverans | +1,5 poäng, men baslösa partier släcks (megamix +1,6 pe; sond lang1107: 20 s mot 2 s) |
| "aldrig under halva taktskalan" | ny | ströks | bänk 5: lagade inte megamix, pop +0,8 pe (dalen åt upp lyftet) |

## Lotus
Lotus läser `frame.bassEnergy` som bastryckets nivå (egen dal/uttoning ovanpå, klockan sköter pulsen) och `frame.bassLevel` som
partiets styrka mot refrängen – nivåoberoende trots mic (bara dB-skillnader).

## Risken
- Poängen hänger på jittersteg (5 ms-kvantiserat: ett steg på lang ≈ ±1 poäng). Fusionens vinst ligger i dynamiken; på
  kontrollmängden (utan dynSet) räknas bara slagK/djup, så försprånget kan krympa.
- `B_PART_DIM 0,7` är inte sett i ögat: vers 6 dB under refrängen lyser 65 %. Hänger på analysatorns `high`-etikett.
- 24 dB-spannet (fusion-c): starkare bänk men mörk rigg tills frasens tak hunnit ner (upp till 16 slag). Ej bänkat: lyftet EFTER
  dalsteget (budgeten slut).
- Dalen stegas nu på renderns takt på ett fält som mäts per hop; a3/a1 hade den per hop.
- Sonden (`sond/sim.py`) räknar fältet exakt som TS (skillnad 0,0000) men förutsade jitter och ljusSteg dåligt.
- Vid inlägg: `src/ANALYSER_SHARED.md5` ska räknas om, lotus portas. Den inlagda a3 har kvar dalen i analysatorn.
- Redovisning: jag läste slocknat i de befintliga `bank-holdout.json` (a1/a3/a4) för riskbedömningen – inget kördes mot
  kontrollmängden. `domare.py --md` skrev över `ranking.md`; återställd till originalets innehåll (1048 byte), min kopia med
  fusionsraderna ligger i `fusion/ranking-med-fusion.md`.

## Diffen (`git diff --no-index src .arena/basenergi/fusion/src`)
fusion-c = samma diff med `BE_SPAN_DB = 24` och `B_MIN_SPAN = 0.25`.
```diff
diff --git a/src/analyser.ts b/.arena/basenergi/fusion/src/analyser.ts
index e1561d5..21377fa 100644
--- a/src/analyser.ts
+++ b/.arena/basenergi/fusion/src/analyser.ts
@@ -222,14 +222,19 @@ export interface Frame {
   specAbs: Spectrum;
   /** BASKROPPEN I RA dB (negativt tal, medel av sub+kick+bas), utan AGC - drop-detektorns kropp. */
   bodyDb: number;
-  /** BASENERGIN 0..1 (arenan basenergi 2026-11-11, EN mätning för båda systemen; förr DMX effects.ts bHi/bLo/eBass): bastrycket
-   *  (sub+kick i rå dB, vikt 0,25/0,75) mätt med SLAGET SOM TIDSENHET (klockans tempo; utan klocka 500 ms). 1 = så starkt som de
-   *  starkaste slagen på senare tid, 0 = basens dal (direkt ner, tillbaka på ett kvarts slag). TVÅ SKALOR, samma dal:
-   *  bassEnergy = mot FRASEN (toppen glöms på BE_TOP_BEATS slag: starka och svaga partier skiljs åt), bassEnergyShort = mot TAKTEN
-   *  (toppen glöms på BE_FAST_BEATS slag: varje slag mot sina närmaste grannar, ikapp två slag efter ett nivåbyte). bassEnergyShort >=
-   *  bassEnergy. Bara dB-skillnader: oberoende av ingångsnivån; 0 när ramen är tyst. Ren mätning - vilken skala ljuset följer, kurva,
-   *  uttoning och dropläge ligger i effekterna. Se bassEnergyStep. */
-  bassEnergy: number; bassEnergyShort: number;
+  /** BASENERGIN 0..1 (arenan basenergi 2026-11-11, EN mätning för båda systemen; förr DMX effects.ts bHi/bLo/eBass): basens NIVÅ
+   *  (sub+kick i rå dB, vikt 0,25/0,75) mot ett TAK, som dB-skillnad över ett fast spann: 1 = vid taket, 0 = BE_SPAN_DB eller mer
+   *  under det. Taket räknas med SLAGET SOM TIDSENHET (klockans tempo; utan klocka 500 ms). TVÅ SKALOR:
+   *  bassEnergy = mot FRASEN (taket = de starkaste slagen, glöms på BE_TOP_BEATS slag: starka och svaga partier skiljs åt),
+   *  bassEnergyShort = mot TAKTEN (glöms på BE_FAST_BEATS slag: varje slag mot sina närmaste grannar, ikapp två slag efter ett
+   *  nivåbyte). bassEnergyShort >= bassEnergy. Bara dB-skillnader: oberoende av ingångsnivån; 0 när ramen är tyst. Ren mätning:
+   *  ingen dal, ingen uttoning, ingen kurva - hur fort ljuset släpper efter ett slag (pulsens bredd), vilken skala det följer och
+   *  dropläget ligger i effekterna. Se bassEnergyStep.
+   *  bassLevel (0..1) = PARTIETS BASNIVÅ MOT LÅTENS REFERENS: frasens tak mot refrängens tak som amplitudkvot (6 dB under = 0,5),
+   *  så som levelVsHighDb mäter hela nivån mot refrängen. I refrängen (section 'high') ÄR frasens tak referensen (1); i vers, break
+   *  och uppbyggnad står referensen kvar som låtens minne (följer ett starkare tak direkt upp, glöms på BE_MEM_BEATS slag). Före
+   *  låtens första refräng är referensen det starkaste partiet hittills. Hur mycket ett svagare parti ska dämpas väljer konsumenten. */
+  bassEnergy: number; bassEnergyShort: number; bassLevel: number;
   /** ABSOLUT mid+diskant-niva i dB (band 3-7, >250 Hz), RMS-kombinerad, ingen AGC. */
   midHiDb: number;
   /** KICKENS STIGNING, OMÄTTAD (10-28, fynd 10-22/10-27): basens (specAbs sub+kick) stigning i dB mot KICK_RISE_HOPS hop sedan,
@@ -409,14 +414,15 @@ export class Analyser {
   private kickRiseDb = new Float64Array(Analyser.KICK_RISE_HOPS); private kickRisePos = 0;
   /** BASENERGIN MED SLAGET SOM TIDSENHET (frame.bassEnergy / bassEnergyShort). Alla tider räknas i SLAG ur klockans tempo (60000 / bpm,
    *  hållet inom BE_BEAT_MIN_MS..BE_BEAT_MAX_MS så ett halv-/dubbeltempo inte flyttar skalan långt; utan klocka BE_FALLBACK_MS):
-   *  TOPPEN följer basen direkt upp och glöms mot den på BE_TOP_BEATS slag (frasens skala) resp. BE_FAST_BEATS slag (taktens skala),
-   *  DALEN följer direkt ner och glider tillbaka på BE_LO_BEATS slag - varje bastryck mäts från sin egen dal, och hur fort skalan
-   *  hinner ikapp ett nivåbyte följer musikens tempo i stället för en klocka i sekunder. Minst BE_MIN_DB brett. Bara dB-SKILLNADER:
-   *  ingen tystnadsgrind och ingen absolut nivå i mätningen (oberoende av ingångsnivån). Fyra tal i tillstånd, inga objekt per hop.
+   *  TAKET följer basen direkt upp och glöms mot den på BE_TOP_BEATS slag (frasens skala) resp. BE_FAST_BEATS slag (taktens skala) -
+   *  hur fort skalan hinner ikapp ett nivåbyte följer musikens tempo i stället för en klocka i sekunder. Fältet = basens läge i ett
+   *  FAST spann BE_SPAN_DB under taket. Bara dB-SKILLNADER: ingen tystnadsgrind och ingen absolut nivå i mätningen (oberoende av
+   *  ingångsnivån). Fyra tal i tillstånd (beRef = låtens referens för frame.bassLevel), inga objekt per hop. INGEN DAL HÄR (ägaren 11-11: en dal som återhämtar sig inom slaget
+   *  bestämmer pulsens bredd = ljusstyrning) - den ligger i effects.ts stepEnergy och följer fältet, inte ljudet.
    *  (Provat och förkastat i arenan: toppen som kvantil/median av de 32 senaste slagtopparna - plattare ljus, sämre takt i bänken.) */
-  private static readonly BE_TOP_BEATS = 16; private static readonly BE_FAST_BEATS = 2; private static readonly BE_LO_BEATS = 0.25; private static readonly BE_MIN_DB = 6;
+  private static readonly BE_TOP_BEATS = 16; private static readonly BE_FAST_BEATS = 2; private static readonly BE_SPAN_DB = 36; private static readonly BE_MEM_BEATS = 240;
   private static readonly BE_BEAT_MIN_MS = 300; private static readonly BE_BEAT_MAX_MS = 600; private static readonly BE_FALLBACK_MS = 500;
-  private beHi = NaN; private beHiShort = NaN; private beLo = NaN; private beShort = 0;
+  private beHi = NaN; private beHiShort = NaN; private beRef = NaN; private beShort = 0;
   /** Stegar skalorna ett hop; returnerar frasens värde, taktens ligger i beShort. */
   private bassEnergyStep(sub: number, kick: number): number {
     const x = 5 * Math.log10(sub + 1e-7) + 15 * Math.log10(kick + 1e-7), hopMs = this.dtHop * 1000;   // 0,25 x sub dB + 0,75 x kick dB
@@ -424,12 +430,11 @@ export class Analyser {
     per = per < Analyser.BE_BEAT_MIN_MS ? Analyser.BE_BEAT_MIN_MS : per > Analyser.BE_BEAT_MAX_MS ? Analyser.BE_BEAT_MAX_MS : per;
     this.beHi = !(x <= this.beHi) ? x : this.beHi + (x - this.beHi) * (hopMs / (Analyser.BE_TOP_BEATS * per));
     this.beHiShort = !(x <= this.beHiShort) ? x : this.beHiShort + (x - this.beHiShort) * (hopMs / (Analyser.BE_FAST_BEATS * per));
-    this.beLo = !(x >= this.beLo) ? x : this.beLo + (x - this.beLo) * (hopMs / (Analyser.BE_LO_BEATS * per));
-    const lo = this.beLo, m = Analyser.BE_MIN_DB;
-    let span = this.beHiShort - lo > m ? this.beHiShort - lo : m, e = (x - (this.beHiShort - span)) / span;
-    this.beShort = e > 0 ? (e < 1 ? e : 1) : 0;
-    span = this.beHi - lo > m ? this.beHi - lo : m; e = (x - (this.beHi - span)) / span;
-    return e > 0 ? (e < 1 ? e : 1) : 0;
+    this.beRef = this.section === 'high' || !(this.beHi <= this.beRef) ? this.beHi : this.beRef + (this.beHi - this.beRef) * (hopMs / (Analyser.BE_MEM_BEATS * per));   // låtens referens = refrängens tak
+    let e = 1 - (this.beHiShort - x) / Analyser.BE_SPAN_DB;
+    this.beShort = e > 0 ? e : 0;
+    e = 1 - (this.beHi - x) / Analyser.BE_SPAN_DB;
+    return e > 0 ? e : 0;
   }
 
   private bigCounter = 0;                  // decimering av 2048-FFT:n (se BIG_EVERY)
@@ -2039,7 +2044,7 @@ export class Analyser {
     this.outFrame = {
       silent: true, level: 0, levelRaw: 0, levelVU: 0, energy: 0, centroid: 0, flux: 0,
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
-      dropCount: 0, miniDropCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, midHiDb: -120, kickRise: 0, inZone: false, breaking: false, buildUp: 0, inRiser: false, profile: this.outProfile, beatAnchorMs: 0,
+      dropCount: 0, miniDropCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, bassLevel: 1, midHiDb: -120, kickRise: 0, inZone: false, breaking: false, buildUp: 0, inRiser: false, profile: this.outProfile, beatAnchorMs: 0,
       kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
       spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
     };
@@ -3095,7 +3100,7 @@ export class Analyser {
     f.energy = this.engSmooth;
     f.centroid = this.centSmooth; f.flux = fluxNorm; f.kick = kick; f.gain = this.gain;
     f.bpm = this.localBpm; f.bpmConfidence = this.localBpmConfidence; f.intensity = intensity; f.beatAnchorMs = this.beatAnchorMs;
-    f.bodyDb = bodyNow; { const be = this.bassEnergyStep(A[0], A[1]); f.bassEnergy = f.silent ? 0 : be; f.bassEnergyShort = f.silent ? 0 : this.beShort; }
+    f.bodyDb = bodyNow; { const be = this.bassEnergyStep(A[0], A[1]); f.bassEnergy = f.silent ? 0 : be; f.bassEnergyShort = f.silent ? 0 : this.beShort; f.bassLevel = Math.pow(10, (this.beHi - this.beRef) / 20); }
     {   // kickRise: basens dB mot KICK_RISE_HOPS hop sedan (ringen håller de senaste), halvvåg
       const db = 20 * Math.log10(A[0] + A[1] + 1e-7), old = this.kickRiseDb[this.kickRisePos];
       this.kickRiseDb[this.kickRisePos] = db; this.kickRisePos = (this.kickRisePos + 1) % Analyser.KICK_RISE_HOPS;
diff --git a/src/effects/types.ts b/.arena/basenergi/fusion/src/effects/types.ts
index 1b1d08d..9f7b82b 100644
--- a/src/effects/types.ts
+++ b/.arena/basenergi/fusion/src/effects/types.ts
@@ -78,7 +78,7 @@ export interface EffectContext {
   bassline: number; bassNoteIdx: number; bassNoteAge: number;
   /** Kick-/beat-envelope (0..1). */
   kickEnv: number;
-  /** BASGÅNGEN SJÄLV (arenan puls1 2026-11-07): energilagrets baskropp (eBass = analysatorns frame.bassEnergy, i dropläget bassEnergyShort, efter E_TOP och uttoning: 0 = basens senaste dal,
+  /** BASGÅNGEN SJÄLV (arenan puls1 2026-11-07): energilagrets baskropp (eBass = analysatorns frame.bassEnergy, i dropläget bassEnergyShort, mätt från pulsens dal, efter E_TOP och uttoning: 0 = basens senaste dal,
    *  1 = toppen). Med DMX_BASGANG=1 tar de mest spelade effekterna slagets STYRKA härifrån och rutnätet bara VEM som tänds. */
   bassBody: number;
   /** GLITTER-ENVELOPER (2026-10-10): diskant- (hi-hat/cymbal) och luftanslaget (frame.onset.treble/air) med direkt uppgang och
diff --git a/src/effects.ts b/.arena/basenergi/fusion/src/effects.ts
index f31fb28..0c51baa 100644
--- a/src/effects.ts
+++ b/.arena/basenergi/fusion/src/effects.ts
@@ -408,14 +408,21 @@ const E_TOP = Math.max(0.5, Math.min(1, 0.95));   // 1 -> 0,95 (ladan 10-09, sta
 /** BASENERGIN (ägaren 10-12: "följa basgången mer än diskant. Samma känsla som man får i magen av en sub vill jag ha i ögonen av ljuset.
  *  De får gärna svänga mycket, bara att sänka taket beroende på var i låten man är" + "kör inte energilagret på två ställen - då dämpas
  *  allt bara"). MÄTNINGEN LIGGER I ANALYSATORN sedan arenan basenergi 11-11 (frame.bassEnergy/bassEnergyShort: bastrycket med slaget som tidsenhet;
- *  analyser.ts bassEnergyStep) - här bara E_TOP, uttoningen och kurvan. Förr ett eget fönster här: topp direkt upp, glider ner på E_WIN_S; dal
+ *  analyser.ts bassEnergyStep = basens nivå mot frasens/taktens tak över ett fast dB-spann) - här LJUSETS FORM: pulsens dal (B_LO_S,
+ *  B_MIN_SPAN: följer FÄLTET direkt ner och är tillbaka på B_LO_S, så varje bastryck svänger från sin egen dal - hur fort ljuset släpper
+ *  efter ett slag; fade-down låst: aldrig under 0,25 s), E_TOP, uttoningen och kurvan. Förr ett eget fönster här: topp direkt upp, glider ner på E_WIN_S; dal
  *  direkt ner, glider upp på B_LO_S (1 s) - energin följer bastrycken och basgången över hela skalan i stället för att parkera högt i en
  *  tät refräng. Minst B_MIN_DB brett, E_TOP, upp direkt / ner E_RELEASE_MS (uttoningen som förr), upphöjd till B_CURVE (3; förr E_CURVE
  *  10 = nästan av/på). Golvet = "Lägsta nivå" (cfg.energyFloor). Sektionen sätter bara TAKET (secCeil), effekten mönstret, drops och
  *  minidrops lyfter. ERSATTE (bänk tools/energiMatt.mjs, 23 ladan-filer): konsertgolvet 0,4, refränggolvet 0,8, buildladdningen och
  *  TIER_OPEN (golv som gjorde energin verkningslös), taktdippen KICK_E/KICK_E_HIGH på kickEnv (dubbel kickmodulering ovanpå effektens
  *  egen c.heart), SPOT-regeln och UNIFORM:s ovalda par (förbivägar runt energin). */
-const B_CURVE = 3;   // (fönstret - B_MIN_DB, B_LO_S, sub/kick-vikten - ligger i analysatorn sedan arenan basenergi 11-11: frame.bassEnergy)
+const B_CURVE = 3, B_LO_S = 0.25, B_MIN_SPAN = 1 / 6;   // pulsens dal på fältet: tillbaka på 0,25 s (ladan 11-07: godkänt; aldrig kortare), minst en sjättedel av fältets skala (= förr 6 dB)
+/** PARTIET DÄMPAR NIVÅN (arenan basenergi 11-11, a4:s del i fusionen; ägaren 10-12: "sänka taket beroende på var i låten man är"):
+ *  analysatorn mäter frame.bassLevel = partiets bastak mot refrängens (1 i refrängen, 0,5 = 6 dB under). Ljuset x (1 - B_PART_DIM x
+ *  (1 - bassLevel)): en vers med svagare bas lyser svagare med samma relativa slag. 0 = varje parti fyller skalan (som förr). Nivån
+ *  byts bara MELLAN pulserna (eBass under B_PART_AT) - ett byte mitt i en puls flyttar ljusets topp. Dropläget dämpar inte. */
+const B_PART_DIM = 0.7, B_PART_AT = 0.5;
 /** PROVRATTAR 2026-11-07 (dagkörningen med flera agenter; ägaren: 'kan man få takten att följa själva basrytmen bättre (energilagret)' och
  *  'efter drop räkna med att det är refräng så taket är 95 %, men golvet 70 % dödar bara dynamiken'). Bara för bänken: osatt = dagens
  *  värde och dagens uttryck (json-identiskt). Det som bevisar sig byggs in som standard och ratten tas bort (ägarens regel: inga flaggor).
@@ -593,7 +600,7 @@ export class EffectEngine {
   private dropColEnv = 0;        // BARA full drop: dropfarg + vit karna (minidrop/nastan-drop lyfter bara ljusstyrkan)
   private lastLiveSection = '';   // DMX_SECTION_SWITCH
   dropCalmDenied = 0; dropFalse = 0; private dropCheckAt = 0; private preDropLevel = 0; private preDropTier = 0;
-  private eSm = 0; eSimple = 0; private eBass = 0; private eHi = NaN; private eLo = NaN; private fxPeak = 0; private fxPeakNow = 0; private fxNorm = 1; private spreadM0 = new Float64Array(64);   // ENERGIN (se E_WIN_S); spreadM0 = BASGANG
+  private eSm = 0; eSimple = 0; private eBass = 0; private bLo = 0; private bPart = 1; private eHi = NaN; private eLo = NaN; private fxPeak = 0; private fxPeakNow = 0; private fxNorm = 1; private spreadM0 = new Float64Array(64);   // ENERGIN (se E_WIN_S); spreadM0 = BASGANG
   private trebleEnv = 0; private airEnv = 0; private punchEnv = 0; private belowSince = 0;   // glitter-enveloper (ctx.trebleEnv/airEnv)
   private glH = new Float32Array(64); private glV = new Float32Array(64); private glOn = new Uint8Array(64);   // KULÖRTONING per lampa (visad kulör, förra ljuset)
   private lampLvl = new Float32Array(64); private lampPeakAt = new Float64Array(64); private chOnAt = new Float64Array(192); private lampRatio = new Float32Array(192);   // STEG 2: uttoningen per lampa (ljusstyrka + senaste kulor)
@@ -1329,20 +1336,27 @@ export class EffectEngine {
       this.eSm = e > this.eSm ? e : this.eSm + (e - this.eSm) * (1 - Math.exp(-dtSec * 1000 / E_RELEASE_MS));
       // (volymfönstret ovan - eSm - styr inte ljuset längre, bara dropens efterkontroll (DROP_LAND_GAIN); orört så dropsen är desamma)
       // BASENERGIN (se B_CURVE): analysatorn MÄTER (frame.bassEnergy mot frasen, frame.bassEnergyShort mot takten) - här bara vilken skala
-      // ljuset följer och ljusets form (topp, uttoning, kurva, lyft). DROPLÄGET (se DROP_LIFT_MS): medan dropens lyft bär följer ljuset
+      // ljuset följer och ljusets form (pulsens dal, topp, uttoning, kurva, lyft). DROPLÄGET (se DROP_LIFT_MS): medan dropens lyft bär följer ljuset
       // TAKTENS skala (varje slag fullt mot sina grannar; ladan 11-07: "energin efter drop dör fort" -> "känns bra nu") och glider
       // tillbaka till frasens på DROP_LIFT_FALL_MS. Förr bytte dropen mätfönstrets längd här (10 s -> 1 s).
       const dropLeft = this.dropLiftUntil - nowWall, inDropLift = dropLeft > -DROP_LIFT_FALL_MS;   // PROV DMX_DROP_TOP
+      const dropW = !inDropLift ? 0 : dropLeft >= 0 ? 1 : 1 + dropLeft / DROP_LIFT_FALL_MS;   // DROPLÄGET: 1 medan lyftet bär, tonar ut med fallet
       let eb = frame.bassEnergy ?? 0;
-      if (inDropLift) eb += ((frame.bassEnergyShort ?? eb) - eb) * (dropLeft >= 0 ? 1 : 1 + dropLeft / DROP_LIFT_FALL_MS);
+      if (inDropLift) eb += ((frame.bassEnergyShort ?? eb) - eb) * dropW;
+      // PULSENS DAL (ljusform, se B_LO_S): dalen följer fältet direkt ner och är tillbaka på B_LO_S - ljuset visar hur långt över sin
+      // senaste dal basen är, så varje bastryck svänger över skalan och släpper när basen ligger kvar.
+      this.bLo = eb < this.bLo ? eb : this.bLo + (eb - this.bLo) * Math.min(1, dtSec / B_LO_S);
+      { const sp = 1 - this.bLo > B_MIN_SPAN ? 1 - this.bLo : B_MIN_SPAN; eb = 1 - (1 - eb) / sp; if (!(eb > 0)) eb = 0; }
       const bTop = inDropLift && PD_TOP > 0 ? PD_TOP : PB_TOP > 0 ? PB_TOP : E_TOP, bRel = PB_RELEASE_MS > E_RELEASE_MS ? PB_RELEASE_MS : E_RELEASE_MS;
       if (bTop < 1) eb = eb >= bTop ? 1 : eb / bTop;   // ENERGINS TOPP (se E_TOP)
       this.eBass = eb > this.eBass ? eb : this.eBass + (eb - this.eBass) * (1 - Math.exp(-dtSec * 1000 / bRel));   // upp direkt, ner E_RELEASE_MS (som förr)
       this.eSimple = this.eBass;
+      if (this.eBass < B_PART_AT) this.bPart = frame.bassLevel ?? 1;   // PARTIET (se B_PART_DIM): byts bara mellan pulserna
+      const part = 1 - B_PART_DIM * (1 - this.bPart) * (1 - dropW);
       const eFloor = Math.max(0, Math.min(0.5, this.cfg.energyFloor ?? 0.2));   // "Lägsta nivå" i /setup
       let lift = this.dropEnv;   // DROPS OCH MINIDROPS LYFTER (se DROP_LIFT_MS / MINI_LIFT_MS): energin släpper helt och glider tillbaka
       if (nowWall < this.miniLiftUntil + MINI_LIFT_FALL_MS) { const left = this.miniLiftUntil - nowWall; lift = Math.max(lift, PM_LIFT_FLOOR === 1 ? (left >= 0 ? 1 : 1 + left / MINI_LIFT_FALL_MS) : PM_LIFT_FLOOR * (left >= 0 ? 1 : 1 + left / MINI_LIFT_FALL_MS)); }
-      md = drive * Math.min(1, Math.max(eFloor + (1 - eFloor) * Math.pow(this.eBass, PB_CURVE), lift));   // bara dampning: aldrig over 1
+      md = drive * Math.min(1, Math.max(part * (eFloor + (1 - eFloor) * Math.pow(this.eBass, PB_CURVE)), lift));   // bara dampning: aldrig over 1
       // ENERGIN I DMX-PROCENT (se E_LIN): md är andelen av lampans ljus - output.ts lampLevel gör den till nivå per lampa (renderLamps)
     }
     this.rMd = md;
```
