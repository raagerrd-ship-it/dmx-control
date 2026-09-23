# Deploy fran en dator utan node (ladan, 2026-09-21)

`analyser.js` har ar byggd ur `pi-dmx/engine/src/analyser.ts` (commit 824f5b1): evidensval + kickrattar som OPT-IN,
standard bit-identisk med driften (frozen6 48/76). md5 (git-blob, LF) `c20876b88d0d7ee6ee3cdf2eae4e60f6`.

Adress: pa Pi:ns eget AP (WiFi `pi-dmx`) ar den `192.168.4.1`; pa hotspoten `Pixel_9285` svarar den som `pi-dmx.local`
= `172.29.167.218` (mDNS). Nedan `PI=172.29.167.218` - byt vid behov.

OBS core.autocrlf: den utcheckade filen pa Windows har CRLF (md5 b946e9e8...). Skicka LF-varianten:
```
git show HEAD:pi-dmx/deploy/analyser.js > $env:TEMP\analyser.js
scp $env:TEMP\analyser.js pi@$PI:/tmp/analyser.js
ssh pi@$PI
```
pa Pi:n (`node --check` maste koras i en mapp med `"type":"module"` - i /tmp tolkas `import` som CommonJS och faller, Node 18.20.4):
```
mkdir -p /tmp/chk && echo '{"type":"module"}' > /tmp/chk/package.json && cp /tmp/analyser.js /tmp/chk/ && node --check /tmp/chk/analyser.js && sudo cp /opt/audio-dmx-engine/dist/analyser.js /opt/audio-dmx-engine/dist/analyser.js.bak-20260921 && sudo cp /tmp/analyser.js /opt/audio-dmx-engine/dist/analyser.js && sudo chmod 644 /opt/audio-dmx-engine/dist/analyser.js && sudo systemctl restart audio-dmx-engine && sleep 5 && systemctl is-active audio-dmx-engine
```
`sudo` gar utan losenord for `pi`. SSH-nyckel fran laptopen (VMTRAILER-PC27, `~/.ssh/id_ed25519_pi`) ligger i `authorized_keys` sedan 2026-09-21,
sa `ssh -i ~/.ssh/id_ed25519_pi pi@$PI` behover inget losenord. Med losenord och python: `PI_HOST=$PI PI_PASS=... python tools/deploy-dist.py analyser.js` i `pi-dmx/engine` (kraver `dist/analyser.js`).

Aterstall: `sudo cp /opt/audio-dmx-engine/dist/analyser.js.bak-20260921 /opt/audio-dmx-engine/dist/analyser.js && sudo systemctl restart audio-dmx-engine`

Deployad 2026-09-21 16:25 fran laptopen: backup .bak-20260921 (146020 B, md5 ebda6b4ac203ed1a3eeedb3d717f806f), ny 155885 B, is-active: active.

A/B pa plats (evidensval + 10 s ring, bank: slutlas 48 -> 51/76, men 2x-fel tillkommer pa langsam country):
```
printf '[Service]\nEnvironment=DMX_TEMPO_EVIDENCE=1\nEnvironment=DMX_TEMPO_ENV_S=10\n' | sudo tee /etc/systemd/system/audio-dmx-engine.service.d/evidens.conf && sudo systemctl daemon-reload && sudo systemctl restart audio-dmx-engine
```
Ta bort: `sudo rm /etc/systemd/system/audio-dmx-engine.service.d/evidens.conf && sudo systemctl daemon-reload && sudo systemctl restart audio-dmx-engine`

## 2026-09-21 kvall: "liv" i nivan (DMX_LIVE_LEVEL) - effects.js tillkommer
Agaren i kallaren: BLE-remsan har mer liv (brightness som foljer ljudet) an DMX-lamporna. Orsak: DMX:s loudness = frame.intensity
(SEKTIONSNIVA, sekunder); lotus driver nivan fran ra mid/diskant per tick genom ett 10 dB-fonster mot ett langsamt ankare
(instant attack, 350 ms release). Portat som opt-in i effects.ts (DMX_LIVE_LEVEL=1; rattar LIVE_WIN_DB 10, LIVE_OFFSET_DB 4,5,
LIVE_ANCHOR_S 120, LIVE_RELEASE_MS 350, LIVE_BASS_W 0,25, DMX_LIVE_TRACE=1 loggar). Offline (tools/testLiveLevel.mjs): rorelse pa
slagskala 1,4-3,4x, sektionsskala oforandrad. Deploya BADA filerna (analyser.js + effects.js), samma steg som ovan for var fil.
A/B: `printf '[Service]\nEnvironment=DMX_LIVE_LEVEL=1\n' | sudo tee /etc/systemd/system/audio-dmx-engine.service.d/liveniva.conf && sudo systemctl daemon-reload && sudo systemctl restart audio-dmx-engine`
Nar nivan lever kan golven i ladan sankas (LIGHT_FLOOR 0,45 -> ~0,3, BEAT_MIN 0,30 -> ~0,2) - annars ar dynamikspannet bara 55 %.

