# a2 – percentiler i stället för topp och dal

## Idén
`frame.bassEnergy` är var basens dB (sub 0,25 + kick 0,75, samma storhet som i dag) ligger mellan två percentiler ur ett glidande
histogram: taket = P95 över de senaste 3 s, golvet = P25 över de senaste 0,35 s (minst 6 dB under taket). Ett enskilt hop kan inte
sätta skalan, och eftersom alla hop går in i histogrammet (även tysta) är mätningen i praktiken oberoende av ingångsnivån.

## Var snittet går
- ANALYSATORN (`analyser.ts`): klassen `DbPercentile` (histogram 0,25 dB-fack, O(1) per hop, ingen allokering), en ring med 3 s
  hop, och fältet i `fillFrame()` – snabba vägen, samma hop som `specAbs`. Ingen kurva, ingen uttoning, inget som startas av en drop.
  Tyst ram = 0 (ramens egen tystnadsgräns).
- EFFEKTSIDAN (`effects.ts`): `bHi/bLo`, `PB_*`/`PD_*`-rattarna och droplägets fönsterbyte är borta. Kvar: uttoningen (upp direkt, ner
  100 ms), kurvan 3, golvet, och dropens/minidropens lyft. `md`, `ctx.bassBody` och lampspridningen läser fältet via `eBass`.
- EFTER EN DROP finns inget eget läge för nivån: taket flyttas inte av smällen och har glömt partiet före på 3 s. Offline
  (fältet^3, 0–8 s efter bänkens fyra drops): 0,30/0,24/0,17/0,21 mot dagens dropläge 0,41/0,27/0,16/0,22.

## Siffrorna
Domaren: `| a2 | -4,4 | takt +4,4 | dynamik -6,2 | koreografi -7,2 | jitter 32,4 | betoning 0,263 | rA 0,349 | rK 0,291 | slagK 0,412
| ljusSteg 1,93 | ljus +1,3 % | lampspr +5,5/+1,6/+0,7 | t90 10 | OK |`

basenergi.json: `finns true, gainDiff 0,0017 (följaren 0,014), falt = bas, p05/p50/p95 0/0,27/1, tyst 0, slagDjup 0,735 (0,36)`.

BÄTTRE: takten (rA 0,329 -> 0,349, rK 0,271 -> 0,291), t90 20 -> 10 ms, lampspridningen, nivåoberoendet.
SÄMRE: dynamiken över längre tid – ljusSteg 2,23 -> 1,93 och kontrast 1,84 -> 1,67 (3 s-taket normerar bort vers mot refräng) – och
jittret 28,7 -> 32,4 / 37,0 -> 40,7 / 40,7 -> 48,1 ms. slagK, djup och betoning ungefär oförändrade (-1 %).

De fyra bänkningarna:

| bänk | tak / golv / övrigt | poäng | takt | dynamik | koreografi | släckt rigg |
|---|---|---|---|---|---|---|
| 1 | P90 10 s / P5 0,5 s / kurva 5 | -3,1 | +0,8 | -1,8 | -7,1 | +2,6 pe DISK |
| 2 | P95 10 s / P25 0,35 s | -0,8 | +3,7 | +1,8 | -6,8 | +1,4 pe DISK |
| 3 | som 2 + dropläge på effektsidan (fältet mot sin egen topp 1 s) | -1,7 | +1,7 | +1,3 | -7,4 | +1,1 pe DISK |
| 4 | P95 3 s / P25 0,35 s (levererad) | -4,4 | +4,4 | -6,2 | -7,2 | +0,2 pe OK |

Vad det säger om kortet:
- Efter-drop-problemet i själva basen försvinner av sig självt i tre av fyra drops (bänk 2 offline: 0,40/0,19/0,15/0,25; pop lägre). Det som inte försvinner är att
  dagens dropläge också tänder BASLÖSA luckor: megamix 41,5–42,5 s läser dagens fönster 0,38–0,89 med basen 27 dB under taket. Det
  räknar domaren som släckt rigg hos mig.
- Fönsterlängden är en ren avvägning: 10 s ger bäst dynamik men släckt rigg, 3 s tvärtom. 5–6 s är inte bänkat.
- Jittret är detsamma i alla fyra (lang 32–33 ms) oavsett percentil, kurva och dropläge, och ljuset korrelerar 5–15 ms senare mot
  basen (rAlag lang 55 -> 60–70, pop 80 -> 85–90, megamix 65 -> 75). Min tolkning, inte bevisad: följarens dal kryper upp under slaget och kapar pulsen direkt efter ansatsen,
  percentilgolvet står still. Förslag till fusionen: percentiltaket + krypande golv.

