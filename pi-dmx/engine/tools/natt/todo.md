# Natt-agentens uppdrag

## NATTEN 2026-10-12 (nattagenten, inget deployat)
KLART 2026-10-12: baslinje natt/2026-10-12.json (pop 125/0,50 r 0,42; mega 175/0,50 r 0,07; korpus 150/0,48; 22 aldrig valda).
KLART 2026-10-12: refrängen ljusare än builden -> opt-in DMX_EKO_HIGH=0 (56c6527): eko-förstavalet vid basgång gäller inte i high.
  Ljus high 0,28->0,36 / 0,38->0,42 (ladan 21:17/21:34), pop 0,34->0,45, mega 0,36->0,43; build oförändrad. Redo: ladan.py --env DMX_EKO_HIGH=0.
ÖPPET: minidrop-kontrasten - 4/26 minidrops på kvällens inspelningar har ljus 0,73-0,93 redan före (ingen synlig skillnad);
  förslag blixt på lampans strobe-kanal när DROP_STROBE är kalibrerad. Mega kick->ljus 150<->175 = 25 ms-rastrets kant (ej regression).
  Analysatorfynd: buildUp död (0,000 även i build). Situationsrutnätet (nya effekter) ej påbörjat i natt.

## LADAN 10-11 KVÄLL 21:15-22:15 (allt LIVE, ägarens live-omdömen i parentes)
- V123 live 21:16 (se nedan + analys-2026-10-11.md).
- BODY_GONE_MIN_MS 1000 -> 2000 (analyserProfile): falska drops var 30:e s på pumpande bas ('falsk' x3).
- 'Builden landar i refrängen' BORTTAGEN (falsk 21:42:39) -> LYFT + SPRÅNG = DROP: energilyft och nästan-drop >= 17 dB inom 600 ms
  (DROP_JUMP_DB). Bänk: 0,27/min, 91 % på baslyft. 14 dB provat och backat (ägaren: 'vill inte ha fler riktiga drops').
- Minidrop: energilyft 4 s + 1,5 s uttoning ('perfekt'), looken 600 ms (var 350; 'såg inte att det ens blev minidrop' - energin
  stod redan på max i starka partier -> minidropen syns bara som kulören. NÄSTA: kontrast, t.ex. kort svärta före eller vitare kärna).
- Huvuddropen: max 700 ms (var 1300), energilyft efter 4 s (var 2) - 'energin ska fortsätta efter'.
- Lampordningen växlar framåt/bakåt/utifrån-in/inifrån-ut per look och var 32:a slag (ctx.idx; c.group orörd).
- Uppbyggnaden laddar: motorns buildProg (32 slag från builden start) ersätter analysatorns DÖDA buildUp i build-effekterna
  + energigolvet stiger med förloppet under build-looker ('kändes inte som den laddade'). Bänken visar liten ökning i medelljus -
  mät hellre antal tända lampor/takt mot slutet. Efter: 'träff', 'perfekt', 'nja inte 100'.
- NÄSTA LADAN-BESÖK (ägaren 22:2x): kalibrera ingångsnivån - riktvärde för Flow 8 MON-reglaget till Pi:n (EQ rak, fast nivå;
  10-11 kväll låg ingången ~10 dB under eftermiddagen, fönster -35..-24 dB, ljuset mörkare). Geminis lågpass < 120 Hz AVRÅTT
  (takt, riser, virvel, sektioner, låtgränser behöver hela spektrumet).
- ÖPPET: 'sen' drops (analysatorn väntar tills kroppen är inom 3 dB från toppen, edgeAgo ~200 ms; QUALITY 6,5 gav bara fler
  drops); falska låtgränser mitt i låtar (sektion -> intro, 'ny låt: glömmer looker') ger lookbyte vid refrängen;
  'energi dog efter' 21:31 = sektionen high -> break 7 s efter dropen.
- Inspelningar med ägarens rapporter: lang-20261011T191741 (21:17-21:27), 193430 (21:34-21:40) i tools/ladan-2026-10-11/.
  Rapporttiderna finns i chattloggen (ej marks.jsonl): 21:18:42 falsk (dropfire 21:18:38), 21:20:56 miss, 21:28:36 miss
  (lyft + 27,7 dB), 21:29:11 träff, 21:29:57 sen, 21:31:12 rätt, 21:31:37 falsk, 21:32:26 miss, 21:42:1x miss, 21:42:45 falsk,
  21:49:0x miss, 21:52:5x sen, 22:12:18 'nja' (lyft + 14,6 dB).

## ANALYSEN AV KONSERTLÄGET 10-11 KVÄLL (läs först: tools/natt/konsert/analys-2026-10-11.md)
Showen reagerar 9,3 ggr/min men bara 15 % på riktiga baslyft (nästan-dropen = slump, analysatorns minidrops 17/min); build-looker
32 % av tiden mot sektion build 12 %; refrängen inte ljusare än builden. Provad ersättning V123 (ingen look/blixt från minidrops/
nästan-drop, build bara på sektion build, ny lyftdetektor 0,6 s ≥ 10 dB) -> 2,7 reaktioner/min, 42 % på lyft, build-look 15 %.
GODKÄNT AV ÄGAREN 10-11 kväll ("jag vill testa 123") och INFÖRT i src/effects.ts (bänken identisk med provet: 2,7/min, 42 % på lyft,
build-look 15 %). Nästa: refrängen ljusare än builden (ljus high 0,32 mot build 0,34), sedan drops mot ägarens Drop!-markeringar.

## FACIT FRÅN ÄGAREN: MINIDROP-/DROP-MARKERINGAR (10-11 kväll, går först när det finns markeringar)
Knapparna "Minidrop!"/"Drop!" i /setup (0dc7885): ägaren trycker när hen HÖR en minidrop/drop. Tiderna finns i långinspelningarnas
.events.json ("marks": [{wallMs, kind}]) och i snippets/marks.jsonl. Inspelningarna hämtas till tools/ladan-2026-10-11/ (och senare datum).
GÖR: per markering, vad gjorde detektorerna +-2 s (analysatorns drop/minidrop, DMX-sidans nästan-drop, energilyft, sektionslyft,
'builden landar', minidrop-looken miniColEnv) - träff/för sen/miss, och vilka fyrningar som saknar markering (falska). Ställ in
trösklarna (LIFT_DB, PRE_DROP_*, NEAR_*, BUILD_DROP_*, MINI_GAP_MS, analysatorprofilens drop-krav) mot markeringarna med bänken
(tools/window.mjs-mönstret i scratch: replay av wav med 100 ms-utskrift). Ägarens definition: minidrop = "från lugnt till ett tydligt
energilyft (även om det är lägre) med basslag"; riktiga drops: inga timrar, snävt mål. Allt nytt opt-in, redo för ladan.
Live 10-11 kväll (efter 1cff9df..0dc7885): drops utan timrar (BODY_GONE 1000, RISE 20, QUALITY 3), sektionslyft, energilyft, build
landar i refrängen = drop, energilyft avslutar build, minidrop-look 350 ms + lyft 1 s, basslagen i energilagret KICK_E 0,8,
konsertgolv 0,4, dropen bär in i refrängen (4 s), eko förstaval vid basgång, enhetliga effekter med energi på utvalda lampor,
tide/aurora/andrum bara < 90 BPM, fem nya effekter (fyllning, pingpong, virvel, fyr, rullandning).