## 2026-09-21 sen kvall: gridfas + fasfoljare + sektioner till dirigenten - index.js tillkommer (TRE filer)
Portat fran lotus (alla opt-in, standard bit-identisk: frozen6 48/76):
- `DMX_GRID_PHASE=1` analysatorns egen gridfas (klistrig) -> frame.beatPhaseMs/beatPhaseConf. Bank pa lotus-korpusen (366 latar,
  Beat This!-fas): i fas 77/130, MOTFAS 5, mellan 48 (median 0,86); lotus-analysatorn 102/148/4.
- `DMX_PHASE_FOLLOW=1` (index.js) motorn foljer gridfasen i stallet for kick-PLL:en (PLL:ens fasterm av nar fas finns), flytt > 0,35 slag
  bara med kvot >= 2 i 4 raka OCH kickdomaren (senaste 8 slagens kickar narmare nya fasen). Logg: `[takt] gridfas: fasen flyttad ... / NEKAD`.
- `DMX_SECTION=1` realtidssektioner intro/low/build/high/break + upprepning i frame.section m.fl.
- `DMX_SECTION_SWITCH=1` (effects.js) dirigenten: sektionsgrans = bytesskal, build = aldrig byte, break = lugna poolen, etiketten = identitet
  (`live:high` far tillbaka sin look). `DMX_SECTION_TRACE=1` loggar bytena.
Rekommenderad forsta provning i ladan (allt i EN drop-in `lotus.conf`):
```
printf '[Service]\nEnvironment=DMX_GRID_PHASE=1\nEnvironment=DMX_PHASE_FOLLOW=1\nEnvironment=DMX_SECTION=1\nEnvironment=DMX_SECTION_SWITCH=1\nEnvironment=DMX_SECTION_TRACE=1\nEnvironment=DMX_LIVE_LEVEL=1\n' | sudo tee /etc/systemd/system/audio-dmx-engine.service.d/lotus.conf && sudo systemctl daemon-reload && sudo systemctl restart audio-dmx-engine
```
Angra: `sudo rm .../lotus.conf && sudo systemctl daemon-reload && sudo systemctl restart audio-dmx-engine`. Ta en flagga i taget om nagot kanns fel.

## 2026-09-21 senast: dirigenten GASAR pa refrangen (DMX_SECTION_SWITCH, effects.js uppdaterad)
Vid 'high'-grans snappas tierEma till SECTION_HIGH_SNAP (0,75 = full-fart-poolen direkt, som vid drop) i stallet for att vanta pa
5 s-medelvardet + hallstid; 'break'/'low' snappar ner (0,35). Master: high x1,12 (SECTION_HIGH_LIFT), break x0,85 (SECTION_BREAK_DIP).
Standard (utan flaggan) orord. Offline i smart-lage: "[dirigent] live:high: aterser chase" = samma look nar refrangen kommer tillbaka.
Att kolla i ladan: analysatorns sektioner kan vaxla high<->break med nagra sekunders mellanrum (dwell 8 s) - dirigentens MIN_HOLD
dampar; annars hoj uppehallstiden i analysatorn (DMX_SECTION_MODE/rank-trosklar) efter logg med DMX_SECTION_TRACE=1.

