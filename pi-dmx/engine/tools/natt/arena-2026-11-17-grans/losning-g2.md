# g2 – BASGÅNGEN BYTER (arenan grans)

**IDÉN.** Analysatorn spelar in basens mönster per sextondel (3 basband: sub, kick och bas, i dB, med bandets medel bortdraget), på klockans eget slagraster. Vid varje slag jämförs de senaste 4 slagen med medlet av de 8 takterna före i samma fas. Avståndet blir ett z-tal mot låtens egen historia, en per fas och 64 takter bakåt. När takten som slutar på ettan har z ≥ 2 byter dirigenten look på den ettan. Signalen är realtid eftersom den bara jämför ljud som redan hörts mot låtens egen spridning. Tröskeln är 2 standardavvikelser och inte vald per fil. Mönstret normaliseras per takt, så nivån räknas inte, bara rytm och fördelning.

**DE 28 MISSADE.** Bara 1 tas: vers 193040 350,00 (16 → 0,6 slag). Bytena kom 5 gånger, varav 4 lösa (151659 142,1 och 254,8, där 254,8 ligger 3,9 slag före refrängen; 193040 162,4 och 234,0). 4 av de 5 sitter på en Beat This-etta.

**DELARNA**
| del | vad den gör | mått (m2) |
|---|---|---|
| B1 `bassGangStep/bassNovWin` (analyser.ts, snabba vägen) | 144 sextondelar × 3 band i en ring, fönster mot 8 takter, z per fas. Ingen allokering per hop och inget nytt split-fält: rastret kommer ur `beatSrc` (setClockGrid), banden ur fbAbs | bär B2 |
| B2 `bassHit` (effects.ts) | Ett färskt värde inom ½ slag efter dirigentens etta-tick (värdet kommer ~130–160 ms efter ticken), z ≥ 2 och tillit ≥ 0,5. Inte i bygget, luckan eller break | 5 byten, etta 41,7 → 44,0 |
| B3 en väg | Väntar ett sektionsbyte tas det direkt på ettan (manusets look). Annars `bassForce`: en look ur manusets historia eller poolen, aldrig lugn och aldrig samma, och detektorns eko sväljs i 16 slag (`landAbsorbUntil`) | 193040 gräns 29 → 32 %, lag 7,6 → 7,1 |
| B4 robust raster | Ett litet bakåtsteg i ankaret (PLL:en) nollar inte ringen, som det gjorde i första sonden. Historien nollas inte av tystnad, bara ringen | m1 → m2 |

**SIFFRORNA** (poäng / gräns / lag / etta / lösa / byten / ljus)
- bas: 22,7 / 8,48 / 41,7 / 0,98 / 3,39
- m1 (historia för alla faser): +1,83 / 23,8 / 8,31 / 42,7 / 1,11 / 3,58 / +1,4
- **m2: +2,50 / 23,8 / 8,31 / 44,0 / 1,11 / 3,58 / ljus +1,4, OK**
- per fil m2 (gräns/lag/etta/lösa/byten):
  - 151659: 30/8,9/60/1,5/3,5 (bas 30/8,9/57/1,3/3,3)
  - 171840: identisk med bas
  - 193040: 32/7,1/52/1,0/4,1 (bas 29/7,6/48/0,8/3,8)
- Sämre: lösa +0,13/min.

Offline (`ana/basgang.py`, `ana/sim.py`) gav samma mönster mot Beat This-ettor +12–15 i en simulerad poäng. I realtid blev vittnet svagare. Stämmer bytena i tid hamnar z-topparna ofta en takt före gränsen (utfyllnaden), och efter låtbytet i 151659 (~393 s) slog det aldrig till.

**RISKEN**
- Fel etta (171840, 45 %) ger fel takt i jämförelsen. Ett sent värde (> ½ slag) släpps i stället för att byta mitt i takten.
- Prat och rumsljud i basen är ovanligt, men bas-tunga utfyllnader ger lösa byten. MIN_HOLD 8 s begränsar det till högst ett byte per 8 s.
- Låtbyten: de första 9 takterna efter tystnad är blinda.
- Workern: B1 körs i snabba vägen, som a5r. Lotus får fältet men läser det inte (utan FAST_BANDS används bandAbs).

**DIFFEN** (`git diff --no-index src .arena/grans/g2/src`, de tre ändrade filerna):
```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/grans/g2/src/ANALYSER_SHARED.md5
index f6ba712..b5716d1 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/grans/g2/src/ANALYSER_SHARED.md5
@@ -1,5 +1,5 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
-1e5942108e88af6bfe857ef56a7429b8 analyser.ts
+e38b599a3e45740aaa9158848ebd0508 analyser.ts
 b5485714f88c45ec0f55f21b9d5ab20e analyserDrop.ts
 692befa55e7fd906cdc3652af3f27baa analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
diff --git a/src/analyser.ts b/.arena/grans/g2/src/analyser.ts
index 5dcd901..26b681e 100644
--- a/src/analyser.ts
+++ b/.arena/grans/g2/src/analyser.ts
@@ -131,6 +131,7 @@ export interface Frame {
   sectionTier: number;   // 0 lag / 1 mellan / 2 hog
   repeatSim: number; repeatAgoMs: number; repeatSection: string;   // UPPREPNING
   expectHighInMs: number; prevSection: string; levelVsHighDb: number; sectionBars: number;   // SEKTIONSMINNE + FORUTSAGELSE
+  bassNovZ: number; bassNovSeq: number;   // BASGÅNGEN: senaste 4 slagens basmönster mot de 8 takterna före (z mot låten), räknare per slag
   spec: Spectrum;   // Rikt spektrum + per-band onset
   specAbs: Spectrum;   // Absolut per-band magnitud före AGC, för Lotus ljusväg och bandandelar
   bodyDb: number;   // BASKROPPEN I RA dB
@@ -152,7 +153,7 @@ export const BODY_CEIL_DB_S = 0.15;   // taket haller latens loud-referens lang
 const DOUBLE_FROM_START = [
   'expectHighMs', 'levelVsHighDb', 'sumSq', 'lastT', 'dbgRms', 'envAccum', 'envAccumT', 'envBassAccum', 'blAccum', 'lvlSmooth',
   'lvlVU', 'engSmooth', 'activeMs', 'buildUp', 'kickHit', 'snareHit', 'hatHit', 'pendingKickMs', 'kfPrev', 'kfPrev2',
-  'beatAnchorMs', 'profBassline', 'bassOnsetsPerBeat', 'rawBpmLast', 'localBpmConfidence', 'sectionStartMs', 'secBuildAt', 'secBuildSeen', 'repeatSim', 'repeatAgoMs',
+  'beatAnchorMs', 'profBassline', 'bassOnsetsPerBeat', 'rawBpmLast', 'localBpmConfidence', 'sectionStartMs', 'secBuildAt', 'secBuildSeen', 'repeatSim', 'repeatAgoMs', 'bassNovZ',
 ] as const;   // Instansfalt som MATT
 /** TYPSTABILA TALFALT. */
 function stabiliseNumbers(o: object): void {
@@ -735,7 +736,7 @@ export class Analyser {
       silent: true, level: 0, levelRaw: 0, levelVU: 0, energy: 0, centroid: 0, flux: 0,
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
       dropCount: 0, miniDropCount: 0, buildStartCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, bassLevel: 1, midHiDb: -120, inZone: false, breaking: false, buildUp: 0, buildProg: 0, inRiser: false, profile: this.character.outProfile, beatAnchorMs: 0,
-      kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
+      kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0, bassNovZ: 0, bassNovSeq: 0,
       spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
     };
     for (const o of [this.outFrame, this.character.outProfile, this.outSpec, this.outSpecAbs, this.outOnset, this.outDrum]) stabiliseNumbers(o);
@@ -965,8 +966,51 @@ export class Analyser {
       else this.hopLane!.feed(f, this.clockOut, this);
       publishPhase(f, this.clockOut.beat, this.clock ? this.clock.barKnown() : this.hopLane!.barKnown, this.extGrid, Date.now(), Analyser.GRID_PHASE_OFFSET_MS);
     }
+    this.bassGangStep(f.silent); f.bassNovZ = this.bassNovZ; f.bassNovSeq = this.bassNovSeq;
     return f;
   }
+  bassNovZ = 0; bassNovSeq = 0;   // BASGÅNGEN (arenan grans g2)
+  private bgAcc = new Float32Array(3); private bgN = 0; private bgQ = NaN; private bgFill = 0;
+  private bgS = new Float32Array(144 * 3); private bgW = new Float32Array(48); private bgR = new Float32Array(48);
+  private bgH = new Float32Array(4 * 64); private bgHN = new Int32Array(4); private bgHP = new Int32Array(4);
+  /** Sextondelens dB i 3 basband på klockans raster. */
+  private bassGangStep(silent: boolean): void {
+    const g = this.beatSrc.beat, C = this.bgAcc;
+    if (silent) this.bgFill = 0;
+    if (silent || !g || !(g.bpm > 40)) { this.bgQ = NaN; this.bgN = 0; C[0] = C[1] = C[2] = 0; return; }
+    const q = Math.floor((Date.now() - g.anchorMs) * g.bpm / 15000);
+    if (q > this.bgQ || !(q >= this.bgQ - 4)) {
+      if (this.bgN > 0 && q <= this.bgQ + 4) {
+        for (let s = this.bgQ; s < q; s++) {
+          const o = (((s % 144) + 144) % 144) * 3; for (let b = 0; b < 3; b++) this.bgS[o + b] = C[b] / this.bgN;
+          if (this.bgFill < 144) this.bgFill++;
+          if ((((s % 4) + 4) % 4) === 3) this.bassNovWin(s);
+        }
+      }
+      this.bgQ = q; this.bgN = 0; C[0] = C[1] = C[2] = 0;
+    }
+    const A = Analyser.FAST_BANDS ? this.bands.fbAbs : this.bandAbs;
+    for (let b = 0; b < 3; b++) C[b] += 20 * Math.log10(A[b] + 1e-7);
+    this.bgN++;
+  }
+  /** Fönstret (16 sextondelar) som slutar i s mot medlet av de 8 fönstren före, samma fas. */
+  private bassNovWin(s: number): void {
+    if (this.bgFill < 144) return;
+    const W = this.bgW, R = this.bgR, S = this.bgS; R.fill(0);
+    for (let w = 8; w >= 0; w--) {
+      const e = s - 16 * w; let mx = -1e9;
+      for (let j = 0; j < 16; j++) { const o = ((((e - 15 + j) % 144) + 144) % 144) * 3; for (let b = 0; b < 3; b++) { const v = S[o + b]; W[b * 16 + j] = v; if (v > mx) mx = v; } }
+      for (let b = 0; b < 3; b++) { let m = 0; for (let j = 0; j < 16; j++) { const k = b * 16 + j; if (W[k] < mx - 30) W[k] = mx - 30; m += W[k]; } m /= 16; for (let j = 0; j < 16; j++) W[b * 16 + j] -= m; }
+      if (w > 0) for (let k = 0; k < 48; k++) R[k] += W[k] / 8;
+    }
+    let d = 0; for (let k = 0; k < 48; k++) { const x = W[k] - R[k]; d += x * x; }
+    d = Math.sqrt(d / 48);
+    const H = this.bgH, ph = ((Math.floor((s + 1) / 4) % 4) + 4) % 4, o = ph * 64, n = this.bgHN[ph];
+    if (n >= 16) { let m = 0; for (let i = 0; i < n; i++) m += H[o + i]; m /= n; let v = 0; for (let i = 0; i < n; i++) v += (H[o + i] - m) * (H[o + i] - m); this.bassNovZ = (d - m) / (Math.sqrt(v / n) + 1e-6); }
+    else this.bassNovZ = 0;
+    H[o + this.bgHP[ph]] = d; this.bgHP[ph] = (this.bgHP[ph] + 1) & 63; if (n < 64) this.bgHN[ph] = n + 1;
+    this.bassNovSeq++;
+  }
   clock: BeatFeed | null = null;   // ANALYSATORNS KLOCKA utan taktväg
   readonly clockOut: ClockCfg = { beat: undefined, beatErr: undefined };
   /** Klockans utfall till motorn. */
diff --git a/src/effects.ts b/.arena/grans/g2/src/effects.ts
index 8957bb7..c6dc155 100644
--- a/src/effects.ts
+++ b/.arena/grans/g2/src/effects.ts
@@ -307,6 +307,7 @@ const PULSE_IDX_INIT = -2e9;
  *      detektorn da satt fast pa high; rotorsaken (ingen nollning vid latbyte) ar rattad 09-23. Sedan 10-12: LÅTMANUS. */
 /** SECTION_UNIT (ladan 16:45): forvarningens 'high' 600 ms fore en forutsedd refrang och drop-fonstrets 'high' raknas INTE som sektionsgrans
  *  (de gav high<->low-hopp pa 1-2 s nar refrangen uteblev). Bara den raa sektionen, och den maste vara minst DMX_SECTION_UNIT_MIN_MS gammal. */
+const BASS_NOV_Z = 2;   // BASGÅNGEN (grans g2): analysatorns bassNovZ för takten som slutar på ettan = ny del utan lucka (2 sd av låtens egen spridning)
 const LAND_HOLD_MS = 6000, LAND_ABSORB_MS = 24000;   // LANDNINGEN (a7): minsta hålltid före landningsbytet; sektionsbyten inom fönstret efter tas inte
 const GAP_HOLD_MS = 4000;   // I LUCKAN: spärren efter uppbyggnadssignalen släpper senast efter 4 s (signal -> landning median 1,8 s)
 /** LÅTMANUS (10-12 kväll, ägaren: "olika effekter hoppar hela tiden ... mer som att den är förprogrammerad" + "allt mer känns anpassat
@@ -567,6 +568,7 @@ export class EffectEngine {
    private tickNow = false; private rNowP = 0; private rNowWall = 0; private rDt = 0; private rDtT = 0; private rBeatMs = 0; private rBeatEnv = 0; private rDTarget = 0; private rMd = 0; private rT = 0; private rAnchorHue = 0; private rDrive = 0; private rInputGate = 0;   // RUTANS TAL (se EN KLOCKA PER RUTA): fält i stället för argument - ett decimaltal som skickas till en metod packas in (GC-jakten 10-16)
   private anaDropAt = -1e12;   // analysatorns drop som blev minidrop (se REFRÄNGEN DIREKT EFTER EN MINIDROP-DROP)
   private landForce = false; private landAbsorbUntil = -1;   // LANDNINGEN (a7)
+  private bassForce = false; private bassNovSeen = 0; private ettaAt = -1e12;   // BASGÅNGEN (g2)
   private lastBuildStart = 0; private lastMiniSeen = 0; private gapUntil = -1;   // I LUCKAN (11-16): inget lookbyte från uppbyggnadssignalen tills basen är tillbaka
   private nearAt = -1e12; nearCount = 0;   // NASTAN-DROP
   private secCeil = 1; private histAt = -1e12; private rampLvl = 0; private levelRamp = 1; private buildLookAt = 0; buildProg = 0; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
@@ -798,7 +800,7 @@ export class EffectEngine {
         const req = (m: Mode) => meetsRequirements(m, bpm, frame.profile);
         // LÅTMANUS: vilken del av manuset bytet galler. Builden (aven ALLA_LOOKER-builden) -> build; drop och build som slutar ->
         // refrangens look (dropen landar i refrangen); annars sektionen. Utan sektion (ingen analys an) finns inget manus.
-        const secKey = this.landForce ? liveSec : allaBuild && !(dropSwitch && liveSec !== 'break') ? 'build' : (dropSwitch || buildExit) && liveSec !== 'break' ? 'high' : liveSec;
+        const secKey = this.landForce || this.bassForce ? liveSec : allaBuild && !(dropSwitch && liveSec !== 'break') ? 'build' : (dropSwitch || buildExit) && liveSec !== 'break' ? 'high' : liveSec;
         const calm = secKey === 'break';   // breakdown -> lugna poolen (var wantCalm)
         const tierRank = (m: Mode) => { const t = EFFECT_MAP.get(m)?.tier; return t === 'lugn' ? 0 : t === 'full' ? 2 : 1; };
         const tierNow = tierS === LUGN ? 0 : tierS === FART ? 1 : 2;
@@ -810,15 +812,15 @@ export class EffectEngine {
         if (secKey && this.carryKey && secKey !== this.carryKey) { this.manus.delete(this.carryKey); this.carryKey = ''; }   // burna looken släpps (softenRange)
         if (secKey && secKey !== this.visitKey) { varv = (this.secVisits.get(secKey) ?? 0) + 1; this.secVisits.set(secKey, varv); this.visitKey = secKey; }
         const nextLook = HIGH_VARV > 0 && secKey === 'high' && varv >= HIGH_VARV && !dropSwitch && !!kept;
-        let keep = !nextLook && !!kept && fits(kept) && !(dropSwitch && !this.bassStrong(kept)) && !(this.landForce && (kept === this.smartMode || tierRank(kept) === 0));   // DROP_BASS_LOOK: refrängslooken bara om den är basstark; landningen byter alltid
+        let keep = !nextLook && !!kept && fits(kept) && !(dropSwitch && !this.bassStrong(kept)) && !((this.landForce || this.bassForce) && (kept === this.smartMode || tierRank(kept) === 0));   // DROP_BASS_LOOK: refrängslooken bara om den är basstark; landningen byter alltid
         const avoid = nextLook ? kept : undefined;
         if (nextLook) { const h = (this.manusHist.get(secKey) ?? []).filter((m) => m !== kept && m !== this.smartMode && fits(m)); if (h.length) { kept = this.pickLook(h.map((m) => ({ m }))); keep = true; this.manus.set(secKey, kept); console.log(`[dirigent] high-varv ${varv}: nasta look "${kept}"`); } }
-        if (!keep && secKey && !(dropSwitch) && !nextLook) { const back = this.manusHist.get(secKey)?.find((m) => m !== kept && fits(m) && !(this.landForce && (m === this.smartMode || tierRank(m) === 0))); if (back) { kept = back; keep = true; this.manus.set(secKey, back); } }
+        if (!keep && secKey && !(dropSwitch) && !nextLook) { const back = this.manusHist.get(secKey)?.find((m) => m !== kept && fits(m) && !((this.landForce || this.bassForce) && (m === this.smartMode || tierRank(m) === 0))); if (back) { kept = back; keep = true; this.manus.set(secKey, back); } }
         if (keep && kept === this.smartMode) { this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true; }   // manuset sager samma look - inget byte
         else {
         this.lastSmartSwitchMs = now; this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true;
         // DIAGNOSTIK (se switchWhy): starkaste orsaken forst. 'dwell' sist = klockan var det enda skalet.
-        this.switchWhy = dropSwitch ? 'drop' : this.landForce ? 'landning'
+        this.switchWhy = dropSwitch ? 'drop' : this.landForce ? 'landning' : this.bassForce ? 'basgang'
           : (memSection || secEntry) ? 'sektion'
           : (buildEntry || allaBuild) ? 'build' : buildExit ? 'build-slut' : tierChanged ? 'tier' : 'dwell';
         this.switchCount++;
@@ -1102,6 +1104,9 @@ export class EffectEngine {
         this.lastMiniSeen = frame.miniDropCount;
         const inGap = nowWall < this.gapUntil;
         const inBuild = frame.inRiser || frame.buildUp > 0.35 || (frame.section === 'build');   // bara build-poolens inträde (allaBuild)
+        if (this.tickNow && this.lastBeatIdx % 4 === 0) this.ettaAt = nowWall;
+        const bassFresh = frame.bassNovSeq !== this.bassNovSeen; this.bassNovSeen = frame.bassNovSeq;   // BASGÅNGEN: takten som slutar på ettan (värdet kommer strax efter ticken)
+        const bassHit = bassFresh && frame.bassNovZ >= BASS_NOV_Z && bpm > 0 && nowWall - this.ettaAt < 30000 / bpm && hasBeat && this.beatTrust >= 0.5 && !inBuild && !inGap && liveSec !== '' && liveSec !== 'break';
         // ALLA_LOOKER (a): en uppbyggnad som hallit ALLA_BUILD_S = intrade -> ETT byte till build-poolen
         let allaBuild = false;
         if (!inBuild) { this.buildSince = -1; this.buildEntered = false; }
@@ -1144,12 +1149,16 @@ export class EffectEngine {
           if (ready && hasBeat && bpm > 0 && this.beatTrust >= 0.5 && !(this.tickNow && this.lastBeatIdx % SWITCH_ON === 0))
             slagOk = now - this.slagWaitAt > SWITCH_ON * 1.25 * 60000 / bpm;
         }
-        if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || (ready && slagOk))) {
+        if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || (ready && (slagOk || bassHit)))) {
         this.switchLook(frame, bpm, tierS, tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, memSection, secEntry, tierChanged);
       } else if (landHit && held > LAND_HOLD_MS && (liveSec === 'high' || liveSec === 'intro')) {
         this.landForce = true;   // basen är tillbaka: aldrig lugna poolen (tierEma bär fortfarande luckan)
         this.switchLook(frame, bpm, tier === LUGN ? FART : tier, tier === LUGN ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
         this.landForce = false; this.landAbsorbUntil = nowWall + LAND_ABSORB_MS;
+      } else if (bassHit && held > MIN_HOLD) {
+        this.bassForce = true;   // ny basgång utan väntande sektionsbyte: nästa look ur sektionens manus/pool, aldrig lugn
+        this.switchLook(frame, bpm, tier === LUGN ? FART : tier, tier === LUGN ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
+        this.bassForce = false; this.landAbsorbUntil = Math.max(this.landAbsorbUntil, nowWall + 16 * 60000 / bpm);
       }
       return this.smartMode;
   }
```
