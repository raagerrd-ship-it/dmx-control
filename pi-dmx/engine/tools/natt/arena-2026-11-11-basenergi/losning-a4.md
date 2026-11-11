# a4 – basenergin mot låtens egen referens (sektionsminnet)

## Idén

`frame.bassEnergy` = SLAGET × PARTIET: slaget är basens (sub+kick i dB) läge mellan sin senaste dal och partiets topp med en snabb
envelope, partiet (`frame.bassLevel`) är partiets bastopp mot LÅTENS referens – refrängens bastopp, lärd medan sektionen är `high`
och kvar som minne över vers/break (120 s), så som `levelVsHighDb` gör för hela nivån. Det är en bättre mätning för att dagens
10 s-fönster normerar bort skillnaden vers/refräng och lät en drop byta mätfönster; här ligger versen lägre i fältet, en drop vid
referensen (= 1), och slaget finns kvar oskalat som `bassEnergy / bassLevel`.

## Var snittet går

ANALYSATORN (analyser.ts, `fillFrame`, snabba vägen, båda vägarna, bara skalärer): tre fält.
- `bassEnergy` (0..1) = slaget × partiet. Slaget är dagens fönster ordagrant (dal 0,25 s, minst 6 dB, topp 10 s, 0,95, släpp 100 ms)
  men stegat per hop. Före låtens första refräng är referensen det starkaste partiet hittills; slaget (reserven, det korta fönstret)
  fungerar från första ljudet.
- `bassLevel` (0..1) = partiets topp / referensen som amplitudkvot. Läses av slag för slag (ner direkt, upp på en kick).
- `bassNow` (0..1) = samma slag mot den senaste sekundens topp. Mäts alltid; ingenting i analysatorn startas av en drop.

EFFEKTSIDAN (effects.ts `stepEnergy`): `bHi/bLo`, dal, bredd, topp, släpp, sub-vikt och alla fönsterrattar är borta.
`slag = bassEnergy / bassLevel` driver `md`, `ctx.bassBody` och lampspridningen som förr. Nytt ljusval: PARTIET dämpar hela nivån,
`× (1 − B_PART_DIM·(1 − bassLevel))`, `B_PART_DIM = 0,7` (0 = som i dag).
EFTER EN DROP: dropläget är effektens. Medan lyftet bär (`dropLiftUntil`, hålls i refrängen, tonar ut med fallet) läser energin
`bassNow` i stället för slaget och partiet dämpar inte. Lyftet (`dropEnv`, `DROP_LIFT_MS`) är orört.

Kvar på effektsidan, medvetet orört: volymfönstret `eHi/eLo/eSm` som bara dropens efterkontroll läser.

## Diffen

`git diff --no-index src .arena/basenergi/a4/src` (hela, 2 filer, +65/−29):

