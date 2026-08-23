---
name: Förkastat i analysatorn: DC-hantering och parabol-yta
description: Bin 0 måste vara kvar i 512-FFT:ns bas/kick-band, ingen medelvärdesborttagning, RMS utan varians, BPM-parabol på acScratch
type: constraint
---

MÄTT 2026-08-23 i `pi-dmx/engine/src/analyser.ts`, alla fyra kostade lås — prova inte igen:

- **Utesluta bin 0** ur bass/kick-banden i 512-FFT:n: binbredden är 93.75 Hz, så bin 0 är 0–94 Hz och bär själva bastrumman. `testBpmHard` "brusigt rum 136" gick 100 % → 0 %.
- **Dra bort fönstrets medelvärde före FFT:n**: vid 512 sampel (10.7 ms) är det ett högpass kring 100 Hz som dämpar 58 Hz-kicken. 92 och 100 BPM låste på 113.
- **RMS som standardavvikelse** (`ss/N − mean²`): sänker nivån just under energi-grinden i brusiga rum (100 % → 0 %). Kör `sqrt(ss/N)`.
- **Parabolisk BPM-interpolation på tempoGram** (samma yta toppen valdes ur): prior-vikten är en lutning över lag och drar vertexen mot 120 BPM (128→127, 150→149, taktfas 128→129). Interpolera på råa `acScratch` — symmetrisk kring toppen, landar exakt.
- **Parabol på bandviktad yta med priorn dividerad bort** (`(wFull·scoreFull + wBass·scoreBass) / priorLut`): samma bias kvar (128→127.0, 140→139.0, 150→149.0) — comb/pulse-normaliseringen i `scoreEnv` är inte symmetrisk kring toppen heller. `acScratch` ger 128.0/140.0/150.0.

Behållet från samma runda: löpande summa-av-kvadrater för RMS, sqrt bara i basbanden + effektviktad centroid KALIBRERAD som `sqrt(1.47·c)` — konstanten är passad MOT MEDIANEN (utjämnad p50 0.223 mot magnitudviktad 0.254), inte mot hela fördelningen; sqrt är monoton så en faktor kan bara träffa en percentil. Måttet är inte identiskt med magnitudviktad tyngdpunkt: glesa/ljusa arrangemang kan landa annorlunda och det syns först i färgtemperaturen, inte i den relativa riser-grinden, `scoreEnv`-ringen läst i två raka block, `magBig` kapad vid band 8-taket, takt-grid-grinden på `wallNow()`.
