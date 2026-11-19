# Strategikort, arenan takt13 (olika MEKANISMER, aldrig olika värden på samma ratt)

a1 HALVTAKTEN I KLOCKAN: Klockan behöver bara veta paret (1/3 mot 2/4), inte 1 mot 3. Ta bort det som i dag väljer mellan 1 och 3 ur
   kedjan (omval, väntan, barOff-hopp som bara byter 1<->3) så att det inte längre kan störa fas och tempo, och använd det som frigörs
   (räkning, tillit, hysteres) till att hålla fasen på slaget.

a2 PARET UR TRUMMORNA: I dansmusik ligger kicken på 1 och 3 och virveln/clappen på 2 och 4. Avgör paret ur kontrasten mellan låga och
   mellanhöga anslag i halvtakten (två tillstånd, inte fyra), robust även i långsam musik, och låt det beslutet ensamt sätta barOff.

a3 DE FÄLLDA IDÉERNA: Arenan takt (tools/natt/arena-2026-11-18-takt*) diskade flera varianter bara för att ettan flyttade från 1 till 3.
   Läs deras losning.md och diff, välj den mekanism som bar mest takt och som inte redan finns i a6, och bygg den ovanpå dagens bas.

a4 OMLÅSNING PÅ NÄRMASTE SLAG: Efter låtbyte, break eller motslag får klockan låsa om på det närmaste hela slaget i stället för att
   bevara taktpositionen; paret rättas efteråt av taktmodellen (ett steg om två slag är fritt). Målet: kortare tid i fel fas efter gränser.

a5 FEL TEMPO: Den största felklassen på okänd musik är fel tempo (> 4 % från 1x/2x/0,5x). Gör temposkattningen metriskt konsekvent:
   en kandidat ska förklara både slagperioden och halvtaktsperioden (2 slag) i anslagen; kandidater som inte gör det väljs bort.

a6 VITERBI ÖVER TEMPO x FAS x PAR: Kör en gemensam dold Markov-modell i workern över tempo, fas och PAR (två tillstånd i stället för fyra
   taktpositioner), på ett rullande fönster, och styr klockans fas/tempo mot dess bästa väg. Färre tillstånd = stadigare beslut.

a7 LÅTENS TEMPO: Inom en låt är tempot konstant. Håll ett tempohistogram sedan senaste låtgräns, dra klockan mot dess topp och släpp det
   först när låtgränsen (analysatorns egen) säger ny låt. Målet: färre fönster med fel tempo och glidning mitt i låtar.

a8 MÖNSTER VIKTA MODULO TVÅ: Varje ställe där analysatorn bygger en mall eller statistik över fyra slag (taktmall, accentmönster, faslägen)
   kan vikas till två slag (1 = 3, 2 = 4): dubbelt så mycket data per mönster, snabbare och stadigare skattning. Fäll ihop dem och låt
   fasen/tilliten använda de stadigare mallarna.

JOKER (efter runda 1, mapp r0): läser alla deltagares mappar, även diskade, och bygger ihop de delar som vann sina mått OCH höll på
flera filer. Behåller basens del där ingen är bättre. Högst 4 mätningar.
