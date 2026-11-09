# d1f: dirigentens låtbeslut när mätningen har satt sig (riktad deltagare d1, från mta)

**RESULTAT.** Ljusdomaren ger +8,2 utan spärrar, mot mta +7,1 som var DISK på pop −11,6 %. Alla tre övningsfilerna ligger på ≥ 94 % av bas.

Analysen är orörd: alla 17 långsamma mått, latensen 80 ms och p99 är identiska med mta. Poängen blir därför **+5,29, och DISK kvarstår av ett enda skäl: ned_s 3,00 mot bas 2,25.**

ned_s räknas i analysatorns sektionsetiketter (sektionLag). effects.ts kan inte påverka den, och analysatorn fick jag inte röra. ned_s-spärren ärvs från mta, alltså från kombinationen t1f + a2f: f0 ger 2,15, a2f 1,65, mta 3,00.

## DELAR mot mta (`mot-mta.diff`, bara effects.ts, 54 rader)
| del | mekanism | fil:rad (d1f/src/effects.ts) |
|---|---|---|
| **D1** beslutet väntar på satt tillit | `manusTog` avgörs inte längre vid låtens första lookbyte. Två regler styr när: (1) aldrig på en build-sektion, eftersom `allaBuild` gör takt/bas falska och mta därför låste ett nej för pop låt 1 redan vid 3 s; (2) bara när hård basgång gäller ELLER klockan är låst med tillit ≥ 0,85. Beslutet prövas vid VARJE sektionsbyte, även återseenden. Regeln är m1f:s (`bassClear` när takten satt sig). Skiljer beslutet från det preliminära glöms låtens manus-looker, och sektionerna väljer om. | :888–900, :989 |
| **D2** preliminärt svar = låst takt | Så länge låten är oavgjord väljs lookerna som om låst takt räcker. Det motsvarar f0, där tilliten mättade. Ett NEJ kräver alltså satt tillit och otydlig basgång. Ett nej fattas inte på brus. | :659, :664, :990–992 |
| **D3** toggle-valet kräver ett val | Toggle-grenen tas bara om den har ≥ 2 kandidater. En ensam kandidat tvingades förut fram (lang1021 low: "1 toggles" -> twin). Nu väljer den vanliga poängsättningen, där toggle-lookerna ändå får CLEAR_BASS_BOOST när basgången är tydlig. | :994 |

D2 förutsätter D1. D3 är fristående och kan mätas ensam.

## SIFFRORNA (--mat, 3 av 3; tvavagar.json/bank.json = M3 = koden)
| | ljusdomaren | lampspr lang1021 / pop / megamix (andel av bas) |
|---|---|---|
| mta | +7,1 DISK | 0,3155 (104 %) / 0,2925 (88 %) / 0,373 (115 %) |
| M1 = D1 (preliminärt nej) | +6,2 DISK | 0,2923 (96 %) / 0,2673 (**81 %**) / 0,384 (118 %) |
| M2 = D1+D2 | +7,6 DISK | 0,2847 (**93,9 %**) / 0,3378 (102 %) / 0,384 (118 %) |
| **M3 = D1+D2+D3** | **+8,2 OK** | **0,3078 (102 %) / 0,3378 (102 %) / 0,384 (118 %)** |

lampspr / rAbest / ljus per fil i M3 (bas inom parentes):

| fil | lampspr | rAbest | ljus |
|---|---|---|---|
| lang1021 | 0,308 (0,303) | 0,338 (0,227) | 0,388 (0,311) |
| pop | 0,338 (0,331) | 0,389 (0,412) | 0,331 (0,345) |
| megamix | 0,384 (0,324) | 0,430 (0,334) | 0,367 (0,295) |

Pops rAbest går ned mot mta (0,492 -> 0,389), men takten totalt är fortfarande över bas.

