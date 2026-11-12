# fusion – jokern (klocka2, 2026-11-12)

## Idén
k2:s TVÅ TIDSSKALOR väljer tolkningen (stadigt val ~15 s, byte bara på bevis i det långa minnet eller snabb kvot > 1,7) och k1:s SYSKONFAMILJ dömer sist: ett exakt syskon (4:3, 3:2, 2:1 ±1 %) till en krönt regent tas först efter 16 slag netto. De angriper olika fel (k2: icke-exakta växlingar, källaren, lotusklippen; k1: exakta syskon i långa inspelningar) och vinsterna adderar. Backar familjen tolkningens val backas tolkningen också (annars står k2 på ett tempo klockan inte har, med öppen kickgrind). Bara `src/analyserClock.ts` (+110/−7), inga flaggor, inget nytt per hop.

## DELAR
| del | från | mått den bär (bas → fusion) |
|---|---|---|
| tolkning + långt minne (tgAccL, tolkStep, tolkEscape) | k2 | kallaren 2,98 → 1,70 (+42,9), lotus_vaxling 17 → 14 (+17,6), utfl_min 0,82 → 0,68 (+17,1) |
| syskonfamiljen (famStep, 16 slag netto, regenten lever) | k1 | syskon_tid 2,67 → 0,67 (+75,0; k1 ensam 1,05, k2 ensam 1,68), utfl_tid 2,11 → 1,82 (+13,7) |
| backa tolkningen när familjen håller | ny | sammanfogningen (lang1011 13,1 → 2,5 %, lang1021 9,4 → 1,7 %) |

## Domarens rad (mätning 4, övning) – poäng **+12,78, OK**, plats 1
mix_klocka 97,90 (+0,0) · mix_las 2,78 (0) · mix_hopp 0,03 (−13,0) · mix_still 2,93 (0) · klipp_klocka 98,32 (0) · utfl_min 0,68 (+17,1) · utfl_tid 1,82 (+13,7) · syskon_tid 0,67 (+75,0) · lotus_ratt 116 (0) · lotus_syskon 5 (0) · lotus_vaxling 14 (+17,6) · kallaren 1,70 (+42,9). Syntet 6/8, on-beat 0,41, fas 0,91 / 6 / 70 (115). Sämre: mix_hopp (ett byte i mixen, k2:s).

## Valt bort
- **k4:s skanningsspärr** (klockan tar inget eget tempo > 3 % från tempogrammets; 45 av 59 utflykter är sådana 0,2–0,4 s-blippar): utfl_min 0,24–0,29 (+65–71 %), poäng +15 till +16,5 – men DISK i alla tre formerna, på tre olika spärrar: stryka kandidaterna (m1: fasmedian 0,90), hämta direkt (m2: i fas 69/115, Pong Dance 0,84 → 0,78), hämta först när tolkningen stått 15 s till (m3: mix_still 3,86, låt 15 2,5 → 26,8 s). Värd ett eget prov: on-beat i DMX-sonderna steg (ovn 0,508 → 0,513–0,516, mega 0,495 → 0,509–0,526). Koden: `sond-v2/analyserClock-m1.ts`, `-m2.ts`, `sond-v3/analyserClock-m3.ts`.
- **k3:s passform** som veto bara medan tolkningen är öppen (`fusion-b/`, EJ mätt – budgeten slut): fria sonder syskon_tid 0,31, kallaren 1,49, utfl_tid 1,75, mixens lås oförändrade. Lotusfasen (det som fällde k3) är omätt.
- **k5:s underdelning**: samma fel som k1 tar (exakta syskon), lägre vinst (+30 mot +61) och sämre utfl_tid.
- **k4:s regent/bevissumma**: överlappar k2:s tolkning; föll på mix_still.

## Risker
- Spärrarna har ingen marginal och det är ärvt från k2: i fas 70/115 (69 = DISK), mix_still vilar på att ingen av nio låtar flyttar sig över 3,23 s. Kontrollmängden kan falla åt båda håll.
- Fel tolkning som stått 15 s sitter hårdare än hos k1 eller k2 var för sig (långa minnet + 16 slag netto); låtgränsen öppnar allt.
- Ny låt utan låtgräns med svag start: lås 3,5 → 7,8 s och 7,5 → 8,7 s på två övningslåtar (k2:s).
- lang1028 500–530 s: klockan går tillbaka till 140 i stället för att vandra = räknas som utflykt (utfl_tid 7,3 % i den filen).
- Ej kört: tvavagar.py, kontrollmängden, lotus taktväg live.
