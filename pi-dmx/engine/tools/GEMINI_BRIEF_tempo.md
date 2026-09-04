# Brief till Gemini: tempo-lås vid låtbyten i pi-dmx (analyser.ts)

## Systemet i korthet
Realtids-beat-tracker på Raspberry Pi Zero 2 W (aux-in, 48 kHz, hop 128 → 375 Hz). Driver ett "heartbeat"-ljus (DMX-lampor pulsar på slaget). Kärnan i `analyser.ts`:
- Onset-envelope (100 Hz ring, 5 s) → **tempogram** = längdnormaliserad autokorrelation + **comb-filter** `ac[L] + 0.5·ac[2L] + 0.33·ac[3L]`, lokal whitening (1 s glidande medel), × **log-Gauss-prior** (bredd 0.7, centrum = 1.5×BPM_MIN).
- **Oktavvikning** till exakt en oktav `[BPM_MIN, 2×BPM_MIN)` — MAX måste vara 2×MIN, annars terminerar vikningsloopen inte. Fönstret är växlingsbart via env: **100–200 för dans-megamix, 80–160 för vanliga festlåtar** (annars dubblas 80–100-låtar).
- Låsmaskineri: `WARM_N=48` estimat före första lås; glid (ratio 0.9–1.11); oktavröstning `OCT_UP=24` / `OCT_DOWN=8` (bara om `!committed || overwhelming`, `committed = bpmStable ≥ 24`); grannrättning NEAR (8 röster, 3 i reacq) med harmoni-veto `HARM_TOL=0.035`, `HARM_PENALTY=6` mot 4/3 & 3/4; **låtbytes-utmanare** NEWSONG med `needMs = rival>2.5 ? 1500 : rival>1.6 ? 4000 : 25000`; konfidens-släppning (conf<0.3 i 8 s → `hintTrackChange`: reacq-fönster 5 s, tempogram skalas `TG_KEEP`, röster nollas); tystnads-släppning (350 ms).
- `computeBpm()` körs ~100 Hz olåst, 4 Hz låst.

## Målet
Heartbeat ska följa tempot **snabbt vid låtbyten i en kontinuerlig mix** (beatmatchad/crossfadad, ingen tystnad).

## Vad vi MÄTT (facit-metod: 10 min riktig megamix genom den riktiga analysatorn, deterministisk offline-replay, sanning från ägarens öra)
- **Kallstart låser på 1,13 s.** Inte problemet.
- **Vid låtbyten: 13 / 4 / 14 s fel tempo.** Det felaktiga tempot är **exakt 2/3 av det föregående** (112/172 = 0.651, 125/188 = 0.665) — subharmonik, inte riktiga byten. Heartbeat pulsar då i 2/3-takt.
- **Spårning per gren** visar tre olika vägar in i felet: (1) NEWSONG — utmanaren tog subharmoniken som "ny låt", `rival = 55` (tempogrammet 55× starkare vid 2/3 än vid sanningen); (2) tystnad 350 ms → låset öppnas → OCT-DOWN (8 röster, oskyddat) → 2/3; (3) conf→0 → hint → NEAR landar lågt → trög OCT-UP (24 röster) tillbaka.
- **Gemensam rot:** under crossfaden är tempogrammet en blandning av gammal+ny låt, och comb-filtrets `ac[3P]`-term får 2/3-kandidaten (lag 1.5P) att "låna" styrka från `ac[3·1.5P] = ac[4.5P]`… i praktiken dominerar subharmoniken tills crossfaden är över (~10 s).
- **Det befintliga rå-AC-vetot mot subharmoniker är dött:** vid byten är `rawLock ≈ -0.001` och `rawCh ≈ 0.004` (whitenad envelope, inga rena anslag under crossfade) → grinden `rawLock > 0` faller → vetot fyrar aldrig. Rå AC kan inte diskriminera under en crossfade.

