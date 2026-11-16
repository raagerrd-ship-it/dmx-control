# r0 (JOKERN): dirigentens grindar + landningen i refrängen

**IDÉN.** Ett sektionsbyte väntar inte längre 2 s på att sektionen ska bli gammal. Det väntar in analysatorns nästa etta (högst 5 slag), och builden gör samma sak. När basen kommer tillbaka efter en lucka (analysatorns minidrop) i high eller intro byts looken direkt. Det är där ägaren hör att en ny vers eller refräng börjar inne i ett långt 'high', alltså de gränser som detektorn missar.

**VAR FÖRDRÖJNINGEN SATT** (min analys av bas-json): detektorn kom median 3,2 slag efter gränsen, och dirigenten lade på median 4,6 slag. I r0 är dirigentens del median 2,5 slag (medel 3,6). 13 av 17 landningsbyten sitter inom ±1 slag från en ägargräns.

**DELARNA** (bara effects.ts; mått mot bas eller mellan mätningarna)
| del | vad den gör | mått |
|---|---|---|
| K1 SWITCH_ON 1->4 (a1/a5/a6) | sektionsbytet väntar in ettan, högst 5 slag | etta 17,7 -> 41,7 % (bär ~+12) |
| K2 2 s-åldern bort (a6 A) | `secOldEnough`/SECTION_UNIT_MIN_MS borttagna | m1->m3: lag 9,04->8,48 (~+0,8), lösa 1,12->0,98; slocknat l171840 +0,9 pe -> 0 |
| K3 väntklockan efter spärrarna (a1 D2) | slagWaitAt nollas medan buildLock/I LUCKAN håller | ingår i m1 |
| K4 build genom grinden (a6 C) | allaBuild/concertBuild/buildExit väntar in ettan; buildEntry hålls via pendingSecSwitch | ingår i m1 |
| L1 landningen (a7 D1+D4) | minidrop, held > 6 s, sektion high/intro -> switchLook direkt, ny look, aldrig lugn | 17 byten, 13 träffar; gräns 12,7 -> 22,7 % (bär ~+10) |
| L2 uppslukning 24 s (a7 D2) | sektionsbyten inom 24 s efter landningen tas inte (pendingSecSwitch och memSection) | byten 3,39/min (bas 3,52) |
| L3 bara high/intro (nytt) | i a7 träffade landningen i 'low' 3 av 15 (mest lösa, mörka looker) | ljuset: a7 -4,3 DISK -> r0 +1,5 |

**MÄTNINGARNA** (frasdom, poäng / gräns / lag / etta / lösa / byten / ljus)
- m1 K1+K3+K4+L1-3 + åldern kvar för low/break: +23,73 / 22,7 / 9,04 / 42,4 / 1,12 / 3,34 / +1,4 (slocknat +0,96 pe, precis under spärren)
- m2 + K2 helt + landningens håll 6 -> 8 s: +23,81 / 22,7 / 8,48 / 40,9 / 0,93 / 3,34 / **-1,2** (refrängen i l160345 fick looken 'minnet', rAbest high 0,61 -> 0,54)
- **m3 = levererad** (m2 med hållet tillbaka på 6 s): **+24,21** / 22,7 / 8,48 / 41,7 / 0,98 / 3,39 / **+1,5** (takt +2,5, dynamik -0,8, koreografi +4,0; slocknat +0,67 pe, lampspr +25,5/+4,3/-1,0 %)
- m4 m3 + a2 B (SECTION_RUN 5->4, RUN_IN 3->2): +25,99 / 22,7 / 8,68 / 45,9 / 1,18 / 3,43 / +1,8. Ej inlagd: allt kommer från etta, medan lag och lösa blev sämre (lösa +0,20/min, 151659 1,5) och detektorn ändras inför dropdom3. Den kan lyftas in i runda 2.

Per fil m3 (gräns/lag/etta/lösa/byten): 151659 30,0/8,9/57,1/1,3/3,3 · 171840 9,1/8,9/20,0/0,8/3,2 · 193040 29,0/7,6/47,8/0,8/3,8.
Sämre än bas: 171840 etta 25 -> 20 % (klockans etta ligger rätt bara 45 % där), slocknat i l160345 1,4 -> 3,4 % (lågsektionen får 'vidga').

