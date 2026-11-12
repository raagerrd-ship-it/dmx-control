# SAMRÅDET (ägaren 2026-11-12 22:27)

> "Skulle det gå att sätta så de tre agenterna bollar med varandra för att komma fram till den bästa lösningen som sen testas?
>  Sen får de resultaten och bollar igen om det behövs."

Deltagare: k2 (mappar k2, k2b, k2c), k4 (k4, k4b), jokern (fusion, fusion-d). Ni arbetar nu mot EN gemensam lösning.
Ni kan inte prata direkt: orkestratorn förmedlar via filerna här i .arena/klocka2/samrad/. Alla tre får läsa ALLA mappar i
.arena/klocka2/ (losning.md, diffar, klockdom*.json, sonder, src) utom kontrollmängdens utdata (*/klockdom-holdout/ och
klockdom-holdout.json per fil) - därifrån gäller bara rankingen samrad/ranking-kontroll.md (måtten i % mot bas och DISK-skälen).

Omgång N (högst 3; slutar tidigare om två omgångar i rad inte flyttar något):
 a) FÖRSLAG: var och en skriver samrad/rN-forslag-<id>.md (kort, siffror före ord): vad i den egna lösningen som orsakar felet eller
    förlusten, vad sonderingen visat, vilka delar av de andras lösningar den vill ta, och ETT konkret förslag på gemensam variant
    (vilka ändringar, i vilka funktioner i analyserClock.ts).
 b) SVAR: var och en läser de två andras förslag och skriver samrad/rN-svar-<id>.md: håller med / håller inte med, med siffror,
    och röstar på EN variant. Högst två varianter går vidare (samrad-N och samrad-Nb), aldrig tre.
 c) BYGGE: jokern bygger i .arena/klocka2/samrad-N[b]/ (src + bygg.py); k2 och k4 granskar diffen mot det som röstades fram.
 d) MÄTNING på övningsmängden (orkestratorn kör klockdom.py --mat). Hela raden + ev. DISK-skäl går tillbaka till alla tre.
 e) Kontrollmängden: högst EN dom per omgång, bara på en variant som är godkänd på övningen.

Ramar: samma domare, spärrar, tillåtna filer och låsta regler som i uppgift.md. Ägarens prioritet (22:16): "för mig är det allra
viktigaste DMX, lotus inte lika" - står valet mellan två varianter väljs den som är bäst på mix_*, klipp_klocka, utfl_*, syskon_tid;
lotus får kosta lite inom marginalerna (fas-spärrarna 5 % relativt, lotus_ratt 1 %). DMX-spärrarna tänjs inte.
Fria sonder (bara övningsfiler, en åt gången) är tillåtna; nya mätningar i domaren kör bara orkestratorn. Inget skrivs utanför
.arena/klocka2/. Ingen mäter kontrollmängden.

LÄGET FÖRE OMGÅNG 1 (ranking-ovning.md, ranking-kontroll.md i den här mappen):
 kontrollmängden, godkända: k4b +8,25 (mix_hopp +46,2, utfl_min +43,9, lotus_syskon +15,4, lotus_ratt 468 mot 463, mix_still = bas;
   men utfl_tid -7,9, syskon_tid -2,9, lotus_vaxling -2,4), k2c +7,72 (kallaren +25,0, utfl_tid +16,7, utfl_min +15,8, lotus_vaxling
   +9,8, mix_still +8,2, mix_hopp +7,7, syskon_tid +5,4), k5 +1,08, k1 +0,65.
 kontrollmängden, diskade på mix_still: k2b +11,52 (4,22 s mot gränsen 4,02; kallaren +60,7, utfl_tid +39,1), fusion +11,14 och
   k2 +10,29 (8,20 s), fusion-d -2,75 (4,22 s).