## STORA PROJEKTET: SITUATIONSRUTNÄTET, ÖVER 100 EFFEKTER (ägaren i ladan 2026-10-11, går före gallring/rattar)
Ägaren: "den skall ju kunna välja - lugn låt och intro och få några val. Fartfylld låt, refräng, tydlig basgång, och få några val
osv. så kanske över 100 effekter". Dirigenten känner igen LÄGET och har 4-6 effekter byggda för just det läget.
AXLAR (finns redan som taggar/signaler): (1) låtens fart = tier lugn/fart/full (EffectDef.tier, tierEma), (2) del av låten =
section intro/low(vers)/build/high(refräng)/break (EffectDef.section, frame.section), (3) vad musiken gör = tydlig basgång
(bassline >= 0,6, EffectDef.toggle-poolen, eko förstaval), tydlig kick/låst takt (beatTrust >= 0,85), ingen takt (hasBeat falskt).
LÄGET 10-11 (50 effekter, "rumsl" = lamporna lyser olika; tools/effectDyn.mjs spridning >= 0,3):
  tier/sektion | intro       | low(vers)    | build       | high(refräng) | break
  lugn         | 11 (8 rumsl)| 6 (5)        | 0           | 0             | 7 (4)
  fart         | 0           | 14 (11)      | 11 (7)      | 8 (7)         | 1 (0)
  full         | 0           | 2 (2)        | 0           | 15 (12)       | 0
KLART 2026-10-12 (dagsession, ej deployat): 8 nya - svall (lugn x high), gryning (lugn x build), ankomst (fart x intro), glimt
  (fart x break), rulle (full x build), kickregn (full x intro), efterskalv (full x break), motor (full x low). effectDyn spridning
  1,00 alla. Replay 22 ladan-filer: valda 5,8 % av tiden (ankomst 2,2, gryning 0,9, motor 0,9, rulle 0,8, kickregn 0,6, svall 0,4);
  glimt/efterskalv 0 - ladans 'break' har nästan alltid basgång (eko/toggle-poolen tar dem). BUILD_LOOKS + gryning, rulle.
  c.lamp = fysisk lampa (ring-effekterna), c.idx = växlande ordning.
KLART 2026-10-12 (dagsession): BASGÅNGSGRÄNSEN - bassline är hög i ALLA sektioner (median 0,62-0,77, break 0,69) -> eko-förstavalet
  (>= 0,6) tog 30 %. Ny standard: eko förstaval bara >= 0,85 och aldrig i refrängen (nattagentens EKO_HIGH=0 nu standard, brytaren
  borta). De 14 nya effekterna fick FIT/SPATIAL i fit.ts (saknades -> neutral passform, valdes nästan aldrig). Replay 22 filer:
  eko 30 -> 10 %, variation (2^entropi) 21 -> 34, nya 6 -> 16 %, break-effekter valda. Toggle-gränserna (CLEAR_BASS 0,78/0,85)
  spelade nästan ingen roll.
KLART 2026-10-12: REFRÄNGEN STARKAST OCH TYDLIGAST TAKT (ägaren: takten ska kännas mest i refrängen, lamporna ska lysa olika).
  MÅTTET = LJUSASTE LAMPAN + slagdjup (topp/dal i 0,6 s-fönster), INTE medel över riggen (det belönar att tända fler lampor).
  Tak per sektion på ljusaste lampan (vers/intro/break 0,65, build 0,65 -> 0,85 med förloppet, refräng/drop 1), taktdipp 60 % i
  refrängen (50 annars), energigolv 0,8 i refrängen, build laddar halvt, siren 0,25+0,45p. Replay: topp refräng 0,76 / build 0,66 /
  vers 0,62 (före ~0,78 överallt), slagdjup refräng 68 %, tända lampor oförändrade. Förkastat: grundton på mörka lampor, kickblixt på alla.
KLART 2026-10-12 (dagsession): alla rutor >= 2 (ägaren: "gärna att alla har minst 2 st") - flod (lugn x build), famn (lugn x high),
  spaning (fart x intro), startskott (full x intro), siren (full x build), skuggor (full x break). 64 effekter. Närmaste syskon
  flod-rullandning 0,78. effectSimilarity saknade c.lamp/trebleEnv/airEnv (rättat). Replay: 14 nya = 6,3 % av tiden, 47 olika looker;
  break-rutorna (glimt, efterskalv, skuggor) väljs aldrig - ladans 'break' har basgång (eko 30 %). NÄSTA: rutorna till 4-6.
GÖR, några rutor per natt (5-8 nya effekter), tomma rutor först: lugn x high (lugn låts refräng), lugn x build, fart x intro,
fart x break, full x build, full x intro, full x break, full x low. Sedan varje ruta upp till 4-6, och inom rutan minst en per
musikdimension (basgång / kick / ingen takt). REGLER för en ny effekt: egen signal ur rutan (inte en dubblett), rumslig (spridning
>= 0,3 i effectDyn, aldrig alla lampor lika - de enhetliga får energi på utvalda lampor), kulör ur paletten via c.hueIdx (kulörsvansen
vid frasbytet ska finnas kvar - ägaren gillar den), ingen vitning (avmättnad <= 0,35), fastLight bara om stegen är kortare än 150 ms,
strobe <= 3 Hz synkront. Bevis per effekt: effectDyn (spridning/rörelse/nivå), effectSimilarity mot syskonen i rutan (< 0,9), att
dirigenten väljer den i rätt läge (showTight/concertBench lookTime på mixar + ladan-2026-10-11-inspelningarna). Effekter på tagg
(section/tier/toggle) räcker för att dirigenten ska hitta dem; kontrollera att poolen inte töms (fallbacks i effects.ts).
Deploya aldrig - "redo för ladan" med listan av nya effekter, ägaren tittar.