## 2026-09-21 i ladan: sektionseffekter + sektionspooler (effects.js + effects/registry.js + effects/stegring.js + effects/andrum.js)
Deployat 17:10 (analyser/effects/index) och lotus.conf pa (GRID_PHASE, PHASE_FOLLOW, SECTION, SECTION_SWITCH, SECTION_TRACE, LIVE_LEVEL):
loggen visade 'sektion intro->build->high' -> 'live:high: ny look party (tier full)' och kickdomaren nekade tre fasflyttar (-310 ms).
Sedan (ej deployat an, hotspoten forsvann): effekterna ser sektionen (c.section/sectionAgeMs/sectionIndex), nya 'stegring' (build:
morkt->vitt, tatare puls, UV/hazer, blinder vid drop) och 'andrum' (break: dimmat, langsamt, hjartslaget kvar), och registry.SECTION_POOLS
= tydliga listor per sektion (intro/low/build/high/break) som dirigenten skar tier-poolen med; build/break tar sina egna fore tiern.
Deploy: `python tools/deploy-dist.py` utan filargument (md5-diff pa alla dist/*.js + effects/*.js). Kraver lotus.conf for att markas.

## 2026-09-21 fore ladan-tur 2: effekterna far den nya analysen + tre nya/omskrivna
- Kontext: c.section/sectionAgeMs/sectionIndex/sectionTier/repeatSim + c.sectionEntry (1 -> 0 forsta 400 ms av en sektion).
- Refrang-entre: party/rave/snap/pulse/konfetti gor en stot (vitare, ljusare, blinder-onskan) nar 'high' borjar.
- duel v2 (call/response kick/virvel med eko), strobe v2 (bara high; blixt pa slag i snabb musik/drop, het glod emellan), sug (build:
  ljuset sugs ner sista biten av risern, hazer/UV upp, dropen landar i tomrum). 40 effekter, alla sektionstaggade i sina filer.
- Deploy: `python tools/deploy-dist.py` utan argument (hela dist inkl. effects/ + config.js). Standard oforandrat (48/76).


## Ladan 2026-09-23: HEART-BEAT/ENERGI som egen del (opt-in) + W_HIGH + rensningen
Deploy som vanligt: `cd pi-dmx/engine && set PI_PASS=... && python tools\ladan.py` (`--dry` forst). Nytt i bygget:
- `DMX_SECTION_W_HIGH=1.0` standard (hoga bandens niva i sektionsrangen, lotus-bevisat pa test) - `0` = som forr.
- **`DMX_HEARTBEAT=1`** (av som standard = gamla vagen orord): kontraktet heartbeat/contract.ts. Output = avsikt x grind x (energi? tak) x
  (puls? 1-d+d*puls). Effekten deklarerar `modulate` i sin fil: strobe/fyrverkeri/drops/konfetti skippar bada; airglow/breathe/drift/mono/
  tide/viska/wave/aurora/pendel/andrum/sug/vagbrytare/sopa/neon/sol skippar pulsen; resten energi+puls. Dirigenten: tillit < DMX_HEARTBEAT_TRUST
  (0,35) -> puls av; break/low -> energi pa. Rattar: `DMX_HEARTBEAT_DEPTH` (0,35 = pulsens djup; hojd = tydligare hjartslag), `DMX_HEARTBEAT_TRUST`.
  Ersatter BEAT_LIFT (additivt lyft) och md-multiplikationen nar den ar pa; LAMP_MIN-golvet och tystnadsgrinden galler som forr.
  Bank (testLiveLevel pop_ladan 60-120 s): medel 1,31 -> 1,21, slagskala 0,171 -> 0,145, sektionsskala 0,72 -> 0,73 - alltsa nastan samma
  mangd liv, men fran ett kontrakt i stallet for tva lappningar. OGONBEDOM: A/B med `python tools\ladan.py --env DMX_HEARTBEAT=1` resp. `=0`
  (en omstart per byte): syns hjartslaget i morka effekter? blir strobe/fyrverkeri fulla? blir lugna partier morkare? Vid for svag puls: DEPTH 0,5.
- Kvar att bedoma fran igar: lugn-grinden av (drops i lugna partier), basgangs-toggles, dirigenten gasar fore refrangen, dynamiken mot refrangen.

## Ladan 2026-09-23 (tur 2): EFFEKTOVERSYNEN - 46 effekter, 5 nya, 2 borta, 17 uppgraderade (effects.js + effects/*.js + moods.js + config.js)
Samma deploy: `python tools\ladan.py` (`--dry` forst). ladan.py REMOVE flyttar innerouter.js/neon.js till .bak pa Pi:n.
- **Borta:** innerouter (identisk med varannan upp till lampordning, rPerm 1,00), neon (aldrig vald pa nagon mix, sol ar samma fallback).
- **Nya:** forvarning (build/low: sista 4 takterna fore FORUTSEDD refrang tands lamporna en i taget utifran och in, vit karna sista takten,
  slapp pa slaget), basgang (toggle: ljuspunkten stegar pa BASNOTERNA, riggen glimmar med basens sustain), tyngdlyft (djup farg 6 dB under
  refrangens niva -> vitt vid 0 dB, blinder over), uvpuls (UV pa slaget i refrangen - kraver uv-fixtur, riggens rgb7 har ingen),
  frasraknare (svep var 4:e takt, vit blixt pa var 8:e takts etta).
- **Uppgraderade:** chase/eko/stege stegar pa basnoter vid tydlig basgang; party/snap/rave far vitkarna + UV nar refrangen ar tillbaka
  (repeatSim); wave/breathe har period ur gridet; tide/pendel dyning/svang over 8/4 takter (sectionBars); gravity/ripple skalar mot
  refrangens niva (levelVsHighDb), ripple omskriven (v1 var ett A/B-flip 0,92 likt rave - nu rullar krusningen ut fran mitten);
  stegring/nedrakning/sug raknar ner till forutsedd refrang (nedrakningens "allt tands" landar pa slaget); andrum djup ur levelVsHighDb.
- **Motor:** basnotsraknare (onset.bass-flank, 90 ms), EffectDef.exact (specialkanal utan motorgolv), FIT-rader for sektionseffekterna
  (stod pa neutral 0,5 och valdes aldrig), osedd-bonus `DMX_MIX_UNSEEN_BONUS` (0,10; 0 = av) sa varje effekt far en forsta chans.
- **Bank (ladans env, 10 min):** pop 25/43 -> 25/46 effekter, megamix 24/43 -> 31/46; alla fem nya valda pa bada; topp-4 36/34 % -> 31/31 %.
- **OGONBEDOM:** forvarningens nedrakning mot en riktig refrang (forutsagelsen finns bara 10-16 % av tiden i banken); basnotslaget i
  chase/eko/stege/basgang (troskeln ar satt pa ogat); tyngdlyft/gravity/ripple pa ladans komprimerade PA (levelVsHighDb ror sig bara
  +-4 dB - blir det platt ar skalan 6/9 dB ratten); att variationen kanns storre. Opt-out for dirigentens nya bonus: `--env DMX_MIX_UNSEEN_BONUS=0`.

### Korschema ladan 2026-09-23 (Claude kor allt fran PC:n, agaren tittar)
Forberett: `tools/ladan.py` (deploy + env + omstart), `tools/kolla.py` (tjanst/env/kostnad), `tools/ladanWatch.py` (foljer journalen,
sammanfattar lookbyten/sektioner/drops per minut; `--sedan 5` = facit for de senaste 5 minuterna). Dirigentens "ny look"-logg ar nu
OVILLKORLIG (del, tier, pool, sektion, basgang) sa valen syns aven utan DMX_SECTION_SWITCH.
1. `python tools\ladan.py --dry` -> `python tools\ladan.py` (bundeln: mix v2, heart-beat opt-in, W_HIGH, rensningen, effektoversynen).
   `kolla.py` efterat: tjanst active, env = SHOW_ENV, 0 fel. Musik igang -> `ladanWatch.py` i 5 min = BASLINJE (ogat + siffror).
2. A/B 1: `--env DMX_SECTION_SWITCH=1` (sektionspoolerna + entre-stoten + halva bytena; rotorsaken 'last pa high' ar rattad).
   Ogat: lugna partier lugna? refrangen tydligt annorlunda? Siffror: byten/min, olika looker, 'i high'/'i low'-tabellen.
   Fastnar sektionen pa high (bara fart/full i lugna partier) -> tillbaka utan flaggan, och nattens jobb = sektionsdetektorn i ladan.
3. A/B 2: `--env DMX_HEARTBEAT=1` (och `DMX_HEARTBEAT_DEPTH=0.5` om pulsen ar svag). Ogat: hjartslag i morka effekter, strobe/fyrverkeri
   fulla, lugna partier morkare. Tillbaka: `--env DMX_HEARTBEAT=0`.
4. Effekterna med ogat: forvarning (nedrakning fore refrangen), basgang/chase/eko/stege pa basnoter, tyngdlyft/gravity/ripple pa PA:n,
   variationen. For platta -> skalan 6/9 dB; for mycket 'forsta chansen' -> `--env DMX_MIX_UNSEEN_BONUS=0`.
5. Det som ska bli kvar skrivs in i ladan.py SHOW_ENV (inte bara pa Pi:n) och committas.
0. (fore steg 1) DYNAMIKEN FRAN 09-22 KVALL AR KVAR - bevisat i banken 09-23 em: fast effekt (mono), ladans env, pop_ladan 60-300 s:
   HEAD ar BIT-IDENTISK med morgonens checkpoint 71ea88e (ladans kod 09-22) - 0 av 9000 ramar skiljer, max-lampa 0 DMX-steg. Mot
   commiten 22:47 (dbc5947) skiljer bara fyra nycklar som den koden inte kande: DMX_FLOOR_CH, DMX_TIER_HI/LO (byggda under ladan-passet,
   committade 06:58) och DMX_SECTION_ON_HINT (morgonen). Med gemensamma nycklar: 0 diff. FORSTA KOLLEN PA PLATS: `kolla.py` - star
   DMX_FLOOR_CH/DMX_TIER_HI i Pi:ns lotus.conf? Ja = de var live i gar. Nej = golvet 16 % och tier-gransen 0,55 ar NYA mot i gar (bedom).
   Smart-laget skiljer sig (korrelation 0,83, medel +6 %, slagskala 0,094 -> 0,073 pa pop) - det ar EFFEKTVALEN (mix v2 + nya effekter),
   inte ljuskurvan; kanns det tammare ar aterstallningen `--env DMX_MIX_V2=0`.
