# Trimrattar på ljusvägen

*Ägarens trimyta (2026-10-08). Kedjan: ljud in → effekt 0–100 % → energi (bara dämpning) → en mappning i utgången.
Allt annat är kod. Ändra en ratt i ladan med `python tools\ladan.py --env K=V` (alla prov på samma rad, annars försvinner de);
det ägaren godkänner blir kodens standard, inte en drop-in.*

## 1. Ingången
| Ratt | Standard | Var | Vad den gör |
|---|---|---|---|
| Släckgräns | 0,015 (cfg) | /setup, eller `DMX_SILENCE_LEVEL` (låser reglaget) | Under denna nivå är riggen svart. |
| Ingångsförstärkning | Aux −6 dB, Mixin PGA 0 dB | `src/server.ts` applyInputRouting | Före 10-07 överstyrd (22–29 % klippta sampel). Sänk mixerns aux om det klipper ändå. |

## 2. Energin (en faktor, kan bara dämpa)
Faktor = golv..1 ur analysatorns sektionsenergi (`frame.intensity`), direkt upp, kort ner, på effektens färger. Drop släpper dämpningen.
| Ratt | Standard | Vad den gör |
|---|---|---|
| `DMX_E_FLOOR` | 0,15 | Hur mörkt det lugnaste får bli. |
| `DMX_ENERGY_LO` | 0,05 | Sektionsenergi som ger golvet (intensity går i praktiken sällan under ~0,3). |
| `DMX_ENERGY_HI` | 0,85 | Sektionsenergi som ger fullt. |
| `DMX_E_RELEASE_MS` | 400 | Hur snabbt dämpningen följer när energin faller. |

## 3. Utgången (en mappning, sista steget)
Effektens 0 = släckt. Färg 1–100 % → lampans tändpunkt+1 … tak (kulören bevaras). DIM 1–100 % → golv+1 … `MAP_TOP` × tak; drop öppnar resten.
| Ratt | Standard | Vad den gör |
|---|---|---|
| `DMX_FLOOR_CH` | 40 | DIM-golvet i DMX-steg (0–255). |
| `DMX_MAP_TOP` | 0,95 | Taket för vanlig show; drop får 100 %. |
| `DMX_DIM_MAX` | 255 | Lampans verkliga fulla DIM (stegtest 10-01: ~85). |
| Tändpunkt per lampa | 16 | Kalibreringen i /setup (`cal.on`, `onR/G/B`). |

## 4. Drops och nästan-drops
| Ratt | Standard | Vad den gör |
|---|---|---|
| `DMX_DROP_MIN_GAP_S` | 15 (ladan) | Högst en drop per så många sekunder. |
| `DMX_NEAR_MIN` / `DMX_NEAR_MAX` | 0,5 / 0,85 | Nästan-dropens lyft, andel av en full drop. |
| `DMX_NEAR_RISE_DB` / `DMX_NEAR_DIP_DB` | 10 / 8 | Hur stort språng efter hur djup dipp som räknas. |
| `DMX_NEAR_DROP_SWITCH` | på | Dirigenten byter look på nästan-drop (=0 av). |
| `MINI_DROP_ENV` | 0,9 | Minidropens ljuslyft (bara ljusstyrka, kulören kvar; full drop har dropfärg + vit kärna). |

## 5. Puls och ballistik
| Ratt | Standard | Vad den gör |
|---|---|---|
| `DMX_EFFECT_HEART` | 1,4 | Effekternas egen hjärtpuls (djup). |
| `DMX_PULSE_GAP_BEAT` | 0,75 | Minsta tid mellan pulser i SLAG (tar bort dubbeltakt vid ~90 BPM). |
| `DMX_PULSE_GAP_MS` | 250 | Fast golv för pulsgrinden när tempot är okänt. |
| `DMX_ATTACK_MS` | 20 | Lampans uppgång. |
| `DMX_FADE_MIN_S` | 0,25 | Lampans uttoning — **snabbare är förbjudet** (ägaren 09-29). |

## Prov som inte är standard (ladan 10-07, väntar på ägarens beslut)
`DMX_DIM_MAX=85`, `DMX_MINI_FULL=1` (minidrop väljer full-poolen), `DMX_ALSA_BUFFER=8192`, `DMX_E_RELEASE_MS=200`, `DMX_ENERGY_LO=0.3`, `DMX_ENERGY_VOL=1` (ren volym, ej provad live).
Godkänt ⇒ standard och den gamla vägen bort samma gång. Inte godkänt ⇒ ratten tas bort.
