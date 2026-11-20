# Ögonprov i ladan – ändringarna 2026-11-20 (ingen är utlagd än)

Deploy (du på plats, ingen inspelning igång):

    ANALYSER_SIBLING=/c/finns-inte PI_HOST=<ip> python tools/ladan.py

Välj effekten i listan på startsidan (klick = låst på den), spela en låt med tydlig takt, titta 2–3 takter. Tillbaka till **Smart** efteråt.
Vänster = Par 1–4, höger = Par 5–8. "Växeln" = grupp A på 1 och 4, grupp B på 2 och 3.

| # | Välj | Sektion att spela | Titta efter (nu) | Förut | Backa |
|---|---|---|---|---|---|
| 0 | Smart | drop → refräng | refrängen byter INTE look direkt efter landningen | kunde blinka förbi | tagg backup-fore-land-entry-2026-11-20 |
| 1 | Varannan | vers/refräng | slag 1–2: ena gruppen på slaget; 3–4: den andra | samma grupp på alla slag | `git revert fea59bc` |
| 2 | Vagbrytare | refräng | kammen: ettan vänster, trean höger | ettan, hela riggen | `git revert 9ef1af4` |
| 3 | Minnet | refräng | blinket: ettan vänster, trean höger | ettan, hela riggen | `git revert 6385257` |
| 4 | Linjalen | vers | löparen lika stark på 1 och 3 | starkast bara på 1 | `git revert 2a12946` |
| 5 | (alla) | – | hjärtpulsen lika på 1 och 3 (svårt att se ensam) | ettan 15 % starkare | `git revert 99b6632` |
| 6 | Gallopp | refräng | A slår 1–2, B galopperar; 3–4 tvärtom | A alla slag | `git revert 23971e5` |
| 7 | Tryckvåg | refräng | kanterna: vänster 1 och 4, höger 2 och 3 | vänster 1 och 3 | ändra raden i tryckvag.ts (INTE revert, rig.ts) |
| 8 | Rave | refräng | grupperna på växeln | A 1 och 3 | `git revert d43d32e` |
| 9 | Fyrverkeri | refräng (mellan dropparna) | pumpen på växeln | A 1 och 3 | `git revert 2afa53d` |
| 10 | Sidokedja | refräng | mittens vänstra padd trycks ner på 1, högra på 3, långsam sväll | hela padden på 1 och 3 | `git revert 8997303` |
| 11 | Andrum | break | hjärtslaget på växeln | 1 och 3 samma grupp | `git revert 834b0be` |
| 12 | Skuggor | break | ytterparet 1 och 4, innerparet 2 och 3 (ut-in-in-ut) | 1-3 / 2-4 | `git revert e21389b` |
| 13 | Mullra | uppbyggnad | kanterna på växeln | vänster 1 och 3 | `git revert fdbb0e3` |
| 14 | Stegring | uppbyggnad (slutet) | när pulsen går varje slag: kanterna på växeln | vänster 1 och 3 | `git revert 6fb2896` |

Ordningen = mest speltid först (replay: varannan 11 %, minnet 13 %, linjalen 1 %, resten valdes sällan).
Förkastas något: säg numret, så backar jag just den och lägger ut igen.
