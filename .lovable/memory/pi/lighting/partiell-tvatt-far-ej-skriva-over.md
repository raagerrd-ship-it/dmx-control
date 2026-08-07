---
name: Partiell tvätt får aldrig skriva över en komplett
description: Segment som matchade en känd låt tvättas inte alls; applyRefined kräver dessutom minst lika mycket ljud (refinedFromMs) som befintlig tvätt
type: feature
---
MÄTT: låt #1 tvättades två gånger — 234 s ljud gav 3 drops/2 risers, sedan skrev ett 106 s partiellt segment över med 0 drops/0 risers. En bra tidslinje förstördes.

- `onCommit(songId, fresh)`: `fresh = !matched`. Matchade segmentet en KÄND låt är inspelningen bara den del som spelades → ingen tvätt startas, ljudet kastas (`recorder.abort()`). Den lagrade tvätten byggde på hela låten.
- Bälte och hängslen: sidecar v2 skickar `durMs`, `applyRefined` sparar det som `SongMeta.refinedFromMs` och FÖRKASTAR en tvätt som bygger på mindre ljud än den befintliga.