```diff
diff --git a/src/analyser.ts b/.arena/basenergi/a4/src/analyser.ts
index cefd9a8..db3e3a7 100644
--- a/src/analyser.ts
+++ b/.arena/basenergi/a4/src/analyser.ts
@@ -228,6 +228,24 @@ export interface Frame {
    *  halvvåg (0 vid fall). onset.kick är klampad 0/1 och står på 1 under hela bas-svallet; det här fältet toppar på ansatsen.
    *  Samma tal som DMX:s FEED_RISE-vikning räknar själv (beatFeed.ts). Bara utdata: ingen konsument i analysatorn läser det. */
   kickRise: number;
+  /** BASENERGIN MOT LÅTENS EGEN REFERENS (arenan basenergi 11-11; 0..1, varje hop, snabba vägen). Basen = sub+kick i dB (vikt
+   *  BE_SUBW). bassEnergy = SLAGET x PARTIET:
+   *  SLAGET = basens läge mellan sin senaste dal (ner direkt, upp BE_LO_S; skalan minst BE_MIN_DB bred) och partiets topp (upp
+   *  direkt, ner BE_WIN_S; de starka slagen ligger strax under den enskilt starkaste toppen, så 1 nås vid BE_TOP av skalan), med
+   *  en snabb envelope ovanpå (upp direkt, ner BE_RELEASE_MS) - varje bastryck svänger över skalan och inget slag tappas mellan
+   *  två avläsningar.
+   *  PARTIET (bassLevel, 0..1) = partiets bastopp mot LÅTENS referens som amplitudkvot (6 dB under = 0,5), så som levelVsHighDb
+   *  mäter hela nivån mot refrängen. Referensen är refrängens bastopp: i refrängen (section 'high') ÄR partiets topp referensen;
+   *  i vers, break och uppbyggnad står den kvar som låtens minne (följer en starkare topp direkt upp, glöms på BE_MEM_S). Före
+   *  låtens första refräng är referensen det starkaste partiet hittills - slaget ensamt (det kortare fönstret) fungerar från
+   *  första ljudet. Nivån läses av slag för slag: ner följer den toppen direkt, upp bara på en kick - ingen krusning inne i slaget.
+   *  En drop ligger vid eller över referensen (bassLevel 1, slaget fyller hela fältet), en vers med svagare bas ligger lägre i
+   *  fältet. bassEnergy / bassLevel = slaget ensamt.
+   *  bassNow = samma slag mätt mot den SENASTE SEKUNDENS topp (BE_NOW_S) i stället för partiets: hur starkt basen slår just nu
+   *  mot det allra senaste - efter en smäll som ligger över slagen som följer når de ändå 1 här.
+   *  Bara dB-skillnader: oberoende av ingångsnivån. Tystnad flyttar inte skalan. Bara mätning: vad ljuset gör av talen väljer
+   *  konsumenten. */
+  bassEnergy: number; bassLevel: number; bassNow: number;
   onset: Spectrum;      // per-band ONSET/anslag (halvvågs-flux mot adaptiv baslinje, 0..1)
   /** TRUM-KIT-envelopes (0..1): peak-hold + decay PÅ HOP-TAKT (375Hz) → fångar
    *  varje anslag, aldrig missat mellan två render-frames. kick=diskret kick +
@@ -399,6 +417,11 @@ export class Analyser {
   private bandOn = new Float32Array(8);    // scratch: per-band onset denna frame
   private static readonly KICK_RISE_HOPS = 6;   // kickRise-fönstret (16 ms), = DMX:s FEED_RISE_HOPS
   private kickRiseDb = new Float64Array(Analyser.KICK_RISE_HOPS); private kickRisePos = 0;
+  /** BASENERGIN (se Frame.bassEnergy): subbandets vikt mot kickbandet, skalans minsta bredd, dalens stigtid, skalans topp,
+   *  envelopens släpp, partitoppens fall, nu-toppens fall och referensens minne utanför refrängen. */
+  private static readonly BE_SUBW = 0.25; private static readonly BE_MIN_DB = 6; private static readonly BE_LO_S = 0.25; private static readonly BE_TOP = 0.95; private static readonly BE_RELEASE_MS = 100;
+  private static readonly BE_WIN_S = 10; private static readonly BE_NOW_S = 1; private static readonly BE_MEM_S = 120;
+  private bePk = NaN; private beNow = NaN; private beLo = NaN; private beRef = NaN; private beP = 0; private bePn = 0; private beLv = 1;
   private bigCounter = 0;                  // decimering av 2048-FFT:n (se BIG_EVERY)
   private static readonly BIG_EVERY = 3;   // kor stor-FFT var N:e hop → analysen ryms i realtid
   /** bandPeak-decay per stor-FFT (τ ≈ 3.8 s oavsett BIG_EVERY). */
@@ -2006,7 +2029,7 @@ export class Analyser {
     this.outFrame = {
       silent: true, level: 0, levelRaw: 0, levelVU: 0, energy: 0, centroid: 0, flux: 0,
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
-      dropCount: 0, miniDropCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, midHiDb: -120, kickRise: 0, inZone: false, breaking: false, buildUp: 0, inRiser: false, profile: this.outProfile, beatAnchorMs: 0,
+      dropCount: 0, miniDropCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, midHiDb: -120, kickRise: 0, bassEnergy: 0, bassLevel: 1, bassNow: 0, inZone: false, breaking: false, buildUp: 0, inRiser: false, profile: this.outProfile, beatAnchorMs: 0,
       kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
       spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
     };
@@ -3068,6 +3091,24 @@ export class Analyser {
       this.kickRiseDb[this.kickRisePos] = db; this.kickRisePos = (this.kickRisePos + 1) % Analyser.KICK_RISE_HOPS;
       f.kickRise = old !== 0 && db > old ? db - old : 0;
     }
+    {   // BASENERGIN MOT LÅTENS REFERENS (se Frame.bassEnergy)
+      const b = Analyser.BE_SUBW * 20 * Math.log10(A[0] + 1e-7) + (1 - Analyser.BE_SUBW) * 20 * Math.log10(A[1] + 1e-7), dt = this.dtHop;
+      if (!f.silent) {   // tystnad flyttar inte skalan
+        if (this.bePk !== this.bePk) { this.bePk = b; this.beNow = b; this.beLo = b; this.beRef = b; }
+        this.bePk = b > this.bePk ? b : this.bePk + (b - this.bePk) * Math.min(1, dt / Analyser.BE_WIN_S);   // partiets topp
+        this.beNow = b > this.beNow ? b : this.beNow + (b - this.beNow) * Math.min(1, dt / Analyser.BE_NOW_S);   // senaste sekundens topp
+        this.beLo = b < this.beLo ? b : this.beLo + (b - this.beLo) * Math.min(1, dt / Analyser.BE_LO_S);   // basens senaste dal
+        this.beRef = this.section === 'high' || this.bePk > this.beRef ? this.bePk : this.beRef + (this.bePk - this.beRef) * Math.min(1, dt / Analyser.BE_MEM_S);   // låtens referens
+        const lv = Math.pow(10, (this.bePk - this.beRef) / 20);
+        if (lv < this.beLv || kick) this.beLv = lv;   // partiets nivå, avläst slag för slag
+      }
+      const rel = 1 - Math.exp(-dt * 1000 / Analyser.BE_RELEASE_MS);
+      let span = Math.max(Analyser.BE_MIN_DB, this.bePk - this.beLo), x = (b - (this.bePk - span)) / (span * Analyser.BE_TOP); x = x > 0 ? (x < 1 ? x : 1) : 0;   // inget ljud än (NaN) -> 0
+      this.beP = x > this.beP ? x : this.beP + (x - this.beP) * rel;
+      span = Math.max(Analyser.BE_MIN_DB, this.beNow - this.beLo); x = (b - (this.beNow - span)) / (span * Analyser.BE_TOP); x = x > 0 ? (x < 1 ? x : 1) : 0;
+      this.bePn = x > this.bePn ? x : this.bePn + (x - this.bePn) * rel;
+      f.bassLevel = this.beLv; f.bassEnergy = this.beP * this.beLv; f.bassNow = this.bePn;
+    }
     { let s2 = 1e-12; for (let b = 3; b < 8; b++) { const lin = Math.pow(10, (FB ? this.fbDbRaw : this.bandDbRaw)[b] / 20); s2 += lin * lin; } f.midHiDb = 20 * Math.log10(Math.sqrt(s2)); }
     f.dropCount = this.dropCount; f.miniDropCount = this.miniDropCount; f.dropDemoted = this.dropDemoted; f.dropSpaced = this.dropSpaced; f.dropRiseDb = this.dropRiseDb;
     f.nearDropDb = this.nearDropDb; f.nearDipDb = this.nearDipDb; f.liftDb = this.liftDb; f.stopCount = this.stopCount; f.stopS = this.stopS; f.inZone = inZone; f.breaking = breaking; f.buildUp = this.buildUp; f.inRiser = inRiser;
diff --git a/src/effects.ts b/.arena/basenergi/a4/src/effects.ts
index 70df38c..d48fe33 100644
--- a/src/effects.ts
+++ b/.arena/basenergi/a4/src/effects.ts
@@ -414,19 +414,26 @@ const E_TOP = Math.max(0.5, Math.min(1, 0.95));   // 1 -> 0,95 (ladan 10-09, sta
  *  minidrops lyfter. ERSATTE (bänk tools/energiMatt.mjs, 23 ladan-filer): konsertgolvet 0,4, refränggolvet 0,8, buildladdningen och
  *  TIER_OPEN (golv som gjorde energin verkningslös), taktdippen KICK_E/KICK_E_HIGH på kickEnv (dubbel kickmodulering ovanpå effektens
  *  egen c.heart), SPOT-regeln och UNIFORM:s ovalda par (förbivägar runt energin). */
-const B_CURVE = 3, B_MIN_DB = 6, B_LO_S = 0.25;   // B_LO_S 1 -> 0,25 (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108))
+const B_CURVE = 3;
+/** BASENERGIN ÄR ANALYSATORNS MÄTNING (arenan basenergi 11-11; ägaren: "analysatorn skall ju enbart analysera inte styra hur lamporna
+ *  lyser"). Fönstret (bHi/bLo, dal, minsta bredd, topp, släpp, sub-vikt, dropens 1 s-fönster) är borta härifrån. Analysatorn ger
+ *  frame.bassEnergy = slaget x partiet (basen mot LÅTENS referens = refrängens bastopp), frame.bassLevel = partiet (partiets bastopp
+ *  mot referensen, 1 i refrängen) och frame.bassNow = slaget mot den senaste sekundens topp. Här väljs bara ljuset:
+ *  SLAGET = bassEnergy / bassLevel driver energin som förr (B_CURVE, golvet; ctx.bassBody och lampspridningen läser samma).
+ *  PARTIET dämpar hela nivån: x (1 - B_PART_DIM x (1 - bassLevel)) - en vers vars bas ligger under refrängens lyser svagare med
+ *  samma relativa slag ("sänka taket beroende på var i låten man är"). 0 = som förr (varje parti fyller skalan), 1 = fullt efter
+ *  mätningen.
+ *  DROPLÄGET (i stället för att dropen bytte mätningens fönster till 1 s; "energin efter drop dör fort" -> "känns bra nu"): medan
+ *  dropens lyft bär (DROP_LIFT_MS, hålls i refrängen, tonar ut med fallet) läser energin bassNow - slagen efter smällen når fullt
+ *  ljus fast smällen ligger över dem - och partiet dämpar inte. */
+const B_PART_DIM = 0.7;
 /** PROVRATTAR 2026-11-07 (dagkörningen med flera agenter; ägaren: 'kan man få takten att följa själva basrytmen bättre (energilagret)' och
  *  'efter drop räkna med att det är refräng så taket är 95 %, men golvet 70 % dödar bara dynamiken'). Bara för bänken: osatt = dagens
  *  värde och dagens uttryck (json-identiskt). Det som bevisar sig byggs in som standard och ratten tas bort (ägarens regel: inga flaggor).
- *  DMX_B_LO_S/B_CURVE/B_MIN_DB/B_WIN_S/B_TOP/B_RELEASE_MS = basfönstrets dal/kurva/minsta bredd/toppens fall/topp/uttoning (aldrig under
- *  E_RELEASE_MS: fade-down låst), DMX_B_SUBW = subbandets vikt mot kickbandet (0,5 = medel som i dag); DMX_DROP_WIN_S/DROP_TOP = toppens
- *  fall och E_TOP medan dropens lyft pågår (basfönstret ankras om på refrängen i stället för ett golv); DMX_MINI_LIFT_FLOOR = minidropens
- *  lyft som golv (1 = som i dag). */
+ *  DMX_B_CURVE = energins kurva, DMX_MINI_LIFT_FLOOR = minidropens lyft som golv (1 = som i dag). (Basfönstrets rattar - DMX_B_LO_S/
+ *  B_MIN_DB/B_WIN_S/B_TOP/B_RELEASE_MS/B_SUBW och DMX_DROP_WIN_S/DROP_TOP - borta 11-11: mätningen ligger i analysatorn.) */
 const envN = (k: string, d: number): number => { const v = process.env[k]; return v === undefined || v === '' ? d : Number(v); };
-const PB_LO_S = envN('DMX_B_LO_S', B_LO_S), PB_CURVE = envN('DMX_B_CURVE', B_CURVE), PB_MIN_DB = envN('DMX_B_MIN_DB', B_MIN_DB);
-const PB_WIN_S = envN('DMX_B_WIN_S', 0), PB_TOP = envN('DMX_B_TOP', 0), PB_RELEASE_MS = envN('DMX_B_RELEASE_MS', 0), PB_SUBW = envN('DMX_B_SUBW', 0.25);   // 0,5 -> 0,25 (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108))
-const PD_WIN_S = envN('DMX_DROP_WIN_S', 1),   // 0 -> 1 (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108))
-      PD_TOP = envN('DMX_DROP_TOP', 0), PM_LIFT_FLOOR = envN('DMX_MINI_LIFT_FLOOR', 1);
+const PB_CURVE = envN('DMX_B_CURVE', B_CURVE), PM_LIFT_FLOOR = envN('DMX_MINI_LIFT_FLOOR', 1);
 /** BASENERGIN BARA SUB+KICK (opt-in DMX_BASS_SUBKICK=1, porterat från lotus 10-15: ägaren i källaren 'känns dock som att den följer inte bara
  *  bas' med baskroppen 20-250 Hz, 'känns bättre' med sub+kick 20-120 Hz). Basenergins källa = medel av sub- och kickbandets rå dB ur
  *  frame.specAbs (samma bandmedel som bodyDb, utan bandet 120-250 Hz där röstens grundton och virvelns kropp ligger). Flank-dropen läser
@@ -594,7 +601,7 @@ export class EffectEngine {
   private dropColEnv = 0;        // BARA full drop: dropfarg + vit karna (minidrop/nastan-drop lyfter bara ljusstyrkan)
   private lastLiveSection = '';   // DMX_SECTION_SWITCH
   dropCalmDenied = 0; dropFalse = 0; private dropCheckAt = 0; private preDropLevel = 0; private preDropTier = 0;
-  private eSm = 0; eSimple = 0; private eBass = 0; private bHi = NaN; private bLo = NaN; private eHi = NaN; private eLo = NaN; private fxPeak = 0; private fxPeakNow = 0; private fxNorm = 1; private spreadM0 = new Float64Array(64);   // ENERGIN (se E_WIN_S); spreadM0 = BASGANG
+  private eSm = 0; eSimple = 0; private eBass = 0; private eHi = NaN; private eLo = NaN; private fxPeak = 0; private fxPeakNow = 0; private fxNorm = 1; private spreadM0 = new Float64Array(64);   // ENERGIN (se E_WIN_S); spreadM0 = BASGANG
   private trebleEnv = 0; private airEnv = 0; private punchEnv = 0; private belowSince = 0;   // glitter-enveloper (ctx.trebleEnv/airEnv)
   private glH = new Float32Array(64); private glV = new Float32Array(64); private glOn = new Uint8Array(64);   // KULÖRTONING per lampa (visad kulör, förra ljuset)
   private lampLvl = new Float32Array(64); private lampPeakAt = new Float64Array(64); private chOnAt = new Float64Array(192); private lampRatio = new Float32Array(192);   // STEG 2: uttoningen per lampa (ljusstyrka + senaste kulor)
@@ -1329,27 +1336,15 @@ export class EffectEngine {
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
-      this.eSimple = this.eBass;
+      // BASENERGIN (se B_PART_DIM): analysatorn mäter, här formas bara ljuset - slaget driver energin, partiet dämpar nivån, dropläget lyfter.
+      const bLvl = frame.bassLevel, slag = bLvl > 0 ? Math.min(1, frame.bassEnergy / bLvl) : 0;
+      const dropLeft = this.dropLiftUntil - nowWall, dropW = dropLeft >= 0 ? 1 : dropLeft > -DROP_LIFT_FALL_MS ? 1 + dropLeft / DROP_LIFT_FALL_MS : 0;   // DROPLÄGET: 1 medan lyftet bär, tonar ut med fallet
+      const eb = slag + (frame.bassNow - slag) * dropW, part = 1 - B_PART_DIM * (1 - bLvl) * (1 - dropW);
+      this.eBass = eb; this.eSimple = eb;
       const eFloor = Math.max(0, Math.min(0.5, this.cfg.energyFloor ?? 0.2));   // "Lägsta nivå" i /setup
       let lift = this.dropEnv;   // DROPS OCH MINIDROPS LYFTER (se DROP_LIFT_MS / MINI_LIFT_MS): energin släpper helt och glider tillbaka
       if (nowWall < this.miniLiftUntil + MINI_LIFT_FALL_MS) { const left = this.miniLiftUntil - nowWall; lift = Math.max(lift, PM_LIFT_FLOOR === 1 ? (left >= 0 ? 1 : 1 + left / MINI_LIFT_FALL_MS) : PM_LIFT_FLOOR * (left >= 0 ? 1 : 1 + left / MINI_LIFT_FALL_MS)); }
-      md = drive * Math.min(1, Math.max(eFloor + (1 - eFloor) * Math.pow(this.eBass, PB_CURVE), lift));   // bara dampning: aldrig over 1
+      md = drive * Math.min(1, Math.max(part * (eFloor + (1 - eFloor) * Math.pow(this.eBass, PB_CURVE)), lift));   // bara dampning: aldrig over 1
       // ENERGIN I DMX-PROCENT (se E_LIN): md är andelen av lampans ljus - output.ts lampLevel gör den till nivå per lampa (renderLamps)
     }
     this.rMd = md;
```

