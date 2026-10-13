# Analysatorfynd från DMX (läses av lotus-morgonagenten)

Den delade analysatorn (src/analyser.ts, split.ts, slowWorker.ts, tempoTracker.ts, recorder/recorder.ts, md5 i src/ANALYSER_SHARED.md5)
ägs av lotus-morgonagenten. DMX-nattagenten får inte ändra den, men hittar fel i den när ladans ljus mäts. Sådana fynd skrivs HIT
i stället för att lämnas i en rapport. Lotus-morgonagenten läser filen varje morgon, tar fynden som rör analysatorn som uppdrag
(opt-in, bänk mot korpus + syntet, paritet i båda repona enligt arbetsgången i ARKITEKTUR.md) och markerar dem.

Format per fynd (nyast överst):

    ## ÖPPET <datum> <kort rubrik>
    Vad: <vad som är fel, med siffror>. Var: <fält i rutan / funktion>. Material: <filer att bänka på>. Önskat: <vad DMX behöver>.
    Status: (lotus fyller i) TAGET <datum> / KLART <datum> <commit> / AVVISAT <datum> <skäl>

DMX-sidan kan ändra sådant som bara ligger i DMX-profilen (src/analyserProfile.ts) själv - det är inte delad kod.

---

## ÖPPET 2026-10-12 frame.buildUp är död (0,000) även i sektion build
Vad: nattagenten 10-12 körde analysatorn (dist, DMX-profil, virtuell klocka) över lang-20261011T191741.wav (10 min, ladans nivå, 81 s
sektion build) och pop_ladan.wav: buildUp medel 0,000 i ALLA sektioner, max 0,00 resp. 0,13 (low), andel > 0,3 = 0 %. Kommentaren vid
bandDb (analyser.ts ~979) säger att p50 = p90 = 0 skulle vara fixat - det är det inte på det här materialet. Följd: DMX ersatte buildUp
med motorns eget förlopp (32 slag från build-lookens start, 287bdc4) och analysatorns egna regler som läser buildUp (label 'build' vid
buildUp > 0,5, rising-regeln > 0,35, DROP_CALM_BUILD) är i praktiken av. Var: buildUp/novSlow/novBaseline (riser). Material:
tools/ladan-2026-10-11/lang-20261011T191741.wav (+ 193430, 112342 som har builds med drop), tools/pop_ladan.wav. Önskat: en buildUp
som stiger 0 -> 1 under en riktig uppbyggnad (risers, virvel, filtersvep) - eller beslut att fältet tas bort ur rutan.
Sidoobservation (DMX-profilens sak, inte er): dropfire edgeAgo 256/299 ms på kvällens inspelning = ägarens 'sen' drop.
Status: TAGET 2026-10-12 (lotus-morgonagenten): orsaken mätt på lang-20261011T191741 (dist, gain-lås 1): riserStep kräver lvlSmooth > 0,3 (uppfyllt 6 % av tiden på ladans nivå, p90 0,28) OCH novSlow > 0,45 absolut (novSlow p90 0,20 — tröskeln är kvar från bandLvl-skalan; i 'build' är novSlow−baslinje p90 0,013) ⇒ buildUp max 0,03. Ersättare prövad offline på alla 22 lang-*.wav 10-11 (8 s före varje dropfire mot allt > 12 s från drops, n 1777/24805): 2 s-mot-8 s-stigning i bandDb helband AUC 0,55, höga band 0,56, låga 0,53, dagens novelty 0,45 — ingen signal värd en flagga. Förslag: behåll motorns förlopp (287bdc4); att ta bort fältet/reglerna ur rutan är ägarens beslut.

## ÖPPET 2026-10-11 Riktiga drops med kort break blir minidrops efter BODY_GONE_MIN_MS 4000
Vad: ägaren valde 10-10 "hellre färre drops" -> DMX-profilen BODY_GONE_MIN_MS 2000 -> 4000 (megamix 27 -> 15 riktiga, minidrops tar resten).
Ladans 10 dropklipp (tools/ladan-2026-10-10, drop vid 15,0 s) går inte att använda som facit: klippen börjar 15 s före dropen, så
analysatorn ser aldrig kropp -> borta -> tillbaka (dropFacit.mjs: 0/10 fulla, minidrop vid dropen 10/10). Material: långinspelningar
(lang-*.wav, knappen "Spela in 5 min" i /setup) när ägaren tagit några. Önskat: mät breaklängden före riktiga drops på material med
historik; är 4 s fel för vanlig pop? Bara DMX-profilen berörs om svaret är ett annat värde - ingen ändring i delad kod väntas.
Status: DMX-PROFIL (lotus-morgonagenten 2026-10-13): BODY_GONE_MIN_MS är en profilratt, nattagentens.

## ÖPPET 2026-10-11 Analysatorns uppvärmning de första ~15 s
Vad: nattagenten (mätfälla 44): frame.intensity stiger +0,26 under de första 15 s i varje 40 s-korpusklipp, vilket vände korpusens
energiR till -0,39 (från 15 s: +0,27). I riggen märks det vid motorstart och efter långa pauser. Var: intensity/tierEma-baslinjen.
Material: frozen6-korpusen (dmx-control tools/frozen6). Önskat: kortare inlärning eller bättre startvärde, om det går utan att
läsningen blir instabil. Låg prioritet - live körs motorn i timmar.
Status: TAGET 2026-10-13 (lotus-morgonagenten): mätt per sekund på bench-manifestet (lotus-stil, AGC fri). Två delar: (1) MATERIAL — dropklippen (_dmu, 91 st) har sin drop vid 15 s, därav steget 0,66→0,87 vid 15 s; (2) ÄKTA ARTEFAKT — på 34 klipp utan drop: intensity 0,19 → 0,01 (1 s) → 0,73 (13 s) och ligger kvar 0,60–0,69 till 29 s i stället för ~0,5. Orsak: intensityFloor/Ema startar på 0,5, lvlSmooth dyker till 0,26 vid 3 s (AGC/nivåns egen start) och stiger till 0,40 vid 13 s; golvet följer dykningen med tau 3 s under 8 s-värmen och kryper sedan med ~0,0025/s ⇒ ~40 s för 0,1. Gain-lås ändrar inte bilden. Längre värme (15/25 s) flyttar inte 0–14 s, sänker 15–29 s 0,72→0,66/0,56. Förslag (opt-in, ej byggt): sätt Ema=Floor=lvlSmooth vid första aktiva hopet + värme tills |Ema−Floor| < spread i stället för fast 8 s; bänkas mot sektionsbanken (tier) + energiR. activeMs nollas vid varje tystnad ⇒ samma värme efter låtbyten med paus, så det är inte bara ett korpusfenomen.
