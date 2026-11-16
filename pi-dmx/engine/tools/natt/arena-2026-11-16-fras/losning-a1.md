# a1 - VÄNTA IN FRASEN

**IDÉN.** Ett beslutat sektionsbyte hålls till analysatorns nästa takt-etta (taktklockans `lastBeatIdx % 4 === 0`), med ett tak på 5 slag, så att lookbytet landar på ettan där musikens del börjar och inte på ett slumpslag. Väntetiden räknas först när inget annat håller bytet (buildLock / I LUCKAN). Annars hann taket gå ut under spärren, och bytet small av mitt i takten när spärren släppte.

**VAR FÖRDRÖJNINGEN SATT (bas, 34-38 gränser, analys.py på bas-json).** Detektorn gav sektionsbytet median **3,1 slag** efter ägarens gräns (kvartiler 1,4-5,6). Dirigenten lade på median **4,6 slag** (3,3-8,9), nästan bara SECTION_UNIT_MIN_MS 2 s + nästa slag. Bara 16 % av baslinjens byten satt på en Beat This-etta. Beslutet kommer alltså 3 slag efter gränsen, och att vänta längre än till nästa etta köper ingenting.

**8/16-slagsfras: förkastad, med mätning.** Analysatorn har ingen frasfas: motorns `idx % 16` vid ägarens gränser sprids över alla 16 värden. Om dirigenten räknade fraser själv vore det en egen kopia av frasen (regel 1). Offline-simulering på bas-json (sim2.py) gav etta-gridet +30, fras 8 från förra bytet +26 till +29, fras 16 +20 till +27 och fras 16 med ett tak på 16 slag +18. Att sänka åldersgränsen 2 s gav sämre resultat (1 s: +21, flapp).

**DELARNA**

| del | vad den gör | mått (mätning) |
|---|---|---|
| D1 `SWITCH_ON 1 -> 4` | sektionsbytet väntar in takt-ettan, högst 5 slag | m1: poäng +7,2, etta 17,7 -> 27,5 %, gräns 12,7 -> 14,9 %, lag 10,0 -> 9,9, ljus +0,3 |
| D2 väntklockan startar efter spärrarna | `slagWaitAt` nollas medan buildLock eller I LUCKAN håller bytet | m2 mot m1: poäng +7,2 -> +9,7, etta 27,5 -> 32,7 %, lösa 1,10 -> 1,02, ljus +0,3 -> -0,4 |

D2 kräver D1: med SWITCH_ON 1 gör D2 nästan ingenting.

**DIFFEN**

```diff
diff --git a/src/effects.ts b/.arena/fras/a1/src/effects.ts
index ff4645c..53728dc 100644
--- a/src/effects.ts
+++ b/.arena/fras/a1/src/effects.ts
@@ -259,7 +259,7 @@ const MANUS_TOP = 2;
  *  SECTION_UNIT_MIN_MS gammal - phraseOk:s reserv (held > MIN_HOLD + en fras) är nästan alltid sann efter en hållen look, så bytet landade
  *  var som helst i takten (konsertReplay --slag). Med N väntar bytet (wantSwitch/buildEntry, inte drop/build-händelserna) in nästa
  *  taktklocka-tick med beatIdx % N = 0 (1 = nästa slag, 4 = ettan), högst N slag x 1,25. */
-const SWITCH_ON = 1;
+const SWITCH_ON = 4;
 /** HIGH-VARV (standard 2026-11-04, ägaren: 'pröva b'; megamix tryckvag 36 % = manusets återseende): när refrängen (high) kommer tillbaka
  *  för 4:e gången eller fler i samma låt får den NÄSTA look - minst spelad ur sektionens manusHist, annars ny ur poolen - i stället för
  *  manusets. 1:a-3:e gången oförändrade (refrängen känns igen). Drop-bytet orört. natt --snabb: mega tryckvag 36 -> 21 %, lampspr 83 -> 88,
@@ -1139,7 +1139,7 @@ export class EffectEngine {
         const ready = (wantSwitch || buildEntry) && held > MIN_HOLD && phraseOk;
         let slagOk = true;   // BYTE PÅ SLAGET (SWITCH_ON)
         if (SWITCH_ON > 0) {
-          if (!ready) this.slagWaitAt = -1; else if (this.slagWaitAt < 0) this.slagWaitAt = now;
+          if (!ready || buildLock || (inGap && !dropEntry)) this.slagWaitAt = -1; else if (this.slagWaitAt < 0) this.slagWaitAt = now;
           if (ready && hasBeat && bpm > 0 && this.beatTrust >= 0.5 && !(this.tickNow && this.lastBeatIdx % SWITCH_ON === 0))
             slagOk = now - this.slagWaitAt > SWITCH_ON * 1.25 * 60000 / bpm;
         }
```

(Detta är hela diffen: två rader i effects.ts. Ingen annan fil ändras. Analysskripten ligger i a1/: analys.py, sim.py, sim2.py, fasen.py.)

**SIFFRORNA (m2, frasdom: +9,66, ljus -0,4, OK)**

| fil | gräns % | lag slag | etta % | lösa/min | byten/min |
|---|---|---|---|---|---|
| 151659 | 6,7 (bas 3,3) | 12,2 (11,6) | 36,4 (7,1) | 0,8 (1,39) | 2,6 (3,25) |
| 171840 | 9,1 (9,1) | 10,4 (10,0) | 20,0 (25,0) | 1,3 (1,05) | 3,2 (3,37) |
| 193040 | 29,0 (25,8) | 7,4 (8,4) | 41,7 (20,8) | 1,0 (0,98) | 3,9 (3,93) |

Det här blev sämre:
- Lag: 151659 +0,6 slag och 171840 +0,4 slag. Det är väntan på ettan, och dirigentens del växte från median 4,6 till 6,6 slag.
- 171840 har sämre etta. Där ligger motorns etta bara på 45 % av Beat This-ettorna, mot 79 % i 151659.
- Ljusdomaren föll från +0,3 till -0,4.

Flera byten sitter fortfarande utanför ettan. Det är byten på sektionsbytets egen ruta (dropEntry/buildExit/allaBuild, som loggas som 'sektion') och sträckor med beatTrust under 0,5. Dropvägen är orörd.

**RISKEN.** Allt hänger på ettan: där ettan är fel (som i 171840, eller vid live-mic efter ett låtbyte innan ettan låst) landar bytet säkert på fel slag, upp till 5 slag senare. Med låg beatTrust (breaks, låtbyten) faller gaten bort och det blir som i dag. Långa uppbyggnader: när I LUCKAN släpper väntar bytet nu upp till en takt till. Workern berörs inte, för inget nytt ramfält används och inget allokeras per hop.
