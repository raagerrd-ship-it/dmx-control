# a4 TVÅTAKTSMÖNSTRET (etta2) - negativt resultat

## IDÉN
Ettan är taktgränsen där musiken byter: för varje slag jämförs takten som slutar där (4 slag, nivå i sub+kick, bas och diskant) med
takten 4 och 8 slag bakåt, och kvadraten av skillnaden röstar på platsen efter (där mönstret börjar om). Vid fel fas delas ett byte
på två takter och kvadratsumman halveras, så termen skiljer 1 från 3, som backbeaten inte kan.

## DELARNA
| del | vad den gör | mått |
|---|---|---|
| barRep (taktgränsröst Q) | per slag: 3 bandnivåer (medel av log per åttondel mot en långsam nivå), ring på 12 slag, Q[plats efter] += (abs(takt - takt-4)^2 + abs(takt - takt-8)^2)/16 | m1: etta -0,75, omval +-0, paslag -0,04 |
| röstning, parterm | v[i] += 0,5 * (Q[i] - Q[i+2]) / sum Q (bara inom paren {1,3} och {2,4}) | se ovan |
| m2: parnormerad, vikt 1 | (Q[i]-Q[i+2])/(Q[i]+Q[i+2]) | etta -4,4 (171840 61 -> 52). Struken, koden är m1 |

## SIFFRORNA (m1 = kodens läge, ettdom.json = ettdom-m1.json)
| fil | bas etta | a4 etta | förskj 0/1/2/3 |
|---|---|---|---|
| 151659 | 97,8 | 97,9 | 98/1/0/1 |
| 171840 | 63,4 | 61,4 | 61/8/17/14 (förskj 1 -> 3, förskj 2 oförändrad) |
| 200719 | 68,9 | 68,5 | 69/10/15/6 |
Medel etta 75,9 (bas 76,7), omval 0,93 (lika), paslag 78,2 (lika). Poäng -0,76.

Offline (egen analys av sonderna, bas-gridet): termen ensam väljer rätt mellan 1 och 3 i 75/71/72 % av slagen, oberoende av
nivåkonstanterna. Men där basen redan har ettan på slag 3 har Q också fel (171840: 2 % rätt; 200719: 62 %). Felen är korrelerade
med de befintliga rösterna, så termen tillför nästan ingen ny information. I m1 är dess marginal (~0,02) under BAR_MARGIN; i m2
vänder den rätta ettor till fel. Självlikhet mot 4/8 slag bakåt (nyhetsstigning, fill före ettan, d4-d8) var ännu svagare och
inkonsekvent mellan filerna (fill-hypotesen motsägs: slag 4 är det MEST självlika i 171840).

Slutsats för jokern: lyft inte in barRep. Det enda användbara fyndet: basens fel på slag 3 sitter i stycken där musiken själv byter
mitt i takten (energin), så nästa försök bör vara en källa som inte är bandenergi (t.ex. harmonibyte).

## DIFFEN
Se `.arena/etta2/a4/diff.txt` (`git diff --no-index src .arena/etta2/a4/src`): analyserClock.ts (+ md5-raden). Ingen allokering per hop
(fem fasta Float64Array), ingen ny FFT, nollställs i barReset.

## RISKEN
Breaks och musik utan trumma: nivåbyten utan takt ger slumpröster (vikten är liten, så nästan ingen verkan). Låtbyte: ringen nollställs
med barReset. Live-mic: nivån är relativ (log mot långsamt medel), så gain spelar ingen roll. Utöver det har varianten ingen nytta,
så risken är att den kostar ~0,5-2 procentenheter etta på musik som 171840.
