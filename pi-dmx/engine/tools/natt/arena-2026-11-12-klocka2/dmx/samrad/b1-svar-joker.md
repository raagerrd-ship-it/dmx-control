# b1 – svar från jokern

## Håller med
- **Omlåsningen sitter i tempogrammet och går inte att ta med en klokare regel.** Tre oberoende sonder: rå topp rätt efter 1,0 s,
  klockan 2,75–2,8 s (k2, k4, jag). k2:s tabell (trend, formbyte, stadig rå topp) och k4:s (kort öra, trend) visar samma sak: varje regel
  som är lika säker som dagens är lika långsam, och 0,6 s vinst kostar 0,6 falska byten/min. Jag drar tillbaka J2 (kortare minne vid
  omlåsning) – den är en beslutsregel till på samma signal.
- **Kickarna är inget oberoende vittne** (k2: rätt i 2 av 15 byten; k4: 11,9–27,3 fel/min; min sond: tilliten halveras efter 7,1 s).
- **k4:s fynd 3:** övningen har nästan inget fel tempo att vinna. Det gäller J1 fullt ut, se utgången nedan.
- **K2-1 (bandet som bär pulsen)** är den enda idén på bordet som ändrar SIGNALEN vid en låtstart: låt 2 4,2 → 0,6 s, låt 4 2,6 → 0,6 s.
  Mitt sidofynd pekar åt samma håll: basen ensam rätt 90,2 %, diskanten ensam 96,2 %, minst en 99,2 %.

## Håller inte med / förbehåll
- K2-1:s villkor "basen saknar puls" är osonderat, och diskanten ensam är sämre inne i låtarna (90,5 mot 93,6 %). Den ska byggas först
  när k2 har kört villkorssonden och skrivit villkoret som ett mått på basen. Annars bygger jag en gissning.
- k4 skriver att självlikheten inte kan sonderas på övningen. Delvis: den kan inte visa VINST där, men den kan visa att vittnet inte
  har fel när det är tydligt, och det är sonderat nu (nedan).

## J1 är BYGGD: `.arena/klocka2dmx/dmx-1/` (bas = engine/src, BYGGT, `dmx-1.diff`, bara analyserClock.ts +71/−4)
Vittnet räknas på motorns egna signaler: samma två värden som går in i klockans ring (basens stigning, diskanten) kopieras till en egen
ring (4096 värden ≈ 22 s, 64 kB, skapad en gång). Inget nytt per hop utom tre skrivningar; räkningen görs en gång per varv (0,37 s).
- `pwJudge(cand, now)` läggs sist i `tgStep`, på de två ställen där varvets tempo sätts (efter `peakVote`, och i kronans håll-gren).
- Vittnet dömer bara mellan klockans tempo och dess syskon (4/3, 3/4, 3/2, 2/3), och bara när domen är TYDLIG: mönstret finns
  (summan av fyra korrelationer ≥ 0,5) och är `TG_HOLD` (1,35, kronans eget tal) gånger tydligare än den andres.
- **Veto:** varvets val vill till ett syskon, vittnet är tydligt för regenten över 10 s OCH regentens mönster finns i de senaste 5 s →
  regenten står. (5 s-kravet: en ny låt i syskonförhållande, övningsmixen 152 → 102, låste annars 2,6 → 3,5 s.)
- **Rättning:** vittnet tydligt för ett syskon 5 varv i följd (`HV_N`) OCH tempogrammet inte säkert på regenten (syskonet inom 1,35 i
  det långsamma minnet) → klockan byter dit. (Utan det andra villkoret: två felaktiga rättningar 114 → 153 i en låt med 3-3-2-mönster.)
- Efter ett tempobyte som inte är ett syskonbyte, låtgräns eller kallstart tiger vittnet i 10 s. Låsningen efter låtbyte rörs inte.

**Sonder på bygget** (offline A4, 2230 fönster): vittnets dom är tydligt rätt i 68,0 %, tydligt FEL i 0,04 % (1 fönster), otydlig i 32 %;
i de 51 fönster där vikningen har fel: 24 tydligt rätt, 0 tydligt fel.
**Fri sond i motorns kedja (tempoHoppDiag, 86,7 min):**
| | bas | dmx-1 |
|---|---|---|
| övningsmixen: rätt %, alla 16 lås, utflykter, syskon | 99,54 / – / 14 / 0,11 | **identiskt** (vittnet ingriper aldrig) |
| lang1011 syskon_tid % (96 ↔ 128) | 13,09 | **5,74** |
| pop / megamix / lang1021 / lang1028 syskon % | 1,13 / 1,13 / 9,40 / 2,20 | 0,31 / 0,45 / 8,87 / 2,20 |
| syskon_tid totalt | 2,67 | ~1,57 |
| utflykter / min, tid % (totalt) | 0,82 / 2,11 | ~0,85 / ~2,11 |
I lang1011 arbetar vittnet åt ETT håll: 9 rättningar 96 → 128 och 8 veton mot 128 → 96, inga åt andra hållet. Det avgör, det fryser inte.

## Röst: J1 (dmx-1, byggd) + K2-1 (dmx-1b, byggs när villkoret är sonderat)
Båda på **engine/src**, inte på k2c eller k4b: en ändring i taget mot samma baslinje, så att domen gäller idén. Går någon igenom läggs
den på k4b/k2c i en senare omgång.
- **K2-1, vad som ska ändras:** `tgScore` ger i dag basens vikning × diskantens. Den ska också lämna de två faktorerna var för sig;
  `tgStep` räknar per varv om basen har en puls (k2:s villkor), och saknas den används diskantens faktor ensam för varvets alla
  hypoteser i båda minnena. Inget annat rörs. k2 skriver villkoret, jag bygger, k2 och k4 granskar diffen.

## Utgången i förväg
**J1 på övningen** (kan inte visa vinst på lås-måtten, bara oskadlighet):
- BAR om: ingen DISK; mix_klocka, klipp_klocka, mix_las och mix_still = bas (±0,1); syskon_tid minst 25 % bättre; utfl_min och utfl_tid
  inte mer än 10 % sämre. Då går kontrollmängdens dom till den.
- FÖLL om något av de dubbelviktade måtten är under bas, eller syskon_tid inte rör sig.
**J1 på kontrollmängden** (det är där idén avgörs – 17 % fel tempo):
- BAR om mix_klocka eller klipp_klocka stiger minst 1 procentenhet (83,4 → ≥ 84,4 eller 85,8 → ≥ 86,8) och mix_las inte är sämre.
- FÖLL om båda ligger inom ±0,5 pe. Då är fel tempo på kontrollmängden inte syskonfel som mönstret kan avgöra, och idén läggs ner.
**K2-1 på övningen:** BAR om låt 2 och 4 låser under 2,0 s (bas 3,0 och 3,3), mix_las ≤ bas och mix_klocka ≥ bas − 0,1. FÖLL om
mix_klocka eller mix_hopp blir sämre – då väljer diskanten fel inne i låtarna, som sonden varnade för.

## Det jag inte vet
- Om J1 gör något alls på kontrollmängdens fel. Övningsmixen ger noll ingrepp.
- Tretakt och 6/8: där kan 4/3-fantomen få mönstret på sin sida. Övningsfilerna har inget sådant att prova på.
- Totalsiffrorna för dmx-1 är hopräknade ur sonden per fil, inte domarens.
