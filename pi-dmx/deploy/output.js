/**
 * OUTPUT-TJÄNSTEN — översätter ljus till inkopplade lampor.
 *
 * Dirigenten, effekterna och sluttrimningen ska INTE behöva veta hur en lampa
 * fungerar. De säger "skala ljusstyrkan ×0.4" eller "kalibrera och lägg på taket";
 * den här modulen vet resten: vilken kanal som bär ljusstyrkan, vilka som är färg,
 * vilka som är specialroller (strobe/hazer/uv/blinder/laser/co2) och hur varje
 * armaturs tändpunkt ska mappas.
 *
 * MOTIVET ÄR MÄTT (2026-08-07): kunskapen låg utspridd i ljustaket, hjärtslaget,
 * drop-headroom och kalibreringen — var och en via en kanalmask som måste minnas
 * att `dim` finns. Den glömdes: i en rigg med rollerna [dim,r,g,b,strobe,…] låg dim
 * på 183/255 medan färgkanalerna låg på 17 och 0, och eftersom masken uteslöt dim
 * nådde hjärtslaget aldrig lamporna (autokorrelation på DMX-utgången +0,09 vid
 * takten mot +0,11 för kontrollfördröjningen = ren slump). Efter inkapslingen:
 * +0,81 mot +0,24.
 *
 * Två masker med SKILDA syften — de var förut en, vilket var själva felet:
 *   light : kanalen som bär LJUSSTYRKAN (dim om fixturen har en, annars färgen).
 *           Bara en av dem, annars blir dämpningen kvadratisk.
 *   cal   : kanaler som ska KALIBRERAS — färg (och dim på en fixtur utan färg).
 *           Tändpunkten är en egenskap hos dioden; dim har ingen. Att ta med dim
 *           här komprimerade bort hjärtslaget (autokorrelation föll 0,53 → 0,15).
 */
import { fixtureRoles } from "./config.js";
const MIN_DIM = process.env.DMX_MIN_DIM === '1';
// SHOW-GOLV (2026-09-22, agaren i ladan: "jag vill ju att de skall ga precis ner till floor men inte under, om
// effekten inte skall stanga av lampan"). Regeln FANNS redan - calibrate lyfter varje varde > 0 till lampans
// TANDPUNKT - men tandpunkten ar 16 av 255, dvs 6 %, och det laser ogat som slackt i ett upplyst rum.
// DMX_FLOOR_CH hojer golvet till ett SYNLIGT varde i DMX-steg. Galler bara DIM-kanaler: att lyfta r/g/b skulle
// bleka ur kuloren (samma skal som MIN_DIM lamnar dem ifred). En ren nolla ar fortfarande svart - det ar sa
// effekten sager "slack den har armaturen" - utom med DMX_MIN_DIM=1, som da haller golvet i stallet for tandpunkten.
const FLOOR_CH = Math.max(0, Math.min(255, Number(process.env.DMX_FLOOR_CH ?? 40)));
/** DIM-TAK (ladan 10-01, stegtest: lamporna mattar vid DIM ~85 - 85/110/255 ser lika ut, DIM 1 lyser redan): skala DIM-kanalen
 *  linjart sa full show = DMX_DIM_MAX i stallet for 255; allt over ~85 var dod skala. 255 = av (som forr). Tant varde blir aldrig 0. */
const DIM_MAX = Math.max(1, Math.min(255, Number(process.env.DMX_DIM_MAX ?? 255)));
/** KALIBRERAD UTGANG v2 (se calibrate): opt-in DMX_CAL_V2=1. Ladans uppmatta varden 10-01 som standard. */
const CAL_V2 = process.env.DMX_CAL_V2 === '1';
const CAL_PMIN = Number(process.env.DMX_CAL_PMIN ?? 270); // tandgransen DIM x farg
const CAL_DMAX = Number(process.env.DMX_CAL_DMAX ?? 127); // DIM full (>= 128 = lampans fulllage)
const CAL_CMAX = Number(process.env.DMX_CAL_CMAX ?? 120); // farg full
const CAL_PMAX = CAL_DMAX * CAL_CMAX;
const CAL_GAMMA = Number(process.env.DMX_CAL_GAMMA ?? 1); // < 1 lyfter mitten: showens typiska B 0,1-0,4 landade i den doda nedre delen (ladan 10-01)
const CAL_BMIN = Number(process.env.DMX_CAL_BMIN ?? 0.002); // under detta = slackt
const HOLD_MS = 120;
/** KULORLYFT (2026-09-23, agaren i ladan: "lamporna kor nastan hela tiden med alla LED R G B paslagna ... kravet ar ju bara att EN
 *  kanal ar over tandpunkten"). Forr lyftes VARJE fargkanal > 0 till sin tandpunkt for sig - ett spar av gront och blatt i en rod
 *  lampa (punch-avmattning, ambient) blev 16/255 pa alla tre = alla LED tanda och kuloren urblekt. Nu: lampans STARKASTE fargkanal
 *  ska na tandpunkten; ar den under skalas alla fargkanaler med samma faktor (kuloren bevaras), Ovriga kanaler: se DISTINKTA FARGER. DIM-kanalen lyfts som forr. DMX_HUE_LIFT=0 = som forr. */