Tempo, sektion, drop, låtgräns, latens 10/50/t90 20 = 80 ms och p99 5–6 hop är identiska med mta i alla tre mätningarna. upp_s 1,35 ligger inom spärren, ned_s 3,00 inte (se ovan).

Workern påverkas inte. D1 körs bara i switchLook (kall väg, vid lookbyte), skapar inga nya objekt och lägger till två skalära fält.

**Robusthet utanför övningen** (rytm.py --live-kick, 300 s): lang-20261028T181533 ger lampspr mta 0,291 och d1f 0,291 (rAbest 0,394/0,395). Inspelningen är oförändrad: ingen låt där fattar sitt beslut på brus. Mot a2f:s bas 0,275 blir det 106 %; bas kördes inte om här, eftersom budgeten var slut.

## MÄTFÄLLA (viktigast för orkestratorn): lampspr är kaotisk även mot ohörbara ändringar
- **Samma d1f-kod (M1) på pop:**
  - konsertReplay på 300 s klippt som rå int16 gav lampspr **0,405**.
  - Samma klipp klippt som rytm.py gör (x/32768·32767, alltså −0,003 %, under 1 LSB) gav **0,267**, vilket också är bänkens värde.
- **Mekanismen:** 1 LSB förskjuter analysatorns sektionsgränser och basgången. Exempel: break 188 s mot 223 s, basgång 0,31 mot 0,11 vid 144 s, kickhändelser 960 mot 971. Lookföljden i låt 2 blir då en annan (droppar/kaskad mot drumkit/sokljus).
- **Följden:** en enskild 300 s-fils lampspr är ett stickprov ur en bred fördelning. Spärren på 94 % per fil kan vändas av vilken effekts- eller analysändring som helst, utan att showen blir sämre.
- **Förslag:** döm lampspr på medel av 2–3 ohörbart störda kopior, till exempel gain ×(1 ± 1e-4), eller över fler filer.
- **Konsekvens för mitt resultat:** M3:s OK är ett sådant stickprov. Mekanismen D1+D2 är robust i sig: nej fattas inte på brus, och pop låt 1 är inte längre låst nej vid 3 s. Men att lampspr blir OK just här kan lika gärna vara lottning som D3. D3 riktades efter att ha sett lang1021:s lookföljd.

## KRAV EN KÄLLA och ARKITEKTUREN
- Oförändrade mot mta, eftersom bara effects.ts ändras.
- D1 läser samma tillit (`this.beatTrust`, ur klockans bpmConfidence) och samma `bassClear`/`profile.bassline`. Det finns ingen ny källa och ingen kopia, och 0,85 är samma tröskel som `takt` har. **krav 5.**
- Rader efter effects.ts:887 ligger +13 längre ned mot mta, och efter :989 +14. Det gäller till exempel trust 1782 -> 1795.
- Inga env-variabler, inga flaggor, inga nya filer. Fade-, strobe- och vitt-vägarna är inte rörda.

## BUDGET
- 3 av 3 --mat: mat1/2/3.log, tvavagar-mat1/2/3.json, bank-mat1/2/3.json.
- 8 av 8 egna körningar:
  - konsertReplay pop: mta hel, M1 rå, M1 rå igen, M1 rytm-skalad.
  - konsertReplay lang1021: M2, mta.
  - rytm lang1815: mta, d1f.
- Ingen kontrollmängd användes, och jag läste inga holdout-filer.

## RISKEN
- D1+D2 gör låtar med låst takt till toggle-låtar fram till ett satt nej. Låtar som aldrig får satt tillit (pop låt 2 i bänken) blir därmed toggle-låtar som i f0.
- Ett sent ja eller nej byter looker mitt i låten. Det sker vid ett sektionsbyte, aldrig mitt i en sektion, och bara en gång per låt.
- D3 ändrar alla val där toggle-poolen har en enda kandidat, också utanför låtbeslutet.
- Se också mätfällan: lampspr på kontrollmängden kan gå åt vilket håll som helst.

KLAR d1f poäng 5.29 DISK krav 5
