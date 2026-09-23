/**
 * Effect engine: consume Frames from the analyser, write a 512-byte DMX
 * universe.
 *
 * Each fixture in cfg.fixtures gets rendered based on its index. Fixture
 * channel-layout is honored (RGB / RGBW / dimmer).
 */
import { fixtureRoles } from "./config.js";
import { FixtureOutput } from "./output.js";
import { beatPhase, beatMs as beatPeriod, beatIndex, hasBeat as beatLocked, MIN_BEAT_CONFIDENCE } from "./beatClock.js";
import { PostProcess } from "./postprocess.js";
import { EFFECT_MAP, TIER, sectionPool, meetsRequirements, TOGGLE_POOL, modulateOf } from "./effects/registry.js";
import { composeLamp } from "./heartbeat/contract.js";
import { fitScore } from "./effects/fit.js";
import { PALETTES, ALL_SECTORS, setPalette, currentPalette, mixedSector } from "./effects/palette.js";
// PALETT-LAS (DMX_PALETTE): lås färgerna till en palett oavsett klang och läge. Namn ur listan
// nedan eller en sektorlista "4,4.6,5.55" (sektor/6 = hue: 0 röd, 1 gul, 2 grön, 3 cyan, 4 blå,
// 5 magenta — bråkdelar går bra, alla konsumenter räknar mixedSector()/6). Födelsedagsbarnet
// 2026-09-05 ville ha blå/lila/rosa. Tom/osatt = som förut (dirigenten väljer per fras).
const NAMED_PALETTES = {
    fodelsedag: [4, 4.6, 5.55], // blå 240°, lila 276°, rosa 333°
    bla: [3.7, 4, 4.3], rosa: [5.3, 5.55, 5.8], eld: [0, 0.4, 1], regnbage: ALL_SECTORS,
};
const PALETTE_LOCK = (() => {
    const v = (process.env.DMX_PALETTE ?? "").trim();
    if (!v)
        return null;
    if (NAMED_PALETTES[v.toLowerCase()])
        return NAMED_PALETTES[v.toLowerCase()];
    const nums = v.split(",").map(Number).filter((x) => Number.isFinite(x) && x >= 0 && x < 6);
    return nums.length ? nums : null;
})();
if (PALETTE_LOCK)
    console.log(`[palett] LÅST till [${PALETTE_LOCK.join(", ")}] via DMX_PALETTE`);
import { hsvToRgb } from "./effects/color.js";
import { LiveRange } from "./liveRange.js";
// HJÄRTSLAGETS FORM, SKALAD MED TEMPOT.
// En fast utklingning ger olika känsla i olika tempon: 130 ms är ett tätt dunk vid
// 159 BPM men en gles blink vid 90. Skalas båda mot taktperioden upptar pulsen samma
// ANDEL av takten oavsett tempo (~45 %), och resten är vila — då känns det som att
// ljuset följer musiken i stället för att gå i sin egen takt.
// Attacken har ett golv och ett tak: under ~30 ms läses den som ett steg (blixt),
// över ~70 ms tappar den anslaget.
/** Under den här nivån räknas ingången som avstängd, inte som ett tyst parti. */
const INPUT_OFF_LEVEL = 0.02;
const SILENCE_LEVEL = Number(process.env.DMX_SILENCE_LEVEL ?? 0.05), SILENCE_MS = Number(process.env.DMX_SILENCE_MS ?? 250), SILENCE_RELEASE_S = Number(process.env.DMX_SILENCE_RELEASE_S ?? 0.25);
/** ...men först när den legat där så länge — ett break i låten ska inte släcka showen. */
const INPUT_OFF_MS = 2000;
const BEAT_ATTACK_FRAC = 0.12;
const BEAT_ATTACK_MIN_MS = 30;
const BEAT_ATTACK_MAX_MS = 70;
const BEAT_DECAY_FRAC = 0.32;
/** PRE-DIP: en kort nedgang strax FORE anslaget, sa slaget far nagot att sticka
 *  upp ur. Uttryckt i TID (andel av takten, klamd) och inte i ramar — den ska
 *  folja tempot, inte renderns takt. Djupet ar avsiktligt modest: dippen ska
 *  kannas som andning, inte som ett andra blink. */
const BEAT_PREDIP_FRAC = 0.12;
const BEAT_PREDIP_MIN_MS = 25;
const BEAT_PREDIP_MAX_MS = 60;
const BEAT_PREDIP_DEPTH = 0.35;
/** Ettan i varje fyrtakt pulserar så här mycket starkare än övriga slag.
 *  25 % är tydligt men inte ett eget effektläge. */
const BEAT_DOWNBEAT_ACCENT = 0.25;
/** TAKT-BASERAD HALVERING av PRESENTATIONSTAKTEN (portad från Lotus 2026-08-30).
 *  Analysatorn ger korrekt tempo; dirigenten väljer takten publiken ser. En låt på
 *  157 BPM pulsar annars i 2,6 Hz och känns hackig. Över tröskeln pulsar hjärtslaget
 *  på varannat slag. HYSTERESEN är obligatorisk: en fast gräns utan den flappade
 *  ("dubblade i lugna partier kring tröskeln") i Lotus. */
const PULSE_HALVE_ABOVE_BPM = 135;
const PULSE_HALVE_HYST_BPM = 15;
/** ENERGISTYRD HALVERING (portad från Lotus energySubdiv 2026-08-31).
 *  BPM-regeln ovan fångar bara snabba låtar. En lugn vers på 118 BPM pulsar ändå
 *  i full takt, vilket ingen ljustekniker hade gjort — där halverar man för att
 *  släppa ner luften. Signalen är `frame.intensity` (sektionsenergi relativt
 *  låtens EGET snitt, 0.5 = snittet), utjämnad över ~8 s: en FAST nivå-tröskel
 *  kan inte fungera eftersom materialets nivå vandrar (MÄTT i Lotus: 0.480 →
 *  0.232 median mellan låtar). Hysteres + min-hold är obligatoriska — utan hold
 *  gav Lotus en fyrkantsvåg som växlade takt var 12:e sekund. */
const SUBDIV_ENERGY_TAU_MS = 8000;
const SUBDIV_ENERGY_LO_ON = 0.30; // under detta: lugnt parti → halvera
const SUBDIV_ENERGY_LO_OFF = 0.42; // över detta: släpp halveringen
const SUBDIV_MIN_HOLD_MS = 10000;
/** DMX_HALVE_SHOW: halveringen når hela showen, inte bara hjärtslagets form. Effekt-klockan
 *  (beatIdx/beatFrac/beatHit) går i halvtakt när pulsen är halverad, så `varannan`/`innerouter`
 *  ger jämna|inre lampor på slag 1 och udda|yttre på slag 2, och `hjarta` slår varannan takt.
 *  Dirigenten boostar de delade lookerna vid halvering (dubbeltakt ELLER lugnt) och hjärta i
 *  lugna partier, och får byta look när halveringen slår om. Ägaren 2026-09-12. */
const HALVE_SHOW = process.env.DMX_HALVE_SHOW === "1";
/** MINIDROP-REAKTION (agaren 2026-09-12: "minidrops borde markas — effektbyte eller intensitet"): analysatorns
 *  frame.miniDropCount (monoton) ger look-byte (om looken hallits MIN_HOLD) + en kort stot pa MINI_DROP_ENV av
 *  en full drop-small (dropEnv), ingen rok, ingen blackout. */
const MINI_DROP_ENV = Number(process.env.MINI_DROP_ENV ?? 0.35);
/** DROP-SNAPP TILL TAKTEN (agaren 2026-09-12: "traffar varje riktig drop men ~100 ms fore"). Detektorn fyrar pa
 *  forsta bas-slaget, som ofta ar en upptakt/sug-slapp strax FORE ettan. Ar taktlaset palitligt (beatTrust >= 0,5)
 *  och nasta slag ligger inom DROP_SNAP_MS, vantar smallen in slaget; annars direkt. Aldrig langre an DROP_SNAP_MS,
 *  aldrig bakat. Roken tar fortfarande dropHit direkt. 0 = av. */
const DROP_SNAP_MS = Number(process.env.DROP_SNAP_MS ?? 0);
const MINI_BANG_MS = Number(process.env.MINI_BANG_MS ?? 350);
/** MINI_DELAY_MS: mini-reaktionen vantar sa har lange och AVBRYTS om en riktig drop kommer under tiden. Journal
 *  ladan 2026-09-12 19:50-19:54: minidroppen fyrade 24-400 ms FORE 4 av 5 riktiga drops (lyft-detektorn har lagre
 *  krav och reagerar pa forsta bas-slaget) -> ljuset hoppade tidigt och smallen kom sedan ("nagra 100 ms for tidig"). */
const MINI_DELAY_MS = Number(process.env.MINI_DELAY_MS ?? 500);
/** TYDLIG BASGANG -> TOGGLE-EFFEKTER (agaren 2026-09-12: "tydlig basgang = inner/outer; inte alltid men foredragen";
 *  ladan 2026-09-21: "kanns inte som den aktiverar den vid basgang - gor det tydligare att den skall valja dom").
 *  Forr: profile.bass (lag-endens ANDEL, 8 s trog) >= 0,4, bara innerouter, bara med DMX_HALVE_SHOW, tva av tre byten.
 *  Nu: analysatorns profile.bassline (basNOT-anslag per slag, ~1 s) >= CLEAR_BASS ->
 *   (1) basgangens ankomst ar EN EGEN BYTESORSAK (efter MIN_HOLD, inte i uppbyggnad), och
 *   (2) dirigenten valjer da ALLTID ur toggle-poolen (effektfilernas `toggle: true`, snitt med sektionens pool nar det gar).
 *  Sa lange basgangen ligger kvar sker vanliga byten (sektion/tier/dwell) ocksa inom toggle-poolen. DMX_CLEAR_BASS=tröskel,
 *  hysteres 0,2 nedat. MATT (tools/basslineProbe.mjs, andel av tiden >= 0,7): basdrivna Stranden 81 %, dansband 78 %,
 *  pop-facit 27 %, megamix 12 %, real.wav 1 %. */
const CLEAR_BASS = Number(process.env.DMX_CLEAR_BASS ?? 0.7);
/** EFFEKTMIX v2 (2026-09-23, agaren: "vi korde pa hoga effekter och hade inte sa manga"; tools/effectMix.mjs pa ladans 10-min-mixar:
 *  20 av 43 effekter, 23 aldrig valda, chase/varannan/eko/bounce = 46 % av tiden). Tre orsaker, tre rattningar (DMX_MIX_V2=0 = som forr):
 *  (1) basgangsregeln ersatte HELA poolen sa fort bassline >= 0,7 (nastan all pop) -> nu: pool-ersattning bara >= CLEAR_BASS_HARD (0,85)
 *      och vartannat byte; daremellan bara en boost (+CLEAR_BASS_BOOST) at toggle-effekterna i rankingen;
 *  (2) "byt aldrig mitt i en uppbyggnad" blockerade aven bytet IN i build-poolen -> stegring/sug/nedrakning valdes aldrig; nu tillats
 *      ett byte vid intradet i 'build' (sedan haller uppbyggnaden som forr);
 *  (3) ingen nyhetsstraff -> samma look kom tillbaka direkt; nu -MIX_RECENT_PENALTY for de MIX_RECENT_N senast valda. */
const MIX_V2 = process.env.DMX_MIX_V2 !== '0';
const CLEAR_BASS_HARD = Number(process.env.DMX_CLEAR_BASS_HARD ?? 0.85);
const CLEAR_BASS_BOOST = Number(process.env.DMX_CLEAR_BASS_BOOST ?? 0.25);
const MIX_RECENT_N = Number(process.env.DMX_MIX_RECENT_N ?? 4);
const MIX_RECENT_PENALTY = Number(process.env.DMX_MIX_RECENT_PENALTY ?? 0.2);
const MIX_TOP_FRAC = Number(process.env.DMX_MIX_TOP_FRAC ?? 0.5); // (4) valfonster = andel av poolen (minst 3)
/** (6) OSEDD-BONUS (2026-09-23, effektoversynen): +DMX_MIX_UNSEEN_BONUS i rankingen for effekter som inte valts sedan start -
 *  med 46 effekter och ~50 byten per 10 min blev annars samma 20-25 valda och resten aldrig (effectMix: 18-19 aldrig valda).
 *  Bonusen forsvinner sa fort effekten setts en gang, sa den styr bara FORSTA chansen. 0 = av. */
const MIX_UNSEEN_BONUS = Number(process.env.DMX_MIX_UNSEEN_BONUS ?? 0.10);
/** Hur länge ljuset tonar in vid låtstart. Långsamt nog att kännas som en
 *  öppning, kort nog att vara framme innan första refrängen. */
const START_FADE_MS = 5000;
/** Drops ignoreras helt så länge — täcker påslaget och de första takterna. */
const START_DROP_MUTE_MS = 3000;
/** HELA SHOWENS FÖRSPRÅNG mot musiken — hjärtslag, grid-byten, takträknare.
 *  Analysatorns eget ankare (`cfg.beat.anchorMs`) är och förblir sanningen om var
 *  slaget ligger i LJUDET; den dömer kickar och drops mot det och får aldrig
 *  förskjutas. Men LJUSET är trögare än ljudet, så allt på showsidan läser klockan
 *  som om den låg `SHOW_LEAD_MS` fram. Då kommer inte bara pulsen tidigare utan
 *  också effektbyten och takträknaren — hela riggen känns tightare, inte bara dunken.
 *  0 = allt exakt på slaget. 50 = hela showen 50 ms före.
 *  Hjärtslaget lägger dessutom till sin egen attacktid, så dess TOPP landar rätt. */
const SHOW_LEAD_DEFAULT = 50;
/** Golv på taktens tillit när pulsdjupet räknas. Rampen börjar vid
 *  MIN_BEAT_CONFIDENCE, så utan golv finns ett dödband precis ovanför grinden där
 *  rutnätet lever men hjärtslaget är släckt. Gäller BARA pulsdjupet. */
/** Release-tid för hjärtslagets fladder-dämp: slår ihop två toppar 50–100 ms isär. */
const BEAT_FLUTTER_RELEASE = 0.09;
/** Sentinel: pulsklockan ännu inte initierad (första framen sätter den utan tick). */
const PULSE_IDX_INIT = -2e9;
/** Hur mycket sektionsenergin "gasar" ljuset (0 = av). +50 % master vid full energi. */
const ENERGY_DRIVE = 0.5;
// Loudness-portens konstanter = Lotus DEFAULT_CAL (piEngine.js:166-239).
const LIGHT_HI_W = 1.3; // mid+diskant-vikt
const LIGHT_BASS_W = 0.25; // bas-vikt (kropp utan att låsa nivån till basen)
const LIGHT_SMOOTH_MS = 55; // release-avbrusning på wlevel
const LIGHT_WIN_DB = 18; // centrerat dB-fönster (±9 dB runt medel → 0..1)
const LIGHT_MEAN_TAU = 30000; // medelnivåns tidskonstant (ms) — stabil men följer volymen
const LIGHT_FLOOR = Number(process.env.LIGHT_FLOOR ?? 0.3); // env-tunbar (fest: hogre golv = ljusare medelniva)           // ljus-golv vid loud=0 (dim vers, inte svart)
const LIGHT_ANCHOR_OFF = 9; // toppen over de hogsta topparna (mean+9) sa loud inte pinnar pa 1.0.
const LIGHT_ANCHOR_TAU = 60000; // auto-ankarets tidskonstant (ms)
// SHAPE-SMOOTHING 25/150 -> 300/350. Ägaren i ladan 2026-09-03: ljuset flimrade på
// RÖSTEN — mid+diskant-drivningen (vikt 1.3) följde enskilda sångstavelser (~100-
// 250 ms). Långsammare smoothing gör loudness till en SEKTIONS-envelope (vers/
// refräng, sekundskala) i stället för en stavelse-följare. Hjärtslaget (beatMulNow)
// är separat och förblir snabbt, så pulsen påverkas inte. En refräng gasar fortf.
// upp (rise ~1-2 s > 300 ms), men syllaberna medelvärdesbildas bort.
// DMX_LIVE_LEVEL (2026-09-21): lotus nivakanal - se blocket i render(). Rattar bara for A/B.
const SECTION_SWITCH = process.env.DMX_SECTION_SWITCH === '1'; // realtidssektioner som bytesskal + identitet (kraver DMX_SECTION=1)
const SECTION_TRACE = process.env.DMX_SECTION_TRACE === '1';
const LAMP_MIN = Number(process.env.LAMP_MIN ?? 0.08);
const BEAT_LIFT = Number(process.env.BEAT_LIFT ?? 0.25); // additivt hjartslagslyft (synlig puls aven i morka effekter)
/** HEART-BEAT/ENERGI SOM EGEN DEL (2026-09-23, kontrakt heartbeat/contract.ts; opt-in DMX_HEARTBEAT=1, annars gamla vagen orord).
 *  Envelope per ram: ceiling = mastern md (loudness-golv, sektionsgas, dynamik mot refrangen, drop) UTAN tystnadsgrinden;
 *  pulse = hjartslaget beatMulNow normerat (1 pa slaget, 0 vid BEAT_MIN); pulseDepth = DMX_HEARTBEAT_DEPTH x tillit.
 *  Output: rgb x gate x (energy ? ceiling : 1) x (pulse ? 1 - d + d*pulse : 1) - effektens modulate-flaggor ur dess fil,
 *  dirigenten skriver over: tillit < DMX_HEARTBEAT_TRUST -> pulse av; break/lugnt -> energy pa. Ersatter BEAT_LIFT (additivt)
 *  och md-multiplikationen; tystnadsgrinden (gate) galler ALLA effekter. LAMP_MIN-golvet kvar (output-lagrets tandtroskel). */
const HEARTBEAT = process.env.DMX_HEARTBEAT === '1';
const HEARTBEAT_DEPTH = Number(process.env.DMX_HEARTBEAT_DEPTH ?? 0.35);
const HEARTBEAT_TRUST = Number(process.env.DMX_HEARTBEAT_TRUST ?? 0.35);
// DROP_CALM_BUILD: drop i low/intro kraver riser >= detta. STANDARD 0 = AV sedan 2026-09-22 (natt-agent B, tools/dropBench.mjs mot
// 19-drop-facitet + pop/megamix): buildUp ar ~0 (max 0,04) vid ALLA 71 fyrningar och etiketten ar alltid low/break i sjalva
// dropogonblicket (high forst efterat) -> grinden pa 0,25 nekade 7/12 pop- och 11/32 megamix-drops, dvs nastan allt (live i ladan
// 09-21 kvall). Vill man ha en lugn-grind: analysatorns DMX_DROP_CALM_GATE=1 DROP_CALM_LAND_MS=300 (tappar inget, 300 ms sen i low).
const DROP_CALM_BUILD = Number(process.env.DROP_CALM_BUILD ?? 0);
const DROP_LAND_GAIN = Number(process.env.DROP_LAND_GAIN ?? 1.15); // efterkontroll: nivan 600 ms efter dropen maste vara >= fore x detta   // lampgolv efter mastern (PAR-tandtroskel)
const SECTION_HIGH_SNAP = Number(process.env.SECTION_HIGH_SNAP ?? 0.75), SECTION_LOW_SNAP = Number(process.env.SECTION_LOW_SNAP ?? 0.35); // tierEma-snap vid high/break-grans
const SECTION_HIGH_LIFT = Number(process.env.SECTION_HIGH_LIFT ?? 0.06), SECTION_BREAK_DIP = Number(process.env.SECTION_BREAK_DIP ?? 0.45), SECTION_LOW_DIP = Number(process.env.SECTION_LOW_DIP ?? 0.30); // master: refrang upp, vers/intro ner, break mer ner
/** SEKTIONSMINNETS KONSUMENTER (2026-09-21, lotus-porten): (1) FORVARNING - frame.expectHighInMs <= DMX_EXPECT_LEAD_MS raknas som 'high' for
 *  bytet (dirigenten gasar IN i refrangen), och de sista DMX_EXPECT_LIFT_MS lyfts nivan mot 1 + SECTION_HIGH_LIFT som en riser;
 *  (2) DYNAMIK - nar en refrang horts ersatter frame.levelVsHighDb (dB mot refrangen) de fasta LOW/BREAK-dipparna: gain = 1 + dB/DMX_SECTION_DYN_DB,
 *  golv DMX_SECTION_DYN_FLOOR (agaren i ladan: "lyser mycket aven om laten blir tystare" - ankaret sjonk, refrangen ar en fast referens). 0 = av. */
