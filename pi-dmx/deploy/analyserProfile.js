export const PROFILE = {
    envPrefix: 'DMX_',
    sys: {
        KICK_COOLDOWN: '0', // tempoanpassad (0,6 slag, minst 170 ms); lotus: 170
        KICK_EFLOOR: '0.006', // lotus: 0.06
        TEMPO_LAGMAX: 'full', // lag upp till N-1; lotus: 'half'
        SECTION_AGG: 'hop', // lotus: 'env'
        SECTION_SCORE_F32: '1', // lotus: '0'
        SECTION_W_HIGH: '1.0', // lotus: '0'
        SIL_CLEAR_PENDING: '1', // lotus: '0'
    },
    bare: {
        BPM_MIN: '100', // ladan satter BPM_MIN=80 i tempo.conf; lotus: 80
    },
};
