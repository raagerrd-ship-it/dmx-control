/**
 * Effect engine: consume Frames from the analyser, write a 512-byte DMX
 * universe.
 *
 * Each fixture in cfg.fixtures gets rendered based on its index. Fixture
 * channel-layout is honored (RGB / RGBW / dimmer).
 */

import { isLogOn } from "./quiet.js";
import type { ChannelRole, EngineConfig, Mode } from "./config.js";
import { fixtureRoles } from "./config.js";
import { FixtureOutput, GAMMA, type SpecialtyValues } from "./output.js";
import { beatPhase, beatMs as beatPeriod, beatIndex, hasBeat as beatLocked, MIN_BEAT_CONFIDENCE } from "./beatClock.js";
import type { Frame } from "./analyser.js";
import { EFFECT_MAP, TIER, sectionPool, meetsRequirements, TOGGLE_POOL, modulateOf } from "./effects/registry.js";
import { fitScore } from "./effects/fit.js";
import { PALETTES, ALL_SECTORS, setPalette, currentPalette, mixedSector } from "./effects/palette.js";
// PALETT-LAS (DMX_PALETTE): lås färgerna till en palett oavsett klang och läge. Namn ur listan
// nedan eller en sektorlista "4,4.6,5.55" (sektor/6 = hue: 0 röd, 1 gul, 2 grön, 3 cyan, 4 blå,
// 5 magenta — bråkdelar går bra, alla konsumenter räknar mixedSector()/6). Födelsedagsbarnet
// 2026-09-05 ville ha blå/lila/rosa. Tom/osatt = som förut (dirigenten väljer per fras).
const NAMED_PALETTES: Record<string, number[]> = {
  fodelsedag: [4, 4.6, 5.55],   // blå 240°, lila 276°, rosa 333°
  bla: [3.7, 4, 4.3], rosa: [5.3, 5.55, 5.8], eld: [0, 0.4, 1], regnbage: ALL_SECTORS,
};
/** SEKTIONSPALETT (opt-in DMX_SECTION_PALETTE=1, natt 2026-10-10, KONSERTSHOW - agaren: 'mer lik en riktig konsert-show'): paletten
 *  (3 kulorer) byts vid SEKTIONSGRANS i stallet for var 32:e slag, och samma sektionstyp far SAMMA palett igen i samma lat
 *  (igenkanning: refrangen ser ut som refrangen). Latgransen (softenRange) glommer paletterna. Av = som forr (frasraknaren). */
/** KONSERTLÄGET (DMX_CONCERT=1, ägaren i ladan 2026-10-11: "konsert-mode skall ju vara show, inte lite lätt pulserande i samma färg på alla
 *  lampor" + "får vi till det så är det det enda mode vi skall ha"): EN brytare = hela konsertpaketet (sektionspalett, frasbyten, lamptrappa,
 *  kulör per fras, full öppnar 0,6) + dirigenten väljer ALDRIG en enhetlig effekt (UNIFORM: alla fyra lamporna lika, mätt med
 *  tools/effectDyn.mjs - spridning < 0,1 i båda mixarna). Build-effekterna (stegring, sug, forvarning) är enhetliga med avsikt och får vara kvar. */
const CONCERT = true;   // ENDA LÄGET sedan 2026-10-11 (ägaren i ladan: "mycket bättre, gör det till enda läget"); env-brytaren DMX_CONCERT borttagen
const UNIFORM: Mode[] = ['breathe', 'snap', 'mono', 'pulse', 'party', 'airglow', 'hjarta', 'tyngdlyft', 'strobe',
  'stegring', 'sug', 'forvarning'];   // 10-11: aven de enhetliga build-effekterna (agaren: 'uppbyggnad ... dar ar vi inte bra') - upptakt tar builden
/** MINIDROPS SOM SHOW (agaren 10-11: 'mindre drops ... sa att alla lampor da lyser lika'): hogst en per MINI_GAP_MS (bänken: 11-58/min
 *  = brus), och minidropen gör ALLA fyra lamporna lika i en kulör ur paletten en kort stund (miniColEnv, steg 1, som drop-looken men
 *  utan vit kärna). */
/** BUILD SOM HÅLLER OCH LANDAR (ägaren i ladan 10-11: "uppbyggnad och drop missa den precis, den va jättetydlig"): (1) build-poolen
 *  är bara BUILD_LOOKS, och när en build-look väl börjat bryts den bara av drop/nästan-drop (långinspelningen: upptakt -> eq -> basgang
 *  på 4 s, avbrutet av basgång/fras/sektion); (2) en NÄSTAN-DROP 2..20 s efter att build-looken började räknas som en RIKTIG drop i
 *  showen (drop-look, rök, drop-look-byte) - analysatorns 4 s-break-krav missar dropen efter en trumvirvel-build. */
const BUILD_LOOKS: Mode[] = ['upptakt', 'nedrakning', 'fyllning', 'pingpong', 'virvel', 'gryning', 'rulle', 'flod', 'siren', 'stjarnor', 'mullra', 'hiss', 'tratt'];   // + gryning (lugn) och rulle (full), situationsrutnätet 10-12   // 10-11: tre nya build-effekter (ägaren: fler per gren)
/** NÄSTAN ENHETLIGA (ägaren i ladan 10-11: "finns någon effekt där alla lampor har samma effekt och bara energi fadas lite svagt, den
 *  borde ha bpm-spärr, under kanske 80"): spridning < ~0,16 i båda mixarna (tools/effectDyn.mjs). Analysatorn rapporterar 80..160 BPM
 *  (DMX-profilen BPM_MIN 80, långsamma låtar vikes upp) - 'under 80' finns inte, så de får bara väljas under CALM_BPM (90). */
const CALM_ONLY: Mode[] = ['tide', 'aurora', 'andrum'];
const CALM_BPM = Number(process.env.DMX_CALM_BPM ?? 90);
/* (LYFT + SPRÅNG = DROP, 10-11 kväll -> 10-12: BORTTAGEN. Ägaren i ladan 10-12 13:13/13:14: 'drop, kunde vart mini', 'fel drop skulle
   vara mini' - båda var lyft+språng-drops (32 dB); 'hellre öka gränsen till riktig drop, bara minidrops kör vidare'. Lyften är minidrops.) */
/** MINIDROPEN LYFTER OCH HÅLLER (ägaren i ladan 10-11: "låten ökar energi, kör minidrop men ljuset visar inget"): bänken visade att
 *  blinken kom (0,40 -> 0,95) men bara i 150 ms - sedan föll ljuset tillbaka. Nu släpper energin helt i MINI_LIFT_MS efter minidropen
 *  (effekten lyser med full egen styrka) och glider tillbaka på MINI_LIFT_FALL_MS. Bara mindre dämpning. */
const MINI_LIFT_MS = Number(process.env.DMX_MINI_LIFT_MS ?? 4000), MINI_LIFT_FALL_MS = Number(process.env.DMX_MINI_LIFT_FALL_MS ?? 1500);   // 400/400 -> 4000/1500 (ladan 10-11 21:50, efter V123 när minidropen bara kommer på riktiga lyft: 'med dessa miss skulle jag önskat minidrop med ökad energi')   // 1000/800 -> 400/400 (ägaren: 'bara allt lyser')   // 500/600 -> 1000/800 (kandes inte)   // ägaren: 'behöver inte vara 2 s' - 2 s bara med felsökning på (synligt kvitto)
/** ENERGILYFT (ägaren i ladan 10-11: "jag ser allt från att det varit lugnt till ett tydligt energilyft (även om det är lägre) med
 *  basslag som minidrop"): analysatorns minidrop/nästan-drop jämför mot de senaste sekunderna, som efter ett lugnt parti har anpassat
 *  sig. Här: basens kropp (nearB, 120 ms) medlad över 0,6 s mot medlet för 6..2 s sedan; LIFT_DB över det -> samma minidrop-look
 *  (alla lampor lika + lyft). Högst en per LIFT_REFRACT_MS. Bara DMX-sidan (frame.bodyDb), delade analysatorn orörd.
 *  V123 (analysen 10-11 kväll, tools/natt/konsert/analys-2026-10-11.md, ägaren: "jag vill testa 123"): 0,6 s-medel, 10 dB, 8 s,
 *  inget kick- eller över-toppen-krav. Ensam: 72 % av fyrningarna på ett ihållande baslyft, fångar 85 %, latens 0,11 s; fyrar vid
 *  alla sju av ägarens markeringar. Lyftet (+ sektionslyftet) är nu ENDA källan till minidrop-looken. */
const LIFT_DB = Number(process.env.DMX_LIFT_DB ?? 10), LIFT_REFRACT_MS = Number(process.env.DMX_LIFT_REFRACT_MS ?? 8000);
const MINI_GAP_MS = Number(process.env.DMX_MINI_GAP_MS ?? 2000), MINI_UNI = Math.max(0, Math.min(1, Number(process.env.DMX_MINI_UNI ?? 1)));
// (EFFEKTEN LEDER/CONCERT_E_FLOOR, VARJE SLAG/CONCERT_BEAT, BASSLAGEN/CONCERT_KICK och BASSLAGEN I ENERGILAGRET/KICK_E borttagna 10-12:
//  ersatta av BASENERGIN, se B_CURVE.)
/** DROPEN BÄR IN I REFRÄNGEN (ägaren i ladan 10-11: "efter drop känns som energin dör varje gång"): dropen är det starkaste
 *  ögonblicket och drar upp energifönstrets topp - refrängen efter mäts mot den och dämpas. Efter en drop släpper energin helt i
 *  DROP_LIFT_MS och glider tillbaka på DROP_LIFT_FALL_MS. Bara mindre dämpning. */
const DROP_LIFT_MS = Number(process.env.DMX_DROP_LIFT_MS ?? 4000), DROP_LIFT_FALL_MS = Number(process.env.DMX_DROP_LIFT_FALL_MS ?? 1500);   // 2000 -> 4000 (ladan 22:0x: 'se till så energin efter fortsätter', som minidropens lyft som var 'perfekt')   // 4000/3000 -> 2000/1500 (ägaren: 'bara allt lyser')
const SECTION_PALETTE = CONCERT;
/** FRASBUNDNA LOOK-BYTEN (opt-in DMX_PHRASE_SWITCH=1, natt 2026-10-10, KONSERTSHOW idé 1): konsertbanken mätte att bara 9-22 % av
 *  look-bytena landar på en 4-taktsgräns (slumpen ger 19 %) - gridOk hängde på låtminnets grid som är borttaget. Med takten låst
 *  (tillit >= 0,5) väntar vanliga byten (inte drop/nästan-drop/uppbyggnad) på frasens första slag (effektklockans beatIdx % 16 = 0),
 *  högst en fras extra. Av = som förr. */
const PHRASE_SWITCH = CONCERT;
/** LAMPTRAPPA (opt-in DMX_LAMP_STAIR=1, natt 2026-10-10, KONSERTSHOW idé 3): en ljusdesigner sparar hela riggen till refrängen - här
 *  var alla fyra lamporna tända 81-88 % av tiden. Dirigenten (inte energin: den släcker aldrig en tänd lampa) väljer i vers/intro bara
 *  SPARSAMMA looks och i refrängen inga sparsamma. Listan är MÄTT (tools/lampCount.mjs, pop+megamix): snitt <= ~2,9 tända lampor av 4.
 *  10-11 ("fler sparsamma effekter, så att lamptrappan inte kostar variation"): vers/intro väljer ur HELA poolen igen, men en effekt som
 *  inte är sparsam tänder bara ETT lamppar (ctx.group, paret byts varje fras) - i steg 1 (effektNiva), aldrig i energin. Drops tänder allt. */
const LAMP_STAIR = CONCERT;
/** KULÖR PER FRAS (opt-in DMX_HUE_PHRASE=1, 10-11, KONSERTSHOW): effekternas kulörklocka ctx.hueIdx stegar bara vid frasgräns (16 slag på
 *  effektklockan) i stället för per takt/slag - konsertbänken mätte 17-21 kulörbyten/min. Rörelse och puls följer fortfarande beatIdx. */
const HUE_PHRASE = CONCERT;
// (FULL OPPNAR RIGGEN / DMX_TIER_OPEN borttagen 10-12: ett golv på energin - sektionstaket och basenergin tar det, se B_CURVE.)
/** STROBE VID DROPEN (opt-in DMX_DROP_STROBE = DMX-varde 1..255 pa lampornas EGEN strobe-kanal, 10-11, KONSERTSHOW 'strobe vid ratt
 *  ogonblick'): en konsert anvander stroben som ett ogonblick, inte en look. RGB kan inte strobea (uttoningen smetar blixten, och
 *  snabbare uttoning ar forbjudet) - lampans strobe-kanal gar forbi uttoningen. Satts bara under drop-smallen (dropBangUntil, 1,3 s).
 *  Vardet -> blixttakt beror pa lampmodellen: KALIBRERA I LADAN med ett lagt varde, hogst 3 blixtar/s (fotosensitiv epilepsi). 0 = av. */
const DROP_STROBE = Math.max(0, Math.min(255, Math.round(Number(process.env.DMX_DROP_STROBE ?? 0))));
/** EKO SOM FÖRSTAVAL (standard 10-12, ägaren: "analysera vilken gräns för basgång för att få igång mer variation"): basgångsvärdet
 *  (profile.bassline) är högt i ALLA sektioner på ladans musik (median 0,62 intro .. 0,77 refräng, break 0,69), så gränsen 0,6 gjorde
 *  eko till förstaval nästan jämt - 30 % av tiden. Nu bara vid tydlig basgång (>= 0,85) och aldrig i refrängen (nattagentens
 *  DMX_EKO_HIGH=0: eko tände 1,1 lampa och refrängen blev mörkare än builden). Replay 22 ladan-filer: eko 30 -> 10 %, variation
 *  (effektivt antal looker) 21 -> 34, nya rutnätseffekter 16 %, break-effekterna väljs. Eko finns kvar i poolerna. */
const EKO_BASS = 0.85;
/** REFRÄNGEN LYSER STARKAST OCH SLÅR HÅRDAST (ägaren 10-12: "i refräng vill man ha takten så den känns så mycket som möjligt" +
 *  "lampor skall lysa olika och inte alla vara tända - justera hur vi beräknar ljusstyrkan i sektionerna"). Måttet är den LJUSASTE
 *  lampan (inte medel över riggen - det belönade att tända fler lampor). Före: toppen ~0,78 i alla sektioner. Nu: tak per sektion
 *  på den ljusaste lampan (SEC_CEIL vers/intro/break, builden stiger mot SEC_CEIL_BUILD, refräng/drop fullt), djupare taktdipp i
 *  refrängen (KICK_E_HIGH 0,6) och energigolv 0,8 där (dippen och golvet ersatta av BASENERGIN 10-12, taket kvar). Replay 22 ladan-filer: topp refräng 0,76 / build 0,66 / vers 0,62,
 *  slagdjup refräng 68 % (djupast), tända lampor oförändrade (2,4). Grundton på mörka lampor och kickblixt på alla förkastade. */
const SEC_CEIL = 0.65, SEC_CEIL_BUILD = 0.85;
const SPARSAM: Mode[] = ['basgang', 'chase', 'split', 'bounce', 'eko', 'vidga', 'varannan', 'nedrakning', 'eq', 'ripple'];
const PALETTE_LOCK: number[] | null = (() => {
  const v = (process.env.DMX_PALETTE ?? "").trim(); if (!v) return null;
  if (NAMED_PALETTES[v.toLowerCase()]) return NAMED_PALETTES[v.toLowerCase()];
  const nums = v.split(",").map(Number).filter((x) => Number.isFinite(x) && x >= 0 && x < 6);
  return nums.length ? nums : null;
})();
if (PALETTE_LOCK) console.log(`[palett] LÅST till [${PALETTE_LOCK.join(", ")}] via DMX_PALETTE`);
import { hsvToRgb } from "./effects/color.js";
import type { EffectContext } from "./effects/types.js";

/** Rökmaskinens tillstånd, för UI:t. */
export interface FogStatus {
  /** heating = uppvärmningsklockan går, ready = redo, spraying = puff pågår. */
  state: "heating" | "ready" | "spraying";
  warmLeftMs: number;   // kvar av uppvärmningen (0 när klar)
  heat: number;         // termisk budget som är förbrukad, 0..1
  sprayMs: number;      // ackumulerad röktid sedan service
  bursts: number;       // antal puffar sedan service
  /** Namnet på en armatur vars kanaler rök-adressen krockar med, annars null. */
  conflict: string | null;
}

// HJÄRTSLAGETS FORM, SKALAD MED TEMPOT.
// En fast utklingning ger olika känsla i olika tempon: 130 ms är ett tätt dunk vid
// 159 BPM men en gles blink vid 90. Skalas båda mot taktperioden upptar pulsen samma
// ANDEL av takten oavsett tempo (~45 %), och resten är vila — då känns det som att
// ljuset följer musiken i stället för att gå i sin egen takt.
// Attacken har ett golv och ett tak: under ~30 ms läses den som ett steg (blixt),
// över ~70 ms tappar den anslaget.
/** Under den här nivån räknas ingången som avstängd, inte som ett tyst parti. */
const INPUT_OFF_LEVEL = 0.02;
const SILENCE_LEVEL = 0.05;   // standard om cfg saknar silenceLevel (env-ratten DMX_SILENCE_LEVEL borttagen 10-11: den gjorde /setup-reglaget verkningslost)
/** ...men först när den legat där så länge — ett break i låten ska inte släcka showen. */
const INPUT_OFF_MS = 2000;
/** HARD INGANGSGRANS (agaren i ladan 2026-10-07: "lagsta input till analysatorn ... dar gor vi hard grans som vi kan justera. Inga
 *  starttider mm"; STANDARD 2026-10-08): analysatorns niva (frame.level) under Slackgransen (/setup) = svart,
 *  over = tant - direkt. Ingen hålltid, ingen ton in/ut, ingen gain-skalning, och gransens flank startar ingen 'ny lat'
 *  (gamla grinden med SILENCE_MS/SILENCE_RELEASE_S borttagen). Analysatorn hor fortfarande allt. */

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
const PULSE_HALVE_ABOVE_BPM = 170;   // 135 -> 170 (2026-09-23, samma som lotus: "Gamle Astrid" 148 BPM kandes som halvtakt)
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
const SUBDIV_ENERGY_LO_ON = 0.30;    // under detta: lugnt parti → halvera
const SUBDIV_ENERGY_LO_OFF = 0.42;   // över detta: släpp halveringen
const SUBDIV_MIN_HOLD_MS = 10000;
/** HALVERAD SHOW (alltid sedan 10-11, brytaren DMX_HALVE_SHOW borttagen): halveringen når hela showen, inte bara hjärtslagets form. Effekt-klockan
 *  (beatIdx/beatFrac/beatHit) går i halvtakt när pulsen är halverad, så `varannan`/`innerouter`
 *  ger jämna|inre lampor på slag 1 och udda|yttre på slag 2, och `hjarta` slår varannan takt.
 *  Dirigenten boostar de delade lookerna vid halvering (dubbeltakt ELLER lugnt) och hjärta i
 *  lugna partier, och får byta look när halveringen slår om. Ägaren 2026-09-12. */
