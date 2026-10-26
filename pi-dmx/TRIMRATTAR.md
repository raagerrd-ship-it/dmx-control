# Trimrattar på ljusvägen

**TRE STEG (ägaren 2026-10-10):** 1) **Effekten** sätter ljusstyrka per lampa och per R/G/B, och om ljuset får ändras efter (`modulate.energy`);
den gemensamma effektnivån (topp-normering `DMX_E_NORM_S`, grundnivå `DMX_FX_FLOOR`, minidrop-lyft, drop-looken) hör till effekten.
2) **Energin** (om effekten tillåter) + **en uttoning** (`DMX_FADE_MIN_S`, justerbar; kulören direkt). 3) **Kalibreringen** sist (gamma,
tändpunkt+1 … 95 %, full drop → 100 %, dimmern konstant). Inget annat rör ljuset. Backup: git-taggarna `backup/fore-ett-ljus-2026-10-10`, `backup/fore-tre-steg-2026-10-10`.

*Ägarens trimyta (2026-10-08). Kedjan: ljud in → effekt 0–100 % → energi (bara dämpning) → en mappning i utgången.
Allt annat är kod. **Sedan 2026-10-22 (flaggstädningen) är rattarna KONSTANTER i koden, inga env-rattar** - namnen nedan
(`DMX_...`) är konstanternas gamla env-namn och visar var värdet bor. Ett live-prov = en tillfällig env-flagga i koden under provet
(`python tools\ladan.py --env K=V`); godkänt -> konstant, underkänt -> koden bort. Bortvalda prov: minnet feedback-kodstadning-flaggor.*

## 1. Ingången
| Ratt | Standard | Var | Vad den gör |
|---|---|---|---|
| Släckgräns | 0,015 (cfg) | /setup (enda källan sedan 10-11) | Under denna nivå är riggen svart. |
| Ingångsförstärkning | Aux −18 dB, Mixin PGA 0 dB | `src/server.ts` applyInputRouting | 0 dB/+6 dB och −6 dB klippte i kodeken (mätt 10-07/08). Mixern behöver inte sänkas. |

## 2. Energin (en faktor, kan bara dämpa)
Ingångens volym (dB) i ett fönster som följer musiken självt → 0..1 (allt över `E_TOP` = fullt) → upphöjd till kurvan, räknad som
andel av DMX-utgången (efter gamman) → dämpning på effektens färger. Tystnad flyttar inte fönstret. Direkt upp, kort ner, aldrig över
effekten. Drop släpper dämpningen. Godkänd i ladan 10-08; överdriven och lyft i toppen i ladan 10-09 (standard 10-10).
| Ratt | Standard | Vad den gör |
|---|---|---|
| `DMX_E_WIN_S` | 10 | Hur snabbt fönstrets topp/botten följer musiken (s). Kortare = större svängningar, mindre vers/refräng-skillnad. |
| `DMX_E_MIN_DB` | 4 | Fönstrets minsta bredd i dB. Smalare = mer svängning när musiken är jämn. |
| `DMX_E_CURVE` | 10 | Kurva i DMX-procent: högre = mer dynamik (mörkare lugna partier). Ladan 10-09: 3 → 7 → 10. |
| `DMX_E_TOP` | 0,95 | Energin räknas som full ovanför detta (lyfter toppen utan att lyfta mitten). 0,9 lyfte mitten = dynamiken försvann (förkastat 10-09). |
| `DMX_E_RELEASE_MS` | 100 | Hur snabbt dämpningen följer när volymen faller. |
| `DMX_E_NORM_S` | 2 | Effektens topp (alla lampor, följd över så många s) skalas till 100 % innan energin dämpar. 0 = av. |
| `DMX_FX_FLOOR` | 0,6 | Grundnivå mellan slagen: en tänd lampa lyfts mot denna andel (släckt förblir släckt). Grundare puls. |

