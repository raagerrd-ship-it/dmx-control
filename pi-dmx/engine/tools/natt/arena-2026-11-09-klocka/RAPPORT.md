# Arenan klocka 2026-11-09: EN KLOCKA FÖR BÅDA (DMX och lotus)

**Ägaren 09:00:** "Jämför delarna, och kolla vad som fungerar bäst. Skapa sedan en enda. Känns jättedumt som vi sagt hela kvällen att köra
två olika funktioner för samma sak..."

**Domarna:**
- DMX: `tools/arena/tvavagar.py`, övning och kontrollmängd, alla spärrar från entempo. Lampspridningen döms på medlet.
- Lotus: nya `tools/arena/lotusbank.py` (2a164c6). Den kör lotus tempobänk (503 fryst korpus + 8 syntet, lotus LIVE-env) på en variants delade filer. `--bas` ger byte-identiskt samma resultat som lotus egen kopia.

**Vinnaren = vin = a3f + a8f:s D4.** Den är kod i den här committen (backup-tagg `backup/fore-enklocka-20261109`).
- Lotus egen temposökning (OWN_TEMPO, computeBpm, scoreEnv/alignScore/shiftDetect, tempoGramStep, offBeatStep, lotus gridfas, barAcc) är BORTTAGEN.
- Båda profilerna kör analyserClock: DMX och lotus i workern (sys.BEAT_FEED 'slow' är standard, 'inline' i process()).
- Fasen och ettan publiceras i ramen (publishPhase). setBeatGrid är inte längre ett rutnät.

## Baslinje och resultat (lotus-bänk, 503 + syntet)
| | A lotus i dag | B klockan (kärnan) | r0 | **vin** |
|---|---|---|---|---|
| korpus rätt | 396 | 441 | 474 | **463** |
| syntet | 6/8 | 5/8 | 6/8 | **6/8** |
| on-beat-recall | 0,84 | 0,84 | 0,84 | 0,84 |
| fas median / motfas / i fas | 0,88 / 33 / 238 | 0,82 / 21 / 248 | 0,84 / 15 / 257 | 0,84 / 16 / 253 |
| fas parat på samma låtar som A | – | 0,88 | 0,87 | ~0,87–0,88 |
| följarens puls (offset) | 0,90 (36 ms) | 0,95 (24) | 0,96 (23) | 0,95 (22) |
| tempospridning inom låt | 9 BPM | 33 | 22 | 33 |

**DMX:** vin är DMX-md5-IDENTISK med bas på övningen, på kontrollmängden (+0,00 båda) och på sex extra lang-filer (a3f). Hela lang1021 och megamix efter bygget i engine/dist: 46fb14899f… / e613724126…. DMX-ljuset ändras alltså inte.

## Per del (ägarens metod: A, B, sammanslagning)
| del | A (lotus) | B (klockan) | sammanslagning | val och skäl |
|---|---|---|---|---|
| tempovalet | 396/503, DMX DISK om A ensam (a2: −15,2, mix_klocka 89,9, gridfel 88) | 441/503, DMX bas | a3:s toppröst 474 (DMX DISK på kontroll), a3f:s återhållna röst 463 (DMX identisk) | **sammanslagning a3f**: kickfold-principen (toppröst) röstar bara efter kallstart/låtgräns och kräver stabilitet |
| oktav | 0 dubbla, 3/4 24 | 24 dubbla vid 155–159 | a1:s TG_EDGE_HI 461 men ändrar DMX på 2–4 extra filer; a3f D2 (oktav under kanten efter 8 varv) | **a3f D2**; TG_EDGE_HI = ägarens val (rättar 156 bpm, ändrar ljus) |
| sväng 3/2 | 6/8 | 5/8 (swing 149,8) | a1 swingSig / a3 röst | a3f:s röst ger 6/8 |
| låsning och tempohopp | långsam (24 s på lang1021) | 3 s | – | **B** |
| fasen | gridfas 0,88 | klockans rutnät, parat 0,88, motfas 32→12 | a2: klockans fas på A:s tempo 0,90 | **B:s rutnät** (a4 publishPhase) |
| ettan | barAcc (kick) | taktmodellen | – | **B** (a4: barShift ur klockan i lotus numrering) |
| tillit | lotus skala | repeatRate×tgClear (AUC 0,657 mot 0,659) | – | **B**; skalan 1/(1−tillit) i beatPhaseConf (a8f D4) så att lotus halvslagsflytt (2,0) nås |
| break/coast | skuggans | klockans | a6 break-spärr: lotus spann 32→11 men DMX gridfel 21→29 + lampspr DISK | **B** |
| låtgräns/omlåsning | hintTrackChange | H_BOUND→relock | a6: en väg för båda | **B** |
| var klockan körs (lotus) | – | process() 23–53 µs/hop PC | a8: workern | **workern** (a8) |

## Ranking
- Runda 1:
  - a3 474 (DMX −0,99)
  - a1 461 (DMX ±0)
  - a4/a6/a7/a8 441 (DMX ±0; a6 fäller lampspr)
  - a5 440 (−0,10)
  - a2 397 (DMX −15,2 DISK)
- r0 = a3 + a4 + a8: 474, men DMX-kontroll DISK (upp_s −0,30 mot −0,65, ned_s 2,55 mot 0,30).
- Final från r0 (samma brief):
  - a3f: 463, DMX identisk även på kontroll
  - a1f: 441 (461 med TG_EDGE_HI)
  - a8f: 441, + D4
- Kombinationen = a3f + a8f D4 (neutral i bänken, gör flytten möjlig på Pi:n).

## Kontamination och risk
- Finalisterna fick r0:s felklass på DMX-kontrollmängden (tillägg 13:00). DMX-beviset för vin är ändå md5-identitet, inte poäng.
- Lotus-risker inför porten:
  - Fasmedianen 0,88→0,84 är urval: 64 svåra låtar hamnar nu i rätt oktav och räknas med. Ägaren godkänner.
  - Tempospridningen inom en låt går 9→33 BPM.
  - Lotus fasoffset (GRID_PHASE_OFFSET_MS 15, PHASE_BIAS_MS 20) och beatLeadMs är kalibrerade mot gamla gridfasen. Klockans rutnät ligger ~10–25 ms tidigare. Lyssna, rör inte lead utan öga.
  - piEngine:s tillitsgränser (0,5/0,6) gäller den gamla skalan.
  - Workerns kostnad på Pi:n är omätt: kolla /api/perf.
  - Döda lotus-drop-ins (TEMPO_EVIDENCE, UP43, FIVE4, GRID_PHASE) läses inte längre.
  - Lotus svaga band är 80–100 BPM, där fasen ligger på 0,59 mot 0,85 (a1f).

## Redo
- **DMX, "redo för ladan":** `PYTHONIOENCODING=utf-8 PI_HOST=10.171.211.218 python tools/ladan.py`. DMX-ljuset är identiskt med 3c5b643/mta.
- **Lotus, "redo för källaren":** huvudchatten synkar analyser.ts, split.ts, slowWorker.ts, analyserClock.ts och ANALYSER_SHARED.md5 till lotus-light-link/pi/src/audio-analyser. Lotus profil är oförändrad. Därefter tsc --noEmit och lotus egen bänk. Ingen deploy.
