---
name: Karantän bara efter bekräftad match
description: Falsk match avbryter sin egen inlärningskarantän; matchConfirmed-flagga + bannedIds efter >3 falskmatchningar per segment
type: feature
---
MÄTT: 4 låtar spelade, 1 inlärd. Varje falskmatch satte 30 s LEARN_QUARANTINE → hash-insamlingen stoppades, segmentet blev tomt, inget committades, låt #1 förblev enda posten och fortsatte falskmatcha. Självförstärkande.

- `matchConfirmed` sätts i `tick` när matchen hållit `MATCH_STABLE_MS` med färska träffar OCH fullt röstantal + marginal (samma krav som för att dela ett segment). `splitOnRecognition` sätter den direkt.
- `releaseMatch`: karantän (`quarantinedSegment`) sätts BARA om matchen var bekräftad. En falsk match släpper karantänen omedelbart — hasharna som samlats under matchen ligger redan i `learnHash` (insamlingen blockeras bara under karantän), så resten av låten lärs in.
- `bannedIds` + `falseHits`: mer än `FALSE_HITS_MAX` (3) falskmatchningar av samma låt-id i ett segment → låten tystas helt i röstningen resten av segmentet (bredare än hash-zon-spärren). Nollställs vid commit.
