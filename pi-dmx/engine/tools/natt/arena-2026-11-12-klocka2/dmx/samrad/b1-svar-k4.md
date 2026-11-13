# b1-svar k4

## Kontroll av de andras huvudsiffra mot MOTORNS egna tal
Nytt instrumenterat bygge `k4-ra/` (bas + loggning av motorns egen `tgScore` på 3,5 s UTAN minne; klockan bit-identisk med bas, 0 prov skiljer). 13 riktiga tempobyten på övningsmixen:

| | rätt nytt tempo från (median) | rätt inne i låtarna |
|---|---|---|
| motorns `tempoBpm` | 2,7 s | 99,7 % |
| motorns RÅA topp 3,5 s, håller 2 s | **1,9 s** | 94,2 % |
| samma, håller 0,8 s | 1,8 s | |
| jokerns / k2:s efterbildning i Python | 1,0 s | 93,6–94,6 % |

- **Riktningen stämmer, storleken inte.** Den råa toppen är före minnet, men med 0,8 s i motorn – inte 1,75 s. "Rätt inne i låtarna" stämmer (94,2 mot 93,6–94,6), så skillnaden ligger i skarvarna: per byte i motorn 6,6 · 0,2 · 2,4 · 1,9 · 7,8 · 0,5 · 2,6 · 2,0 · 0,2 · 2,7 · 1,8 · 1,2 · 1,2.
- Min bild "fönstret 3,5 s och minnet begränsar" var halvt rätt: minnet står för ~0,8 s, resten (1,9 s) är fönstret/ljudet.

## (J2) rå vikning öppnar valet när regentens råa poäng fallit – FALLER på motorns tal
Jokerns egen nästa sond, körd i `k4-ra/`: rå topp på annat tempo än regenten i n prov OCH regentens rå/minne ≤ x.
| villkor | lås median / medel (bas 2,75 / 2,72) | falska byten inne i låtarna |
|---|---|---|
| ingen kvot, 0,4 s | 1,90 / 1,63 | 3,89/min |
| rå/minne ≤ 0,8, 0,4 s | 2,20 / 1,99 | 1,00/min |
| rå/minne ≤ 0,8, 0,8 s | 2,55 / 2,61 | 0,14/min |
| rå/minne ≤ 0,6, 0,8 s | 2,75 / 2,72 | 0,00/min |
Kvoten skiljer inte ny takt från fill: vid samma falsktal som i dag är vinsten 0–0,2 s. Samma dom som min kort öra-sond och k2:s beslutstabell. Jag röstar inte på J2.

## (J1) självlikheten som andra vittne – håller med, och den är den enda som siktar rätt
- Det är min osonderade idé a), nu med siffror: 97,7 → 99,5 % mot syskonen; i de osäkra fönstren 36 % mot 86–89 %; lang1011 50 av 50.
- Den mäter något annat än vikningen (mönstrets upprepning, inte energin på slaget) och rör inte omlåsningen.
- Invändning 1: sonden är mot fyra syskon, inte mot hela rutnätet, och övningen har 51 fel-fönster. Vinsten kan bara visas på kontrollen.
- Invändning 2: ~10 s serie ryms inte i ringen (`ONSET_RING` 1024 värden = 5,5 s). En längre ring (4096 = 21,8 s, +48 kB) får inte ändra något annat – granska att övriga fönster är tidsstyrda.

## (K2-1) diskanten ensam när basen saknar puls – möjlig, men litet på medianen och overifierad i motorn
- Låt 2 och 4 (4,2 → 0,6 och 2,6 → 0,6 s) är Python-efterbildningen, som låg 0,9 s för tidigt i medianen mot motorn. I motorn är låt 2:s råa topp rätt-och-stadig först vid 6,6 s.
- Även om båda lagas flyttas mix_las-medianen högst 2,75 → ~2,55 (de två låtarna ligger på 3,0 och 3,3 i dag).
- Villkorssonden är inte körd. Den ska köras med motorns `tgScore` (bas- och diskantdelen var för sig), inte efterbildningen.

## Röst: J1 (bygg nu) + K2-1 (bara om villkorssonden i motorn bär)

**Variant 1 = J1, bas `engine/src`** (inte k2c/k4b – då går vinsten att tillskriva):
- `ONSET_RING` 1024 → 4096.
- Ny `selfSim(bpm, now)`: korrelationen mellan ansatsserien och sig själv 2 och 4 slag bakåt över ~10 s, bas (`onV`) och diskant (`hiV`) var för sig. Inga nya objekt per hop.
- `tgStep`, efter att varvets tempo `t` valts och före `peakVote`: bara när tempogrammets marginal är liten (`tgClear` under en gräns) OCH näst bästa toppen är ett syskon (4:3, 3:4, 3:2, 2:3) jämförs `selfSim` för de två; syskonet tas bara om dess självlikhet är klart högre i flera varv. Tiger när båda är låga eller lika (fyra-i-golvet).
- Rör inte snabba minnets byte, `onsetStep` eller `relock`.

**Variant 2 = K2-1, bas `engine/src`, villkorad:** `tgScore` ger basens och diskantens del var för sig; produkten som i dag, utom när basens bästa del över alla hypoteser i varvet ligger under sitt eget golv – då diskanten ensam. Byggs BARA om k2:s sond i motorn ger låt 2 och 4 < 1,5 s utan att "rätt inne i låtarna" går under 94,2 %.

## Utgången i förväg
**J1 bar** om övningen: inga spärrar brutna, mix_las och nya mix_still inom 0,05 s från bas, mix_klocka och klipp_klocka ≥ bas, syskon_tid lägre än bas – OCH kontrollens dom: mix_klocka eller klipp_klocka minst 1,0 procentenhet över bas (83,41 / 85,78) och över k4b (84,53 / 86,45).
**J1 föll** om någon spärr bryts på övningen, om vittnet byter tolkning inne i en rätt låt (mix_hopp eller utfl_min över bas), eller om kontrollen ger < 1,0 pe. Då ingen andra variant av vittnet.
**K2-1 bar** om mix_las ≤ 2,60 med klipp_klocka ≥ bas och utfl_min ≤ bas; annars föll.

## Det jag inte vet
- Om självlikheten håller mot HELA rutnätet (inte bara syskonen) i motorn. Jokerns nästa sond (logga vittnets dom per varv bredvid `peakVote`) bör köras före mätningen.
- Hur många av kontrollens fel-fönster som är syskonfel med liten marginal; är felet stadigt med stor marginal får vittnet aldrig ordet.
