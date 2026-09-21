/**
 * Effekt-modulernas kontrakt.
 *
 * Varje effekt är en ren funktion render(c) → [r,g,b] (0..1) för EN lampa,
 * plus metadata (nyckel/etikett/beskrivning/tier). Motorn (EffectEngine)
 * bygger ett EffectContext per frame och anropar effekten per lampa. All
 * regi/drop/riser/VU/ballistik ligger kvar i motorn — effekten ser bara sin
 * lampa och de färdiga signalerna.
 */
export {};
