# Arenan takt, 2026-11-17/18: klockan ska sitta på slaget hela tiden

Ägaren (i ladan 11-17 kväll): "kör på! med vetskapen att använd alla resurser som pi har". Inget inlagt i src, inget utlagt.
Bas = HEAD 78346df (= ladan sedan 21:45, kärna 0 1 2). Domare tools/arena/taktdom.py (ny, 4d27aff): klockans tick klassade per 10 s-fönster
mot Beat This (på slaget / motslag / fel tempo / glider / stökigt / dubbelt), POÄNG = bas.FEL - FEL. Spärrar: oktav +3, lead +-10 ms,
etta (ettdom) -3. Pi-spärren tools/arena/pibudget.py (worker x4, andra worker tillåten, huvudtråd x1,10, minne +15 MB).

## RESULTAT: INGEN VINNARE. Takten blev mycket bättre, men ettan föll på okänd musik

| | övning FEL | mellan FEL (171840) | KONTROLL FEL | kontroll etta | ren 4/4 etta 193040 / 193818 |
|---|---|---|---|---|---|
| bas | 29,9 | 14,8 | 27,8 | 64,1 | 70,1 / 71,6 |
| a6 (fasen ur sex band) | 10,8 | 7,4 | 13,9 | 60,4 DISK (+ oktav 12,1 DISK) | 65,5 / 66,8 |
| j0b (a6 + a2:s fasvakt) | 10,8 | 14,8 | 14,7 | 54,8 DISK | 67,7 / 62,9 |
| j0 (a6 + a5:s trötta lås) | 9,8 | 7,4 | 13,3 | 51,7 DISK | 53,1 / 67,6 |
| a3 (motslagsvakt) | 22,2 | 11,1 | 25,5 | 54,5 DISK | 70,6 / 64,9 |

- TAKTEN HÅLLER på okänd musik: a6 tar kontrollens fel från 27,8 till 13,9 % (motslag 4,7 -> 1,2, glider 10,7 -> 2,6).
- ETTAN FALLER ~5 procentenheter i ren 4/4 (inte facitbrus). "Helt rätt" (på slaget OCH rätt etta, paslag x etta) på kontrollen:
  bas 53 %, a6 52 % (193040 60 -> 49, 193818 46 -> 55). Netto lika: vinsten i takt äts av ettan.
- På övningen var ettan oförändrad (a6 84,2, j0b 86,3 mot 85,7). Ettans skada syns bara på okänd musik, så den går inte att jaga på övningen.
- Pi-budgeten: a6 worker x1,09, a3 x0,95, minne +2 MB (bas mätt om i samma sittning). Kostar nästan inget.

## Runda 1 (övningen; mellan inom parentes)

| deltagare | idé | poäng | etta |
|---|---|---|---|
| a6 | fasen ur sex band, amplitudstigning per band viktad efter regelbundenhet + lärd leadkompensation | +19,1 (+7,4) | 84,2 |
| a7 | Ellis-DP över 10 s i workern | +11,3 (-3,7, etta DISK 59,6) | 86,3 |
| a3 | motslagsvakt i tre band, i musikens fas | +7,6 (+3,7) | 83,5 |
| a1 | 48 fashypoteser + bytesgrind | +7,3 (-3,7) | 85,8 |
| a5 | trött lås (fasminne röstar om hopp) + fritt 8 s efter gräns | +7,3 (-3,7) | 86,2 |
| a2 | lokal fasvakt + förstärkning efter tydlighet | +10,0 DISK etta 81,1 | |
| a8 | tvillingklocka i egen worker, halvslagsbyte | +8,2 DISK etta 82,1 | |
| a4 | finare tempo | -0,8 | 84,0 |

## Fynd
1. FELET ÄR FASEN, INTE TEMPOT. Vikningen av basens dB-stigning har ofta två nästan lika toppar (slag och offbeat-bas) och klockan hoppar
   mellan dem var 250 ms; domaren ser det mest som 'glider'. Finare tempo (a4) hjälpte inte alls. Fasen ur flera band (a6) löser det.
2. ETTAN TÅL INTE EN BÄTTRE FAS. Taktmodellen (K/R/L + backbeat) skiljer inte slag 1 från 3; när fasen blir stadig hamnar fler tick på
   slag och modellen väljer oftare trean (193040 förskjutning 2: 29 -> 35 %). a2 och a8 föll av samma skäl redan på övningen.
3. Mellanfilen (27 fönster, 1 fönster = 3,7 pe) är för liten för att skilja varianter.

## Om ägaren vill gå vidare
- a6 som ögonprov i ladan: takten bör synas direkt (motslag och glidning nästan borta), men fras/lookbyten kan hamna på trean oftare.
  Det är EJ en vinnare enligt reglerna; bara med ägarens ord, backup-tagg först.
- Bättre: en runda 2 "a6 + skydda ettan" dömd på ren 4/4 eller ägarens egna markeringar (ettan måste döms på okänd musik).
Tokens ~2,3 M (8 deltagare ~1,95 M + jokern 0,2 M + orkestratorn). Tid ~2 h 15 min (22:52 -> ~01:05).
Idébanken (losning.md, diff.txt, mätningar för alla) i tools/natt/arena-2026-11-18-takt/.