## LÄGET 2026-10-11 12:31 - KONSERTLÄGET ÄR ENDA LÄGET (LIVE i ladan, ägaren: "mycket bättre, gör det till enda läget")
Live sedan 12:31 (a3ce847, deployad, ingen env utöver DROP_MIN_GAP_S): CONCERT = true i koden = sektionspalett, frasbyten, lamptrappa v2,
kulör per fras, full öppnar 0,6, aldrig enhetliga effekter (UNIFORM), BUILD före drop (kroppen borta 5 dB/1,5 s; build-sektion direkt),
effekten leder (energins golv 0,6), varje slag (dämpning mellan slagen 0,3 i steg 1), energi per lampa (EffectWants.energy, SPOT-regeln).
STÄMNINGARNA chill/fest/galet BORTTAGNA: vredet/slidern = bara ljustak (master 0,2..1). Bänken = live nu (natt.py kör samma kod).
Mått (enda-laget): lampspr 99/74, kickTraff 0,47/0,39, build före drop 0,50/0,47. Ny baslinje: natt/2026-10-11-enda-laget.json.
UPPBYGGNAD + MINIDROPS LIVE 12:5x (3eeab5a): effekten upptakt (en lampa pendlar, farten dubblas var 4:e takt) tar builden, enhetliga
build-effekter ur poolen; minidrop = högst en per 2 s och alla fyra lamporna samma kulör fullt en kort stund. Ägaren hade sett att
"uppbyggnad och mindre drops" var svagast - mät dem på långinspelningen nedan och föreslå förbättringar.
FÖRSTA LÅNGINSPELNINGEN: tools/ladan-2026-10-11/lang-20261011T103310.wav (10 min, 48 kHz, ladans nivå, ägaren spelade låtar med builds
och drops; .events.json har drop/minidrop/sektion/look per 100 ms MED DEN GAMLA build-logiken före 3eeab5a). Inte i git (gitignore
ladan-*). ANDRA: lang-20261011T105428.wav (10 min, MED nya build/minidrop-logiken 3eeab5a - jämför de två). TREDJE: lang-20261011T112342.wav (10 min, MED build som håller och landar 1feda46 - en drop per build, mät att dropen landar på smällen). Kör showTight/concertBench/dropFacit på dem: breaklängd före riktiga drops (4 s-kravet), build före drop, minidrops.
ÄGAREN GILLADE 10-11 ~13:3x: "när den fadar av på sekundära färgen sen byter, det var riktigt snyggt" - MITT I en effekt (inte efter
blink/drop). Troligen kulörbytet per fras (HUE_PHRASE) + uttoningens svans (gamla kulörkanalen tonar 0,25 s, nya tänds direkt). Den
"kulörsvans" som förr räknades som en brist ska BEHÅLLAS. Ta inte bort den, och tänk på den när effekter görs om.
MINIDROPS 08188fc: energilyft (lugnt -> basslag) + lyft som håller 0,5 s; ägaren: minidrop = "från lugnt till ett tydligt energilyft
(även om det är lägre) med basslag". Mät på långinspelningarna om lyften sitter på rätt ställen.
ÖPPET FRÅN ÄGAREN: "mindre drops [minidrops] ska vi kanske justera så att alla lampor då lyser lika iaf eller något, vet ej exakt än" -
förbered förslag med mått (t.ex. minidrop = alla fyra lamporna lyfts lika en kort stund, i steg 1), bygg som opt-in, ägaren avgör.
GALLRING att föreslå: UNIFORM-effekterna (breathe, snap, mono, pulse, party, airglow, hjarta, tyngdlyft, strobe) väljs aldrig längre i
smart-läget - bara manuellt. Föreslå gallring eller omgörning till spatiala varianter; gallra inte utan ägaren.

