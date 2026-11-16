# Strategikort, arenan fras (olika MEKANISMER, inte olika värden på samma ratt)

a1 VÄNTA IN FRASEN: dirigenten håller ett beslutat sektionsbyte till nästa frasstart räknad från analysatorns (nu rätta) etta
   (takt-etta med 4/8/16-slagsgrid), med ett tak så att bytet aldrig kommer mer än en fras sent. Mät först hur sent beslutet kommer.

a2 SNABBARE DETEKTOR: sektionsdetektorn i analyserSection.ts ska besluta på kortare bevis (kortare fönster, tidigare tröskel, snabbare
   jämförelse före/efter) så att bytet kommer inom en takt efter gränsen. Kostnaden (fler falska byten) betalas med en egen kontroll.

a3 DATERA BAKÅT: detektorn får vara sen, men den ska tala om VAR gränsen låg (på vilken takt-etta förändringen började). Dirigenten
   byter på första etta efter beslutet och räknar frasläget från den daterade gränsen, så att kommande byten hamnar på frasgridet därifrån.

a4 FRASENS FÖRVÄNTAN: musiken byter del var 8, 16 eller 32 takter. Räkna takter sedan förra gränsen och gör detektorn lättare att
   trigga precis vid förväntad frasgräns och svårare mellan dem (en prior på frasperioden, inte en klocka som byter av sig själv).

a5 TAKT-FÖR-TAKT-NYHET: ett snabbt vittne mätt exakt på ettan - hur mycket skiljer sig den här taktens spektrum/energi/basgång från
   de föregående takterna (taktsynkron novelty). En tydlig topp på en etta = ny del, byt direkt där.

a6 DIRIGENTENS SPÄRRAR: rör bara effects.ts. Kartlägg varje grind mellan analysatorns sektionsbyte och själva lookbytet (min-tider,
   ready, slaggrind, buildLock/I LUCKAN, secEntry, manus) och hur många slag var och en kostar; ta bort eller ersätt dem som bara fördröjer.

a7 UPPBYGGNAD OCH DROP SOM FRASMARKÖRER: de mest förutsägbara gränserna är uppbyggnadens början och dropens landning. Använd
   analysatorns uppbyggnadssignal, riser och dropflank för att lägga bytet på just de ettorna; låt vanliga vers/refräng-byten vara som i dag.

a8 VAD ÄGAREN HÖR: analysera (fritt, med övningens facit) vilka analysatorfält som ändras FÖRST vid ägarens gränser och hur tidigt.
   Bygg bytet på det tidigaste robusta särdraget. Välj särdrag ur facit, men skatta inga trösklar eller mallar per fil ur det.