## Lotus
Lotus kan läsa `frame.bassEnergy` rakt av som slagets styrka i den klockstyrda pulsen – micens nivå spelar ingen roll (gainDiff 0,002).

## Risken
- Versen blir lika ljus som refrängen efter 3 s; i ladan kan det se plattare ut över en hel låt än bänken visar.
- Efter en drop med baslös lucka blir det mörkare än i dag (ägarens "energin efter drop dör fort").
- Efter en paus längre än 3 s fyller svag bas hela skalan tills musiken kommit igång.
- `ANALYSER_SHARED.md5` måste skrivas om och lotus portas. Volymfönstret `eSm` (dropens efterkontroll) är orört.

## Diffen
`git diff --no-index src .arena/basenergi/a2/src` (från engine/):

```diff
diff --git a/src/analyser.ts b/.arena/basenergi/a2/src/analyser.ts
index cefd9a8..a6a9ae7 100644
--- a/src/analyser.ts
+++ b/.arena/basenergi/a2/src/analyser.ts
@@ -228,6 +228,10 @@ export interface Frame {
    *  halvvåg (0 vid fall). onset.kick är klampad 0/1 och står på 1 under hela bas-svallet; det här fältet toppar på ansatsen.
    *  Samma tal som DMX:s FEED_RISE-vikning räknar själv (beatFeed.ts). Bara utdata: ingen konsument i analysatorn läser det. */
   kickRise: number;
+  /** BASENERGIN 0..1 (arenan basenergi 11-11): var basen (sub+kick i dB) ligger mellan sitt GOLV och sitt TAK just nu - måttet ljusets
+   *  nivå följer. Mätt mot percentiler ur ett glidande histogram (se Analyser.BE_*), oberoende av ingångsnivån. Bara mätning: ingen
+   *  kurva, ingen uttoning, inget dropläge - det väljer effektsidan. */
+  bassEnergy: number;
   onset: Spectrum;      // per-band ONSET/anslag (halvvågs-flux mot adaptiv baslinje, 0..1)
   /** TRUM-KIT-envelopes (0..1): peak-hold + decay PÅ HOP-TAKT (375Hz) → fångar
    *  varje anslag, aldrig missat mellan två render-frames. kick=diskret kick +
@@ -343,7 +347,34 @@ function stabiliseNumbers(o: object): void {
   for (const k of Object.keys(r)) { const v = r[k]; if (typeof v === 'number') { r[k] = 0.5; r[k] = v; } }
 }
 
+/** GLIDANDE PERCENTIL ur ett histogram över dB-fack (BE_BIN_DB breda från BE_DB0): add/del flyttar ett prov in/ut ur fönstret, db() ger
+ *  percentilen. Pekaren idx (fack) och below (prov under facket) följer rangen q*(n-1) - O(1) per hop, ingen sortering, ingen allokering. */
+const BE_BIN_DB = 0.25, BE_DB0 = -100, BE_BINS = 720;   // -100..+80 dB
+class DbPercentile {
+  private cnt = new Uint16Array(BE_BINS); private idx = 0; private below = 0; n = 0;
+  constructor(private q: number) {}
+  add(b: number): void { this.cnt[b]++; this.n++; if (b < this.idx) this.below++; }
+  del(b: number): void { this.cnt[b]--; this.n--; if (b < this.idx) this.below--; }
+  db(): number {   // kräver n >= 1
+    const c = this.cnt, r = Math.floor(this.q * (this.n - 1));
+    while (this.below > r) this.below -= c[--this.idx];
+    while (this.below + c[this.idx] <= r) this.below += c[this.idx++];
+    return BE_DB0 + (this.idx + (r - this.below + 0.5) / c[this.idx]) * BE_BIN_DB;   // provets plats inom facket efter rang
+  }
+}
+
 export class Analyser {
+  /** BASENERGIN (frame.bassEnergy, arenan basenergi 11-11, a2: PERCENTILER I STÄLLET FÖR TOPP OCH DAL). Basens dB per hop (sub 0,25 +
+   *  kick 0,75 - samma storhet DMX:s fönster mätte) mot två percentiler ur ett glidande histogram: TAKET = P95 över de senaste BE_LONG_S,
+   *  GOLVET = P25 över de senaste BE_SHORT_S (dalen före slaget; stiger när basen ligger kvar), minst BE_MIN_DB under taket. En topp-/
+   *  dalföljare låter ETT hop sätta skalan (dropens smäll satte taket i 10 s); en percentil flyttas först när musiken har ändrats i en
+   *  mätbar andel av fönstret - en smäll kortare än 0,15 s flyttar inte taket, ett starkare parti gör det efter 0,15 s och ett svagare
+   *  har hela skalan efter 3 s. ALLA hop går in i histogrammen (även tysta): en paus kortare än fönstret flyttar inte P95, och mätningen
+   *  blir oberoende av var släckgränsen råkar ligga mot ingångsnivån (gainDiff 0,002 mot 0,014 för följaren). Tyst ram = 0.
+   *  BE_LONG_S 10 -> 3 (bänk 2 -> 4): med 10 s mättes en vers 9,5 s mot refrängens tak (släckt rigg +1,4 procentenheter). */
+  private static readonly BE_LONG_S = 3; private static readonly BE_SHORT_S = 0.35; private static readonly BE_MIN_DB = 6;
+  private beRing!: Uint16Array; private beShortN = 0; private bePos = 0;
+  private beHi = new DbPercentile(0.95); private beLo = new DbPercentile(0.25);
   private fft: FFT;
   private window: Float32Array;
   private buffer: Float32Array;      // sliding FFT window
@@ -1988,6 +2019,7 @@ export class Analyser {
     const dtHop = cfg.fft.hop / cfg.audio.rate;
     this.dtHop = dtHop;
     this.hopMs = dtHop * 1000;
+    this.beRing = new Uint16Array(Math.round(Analyser.BE_LONG_S / dtHop)); this.beShortN = Math.round(Analyser.BE_SHORT_S / dtHop);
     const bigDt = dtHop * Analyser.BIG_EVERY;
 
     this.aAtt = 1 - Math.exp(-dtHop / 0.015);
@@ -2006,7 +2038,7 @@ export class Analyser {
     this.outFrame = {
       silent: true, level: 0, levelRaw: 0, levelVU: 0, energy: 0, centroid: 0, flux: 0,
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
-      dropCount: 0, miniDropCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, midHiDb: -120, kickRise: 0, inZone: false, breaking: false, buildUp: 0, inRiser: false, profile: this.outProfile, beatAnchorMs: 0,
+      dropCount: 0, miniDropCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, midHiDb: -120, kickRise: 0, bassEnergy: 0, inZone: false, breaking: false, buildUp: 0, inRiser: false, profile: this.outProfile, beatAnchorMs: 0,
       kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
       spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
     };
@@ -3068,6 +3100,15 @@ export class Analyser {
       this.kickRiseDb[this.kickRisePos] = db; this.kickRisePos = (this.kickRisePos + 1) % Analyser.KICK_RISE_HOPS;
       f.kickRise = old !== 0 && db > old ? db - old : 0;
     }
+    {   // BASENERGIN (se BE_LONG_S): basens dB mot histogrammets tak (P90, långa fönstret) och golv (P5, korta fönstret)
+      const bdb = 5 * Math.log10(A[0] + 1e-7) + 15 * Math.log10(A[1] + 1e-7), hi = this.beHi, lo = this.beLo, ring = this.beRing, N = ring.length, SN = this.beShortN;
+      let b = ((bdb - BE_DB0) / BE_BIN_DB) | 0; b = b < 0 ? 0 : b >= BE_BINS ? BE_BINS - 1 : b;
+      if (hi.n === N) hi.del(ring[this.bePos]);                       // äldsta hoppet ur långa fönstret
+      if (lo.n === SN) lo.del(ring[(this.bePos - SN + N) % N]);       // och ur korta (samma ring, SN hop bakåt)
+      ring[this.bePos] = b; this.bePos = (this.bePos + 1) % N; hi.add(b); lo.add(b);
+      const top = hi.db(), floor = Math.min(lo.db(), top - Analyser.BE_MIN_DB), v = (bdb - floor) / (top - floor);
+      f.bassEnergy = f.silent || v < 0 ? 0 : v > 1 ? 1 : v;           // tyst = ingen basenergi (ramens EN tystnadsgräns)
+    }
     { let s2 = 1e-12; for (let b = 3; b < 8; b++) { const lin = Math.pow(10, (FB ? this.fbDbRaw : this.bandDbRaw)[b] / 20); s2 += lin * lin; } f.midHiDb = 20 * Math.log10(Math.sqrt(s2)); }
     f.dropCount = this.dropCount; f.miniDropCount = this.miniDropCount; f.dropDemoted = this.dropDemoted; f.dropSpaced = this.dropSpaced; f.dropRiseDb = this.dropRiseDb;
     f.nearDropDb = this.nearDropDb; f.nearDipDb = this.nearDipDb; f.liftDb = this.liftDb; f.stopCount = this.stopCount; f.stopS = this.stopS; f.inZone = inZone; f.breaking = breaking; f.buildUp = this.buildUp; f.inRiser = inRiser;
diff --git a/src/effects.ts b/.arena/basenergi/a2/src/effects.ts
index 70df38c..e5bdd6a 100644
--- a/src/effects.ts
+++ b/.arena/basenergi/a2/src/effects.ts
@@ -407,26 +407,17 @@ const FX_FLOOR = 0.6;   // 0 -> 0,6 (ladan 10-09, standard 10-10)
 const E_TOP = Math.max(0.5, Math.min(1, 0.95));   // 1 -> 0,95 (ladan 10-09, standard 10-10)
 /** BASENERGIN (ägaren 10-12: "följa basgången mer än diskant. Samma känsla som man får i magen av en sub vill jag ha i ögonen av ljuset.
  *  De får gärna svänga mycket, bara att sänka taket beroende på var i låten man är" + "kör inte energilagret på två ställen - då dämpas
- *  allt bara"). EN energi ur baskroppen (frame.bodyDb) i stället för volymen (levelVU): topp direkt upp, glider ner på E_WIN_S; dal
- *  direkt ner, glider upp på B_LO_S (1 s) - energin följer bastrycken och basgången över hela skalan i stället för att parkera högt i en
- *  tät refräng. Minst B_MIN_DB brett, E_TOP, upp direkt / ner E_RELEASE_MS (uttoningen som förr), upphöjd till B_CURVE (3; förr E_CURVE
- *  10 = nästan av/på). Golvet = "Lägsta nivå" (cfg.energyFloor). Sektionen sätter bara TAKET (secCeil), effekten mönstret, drops och
- *  minidrops lyfter. ERSATTE (bänk tools/energiMatt.mjs, 23 ladan-filer): konsertgolvet 0,4, refränggolvet 0,8, buildladdningen och
- *  TIER_OPEN (golv som gjorde energin verkningslös), taktdippen KICK_E/KICK_E_HIGH på kickEnv (dubbel kickmodulering ovanpå effektens
- *  egen c.heart), SPOT-regeln och UNIFORM:s ovalda par (förbivägar runt energin). */
-const B_CURVE = 3, B_MIN_DB = 6, B_LO_S = 0.25;   // B_LO_S 1 -> 0,25 (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108))
-/** PROVRATTAR 2026-11-07 (dagkörningen med flera agenter; ägaren: 'kan man få takten att följa själva basrytmen bättre (energilagret)' och
- *  'efter drop räkna med att det är refräng så taket är 95 %, men golvet 70 % dödar bara dynamiken'). Bara för bänken: osatt = dagens
- *  värde och dagens uttryck (json-identiskt). Det som bevisar sig byggs in som standard och ratten tas bort (ägarens regel: inga flaggor).
- *  DMX_B_LO_S/B_CURVE/B_MIN_DB/B_WIN_S/B_TOP/B_RELEASE_MS = basfönstrets dal/kurva/minsta bredd/toppens fall/topp/uttoning (aldrig under
- *  E_RELEASE_MS: fade-down låst), DMX_B_SUBW = subbandets vikt mot kickbandet (0,5 = medel som i dag); DMX_DROP_WIN_S/DROP_TOP = toppens
- *  fall och E_TOP medan dropens lyft pågår (basfönstret ankras om på refrängen i stället för ett golv); DMX_MINI_LIFT_FLOOR = minidropens
- *  lyft som golv (1 = som i dag). */
+ *  allt bara"). EN energi ur basen. MÄTNINGEN LIGGER I ANALYSATORN sedan 11-11 (ägaren: "analysatorn skall ju enbart analysera inte
+ *  styra hur lamporna lyser"): frame.bassEnergy = basens dB mellan sitt golv (P25 över 0,35 s) och sitt tak (P95 över 3 s) ur ett
+ *  glidande histogram (analyser.ts BE_*). HÄR bara ljusstyrningen: upp direkt / ner E_RELEASE_MS (uttoningen som förr), upphöjd till
+ *  B_CURVE (3, som förr), golvet = "Lägsta nivå" (cfg.energyFloor). Sektionen sätter bara TAKET (secCeil), effekten mönstret, drops och
+ *  minidrops lyfter (dropEnv/minilyftet - ljusstyrning, kvar här). ERSATTE 11-11: följande fönstret bHi/bLo (topp direkt upp/10 s ner,
+ *  dal direkt ner/0,25 s upp, E_TOP) och dess DROPLÄGE (toppen 10 -> 1 s medan dropens lyft bar, DMX_DROP_WIN_S): percentiltaket flyttas
+ *  inte av dropens smäll och har glömt partiet före på 3 s, så nivån efter en drop behöver inget eget läge på effektsidan. */
+const B_CURVE = 3;
 const envN = (k: string, d: number): number => { const v = process.env[k]; return v === undefined || v === '' ? d : Number(v); };
-const PB_LO_S = envN('DMX_B_LO_S', B_LO_S), PB_CURVE = envN('DMX_B_CURVE', B_CURVE), PB_MIN_DB = envN('DMX_B_MIN_DB', B_MIN_DB);
-const PB_WIN_S = envN('DMX_B_WIN_S', 0), PB_TOP = envN('DMX_B_TOP', 0), PB_RELEASE_MS = envN('DMX_B_RELEASE_MS', 0), PB_SUBW = envN('DMX_B_SUBW', 0.25);   // 0,5 -> 0,25 (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108))
-const PD_WIN_S = envN('DMX_DROP_WIN_S', 1),   // 0 -> 1 (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108))
-      PD_TOP = envN('DMX_DROP_TOP', 0), PM_LIFT_FLOOR = envN('DMX_MINI_LIFT_FLOOR', 1);
+const PB_CURVE = envN('DMX_B_CURVE', B_CURVE), PM_LIFT_FLOOR = envN('DMX_MINI_LIFT_FLOOR', 1);   // bänkrattar: kurvan, minidropens lyft som golv (1 = som i dag)
+
 /** BASENERGIN BARA SUB+KICK (opt-in DMX_BASS_SUBKICK=1, porterat från lotus 10-15: ägaren i källaren 'känns dock som att den följer inte bara
  *  bas' med baskroppen 20-250 Hz, 'känns bättre' med sub+kick 20-120 Hz). Basenergins källa = medel av sub- och kickbandets rå dB ur
  *  frame.specAbs (samma bandmedel som bodyDb, utan bandet 120-250 Hz där röstens grundton och virvelns kropp ligger). Flank-dropen läser
@@ -594,7 +585,7 @@ export class EffectEngine {
   private dropColEnv = 0;        // BARA full drop: dropfarg + vit karna (minidrop/nastan-drop lyfter bara ljusstyrkan)
   private lastLiveSection = '';   // DMX_SECTION_SWITCH
   dropCalmDenied = 0; dropFalse = 0; private dropCheckAt = 0; private preDropLevel = 0; private preDropTier = 0;
-  private eSm = 0; eSimple = 0; private eBass = 0; private bHi = NaN; private bLo = NaN; private eHi = NaN; private eLo = NaN; private fxPeak = 0; private fxPeakNow = 0; private fxNorm = 1; private spreadM0 = new Float64Array(64);   // ENERGIN (se E_WIN_S); spreadM0 = BASGANG
+  private eSm = 0; eSimple = 0; private eBass = 0; private eHi = NaN; private eLo = NaN; private fxPeak = 0; private fxPeakNow = 0; private fxNorm = 1; private spreadM0 = new Float64Array(64);   // ENERGIN (se E_WIN_S); spreadM0 = BASGANG
   private trebleEnv = 0; private airEnv = 0; private punchEnv = 0; private belowSince = 0;   // glitter-enveloper (ctx.trebleEnv/airEnv)
   private glH = new Float32Array(64); private glV = new Float32Array(64); private glOn = new Uint8Array(64);   // KULÖRTONING per lampa (visad kulör, förra ljuset)
   private lampLvl = new Float32Array(64); private lampPeakAt = new Float64Array(64); private chOnAt = new Float64Array(192); private lampRatio = new Float32Array(192);   // STEG 2: uttoningen per lampa (ljusstyrka + senaste kulor)
@@ -1329,22 +1320,9 @@ export class EffectEngine {
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
+      // BASENERGIN (se B_CURVE): analysatorn mäter (frame.bassEnergy), här bara uttoningen - upp direkt, ner E_RELEASE_MS (som förr)
+      const eb = frame.bassEnergy;
+      this.eBass = eb > this.eBass ? eb : this.eBass + (eb - this.eBass) * (1 - Math.exp(-dtSec * 1000 / E_RELEASE_MS));
       this.eSimple = this.eBass;
       const eFloor = Math.max(0, Math.min(0.5, this.cfg.energyFloor ?? 0.2));   // "Lägsta nivå" i /setup
       let lift = this.dropEnv;   // DROPS OCH MINIDROPS LYFTER (se DROP_LIFT_MS / MINI_LIFT_MS): energin släpper helt och glider tillbaka
```
