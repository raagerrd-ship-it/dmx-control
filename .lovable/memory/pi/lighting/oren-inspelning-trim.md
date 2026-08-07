---
name: Orent segment trimmas i tvätten
description: Missad låtgräns ger orent segment → refinern rapporterar trimAt, motorn trimmar; skyddsnät släpper match vars tidslinje tagit slut
type: feature
---
MÄTT: en sen låtgräns förgiftar TVÅ segment (låt #1 272 s i stället för 201 s, låt #2 113 s i stället för 184 s). Följden är AKTIVT FEL show: låt #2 matchar mot segment #1 och motorn kör fel låts drops — bryter mot "aldrig sämre än realtid".

Fix ligger i TVÄTTEN, inte i realtidsgränsen:
- `refineSong.mjs` letar intern låtgräns bland sektionstopparna: klangprofilen måste skifta (L1 > 0.25 mellan 30 s före/efter) och INTE gå tillbaka inom 30 s, tempot skifta > 6 % mellan halvorna, och båda halvorna vara ≥ 60 s. Rapporteras som `{ trimAt: ms }` i sidecar v2.
- `applyRefined` trimmar hashar/tider/drops/intensity/risers/sections och `durationMs`; `trimAt < 60 s` kastar hela låten. Indexet byggs om.

SKYDDSNÄT (oberoende av trimningen): en match vars position passerar lagrad `durationMs` + max(5 s, 8 %) släpps — en tidslinje som tagit slut får aldrig fortsätta styra showen. Marginalen måste vara relativ; samma låt spelas sällan exakt lika länge.
