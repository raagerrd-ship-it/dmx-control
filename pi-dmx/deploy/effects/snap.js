// Full fart: UNISONT FÄRGSLAG — alla lampor SAMMA färg, KONSTANT ljus (ingen
// pump), hård kapning till en NY färg exakt på taktslaget. Läser som en
// färg-slideshow i takt; snabb fade ger färgsläp i själva kapet. Motsats till
// party (mörk throb) och rave (spatial växling).
export const snap = {
    key: "snap", label: "Snap", tier: "full", section: ["high"],
    desc: "Alla lampor byter färg blixtsnabbt på varje slag.",
    render(c) {
        const hue = c.mixedSector(c.beatIdx) / 6;
        // Vit-kap på SLAGET: gnista = grid-flanken (beatHit) ELLER en riktig dunk →
        // varje färgbyte punkteras av en kort vit gnista även när basen är svag, och
        // sitter på gridet (eller kicken utan BPM-lås). fastMode ger den kort utklang.
        const gnista = Math.max(c.punch, c.beatHit ? 1 : 0);
        const v = Math.min(1, 0.9 + c.audio * 0.1 + gnista * 0.1);
        const entry = c.section === 'high' ? c.sectionEntry : 0;
        if (entry > 0.5)
            c.want.blinder = entry;
        return c.hsv(hue, 1 - Math.max(gnista * 0.5, entry), v); // slag → vit-gnista; refrangens entre → vitt
    },
};
