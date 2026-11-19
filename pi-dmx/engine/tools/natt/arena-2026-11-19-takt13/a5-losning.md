# a5 takt13: metrisk konsekvens i tempovalet (kort: FEL TEMPO)

## IDÉN
När klockan är i START-läget (efter kallstart, låtgräns eller ett bevisat byte) måste tempogrammets vinnare förklara mönstret både
1 slag och 2 slag (halvtakten) bort. Klarar vinnaren inte det tar klockan den starkaste andra toppen inom kronan (A >= vinnaren/TG_HOLD)
som klarar det. Ingen kandidat klarar det: vinnaren står kvar. Inom det cirkulära oktavrutnätet sållar lag 1 + lag 2 bort alla syskon
(4:3, 3:4, 3:2, 2:3), och oktaven påverkas inte. Paret rörs inte, men blev bättre (97,5 -> 98,4) av en kedjeeffekt.

## DELARNA
| del | vad den gör | mått (m1) | varifrån |
|---|---|---|---|
| mcAt | min(korr lag 1 slag, korr lag 2 slag), bas + diskant, ±1 värde, senaste 5 s av vittnets ring | - | ny, självlikheten från klocka2dmx J1 (pwCorr) |
| mcPick (START) | vinnaren förklarar inte (< PW_MIN/2): starkaste topp inom kronan som förklarar | FEL 10,3 -> 11,1, par 97,5 -> 98,4, oktav 5,6 -> 5,2 | ny |
| (m2, borttagen) | HÅLLET: regenten förklarar inte och snabba minnets utmanare (>= TG_HOLD) gör det: byt direkt, fönster 3,5 s | FEL 11,8, par 98,3: sämre | ny |

Med ett golv på PW_MIN/2 per lag har varje term samma golv som PW_MIN. Inget tal är skattat ur facit.

## KOSTNADEN
Allt körs i workern (tgStep, en gång per varv, ~0,37 s). Bara när vinnaren inte förklarar mönstret: högst ~6 korrelationer x ~940 värden per
testad topp, ~10 toppar = ~60 k mult per varv (< 200 per hop). Inga nya allokeringar och inget nytt minne. Huvudtråden rörs inte.

## SIFFRORNA (pardom, övningen; pardom.json = m1 = koden här)
| fil | FEL bas -> a5 | par bas -> a5 | lead |
|---|---|---|---|
| 151659 | 10,4 -> 12,0 | 98,8 -> 99,5 | -60 = |
| 171840 | 7,4 -> 7,4 | 97,1 -> 99,4 | -53 = |
| 200719 | 13,0 -> 14,0 | 96,7 -> 96,4 | -67 = |
| medel | 10,3 -> 11,1 | 97,5 -> 98,4 | paslag 91,9 = |

Poäng m1 -0,41 OK (inga spärrar). m2 (+ håll-delen, 3,5 s) -1,20: 171840 215 'dubbelt' -> 'motslag'.
Det som blev sämre på 151659 är två fönster (395, 415) som nu räknas: klockan tickar där, och i basen var de tomma (lock 0).
De två fönstren kom alltså in i nämnaren, och det ena blev 'feltempo'.

## FYNDET (det viktigaste)
Felen med fel tempo på övningen ligger nästan alla i DJ-skarvar och tempo-ramper (200719 625-680 och 985-1010: Beat This vandrar mellan 100
och 125). Där tar klockan 6-8 s på sig, och 5 s av det är tempogrammets fönster. Metrisk konsekvens ändrar sällan valet, för båda
kandidaterna förklarar mönstret när fönstret rymmer båda låtarna. 151659 388-422 (Beat This 96,8, klockan på 105-106 i 20 s) löstes INTE.
106 klarar testet eller 96,8 ligger inte inom kronan. Jag hade ingen sond kvar för att se vilket.

## RISKEN
Halvtid och hiphop: lag 1 kan vara svag på rätt tempo, och då kan en fantom ta över om den råkar klara båda lagen (ovanligt). Aux in från mixer:
oförändrat. Breaks: testet körs inte i break-hållet. Udda takter (3/4): lag 2 är då 2/3 takt, och rätt tempo kan fela. Då står vinnaren kvar
om ingen annan klarar testet.

## DIFFEN
Se diff.txt i den här mappen (`git diff --no-index .arena/takt13/bas/src .arena/takt13/a5/src`, bara analyserClock.ts). m2:s håll-del
(borttagen) var: i `if (this.tgR >= 0)`-blocket, före `if (fk >= 0 && dd > TG_SW_STEPS && fv >= fc * TG_HOLD)`, en gren med samma villkor
`&& mcAt(regent) < MC_MIN && mcAt(fk) >= MC_MIN` som gör `acc.set(accF)`, tgR = -1 och nollar tgLk/tgLkK/tgSw. Den kördes med MC_WIN_MS = TG_FWIN_MS och MC_MIN_N = 500.