## Vad vi TESTAT som INTE hjälper (sekunder fel vid de tre bytena; baslinje 13/4/14 = 31 s, 5 tempohopp/10 min)
| ändring | resultat |
|---|---|
| Ljudklocka (slagtid ur ljudflödet i st.f. väggklocka) | irrelevant: fas-precision på ett redan låst tempo, inte låshastighet; A/B visade ingen vinst |
| `OCT_UP` 24→12, `OCT_DOWN` 8→24, `RELOCK_K` 2→1.5, kombo | **oförändrat** — excursionen går inte via oktavröstningen |
| Kvot-guard: kandidat = 2/3 el. 1/2 av senast committade → 4× bevis | 13→10 s på ETT byte, inget annars |
| **Snäv prior 0.7→0.4 / 0.2** | **skadlig**: 13 resp. 11 hopp/10 min (2–2,6×), +7–11 s fel. 0.7 var mätt på 23 låtar; ett spetsigt 125-centrum belönar 4/3-artefakten (95×4/3 = 127) |
| Comb 3:e harmonik 0.33→0.15 | något sämre (13→16 s) — `ac[3P]` bär även det sanna tempots bevis |
| `HARM_TOL` 0.035→0.05 + straff 12 | **enda vinsten: 2 s** på ett byte (fångade 0.782 ≈ 3/4), noll nya hopp |
Steady-state-median oförändrad i alla varianter (171 / 187 / 131).

## Randvillkor
- Får inte försämra steady-state (5 hopp/10 min i dag).
- Riktiga byten till exakt 2/3 finns (t.ex. 180→120) → ett hårt förbud mot 2/3 är fel; det måste vara bevisbaserat.
- CPU-budget: Pi Zero 2 W, allt körs per hop. Inga tunga extra transformer.
- Vi har en offline-harness — **varje förslag kan mätas på minuter** på samma inspelning med känt facit.

## Det öppna problemet vi vill ha idéer på
Hur får vi om-låset vid ett byte att **inte gripa 2/3-subharmoniken** (eller återhämta sig på 2–4 s i st.f. 13), när comb-filtret skapar artefakten och rå-AC inte kan skilja under crossfade?

Riktningar vi funderar på:
1. **Harmonisk kontinuitet vid om-lås:** föredra kandidater med kvot 1, 2, 0.5 mot senast committade tempot framför 2/3, 3/2, 4/3, 3/4 — men bevisbaserat, inte förbud.
2. **Snabbare tempogram-rensning vid detekterat byte** (`TG_KEEP`, EMA-alfa) så gamla låtens `ac[3P]`-förorening försvinner fortare.
3. **En bättre subharmonik-diskriminator än rå AC under crossfade:** t.ex. anslagstäthet per period (ett äkta 2/3-tempo har färre anslag/period), eller bas-onset-envelopen (`envBassRing`) vid kandidatens lag vs 1.5× lag.
4. Något vi inte tänkt på?

Konkret fråga: givet mätningarna ovan — vad skulle du ändra, och hur skulle du validera det offline?

---

# RESULTAT av dina tre förslag (mätt samma kväll)

Alla tre implementerade env-gated och körda på megamix-facit **+ carryOver.mjs + bench.sh + testBpmHard** (defaults verifierade byte-identiska: 600/600 s, 10/10 scenarier).

| förslag | megamix fel (38/305/564) | hopp/10 min | korpus-bänkar |
|---|---|---|---|
| baslinje | 13 / 4 / 14 = 31 s | 5 | carryOver 87,5 % · bench 43,8 % · stranden 75,1 % |
| **#1 pulse-veto** | 13 / 4 / 14 = 31 s | 6 | — |
| **#2 ghost-wait 12 s** | 9 / 4 / 14 = 27 s | 5 | — |
| **#3 adaptiv alfa 0,35** | 13 / 10 / 11 = 34 s | **12** | — |
| ghost + oktav/NEAR-guard ×8, **bara 2/3** | **0** / 6 / 14 = **20 s** | **3** | **87,5 % · 43,8 % · 75,1 % (oförändrat)** |
| samma + HARM_TOL 0,05 / straff 12 | 0 / 6 / 12 = 18 s | 3 | **72,5 % · 36,3 % · stranden 45,1 %** ✗ |

**#1 motbevisad av din egen valideringsidé:** vid det felaktiga hoppet har *fantomen* HÖGRE pulse än låset (`pCh=0.25, pLock=0.17`, kvot 1,48) — och kvoten är densamma (1,48–1,68) vid det korrekta återhoppet. `pulse[lag]` = max över faser av medel(`envPos`) → ett längre lag samplar färre men starkare positioner. Signalen skiljer inte rätt från fel.

**#3 skadlig:** snabbare rensning gör låset skakigt (hopp 5→12) och försämrar @305.

