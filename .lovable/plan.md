# Justerbart tidsförsprång per effekt

## Mål
Låta ägaren trimma när varje effekt slår till i förhållande till takten. Globalt `showLeadMs` räcker inte när t.ex. hjärtslaget ska toppa PÅ slaget samtidigt som en strobe kan behöva vara något tidigare/senare än en grid-effekt.

## Nuvarande läge (verifierat)
- `beatClock.ts` har redan `beatPhase(beat, now, leadMs)` och `nextBeatIn(beat, now, leadMs)` — försprånget är inbyggt i matematiken.
- `EffectEngine` i `effects.ts` räknar ut EN uppsättning `beatFrac`, `beatIdx`, `beatPulse`, `beatHit` per frame och delar med alla effekter via `EffectContext`.
- Det finns redan ett globalt fält `cfg.showLeadMs` (0–300 ms) och WS-meddelandet `setShowLead`, men det har inget reglage i vare sig React-mocken eller Pi-UI:t.
- React-mocken (`src/pages/DmxController.tsx`) har ett ägarblock (`OwnerSections`) som speglar Pi:ns `/setup`-vy.
- Pi-UI:t (`pi-dmx/engine/public/index.html`) ägs av användaren; Lovable redigerar det inte utan levererar ändringar som diff/beskrivning.

## Förändringar

### 1. Motor: per-effekt försprång i config
Lägg till i `EngineConfig`:

```typescript
effectLeads?: Partial<Record<Mode, number>>; // extra ms per effekt, utöver showLeadMs
```

- Default tomt objekt `{}`.
- Giltigt intervall för varje effekt: `-100 .. +200 ms`.
- Effektivt försprång = `showLeadMs + (effectLeads[effMode] ?? 0)`.

### 2. Motor: räkna ut beat-värden per effekt
I `EffectEngine.render()`:
- Behåll globala `beatTick` (BPM-låst grid) och `kickHit` (verklig kick) — de är sanningen om musiken.
- För det aktuella `effMode` beräkna:
  - `effBeatFrac = beatPhase(beat, now, totalLead)`
  - `effBeatIdx` från en per-effekt takt-räknare som stegar på `beatTick || kickHit`
  - `effBeatPulse = hasBeat ? Math.pow(1 - effBeatFrac, 2) : kickEnv`
  - `effBeatHit = (effBeatIdx > lastEffBeatIdx[effMode]) || (!hasBeat && kickHit)`
- Skriv dessa värden in i `EffectContext` innan `effect.render(ctx)` anropas.
- Alla andra signaler (`kickEnv`, `dropEnv`, `audio`, …) förblir oförändrade.

### 3. Motor: WS-kommando
Lägg till hanterare i `server.ts`:

```typescript
} else if (msg.type === "setEffectLead" && typeof msg.mode === "string" && typeof msg.value === "number") {
  if (isMode(msg.mode)) {
    deps.cfg.effectLeads = { ...deps.cfg.effectLeads, [msg.mode]: Math.max(-100, Math.min(200, Math.round(msg.value))) };
  }
}
```

### 4. React-mock: nytt ägarkort "Effekttiming"
I `src/pages/DmxController.tsx` / `OwnerSections`:
- Lägg till ett kort efter "Beat-synk".
- Global slider för `showLeadMs` (0–300 ms) med etikett "Globalt försprång".
- Lista över alla effekter från `EFFECT_META` (eller hårdkodad kopia i mocken) med individuella sliders för `-100 .. +200 ms`.
- Varje rad visar effektnamn, aktuellt ms-värde och en slider.
- Allt är lokal state i mocken — inget skickas någonstans, precis som övriga ägardelar.

### 5. Pi-UI: diff/beskrivning
Eftersom `pi-dmx/engine/public/index.html` ägs av användaren levereras ändringarna som:
- HTML: nytt kort "Effekttiming" inuti `<div id="ownerOnly">`, placerat efter "Beat-synk".
- CSS: återanvända befintliga slider/rad-stilar.
- JS: WS-anslutningen får en ny funktion `sendEffectLead(mode, ms)` och config-broadcast läser in `cfg.effectLeads` för att sätta sliderarnas positioner.

### 6. Persistens
`effectLeads` sparas automatiskt via befintlig `scheduleSave` eftersom det är ett nytt fält på `cfg`. Inga transienta fält behöver strippas.

## Vad vi INTE gör
- Vi ändrar inte `beatClock.ts` — den har redan rätt API.
- Vi ändrar inte enskilda effektfiler — de konsumerar fortfarande `c.beatFrac` etc.
- Vi lägger inte till fler timing-källor (t.ex. chroma) — detta är en ren justerbarhets-funktion.

## Verifiering
1. Byggmotorns typer (`bun run build` i `pi-dmx/engine`) går igenom.
2. React-mocken bygger (`bun run build`).
3. Manuell koll: ändra ett effekt-försprång i mock-UI:t och se att värdet visas korrekt.
4. Diff-texten för Pi-UI:t granskas av användaren innan den appliceras på `index.html`.
