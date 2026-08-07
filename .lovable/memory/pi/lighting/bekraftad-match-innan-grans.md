---
name: Bara bekräftad match får dela segment
description: Igenkänning-overriden kräver stabil match (5 s + färska träffar + fullt VOTES_NEEDED och marginal); upprepad falskmatch blockerar hash-zonen
type: feature
---
MÄTT: falska matchningar dör inom 6 s (färskhetskravet), men hann ändå fyra en låtgräns mitt i en riktig låt ("låtgräns efter 68s (igenkänd låt #1 vid 11.2s)").

- `recogPending` ersätter `recogSplit`: en igenkänd låt vid segmentets början är bara en KANDIDAT. Gränsen fyras först när matchen hållit `MATCH_STABLE_MS` (5 s) MED färska positionsenliga träffar (< MATCH_FRESH_MS/2) OCH `matchVotes >= VOTES_NEEDED` (10) med `matchMargin >= MARGIN`. Replayen får fortfarande starta på start-låset (6 röster) — bara gränsbeslutet kräver full evidens.
- Release-kontrollen körs FÖRE kandidatbeslutet i `tick`, så en döende match aldrig kan dela segmentet.
- `blockedZones`: släpps samma låt-id två gånger inom 15 s av samma position är hash-klustret där för generiskt → hela låttidszonen (±15 s) ignoreras i indexeringen resten av segmentet. `blockedMatchId` ensamt räcker inte (nollas vid nästa commit).