const HUE_LIFT = process.env.DMX_HUE_LIFT !== '0';
/** DISTINKTA FARGER (2026-09-23 22:30, agaren: "nar nagon av R/G/B kommer vid slackgransen kan den flimra nar den gar over/under -
 *  styr mot distinkta farger som inte behover under t.ex. 5 %"). En svag fargkanal ar tand eller slackt efter sin ANDEL av lampans
 *  starkaste kanal, inte efter absolut niva - sa den byter bara nar FARGEN andras, aldrig nar ljusstyrkan pulserar. Tand: >= HUE_RATIO_ON
 *  av starkaste (halls pa minst tandpunkten); slacks under HUE_RATIO_OFF (hysteres). */
const HUE_RATIO_ON = Number(process.env.DMX_HUE_RATIO_ON ?? 0.25);
const HUE_RATIO_OFF = Number(process.env.DMX_HUE_RATIO_OFF ?? 0.15);
/** RENA PRIMARFARGER UNDER TANDPUNKTEN (2026-09-27, agaren i ladan: "i tysta partier tands alla LED (R G B), kanns hackigt ...
 *  vi sabbar manga effekter"). Under tandpunkten kan lampan inte visa en blandfarg: kulorlyftet gav starkaste kanalen 16 och
 *  varje sidokanal >= 25 % ocksa 16 -> tre lika varden = vitt. Nu: ar starkaste fargkanalen under sin tandpunkt lyser BARA
 *  den, pa tandpunkten (ren R/G/B); ar den under LOW_OFF_K x tandpunkten ar lampan SLACKT (osynlig anda). DMX_LOW_PURE=0 = som forr. */
const LOW_PURE = process.env.DMX_LOW_PURE !== '0';
/** Agaren 21:25: "under kanske 10 % slacks, over ar den redan hojd over slackpunkten". Per FARGKANAL, absolut i DMX-steg:
 *  pa vid >= LOW_ON_CH (26 = 10 %), av under LOW_OFF_CH (20) - hysteres sa gransen inte flimrar. Ingen lyftning av svaga
 *  sidokanaler langre (det var det som tande alla tre dioderna). Kanaler pa/over tandpunkten lamnas ifred. */
