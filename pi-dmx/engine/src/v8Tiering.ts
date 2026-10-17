/**
 * OMOPTIMERING EFTER 100 ANROP (2026-10-17, skräpjakten). V8 optimerar annars om en deoptad funktion först efter 3000 anrop:
 * computeBpm (4 Hz) deoptas på sällsynta grenar och körde då otolkat i minuter (TurboFan 44 % av tiden, tools/skrap/optStat.mjs)
 * och boxade varje flyttal. Mätt på PC (allocProf --fran 300, lang-1014): motorn 450 -> 185 kB/s skräp (effects 146 -> 35,
 * analysatorn 183 -> 93), ljuset byte-identiskt (konsertReplay på 24 inspelningar). Flaggan läses vid varje tiering-beslut, så den
 * verkar även när den sätts efter start; den gäller hela processen (även analysatorns worker). Importeras FÖRST i index.ts så den
 * följer med deployen (dist/) utan att unit-filen eller heap.conf på Pi:n behöver ändras.
 */
import { setFlagsFromString } from "node:v8";
// Flaggan finns bara i V8 >= 12 (Node 22, PC:n). Pi:erna kör Node 18 (V8 10.2): där är tieringen budgetbaserad (--interrupt-budget,
// --ticks-before-optimization), flaggan okänd ("Error: unrecognized flag", 10-17 i ladan) och regeln om 3000 anrop finns inte - ingen effekt.
if (Number(process.versions.v8.split(".")[0]) >= 12) setFlagsFromString("--invocation-count-for-turbofan=100");