/** DMX_EFFECT_HEART: skalar effekternas EGNA hjartpuls (c.heart). 1 = som effektfilerna sager, 0 = av (A/B i ladan 09-27). */
// STANDARD 1,4 sedan 2026-10-06 (live-prov i ladan 22:41, agaren: "mycket battre knyck, satt det som standard").
// Bakgrund: nar det additiva hjartslagslyftet togs bort samma kvall foll riggens topp 5-9 % (matt med
// tools/riseProbe.mjs: mono 184 -> 168, drift 155 -> 143) och agaren laste det som "riggen ar 100 ms efter".
// Fordrojningen var MATT OFORANDRAD (170 -> 170 ms); det var styrkan som foll, inte tidpunkten. Lyftet gav bade
// ljus OCH vithet, sa att lagga tillbaka ljus hade tagit tillbaka vitheten. I stallet fordjupas effekternas EGEN
// puls: c.heart ger morkare MELLAN slagen, alltsa mer upplevd knyck utan att addera ljus och utan att rora
// kuloren - och den bor inne i effekterna, dar agarens kontrakt sager att den hor hemma.
const EFFECT_HEART = Math.max(0, Math.min(2, Number(process.env.DMX_EFFECT_HEART ?? 1.4)));
/** TVAGRUPPERINGEN vaxlar jamn/udda <-> inre/yttre per look och var 32:e slag (av-brytaren DMX_GROUP_ALT borttagen 10-10). */
/** MINIDROP-REAKTION (agaren 2026-09-12: "minidrops borde markas — effektbyte eller intensitet"): analysatorns
 *  frame.miniDropCount (monoton) ger look-byte (om looken hallits MIN_HOLD) + en kort stot pa MINI_DROP_ENV av
 *  en full drop-small (dropEnv), ingen rok, ingen blackout. */
const MINI_DROP_ENV = Number(process.env.MINI_DROP_ENV ?? 0.9);   // 0,35 -> 0,9 STANDARD 2026-10-08 (agaren i ladan; lyfter bara ljusstyrkan, se dropColEnv)
const MINI_BANG_MS = Number(process.env.MINI_BANG_MS ?? 600);   // 350 -> 600 (ladan 10-11 22:14: 'jag såg inte att det ens blev minidrop' - energin stod redan på max, bara looken syns)   // 150 -> 350 (ladan 10-11 16:0x: minidropen 'kandes inte'; minidrops har nu 2 s-sparr i konsertlaget)   // 350 -> 150 STANDARD 2026-10-08 (minidrops utan sparr holl annars ljuset pa 0,9)
/** NASTAN-DROP (agaren 2026-10-07: "analysen av NASTAN-drops, sa de aterspeglas pa nagot bra satt i ljuset"), opt-in
 *  STANDARD sedan 2026-10-07 (DMX_NEAR_DROP=0 stanger av). Allt som bygger mot en small utan att bli en full drop (partiella drops som kvalitetsgrinden nekar
 *  tyst, minidrops, en build som landar halvt) har samma ljudavtryck: baskroppen (frame.bodyDb, ra dB) DYKER under
 *  latens normalniva och KOMMER TILLBAKA. Hur djupt den dok och hur hart den kom tillbaka ar hur nara en drop det var.
 *  Graderad: dropEnv far ett golv NEAR_MIN..NEAR_MAX (50-85 % av en full drop) i MINI_BANG_MS, sedan samma 1 s-utton
 *  som allt annat (fallet rors inte). Inget look-byte, ingen rok. Analysatorn rors inte - bara redan exporterade falt.
 *  Sond pa pop_ladan (10 min): sprang >= 10 dB efter dipp >= 8 dB ~1 per 30 s, de flesta pa minidrops/drops. */
const NEAR_RISE_DB = Number(process.env.DMX_NEAR_RISE_DB ?? 10);    // sprang fran dippens botten
const NEAR_DIP_DB = Number(process.env.DMX_NEAR_DIP_DB ?? 8);       // dippen under latens normalniva (8 s-medel)
const NEAR_FULL_DB = Number(process.env.DMX_NEAR_FULL_DB ?? 24);    // sprang som ger NEAR_MAX
const NEAR_MIN = Number(process.env.DMX_NEAR_MIN ?? 0.5);   // ladan 10-07: 0,3/0,6 'syns for lite' -> 0,5/0,85 godkant
const NEAR_MAX = Number(process.env.DMX_NEAR_MAX ?? 0.85);
const NEAR_REFRACT_MS = Number(process.env.DMX_NEAR_REFRACT_MS ?? 4000);
/** NASTAN-DROP BYTER LOOK (alltid; av-brytaren DMX_NEAR_DROP_SWITCH borttagen 10-10) (agaren i ladan 10-07: "far aven dirigenten denna info och kan byta direkt"): en nastan-drop
 *  ar ocksa ett bytesskal - looken byts direkt, med samma regel som minidropen (looken maste ha hallits MIN_HOLD 8 s). */
/** (MINI_DELAY_MS borttagen 2026-10-08, agaren: 'varfor, bara vaxla till full annars?' - minidropen lyfter direkt; kommer en riktig
 *  drop tar den over. Vantan fran 09-12 gallde nar minidropen blixtrade vitt/dropfargat.) */
/** ROK-HUNGER (agaren i ladan 2026-10-04: "har rokmaskinen inte kort pa kanske 5 min, gor det enklare att kora en puff"):
 *  efter DMX_FOG_HUNGRY_S utan puff racker en minidrop eller att musiken gar in i en high-sektion (i stallet for bara en
 *  riktig drop). Cooldownen och varmeskyddet i output.fogTick galler som forut. 0 = av. */
const FOG_HUNGRY_S = Number(process.env.DMX_FOG_HUNGRY_S ?? 300);
/** TYDLIG BASGANG -> TOGGLE-EFFEKTER (agaren 2026-09-12: "tydlig basgang = inner/outer; inte alltid men foredragen";
 *  ladan 2026-09-21: "kanns inte som den aktiverar den vid basgang - gor det tydligare att den skall valja dom").
 *  Forr: profile.bass (lag-endens ANDEL, 8 s trog) >= 0,4, bara innerouter, bara med DMX_HALVE_SHOW, tva av tre byten.
 *  Nu: analysatorns profile.bassline (basNOT-anslag per slag, ~1 s) >= CLEAR_BASS ->
 *   (1) basgangens ankomst ar EN EGEN BYTESORSAK (efter MIN_HOLD, inte i uppbyggnad), och
 *   (2) dirigenten valjer da ALLTID ur toggle-poolen (effektfilernas `toggle: true`, snitt med sektionens pool nar det gar).
 *  Sa lange basgangen ligger kvar sker vanliga byten (sektion/tier/dwell) ocksa inom toggle-poolen. DMX_CLEAR_BASS=tröskel,
 *  hysteres 0,2 nedat. MATT (tools/basslineProbe.mjs, andel av tiden >= 0,7): basdrivna Stranden 81 %, dansband 78 %,
 *  pop-facit 27 %, megamix 12 %, real.wav 1 %. */
const CLEAR_BASS = Number(process.env.DMX_CLEAR_BASS ?? 0.78);
/** EFFEKTMIX v2 (2026-09-23, agaren: "vi korde pa hoga effekter och hade inte sa manga"; tools/effectMix.mjs pa ladans 10-min-mixar:
 *  20 av 43 effekter, 23 aldrig valda, chase/varannan/eko/bounce = 46 % av tiden). Tre orsaker, tre rattningar (alltid sedan 10-11, brytaren DMX_MIX_V2 borttagen):
 *  (1) basgangsregeln ersatte HELA poolen sa fort bassline >= 0,7 (nastan all pop) -> nu: pool-ersattning bara >= CLEAR_BASS_HARD (0,85)
 *      och vartannat byte; daremellan bara en boost (+CLEAR_BASS_BOOST) at toggle-effekterna i rankingen;
 *  (2) "byt aldrig mitt i en uppbyggnad" blockerade aven bytet IN i build-poolen -> stegring/sug/nedrakning valdes aldrig; nu tillats
 *      ett byte vid intradet i 'build' (sedan haller uppbyggnaden som forr);
 *  (3) ingen nyhetsstraff -> samma look kom tillbaka direkt; nu -MIX_RECENT_PENALTY for de MIX_RECENT_N senast valda. */
const CLEAR_BASS_HARD = Number(process.env.DMX_CLEAR_BASS_HARD ?? 0.85);
const CLEAR_BASS_BOOST = Number(process.env.DMX_CLEAR_BASS_BOOST ?? 0.25);
const MIX_RECENT_N = Number(process.env.DMX_MIX_RECENT_N ?? 8);   // 4 -> 8 (ladan 10-01 godkant)
const MIX_RECENT_PENALTY = Number(process.env.DMX_MIX_RECENT_PENALTY ?? 0.2);
const MIX_TOP_FRAC = Number(process.env.DMX_MIX_TOP_FRAC ?? 0.8);   // 0,5 -> 0,8 (ladan 10-01 godkant)
/** (6) OSEDD-BONUS (2026-09-23, effektoversynen): +DMX_MIX_UNSEEN_BONUS i rankingen for effekter som inte valts sedan start -
 *  med 46 effekter och ~50 byten per 10 min blev annars samma 20-25 valda och resten aldrig (effectMix: 18-19 aldrig valda).
 *  Bonusen forsvinner sa fort effekten setts en gang, sa den styr bara FORSTA chansen. 0 = av. */
const MIX_UNSEEN_BONUS = Number(process.env.DMX_MIX_UNSEEN_BONUS ?? 0.10);
/** ALLA LOOKER (prov 2026-10-09, STANDARD sedan 2026-10-10 - agaren i ladan; kraven ligger i registry.ts). Tva dirigentregler:
 *  (a) BUILD-INTRADE: analysatorns sektion 'build' kom bara 8 ganger pa 20 min mix, och "byt aldrig mitt i en uppbyggnad" blockerade
 *      allt annat -> build-poolen (pulse/stegring/sug) valdes 1 av 122 byten. Nu raknas en uppbyggnad som hallit i ALLA_BUILD_S
 *      (inRiser/buildUp ar fladdriga: 355 flanker, de flesta < 0,3 s) som intrade: ETT byte till build-poolen (look hallen > 4 s).
 *  (b) MINST SPELAD: bland de basta kandidaterna (passform + nyhet, samma topp-urval som forr) tas den som spelats minst sedan
 *      start, i stallet for gyllene snittets turordning - sa varje look som alls kommer i fraga till slut far sin tur. */
const ALLA_BUILD_S = 1.5;

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
/** STEG 2: den ENDA uttoningen (lampans ljusstyrka, tidskonstant i DMX-ljus). Snabbare ar forbjudet (agaren 09-29). */
const FADE_MIN_S = Number(process.env.DMX_FADE_MIN_S ?? 0.25);
const MIN_ON_MS = Number(process.env.DMX_MIN_ON_MS ?? 150);
const CH_MIN_ON_MS = Number(process.env.DMX_CH_MIN_ON_MS ?? 100);   // STEG 2: minsta pa-tid per fargkanal (se MINSTA PA-TID PER FARGKANAL)   // STEG 2: minsta pa-tid innan uttoningen (se MINSTA PA-TID)
/** Sentinel: pulsklockan ännu inte initierad (första framen sätter den utan tick). */
const PULSE_IDX_INIT = -2e9;
// Loudness-portens konstanter = Lotus DEFAULT_CAL (piEngine.js:166-239).
// SHAPE-SMOOTHING 25/150 -> 300/350. Ägaren i ladan 2026-09-03: ljuset flimrade på
// RÖSTEN — mid+diskant-drivningen (vikt 1.3) följde enskilda sångstavelser (~100-
// 250 ms). Långsammare smoothing gör loudness till en SEKTIONS-envelope (vers/
// refräng, sekundskala) i stället för en stavelse-följare. En refräng gasar fortf.
// upp (rise ~1-2 s > 300 ms), men syllaberna medelvärdesbildas bort.
// DMX_LIVE_LEVEL (2026-09-21): lotus nivakanal - se blocket i render(). Rattar bara for A/B.
// REALTIDSSEKTIONER som bytesskal + identitet: alltid sedan 10-11 (brytarna DMX_SECTION_SWITCH/DMX_SECTION_UNIT borttagna).
/** SEKTIONEN AR ENHETEN (2026-09-23, agaren: "jag vill inte att dirigenten bara byter effekt hela tiden, utan mer skapar en anpassad
 *  show till laten"; opt-in DMX_SECTION_UNIT=1, kraver DMX_SECTION_SWITCH=1). Tva saker:
 *  (1) BYTE bara vid sektionsgrans, drop/minidrop eller basgang som kommer/gar - inte pa tierflapp, halvering eller dwell-timern
 *      (kvar som reserv efter dwell + DMX_SECTION_UNIT_RESERVE_MS, om detektorn skulle tystna).
 *  (2) IGENKANNING for live-sektioner: samma look varje gang samma sektionstyp kommer tillbaka (refrangen ser ut som refrangen,
 *      versen som versen) - nyckel = etiketten, inte sektionsparet. Var avstangd sedan 09-21 20:33 ("samma effekt igen") for att
 *      detektorn da satt fast pa high; rotorsaken (ingen nollning vid latbyte) ar rattad 09-23. Ny lat (intro) glommer lookerna. */
const SECTION_UNIT_RESERVE_MS = Number(process.env.DMX_SECTION_UNIT_RESERVE_MS ?? 60000);
/** SECTION_UNIT (ladan 16:45): forvarningens 'high' 600 ms fore en forutsedd refrang och drop-fonstrets 'high' raknas INTE som sektionsgrans
 *  (de gav high<->low-hopp pa 1-2 s nar refrangen uteblev). Bara den raa sektionen, och den maste vara minst DMX_SECTION_UNIT_MIN_MS gammal. */
const SECTION_UNIT_MIN_MS = Number(process.env.DMX_SECTION_UNIT_MIN_MS ?? 4000);
/** FRASVAXLING (2026-09-24, agaren: "inte en effekt per vers eller refrang, lite mer byte iaf"): inom en sektion byts looken pa var
 *  DMX_SECTION_UNIT_PHRASE_BARS:e takt (8; 0 = av), och varje sektionstyp har TVA looker som alternerar (A pa sektionsstart, B pa nasta
 *  fras, A igen ...). Refrangen kommer tillbaka med samma par - identiteten ar kvar, men den star inte still i 50 s. */
const SECTION_UNIT_PHRASE_BARS = Number(process.env.DMX_SECTION_UNIT_PHRASE_BARS ?? 8);
/** Undre grans for effekternas mattnad (se ctx.hsv). 0 = av. */
const SAT_FLOOR = Math.max(0, Math.min(1, Number(process.env.DMX_SAT_FLOOR ?? 0)));
// DROP_CALM_BUILD: drop i low/intro kraver riser >= detta. STANDARD 0 = AV sedan 2026-09-22 (natt-agent B, tools/dropBench.mjs mot
// 19-drop-facitet + pop/megamix): buildUp ar ~0 (max 0,04) vid ALLA 71 fyrningar och etiketten ar alltid low/break i sjalva
// dropogonblicket (high forst efterat) -> grinden pa 0,25 nekade 7/12 pop- och 11/32 megamix-drops, dvs nastan allt (live i ladan
// 09-21 kvall). Vill man ha en lugn-grind: analysatorns DMX_DROP_CALM_GATE=1 DROP_CALM_LAND_MS=300 (tappar inget, 300 ms sen i low).
const DROP_CALM_BUILD = Number(process.env.DROP_CALM_BUILD ?? 0.25);
const DROP_SONG_HOLD_S = Number(process.env.DMX_DROP_SONG_HOLD_S ?? 0);   // 30 -> 0 (agaren 10-11: inga timrar pa riktig drop - snavt mal i analysatorn i stallet)
const SHOW_DROP_GAP_MS = 12000;   // spärr mellan riktiga drops från alla källor (10-12; 20 s missade en riktig drop efter en tidig, ägaren 'jag tror det va tiden mellan')
const DROP_MIN_GAP_S = Number(process.env.DMX_DROP_MIN_GAP_S ?? 0);   // se 'DROP-KEDJOR'   // se 'INGEN DROP I LATENS INLEDNING'
const DROP_LAND_GAIN = Number(process.env.DROP_LAND_GAIN ?? 1.15);     // efterkontroll: nivan 600 ms efter dropen maste vara >= fore x detta   // lampgolv efter mastern (PAR-tandtroskel)
const SECTION_HIGH_SNAP = Number(process.env.SECTION_HIGH_SNAP ?? 0.75), SECTION_LOW_SNAP = Number(process.env.SECTION_LOW_SNAP ?? 0.35);   // tierEma-snap vid high/break-grans
/** ENERGIN (agarens modell, STANDARD 2026-10-08 i ladan: "mycket battre nu"): ingangens VOLYM (frame.levelVU, ~200 ms) i dB i ett
 *  FOLJANDE FONSTER - topp: direkt upp, glider ner; botten: direkt ner, glider upp, tidskonstant E_WIN_S, minst E_MIN_DB brett - sa hela
 *  0..1 anvands oavsett lat och mixerniva. Direkt upp, E_RELEASE_MS ner, upphojd till E_CURVE (ogat ar logaritmiskt), och blir EN
 *  dampningsfaktor 0..1 pa effektens RGB - aldrig over 1 (effekten styr max). Drop slapper dampningen. Slackgransen galler for tystnad.
 *  Ersatte 10-08: sektionsenergin (frame.intensity, for trog: "svanger lite och ratt morkt") och en fast fullniva (passade aldrig).
 *  10-12: ljuset drivs av BASENERGIN (se B_CURVE); volymfonstret (eSm) finns kvar bara for dropens efterkontroll. */
const E_WIN_S = Number(process.env.DMX_E_WIN_S ?? 10),   // 20 -> 10 (ladan 10-09, standard 10-10)
      E_MIN_DB = Number(process.env.DMX_E_MIN_DB ?? 4);
const E_RELEASE_MS = Number(process.env.DMX_E_RELEASE_MS ?? 100);
/** TYSTNAD RAKNAS INTE (ladan 2026-10-09, STANDARD 10-10: "tacker den hela spannet ... 1-95 %"). Fonstrets botten foljer minsta
 *  vardet DIREKT - en paus mellan latar eller ett avbrott drog den mot -100 dB, och den kryper upp med E_WIN_S: matt med samma musik
 *  -90 dB i 10 s och sedan 6 dB tystare holl dampningen 0,78-0,87 (nastan fullt) i 30 s. Nu uppdateras fonstret bara nar ingangen
 *  ar over ingangsgransen. (Prov 10-09 med fonster ur medel +- spridning foll: pop-mixen morkt 13 -> 56 %.) */
// (DMX_E_SLOW_MS - fonstret pa utjamnad niva - provat 10-09, gav ingen dynamik, borttaget 10-10.)
/** ENERGIN AGER SPANNET (opt-in DMX_E_NORM_S, ladan 2026-10-09: "mycket mer dynamik i energi-lagret ... jobba mellan 1-95 %"). MATT pa
 *  ladans inspelningar: vid full energi lyste riggen bara ~20 % - effekternas egen niva efter gamman 2,2 (v 0,5 -> 22 %) och monster med
 *  slackta lampor - sa energin (som bara far sanka) hade 5 -> 20 % att jobba med, ~2 steg. Med E_NORM_S > 0 skalas effektens bild sa
 *  dess TOPP (alla lampor, foljd med direkt upp och avklingning E_NORM_S) blir 100 %: slagpulser och skillnad mellan lampor finns kvar,
 *  kuloren bevaras (alla kanaler lika), och energin ger sedan hela spannet golv+1..95 %. Hogst x E_NORM_MAX. 0 = av.
 *  OBS: detta LYFTER effektens niva (agarens regel 1) - darfor bara som prov, agaren avgor i ladan. */
