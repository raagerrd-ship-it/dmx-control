// Full fart: SPEKTRAL KLYVNING — riggen delas i två spektrala världar. De INRE
// lamporna = tung, andande sub/bas-matta i palettens djupaste färg (ger rummet
// en mullrande botten); de YTTRE lamporna = SLÄCKTA tills ett snare/hi-hat-ANSLAG
// blixtrar till stenhårt i kontrastfärg. Bara möjlig tack vare band-separationen:
// den ihållande basen och de rappa transienterna kan äntligen skiljas åt.
// (Gemini-idé, anpassad för 4 PAR.)
export const split = {
    key: "split", label: "Klyvning", tier: "full", section: ["high"], toggle: true,
    desc: "Inre lampor tung bas-matta, yttre lampor gnistrande diskant-anslag.",
    render(c) {
        const isOuter = c.group === 1; // inre/yttre eller jamn/udda (c.grouping)
        if (isOuter) {
            // Yttre: rappa transienter (snare/clap + hi-hats), släckt mellan slagen.
            const transient = Math.max(c.frame.onset.highMid, c.frame.onset.treble);
            const hue = ((c.mixedSector(0) + 3) % 6) / 6; // kontrastfärg mot bas-mattan
            return c.hsv(hue, 1, transient * transient); // stenhård attack
        }
        // Inre: tung, andande sub/bas-energi i palettens djupaste färg.
        const bass = Math.max(c.frame.spec.sub, c.frame.spec.bass);
        const hue = c.mixedSector(0) / 6;
        // Mattan ar SUSTAINED bas -> de inre lamporna lag konstant tanda medan de yttre gnistrade (agaren 09-27). heart(0.35)
        // racker inte (65 % kvar mellan slagen); nu djupare sa mattan tydligt pumpar i takten och slacks ner mellan slagen.
        return c.hsv(hue, 1, (0.05 + 0.95 * bass) * c.heart(0.65)); // bas-mattan pumpar i takten, anslagen ororda
    },
};
