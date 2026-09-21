/**
 * Runtime config. Kept as a single object so the mobile UI can mutate it
 * over WebSocket and we can persist to /var/lib/audio-dmx-engine/config.json.
 */
export const defaultConfig = {
    audio: { device: "hw:0,0", rate: 48000, channels: 2 },
    fft: { size: 512, hop: 128 },
    detection: {
        autoGainTarget: 0.5,
        tauUp: 90,
        tauDown: 30,
        noiseFloor: 0.003,
    },
    fixtures: [
        // 7-kanals RGB-parkanor: R,G,B,DIM,STROBE,MACRO,MACRO-SPEED.
        // rgb7-presetet skickar DIM=255 (master), STROBE=0/live, MACRO+SPEED=0
        // så lampornas inbyggda auto-program hålls av och vår motor äger showen.
        { name: "Par 1", address: 1, preset: "rgb7" },
        { name: "Par 2", address: 8, preset: "rgb7" },
        { name: "Par 3", address: 15, preset: "rgb7" },
        { name: "Par 4", address: 22, preset: "rgb7" },
    ],
    mode: "smart",
    audioInput: "aux",
    sensitivity: 0.6,
    dynamics: 0.6,
    calmDecay: 0.42,
    beatPulse: true,
    beatSyncStrength: 0.18, // normal PLL-korrektion mot trumslag
    beatSyncOverride: false, // stämnings-vredet styr som default
    energyDrivesMode: true,
    smartDwellMs: 15000,
    master: 1.0,
    chaseStyle: "pingpong",
    rotation: { breathe: true, mono: false, aurora: true, wave: true, chase: true, drops: true, pulse: true, party: true, snap: true, bounce: true, strobe: true, rave: true },
    modeButton: { chip: "gpiochip0", line: 27 }, // GPIO27 = Codec Zero onboard button (SW1)
    intensityRing: { bus: 0, device: 0, maxBright: 0.40, pulseBoost: 0.18, blackoutFadeMs: 400 }, // WS2812 12-LED på SPI0 MOSI (GPIO10, pin 19)
    bleDevices: [], // paras via /setup — sidecarn respawnar utan att tappa listan
    showLeadMs: 50,
    dmxMaxHz: 100, // 100 Hz för tightare bas/drop-synk; helper cappar till wire-limit
    // Rok-defaults satta for Ibiza LSM1500PRO + Cameo XTRA HEAVY: maskinen ger
    // 250 m3/min och vatskan ar den tataste sorten (extremt lang svavtid, gjord
    // for UTOMHUS). I ett slutet rum fyller en 2.5s-puff for mycket och den langa
    // svavtiden gor att man inte kan angra sig. Maskinen orkar dessutom bara
    // 40-50s i strack innan varmeblocket maste hamta igen, sa 1s/60s ar ~1.6%
    // arbetscykel - den hinner alltid vara varm. Oka vid behov, inte tvartom.
    fog: { enabled: false, address: 13, onDrop: true, burstMs: 1000, cooldownMs: 120000, level: 255, warmupMs: 600000, sprayMs: 0, bursts: 0 },
    dropBlackout: true, // dramaturgisk tystnad — låg risk, lyfter varje drop
    scenicAnchor: false, // ägar-val: antar lampor i rad vänster→höger
    energyCeiling: true, // direkt VU = ljusstyrka; standard på (drop/punch bypassar)
    clubMode: false, // hård kontrast (VU²); opt-in — rör inte det trogna linjära läget
    ambientGlow: false, // tystnad = HELT mörkt som standard; slå på för varm vilo-glöd
    riserStrobe: false, // ägar-val: accelererande strobe + vit-kollaps under risers
    strobeUnlimited: false, // säkert tak (3 Hz) som standard — se kommentaren i typen
    dropHeadroom: false, // ägar-val: normal ≤95%, drops → 100% (huvudrum för pop)
    regiPro: false, // master-toggle: när AV rör stämnings-vredet inte Regi-flaggorna
};
export const PRESET_ROLES = {
    rgb: ["r", "g", "b"],
    // 7-ch standard-layout: R,G,B,DIM(master),STROBE,MACRO,MACRO-SPEED.
    // DIM styrs via role "dim" (writeFixture skriver master*255 när R/G/B finns);
    // STROBE via role "strobe"; sista två som "unused" → 0 varje frame (fill(0)
    // före writeFixture) så inbyggda auto-program aldrig triggas.
    rgb7: ["r", "g", "b", "dim", "strobe", "unused", "unused"],
    rgbw: ["r", "g", "b", "w"],
    dimmer: ["dim"],
};
export function fixtureRoles(fx) {
    if (fx.preset === "custom")
        return fx.roles ?? [];
    return PRESET_ROLES[fx.preset];
}
/**
 * Highest DMX channel used by any fixture, or 0 if there are none.
 * The C sidecar accepts frames from 24 to 512 slots — the fewer we send,
 * the faster each frame gets on the wire (fewer bytes @ 44 µs each).
 */
export function activeSlots(fixtures) {
    let max = 0;
    for (const fx of fixtures) {
        const w = fixtureRoles(fx).length;
        const top = fx.address + w - 1;
        if (top > max)
            max = top;
    }
    // Clamp to spec-min 24, spec-max 512
    if (max < 24)
        max = 24;
    if (max > 512)
        max = 512;
    return max;
}
