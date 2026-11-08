# Dubbla källor på ljussidan (HEAD 0315d2d, bara läst)

Känt fall (nattuppdraget, nämns bara): tillit och frasräknare läser `frame.bpmConfidence`/`frame.bpm` (effects.ts:1774, 1674–1677), men takten kommer från `cfg.beat`.

Rangordnat efter nytta. Filen är effects.ts om inget annat står.

## 1. ETTAN och halveringen: två takträknare
- **A:** rutnätets index `beatIndex(beat, now2 + this.showLead)` (1305). Ettan sätts av beatFeed med barOff (beatFeed.ts:318). Läses bara av hjärtslagets accent `beatIdx % 4 === 0` (1400) och SWITCH_ON (1222).
- **B:** `beatCounter`, en fri räknare sedan start som stegar på varje beatHit (2013–2016). Läses av `ctx.beatIdx` och `hueIdx` (2074), `phraseOk` (1156), heartPulse-accenten `(beatIdx & 3)` (2027) och 17 effekter som räknar `c.beatIdx % 4` som ettan (frasraknare, pulse, backbeat "ankaret på ettan", kaskad …).
- **Problem:** B är aldrig synkad mot ettan. När ankaret hoppar framåt flera slag kommer bara EN tick (1393). Ettan i effekterna hamnar alltså godtyckligt, och barOff-arbetet når dem inte. Halveringens paritet finns också två gånger: `pulseCount % 2` (1365) och `halfTick` (2013). De kan hamna i motfas.
- **En källa:** `ctx.beatIdx = beatIndex(cfg.beat, now+showLead)`, med `>> 1` vid halvering. Behåll en monoton spärr mot PLL-bakåthopp.
- **Risk/mått:** effekter med `% 4` byter fas. Mät med domare.py: takt och koreografi/betoning.

## 2. Två hjärtslagskurvor
- **A:** `beatEnv` (1369, med attack, pre-dip och accent). Den används bara i `kickEnv = max(kick, beatEnv*0.8)` (1736–1739).
- **B:** `beatPulse` och `heartPulse` på effektklockan (2021–2027).
- **Läsare:** 21 effekter läser `c.kickEnv` (A) och 18 läser `c.heart`/beatPulse (B). De har olika försprång (A: atk+showLead, B: showLead), olika etta och olika paritet.
- **Bugg:** när tilliten är under 0,20 men bpm > 40 körs A ändå (1303). `beatPhase` ger då 0 och det monotona golvet (1367) fryser `beatEnv`, så kickEnv får ett konstant golv upp till 0,8.
- **En källa:** en pulskurva på klockan från fynd 1. Gör kickEnv till ren kick.
- **Mått:** takt, och dynBench (ofrivillig blink).

## 3. Basenergin på tre ställen, volymen som en andra energi
- **eBass används i:** steg 2 `eBass^3` (1447), SPREAD `eBass²` på de lampor som inte leder (1506), och `ctx.bassBody` (2066) i 6 effekter som har energy=true (varannan.ts:15, twin, duel, gallop, dansparet, minnet). Där räknas basen alltså två gånger. tryckvag gör rätt: `want.energy = false`.
- **c.audio** (volym, 1750) används som nivå i 8 effekter (chase.ts:26, drift.ts:35, eko.ts:27, drops, pendel, ripple, sopa, tyngdlyft). snap.ts:28 tog bort den som "dubbelmodulering mot basenergin", men resten blev kvar.
- **Ägaren:** "kör inte energilagret på två ställen" (448).
- **En källa:** basen bara i steg 2. Alternativt sätter bassBody-effekterna `want.energy=false`. Ta bort c.audio som nivå.
- **Mått:** domare dynamik, på kontrollmängden. a8 är bänkgodkänt, så det måste bänkas om.

## 4. Nivån mellan slagen styrs åt två håll
FX_FLOOR 0,6 lyfter tända lampor (412, 576). EFFECT_HEART 1,4 (209, 733) och SPREAD_D 0,7 (1506) mörkar mellan slagen. Undantagen skiljer sig: toggle, SPREAD_SKIP och vilka effekter som anropar c.heart. Följden: trimmar man en ratt tar en annan ut den. **Förslag:** en ratt för slagdjupet. **Mått:** takt och dynamik.

## 5. Tystnaden: tre trösklar
- Fast `INPUT_OFF_LEVEL 0.02`/2 s (153, 1928–1930, 2126). Den tar över /setup-reglaget, som går ner till 0,01 (server.ts:558).
- `silenceGate` (1943–1948) och `levelRamp` 2×gränsen (1941).
- INPUT_OFF_LEVEL fryser också energifönstren (1414, 1433).
- moment.ts:175 har en egen `presence` (5 s).
- **En källa:** `cfg.silenceLevel`, med rampen och hålltiden byggda på den.
- **Mått:** dynBench (mörkt/lit) och tystnadsinspelningar.

