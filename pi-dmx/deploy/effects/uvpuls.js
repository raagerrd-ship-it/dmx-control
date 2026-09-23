// UVPULS (2026-09-23): UV-kanalen slar pa SLAGET i refrangen - kort, skarp UV-puls (exact: motorn lagger inget golv, sa UV
// ar AV mellan slagen), rgb dampat i en mork palettfarg sa UV:n syns. Refrangens entre och "refrangen ar tillbaka"
// (repeatSim >= 0,92, sectionIndex >= 2) ger blinder + vit stot. Utanfor high: mjukare UV-puls (30 %). Pulsen ar effektens
// egen (modulate.pulse false) - den ligger i UV:n, inte i mastern. Pool high.
export const uvpuls = {
    key: "uvpuls", label: "UV-puls", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"],
    desc: "UV pa slaget i refrangen, rgb dampat - blinder nar refrangen kommer tillbaka.",
    drives: ["uv", "blinder"], exact: ["uv"],
    render(c) {
        const inHigh = c.section === "high";
        const hit = c.hasBeat ? Math.exp(-c.beatFrac / 0.09) : c.kickEnv;
        c.want.uv = Math.min(1, hit * (inHigh ? 1 : 0.3) + c.punch * 0.5);
        const back = inHigh && c.repeatSim >= 0.92 && c.sectionIndex >= 2 ? c.sectionEntry : 0; // refrangen ar tillbaka
        const entry = inHigh ? Math.max(c.sectionEntry * 0.7, back) : 0;
        if (entry > 0.4)
            c.want.blinder = entry;
        const hue = ((c.mixedSector(Math.floor(c.beatIdx / 8)) + 4) % 6) / 6; // kall ton mot UV:n
        const v = 0.14 + c.beatPulse * 0.22 + c.frame.spec.bass * 0.12 + c.punch * 0.25 + entry * 0.6;
        return c.hsv(hue, 1 - entry, Math.min(1, v));
    },
};