## (äldre) LÄGET 2026-10-11 eftermiddag (ersätter äldre "LÄGET"-rader nedan där de krockar)
KÖR LIVE i ladan (deploy 10-10 20:27): TRE STEG, Lägsta nivå 0,2, 4 s break före riktig drop, minidrop byter inte look, toggle-effekter
utan grundnivå + föredras vid låst takt, arecord FIFO 60. COMMITTAT MEN EJ DEPLOYAT (identiskt i bänken, ägaren kör `python tools\ladan.py`):
beatFeed.ts, långinspelningen (/setup "Spela in 5 min"), reglagerensningen (döda flaggor, env-brytare, dwell = fast 45 s, gamma en källa,
släckgräns bara /setup). OPT-IN SOM VÄNTAR PÅ ÄGARENS ÖGA (rör inte deras standard; mät gärna mer):
  DMX_SECTION_PALETTE=1, DMX_PHRASE_SWITCH=1, DMX_LAMP_STAIR=1 (v2: glesa lamppar i vers/intro), DMX_HUE_PHRASE=1  = konsertpaketet
  DMX_TIER_OPEN=0.6 (full ljusare än fart)   DMX_DROP_STROBE=<DMX> (lampans strobe-kanal vid drop, ≤ 3 blixtar/s, kalibreras i ladan)
  Siffror: tools/natt/konsert/*.json, rapport-artifacten (tools/natt/artifact.txt). Bänk: tools/concertBench.mjs, lampCount.mjs, knobSweep.py.
NÄSTA FÖR NATTAGENTEN, i ordning:
  1. Om ägaren spelat in lang-*.wav (snippets, hämtas i ladan): lägg dem i bänken (natt.py-mängd), mät drops med historik (dropFacit.mjs),
     breaklängd före riktiga drops (är 4 s rätt?), och om de "döda" rattarna i tools/natt/rattar.md (SECTION_UNIT_RESERVE_MS, SYNC_ERR_FRAC,
     DROP_CALM_BUILD, DROP_LAND_GAIN, E_RELEASE_MS, MIX_UNSEEN_BONUS, NEAR_FULL_DB) är döda även på riktigt material -> ta bort med json-bevis.
  2. Lugn-effekterna (breathe, mono, airglow) väljs aldrig - mixarna har ~60 s lugnt. Mät på långinspelningar/lugna korpusklipp innan gallring.
  3. Kick->ljus 150 ms (bara uppgången får kortas) - ny baslinje sedan beatFeed (mätfälla 43); budgeten i rapporten.
  4. Konsertshowen vidare om ägaren godkänt paketet: fler SPARSAMMA effekter (egna 1-2-lampsvarianter), kulör per sektion i fler effekter.
AGENTERNA 10-11: nattagentens instruktion omskriven (kortare, dagens ljusväg; gamla i tools/natt/agent-backup/). Analysatorfel skrivs till
tools/natt/analysator-fynd.md - lotus-morgonagenten läser den varje morgon (dess steg 4e) och fyller i Status.
Mätfällor sedan 10-10: 43 = bänkens taktmatning (nu beatFeed som live), 44 = korpusens första 15 s (analysatorns uppvärmning; använd energiR15).

## STANDARD ÄNDRAD 2026-10-10 19:50 (ladan): "Lägsta nivå" energyFloor 0 -> 0,2 (låtbyten och tysta intron var svarta 10-15 s: energifönstret mindes förra låten + brant kurva). Ny baslinje i bänken - kör om natt.py-baslinjen före jämförelser.

## LÄGET 2026-10-10 20:30 (ladan, kvällens fem fixar - båda STANDARD, filerna på Pi:n md5-verifierade, aktiva vid nästa omstart)
1. LÅSNINGARNA LÖSTA (e5012f0): "låser sig ibland" var att ljudet slutade komma 0,5-2 s ~15-22 ggr/h (I2S SYNC error efter varje omstart
   av capturen). Orsak: arecord låg på kärna 3 med vanlig prioritet bredvid dmx-helperns FIFO-50-tråd -> 21 ms-bufferten rann över.
   Fix: audio.ts spawnar `chrt -f -p 60` på arecord. Prov 15 min: 0 avbrott (väntat ~5). Kodekens state är rätt (127 kontroller jämförda).
   RÖR INTE: arecords prioritet/kärna, DMX_ALSA_BUFFER eller audio.ts STALL_MS utan nytt ladanprov. Bänken (PC) påverkas inte.
   Rapportera bara om du ser något i koden som kan svälta arecord igen (t.ex. ny realtidstråd på kärna 3).
2. "Svart vid låtbyte" = energifönstret minns förra låten ~10 s + brant kurva (e 0,4 -> md 0) - inte släckgränsen. Därför energyFloor 0,2
   (193beaf, se nedan). Ägaren: "nu är låtbytena bättre, lyser hela tiden". Om du rör energin: låtbyten och tysta intron får inte bli svarta
   igen - mät mörker de första 10 s efter en låtgräns i bänken (mixarna) före/efter.
3. FÄRRE RIKTIGA DROPS (cd1d932, live 20:07): BODY_GONE_MIN_MS 2000 -> 4000 i DMX-profilen (riktig drop kräver 4 s break). Ägaren:
   "hellre färre drops, mini fångar dom", "minidrop gör inget om de blir fler". Bänk: megamix 27->15, pop 4->2, minidrops 23->25.
   OBS drop-facit (uppgift 1b): bänken fyrade 2/10 på ladan-2026-10-10 före, 0/10 nu - mät klippen med 4000 och skriv hur långt
   breaket före varje riktig drop är (fyrade de live med 2 s-kravet bara för att breaket var 2-4 s?). Sänk inte kravet utan ägaren.
4. MINIDROP BYTER INTE LOOK (93bfae1, live 20:18): minidropen lyfter bara ljuset. Ägaren: "minidrop måste ju inte orsaka look-byten".
   Bänk: byten/min oförändrat (pop 6,2->6,0, megamix 6,8) - MIN_HOLD 8 s styr takten, bytena hamnar nu på nästan-drop/sektion/basgång.
   Ägaren: "låt 8 sekunder ligga" - rör inte MIN_HOLD. Minidrops är redan många (pop 11/min, megamix 58/min vid MINI_RISE_DB 10):
   sänk inte minidrop-kravet. showTight.mjs räknar nu minidrops (tajt.minidrops).
5. PARVISA EFFEKTER SYNS (6b8603d, live 20:27): toggle-effekter (EffectDef.toggle, nu även backbeat) får ingen FX_FLOOR - golvet lyfte
   'av'-gruppen till ~55 %, kontrast (max-min)/max bara 0,03-0,12 (tools/pairBench.mjs). Dirigenten tar varannat look-byte ur toggle-
   poolen när takten är låst och beatTrust >= 0,85 (ägaren: "är bpm låst och tydlig takt så vill jag att dirigenten föredrar dom").
   Bänk: toggle-andel pop 0,25->0,44, megamix 0,35->0,48, lampspr 50->64 / 28->40, ljus p50 0,59->0,50 / 0,70->0,64.
   MÄTFÄLLA 43 (gäller ALLA bänkar - showTight/pairBench/dynBench): bänken sätter cfg.beat.anchorMs = fr.beatAnchorMs varje hop, live
   (index.ts) har en PLL som nudgar ankaret. I bänken hoppar ctx.beatFrac 0,00->0,45 på 27 ms varje slag (halverad effektklocka +
   ankarhopp -> halfTick flippar fel), så grupp A:s topp ritas aldrig. UPPGIFT: gör bänkens taktmatning som live (bryt ut PLL-delen
   ur index.ts och använd den i bänkarna, bevisa identisk), mät sedan pairBench igen och skriv kontrasten per toggle-effekt. Kolla
   också om halfTick-flippen kan ske live (beatTick vs beatFrac-wrap när ankaret nudgas). Ändra aldrig den delade analysatorn.

## Från 2026-10-10 eftermiddag — NYA DROP-KLIPP + LÅNG INSPELNING (efter "FÄRRE REGLAGE")
KLART 2026-10-10 natt (8a3f782): (1) tools/dropFacit.mjs - bänken 0/10 fulla drops men minidrop vid dropen 10/10 (±0,4 s, rise 10-27 dB);
klippen börjar 15 s före dropen så analysatorn ser aldrig kropp->borta->tillbaka (live hade minuters historik) - breaklängden går inte
att mäta ur dem. (2) "Spela in 5 min" i /setup (src/longRecord.ts, /api/longrec; egen modul, recorder.ts är delad med lotus), alltid
tillgänglig, ingen kostnad i vila. NÄSTA: när ägaren spelat in lang-*.wav - kör dropFacit/showTight på dem (drops med historik).
Ägaren i ladan 10-10 ("ja, lägg in båda"). LÄGET: kodens standard deployad 10-10 ~14:10 (TRE STEG, dimmern konstant, minsta på-tid
lampa 150 ms / färgkanal 100 ms med EffectDef.fastLight (strobe), Släcktid 3 s, Lägsta nivå 0 % (energins golv), energin släcker aldrig
en tänd lampa). Live-mätning 10-10: 19 looks/3 min, färg DMX p5/50/95 18/75/215, max 242, DIM 255.
1. DROP-FACIT: tools/ladan-2026-10-10/ = 10 klipp à 30 s (recorder, Aux -18 dB, 0 % klippt, RMS p50 -15..-25 dBFS), kind "drop":
   riggen fyrade en RIKTIG drop vid 15,0 s i varje (prerollSamples 720000; motorns live-flaggor i *.events.json "flags").
   (a) Lägg klippen i bänken (dynSet/natt.py, egen mängd "drop1010") och mät ljusets språng 0-2 s efter 15,0 s mot 1 s före,
       drop-looken (blackout före, dropfärg/vit kärna), nästan-drops - oavsett om bänkens detektor fyrar.
   (b) Bänken (showTight, även med DMX_DROP_SONG_HOLD_S=0) fyrar bara 2/10 drops + 3 minidrops: ta reda på varför - för kort
       historik före dropen (15 s; detektorns baslinjer/uppvärmning), låtstartsregler, eller en verklig skillnad mot live
       (jämför med flags i events.json). Ändra ALDRIG den delade analysatorn för att få bänken att träffa; skriv fyndet.
2. LÅNG INSPELNING I APPEN: knapp i /setup "Spela in 5 min" (eller 2-3 min) som tar ett sammanhängande stycke ljud + motorns
   händelser till /var/lib/audio-dmx-engine/snippets (Recorder.startRaw finns: max 150 s full takt / 420 s 16 kHz - bygg det som
   behövs för 5 min 48 kHz mono ≈ 29 MB, eller dela i flera filer). Bara aktiv när DMX_RECORDER=1 (realtidsprincipen) - eller
   föreslå hur den kan vara på utan att belasta showen. Status i UI (spelar in / klar / fil). Deploya aldrig; "redo för ladan".

## Från 2026-10-10 kväll — KONSERTSHOW ⭐ (efter de två ovan; "löser du det får du en stjärna i kanten")
STEG 1+2 KLART 2026-10-10 natt (51c237b, rapport-artifact v4): tools/concertBench.mjs + sektionspalett opt-in DMX_SECTION_PALETTE=1
(paletter/sektion 2->1, palettbyte på gräns 0,1->0,97, återseende 0,23->1,0; av json-identisk; resultat i tools/natt/konsert/).
ÄVEN BYGGT samma natt (opt-in, av json-identisk): DMX_PHRASE_SWITCH=1 frasbundna byten (cf67e68; pop bytePaFras 0,22->0,45,
megamix 0,09->0,18), DMX_LAMP_STAIR=1 lamptrappa via dirigenten (712ee4b; pop allaTanda 0,81->0,69, versRefrang 0,06->0,21,
natt r 0,17->0,34; PRIS 11 aldrig valda mot 5). Alla tre ihop: tools/natt/konsert/*-alla3.json. VÄNTAR PÅ ÄGARENS ÖGA i ladan.
10-11 FÖRMIDDAG (sessionen): (a) KLART a0b4b22 - lamptrappan glesar ut icke-sparsamma effekter till ett lamppar i vers/intro
(steg 1) i st.f. att begränsa poolen: allaTanda pop 0,53, megamix 0,74, versRefrang 0,26/0,29, aldrig valda 4. (b) KLART 24a0109 -
DMX_HUE_PHRASE=1 (ctx.hueIdx): kulörbyten/min 17->13 / 21->16. ALLA FYRA ihop (tools/natt/konsert/*-alla4.json): kulörbyten 11/14,
kulörer/sektion 3, paletter/sektion 1, allaTanda 0,54/0,76, versRefrang 0,25/0,28, aldrig valda 8. (c) KLART 9bca6cd: DMX_DROP_STROBE=<DMX> = lampornas EGEN strobe-kanal under drop-smällen (RGB kan inte strobea -
uttoningen; snabbare fade förbjudet). KALIBRERAS I LADAN med lågt värde, max 3 blixtar/s. Röken var redan rätt (drop + hunger 300 s).
VÄNTAR PÅ ÄGARENS ÖGA i ladan (alla opt-in).
FART->FULL (nattagentens brist) KLART 9bca6cd: DMX_TIER_OPEN=0,6 (energins golv höjs med andelen full): full mot fart korpus
0,29->0,35 (fart 0,28), megamix 0,61->0,66 (fart 0,63), pop 0,56->0,63 (fart 0,50); r upp överallt. Opt-in, redo för ladan.
RATTSVEPET KLART 9bca6cd: tools/knobSweep.py -> tools/natt/rattar.md. Döda på mixarna: DWELL_MS (env-standarden 45 s vinner
alltid över cfg.smartDwellMs -> stämningarnas/UI:ts 'Byter effekt' är verkningslös), SECTION_UNIT_RESERVE_MS, SYNC_ERR_FRAC,
DROP_CALM_BUILD; nära noll DROP_LAND_GAIN/E_RELEASE_MS/MIX_UNSEEN_BONUS/NEAR_FULL_DB/NEAR_MIN. Dubbletter rättade: DMX_GAMMA en källa
(output.ts), DMX_SILENCE_LEVEL bort (/setup enda källan). NÄSTA: avgör per död ratt om den är död även live (lugnt material,
lång-inspelningarna) innan borttagning. DWELL KLART 58fcdff (ägaren: 'kör på vad du rekommenderar'): fast 45 s, smartDwellMs/UI bort.
Ägaren: "Hur kan vi få ljusshowen mer lik en riktig konsert-show?" Riggen: 4 RGB-parlampor (dimmer konstant, R/G/B bär allt),
rökmaskin, inga movers; allt i realtid ur aux (ingen låtlista, inget låtminne). Arkitekturen är fast: TRE STEG (effekt -> energi ->
kalibrering), effekterna äger färg/styrka/lampa, dirigenten väljer look.
1. ANALYS (skriv i rapporten, kort): vad gör en ljusdesigner på en riktig konsert som vår show INTE gör? Tänk t.ex. på: dramaturgi per
   sektion (återhållsam vers, stor refräng, kontrast/blackout i break), EN palett (2-3 kulörer) per låt eller sektion i stället för nya
   färger hela tiden, "hits" på accenter (snare/stab) och tystnad mellan, antal tända lampor som dynamik (1 -> 2 -> 4), symmetri och
   rörelse över riggen (chase/sweep i takt, spegling), bygg-och-släpp kring drops, strobe och rök sparsamt och vid rätt ögonblick,
   att samma sektion ser likadan ut när den kommer tillbaka (igenkänning), och övergångar som följer frasen (4/8/16 takter).
   Mät det som går att mäta i bänken (mixarna + ladan-klippen): t.ex. kulörer per minut, hur ofta riggen är helt tänd, lampspridning,
   skillnad vers/refräng, look-byten mot frasgränser - jämför med vad en konsertshow skulle ha. Döm på kurvan, inte på gehör.
2. EN idé, bevisad, som ger mest "konsert" för ögat - t.ex. sektionspalett (dirigenten låser 2-3 kulörer per sektion och byter palett vid
   sektionsgräns), eller "lamptrappa" (antal tända lampor följer sektionens energi), eller frasbundna byten. Opt-in, json-identisk av,
   före/efter-mått, "redo för ladan" med exakt kommando. Bryt aldrig: inget lager efter effekten får lyfta/vitna, fade-down aldrig
   snabbare, energin släcker aldrig en tänd lampa, ändra aldrig den delade analysatorn. Deploya aldrig.
3. Resten av idéerna som en rangordnad lista (nytta för ögat / insats) i rapporten - ägaren väljer nästa.

## Från 2026-10-10 — FÄRRE REGLAGE (går före allt annat)
KLART 2026-10-11 natt (16e43da): av-brytarna MIX_V2/SECTION_SWITCH/SECTION_UNIT/HALVE_SHOW/BOUNDARY_SOFT + döda DMX_EXPECT_LEAD_MS bort, effects.ts env-läsningar 52 -> 47, json-identisk (mixar + 222 klipp + ladans 20). Kvar som eget spår: inventeringstabellen med mätt effekt per numerisk ratt + dubbletterna.
DELVIS KLART 2026-10-10 kväll (sessionen, allt json-identiskt mot natt/2026-10-10-baslinje-beatfeed.json): 7 döda config-/UI-flaggor
(4177e02: beatPulse, calmDecay, energyCeiling, clubMode, ambientGlow, strobeUnlimited, regiPro), oanvända konstanter (4ed3851),
5 env-brytare (2f0c662), SECTION_REUSE (66d5f5c), ENERGY_FALLBACK. KVAR: av-brytarna för
MIX_V2/SECTION_SWITCH/SECTION_UNIT/HALVE_SHOW/BOUNDARY_SOFT (många användningar - en i taget med json-bevis), inventeringstabellen (steg 1) med
mätt effekt per numerisk ratt, dubbletterna (steg 3). Behåll som prov: DMX_PHASE_FOLLOW (lotus gridfas 0,95 mot kick-PLL 0,49 -
kandidat för bättre takt, kräver GRID_PHASE i DMX-profilen) och DMX_AUDIO_CLOCK (omätt på Pi-DMX). OBS ny baslinje: kick->ljus 125->150 ms
i bänken är MÄTNINGEN (beatFeed som live, mätfälla 43), inte koden.
Ägaren 10-10: "kolla om vi kan minska antal reglage ännu mer, om de inte gör något eller om t.ex. två gör nästan samma sak, går de
kombinera m.m." Ljuset styrs nu på TRE ställen (effekt -> energi + en uttoning -> kalibrering, se pi-dmx/TRIMRATTAR.md); allt annat
som rör ljuset är borta (backup-taggar backup/fore-ett-ljus-2026-10-10, backup/fore-tre-steg-2026-10-10).
GÖR:
1. INVENTERA alla reglage: env-rattar (effects.ts 55, index.ts 10, server.ts 3, output.ts 2, audio.ts 2, analyserProfile DMX-delen),
   config-fält (src/config.ts), stämningarna (src/moods.ts) och /setup (public/index.html). Tabell: namn, standard, var den läses,
   vad den gör, MÄTT effekt (natt.py --snabb + dynSet med ratten på ett annat värde - ger den 0 skillnad = död).
2. STARTLISTA (10-10, grep): config-fält som effects.ts inte läser alls: ambientGlow, energyCeiling, calmDecay, clubMode,
   beatSyncStrength (kolla index.ts/analysator), strobeUnlimited, regiPro, beatPulse (45 träffar i src men 0 som cfg i effects.ts -
   kolla vad som läser den) - och stämningarna/vredet som sätter dem. Om ingen läser dem: bort ur config, moods, server, UI.
3. DUBBLETTER: rattar som gör nästan samma sak (t.ex. flera golv/tak, dropEnv/dropColEnv-vägar, MINI_*/NEAR_*-par, sektionsrattar)
   - föreslå EN, mät att showen blir densamma (eller bättre), slå ihop.
