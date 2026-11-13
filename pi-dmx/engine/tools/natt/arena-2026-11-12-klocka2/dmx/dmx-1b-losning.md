# dmx-1b = k4b + J1 (taktens självlikhet) – byggd av jokern, 2026-11-13

Bas: `.arena/klocka2/k4b/src` oförändrad + samma J1-kod som i `dmx-1` (konstanter, ring, `pwSib`/`pwCorr`/`pwAt`/`pwSim`/`pwJudge`),
inlagd med `patch_j1b.py` som hämtar blocken ordagrant ur `dmx-1/src`. `dmx-1b.diff` är mot engine/src (bara analyserClock.ts).
En rad är ny mot dmx-1: när vittnet RÄTTAR till ett syskon flyttas också k4b:s regent dit (`tgR`, bevissumman nollas) – annars drar
regenten tillbaka klockan nästa varv och rättningen blir en blipp.

## Fri sond (tempoHoppDiag, övning 86,7 min) – inte domarens tal
| | bas | k4b | dmx-1 (bas + J1) | **dmx-1b (k4b + J1)** |
|---|---|---|---|---|
| utflykter / min | 0,82 | 0,30 | 0,85 | **0,24** |
| utfl_tid % | 2,12 | 1,54 | 2,11 | **1,18** |
| syskon_tid % | 2,67 | 2,34 | 1,59 | **1,39** |
| mixen: rätt tempo % | 99,54 | 99,58 | 99,54 | **99,94** |
| mixen: lås median s | 2,8 | 2,8 | 2,8 | 2,8 (alla 16 = k4b:s) |
| lang1011 syskon % | 13,09 | 10,66 | 5,74 | 5,15 |
Mot k4b i mixen: låt 126 rätt 94,5 → 100 % (k4b:s regent satt på ett syskon, vittnet rättade), låt 139 99,8 → 100. Inget lås flyttat.
Gamla stilla-måttet (±1 %) i sonden: låt 5 1,7 → 3,2 s och låt 15 2,7 → 11,3 s – fintempots grannväxling igen; det nya robusta
mix_still (> 3 %) ska inte röras av det, men det är domaren som avgör.

## k4:s två invändningar
1. **Vittnet dömer bara mot syskon, inte hela rutnätet.** Avsiktligt. Mot syskonen är det tydligt rätt i 68,0 % av fönstren och
   tydligt fel i 0,04 %; som väljare över alla 139 tempon har självlikheten rätt topp i 93,1 % (3,5 s, min sond A3) – sämre än
   vikningen (97,5 %). Mönstret kan skilja läsningar av SAMMA rytm (där 2 och 4 slag hamnar på 1,5 / 2,67 / 3 riktiga slag), inte
   hitta ett tempo. Fel som inte är syskonfel rör den inte – är det sådana kontrollmängden har faller idén där, och det står i utgången.
2. **Ringens längd.** Vittnet läser 10 s; längsta förskjutningen är 4 slag vid 80 BPM = 3 s, och den ryms INOM fönstret (korrelationen
   räknas över fönstret minus förskjutningen, minst 7 s). Det behövs alltså ~1875 värden; ringen är 4096 (21,8 s) för att kunna
   maskas (& 4095) i stället för modulo, 3 × 4096 värden = 64 kB, skapad en gång. Den kan halveras till 2048 (10,9 s) utan att
   något ändras; jag har låtit den stå för att inte bygga om efter sonden.

## Risker
- Tretakt/6-8 och 3-3-2-mönster: sonden gav två felaktiga rättningar (114 → 153) innan villkoret "tempogrammet är inte säkert på
  regenten" lades till. Med k4b under är tempogrammets egen dom (regenten) trögare – samma villkor läser fortfarande det långsamma
  minnet, inte regenten.
- Två lager som kan hålla (k4b:s regent och vittnets veto). Vetot gäller bara syskon och bara när mönstret är tydligt de senaste 5 s.
- Allt ovan är övningsfiler. Övningen har nästan inget fel tempo; vinsten ska synas på kontrollmängden eller inte alls.