const EXPECT_LEAD_MS = Math.max(0, Number(process.env.DMX_EXPECT_LEAD_MS ?? 600) || 0);
const EXPECT_LIFT_MS = Math.max(0, Number(process.env.DMX_EXPECT_LIFT_MS ?? 3000) || 0);
const SECTION_DYN_DB = Math.max(0, Number(process.env.DMX_SECTION_DYN_DB ?? 12) || 0);
const SECTION_DYN_FLOOR = Math.min(1, Math.max(0.1, Number(process.env.DMX_SECTION_DYN_FLOOR ?? 0.5) || 0.5));
const LIVE_LEVEL = process.env.DMX_LIVE_LEVEL === '1';
const LIVE_WIN_DB = Number(process.env.LIVE_WIN_DB ?? 10); // lotus windowDb 10
const LIVE_OFFSET_DB = Number(process.env.LIVE_OFFSET_DB ?? 4.5); // lotus anchorOffsetDb 4,5 (taket = ankare + offset)
const LIVE_ANCHOR_S = Number(process.env.LIVE_ANCHOR_S ?? 120); // lotus autoAnchorSec 120
const LIVE_RELEASE_MS = Number(process.env.LIVE_RELEASE_MS ?? 350);
const LIVE_BASS_W = Number(process.env.LIVE_BASS_W ?? 0.25); // lotus: mid/diskant 1,3 + bas 0,25 -> har som blandning
const LIVE_TRACE = process.env.DMX_LIVE_TRACE === '1';
const LIGHT_SHAPE_UP = 60;
const LIGHT_SHAPE_DOWN = 120;
const LIGHT_REL_A = 0.396; // log-release-alpha
const LIGHT_ATK_A = 1.0; // attack-alpha (instant)
const LIGHT_SOFT = 0.3; // soft-snap-golv vid låg energi
/**
 * Diskret drop-detektion styr LAMPORNA (bloom + look-byte). AV sedan 2026-09-02
 * (ägarens val live): detektorn är ~ett taktslag sen på uppbyggda drops och ~56 %
 * precis — en falsk drop tänder dessutom 8-takters-spärren och låser ute en riktig.
 * Energi-gasen (ENERGY_DRIVE) bär drop-känslan i stället: ljuset stiger IN i dropen.
 * Röken påverkas INTE — den har egen dropHit-trigger med 1-min cooldown.
 * Slå på igen = true, så återvänder bloomen och drop-look-bytet.
 */
