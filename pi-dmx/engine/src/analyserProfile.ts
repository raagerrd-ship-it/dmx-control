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
    SIL_CLEAR_PENDING: '1',      // lotus: '0'
    // LADANS LIVE-VARDEN SOM STANDARD (2026-09-27, rensningen): allt nedan stod i drop-ins pa Pi:n (drop/tempo/lotus.conf)
    // och ar nu kodens sanning. Env vinner fortfarande (DMX_X=... slar profilen). Sparen (BPM_TRACE/DROP_TRACE/LIVE_TRACE)
    // ar INTE standard - de var inte live 09-27 (Pi:ns env lastes fore deployen); sla pa med ladan.py --env vid felsokning.
    ANALYSER_SPLIT: 'worker',     // tempo/gridfas/sektion i egen trad (ladan 09-24)
    GHOST_WAIT: '1',              // 2/3-fantom vid latbyte vantar 12 s (tempo-transitions 09-04)
    SUBH_GUARD: '1',              // OCT-DOWN/NEAR x8 mot lastGoodBpm (2/3 only)
    SECTION_HINT_LOWCONF: '0',    // taktlost break nollar INTE sektionerna (ladan 09-24 23:10)
    // SEKTIONER SOM HALLER (agaren i ladan 10-14: 'mycket go kansla nu'; 23 lang-*.wav: intro 17 -> 10 % av tiden, < 8 s 23 -> 15 %,
    // fladder 41 -> 22, sektionsbyten 3,12 -> 2,44/min, refrangstart oforandrad). Ur refrang/mellanlage kravs 5 raka block, in i refrangen 3.
    SECTION_RUN: '5',             // var 3
    SECTION_RUN_IN: '3',          // var 0 (= RUN)
    SECTION_CARRY: '20',          // block som bars over latgransen (lotus 4a008a5); var 0
    // BASEN TILLBAKA = HIGH (agaren i ladan 10-19: 'refrangen haller efter dropen'; 24 lang: high +2 s efter drop 12 -> 33, build
    // 0,5-8 s efter drop 21 -> 14). Backup: git-taggen backup/fore-section-body-high-2026-10-19.
    SECTION_BODY_HIGH: '2000',    // var 0 (av)
    SECTION_BODY_HIGH_DB: '2',    // var 3 (koden)
    // LADAN 10-21 KVÄLL, ägaren 'kör standard' (backup-tagg backup/fore-kvallens-prov-2026-10-21):
    FAST_BANDS: '1',              // ljusets bandfält ur snabb väg (IIR + 512-FFT): 21-27 -> 3-5 ms efter ljudet, drops identiska; lotus: av
    SECTION_WIN: '2',             // sektionspoängen över 2 s i st f 4: etiketten ned ur refrängen 2,9 -> 1,3 s, korta delar 165 -> 143 (25 inspelningar)
  },
  bare: {
    // Drop-detektorn, facit-kalibrerad i ladan 09-03..09-12 (se tools/ENV-LADAN.md, pi-dmx-drop). Lotus har egna varden.
    BODY_GONE_MIN_MS: '2000',    // 10-11 kväll 21:2x: 1000 gav falsk drop var 30:e s på pumpande bas (3 'falsk' på en minut); bänken 115 min: drops 0,58 -> 0,38/min, ägarens 'träff' 17:08 kvar. // 10-11 eftermiddag: agaren 'ta bort timer pa riktig drop, satt snavt mal' -> 4000 -> 1000 (bara en kort svacka kravs)
    BODY_RISE_DB: '20',          // SNAVT MAL: kroppen ska stiga 20 dB (var 17)
    //    // riktig drop kraver 4 s break (var 2 s; agaren i ladan 10-10: 'hellre farre drops, mini fangar dom'). Bank: megamix 27->15, pop 4->2, minidrops 23->25
    DROP_QUALITY_DB: '3',        // SNAVT MAL 10-11: landa inom 3 dB fran toppen = full small (var 6,5)
    DROP_RISE_LOW_DB: '20',      // SNAVT MAL 10-11: ingen genvag med 12 dB (var 12)
    MINI_SPACING_MS: '1',        // minidrops UTAN sparr (agaren i ladan 2026-10-08; var 12000). 0 = av helt, darfor 1
    DROP_UNDERPEAK_MIN: '1.5',   // 09-30 i koden: ingen drop/minidrop vid kroppens topp (agarens 9 markeringar + bank: pop 11->7, megamix 31->29)
    OCT_UP: '12',                // oktav upp snabbare (tempo-transitions)
    SUBH_MULT: '8',              // subharmonisk guard x8
  },
};
