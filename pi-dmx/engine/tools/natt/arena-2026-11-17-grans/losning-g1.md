# g1 - NY DEL INNE I REFRÄNGEN (high -> high)

**IDÉN.** SectionTracker mäter varje sekundblock hur mycket de två senaste sekundernas klang i 8 band (dB, hela registret inkl. basen ur långsamma vägen) skiljer sig från de 12 sekunderna före, i enheter av de 12 sekundernas egen spridning; är det större än medel + 2 sd av samma mått i den senast hörda musikens 'high'-block (ring 256 block) räknas det som en ny del med samma etikett (`sectionIndex++`, minst 8 s efter förra delen). Dirigenten läser bara sectionIndex, gör det till ett vanligt sektionsbyte (MIN_HOLD, ettan via SWITCH_ON 4) med landningens lookregel (aldrig samma look, aldrig lugn i high), och tröskeln är relativ mot musikens egen fördelning - inget tal är valt per fil.

**AV DE 28 MISSADE** tar jag 2 (vers 2: 171840 71,7 s 16 -> 6,0 slag, 193040 205,3 s 16 -> 3,9). Dessutom flyttas två byten in på gränsen: 171840 128,7 intro 3,9 -> 0,1 och 193040 207,1 uppbyggnad 12,1 -> 0,0. Nya byten utan gräns: 1 (171840 247,7). 151659 är oförändrad (dess vers->vers i high syns knappt i blockklangen, percentil 0,6-0,9 mot bakgrunden).

**DELARNA**
| del | vad den gör | mått (m2 mot bas) |
|---|---|---|
| D1 partStep (analyserSection.ts) | klangnyhet 2 mot 12 block, z mot ringen, sectionIndex++ i high, 8 s minsta ålder; Float32-ringar, ingen allokering per block; sectionIndex bärs redan i split | bär allt nedan |
| D2 ringen överlever låtbytet (m1 -> m2) | sectionReset nollar bara blockringen, inte nyhetshistoriken (annars blind de första 30 high-blocken i varje låt) | +3,71 -> +5,23; 193040 gräns 29 -> 32 %, lag 7,6 -> 6,8 |
| D3 delbytet i dirigenten (effects.ts) | sectionIndex ändras i high -> pendingSecSwitch + partForce (= landningens 'byt alltid, aldrig lugn', tier LUGN -> FART), orsak 'del'; släpps om etiketten byts eller landningen tar bytet; uppslukningen efter landning gäller | ljus +2,7 (m1) / +4,0 (m2) |

**SIFFRORNA** (poäng / gräns / lag / etta / lösa / byten, ljus)
- bas: 22,7 / 8,48 / 41,7 / 0,98 / 3,39
- m1: +3,71 / 24,2 / 8,26 / 45,4 / 0,98 / 3,46, ljus +2,7
- **m2: +5,23 / 25,3 / 8,00 / 45,5 / 1,10 / 3,59, ljus +4,0, missade 34,1 -> 31,5 %**
- per fil m2 (gräns/lag/etta/lösa/byten): 151659 30,0/8,9/57,1/1,3/3,3 (= bas) · 171840 13,6/8,3/29,4/1,1/3,6 (bas 9,1/8,9/20,0/0,8/3,2) · 193040 32,3/6,8/50,0/1,0/3,9 (bas 29,0/7,6/47,8/0,8/3,8)
- Sämre: lösa +0,12/min, byten +0,2/min (171840 +0,4). Effekten är liten och sitter på 4 byten - underlaget är tunt.

**RISKEN.** Live-mic: prat/rumsljud är jämnt och ger låg z; en klapp eller ett utrop i ett tyst parti ger inget (bara i high). Låtbyten: historiken bärs över, så en ny låt med annan klang kan ge ett delbyte tidigt (oftast rätt, låtgränsen). Breaks/långa uppbyggnader: bara 'high', build-låset och I LUCKAN gäller som förut; dropvägen och landningen går före. Workern: inget nytt fält, sectionIndex bärs redan (S_SEC_INDEX); cpu 14x8 + 256 operationer per sekund. sectionIndex räknar nu även delar inne i high: effekterna minnet (spelar in första high-delen), party/rave/snap (gnista vid index >= 2) ser fler delar - det ingår i ljuset +4,0 men ägarens öga saknas. Lotus läser fältet bara i configServer/recorder (visning). Uppslukningen 24 s efter landningen sväljer ett delbyte (193040 148,8 s).

