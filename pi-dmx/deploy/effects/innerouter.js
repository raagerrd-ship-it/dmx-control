// Fart: INRE/YTTRE tar VARANNAN takt — de inre lamporna slår på slaget, de yttre
// på nästa (halva effekt-klockan mellan). Syskon till `varannan` men delar riggen
// mitten↔kant i stället för jämn↔udda. Med halverad effekt-klocka (DMX_HALVE_SHOW)
// blir det "inre på ett, yttre på två" — ägaren 2026-09-12: vid dubbeltakt och i
// lugna låtar ska riggen delas i stället för att blinka uniformt.
export const innerouter = {
    key: "innerouter", label: "Inre/yttre", tier: "fart", section: ["high", "low"],
    desc: "Inre lampor på slaget, yttre på nästa — mitten och kanten turas om.",
    render(c) {
        const isOuter = c.count < 3 ? c.idx % 2 === 1 : (c.idx === 0 || c.idx === c.count - 1);
        const phase = isOuter ? (c.beatFrac + 0.5) % 1 : c.beatFrac;
        const pulse = Math.pow(Math.max(0, 1 - phase * 1.8), 2.2);
        const hue = c.mixedSector(Math.floor(c.beatIdx / 2) * 2 + (isOuter ? 1 : 0)) / 6;
        const v = c.shaped(0.08, pulse * (0.6 + c.audio * 0.4) + c.punch * 0.25);
        return c.hsv(hue, 1, Math.min(1, v));
    },
};
