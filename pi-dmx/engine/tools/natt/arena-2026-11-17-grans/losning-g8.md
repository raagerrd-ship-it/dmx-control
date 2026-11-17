# g8: dirigenten som lyssnar längre (SKIFTET), bara effects.ts

**IDÉN.** Dirigenten tar taktmedel på analysatorns ettor av tre fält som redan finns: `intensity`, `bodyDb` och `midHiDb`. Lookbytet kommer när BÅDA de två senaste takterna ligger på samma sida om de fyra takterna före, med z ≥ 3 (rms över fälten). z räknas mot låtens egen median av förändringen från takt till takt (de senaste 64 takterna). Det sker på ettan, inne i 'high' som hållit i minst 6 takter, och bytet går till nästa manus-look (landningens väg, aldrig lugna poolen). Det är realtid: bara takter som redan hörts, ingen sektionsanalys. Tröskeln är relativ mot låtens egen spridning och sattes på medlet av ett rutnät (offline-simulering på sondernas taktdump), inte på toppen.

**DE 28 MISSADE.** Jag tar 4 av dem, alla i 151659: uppbyggnad 1, refräng 2, drop 1 (lag 16 -> 12,3 / 3,9 / 7,7 / 7,8). Nya byten som INTE ligger vid en gräns: 7 av 9 skiften (151659: 5, 171840: 1, 193040: 1).

**FYND (sonderna, fri analys).** Två takters ihållande förändring i analysatorns fält skiljer gränser från andra ettor dåligt: AUC 0,6-0,8 (bäst spektrum/nivå, sämst profil och trumfält). Av de missade gränserna har 14 av 28 faktiskt ett sektionsbyte i detektorn, men dirigenten byter inte. Orsakerna är landningens uppslukning 24 s (151659 256,4 / 332,6), att manus säger samma look ("manus high: kickregn igen", 171840 184 / 232), MIN_HOLD och luckan. Det är en större spak än mitt kort. Den hör till g6/a6:s område, så jag lämnar den till jokern.

## DELARNA
| del | vad den gör | mått (m1 -> m2) |
|---|---|---|
| A taktmedel + z på ettan (`barAcc/barHist/barDiff`, förallokerat) | signalen `shiftHit` | - |
| B skiftet i stepDirigent (else-if efter landningen) | high ≥ 6 takter, held > MIN_HOLD, ej buildLock/lucka, tillit ≥ 0,5 -> landForce-byte, why 'skifte' | m1: +0,29, missade 34,1 -> 29,6 %, men gräns 22,7 -> 21,6 |
| C skiftet spärrar inget | lastSmartSwitchMs och pendingSecSwitch återställs efter skiftet, och eget skifte-intervall på 8 s | m2: gräns tillbaka till 22,7 (landningen 69,9 räddad), lag 8,42 -> 8,12, +1,65 |

## SIFFRORNA (m2 = koden, mot bas)
| fil | gräns % | lag | etta % | lösa/min | byten/min |
|---|---|---|---|---|---|
| 151659 | 30,0 (30,0) | 7,8 (8,9) | 62,9 (57,1) | 1,9 (1,28) | 4,1 (3,25) |
| 171840 | 9,1 (9,1) | 8,9 (8,9) | 18,8 (20,0) | 1,1 (0,84) | 3,4 (3,16) |
| 193040 | 29,0 (29,0) | 7,6 (7,6) | 50,0 (47,8) | 1,0 (0,82) | 3,9 (3,77) |
| medel | 22,7 | 8,12 | 43,9 | 1,30 | 3,79 |

**Poäng +1,65**, ljus +0,2, ingen DISK. Det som blev sämre: lösa +0,32/min (spärren 1,48), etta i 171840 −1,2, och alla byten +0,4/min.

## RISKEN
- Precisionen är låg (2 av 9). Lösa ligger 0,18 från spärren, så på okänd musik kan skiftet bli lösa byten i långa refränger med dynamik (filter, sång in/ut).
- Live-mic och prat: `midHiDb` och `intensity` påverkas. Två takter i samma riktning och 6 takter i high dämpar det.
- Låtbyten: historiken nollställs inte. Den nya låtens första takter ligger oftast i intro/low, så de är spärrade.
- Breaks och uppbyggnader: spärrat utanför high, i buildLock och i luckan. Dropvägen är orörd, eftersom skiftet inte räknas i held.
- Workern: alla tre fälten finns redan i ramen och inget nytt bärs i split.ts. Skiftet kräver tillit ≥ 0,5 och analysatorns etta.
- Minne: 2,5 kB förallokerat. `Float64Array.sort` körs 3 gånger per takt (64 tal).