## Siffrorna (bänk 4 av 4, den som ligger i mappen)

Domaren:
`| a4 | -0.0 | takt +0.4 | dynamik +0.8 | koreografi -1.3 | jitter lang 29.6 | betoning lang 0.287 | rA 0.328 | rK 0.268 | slagK 0.426 | ljusSteg 2.08 | ljus -1.0 | lampspr -0.8/-1.0/-1.4 | t90 20 | - |` → OK, ingen spärr.

basenergi.json: `finns true, gainDiff 0.0152, falt c7e79cd4… (= bas), p05/p50/p95 0.134/0.503/0.96, tyst 0.008, slagDjup 0.321, usPerHop 79.6` (bas 77.5).

BÄTTRE: versen (`low`) – slagK lang 0,369 → 0,416, djup 0,423 → 0,468, megamix djup 0,738 → 0,870; betoning upp i alla tre
(0,274/0,326/0,346 → 0,287/0,345/0,352); dynSets kontrast 1,84 → 1,99; takt pop rA 0,474 → 0,481.
SÄMRE: dynSets ljusSteg 2,23 → 2,08 (dynBench renderar var 25:e ms: en mätning per hop tappar inga toppar, så de mörka sekunderna blir
ljusare där än med baslinjens glesa avläsning); jitter lang 28,7 → 29,6 och megamix 40,7 → 44,4; pop slagK 0,542 → 0,527 (refrängen
0,572 → 0,545); slocknat lang +0,2 pe.

