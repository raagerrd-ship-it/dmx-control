# Trimrattar på ljusvägen

*Ägarens trimyta (2026-10-08). Kedjan: ljud in → effekt 0–100 % → energi (bara dämpning) → en mappning i utgången.
Allt annat är kod. Ändra en ratt i ladan med `python tools\ladan.py --env K=V` (alla prov på samma rad, annars försvinner de);
det ägaren godkänner blir kodens standard, inte en drop-in.*

## 1. Ingången
| Ratt | Standard | Var | Vad den gör |
|---|---|---|---|
| Släckgräns | 0,015 (cfg) | /setup, eller `DMX_SILENCE_LEVEL` (låser reglaget) | Under denna nivå är riggen svart. |
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
| `DMX_NEAR_DROP_SWITCH` | på | Dirigenten byter look på nästan-drop (=0 av). |
| `MINI_DROP_ENV` | 0,9 | Minidropens ljuslyft (bara ljusstyrka, kulören kvar; full drop har dropfärg + vit kärna). |
| `MINI_BANG_MS` | 150 | Hur länge minidropens lyft håller. Minidrops har ingen spärr, så längre = ljuset fastnar högt. |

## 5. Puls och ballistik
| Ratt | Standard | Vad den gör |
|---|---|---|
| `DMX_EFFECT_HEART` | 1,4 | Effekternas egen hjärtpuls (djup) – den enda pulsen sedan 10-10 (dimmerpulsen borta). |
| `DMX_ATTACK_MS` | 20 | Lampans uppgång. |
| `DMX_FADE_MIN_S` | 0,25 | Lampans uttoning — **snabbare är förbjudet** (ägaren 09-29). Gäller ljusstyrkan: kulören byts direkt (ägaren 10-09: "det är ju bara energi som har begränsning på sin nedtoning"), ballistiken körs per lampa på starkaste färgkanalen. |

## 6. Dirigenten och takten (standard 10-10)
- Alla 44 effekter kan väljas: snap ≥ 115 BPM, rave ≥ 120, strobe ≥ 150 (ägaren 10-09), gravity bas ≥ 0,20; en uppbyggnad som hållit 1,5 s ger ett byte till build-effekterna; bland de bäst passande väljs den som spelats minst.
- Analysatorns tempo (DMX-profilen `src/analyserProfile.ts`, inte den delade `analyser.ts`): `TEMPO_SHIFT` 1 (följer tempolyft inom låt), `TEMPO_HOLD` 1 (takten hålls över kort paus, 0,35–10 s). Lotus har dem av.

## Prov som inte är standard
Inga just nu. Kvällen 10-09 blev standard 10-10 (bit-identiskt bevisat); borttagna prov: `DMX_E_SLOW_MS`, `DMX_HUE_CUT_MS`, `DMX_DIM_PULS`, `DMX_CH_MAP`, flaggorna `DMX_HUE_CUT`/`DMX_ALLA_LOOKER`/`DMX_E_GATE`/`DMX_E_LIN` (nu enda vägen).