**a5:s nyhet:** den lever i ladan. Bänken kör samma delning (fast/slow) som ladan, och fbDbRaw räknas i snabba vägen. Band 0-2 är dock alltid 0 med FAST_BANDS, så basen räknas inte med. Jag lade inte in den, eftersom den gör samma jobb som landningen (direktbyte på en ny del, en källa).

**RISKEN.** Ljusdomaren reagerar på VILKEN look som spelar (sond l160345: m2 gav 'minnet' i refrängen och ljus -1,2, m1 'droppar' och +1,4; m3 har samma l160345-siffror som m1). Landningen lägger en B-look i långa refränger, och det kan slå åt båda hållen på nya låtar. Låtar med en lucka var fjärde takt landar var 7-8 s, med 6 s håll. Live-mic: minidropens tajmning flyttas med bruset, och uppslukningen kan då svälja en äkta gräns i 24 s. Utan 2 s-åldern kan detektorfladder ge ett extra byte (MIN_HOLD 8 s är taket). Workern påverkas inte: inga nya ramfält och ingen allokering.

**DIFFEN** (`git diff --no-index src/effects.ts .arena/fras/r0/src/effects.ts`):
```diff
diff --git a/src/effects.ts b/.arena/fras/r0/src/effects.ts
index ff4645c..8957bb7 100644
--- a/src/effects.ts
+++ b/.arena/fras/r0/src/effects.ts
@@ -259,7 +259,7 @@ const MANUS_TOP = 2;
  *  SECTION_UNIT_MIN_MS gammal - phraseOk:s reserv (held > MIN_HOLD + en fras) är nästan alltid sann efter en hållen look, så bytet landade
  *  var som helst i takten (konsertReplay --slag). Med N väntar bytet (wantSwitch/buildEntry, inte drop/build-händelserna) in nästa
  *  taktklocka-tick med beatIdx % N = 0 (1 = nästa slag, 4 = ettan), högst N slag x 1,25. */
-const SWITCH_ON = 1;
+const SWITCH_ON = 4;   // fras r0: ettan
 /** HIGH-VARV (standard 2026-11-04, ägaren: 'pröva b'; megamix tryckvag 36 % = manusets återseende): när refrängen (high) kommer tillbaka
  *  för 4:e gången eller fler i samma låt får den NÄSTA look - minst spelad ur sektionens manusHist, annars ny ur poolen - i stället för
  *  manusets. 1:a-3:e gången oförändrade (refrängen känns igen). Drop-bytet orört. natt --snabb: mega tryckvag 36 -> 21 %, lampspr 83 -> 88,
@@ -307,8 +307,8 @@ const PULSE_IDX_INIT = -2e9;
  *      detektorn da satt fast pa high; rotorsaken (ingen nollning vid latbyte) ar rattad 09-23. Sedan 10-12: LÅTMANUS. */
 /** SECTION_UNIT (ladan 16:45): forvarningens 'high' 600 ms fore en forutsedd refrang och drop-fonstrets 'high' raknas INTE som sektionsgrans
  *  (de gav high<->low-hopp pa 1-2 s nar refrangen uteblev). Bara den raa sektionen, och den maste vara minst DMX_SECTION_UNIT_MIN_MS gammal. */
+const LAND_HOLD_MS = 6000, LAND_ABSORB_MS = 24000;   // LANDNINGEN (a7): minsta hålltid före landningsbytet; sektionsbyten inom fönstret efter tas inte
 const GAP_HOLD_MS = 4000;   // I LUCKAN: spärren efter uppbyggnadssignalen släpper senast efter 4 s (signal -> landning median 1,8 s)
-const SECTION_UNIT_MIN_MS = 2000;   // 4000 -> 2000 (ladan 10-21: ny look 4-6 s efter sektionsbytet; replay 4,0 -> 2,0 s, korta looker 3 -> 2)
 /** LÅTMANUS (10-12 kväll, ägaren: "olika effekter hoppar hela tiden ... mer som att den är förprogrammerad" + "allt mer känns anpassat
  *  efter låten och som att de hänger ihop"). ERSÄTTER frasväxlingen (A/B-look var 8:e takt), basgångs-, karaktärs- och tempobytet,
  *  reservklockan och 'ny låt' på sektionen intro. Låten får ETT manus: första gången en sektionstyp (intro/low/build/high/break) kommer
@@ -566,6 +566,7 @@ export class EffectEngine {
   private lastDemoted = 0; private lastSpaced = 0; private lastStopCount = 0;   // analysatorns monotona räknare (a3: dropDemoted/dropSpaced/stopCount)
    private tickNow = false; private rNowP = 0; private rNowWall = 0; private rDt = 0; private rDtT = 0; private rBeatMs = 0; private rBeatEnv = 0; private rDTarget = 0; private rMd = 0; private rT = 0; private rAnchorHue = 0; private rDrive = 0; private rInputGate = 0;   // RUTANS TAL (se EN KLOCKA PER RUTA): fält i stället för argument - ett decimaltal som skickas till en metod packas in (GC-jakten 10-16)
   private anaDropAt = -1e12;   // analysatorns drop som blev minidrop (se REFRÄNGEN DIREKT EFTER EN MINIDROP-DROP)
+  private landForce = false; private landAbsorbUntil = -1;   // LANDNINGEN (a7)
   private lastBuildStart = 0; private lastMiniSeen = 0; private gapUntil = -1;   // I LUCKAN (11-16): inget lookbyte från uppbyggnadssignalen tills basen är tillbaka
   private nearAt = -1e12; nearCount = 0;   // NASTAN-DROP
   private secCeil = 1; private histAt = -1e12; private rampLvl = 0; private levelRamp = 1; private buildLookAt = 0; buildProg = 0; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
@@ -797,7 +798,7 @@ export class EffectEngine {
         const req = (m: Mode) => meetsRequirements(m, bpm, frame.profile);
         // LÅTMANUS: vilken del av manuset bytet galler. Builden (aven ALLA_LOOKER-builden) -> build; drop och build som slutar ->
         // refrangens look (dropen landar i refrangen); annars sektionen. Utan sektion (ingen analys an) finns inget manus.
-        const secKey = allaBuild && !(dropSwitch && liveSec !== 'break') ? 'build' : (dropSwitch || buildExit) && liveSec !== 'break' ? 'high' : liveSec;
+        const secKey = this.landForce ? liveSec : allaBuild && !(dropSwitch && liveSec !== 'break') ? 'build' : (dropSwitch || buildExit) && liveSec !== 'break' ? 'high' : liveSec;
         const calm = secKey === 'break';   // breakdown -> lugna poolen (var wantCalm)
         const tierRank = (m: Mode) => { const t = EFFECT_MAP.get(m)?.tier; return t === 'lugn' ? 0 : t === 'full' ? 2 : 1; };
         const tierNow = tierS === LUGN ? 0 : tierS === FART ? 1 : 2;
@@ -809,15 +810,15 @@ export class EffectEngine {
         if (secKey && this.carryKey && secKey !== this.carryKey) { this.manus.delete(this.carryKey); this.carryKey = ''; }   // burna looken släpps (softenRange)
         if (secKey && secKey !== this.visitKey) { varv = (this.secVisits.get(secKey) ?? 0) + 1; this.secVisits.set(secKey, varv); this.visitKey = secKey; }
         const nextLook = HIGH_VARV > 0 && secKey === 'high' && varv >= HIGH_VARV && !dropSwitch && !!kept;
-        let keep = !nextLook && !!kept && fits(kept) && !(dropSwitch && !this.bassStrong(kept));   // DROP_BASS_LOOK: refrängslooken bara om den är basstark
+        let keep = !nextLook && !!kept && fits(kept) && !(dropSwitch && !this.bassStrong(kept)) && !(this.landForce && (kept === this.smartMode || tierRank(kept) === 0));   // DROP_BASS_LOOK: refrängslooken bara om den är basstark; landningen byter alltid
         const avoid = nextLook ? kept : undefined;
         if (nextLook) { const h = (this.manusHist.get(secKey) ?? []).filter((m) => m !== kept && m !== this.smartMode && fits(m)); if (h.length) { kept = this.pickLook(h.map((m) => ({ m }))); keep = true; this.manus.set(secKey, kept); console.log(`[dirigent] high-varv ${varv}: nasta look "${kept}"`); } }
-        if (!keep && secKey && !(dropSwitch) && !nextLook) { const back = this.manusHist.get(secKey)?.find((m) => m !== kept && fits(m)); if (back) { kept = back; keep = true; this.manus.set(secKey, back); } }
+        if (!keep && secKey && !(dropSwitch) && !nextLook) { const back = this.manusHist.get(secKey)?.find((m) => m !== kept && fits(m) && !(this.landForce && (m === this.smartMode || tierRank(m) === 0))); if (back) { kept = back; keep = true; this.manus.set(secKey, back); } }
         if (keep && kept === this.smartMode) { this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true; }   // manuset sager samma look - inget byte
         else {
         this.lastSmartSwitchMs = now; this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true;
         // DIAGNOSTIK (se switchWhy): starkaste orsaken forst. 'dwell' sist = klockan var det enda skalet.
-        this.switchWhy = dropSwitch ? 'drop'
+        this.switchWhy = dropSwitch ? 'drop' : this.landForce ? 'landning'
           : (memSection || secEntry) ? 'sektion'
           : (buildEntry || allaBuild) ? 'build' : buildExit ? 'build-slut' : tierChanged ? 'tier' : 'dwell';
         this.switchCount++;
@@ -1065,9 +1066,8 @@ export class EffectEngine {
         // sektionen in i high inom 2 s efter en sådan drop byts looken direkt, som vid en full drop (ingen MIN_HOLD/fras/slag-väntan).
         const dropEntry = liveSecChanged && liveSec === 'high' && nowWall - this.anaDropAt < 2000;
         if (liveSec !== '' && liveSec !== this.lastLiveSection) { if (this.lastLiveSection !== '') console.log(`[dirigent] sektion ${this.lastLiveSection} -> ${liveSec} (nr ${frame.sectionIndex ?? 0}, tier ${frame.sectionTier ?? '-'})`); this.lastLiveSection = liveSec; }   // (intro glommer inte lookerna langre - LÅTMANUS glomms bara pa en verklig latgrans)
-        if (liveSecChanged) this.pendingSecSwitch = true;
-        const secOldEnough = (frame.sectionAgeMs ?? 1e9) >= SECTION_UNIT_MIN_MS;   // SECTION_UNIT: ingen switch pa en sektion yngre an SECTION_UNIT_MIN_MS (detektorflapp)
-        const memSection = liveSecChanged;   // (latminnets sektionsgrans mem* borttagen 11-09 - sattes aldrig)
+        if (liveSecChanged) this.pendingSecSwitch = nowWall >= this.landAbsorbUntil;   // LANDNINGEN: detektorns sena byte efter landningen är redan gjort
+        const memSection = liveSecChanged && nowWall >= this.landAbsorbUntil;   // (latminnets sektionsgrans mem* borttagen 11-09 - sattes aldrig)
         const phraseMs = this.cfg.beat && this.cfg.beat.bpm > 0 ? 16 * 60000 / this.cfg.beat.bpm : 0;
         // LÅTMANUS: sektionsbytet landar på sektionens EGET taktraster (början av takt 2, 4, 6 ... sedan sektionsstart) i stället för
         // effektklockans 16-slagsfras, vars fas är godtycklig mot låten (bänken: bytet väntade upp till 24 s efter en hållen sektion).
@@ -1085,7 +1085,7 @@ export class EffectEngine {
         // LÅTMANUS: med sektioner byts looken bara pa sektionsgrans (+ build/drop nedan); fras, basgang, karaktar, tempo och
         // reservklockan byter inte langre. Utan sektion (ingen analys an) galler tier/halvering/dwell som forut.
         const wantSwitch = liveSec
-            ? ((memSection || this.pendingSecSwitch) && secOldEnough)
+            ? (memSection || this.pendingSecSwitch)
             : (tierChanged || memSection || now > this.smartDwellUntil);
 
         // STRUKTUR: analysatorn vet VAR i låten vi är — dirigenten ska lyssna på
@@ -1096,6 +1096,7 @@ export class EffectEngine {
         //    kvar genom hela risern — då landar bytet i stället PÅ dropen, vilket
         //    är det enda ögonblick där ett byte förstärker musiken.
         // I LUCKAN (11-16): spärren följer analysatorns uppbyggnadssignal (25 av ägarens 29, den gamla riser/build-regeln 0 av 29) och släpper på drop/minidrop
+        const landHit = frame.miniDropCount !== this.lastMiniSeen && !dropHit;   // LANDNINGEN (a7): basen tillbaka efter luckan = ny del, på ettan
         if (frame.buildStartCount !== this.lastBuildStart) { this.lastBuildStart = frame.buildStartCount; this.gapUntil = nowWall + GAP_HOLD_MS; }
         if (dropHit || frame.miniDropCount !== this.lastMiniSeen) this.gapUntil = -1;
         this.lastMiniSeen = frame.miniDropCount;
@@ -1127,8 +1128,8 @@ export class EffectEngine {
         //      hållen. Etiketten far darfor styra IDENTITET (samma look aterkommer)
         //      och NAR bytet sker (sektionsgransen), men inte hur starkt det lyser.
         const tierS = tier;
-        const buildEntry = liveSecChanged && liveSec === 'build';   // MIX_V2 (2): ett byte IN i build-poolen tillats
-        const secEntry = this.pendingSecSwitch && secOldEnough && liveSec !== 'build';   // SECTION_UNIT: sektionen sager att risern ar over -> inBuild far inte halla kvar build-looken i refrangen
+        const buildEntry = this.pendingSecSwitch && liveSec === 'build';   // MIX_V2 (2): ett byte IN i build-poolen tillats (hålls tills ettan)
+        const secEntry = this.pendingSecSwitch && liveSec !== 'build';   // SECTION_UNIT: sektionen sager att risern ar over -> inBuild far inte halla kvar build-looken i refrangen
         const concertBuild = buildEntry && held > 2000;   // konsertläget: in i build direkt
         // refrängen kom utan drop -> lämna builden direkt; även ett energilyft/sektionslyft (ladan 16:05: virvel hängde kvar i 'low' efter lyftet)
         // + intensiteten på topp (ladan 17:09 'miss': upptakt låg kvar 10 s i int 0,9-1,0 - sektionen gick low -> build -> intro, aldrig high)
@@ -1136,15 +1137,19 @@ export class EffectEngine {
         const buildExit = BUILD_LOOKS.includes(this.smartMode) && (frame.section === 'high' || (this.buildLookAt > 0 && nowWall - this.buildLookAt > 2000 && (frame.intensity ?? 0) >= 0.95));
         // (BUILDEN LANDAR I REFRÄNGEN - sektionen high efter >= 4 s build = drop - borttagen 10-11 kväll: 'falsk' 21:42:39, 17 % på baslyft; se DROP_JUMP_DB)
         const buildLock = frame.section === 'build' && this.buildLookAt > 0 && BUILD_LOOKS.includes(this.smartMode) && nowWall - this.buildLookAt < 30000 && !dropSwitch && !buildExit;   // BUILD SOM HÅLLER - V123: bara så länge sektionen ÄR build
-        const ready = (wantSwitch || buildEntry) && held > MIN_HOLD && phraseOk;
+        const ready = ((wantSwitch || buildEntry) && held > MIN_HOLD && phraseOk) || allaBuild || concertBuild || buildExit;
         let slagOk = true;   // BYTE PÅ SLAGET (SWITCH_ON)
         if (SWITCH_ON > 0) {
-          if (!ready) this.slagWaitAt = -1; else if (this.slagWaitAt < 0) this.slagWaitAt = now;
+          if (!ready || buildLock || (inGap && !dropEntry)) this.slagWaitAt = -1; else if (this.slagWaitAt < 0) this.slagWaitAt = now;
           if (ready && hasBeat && bpm > 0 && this.beatTrust >= 0.5 && !(this.tickNow && this.lastBeatIdx % SWITCH_ON === 0))
             slagOk = now - this.slagWaitAt > SWITCH_ON * 1.25 * 60000 / bpm;
         }
-        if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || allaBuild || concertBuild || buildExit || (ready && slagOk))) {
+        if (!buildLock && (!inGap || dropEntry) && (dropSwitch || dropEntry || (ready && slagOk))) {
         this.switchLook(frame, bpm, tierS, tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, memSection, secEntry, tierChanged);
+      } else if (landHit && held > LAND_HOLD_MS && (liveSec === 'high' || liveSec === 'intro')) {
+        this.landForce = true;   // basen är tillbaka: aldrig lugna poolen (tierEma bär fortfarande luckan)
+        this.switchLook(frame, bpm, tier === LUGN ? FART : tier, tier === LUGN ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
+        this.landForce = false; this.landAbsorbUntil = nowWall + LAND_ABSORB_MS;
       }
       return this.smartMode;
   }
```