const LOW_ON_CH = Number(process.env.DMX_LOW_ON_CH ?? 26);
const LOW_OFF_CH = Number(process.env.DMX_LOW_OFF_CH ?? 20);
const FOG_HEAT_MAX = 45000; // datablad: 40–50 s sprutning i sträck
const FOG_RECOVER = 0.15; // vila dränerar 15 % av realtid  // släpp-håll: bryggar mikro-0-dippar så dioden inte strobar
// Förberäknad LUT för Gamma 2.2 för att eliminera Math.pow i den heta loopen
const GAMMA_LUT = new Uint8Array(1024);
for (let i = 0; i < 1024; i++) {
    GAMMA_LUT[i] = Math.round(Math.pow(i / 1023, 2.2) * 255);
}
export class FixtureOutput {
    // Publika Array-vyer så postprocess.ts slipper funktionsanrop
    light = new Uint8Array(512);
    direct = new Uint8Array(512);
    cal = new Uint8Array(512);
    dimCal = new Uint8Array(512); // dim: bara tändpunkt (clamp), ingen remap
    // Opt-in: hall DIM pa tandpunkten i stallet for helsvart nar effekten/grinden skickar 0 (se calibrate).
    holdVal = new Float32Array(512);
    holdUntil = new Float32Array(512);
    builtFor = null;
    // Rökmaskinens tillstånd — enhetens egen, inte musikens.
    fogUntil = 0; // pågående puff till (wall-clock ms)
    lastFogMs = -1e9; // senaste puff (cooldown)
    fogHeat = 0; // värmekonto (ms)
    fogWasEnabled = false;
    /** Högsta använda kanal + 1 — loopar behöver aldrig gå längre. */
    maxCh = 0;
    // Pre-kalkylerade fixtur-analyser för att slippa strängjämförelser i writeFixture
    fastFixtures = [];
    /** Bygg om maskerna när fixture-listan byts (referensjämförelse → gratis per frame). */
    build(fixtures) {
        if (this.builtFor === fixtures)
            return;
        this.builtFor = fixtures;
        this.light.fill(0);
        this.cal.fill(0);
        this.dimCal.fill(0);
        this.direct.fill(0);
        this.fastFixtures = [];
        let mx = 0;
        for (const fx of fixtures) {
            const roles = fixtureRoles(fx);
            const hasColor = roles.includes("r") || roles.includes("g") || roles.includes("b") || roles.includes("w");
            const hasDim = roles.includes("dim");
            const hasW = roles.includes("w");
            this.fastFixtures.push({ base: fx.address - 1, roles, hasColor, hasDim, hasW });
            for (let r = 0; r < roles.length; r++) {
                const ch = fx.address - 1 + r;
                if (ch < 0 || ch >= 512)
                    continue; // hög adress får aldrig skriva utanför universet
                const role = roles[r];
                const isColor = role === "r" || role === "g" || role === "b" || role === "w";
                // Specialroller skrivs direkt av motorn per frame och får INTE glidas ut av
                // ballistiken: en 255 som tonar nedåt skulle få strobe att fara mellan takter,
                // blinder att klänga kvar en halv sekund och hazer att flimra.
                if (role === "strobe" || role === "hazer" || role === "uv" || role === "blinder" || role === "laser" || role === "co2")
                    this.direct[ch] = 1;
                if (role === "dim")
                    this.light[ch] = 1;
                else if (isColor && !hasDim)
                    this.light[ch] = 1;
                if (isColor || (role === "dim" && !hasColor))
                    this.cal[ch] = 1;
                // DIM PÅ EN FÄRGFIXTUR: tändpunkten gäller ändå — dioden lyser inte under den —
                // men bara som ett GOLV. Full remap (1..255 → on..tak) skulle komprimera
                // hjärtslaget, vilket mättes: autokorrelationen på utgången föll 0,53 → 0,15.
                else if (role === "dim")
                    this.dimCal[ch] = 1;
                if (ch + 1 > mx)
                    mx = ch + 1;
            }
        }
        this.maxCh = Math.min(512, mx);
    }
    /**
     * Skala ljusstyrkan på alla fixturer. Anroparen behöver inte veta något om lampor.
     * @param mul 0..1 multiplikator
     */
    scale(universe, mul) {
        for (let ch = 0; ch < this.maxCh; ch++) {
            if (!this.light[ch])
                continue;
            const v = universe[ch];
            if (v === 0)
                continue; // redan släckt — lämna det så
            const out = (v * mul + 0.5) | 0; // Bitvis avrundning
            universe[ch] = out < 1 ? 1 : out; // tänt förblir tänt
        }
    }
    /**
     * GE HJÄRTSLAGET UTRYMME ATT PULSA I.
     * En lugn effekt kan ligga strax över tändpunkten — MÄTT 2026-08-07 gav `breathe`
     * DMX 18 med tändpunkt 16. Pulsen vill då ta 18 → 8, men kalibreringsgolvet lyfter
     * tillbaka till 16: åtta av tio steg äts upp och slaget syns inte alls.
     * Lösningen är inte att ändra pulsen utan att se till att det FINNS mörker under
     * ljuset. Allt som lyser men ligger under `on + room` lyfts till den nivån; ljusa
     * partier rörs inte. Effekten blir att lugna lägen ligger på ~20 % i stället för 7 %
     * — vilket också var önskemålet "behåll gärna 20 % ljusstyrka".
     * @param room hur många DMX-steg över tändpunkten som minsta nivå ska ligga
     */
    ensurePulseRoom(universe, fixtures, room) {
        // Vi kan iterera via this.fastFixtures här för snabbare lookup
        for (let f = 0; f < fixtures.length; f++) {
            const fx = fixtures[f];
            const fast = this.fastFixtures[f];
            const on = fx.cal ? (fx.cal.on || 0) : 0;
            const min = on + room;
            const base = fast.base;
            for (let i = 0; i < fast.roles.length; i++) {
                const ch = base + i;
                if (ch < 0 || ch >= 512 || !this.light[ch])
                    continue;
                const v = universe[ch];
                if (v > 0 && v < min)
                    universe[ch] = min;
            }
        }
    }
    /** Kläm ljusstyrkan mot ett tak i byte (drop-headroom) — skalar inte, klipper bara. */
    cap(universe, capByte) {
        for (let ch = 0; ch < this.maxCh; ch++) {
            if (this.light[ch] && universe[ch] > capByte)
                universe[ch] = capByte;
        }
    }
    /**
     * SISTA STEGET FÖRE UTGÅNG: tändpunkt som GOLV + master som TAK.
     */
    hueOn = new Uint8Array(512); // KULORLYFT: kanalen ar tand (hysteres)
    lowLit = new Uint8Array(512); // 10 %-REGELN: lampan (indexerad pa basadressen) ar tand (hysteres pa starkaste fargkanalen)
    calibrate(universe, fixtures, master, nowMs) {
        const top = (255 * master + 0.5) | 0;
        for (let f = 0; f < fixtures.length; f++) {
            const fx = fixtures[f];
            const fast = this.fastFixtures[f];
            const c = fx.cal;
            const base = fast.base;
            const on = c ? (c.on || 0) : 0;
            // KALIBRERAD UTGANG v2 (DMX_CAL_V2=1, ladan 10-01 - full kalibrering med agarens oga): lampan lyser nar DIM x farg >= ~270,
            // ar full vid DIM 127 x farg 120, och ogat ser fordubblingar. Motorns DIM x starkaste farg (0..1) blir EN ljusstyrka B som
            // mappas exponentiellt fran tandgransen till max: P = PMIN * (PMAX/PMIN)^B, delas som DIM ~ sqrt(P*DMAX/CMAX) och farg = P/DIM;
            // kuloren (forhallandet mellan r/g/b) behalls. Ersatter golv 40, tandpunkt 16, kulorlyft och DIM_MAX. B = 0 -> slackt.
            if (CAL_V2) {
                let dimCh = -1, dimRaw = 255, mx = 0;
                for (let i = 0; i < fast.roles.length; i++) {
                    const ch = base + i;
                    if (ch < 0 || ch >= 512)
                        continue;
                    const role = fast.roles[i];
                    if (role === "dim") {
                        dimCh = ch;
                        dimRaw = universe[ch];
                    }
                    else if (role === "r" || role === "g" || role === "b" || role === "w") {
                        if (universe[ch] > mx)
                            mx = universe[ch];
                    }
                }
                const B = (dimCh >= 0 ? dimRaw / 255 : 1) * (mx / 255) * master;
                const lit = B > CAL_BMIN;
                const P = lit ? CAL_PMIN * Math.pow(CAL_PMAX / CAL_PMIN, Math.pow(Math.min(1, B), CAL_GAMMA)) : 0;
                const dimOut = !lit ? 0 : dimCh >= 0 ? Math.max(1, Math.min(CAL_DMAX, Math.round(Math.sqrt(P * CAL_DMAX / CAL_CMAX)))) : 0;
                const cTop = !lit ? 0 : dimCh >= 0 ? Math.min(CAL_CMAX, P / dimOut) : Math.min(CAL_CMAX, P / CAL_DMAX);
                for (let i = 0; i < fast.roles.length; i++) {
                    const ch = base + i;
                    if (ch < 0 || ch >= 512)
                        continue;
                    const role = fast.roles[i];
                    if (role === "dim")
                        universe[ch] = dimOut;
                    else if (role === "r" || role === "g" || role === "b" || role === "w") {
                        // FLIMMER PER DIOD (ladan 10-01): en svag fargandel nara tandgransen tandes/slacktes i takt med niva-rippel. Hysteres:
                        // andelen av starkaste fargen (pa >= 25 %, av < 15 %) OCH DIM x varde (pa >= 1,15 x PMIN, av < 0,85 x PMIN).
                        const raw = universe[ch];
                        const v = lit && mx > 0 ? Math.round(cTop * raw / mx) : 0;
                        const was = this.hueOn[ch] === 1;
                        const ratio = mx > 0 ? raw / mx : 0;
                        const prod = (dimCh >= 0 ? dimOut : CAL_DMAX) * v;
                        const keep = v > 0 && (raw === mx || (ratio >= (was ? 0.15 : 0.25) && prod >= (was ? 0.85 : 1.15) * CAL_PMIN)); // starkaste fargen styrs av B (lit)
                        this.hueOn[ch] = keep ? 1 : 0;
                        universe[ch] = keep ? v : 0;
                    }
                }
                continue;
            }
            // KULORLYFT: lampans starkaste fargkanal (r/g/b/w) och dess tandpunkt -> en gemensam skalfaktor i stallet for lyft per kanal.
            let hueScale = 1, hueMaxCh = -1, hueMaxRaw = 0, hueMaxOn = 0;
            if (HUE_LIFT && c && !LOW_PURE) { // (hueScale anvands inte under LOW_PURE - hoppa over slingan)
                let mx = 0, mxOn = 0;
                for (let i = 0; i < fast.roles.length; i++) {
                    const ch = base + i;
                    if (ch < 0 || ch >= 512 || this.cal[ch] !== 1 || this.dimCal[ch] === 1)
                        continue;
                    const role = fast.roles[i];
                    if (role !== "r" && role !== "g" && role !== "b" && role !== "w")
                        continue;
                    const raw = universe[ch];
                    if (raw > mx) {
                        mx = raw;
                        hueMaxCh = ch;
                        mxOn = (role === "r" ? c.onR : role === "g" ? c.onG : role === "b" ? c.onB : c.onW) ?? on;
                    }
                }
                hueMaxRaw = mx;
                hueMaxOn = mxOn;
                if (mx > 0 && mx < mxOn)
                    hueScale = mxOn / mx;
            }
            // 10 %-REGELN PER LAMPA (kodgranskning 09-28: per kanal flippade kuloren rod<->orange i takten nar hjartpulsen
            // pendlade en sidokanal kring 20/26). Nu avgors tand/slackt av lampans STARKASTE fargkanal med hysteres
            // (pa >= LOW_ON_CH, av < LOW_OFF_CH); tand lampa skickar fargkanalerna RAA (inget lyft - under tandpunkten lyser
            // de inte fysiskt anda), slackt lampa nollar dem. Kuloren andras bara nar fargen andras, inte med ljusstyrkan.
            let lampLit = true;
            if (LOW_PURE && c) {
                let mxRaw = 0;
                for (let i = 0; i < fast.roles.length; i++) {
                    const ch = base + i;
                    if (ch < 0 || ch >= 512 || this.cal[ch] !== 1 || this.dimCal[ch] === 1)
                        continue;
                    const role = fast.roles[i];
                    if (role !== "r" && role !== "g" && role !== "b" && role !== "w")
                        continue;
                    if (universe[ch] > mxRaw)
                        mxRaw = universe[ch];
                }
                lampLit = this.lowLit[base] === 1 ? mxRaw >= LOW_OFF_CH : mxRaw >= LOW_ON_CH;
                this.lowLit[base] = lampLit ? 1 : 0;
            }
            for (let i = 0; i < fast.roles.length; i++) {
                const ch = base + i;
                if (ch < 0 || ch >= 512)
                    continue;
                const isCal = this.cal[ch] === 1, isDim = this.dimCal[ch] === 1;
                if (!isCal && !isDim)
                    continue;
                const role = fast.roles[i];
                const isColor = !isDim && (role === "r" || role === "g" || role === "b" || role === "w");
                const onCh = !c ? 0 : isDim ? on
                    : ((role === "r" ? c.onR : role === "g" ? c.onG : role === "b" ? c.onB : role === "w" ? c.onW : undefined) ?? on);
                let raw = universe[ch];
                if (LOW_PURE && isColor) {
                    if (!lampLit) {
                        universe[ch] = 0;
                        this.holdUntil[ch] = 0;
                        continue;
                    }
                    const v1 = raw > top ? top : raw;
                    universe[ch] = v1;
                    this.holdVal[ch] = v1;
                    this.holdUntil[ch] = nowMs + HOLD_MS;
                    continue;
                }
                if (HUE_LIFT && isColor && raw > 0) {
                    // starkaste kanalen (och alla andra) skalas upp till tandpunkten; ovriga kanaler lyfts INTE var for sig
                    if (hueScale !== 1) {
                        raw = Math.round(raw * hueScale);
                        if (raw > 255)
                            raw = 255;
                    }
                    if (ch !== hueMaxCh && hueMaxRaw > 0) {
                        // ANDEL av starkaste kanalen (fore skalning) avgor tand/slackt, med hysteres - ljusstyrkans puls paverkar inte beslutet
                        const ratio = universe[ch] / hueMaxRaw;
                        const on = this.hueOn[ch] === 1 ? ratio >= HUE_RATIO_OFF : ratio >= HUE_RATIO_ON;
                        if (!on) {
                            this.hueOn[ch] = 0;
                            universe[ch] = 0;
                            this.holdUntil[ch] = 0;
                            continue;
                        }
                        this.hueOn[ch] = 1;
                        if (raw < onCh)
                            raw = onCh; // tand kanal halls pa minst tandpunkten (kalibreringen nedan klampar mot taket)
                        const v2 = raw > top ? top : raw;
                        universe[ch] = v2;
                        this.holdVal[ch] = v2;
                        this.holdUntil[ch] = nowMs + HOLD_MS;
                        continue;
                    }
                    this.hueOn[ch] = 1;
                }
                else if (HUE_LIFT && isColor) {
                    this.hueOn[ch] = 0;
                }
                // Golvet ar tandpunkten, eller DMX_FLOOR_CH nar den ar hogre (bara DIM - se FLOOR_CH). Aldrig over taket.
                const floorCh = FLOOR_CH > onCh && isDim ? (FLOOR_CH > top ? top : FLOOR_CH) : onCh;
                let out;
                if (raw > 0) {
                    out = raw < floorCh ? floorCh : raw > top ? top : raw;
                    this.holdVal[ch] = out;
                    this.holdUntil[ch] = nowMs + HOLD_MS;
                }
                else if (nowMs < this.holdUntil[ch]) {
                    out = this.holdVal[ch];
                }
                else if (MIN_DIM && isDim && top > 0) { // haller GOLVET (inte bara tandpunkten) nar effekten skickar ren nolla
                    // ALDRIG HELSVART (2026-09-22, agaren i ladan: "lamporna stangs av ... output maste ju anda ske mot kalibrerad
                    // lampa"): tandpunkten lyfter bara varden > 0, sa en ren nolla fran effekten eller tystnadsgrinden gick igenom
                    // som svart armatur. Med DMX_MIN_DIM=1 halls DIM-kanalen pa tandpunkten sa lange showen alls lyser (master > 0);
                    // fargkanalerna lamnas orerda (att lyfta r/g/b skulle andra kuloren). Blackout/master 0 slacker fortfarande.
                    out = floorCh;
                }
                else {
                    out = 0;
                }
                universe[ch] = isDim && DIM_MAX < 255 && out > 0 ? Math.max(1, Math.round(out * DIM_MAX / 255)) : out; // DMX_DIM_MAX: se ovan
            }
        }
    }
    fogTick(nowMs, dtMs, want, fog, manual = false) {
        if (!fog.enabled) {
            if (this.fogWasEnabled) { // avstängd → glöm uppvärmning och släpp pågående puff,
                this.fogWasEnabled = false; // annars fastnar rök-kanalen tänd
                fog.warmStartMs = 0;
                this.fogUntil = 0;
            }
            return false;
        }
        // Flank: maskinen slogs precis på → starta uppvärmningsklockan. Sätts bara om den
        // saknas, så en omstart ärver den riktiga påslagstiden.
        if (!this.fogWasEnabled) {
            this.fogWasEnabled = true;
            if (!fog.warmStartMs)
                fog.warmStartMs = nowMs;
        }
        const spraying = nowMs < this.fogUntil;
        if (spraying) {
            this.fogHeat += dtMs;
            fog.sprayMs = (fog.sprayMs ?? 0) + dtMs; // drifträknare (vätska + värmearbete)
        }
        else {
            this.fogHeat = Math.max(0, this.fogHeat - dtMs * FOG_RECOVER);
        }
        if (spraying && this.fogHeat >= FOG_HEAT_MAX)
            this.fogUntil = 0; // nödstopp
        const gapOk = manual || nowMs - this.lastFogMs > fog.cooldownMs; // manuell puff (Rok nu) kringgar cooldownen
        const heatOk = this.fogHeat + fog.burstMs <= FOG_HEAT_MAX;
        if (want && !spraying && gapOk && heatOk) {
            this.fogUntil = nowMs + fog.burstMs;
            this.lastFogMs = nowMs;
            fog.bursts = (fog.bursts ?? 0) + 1;
        }
        return nowMs < this.fogUntil;
    }
    fogState(nowMs) {
        return { spraying: nowMs < this.fogUntil, heat: Math.min(1, this.fogHeat / FOG_HEAT_MAX) };
    }
    writeFog(u, address, level) {
        const ch = address - 1;
        if (ch >= 0 && ch < 512)
            u[ch] = Math.max(0, Math.min(255, (level + 0.5) | 0));
    }
    /**
     * SKRIV EN FIXTUR: abstrakt färg + specialsignaler → dess faktiska kanaler.
     * Effekterna returnerar [r,g,b] i 0..1 och vet ingenting om kanaler; hela
     * översättningen bor här. En ny fixturtyp kräver bara en rolltabell.
     *
     * RGBW: vitt = min(r,g,b) så färgkanalerna behåller sin mättnad.
     * Har fixturen en dim bär DEN ljusstyrkan (färgen skalas inte av master), annars
     * skalas färgen — samma princip som `light`-masken ovan.
     */
    writeFixture(u, fx, rgb, master, strobeVal = 0, specialty) {
        // Hitta indexet i cfg.fixtures som matchar för att ta fram fastFixture
        // Alternativt kan anroparen skicka med indexet för O(1) lookup. För nu loopar vi:
        // (skrapjakten 10-01: forr .find med en closure per lampa och ruta; samma forsta traff med en slinga)
        const want = fx.address - 1;
        let fast;
        for (let k = 0; k < this.fastFixtures.length; k++)
            if (this.fastFixtures[k].base === want) {
                fast = this.fastFixtures[k];
                break;
            }
        if (!fast)
            return;
        const base = fast.base; // DMX är 1-indexerat
        const m = clamp01(master);
        const r = rgb[0], g = rgb[1], b = rgb[2];
        const w = Math.min(r, g, b);
        const dim = Math.max(r, g, b);
        const colorScale = fast.hasDim ? 1 : m;
        for (let i = 0; i < fast.roles.length; i++) {
            const ch = base + i;
            if (ch < 0 || ch >= 512)
                continue;
            switch (fast.roles[i]) {
                case "r":
                    u[ch] = GAMMA_LUT[(clamp01((r - (fast.hasW ? w : 0)) * colorScale) * 1023) | 0];
                    break;
                case "g":
                    u[ch] = GAMMA_LUT[(clamp01((g - (fast.hasW ? w : 0)) * colorScale) * 1023) | 0];
                    break;
                case "b":
                    u[ch] = GAMMA_LUT[(clamp01((b - (fast.hasW ? w : 0)) * colorScale) * 1023) | 0];
                    break;
                case "w":
                    u[ch] = GAMMA_LUT[(clamp01(w * colorScale) * 1023) | 0];
                    break;
                case "dim":
                    u[ch] = GAMMA_LUT[(clamp01(fast.hasColor ? m : dim * m) * 1023) | 0];
                    break;
                case "strobe":
                    u[ch] = Math.max(0, Math.min(255, Math.max(strobeVal, specialty?.strobe ?? 0)));
                    break;
                case "hazer":
                    u[ch] = specialty?.hazer ?? 0;
                    break;
                case "uv":
                    u[ch] = specialty?.uv ?? 0;
                    break;
                case "blinder":
                    u[ch] = specialty?.blinder ?? 0;
                    break;
                case "laser":
                    u[ch] = specialty?.laser ?? 0;
                    break;
                case "co2":
                    u[ch] = specialty?.co2 ?? 0;
                    break;
            }
        }
    }
}
const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
