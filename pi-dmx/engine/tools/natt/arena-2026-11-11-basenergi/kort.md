# Strategikort – arenan basenergi (2026-11-11). Fyra MEKANISMER, inte fyra rattvärden.

## a1 – FÖLJANDE FÖNSTER (dagens mätning, flyttad och renad)
Räkna dagens DMX-mätning i analysatorn per hop: sub+kick i dB mot en topp som följer direkt upp och långsamt ner och en dal som följer
direkt ner och snabbt upp. Analysatorn känner inte till droplyftet. Det som i dag sker efter en drop (toppen går 10 gånger snabbare i
8 s) löser du på effektsidan ur fältet – t.ex. att dropläget normerar om fältet mot sitt eget korta minne, eller att analysatorn
publicerar samma mätning i två tidsskalor (lång och kort referens) och dropläget väljer. Målet: samma ljus som i dag eller bättre, med
snittet på rätt ställe.

## a2 – PERCENTILER I STÄLLET FÖR TOPP OCH DAL
Mät basenergin mot ett glidande histogram av basens dB (t.ex. en låg och en hög percentil över N sekunder) i stället för topp-/dal-
följare. En enskild smäll (dropen, en fill) flyttar då inte skalan – toppföljarens svaghet är just att ETT hop sätter taket i 10 s.
Pröva om efter-drop-problemet försvinner av sig självt, så att effektsidans dropläge blir enklare eller onödigt för nivån.

## a3 – SLAGET SOM TIDSENHET (klockan)
Använd analysatorns klocka: normera basenergin mot de senaste N SLAGENS toppar och dalar (t.ex. median av slagtopparna) i stället för
mot sekunder. Skalan följer tempot, hinner ikapp på några slag efter en drop eller ett sektionsbyte, och "stora slag stora, små slag
små" blir mätt per slag. Fältet måste fungera när klockan saknas (ingen takt, tystnad, intro) – ha en tidsbaserad reserv.

## a4 – LÅTENS EGEN REFERENS (sektionsminnet)
Dagens 10 s-fönster normerar bort skillnaden mellan vers och refräng: efter 10 s i versen fyller versens bas hela skalan. Mät i stället
basenergin mot LÅTENS egen referens – refrängens/de starka partiernas basnivå, så som `levelVsHighDb` gör för hela nivån – med en snabb
envelope ovanpå för slaget. Då är en drop per definition vid eller över referensen och versen ligger lägre i fältet; hur mycket versen
ska dämpas i ljuset är effektsidans val. Fältet måste fungera innan låten har en refräng (reserv mot ett kortare fönster).
