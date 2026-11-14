# analyserCharacter.ts - anteckningar

Kommentarerna som stod i koden fram till uppdelningen 2026-11-14, ordagrant, under den konstant, det fält eller den metod de hörde till.
Koden har bara en kort etikett kvar per deklaration. Nya anteckningar skrivs här, inte i koden.

## Filhuvudet

```text
 KARAKTÄRSPROFILEN (utbruten ur analyser.ts 2026-11-14). Långsam profil (~8 s) av låtens karaktär som dirigenten väljer effekt efter. Läser trummor, band och basgång ur analysatorn (this.a).
```

## CharacterProfile

### a

```text
 analysatorn som äger den här delen (delade signaler läses via den)
```

### outProfile

På raden: karaktärsprofil (återanvänt)


### profPunch

```text
KARAKTÄRSPROFIL (långsam, ~8s)
```

### profileStep()

```text
 Karaktarsprofilen (~8 s) → outProfile.
```
Vid `let bSum = 1e-6; for (let b = 0; b < 8; b++) bSum += this.a.bandLvl[b];`:

```text
── KARAKTÄRSPROFIL (~8s) — musikens KARAKTÄR, inte dess energinivå ──
Banden är redan per-band AGC:ade (0..1 var), så vi jobbar med RELATIONER:
hur stor del av ljudbilden som är låg-end resp. luft, och hur transientrikt
det är. Långsam (8s) → stabil nog att styra effektval utan att fladdra.
```
Vid `const bassW = (this.a.bandLvl[0] + this.a.bandLvl[1] + this.a.bandLvl[2]) / bSum;`:

```text
sub+kick+bas
```
Vid `const brightW = (this.a.bandLvl[6] + this.a.bandLvl[7]) / bSum;`:

```text
diskant+luft
punch drivs av den dedikerade kick-detektorn (renare transient än bandOn[1],
som ligger i 60–120 Hz och drunknar i rullande bas) plus snare/hat-anslag.
```
Vid `const punchNow = Math.min(1, (this.a.kickHit + this.a.bandOn[5] + this.a.bandOn[6]) * 0...`:

```text
kick+snare+hat
```
Vid `this.outProfile.punch = cl01((this.profPunch - 0.05) / 0.40);`:

```text
Skala råvärdena till användbara 0..1-spann (typiska musikvärden → full range).
Skalningen är KALIBRERAD mot uppmätta råvärden på riktig musik (annars
mättar punch på 1.00 och bright ligger konstant högt → ingen diskriminering).
```

