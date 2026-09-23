// Full fart: KRUSNING från MITTEN. v2 (2026-09-23): varje slag slar ner i MITTEN och krusningen VANDRAR utat - de inre
// lamporna tands pa slaget, de yttre en fjardedels slag senare, och varje ring klingar av som en vag som rullar ut.
// (v1 var "mitten ena takten, ytter nasta" - ett flip som matte rPerm 0,92-0,94 mot rave; publiken sag samma A/B-vaxling.
// Nu ar det en RORELSE ut fran mitten, inte en vaxling.) Krusningens HOJD skalas mot latens egen refrang (levelVsHighDb):
// 9 dB under refrangen ar den en liten krusning i mitten, vid refrangens niva slar den ut till kanterna med vit kam.
// Kontrastfarg pa ytterringen (som forr). <3 lampor: paritet = ring.
export const ripple = {
    key: "ripple", label: "Krusning", tier: "full", modulate: { energy: true, pulse: false }, section: ["high"], toggle: true,
    desc: "Slaget slar ner i mitten och krusningen rullar utat, hogre ju narmare refrangens niva.",
    render(c) {
        const center = (c.count - 1) / 2;
        const d = Math.abs(c.idx - center); // avstånd från mitten
        const maxD = center || 1;
        const ring = c.count < 3 ? (c.idx % 2) : d / maxD; // 0 = mitten .. 1 = kanten
        const isOuter = ring > 0.99;
        const lv = c.levelVsHighDb;
        const amp = lv !== 0 || c.section === 'high' ? Math.max(0.35, Math.min(1, 1 + lv / 9)) : 0.8; // refrangskala
        const delay = ring * 0.25; // fjardedels slag ut till kanten
        let age = c.beatFrac - delay;
        if (age < 0)
            age += 1; // slag sedan krusningen nadde DEN HAR ringen
        const wave = Math.exp(-age / 0.16) * (1 - ring * (1 - amp) * 0.8); // yttre ringar svagare nar amp ar lag
        const pairBase = c.mixedSector(Math.floor(c.beatIdx / 4));
        const hue = ((isOuter ? pairBase + 3 : pairBase) % 6) / 6; // motfärg mitt vs ytter
        const crest = amp > 0.9 && isOuter ? wave * 0.6 : 0; // vit kam i kanten vid refrangens niva
        const v = 0.08 + wave * (0.45 + 0.45 * amp) + c.audio * 0.15 + c.punch * 0.3;
        return c.hsv(hue, 1 - Math.max(c.punch * 0.35, crest), Math.min(1, v));
    },
};
