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
Ingångens volym (dB) i ett fönster som följer musiken självt → 0..1 → upphöjd till kurvan → dämpning på effektens färger.
Direkt upp, kort ner, aldrig över effekten. Drop släpper dämpningen. Godkänd i ladan 10-08 ("mycket bättre nu").
| Ratt | Standard | Vad den gör |
|---|---|---|
| `DMX_E_WIN_S` | 20 | Hur snabbt fönstrets topp/botten följer musiken (s). Kortare = större svängningar, mindre vers/refräng-skillnad. |
| `DMX_E_MIN_DB` | 4 | Fönstrets minsta bredd i dB. Smalare = mer svängning när musiken är jämn. |
| `DMX_E_CURVE` | 2 | Kurva (ögat är logaritmiskt): 1,5 = ljusare lugna partier, 3 = mörkare. |
| `DMX_E_RELEASE_MS` | 100 | Hur snabbt dämpningen följer när volymen faller. |

## 3. Utgången (en mappning, sista steget)
Effektens 0 = släckt. Färg 1–100 % → lampans tändpunkt+1 … tak (kulören bevaras). DIM 1–100 % → golv+1 … `MAP_TOP` × lampans fullpunkt; bara full drop går förbi mappningen, till 255.
| Ratt | Standard | Vad den gör |
|---|---|---|
| `DMX_FLOOR_CH` | 40 | DIM-golvet i DMX-steg (0–255). |
| `DMX_MAP_TOP` | 0,95 | Taket (andel av fullpunkten) för allt — även minidrop och nästan-drop. Bara full drop går förbi, till 255. |
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
| `DMX_EFFECT_HEART` | 1,4 | Effekternas egen hjärtpuls (djup). |
| `DMX_PULSE_GAP_BEAT` | 0,75 | Minsta tid mellan pulser i SLAG (tar bort dubbeltakt vid ~90 BPM). |
| `DMX_PULSE_GAP_MS` | 250 | Fast golv för pulsgrinden när tempot är okänt. |
| `DMX_ATTACK_MS` | 20 | Lampans uppgång. |
| `DMX_FADE_MIN_S` | 0,25 | Lampans uttoning — **snabbare är förbjudet** (ägaren 09-29). |

## Prov som inte är standard
Inga just nu (ladan 10-08).