## 6. Baskroppen: tre ingångar och fem följare
- **Ingångar:** `specAbs` sub/kick (1428), `bodyDb` som innehåller 120–250 Hz, och `frame.energy` (bassBaseline, 1799–1801, punch 1820).
- **Följare:** fdF/fdS/fdC (813–817), nearB/nearNorm (1238–1239), miniBodyFast/Slow (1857), bHi/bLo, bassBaseline. Alla med egen "normalnivå".
- **Problem:** ljuset följer sub+kick (PB_SUBW 0,25), medan drop, minidrop och nästan-drop följer bodyDb.
- **En källa:** en basfunktion som ger kropp och normal, och som alla detektorerna läser.
- **Mått:** dropTiming/efterDrop.py (rätt, sen, falsk) och dynamik.

## 7. Drop-tillståndet
- **Ljuset lyfts i fyra led:** liftK (577–578), dropColEnv-färgen (582–585), energilyftet (1444–1447), secCeil (2158–2161) och calDrop (2165).
- **Sju klockor:** dropBang, dropLift, dropEnv, dropColEnv, miniBang, miniLift, miniColEnv.
- **Efterkontrollen** dömer på `eSm` (1424, 1644), en volymenergi som inte styr ljuset alls (1425).
- **En källa:** två kurvor, lyft L(t) och färg C(t), som varje steg läser med en fast transform. Efterkontrollen ska läsa eBass.
- **Mått:** efterDrop.py och dynamik.

## 8. "Lugnt" definieras tre gånger
`tierEma` (5/2 s, 0,22, 1059), `subdivEnergy` (8 s, 0,30/0,42, 1313–1319) och `frame.section`/`sectionTier`. **Förslag:** halveringen läser tierEma eller sektionen. **Mått:** takt och koreografi.

## 9. Minsta på-tid finns i två filer
MIN_ON_MS 150 och CH_MIN_ON_MS 100 i steg 2 (313, 320, 1521–1529), mot HOLD_MS 120 i output.ts:27. Flimmer hör hemma i output.ts. **Förslag:** en hålltid per kanal, i output. **Mått:** dynBench intent/blink.

## 10. Hjälpberäkningar som borde ligga i ctx
- **Taktperioden:** 10 effekter räknar den själva ur `cfg.beat.bpm`, förbi hasBeat och halveringen (stegring.ts:15 `240000 / bpm`, fyr.ts:12 `bpm > 0 ? …`). Lägg den i `ctx.beatMs`.
- **dt:** egen dt i drift.ts:18, sangare.ts:16, sokljus.ts:14, makeRise (color.ts) och moment.ts:173, fast step() redan får dtSec. Lägg den i `ctx.dt`.
- **Röstkurvan:** finns i fyra kopior (sangare.ts:18–20, moment.ts:198–201, lab.ts:142–144, lab4). Lägg den i `ctx.voice`.

## 11. Kvarlevor (räknar men gör inget)
- `upgradeHit` sätts aldrig (1634). Därför är "BUILD SOM LANDAR" död.
- `nearLevel` (1263) läses aldrig, och stepLifts ändrar aldrig dTarget. Nästan-dropen ger inget ljus, fast loggen säger "ljus X %".
- `DROP_LIFT_FLOOR=0` gör rad 1445 till en no-op.
- `miniSector` (848) läses aldrig. `miniColEnv` används bara i hueGlide.
- mem*-fälten (627–646) sätts aldrig.
- dropSector stegar bara i drops-läget, men färgar varje full drop (583, 1964).
- **PROV-env som är kvar:** DMX_FX_BASS*, DMX_B_WIN_S/B_TOP/B_RELEASE_MS, DMX_DROP_TOP, DMX_MINI_LIFT_FLOOR, DMX_E_NORM_S, DMX_FX_FLOOR, DMX_FX_REN(_SIREN), och grenen `PB_SUBW === 0.5`.
- moment.ts:50 `SHOW_TOP 0.95` lägger ett tak ovanpå output-taket: dubbelt tak.
- writeFixture-argumentet `master` är alltid 1 (1547).
- **Bänken:** dynBench.mjs:110/146 räknar `eSimple^10`, medan motorn kör `eBass^3` + golv. mdSteg mäter alltså fel kurva.
- **Kommentaren** 1499 ("ingen normering, grundnivå, dropfärg …") motsägs av effektNiva.
