# k4b – lagningen av k4 (klocka2, 2026-11-12)

**Utfall: DISK i båda mätningarna, på var sin spärr med minsta möjliga marginal.**
Levererad kod = mätning 2: poäng **+8,51**, alla DMX-spärrar klarade (mix_still 3,15 mot gränsen 3,23), DISK på lotus motfas 7/114 mot bas 6/114 (en fil).
Mätning 1 (samma kod utan fintempots krona, `sond/analyserClock-m1.ts`, `klockdom-m1.json`): +5,97, alla lotusspärrar klarade, DISK på mix_still 3,24 mot 3,233.

## Vad som lagades, och hur

1. **Låtbytet (mix_still, mix_hopp) – lånat av k2b.** När en regent håller prövas snabba minnets byte som i basen (1,35 i två varv), men tas bara om utmanarens tempo är OKÄNT för ett långt minne (~10 s, poäng < 0,5 × regentens) = ny låt, inte en annan läsning av samma låt. Då går allt som förr och START-läget tar vid. Ett känt tempo måste vinna på bevissumman (k4/fh1). Resultat i sonden: alla 16 låsningar efter låtbyte = basens eller snabbare (k4: tre låtar 2–4 s senare).
2. **Skanningsspärren i ny form (egen, efter jokerns tre fällda former).** Klockans egen sökning tar inte ett tempo > 3 % från tempogrammets; rutnätet rullar orört till nästa ORDINARIE sökning, som görs som om tempot tagits (samma tidpunkt, samma centrum). Blippen försvinner, hämtningen blir kvar och sökningarnas tidpunkter flyttas inte.
3. **Fintempots krona (egen, bara i mätning 2).** I klockans 0,5 %-sökning måste ett granntempo passa ansatserna 6 % bättre än det klockan har. Utan den växlar två lika bra grannar varannan sökning (114,0 ↔ 114,6), och det är den växlingen – inte låsningen – som avgör mix_still.

Lästa utan att ta något: k1, k5, k2:s smala fassökning i hållet (provad i sond: tog inte blipparna, 53 utflykter).

## Siffrorna (övning)

| mått | bas | k4 | k4b m1 | **k4b m2** |
|---|---|---|---|---|
| mix_klocka % | 97,88 | 97,50 | 97,94 | 97,94 |
| mix_las s | 2,78 | 2,78 | 2,78 | 2,78 |
| mix_hopp /min | 0,00 | 0,10 | 0,05 | 0,05 |
| mix_still s | 2,93 | 3,65 | **3,24** | 3,15 |
| klipp_klocka % | 98,32 | 98,56 | 98,57 | 98,64 |
| utfl_min | 0,82 | 0,39 | 0,35 | 0,30 |
| utfl_tid % | 2,11 | 1,71 | 1,85 | 1,53 |
| syskon_tid % | 2,67 | 2,12 | 2,35 | 2,34 |
| lotus_ratt | 116 | 117 | 117 | 117 |
| lotus_syskon | 5 | 5 | 5 | 5 |
| lotus_vaxling | 17 | 16 | 17 | 16 |
| kallaren | 2,98 | 1,60 | 2,23 | 2,23 |
| lotus fas med / motfas / i fas (n) | 0,91 / 6 / 70 (114) | 0,91 / 6 / 69 | 0,90 / 6 / 72 (113) | 0,89 / **7** / 69 (114) |
| on-beat, syntet | 0,41, 6/8 | 0,41, 6/8 | 0,41, 6/8 | 0,40, 6/8 |

Sämre mot k4: kallaren 1,60 → 2,23 och syskon_tid 2,12 → 2,34 (okända utflyktstempon släpps igenom som ny låt – samma pris som k2b betalade). mix_hopp 0,05 = två sena byten.

## Förkastat (fria sonder, 86,7 min; bas 71 utflykter)

- Säker låsning först efter 38 varv + okänt-tröskel 0,7: 46 utflykter, låtbytena ändå inte basens.
- k2:s ±0,5 %-sökning när regenten är svag, utan spärr: 53 utflykter.
- Kronan 3 %: låt 15 stod stilla först efter 26,8 s i sonden; 6 % gav 10 av 16 låtar ≤ 3,1 s.

## Risker

- **mix_still har 0,08 s marginal och är ett lotteri på fintempots växling**: låt 14 gick 2,65 → 3,46 s mellan mätningarna, låt 15 10,57 → 2,16. Kontrollmängden kan falla åt båda håll.
- Lotus: kronan kostade en fil i motfas och fasmedianen 0,91 → 0,89. Ägarens ord är att lotus får kosta lite om DMX vinner, men domaren diskar på +1 fil.
- Kronan gör fintempot trögare vid verklig tempodrift; rutnätets fel (gridfel, ettan) är omätt – tvavagar ej körd.
- Okänt-tröskeln 0,5 är k2b:s, som föll på kontrollmängden.
- Ej kört: kontrollmängden, tvavagar, lotus taktväg live.

Diff: `k4b.diff` (bara `src/analyserClock.ts`, +80/−10).
