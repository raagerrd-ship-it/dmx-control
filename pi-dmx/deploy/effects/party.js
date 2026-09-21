// Full fart: FÄRGKAOS-PUMP — varje lampa egen ren färg (blandas om varje takt)
// och hela riggen THROBBAR hårt: nästan kolsvart mellan slagen, full på beatet.
// Lågt golv (5%) + extra kick-drive → rave-hård kontrast som sitter på basen.
export const party = {
    key: "party", label: "Party", tier: "full", section: ["high"],
    desc: "Färgkaos som pumpar hårt på varje taktslag.",
    render(c) {
        const hue = c.mixedSector(c.beatIdx + c.idx * 2) / 6;
        const pump = Math.min(1, c.beatPulse * 1.0 + c.kickEnv * 0.9 + c.punch * 0.7); // riktig dunk slår igenom
        const v = 0.12 + 0.88 * pump; // motorns hjartslag dippar redan till 0.30 → hoj eget golv sa det inte blir strobe                                     // djupare throb (mörkare mellan slagen)
        const entry = c.section === 'high' ? c.sectionEntry : 0; // refrangens forsta slag: stot + blinder
        if (entry > 0)
            c.want.blinder = entry;
        return c.hsv(hue, 1 - Math.max(c.punch * 0.4, entry * 0.7), Math.min(1, v + entry * 0.5)); // dunk → gnista mot vitt
    },
};
