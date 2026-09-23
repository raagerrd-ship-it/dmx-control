// BASGANG (2026-09-23): ljuset stegar pa BASNOTERNA. Motorn raknar basnots-anslag (bassNoteIdx ur onset.bass) och nar
// analysatorn ser en tydlig basgang (profile.bassline) hoppar en skarp ljuspunkt ett steg per not (ping-pong over riggen) och
// klingar av med noten; hela riggen glimmar svagt med basens sustain (drum.bass) sa basgangen "ligger under" som en matta.
// Ny palettfarg per not. Den stegar ALLTID pa basnoterna (aldrig pa slaget - da blev den en bounce-kopia, rPerm 0,85 pa
// megamixen); saknas basnoter (> 1 slag sedan senaste) ligger bara mattan kvar med en mjuk slagpuls sa den aldrig ar dod.
// Toggle-familjen (dirigenten valjer bland dessa vid tydlig basgang, CLEAR_BASS).
export const basgang = {
    key: "basgang", label: "Basgang", tier: "fart", section: ["low", "high"], toggle: true,
    desc: "Ljuspunkten stegar pa basnoterna, riggen glimmar med basens sustain.",
    render(c) {
        const n = Math.max(1, c.count);
        const step = c.bassNoteIdx;
        const span = Math.max(1, n - 1);
        const cyc = step % (span * 2);
        const pos = cyc <= span ? cyc : span * 2 - cyc; // ping-pong
        const d = Math.abs(c.idx - pos);
        const beatS = c.cfg.beat?.bpm ? 60 / c.cfg.beat.bpm : 0.5;
        const age = c.bassNoteAge; // s sedan basnoten
        const note = Math.exp(-age / 0.22) * (0.55 + c.frame.onset.bass * 0.45) * (0.6 + 0.4 * c.bassline);
        const idle = Math.max(0, Math.min(1, age / beatS - 1)); // > 1 slag utan not: mattan + mjuk slagpuls
        const bed = 0.06 + c.drum.bass * 0.28 + idle * c.beatPulse * 0.18; // basens sustain over hela riggen
        const hue = c.mixedSector(step) / 6;
        const v = d < 0.5 ? Math.min(1, bed + note * 0.9 + c.punch * 0.3) : Math.min(1, bed + note * Math.exp(-d * 2.2) * 0.35 + c.punch * 0.15);
        return c.hsv(hue, 1 - (d < 0.5 ? c.punch * 0.4 : 0), v);
    },
};