4. Varje borttagning: json-identisk (natt.py --snabb) om ratten var död; annars mät före/efter och skriv i rapporten. En commit per
   grupp. Deploya aldrig. TRIMRATTAR.md uppdateras. Markera "KLART <datum>: <antal före -> efter>".

## Från 2026-10-10 — RENSA DEN DÖDA PULSKODEN (EN VÄG FÖR LJUSET)
KLART 2026-10-10 (i dagsessionen): -196 rader, json-identisk.
Ägaren 10-10: "kör ren kod utan massa toggels" - dimmern är en konstant och dimmerpulsen är borta (backup: git-taggen
backup/fore-ett-ljus-2026-10-10). Kvar i effects.ts är koden som RÄKNAR pulsen (beatMulNow: ENERGY_FB/transientpuls, ENERGY_RISE_K
'energi direkt', PULSE_GAP_*, BEAT_MIN, BEAT_FLUTTER_RELEASE, HEARTBEAT/hbEnvelope, BEAT_LIFT) men den når inga lampor längre.
Ta bort det som inte läses av något annat (kolla index.ts telemetri frame.beatMul, effekternas ctx.beatPulse/heartPulse - de är
EFFEKTENS puls och ska vara kvar). Bevis: natt.py --snabb json-identisk före/efter, dynSet identiskt. En commit per block.
Markera "KLART <datum>".

