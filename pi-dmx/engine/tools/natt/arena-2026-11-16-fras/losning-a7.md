# a7: landningen som frasmarkör (kort: uppbyggnad och drop), lagad runda (m3/m4)

**IDÉN.** Lookbytet kommer på analysatorns minidrop, när basen kommer tillbaka efter luckan (miniDropCount stiger), direkt, utan MIN_HOLD/slaggrind/detektor. I sonden på 151659 låg 13 av 43 minidrops inom ±1 slag från en ägargräns (median +0,2 slag = på ettan).

**VAR FÖRDRÖJNINGEN SATT (bas).** Detektorn median 3,0 slag efter gränsen, dirigenten +4,6 slag till (MIN_HOLD, slaggrind, luckan). Uppbyggnadssignalen som bytespunkt var sämre offline (+19,7 mot +26,4) och används inte.

**VAD SOM SLÄCKTE l160345 (2 sonder: konsertReplay som rytm.py, a7 m2 och bas, första 300 s).** D4 (landningen skickade tier 'fart' fast tiern var lugn) smittade dirigentens tier-hysteres (lastSmartTier): vid 181 s valde nästa SEKTIONSbyte 'vidga' (fart) i stället för basens 'sokljus' (lugn). Vidga släcker riggen i tysta partier (199-206 s). D2 (sväljningen 24 s) bar sedan vidga från en low-landning (225 s) genom hela nästa high, vilket gav mörker 253-264 s. Mörkt ≥ 1 s: 15,6 s mot basens 6,4 s.

**DELARNA**
| del | vad den gör | mått |
|---|---|---|
| D1 landningsbyte | minidrop + held > 6 s -> switchLook direkt | gräns 12,7 -> 27,5 % (m2) |
| D2 sväljningen | sektionsbyten 24 s efter landningen tas inte | håller byten under spärren (m1-m3); bär fel look (släckning) |
| D3 grind build/break | ingen landning i build/break | m1 -> m2 lösa 1,48 -> 1,33 |
| D4 aldrig lugnt | tier-golv fart | SKADLIG (hysteresen), borttagen i m3 |
| D5 tier >= 1 | landar bara när dirigentens tier inte är lugn | m3: slocknat laget (+0,8 pe) |
| D6 identitet (m4) | bara i low, alltid till refrängens manuslook ('high'), aldrig om den redan visas, inga tvingade nya looker, ingen D2 | ljus +0,8, men bara 3 landningar |

**DIFFEN** (m4 = koden i src): `verktyg/diff.txt` (57 rader, `git diff --no-index src .arena/fras/a7/src`).

**SIFFRORNA**
| mätning | poäng | gräns % | lag | etta % | lösa | byten | ljus | status |
|---|---|---|---|---|---|---|---|---|
| m1 D1+D2 | +27,69 | 27,5 | 9,0 | 40,6 | 1,48 | 3,84 | -4,6 (slocknat +1,6) | DISK |
| m2 +D3+D4 | +27,83 | 27,5 | 8,7 | 40,1 | 1,33 | 3,80 | -4,3 (slocknat +1,1) | DISK |
| m3 D1+D2+D3+D5, low->high-nyckel | +22,97 | 24,2 | 9,0 | 37,7 | 1,02 | 3,45 | -6,9 (kor -7,9, l171840 rAbest 0,35 -> 0,30) | DISK |
| **m4 D1+D5+D6** | **+1,37** | 12,7 | 9,8 | 19,9 | 1,22 | 3,56 | **+0,8** | **OK** |

Per fil i m4: 151659 3/11,6 (bas 3/11,6), 171840 9/9,4 (9/10,0), 193040 26/8,4 (26/8,4).

**SLUTSATSEN.** Gränsträffarna i m1-m3 kom nästan helt från byten som basen inte gör: tvingad ny look eller växling i manuset när looken redan var rätt. Det är också dessa byten som flyttar ljuset. Ljusdomaren är känslig för lookföljden: l171840:s bas-jitter 18,5 ms ligger lågt, och ett enda nytt lookval (m3: 'drops' vid 249,8 s) fäller koreografin. I m4 dödar D5 (tiern är oftast lugn vid landningen) och "redan rätt look" nästan alla landningar. För jokern: m3:s D1+D5 utan D2 men med D6:s "aldrig ny look" vore nästa prov (ej mätt).

**RISKEN.** m4 är nära bas, så låg risk i ladan. Live-mic kan flytta minidropen, men bytet går bara till refrängens egen look. m3-varianten har D2:s bärrisk (fel look i upp till 24 s).