## 3. Utgången (en mappning, sista steget)
EN VÄG (10-10): effektens 0 = släckt, färg 1–100 % → lampans tändpunkt+1 … `MAP_TOP` (95 %), kulören bevaras; bara full drop öppnar till 100 %. **Dimmern är en konstant** (lampans fullpunkt) – inget i motorn räknar på den. Backup före: git-taggen `backup/fore-ett-ljus-2026-10-10`.
| Ratt | Standard | Vad den gör |
|---|---|---|
| `DMX_GAMMA` | 1,6 | Effektens 0..1 → DMX som v^gamma (var 2,2: 0,5 → 22 %). Lägre = starkare mellanlägen. |
| `DMX_MAP_TOP` | 0,95 | Färgens tak — även minidrop och nästan-drop. Bara full drop går förbi, till 100 %. |
| Släckpunkt per lampa | 16 | /setup → lampan → Alla/R/G/B: dra tills den precis tänder, Spara (`cal.on`, `onR/G/B`). |
| Fullpunkt per lampa | 255 | /setup → lampan → Full: lampan lyser vitt, dra DIM tills den inte blir ljusare, Spara (`cal.full`; MÄTT i ladan 10-08: lamporna blir ljusare ända till 255 ⇒ fullpunkt 255 = standard; stegtestet 10-01 (~85) gäller inte). |

## 4. Drops och nästan-drops
| Ratt | Standard | Vad den gör |
|---|---|---|
| `DMX_DROP_MIN_GAP_S` | 15 (ladan) | Högst en drop per så många sekunder. |
| `DMX_NEAR_MIN` / `DMX_NEAR_MAX` | 0,5 / 0,85 | Nästan-dropens lyft, andel av en full drop. |
| `DMX_NEAR_RISE_DB` / `DMX_NEAR_DIP_DB` | 10 / 8 | Hur stort språng efter hur djup dipp som räknas. |
| (nästan-drop byter look) | alltid | Av-brytaren `DMX_NEAR_DROP_SWITCH` borttagen 10-10. |
| `MINI_DROP_ENV` | 0,9 | Minidropens ljuslyft (bara ljusstyrka, kulören kvar; full drop har dropfärg + vit kärna). |
| `MINI_BANG_MS` | 600 | Längsta tid minidropens stöt håller. Sedan 10-21 släpps den (och takets lyft `DMX_MINI_LIFT_MS` 4000) när baskroppen fallit under halva lyftet - tidigast efter `DMX_MINI_E_MIN_MS` (250 ms). Ladan 10-21: stöt 0,31 s, tillbaka på nivån 0,9 s. |
| `DMX_MINI_E_MIN_MS` | 250 | Minsta tid minidropens stöt syns innan energin får släppa den (ägaren 10-21: 'ändå ett drop som syns'). |
| `DMX_SECTION_UNIT_MIN_MS` | 2000 (10-21, var 4000) | Dirigenten byter look först när sektionen hållit så här länge (skydd mot detektorfladder). |
| `BODY_GONE_MIN_MS` (DMX-profilen) | 4000 | Riktig drop kräver så långt break före (var 2000; ägaren 10-10: "hellre färre drops, mini fångar dom"). |
| `DMX_FLANK_SHORT_S` | 1 (standard 10-17) | Kort break (≥ 1 s) räcker för full drop om breaket ligger ≥ 24 dB (`DMX_FLANK_SHORT_RISE_DB`) under taket. Ägaren 10-16: 'dropparna känns bra'. 0 = av. |
| `DMX_STOP_MINI_S` | 0,6 (standard 10-17) | Basen borta 0,6–3 s mitt i refrängen och tillbaka → minidrop-looken. Ägaren 10-16: 'minidropparna känns bra, behåll'. 0 = av. |
| `DMX_BASS_SUBKICK` | 1 (standard 10-17) | Basenergin ur sub+kick (20–120 Hz) i stället för baskroppen 20–250 Hz. Ägaren 10-16: 'känns bättre, behåll'. 0 = bodyDb. |
| `DMX_DROP_LIFT_MS` / `DMX_DROP_LIFT_FALL_MS` | 8000 / 3000 (standard 10-17) | Efter en drop släpper energin dämpningen i så många ms och glider tillbaka på FALL (var 4000/1500; ägaren: 'energi efter drop dör fort'). |
| `DMX_DROP_LIFT_HIGH` | på (standard 10-17) | Lyftet håller så länge sektionen är refräng (high) efter dropen. 0 = av. |
| `DMX_DROP_BASS_LOOK` | på (standard 10-17) | En drop byter till en basstark full-effekt (bas ≥ 0,6, punch ≥ 0,75) om looken inte redan är basstark. 0 = av. |

## 5. Puls och ballistik
| Ratt | Standard | Vad den gör |
|---|---|---|
| `DMX_EFFECT_HEART` | 1,4 | Effekternas egen hjärtpuls (djup) – den enda pulsen sedan 10-10 (dimmerpulsen borta). |
| `DMX_FADE_MIN_S` | 0,25 | STEG 2: den ENDA uttoningen (lampans ljusstyrka; upp direkt) — **snabbare är förbjudet** (ägaren 09-29). Gäller ljusstyrkan: kulören byts direkt (ägaren 10-09: "det är ju bara energi som har begränsning på sin nedtoning"), ballistiken körs per lampa på starkaste färgkanalen. |