**DIFFEN** (`git diff --no-index src .arena/grans/g1/src`):
```diff
diff --git a/src/ANALYSER_SHARED.md5 b/.arena/grans/g1/src/ANALYSER_SHARED.md5
index f6ba712..2280c74 100644
--- a/src/ANALYSER_SHARED.md5
+++ b/.arena/grans/g1/src/ANALYSER_SHARED.md5
@@ -1,7 +1,7 @@
 # md5 (CRLF->LF) av de gemensamma filerna - samma i lotus-light-link och dmx-control. Skrivs av analyser_shared.py --write
 1e5942108e88af6bfe857ef56a7429b8 analyser.ts
 b5485714f88c45ec0f55f21b9d5ab20e analyserDrop.ts
-692befa55e7fd906cdc3652af3f27baa analyserSection.ts
+76fd695e8afad5cbe30758750544b972 analyserSection.ts
 879ba2122d2a1d3e0eea4082adfd2355 analyserSpectrum.ts
 e92d0d6b4f8dc36abfb8135004260806 analyserLevel.ts
 3b5c715739b3ce3b8668a3a2f0576a6a analyserKick.ts
diff --git a/src/analyserSection.ts b/.arena/grans/g1/src/analyserSection.ts
index d86d2b9..d254fed 100644
--- a/src/analyserSection.ts
+++ b/.arena/grans/g1/src/analyserSection.ts
@@ -82,6 +82,7 @@ export class SectionTracker {
     this.secBlkFeat.length = 0; this.secBlkHi.length = 0; this.secPct = 0;
 
     this.secBlkHighH.length = 0; this.bndRef.fill(0); this.a.boundaryNov = 0;
+    this.partFN = 0; this.partAt = 0;
   }
 
   /** Tar BLOCKSUMMOR. */
@@ -178,6 +179,7 @@ export class SectionTracker {
     }
     if (prev === 'build' || this.a.section === 'build') { if (this.a.section === 'build' && (this.a.secBuildAt === 0 || nowMs - this.a.secBuildSeen > 2000)) this.a.secBuildAt = nowMs; this.a.secBuildSeen = nowMs; }
     this.secCurDbSum += blkDb; this.secCurDbN++; this.secCurDens += bKicks;
+    this.partStep(nowMs, n);
     if (this.a.secDump) { const row = [(nowMs - this.secSongStartMs) / 1000, blkDb, bKicks, bCent, bInt, breaking ? 1 : 0, dropped ? 1 : 0]; for (let i = 0; i < 8; i++) row.push(this.secBlkSpec[i] / n); row.push(st, ['intro', 'low', 'build', 'high', 'break'].indexOf(this.a.section)); this.a.secDump.push(row); }
     if (this.a.section === 'high') { this.lastHighDb = this.secCurDbSum / this.secCurDbN; }
     this.a.levelVsHighDb = Number.isFinite(this.lastHighDb) ? blkDb - this.lastHighDb : 0;
@@ -205,6 +207,29 @@ export class SectionTracker {
     this.secBlkMs = 0; this.secBlkN = 0; this.secBlkInt = 0; this.secBlkKicks = 0; this.secBlkCent = 0; this.secBlkSpec.fill(0); this.secBlkRms2 = 0; this.secBlkBon = 0; this.secBlkBpk = 0; this.secBlkFlux = 0; this.secBlkRms4 = 0;
   }
 
+  /** NY DEL I 'high' (arenan grans g1). */
+  private static readonly PART_NEW = 2; private static readonly PART_OLD = 12; private static readonly PART_Z = 2; private static readonly PART_AGE_MS = 8000;
+  private partF = new Float32Array(14 * 8); private partFN = 0; private partH = new Float32Array(256); private partHN = 0; private partHP = 0; private partAt = 0;
+  private partStep(nowMs: number, n: number): void {
+    const F = this.partF, NW = SectionTracker.PART_NEW, L = NW + SectionTracker.PART_OLD, o = (this.partFN % L) * 8;
+    for (let i = 0; i < 8; i++) F[o + i] = 20 * Math.log10(this.secBlkSpec[i] / n + 1e-7);
+    if (++this.partFN < L || this.a.section !== 'high') return;
+    let d = 0;
+    for (let i = 0; i < 8; i++) {
+      let c = 0, m = 0, s = 0;
+      for (let j = 0; j < L; j++) { const v = F[((this.partFN - 1 - j) % L) * 8 + i]; if (j < NW) c += v; else { m += v; s += v * v; } }
+      c /= NW; m /= L - NW; s = Math.sqrt(Math.max(0, s / (L - NW) - m * m));
+      const x = (c - m) / (s + 1); d += x * x;
+    }
+    d = Math.sqrt(d / 8);
+    const H = this.partH, hn = this.partHN;
+    if (hn >= 30 && nowMs - Math.max(this.a.sectionStartMs, this.partAt) >= SectionTracker.PART_AGE_MS) {
+      let mu = 0, v2 = 0; for (let i = 0; i < hn; i++) { mu += H[i]; v2 += H[i] * H[i]; } mu /= hn;
+      if (d >= mu + SectionTracker.PART_Z * Math.sqrt(Math.max(0, v2 / hn - mu * mu))) { this.a.sectionIndex++; this.partAt = nowMs; }
+    }
+    H[this.partHP] = d; this.partHP = (this.partHP + 1) & 255; if (hn < 256) this.partHN++;
+  }
+
   /** RANGBERÄKNINGEN. */
   private rankTier(nb: number): number {
     const D = this.secBlkDb, K = this.secBlkDens, C = this.secBlkCentH, wk = SectionTracker.RANK_W_DENS, wc = SectionTracker.RANK_W_CENT;
diff --git a/src/effects.ts b/.arena/grans/g1/src/effects.ts
index 8957bb7..1d70a46 100644
--- a/src/effects.ts
+++ b/.arena/grans/g1/src/effects.ts
@@ -567,6 +567,7 @@ export class EffectEngine {
    private tickNow = false; private rNowP = 0; private rNowWall = 0; private rDt = 0; private rDtT = 0; private rBeatMs = 0; private rBeatEnv = 0; private rDTarget = 0; private rMd = 0; private rT = 0; private rAnchorHue = 0; private rDrive = 0; private rInputGate = 0;   // RUTANS TAL (se EN KLOCKA PER RUTA): fält i stället för argument - ett decimaltal som skickas till en metod packas in (GC-jakten 10-16)
   private anaDropAt = -1e12;   // analysatorns drop som blev minidrop (se REFRÄNGEN DIREKT EFTER EN MINIDROP-DROP)
   private landForce = false; private landAbsorbUntil = -1;   // LANDNINGEN (a7)
+  private partForce = false; private partPending = false; private lastSecIdx = -1;   // NY DEL I REFRÄNGEN (grans g1): analysatorns sectionIndex i 'high'
   private lastBuildStart = 0; private lastMiniSeen = 0; private gapUntil = -1;   // I LUCKAN (11-16): inget lookbyte från uppbyggnadssignalen tills basen är tillbaka
   private nearAt = -1e12; nearCount = 0;   // NASTAN-DROP
   private secCeil = 1; private histAt = -1e12; private rampLvl = 0; private levelRamp = 1; private buildLookAt = 0; buildProg = 0; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
@@ -810,15 +811,16 @@ export class EffectEngine {
         if (secKey && this.carryKey && secKey !== this.carryKey) { this.manus.delete(this.carryKey); this.carryKey = ''; }   // burna looken släpps (softenRange)
         if (secKey && secKey !== this.visitKey) { varv = (this.secVisits.get(secKey) ?? 0) + 1; this.secVisits.set(secKey, varv); this.visitKey = secKey; }
         const nextLook = HIGH_VARV > 0 && secKey === 'high' && varv >= HIGH_VARV && !dropSwitch && !!kept;
-        let keep = !nextLook && !!kept && fits(kept) && !(dropSwitch && !this.bassStrong(kept)) && !(this.landForce && (kept === this.smartMode || tierRank(kept) === 0));   // DROP_BASS_LOOK: refrängslooken bara om den är basstark; landningen byter alltid
+        const force = this.landForce || this.partForce;
+        let keep = !nextLook && !!kept && fits(kept) && !(dropSwitch && !this.bassStrong(kept)) && !(force && (kept === this.smartMode || tierRank(kept) === 0));   // DROP_BASS_LOOK: refrängslooken bara om den är basstark; landningen byter alltid
         const avoid = nextLook ? kept : undefined;
         if (nextLook) { const h = (this.manusHist.get(secKey) ?? []).filter((m) => m !== kept && m !== this.smartMode && fits(m)); if (h.length) { kept = this.pickLook(h.map((m) => ({ m }))); keep = true; this.manus.set(secKey, kept); console.log(`[dirigent] high-varv ${varv}: nasta look "${kept}"`); } }
-        if (!keep && secKey && !(dropSwitch) && !nextLook) { const back = this.manusHist.get(secKey)?.find((m) => m !== kept && fits(m) && !(this.landForce && (m === this.smartMode || tierRank(m) === 0))); if (back) { kept = back; keep = true; this.manus.set(secKey, back); } }
+        if (!keep && secKey && !(dropSwitch) && !nextLook) { const back = this.manusHist.get(secKey)?.find((m) => m !== kept && fits(m) && !(force && (m === this.smartMode || tierRank(m) === 0))); if (back) { kept = back; keep = true; this.manus.set(secKey, back); } }
         if (keep && kept === this.smartMode) { this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true; }   // manuset sager samma look - inget byte
         else {
         this.lastSmartSwitchMs = now; this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true;
         // DIAGNOSTIK (se switchWhy): starkaste orsaken forst. 'dwell' sist = klockan var det enda skalet.
-        this.switchWhy = dropSwitch ? 'drop' : this.landForce ? 'landning'
+        this.switchWhy = dropSwitch ? 'drop' : this.landForce ? 'landning' : this.partForce ? 'del'
           : (memSection || secEntry) ? 'sektion'
           : (buildEntry || allaBuild) ? 'build' : buildExit ? 'build-slut' : tierChanged ? 'tier' : 'dwell';
         this.switchCount++;
@@ -1067,6 +1069,10 @@ export class EffectEngine {
         const dropEntry = liveSecChanged && liveSec === 'high' && nowWall - this.anaDropAt < 2000;
         if (liveSec !== '' && liveSec !== this.lastLiveSection) { if (this.lastLiveSection !== '') console.log(`[dirigent] sektion ${this.lastLiveSection} -> ${liveSec} (nr ${frame.sectionIndex ?? 0}, tier ${frame.sectionTier ?? '-'})`); this.lastLiveSection = liveSec; }   // (intro glommer inte lookerna langre - LÅTMANUS glomms bara pa en verklig latgrans)
         if (liveSecChanged) this.pendingSecSwitch = nowWall >= this.landAbsorbUntil;   // LANDNINGEN: detektorns sena byte efter landningen är redan gjort
+        const secIdx = frame.sectionIndex ?? 0;
+        if (liveSec !== 'high' || liveSecChanged) this.partPending = false;
+        else if (this.lastSecIdx >= 0 && secIdx !== this.lastSecIdx && nowWall >= this.landAbsorbUntil) { this.partPending = true; this.pendingSecSwitch = true; }
+        this.lastSecIdx = secIdx;
         const memSection = liveSecChanged && nowWall >= this.landAbsorbUntil;   // (latminnets sektionsgrans mem* borttagen 11-09 - sattes aldrig)
         const phraseMs = this.cfg.beat && this.cfg.beat.bpm > 0 ? 16 * 60000 / this.cfg.beat.bpm : 0;
         // LÅTMANUS: sektionsbytet landar på sektionens EGET taktraster (början av takt 2, 4, 6 ... sedan sektionsstart) i stället för
@@ -1145,11 +1151,13 @@ export class EffectEngine {
             slagOk = now - this.slagWaitAt > SWITCH_ON * 1.25 * 60000 / bpm;
         }
         if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || (ready && slagOk))) {
-        this.switchLook(frame, bpm, tierS, tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, memSection, secEntry, tierChanged);
+        this.partForce = this.partPending && !dropSwitch && !dropEntry; const lift = this.partForce && tierS === LUGN;
+        this.switchLook(frame, bpm, lift ? FART : tierS, lift ? 'fart' : tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, memSection, secEntry, tierChanged);
+        this.partForce = false; this.partPending = false;
       } else if (landHit && held > LAND_HOLD_MS && (liveSec === 'high' || liveSec === 'intro')) {
         this.landForce = true;   // basen är tillbaka: aldrig lugna poolen (tierEma bär fortfarande luckan)
         this.switchLook(frame, bpm, tier === LUGN ? FART : tier, tier === LUGN ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
-        this.landForce = false; this.landAbsorbUntil = nowWall + LAND_ABSORB_MS;
+        this.landForce = false; this.landAbsorbUntil = nowWall + LAND_ABSORB_MS; this.partPending = false;
       }
       return this.smartMode;
   }
```
