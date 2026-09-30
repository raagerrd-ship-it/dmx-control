// HJÄRTSLAG: dubbelslaget. Ett kraftigt slag på taktslaget och ett svagare strax
// efter (lub-DUB), taktlåst så det alltid ligger rätt i tempot. Ger en organisk,
// nästan kroppslig känsla som en vanlig enkelpuls inte har — och den syns även
// på lugnare partier eftersom den inte behöver hårda transienter.
export const hjarta = {
    key: "hjarta", label: "Hjärtslag", tier: "fart", modulate: { energy: true, pulse: false }, section: ["low", "break"],
    desc: "Dubbelpuls i takten — ett kraftigt slag och ett svagare efterslag, som ett hjärta.",
    render(c) {
        // SPRIDNING INIFRAN OCH UT (2026-09-27): slaget landar pa mittlamporna och nar kanterna 0,12 slag senare - HELA kurvan
        // ar forskjuten per ring, inte bara en liten additiv term (forr 0,25 x en 0,04-slags glidning per idx: osynlig pa fyra
        // lampor, sa hjarta lastes som en uniform puls = pulse). Ring = avstand fran mitten (0,5 / 1,5 pa fyra lampor).
        const half = (c.count - 1) / 2;
        const ring = Math.max(0, Math.abs(c.idx - half) - 0.5) / Math.max(0.5, half - 0.5); // 0 inre .. 1 yttre
        let f = c.beatFrac - ring * 0.12;
        if (f < 0)
            f += 1; // kantens slag ar forra slagets svans tills det nar dit
        const lub = Math.exp(-f / 0.10); // huvudslaget
        const dub = Math.exp(-Math.max(0, f - 0.22) / 0.09) * (f > 0.22 ? 0.55 : 0);
        const beat = c.hasBeat ? Math.max(lub, dub) : c.heartPulse; // utan taktlas: riktiga kickar i stallet for att sta stilla pa 1,0 (09-27)
        const hue = 0.98 + c.frame.spec.bass * 0.04; // djupröd → varmare med basen
        const v = 0.10 + beat * (0.75 + 0.1 * (1 - ring)) + c.frame.spec.kick * 0.15; // mitten slar en aning hardare
        return c.hsv(hue % 1, 1 - beat * 0.25, Math.min(1, v));
    },
};
