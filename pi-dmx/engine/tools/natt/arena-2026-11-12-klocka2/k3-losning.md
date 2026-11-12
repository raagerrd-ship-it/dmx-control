# k3 – SLAGENS PASSFORM

## Idén
Ett tolkningsbyte måste bäras av basanslagen: varje varv mäts regentens och tempogrammets förslags PASSFORM = P × C (P = andelen av anslagens vikt på slaget ±32 ms, C = andelen av rutnätets slag som bär ett anslag; rätt tempo 1 × 1, 4:3-fantomen 1/3 × 1/4), och bytet sker bara om förslaget bär slagen bättre, eller om regenten slutat bära sina egna (ny låt).
Det är musikanalys, inte utjämning: inget tempo filtreras eller fördröjs i tid; domen säger ja/nej på mätt bevis ur samma 5 s-fönster, och utan anslag gäller tempogrammets val som förr.

Bara `analyserClock.ts` (+79/−4): `pfExtract`, `pfFit`, `pfAt`, `pfJudge`, anropad på de två ställen där `tgStep` sätter `tempoBpm`. Inga allokeringar per hop (två Float32Array(128) i konstruktorn), ca 5 vikningar av ≤ 128 anslag per varv.

## Siffrorna (mätning 3 = slutkoden, identisk med mätning 1)
| mått | bas | k3 | % |
|---|---|---|---|
| mix_klocka | 97,88 | 97,75 | −0,1 |
| mix_las | 2,78 | 2,78 | 0 |
| mix_hopp | 0,00 | 0,05 | −26 |
| mix_still | 2,93 | 3,86 | −31,5 |
| klipp_klocka | 98,32 | 98,28 | 0 |
| utfl_min | 0,82 | 0,74 | +9,8 |
| utfl_tid | 2,11 | 1,63 | +22,7 |
| syskon_tid | 2,67 | 2,21 | +17,2 |
| lotus_ratt | 116 | 121 | +4,3 |
| lotus_syskon | 5 | 3 | +40 |
| lotus_vaxling | 17 | 14 | +17,6 |
| kallaren | 2,98 | 1,91 | +35,7 |

**Poäng +7,48 – DISK**: lotus fas-median 0,89 < 0,91, i fas 67/114 < 70/114 − 1 pe, mix_still 3,86 > 3,23.
Rättade lotusfiler: Klaas Cambodia (97,7 → 129,8), Bob Marley Jamming och Sun Is Shining, Black Sabbath, Sarah Yellin'. Sämre: Status Del Två (4/3 → annat), Behind Those Eyes (annat → 3/2).
Sämre: mix_hopp (2 byten), mix_still, lotusfasen (Hellbenders 0,86 → 0,64, Status behov 0,94 → 0,77, Vigiland 0,90 → 0,78 – tempot rätt i alla tre).

## Vad som inte gick
- **Kortets kärna, välja syskon aktivt på passformen**: på 9 låtar ur övningsmixen föll klockan 98,8 → 96,6 % (Rivstart 145: 99,5 → 89,1 %). Basmönstret 3-3-2 bär 3/4-tempot BÄTTRE än slaget (passform 0,47–0,56 mot 0,16–0,19). Passformen duger som veto, inte som väljare.
- **Minne över takter + två varvs bekräftelse**: lås efter låtbyte median 2,8 → 5,0 s (sedan 3,3). Löst med regentens passform på fönstrets senare halva: lås = bas.
- **Mätning 2, hållet tempo följer tempogrammets lokala topp** (mot mix_still/fasen): hjälpte inte (still 3,86, fas 0,89), lotus 119, källaren 2,13. Borttaget.
- På källarens mic-ljud är passformen nästan oinformativ (0,2–0,3 för alla tempon); vinsten där är i praktiken tröghet.

## Risken
- mix_still är en knivsegg: låt 14 i mixen har samma `tempoBpm`-förlopp som bas, men rutnätets ±3 %-vandring hamnar annorlunda (2,2 → 12,3 s). Varje störning tidigare i mixen kastar om den; jag har inte kunnat styra det.
- Lotusfasens fall är oförklarat (tempot är rätt i de tappade filerna) – ej mätbart med fria sonder.
- Ny låt UTAN låtgräns i syskonförhållande där gamla tempot råkar bära nya basen: regenten kan sitta kvar. Bänken har låtgräns i 11 av 15 skarvar.
- Svaga starter/break: < 6 anslag = ingen dom, alltså som bas (ingen vinst där).
- Trösklarna (PF_KC 1,1, PF_DEAD 0,6, PF_REL 0,3) är satta på 4 källarklipp + 9 låtar; kontrollmängden osedd.