## Från kvällen 2026-10-09 — KVÄLLENS LADAN-ENV BLIR KODENS STANDARD (går före allt annat)
KLART 2026-10-10: tolv prov → kodens standard (TEMPO_* via DMX-profilen), E_SLOW_MS/HUE_CUT_MS/DIM_PULS/CH_MAP borta; mixar + effektval json-identiska mot ladans env, ladans 20 klipp identiska i allt ljus; TRIMRATTAR uppdaterad. Nästa ladan: `python tools\ladan.py` utan --env.
Ägaren i ladan 10-09 ("nu kör!" → "ja, gör dem till standard i natt"). Det som kör på Pi:n nu (ladan.conf, deployat ~10-09 kväll)
utöver SHOW_ENV (DMX_DROP_MIN_GAP_S=15):

  DMX_HUE_CUT=1  DMX_ALLA_LOOKER=1  DMX_E_CURVE=10  DMX_E_TOP=0.95  DMX_E_WIN_S=10  DMX_E_GATE=1
  DMX_GAMMA=1.6  DMX_E_NORM_S=2  DMX_E_LIN=1  DMX_FX_FLOOR=0.6  DMX_TEMPO_SHIFT=1  DMX_TEMPO_HOLD=1

GÖR (ägarens princip: ersätt, lägg inte till lager - flaggan försvinner, den gamla vägen tas BORT, värdet blir koden):
1. BASLINJE FÖRST: `python tools\natt.py --snabb --tag fore-standard --env <alla tolv ovan>` + `python tools\dynSet.py --env <alla tolv>`
   (spara json). Det är facit: efter varje steg ska `python tools\natt.py --snabb` UTAN --env ge json-identiska mixar mot den.
2. Gör standard, ett steg i taget, en commit per steg, json-identisk efter varje:
   - effects.ts: HUE_CUT (postprocess.ts: per-lampa-vägen blir enda vägen, kanalvisa ballistiken för färg bort), ALLA_LOOKER
     (registry.ts: REQ_ALLA blir REQUIREMENTS; effects.ts: build-inträdet + minst-spelad blir enda vägen, gyllene snittet bort),
     E_CURVE 10, E_TOP 0,95, E_WIN_S 10, E_GATE (fönstret uppdateras bara över ingångsgränsen), E_NORM_S 2, E_LIN, FX_FLOOR 0,6.
   - output.ts: GAMMA 1,6 som standard i LUT:en (ratten kan bli konstant).
   - TEMPO_SHIFT och TEMPO_HOLD ligger i den DELADE analysatorn: sätt dem i DMX:s egen PROFIL (src/analyserProfile.ts, sys:
     TEMPO_SHIFT '1', TEMPO_HOLD '1') - INTE som ändrad standard i analyser.ts (då ändras lotus). analyser.ts orörd ⇒ md5 orört.
3. TA BORT rattar som provats 10-09 och inte används: DMX_E_SLOW_MS, DMX_HUE_CUT_MS (och hueRatio), DMX_DIM_PULS (förkastad i ögat),
   DMX_CH_MAP + output.intent om HUE_CUT gör den onödig (mät ofrivBlink i dynSet före/efter - ska vara 0 kvar), E_STAT finns inte.
   Bevisa json-identitet mot steg 1 efter borttagningen.
4. ladan.py: SHOW_ENV oförändrad (bara DROP_MIN_GAP_S). Deploya ALDRIG - ägaren kör `python tools\ladan.py` (utan --env) nästa
   gång; då skrivs ladan.conf om och showen ska se exakt likadan ut som i kväll. Skriv det i rapporten.
5. TRIMRATTAR.md + ARKITEKTUR.md: uppdatera energin (fönster 10 s, tystnad räknas inte, topp 0,95, kurva 10 i DMX-procent efter
   gamma 1,6, effektens topp normerad 2 s, grundnivå 0,6), färgen (kulör direkt, ljusstyrkan tonar), dirigenten (alla 44 nås).
   Markera detta avsnitt "KLART <datum>: <en rad>".
Mätfällor från kvällen: bänkens nivå är -17 dBFS sedan 10-09 (mätfälla 42); dynBench mäter med cal.on 16 (standardconfigen saknar
cal); jämför json, inte scoreboardrader; ingen ändring i analyser.ts (lotus-agentens fil, md5-spärr).


## Från kvällen 2026-10-08 — LEVANDE DYNAMIK UTAN FLADDER (går före kodoptimeringen nedan)
KLART 2026-10-09: instrument dynBench/dynSet (+ natt.py -> dynamik.md); R/G/B = DMX_CH_MAP=1 (ofrivillig blink 4,3 -> 0/min/lampa, alla3 0,022 -> 0,038, json-identisk av); dynamik-kandidat DMX_E_CURVE=3 (spann 0,78 -> 1,18 steg, kontrast 1,50 -> 1,68, fladder 1,6 -> 1,1/min, ljus p50 -6 %); pulsen pa foljande fonstret = ingen matbar skillnad (kan bytas som ren forenkling). Redo for ladan, EN i taget.
Ägaren i ladan, ordagrant: "jag vill att nattagenten kollar över detta med dynamiken så ljuset känns levande, börjar bli bra.
Men tror vi kan göra det bättre. Då utan att de fladdrar."

