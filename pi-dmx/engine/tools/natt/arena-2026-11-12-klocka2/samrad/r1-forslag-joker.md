# r1 – förslag från jokern (fusion, fusion-d)

## Vad i min lösning som föll
| variant | kontroll | övning | skäl |
|---|---|---|---|
| fusion (k2 + k1) | +11,14 DISK mix_still 8,20 | +12,78 OK | k2:s håll mot ALLA utmanare, även en ny låts tempo |
| fusion-d | −2,75 DISK mix_still 4,22; mix_hopp 0,67 → 0,83, utfl_min 1,39 → 1,49, utfl_tid 4,66 → 5,29 | +8,62 OK, mixens 16 stilla-tider = basens | se nedan |

fusion-d fick EXAKT k2b:s 4,22 trots att jag höjde okänt-tröskeln 0,5 → 0,75 (rå kvot) och tog bort regel (5). Alltså är det varken tröskelns
nivå eller rutnätsvägen som ger 4,22. Kvar gemensamt för k2b och fusion-d, och borta i k2c (3,41): rå kvot mot en svag regent ("allt är
känt") och hållet på den vandrande toppen utan "regenten lever". **k2c:s diagnos stämmer; min tröskelhöjning var fel medicin.**

Det som gjorde fusion-d SÄMRE än bas på utfl/hopp (k2b hade +23 / +39 där) är mina egna två tillägg, som jag drar tillbaka:
- **Oktaven ur tempogrammet** (i stället för "oktaven hör till tolkningen"). Lagade ett lotusklipp (Stora tuttar 115 → 116) men släpper
  igenom basens 80 ↔ 160-vändningar som byten. Fri sond: l1021 utflykter 10 → 11 direkt när den lades in.
- **Ordningen tolkStep → famStep med backning.** Ingen mätt vinst på kontrollmängden (fusion mot k2: syskon_tid 7,82 mot 7,85).
Slutsats: övningsmixen identisk med basen var INGEN garanti. Övningens mix_still säger nästan ingenting om kontrollens.

## Vad de två godkända bär (kontroll, % mot bas)
| | mix_hopp | mix_still | utfl_min | utfl_tid | syskon_tid | kallaren | lotus_vaxling |
|---|---|---|---|---|---|---|---|
| k4b | +46,2 | 0 | +43,9 | −7,9 | −2,9 | +3,6 | −2,4 |
| k2c | +7,7 | +8,2 | +15,8 | +16,7 | +5,4 | +25,0 | +9,8 |

De ligger i OLIKA LAGER: k2c dömer `tempoBpm` (tgStep: famStep, tolkStep, tolkKnown över golvet, regenten lever), k4b:s vinst på
utfl_min sitter i klockans egen sökning (onsetStep: blippen överhoppad + fintempots krona) och de raderna läser inte regenten
(`tgR`) – de är ogrindade. k4b:s minus (utfl_tid, syskon_tid) sitter i dess regent/bevissumma, som k2c inte behöver.

## Sond på förslaget (fri, övning 86,7 min, mappen `fusion-e` = k2c + k4b:s fem rader i onsetStep)
| | bas | k2c | k4b | k2c + spärr + krona |
|---|---|---|---|---|
| utfl_min | 0,82 | 0,74 | 0,30 | **0,24** |
| utfl_tid % | 2,11 | 1,39 | 1,53 | **1,21** |
| syskon_tid % | 2,67 | 1,02 | 2,34 | **1,01** |
| lås efter låtbyte (16) | – | = bas | 2 sena | = bas (alla) |
Vinsterna adderar. Väntad övningspoäng ungefär +15 (k2c:s rad med utfl_min +71, utfl_tid +43).

**Varningen:** min stilla-tidsproxy (k2/still.py, inte domarens) flyttar två låtar: låt 5 2,9 → 4,0 s och låt 9 2,5 → 8,3 s. Låt 5 är
själva medianelementet (2,93) i övningsmixen, så övningens mix_still kan gå över 3,23. Proxyn har haft fel om låt 9 förr (k2: proxy
6,9, domare 2,48). Utan kronan (`fusion-f`, SCAN_HOLD 1) är det värre: låt 7 2,8 → 4,8, låt 9 6,7, låt 15 7,1 – kronan behövs, som k4b fann.

## FÖRSLAGET: samrad-1 = k2c:s src + k4b:s sökning
Utgå från `k2c/src/analyserClock.ts` oförändrad (tgStep, famStep, tolkStep, tolkEscape, tolkKnown, ingen regel 5, oktaven i tolkningen).
Lägg till, bara i `onsetStep`, ordagrant ur `k4b.diff`:
1. fältet `scanFar` och `const cb = this.scanFar > 0 ? this.scanFar : beat.bpm` som sökningens centrum (två rader vid sökningens start);
2. `if (tempoBpm > 0 && |bestBpm / tempoBpm − 1| > TG_SNAP) { scanFar = bestBpm; return; }` före rutnätet flyttas;
3. kronan: `score = (mx / mean) * (c === 0 && scanStep === 0.005 ? SCAN_HOLD : 1)`, `SCAN_HOLD = 1,06`.
Inget av k4b:s regent/bevissumma (tgR, tgD, brustaket), inget av mina tillägg. Färdigbyggd i `fusion-e/` (diff mot k2c: +7/−4 rader).

Om övningen faller på mix_still: gå INTE tillbaka till trimning av tal. Då är valet k2c ensam (godkänd på båda mängderna) – och frågan
till k4 blir om spärren går att göra utan att röra fintempot de första sekunderna efter ett tempobyte i `tempoBpm`.

## Frågor till de andra
- k4: är kronan 1,06 vald på mer än övningsmixens 16 låtar? Kontrollens mix_still = bas hos k4b – var det med samma låtar orörda?
- k2: k2c tappade k2b:s källare (+60,7 → +25,0) och mix_hopp (+23 → +7,7). Vilken av de tre stängda vägarna bär det mesta av tappet?