## DIFFEN
```diff
diff --git a/src/effects.ts b/.arena/grans/g8/src/effects.ts
index 8957bb7..c2d71ff 100644
--- a/src/effects.ts
+++ b/.arena/grans/g8/src/effects.ts
@@ -307,6 +307,7 @@ const PULSE_IDX_INIT = -2e9;
  *      detektorn da satt fast pa high; rotorsaken (ingen nollning vid latbyte) ar rattad 09-23. Sedan 10-12: LÅTMANUS. */
 /** SECTION_UNIT (ladan 16:45): forvarningens 'high' 600 ms fore en forutsedd refrang och drop-fonstrets 'high' raknas INTE som sektionsgrans
  *  (de gav high<->low-hopp pa 1-2 s nar refrangen uteblev). Bara den raa sektionen, och den maste vara minst DMX_SECTION_UNIT_MIN_MS gammal. */
+const SHIFT_Z = 3, SHIFT_SCALE_BARS = 64;   // SKIFTET (g8): se .arena/grans/g8/losning.md
 const LAND_HOLD_MS = 6000, LAND_ABSORB_MS = 24000;   // LANDNINGEN (a7): minsta hålltid före landningsbytet; sektionsbyten inom fönstret efter tas inte
 const GAP_HOLD_MS = 4000;   // I LUCKAN: spärren efter uppbyggnadssignalen släpper senast efter 4 s (signal -> landning median 1,8 s)
 /** LÅTMANUS (10-12 kväll, ägaren: "olika effekter hoppar hela tiden ... mer som att den är förprogrammerad" + "allt mer känns anpassat
@@ -567,6 +568,8 @@ export class EffectEngine {
    private tickNow = false; private rNowP = 0; private rNowWall = 0; private rDt = 0; private rDtT = 0; private rBeatMs = 0; private rBeatEnv = 0; private rDTarget = 0; private rMd = 0; private rT = 0; private rAnchorHue = 0; private rDrive = 0; private rInputGate = 0;   // RUTANS TAL (se EN KLOCKA PER RUTA): fält i stället för argument - ett decimaltal som skickas till en metod packas in (GC-jakten 10-16)
   private anaDropAt = -1e12;   // analysatorns drop som blev minidrop (se REFRÄNGEN DIREKT EFTER EN MINIDROP-DROP)
   private landForce = false; private landAbsorbUntil = -1;   // LANDNINGEN (a7)
+  private barAcc = new Float64Array(3); private barN = 0; private barHist = new Float64Array(18); private barPos = 0; private barCnt = 0;   // SKIFTET (g8)
+  private barDiff = new Float64Array(SHIFT_SCALE_BARS * 3); private barDiffPos = 0; private barDiffN = 0; private barScr = new Float64Array(SHIFT_SCALE_BARS); private shiftHit = false; private shiftForce = false; private shiftAt = -1e12;
   private lastBuildStart = 0; private lastMiniSeen = 0; private gapUntil = -1;   // I LUCKAN (11-16): inget lookbyte från uppbyggnadssignalen tills basen är tillbaka
   private nearAt = -1e12; nearCount = 0;   // NASTAN-DROP
   private secCeil = 1; private histAt = -1e12; private rampLvl = 0; private levelRamp = 1; private buildLookAt = 0; buildProg = 0; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
@@ -818,7 +821,7 @@ export class EffectEngine {
         else {
         this.lastSmartSwitchMs = now; this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true;
         // DIAGNOSTIK (se switchWhy): starkaste orsaken forst. 'dwell' sist = klockan var det enda skalet.
-        this.switchWhy = dropSwitch ? 'drop' : this.landForce ? 'landning'
+        this.switchWhy = dropSwitch ? 'drop' : this.shiftForce ? 'skifte' : this.landForce ? 'landning'
           : (memSection || secEntry) ? 'sektion'
           : (buildEntry || allaBuild) ? 'build' : buildExit ? 'build-slut' : tierChanged ? 'tier' : 'dwell';
         this.switchCount++;
@@ -951,6 +954,29 @@ export class EffectEngine {
 
   private stepDirigent(frame: Frame, dropHit: boolean, hasBeat: boolean): Mode {
     const now = this.rNowP, nowWall = this.rNowWall, _dtT = this.rDtT;
+    this.shiftHit = false;
+    {   // SKIFTET (g8): taktmedel av intensitet, baskropp och mid+diskant; två nya takter mot de fyra före, z mot låtens egen takt-till-takt-spridning
+      const A = this.barAcc, H = this.barHist, Dd = this.barDiff, W = this.barScr;
+      if (this.tickNow && this.lastBeatIdx % 4 === 0 && this.barN > 0) {
+        const p = this.barPos;
+        for (let f = 0; f < 3; f++) { const v = A[f] / this.barN; if (this.barCnt > 0) Dd[(this.barDiffPos * 3) + f] = Math.abs(v - H[((p + 5) % 6) * 3 + f]); H[p * 3 + f] = v; }
+        if (this.barCnt > 0) { this.barDiffPos = (this.barDiffPos + 1) % SHIFT_SCALE_BARS; if (this.barDiffN < SHIFT_SCALE_BARS) this.barDiffN++; }
+        this.barPos = (p + 1) % 6; if (this.barCnt < 6) this.barCnt++;
+        if (this.barCnt >= 6 && this.barDiffN >= 16) {
+          let s2 = 0;
+          for (let f = 0; f < 3; f++) {
+            const n = this.barDiffN; W.fill(Infinity); for (let i = 0; i < n; i++) W[i] = Dd[i * 3 + f]; W.sort();
+            const sc = W[n >> 1] + 0.5, n0 = H[p * 3 + f], n1 = H[((p + 5) % 6) * 3 + f];
+            const ref = (H[((p + 4) % 6) * 3 + f] + H[((p + 3) % 6) * 3 + f] + H[((p + 2) % 6) * 3 + f] + H[((p + 1) % 6) * 3 + f]) / 4;
+            const z0 = (n0 - ref) / sc, z1 = (n1 - ref) / sc;
+            if (z0 * z1 > 0) { const z = Math.min(Math.abs(z0), Math.abs(z1)); s2 += z * z; }
+          }
+          this.shiftHit = Math.sqrt(s2 / 3) >= SHIFT_Z;
+        }
+        A[0] = 0; A[1] = 0; A[2] = 0; this.barN = 0;
+      }
+      A[0] += 100 * (frame.intensity ?? 0); A[1] += Math.max(-90, frame.bodyDb ?? -90); A[2] += Math.max(-90, frame.midHiDb ?? -90); this.barN++;
+    }
       // Energi styr läget → lokal intensitet väljer pool; annars fast medel.
       // Energi RELATIVT låtens eget snitt: en komprimerad signal ligger jämnt
       // högt, så absolut nivå säger inget. Jämför istället mot en långsam
@@ -1150,6 +1176,12 @@ export class EffectEngine {
         this.landForce = true;   // basen är tillbaka: aldrig lugna poolen (tierEma bär fortfarande luckan)
         this.switchLook(frame, bpm, tier === LUGN ? FART : tier, tier === LUGN ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
         this.landForce = false; this.landAbsorbUntil = nowWall + LAND_ABSORB_MS;
+      } else if (this.shiftHit && held > MIN_HOLD && now - this.shiftAt > MIN_HOLD && liveSec === 'high' && bpm > 0 && (frame.sectionAgeMs ?? 0) > 6 * 240000 / bpm && hasBeat && this.beatTrust >= 0.5 && !buildLock && !inGap) {
+        this.landForce = true; this.shiftForce = true;   // SKIFTET (g8): ny del inne i high -> nästa manus-look, aldrig lugna poolen
+        const at = this.lastSmartSwitchMs, pend = this.pendingSecSwitch, was = this.smartMode;
+        this.switchLook(frame, bpm, tier === LUGN ? FART : tier, tier === LUGN ? 'fart' : tierName, bassClear, false, false, false, false, liveSec, false, false, tierChanged);
+        this.landForce = false; this.shiftForce = false; this.pendingSecSwitch = pend;
+        if (this.smartMode !== was) { this.lastSmartSwitchMs = at; this.shiftAt = now; }   // skiftet spärrar inte nästa landning/sektion/drop
       }
       return this.smartMode;
   }
```
