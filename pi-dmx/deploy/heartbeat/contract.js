/**
 * KONTRAKT: ANALYS → DIRIGENT → HEART-BEAT/ENERGI → OUTPUT (2026-09-23, ägarens arkitektur). Samma fil i lotus-light-link
 * (pi/src/heartbeat/contract.ts) och pi-dmx — hålls identiska, som analysatorn.
 *
 *   INPUT      ALSA / aux / codec → 375 Hz-hop med ljudklocka.
 *   ANALYS     delad, snabb + långsam (audio-analyser/): takt (grid + fas), nivå/energi, kick, drop, sektion + minne + förutsägelse.
 *              Det enda lagret som lär sig (mot facit på PC:n).
 *   DIRIGENT   väljer VAD som visas: BLE en effekt ("uniform"), DMX många. Producerar bara AVSIKT (Intent) — per lampa färg och
 *              relativ intensitet 0–1, plus vilka globala modulatorer effekten vill ha (ModulateFlags). Effekten deklarerar sin
 *              standard i sin egen fil; dirigenten får skriva över (t.ex. tvinga energi i ett lugnt parti, stänga pulsen när
 *              takten är otillförlitlig).
 *   HEART-BEAT / ENERGI (heartbeat.ts) vet inget om lampor. Räknar GLOBALA signaler per tick i normerade enheter:
 *              ceiling 0–1  energitaket ur nivå + refrängreferens (levelVsHighDb) + uppbyggnad + drop-envelope;
 *              pulse   0–1  pulskurvan ur taktklockan (1 på slaget, 0 mellan), prediktiv där kedjan tillåter;
 *              pulseDepth 0–1 hur djupt pulsen får modulera (tillit × sektionens pulsvikt × kalibrerat djup).
 *              Effekterna får läsa samma råvaror (kickEnv, energy, buildUp) som i dag; den GLOBALA envelopen läggs efter dirigenten.
 *   OUTPUT     komposition + allt som rör hårdvaran:
 *                 ljus_i = kal_i( level_i × (energy ? ceiling : 1) × (pulse ? 1 − pulseDepth + pulseDepth·pulse : 1) ),
 *              golv/max per lampa, gamma, sedan kodning (BLE-paket på radions raster, DMX-ram 40 Hz). Kalibreringen bor HÄR.
 *              Tystnadsgrinden (ingen musik → mörkt) ligger också här och gäller ALLA effekter, även de som skippar energin.
 *
 * "Skippa" betyder skippa: en effekt med energy=false får full kalibrerad skala — output håller den ändå inom golv/max.
 * Bänkbart per lager: heart-beat mäts mot ljudet oavsett effekt (ceilR för taket, on-beat för pulsen), effekterna på
 * likhet/variation, output mot lampan (klapp + video).
 */
export const MODULATE_DEFAULT = { energy: true, pulse: true };
/** Pulsens multiplikator ur kurva + djup: 1 − d + d·pulse (aldrig 0 om d < 1). */
export function pulseFactor(env) { return 1 - env.pulseDepth + env.pulseDepth * env.pulse; }
/** Komposition i OUTPUT (före kalibrering): avsikt × valda modulatorer. Ren funktion, ingen hårdvara. */
export function composeLamp(level, env, m) {
    let v = level;
    if (m.energy)
        v *= env.ceiling;
    if (m.pulse)
        v *= pulseFactor(env);
    return v < 0 ? 0 : v > 1 ? 1 : v;
}
