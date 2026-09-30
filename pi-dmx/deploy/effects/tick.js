// TICK: hi-hatsen driver showen. Varje hat-anslag flyttar ljuset ett steg i
// riggen (16-delar går fort → ett strimmigt, nervöst flimmer), medan kicken
// slår ner hela raden i en mörkröd botten. Motsatsen till bas-tunga effekter:
// den lever helt i toppregistret.
export const tick = {
    key: "tick", label: "Tick", tier: "fart", section: ["low"],
    desc: "Hi-hatsen flyttar ljuset steg för steg; kicken slår ner hela raden.",
    render(c) {
        const d = c.drum;
        // Position stegar i ATTONDELAR (tva steg per slag) - hat-envelopen sätter skärpan.
        // BUGG (2026-09-27): mclk(0.5) = floor(beatIdx / 0.5) = 2*beatIdx, dvs steget hoppade TVA lampor per slag och pa fyra
        // lampor tandes bara lampa 0 och 2 (lampa 1 och 3 fick aldrig "lit"). Nu attondelar ur beatFrac sa alla fyra vandras.
        const step = c.hasBeat ? Math.floor((c.beatIdx + c.beatFrac) * 2) : c.mclk(0.5, 0.12);
        const lit = (step % Math.max(1, c.count)) === c.idx;
        const sharp = 0.25 + d.hat * 0.75;
        const hue = 0.5 + c.frame.spec.air * 0.12; // cyan → blå med luften
        const v = lit ? sharp : 0.04 + d.hat * 0.12;
        return c.hsv(hue, 0.7 - d.hat * 0.4, Math.min(1, v + d.kick * 0.35));
    },
};
