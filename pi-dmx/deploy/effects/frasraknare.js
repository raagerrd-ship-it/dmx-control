// FRASRAKNARE (2026-09-23): takten som FORM over fraserna. Grunden ar en palettpuls pa slaget; var 4:e takt (fjarde takten i
// varje fyrtaktsfras) sveper ett ljust huvud over riggen genom takten, och pa var 8:e takts etta blixtrar hela riggen vitt
// (+ blinder). Takterna raknas ur analysatorns sectionBars (takter sedan sektionsstart, sa frasen alltid borjar dar
// sektionen borjar) med gridfasen (beatFrac) inom takten; utan tempo faller den tillbaka pa beatIdx. Pool high/low.
export const frasraknare = {
    key: "frasraknare", label: "Frasraknare", tier: "fart", modulate: { energy: true, pulse: false }, section: ["high", "low"],
    desc: "Palettpuls pa slaget, svep var fjarde takt, vit blixt pa var attonde takts etta.",
    drives: ["blinder"],
    render(c) {
        const useBars = c.hasBeat && c.sectionBars > 0;
        const barsF = useBars ? c.sectionBars : (Math.floor(c.beatIdx / 4) + (((c.beatIdx % 4) + 4) % 4 + c.beatFrac) / 4);
        const bar = Math.floor(barsF);
        const inBar = barsF - bar; // 0..1 genom takten
        const hue = c.mixedSector(Math.floor(bar / 4)) / 6;
        let v = 0.15 + c.beatPulse * 0.35 + c.punch * 0.3;
        let sat = 1 - c.punch * 0.3;
        if (bar % 4 === 3) { // fjarde takten: svep
            const head = inBar * (c.count - 1);
            const d = c.idx - head;
            v += Math.exp(-d * d * 0.8) * 0.6;
        }
        if (bar % 8 === 0 && inBar < 0.12 && bar > 0) { // attonde takten: blixt pa ettan
            const flash = 1 - inBar / 0.12;
            c.want.blinder = flash;
            v = Math.max(v, flash);
            sat = Math.min(sat, 1 - flash * 0.9);
        }
        return c.hsv(hue, sat, Math.min(1, v));
    },
};
