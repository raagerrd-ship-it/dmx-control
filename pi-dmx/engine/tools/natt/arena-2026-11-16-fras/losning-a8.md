# a8 - VAD ÄGAREN HÖR: frasbytet på bandnyheten

**Idén.** Det som ändras FÖRST vid ägarens gränser är nivån i banden: redan ett slag efter gränsen skiljer sig det senaste slagets medel-dB (sub/bas/mid/diskant) från de åtta slagen före. Analysatorn mäter den nyheten (`frame.fraseZ`), och dirigenten byter look på taktklockans slag så fort den är stor - ett slag efter gränsen - i stället för att vänta på sektionsdetektorn + 2 s + slaggrind.

**Var fördröjningen satt i bas** (min analys av bas kr-*.json, 83 gränser): 27 gränser fick ALDRIG något sektionsbyte inom 16 slag. Av resten: detektorn median 3,0 slag (p25 2,0 / p75 6,5), sedan dirigenten median 4,7 slag till (p25 3,8 / p75 9,5). Dessutom är 21 av 53 sektionsbyten lösa.

**Särdragsvalet** (3 sonder = fältdump av analysatorn på övningen med bas-dist, `probe.mjs`): AUC ett slag efter gränsen mot andra ettor: level 0,81, energy 0,77, levelVU 0,75, sub 0,74 ... intensity 0,70, treble 0,62. Offline-simulering mot bas-bytena: max|z| över fyra band (sub, bas, mid, diskant) slog nivån ensam och alla 8 band. En tröskel för alla filer, inga mallar per fil.

## Delarna

| del | vad den gör | mått (övningen) |
|---|---|---|
| A analyser.ts `fraseStep` | var 50 ms: dB i 4 band i en ring (256 x 4 Float32, ingen allokering per hop); z = abs(medel senaste slaget - medel 8 slag före) / (sd + 0,3 dB), max över banden -> `frame.fraseZ`. Snabba sidan (specAbs och bpm finns där), inget i split.ts | bär bytet |
| B effects.ts frasbytet | på en tick, sektion inte build, ej buildLock/I LUCKAN, held > MIN_HOLD, tillit >= 0,5, fraseZ > FRAS_Z -> switchLook med tvingad NY look (switchWhy 'fras', skriver inte manus) | m2 (FRAS_Z 3,8): 4 byten, 2 träffar (+2,6 gräns). m1 (2,5 + bara slag 1-2 i takten): 14 byten, 3 träffar, 9 lösa |
| C effects.ts absorbering | 16 slag efter ett frasbyte: sektionsbytet tar över looken (manus = nuvarande) om sektionen saknar egen look; har den en annan look byts den efter 2 s i stället för MIN_HOLD | håller byten/lösa nere |

## Siffrorna (poäng / gräns / lag / etta / lösa / byten, ljus)

- **m2 (koden nu): +2,72** - 15,3 % / 9,8 / 17,3 % / 1,18 / 3,61, ljus -0,2. Per fil gräns/lag: 151659 3/11,6 (bas 3/11,6), 171840 14/9,5 (bas 9/10,0), 193040 29/8,2 (bas 26/8,4).
- m1 (FRAS_Z 2,5 och `(this.lastBeatIdx & 3) <= 1`): +5,93 - 16,4 / 9,4 / 20,4 / **1,56** / 4,06, ljus -0,1; 151659 3/11,2, 171840 14/9,5, 193040 32/7,4. Lösa 1,56 mot spärren 1,64 var för nära för kontrollmängden, därför m2. Jokern kan ta m1:s tröskel om andra delar sänker lösa.
- Sämre: 151659 vinner inget (vers -> vers i högt parti syns inte i nivån); etta oförändrad i m2; frasbytets precision bara 50 % (m2) / 21 % (m1).

## Risken

