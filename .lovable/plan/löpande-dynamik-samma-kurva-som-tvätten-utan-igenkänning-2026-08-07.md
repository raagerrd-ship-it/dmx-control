# Löpande dynamik — samma kurva som tvätten, utan igenkänning

## Idén

Det som gör den tvättade showen snygg är inte att motorn *vet vilken låt* det är — det är att ljustaket är **normaliserat** (p5–p95 av just den låtens nivåer) och **sekundmjukt**. Live-vägen (`energyCeiling`) använder i stället rå VU: absolut nivå, inget spann, därför platt i tysta låtar och mättat i höga.

Den normaliseringen kan köras löpande. Den behöver bara nivåhistorik — inte fingeravtryck, inte låtgräns, inte tvätt.

## Vad som byggs

1. **Rullande auto-range på nivån**
   Ett litet histogram över `frame.levelVU` (~64 hinkar) med exponentiellt avtagande vikt, fönster ~60–90 s. Ur det läses p5 och p95 löpande. Nivån mappas `(vu - p5) / (p95 - p95)` → 0..1 = exakt samma normaliserade kurva som tvätten producerar, fast räknad framåt i tid.

2. **Samma efterbehandling som minnestaket**
   Golv (samma 0.20), asymmetrisk mjukning (snabb upp, långsam ner), drop får fortsatt full bypass via `dropEnv`. Klubb-läget kvadrerar den normaliserade kurvan i stället för den råa → hårdare kontrast blir meningsfull i alla låtar.

3. **Snabb omkalibrering vid misstänkt låtbyte**
   Låtminnet har redan gränsevidensen (klangskifte + nivådipp). När den signalerar gräns halveras histogrammets vikt en gång → spannet kryper in på nya låtens nivåer på några sekunder i stället för en minut. Ingen ny detektion behövs, ingen risk: en falsk gräns kostar bara en snabbare omkalibrering.

4. **Minnestaket vinner fortfarande**
   Är låten igenkänd och tvättad används den förberäknade kurvan som idag (den är framåtblickande, live kan bara vara kausal). Den löpande normaliseringen är default-vägen för allt annat — okända låtar, mik-ingång, första spelningen.

## Vad som inte byggs

Ingen ny UI, ingen ny inställning: `energyCeiling` (Regi-flaggan) fortsätter vara samma strömbrytare, men bakom den sitter normaliserad dynamik i stället för rå VU. Riser/sektioner rörs inte — analysatorns `buildUp` sköter dem live redan.

## Tekniskt

- Ny liten modul `pi-dmx/engine/src/liveRange.ts`: avtagande histogram + `p(q)`-läsning, ingen allokering per frame (fast Float32Array).
- `effects.ts`: `else if (this.cfg.energyCeiling)`-grenen matar `liveRange` och använder normaliserad nivå i stället för `vuRaw`; golv/ballistik/`dropEnv` oförändrade.
- `index.ts`: vid gränsevidens från `songMemory` → `effects.liveRangeReset()` (mjuk, viktshalvering).
- `songMemory.ts`: exponera att en gräns just inträffade (befintlig commit/evidens-väg, inget nytt detektionsarbete).
- Verifieras med en offline-simulering: mata en tvättad `<songId>.wav`-kurva genom `liveRange` och jämföra mot tvättens p5/p95-normalisering — kausalt släp ska vara sekunder, inte tiondelar av en låt. `tsc` ska vara 0.
