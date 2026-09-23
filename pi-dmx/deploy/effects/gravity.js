// Full fart: GRAVITATIONS-VU — ljudet KNUFFAR upp en nivå som sen FALLER med
// gravitation; lamporna fylls vänster→höger upp till nivån → fysisk tyngd, inte
// en rå följare. En PEAK-PRICK i kontrastfärg håller senaste toppen och sjunker
// långsamt (minnet av den hårdaste smällen). Motorn räknar fysiken; effekten
// ritar bara stapeln + pricken. (WLED "Gravcenter"-mekaniken, anpassad för 4 PAR.)
export const gravity = {
    key: "gravity", label: "Gravitation", tier: "full", section: ["high", "low"],
    desc: "Ljudet lyfter en nivå som faller med tyngd; en peak-prick hänger kvar.",
    render(c) {
        const n = Math.max(1, c.count);
        // REFRANGSKALA (2026-09-23): stapelns tak ar latens egen refrang (levelVsHighDb). 9 dB under refrangen nar stapeln bara
        // en tredjedel upp; vid refrangens niva fyller den riggen; over den slar pricken i taket och blinder onskas.
        const lv = c.levelVsHighDb;
        const scale = lv !== 0 || c.section === 'high' ? Math.max(0.33, Math.min(1.15, 1 + lv / 9)) : 1;
        const level = Math.min(1, c.gravLevel * scale), peak = Math.min(1, c.gravPeak * scale);
        if (lv > 1.5 && c.gravPeak > 0.8)
            c.want.blinder = Math.min(1, lv / 4);
        const fill = Math.max(0, Math.min(1, (level - c.idx / n) * n)); // hur mkt av lampan under nivån
        const peakLamp = Math.min(n - 1, Math.floor(peak * n));
        if (c.idx === peakLamp && peak > 0.03) {
            const peakHue = ((c.mixedSector(Math.floor(c.beatIdx / 8)) + 3) % 6) / 6; // peak i kontrastfärg
            return c.hsv(peakHue, 1, 1);
        }
        const base = c.mixedSector(Math.floor(c.beatIdx / 8)) / 6; // lugn färgvandring
        return c.hsv(base, 1, 0.05 + 0.95 * fill);
    },
};