const E_NORM_S = Number(process.env.DMX_E_NORM_S ?? 2);   // 0 -> 2 (ladan 10-09, standard 10-10)
const E_NORM_MAX = Number(process.env.DMX_E_NORM_MAX ?? 6);
/** ENERGIN I DMX-PROCENT (ladan 2026-10-09, STANDARD 10-10). Energin multiplicerades FORE utgangens gamma (2,2), sa kurvan blev i
 *  praktiken e^(E_CURVE x 2,2) = e^6,6 med kurva 3: energi 0,9 -> ~50 % ljus, 0,7 -> 10 %. Med E_LIN tas gamman ut ur dampningen
 *  (md^(1/gamma) fore gamman) - e^E_CURVE blir rak andel av DMX-utgangen. */
/** GRUNDNIVA MELLAN SLAGEN (opt-in DMX_FX_FLOOR 0..0,8, ladan 2026-10-09: "hoj grundnivan mellan slagen sa pulsen blir grundare").
 *  En TAND lampa (effektens starkaste kanal > 0) lyfts mot golvet: m' = m + FLOOR x (1 - m) x min(1, m / 0,1) - kulorens forhallanden
 *  bevaras, en slackt lampa forblir slackt (agaren: "dom far garna slackas om effekten vill det"), och lyftet rampar in under 10 % sa
 *  en lampa som tonar ut inte hoppar. Lagt efter E_NORM (effektens topp = 1). 0 = av. */
const FX_FLOOR = Math.max(0, Math.min(0.8, Number(process.env.DMX_FX_FLOOR ?? 0.6)));   // 0 -> 0,6 (ladan 10-09, standard 10-10)
// (DMX_DIM_PULS - dimmern pa fullt - forkastad i ogat 10-09, borttagen 10-10.)
/** ENERGINS TOPP (DMX_E_TOP 0,5..1, ladan 2026-10-09: "dra upp till 95 % sa energi har nagot att dampa"). Fonstrets tak foljer varje
 *  enskild ljudtopp direkt, sa ett vanligt starkt parti lag pa e ~0,9 - med kurva 7 bara ~50 % ljus. e / E_TOP (klampat till 1): starka
 *  partier nar full energi (= effektens 95 %), och kurvan dampar allt under. 1 = som forr. */
const E_TOP = Math.max(0.5, Math.min(1, Number(process.env.DMX_E_TOP ?? 0.95)));   // 1 -> 0,95 (ladan 10-09, standard 10-10)
/** BASENERGIN (ägaren 10-12: "följa basgången mer än diskant. Samma känsla som man får i magen av en sub vill jag ha i ögonen av ljuset.
 *  De får gärna svänga mycket, bara att sänka taket beroende på var i låten man är" + "kör inte energilagret på två ställen - då dämpas
 *  allt bara"). EN energi ur baskroppen (frame.bodyDb) i stället för volymen (levelVU): topp direkt upp, glider ner på E_WIN_S; dal
 *  direkt ner, glider upp på B_LO_S (1 s) - energin följer bastrycken och basgången över hela skalan i stället för att parkera högt i en
 *  tät refräng. Minst B_MIN_DB brett, E_TOP, upp direkt / ner E_RELEASE_MS (uttoningen som förr), upphöjd till B_CURVE (3; förr E_CURVE
 *  10 = nästan av/på). Golvet = "Lägsta nivå" (cfg.energyFloor). Sektionen sätter bara TAKET (secCeil), effekten mönstret, drops och
 *  minidrops lyfter. ERSATTE (bänk tools/energiMatt.mjs, 23 ladan-filer): konsertgolvet 0,4, refränggolvet 0,8, buildladdningen och
 *  TIER_OPEN (golv som gjorde energin verkningslös), taktdippen KICK_E/KICK_E_HIGH på kickEnv (dubbel kickmodulering ovanpå effektens
 *  egen c.heart), SPOT-regeln och UNIFORM:s ovalda par (förbivägar runt energin). */
const B_CURVE = 3, B_MIN_DB = 6, B_LO_S = 1;
const E_LIN_INV = 1 / GAMMA;   // utgangens gamma (output.ts ager DMX_GAMMA - en kalla, 10-11; forr last pa tva stallen med var sin standard)
/** Minsta tanda niva fore gamman: gammans forsta DMX-steg (1/255 -> tandpunkt+1 i utgangen) = agarens 1 %. */
const E_MIN_LIT = Math.pow(1 / 255, E_LIN_INV) * 1.02;   // agarens 1 %: gammans forsta DMX-steg (-> tandpunkt+1), se ENERGIN SLACKER ALDRIG
/** INLARNING EFTER START (ladan 09-24 23:05: 'de lyser nastan max nu' efter omstart - ankaret borjade i tystnad 13 dB och kröp mot musikens
 *  45 dB med tau 360 s uppat): forsta LIVE_START_FAST_S foljer ankaret uppat med tau/10. Forr 20 s. */
/** TYST LAT = TYST LJUS (ladan 2026-09-24 22:30: 'laten ar ganska tyst och den kor ganska ljust'): ankaret ar relativt, sa en tyst lat blev
 *  'det nya normala' och lika ljus som en hog. Ankaret far inte sjunka mer an LIVE_ANCHOR_DROP_DB under det hogsta ankaret pa sistone
 *  (toppen glider ner 0,005 dB/s = 6 dB pa 20 min). 0 = av. Efter omstart ar toppen forsta latens niva tills en hogre lat kommer. */
/** LAG VOLYM = FORTFARANDE LEVANDE (ladan 2026-09-24 23:30): hur fort toppen glider ner (dB/s). 0,005 = 6 dB pa 20 min holl riggen dov
 *  lange efter att volymen skruvats ner; 0,02 = 6 dB pa 5 min - en tyst lat ar dovare sin forsta minut, en sankt volym lever igen inom minuter. */
/**
 * Diskret drop-detektion styr LAMPORNA (bloom + look-byte). AV sedan 2026-09-02
 * (ägarens val live): detektorn är ~ett taktslag sen på uppbyggda drops och ~56 %
 * precis — en falsk drop tänder dessutom 8-takters-spärren och låser ute en riktig.
 * Energi-gasen (ENERGY_DRIVE) bär drop-känslan i stället: ljuset stiger IN i dropen.
 * Röken påverkas INTE — den har egen dropHit-trigger med 1-min cooldown.
 * Slå på igen = true, så återvänder bloomen och drop-look-bytet.
 */
const DISCRETE_DROP_LAMPS = true;   // ater PA (agaren i ladan): lamporna ska bloma pa dropen synkat med roken (samma dropCount). Energi-gasen ensam racker inte som drop-markering.
/** FASFEL SANKER TAKTENS TILLIT (lotus-porten 09-23): ihallande fasfel > SYNC_ERR_FRAC drar ner tilliten som dirigentens grindar laser.
 *  (Av-brytaren DMX_ENERGY_FALLBACK borttagen 10-10 - alltid pa.) */
const SYNC_ERR_FRAC = Number(process.env.DMX_SYNC_ERR_FRAC ?? 0.2);
// LOGGEN: index.ts tystar console.log nar DMX_QUIET != '0' (standard). Periodiska diagnosrader byggs da inte alls (skrapjakten 10-01).
// (brytaren under drift: quiet.ts / PUT /api/debug/verbose)
const TIER_LO = Number(process.env.DMX_TIER_LO ?? 0.22), TIER_HI = Number(process.env.DMX_TIER_HI ?? 0.55);   // se DMX_TIER_LO/HI i render
// SKRAPJAKTEN 10-01 (render 200 Hz): hjalpare och konstanter som forr skapades PER RENDER (closures, objektliteraler) ligger
// har en gang. Samma varden, samma ordning - bara utan allokering i render-loopen.
const BAND_IDX = { bass: 0, mid: 1, treble: 2, kick: 3, low: 4 } as const;
const clamp255 = (x: number) => x < 0 ? 0 : x > 255 ? 255 : Math.round(x);
const drivesHas = (drives: readonly ChannelRole[] | undefined, r: ChannelRole) => drives ? drives.includes(r) : false;
const exactHas = (effect: { exact?: readonly ChannelRole[] } | undefined, r: ChannelRole) => !!effect?.exact?.includes(r);

export class EffectEngine {
  private universe = new Uint8Array(512);
  /** Utjamnad tilltro till takten (0..1) — styr beatPulse-djupet. */
  /** Showens försprång i ms — läses ur config varje frame så ratten biter live. */
  private get showLead(): number { return this.cfg.showLeadMs ?? SHOW_LEAD_DEFAULT; }
  private beatTrust = 0;
  // SKRAPJAKTEN 10-01: objekt/arrayer som render() fyller i stallet for att skapa nya varje ruta (200 Hz). Lases bara synkront.
  private bandsBuf: number[] = [0.5, 0.5, 0.5, 0.5, 0.5];
  private specBuf: SpecialtyValues = { hazer: 0, uv: 0, blinder: 0, strobe: 0, laser: 0, co2: 0 };
  /** EDGE-SÄKER KICK. frame.kick är en enframs-boolean på analysatorns 375 Hz
   *  medan render kör 100 Hz → en direkt läsning missar ~73 % av kickarna.
   *  Räknaren matas i registerKick (375 Hz) och konsumeras som en flank i
   *  render — samma monotona mönster som frame.dropCount. */
  private kickCount = 0;
  private lastKickSeen = 0;
  private showTime = 0;      // ackumulerad "show-tid" — accelererar under uppbyggnaden (riser)
  private lastShowMs = 0;
  private lastKickBoost = 0;
  private songStartWall = Date.now();
     // lotus-porten (se LOCK_BEATS)
  private showVel = 0;       // extra show-tids-hastighet från bastransienter (akustisk tröghet)
  private pendingKick = 0;   // ackumulerade kick-impulser sedan förra rendern (fylls i 375 Hz)
  /** Chase mode: fixture-index of the currently lit head. Advanced on kick and slow-time. */
  private chasePos = 0;
  private chaseDir = 1;
  private lastChaseAdvance = 0;
  /** BASNOTSRAKNARE (2026-09-23): stegar pa basnots-anslag (frame.onset.bass-flank, 90 ms cooldown) - for effekter som "stegar
   *  pa basnoter" (chase/eko/stege/basgang) nar profile.bassline ar tydlig. Samma slags motorhjalp som chasePos/gravLevel. */
  private bassNoteIdx = 0;
  private lastBassNoteMs = -1e9;
  private prevBassOnset = 0;
  /** Beat clock: last whole-beat index seen (för beatTick-flanken). */
  private lastBeatIdx = -1;
  /** Takt-räknare som effekterna ser (beatIdx): stegar på grid-slaget när BPM är
   *  låst, annars på verkliga kicks → grid-effekter fryser aldrig utan BPM-lås. */
  private beatCounter = 0;
  /** Pulsen körs i halva takten (snabb låt ELLER lugnt parti). Se PULSE_HALVE_*
   *  och SUBDIV_*. */
  private pulseHalved = false;
  private halfTick = 0;                 // DMX_HALVE_SHOW: paritet inom det halverade slaget
  private lastHalvedForSwitch = false;  // DMX_HALVE_SHOW: halvering vid senaste look-bytet
  private lastBassClearForSwitch = false;  // tydlig basgang vid senaste look-bytet (CLEAR_BASS)
  private seenLooks = new Set<Mode>();     // MIX_V2 (6): effekter som valts sedan start
  /** Monoton pulsklocka (rotfix mot hjärtslags-fladder): pulsens index och paritet
   *  får bara gå framåt, och tSince hålls icke-avtagande inom en puls, så PLL:ens
   *  fasrättningar inte kan re-attackera eller flippa pariteten mitt i ett slag. */
  private lastPulseIdx = PULSE_IDX_INIT;
  private pulseCount = 0;
  private pulseFloorMs = 0;
  /** ~8 s-utjämnad sektionsenergi + när halveringen senast bytte (min-hold). */
  private subdivEnergy = 0.5;
  private subdivChangedAt = 0;

  /** Drops mode: per-lamp fire time + hue; advanced on each beat/kick. */
  private dropPos = 0;
  private dropSector = 0;
  private dropCount = 0;
  private lastDropAdvance = 0;
  private dropFired: number[] = [];
  private dropHue: number[] = [];
  /** Wave mode: integrated phase — speed may vary per frame without the
   *  wave jumping (t*speed would re-scale all elapsed time on every change). */
  private wavePhase = 0;
  /** "smart" mode: which effect the feel-chooser currently delegates to. */
  private smartMode: Mode = "wave";
  /** STEG 1 forts. - EFFEKTENS NIVA (agaren 2026-10-10: "gor sa effekterna kor ratt"). Delen av effektens ljus som ar gemensam for alla
   *  effekter: (a) DROP-LOOKEN - kolsvart i den dramaturgiska tystnaden fore smallen (blackout), och vid full drop blandas drops-effektens
   *  dropfarg per lampa + vit karna i toppen in med dropColEnv; (b) topp-normering - effektens topp over lamporna (foljd E_NORM_S) blir
   *  100 %; (c) grundniva FX_FLOOR for tanda lampor (slackt forblir slackt); (d) minidrop/nastan-drop lyfter mot fullt med kuloren kvar. */
  private effektNiva(rgb: [number, number, number], ctx: EffectContext, blackout: boolean, toggle = false, sparse = false): [number, number, number] {
    if (blackout) { rgb[0] = 0; rgb[1] = 0; rgb[2] = 0; return rgb; }
    // LAMPTRAPPA (DMX_LAMP_STAIR, vers/intro): icke-sparsam effekt -> bara ett lamppar, paret byts varje fras; drop-looken tänder allt.
    if (sparse && this.dropColEnv <= 0.005 && this.miniColEnv <= 0.005 && ctx.group !== ((Math.floor(ctx.beatIdx / 16) & 1))) { rgb[0] = 0; rgb[1] = 0; rgb[2] = 0; return rgb; }
    let m = rgb[0] > rgb[1] ? (rgb[0] > rgb[2] ? rgb[0] : rgb[2]) : (rgb[1] > rgb[2] ? rgb[1] : rgb[2]);
    if (m > this.fxPeakNow) this.fxPeakNow = m;
    if (E_NORM_S > 0) { const n = this.fxNorm; rgb[0] = Math.min(1, rgb[0] * n); rgb[1] = Math.min(1, rgb[1] * n); rgb[2] = Math.min(1, rgb[2] * n); m = Math.min(1, m * n); }
    // TOGGLE-EFFEKTER UTAN GRUNDNIVA (ladan 10-10, agaren: parvisa effekter i takt syns inte): golvet lyfte 'av'-gruppen till ~55 % -
    // parbanken (tools/pairBench.mjs) matte kontrast (max-min)/max 0,03-0,12. Den morka gruppen i en toggle-effekt ska vara mork.
    if (FX_FLOOR > 0 && !toggle && m > 0.001 && m < 1) { const k = (m + FX_FLOOR * (1 - m) * Math.min(1, m / 0.1)) / m; rgb[0] *= k; rgb[1] *= k; rgb[2] *= k; m *= k; }
    const liftK = this.dropEnv - this.dropColEnv;   // minidrop/nastan-drop: ljusstyrka mot fullt, kuloren kvar
    if (liftK > 0.005 && m > 0.002 && m < 1) { const g = 1 + (1 / m - 1) * liftK; rgb[0] *= g; rgb[1] *= g; rgb[2] *= g; }
    if (this.miniColEnv > 0.005 && this.dropColEnv <= 0.005) {   // MINIDROPS SOM SHOW: alla lampor samma kulör, fullt
      const d = hsvToRgb(this.miniSector / 6, 1 - 0.3 * this.miniColEnv, 1), k = this.miniColEnv * MINI_UNI;   // ljusare karna, avmattnad <= 0,3 (ingen vitning)
      for (let c = 0; c < 3; c++) rgb[c] += (d[c] - rgb[c]) * k;
    }
    if (this.dropColEnv > 0.005) {   // full drop: dropfarg per lampa + vit karna i toppen (agaren 10-08), blandas in med dropColEnv
      const d = hsvToRgb(mixedSector(this.dropSector + ctx.idx) / 6, 1, 1), vit = Math.max(0, (this.dropColEnv - 0.6) / 0.4), k = this.dropColEnv;
      for (let c = 0; c < 3; c++) rgb[c] += ((d[c] + (1 - d[c]) * vit) - rgb[c]) * k;
    }
    return rgb;
  }
  /** Valet bland topp-kandidaterna: den som spelats minst sedan start (ALLA LOOKER b; gyllene snittets turordning borttagen 10-10). */
  private pickLook(top: { m: Mode }[]): Mode {
    let best = top[0].m, bt = Infinity; for (const x of top) { const t = this.lookPlayMs.get(x.m) ?? 0; if (t < bt) { bt = t; best = x.m; } } return best;
  }
  private fxFast = false;   // aktuell effekt ar fastLight (VARJE SLAG undantar den)
  private buildSince = -1; private buildEntered = false; private lookPlayMs = new Map<Mode, number>();   // ALLA_LOOKER
  private tierEma = 0.5;   // ihallande intensitet for tier-val (se render)
  private smartDwellUntil = 0;
  private warmMs = 0;
  private bassBaseline = 0.35;   // bas-golv (tyst basnivå) för bas-punch
  private lastDropCount = 0;   // senast hanterade frame.dropCount → edge-säker drop-flank
  private lastFogWall = Date.now(); private fogWasSpraying = false; private fogLastSec = '';   // rok-hungern (FOG_HUNGRY_S)
  private nearB: number | null = null; private nearNorm = 0; private nearHist: number[] = []; private nearAt = -1e12; private nearUntil = 0; private nearLevel = 0; nearCount = 0; private nearHit = false;   // NASTAN-DROP
  private secCeil = 1; private buildLookAt = 0; private buildSecAt = 0; private buildSecSeen = 0; buildProg = 0; private upgradeHit = false; buildUpgrades = 0;   // BUILD SOM HÅLLER OCH LANDAR
  private lastMiniCount = 0; private miniBangUntil = 0; private lastMiniWall = -1e12; private miniSector = 0; private miniColEnv = 0; private miniLiftUntil = 0; private dropLiftUntil = 0; private liftHist: number[] = []; private liftAt = -1e12; liftCount = 0; private prevRawSec = ''; private lastHighWall = -1e12;   // ENERGILYFT + SEKTIONSLYFT   // minidrop-flank + kort stot
  private dropBangUntil = 0;     // drop-fönster (max-håll upp till ~8s efter träff)
  private dropEnv = 0;           // drop-envelope: full attack → håll → mjuk fade
  private dropColEnv = 0;        // BARA full drop: dropfarg + vit karna (minidrop/nastan-drop lyfter bara ljusstyrkan)
  private lastLiveSection = '';   // DMX_SECTION_SWITCH
  dropCalmDenied = 0; dropFalse = 0; private dropCheckAt = 0; private preDropLevel = 0; private preDropTier = 0;
  private eSm = 0; eSimple = 0; private eBass = 0; private bHi = NaN; private bLo = NaN; private eHi = NaN; private eLo = NaN; private fxPeak = 0; private fxPeakNow = 0; private fxNorm = 1;   // ENERGIN (se E_WIN_S)
  private trebleEnv = 0; private airEnv = 0; private punchEnv = 0; private belowSince = 0;   // glitter-enveloper (ctx.trebleEnv/airEnv)
  private lampLvl = new Float32Array(64); private lampPeakAt = new Float64Array(64); private chOnAt = new Float64Array(192); private lampRatio = new Float32Array(192);   // STEG 2: uttoningen per lampa (ljusstyrka + senaste kulor)
  // TERMISK BUDGET. En fast cooldown vet inte skillnad på en 0.5s-puff och en
  // 3s-puff — den räknar TIDEN MELLAN, inte ARBETET. Ibiza LSM1500PRO orkar
  // 40–50 s sammanhängande rök innan värmeblocket måste hämta igen, så vi för
  // ett värmekonto i millisekunder: det fylls medan den rökar och rinner av i
  // vila. Då kostar en lång puff mer än en kort, precis som i fysiken.
                                                   // → 1 s rök ≈ 6,7 s återhämtning
                                 // (själva starttiden bor i cfg.fog.warmStartMs → överlever omstart)
  // NOVELTY-UPPBYGGNADS-DETEKTOR: spektral novelty leder dropen (mätt validerat).
  private wasBreaking = false;   // flankdetektor för nivå-svacka (drop-blackout)
  private blackoutUntil = 0;     // dramaturgisk tystnad: kolsvart till (wall-clock ms)
  // ── DRAMATURGI UR LÅTMINNET (sätts av index.ts, bara för IGENKÄNDA låtar) ──
  // En FÖRBERÄKNAD kurva kan inte fladdra som live-VU:n gjorde: ett värde per
  // sekund, mjukt interpolerat. Okänd låt → allt är null/0 och showen kör som förut.
  memSectionAt = 0;                   // performance.now() för senaste sektionsgräns
  memPhraseAt = 0;                    // ...och senaste frasgräns
  memHasGrid = false;                 // låten har sektioner/frasgrid att vänta in
  /** VILKEN sorts sektion som spelas just nu ur den analyserade strukturen:
   *  "intro" | "verse" | "chorus" | "bridge" | "outro" … null = okänd låt eller
   *  ingen analys. Sätts av index.ts. ANVANDS INTE AN av effektvalet — den ska
   *  in dar medvetet och matbart, inte som en sidoeffekt av att faltet dok upp. */
  memPart: string | null = null;
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
  private songStartAt = 0;
  /** Låten började — tona in ljuset och ignorera drops en stund. */
  noteSongStart(): void { this.songStartAt = performance.now(); }
  private partLook = new Map<string, Mode>();
  private partLookSong = 0;

