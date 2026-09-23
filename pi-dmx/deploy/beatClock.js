/**
 * TAKTKLOCKAN — en sanning om var i takten vi är.
 *
 * Tempot och fasen bor i `cfg.beat` ({ anchorMs, bpm }), som sätts av index.ts:
 * tempot från låtminnet när en inspelning är igenkänd, annars från analysatorn, och
 * fasen knuffas löpande mot faktiska trumslag av PLL:en (18 % av felet per kick).
 *
 * Själva UTRÄKNINGEN låg förut duplicerad på åtta ställen — analysatorn, hjärtslaget,
 * grid-effekterna, ballistikens tempoberoende decay. Det gjorde att en rättelse bara
 * hamnade på ett av dem: MÄTT 2026-08-08 kulminerade hjärtslaget vid fas 0,10 av takten
 * (~48 ms EFTER slaget) medan övriga konsumenter räknade utan samma korrigering.
 *
 * LEAD: ljus är trögare än ljud. En konsument som behöver tid på sig att resa sig ber
 * om sitt eget försprång i stället för att räkna om fasen själv — hjärtslaget begär
 * sin attacktid så toppen landar PÅ slaget, drops har sina 120 ms. Klockan äger
 * matematiken; varje konsument äger sitt försprång.
 */
/** Under detta räknas takten som opålitlig — bättre ingen takt än en som sitter fel.
 *  Konsumenter som `hasBeat` säger nej till faller tillbaka på VERKLIGA kicks, vilket
 *  alltid följer musiken även om det inte följer ett rutnät. */
export const MIN_BEAT_CONFIDENCE = 0.20;
/**
 * Är takten låst OCH pålitlig?
 * Tempot måste vara rimligt (> 40 BPM) och mätningen säker nog. Konfidensgrinden bor
 * HÄR och inte hos varje konsument: låg den utspridd kunde grid-effekterna dansa på ett
 * gissat rutnät medan hjärtslaget höll tyst — olika delar av riggen i olika takt.
 */
export function hasBeat(beat) {
    return !!beat && beat.bpm > 40 && (beat.confidence ?? 0) >= MIN_BEAT_CONFIDENCE;
}
/** Taktperioden i ms. Faller tillbaka på 500 ms (120 BPM) när ingen takt är låst. */
export function beatMs(beat) {
    return hasBeat(beat) ? 60000 / beat.bpm : 500;
}
/**
 * Var i takten är vi? 0 = precis på slaget, 0,5 = mitt emellan.
 * @param leadMs försprång: hur långt FÖRE slaget anroparen vill ligga. Ett värde
 *   > 0 flyttar fasen framåt, så det som tar `leadMs` att bygga upp hinner fram.
 */
export function beatPhase(beat, nowMs, leadMs = 0) {
    if (!hasBeat(beat))
        return 0;
    const ms = 60000 / beat.bpm;
    const since = nowMs - beat.anchorMs + leadMs;
    // Undvik dubbel modulo: en rest räcker, korrigera bara om den är negativ.
    const rem = since % ms;
    return (rem < 0 ? rem + ms : rem) / ms;
}
/** Löpande taktnummer sedan ankaret — för effekter som byter färg per takt. */
export function beatIndex(beat, nowMs) {
    if (!hasBeat(beat))
        return 0;
    return Math.floor((nowMs - beat.anchorMs) / (60000 / beat.bpm));
}
/** Millisekunder kvar till nästa slag (med valfritt försprång). */
export function nextBeatIn(beat, nowMs, leadMs = 0) {
    const ms = beatMs(beat);
    return (1 - beatPhase(beat, nowMs, leadMs)) * ms;
}