LÄGET (godkänt och live 10-08 kväll, läs pi-dmx/TRIMRATTAR.md och memory/pi-dmx.md sista avsnitten):
- Ingången: Aux −18 dB (klippte förut - ALLA gamla ladan-inspelningar är klippta, nivåspann ~5 dB; mät INTE dynamik mot dem).
- Energin: ingångens volym (levelVU) i dB i ett FÖLJANDE fönster (E_WIN_S 20, E_MIN_DB 4) → kurva E_CURVE 2 → avklingning 100 ms →
  EN dämpningsfaktor på effektens RGB (aldrig > 1). Ägaren: "mycket bättre nu".
- Minidrop: lyft 0,9 i MINI_BANG_MS 150, ingen spärr. Nästan-drop 0,5–0,85. Ägaren: "drop-lyftet hjälper dynamiken".
- Utgång: en mappning (färg 1 % → släck+1; DIM golv+1..0,95 × fullpunkt 255; bara full drop till 255).
- Puls: effekternas c.heart + energipulsen ("energi direkt") som fortfarande läser det GAMLA dB-fönstret (liveLevelSm/lightLoud) -
  samma sak mäts alltså på två ställen. Kandidat: låt pulsen läsa samma följande fönster (en signal).

GÖR:
1. INSTRUMENT FÖRST: skriv/utöka en bänk som mäter (a) LEVANDE: energifaktorns spann i STEG (log2(p90/p10) av md), ljusets
   1 s-envelopp mot ingångens dB (r), och lugnt-mot-högt-kontrast; (b) FLADDER: per lampa antal riktningsbyten i ljuset med
   amplitud > 5 % av fullt inom < 150 ms som INTE ligger på ett slag/kick (±60 ms) - det är fladder, slagpuls är inte fladder;
   rapportera fladder/min. Kontrollera instrumentet: en konstant ton ska ge ~0 fladder, en ren kickloop fladder ~0 och puls = kickar.
