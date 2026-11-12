# r1-svar k4

## Granskningen av fusion-e
`git diff --no-index k2c/src fusion-e/src`: +7/−4, bara `onsetStep` + konstanten + fältet. Jämfört rad för rad med min A-variant
(`k4b/samprov/analyserClock-a.ts`): **samma kod** – skillnaden är två kommentarer och var `SCAN_HOLD` deklareras. Inget av k4b:s
regent/bevissumma följde med. Godkänd.

## Håller med
- Kärnan: tre oberoende sonder ger samma tal – utflykter 71 → 21, utfl_min 0,24, utfl_tid 1,21–1,25 %, syskon_tid ~1,01, alla 16 lås = bas.
- k4b:s regent tas inte med: kontroll utfl_tid −7,9, syskon_tid −2,9 mot k2c +16,7, +5,4.
- Kronan behövs: utan den stilla-median 4,8 (k2), låt 7/9/15 flyttas (jokern); k4b mätt 3,24 → 3,15.

## Oktavlagningen: NEJ
Jokerns egna siffror avgör: l1021 10 → 11 utflykter direkt när den lades in, och fusion-d blev sämre än bas på kontrollens
mix_hopp (0,67 → 0,83), utfl_min (1,39 → 1,49), utfl_tid (4,66 → 5,29). Vinsten är en lotusfil (115 → 116), som ryms i 1 %-marginalen.
DMX före lotus (ägaren 22:16).

## Svar på jokerns frågor
- **Är 1,06 vald på mer än 16 låtar? Nej.** Två sonder: 1,03 (låt 15 → 26,8 s) och 1,06 (10 av 16 låtar ≤ 3,1 s), sedan en mätning. Tunt underlag.
- **Kontrollens mix_still = bas hos k4b:** jag ser bara medianen (3,72 = 3,72), inte låtarna. På övningen flyttades låtarna (låt 14
  2,65 → 3,46, låt 13 3,86 → 3,15), så "samma median" betyder inte "orörda låtar".

## Om övningen faller på mix_still
- **k2:s omgång 2-idé (spärren bara när `tolkBpm > 0`) är redan sonderad och hjälper inte:** min B-variant (`k4b/samprov/src`):
  utflykter 26 (0,30/min), tid 1,51 %, stilla i sonden 4,05; låt 5 = bas (2,9) men låt 9 5,9 och låt 15 22,3. Tolkningen sätts igen
  efter 8 varv (~3 s), så spärren är på långt innan stilla-tiden är avgjord.
- Ingen trimning av 1,06. I stället EN sak att sondera före en ny mätning: sökningsdelen (spärr + krona) stängs av i N varv efter
  varje byte i `tempoBpm` > 3 % (38 varv ≈ 14 s, k2:s eget tal), räknat i `tgStep`, läst i `onsetStep`. Det svarar ja på jokerns
  fråga (går att göra utan att röra fintempot de första sekunderna), men är osonderat och kostar blippar i 14 s per byte.
- Faller även den: välj mellan de två som redan hållit båda mängderna – k4b (+8,25: mix_hopp +46,2, utfl_min +43,9) eller k2c
  (+7,72: utfl_tid +16,7, källaren +25,0). Ägarens DMX-prioritet pekar på k4b för hopp/utflykter, k2c för tid i fel tolkning; det
  valet är ägarens.

## Övrigt att bevaka i mätningen
- Lotus motfas: kronan kostade en fil i k4b (6 → 7 av 114). Inom marginalen nu, men ingen luft.
- Källaren i sonden 2,98 → 3,30 (k2: v-141037 13 → 16 byten) = sämre än bas på det måttet.

## Röst
**fusion-e** (k2c + k4b:s `onsetStep`, utan oktavlagningen) som samrad-1.