const DISCRETE_DROP_LAMPS = true; // ater PA (agaren i ladan): lamporna ska bloma pa dropen synkat med roken (samma dropCount). Energi-gasen ensam racker inte som drop-markering.
const STROBE_MIN_BPM = 150; // effekt-krav: riser-strobe bara i snabba latar (agarens onskemal)
const BEAT_MIN = Number(process.env.BEAT_MIN ?? 0.30);
// LIVE-BEAT (DMX_LIVE_BEAT=1, agaren 2026-09-04): nar tempo-gridden saknas (bpm 0), ar osaker
// (lag fas-tillit) eller fel (2/3-fantom) pulsar hjartslaget pa de FAKTISKA kickarna i stallet.
// Crossfade pa tilliten: <= LIVE_TRUST_LO helt live, >= LIVE_TRUST_HI helt grid. Utan env: som forut.
const LIVE_BEAT = !!process.env.DMX_LIVE_BEAT;
// DEPTH_GAIN (agaren 2026-09-04 'oka styrkan'): multiplicerar hjartslagsdjupet (clamp <= 1) sa slaget
// nar golvet BEAT_MIN varje takt aven vid lag tillit (trustFloored 0.75 kapade djupet till ~0.6).
const DEPTH_GAIN = Number(process.env.DEPTH_GAIN ?? 1);
const LIVE_BEAT_MS = Number(process.env.LIVE_BEAT_MS ?? 240); // live-pulsens avklingning
const LIVE_TRUST_LO = Number(process.env.LIVE_TRUST_LO ?? 0.3), LIVE_TRUST_HI = Number(process.env.LIVE_TRUST_HI ?? 0.7); // heartbeat-golv mellan slagen (env-tunbar; hogre = mindre dipp, ljusare)
const BEAT_TRUST_FLOOR = 0.75; // 0.35 -> 0.60 (agaren 2026-09-02): sen bloomen togs bort ags hjartslaget av beatPulse ensam, och djupet ~trust. Vid megamix-overgangar foll trusten och slaget bottnade pa 35% + rampade tragt tillbaka. Beatmatchad mix = palitlig takt, sa ett hogre golv ger starkt slag direkt. Energiskalningen skyddar anda tysta partier fran strobe.
export class EffectEngine {
    cfg;
    universe = new Uint8Array(512);
    /** Utjamnad tilltro till takten (0..1) — styr beatPulse-djupet. */
    /** Showens försprång i ms — läses ur config varje frame så ratten biter live. */
    get showLead() { return this.cfg.showLeadMs ?? SHOW_LEAD_DEFAULT; }
    beatTrust = 0;
    beatMulNow = 1; // hjärtslagets multiplikator — appliceras SIST (publik: diagnostik)
    /** HEARTBEAT-diagnostik (ws/status): senaste envelopen och flaggorna. */
    hbLast = { ceiling: 0, pulse: 0, depth: 0, energy: true, pulseOn: true };
    prevCeil = 0; // förra rutans ljustak → hur snabbt det vandrar
    ceilRateAvg = 0; // utjämnad takrörelse (enheter/s)
    /** EDGE-SÄKER KICK. frame.kick är en enframs-boolean på analysatorns 375 Hz
     *  medan render kör 100 Hz → en direkt läsning missar ~73 % av kickarna.
     *  Räknaren matas i registerKick (375 Hz) och konsumeras som en flank i
     *  render — samma monotona mönster som frame.dropCount. */
    kickCount = 0;
    lastKickSeen = 0;
    showTime = 0; // ackumulerad "show-tid" — accelererar under uppbyggnaden (riser)
    lastShowMs = 0;
    lastKickBoost = 0;
    showVel = 0; // extra show-tids-hastighet från bastransienter (akustisk tröghet)
    pendingKick = 0; // ackumulerade kick-impulser sedan förra rendern (fylls i 375 Hz)
    /** Chase mode: fixture-index of the currently lit head. Advanced on kick and slow-time. */
    chasePos = 0;
    chaseDir = 1;
    lastChaseAdvance = 0;
    /** BASNOTSRAKNARE (2026-09-23): stegar pa basnots-anslag (frame.onset.bass-flank, 90 ms cooldown) - for effekter som "stegar
     *  pa basnoter" (chase/eko/stege/basgang) nar profile.bassline ar tydlig. Samma slags motorhjalp som chasePos/gravLevel. */
    bassNoteIdx = 0;
    lastBassNoteMs = -1e9;
    prevBassOnset = 0;
    /** Beat clock: last whole-beat index seen (för beatTick-flanken). */
    lastBeatIdx = -1;
    /** Takt-räknare som effekterna ser (beatIdx): stegar på grid-slaget när BPM är
     *  låst, annars på verkliga kicks → grid-effekter fryser aldrig utan BPM-lås. */
    beatCounter = 0;
    /** Pulsen körs i halva takten (snabb låt ELLER lugnt parti). Se PULSE_HALVE_*
     *  och SUBDIV_*. */
    pulseHalved = false;
    halfTick = 0; // DMX_HALVE_SHOW: paritet inom det halverade slaget
    lastHalvedForSwitch = false; // DMX_HALVE_SHOW: halvering vid senaste look-bytet
    lastBassClearForSwitch = false; // tydlig basgang vid senaste look-bytet (CLEAR_BASS)
    seenLooks = new Set(); // MIX_V2 (6): effekter som valts sedan start
    /** Monoton pulsklocka (rotfix mot hjärtslags-fladder): pulsens index och paritet
     *  får bara gå framåt, och tSince hålls icke-avtagande inom en puls, så PLL:ens
     *  fasrättningar inte kan re-attackera eller flippa pariteten mitt i ett slag. */
    lastPulseIdx = PULSE_IDX_INIT;
    pulseCount = 0;
    pulseFloorMs = 0;
    /** ~8 s-utjämnad sektionsenergi + när halveringen senast bytte (min-hold). */
    subdivEnergy = 0.5;
    subdivChangedAt = 0;
    /** Drops mode: per-lamp fire time + hue; advanced on each beat/kick. */
    dropPos = 0;
    dropSector = 0;
    dropCount = 0;
    lastDropAdvance = 0;
    dropFired = [];
    dropHue = [];
    /** Wave mode: integrated phase — speed may vary per frame without the
     *  wave jumping (t*speed would re-scale all elapsed time on every change). */
    wavePhase = 0;
    /** "smart" mode: which effect the feel-chooser currently delegates to. */
    smartMode = "wave";
    tierEma = 0.5; // ihallande intensitet for tier-val (se render)
    smartDwellUntil = 0;
    warmMs = 0;
    ambient = 0; // 0 = spelar, 1 = varm vila (efter ~2.5s tystnad)
    bassBaseline = 0.35; // bas-golv (tyst basnivå) för bas-punch
    lastDropCount = 0; // senast hanterade frame.dropCount → edge-säker drop-flank
    lastMiniCount = 0;
    miniBangUntil = 0;
    miniPendingAt = 0; // minidrop-flank + kort stot + fordrojd reaktion
    dropPendingAt = 0; // DROP_SNAP_MS: smallen vantar in nasta slag
    dropBangUntil = 0; // drop-fönster (max-håll upp till ~8s efter träff)
    dropEnv = 0; // drop-envelope: full attack → håll → mjuk fade
    // Loudness-portens tillstånd (Lotus mid+diskant dB-fönster + log-release). Negativa
    // sentinelvärden = oinitierat (första framen sätter dem utan hopp).
    lightWlevel = -1; // avbrusad linjär mid+diskant-nivå
    lightWdbSlow = -300; // sentinel för init (självkalibrerande range)
    lightHi = 0; // långsam topp av wdb (loud-referens)
    lightLo = 0; // långsamt golv av wdb (tyst-referens)
    lightShapeSm = -1; // shape-smoothing
    lastLiveSection = ''; // DMX_SECTION_SWITCH
    lastDropSwitchMs = -1e9;
    dropCalmDenied = 0;
    dropFalse = 0;
    dropCheckAt = 0;
    preDropLevel = 0;
    preDropTier = 0; // senaste drop -> 'high'-pool i 20 s
    liveAnchor;
    liveFastUntil = 0;
    liveClipMs = 0;
    liveShapeRaw = 0.5;
    liveLevelSm = -1;
    liveLogAt = 0; // DMX_LIVE_LEVEL
    lightLoud = 0; // log-released loudness 0..1 → driver md
    // TERMISK BUDGET. En fast cooldown vet inte skillnad på en 0.5s-puff och en
    // 3s-puff — den räknar TIDEN MELLAN, inte ARBETET. Ibiza LSM1500PRO orkar
    // 40–50 s sammanhängande rök innan värmeblocket måste hämta igen, så vi för
    // ett värmekonto i millisekunder: det fylls medan den rökar och rinner av i
    // vila. Då kostar en lång puff mer än en kort, precis som i fysiken.
    // → 1 s rök ≈ 6,7 s återhämtning
    // (själva starttiden bor i cfg.fog.warmStartMs → överlever omstart)
    // NOVELTY-UPPBYGGNADS-DETEKTOR: spektral novelty leder dropen (mätt validerat).
    hotMs = 0; // hur länge musiken pumpat → adaptiv tystnads-landning
    wasBreaking = false; // flankdetektor för nivå-svacka (drop-blackout)
    blackoutUntil = 0; // dramaturgisk tystnad: kolsvart till (wall-clock ms)
    vu = 0; // direkt VU-envelope (snabb attack / ~180ms release) för ljustaket
    range = new LiveRange(); // rullande p5..p95 av nivån → normaliserad dynamik live
    // ── DRAMATURGI UR LÅTMINNET (sätts av index.ts, bara för IGENKÄNDA låtar) ──
    // En FÖRBERÄKNAD kurva kan inte fladdra som live-VU:n gjorde: ett värde per
    // sekund, mjukt interpolerat. Okänd låt → allt är null/0 och showen kör som förut.
    memCeiling = null; // normaliserat ljustak 0..1 ur minnet
    memSectionAt = 0; // performance.now() för senaste sektionsgräns
    memPhraseAt = 0; // ...och senaste frasgräns
    memHasGrid = false; // låten har sektioner/frasgrid att vänta in
    /** VILKEN sorts sektion som spelas just nu ur den analyserade strukturen:
     *  "intro" | "verse" | "chorus" | "bridge" | "outro" … null = okänd låt eller
     *  ingen analys. Sätts av index.ts. ANVANDS INTE AN av effektvalet — den ska
     *  in dar medvetet och matbart, inte som en sidoeffekt av att faltet dok upp. */
    memPart = null;
    /** Vilken låt strukturen kommer från — look-minnet nollas när den byts. */
    memSongId = 0;
    /**
     * LOOK PER SEKTIONSTYP. Riktiga ljustekniker upprepar medvetet: refrängen ska
     * kännas som ett ÅTERSEENDE, inte som en ny slump varje gång. Utan det här
     * väljer dirigenten om från passform-tabellen vid varje sektionsgräns, och
     * refräng fem ser ut som ingenting av refräng ett.
     * Bara för den här låten — nollas vid låtbyte.
     */
    /** Sektionens UPPMATTA energi (0..1), -1 = okand. Ur minnets energikurva, som
     *  tvatten raknat pa hela laten — alltsa kant redan nar sektionen BORJAR. */
    memPartEnergy = -1;
    /**
     * LÅTSTART: tona in, och tig om drops.
     * En låt börjar aldrig i fullt ljus — introt är låtens tystaste parti och
     * publiken ska mötas av något som växer, inte av en vägg. Och en "drop" i de
     * första sekunderna är nästan alltid att LJUDET slogs på, inte att musiken
     * gjorde något: nivån går från noll till full på ett ögonblick, vilket är
     * exakt vad en drop-detektor letar efter.
     * Sätts av index.ts när en känd låt låser tidigt i tidslinjen, och av
     * tystnadsgrindens flank här nedan när ljudet kommer tillbaka (okända låtar).
     */
    songStartAt = 0;
    gatePrev = 1;
    /** Låten började — tona in ljuset och ignorera drops en stund. */
    noteSongStart() { this.songStartAt = performance.now(); }
    partLook = new Map();
    partLookSong = 0;
    /** Misstänkt låtbyte → låt auto-rangen kalibrera om snabbt mot nya nivåer. */
    softenRange() { this.range.soften(); }
    gravLevel = 0; // gravitations-VU: nivå som faller med gravitation
    gravVel = 0; // dess hastighet
    gravPeak = 0; // peak-håll (sjunker långsamt)
    /** Silence gate: fade the whole rig to black when no music plays. */
    lastActiveMs = performance.now();
    inputLowSince = 0; // väggklocka: sedan när nivån legat under gränsen
    inputOff = false; // ingången bedöms avstängd → riggen mörk
    silenceGate = 1;
    lowLogAt = 0;
    /** LEVER MEN HÖR INGENTING. Utan den här signalen ser "aux-kabeln sitter inte
     *  i" exakt likadant ut som "strömmen är av" och "säkringen gick": svart. Den
     *  som slår på lådan 22:00 står ensam bakom disken utan laptop — riggen är den
     *  enda skärm som finns, och den måste kunna säga tre olika saker.
     *  Ej opt-in: ett grundbeteende, inte en inställning man kan råka slå av. */
    /** Strobe-tak i Hz. SAFE = gränsen för allmänt säkert innehåll (WCAG 2.3.1
     *  och rundradions riktlinjer: högst 3 blixtar/s). MAX = ägarens medvetna
     *  scenläge. Notera att `Math.floor(t*hz) % 2` ger hz/2 hela blixtcykler per
     *  sekund — talen är alltså tagna med marginal, inte i underkant. */
    static STROBE_SAFE_HZ = 3;
    static STROBE_MAX_HZ = 18;
    static ANCHOR_MODES = new Set(["party", "snap", "bounce", "strobe", "chase", "wave"]);
    static DEAF_AFTER_MS = 90000; // låtglapp = sekunder, DJ-paus =
    // någon minut. 90 s utan EN enda
    // transient betyder att vi inte
    // hör källan, inte att det är tyst.
    deafFade = 0; // 0..1 inblandning av väntande-andningen
    /** Output ballistics: per-channel soft ~25ms attack + exponential decay — the
     *  eye sees a fast rise and a soft fall (~0.1–0.4 s), whatever the modes do. */
    /** Output-tjänsten äger ALL kunskap om hur lampor tar emot ljus. */
    out = new FixtureOutput();
    /** Efterbehandlingen äger slutkedjan: ballistik → tak → hjärtslag → kalibrering. */
    post = new PostProcess();
    maxCh = 0; // högsta använda kanal + 1
    smartCount = 0;
    recentLooks = []; // MIX_V2: de senast valda lookerna (nyhetsstraff)
    lastSmartTier = "";
    lastSmartSwitchMs = 0; // tidsstämpel för senaste effektbyte → minsta-intervall
    activeMode = "smart";
    // Regi-lager: fras-räknare + aktiv palett (byts var N:e takt).
    phraseBeat = 0;
    phraseBeats = 32; // taktslag per musikalisk fras → palettbyte
    paletteIdx = 2; // start: Primär
    paletteRot = 0;
    // Pre-allokerad kontext för noll-allokering i render-loopen
    ctx = {
        cfg: null, frame: null, fx: undefined, t: 0, idx: 0, count: 0, want: {},
        audio: 0, kickEnv: 0, punch: 0, dropEnv: 0, band: 0, gravLevel: 0, gravPeak: 0, drum: null, expectHighInMs: -1, levelVsHighDb: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionEntry: 0, sectionTier: 1, repeatSim: 0,
        sectionBars: 0, bassline: 0, bassNoteIdx: 0, bassNoteAge: 9,
        beatIdx: 0, beatFrac: 0, beatPulse: 0, beatHit: false, hasBeat: false,
        wavePhase: 0, buildUp: 0, phaseSpread: 0, punchFloor: 0, chasePos: 0,
        dropFired: this.dropFired, dropHue: this.dropHue, now: 0,
        mixedSector,
        mclk: (beatsPerStep, secPerStep) => this.ctx.hasBeat ? Math.floor(this.ctx.beatIdx / beatsPerStep) : Math.floor(this.ctx.t / secPerStep),
        shaped: (floor, x) => {
            const dyn = Math.max(0, Math.min(1, this.ctx.cfg.dynamics ?? 0.6));
            const f = floor * (1 - dyn);
            return Math.min(1, f + (1 - f) * Math.pow(Math.max(0, Math.min(1, x)), 1 + dyn * 1.2));
        },
        hsv: hsvToRgb,
    };
    /** Välj ny palett vid frasbyte, biasad av klangen (centroid). */
    pickPalette(centroid) {
        const wantWarm = centroid < 0.42, wantCool = centroid > 0.60;
        let cands = PALETTES.map((_, i) => i).filter((i) => {
            const t = PALETTES[i].temp;
            if (wantWarm)
                return t === "warm" || t === "neutral";
            if (wantCool)
                return t === "cool" || t === "neutral";
            return true;
        });
        if (cands.length === 0)
            cands = PALETTES.map((_, i) => i);
        this.paletteRot++;
        let next = cands[Math.floor(((this.paletteRot * 0.61803398875) % 1) * cands.length)];
        if (next === this.paletteIdx && cands.length > 1)
            next = cands[(cands.indexOf(next) + 1) % cands.length];
        this.paletteIdx = next;
    }
    /** Den effekt som faktiskt renderas just nu (smart-läget roterar this.smartMode). */
    getActiveMode() { return this.activeMode; }
    /** Rökmaskinens tillstånd för UI:t. null = inte ansluten. */
    getFogStatus() {
        const fog = this.cfg.fog;
        if (!fog?.enabled)
            return null;
        const now = Date.now();
        const warmLeftMs = fog.warmStartMs ? Math.max(0, (fog.warmupMs ?? 600000) - (now - fog.warmStartMs)) : 0;
        // ADRESSKROCK. Rök-kanalen skrivs SIST i universumet (efter ballistiken, för
        // att få instant på/av) → den VINNER över en armatur som delar adressen, och
        // lampan slocknar utan förklaring. Vi flyttar den INTE automatiskt: ett tyst
        // adressbyte är värre än problemet, för då stämmer inte DIP-switcharna längre.
        // Vi säger till och låter ägaren välja.
        let conflict = null;
        for (const fx of this.cfg.fixtures) {
            const top = fx.address + fixtureRoles(fx).length - 1;
            if (fog.address >= fx.address && fog.address <= top) {
                conflict = fx.name;
                break;
            }
        }
        return {
            conflict,
            state: this.out.fogState(now).spraying ? "spraying" : warmLeftMs > 0 ? "heating" : "ready",
            warmLeftMs,
            heat: this.out.fogState(now).heat,
            sprayMs: fog.sprayMs ?? 0,
            bursts: fog.bursts ?? 0,
        };
    }
    /** Nollställ drifträknarna efter underhåll (påfylld tank / rengöring). */
    resetFogService() {
        const fog = this.cfg.fog;
        if (!fog)
            return;
        fog.sprayMs = 0;
        fog.bursts = 0;
        fog.serviceAtMs = Date.now();
    }
    lastRenderMs = performance.now();
    constructor(cfg) {
        this.cfg = cfg;
    }
    /** AKUSTISK TRÖGHET: varje bastransient (kick) knuffar show-tiden framåt.
     *  Anropas i 375 Hz-chunkhanteraren så inga slag missas (render kör 100 Hz).
     *  strength ~0.4..1.0 (skalas av basens styrka). Friktionen i render() bromsar. */
    registerKick(strength) {
        this.pendingKick += Math.min(1.5, Math.max(0, strength));
        this.kickCount++;
    }
    render(frame) {
        // Fri-rullande "show-tid": normalt 1× realtid, men accelererar under en
        // uppbyggnad (buildUp från förra framen) så mönstren snabbar upp mot dropen.
        // Ackumulerad → kontinuerlig, inga hopp.
        // Konsumera kick-flanken EN gång per render (se kickCount ovan).
        const kickHit = this.kickCount !== this.lastKickSeen;
        this.lastKickSeen = this.kickCount;
        const _np = performance.now();
        if (this.lastShowMs === 0)
            this.lastShowMs = _np;
        const _dtT = Math.min(0.1, (_np - this.lastShowMs) / 1000);
        this.lastShowMs = _np;
        // AKUSTISK TRÖGHET (fluid friction): mönstren flyter i en trög vätska. Varje
        // bastransient ger show-tiden en IMPULS framåt; "vätskefriktionen" bromsar
        // sedan mjukt tillbaka till normaltempo → vågor/eld/aurora RYCKER till och
        // accelererar explosivt med bastrumman, för att sedan glida vidare. Skalas av
        // energin så tysta partier knappt rycker; strukturen (beat-låsta färgbyten)
        // rörs inte — bara rörelsen får fysikalisk tyngd.
        const friction = Math.exp(-_dtT / 0.16); // tröghet τ≈160 ms
        this.showVel = Math.min(5, this.showVel * friction + this.pendingKick * 2.0);
        this.pendingKick = 0;
        // upp till 2.5× snabbare vid full uppbyggnad + kick-ryck ovanpå
        this.showTime += _dtT * (1 + frame.buildUp * 1.5 + this.showVel);
        const t = this.showTime;
        if (kickHit)
            this.lastKickBoost = performance.now();
        // BPM-taktklocka → förutsagt slag: pulsa i låtens exakta tempo, fas-låst av
        // beat-PLL:en (index.ts riktar ankaret mot faktiska kicks). Bättre än ren
        // kick-detektion på en komprimerad signal som fyrar glest.
        let beatEnv = 0;
        let beatTick = false;
        const beat = this.cfg.beat;
        // COASTA PULSEN genom konfidens-svackor. Förr: `beatLocked(beat)` (konf ≥ 0.20).
        // På det här materialet kraschar konfidensen till 0 ofta (olöst takt-spårnings-
        // problem) → hjärtslaget dog → tråkigt (ägaren i ladan 2026-09-03). Nu räcker att
        // ett TEMPO finns (bpm > 40); tempot lever kvar via PLL:ens 8 s-coast, så pulsen
        // slår vidare på senaste takten genom svackan. Djupet är golvat (BEAT_TRUST_FLOOR)
        // så den syns, och energiskalningen (calm/intensity) dämpar den ändå i tysta partier
        // så den inte strobar i tystnad. En puls på ~rätt takt är långt bättre än ingen.
        if (beat && beat.bpm > 40) {
            const beatMs = beatPeriod(beat);
            const now2 = Date.now();
            const beatIdx = beatIndex(beat, now2 + this.showLead); // takträknaren stegar lika tidigt
            // PRESENTATIONSTAKT: över PULSE_HALVE_ABOVE_BPM pulsar hjärtslaget på varannat
            // slag (hysteres nedåt så gränsen inte flappar). Taktklockan, beatTick och alla
            // grid-effekter rör vi INTE — bara pulsens form sträcks över två slag.
            // Dessutom: i ett genuint LUGNT parti halveras pulsen även i måttligt tempo
            // (se SUBDIV_*). BPM-REGELN HAR FÖRETRÄDE — i Lotus fick energin skriva över
            // takt-beslutet och resultatet blev en fyrkantsvåg som växlade var 12:e sekund.
            const bpmNow = beatMs > 0 ? 60000 / beatMs : 0;
            const aE = Math.min(1, (_dtT * 1000) / SUBDIV_ENERGY_TAU_MS);
            this.subdivEnergy += (Math.max(0, Math.min(1, frame.intensity)) - this.subdivEnergy) * aE;
            let wantHalved = null;
            if (bpmNow > PULSE_HALVE_ABOVE_BPM)
                wantHalved = true;
            else if (bpmNow > 0 && bpmNow < PULSE_HALVE_ABOVE_BPM - PULSE_HALVE_HYST_BPM) {
                // Utanför takt-regelns hysteresband får energin bestämma.
                if (!this.pulseHalved && this.subdivEnergy < SUBDIV_ENERGY_LO_ON)
                    wantHalved = true;
                else if (this.pulseHalved && this.subdivEnergy > SUBDIV_ENERGY_LO_OFF)
                    wantHalved = false;
            }
            if (wantHalved !== null && wantHalved !== this.pulseHalved
                && (this.subdivChangedAt === 0 || now2 - this.subdivChangedAt >= SUBDIV_MIN_HOLD_MS)) {
                this.pulseHalved = wantHalved;
                this.subdivChangedAt = now2;
            }
            const pulseMs = this.pulseHalved ? beatMs * 2 : beatMs;
            // HJÄRTSLAG: ATTACK → FADEOUT → VILA.
            // Förr: Math.pow(1 - phase, 2) — ljuset hoppade till fullt på NOLL ms vid varje
            // slag och sjönk sedan hela takten igenom. Ett steg utan attack läses som blixt,
            // och utan vila mellan slagen blir riggen aldrig stilla: MÄTT 2026-08-07 upplevdes
            // det som stroboskop i låtens lugna partier. Nu en kort men verklig attack, en
            // exponentiell utklingning och tystnad tills nästa slag — samma puls, annan form.
            const atk = Math.max(BEAT_ATTACK_MIN_MS, Math.min(BEAT_ATTACK_MAX_MS, pulseMs * BEAT_ATTACK_FRAC));
            // ATTACKEN BÖRJAR FÖRE SLAGET SÅ TOPPEN LANDAR PÅ DET.
            // MÄTT 2026-08-08 på DMX-utgången: ljuset kulminerade vid fas 0,10 av takten,
            // alltså ~48 ms EFTER slaget — attacken startade på slaget och behövde sin
            // uppgångstid. Genom att flytta fram fasen med exakt attackens längd börjar
            // uppgången `atk` ms före slaget och toppen sammanfaller med det. Samma tanke
            // som REPLAY_LEAD_MS för minnet: ljus är trögare än ljud.
            // Försprånget = attackens längd: klockan ger fasen som om vi låg `atk` ms fram.
            // Vid halvering läggs ett helt slag på när vi står på ett ODDA index, så pulsen
            // löper obrutet över de två slagen och startar alltid på ett jämnt index.
            // Pariteten MÅSTE läsas med SAMMA försprång som fasen (atk + showLead), annars
            // wrappar fasen till nästa slag innan takträknaren stegar → varannan puls blev
            // dubbelt lång och varannan kapad precis vid slaggränsen.
            // MONOTON PULSKLOCKA — ROTORSAK till fladdret. PLL:en rättar anchorMs/bpm varje
            // frame, så den råa fasen kan hoppa BAKÅT (beatEnv re-attackerar) och pulseIdx-
            // pariteten kan FLIPPA (tSince hoppar ett helt beatMs) → två toppar tätt = fladder
            // (ägaren 2026-09-02, kvar även med lågpasset borta → koden, inte insignalen).
            // Fix: räkna pulsens index/paritet monotont (bara framåt, som beatTick redan gör
            // för grid-effekterna) och håll tSince icke-avtagande inom en puls. Nollas när en
            // NY puls börjar. pulseIdx och fasen delar försprång (atk+showLead), så de wrappar
            // i samma frame → golvet nollas exakt när fasen är ~0 = frisk attack.
            const pulseIdx = beatIndex(beat, now2 + atk + this.showLead);
            if (this.lastPulseIdx === PULSE_IDX_INIT)
                this.lastPulseIdx = pulseIdx;
            if (pulseIdx > this.lastPulseIdx) {
                this.lastPulseIdx = pulseIdx;
                this.pulseCount++; // monoton → paritet flippar aldrig bakåt
                if (!this.pulseHalved || this.pulseCount % 2 === 0)
                    this.pulseFloorMs = 0; // ny puls: frisk attack
            }
            else if (pulseIdx < this.lastPulseIdx) {
                this.lastPulseIdx = pulseIdx; // följ bakåt tyst, rör inte pulsen
            }
            const halvedOdd = this.pulseHalved && (this.pulseCount % 2 === 1);
            let tSince = beatPhase(beat, now2, atk + this.showLead) * beatMs + (halvedOdd ? beatMs : 0);
            if (tSince < this.pulseFloorMs)
                tSince = this.pulseFloorMs;
            else
                this.pulseFloorMs = tSince;
            const dec = pulseMs * BEAT_DECAY_FRAC;
            beatEnv = tSince < atk ? tSince / atk : Math.exp(-(tSince - atk) / dec);
            // PRE-DIP: en inandning strax FÖRE anslaget.
            // Ögat läser kontrast, inte absolut nivå. Att sänka ljuset en aning precis
            // innan slaget gör att samma topp känns hårdare — utan att toppen höjs, och
            // därmed utan att riggen blir ljusare eller tröttare att titta på.
            // Idén är hämtad från Song Studio-poleringen i det andra projektet
            // (PREDIP_FRAMES/PREDIP_DEPTH); här uttryckt i tid i stället för ramar, så
            // den följer tempot i stället för renderns takt.
            // Dippen ligger i slutet av takten — alltså precis före nästa attack, som ju
            // startar `atk` ms innan slaget. Envelopen får gå NEGATIV: den är ett
            // 0..1-mått som skalas mot pulsdjupet, så negativa värden betyder mörkare
            // än pulsens eget golv. Slutmultiplikatorn klamras separat.
            const dipMs = Math.max(BEAT_PREDIP_MIN_MS, Math.min(BEAT_PREDIP_MAX_MS, pulseMs * BEAT_PREDIP_FRAC));
            const dipStart = pulseMs - dipMs;
            if (tSince > dipStart) {
                const w = (tSince - dipStart) / dipMs; // 0 → 1 fram mot anslaget
                beatEnv -= BEAT_PREDIP_DEPTH * w * w; // kvadratisk: mjuk in, tydlig ut
            }
            // BARA FRAMÅT. Villkoret var `!==`, som fyrade på VARJE förändring — även
            // bakåt. PLL:en justerar anchorMs och bpm kontinuerligt i båda riktningar,
            // så nära en taktgräns dittrade index 132 → 131 → 132 och gav TRE slag där
            // ett fanns. MÄTT: 150 beatTick/min vid BPM 132 (+14 %). Eftersom beatTick
            // driver beatHit, som driver varje grid-effekt, gick hela riggen ur takt.
            // Backar ankaret följer vi med i tysthet men utan att räkna ett slag.
            if (beatIdx > this.lastBeatIdx) {
                this.lastBeatIdx = beatIdx;
                beatTick = true;
            }
            else if (beatIdx < this.lastBeatIdx)
                this.lastBeatIdx = beatIdx;
            // DOWNBEAT-ACCENT: förstärk pulsen på ettan i varje fyrtakt. Publiken läser
            // taktarten intuitivt, så en accent där gör att showen känns "säker" även när
            // samma puls loopar länge. Analysatorns barShift har redan lagt detekterade
            // ettor på beatIdx % 4 === 0; innan någon etta hittats är valet godtyckligt
            // men konsekvent (accenten vandrar inte).
            if (beatIdx % 4 === 0)
                beatEnv *= 1 + BEAT_DOWNBEAT_ACCENT;
        }
        // INGEN TICK-VÄG FÖR HJÄRTSLAGET — med flit. Utan pålitlig takt tiger det hellre
        // än pulsar på lösa kicks: en puls som sitter fel är värre än ingen puls. (Grid-
        // EFFEKTERNA faller däremot tillbaka på verkliga kicks, se beatHit längre ner —
        // de byter bild, de slår inte takt.)
        const kickEnv = Math.max(Math.max(0, 1 - (performance.now() - this.lastKickBoost) / 250), beatEnv * 0.8);
        this.universe.fill(0);
        if (this.cfg.mode === "blackout")
            return this.universe;
        // Identify override: light only the target fixture(s) at full white so the
        // user can visually locate each fixture in the room. Bypasses audio/mode.
        const id = this.cfg.identify;
        if (id && id.index >= 0 && id.index < this.cfg.fixtures.length) {
            this.out.writeFixture(this.universe, this.cfg.fixtures[id.index], [1, 1, 1], 1);
            return this.universe;
        }
        // Kalibrerings-test: tvinga MÅL-lampan till ett RÅTT DMX-värde på ljuskanalerna
        // (bypassar show, VU och cal-remap) så exakt tänd/släck-punkt kan hittas för
        // hand. Övriga lampor släckta. Transient — sätts från /setup-slidern.
        const ct = this.cfg.calTest;
        if (ct && ct.index >= 0 && ct.index < this.cfg.fixtures.length) {
            const cf = this.cfg.fixtures[ct.index];
            const roles = fixtureRoles(cf);
            const cbase = cf.address - 1;
            const val = Math.max(0, Math.min(255, Math.round(ct.value)));
            const chSel = ct.channel ?? "all"; // vilken färg testet driver (kalibrera per färg)
            for (let i = 0; i < roles.length; i++) {
                const role = roles[i];
                if (role !== "r" && role !== "g" && role !== "b" && role !== "w" && role !== "dim")
                    continue;
                const ch = cbase + i;
                if (ch < 0 || ch >= 512)
                    continue;
                // Driv bara vald färg (all = alla lika). dim = enfärgs-dimmer → alltid.
                this.universe[ch] = (chSel === "all" || role === chSel || role === "dim") ? val : 0;
            }
            return this.universe;
        }
        // Walk-test: tänd EN rå DMX-kanal på mål-fixturen till 255 (allt annat 0)
        // så användaren kan avgöra vad kanalen gör och gissa 3/4/7-kanals-preset.
        const wt = this.cfg.walkTest;
        if (wt && wt.index >= 0 && wt.index < this.cfg.fixtures.length && wt.channel >= 0) {
            const wf = this.cfg.fixtures[wt.index];
            const ch = (wf.address - 1) + wt.channel;
            if (ch >= 0 && ch < 512)
                this.universe[ch] = 255;
            return this.universe;
        }
        const nowWall = Date.now();
        // Normalize against the AGC target so "at target loudness" = full drive —
        // the AGC otherwise parks the level around ~0.5 and v never reaches 1.
        const audio = Math.min(1, (frame.level / Math.max(0.15, this.cfg.detection.autoGainTarget)) * (0.35 + this.cfg.sensitivity * 0.5));
        // beatPulse: mjuk, kontinuerlig puls på BPM-rutnätet (PLL:en riktar fasen
        // mot faktiska slag). Kontinuerlig — funkar även när kick-detektorn är
        // gles (komprimerad signal fyrar sällan), till skillnad från ren kick-puls.
        //
        // PULSA BARA NÄR TAKTEN FAKTISKT HÖRS. cfg.beat finns alltid så fort en
        // takt någonsin låstes, så den dög inte som villkor — vid oklar musik
        // pulsade riggen vidare på ett gissat rutnät och blinket hamnade bredvid
        // musiken. Nu styr bpmConfidence pulsens DJUP: full puls över 0.60, helt
        // slät under 0.35, mjuk ramp emellan. Djupet smoothas (~0.6s) så att en
        // vacklande konfidens inte hackar pulsen av och på.
        // GRINDEN VAR FÖR HÖG. Djupet nollades under bpmConfidence 0.35, och MÄTT
        // 2026-08-07 låg en låts konfidens med MEDIAN exakt 0.35 — hjärtslaget var
        // alltså avstängt halva tiden och nästan avstängt resten. Låten hade en fullt
        // hörbar takt; konfidensen är låg för att tempot är svårMÄTT, inte för att
        // takten saknas. Ny ramp: noll under 0.18, full över 0.55.
        // `frame.bpmConfidence` ar redan 1 nar takten kommer ur latminnet —
        // index.ts satter den vid kallan, sa alla konsumenter ser samma sanning
        // och ingen behover vaga in realtidens osakerhet pa en tvattad lat.
        // RAMPEN MASTE BORJA DAR KLOCKANS GRIND SLAPPER IGENOM, inte fore.
        // Forut startade den pa 0.18 medan `MIN_BEAT_CONFIDENCE` ar 0.20: mellan
        // dem var tilliten nollskild medan rutnatet var DOTT (hasBeat falskt), sa
        // pulsen var avstangd samtidigt som diagnostiken visade tillit. Ett
        // dodband som bara gick att felsoka genom att lasa bada filerna.
        const trustRaw = Math.max(0, Math.min(1, (frame.bpmConfidence - MIN_BEAT_CONFIDENCE) / 0.37));
        this.beatTrust += (trustRaw - this.beatTrust) * 0.06; // 0.03 -> 0.06: nar fullt slag efter en overgang pa ~0.7 s i st f ~1.5 s
        // TILLITSGOLV (portat från Lotus beatTrustFloor 2026-08-31). Rampen börjar exakt
        // där klockans grind släpper igenom (MIN_BEAT_CONFIDENCE), så vid conf ≈ 0.20 är
        // rutnätet LEVANDE men tilliten 0 → depth ≈ 0 och hjärtslaget är avstängt fast
        // takten går. Golvet låter pulsen leva på FAKTISKA transienter när tempot är
        // svårmätt men hörbart. Golvet sätts BARA här, inte på this.beatTrust: den läses
        // också av grid-/drop-grindarna (> 0.5) som ska fortsätta kräva riktig tillit.
        const trustFloored = Math.max(BEAT_TRUST_FLOOR, this.beatTrust);
        // PULSEN SKA FÖLJA MUSIKENS ENERGI, INTE BARA TAKTENS TYDLIGHET.
        // MÄTT 2026-08-07: i ett LUGNT parti pulsade riggen 70→100 % på varje taktslag
        // (två gånger i sekunden vid 117 BPM), vilket lästes som stroboskop. Djupet
        // styrdes enbart av bpmConfidence — takten är ju lika tydlig i ett stilla parti
        // som i ett kraftigt. Nu skalas det med energin: mild puls när låten andas,
        // full puls när den går för fullt. frame.intensity kommer ur minnets kurva när
        // en inspelning är synkad, annars ur realtidsanalysen.
        const energy = Math.max(0, Math.min(1, frame.intensity));
        // TAKET OCH PULSEN FÅR INTE VANDRA SAMTIDIGT.
        // MÄTT 2026-08-07: i låtens första 30 s rör sig minnets ljustak 42→57→47→60 % i
        // sekundtakt medan taktpulsen går 2,65 ggr/s ovanpå. Var för sig är båda lugna —
        // tillsammans blir pulsen oregelbunden, och oregelbunden puls läses som strobe.
        // Efter 30 s ligger taket still och samma puls upplevs som en jämn rytm, vilket
        // är precis vad användaren rapporterade. Lösningen dämpar INTE taket (dynamiken
        // är poängen) utan tonar ner pulsen medan taket rör sig.
        // BARA när ett minnestak finns. I realtid föll den förr tillbaka på energin, som
        // fladdrar 10 Hz — då bottnade calm på 0,25 och hjärtslaget försvann helt ur
        // realtidsläget. Dämpningen ska skydda mot att TAKET vandrar, inte mot att
        // musiken lever.
        let calm = 1;
        if (this.memCeiling !== null) {
            const ceilRate = Math.abs(this.memCeiling - this.prevCeil) * 100; // enheter/s (render 100 Hz)
            this.prevCeil = this.memCeiling;
            this.ceilRateAvg += (ceilRate - this.ceilRateAvg) * 0.02; // ~0,5 s
            calm = Math.max(0.5, 1 - this.ceilRateAvg * 4);
        }
        else {
            this.ceilRateAvg = 0;
        }
        // 0.55 → 0.70: ett kraftigare hjärtslag DOMINERAR över småfladder i nivån i
        // stället för att konkurrera med det — användarens förslag, och det ger dessutom
        // mer av den känsla pulsen finns till för.
        // 0.80 → 0.92, och energigolvet 0.35 → 0.50: djupare slag överallt, och märkbart
        // mer även i lugna partier. Pulsen ligger sist i kedjan och passerar inget
        // filter, så hela djupet når fram — det som mäts är det som syns.
        const depth = Math.min(1, DEPTH_GAIN * 0.92 * trustFloored * (0.62 + 0.45 * energy) * calm); // 0.50+0.50 -> 0.62+0.45: punchigare hjartslag (agaren "svagare/dimmare" efter effekt-trim)
        // KLAMRAS NEDAT: pre-dippen far envelopen ga negativ med flit, men
        // multiplikatorn far aldrig slacka riggen helt — da lases dippen som ett
        // blink i stallet for som andning. 0.06 lamnar lamporna tanda.
        // LIVE-BEAT: blanda grid-pulsen med en kick-driven puls efter tilliten (se LIVE_BEAT).
        let hbEnv = beatEnv;
        if (LIVE_BEAT) {
            const liveEnv = Math.exp(-Math.max(0, performance.now() - this.lastKickBoost) / LIVE_BEAT_MS);
            const w = (beat && beat.bpm > 40) ? Math.max(0, Math.min(1, (this.beatTrust - LIVE_TRUST_LO) / (LIVE_TRUST_HI - LIVE_TRUST_LO))) : 0;
            hbEnv = w * beatEnv + (1 - w) * liveEnv;
        }
        const bm = this.cfg.beatPulse ? (1 - depth) + depth * hbEnv : 1;
        // FLADDER-DÄMP (ägaren 2026-09-02, kvar även med lågpasset BORTA → koden, inte
        // insignalen): hjärtslaget visade en snabb dubbel — en andra topp 50–100 ms efter
        // den första. Orsak: när PLL:en rättar fasen kan beatEnv hoppa tillbaka UNDER
        // attacken och re-attackera inom samma slag → två toppar. PEAK-HOLD med mjuk
        // release fyller gropen mellan dem till EN puls; attacken är momentan så slaget
        // behåller sin skärpa. lastRenderMs är förra framens tid här (uppdateras senare).
        // GOLV 0.06 -> 0.30: pre-dippen + en djup puls drog beatMul till 6 % ≈ svart
        // strax före/mellan slagen → lästes som fladder till nära-svart (ägaren i
        // ladan 2026-09-03). 0.30 gör slaget till en tydlig ANDNING (30→100 %), inte
        // ett strobe-dropp. Hjärtslaget syns UPPÅT mot den nu dynamiska grundnivån.
        const bmClamped = bm < BEAT_MIN ? BEAT_MIN : bm > 1 ? 1 : bm;
        const bmDt = Math.min(0.05, (performance.now() - this.lastRenderMs) / 1000);
        if (bmClamped >= this.beatMulNow)
            this.beatMulNow = bmClamped; // momentan attack
        else
            this.beatMulNow += (bmClamped - this.beatMulNow) * Math.min(1, bmDt / BEAT_FLUTTER_RELEASE); // ~90 ms release
        // BAS-PUNCH: en hård/utdragen basstöt (drop) saknar transient, och på en
        // komprimerad signal svänger bas-energin lite. Så spåra ett bas-GOLV = den
        // TYSTA basnivån (sjunker mot tystnad på ~0.4s, stiger mkt långsamt ~5s). En
        // drop ligger då tydligt ÖVER golvet → punch som HÅLLER tills golvet hinner ikapp.
        // LÅTSTART: bas-golvet har spårat TYSTNADEN (~0). Utan detta skulle bassPunch
        // pinnas på max i ~5s när låten drar igång (golvet kryper ikapp på 0.004) →
        // md-boost plattar hela introt till ett ljust svep. Under warmup
        // (~första 3s aktiv musik) låter vi golvet snabb-komma-ikapp så punchen bara
        // fyrar på VERKLIGA basstötar över den etablerade nivån, inte på hela introt.
        const bassRise = this.warmMs < 3000 ? 0.05 : 0.004;
        if (frame.energy < this.bassBaseline)
            this.bassBaseline += (frame.energy - this.bassBaseline) * 0.05;
        else
            this.bassBaseline += (frame.energy - this.bassBaseline) * bassRise;
        // "Goa slaget": den utjämnade bas-svallen (över baslinjen) OCH — för LÅG LATENS —
        // det SNABBA kick-anslaget från 512-detektionen (fyrar direkt vid lastKickBoost,
        // ~15ms tidigare än det utjämnade bandet + onset.kick från dubbel-FFT:n som extra
        // säkring). Max av dem → punchen sitter på slaget.
        // LÅST: hjärtslaget ägs av beatPulse (beatEnv) — EN ren puls på slaget.
        // Den per-slag-bloom som kickfixen väckte la sig som en ANDRA blixt bredvid
        // (grid vs kick ur fas → dubbel; efter grid-retiming ett snabbt flimmer <75 ms
        // eftersom beatTick inte sammanfaller EXAKT med beatEnv-toppen) och gjorde
        // hjärtslaget otydligt. Så: ingen per-slag-bloom när låst — bloomen är kvar
        // för DROPS (sustained-svallet + dropEnv). Olåst: kicken är enda taktcuen,
        // behåll bloomen på den. (Ägaren live 2026-09-02: flimmer + otydligt slag.)
        const punchLocked = this.beatTrust > 0.5;
        const kickHitFast = Math.max(0, 1 - (performance.now() - this.lastKickBoost) / 180);
        // DUNK-RATIO (Gemini): anslag/energi i låg-enden — hög = knivskarp kick, låg =
        // smetig ihållande basnot. Grinda den UTJÄMNADE bas-svallen mjukt av den så bara
        // riktiga transienter driver punch (de snabba kick-delarna fyrar ändå).
        const dunkRatio = (frame.onset.kick + frame.onset.sub) / (frame.spec.kick + frame.spec.sub + 0.01);
        const sustained = Math.max(0, (frame.energy - this.bassBaseline - 0.05) * 4) * Math.min(1, dunkRatio / 0.4);
        // Ogrindad onset.kick fyrar på den RÅA kicken → skulle återinföra dubbeln när
        // låst. Då äger grid-timade kickHitFast slaget; olåst behålls onset som säkring.
        // PER-SLAG-PUNCH bara när OLÅST (då kicken är enda taktcuen). Låst → 0, så
        // beatPulse äger slaget rent. `sustained` (bas-svallet) ligger kvar i båda
        // fallen → DROPS bloomar fortfarande.
        const perBeatPunch = punchLocked ? 0 : Math.max(kickHitFast * 0.9, frame.onset.kick * 0.85);
        const bassPunch = Math.max(0, Math.min(1, Math.max(sustained, perBeatPunch)));
        // Uniform bas-punch borttagen ur master — effekterna äger sitt slag via ctx.punch.
        // Effekt-drive (silence-gate + beat-puls). Ljus-taket (cfg.master) läggs SIST
        // i cal-remappen istället — som ett äkta output-tak [onCh..tak], inte en
        // innehålls-skalning som gamma/kalibrering annars komprimerar bort.
        // HJÄRTSLAGET LIGGER NUMERA SIST, efter ballistiken — se nedan. Låg det här
        // smetades det ut av utgångens decay (0,42 s), som är mycket långsammare än
        // pulsens egen (121 ms): ljuset hölls kvar mellan slagen och slaget kändes knappt.
        const drive = this.silenceGate;
        // Synlig punch: en hård basstöt (eller drop-flash) BLOOMAR färgen till full
        // styrka — inte bara ljusare master (som är osynligt när effekten redan lyser).
        // DROP: analysatorn AVGÖR om det är en drop (frame.dropCount är MONOTON). Vi
        // jämför mot vårt senast hanterade värde → flanken kan ALDRIG missas trots att
        // rendern går långsammare än analysen (en enframs-boolean hade aliaserats bort).
        // Här ligger bara show-REAKTIONEN: accent-fönster, blackout, rök, envelope.
        const dtNow = Math.min(0.1, (performance.now() - this.lastRenderMs) / 1000);
        let dropHitRaw = frame.dropCount !== this.lastDropCount;
        this.lastDropCount = frame.dropCount;
        // Snapp: dropHit (show-reaktionen) flyttas till nasta slag om det ar nara; roken (wantBurst) tar dropHitRaw.
        // DROP I LUGN SEKTION (ladan 20:15: tva falska drops i ett lugnt parti): en riktig drop kommer ur en uppbyggnad eller ett
        // break. I low/intro kravs att analysatorn sett en riser (buildUp >= DROP_CALM_BUILD) - annars ignoreras dropen.
        const calmSec = SECTION_SWITCH && (frame.section === 'low' || frame.section === 'intro');
        if (DROP_CALM_BUILD > 0 && dropHitRaw && calmSec && frame.buildUp < DROP_CALM_BUILD) {
            dropHitRaw = false;
            this.dropCalmDenied++;
        }
        let dropHit = dropHitRaw;
        // EFTERKONTROLL (ladan 20:20: falsk drop 'liten uppbyggnad -> lugnt parti'): en riktig drop LANDAR HOGT. 600 ms efter dropen
        // jamfors nivan (lightLoud/liveLevelSm) med nivan strax fore; har den inte stigit >= DROP_LAND_GAIN doms dropen falsk:
        // envelope klipps, 20 s-high-fonstret och tiersnappen dras tillbaka. Blixten (0,6 s) hinner synas, inte 20 s fel show.
        if (dropHitRaw) {
            this.dropCheckAt = nowWall + 600;
            this.preDropLevel = this.liveLevelSm >= 0 ? this.liveLevelSm : this.lightLoud;
            this.preDropTier = this.tierEma;
        }
        if (this.dropCheckAt > 0 && nowWall >= this.dropCheckAt) {
            this.dropCheckAt = 0;
            const lvl = this.liveLevelSm >= 0 ? this.liveLevelSm : this.lightLoud;
            if (lvl < this.preDropLevel * DROP_LAND_GAIN + 0.02) {
                this.dropEnv = 0;
                this.lastDropSwitchMs = -1e9;
                if (this.tierEma > this.preDropTier)
                    this.tierEma = this.preDropTier;
                this.dropFalse++;
            }
        }
        if (DROP_SNAP_MS > 0) {
            if (dropHitRaw && this.beatTrust >= 0.5 && beatLocked(this.cfg.beat)) {
                const bms = beatPeriod(this.cfg.beat);
                const toNext = (1 - beatPhase(this.cfg.beat, Date.now(), this.showLead)) * bms;
                if (bms > 0 && toNext > 15 && toNext <= DROP_SNAP_MS) {
                    this.dropPendingAt = nowWall + toNext;
                    dropHit = false;
                    if (process.env.DMX_DROP_TRACE)
                        console.log(`[dropsnap] +${toNext.toFixed(0)} ms till slaget`);
                }
            }
            if (this.dropPendingAt && nowWall >= this.dropPendingAt) {
                this.dropPendingAt = 0;
                dropHit = true;
            }
        }
        const miniCount = frame.miniDropCount ?? 0;
        const miniHitRaw = miniCount !== this.lastMiniCount; // monoton raknare -> flanken kan inte aliaseras bort
        this.lastMiniCount = miniCount;
        // Fordrojd mini-reaktion: en riktig drop under vantetiden avbryter den (annars laser den som en for tidig drop).
        let miniHit = false;
        if (miniHitRaw)
            this.miniPendingAt = nowWall + MINI_DELAY_MS;
        if (dropHitRaw)
            this.miniPendingAt = 0;
        if (this.miniPendingAt && nowWall >= this.miniPendingAt) {
            this.miniPendingAt = 0;
            miniHit = true;
        }
        // DROPEN AR EN SMALL, INTE EN PLATA. Hallet var 2s och uttoningen 1s, alltsa
        // ~3s full blast per drop — och eftersom dropEnv KRINGGAR VU-taket (se
        // ceilMul nedan) ar det de enda ogonblick riggen gar till max.
        //   MATT: VU-taket sjalvt nadde aldrig over 0.85 (0% av tiden), men
        //   dropEnv lag over 0.5 i 14% av tiden i ett aktivt parti. Var sjunde
        //   sekund i max, vilket lasare som "for mycket drops".
        // 800ms hall + 1s utton ger fortfarande en tydlig gest men halverar tiden i
        // max. Sjalva anslaget (30ms attack) ar orort, sa smallen kanns lika hard.
        // 2000ms kandes som for mycket max-ljus, 800ms som for kort - 1300ms ar
        // mitten. Har ar anvandarens oga ratt matinstrument: hur lange en drop ska
        // halla ar en upplevelseparameter, inte en troskel att mata fram.
        const sinceStart = this.songStartAt ? performance.now() - this.songStartAt : 1e9;
        if (dropHit && sinceStart > START_DROP_MUTE_MS)
            this.dropBangUntil = nowWall + 1300;
        // DROP-BLACKOUT (dramaturgisk tystnad): en riser som BRYTS ner i en svacka
        // strax före dropen → tvinga kolsvart i max 250ms. Svärtan STARTAR på
        // svackans flank (bara om vi faktiskt byggt upp: buildUp>0.35) och SLÄPPS i
        // samma stund dropen fyrar → explosionen landar exakt i takt, aldrig
        // fördröjd. Rinner risern ut utan drop kommer ljuset bara tillbaka.
        const nowBreaking = frame.breaking;
        if (this.cfg.dropBlackout && nowBreaking && !this.wasBreaking && frame.buildUp > 0.35) {
            this.blackoutUntil = nowWall + 250;
        }
        this.wasBreaking = nowBreaking;
        if (dropHit)
            this.blackoutUntil = 0; // dropen fyrade → släpp svärtan, explodera
        const blackout = nowWall < this.blackoutUntil;
        const fog = this.cfg.fog; // rök beslutas EFTER effekterna (de får önska) — se nedan
        // `frame.inZone`-KRAVET BORTTAGET (ägaren i ladan 2026-09-03: bra fångst). Det var
        // orsaken till att lamp-blixten kom "upp till en takt efter, varierande" medan
        // RÖKEN (samma dropHit, inget inZone-krav) alltid var i tid: på en drop fyrar
        // dropHit direkt men inZone (nivå-ballistiken) släpar en takt → blixten väntade in
        // nivån. Nu fyrar blixten direkt på dropHit-fönstret (dropBangUntil), synkat med
        // röken. Detektionen kräver redan borta→stigit 16 dB, så det är en riktig drop ändå.
        const dropActive = DISCRETE_DROP_LAMPS && nowWall < this.dropBangUntil;
        // DROP-ENVELOPE: FULL ATTACK (~30ms) på träffen, HÅLL allt på max under
        // dropen, mjuk FADE ner (~1s) när den släpper. Egen effekt — INGEN
        // hårdvaru-strobe (det gav strobe-känslan), bara ljus + färg på max.
        if (miniHit && !dropHit && sinceStart > START_DROP_MUTE_MS)
            this.miniBangUntil = nowWall + MINI_BANG_MS;
        const miniActive = nowWall < this.miniBangUntil;
        const dTarget = dropActive ? 1 : miniActive ? MINI_DROP_ENV : 0;
        const dRate = dTarget > this.dropEnv ? dtNow / 0.03 : dtNow / 1.0;
        this.dropEnv += Math.max(-dRate, Math.min(dRate, dTarget - this.dropEnv));
        // UPPBYGGNAD: analysatorn räknar riser/novelty och ger oss frame.buildUp (0..1).
        // Reaktionerna (riser-strobe, md-swell, phaseSpread, show-tid) ligger kvar här.
        const count = this.cfg.fixtures.length;
        // Chase state machine — kick advances one step, plus a slow auto-advance
        // so it never stalls in silence. Runs regardless of mode so the head
        // stays coherent when the user switches into it.
        const now = performance.now();
        // TAKTLÅST NÄR TAKTEN HÖRS. Villkoret var cfg.beat, som är sant så fort en
        // takt NÅGONSIN låsts — inte att den stämmer nu. Och auto-framryckningen låg
        // på 320 ms OAVSETT: vid 134 BPM ligger slaget på 448 ms, så auto-steget hann
        // alltid först. Hela vårt BPM-intervall (80–160 = 750–375 ms/slag) ligger över
        // 320 ms → chase free-rullade på ~187 BPM och stegade ~2× per takt, aldrig i
        // takt. Nu: när takten är trovärdig stegar vi PÅ slaget och auto-steget är
        // bara ett skyddsnät långsammare än det långsammaste slaget (667 ms @90 BPM).
        const beatOk = this.beatTrust > 0.5;
        const autoAdvanceMs = beatOk ? 1200 : 320;
        const advance = beatOk ? beatTick : kickHit;
        if (count > 0 && (advance || now - this.lastChaseAdvance > autoAdvanceMs)) {
            this.lastChaseAdvance = now;
            if (this.cfg.chaseStyle === "pingpong" && count > 1) {
                this.chasePos += this.chaseDir;
                if (this.chasePos >= count - 1) {
                    this.chasePos = count - 1;
                    this.chaseDir = -1;
                }
                else if (this.chasePos <= 0) {
                    this.chasePos = 0;
                    this.chaseDir = 1;
                }
            }
            else {
                this.chasePos = (this.chasePos + 1) % Math.max(1, count);
            }
        }
        // "smart": välj effekt ur låtens känsla — relativ sektionsenergi (mot en
        // långsam baslinje) väljer tier. Byter bara på tier-byte, drop eller dwell —
        // alltid med minsta hålltid så en effekt hinner läsas (se orkestreringen nedan).
        let effMode = this.cfg.mode;
        if (this.cfg.mode === "smart") {
            // Energi styr läget → lokal intensitet väljer pool; annars fast medel.
            // Energi RELATIVT låtens eget snitt: en komprimerad signal ligger jämnt
            // högt, så absolut nivå säger inget. Jämför istället mot en långsam
            // baslinje (~30s) → mitten (snittet) = Fart, tydligt över snittet (drop/
            // topp) = Full Fart, tydligt under (breakdown) = Lugn. ±0.15 ger full sving.
            // Sektionsenergin KOMMER FRÅN ANALYSATORN (frame.intensity). Orkestratorn
            // analyserar inte själv — den regisserar bara: väljer tier och effekt.
            // IHALLANDE energi, inte ogonblicksvarde. Tiern lases av i BYTESOGONBLICKET
            // och effekten spelar sedan hela sin dwell (15s+), sa en enda sekunds topp
            // rackte for att lasa in en fullfart-effekt i ett helt mellanparti.
            //   MATT: FULL-effekter spelade 39% av tiden trots att intensiteten lag
            //   over FULL-troskeln (0.78) bara ~7%.
            // En 5s-EMA aker inte med pa spikar men foljer en verklig sektionsandring
            // inom nagra sekunder. Uppat gar den LANGSAMT (maste fortjanas) och nedat
            // snabbt (musiken slapper -> showen ska folja med direkt) - samma
            // dramaturgi som breakdown-regeln.
            // SEKTIONENS EGEN ENERGI SLAR REALTIDENS MEDELVARDE.
            // `tierEma` ar en 5 s-EMA over intensiteten — den kan per definition bara
            // beratta vad som REDAN hant, och en sektion ar oftast igang i flera
            // sekunder innan medelvardet hunnit ikapp. Minnet vet i stallet vad hela
            // sektionen vager redan nar den BORJAR, for tvatten har matt den fardigt
            // pa hela laten. Det ar precis den skillnaden som gor att showen kan MOTA
            // en refrang i stallet for att komma efter den.
            // Realtidsvagen ar orord for okanda latar och som fallback.
            const iNow = this.cfg.energyDrivesMode
                ? (this.memPartEnergy >= 0 ? this.memPartEnergy : frame.intensity)
                : 0.5;
            const iTau = iNow > this.tierEma ? 5.0 : 2.0;
            this.tierEma += (iNow - this.tierEma) * Math.min(1, _dtT / iTau);
            // EN DROP AR BEVISET pa att energin kommit — vanta inte pa medelvardet.
            // `intensity` mater den fras som just TAGIT SLUT, alltsa breakdownen. Utan
            // det har snappet tror dirigenten att musiken ar LUGN i exakt det ogonblick
            // kvallens storsta ogonblick slar till, och valjer en lugn effekt.
            // UPPMATT pa agarens material: vid drops lag tierEma pa 0.09-0.47 i sju av
            // sjutton fall (dvs "lugn"), och tiern hann ikapp forst efter 3.5 s median
            // — plus MIN_HOLD 8 s innan effekten fick bytas. Showen kom alltsa ikapp
            // ett tiotal sekunder EFTER dropen.
            if (dropHit && this.tierEma < 0.75)
                this.tierEma = 0.75;
            // SEKTIONEN AR BEVISET (DMX_SECTION_SWITCH, 2026-09-21): analysatorns 'high' = topp-tredjedelen av latens EGEN energi
            // (rank-lage), sa vid en high-grans vet dirigenten redan att refrangen ar har - gasa direkt (som vid drop), vanta inte
            // pa 5 s-medelvardet + hallstid. 'break'/'low' vid gransen: slapp ner direkt (musiken slapper -> showen foljer).
            if (SECTION_SWITCH && (frame.sectionAgeMs ?? 1e9) < 1500) {
                // KRASEN (ladan 19:55: 'gasade pa i lugnt parti'): bara nar analysatorns egen energitier ocksa sager topp (sectionTier 2).
                if ((frame.section === 'high' && (frame.sectionTier ?? 0) >= 2) && this.tierEma < SECTION_HIGH_SNAP)
                    this.tierEma = SECTION_HIGH_SNAP;
                else if ((frame.section === 'break' || frame.section === 'low') && this.tierEma > SECTION_LOW_SNAP)
                    this.tierEma = SECTION_LOW_SNAP;
            }
            const intensity = this.cfg.energyDrivesMode ? this.tierEma : 0.5;
            // Three tiers by intensity + tempo; user checkboxes (cfg.rotation) pick
            // which modes are in play. Full Fart kräver BÅDE hög energi och högt BPM.
            const LUGN = TIER.lugn;
            const FART = TIER.fart;
            const FULLFART = TIER.full;
            const bpm = this.cfg.beat?.bpm ?? 0;
            const enabled = (list) => list.filter((m) => this.cfg.rotation?.[m] !== false);
            // Fasta trösklar på (relativ) energi. Ingen bpm-sänkning längre — den
            // pushade mellanenergi till Full Fart och byggde på ett opålitligt
            // bpm-oktavvärde. Full Fart kräver en TYDLIG topp långt över snittet
            // (0.78) → reserverad för riktiga drops, inte varje energiskt parti.
            // ENV-STALLBARA (2026-09-22, ladan). Trosklarna ar satta mot en intensitet som spanner 0..1, men pa ladans
            // komprimerade PA ligger frame.intensity pa 0,00-0,49 (matt i [lagniva]-loggen) - FULLFART (0,78) var alltsa
            // OATKOMLIG, och dirigenten plockade kvall efter kvall ur samma lugn/fart-pooler ("kor nastan bara samma
            // effekter"). Aven drop-snappen stannar pa 0,75, dvs under troskeln. Defaulten ar oforandrad; ladan sanker
            // via DMX_TIER_HI. Ratt langsiktig fix ar ett nivamatt som spanner skalan (lotus dB-fonster), inte en lagre
            // troskel - den har raden gor bara poolen atkomlig under tiden.
            const loThr = Number(process.env.DMX_TIER_LO ?? 0.34), hiThr = Number(process.env.DMX_TIER_HI ?? 0.78);
            // TIER-HYSTERES: utan den flaxar tiern så fort intensiteten pendlar kring en
            // gräns → tierChanged blir sann om och om → effektbyte varje minsta-hålltid
            // (mätt: byte var 8.0s spikrakt). Kräv att man går TYDLIGT förbi gränsen för
            // att LÄMNA nuvarande tier (in vid gränsen, ut först HYST därbortom).
            const HYST = 0.08;
            let lo = loThr, hi = hiThr;
            if (this.lastSmartTier === "lugn")
                lo = loThr + HYST; // svårare att lämna lugn
            else if (this.lastSmartTier === "fart") {
                lo = loThr - HYST;
                hi = hiThr + HYST;
            } // brett fart-band
            else if (this.lastSmartTier === "full")
                hi = hiThr - HYST; // svårare att lämna full
            let tier = intensity < lo ? LUGN : intensity < hi ? FART : FULLFART;
            // Låg-BPM-spärr: en tryckare/ballad ska ALDRIG gå Full Fart, även om dess
            // relativa energi toppar. (bpm 0 = ej låst → ingen spärr.)
            // RÄKNAD MOT 80..160-INTERVALLET (exakt en oktav): en ballad på 85 bor kvar
            // som 85 och fångas av spärren, medan hardstyle 150 ligger tryggt över. Att
            // spärra högre än 100 hade dödat hardstyle helt, så bandet stannar där.
            if (bpm > 0 && bpm < 100 && tier === FULLFART)
                tier = FART;
            const tierName = tier === LUGN ? "lugn" : tier === FART ? "fart" : "full";
            // EFFEKT-ORKESTRERING. En effekt ska hinna LÄSAS av publiken innan nästa
            // kommer — därför byter vi bara på MENINGSFULLA händelser, och alltid med
            // en minsta hålltid:
            //   (a) TIER-BYTE — musiken byter karaktär (breakdown ↔ fart ↔ full fart)
            //   (b) DROP — det dramatiska ögonblicket (rate-limitat, se nedan)
            //   (c) DWELL-timern — showens grundpuls (per stämning)
            // Borttaget: det gamla "bigJump" (|Δintensitet|>0.1). Det var en SJÄLV-
            // ÅTERLADDANDE spärrhake — deltat mättes mot intensiteten VID SENASTE BYTET,
            // som nollställdes vid varje byte, så under en energi-ramp klättrade det
            // förbi tröskeln igen direkt efter varje byte → byte var 2.5:e sekund genom
            // hela uppbyggnaden. Tier-byte + drop täcker de verkligt musikaliska
            // ögonblicken; energi-variation INOM en tier ska effekten själv svara på.
            const tierChanged = this.cfg.energyDrivesMode && tierName !== this.lastSmartTier;
            const held = now - this.lastSmartSwitchMs;
            const MIN_HOLD = 8000; // en effekt lever ALLTID minst 8s
            const DROP_HOLD = 8000; // drop byter inte oftare än nagot annat (detektorn fyrar tatt pa pulsande musik)
            // Drop-byte bara när energin får driva → en LUGN stämning (chill,
            // energyDrivesMode av) byter ENBART på dwell-timern, aldrig på drops.
            const dropSwitch = DISCRETE_DROP_LAMPS && dropHit && this.cfg.energyDrivesMode && held > DROP_HOLD;
            const miniSwitch = miniHit && this.cfg.energyDrivesMode && held > MIN_HOLD; // minidrop: byt look om den hallits
            // MINNETS STRUKTUR: en tvättad låt vet var karaktären skiftar och var
            // fraserna börjar. Ett byte DÄR känns komponerat; samma byte 1,5 takt fel
            // känns slumpmässigt. Sektionsgräns = byt gärna nu; frasgräns = ok att byta.
            // Har låten grid väntar dwell-timern in nästa gräns (men max 20 s extra, så
            // showen aldrig fastnar om gridet skulle vara fel).
            // REALTIDSSEKTION (DMX_SECTION_SWITCH=1, 2026-09-21): analysatorns egen sektion (DMX_SECTION=1: intro/low/build/high/break)
            // ar ett bytesskal precis som latminnets sektionsgrans, och etiketten ger IDENTITET (samma look nar 'high' kommer tillbaka).
            // DROPEN AR REFRANGENS START (ladan 19:56: 'efter en drop dor lamporna'): sektionsdetektorn ligger kvar i 'build' nagra
            // sekunder efter smallen (uppehallstid) och build-lookerna ar morka av design. I 20 s efter en drop galler poolen 'high'.
            if (dropHit)
                this.lastDropSwitchMs = now;
            const afterDrop = SECTION_SWITCH && now - this.lastDropSwitchMs < 20_000;
            const expectSoon = SECTION_SWITCH && EXPECT_LEAD_MS > 0 && (frame.expectHighInMs ?? -1) > 0 && (frame.expectHighInMs ?? 0) <= EXPECT_LEAD_MS; // forvarning: byt FORE refrangen
            const liveSec = SECTION_SWITCH ? (afterDrop || expectSoon ? 'high' : (frame.section || '')) : '';
            const liveSecChanged = SECTION_SWITCH && liveSec !== '' && this.lastLiveSection !== '' && liveSec !== this.lastLiveSection;
            if (SECTION_SWITCH && liveSec !== '' && liveSec !== this.lastLiveSection) {
                if (this.lastLiveSection !== '' && SECTION_TRACE)
                    console.log(`[dirigent] sektion ${this.lastLiveSection} -> ${liveSec} (nr ${frame.sectionIndex ?? 0}, tier ${frame.sectionTier ?? '-'})`);
                this.lastLiveSection = liveSec;
                if (liveSec === 'intro')
                    for (const k of [...this.partLook.keys()])
                        if (k.startsWith('live:'))
                            this.partLook.delete(k);
            } // ny lat (analysatorn nollar till intro) -> glom live-lookerna
            const memSection = now - this.memSectionAt < 300 || liveSecChanged;
            const memPhrase = now - this.memPhraseAt < 250;
            const gridOk = !this.memHasGrid || memSection || memPhrase || now > this.smartDwellUntil + 20000;
            // MED STRUKTUR AR SEKTIONEN ENHETEN. Dwell-timern och tier-bytet ar till
            // for OKANDA latar, dar showen inte har nagot battre att ga pa. Har vi en
            // analyserad struktur ska looken sitta HELA sektionen ut — annars byter
            // den mitt i refrangen, vilket ar precis vad man vill undvika.
            //   MATT 2026-08-08 i en och samma refrang: "ny look chase (tier fart)"
            //   foljt 11 s senare av "ny look ripple (tier full)" — tre looker i en
            //   refrang, driven av att tiern flaxade mellan fart och full.
            const halvedChanged = HALVE_SHOW && this.pulseHalved !== this.lastHalvedForSwitch; // dubbeltakt/lugn slog om → delad look
            // BASGANG: tydlig basgang som kommer (eller gar) medan nuvarande look inte matchar -> byt.
            const bassClear = (frame.profile.bassline ?? 0) >= (this.lastBassClearForSwitch ? CLEAR_BASS - 0.2 : CLEAR_BASS);
            const curToggle = !!EFFECT_MAP.get(this.smartMode)?.toggle;
            const bassSwitch = bassClear !== this.lastBassClearForSwitch && (bassClear ? !curToggle : curToggle);
            const wantSwitch = this.memPart
                ? (memSection || bassSwitch)
                : (tierChanged || memSection || halvedChanged || bassSwitch || now > this.smartDwellUntil);
            // STRUKTUR: analysatorn vet VAR i låten vi är — dirigenten ska lyssna på
            // det, inte bara på energinivån. Två regler, båda dramaturgiska:
            //
            // 1) Byt ALDRIG mitt i en uppbyggnad. Publiken laddar mot dropen, och ett
            //    effektbyte där släpper spänningen precis när den ska byggas. Håll
            //    kvar genom hela risern — då landar bytet i stället PÅ dropen, vilket
            //    är det enda ögonblick där ett byte förstärker musiken.
            const inBuild = frame.inRiser || frame.buildUp > 0.35 || (SECTION_SWITCH && frame.section === 'build');
            // 2) I ett breakdown: gå till den lugna poolen oavsett vad energitiern
            //    säger. Tiern hinner inte ner direkt (den är medvetet trög mot flapp),
            //    så utan detta fortsätter riggen köra fullfart genom en svacka.
            const wantCalm = (frame.breaking || (SECTION_SWITCH && frame.section === 'break')) && this.cfg.energyDrivesMode;
            // 3) ETIKETTEN STYR INTE NIVÅN — SEKTIONENS UPPMÄTTA ENERGI GÖR DET.
            //    Här stod tidigare musikaliska schabloner: refräng aldrig lugn, vers
            //    aldrig full fart, intro/outro alltid lugnt. De byggde på att energin
            //    kom från en trög EMA som inte gick att lita på.
            //      MÄTT 2026-08-08, sektionsenergi ur ägarens egna låtar:
            //        #1  intro 0.26 · chorus 0.31 · verse 0.76 · chorus 0.83
            //            · inst 0.91 · chorus 0.45 · inst 0.93 · chorus 0.63 · end 0.07
            //        #3  chorus 0.51 · inst 0.81 · verse 0.96 · chorus 0.66 · end 0.28
            //      Refrängerna varierar mellan 0.31 och 0.83 i SAMMA låt, och i #3 är
            //      VERSEN låtens starkaste parti (0.96). Schablonerna hade tvingat upp
            //      en stillsam refräng och hållit tillbaka en väldig vers — fel åt båda
            //      hållen. Etiketten far darfor styra IDENTITET (samma look aterkommer)
            //      och NAR bytet sker (sektionsgransen), men inte hur starkt det lyser.
            const part = this.memPart || (SECTION_SWITCH && liveSec && liveSec !== 'intro' ? 'live:' + liveSec : undefined); // identitet aven utan latminne
            const tierS = tier;
            // Ny låt → glöm förra låtens looker.
            if (this.memSongId !== this.partLookSong) {
                this.partLook.clear();
                this.partLookSong = this.memSongId;
            }
            const buildEntry = MIX_V2 && liveSecChanged && liveSec === 'build'; // MIX_V2 (2): ett byte IN i build-poolen tillats
            if ((!inBuild || buildEntry) && (dropSwitch || miniSwitch || ((wantSwitch || buildEntry) && held > MIN_HOLD && gridOk))) {
                this.lastSmartSwitchMs = now;
                this.lastSmartTier = tierName;
                this.lastHalvedForSwitch = this.pulseHalved;
                this.lastBassClearForSwitch = bassClear;
                // DMX_DWELL_MS: agaren 2026-09-12 "dirigenten behover inte byta hela tiden, bara vid andringar i laten".
                // Stamningens dwell (fest 15 s, galet 10 s) tvingade byten pa klockan; med env satt hogt (120 s) blir
                // dwell en nodfallback och bytena sker pa tier-byte, sektionsgrans, drop och halvering.
                this.smartDwellUntil = now + (Number(process.env.DMX_DWELL_MS) || this.cfg.smartDwellMs || 9000);
                // EFFEKT-KRAV: filtrera bort effekter vars krav (tempo/karaktär) inte möts
                // just nu — strobe bara i snabb musik, trum-effekter bara med trummor, osv.
                // (registry.meetsRequirements). Ambient-effekterna kräver inget → utgör
                // fallbacken. Töms poolen ändå släpper vi kraven (hellre en mindre passande
                // effekt än ingen).
                const req = (m) => meetsRequirements(m, bpm, frame.profile);
                let pool = enabled(wantCalm ? LUGN : tierS).filter(req);
                // MIX_V2 (5): i 'high' (refrang/drop) ar energitiern oftast bara 'fart' (full 17-20 % av tiden pa ladans mixar) -> full-fart-
                // effekterna (party, split, gravity, konfetti, fyrverkeri ...) valdes nastan aldrig. I high far poolen vara fart + full.
                if (MIX_V2 && !wantCalm && liveSec === 'high' && tierS === FART)
                    pool = enabled([...FART, ...FULLFART]).filter(req);
                // SEKTIONSPOOL (DMX_SECTION_SWITCH): skar med sektionens looker (registry.SECTION_POOLS). 'build' och 'break' har egna
                // effekter (stegring/andrum) som gar fore tiern; for high/low/intro ar snittet med tier-poolen forsta valet.
                if (SECTION_SWITCH && liveSec) {
                    const secList = sectionPool(liveSec);
                    const own = (liveSec === 'build' || liveSec === 'break') ? enabled(secList).filter(req) : [];
                    const cut = pool.filter((m) => secList.includes(m));
                    if (own.length)
                        pool = own;
                    else if (cut.length)
                        pool = cut;
                }
                if (pool.length === 0)
                    pool = enabled(wantCalm ? LUGN : tierS); // krav tömde → släpp dem
                if (pool.length === 0)
                    pool = enabled([...FART, ...LUGN, ...FULLFART]); // valfri aktiv
                if (pool.length === 0)
                    pool = ["breathe"]; // sista fallback
                // HALVERAT: de delade lookerna (och hjärtat) ska finnas i poolen oavsett tier.
                // (innerouter borttagen 2026-09-23: rPerm 1,00 mot varannan - samma effekt upp till lampordning.)
                if (HALVE_SHOW && this.pulseHalved)
                    for (const m of ["varannan", "basgang", "hjarta"])
                        if (!pool.includes(m) && this.cfg.rotation?.[m] !== false && req(m))
                            pool.push(m);
                this.smartCount++;
                // DIRIGENTEN VÄLJER: poängsätt poolen mot musikens KARAKTÄR (frame.profile)
                // istället för att slumpa. Tydliga basslag → drumkit/gravity/duel; luftig
                // brygga → airglow/wave; tight fyra-på-golvet → snap/rave/gallop.
                // Vi tar inte alltid #1 utan varierar bland de tre bäst passande (gyllene
                // snittet) → matchar musiken men blir aldrig förutsägbar. Nuvarande effekt
                // utesluts så det alltid blir ett verkligt byte.
                // ÅTERSEENDE FÖRE NYHET. Har den här sektionstypen redan haft en look i
                // den här låten, ta tillbaka den — det är hela poängen med att veta att
                // det ÄR en refräng och inte bara "en ny sektion". Passar den inte längre
                // i poolen (energin har flyttat sig) väljs en ny, och den blir sektionens
                // nya look. `wantCalm` går före: ett breakdown ska vara lugnt även om
                // etiketten säger refräng.
                // ATERSEENDET VAGER TYNGRE AN TIERN. Forr kravdes att den ihagkomna
                // looken lag i NUVARANDE tier-pool — men tiern ror sig med energin, sa
                // samma refrang hamnade i "fart" ena gangen och "full" nasta, och looken
                // kastades bort. MATT: "chorus: aterser stege" tva ganger, sedan tre nya
                // looker i rad sa fort tiern gick till full. Kravet ar nu bara att
                // effekten alls ar pasagen av agaren.
                // LIVE-ETIKETT (ladan 20:30, 'fastnade i samma effekt'): generisk etikett ('high') aterser annars samma look hela laten.
                // Par-regel: sektion nr 1-2 delar look, nr 3-4 en ny, osv. (A A B B) - igenkanning utan att fastna.
                const livePart = !!part && part.startsWith('live:');
                const pairKey = livePart ? part + ':' + Math.floor(((frame.sectionIndex ?? 0) + 1) / 2) : part;
                const remembered = !wantCalm && pairKey && !livePart ? this.partLook.get(pairKey) : undefined; // 20:33: ingen igenkanning for live-etiketter ('samma effekt igen') - bara latminnet
                // TYDLIG BASGANG -> toggle-poolen (se CLEAR_BASS). Snitt med aktuell pool forst (sektion/tier/krav), annars alla
                // aktiva toggle-effekter som moter kraven. Bast passande forst, gyllene-snitt-variation bland topp 3, aldrig samma.
                const bassHard = bassClear && (!MIX_V2 || ((frame.profile.bassline ?? 0) >= CLEAR_BASS_HARD && this.smartCount % 2 === 1)); // MIX_V2 (1)
                const toggles = bassHard ? (() => { const cut = pool.filter((m) => TOGGLE_POOL.includes(m)); return cut.length ? cut : enabled(TOGGLE_POOL).filter(req); })() : [];
                const clearBass = toggles.length > 0;
                if (clearBass && !(remembered && TOGGLE_POOL.includes(remembered) && this.cfg.rotation?.[remembered] !== false)) {
                    const ranked = toggles.map((m) => ({ m, s: fitScore(m, frame.profile) - (MIX_V2 && this.recentLooks.includes(m) ? MIX_RECENT_PENALTY : 0) + (MIX_V2 && !this.seenLooks.has(m) ? MIX_UNSEEN_BONUS : 0) })).sort((a, b) => b.s - a.s);
                    const cands = ranked.filter((x) => x.m !== this.smartMode);
                    const top = (cands.length ? cands : ranked).slice(0, MIX_V2 ? Math.min((cands.length ? cands : ranked).length, Math.max(3, Math.round((cands.length ? cands : ranked).length * MIX_TOP_FRAC))) : 3);
                    this.smartMode = top[Math.floor(((this.smartCount * 0.61803398875) % 1) * top.length)].m;
                    if (part && !wantCalm)
                        this.partLook.set(pairKey, this.smartMode);
                    console.log(`[dirigent] tydlig basgang (${(frame.profile.bassline ?? 0).toFixed(2)}, ${toggles.length} toggles) -> "${this.smartMode}"`);
                }
                else if (remembered && this.cfg.rotation?.[remembered] !== false) {
                    this.smartMode = remembered;
                    console.log(`[dirigent] ${part}: återser "${remembered}"`);
                }
                else {
                    // DUBBELTAKT → VARANNAN: på snabbt/dubbeltakt-låst tempo (bpm ≥ 140) boostas
                    // `varannan` (spatial dubbeltakt) hårt så dirigenten väljer den i stället för
                    // att hela riggen blinkar dubbelt uniformt (ägaren i ladan 2026-09-03).
                    const halvedNow = HALVE_SHOW && this.pulseHalved;
                    const fastBoost = (m) => (m === "varannan" && bpm >= 140 ? 0.30 : 0)
                        + (MIX_V2 && bassClear && TOGGLE_POOL.includes(m) ? CLEAR_BASS_BOOST : 0) // MIX_V2 (1): boost, inte pool-byte
                        - (MIX_V2 && this.recentLooks.includes(m) ? MIX_RECENT_PENALTY : 0) // MIX_V2 (3): nyhetsstraff
                        + (MIX_V2 && !this.seenLooks.has(m) ? MIX_UNSEEN_BONUS : 0) // MIX_V2 (6): osedd-bonus
                        + (halvedNow && (m === "varannan" || m === "basgang") ? 0.30 : 0)
                        + (HALVE_SHOW && m === "hjarta" ? (halvedNow ? 0.30 : (wantCalm || tierS === LUGN) ? 0.20 : 0) : 0); // halverat: trion varannan/innerouter/hjarta = hela topp-3
                    const ranked = pool
                        .map((m) => ({ m, s: fitScore(m, frame.profile) + fastBoost(m) }))
                        .sort((a, b) => b.s - a.s);
                    const cands = ranked.filter((x) => x.m !== this.smartMode);
                    // MIX_V2 (4): valfonstret var alltid topp-3 av passformen -> samma 3-5 looker per tier for evigt; nu topp-MIX_TOP_FRAC av poolen (minst 3)
                    const top = (cands.length ? cands : ranked).slice(0, MIX_V2 ? Math.min((cands.length ? cands : ranked).length, Math.max(3, Math.round((cands.length ? cands : ranked).length * MIX_TOP_FRAC))) : 3);
                    this.smartMode = top[Math.floor(((this.smartCount * 0.61803398875) % 1) * top.length)].m;
                    if (part && !wantCalm)
                        this.partLook.set(pairKey, this.smartMode);
                    // LOGGEN AR OVILLKORLIG (2026-09-23): utan DMX_SECTION_SWITCH finns inget `part` och dirigentens val syntes inte alls i
                    // journalen (ladan 09-22: "vi korde pa hoga effekter" gick inte att belagga). Nu: del, sektion (data), basgang, tier, pool.
                    console.log(`[dirigent] ${part ?? 'smart'}: ny look "${this.smartMode}" (tier ${tierS === LUGN ? "lugn" : tierS === FART ? "fart" : "full"}, pool ${pool.length}, sektion ${frame.section ?? '-'}, basgang ${(frame.profile.bassline ?? 0).toFixed(2)}${wantCalm ? ', lugn' : ''})`);
                }
                // ENFORMIG LOOK -> KORTARE DWELL. Agaren 2026-09-12: "ar det en enformig effekt far den garna byta
                // snabbare". De statiska svepen (ingen takt-signal, ingen kick-drift) far DMX_DWELL_FLAT_MS (30 s),
                // taktdrivna looker behaller DMX_DWELL_MS. Satts EFTER valet, eftersom dwellen ovan sattes fore.
                if (process.env.DMX_DWELL_MS && EFFECT_MAP.get(this.smartMode)?.flat)
                    this.smartDwellUntil = now + (Number(process.env.DMX_DWELL_FLAT_MS) || 30000);
                if (MIX_V2) {
                    this.recentLooks.push(this.smartMode);
                    if (this.recentLooks.length > MIX_RECENT_N)
                        this.recentLooks.shift();
                    this.seenLooks.add(this.smartMode);
                }
            }
            effMode = this.smartMode;
        }
        this.activeMode = effMode;
        // REGI-LAGER: räkna takter → byt färgpalett var N:e takt (musikalisk fras) i
        // smart-läget, så showen känns designad och utvecklas över tid istället för
        // att slumpa färg. Paletten väljs efter klangen (centroid): mörk/bastung →
        // varmt, ljus/diskantig → svalt. Övergången sker mjukt via färg-ballistiken.
        if (this.cfg.mode === "smart") {
            if (frame.bpm === 0)
                this.phraseBeat = 0; // tyst/ej låst → nollställ frasen
            // Räkna bara takter när BPM är PÅLITLIGT (confidence) → palettbytena
            // hamnar på riktiga fraser, inte på ett hoppigt/osäkert tempo.
            else if (beatTick && frame.bpmConfidence > 0.35 && ++this.phraseBeat >= this.phraseBeats) {
                this.phraseBeat = 0;
                this.pickPalette(frame.centroid);
            }
            setPalette(PALETTE_LOCK ?? PALETTES[this.paletteIdx].sectors);
        }
        else {
            setPalette(PALETTE_LOCK ?? ALL_SECTORS); // manuella lägen: obegränsad färg (om ej låst)
        }
        // Advance the wave phase by dt so speed changes glide instead of jumping.
        const dtSec = Math.min(0.1, (now - this.lastRenderMs) / 1000);
        this.lastRenderMs = now;
        // Silence gate: below threshold for 250 ms → fade the effect out over ~0.25 s
        // (aggressive so the light sits tight to the audio); music back → fade in fast.
        // The warm ambient glow (below) takes over so a gap lands on amber, not black.
        // Gain-aware threshold: at high AGC gain the amplified noise floor sits well
        // above 0.05 and reads as flicker — real (even weak) music still lands near
        // the AGC target and passes.
        // INGÅNGEN AVSTÄNGD: ligger nivån stabilt under INPUT_OFF_LEVEL är det inte ett
        // tyst parti i musiken utan att källan är av (eller kabeln ur). Då ska riggen vara
        // MÖRK — inte vila på den varma glöden. Kravet på uthållighet gör att ett verkligt
        // break i låten (som dippar men kommer tillbaka) aldrig råkar släcka showen.
        if (frame.level >= INPUT_OFF_LEVEL)
            this.inputLowSince = 0;
        else if (!this.inputLowSince)
            this.inputLowSince = now;
        this.inputOff = !!this.inputLowSince && now - this.inputLowSince > INPUT_OFF_MS;
        // TYSTNADSGRIND (ladan 20:35, 'slacker sig under korta perioder'): 250 ms under 0,05 stangde riggen pa 0,25 s - en tyst fras
        // i laten racker. Env: DMX_SILENCE_LEVEL (0,05), DMX_SILENCE_MS (250), DMX_SILENCE_RELEASE_S (0,25). Ladan: 0,03 / 2000 / 1,0.
        const silenceThreshold = SILENCE_LEVEL * Math.max(1, frame.gain / 3);
        if (frame.level > silenceThreshold || kickHit)
            this.lastActiveMs = now;
        const gateTarget = now - this.lastActiveMs > SILENCE_MS ? 0 : 1;
        const gateRate = gateTarget > this.silenceGate ? dtSec / 0.1 : dtSec / SILENCE_RELEASE_S;
        this.silenceGate += Math.max(-gateRate, Math.min(gateRate, gateTarget - this.silenceGate));
        // FLANK: ljudet var borta och kom tillbaka → behandla det som en låtstart.
        // Täcker okända låtar och att någon startar musiken; för kända låtar sätter
        // index.ts samma sak när minnet låser tidigt i tidslinjen.
        if (this.gatePrev < 0.2 && this.silenceGate > 0.8)
            this.songStartAt = performance.now();
        this.gatePrev = this.silenceGate;
        // Warmup-räknare för baslinjen: ackumulera medan aktiv, nollställ vid tystnad.
        if (this.silenceGate > 0.5)
            this.warmMs += dtSec * 1000;
        else
            this.warmMs = 0;
        if (effMode === "wave")
            this.wavePhase += dtSec * (1.6 + audio * 4);
        // Drops: each beat/kick fires the next lamp in a fresh pure color.
        // Samma sak för drops: läste frame.kick i render (100 Hz) → aliasat, OCH
        // fyrade på både kick och grid-slag → upp till 2 tändningar per takt.
        // En tändning per slag när takten hörs, annars på den edge-säkra kicken.
        const dropAdvance = this.beatTrust > 0.5 ? beatTick : kickHit;
        if (effMode === "drops" && count > 0 && dropAdvance && now - this.lastDropAdvance > 140) {
            this.lastDropAdvance = now;
            this.dropCount++;
            // Golden-ratio walk over the lamps too — mixed order, never the same
            // lamp twice in a row, all lamps hit evenly.
            this.dropPos = Math.floor(((this.dropCount * 0.61803398875) % 1) * count);
            this.dropSector = mixedSector(this.dropCount);
            this.dropFired[this.dropPos] = now;
            this.dropHue[this.dropPos] = this.dropSector / 6;
        }
        // Varm ambient-vila: efter ~2.5 s HELT tyst tonar lamporna mot en dämpad
        // varm glöd (bärnsten) istället för svart → mysig lounge-känsla när musiken
        // tystnar/byts. Tonar in långsamt (1.5 s), ut snabbt (0.1 s) när musik åter.
        // ADAPTIV TYSTNADS-LANDNING: spåra hur länge musiken pumpat (hotMs). Kort
        // spelning → snabb dip till bärnsten (~1.2s); efter en lång stund (flera min)
        // → mjuk, värdig landning (~6s). Ger dansgolvet en snygg avslutning.
        if (this.silenceGate > 0.6)
            this.hotMs = Math.min(600000, this.hotMs + dtSec * 1000);
        if (this.ambient > 0.8)
            this.hotMs = Math.max(0, this.hotMs - dtSec * 2000); // klingar av i djup vila
        // Börja tona in glöden så fort gaten släckt effekten (~0.6s) i stället för att
        // vänta 2.5s → inget svart fönster mellan "effekt ute" och "glöd inne" vid låtglapp.
        const ambTarget = now - this.lastActiveMs > 600 ? 1 : 0;
        const landTau = 1.2 + Math.min(1, this.hotMs / 180000) * 5; // 1.2s .. 6.2s efter lång spelning
        const ambRate = ambTarget > this.ambient ? dtSec / landTau : dtSec / 0.1; // in: adaptivt, ut: snabbt
        this.ambient += Math.max(-ambRate, Math.min(ambRate, ambTarget - this.ambient));
        const ambLvl = this.cfg.ambientGlow ? this.ambient * 0.22 : 0; // vilo-glöd (opt-in); ljus-tak läggs i cal-remappen
        // VÄNTELÄGE: efter 90 s utan ljud tonar en långsam, tydligt AVSIKTLIG andning
        // in (5 s period). Den är medvetet trög och svag — den ska läsas som "den
        // lever och väntar", inte som en show. In långsamt (3 s) så den inte poppar
        // upp mitt i en paus; ut snabbt (0.4 s) så första takten tar över direkt.
        const deafTarget = now - this.lastActiveMs > EffectEngine.DEAF_AFTER_MS ? 1 : 0;
        this.deafFade += Math.max(-dtSec / 0.4, Math.min(dtSec / 3, deafTarget - this.deafFade));
        const breathe = 0.5 - 0.5 * Math.cos((now / 5000) * Math.PI * 2);
        const deafLvl = this.deafFade * (0.06 + 0.14 * breathe);
        // Samma bärnstens-kanal som vilo-glöden; den starkare av de två vinner så
        // lägena inte adderas till något ljusare än någon av dem var tänkt att vara.
        const restLvl = Math.max(ambLvl, deafLvl);
        // DIREKT VU-FILTER: den INGÅENDE ljudnivån styr den UTGÅENDE ljusstyrkan
        // direkt, som ett SISTA filter efter allt annat (effekter, beatPulse, ...).
        // Effekterna formar fortfarande sitt eget ljus; VU:n justerar slutresultatet
        // mot den råa nivån. BARA en drop får skippa filtret (går fram på full).
        let ceilMul = 1;
        if (this.memCeiling !== null) {
            // MINNESTAK: låten är igenkänd och tvättad → vi VET kurvan i förväg. Den är
            // normaliserad (p5..p95) och sekundmjuk, så full dynamik utan en enda
            // fladder-risk. Live-VU:n (som fladdrade vid höga nivåer) står åt sidan.
            const MEM_FLOOR = 0.20;
            ceilMul = Math.max(MEM_FLOOR + (1 - MEM_FLOOR) * this.memCeiling, this.dropEnv);
        }
        else if (this.cfg.energyCeiling) {
            // LÖPANDE NORMALISERING: samma kurva som minnestaket, räknad kausalt. Rå VU
            // är en ABSOLUT skala → platt i tysta låtar, mättad i höga. Auto-rangen
            // mappar nivån mot låtens EGNA p5..p95 så dynamiken blir full oavsett hur
            // hårt mastrad låten är, utan att veta vilken låt det är.
            // frame.levelVU = ~200ms smoothat PÅ HOP-TAKT (375Hz) i analysatorn → ser alla
            // hops, mycket lägre jitter än att smootha rå-nivån efter render-decimering (som
            // aliasade per-hop-rippel till synligt flimmer). En lätt ~90ms-glidning här
            // utjämnar sista resten utan lång svans. (Drop bypassar via dropEnv nedan.)
            const lvl = Math.max(0, Math.min(1, frame.levelVU));
            this.range.push(lvl, dtSec);
            const vuRaw = this.range.norm(lvl);
            // ASYMMETRISK VU: snabb UPP (transienter/drops syns), langsam NER (inget
            // fladder). MATT: med symmetriska 90 ms fladdrade riggen synligt vid MAX
            // ljusstyrka — dar VU:n ror sig 0.8-1.0 och taket appliceras EFTER
            // ballistiken, alltsa helt outjamnat. Av/pa-test av energyCeiling
            // isolerade det: flimret forsvann helt med taket av, och en lampa pa
            // ratt DMX 255 stod samtidigt HELT stabil (= hardvaran ar frisk).
            // MJUKARE TAK ("soothing"): 0.12/0.60 → 0.25/0.85. Den snabba attacken lät taket
            // hoppa upp på varje transient; med en längre uppgång andas det med låten i
            // stället för att rycka. Hjärtslaget står för det snabba — taket för nivån.
            // Ytterligare mjukat: 0.25/0.85 → 0.45/1.20. Taket ska följa låtens NIVÅ, inte
            // dess anslag — allt snabbt kommer från hjärtslaget. Priset är att en verklig
            // nivåändring (vers → refräng) tar en halv sekund extra att slå igenom.
            const vuTau = vuRaw > this.vu ? 0.45 : 1.20;
            this.vu += (vuRaw - this.vu) * (1 - Math.exp(-dtSec / vuTau));
            // KLUBB-LÄGE: kvadrera → hård kontrast (mörkt mellan, explosion på topp).
            // Kvadreringen biter nu på den NORMALISERADE kurvan → meningsfull i alla låtar.
            const vuBase = this.cfg.clubMode ? this.vu * this.vu : this.vu;
            // VU-GOLV: mappa om VU-spannet så det ALDRIG drar ner under VU_FLOOR. 0% VU →
            // VU_FLOOR, 100% VU → 100%, linjärt. Håller riggen närvarande i tysta partier
            // (i st.f. att krossas mot tändpunkten där bruset strobar) utan att döda
            // dynamiken. OBS: golvet gäller MULTIPLIKATORN → en effekt som skickar 0
            // (avsiktlig blackout) blir fortfarande 0; äkta TYSTNAD tonas bort av
            // silenceGate i master (effekt→0), inte här. Klubb-läget floras också.
            const VU_FLOOR = 0.20;
            const vuFilter = VU_FLOOR + (1 - VU_FLOOR) * vuBase;
            // BARA DROP skippar VU-golvet: dropEnv (0..1) lyfter taket till full under
            // det korta drop-fönstret, annars styr den golvade VU:n direkt.
            ceilMul = Math.max(vuFilter, this.dropEnv);
        }
        // Ljus-boost: swell UNDER uppbyggnaden (riser) → EXPLOSION på dropen.
        // INTONING VID LÅTSTART. Klämmer taket, inte effekten: allt som lyser tonar
        // upp tillsammans i stället för att enskilda kanaler beter sig olika. Kvadraten
        // gör starten mjuk och slutet snabbt — en linjär ramp känns som en dimmer som
        // dras, en kvadratisk som att musiken kommer igång.
        if (sinceStart < START_FADE_MS) {
            const w = sinceStart / START_FADE_MS;
            ceilMul = Math.min(ceilMul, w * w);
        }
        // OBS: ceilMul appliceras INTE här — det läggs sist (efter ballistiken) så
        // VU-taket följer nivån direkt utan effekt-ballistikens nedåt-släp.
        // ── LOUDNESS — PORTAD FRÅN LOTUS (piEngine.js:2126-2243, DEFAULT_CAL:166-239) ──
        // Ägarens observation: energidrivningen känns mycket bättre i Lotus. Orsaken är
        // TRE saker Lotus gör som den gamla bredbandiga linjära gasen inte gjorde:
        //  1. Driv från MID+DISKANT (frame.midHiDb, vikt 1.3) + lite bas (bodyDb, 0.25).
        //     Bredband är i praktiken en basmätare (~3.9 dB dynamik); mid/diskant bär ~3×
        //     mer, så dynamiken finns där.
        //  2. dB-FÖNSTER: mappa ett FAST 10 dB-fönster till 0..1 med ett långsamt (~60 s)
        //     auto-ankare — inte en linjär AGC-skalär som parkerar nivån nära 0.5.
        //     Ankaret följer källvolymen långsamt → volymoberoende UTAN att döda dynamiken.
        //  3. LOG-RELEASE: fade med konstant KVOT per tick (perceptuellt jämn), med snabb
        //     soft-snap-attack. Det är "smooth-hemligheten".
        const dtMs = dtNow * 1000;
        // LOUDNESS-KÄLLA = analysatorns `frame.intensity` (sektionsenergi relativt låtens
        // eget snitt, 0.5 = snitt). Den är REDAN robust normaliserad av analysatorn över
        // hela låten — så vi slipper dB-fönstrets skal- och settling-problem (mid+diskant
        // i absolut dB blir 25-42 dB på AUX gain-1x → allt pinnades mot taket). intensity
        // är dessutom sektionsnivå, inte råa sångstavelser → inget röst-flimmer. Log-
        // releasen nedan ger den perceptuellt jämna faden. (Mid+diskant-texturen kan
        // återinföras senare om önskat; nu prioriteras en robust, synlig gas.)
        let shape = Math.max(0, Math.min(1, frame.intensity));
        // ── LIV I NIVAN (opt-in DMX_LIVE_LEVEL=1, portat fran lotus 2026-09-21) ──────────────────────────────
        // intensity ar SEKTIONSNIVA (sekunder) - BLE-remsan kanns "levande" for att lotus driver nivan fran ra mid/diskant per tick
        // genom ett 10 dB-fonster mot ett LANGSAMT ANKARE: instant attack, ~350 ms release -> nivan foljer varje slag, pulsen ovanpa.
        // Det som falde den raa vagen 09-03 (allt i taket pa AUX) var att fonstret saknade ankare; ankaret har: tau 120 s, foljer med
        // tau/10 nar signalen ligger > fonstret utanfor at nagot hall, forsta 20 s efter start och nar ljuset legat klippt/slackt > 10 s.
        if (LIVE_LEVEL) {
            const wdb = frame.midHiDb + LIVE_BASS_W * (frame.bodyDb - frame.midHiDb); // mid/diskant med lite bas
            const tauMs = LIVE_ANCHOR_S * 1000;
            if (frame.level > INPUT_OFF_LEVEL && Number.isFinite(wdb) && wdb > -100) {
                const nowMs = performance.now();
                if (this.liveAnchor === undefined) {
                    this.liveAnchor = wdb;
                    this.liveFastUntil = nowMs + 20_000;
                }
                const up = wdb > this.liveAnchor;
                // SNABBT BARA UPPAT (ladan 19:58: 'lyser mycket aven nar laten blir tystare'): snabbt nerat gjorde ett tyst parti
                // till det nya normala pa 12 s. Nerat foljer ankaret bara langsamt (tau), och annu langsammare i low/break (x2).
                const prev = this.liveShapeRaw;
                if (prev >= 0.98) {
                    this.liveClipMs += dtMs;
                    if (this.liveClipMs > 10_000)
                        this.liveFastUntil = nowMs + 5_000;
                }
                else
                    this.liveClipMs = 0;
                const farAbove = wdb - this.liveAnchor > LIVE_WIN_DB;
                const fast = (farAbove || nowMs < this.liveFastUntil) && up;
                const quietSec = frame.section === 'low' || frame.section === 'break';
                const a = 1 - Math.exp(-dtMs / (fast ? tauMs / 10 : up ? tauMs * 3 : quietSec ? tauMs * 2 : tauMs));
                this.liveAnchor += a * (wdb - this.liveAnchor);
                const top = this.liveAnchor + LIVE_OFFSET_DB;
                let sh = (wdb - (top - LIVE_WIN_DB)) / LIVE_WIN_DB;
                sh = sh < 0 ? 0 : sh > 1 ? 1 : sh;
                this.liveShapeRaw = sh;
                // instant attack, release LIVE_RELEASE_MS (lotus lightSmoothMs 350 = ~ett slag)
                if (this.liveLevelSm < 0 || sh > this.liveLevelSm)
                    this.liveLevelSm = sh;
                else
                    this.liveLevelSm += (1 - Math.exp(-dtMs / LIVE_RELEASE_MS)) * (sh - this.liveLevelSm);
                shape = this.liveLevelSm;
                if (LIVE_TRACE && nowMs - this.liveLogAt > 2000) {
                    this.liveLogAt = nowMs;
                    console.log(`[liveniva] wdb ${wdb.toFixed(1)} ankare ${this.liveAnchor.toFixed(1)} shape ${sh.toFixed(2)} ${fast ? 'SNABB' : ''}`);
                }
            }
            else if (this.liveLevelSm > 0) {
                // UNDER TYSTNADSGOLVET (ladan 20:02: 'lag kvar ljust nar laten lugnade ner sig'): nivan FROS pa sista varde. Klinga av mot 0.
                this.liveLevelSm *= Math.exp(-dtMs / LIVE_RELEASE_MS);
                this.liveShapeRaw = 0;
                shape = this.liveLevelSm;
            }
        }
        // (d) shape-smoothing (asymmetrisk: snabb upp 25 ms, lugn ner 150 ms) — sprider
        //     ~125 Hz-uppdateringen över render-framesen utan att kväva stegringar.
        const shMs = shape > this.lightShapeSm ? LIGHT_SHAPE_UP : LIGHT_SHAPE_DOWN;
        const shA = 1 - Math.exp(-dtMs / shMs);
        this.lightShapeSm = this.lightShapeSm < 0 ? shape : this.lightShapeSm + shA * (shape - this.lightShapeSm);
        shape = this.lightShapeSm;
        // (e) log-release + soft-snap attack
        const eRatio = dtMs / 125;
        if (shape < this.lightLoud) {
            const a = 1 - Math.pow(1 - LIGHT_REL_A, eRatio);
            const c = this.lightLoud < 1e-4 ? 1e-4 : this.lightLoud;
            const t = shape < 1e-4 ? 1e-4 : shape;
            this.lightLoud = c * Math.pow(t / c, a); // konstant kvot per tick
        }
        else {
            const a = 1 - Math.pow(1 - LIGHT_ATK_A, eRatio);
            const softK = LIGHT_SOFT + (1 - LIGHT_SOFT) * Math.min(1, shape / 0.5); // brus snäpper inte, beats gör
            this.lightLoud += a * softK * (shape - this.lightLoud);
        }
        const loudness = this.lightLoud; // 0..1, ersätter den gamla energyEnv
        // LOUDNESS DRIVER LJUSET GOLV→FULL (inte bara +50% boost). Förr: (1 + loud·0.5)
        // → grundnivån ALLTID full, loud bara ovanpå → ingen synlig gas, tysta partier
        // dimmades aldrig, och hjärtslaget hade ingen plats att synas mot en maxad nivå
        // (ägaren i ladan 2026-09-03). Nu: golv LIGHT_FLOOR vid loud=0, full vid loud=1
        // → refräng ljus, vers dim = synlig gas, och pulsen syns uppåt mot en rörlig nivå.
        const md0 = drive * (LIGHT_FLOOR + (1 - LIGHT_FLOOR) * loudness + frame.buildUp * 0.35 + this.dropEnv * 0.8);
        // SEKTIONSGAS (DMX_SECTION_SWITCH): refrang lyfter mastern, break sanker - utover loudness (som redan foljer nivan).
        // SEKTIONSVAXEL (ladan 20:00, agaren: 'ska kunna bli morkare, mer dynamik'): low/intro x(1-LOW_DIP), break x(1-BREAK_DIP),
        // high x(1+LIFT) nar tiern ar topp. Analysatorns sektion ar latens egen rangordning, sa ett lugnare parti BLIR morkare
        // oavsett hur komprimerad mixen ar. Efter drop (afterDrop-fonstret) galler high.
        const secNow = (now - this.lastDropSwitchMs < 20_000) ? 'high' : frame.section;
        const secGain = SECTION_SWITCH ? (secNow === 'high' ? ((frame.sectionTier ?? 0) >= 2 || now - this.lastDropSwitchMs < 20_000 ? 1 + SECTION_HIGH_LIFT : 1)
            : secNow === 'break' ? 1 - SECTION_BREAK_DIP : (secNow === 'low' || secNow === 'intro') ? 1 - SECTION_LOW_DIP : 1) : 1;
        let dynGain = secGain;
        if (SECTION_SWITCH) {
            const lv = frame.levelVsHighDb ?? 0, ex = frame.expectHighInMs ?? -1;
            if (SECTION_DYN_DB > 0 && lv !== 0 && secNow !== 'high')
                dynGain = Math.max(SECTION_DYN_FLOOR, Math.min(1, 1 + lv / SECTION_DYN_DB)); // latens egen referens
            if (EXPECT_LIFT_MS > 0 && ex > 0 && ex <= EXPECT_LIFT_MS) {
                const l = 1 - ex / EXPECT_LIFT_MS;
                dynGain += (1 + SECTION_HIGH_LIFT - dynGain) * l;
            } // riser mot refrangen
        }
        const md = SECTION_SWITCH ? Math.min(1.2, md0 * dynGain) : md0; // standard: orort
        // HEARTBEAT: envelopen (kontraktet). ceiling = md utan tystnadsgrinden (drive), som appliceras separat pa ALLA effekter.
        const hbPulse = (this.cfg.beatPulse && this.beatMulNow > BEAT_MIN) ? Math.min(1, (this.beatMulNow - BEAT_MIN) / Math.max(1e-6, 1 - BEAT_MIN)) : 0;
        const hbEnvelope = { ceiling: drive > 1e-6 ? Math.min(1.2, md / drive) : 0, pulse: hbPulse, pulseDepth: Math.min(1, Math.max(0, HEARTBEAT_DEPTH * this.beatTrust)) };
        const wantCalmNow = frame.breaking || (SECTION_SWITCH && (frame.section === 'break' || frame.section === 'low'));
        const hbBase = modulateOf(effMode);
        const hbFlags = { energy: hbBase.energy || wantCalmNow, pulse: hbBase.pulse && this.beatTrust >= HEARTBEAT_TRUST }; // dirigentens overstyrning
        this.hbLast = { ceiling: hbEnvelope.ceiling, pulse: hbEnvelope.pulse, depth: hbEnvelope.pulseDepth, energy: hbFlags.energy, pulseOn: hbFlags.pulse };
        // SCENISKT DJUP (scenic anchor): i "alla-flänger"-lägena hålls mittlamporna
        // som FASTA uplights i en djup, mättad palettfärg (~40%) medan ytterlamporna
        // kör full gas. Ger arkitektoniskt djup — rörelsen poppar mot en stabil bas.
        // Antar lampor i rad V→H (ägar-toggle). Grupp-effekterna (rave/flip/gallop/
        // twin) har redan rumslig struktur → undantagna.
        const useAnchor = this.cfg.scenicAnchor && count >= 3 && EffectEngine.ANCHOR_MODES.has(effMode);
        const anchorPal = currentPalette();
        const anchorHue = (anchorPal[anchorPal.length - 1] ?? 0) / 6; // palettens djupaste ton
        // ── EFFEKT-KONTEXT (framräknat en gång per frame; idx/fx/band muteras per
        // lampa så samma objekt återanvänds → ingen allokering i loopen) ──────────
        const hasBeat = beatLocked(this.cfg.beat);
        const beatFrac = beatPhase(this.cfg.beat, Date.now(), this.showLead);
        // TAKT-RÄKNARE med graceful degradation: stegar på GRID-slaget (beatTick) när
        // BPM är låst, annars på VERKLIGA kicks (frame.kick). Så grid-effekterna
        // (snap/rave/party/ripple/…) fortsätter dansa på trummorna även när BPM-låset
        // tappas, i st.f. att frysa på beatIdx=0. Alla effekter använder beatIdx
        // MODULÄRT (färg/grupp/position) → ren drop-in.
        let beatHit = beatTick || (!hasBeat && kickHit); // DISKRET flank: takten gick just fram (grid-slag, annars verklig kick)
        let beatFracFx = beatFrac;
        if (HALVE_SHOW && this.pulseHalved && hasBeat) {
            // HALVERAD EFFEKT-KLOCKA: två riktiga slag = ett effekt-slag. Paritet 0 = "ett", 1 = "två".
            if (beatHit) {
                this.halfTick ^= 1;
                if (this.halfTick === 0)
                    this.beatCounter++;
                else
                    beatHit = false;
            }
            beatFracFx = (this.halfTick + beatFrac) / 2;
        }
        else {
            this.halfTick = 0;
            if (beatHit)
                this.beatCounter++;
        }
        const beatIdx = this.beatCounter;
        // beatPulse: grid-puls när låst, annars den VERKLIGA kick-envelopen → pulsar
        // ALLTID på musiken. (Utan detta gav beatFrac=0 → beatPulse=1 konstant = ingen
        // puls när BPM ej låst → party/pulse/bounce lyste bara jämnt högt.)
        const _bf = 1 - beatFracFx;
        const beatPulse = hasBeat ? _bf * _bf : kickEnv;
        const beatMs2 = beatPeriod(this.cfg.beat);
        const tempoDeep = Math.max(0, Math.min(1, (beatMs2 - 340) / 260)); // 0 snabbt .. 1 långsamt
        const punchFloor = 0.5 - tempoDeep * 0.42; // 0.5 (snabbt) .. 0.08 (långsamt)
        // Per-lampa frekvensband (driver aurora/twin + fixture.bands).
        // NU ur dubbel-FFT:ns separerade, per-band-AGC-spektrum i stället för det grova
        // 512-trebandet → renare, mer musikaliskt per-lampa-svar som alltid nyttjar range.
        const s = frame.spec;
        const bands = [
            Math.max(s.kick, s.bass), // "bass": låg-end (kick+bas)
            Math.max(s.lowMid, s.mid), // "mid": röst/synth/virvel
            Math.max(s.treble, s.air), // "treble": hi-hats/cymbaler/luft
            Math.min(1, Math.max(s.kick, frame.onset.kick) * 0.6 + kickEnv * 0.6), // "kick": transient
            Math.max(0, (0.5 - audio) * 2) * 0.6, // "low": lugn glöd när tyst, ur vägen när högt
        ];
        const BAND_IDX = { bass: 0, mid: 1, treble: 2, kick: 3, low: 4 };
        // DRUM-KIT onset-envelopes: nu FÄRDIGBERÄKNADE i analysern PÅ HOP-TAKT (375Hz)
        // → varje anslag fångas, aldrig missat mellan två render-frames. Effekten är en
        // ren konsument. (Flyttat hit; tau 60/110/150ms bevarade i analyser.ts.)
        const drum = frame.drum;
        // GRAVITATIONS-VU: ljudet knuffar nivån UPP; sen faller den med gravitation.
        // En separat peak-prick håller senaste toppen och sjunker långsamt.
        // Knuffas UPP av låg-enden (kick-anslag + bas), inte av bred-bandsnivån →
        // varje kick är en fysisk knuff uppåt, sen faller den. Litet audio-golv så
        // sustained höga partier håller den delvis uppe.
        const gPush = Math.max(frame.onset.kick, frame.spec.sub, frame.spec.bass * 0.9, audio * 0.4);
        if (gPush > this.gravLevel) {
            this.gravLevel = gPush;
            this.gravVel = 0;
        } // knuff upp
        else {
            this.gravVel -= 2.8 * dtSec;
            this.gravLevel = Math.max(0, this.gravLevel + this.gravVel * dtSec);
        }
        if (this.gravLevel > this.gravPeak)
            this.gravPeak = this.gravLevel;
        else
            this.gravPeak = Math.max(0, this.gravPeak - 0.45 * dtSec); // peak sjunker långsamt
        // Effekternas önskemål om specialenheter, samlade över lamporna.
        let wantStrobe = 0, wantBlinder = 0, wantUv = 0, wantLaser = 0, wantHazer = 0, wantCo2 = 0, wantFogFx = false;
        const effect = EFFECT_MAP.get(effMode);
        const ctx = this.ctx;
        ctx.cfg = this.cfg;
        ctx.frame = frame;
        ctx.t = t;
        ctx.count = count;
        ctx.section = frame.section || 'intro';
        ctx.sectionAgeMs = frame.sectionAgeMs || 0;
        ctx.sectionIndex = frame.sectionIndex || 0;
        ctx.sectionEntry = SECTION_SWITCH ? Math.max(0, 1 - (frame.sectionAgeMs || 1e9) / 400) : 0;
        ctx.sectionTier = frame.sectionTier ?? 1;
        ctx.expectHighInMs = frame.expectHighInMs ?? -1;
        ctx.levelVsHighDb = frame.levelVsHighDb ?? 0;
        ctx.repeatSim = frame.repeatSim || 0;
        ctx.audio = audio;
        ctx.kickEnv = kickEnv;
        ctx.punch = bassPunch;
        ctx.dropEnv = this.dropEnv;
        ctx.gravLevel = this.gravLevel;
        ctx.gravPeak = this.gravPeak;
        ctx.drum = frame.drum;
        ctx.beatIdx = beatIdx;
        ctx.beatFrac = beatFracFx;
        ctx.beatPulse = beatPulse;
        ctx.beatHit = beatHit;
        ctx.hasBeat = hasBeat;
        ctx.wavePhase = this.wavePhase;
        ctx.buildUp = frame.buildUp;
        ctx.phaseSpread = 1 + frame.buildUp * 2.5;
        ctx.punchFloor = punchFloor;
        ctx.chasePos = this.chasePos;
        ctx.dropFired = this.dropFired;
        ctx.dropHue = this.dropHue;
        ctx.now = performance.now();
        // BASNOTER: flank pa onset.bass (per-band anslag 0..1, adaptiv baslinje) med 90 ms cooldown -> ett steg per basnot.
        {
            const bo = frame.onset?.bass ?? 0;
            if (bo >= 0.30 && bo - this.prevBassOnset >= 0.10 && now - this.lastBassNoteMs >= 90) {
                this.bassNoteIdx++;
                this.lastBassNoteMs = now;
            }
            this.prevBassOnset = bo;
        }
        ctx.sectionBars = frame.sectionBars ?? 0;
        ctx.bassline = frame.profile?.bassline ?? 0;
        ctx.bassNoteIdx = this.bassNoteIdx;
        ctx.bassNoteAge = Math.min(9, (now - this.lastBassNoteMs) / 1000);
        ctx.want.strobe = undefined;
        ctx.want.blinder = undefined;
        ctx.want.uv = undefined;
        ctx.want.laser = undefined;
        ctx.want.fog = undefined;
        ctx.want.hazer = undefined;
        ctx.want.co2 = undefined;
        // RISER-STROBE (helrigg): under en uppbyggnad accelererar en strobe (3→18 Hz)
        // och färgen kollapsar mot vitt → klassisk EDM-build. Blackouten på själva
        // dropen sköts redan separat. Beräknas en gång/frame.
        // FREKVENSEN ÄR TAKAD. Blinkande ljus kan utlösa epileptiska anfall; risken
        // är störst mellan ~15 och 25 Hz och värst när HELA synfältet blinkar
        // synkront i vitt — vilket är precis vad det här gör. Den gamla rampen gick
        // till 18 Hz, rakt in i det värsta bandet. Taket är nu 3 Hz (WCAG 2.3.1 och
        // rundradions gräns för allmänt säkert innehåll). Ägaren kan höja det, men
        // bara genom ett uttryckligt val — aldrig som en bieffekt av något annat.
        // EFFEKT-KRAV: strobe bara i SNABBA låtar (ägaren i ladan 2026-09-03). En strobe
        // passar hardstyle/uptempo men känns malplacerad i en tryckare. Kräver bpm ≥
        // STROBE_MIN_BPM. OBS oktav-vikningen (80..160): en låt på 150-160 fångas, men en
        // riktigt snabb (>160) viks ner under gränsen — så gränsen släpper igenom det
        // uppmätta 150-bandet där strobe hör hemma. (bpm 0 = ej låst → ingen strobe.)
        const rsBpm = this.cfg.beat?.bpm ?? 0;
        const rs = this.cfg.riserStrobe && frame.buildUp > 0.25 && rsBpm >= STROBE_MIN_BPM;
        const maxHz = this.cfg.strobeUnlimited ? EffectEngine.STROBE_MAX_HZ : EffectEngine.STROBE_SAFE_HZ;
        const hz = Math.min(maxHz, 1.5 + frame.buildUp * (maxHz - 1.5));
        const rsWhite = rs ? frame.buildUp * 0.7 : 0;
        const rsGate = rs ? ((((t * hz) | 0) & 1) === 0 ? 1 : 0.12) : 1;
        // SPECIALKANALER (hazer/uv/blinder/strobe/laser/co2). Effektens `drives`-tagg
        // avgör om motorn tänder dem denna frame. Värdena hämtas från samma signaler
        // som färg-renderingen: audio-nivå, kick, drop, riser-strobe. Roller utan
        // matchande drive-tagg = 0 (svart) → knivskarp av/på, ingen läckage mellan
        // effekter. Kanalerna maskas ur ballistiken längre ner (samma spår som
        // strobe) så pulser inte tonas ut och sätter fixtures i mellanhastigheter.
        const drives = effect?.drives;
        const has = (r) => drives ? drives.includes(r) : false;
        // EXAKT (EffectDef.exact): effektens onskemal ar hela vardet - inget motorgolv. uvpuls vill ha UV AV mellan slagen.
        const exact = (r) => !!effect?.exact?.includes(r);
        const clamp255 = (x) => x < 0 ? 0 : x > 255 ? 255 : Math.round(x);
        const specialty = {
            hazer: has("hazer") ? clamp255(exact("hazer") ? wantHazer * 255 : Math.max(140 + audio * 60, wantHazer * 255)) : 0,
            uv: has("uv") ? clamp255(exact("uv") ? wantUv * 255 : Math.max(180 * md, wantUv * 255)) : 0,
            blinder: has("blinder") ? clamp255(exact("blinder") ? wantBlinder * 255 : Math.max(kickEnv * 255, this.dropEnv > 0.6 ? 255 : 0, wantBlinder * 255)) : 0,
            strobe: has("strobe") ? clamp255(exact("strobe") ? wantStrobe * 255 : Math.max(effMode === "strobe" ? 210 : (rs ? 220 : 0), wantStrobe * 255)) : 0,
            laser: has("laser") ? clamp255(Math.max(180 + audio * 75, wantLaser * 255)) : 0,
            co2: has("co2") ? clamp255(Math.max(this.dropEnv > 0.85 ? 255 : 0, wantCo2 * 255)) : 0,
        };
        for (let i = 0; i < count; i++) {
            const fx = this.cfg.fixtures[i];
            const isAnchor = useAnchor && i > 0 && i < count - 1; // mittlamporna = ankare
            let rgb;
            if (isAnchor) {
                rgb = hsvToRgb(anchorHue, 1, 0.4 + 0.06 * Math.sin(t * 0.5 + i)); // fast pelare, knappt levande andning
            }
            else {
                ctx.idx = i;
                ctx.fx = fx;
                ctx.want.strobe = undefined;
                ctx.want.blinder = undefined;
                ctx.want.uv = undefined;
                ctx.want.laser = undefined;
                ctx.want.fog = undefined;
                ctx.want.hazer = undefined;
                ctx.want.co2 = undefined;
                ctx.band = fx?.bands?.length ? Math.max(...fx.bands.map((b) => bands[BAND_IDX[b]])) : bands[i % bands.length];
                rgb = effect ? effect.render(ctx) : [0, 0, 0];
                // EFFEKTENS ÖNSKEMÅL. Den vet sin egen dramaturgi bäst; motorn avgör om det
                // blir av (fixturen måste ha rollen, och rök går genom hårdvaruskyddet).
                // Högsta önskemål bland lamporna vinner — en effekt som vill stroba på EN
                // lampa menar rimligen hela riggens strobe.
                if (ctx.want.strobe !== undefined)
                    wantStrobe = Math.max(wantStrobe, ctx.want.strobe);
                if (ctx.want.blinder !== undefined)
                    wantBlinder = Math.max(wantBlinder, ctx.want.blinder);
                if (ctx.want.uv !== undefined)
                    wantUv = Math.max(wantUv, ctx.want.uv);
                if (ctx.want.laser !== undefined)
                    wantLaser = Math.max(wantLaser, ctx.want.laser);
                if (ctx.want.hazer !== undefined)
                    wantHazer = Math.max(wantHazer, ctx.want.hazer);
                if (ctx.want.co2 !== undefined)
                    wantCo2 = Math.max(wantCo2, ctx.want.co2);
                if (ctx.want.fog)
                    wantFogFx = true;
            }
            if (rs) { // riser-strobe: vit-kollaps + accelererande gate
                rgb[0] = (rgb[0] + (1 - rgb[0]) * rsWhite) * rsGate;
                rgb[1] = (rgb[1] + (1 - rgb[1]) * rsWhite) * rsGate;
                rgb[2] = (rgb[2] + (1 - rgb[2]) * rsWhite) * rsGate;
            }
            if (this.dropEnv > 0.005) {
                const dc = hsvToRgb(mixedSector(this.dropSector + i) / 6, 1, 1);
                const vitKarna = Math.max(0, (this.dropEnv - 0.6) / 0.4); // bara vid toppen
                const k = this.dropEnv;
                for (let c = 0; c < 3; c++) {
                    rgb[c] += ((dc[c] + (1 - dc[c]) * vitKarna) - rgb[c]) * k;
                }
            }
            const strobeVal = effMode === "strobe" ? 210 : 0;
            // Effekt (master inkl. silenceGate → tonar ut på tystnad) + varm ambient-glöd in.
            if (HEARTBEAT) {
                // OUTPUT-komposition enligt kontraktet: avsikt x grind x (energi?) x (puls?), sedan ambient in.
                rgb[0] = composeLamp(rgb[0], hbEnvelope, hbFlags) * drive + 1.00 * restLvl;
                rgb[1] = composeLamp(rgb[1], hbEnvelope, hbFlags) * drive + 0.30 * restLvl;
                rgb[2] = composeLamp(rgb[2], hbEnvelope, hbFlags) * drive + 0.00 * restLvl;
            }
            else {
                rgb[0] = rgb[0] * md + 1.00 * restLvl;
                rgb[1] = rgb[1] * md + 0.30 * restLvl;
                rgb[2] = rgb[2] * md + 0.00 * restLvl;
            }
            // HJARTSLAGSLYFT (ladan 20:25, 'vid manga effekter forsvinner heartbeat'): pulsen ar en multiplikator i post - osynlig nar
            // effekten sjalv ligger lagt (0,2 -> 0,03). Adderar BEAT_LIFT x puls x (1 - ljus) sa morka/rorliga effekter far en synlig
            // stot uppat pa slaget; ljusa (nara max) paverkas knappt. Pulsen = beatMulNow normerad (1 pa slaget, 0 vid BEAT_MIN).
            if (!HEARTBEAT && BEAT_LIFT > 0 && this.cfg.beatPulse && drive > 0.05 && this.beatMulNow > BEAT_MIN) {
                const hb = (this.beatMulNow - BEAT_MIN) / Math.max(1e-6, 1 - BEAT_MIN);
                const lift = BEAT_LIFT * hb * md;
                rgb[0] += lift * (1 - rgb[0]);
                rgb[1] += lift * (1 - rgb[1]);
                rgb[2] += lift * (1 - rgb[2]);
            }
            // LAMPGOLV (ladan 20:05, 'manga effekter slacker lamporna'): effekternas egna golv (3-12 %) x mastern hamnar under PAR-lampornas
            // tandtroskel (~5-8 % DMX) -> helt slackt i stallet for morkt. Allt > 0 mappas till LAMP_MIN..1 under spelning; 0 forblir 0.
            if (LAMP_MIN > 0 && drive > 0.05) {
                const mx = Math.max(rgb[0], rgb[1], rgb[2]);
                if (mx > 0.002 && mx < 1) {
                    const k = (LAMP_MIN + (1 - LAMP_MIN) * mx) / mx;
                    rgb[0] = Math.min(1, rgb[0] * k);
                    rgb[1] = Math.min(1, rgb[1] * k);
                    rgb[2] = Math.min(1, rgb[2] * k);
                }
            }
            this.out.writeFixture(this.universe, fx, rgb, 1, strobeVal, specialty);
        }
        // Output ballistics on color/dim channels (never strobe/mode channels —
        // a decaying strobe value would sweep through real strobe speeds).
        // Snappare fade-out i energiska lägen så pumpen syns; lugna behåller mjukheten.
        const fastMode = effMode === "party" || effMode === "snap" || effMode === "bounce" || effMode === "drops" || effMode === "rave" || effMode === "drumkit" || effMode === "duel";
        const beatMsNow = beatPeriod(this.cfg.beat);
        const fastTau = Math.max(0.14, Math.min(0.3, beatMsNow * 0.5 / 1000));
        // TRANSIENT-SKÄRPA: hög energi/riser → kort decay (knivskarp piska på varje
        // transient); låg energi → lång decay (mjuk andande wash). Utnyttjar diodernas
        // snabba respons — skarpt utan hårdvaru-strobe.
        const sharpen = Math.min(0.65, audio * 0.45 + frame.buildUp * 0.5); // 0 lugnt .. 0.65 energiskt
        const tau = Math.max(0.08, (fastMode ? fastTau : (this.cfg.calmDecay ?? 0.42)) * (1 - sharpen));
        const decay = Math.exp(-dtSec / tau);
        // Bygg strobe-masken bara när fixtures ändras (inte varje frame).
        this.out.build(this.cfg.fixtures);
        this.maxCh = this.out.maxCh;
        // MATNING (grindar inget): när nivån är LÅG, vad är det som ändå håller
        // ljuset uppe? Varje steg i kedjan loggas så orsaken kan pekas ut i stället
        // för att gissas. Strypt till var 1,5 s. Gjort utanför apply för att slippa
        // skapa ett objekt i den heta postprocess-loopen.
        if (frame.level < 0.35 && Date.now() - this.lowLogAt > 1500) {
            this.lowLogAt = Date.now();
            console.log(`[lagniva] niva ${frame.level.toFixed(3)} vu ${this.vu.toFixed(2)} tak ${ceilMul.toFixed(2)}` +
                ` puls ${this.beatMulNow.toFixed(2)} drive ${this.silenceGate.toFixed(2)} md ${md.toFixed(2)}` +
                ` intensitet ${frame.intensity.toFixed(2)} konf ${frame.bpmConfidence.toFixed(2)}` +
                ` tillit ${this.beatTrust.toFixed(2)} effekt ${this.smartMode}`);
        }
        // EFTERBEHANDLING: ballistik → ljustak → hjärtslag → blackout → kalibrering →
        // headroom. Ordningen och motiven bor i postprocess.ts; här räknas bara VAD som
        // ska gälla den här rutan. Drop-undantagen bakas in innan de skickas vidare.
        this.post.apply(this.universe, this.out, this.cfg.fixtures, dtSec, decay, ceilMul, Math.max(this.beatMulNow, this.dropEnv), (this.cfg.energyCeiling || this.memCeiling !== null) && this.silenceGate > 0.5, !!this.cfg.beatPulse && this.silenceGate > 0.5, blackout || this.inputOff, this.cfg.master ?? 1, this.cfg.dropHeadroom ? Math.round(255 * Math.min(1, 0.90 + 0.10 * this.dropEnv)) : -1, performance.now());
        // Rök: motorn avgör OM den ska spruta, output-tjänsten var signalen hamnar.
        // RÖK: motorn samlar önskemålen — drop, manuell knapp, eller en effekt som bett om
        // det — och output-tjänsten avgör om maskinen KAN (värmebudget, cooldown, nödstopp).
        if (fog) {
            // MANUELL puff (Rök nu) kringgår cooldownen: ägaren trycker medvetet. Värmeskyddet (heatOk)
            // och pågående-puff-spärren gäller fortfarande. Utan detta tappades knappen TYST inom 2 min
            // efter varje drop-rök (ladan 2026-09-04: bursts stod still, ingen feedback i UI:t).
            const manualFog = !!this.cfg.fogTrigger;
            const wantBurst = (dropHitRaw && fog.onDrop) || manualFog || wantFogFx;
            if (this.cfg.fogTrigger)
                this.cfg.fogTrigger = false; // engångs-flagga
            const spraying = this.out.fogTick(nowWall, _dtT * 1000, wantBurst, fog, manualFog);
            if (fog.enabled)
                this.out.writeFog(this.universe, fog.address, spraying ? fog.level : 0);
        }
        return this.universe;
    }
}