  /** Misstänkt låtbyte → låt auto-rangen kalibrera om snabbt mot nya nivåer. */
  softenRange(): void { this.songStartWall = Date.now(); this.secPalette.clear(); }   // (rullande nivarangen borttagen 10-08 - den matade bara DIM-taket)
  /** KARAKTARSSKIFTE fran latgransdetektorn (DMX_CHAR_SHIFT_D): dirigenten byter look vid nasta tillfalle (MIN_HOLD, ej i uppbyggnad). */
  noteCharShift(reason = 'karaktarsskifte'): void { this.charShiftUntil = performance.now() + 6000; this.charShiftWhy = reason; }   // latgrans: aven DROP_SONG_HOLD_S-klockan



  private gravLevel = 0;         // gravitations-VU: nivå som faller med gravitation
  private gravVel = 0;           // dess hastighet
  private gravPeak = 0;          // peak-håll (sjunker långsamt)
  /** Silence gate: fade the whole rig to black when no music plays. */
  private inputLowSince = 0;     // väggklocka: sedan när nivån legat under gränsen
  private inputOff = false;      // ingången bedöms avstängd → riggen mörk
  private silenceGate = 1;
  private lowLogAt = 0;
  /** LEVER MEN HÖR INGENTING. Utan den här signalen ser "aux-kabeln sitter inte
   *  i" exakt likadant ut som "strömmen är av" och "säkringen gick": svart. Den
   *  som slår på lådan 22:00 står ensam bakom disken utan laptop — riggen är den
   *  enda skärm som finns, och den måste kunna säga tre olika saker.
   *  Ej opt-in: ett grundbeteende, inte en inställning man kan råka slå av. */
  private static readonly ANCHOR_MODES = new Set<Mode>(["party", "snap", "bounce", "strobe", "chase", "wave"]);
                                                   // någon minut. 90 s utan EN enda
                                                   // transient betyder att vi inte
                                                   // hör källan, inte att det är tyst.
  /** Output ballistics: per-channel soft ~25ms attack + exponential decay — the
   *  eye sees a fast rise and a soft fall (~0.1–0.4 s), whatever the modes do. */
  /** Output-tjänsten äger ALL kunskap om hur lampor tar emot ljus. */
  private out = new FixtureOutput();
  private smartCount = 0;
  private recentLooks: Mode[] = [];   // MIX_V2: de senast valda lookerna (nyhetsstraff)
  private unitSlot = 0; private unitPhraseDone = -1;   // FRASVAXLING: look A/B och senaste frasnummer som bytts pa
  private pendingSecSwitch = false;
  private charShiftUntil = 0;
  private charShiftWhy = 'karaktarsskifte';
  /** DIAGNOSTIK (2026-10-06, natt-banken): VARFOR senaste look-bytet skedde, och hur manga byten som skett.
   *  Skrivs bara - inget beslut i motorn laser dem, sa showen ar bit-identisk. 'dwell' betyder att klockan var
   *  det ENDA skalet, alltsa ett byte utan musikalisk grund; alla andra varden ar nagot i laten. */
  switchWhy = '';
  switchCount = 0;
  private lastShowDropWall = 0;   // DMX_DROP_MIN_GAP_S   // noteCharShift: bytesskal giltigt 6 s               // SECTION_UNIT: sektionsgrans passerad men bytet blockerat (riser/MIN_HOLD) -> gor det sa fort det gar
  private prevSongLook = new Map<string, Mode>();  // SECTION_UNIT: forra latens look per sektionstyp (straffas sa nasta lat far en annan)
  private lastSmartTier = "";
  private lastSmartSwitchMs = 0;   // tidsstämpel för senaste effektbyte → minsta-intervall
  private activeMode: Mode = "smart";
  // Regi-lager: fras-räknare + aktiv palett (byts var N:e takt).
  private phraseBeat = 0;
  private phraseBeats = 32;   // taktslag per musikalisk fras → palettbyte
  private paletteIdx = 2;     // start: Primär
  private secPalette = new Map<string, number>(); private secPaletteKey = '';   // SECTION_PALETTE: etikett -> palett i laten
  private paletteRot = 0;

  // Pre-allokerad kontext för noll-allokering i render-loopen
  private ctx: EffectContext = {
    cfg: null as any, frame: null as any, fx: undefined, t: 0, idx: 0, lamp: 0, count: 0, want: {},
    audio: 0, kickEnv: 0, trebleEnv: 0, airEnv: 0, punch: 0, dropEnv: 0, band: 0, gravLevel: 0, gravPeak: 0, drum: null as any, expectHighInMs: -1, levelVsHighDb: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionEntry: 0, sectionTier: 1, repeatSim: 0,
    sectionBars: 0, bassline: 0, bassNoteIdx: 0, bassNoteAge: 9,
    beatIdx: 0, hueIdx: 0, beatFrac: 0, beatPulse: 0, beatHit: false, hasBeat: false,
    wavePhase: 0, buildUp: 0, phaseSpread: 0, punchFloor: 0, chasePos: 0,
    dropFired: this.dropFired, dropHue: this.dropHue, now: 0,
    mixedSector,
    group: 0, grouping: 'varannan',
    heartPulse: 0,
    heart: (depth: number) => { const d = depth * EFFECT_HEART; return 1 - d + d * this.ctx.heartPulse; },
    mclk: (beatsPerStep: number, secPerStep: number) =>
      this.ctx.hasBeat ? Math.floor(this.ctx.beatIdx / beatsPerStep) : Math.floor(this.ctx.t / secPerStep),
    shaped: (floor: number, x: number) => {
      const dyn = Math.max(0, Math.min(1, this.ctx.cfg.dynamics ?? 0.6));
      const f = floor * (1 - dyn);
      return Math.min(1, f + (1 - f) * Math.pow(Math.max(0, Math.min(1, x)), 1 + dyn * 1.2));
    },
    // MATTNADSGOLV (2026-10-06, DMX_SAT_FLOOR). Nio effekter uttrycker sin ACCENT genom att dra ner
    // mattnaden - `c.hsv(hue, 1 - traff, v)` = "blixtra till vitt pa traffen". Accenten laser da som VITT i
    // stallet for som farg, och darmed ser effekterna likadana ut pa riggen (agaren 2026-10-06: "den tander
    // nastan alltid alla RGB-dioderna"). MATT utan lyftet: tyngdlyft mattnad 0,03, tick 0,17, backbeat 0,32,
    // viska 0,31, party 0,32, stegring 0,31 - dvs nastan vitt.
    // Golvet satter en undre grans pa mattnaden i EN punkt, sa alla effekter trafas likformigt och ratten kan
    // provas live. 0 = som forr. Varden > 0 later accenten finnas kvar men behalla kuloren; ljusstyrkan rors
    // inte (v gar oforandrat vidare).
    hsv: SAT_FLOOR > 0
      ? ((h: number, sv: number, v: number) => hsvToRgb(h, sv < SAT_FLOOR ? SAT_FLOOR : sv, v))
      : hsvToRgb,
  };

  /** Välj ny palett vid frasbyte, biasad av klangen (centroid). */
  private pickPalette(centroid: number) {
    const wantWarm = centroid < 0.42, wantCool = centroid > 0.60;
    let cands = PALETTES.map((_, i) => i).filter((i) => {
      const t = PALETTES[i].temp;
      if (wantWarm) return t === "warm" || t === "neutral";
      if (wantCool) return t === "cool" || t === "neutral";
      return true;
    });
    if (cands.length === 0) cands = PALETTES.map((_, i) => i);
    this.paletteRot++;
    let next = cands[Math.floor(((this.paletteRot * 0.61803398875) % 1) * cands.length)];
    if (next === this.paletteIdx && cands.length > 1) next = cands[(cands.indexOf(next) + 1) % cands.length];
    this.paletteIdx = next;
  }

  /** Den effekt som faktiskt renderas just nu (smart-läget roterar this.smartMode). */
  getActiveMode(): Mode { return this.activeMode; }