Vägen hit (bänk 1–3, −3,9/−3,5/−1,6): en referens som släpar uppåt mättar fältet; partinivå som rör sig inne i slaget ger jitter
(därav avläsningen på kicken); dropläge som "sänkt topp" ger platåer (lang rA 0,320, jitter 33,3) – därav `bassNow`.

## Att granska mot krav 1

`BE_TOP` (0,95) och `BE_RELEASE_MS` (100 ms) kom från effektsidan (`E_TOP`, `E_RELEASE_MS`). Jag har lagt dem i mätningen som skalans
topp och slagets envelope, eftersom ordningen topp → släpp måste hållas: med toppen kvar på effektsidan efter analysatorns envelope
fick varje starkt slag en fetare svans (bänk 3). Ser orkestratorn dem som ljuskurva är alternativet ett rått fält och topp + släpp i
`stepEnergy` – då faller dynSet (min simulering: ljusSteg ytterligare ned), rytm-måtten väntas lika.

## Lotus

Lotus läser `frame.bassEnergy` rakt av som pulsens styrka (versen lägre, refrängen full, nivåoberoende trots mic) och
`frame.bassLevel` om dB-fönstrets ankare ska följa låtens parti i stället för 60–180 s ljudstyrka.

## Risken

- `B_PART_DIM 0,7` är obeprövat i ögat: en vers 6 dB under refrängen lyser 65 %, ett break utan bas ~40 %. Ägaren kan uppleva det
  som mörkt; ratten är en konstant (0 = dagens ljus).
- Referensen hänger på analysatorns `high`-etikett: en svag passage som märks `high` nollar minnet, och utan `high` sjunker minnet
  bara på 120 s (ny tystare låt i en mix lyser dämpad tills första refrängen).
- Nivån stiger bara på en kick: kickfri musik som växer ligger kvar lågt.
- Dropläget tonar mellan två mätningar i stället för att byta ett fönsters tidskonstant; i ladan kan slagen efter en drop skilja sig
  något från det som godkändes 11-07.
- Poängen ±0 ligger inom jitterns kvantisering (ett steg på lang ≈ ±1 poäng); kontrollmängden saknar dynSet, där min vinst (kontrast) låg.
- `src/ANALYSER_SHARED.md5` är inte uppdaterad (förbjuden fil) – manifestet måste räknas om vid en port.
