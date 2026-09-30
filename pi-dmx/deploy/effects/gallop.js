// Full fart: GALLOPP — två grupper (varannan lampa) slår OMLOTT: grupp A exakt
// på taktslaget, grupp B på off-beatet (&) → dubbel upplevd rytm, ett "dun-ka
// dun-ka" tvärs riggen. Kontrastfärger per grupp, mörk mellan slagen. Färgparet
// byts var 4:e takt. (Rave = grupp släcks helt, flip = båda tända & byter färg;
// gallop = grupperna delar RYTMEN i off-beat.)
export const gallop = {
    key: "gallop", label: "Gallopp", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
    desc: "Grupperna slår omlott – beat & off-beat, dubbel rytm.",
    render(c) {
        const even = c.group === 0; // jamn/udda eller inre/yttre (c.grouping)
        // RIKTIG GALOPP (2026-09-27): grupp B slar TVA ganger - pa "&" (0,5) och pa sista sextondelen (0,75), den andra svagare -
        // "da-da-DUM" mot grupp A:s slag. Forut var B en enkel off-beat = identiskt monster med varannan (rV ~0,9 pa fyra lampor).
        const p1 = (c.beatFrac + 0.5) % 1, p2 = (c.beatFrac + 0.25) % 1; // faser sedan 0,5 resp. 0,75
        const offPulse = Math.max(Math.pow(1 - p1, 2) * 0.75, Math.pow(Math.max(0, 1 - p2 * 1.6), 2));
        const groupPulse = even ? c.beatPulse : offPulse; // A on-beat, B galopp-figuren
        const pairBase = c.mixedSector(Math.floor(c.beatIdx / 4));
        const hue = ((even ? pairBase : pairBase + 3) % 6) / 6; // motfärger
        const v = 0.1 + 0.9 * Math.min(1, groupPulse * (0.85 + c.audio * 0.3) + c.kickEnv * 0.2 + c.punch * 0.5);
        return c.hsv(hue, 1 - c.punch * 0.3, v); // riktig dunk slår igenom rytmen
    },
};