2. MÄT läget med de NYA inspelningarna: tools/ladan-2026-10-08/*.wav (20 klipp à 30 s, 48 kHz mono, inspelade av motorns recorder
   i ladan 10-08 med Aux −18 dB: 0 % klippta sampel, 100 ms-RMS p10/p50/p90 −25,8/−17,4/−12,7 dBFS = 13 dB spann; .events.json/.json
   bredvid). Kör showTight på dem UTAN --norm (de ÄR ladans nivå). De gamla pop/megamix_ladan är klippta - räkna dem inte för dynamik.
   Lägg gärna till klippen i natt.py som en tredje mängd ("ladan10-08") så dynamiken följs natt mot natt.
3. EN idé, bevisad: mer levande (spann i steg upp, r upp) med fladder/min inte upp. Kandidater: pulsen på samma följande fönster;
   E_WIN_S/E_MIN_DB/E_CURVE; energins uppgång (attack) när volymen stiger; per-lampa-dynamik (inre/yttre). Fallhastighet får INTE
   ökas för lampan (DMX_FADE_MIN_S); energins egen avklingning ägs av ägaren (100 ms nu).
4. Allt som opt-in env, "redo för ladan" med exakt kommando. Ägarens princip: ersätt, lägg inte till lager.
5. STABILARE R/G/B (ägaren 10-08: "få lamporna att köra stabilare på r g b dioderna. nu kan tex R lysa och B fladdra till"):
   TROLIG ORSAK: en svag SIDOKANAL (t.ex. B i en rödaktig kulör) skalas med lampans ljusstyrka (energi/puls via colK i
   output.ts calibrate) och passerar diodens fysiska tändpunkt (~16) upp och ner -> B tänds/släcks i takt med LJUSSTYRKAN, inte
   med färgen. Förr fanns DISTINKTA FÄRGER (HUE_RATIO_ON 0,25 / OFF 0,15: sidokanal tänd/släckt efter sin ANDEL av starkaste
   kanalen, med hysteres) - den låg på !LOW_PURE-vägen och togs bort i steg 1 10-08 som död. Återinför DEN REGELN på den levande
   vägen i output.ts (färggrenen): sidokanalens andel avgör på/av med hysteres; tänd sidokanal hålls minst på sin tändpunkt+1 så
   den inte blinkar vid låg ljusstyrka; släckt = 0. Kulörens förhållande bevaras i övrigt. Mät med colorBench (per kanal) + ett
   nytt mått: antal på/av-växlingar per sidokanal och minut (ska ner mot 0 när färgen står still). Opt-in först, redo för ladan.
   FÖRSTAHANDSVAL (ägaren 10-08: "den skall ju kunna köra 50% blå och 30% röd") = PER-KANAL-MAPPNING: i output.ts färggren mappas
   VARJE färgkanal för sig: 0 = släckt, 1..255 -> den kanalens tändpunkt+1 (onR/onG/onB, annars on) .. tak - i stället för att
   alla kanaler skalas med den starkaste kanalens faktor (colK). Då kan ingen kanal som effekten säger är PÅ hamna under sin
   tändpunkt, och 50 % B + 30 % R lyser båda stabilt. Ägarens regel "1 % = släck+1" per diod. Ingen hysteres/andelsregel behövs.
   Bevaka: (a) avrundning - energi/puls kan skala en svag kanal till raw 0 (8 bitar) -> av/på nära botten; mät och räkna i
   flyttal hela vägen till mappningen om det fladdrar; (b) kulören blir något ljusare nära botten (ej proportionell) - acceptabelt.
   (Alternativ B, kvantiserad kulör, STRUKEN: klarar inte blandningar som 50/30.) Alternativ A (andelsregeln) bara om
   per-kanal-mappningen mäter sämre.

## Från kvällen 2026-10-07 — KODOPTIMERING AV LJUSVÄGEN

PÅGÅR 2026-10-08 (körd i dagsessionen, datorn sov i natt): steg 1 klart (output.ts 19→3 rattar, 467→335 rader), steg 2 klart
(gamla energins döda delar + DIM-taket/LiveRange bort; dB-fönstret KVAR - det matar pulsens 'energi direkt' och drop-landningen),
steg 3 väntar på ägarens beslut om HARD_GATE, steg 4 ej påbörjat, steg 5 klart (pi-dmx/TRIMRATTAR.md). Alla steg json-identiska
mot baslinjen 10-08 (mixar + 222 klipp). Render 62→55 µs/ruta (timeProbe.mjs). Nästa: steg 4 (effects.ts 98 env-rattar).

Ägarens mål (ordagrant): "allt jag vill med detta är att koden skall bli snabbare, tydligare och enklare att trimma till rätt"
och "vi skall inte lägga massa olika spärrar på ljuset, blir ju till slut omöjligt att styra".

GRUNDKRAV (ägaren 10-07): "så simpelt och snabbt som möjligt, men få ut effekten". Ersätt vägar, lägg aldrig till lager.
Kvällens opt-in-prov (HARD_GATE, DIM_MAX, PULSE_GAP_BEAT, MINI_FULL, ENERGY_SRC, ENERGY_GAMMA, ALSA_BUFFER, FAST_RECOVER, NEAR_*) ska
antingen bli standard med gamla vägen BORTTAGEN, eller tas bort helt - de får inte bli kvar som parallella rattar.

ÄGARENS LJUSKONTRAKT (bestämt i ladan 10-07, går före allt äldre):
- Ända till output kör vi 0–100 %. Effekter/dirigent/energi vet INGET om hårdvaran (tändpunkt, golv, DIM-mättnad).
- 0 % = släckt, och det är dirigentens/effektens beslut. Effektens 1 % mappas till lampans SLÄCK+1.
- Mappningen är SISTA steget i output (`output.ts` LIN_MAP, standard sedan 10-07). Ingen annan modul känner till den.
- Effekt 100 % = 95 %; bara drop (dropEnv som tal till calibrate) öppnar de sista 5 %.
- Energilagret får bara MINSKA. Snabbare fade-down är fortfarande förbjudet.
- Ingångens lägsta: EN hård, justerbar gräns (Släckgräns i /setup) på analysatorns nivå, inga tider (prov DMX_HARD_GATE=1).

REGEL FÖR VARJE STEG: showen ska vara BIT-IDENTISK med kodens standard + ladans SHOW_ENV före och efter
(`python tools\natt.py --snabb` + korpus, jämför json, inte bara scoreboardraden). Ett steg = en commit. Faller identiteten:
revertera och skriv varför. Deploya aldrig (ägaren kör ladan.py). Rör aldrig analysatorn.

STEG I ORDNING (gör så många som hinns, ett i taget):
1. `output.ts`: ta bort de vägar som är döda med LIN_MAP som standard — CAL_V2 + dess 8 rattar (förkastat prov 10-06),
   klampningsgrenen (LIN_MAP=0), 10 %-regeln LOW_ON/OFF_CH, HUE_LIFT/HUE_RATIO (gäller bara utan LOW_PURE), MIN_DIM,
   LOW_PURE-flaggan om den nu alltid är på. Mål: ~3 rattar kvar (golv FLOOR_CH, MAP_TOP, DIM_MAX) och en calibrate
   som går att läsa på en skärm. Kolla att tools/ (calProbe m.fl.) inte bryts — gallra verktyg som bara mätte döda vägar.
2. ÄGARENS MODELL (10-07 kväll, ordagrant): "energilagret, följer det inte bara inputs energinivå med liten fade out?" - JA, så
   ska det vara. I dag: basens dB (LIVE_BASS_W 1 = bara bodyDb) -> 10 dB-fönster mot 120 s-ankare med särregler -> 3 utjämningar i
   rad (350 ms, 25/150 ms, log-release) -> TVÅ vägar (md på RGB golv 0,25 + uppbyggnad/drop/sektionsgas; vu på DIM golv 0,20, 0,45/1,2 s)
   -> sektionsdämpning. Bygg den enkla vägen: en energisignal, direkt upp, EN kort avklingning, ETT golv, applicerad EN gång (DIM).
   PROV LIVE 10-07: DMX_ENERGY_SRC=intensity (analysatorns frame.intensity 0,05..0,85 -> 0..1 i stället för dB-fönstret) gav i bänken
   pop r 0,20 -> 0,48, megamix 0,09 -> 0,45 - läs memory/pi-dmx.md om ägaren godkänt den; då är intensity energisignalen.
   GODKÄNT 10-07 ~20:20 ("mycket bättre energiföljning nu"): ENERGY_SIMPLE är STANDARD. Steg 2 = TA BORT den gamla energikedjan
   som nu är död: LIVE_LEVEL-fönstret/ankaret (LIVE_WIN_DB, LIVE_OFFSET_DB, LIVE_ANCHOR_*, LIVE_RELEASE_MS, LIVE_BASS_W, LIVE_CEIL),
   lightShapeSm/lightLoud/log-release/soft-snap, md0 med LIGHT_FLOOR/buildUp/dropEnv-påslag, sektionsgas (secGain/dynGain/RANK/
   EXPECT_LIFT), vu/range/CEIL_FLOOR/ceilMul-vägen, ENERGY_GAMMA, ENERGY_SRC - allt som bara matade md/ceilMul. Kolla vad ANNAT
   som läser samma fält (lightLoud används t.ex. av dirigent/tier? tierEma?) innan något tas bort; bevisa med natt.py att showen
   är bit-identisk med ENERGY_SIMPLE före och efter borttagningen.
   (Historik) Energin på ETT ställe med EN ratt: i dag multiplicerar energin både effektens RGB (md, golv LIGHT_FLOOR 0,25) och DIM
   (ceilMul, golv CEIL_FLOOR 0,20) — två golv som multipliceras. Effekterna äger RGB enligt kontraktet, så energin hör
   hemma på DIM. Kartlägg först (siffror), föreslå i rapporten, bygg som opt-in om det inte kan vara bit-identiskt.
   OBS ladans stegtest 10-01: DIM mättar vid ~85 (prov DMX_DIM_MAX=85 live 10-07 kväll, ägarens öga avgör).
3. Ingångsgränsen: om ägaren godkänt DMX_HARD_GATE (står det i memory/pi-dmx.md) — ta bort gamla tystnadsgrinden
   (SILENCE_MS, SILENCE_RELEASE_S, gain-skalning, START_FADE_MS, låtstartsflanken). Annars: lämna.
4. `effects.ts` (101 env-rattar, 2 114 rader): gallra rattar som aldrig blivit standard och vars standard gör grenen död.
   Lista först alla rattar med standardvärde + om grenen körs med SHOW_ENV; ta bort döda grenar några per natt.
5. Skriv/uppdatera EN tabell över trimrattarna som finns kvar på ljusvägen (fil, ratt, standard, vad den gör) i
   pi-dmx/ARKITEKTUR.md eller en egen TRIMRATTAR.md — det är ägarens trimyta.

Mät också: rader och env-rattar per fil före/efter, och process()/render-tid per ruta (snabbare = ett av målen).
HÄNG (ägaren i ladan 10-07 ~20:55: "känns som motorn hängde sig ett tag"): Pi-loggen visade 0 krascher/watchdog/OOM - bara
kvällens 5 deploy-omstarter (efter omstart 10-20 s utan taktlås/nivå). Mät ändå på PC:n i bänken: max och p99 för
render()-tid per ruta och för analyser.process per hop över hela mixarna, och vilka steg som kostar (effekter, dirigent,
postprocess, output). Ta bort onödiga beräkningar i ljusvägen (allokering per ruta, strängbyggen, döda grenar) - ägaren tror
att det är där hänget försvinner. Rapportera före/efter i ms.
Rapportera under egen rubrik. Markera detta avsnitt "KLART <datum>: <en rad>" när steg 1–5 är gjorda
(annars "PÅGÅR <datum>: steg X klart").

## Från kvällen 2026-10-07 (sent) — INGÅNGEN VAR ÖVERSTYRD
Ladans inspelningar pop_ladan.wav/megamix_ladan.wav är tagna med en ÖVERSTYRD ingång (22–29 % klippta sampel, 97–99 % av
sekunderna i 0 dBFS, nivåspann 5 dB). Ingången är sänkt 13,5 dB som standard (server.ts: Aux 49, Mixin PGA 3) och ägaren:
"mycket bättre nu". Konsekvens för bänken: mixarna motsvarar inte längre riggen för energi/nivå/tystnad — skriv det i
rapporten, jämför inte energimått mot gamla rader, och be ägaren spela in nya ladan-mixar (DMX_RECORDER=1) nästa gång.
Simulera inte nivåsänkningen på de klippta filerna (klippningen går inte att ta bort i efterhand).