**#2 var rätt spår men bara en av tre dörrar.** Med 12 s väntan håller låset 171 till t=42 — sedan tar **OCT-DOWN** över (spåret: `OCT-DOWN 171→114, nsv=700`). Exakt din analys: 0,666 < 0,7 → oktavfacket, 8 röster, och `!committed` efter hinten. Längre väntan (14–25 s) ändrar ingenting.

**Din oktav-guard-idé stängde den dörren:** ghost-wait (NEWSONG) + samma bevis-multiplikator ×8 på OCT-DOWN och NEAR (mot senast *committade* tempo, ej det aktuella) → @38 går från 13 s till **0 s**, 171 hålls rakt genom crossfaden. ×3 räcker inte (24 röster fyrar inom faden), ×8 håller, ×20 ger inget mer. Pris: ett *äkta* 2/3-byte (@305, 131 var riktigt) tar +2 s.

**Fällan bänkarna avslöjade:** att bredda HARM (0,05 / straff 12) och/eller guarda **3/4** ser också *rättningen av ett felaktigt förstalås* som ett spöke — `stranden` låser färskt på 155 (=4/3 av 114) och rättningen 155→114 (kvot 0,735) blockeras → 75→45 %. Isolerat: det var HARM-breddningen, inte 3/4 i ghost (r2 = r1). Alla uppmätta comb-fantomer är **2/3** — guarden hålls där. 1/2 lämnas snabb, som du föreslog.

**Kvar:** @564 (14 s) är inte en harmonik — 183-låtens tvetydiga intro (kvot 0,78 mot 142). Idéer för den?

---

# @564 — resultat av "dead-beat" och "conf-bleed"

**Diagnosen höll inte, och spåret visar varför.** Jag la en intern-trace (`rival`, `rawLock`, `conf`, `nsv`, `needMs`) inne i NEWSONG-blocket över hela 556–580: **noll rader.** Blocket kör aldrig vid @564 — låtbytesvakten kräver ett *committat* lås (`bpmStable ≥ 24`), och efter `hintTrackChange` (conf=0 vid 560,6) är `bpmStable = 0`. Det finns ingen utmanare att kapplöpa med. Kedjan är:

`HINT (560,6) → NEAR tar 142→111 på 3 röster i reacq (563,9) → OCT-UP 24 röster tillbaka 117→183 (577,4)`

Därför: **dead-beat och conf-bleed = exakta no-ops** (14 s, byte-identiska förlopp, även ovanpå r1). De sitter kvar env-gated *före* ghost-wait (så 2/3-guarden alltid vinner — ordningen du bekräftade), men de gör inget här.

**De två riktiga spakarna för denna kedja, mätta med korpus-bänkar + testBpmHard:**

| ändring | @564 | total | hopp | carryOver | bench/stranden | testBpmHard |
|---|---|---|---|---|---|---|
| r1 (ghost + guard ×8) | 14 s | 20 s | 3 | 87,5/95,7 | 43,8 / 75,1 | — |
| **r1 + `OCT_UP` 24→12** | **11 s** | **17 s** | 3 | 87,5/95,7 | 43,8 / 75,1 | **identisk** |
| r1 + NEAR-röster i reacq 3→8 | 14 s | 20 s | 3 | 87,5/95,7 | 43,8 / 75,1 | — |

- `OCT_UP` 12: klättringen kommer 3 s tidigare, noll regression. (Guarden stryper den *inte* — den testar bara 2/3; 183/142 = 1,29.)
- Fler NEAR-röster: skjuter bara upp det felaktiga 111-låset 2 s, landar sen ändå. Nettonoll.
- Resterande ~11 s är introts genuint tvetydiga rytm (~115). Ingen låslogik kan veta "183" innan slaget faktiskt kommer — det ser ut som den fysiska gränsen för just det introt.

**Slutlig kandidat: `DMX_GHOST_WAIT=1 DMX_SUBH_GUARD=1 SUBH_MULT=8 OCT_UP=12` → 31 → 17 s (−45 %), hopp 5 → 3, steady identisk, alla bänkar oförändrade.** Caveat: OCT_UP höjdes en gång 8→24 på material (real/utandig) som redan ligger på 0 % i vår bench och därför inte kan skilja — live-validering krävs innan defaults flippas.

Öppen fråga till dig: finns det något i *introt* (före första riktiga slaget) som kan avslöja 183 tidigare — t.ex. hi-hat-/onset-täthet i `envRing` som redan ligger i 183-raster fast basen saknas? Det är det enda som skulle kunna bita på de sista 11 s.
