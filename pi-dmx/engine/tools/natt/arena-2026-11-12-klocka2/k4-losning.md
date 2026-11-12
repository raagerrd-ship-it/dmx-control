# k4 – fh1 efter säker låsning (klocka2, 2026-11-12)

**Utfall: DISK i alla tre mätningarna.** Levererad kod = mätning 3 (`klockdom.json`): poäng +5,72, DISK på `mix_still` 3,65 s mot spärren 3,23.

## Idén

Klockan har två lägen: START (kallstart, låtgräns, tystnad, efter ett bevisat byte) kör dagens snabba väg oförändrad; när tempogrammets val stått på samma hypotes över brustaket i 8 varv (~3 s, 1–2 takter) blir den REGENT.
Därefter byts tolkningen bara när en utmanares bevissumma (fh1: log-poäng minus brustak, golv efter regentens hälsa) gått om – bevis över flera takter, inte en topp i ett fill; det publicerade tempot jämnas aldrig ut.
När regenten håller prövar klockans finskanning inte kandidater > 3 % från tempot och hämtas till tempogrammets topp redan vid 1,5 % avvikelse.

## Siffrorna (övning, bas -> k4 mätning 3)

| mått | bas | k4 |
|---|---|---|
| mix_klocka % | 97,88 | 97,50 |
| mix_las s | 2,78 | 2,78 |
| mix_hopp /min | 0,00 | **0,10** (4 sena låsningar > 8 s) |
| mix_still s | 2,93 | **3,65 (DISK)** |
| klipp_klocka % | 98,32 | 98,56 |
| utfl_min | 0,82 | 0,39 |
| utfl_tid % | 2,11 | 1,71 |
| syskon_tid % | 2,67 | 2,12 |
| lotus_ratt (126) | 116 | 117 |
| lotus_syskon | 5 | 5 |
| lotus_vaxling | 17 | 16 |
| kallaren byten/min | 2,98 | 1,60 |

Syntet 6/8, on-beat 0,41, fas 0,91 / motfas 6 / i fas 69 (bas 70) – inom spärrarna.
Sämre: mix_still, mix_hopp, mix_klocka −0,4 pe. Låtstarten är alltså INTE löst i mixen.

## Vad som inte gick

- **Mätning 1** (utan 1,5 %-hämtningen): +7,53, mix_still 3,17 (inom), utfl_min 0,36 – men DISK på lotus fasmedian 0,90 mot 0,91. Sparad: `klockdom-m1.json`, `sond/analyserClock-m1.ts`.
- **Mätning 2** (utan 3 %-spärren): fas 0,91 men utfl_min 0,81 (blipparna tillbaka) och mix_still 3,65 → DISK, +2,58. Spärren bär alltså halva vinsten.
- **Regenten släpper när den ligger under brustaket** (fri sond, 86,7 min, bas 71 utflykter; utan släpp 31): 2 varv → 65 utflykter, låsningen som bas; 5 varv → 52 utflykter, låsningen ändå sämre. Bekräftar fh1-rapporten: dödsdetektorn slår i breaks.
- Svåra övergångar utan låtgräns låser 2–4 s senare (3,0 → 5,7, 7,4 → 9,4, 3,5 → 7,7 s i sonden); låtgränsen kommer för sent för att hjälpa.

## Risken

- mix_still är en median över 16 låtar där enskilda låtar kastas 10–25 s mellan varianter (låt 15: 3,2 → 27,3 s mellan mätning 1 och 3); mätning 1:s 3,17 var marginal, inte lösning.
- Ny låt med svag början i en mix utan låtgräns: ljuset går kvar i förra tempot några sekunder.
- En regent som låst FEL syskon under START sitter hårdare än i dag (lotus övning: ett fall annat → 3/2, ett 4/3 → rätt).
- Lotus taktväg, mikrofonvägen och kontrollmängden är omätta; tvavagar (upp_s/ned_s, cpu) ej körd. `Float64Array.sort()` per varv (0,37 s) antas inte allokera. +4,4 kB minne.
- Fasmedianen ligger på spärrens kant (0,90/0,91) och flyttas av småsaker.

Diff: `k4.diff` (bara `src/analyserClock.ts`, +52/−7).
