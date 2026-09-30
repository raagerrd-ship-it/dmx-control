// VISKA: nästan svart rum där bara PERKUSSIONEN syns. Ingen grundnivå att tala
// om — virvel och hi-hat tänder korta gnistor på var sin lampa, kicken ger en
// dov mörkröd puls. Byggd för en bar tidigt på kvällen: närvaro utan blink.
// Använder trum-envelopen (drum), som numera slår diskret i stället för att glöda.
export const viska = {
    key: "viska", label: "Viska", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["intro", "break"],
    desc: "Nästan mörkt — bara diskreta gnistor från virvel och hi-hat, dov puls på kicken.",
    flat: true, // statiskt svep → kortare dwell
    render(c) {
        const d = c.drum;
        // VANDRANDE GNISTOR (2026-09-27): forut en fast trumrost per lampa (idx % 3) = samma figur som drumkit (rPerm 0,78-0,96 pa
        // ladans facit). Nu vandrar hi-hat-gnistan ett steg per attondel runt riggen, virveln slar pa en grupp i taget (jamn/udda
        // eller inre/yttre via c.grouping) och kicken ar en dov rod puls pa ALLA - viskningen ror sig, drumkit star.
        const n = Math.max(1, c.count);
        const hatPos = c.hasBeat ? Math.floor((c.beatIdx + c.beatFrac) * 2) % n : c.mclk(0.5, 0.12) % n;
        const hat = hatPos === c.idx ? d.hat * 0.6 : 0;
        // Virveln slar pa lampan MITT EMOT hi-haten (vandrar med den) - gruppvaxling per slag gav backbeat-figuren (rPerm 0,81-0,85).
        const snare = (hatPos + (n >> 1)) % n === c.idx ? d.snare * 0.75 : d.snare * 0.1;
        const kick = d.kick * (c.group === 0 ? 0.35 : 0.12); // dov rod puls, tyngst pa ena gruppen
        const spark = Math.max(hat, snare, kick);
        const hue = spark === hat && hat > 0 ? 0.55 : spark === snare ? 0.10 : 0.02; // iskall / varmvit / röd
        const sat = hue === 0.10 ? 0.25 : 0.9;
        return c.hsv(hue, sat, Math.min(1, 0.20 * c.heart(0.35) + spark)); // vilo-glöden pulsar med hjartat, gnistorna ororda
    },
};