  /** Rökmaskinens tillstånd för UI:t. null = inte ansluten. */
  getFogStatus(): FogStatus | null {
    const fog = this.cfg.fog;
    if (!fog?.enabled) return null;
    const now = Date.now();
    const warmLeftMs = fog.warmStartMs ? Math.max(0, (fog.warmupMs ?? 600000) - (now - fog.warmStartMs)) : 0;
    // ADRESSKROCK. Rök-kanalen skrivs SIST i universumet (efter ballistiken, för
    // att få instant på/av) → den VINNER över en armatur som delar adressen, och
    // lampan slocknar utan förklaring. Vi flyttar den INTE automatiskt: ett tyst
    // adressbyte är värre än problemet, för då stämmer inte DIP-switcharna längre.
    // Vi säger till och låter ägaren välja.
    let conflict: string | null = null;
    for (const fx of this.cfg.fixtures) {
      const top = fx.address + fixtureRoles(fx).length - 1;
      if (fog.address >= fx.address && fog.address <= top) { conflict = fx.name; break; }
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
    if (!fog) return;
    fog.sprayMs = 0;
    fog.bursts = 0;
    fog.serviceAtMs = Date.now();
  }
  private lastRenderMs = performance.now();

  constructor(private cfg: EngineConfig) {}

  /** AKUSTISK TRÖGHET: varje bastransient (kick) knuffar show-tiden framåt.
   *  Anropas i 375 Hz-chunkhanteraren så inga slag missas (render kör 100 Hz).
   *  strength ~0.4..1.0 (skalas av basens styrka). Friktionen i render() bromsar. */
  registerKick(strength: number): void {
    this.pendingKick += Math.min(1.5, Math.max(0, strength));
    this.kickCount++;
  }

  /** SPÄRRAD DROP = MINIDROP (10-12): drop inom SHOW_DROP_GAP_MS från förra -> minidrop-looken + lyftet i stället. */
  private gapMini(nowWall: number): void {
    if (nowWall - this.lastMiniWall < MINI_GAP_MS) return;
    this.lastMiniWall = nowWall; this.liftCount++; this.miniSector = mixedSector(this.liftCount + 7);
    this.miniBangUntil = nowWall + MINI_BANG_MS; this.miniLiftUntil = nowWall + MINI_LIFT_MS;
    if (isLogOn()) console.log('[dirigent] drop inom spärren -> minidrop');
  }

  render(frame: Frame): Uint8Array {
    // Fri-rullande "show-tid": normalt 1× realtid, men accelererar under en
    // uppbyggnad (buildUp från förra framen) så mönstren snabbar upp mot dropen.
    // Ackumulerad → kontinuerlig, inga hopp.
    // Konsumera kick-flanken EN gång per render (se kickCount ovan).
    const kickHit = this.kickCount !== this.lastKickSeen;
    this.lastKickSeen = this.kickCount;
    const _np = performance.now();
    if (this.lastShowMs === 0) this.lastShowMs = _np;
    const _dtT = Math.min(0.1, (_np - this.lastShowMs) / 1000);
    this.lastShowMs = _np;
    // AKUSTISK TRÖGHET (fluid friction): mönstren flyter i en trög vätska. Varje
    // bastransient ger show-tiden en IMPULS framåt; "vätskefriktionen" bromsar
    // sedan mjukt tillbaka till normaltempo → vågor/eld/aurora RYCKER till och
    // accelererar explosivt med bastrumman, för att sedan glida vidare. Skalas av
    // energin så tysta partier knappt rycker; strukturen (beat-låsta färgbyten)
    // rörs inte — bara rörelsen får fysikalisk tyngd.
    const friction = Math.exp(-_dtT / 0.16);            // tröghet τ≈160 ms
    this.showVel = Math.min(5, this.showVel * friction + this.pendingKick * 2.0);
    this.pendingKick = 0;
    // upp till 2.5× snabbare vid full uppbyggnad + kick-ryck ovanpå
    this.showTime += _dtT * (1 + Math.max(frame.buildUp, this.buildProg) * 1.5 + this.showVel);
    const t = this.showTime;
    if (kickHit) this.lastKickBoost = performance.now();

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
      const beatIdx = beatIndex(beat, now2 + this.showLead);   // takträknaren stegar lika tidigt
      // PRESENTATIONSTAKT: över PULSE_HALVE_ABOVE_BPM pulsar hjärtslaget på varannat
      // slag (hysteres nedåt så gränsen inte flappar). Taktklockan, beatTick och alla
      // grid-effekter rör vi INTE — bara pulsens form sträcks över två slag.
      // Dessutom: i ett genuint LUGNT parti halveras pulsen även i måttligt tempo
      // (se SUBDIV_*). BPM-REGELN HAR FÖRETRÄDE — i Lotus fick energin skriva över
      // takt-beslutet och resultatet blev en fyrkantsvåg som växlade var 12:e sekund.
      const bpmNow = beatMs > 0 ? 60000 / beatMs : 0;
      const aE = Math.min(1, (_dtT * 1000) / SUBDIV_ENERGY_TAU_MS);
      this.subdivEnergy += (Math.max(0, Math.min(1, frame.intensity)) - this.subdivEnergy) * aE;
      let wantHalved: boolean | null = null;
      if (bpmNow > PULSE_HALVE_ABOVE_BPM) wantHalved = true;
      else if (bpmNow > 0 && bpmNow < PULSE_HALVE_ABOVE_BPM - PULSE_HALVE_HYST_BPM) {
        // Utanför takt-regelns hysteresband får energin bestämma.
        if (!this.pulseHalved && this.subdivEnergy < SUBDIV_ENERGY_LO_ON) wantHalved = true;
        else if (this.pulseHalved && this.subdivEnergy > SUBDIV_ENERGY_LO_OFF) wantHalved = false;
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
      if (this.lastPulseIdx === PULSE_IDX_INIT) this.lastPulseIdx = pulseIdx;
      if (pulseIdx > this.lastPulseIdx) {
        this.lastPulseIdx = pulseIdx;
        this.pulseCount++;                                                         // monoton → paritet flippar aldrig bakåt
        if (!this.pulseHalved || this.pulseCount % 2 === 0) this.pulseFloorMs = 0;  // ny puls: frisk attack
      } else if (pulseIdx < this.lastPulseIdx) {
        this.lastPulseIdx = pulseIdx;                                              // följ bakåt tyst, rör inte pulsen
      }
      const halvedOdd = this.pulseHalved && (this.pulseCount % 2 === 1);
      let tSince = beatPhase(beat, now2, atk + this.showLead) * beatMs + (halvedOdd ? beatMs : 0);
      if (tSince < this.pulseFloorMs) tSince = this.pulseFloorMs; else this.pulseFloorMs = tSince;
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
        const w = (tSince - dipStart) / dipMs;         // 0 → 1 fram mot anslaget
        beatEnv -= BEAT_PREDIP_DEPTH * w * w;          // kvadratisk: mjuk in, tydlig ut
      }
      // BARA FRAMÅT. Villkoret var `!==`, som fyrade på VARJE förändring — även
      // bakåt. PLL:en justerar anchorMs och bpm kontinuerligt i båda riktningar,
      // så nära en taktgräns dittrade index 132 → 131 → 132 och gav TRE slag där
      // ett fanns. MÄTT: 150 beatTick/min vid BPM 132 (+14 %). Eftersom beatTick
      // driver beatHit, som driver varje grid-effekt, gick hela riggen ur takt.
      // Backar ankaret följer vi med i tysthet men utan att räkna ett slag.
      if (beatIdx > this.lastBeatIdx) { this.lastBeatIdx = beatIdx; beatTick = true; }
      else if (beatIdx < this.lastBeatIdx) this.lastBeatIdx = beatIdx;
      // DOWNBEAT-ACCENT: förstärk pulsen på ettan i varje fyrtakt. Publiken läser
      // taktarten intuitivt, så en accent där gör att showen känns "säker" även när
      // samma puls loopar länge. Analysatorns barShift har redan lagt detekterade
      // ettor på beatIdx % 4 === 0; innan någon etta hittats är valet godtyckligt
      // men konsekvent (accenten vandrar inte).
      if (beatIdx % 4 === 0) beatEnv *= 1 + BEAT_DOWNBEAT_ACCENT;
    }
    // INGEN TICK-VÄG FÖR HJÄRTSLAGET — med flit. Utan pålitlig takt tiger det hellre
    // än pulsar på lösa kicks: en puls som sitter fel är värre än ingen puls. (Grid-
    // EFFEKTERNA faller däremot tillbaka på verkliga kicks, se beatHit längre ner —
    // de byter bild, de slår inte takt.)
    const kickEnv = Math.max(
      Math.max(0, 1 - (performance.now() - this.lastKickBoost) / 250),
      beatEnv * 0.8,
    );

    this.universe.fill(0);

    if (this.cfg.mode === "blackout") return this.universe;

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
      const chSel = ct.channel ?? "all";   // vilken färg testet driver (kalibrera per färg)
      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        if (role !== "r" && role !== "g" && role !== "b" && role !== "w" && role !== "dim") continue;
        const ch = cbase + i;
        if (ch < 0 || ch >= 512) continue;
        // Driv bara vald färg (all = alla lika). dim = enfärgs-dimmer → alltid.
        // full = FULLPUNKT: vitt (färgerna på 255) och DIM = reglaget; lampa utan DIM: färgerna = reglaget.
        if (chSel === "full") this.universe[ch] = role === "dim" || !roles.includes("dim") ? val : 255;
        else this.universe[ch] = (chSel === "all" || role === chSel || role === "dim") ? val : 0;
      }
      return this.universe;
    }

    // STEGTEST (ladan 10-01): alla lampor samtidigt, DIM = values[i], vald farg pa 255 (lampa utan DIM: fargen = values[i]).
    // Raa DMX-varden forbi show/VU/kalibrering - for att mata lampornas ljuskurva med ogat.
    const lt = this.cfg.levelTest;
    if (lt && lt.values.length) {
      this.universe.fill(0);
      const chSel = lt.channel ?? "all";
      for (let f = 0; f < this.cfg.fixtures.length; f++) {
        const fx = this.cfg.fixtures[f]; const roles = fixtureRoles(fx); const base = fx.address - 1;
        const v = Math.max(0, Math.min(255, Math.round(lt.values[Math.min(f, lt.values.length - 1)])));
        const hasDim = roles.includes("dim");
        for (let i = 0; i < roles.length; i++) {
          const role = roles[i]; const ch = base + i; if (ch < 0 || ch >= 512) continue;
          if (role === "dim") this.universe[ch] = v;
          else if (role === "r" || role === "g" || role === "b" || role === "w") { const cv = lt.colorValues ? lt.colorValues[Math.min(f, lt.colorValues.length - 1)] : 255; this.universe[ch] = (chSel === "all" || role === chSel) ? (hasDim ? cv : v) : 0; }
        }
      }
      return this.universe;
    }

    // Walk-test: tänd EN rå DMX-kanal på mål-fixturen till 255 (allt annat 0)
    // så användaren kan avgöra vad kanalen gör och gissa 3/4/7-kanals-preset.
    const wt = this.cfg.walkTest;
    if (wt && wt.index >= 0 && wt.index < this.cfg.fixtures.length && wt.channel >= 0) {
      const wf = this.cfg.fixtures[wt.index];
      const ch = (wf.address - 1) + wt.channel;
      if (ch >= 0 && ch < 512) this.universe[ch] = 255;
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
        // (5) FASFEL = OSAKER (lotus-porten): ihallande fasfel drar ner den raa tilliten; tappad tillit > 1,5 s nollar slagraknaren.
        let trustRawEff = trustRaw;
        {
          const se = Math.abs(this.cfg.beatErr ?? 0), lim = Math.max(0.02, SYNC_ERR_FRAC);
          trustRawEff *= se <= lim ? 1 : Math.max(0, 1 - (se - lim) / lim);
        }
        this.beatTrust += (trustRawEff - this.beatTrust) * 0.06;   // 0.03 -> 0.06: nar fullt slag efter en overgang pa ~0.7 s i st f ~1.5 s
        // TILLITSGOLV (portat från Lotus beatTrustFloor 2026-08-31). Rampen börjar exakt
        // där klockans grind släpper igenom (MIN_BEAT_CONFIDENCE), så vid conf ≈ 0.20 är
        // rutnätet LEVANDE men tilliten 0 → depth ≈ 0 och hjärtslaget är avstängt fast
        // takten går. Golvet låter pulsen leva på FAKTISKA transienter när tempot är
        // svårmätt men hörbart. Golvet sätts BARA här, inte på this.beatTrust: den läses
        // också av grid-/drop-grindarna (> 0.5) som ska fortsätta kräva riktig tillit.
        // (Taktpulsen till lamporna - beatMulNow, transient-/stigningspuls, djup, peak-hold - borttagen 2026-10-10: TRE STEG FOR LJUSET.
        //  Effekterna har sin egen puls (c.heart, ctx.beatPulse/heartPulse); tilliten ovan laser dirigentens grindar.)
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
    if (frame.energy < this.bassBaseline) this.bassBaseline += (frame.energy - this.bassBaseline) * 0.05;
    else this.bassBaseline += (frame.energy - this.bassBaseline) * bassRise;
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
    const dtNow = Math.max(0, Math.min(0.1, (performance.now() - this.lastRenderMs) / 1000));   // aldrig negativt (klockhopp; banker som byter klocka efter konstruktion gav NaN i nivan)
    let dropHitRaw = frame.dropCount !== this.lastDropCount;
    this.lastDropCount = frame.dropCount;
    // DROP I LUGN SEKTION (ladan 20:15: tva falska drops i ett lugnt parti): en riktig drop kommer ur en uppbyggnad eller ett
    // break. I low/intro kravs att analysatorn sett en riser (buildUp >= DROP_CALM_BUILD) - annars ignoreras dropen.
    const calmSec = (frame.section === 'low' || frame.section === 'intro');
    if (DROP_CALM_BUILD > 0 && dropHitRaw && calmSec && frame.buildUp < DROP_CALM_BUILD) { dropHitRaw = false; this.dropCalmDenied++; }
    // INGEN DROP I LATENS INLEDNING (ladan 2026-09-24 23:35, tredje gangen 'fortfarande drop i inledning'): intro-grindarna ovan tittar pa
    // sektionen, men den slar om intro -> build strax FORE smallen (kicken som borjar ar sjalva byggstenen). Med DMX_DROP_SONG_HOLD_S > 0
    // fyrar ingen drop/minidrop forsta N s av en lat (klockan startar vid motorstart och vid latgrans = softenRange; INTE pa sektionen - tystnaden fore en drop gor den till intro, 23:31: dropen efter pausen nekades).
    // DROP-KEDJOR (ladan 2026-09-29 19:03 'falsk drop'): analysatorns eskaleringsregel slapper en starkare drop redan 4 s efter
    // den forra - loggen: tre drops pa 10 s (rise 17 -> 20 -> 30). Showen tar hogst en drop per DMX_DROP_MIN_GAP_S. 0 = av.
    // EN SPÄRR FÖR ALLA DROPS (ladan 10-12 12:45 'fel drop': lyft+språng-dropen 12:45:41, sedan analysatorns drop 14 s senare - analysatorns
    // 20 s-spärr (DROP_LONG_MS) räknar bara sina egna). Konsertläget: ingen drop inom SHOW_DROP_GAP_MS från förra, oavsett källa.
    const dropGapMs = DROP_MIN_GAP_S > 0 ? DROP_MIN_GAP_S * 1000 : CONCERT ? SHOW_DROP_GAP_MS : 0;
    if (dropGapMs > 0 && dropHitRaw) { if (nowWall - this.lastShowDropWall < dropGapMs) { dropHitRaw = false; this.dropCalmDenied++; if (CONCERT) this.gapMini(nowWall); } else this.lastShowDropWall = nowWall; }   // spärrad drop -> minidrop (ägaren 10-12: 'tidsspärren skall gälla riktiga bara, så kör den annars som minidrop')
    if (DROP_SONG_HOLD_S > 0) {
      if (dropHitRaw && nowWall - this.songStartWall < DROP_SONG_HOLD_S * 1000) { dropHitRaw = false; this.dropCalmDenied++; }
    }
    if (this.upgradeHit) { this.upgradeHit = false; if (!(CONCERT && nowWall - this.lastShowDropWall < SHOW_DROP_GAP_MS)) { dropHitRaw = true; this.lastShowDropWall = nowWall; this.buildUpgrades++; } else this.gapMini(nowWall); }   // BUILD SOM LANDAR: forra rutans nastan-drop efter en build
    let dropHit = dropHitRaw;
    if (CONCERT && dropHit) this.dropLiftUntil = nowWall + DROP_LIFT_MS;   // DROPEN BÄR IN I REFRÄNGEN
    // EFTERKONTROLL (ladan 20:20: falsk drop 'liten uppbyggnad -> lugnt parti'): en riktig drop LANDAR HOGT. 600 ms efter dropen
    // jamfors energin (eSm, se E_WIN_S) med energin strax fore; har den inte stigit >= DROP_LAND_GAIN doms dropen falsk:
    // envelope klipps, 20 s-high-fonstret och tiersnappen dras tillbaka. Blixten (0,6 s) hinner synas, inte 20 s fel show.
    if (dropHitRaw) { this.dropCheckAt = nowWall + 600; this.preDropLevel = this.eSm; this.preDropTier = this.tierEma; }
    if (this.dropCheckAt > 0 && nowWall >= this.dropCheckAt) {
      this.dropCheckAt = 0;
      const lvl = this.eSm;
      if (lvl < this.preDropLevel * DROP_LAND_GAIN + 0.02) { this.dropEnv = 0; this.dropLiftUntil = 0; if (this.tierEma > this.preDropTier) this.tierEma = this.preDropTier; this.dropFalse++; }
    }
    // (drop-snapp till takten forkastad 09-12: taktlaset resettas vid drops, slog aldrig till / gjorde drops sena.)
    const miniCount = frame.miniDropCount ?? 0;
    const miniHitRaw = miniCount !== this.lastMiniCount;   // monoton raknare -> flanken kan inte aliaseras bort
    this.lastMiniCount = miniCount;
    // Minidrop direkt; en riktig drop samma ruta gar fore (och tar annars over via dropEnv/dropColEnv).
    let miniHit = false;
    if (miniHitRaw && !dropHitRaw && (CONCERT || !(DROP_SONG_HOLD_S > 0 && nowWall - this.songStartWall < DROP_SONG_HOLD_S * 1000))) miniHit = true;   // konsertlaget: latens forsta 30 s sparrar bara riktiga drops   // direkt (ingen vantan)
    if (CONCERT) miniHit = false;   // V123 (10-11 kväll): analysatorns minidrops (17/min) är ingen minidrop i konsertläget - bara energilyftet/sektionslyftet ger looken
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
    if (dropHit && sinceStart > START_DROP_MUTE_MS) this.dropBangUntil = nowWall + 700;   // 1300 -> 700 (ladan 10-11 22:0x, ägaren: 'huvuddrop, vi kan nog minska tiden den är på'); uttoningen 1 s orörd
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
    if (dropHit) this.blackoutUntil = 0;                                                        // dropen fyrade → släpp svärtan, explodera
    const blackout = nowWall < this.blackoutUntil;
    const fog = this.cfg.fog;   // rök beslutas EFTER effekterna (de får önska) — se nedan
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
    if (miniHit && !dropHit && sinceStart > START_DROP_MUTE_MS) this.miniBangUntil = nowWall + MINI_BANG_MS;
    const miniActive = nowWall < this.miniBangUntil;
    let dTarget = dropActive ? 1 : miniActive ? MINI_DROP_ENV : 0;
    this.nearHit = false;   // bara rutan da nastan-dropen fyrar (lases av dirigenten langre ner i samma ruta)
    {   // NASTAN-DROP (standard sedan 10-07; av-brytaren DMX_NEAR_DROP borttagen 10-10)
      // Baskroppen glattad (120 ms), normalnivan (8 s) och dippens botten (minsta pa 1,5 s, 25 ms-rutor).
      const x = Math.max(-90, frame.bodyDb ?? -90);
      if (this.nearB === null) { this.nearB = x; this.nearNorm = x; }
      this.nearB += (x - this.nearB) * Math.min(1, dtNow / 0.12);
      this.nearNorm += (this.nearB - this.nearNorm) * Math.min(1, dtNow / 8);
      const h = this.nearHist; h.push(this.nearB); if (h.length > 60) h.shift();
      let floor = 1e9; for (const v of h) if (v < floor) floor = v;
      const rise = this.nearB - floor, dip = this.nearNorm - floor;
      if (rise >= NEAR_RISE_DB && dip >= NEAR_DIP_DB && floor > -80 && this.nearB >= this.nearNorm - 1 && nowWall - this.nearAt > NEAR_REFRACT_MS   // floor > -80: inspelningsavbrott (overrun) ar ingen dipp ('sprang 107 dB', ladan 10-08)
          && !dropActive && sinceStart > START_DROP_MUTE_MS) {
        const g = Math.max(0, Math.min(1, (rise - NEAR_RISE_DB) / Math.max(1, NEAR_FULL_DB - NEAR_RISE_DB)));
        this.nearAt = nowWall; this.nearUntil = nowWall + MINI_BANG_MS; this.nearLevel = NEAR_MIN + (NEAR_MAX - NEAR_MIN) * g; this.nearCount++; this.nearHit = true;
        console.log(`[dirigent] nastan-drop: sprang ${rise.toFixed(1)} dB efter dipp ${dip.toFixed(1)} dB -> ljus ${(this.nearLevel * 100).toFixed(0)} % av en drop`);
      }
      if (!CONCERT && nowWall < this.nearUntil && this.nearLevel > dTarget) dTarget = this.nearLevel;   // V123: i konsertläget ingen blixt (nästan-dropen träffar ett lyft lika ofta som slumpen) - bara build-landningen ovan
    }
    // SEKTIONSLYFT (ägaren i ladan 10-11 'nu': build -> high, intensitet 0,74 -> 0,88, men varken drop, nästan-drop eller energilyft
    // fyrade - basen spelade redan i builden): analysatorns övergång till 'high' från lugnt/build är också ett energilyft.
    if (CONCERT) {
      const sec = frame.section ?? '';
      if (sec === 'high' && this.prevRawSec !== '' && this.prevRawSec !== 'high' && nowWall - this.lastHighWall > 8000 && nowWall - this.lastMiniWall >= MINI_GAP_MS && !dropActive) {
        this.liftAt = nowWall; this.liftCount++; this.lastMiniWall = nowWall; this.miniSector = mixedSector(this.liftCount + 7);
        this.miniBangUntil = nowWall + MINI_BANG_MS; this.miniLiftUntil = nowWall + MINI_LIFT_MS;
        if (isLogOn()) console.log(`[dirigent] sektionslyft: ${this.prevRawSec} -> high`);
      }
      if (sec === 'high') this.lastHighWall = nowWall;
      if (sec !== '') this.prevRawSec = sec;
    }
    if (CONCERT && this.nearB !== null) {   // ENERGILYFT (se LIFT_DB)
      const h = this.liftHist; h.push(this.nearB); if (h.length > 240) h.shift();   // ~6 s i 25 ms-rutor
      if (h.length >= 240 && nowWall - this.liftAt > LIFT_REFRACT_MS && nowWall - this.lastMiniWall >= MINI_GAP_MS && !dropActive && !BUILD_LOOKS.includes(this.smartMode)) {   // inte under en build (stegringen hör till builden)
        let sum = 0; for (let q = 0; q < 160; q++) sum += h[q];
        let now6 = 0; for (let q = h.length - 24; q < h.length; q++) now6 += h[q];
        const calm = sum / 160, lift = now6 / 24 - calm;   // senaste 0,6 s mot 6..2 s sedan
        if (calm > -80 && lift >= LIFT_DB) {
          this.liftAt = nowWall; this.liftCount++; this.lastMiniWall = nowWall; this.miniSector = mixedSector(this.liftCount + 7);
          this.miniBangUntil = nowWall + MINI_BANG_MS; this.miniLiftUntil = nowWall + MINI_LIFT_MS;
          if (isLogOn()) console.log(`[dirigent] energilyft: kropp ${lift.toFixed(1)} dB over lugnet`);
        }
      }
    }
    const dRate = dTarget > this.dropEnv ? dtNow / 0.03 : dtNow / 1.0;
    this.dropEnv += Math.max(-dRate, Math.min(dRate, dTarget - this.dropEnv));
    { const cT = dropActive ? 1 : 0, cR = cT > this.dropColEnv ? dtNow / 0.03 : dtNow / 1.0; this.dropColEnv += Math.max(-cR, Math.min(cR, cT - this.dropColEnv)); }
    { const mT = CONCERT && nowWall < this.miniBangUntil ? 1 : 0, mR = mT > this.miniColEnv ? dtNow / 0.03 : dtNow / 0.6; this.miniColEnv += Math.max(-mR, Math.min(mR, mT - this.miniColEnv)); }   // MINIDROPS SOM SHOW

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
        if (this.chasePos >= count - 1) { this.chasePos = count - 1; this.chaseDir = -1; }
        else if (this.chasePos <= 0)    { this.chasePos = 0;         this.chaseDir =  1; }
      } else {
        this.chasePos = (this.chasePos + 1) % Math.max(1, count);
      }
    }

    // "smart": välj effekt ur låtens känsla — relativ sektionsenergi (mot en
    // långsam baslinje) väljer tier. Byter bara på tier-byte, drop eller dwell —
    // alltid med minsta hålltid så en effekt hinner läsas (se orkestreringen nedan).
    let effMode: Mode = this.cfg.mode;
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
      if (dropHit && this.tierEma < 0.75) this.tierEma = 0.75;
      // SEKTIONEN AR BEVISET (DMX_SECTION_SWITCH, 2026-09-21): analysatorns 'high' = topp-tredjedelen av latens EGEN energi
      // (rank-lage), sa vid en high-grans vet dirigenten redan att refrangen ar har - gasa direkt (som vid drop), vanta inte
      // pa 5 s-medelvardet + hallstid. 'break'/'low' vid gransen: slapp ner direkt (musiken slapper -> showen foljer).
      if ((frame.sectionAgeMs ?? 1e9) < 1500) {
        // KRASEN (ladan 19:55: 'gasade pa i lugnt parti'): bara nar analysatorns egen energitier ocksa sager topp (sectionTier 2).
        if ((frame.section === 'high' && (frame.sectionTier ?? 0) >= 2) && this.tierEma < SECTION_HIGH_SNAP) this.tierEma = SECTION_HIGH_SNAP;
        else if ((frame.section === 'break' || frame.section === 'low') && this.tierEma > SECTION_LOW_SNAP) this.tierEma = SECTION_LOW_SNAP;
      }
      const intensity = this.cfg.energyDrivesMode ? this.tierEma : 0.5;
        // Three tiers by intensity + tempo; user checkboxes (cfg.rotation) pick
        // which modes are in play. Full Fart kräver BÅDE hög energi och högt BPM.
        const LUGN = TIER.lugn;
        const FART = TIER.fart;
        const FULLFART = TIER.full;
        const bpm = this.cfg.beat?.bpm ?? 0;
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
        const loThr = TIER_LO, hiThr = TIER_HI;   // env lases en gang (modulniva), inte per ruta
        // TIER-HYSTERES: utan den flaxar tiern så fort intensiteten pendlar kring en
        // gräns → tierChanged blir sann om och om → effektbyte varje minsta-hålltid
        // (mätt: byte var 8.0s spikrakt). Kräv att man går TYDLIGT förbi gränsen för
        // att LÄMNA nuvarande tier (in vid gränsen, ut först HYST därbortom).
        const HYST = 0.08;
        let lo = loThr, hi = hiThr;
        if (this.lastSmartTier === "lugn") lo = loThr + HYST;                       // svårare att lämna lugn
        else if (this.lastSmartTier === "fart") { lo = loThr - HYST; hi = hiThr + HYST; }  // brett fart-band
        else if (this.lastSmartTier === "full") hi = hiThr - HYST;                  // svårare att lämna full
        let tier: Mode[] = intensity < lo ? LUGN : intensity < hi ? FART : FULLFART;
        // Låg-BPM-spärr: en tryckare/ballad ska ALDRIG gå Full Fart, även om dess
        // relativa energi toppar. (bpm 0 = ej låst → ingen spärr.)
        // RÄKNAD MOT 80..160-INTERVALLET (exakt en oktav): en ballad på 85 bor kvar
        // som 85 och fångas av spärren, medan hardstyle 150 ligger tryggt över. Att
        // spärra högre än 100 hade dödat hardstyle helt, så bandet stannar där.
        if (bpm > 0 && bpm < 100 && tier === FULLFART) tier = FART;
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
        const MIN_HOLD = 8000;    // en effekt lever ALLTID minst 8s
        const DROP_HOLD = 8000;   // drop byter inte oftare än nagot annat (detektorn fyrar tatt pa pulsande musik)
        // Drop-byte bara när energin får driva → en LUGN stämning (chill,
        // energyDrivesMode av) byter ENBART på dwell-timern, aldrig på drops.
        const dropSwitch = DISCRETE_DROP_LAMPS && dropHit && this.cfg.energyDrivesMode && (held > DROP_HOLD || (CONCERT && BUILD_LOOKS.includes(this.smartMode)));   // konsertlaget: dropen avslutar builden direkt
        // (minidrop byter INTE look sedan 2026-10-10, agaren i ladan: 'minidrop maste ju inte orsaka look-byten' - den lyfter bara ljuset)
        const nearSwitch = !CONCERT && this.nearHit && this.cfg.energyDrivesMode && held > MIN_HOLD;   // V123: inget lookbyte på nästan-drop i konsertläget (var vanligaste bytet, 1,6/min)   // nastan-drop: samma regel
        // MINNETS STRUKTUR: en tvättad låt vet var karaktären skiftar och var
        // fraserna börjar. Ett byte DÄR känns komponerat; samma byte 1,5 takt fel
        // känns slumpmässigt. Sektionsgräns = byt gärna nu; frasgräns = ok att byta.
        // Har låten grid väntar dwell-timern in nästa gräns (men max 20 s extra, så
        // showen aldrig fastnar om gridet skulle vara fel).
        // REALTIDSSEKTION (DMX_SECTION_SWITCH=1, 2026-09-21): analysatorns egen sektion (DMX_SECTION=1: intro/low/build/high/break)
        // ar ett bytesskal precis som latminnets sektionsgrans, och etiketten ger IDENTITET (samma look nar 'high' kommer tillbaka).
        const liveSec = frame.section || '';   // bara raa sektionen (forvarningens/drop-fonstrets 'high' raknas inte, se SECTION_UNIT_MIN_MS)
        const liveSecChanged = liveSec !== '' && this.lastLiveSection !== '' && liveSec !== this.lastLiveSection;
        if (liveSec !== '' && liveSec !== this.lastLiveSection) { if (this.lastLiveSection !== '') console.log(`[dirigent] sektion ${this.lastLiveSection} -> ${liveSec} (nr ${frame.sectionIndex ?? 0}, tier ${frame.sectionTier ?? '-'})`); this.lastLiveSection = liveSec; if (liveSec === 'intro') { let nGl = 0; for (const k of [...this.partLook.keys()]) if (k.startsWith('live:')) { this.prevSongLook.set(k, this.partLook.get(k)!); this.partLook.delete(k); nGl++; } if (nGl) console.log(`[dirigent] ny lat: glommer ${nGl} looker`); } }
        if (liveSecChanged) this.pendingSecSwitch = true;
        const secOldEnough = (frame.sectionAgeMs ?? 1e9) >= SECTION_UNIT_MIN_MS;   // SECTION_UNIT: ingen switch pa en sektion yngre an 4 s (detektorflapp)   // ny lat (analysatorn nollar till intro) -> glom live-lookerna
        const memSection = now - this.memSectionAt < 300 || liveSecChanged;
        const memPhrase = now - this.memPhraseAt < 250;
        const gridOk = !this.memHasGrid || memSection || memPhrase || now > this.smartDwellUntil + 20000;
        const phraseMs = this.cfg.beat && this.cfg.beat.bpm > 0 ? 16 * 60000 / this.cfg.beat.bpm * (this.pulseHalved ? 2 : 1) : 0;
        const phraseOk = !PHRASE_SWITCH || !beatLocked(this.cfg.beat) || this.beatTrust < 0.5 || (this.beatCounter % 16) === 0 || held > MIN_HOLD + phraseMs;
        // MED STRUKTUR AR SEKTIONEN ENHETEN. Dwell-timern och tier-bytet ar till
        // for OKANDA latar, dar showen inte har nagot battre att ga pa. Har vi en
        // analyserad struktur ska looken sitta HELA sektionen ut — annars byter
        // den mitt i refrangen, vilket ar precis vad man vill undvika.
        //   MATT 2026-08-08 i en och samma refrang: "ny look chase (tier fart)"
        //   foljt 11 s senare av "ny look ripple (tier full)" — tre looker i en
        //   refrang, driven av att tiern flaxade mellan fart och full.
        const halvedChanged = this.pulseHalved !== this.lastHalvedForSwitch;   // dubbeltakt/lugn slog om → delad look
        // BASGANG: tydlig basgang som kommer (eller gar) medan nuvarande look inte matchar -> byt.
        const bassClear = (frame.profile.bassline ?? 0) >= (this.lastBassClearForSwitch ? CLEAR_BASS - 0.2 : CLEAR_BASS);
        const curToggle = !!EFFECT_MAP.get(this.smartMode)?.toggle;
        const bassSwitch = bassClear !== this.lastBassClearForSwitch && (bassClear ? !curToggle : curToggle);
        // FRASVAXLING: ny fras (var PHRASE_BARS:e takt sedan sektionsstart) -> byte till sektionens andra look
        const phraseNo = SECTION_UNIT_PHRASE_BARS > 0 ? Math.floor((frame.sectionBars ?? 0) / SECTION_UNIT_PHRASE_BARS) : 0;
        if (liveSecChanged) this.unitPhraseDone = 0;
        const unitPhrase = !!liveSec && SECTION_UNIT_PHRASE_BARS > 0 && phraseNo > 0 && phraseNo !== this.unitPhraseDone && !liveSecChanged && !this.pendingSecSwitch;
        const charShift = performance.now() < this.charShiftUntil;   // KARAKTARSSKIFTE (noteCharShift)
        const wantSwitch = this.memPart
          ? (memSection || bassSwitch)
          : liveSec
            ? (((memSection || this.pendingSecSwitch) && secOldEnough) || unitPhrase || bassSwitch || charShift || now > this.smartDwellUntil + SECTION_UNIT_RESERVE_MS)   // SECTION_UNIT: sektionen ar enheten
            : (tierChanged || memSection || halvedChanged || bassSwitch || charShift || now > this.smartDwellUntil);

        // STRUKTUR: analysatorn vet VAR i låten vi är — dirigenten ska lyssna på
        // det, inte bara på energinivån. Två regler, båda dramaturgiska:
        //
        // 1) Byt ALDRIG mitt i en uppbyggnad. Publiken laddar mot dropen, och ett
        //    effektbyte där släpper spänningen precis när den ska byggas. Håll
        //    kvar genom hela risern — då landar bytet i stället PÅ dropen, vilket
        //    är det enda ögonblick där ett byte förstärker musiken.
        const inBuild = frame.inRiser || frame.buildUp > 0.35 || (frame.section === 'build');
        // ALLA_LOOKER (a): en uppbyggnad som hallit ALLA_BUILD_S = intrade -> ETT byte till build-poolen
        let allaBuild = false;
        if (!inBuild) { this.buildSince = -1; this.buildEntered = false; }
        else { if (this.buildSince < 0) this.buildSince = now; allaBuild = !this.buildEntered && now - this.buildSince >= (CONCERT ? 0.5 : ALLA_BUILD_S) * 1000 && held > (CONCERT ? 2000 : 4000); }
        // (preDrop - kroppen borta 1,5 s -> build-looken - borttagen 10-11 kväll, V123: valde build-looker mitt i verserna; build-look 32 % av tiden mot sektion build 12 %)
        // 2) I ett breakdown: gå till den lugna poolen oavsett vad energitiern
        //    säger. Tiern hinner inte ner direkt (den är medvetet trög mot flapp),
        //    så utan detta fortsätter riggen köra fullfart genom en svacka.
        // LUGN-POOLEN BARA FRAN SEKTIONEN (2026-09-27, ladan): frame.breaking ar 'nivan < 65 % av taket' och var sann sa ofta
        // pa partypop att 27 av 40 look-val blev lugn-looker (viska/airglow/twin = nastan morka) mitt i sektion high med tier
        // full -> "ser inte vad effekterna gor", "en lampa lyser konstant". Med sektionsstyrning pa ar 'break' den
        // genomtankta signalen (av-brytaren DMX_CALM_FROM_BREAKING borttagen 10-10).
        const calmSignal = frame.section === 'break';
        const wantCalm = calmSignal && this.cfg.energyDrivesMode;
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
        const tierS = tier;
        // Ny låt → glöm förra låtens looker.
        if (this.memSongId !== this.partLookSong) { this.partLook.clear(); this.partLookSong = this.memSongId; }
        const buildEntry = liveSecChanged && liveSec === 'build';   // MIX_V2 (2): ett byte IN i build-poolen tillats
        const secEntry = this.pendingSecSwitch && secOldEnough && liveSec !== 'build';   // SECTION_UNIT: sektionen sager att risern ar over -> inBuild far inte halla kvar build-looken i refrangen
        const concertBuild = CONCERT && buildEntry && held > 2000;   // konsertläget: in i build direkt
        // refrängen kom utan drop -> lämna builden direkt; även ett energilyft/sektionslyft (ladan 16:05: virvel hängde kvar i 'low' efter lyftet)
        // + intensiteten på topp (ladan 17:09 'miss': upptakt låg kvar 10 s i int 0,9-1,0 - sektionen gick low -> build -> intro, aldrig high)
        // (ladan 17:12 'falsk': lyftet och int 0,86 kom UNDER builden - dropen fyrade före smällen. Lyft inom build räknas inte; topp = 0,95.)
        const buildExit = CONCERT && BUILD_LOOKS.includes(this.smartMode) && (frame.section === 'high' || (this.buildLookAt > 0 && nowWall - this.buildLookAt > 2000 && (frame.intensity ?? 0) >= 0.95));
        // (BUILDEN LANDAR I REFRÄNGEN - sektionen high efter >= 4 s build = drop - borttagen 10-11 kväll: 'falsk' 21:42:39, 17 % på baslyft; se DROP_JUMP_DB)
        const buildLock = CONCERT && frame.section === 'build' && this.buildLookAt > 0 && BUILD_LOOKS.includes(this.smartMode) && nowWall - this.buildLookAt < 30000 && !dropSwitch && !nearSwitch && !buildExit;   // BUILD SOM HÅLLER - V123: bara så länge sektionen ÄR build
        if (!buildLock && (!inBuild || buildEntry || secEntry || allaBuild) && (dropSwitch || nearSwitch || allaBuild || concertBuild || buildExit || ((wantSwitch || buildEntry) && held > MIN_HOLD && gridOk && phraseOk))) {
        this.lastSmartSwitchMs = now; this.pendingSecSwitch = false; if (allaBuild) this.buildEntered = true;
        // DIAGNOSTIK (se switchWhy): starkaste orsaken forst. 'dwell' sist = klockan var det enda skalet.
        this.switchWhy = dropSwitch ? 'drop' : nearSwitch ? 'nastan-drop' : charShift ? (this.charShiftWhy.startsWith('tempovaxling') ? 'tempo' : 'karaktar')
          : (memSection || secEntry) ? 'sektion' : unitPhrase ? 'fras' : bassSwitch ? 'basgang'
          : (buildEntry || allaBuild) ? 'build' : halvedChanged ? 'halvering' : tierChanged ? 'tier' : 'dwell';
        this.switchCount++;
        // (skrapjakten 10-01: enabled/part skapades forr pa varje ruta men anvands bara har, i bytet)
        const enabled = (list: Mode[]) => list.filter((m) => this.cfg.rotation?.[m] !== false);
        const part = this.memPart || (liveSec && liveSec !== 'intro' ? 'live:' + liveSec : undefined);   // identitet aven utan latminne
        if (charShift) { this.charShiftUntil = 0; console.log(`[dirigent] ${this.charShiftWhy} i laten -> byter look`); }
        this.lastSmartTier = tierName;
        this.lastHalvedForSwitch = this.pulseHalved;
        this.lastBassClearForSwitch = bassClear;
        // DWELL 45 s (agaren 2026-09-12 "dirigenten behover inte byta hela tiden, bara vid andringar i laten"): en nodfallback - bytena
        // sker pa sektionsgrans, drop, basgang och halvering. 10-11: env-ratten DMX_DWELL_MS och stamningarnas/UI:ts smartDwellMs bort
        // (env-standarden vann alltid over cfg; rattsvepet: 22,5/67,5 s json-identiskt pa mixarna).
        this.smartDwellUntil = now + 45000;
        // EFFEKT-KRAV: filtrera bort effekter vars krav (tempo/karaktär) inte möts
        // just nu — strobe bara i snabb musik, trum-effekter bara med trummor, osv.
        // (registry.meetsRequirements). Ambient-effekterna kräver inget → utgör
        // fallbacken. Töms poolen ändå släpper vi kraven (hellre en mindre passande
        // effekt än ingen).
        const req = (m: Mode) => meetsRequirements(m, bpm, frame.profile);
        let pool = enabled(wantCalm ? LUGN : tierS).filter(req);
        // MIX_V2 (5): i 'high' (refrang/drop) ar energitiern oftast bara 'fart' (full 17-20 % av tiden pa ladans mixar) -> full-fart-
        // effekterna (party, split, gravity, konfetti, fyrverkeri ...) valdes nastan aldrig. I high far poolen vara fart + full.
        if (!wantCalm && liveSec === 'high' && tierS === FART) pool = enabled([...FART, ...FULLFART]).filter(req);
        // SEKTIONSPOOL (DMX_SECTION_SWITCH): skar med sektionens looker (registry.SECTION_POOLS). 'build' och 'break' har egna
        // effekter (stegring/andrum) som gar fore tiern; for high/low/intro ar snittet med tier-poolen forsta valet.
        const secKey = allaBuild ? 'build' : liveSec;   // ALLA_LOOKER (a): uppbyggnaden valjer ur build-poolen aven nar etiketten sager annat
        if (secKey) {
          const secList = sectionPool(secKey);
          const own = (secKey === 'build' || secKey === 'break') ? enabled(secList).filter(req) : [];
          const cut = pool.filter((m) => secList.includes(m));
          if (own.length) pool = own; else if (cut.length) pool = cut;
        }
        if (pool.length === 0) pool = enabled(wantCalm ? LUGN : tierS);              // krav tömde → släpp dem
        if (pool.length === 0) pool = enabled([...FART, ...LUGN, ...FULLFART]);      // valfri aktiv
        if (pool.length === 0) pool = ["breathe"];                                   // sista fallback
        // HALVERAT: de delade lookerna (och hjärtat) ska finnas i poolen oavsett tier.
        // (innerouter borttagen 2026-09-23: rPerm 1,00 mot varannan - samma effekt upp till lampordning.)
        if (this.pulseHalved) for (const m of ["varannan", "basgang", "hjarta"] as Mode[]) if (!pool.includes(m) && this.cfg.rotation?.[m] !== false && req(m)) pool.push(m);
        if (CONCERT) { const show = pool.filter((m) => !(CALM_ONLY.includes(m) && !(bpm > 0 && bpm < CALM_BPM))); if (show.length) pool = show; }   // UNIFORM tillbaka 10-11 (energi pa utvalda lampor)
        if (CONCERT && secKey === 'build') { const b = pool.filter((m) => BUILD_LOOKS.includes(m)); pool = b.length ? b : enabled(BUILD_LOOKS); }   // BUILD SOM HÅLLER   // KONSERTLÄGET: ingen enhetlig look
        if (LAMP_STAIR && liveSec === 'high') {                                   // LAMPTRAPPA: refrängen -> hela riggen
          const full = pool.filter((m) => !SPARSAM.includes(m)); if (full.length) pool = full;
        }
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
        if (livePart) { if (unitPhrase) { this.unitSlot = 1 - this.unitSlot; this.unitPhraseDone = phraseNo; } else this.unitSlot = 0; }
        const pairKey = livePart ? part + (this.unitSlot ? ':b' : '') : part;   // SECTION_UNIT: nyckel = etiketten
        // (ATERSEENDE av looken per sektion - DMX_SECTION_REUSE - borttaget 10-10: av sedan 10-01, 'mer variation'. Sektionspaletten
        //  DMX_SECTION_PALETTE ger igenkanningen i kulorerna i stallet.)
        const unitPen = (m: Mode) => pairKey && this.prevSongLook.get(pairKey) === m ? 0.5 : 0;   // SECTION_UNIT: inte forra latens look for samma sektionstyp   // 20:33: ingen igenkanning for live-etiketter ('samma effekt igen') - bara latminnet
        // TYDLIG BASGANG -> toggle-poolen (se CLEAR_BASS). Snitt med aktuell pool forst (sektion/tier/krav), annars alla
        // aktiva toggle-effekter som moter kraven. Bast passande forst, gyllene-snitt-variation bland topp 3, aldrig samma.
        // LAST OCH TYDLIG TAKT (ladan 10-10, agaren: 'ar bpm last och tydlig takt sa vill jag att dirigenten foredrar dom'): som tydlig
        // basgang - varannat look-byte tas ur toggle-poolen (parvisa/gruppvisa effekter i takt) nar takten ar last och tilliten >= 0,85.
        const beatClear = !allaBuild && beatLocked(this.cfg.beat) && this.beatTrust >= 0.85 && this.smartCount % 2 === 1;
        const bassHard = !(CONCERT && secKey === 'build') && (beatClear || (!allaBuild && bassClear && ((frame.profile.bassline ?? 0) >= CLEAR_BASS_HARD && this.smartCount % 2 === 1)));   // MIX_V2 (1); konsertlaget: aldrig i build
        const toggles = bassHard ? (() => { const cut = pool.filter((m) => TOGGLE_POOL.includes(m)); const t = cut.length ? cut : enabled(TOGGLE_POOL).filter(req); const full = LAMP_STAIR && liveSec === 'high' ? t.filter((m) => !SPARSAM.includes(m)) : t; return full.length ? full : t; })() : [];   // refrängen: inga glesa looker via basgången heller (10-12)
        const clearBass = toggles.length > 0;
        const lastLookBeforeSwitch = this.smartMode;
        if (clearBass) {
          const ranked = toggles.map((m) => ({ m, s: fitScore(m, frame.profile) - (this.recentLooks.includes(m) ? MIX_RECENT_PENALTY : 0) + (!this.seenLooks.has(m) ? MIX_UNSEEN_BONUS : 0) - unitPen(m) })).sort((a, b) => b.s - a.s);
          const cands = ranked.filter((x) => x.m !== this.smartMode);
          const top = (cands.length ? cands : ranked).slice(0, Math.min((cands.length ? cands : ranked).length, Math.max(3, Math.round((cands.length ? cands : ranked).length * MIX_TOP_FRAC))));
          this.smartMode = this.pickLook(top);
          if (part && !wantCalm) this.partLook.set(pairKey!, this.smartMode);
          console.log(`[dirigent] ${beatClear ? `last takt (tillit ${this.beatTrust.toFixed(2)}` : `tydlig basgang (${(frame.profile.bassline ?? 0).toFixed(2)}`}, ${toggles.length} toggles) -> "${this.smartMode}"`);
        } else {
          // DUBBELTAKT → VARANNAN: på snabbt/dubbeltakt-låst tempo (bpm ≥ 140) boostas
          // `varannan` (spatial dubbeltakt) hårt så dirigenten väljer den i stället för
          // att hela riggen blinkar dubbelt uniformt (ägaren i ladan 2026-09-03).
          const halvedNow = this.pulseHalved;
          const fastBoost = (m: Mode) => (m === "varannan" && bpm >= 140 ? 0.30 : 0)
            + (bassClear && TOGGLE_POOL.includes(m) ? CLEAR_BASS_BOOST : 0)                    // MIX_V2 (1): boost, inte pool-byte
            - (this.recentLooks.includes(m) ? MIX_RECENT_PENALTY : 0)                          // MIX_V2 (3): nyhetsstraff
            + (!this.seenLooks.has(m) ? MIX_UNSEEN_BONUS : 0)                                 // MIX_V2 (6): osedd-bonus
            - unitPen(m)                                                                                  // SECTION_UNIT: forra latens look
            + (halvedNow && (m === "varannan" || m === "basgang") ? 0.30 : 0)
            + (m === "hjarta" ? (halvedNow ? 0.30 : (wantCalm || tierS === LUGN) ? 0.20 : 0) : 0);   // halverat: trion varannan/innerouter/hjarta = hela topp-3
          const ranked = pool
            .map((m) => ({ m, s: fitScore(m, frame.profile) + fastBoost(m) }))
            .sort((a, b) => b.s - a.s);
          const cands = ranked.filter((x) => x.m !== this.smartMode);
          // MIX_V2 (4): valfonstret var alltid topp-3 av passformen -> samma 3-5 looker per tier for evigt; nu topp-MIX_TOP_FRAC av poolen (minst 3)
          const top = (cands.length ? cands : ranked).slice(0, Math.min((cands.length ? cands : ranked).length, Math.max(3, Math.round((cands.length ? cands : ranked).length * MIX_TOP_FRAC))));
          this.smartMode = this.pickLook(top);
          if (part && !wantCalm) this.partLook.set(pairKey!, this.smartMode);
          // LOGGEN AR OVILLKORLIG (2026-09-23): utan DMX_SECTION_SWITCH finns inget `part` och dirigentens val syntes inte alls i
          // journalen (ladan 09-22: "vi korde pa hoga effekter" gick inte att belagga). Nu: del, sektion (data), basgang, tier, pool.
          console.log(`[dirigent] ${part ?? 'smart'}: ny look "${this.smartMode}" (tier ${tierS === LUGN ? "lugn" : tierS === FART ? "fart" : "full"}, pool ${pool.length}, sektion ${frame.section ?? '-'}, basgang ${(frame.profile.bassline ?? 0).toFixed(2)}${wantCalm ? ', lugn' : ''})`);
        }
        // ENFORMIG LOOK -> KORTARE DWELL. Agaren 2026-09-12: "ar det en enformig effekt far den garna byta
        // snabbare". De statiska svepen (ingen takt-signal, ingen kick-drift) far DMX_DWELL_FLAT_MS (30 s),
        // taktdrivna looker behaller 45 s. Satts EFTER valet, eftersom dwellen ovan sattes fore.
        if (EFFECT_MAP.get(this.smartMode)?.flat) this.smartDwellUntil = now + (Number(process.env.DMX_DWELL_FLAT_MS) || 30000);
        // EKO FÖRST VID TYDLIG BASGÅNG (ägaren i ladan 10-11: basslaget som glider genom lamporna som en våg -> 'ja' till förstaval):
        // bassline >= 0,6 (där eko själv följer basnoterna) -> eko, utom i build, efter drop, eller om eko just gick.
        if (CONCERT && (frame.profile.bassline ?? 0) >= EKO_BASS && this.smartMode !== 'eko' && lastLookBeforeSwitch !== 'eko' && !BUILD_LOOKS.includes(this.smartMode)
            && this.switchWhy !== 'drop' && this.cfg.rotation?.eko !== false && frame.section !== 'high') this.smartMode = 'eko';
        if (CONCERT) this.buildLookAt = BUILD_LOOKS.includes(this.smartMode) ? nowWall : 0;   // BUILD SOM HÅLLER: när build-looken började
        this.recentLooks.push(this.smartMode); if (this.recentLooks.length > MIX_RECENT_N) this.recentLooks.shift(); this.seenLooks.add(this.smartMode);
      }
      effMode = this.smartMode;
    }
    this.activeMode = effMode;

    // REGI-LAGER: räkna takter → byt färgpalett var N:e takt (musikalisk fras) i
    // smart-läget, så showen känns designad och utvecklas över tid istället för
    // att slumpa färg. Paletten väljs efter klangen (centroid): mörk/bastung →
    // varmt, ljus/diskantig → svalt. Övergången sker mjukt via färg-ballistiken.
    if (this.cfg.mode === "smart") {
      const secKey = SECTION_PALETTE ? (frame.section ?? '') : '';
      if (secKey !== '') {
        // SEKTIONSPALETT: byte bara nar sektionen byts; samma etikett i samma lat -> samma palett (se SECTION_PALETTE).
        if (secKey !== this.secPaletteKey) {
          this.secPaletteKey = secKey;
          const rem = this.secPalette.get(secKey);
          if (rem !== undefined) this.paletteIdx = rem; else { this.pickPalette(frame.centroid); this.secPalette.set(secKey, this.paletteIdx); }
        }
      } else if (frame.bpm === 0) this.phraseBeat = 0;            // tyst/ej låst → nollställ frasen
      // Räkna bara takter när BPM är PÅLITLIGT (confidence) → palettbytena
      // hamnar på riktiga fraser, inte på ett hoppigt/osäkert tempo.
      else if (beatTick && frame.bpmConfidence > 0.35 && ++this.phraseBeat >= this.phraseBeats) {
        this.phraseBeat = 0;
        this.pickPalette(frame.centroid);
      }
      setPalette(PALETTE_LOCK ?? PALETTES[this.paletteIdx].sectors);
    } else {
      setPalette(PALETTE_LOCK ?? ALL_SECTORS);             // manuella lägen: obegränsad färg (om ej låst)
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
    if (frame.level >= INPUT_OFF_LEVEL) this.inputLowSince = 0;
    else if (!this.inputLowSince) this.inputLowSince = now;
    this.inputOff = !!this.inputLowSince && now - this.inputLowSince > INPUT_OFF_MS;

    // TYSTNADSGRIND = HARD INGANGSGRANS (se konstanten ovan). Slackgransen ar ratten i /setup (cfg.silenceLevel) - enda kallan.
    const silenceLevel = this.cfg.silenceLevel ?? SILENCE_LEVEL;
    // SLACKTID (cfg.silenceHoldS, /setup): slack forst nar nivan legat under gransen sa lange; tand direkt. 0 = direkt (som forr).
    if (frame.level > silenceLevel) { this.silenceGate = 1; this.belowSince = 0; }
    else {
      const holdMs = Math.max(0, Math.min(5, this.cfg.silenceHoldS ?? 0)) * 1000;
      if (this.belowSince === 0) this.belowSince = performance.now();
      if (performance.now() - this.belowSince >= holdMs) this.silenceGate = 0;
    }
    // Warmup-räknare för baslinjen: ackumulera medan aktiv, nollställ vid tystnad.
    if (this.silenceGate > 0.5) this.warmMs += dtSec * 1000; else this.warmMs = 0;
    if (effMode === "wave") this.wavePhase += dtSec * (1.6 + audio * 4);

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
    // (Vantelaget - andning efter 90 s tystnad - och vilogloden borttagna 2026-10-10: tystnad = morkt.)
    // ENERGIN APPLICERAS EN GANG (RGB, se ENERGY_SIMPLE). DIM-taket (vu/range/CEIL_FLOOR/minnestak/intoning) borttaget 10-08.
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
    this.lookPlayMs.set(this.smartMode, (this.lookPlayMs.get(this.smartMode) ?? 0) + dtMs);
    // (Den gamla nivakedjan - intensity/LIVE_LEVEL-fonster mot ankare, shape-smoothing, log-release, lightLoud - borttagen 2026-10-10:
    //  ljuset styrs av energin nedan, och drop-kontrollen laser samma energi.)
    let md: number;
    {   // ENKEL ENERGI (se ENERGY_SIMPLE-dokumentationen). md0/sektionsgas/rang borttagna 10-08.
      // FOLJANDE FONSTER (se E_WIN_S)
      const db = 20 * Math.log10(Math.max(1e-5, frame.levelVU ?? frame.level));
      if (Number.isNaN(this.eHi) && frame.level > INPUT_OFF_LEVEL) { this.eHi = db; this.eLo = db; }
      const k = Math.min(1, dtSec / E_WIN_S);
      if (frame.level > INPUT_OFF_LEVEL) {   // tystnad flyttar inte fonstret (se TYSTNAD RAKNAS INTE)
        const dw = db;
        this.eHi = dw > this.eHi ? dw : this.eHi + (dw - this.eHi) * k;
        this.eLo = dw < this.eLo ? dw : this.eLo + (dw - this.eLo) * k;
      }
      const span = Math.max(E_MIN_DB, this.eHi - this.eLo);
      let e = (db - (this.eHi - span)) / span;
      e = e < 0 ? 0 : e > 1 ? 1 : e;
      if (e !== e) e = 0;   // inget fonster an (bara tystnad sedan start)
      if (E_TOP < 1) e = e >= E_TOP ? 1 : e / E_TOP;   // ENERGINS TOPP (se E_TOP)
      this.eSm = e > this.eSm ? e : this.eSm + (e - this.eSm) * (1 - Math.exp(-dtSec * 1000 / E_RELEASE_MS));
      // (volymfönstret ovan - eSm - styr inte ljuset längre, bara dropens efterkontroll (DROP_LAND_GAIN); orört så dropsen är desamma)
      // BASENERGIN (se B_CURVE): baskroppen (frame.bodyDb, sub+kick+bas i rå dB) i ett följande fönster - topp direkt upp/E_WIN_S ner,
      // dal direkt ner/B_LO_S upp - energin mäter hur långt över basens senaste dal vi är: varje bastryck svänger över skalan.
      const bdb = frame.bodyDb ?? -90;
      if (Number.isNaN(this.bHi) && frame.level > INPUT_OFF_LEVEL) { this.bHi = bdb; this.bLo = bdb; }
      if (frame.level > INPUT_OFF_LEVEL) {   // tystnad flyttar inte fönstret
        this.bHi = bdb > this.bHi ? bdb : this.bHi + (bdb - this.bHi) * k;
        this.bLo = bdb < this.bLo ? bdb : this.bLo + (bdb - this.bLo) * Math.min(1, dtSec / B_LO_S);
      }
      const bSpan = Math.max(B_MIN_DB, this.bHi - this.bLo);
      let eb = (bdb - (this.bHi - bSpan)) / bSpan; eb = eb < 0 ? 0 : eb > 1 ? 1 : eb; if (eb !== eb) eb = 0;
      if (E_TOP < 1) eb = eb >= E_TOP ? 1 : eb / E_TOP;   // ENERGINS TOPP (se E_TOP)
      this.eBass = eb > this.eBass ? eb : this.eBass + (eb - this.eBass) * (1 - Math.exp(-dtSec * 1000 / E_RELEASE_MS));   // upp direkt, ner E_RELEASE_MS (som förr)
      this.eSimple = this.eBass;
      const eFloor = Math.max(0, Math.min(0.5, this.cfg.energyFloor ?? 0.2));   // "Lägsta nivå" i /setup
      let lift = this.dropEnv;   // DROPS OCH MINIDROPS LYFTER (se DROP_LIFT_MS / MINI_LIFT_MS): energin släpper helt och glider tillbaka
      if (CONCERT && nowWall < this.dropLiftUntil + DROP_LIFT_FALL_MS) { const left = this.dropLiftUntil - nowWall; lift = Math.max(lift, left >= 0 ? 1 : 1 + left / DROP_LIFT_FALL_MS); }
      if (CONCERT && nowWall < this.miniLiftUntil + MINI_LIFT_FALL_MS) { const left = this.miniLiftUntil - nowWall; lift = Math.max(lift, left >= 0 ? 1 : 1 + left / MINI_LIFT_FALL_MS); }
      md = drive * Math.min(1, Math.max(eFloor + (1 - eFloor) * Math.pow(this.eBass, B_CURVE), lift));   // bara dampning: aldrig over 1
      md = Math.pow(md, E_LIN_INV);   // ENERGIN I DMX-PROCENT (se E_LIN)
    }
    // SCENISKT DJUP (scenic anchor): i "alla-flänger"-lägena hålls mittlamporna
    // som FASTA uplights i en djup, mättad palettfärg (~40%) medan ytterlamporna
    // kör full gas. Ger arkitektoniskt djup — rörelsen poppar mot en stabil bas.
    // Antar lampor i rad V→H (ägar-toggle). Grupp-effekterna (rave/flip/gallop/
    // twin) har redan rumslig struktur → undantagna.
    const useAnchor = this.cfg.scenicAnchor && count >= 3 && EffectEngine.ANCHOR_MODES.has(effMode);
    const anchorPal = currentPalette();
    const anchorHue = (anchorPal[anchorPal.length - 1] ?? 0) / 6;   // palettens djupaste ton


    // ── EFFEKT-KONTEXT (framräknat en gång per frame; idx/fx/band muteras per
    // lampa så samma objekt återanvänds → ingen allokering i loopen) ──────────
    const hasBeat = beatLocked(this.cfg.beat);
    const beatFrac = beatPhase(this.cfg.beat, Date.now(), this.showLead);
    // TAKT-RÄKNARE med graceful degradation: stegar på GRID-slaget (beatTick) när
    // BPM är låst, annars på VERKLIGA kicks (frame.kick). Så grid-effekterna
    // (snap/rave/party/ripple/…) fortsätter dansa på trummorna även när BPM-låset
    // tappas, i st.f. att frysa på beatIdx=0. Alla effekter använder beatIdx
    // MODULÄRT (färg/grupp/position) → ren drop-in.
    let beatHit = beatTick || (!hasBeat && kickHit);   // DISKRET flank: takten gick just fram (grid-slag, annars verklig kick)
    let beatFracFx = beatFrac;
    if (this.pulseHalved && hasBeat) {
      // HALVERAD EFFEKT-KLOCKA: två riktiga slag = ett effekt-slag. Paritet 0 = "ett", 1 = "två".
      if (beatHit) { this.halfTick ^= 1; if (this.halfTick === 0) this.beatCounter++; else beatHit = false; }
      beatFracFx = (this.halfTick + beatFrac) / 2;
    } else { this.halfTick = 0; if (beatHit) this.beatCounter++; }
    const beatIdx = this.beatCounter;
    // beatPulse: grid-puls när låst, annars den VERKLIGA kick-envelopen → pulsar
    // ALLTID på musiken. (Utan detta gav beatFrac=0 → beatPulse=1 konstant = ingen
    // puls när BPM ej låst → party/pulse/bounce lyste bara jämnt högt.)
    const _bf = 1 - beatFracFx;
    const beatPulse = hasBeat ? _bf * _bf : kickEnv;
    // EFFEKT-EGEN HJARTPULS (kontraktet i types.ts): hjartats form (hjarta.ts) pa effekt-klockan, ettan lite starkare.
    let heartPulse = kickEnv;
    if (hasBeat) {
      const f = beatFracFx;
      const lub = Math.exp(-f / 0.10), dub = f > 0.22 ? Math.exp(-(f - 0.22) / 0.09) * 0.55 : 0;
      heartPulse = Math.max(lub, dub) * ((beatIdx & 3) === 0 ? 1 : 0.85);
    }
    const beatMs2 = beatPeriod(this.cfg.beat);
    const tempoDeep = Math.max(0, Math.min(1, (beatMs2 - 340) / 260));   // 0 snabbt .. 1 långsamt
    const punchFloor = 0.5 - tempoDeep * 0.42;                            // 0.5 (snabbt) .. 0.08 (långsamt)
    // Per-lampa frekvensband (driver aurora/twin + fixture.bands).
    // NU ur dubbel-FFT:ns separerade, per-band-AGC-spektrum i stället för det grova
    // 512-trebandet → renare, mer musikaliskt per-lampa-svar som alltid nyttjar range.
    const s = frame.spec;
    const bands = this.bandsBuf;
    bands[0] = Math.max(s.kick, s.bass);                                       // "bass": låg-end (kick+bas)
    bands[1] = Math.max(s.lowMid, s.mid);                                      // "mid": röst/synth/virvel
    bands[2] = Math.max(s.treble, s.air);                                      // "treble": hi-hats/cymbaler/luft
    bands[3] = Math.min(1, Math.max(s.kick, frame.onset.kick) * 0.6 + kickEnv * 0.6);  // "kick": transient
    bands[4] = Math.max(0, (0.5 - audio) * 2) * 0.6;                           // "low": lugn glöd när tyst, ur vägen när högt
    // DRUM-KIT onset-envelopes: nu FÄRDIGBERÄKNADE i analysern PÅ HOP-TAKT (375Hz)
    // → varje anslag fångas, aldrig missat mellan två render-frames. Effekten är en
    // ren konsument. (Flyttat hit; tau 60/110/150ms bevarade i analyser.ts.)
    // GRAVITATIONS-VU: ljudet knuffar nivån UPP; sen faller den med gravitation.
    // En separat peak-prick håller senaste toppen och sjunker långsamt.
    // Knuffas UPP av låg-enden (kick-anslag + bas), inte av bred-bandsnivån →
    // varje kick är en fysisk knuff uppåt, sen faller den. Litet audio-golv så
    // sustained höga partier håller den delvis uppe.
    const gPush = Math.max(frame.onset.kick, frame.spec.sub, frame.spec.bass * 0.9, audio * 0.4);
    if (gPush > this.gravLevel) { this.gravLevel = gPush; this.gravVel = 0; }   // knuff upp
    else { this.gravVel -= 2.8 * dtSec; this.gravLevel = Math.max(0, this.gravLevel + this.gravVel * dtSec); }
    if (this.gravLevel > this.gravPeak) this.gravPeak = this.gravLevel;
    else this.gravPeak = Math.max(0, this.gravPeak - 0.45 * dtSec);   // peak sjunker långsamt
    // Effekternas önskemål om specialenheter, samlade över lamporna.
    let wantStrobe = 0, wantBlinder = 0, wantUv = 0, wantLaser = 0, wantHazer = 0, wantCo2 = 0, wantFogFx = false;
    const effect = EFFECT_MAP.get(effMode);
    const ctx = this.ctx;
    ctx.cfg = this.cfg; ctx.frame = frame; ctx.t = t; ctx.count = count;
    ctx.section = frame.section || 'intro'; ctx.sectionAgeMs = frame.sectionAgeMs || 0; ctx.sectionIndex = frame.sectionIndex || 0;
    ctx.sectionEntry = Math.max(0, 1 - (frame.sectionAgeMs || 1e9) / 400); ctx.sectionTier = frame.sectionTier ?? 1; ctx.expectHighInMs = frame.expectHighInMs ?? -1; ctx.levelVsHighDb = frame.levelVsHighDb ?? 0; ctx.repeatSim = frame.repeatSim || 0;
    // PUNCH MED AVKLINGNING (2026-10-10): bassPunch spikade ruta for ruta och gav fladder rakt in i ljuset (chase 39 -> 4 utan den).
    // Upp direkt, ~120 ms avklingning - dunken behaller sin skarpa uppgang men blir EN puls i stallet for ett flimmer.
    this.punchEnv = Math.max(bassPunch, this.punchEnv * Math.exp(-dtSec / 0.12));
    ctx.audio = audio; ctx.kickEnv = kickEnv; ctx.punch = this.punchEnv;
    ctx.dropEnv = this.dropEnv; ctx.gravLevel = this.gravLevel;
    ctx.gravPeak = this.gravPeak; ctx.drum = frame.drum;
    {   // GLITTER-ENVELOPER (se types.ts trebleEnv/airEnv): upp direkt, ~120 ms avklingning
      const gk = Math.exp(-dtSec / 0.12), o = frame.onset;
      this.trebleEnv = Math.max(o?.treble ?? 0, this.trebleEnv * gk); this.airEnv = Math.max(o?.air ?? 0, this.airEnv * gk);
      ctx.trebleEnv = this.trebleEnv; ctx.airEnv = this.airEnv;
    }
    ctx.beatIdx = beatIdx; ctx.hueIdx = HUE_PHRASE ? Math.floor(beatIdx / 16) * 16 : beatIdx; ctx.beatFrac = beatFracFx; ctx.beatPulse = beatPulse; ctx.heartPulse = heartPulse;
    // TVAGRUPPERING: vaxlar per look (smartCount) och var 32:e slag - "skiftar ibland mellan varannan och inre/yttre".
    ctx.grouping = (((this.smartCount + (beatIdx >> 5)) & 1) === 1) ? 'innerouter' : 'varannan';
    // LAMPORDNINGEN VÄXLAR (ägaren i ladan 10-11 21:5x: "effekten som togglar mellan lampor, vore snyggt om den inte alltid kör samma
    // håll, eller ytter/inner osv"): c.idx = lampans plats i ordningen framåt / bakåt / utifrån-in / inifrån-ut, byts per look och var
    // 32:a slag som grupperingen. Svep, pendlar och ekon går då åt olika håll; c.group (två grupper) är oförändrad.
    const ordSel = (this.smartCount * 3 + (beatIdx >> 5)) & 3;
    ctx.beatHit = beatHit; ctx.hasBeat = hasBeat;
    // UPPBYGGNADENS FÖRLOPP (ladan 10-11 22:05: "kändes inte som den laddade för en drop"): analysatorns buildUp är död på ladans
    // material (max 0,17 på 115 min), så build-effekterna trappade aldrig upp. buildProg = slag sedan sektionen blev build / 32
    // (0..1), räknat från uppbyggnadens START (inte lookens - looken kan bytas mitt i), håller över < 2 s sektionsfladder.
    { const nw = Date.now();
      if (frame.section === 'build') { if (this.buildSecAt === 0 || nw - this.buildSecSeen > 2000) this.buildSecAt = nw; this.buildSecSeen = nw; }
      const beatMs = (this.cfg.beat?.bpm ?? 0) > 0 ? 60000 / this.cfg.beat!.bpm : 500;
      this.buildProg = this.buildSecAt > 0 && nw - this.buildSecSeen <= 2000 ? Math.min(1, (nw - this.buildSecAt) / (32 * beatMs)) : 0; }
    ctx.wavePhase = this.wavePhase; ctx.buildUp = Math.max(frame.buildUp, this.buildProg);
    ctx.phaseSpread = 1 + ctx.buildUp * 2.5; ctx.punchFloor = punchFloor;
    ctx.chasePos = this.chasePos; ctx.dropFired = this.dropFired;
    ctx.dropHue = this.dropHue; ctx.now = performance.now();
    // BASNOTER: flank pa onset.bass (per-band anslag 0..1, adaptiv baslinje) med 90 ms cooldown -> ett steg per basnot.
    { const bo = frame.onset?.bass ?? 0;
      if (bo >= 0.30 && bo - this.prevBassOnset >= 0.10 && now - this.lastBassNoteMs >= 90) { this.bassNoteIdx++; this.lastBassNoteMs = now; }
      this.prevBassOnset = bo; }
    ctx.sectionBars = frame.sectionBars ?? 0; ctx.bassline = frame.profile?.bassline ?? 0;
    ctx.bassNoteIdx = this.bassNoteIdx; ctx.bassNoteAge = Math.min(9, (now - this.lastBassNoteMs) / 1000);
    ctx.want.strobe = undefined; ctx.want.blinder = undefined;
    ctx.want.uv = undefined; ctx.want.laser = undefined; ctx.want.fog = undefined;
    ctx.want.hazer = undefined; ctx.want.co2 = undefined;

    // STROBE (2026-10-10): riser-stroben och dess Hz-tak ar borttagna; strobe-effekten (effects/strobe.ts) blixtrar i RGB en gang per slag
    // och valjs bara vid >= 150 BPM (registry). Lampornas egen strobe-kanal drivs inte (strobe.ts saknar `drives`).
    // (Riser-stroben - vit-kollaps + accelererande strobe under risers, cfg.riserStrobe - borttagen 2026-10-10; build-effekterna tar risern.)

    // SPECIALKANALER (hazer/uv/blinder/strobe/laser/co2). Effektens `drives`-tagg
    // avgör om motorn tänder dem denna frame. Värdena hämtas från samma signaler
    // som färg-renderingen: audio-nivå, kick, drop, riser-strobe. Roller utan
    // matchande drive-tagg = 0 (svart) → knivskarp av/på, ingen läckage mellan
    // effekter. Kanalerna maskas ur ballistiken längre ner (samma spår som
    // strobe) så pulser inte tonas ut och sätter fixtures i mellanhastigheter.
    const drives = effect?.drives;
    // (skrapjakten 10-01: has/exact/clamp255 var tre closures + ett nytt objekt per ruta; nu modulfunktioner + this.specBuf)
    const specialty = this.specBuf;
    specialty.hazer   = drivesHas(drives, "hazer")   ? clamp255(exactHas(effect, "hazer") ? wantHazer * 255 : Math.max(140 + audio * 60, wantHazer * 255)) : 0;
    specialty.uv      = drivesHas(drives, "uv")      ? clamp255(exactHas(effect, "uv") ? wantUv * 255 : Math.max(180 * md, wantUv * 255)) : 0;
    specialty.blinder = drivesHas(drives, "blinder") ? clamp255(exactHas(effect, "blinder") ? wantBlinder * 255 : Math.max(kickEnv * 255, this.dropEnv > 0.6 ? 255 : 0, wantBlinder * 255)) : 0;
    specialty.strobe  = drivesHas(drives, "strobe")  ? clamp255(exactHas(effect, "strobe") ? wantStrobe * 255 : Math.max(effMode === "strobe" ? 210 : 0, wantStrobe * 255)) : 0;
    if (DROP_STROBE > 0 && nowWall < this.dropBangUntil) specialty.strobe = Math.max(specialty.strobe, DROP_STROBE);   // STROBE VID DROPEN (se DROP_STROBE)
    specialty.laser   = drivesHas(drives, "laser")   ? clamp255(Math.max(180 + audio * 75, wantLaser * 255)) : 0;
    specialty.co2     = drivesHas(drives, "co2")     ? clamp255(Math.max(this.dropEnv > 0.85 ? 255 : 0, wantCo2 * 255)) : 0;

    const inputGate = this.inputOff ? 0 : 1;   // ingangen avstangd -> morkt (del av steg 2)
    this.fxPeakNow = 0;
    const fadeK = Math.exp(-dtSec / (FADE_MIN_S / E_LIN_INV));
    const renderNow = performance.now();
    const fxToggle = !!EFFECT_MAP.get(effMode)?.toggle;   // toggle-effekt: ingen grundniva (se effektNiva)
    const fxSparse = LAMP_STAIR && (frame.section === 'low' || frame.section === 'intro') && !SPARSAM.includes(effMode) && count >= 4;   // LAMPTRAPPA (se SPARSAM)
    const fastLight = !!EFFECT_MAP.get(effMode)?.fastLight; this.fxFast = fastLight;   // effekten skippar minsta pa-tid (EffectDef.fastLight)   // STEG 2: uttoningens tidskonstant i DMX-ljus (FADE_MIN_S x gamma fore gamman)
    for (let i = 0; i < count; i++) {
      const fx = this.cfg.fixtures[i];
      const isAnchor = useAnchor && i > 0 && i < count - 1;   // mittlamporna = ankare
      let rgb: [number, number, number]; let lampWantE: boolean | undefined;
      if (isAnchor) {
        rgb = hsvToRgb(anchorHue, 1, 0.4 + 0.06 * Math.sin(t * 0.5 + i));   // fast pelare, knappt levande andning
      } else {
        ctx.lamp = i;
        { const n = count, e = Math.min(i, n - 1 - i), side = i < n - 1 - i ? 0 : 1;   // e = avstånd till närmaste kant
          ctx.idx = ordSel === 0 ? i : ordSel === 1 ? n - 1 - i : ordSel === 2 ? Math.min(n - 1, 2 * e + side) : Math.max(0, n - 1 - (2 * e + side)); }
        ctx.group = ctx.grouping === 'innerouter' ? ((count < 3 ? i % 2 === 1 : (i === 0 || i === count - 1)) ? 1 : 0) : i % 2;
        ctx.fx = fx;
        ctx.want.strobe = undefined; ctx.want.blinder = undefined;
        ctx.want.uv = undefined; ctx.want.laser = undefined; ctx.want.fog = undefined;
        ctx.want.hazer = undefined; ctx.want.co2 = undefined; ctx.want.energy = undefined;
        if (fx?.bands?.length) { let mb = -Infinity; for (let k = 0; k < fx.bands.length; k++) mb = Math.max(mb, bands[BAND_IDX[fx.bands[k]]]); ctx.band = mb; }   // = Math.max(...fx.bands.map(...)) utan spread/closure
        else ctx.band = bands[i % bands.length];
        rgb = effect ? effect.render(ctx) : [0, 0, 0];
        rgb = this.effektNiva(rgb, ctx, blackout, fxToggle, fxSparse);   // STEG 1 forts.: effektens niva och drop-looken (se effektNiva)
        // EFFEKTENS ÖNSKEMÅL. Den vet sin egen dramaturgi bäst; motorn avgör om det
        // blir av (fixturen måste ha rollen, och rök går genom hårdvaruskyddet).
        // Högsta önskemål bland lamporna vinner — en effekt som vill stroba på EN
        // lampa menar rimligen hela riggens strobe.
        if (ctx.want.strobe !== undefined) wantStrobe = Math.max(wantStrobe, ctx.want.strobe);
        if (ctx.want.blinder !== undefined) wantBlinder = Math.max(wantBlinder, ctx.want.blinder);
        if (ctx.want.uv !== undefined) wantUv = Math.max(wantUv, ctx.want.uv);
        if (ctx.want.laser !== undefined) wantLaser = Math.max(wantLaser, ctx.want.laser);
        if (ctx.want.hazer !== undefined) wantHazer = Math.max(wantHazer, ctx.want.hazer);
        if (ctx.want.co2 !== undefined) wantCo2 = Math.max(wantCo2, ctx.want.co2);
        if (ctx.want.fog) wantFogFx = true;
        lampWantE = ctx.want.energy;
      }
      // TRE STEG FOR LJUSET (agaren 2026-10-10: "jag vill bara ha 3 stallen dar ljuset styrs"):
      //   1. EFFEKTEN satter ljusstyrka per lampa och per R/G/B - och om ljuset far andras efter (modulate.energy, standard ja).
      //   2. ENERGIN (om effekten tillater): en faktor 0..1 ur basen (BASENERGIN, se B_CURVE) med justerbar uttoning (DMX_E_RELEASE_MS); ingangsgransen
      //      (tystnad/avstangd ingang) galler alltid.
      //   3. KALIBRERINGEN sist (out.writeFixture: gamma; out.calibrate: tandpunkt+1 .. 95 %, full drop -> 100 %, dimmern konstant).
      //   Inget annat ror ljuset: ingen normering, grundniva, dropfarg/vit karna, minidrop-lyft, riser-strobe, vantelagesglod eller
      //   utgangstoning (backup fore: git-taggen backup/fore-tre-steg-2026-10-10).
      const m0 = rgb[0] > rgb[1] ? (rgb[0] > rgb[2] ? rgb[0] : rgb[2]) : (rgb[1] > rgb[2] ? rgb[1] : rgb[2]);
      // ENERGI PER LAMPA (EffectWants.energy): effekten bestammer; osatt -> modulate.energy.
      const useE = lampWantE ?? modulateOf(effMode).energy;
      // (SPOT-regeln, UNIFORM:s ovalda par och taktdippen KICK_E borttagna 10-12 - förbivägar/dubbelmodulering, se B_CURVE)
      const k = inputGate * (useE ? md : drive);
      rgb[0] *= k; rgb[1] *= k; rgb[2] *= k;
      // ENERGIN SLACKER ALDRIG (agaren 2026-10-10: "energi skall aldrig slacka om effekten vill ha pa en lampa"): vill effekten ha
      // lampan tand (m0 > 0) och ingangen ar pa (k > 0) halls den pa lagst 1 % (gammans forsta steg -> utgangens tandpunkt+1).
      // Bara effekten sjalv eller slackgransen (tystnad) slacker. Kuloren bevaras (alla kanaler med samma faktor).
      if (m0 > 0 && k > 0) {
        const m = rgb[0] > rgb[1] ? (rgb[0] > rgb[2] ? rgb[0] : rgb[2]) : (rgb[1] > rgb[2] ? rgb[1] : rgb[2]);
        if (m < E_MIN_LIT) { const g = E_MIN_LIT / Math.max(1e-9, m); rgb[0] *= g; rgb[1] *= g; rgb[2] *= g; }
      }
      // STEG 2 forts. - EN UTTONING (DMX_FADE_MIN_S, justerbar): lampans ljusstyrka upp direkt, ner med tidskonstanten; kuloren foljer
      // effekten direkt (slacker effekten lampan tonar den ut i sin sista kulor). Ersatter utgangens toning, sista toningen och
      // lookbytets toning (tre toningar -> en). Snabbare uttoning ar forbjudet (agaren 09-29) - standard 0,25 s som forr.
      {
        const mT = rgb[0] > rgb[1] ? (rgb[0] > rgb[2] ? rgb[0] : rgb[2]) : (rgb[1] > rgb[2] ? rgb[1] : rgb[2]);
        // MINSTA PA-TID (DMX_MIN_ON_MS, agaren i ladan 10-10: "kan man ge effekterna en minsta tankt 'pa' tid? nu blev det lite
        // flimrande igen"): en nivå lampan nått hålls minst MIN_ON_MS innan uttoningen börjar - korta blixtar blir en puls. Upp direkt.
        const holding = !fastLight && renderNow - this.lampPeakAt[i] < MIN_ON_MS;
        const fall = holding ? this.lampLvl[i] : this.lampLvl[i] * fadeK, o = i * 3;
        if (mT > 0) {
          // MINSTA PA-TID PER FARGKANAL (agaren 10-10: "lyser R sa far inte B bara komma igang under 100 ms"): en kanal som tands
          // halls tand minst CH_MIN_ON_MS med sin senaste andel av lampans ljus, aven om effekten slacker den direkt.
          for (let c = 0; c < 3; c++) {
            const q = o + c, r = rgb[c] / mT;
            if (r > 0) { if (this.chOnAt[q] === 0) this.chOnAt[q] = renderNow; this.lampRatio[q] = r; }
            else if (!fastLight && this.chOnAt[q] !== 0 && renderNow - this.chOnAt[q] < CH_MIN_ON_MS) rgb[c] = this.lampRatio[q] * mT;   // hall kvar
            else { this.chOnAt[q] = 0; this.lampRatio[q] = 0; }
          }
        }
        if (mT >= fall) { if (mT > this.lampLvl[i] + 0.005 || !holding) this.lampPeakAt[i] = renderNow; this.lampLvl[i] = mT; }
        else {
          this.lampLvl[i] = fall;
          rgb[0] = this.lampRatio[o] * fall; rgb[1] = this.lampRatio[o + 1] * fall; rgb[2] = this.lampRatio[o + 2] * fall;
        }
      }
      const strobeVal = effMode === "strobe" ? 210 : 0;
      this.out.writeFixture(this.universe, fx, rgb, 1, strobeVal, specialty);
    }

    if (E_NORM_S > 0) { this.fxPeak = Math.max(this.fxPeakNow, this.fxPeak * Math.exp(-dtSec / E_NORM_S)); this.fxNorm = Math.min(E_NORM_MAX, 1 / Math.max(0.05, this.fxPeak)); }   // STEG 1: effektens topp
    // Bygg strobe-masken bara när fixtures ändras (inte varje frame).
    this.out.build(this.cfg.fixtures);
    // MATNING (grindar inget): när nivån är LÅG, vad är det som ändå håller
    // ljuset uppe? Varje steg i kedjan loggas så orsaken kan pekas ut i stället
    // för att gissas. Strypt till var 1,5 s. Gjort utanför apply för att slippa
    // skapa ett objekt i den heta postprocess-loopen.
    if (frame.level < 0.35 && Date.now() - this.lowLogAt > 1500) {
      this.lowLogAt = Date.now();
      if (isLogOn()) console.log(   // strangen byggs bara nar loggen ar pa (DMX_QUIET=0)
        `[lagniva] niva ${frame.level.toFixed(3)} ` +
        ` drive ${this.silenceGate.toFixed(2)} md ${md.toFixed(2)} e ${this.eSm.toFixed(2)} drop ${this.dropEnv.toFixed(2)}/${this.dropColEnv.toFixed(2)} fonster ${this.eLo.toFixed(1)}..${this.eHi.toFixed(1)} dB` +
        ` intensitet ${frame.intensity.toFixed(2)} konf ${frame.bpmConfidence.toFixed(2)}` +
        ` tillit ${this.beatTrust.toFixed(2)} effekt ${this.smartMode}`
      );
    }

    // STEG 3 - KALIBRERINGEN, sist (se TRE STEG FOR LJUSET).
    // SEKTIONENS TAK (ägaren 10-12: "lampor skall lysa olika och inte alla vara tända" + refrängen starkast): taket för den LJUSASTE
    // lampan per sektion - versen/introt/breaket toppar lägre, builden stiger mot dropen, refrängen och dropen når fullt.
    if (CONCERT) {
      const sec = frame.section ?? '';
      const vc = Math.max(0.3, Math.min(1, this.cfg.verseCeil ?? SEC_CEIL)), bc = Math.max(vc, SEC_CEIL_BUILD);   // "Tak i vers" i /setup
      let tgt = sec === 'high' || sec === '' ? 1 : sec === 'build' ? vc + (bc - vc) * this.buildProg : vc;
      if (this.dropColEnv > 0.005 || nowWall < this.dropLiftUntil + DROP_LIFT_FALL_MS) tgt = 1;   // dropen alltid fullt
      else if (nowWall < this.miniBangUntil) { tgt = 1; this.secCeil = 1; }                   // minidrop-looken alltid till 95 % (ägaren 10-12), direkt
      else if (nowWall < this.miniLiftUntil) tgt = Math.min(1, tgt + 0.15);                    // minidropen lyfter taket
      const r = tgt > this.secCeil ? dtNow / 0.3 : dtNow / 2.0;                                  // upp snabbt, ner långsamt
      this.secCeil += Math.max(-r, Math.min(r, tgt - this.secCeil));
    }
    this.out.calibrate(this.universe, this.cfg.fixtures, this.cfg.master ?? 1, performance.now(), this.dropColEnv, CONCERT ? this.secCeil : 1);

    // Rök: motorn avgör OM den ska spruta, output-tjänsten var signalen hamnar.
    // RÖK: motorn samlar önskemålen — drop, manuell knapp, eller en effekt som bett om
    // det — och output-tjänsten avgör om maskinen KAN (värmebudget, cooldown, nödstopp).
    if (fog) {
      // MANUELL puff (Rök nu) kringgår cooldownen: ägaren trycker medvetet. Värmeskyddet (heatOk)
      // och pågående-puff-spärren gäller fortfarande. Utan detta tappades knappen TYST inom 2 min
      // efter varje drop-rök (ladan 2026-09-04: bursts stod still, ingen feedback i UI:t).
      const manualFog = !!this.cfg.fogTrigger;
      // HUNGER: lange sedan senaste puff -> aven en minidrop eller intrade i high-sektion far bli rok.
      const sec = frame.section ?? '';
      const highEntry = sec === 'high' && this.fogLastSec !== '' && this.fogLastSec !== 'high';
      if (sec) this.fogLastSec = sec;
      const hungry = FOG_HUNGRY_S > 0 && fog.onDrop && nowWall - this.lastFogWall > FOG_HUNGRY_S * 1000;
      const wantBurst = (dropHitRaw && fog.onDrop) || manualFog || wantFogFx || (hungry && (miniHit || highEntry));
      if (this.cfg.fogTrigger) this.cfg.fogTrigger = false;   // engångs-flagga
      const spraying = this.out.fogTick(nowWall, _dtT * 1000, wantBurst, fog, manualFog);
      if (spraying && !this.fogWasSpraying) this.lastFogWall = nowWall;   // puffen startade (vilken orsak som helst)
      this.fogWasSpraying = spraying;
      if (fog.enabled) this.out.writeFog(this.universe, fog.address, spraying ? fog.level : 0);
    }
    return this.universe;
  }
}


