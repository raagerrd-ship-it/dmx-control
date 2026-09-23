// PENDEL: en enda mjuk ljustopp svänger fram och tillbaka över riggen — men
// TAKTLÅST, ett helt svep per 8 taktslag. Lugn i tempot, ändå musikalisk: den
// vänder exakt på frasgränsen i stället för att glida ur fas med låten.
// (mclk stegar på taktslag när takt finns, annars på tid → fryser aldrig.)
export const pendel = {
    key: "pendel", label: "Pendel", tier: "lugn", modulate: { energy: true, pulse: false }, section: ["low", "intro"],
    desc: "En mjuk ljustopp svänger taktlåst över riggen, ett svep per fras.",
    render(c) {
        const step = c.mclk(1, 0.5); // ett steg per taktslag
        // FRASPERIOD (2026-09-23): med takt svanger pendeln KONTINUERLIGT over 4 takter ur sectionBars (takter sedan sektionsstart)
        // - den vander exakt pa frasgransen och borjar om nar sektionen byter. Utan takt: 16 steg pa klockan som forr.
        const phase = c.hasBeat && c.sectionBars > 0 ? (c.sectionBars % 4) / 4 : (step % 16) / 16; // fram och åter
        const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2; // 0..1..0
        const pos = tri * (c.count - 1);
        const d = Math.abs(c.idx - pos);
        const glow = Math.exp(-d * 1.5);
        const hue = c.mixedSector(Math.floor(step / 16)) / 6;
        return c.hsv(hue, 1, Math.min(1, 0.20 + glow * (0.55 + c.audio * 0.45) + c.punch * 0.2));
    },
};
