// Full fart: hårdvarustrobe (CH5 sätts i motorn); färgen cyklar snabbt, fullt ljus.
export const strobe = {
    key: "strobe", label: "Strobe", tier: "full", section: ["high"],
    desc: "Snabb strobe-blixt med skiftande färg.",
    render(c) {
        const hue = c.mixedSector(c.beatIdx) / 6;
        return c.hsv(hue, 1, 1);
    },
};
