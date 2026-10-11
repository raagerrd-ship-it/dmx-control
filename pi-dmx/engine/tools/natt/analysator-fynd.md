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

## ÖPPET 2026-10-11 Riktiga drops med kort break blir minidrops efter BODY_GONE_MIN_MS 4000
Vad: ägaren valde 10-10 "hellre färre drops" -> DMX-profilen BODY_GONE_MIN_MS 2000 -> 4000 (megamix 27 -> 15 riktiga, minidrops tar resten).
Ladans 10 dropklipp (tools/ladan-2026-10-10, drop vid 15,0 s) går inte att använda som facit: klippen börjar 15 s före dropen, så
analysatorn ser aldrig kropp -> borta -> tillbaka (dropFacit.mjs: 0/10 fulla, minidrop vid dropen 10/10). Material: långinspelningar
(lang-*.wav, knappen "Spela in 5 min" i /setup) när ägaren tagit några. Önskat: mät breaklängden före riktiga drops på material med
historik; är 4 s fel för vanlig pop? Bara DMX-profilen berörs om svaret är ett annat värde - ingen ändring i delad kod väntas.
Status:

## ÖPPET 2026-10-11 Analysatorns uppvärmning de första ~15 s
Vad: nattagenten (mätfälla 44): frame.intensity stiger +0,26 under de första 15 s i varje 40 s-korpusklipp, vilket vände korpusens
energiR till -0,39 (från 15 s: +0,27). I riggen märks det vid motorstart och efter långa pauser. Var: intensity/tierEma-baslinjen.
Material: frozen6-korpusen (dmx-control tools/frozen6). Önskat: kortare inlärning eller bättre startvärde, om det går utan att
läsningen blir instabil. Låg prioritet - live körs motorn i timmar.
Status:
