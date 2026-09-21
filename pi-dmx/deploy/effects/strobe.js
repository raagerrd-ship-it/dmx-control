// STROBE v2 (2026-09-21): bara i refrangen (section high) och bara nar musiken ber om det - vid drop (dropEnv) eller pa
// slaget i snabb musik. Emellan: en het, mattad glod som andas med nivan, sa looken inte ar en oavbruten blixt (v1 var
// hsv(hue,1,1) konstant och lamnade allt at motorns strobe-kanal). Strobe-onskan (c.want.strobe) foljer dropen.
export const strobe = {
    key: "strobe", label: "Strobe", tier: "full", section: ["high"],
    desc: "Blixt pa slaget och vid drop i refrangen, het glod emellan.",
    render(c) {
        const hue = c.mixedSector(c.beatIdx) / 6;
        const bpm = c.cfg.beat?.bpm ?? 0;
        const fast = bpm >= 128;
        const flash = c.dropEnv > 0.5 || (fast && c.beatHit) || c.punch > 0.8;
        c.want.strobe = Math.max(c.dropEnv, flash ? 0.6 : 0);
        if (flash)
            return c.hsv(hue, 0.3, 1);
        const glow = 0.25 + c.audio * 0.5 + c.beatPulse * 0.2;
        return c.hsv(hue, 1, Math.min(1, glow));
    },
};