## 6. Dirigenten och takten (standard 10-10)
- **LÖPANDE TAKT (10-19, enda vägen):** taktrutnätet läggs var 250:e ms direkt på kickbandets anslag (vikning av de senaste 5 s, tempo ±2,5 % kring rutnätets och analysatorns), inget lås och ingen PLL. Analysatorns BPM = första lås + sökcentrum + dirigentens val. Inga rattar. Backup: git-taggen `backup/fore-lopande-takt-2026-10-19` (kick-PLL, `DMX_TEMPO_PERSIST_S`, `DMX_PHASE_FOLLOW`, Beat-synk-reglaget).
- Toggle-effekter (`EffectDef.toggle`, lampgrupper som slår om per slag) får ingen grundnivå `DMX_FX_FLOOR` (den mörka gruppen är mörk) och dirigenten tar vartannat look-byte ur dem när takten är låst och tilliten ≥ 0,85 (10-10). Minsta hålltid per look 8 s (ägaren: ligger).
- Alla 44 effekter kan väljas: snap ≥ 115 BPM, rave ≥ 120, strobe ≥ 150 (ägaren 10-09), gravity bas ≥ 0,20; en uppbyggnad som hållit 1,5 s ger ett byte till build-effekterna; bland de bäst passande väljs den som spelats minst.
- Sektionen efter drop (DMX-profilen, standard 10-19, ägaren: 'refrängen håller efter dropen'): `SECTION_BODY_HIGH` 2000 ms / `SECTION_BODY_HIGH_DB` 2 - basen tillbaka nära toppen efter ett break = 'high' direkt, förbi builden. Backup: `backup/fore-section-body-high-2026-10-19`.
- Analysatorns tempo (DMX-profilen `src/analyserProfile.ts`, inte den delade `analyser.ts`): `TEMPO_SHIFT` 1 (följer tempolyft inom låt), `TEMPO_HOLD` 1 (takten hålls över kort paus, 0,35–10 s). Lotus har dem av.

- **Standard 10-26 (ägaren i ladan, backup-tagg `backup/fore-fyra-prov-2026-10-26`):** låtmanuset väljer bland de 2 bäst rankade (`MANUS_TOP` 2) så refrängen hör ihop med versen; sektionens lookbyte väntar in nästa slag (`SWITCH_ON` 1, högst 1,25 slag); breaket tar toggle-looker bara ur sina egna effekter (lugnt break); taggrättningen (svall/famn/droppar/startskott/blixtnedslag/mellanslag/pump på tier fart, pulse/stegring/sug i build-looken, bara aurora kräver lugnt tempo). Konstanter i `effects.ts` och effektfilerna, inga rattar.

## Borttagna reglage 10-10 (döda: lästes inte av motorn, bänken json-identisk)
Config/stämningar/server/UI: `beatPulse`, `calmDecay` ("Tröghet"), `energyCeiling`, `clubMode`, `ambientGlow`, `strobeUnlimited` ("Släpp strobe-taket" — RGB-stroben blixtrar en gång per slag vid ≥ 150 BPM, lampornas strobe-kanal drivs inte), `regiPro` (styrde bara om stämningen fick sätta drop-blackout; nu äger ägaren drop-blackout själv). Oanvända `STROBE_SAFE_HZ/MAX_HZ`, `SECTION_HIGH_LIFT/BREAK_DIP/LOW_DIP`, `STROBE_MIN_BPM` i effects.ts. Env-brytare (standardvägen är enda vägen): `DMX_NEAR_DROP`, `DMX_NEAR_DROP_SWITCH`, `DMX_GROUP_ALT`, `DMX_SECTION_TRACE`, `DMX_CALM_FROM_BREAKING`.

## Prov som inte är standard
Inga just nu. Kvällen 10-09 blev standard 10-10 (bit-identiskt bevisat); borttagna prov: `DMX_E_SLOW_MS`, `DMX_HUE_CUT_MS`, `DMX_DIM_PULS`, `DMX_CH_MAP`, flaggorna `DMX_HUE_CUT`/`DMX_ALLA_LOOKER`/`DMX_E_GATE`/`DMX_E_LIN` (nu enda vägen).
