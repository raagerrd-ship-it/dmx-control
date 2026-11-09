# a6 – TILLITEN SOM ETT MÅTT (arena entempo)

## IDÉN
Den enda tilliten är effektklockans: `cfg.beat.confidence` = andelen kickar som klockans rutnät förutsäger (repeatRate), räknad från första kicken. Analysatorns tempogramtopp (ett annat tempo) används inte längre som tillit, och ramen bär klockans tal efter matningen (`frame.bpm = cfg.beat.bpm`, `frame.bpmConfidence = cfg.beat.confidence`). Därför läser effekternas tillit, frasräknaren, hasBeat, lab-effekterna, UI:t och inspelaren samma tempo och samma tillit. Det är bättre eftersom den gamla förtilliten var omvänd mot sanningen vid låtstart: `prov/tillit.mjs` visade analysatortillit 0,6–1,0 medan klockan fortfarande sökte (122 -> 87 -> 80 BPM på 5 s), och sedan föll den till 0,24 när de 12 kickarna väl kom.

## DIFFEN
`losning.diff` (3 filer, ~20 rader):
- `src/beatFeed.ts:374`: tilliten = repeatRate för effektklockan, coasten läser samma mått. Skuggrutnätet (kickFold) har kvar sitt gamla mått, eftersom dess återställningar styr sektionerna (spärren upp_s/ned_s).
- `src/beatFeed.ts:320,326-332`: `BeatFeed.publish` lägger klockans bpm och tillit i ramen (odelad väg).
- `src/split.ts:225-228`: samma publicering i taktvägens snabba sida. Den gamla FS_FCONF-läsningen är borttagen.
- `src/effects.ts:1303`: `stepBeatClock` grindas med `hasBeat` i stället för `bpm > 40`. Det är samma grind som beatIndex/beatPhase, så buggen där beatEnv frös på ett golv på upp till 0,8 vid tillit < 0,20 är borta.

## SIFFRORNA (mätning 3 = slutkoden)
`a6 +1.29 | långsamma +0,00 | snabba +3,23 (cpu 40,62 mot 43,42 us/hop, kvot 0,94 = brus) | latens 85 ms | p99 7 hop | md5 skiljer | ljusdomaren -0,19 | inga spärrar`.
Alla 17 kvalitetsmått är identiska med bas, vilket är väntat: tilliten styr inte klockans tempo eller fas. Mätning 1 (samma kod) gav -0,34, och skillnaden är bara cpu-bruset. Inget mått blev sämre. Ljuset blev -0,19, inom gränsen -0,5.

Mätning 2 (förkastad): tilliten styrde tempogrammets minne (EMA 0,21 -> 0,9 vid tillit < 0,4). mix_still blev 4,15 -> 3,96, men gridfel blev 15,1 -> 17,1 ms och ljuset -1,5, alltså DISK. Ändringen är borttagen.

## KRAV EN KÄLLA (regeländringen 11-09)
Kortet angriper punkt (2), EN tillit. Genomfört:
- frame.bpmConfidence = klockans tillit: `beatFeed.ts:330`, `split.ts:227`.
- hasBeat läser klockans tillit (`cfg.beat.confidence`, numera ett mått): `beatFeed.ts:374,458`.
- effects trust (`effects.ts:1774`) och frasräknaren (`effects.ts:1674,1677`) läser `frame.bpm`/`frame.bpmConfidence`, som nu är klockans.
- Pulsens grind läser samma tillit: `effects.ts:1303`.
- **EJ genomfört: `profile.beat`.** Det är analysatorns 8 s-EMA av sin egen tillit, och lookvalet läser den (`fit.ts:152`, `registry.ts:282`). Jag skrev en ändring (EMA av `cfg.beat.confidence` i `render`) efter regeländringen, men mätbudgeten var slut, så jag tog bort den i stället för att lämna in omätt kod. Punkt (2) är alltså inte helt genomförd.

## DUBBLETTER KVAR
- (1) Skuggrutnätet och analysatorns tempovikning finns kvar. Det var de som flyttade sektionerna 10-28, och spärren upp_s gör det riskabelt att röra dem i runda 1.
- (2) profile.beat, se ovan. BoundaryDetector läser fortfarande analysatorns bpm/tillit före matningen (`index.ts:187`, även i bänken).
- (3) beatCounter och halveringspariteterna, (4) de två pulskurvorna, (5) barReset vid tempohopp: inte rörda.

## RISKEN
- Kickfattig musik: tilliten bygger bara på kickar. Utan kickar (eller i ett break över 5,5 s) går den mot 0, och då pulsar takteffekterna inte. Förr höll analysatorns tempogram uppe tilliten. Bänken med 4 lång-filer och ljusdomaren -0,19 visar ingen skada, men ballader i ladan kan få mindre takt.
- I realtid kommer tilliten till ramen samma hop som cfg.beat (den snabba sidan läser det senaste resultatet), så den kan ligga 1–7 hop efter. Det gäller tempot också, alltså inget nytt.
- UI:t (`server.ts:465`) visar nu klockans bpm (decimaltal) i stället för analysatorns.