Live-mic: z mäts mot de egna 8 slagen, så nivåförskjutning tar bort sig själv, men prat/brus i en tyst lucka ger stort z (golvet 0,3 dB och MIN_HOLD tar det mesta). Låtbyten: ett tvärt byte ger ett frasbyte (mest rätt). Breaks/långa uppbyggnader: spärrat i 'build', I LUCKAN och buildLock; dropvägen orörd (dropSwitch går före, 12 s-regeln opåverkad). Tiern är trög: frasbytet väljer ur den gamla tierns pool, så en refrängstart kan få en lugnare look tills sektionen byter. Workern: fältet räknas på snabba sidan. bpm 0 ger z 0.

## Diffen (`git diff --no-index src .arena/fras/a8/src`)

```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/fras/a8/src/ANALYSER_SHARED.md5
index f6ba712..bcb598e 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/fras/a8/src/ANALYSER_SHARED.md5
@@ -1,5 +1,5 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
-1e5942108e88af6bfe857ef56a7429b8 analyser.ts
+fbece64e4e0fe3b1e9c1f28511b26b00 analyser.ts
 b5485714f88c45ec0f55f21b9d5ab20e analyserDrop.ts
 692befa55e7fd906cdc3652af3f27baa analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
diff --git a/src/analyser.ts b/.arena/fras/a8/src/analyser.ts
index 5dcd901..7701023 100644
--- a/src/analyser.ts
+++ b/.arena/fras/a8/src/analyser.ts
@@ -131,6 +131,7 @@ export interface Frame {
   sectionTier: number;   // 0 lag / 1 mellan / 2 hog
   repeatSim: number; repeatAgoMs: number; repeatSection: string;   // UPPREPNING
   expectHighInMs: number; prevSection: string; levelVsHighDb: number; sectionBars: number;   // SEKTIONSMINNE + FORUTSAGELSE
+  fraseZ: number;
   spec: Spectrum;   // Rikt spektrum + per-band onset
   specAbs: Spectrum;   // Absolut per-band magnitud före AGC, för Lotus ljusväg och bandandelar
   bodyDb: number;   // BASKROPPEN I RA dB
@@ -735,7 +736,7 @@ export class Analyser {
       silent: true, level: 0, levelRaw: 0, levelVU: 0, energy: 0, centroid: 0, flux: 0,
       kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
       dropCount: 0, miniDropCount: 0, buildStartCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, bassLevel: 1, midHiDb: -120, inZone: false, breaking: false, buildUp: 0, buildProg: 0, inRiser: false, profile: this.character.outProfile, beatAnchorMs: 0,
-      kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
+      kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0, fraseZ: 0,
       spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
     };
     for (const o of [this.outFrame, this.character.outProfile, this.outSpec, this.outSpecAbs, this.outOnset, this.outDrum]) stabiliseNumbers(o);
@@ -949,7 +950,7 @@ export class Analyser {
     { let s2 = 1e-12; for (let b = 3; b < 8; b++) { const lin = Math.pow(10, (FB ? this.bands.fbDbRaw : this.bandDbRaw)[b] / 20); s2 += lin * lin; } f.midHiDb = 20 * Math.log10(Math.sqrt(s2)); }
     f.dropCount = this.drop.dropCount; f.miniDropCount = this.drop.miniDropCount; f.buildStartCount = this.drop.buildStartCount; f.dropDemoted = this.drop.dropDemoted; f.dropSpaced = this.drop.dropSpaced; f.dropRiseDb = this.drop.dropRiseDb;
     f.nearDropDb = this.drop.nearDropDb; f.nearDipDb = this.drop.nearDipDb; f.liftDb = this.drop.liftDb; f.stopCount = this.drop.stopCount; f.stopS = this.drop.stopS; f.inZone = inZone; f.breaking = breaking; f.buildUp = this.buildUp; f.inRiser = inRiser;
-    f.kickAtMs = kickAtMs; f.barShift = -1;
+    f.kickAtMs = kickAtMs; f.barShift = -1; f.fraseZ = this.role === 'slow' ? 0 : this.fraseStep(A, nowWallA);
     f.beatPhaseMs = this.beatPhaseMs > 0 ? this.beatPhaseMs - Analyser.GRID_PHASE_OFFSET_MS : this.beatPhaseMs;
     f.beatPhaseConf = this.beatPhaseConf;
     this.sections.sectionAggStep();
@@ -967,6 +968,25 @@ export class Analyser {
     }
     return f;
   }
+  private static readonly NV_LEN = 256;
+  private nvRing = new Float32Array(4 * Analyser.NV_LEN); private nvPos = 0; private nvN = 0; private nvAt = -1e12; private nvZ = 0;
+  private fraseStep(A: ArrayLike<number>, nowMs: number): number {
+    if (nowMs - this.nvAt < 50) return this.nvZ;
+    this.nvAt = nowMs; const L = Analyser.NV_LEN, R = this.nvRing, p = this.nvPos;
+    R[4 * p] = 20 * Math.log10(A[0] + 1e-7); R[4 * p + 1] = 20 * Math.log10(A[2] + 1e-7); R[4 * p + 2] = 20 * Math.log10(A[4] + 1e-7); R[4 * p + 3] = 20 * Math.log10(A[6] + 1e-7);
+    this.nvPos = (p + 1) % L; if (this.nvN < L) this.nvN++;
+    const P = this.localBpm > 0 ? Math.round(60000 / this.localBpm / 50) : 0, Q = 8 * P;
+    if (P < 1 || P + Q > this.nvN) return this.nvZ = 0;
+    let z = 0;
+    for (let b = 0; b < 4; b++) {
+      let sp = 0, s = 0, s2 = 0;
+      for (let i = 0; i < P; i++) sp += R[4 * ((p - i + L) % L) + b];
+      for (let i = P; i < P + Q; i++) { const v = R[4 * ((p - i + L) % L) + b]; s += v; s2 += v * v; }
+      const m = s / Q, zb = Math.abs(sp / P - m) / (Math.sqrt(Math.max(0, s2 / Q - m * m)) + 0.3);
+      if (zb > z) z = zb;
+    }
+    return this.nvZ = z;
+  }
   clock: BeatFeed | null = null;   // ANALYSATORNS KLOCKA utan taktväg
   readonly clockOut: ClockCfg = { beat: undefined, beatErr: undefined };
   /** Klockans utfall till motorn. */
diff --git a/src/effects.ts b/.arena/fras/a8/src/effects.ts
index ff4645c..2fc7b0b 100644
--- a/src/effects.ts
+++ b/.arena/fras/a8/src/effects.ts
@@ -260,6 +260,7 @@ const MANUS_TOP = 2;
  *  var som helst i takten (konsertReplay --slag). Med N väntar bytet (wantSwitch/buildEntry, inte drop/build-händelserna) in nästa
  *  taktklocka-tick med beatIdx % N = 0 (1 = nästa slag, 4 = ettan), högst N slag x 1,25. */
 const SWITCH_ON = 1;
+const FRAS_Z = 3.8, FRAS_ABSORB_BEATS = 16;   // FRASBYTET (arenan fras a8)
 /** HIGH-VARV (standard 2026-11-04, ägaren: 'pröva b'; megamix tryckvag 36 % = manusets återseende): när refrängen (high) kommer tillbaka
  *  för 4:e gången eller fler i samma låt får den NÄSTA look - minst spelad ur sektionens manusHist, annars ny ur poolen - i stället för
  *  manusets. 1:a-3:e gången oförändrade (refrängen känns igen). Drop-bytet orört. natt --snabb: mega tryckvag 36 -> 21 %, lampspr 83 -> 88,
@@ -651,6 +652,7 @@ export class EffectEngine {
   private smartCount = 0;
   private recentLooks: Mode[] = [];   // MIX_V2: de senast valda lookerna (nyhetsstraff)
   private pendingSecSwitch = false;
+  private fraseForce = false; private fraseUntil = -1;
   /** DIAGNOSTIK (2026-10-06, natt-banken): VARFOR senaste look-bytet skedde, och hur manga byten som skett.
    *  Skrivs bara - inget beslut i motorn laser dem, sa showen ar bit-identisk. 'dwell' betyder att klockan var
    *  det ENDA skalet, alltsa ett byte utan musikalisk grund; alla andra varden ar nagot i laten. */
@@ -809,15 +811,15 @@ export class EffectEngine {
         if (secKey && this.carryKey && secKey !== this.carryKey) { this.manus.delete(this.carryKey); this.carryKey = ''; }   // burna looken släpps (softenRange)
         if (secKey && secKey !== this.visitKey) { varv = (this.secVisits.get(secKey) ?? 0) + 1; this.secVisits.set(secKey, varv); this.visitKey = secKey; }
         const nextLook = HIGH_VARV > 0 && secKey === 'high' && varv >= HIGH_VARV && !dropSwitch && !!kept;
-        let keep = !nextLook && !!kept && fits(kept) && !(dropSwitch && !this.bassStrong(kept));   // DROP_BASS_LOOK: refrängslooken bara om den är basstark
+        let keep = !this.fraseForce && !nextLook && !!kept && fits(kept) && !(dropSwitch && !this.bassStrong(kept));   // DROP_BASS_LOOK: refrängslooken bara om den är basstark
         const avoid = nextLook ? kept : undefined;
         if (nextLook) { const h = (this.manusHist.get(secKey) ?? []).filter((m) => m !== kept && m !== this.smartMode && fits(m)); if (h.length) { kept = this.pickLook(h.map((m) => ({ m }))); keep = true; this.manus.set(secKey, kept); console.log(`[dirigent] high-varv ${varv}: nasta look "${kept}"`); } }
-        if (!keep && secKey && !(dropSwitch) && !nextLook) { const back = this.manusHist.get(secKey)?.find((m) => m !== kept && fits(m)); if (back) { kept = back; keep = true; this.manus.set(secKey, back); } }
+        if (!keep && secKey && !(dropSwitch) && !nextLook && !this.fraseForce) { const back = this.manusHist.get(secKey)?.find((m) => m !== kept && fits(m)); if (back) { kept = back; keep = true; this.manus.set(secKey, back); } }
         if (keep && kept === this.smartMode) { this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true; }   // manuset sager samma look - inget byte
         else {
         this.lastSmartSwitchMs = now; this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true;
         // DIAGNOSTIK (se switchWhy): starkaste orsaken forst. 'dwell' sist = klockan var det enda skalet.
-        this.switchWhy = dropSwitch ? 'drop'
+        this.switchWhy = dropSwitch ? 'drop' : this.fraseForce ? 'fras'
           : (memSection || secEntry) ? 'sektion'
           : (buildEntry || allaBuild) ? 'build' : buildExit ? 'build-slut' : tierChanged ? 'tier' : 'dwell';
         this.switchCount++;
@@ -940,7 +942,7 @@ export class EffectEngine {
         // bassline >= 0,6 (där eko själv följer basnoterna) -> eko, utom i build, efter drop, eller om eko just gick.
         if ((frame.profile.bassline ?? 0) >= EKO_BASS && this.smartMode !== 'eko' && lastLookBeforeSwitch !== 'eko' && !BUILD_LOOKS.includes(this.smartMode)
             && this.switchWhy !== 'drop' && this.cfg.rotation?.eko !== false && frame.section !== 'high' && secKey !== 'high') this.smartMode = 'eko';
-        if (secKey) this.manus.set(secKey, this.smartMode);   // LÅTMANUS: sektionstypens look resten av laten
+        if (secKey && !this.fraseForce) this.manus.set(secKey, this.smartMode);   // LÅTMANUS: sektionstypens look resten av laten
         if (secKey) { const h = this.manusHist.get(secKey) ?? []; if (!h.includes(this.smartMode)) h.push(this.smartMode); this.manusHist.set(secKey, h); }
         }
         this.buildLookAt = BUILD_LOOKS.includes(this.smartMode) ? nowWall : 0;   // BUILD SOM HÅLLER: när build-looken började
@@ -1065,7 +1067,9 @@ export class EffectEngine {
         // sektionen in i high inom 2 s efter en sådan drop byts looken direkt, som vid en full drop (ingen MIN_HOLD/fras/slag-väntan).
         const dropEntry = liveSecChanged && liveSec === 'high' && nowWall - this.anaDropAt < 2000;
         if (liveSec !== '' && liveSec !== this.lastLiveSection) { if (this.lastLiveSection !== '') console.log(`[dirigent] sektion ${this.lastLiveSection} -> ${liveSec} (nr ${frame.sectionIndex ?? 0}, tier ${frame.sectionTier ?? '-'})`); this.lastLiveSection = liveSec; }   // (intro glommer inte lookerna langre - LÅTMANUS glomms bara pa en verklig latgrans)
-        if (liveSecChanged) this.pendingSecSwitch = true;
+        const fraseAbsorb = liveSecChanged && now < this.fraseUntil;
+        if (fraseAbsorb && (!this.manus.has(liveSec) || this.manus.get(liveSec) === this.smartMode)) this.manus.set(liveSec, this.smartMode);
+        else if (liveSecChanged) this.pendingSecSwitch = true;
         const secOldEnough = (frame.sectionAgeMs ?? 1e9) >= SECTION_UNIT_MIN_MS;   // SECTION_UNIT: ingen switch pa en sektion yngre an SECTION_UNIT_MIN_MS (detektorflapp)
         const memSection = liveSecChanged;   // (latminnets sektionsgrans mem* borttagen 11-09 - sattes aldrig)
         const phraseMs = this.cfg.beat && this.cfg.beat.bpm > 0 ? 16 * 60000 / this.cfg.beat.bpm : 0;
@@ -1136,7 +1140,7 @@ export class EffectEngine {
         const buildExit = BUILD_LOOKS.includes(this.smartMode) && (frame.section === 'high' || (this.buildLookAt > 0 && nowWall - this.buildLookAt > 2000 && (frame.intensity ?? 0) >= 0.95));
         // (BUILDEN LANDAR I REFRÄNGEN - sektionen high efter >= 4 s build = drop - borttagen 10-11 kväll: 'falsk' 21:42:39, 17 % på baslyft; se DROP_JUMP_DB)
         const buildLock = frame.section === 'build' && this.buildLookAt > 0 && BUILD_LOOKS.includes(this.smartMode) && nowWall - this.buildLookAt < 30000 && !dropSwitch && !buildExit;   // BUILD SOM HÅLLER - V123: bara så länge sektionen ÄR build
-        const ready = (wantSwitch || buildEntry) && held > MIN_HOLD && phraseOk;
+        const ready = (wantSwitch || buildEntry) && (held > MIN_HOLD || (now < this.fraseUntil && this.pendingSecSwitch)) && phraseOk;
         let slagOk = true;   // BYTE PÅ SLAGET (SWITCH_ON)
         if (SWITCH_ON > 0) {
           if (!ready) this.slagWaitAt = -1; else if (this.slagWaitAt < 0) this.slagWaitAt = now;
@@ -1145,6 +1149,10 @@ export class EffectEngine {
         }
         if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || allaBuild || concertBuild || buildExit || (ready && slagOk))) {
         this.switchLook(frame, bpm, tierS, tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, memSection, secEntry, tierChanged);
+      } else if (liveSec && liveSec !== 'build' && !buildLock && !inGap && held > MIN_HOLD && hasBeat && this.tickNow && bpm > 0 && this.beatTrust >= 0.5 && frame.fraseZ > FRAS_Z) {
+        this.fraseForce = true;
+        this.switchLook(frame, bpm, tierS, tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
+        this.fraseForce = false; this.fraseUntil = now + FRAS_ABSORB_BEATS * 60000 / bpm;
       }
       return this.smartMode;
   }
```
