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
  },
  bare: {
    BPM_MIN: '100',              // ladan satter BPM_MIN=80 i tempo.conf; lotus: 80
  },
};
