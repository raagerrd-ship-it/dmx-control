/**
 * ANALYSATORPROFIL — DMX. En fil per system bredvid den gemensamma analyser.ts (som ar samma byte i
 * lotus-light-link och dmx-control). Har, och bara har, skiljer sig systemen: env-prefixet och de
 * standardvarden dar systemen i dag har OLIKA standard. Env vinner alltid over profilen.
 *
 * `sys`  = rattar med systemprefix (lases som DMX_<namn>, alias LOTUS_<namn>).
 * `bare` = rattar utan prefix (lases som de heter).
 *
 * Varje rad ar ett MATT beteende (paritetsbanken bevisar att analysatorn med denna profil ger exakt
 * samma ramar som DMX-analysatorn fore sammanslagningen). Att andra en rad ar att andra DMX-motorns beteende.
 */
export interface AnalyserProfile {
  envPrefix: 'LOTUS_' | 'DMX_';
  sys: Record<string, string>;
  bare: Record<string, string>;
}

export const PROFILE: AnalyserProfile = {
  envPrefix: 'DMX_',
  sys: {
    KICK_COOLDOWN: '0',          // tempoanpassad (0,6 slag, minst 170 ms); lotus: 170
    KICK_EFLOOR: '0.006',        // lotus: 0.06
    TEMPO_LAGMAX: 'full',        // lag upp till N-1; lotus: 'half'
    SECTION_AGG: 'hop',          // lotus: 'env'
    SECTION_SCORE_F32: '1',      // lotus: '0'
    SECTION_W_HIGH: '1.0',       // lotus: '0'
    SIL_CLEAR_PENDING: '1',      // lotus: '0'
    // LADANS LIVE-VARDEN SOM STANDARD (2026-09-27, rensningen): allt nedan stod i drop-ins pa Pi:n (drop/tempo/lotus.conf)
    // och ar nu kodens sanning. Env vinner fortfarande (DMX_X=... slar profilen). Sparen (BPM_TRACE/DROP_TRACE/LIVE_TRACE)
    // ar INTE standard - de var inte live 09-27 (Pi:ns env lastes fore deployen); sla pa med ladan.py --env vid felsokning.
    ANALYSER_SPLIT: 'worker',     // tempo/gridfas/sektion i egen trad (ladan 09-24)
    DROP_CALM_GATE: '1',          // lugna partier kraver starkare bevis for drop
    GHOST_WAIT: '1',              // 2/3-fantom vid latbyte vantar 12 s (tempo-transitions 09-04)
    SUBH_GUARD: '1',              // OCT-DOWN/NEAR x8 mot lastGoodBpm (2/3 only)
    SECTION: '1',                 // sektioner som DATA (kravs av lugn-grinden)
    SECTION_EARLY_S: '45',        // forsta 45 s: refrang kraver +3 dB mot latens median
    SECTION_ON_HINT: '1',         // latgransen nollar sektionshistoriken
    SECTION_HINT_LOWCONF: '0',    // taktlost break nollar INTE sektionerna (ladan 09-24 23:10)
  },
  bare: {
    BPM_MIN: '80',               // fest 80-160 (var 100 + tempo.conf=80); lotus: 80
    // Drop-detektorn, facit-kalibrerad i ladan 09-03..09-12 (se tools/ENV-LADAN.md, pi-dmx-drop). Lotus har egna varden.
    BODY_FAST_S: '0.06',         // baskroppens filter (0,04 gav drops i lugna partier - aldrig lagre)
    DROP_ARM_MS: '300',          // armerat fonster once/gone
    DROP_QUALITY_DB: '6.5',      // full-slam-grind vid fyrning (underPeak)
    DROP_RISE_MIN: '1',          // stigning mot MIN i 0,5 s-fonstret (suget fore dropen)
    DROP_RISE_LOW_DB: '12',      // 12 dB racker nar landningen ar <3 dB under toppen
    DROP_CALM_INTRO_STRICT: '1', // ingen drop i intro utan riser
    MINI_SPACING_MS: '12000',    // minidrops (~10 per lat)
    OCT_UP: '12',                // oktav upp snabbare (tempo-transitions)
    SUBH_MULT: '8',              // subharmonisk guard x8
  },
};
