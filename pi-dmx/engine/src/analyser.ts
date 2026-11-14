/**
 * ENAD ANALYSATOR (2026-09-24) — en fil, samma byte i lotus-light-link (pi/src/audio-analyser/) och
 * dmx-control (pi-dmx/engine/src/). Deploy-skripten i båda repona vägrar deploya om filen skiljer
 * sig från den gemensamma (md5, se ANALYSER_SHARED_MD5 i respektive deploy-skript).
 *
 * SYSTEMSKILLNADER BARA VIA KONFIGURATION, aldrig via "vilket system är detta":
 *   - analyserProfile.ts (en fil per system, bredvid denna) ger env-prefixet och systemets
 *     standardvärden för de rattar där systemen i dag har olika standard.
 *   - Rattar med systemprefix läses som LOTUS_<X> eller DMX_<X> (eget prefix först, det andra som
 *     alias). Rattar utan prefix (BODY_RISE_DB, MINI_SPACING_MS ...) läses som de heter.
 *   - Utan env och med respektive profil beter sig analysatorn exakt som systemets analysator
 *     gjorde före sammanslagningen (bevisat hop för hop i paritetsbänken, tools/analyserParity.mjs).
 *
 * Analysatorn läser ljud (process) och levererar Frame. Den vet inget om vad konsumenterna gör
 * med ljudet eller ramarna.
 */

import { PROFILE } from './analyserProfile.js';
/** frame.bassEnergy / bassEnergyShort: 0 = så många dB under taket (eller mer), 1 = vid taket. BRETT med avsikt - mätningen klipper
 *  så lite som möjligt; hur stor del av spannet ljuset använder väljer effektsidan (effects.ts B_SPAN_DB). */
export const BASS_SPAN_DB = 36;
import {
  REC_LEN, RING_N, R_SEQ, R_PERF, R_WALL, R_ENV, R_BASS, R_HIGH, R_FLAGS, R_HINT_MS, R_VCLOCK, R_SEC_N, R_SEC_INT, R_SEC_KICKS, R_SEC_BREAK,
  R_SEC_RMS2, R_SEC_CENT, R_SEC_DT, R_DROPS, R_ACTIVE, R_BUILD, R_SEC_SPEC0, R_SEC_WALL, R_TS, R_FLAGCNT, RING_MARGIN, FLAG_BITS, R_SEC_BON, R_SEC_BPK, R_SEC_FLUX, R_SEC_RMS4,
  packFlagCounts, lostFlags, seqLow, seqDelta, C_WAITING, C_STATE_SEQ, S_LOST_FLAGS,
  F_SIL350, F_SIL10, F_RESET_TEMPO, F_HINT, F_RESET_BAR, F_VCLOCK_SET, F_VCLOCK_NULL,
  C_WRITE, C_READ, S_REC_SEQ, S_BPM, S_CONF, S_BPMF, S_PHASE_MS, S_PHASE_CONF, S_SECTION, S_SEC_START, S_SEC_INDEX, S_SEC_TIER, S_BUILD_AT, S_BUILD_SEEN,
  S_REP_SIM, S_REP_AGO, S_REP_SEC, S_EXPECT_MS, S_EXPECT_SRC, S_PREV_SEC, S_LVL_HIGH, S_PROCESSED, S_LAG_MS, S_LAG_MAX, S_BUSY_US, S_BUSY_MAX_US, S_SKIPPED, STATE_LEN,
  SECTIONS, sectionCode, viewsOf, stateWrite, stateRead, createSplitBuffers, type SplitBuffers, type WorkerData,
  C_WAKE, syncWait, HopLaneFast, HopLaneSlow, StateReader, type HopFeed,
  R_BIGSEQ, R_CLOCK, R_CLOCK_CONF, BIG_REC_LEN, BIG_RING_N, BIG_HOP_MAX, B_SEQ, B_N, B_RMS, B_LVL, B_CENT, B_ACTIVE, B_WALL, B_KICK, B_KICKHIT, B_INT, B_BREAK, B_SEC, B_LVH, B_CONF,
  B_ENVF, B_ENVBPM, C_WAITING_B, C_BIG_WRITE, C_BIG_READ, C_BIG_SEQ, BS_SEQ, BS_BODY, BS_DROPS, BS_MINI, BS_BUILD, BS_RISER, BS_PUNCH, BS_BASS, BS_BRIGHT, BS_BEAT,
  BS_BASSLINE, BS_SPEC_N, BS_SKIPPED, BS_CAND, BS_DEMOTED, BS_SPACED, BS_DROPRISE, BS_NEAR, BS_NEARDIP, BS_LIFT, BS_STOPS, BS_STOPSEC, BS_UNDER, BIG_STATE_LEN, SPEC_SLOTS, SPEC_MAX,
} from './split.js';
import FFT from "fft.js";
import { BeatFeed, publishPhase, type ClockCfg } from "./analyserClock.js";   // ANALYSATORNS KLOCKA (a7r): tempogram, rutnät, etta, tillit
import { DropDetector } from "./analyserDrop.js";
import { SectionTracker } from "./analyserSection.js";
import { RiserDetector } from "./analyserRiser.js";
import { CharacterProfile } from "./analyserCharacter.js";
import { KickDetector } from "./analyserKick.js";
import { BassTracker } from "./analyserBass.js";
import { LevelTracker } from "./analyserLevel.js";

// ── RATTAR ─────────────────────────────────────────────────────────────────────────────────────
const ENV: Record<string, string | undefined> | undefined = typeof process !== 'undefined' ? process.env : undefined;
const ALIAS_PREFIX = PROFILE.envPrefix === 'LOTUS_' ? 'DMX_' : 'LOTUS_';
function sysEnv(name: string): string | undefined {
  return ENV?.[PROFILE.envPrefix + name] ?? ENV?.[ALIAS_PREFIX + name] ?? PROFILE.sys[name];
}
/** TEMPOKÄLLAN (EN KLOCKA FÖR BÅDA, klocka a8 11-09): klockan (analyserClock.ts) är analysatorns ENDA tempo, fas och tillit i BÅDA
 *  profilerna. Lotus egen sökning (computeBpm/scoreEnv/alignScore/shiftDetect) och gridfasen (computeGridPhase) är borttagna;
 *  profilen väljer bara VAR klockan körs (sys.BEAT_FEED 'slow' = taktvägen i workern, annars sist i process(), se clockMode). */
/** Ratt UTAN prefix (namnet som det star), sedan profilens standard. */
function env(name: string): string | undefined {
  return ENV?.[name] ?? PROFILE.bare[name];
}
/** Sann om ratten ar satt till nagot icke-tomt (motsvarar `!!process.env.X`). */
function sysOn(name: string): boolean { return !!sysEnv(name); }
// Rattar som lases i tatslingan (per hop) - lases EN gang vid modulladdning.
const HIGH_ON = sysOn('HIGH_DIAG') || false;
const BPM_TRACE = sysOn('BPM_TRACE');
export const DROP_TRACE = sysOn('DROP_TRACE');
/** SEKTIONSBLOCKENS TAKT: 'env' = blocksummor per env-sampel (100 Hz; identiskt i odelad och delad analysator),
 *  'hop' = sectionHop per hop i odelad analysator, spektrum ur band-dB (aldre vagen). */
const SECTION_AGG = sysEnv('SECTION_AGG') || 'env';
export const SECTION_AGG_HOP = SECTION_AGG === 'hop';
/** Rangpoangens buffert i 32-bitars flyttal (aldre vagen) i stallet for 64. */
export const SECTION_SCORE_F32 = sysEnv('SECTION_SCORE_F32') === '1';

export interface BeatGrid { bpm: number; anchorMs: number; confidence?: number; }

/** Detektionsparametrar. Objektet LASES LOPANDE (varje hop) - vardarna kan andras under drift. */
export interface AnalyserDetection { autoGainTarget: number; tauUp: number; tauDown: number; noiseFloor: number; maxGain?: number }

export interface AnalyserConfig {
  /** Platt form (lotus): */
  sampleRate?: number;
  hopSize?: number;
  /** Small-FFT size (default 512). Must match the hop rate the analyser is fed. */
  fftSize?: number;
  autoGainTarget?: number;
  tauUp?: number;
  tauDown?: number;
  noiseFloor?: number;
  /** Släckgränsen på frame.level (motorns cfg.silenceLevel), standard SILENCE_LEVEL. */
  silenceLevel?: number;
  /** Upper clamp for analyser gain. */
  maxGain?: number;
  /** Enable log-compressed, adaptively whitened and normalized onset features. */
  onsetEnhancements?: boolean;
  /** Nastlad form (DMX-motorns config-objekt): audio.rate, fft.size/hop, detection (lases lopande) och beat
   *  (taktrastret, lases lopande - motorn skriver det). Ges `detection` anvands objektet sjalvt, inte en kopia. */
  audio?: { rate: number };
  fft?: { size: number; hop: number };
  detection?: AnalyserDetection;
  beat?: BeatGrid | null;
  /** DELAD ANALYSATOR (split.ts): 'all' (standard, allt i en trad) | 'fast' (ljudvagen; tempo/sektion hamtas ur
   *  tillstandsblocket) | 'slow' (workern: matas ur SAB-ringen via drainRecords()). Kan aven ges som andra argument. */
  role?: 'all' | 'fast' | 'slow';
  split?: SplitBuffers;
  /** Seq att fortsatta fran (slow: senast LASTA record vid omstart av workern; fast: senast SKRIVNA).
   *  0/utelamnad = fran borjan. Full JS-seq (inte de 32 laga bitarna). */
  resumeSeq?: number;
}

/** DELAD ANALYSATOR (split.ts): rollen och de delade buffertarna, som andra argument till konstruktorn. */
export interface SplitInit {
  role: 'all' | 'fast' | 'slow';
  split?: SplitBuffers;
  resumeSeq?: number;
  /** Bänkens synk-läge (createAnalyser(cfg, 'sync')): snabba sidan väntar på workern, workern notify:ar efter publicering. */
  sync?: boolean;
}

/** Rikt log-spektrum (8 band) från den parallella 2048-FFT:n. Varje band är
 *  per-band AGC-normaliserat (0..1) så alla band nyttjar full range oavsett mix. */
export interface Spectrum {
  sub: number;      // ~20–60 Hz   — sub/808-rumble
  kick: number;     // ~60–120 Hz  — kick-grundton/kropp (nu SKILD från basen)
  bass: number;     // ~120–250 Hz — basgång/basnoter
  lowMid: number;   // ~250–500 Hz — låg kropp, toms, låg röst
  mid: number;      // ~0,5–1,2 kHz — röst, snare-kropp, synth
  highMid: number;  // ~1,2–3,5 kHz — snare-crack/presence (dedikerad backbeat-kanal)
  treble: number;   // ~3,5–10 kHz — hi-hats, cymbaler
  air: number;      // ~10–16 kHz  — luft/glitter
}

/** Släckgränsens standard (motorns cfg.silenceLevel saknas). */
export const SILENCE_LEVEL = 0.05;
let silenceLevelLive = SILENCE_LEVEL;
/** Samma tystnadsbeslut som frame.silent för den som bara har nivån (BoundaryDetector matad av verktyg utan ramens flagga). */
export function silentLevel(level: number): boolean { return level <= silenceLevelLive; }

export interface Frame {
  /** TYSTNAD (a7): level <= släckgränsen (cfg.silenceLevel, EN tröskel, sätts live via setSilenceLevel). Läses av effekternas
   *  släck-/ingångsgrind och låtgränsens 3 s-tystnad - ingen konsument har egen nivågräns för "tyst". */
  silent: boolean;
  level: number;        // 0..1, auto-gained RMS (15ms attack / 400ms release smoothed)
  levelRaw: number;     // 0..1, samma auto-gain men OSMOOTHAT (rå per-hop)
  levelVU: number;      // 0..1, ~200ms symmetriskt smoothat PÅ HOP-TAKT (375Hz) — för VU-taket
                        //  (ser alla hops → mycket mindre brus än att smootha rå på 50Hz)
  energy: number;       // 0..1, bass-band spectral energy (~0–1.5 kHz)
                        // mid/treble på 512-FFT:n är BORTA: ingen effekt läste dem — effektlagret
                        // använder spec.mid/spec.treble ur 2048-FFT:ns oktavband, som är bättre
                        // upplösta. Två EMA + två bandsummor per hop gick åt till ingenting.

  centroid: number;     // 0..1, spektralt tyngdpunkt: mörk/bastung → 0, ljus/diskant → 1
  flux: number;         // 0..1, bass-band spectral flux
  kick: boolean;        // true on rising edge only
  gain: number;         // current auto-gain factor (debug)
  bpm: number;          // 0 = ej låst; lokal tempo-estimat via autokorrelation
  bpmConfidence: number;// 0..1, hur tydlig vinnande takttoppen är (peak-to-mean)
  intensity: number;    // 0..1 SEKTIONSENERGI relativt låtens eget snitt (0.5 = snittet,
                        //  <0.34 breakdown, >0.78 drop/topp) — driver show-orkestreringen
  /** DROP-DETEKTION. dropCount är MONOTON: den ökar en gång per upptäckt drop, så
   *  en konsument på lägre takt (render 100Hz) kan jämföra mot sitt eget senaste
   *  värde och ALDRIG missa en flank (till skillnad från en enframs-boolean). */
  dropCount: number;    // monoton räknare — +1 per drop
  /** MINIDROP: mindre lyft (stigning MINI_RISE_DB efter kort svacka) som inte ar en full drop. Monoton. 0 nar MINI_SPACING_MS=0 (av). */
  miniDropCount: number;
  /** EN DROPDETEKTOR (a3, 11-09: förr effects.ts flankStep bredvid dropStep). dropCount = full drop på FLANKEN (break + smäll, efter
   *  spärren SHOW_DROP_GAP_MS). Detektorns lägre steg är minidrops: dropDemoted = slam-kandidat utan egen flank (inom 2 s),
   *  dropSpaced = flank inom spärren. Båda räknas också i miniDropCount. dropRiseDb = senaste flankens stigning (styrka). */
  dropDemoted: number; dropSpaced: number; dropRiseDb: number;
  /** LYFT/NÄSTAN-DROP/STOPP (a3, förr effects.ts stepLifts): VAD (> 0 medan villkoret håller) + STYRKA (dB).
   *  nearDropDb = språnget från dippens botten (dipp nearDipDb under 8 s-normalen), liftDb = kroppen 0,6 s över lugnet 6..2 s sedan,
   *  stopCount = basstopp 0,6-3 s som kom tillbaka (monoton), stopS = dess längd. Reaktionen (refraktär, look, lyft) ligger i effekterna. */
  nearDropDb: number; nearDipDb: number; liftDb: number; stopCount: number; stopS: number;
  inZone: boolean;      // nivån är i låtens topp-zon (ihållande tillstånd, hysteres)
  breaking: boolean;    // nivån är i en svacka/break (ihållande tillstånd)
  /** UPPBYGGNAD (riser): 0..1 tension som ramsar upp mot en drop. Mjuk signal →
   *  sampling-säker. Show-REAKTIONERNA (strobe, swell) ligger i effekt-motorn. */
  buildUp: number;
  /** UPPBYGGNADENS FÖRLOPP 0..1 (ägaren 11-12: 'Uppbyggnaden borde flyttas till långsamma analysatorn'; förr effects.ts buildProg):
   *  slag sedan sektionen blev 'build' / 32, räknat från uppbyggnadens START, och hålls över sektionsfladder kortare än 2 s.
   *  En mätning av hur långt uppbyggnaden gått - vad ljuset gör med den är effektens sak. */
  buildProg: number;
  inRiser: boolean;
  /** KARAKTÄRSPROFIL (~8s glidande) — vad SLAGS musik är detta? Dirigenten väljer
   *  effekt efter passform mot den här, inte bara efter energinivå.
   *    punch  = transienttäthet (fyra-på-golvet/trummigt ↔ svävande)
   *    bass   = låg-endens tyngd (sub+kick+bas mot resten)
   *    bright = klang uppåt (hi-hats/luft mot resten)
   *    beat   = hur tydlig takten är (BPM-konfidens) */
  profile: { punch: number; bass: number; bright: number; beat: number; bassline: number };   // bassline: TYDLIG BASGANG 0..1 (basnot-anslag per slag, ~1 s)
  beatAnchorMs: number; // wall-clock ms för ett taktslag (fas)
  /** >0 = ett trumslag är FÄRDIGMÄTT denna ruta: väggklocka för slagets flux-topp
   *  med sub-hop-precision (±1.3 ms). Kommer en hop EFTER frame.kick (parabeln
   *  behöver hoppet efter toppen) och är den enda tidsstämpel PLL:en får mäta
   *  fasfel mot — Date.now() vid rutans behandling bär ALSA-leveransens jitter. */
  kickAtMs: number;
  /** TAKTFAS: hur många slag ankaret ska flyttas FRAMÅT för att landa på ettan
   *  (0..3), eller -1 när fasen ännu är osäker. Motorn äger ankaret och applicerar. */
  barShift: number;
  /** GRIDFAS (09-20, opt-in LOTUS_GRID_PHASE=1): vaggklocka (ms) for ett NYLIGT TAKTSLAG enligt fasanalys pa basringen +
   *  helbandsringen vid last tempo, med halvslagstest och hysteres. 0 = ej beraknad/olast. Motorn kan folja den
   *  (LOTUS_PHASE_FOLLOW=1) i stallet for att lasa fasen pa forsta basta kick. */
  beatPhaseMs: number;
  /** Gridfasens on/half-kvot (>1 = slagfasen starkare an halvslagsfasen; ~1 = tvetydig). */
  beatPhaseConf: number;
  /** TILLITEN TILL TAKTEN 0..1 (11-11): klockans tillit över grinden, nerdragen av fasfel, utjämnad (trustStep i analyserClock.ts).
   *  Dirigenternas grind i båda systemen - ingen motor räknar en egen. */
  beatTrust: number;
  /** SEKTION (09-20, opt-in LOTUS_SECTION=1) - realtidens sektionstillstand relativt LATENS EGEN historik, for
   *  orkestrering (DMX-dirigenten, Lotus show): 'intro' | 'low' (vers/lugnt) | 'build' (uppbyggnad) | 'high' (refrang/drop)
   *  | 'break' (svacka efter topp). Ingen latkunskap kravs; refrangen kanns igen som upprepning (repeat*). */
  section: string;
  sectionAgeMs: number;     // ms sedan sektionen borjade
  sectionIndex: number;     // antal 'high'-partier hittills i laten (refrang nr)
  sectionTier: number;      // 0 lag / 1 mellan / 2 hog (stabil niva-tier, hysteres 3 s)
  /** UPPREPNING: likhet (cosinus, 0..1) mellan de senaste 4 s och det mest lika partiet >= 16 s tillbaka i laten,
   *  och hur langt tillbaka det lag samt vilken sektion det hade. repeatSim >= 0,92 mot 'high' = refrangen ar tillbaka.
   *  Med LOTUS_SECTION_REPEAT (bit 1) ar avtrycket z-normerat och repeatSim typiskt 0,2-0,9 (troskel REPEAT_THR 0,7), se Analyser.REPEAT. */
  repeatSim: number; repeatAgoMs: number; repeatSection: string;
  /** SEKTIONSMINNE + FORUTSAGELSE (09-21, workern; agaren: "komma ihag hur laten lat for nagra sekunder sedan och forra sektionen").
   *  expectHighInMs: ms tills nasta 'high' vantas (-1 = ingen forutsagelse, 0 = vi ar i high). Tva kallor: (1) MINNE - en tidigare
   *  sektion med samma etikett foljdes av 'high' efter N takter (avrundat till 4) -> samma langd nu; (2) FRAS - energin stiger
   *  (secRiseRun >= 4 raka stigande block, LOTUS_PREDICT_RISE) -> nasta 4-taktsgrans i ett frasgitter forankrat i senaste high-starten
   *  (LOTUS_PREDICT_GRID/LAT); (3) SUG (opt-in LOTUS_PREDICT_DIP) - dyk i dB strax fore smallen -> high om 2 s. prevSection = forra sektionens etikett.
   *  levelVsHighDb = blockets dB mot senaste refrangens medel-dB (negativt = tystare an refrangen; 0 utan refrang) - latens EGEN
   *  referens for dynamiken. sectionBars = takter sedan sektionsstart (0 utan tempo). */
  expectHighInMs: number; prevSection: string; levelVsHighDb: number; sectionBars: number;
  /** Rikt spektrum + per-band onset (anslag) från dubbel-FFT:n (hög-upplöst). */
  spec: Spectrum;       // per-band NIVÅ (AGC 0..1)
  /** Absolut per-band magnitud före AGC, för Lotus ljusväg och bandandelar. */
  specAbs: Spectrum;
  /** BASKROPPEN I RA dB (negativt tal, medel av sub+kick+bas), utan AGC - drop-detektorns kropp. */
  bodyDb: number;
  /** BASENERGIN 0..1 (arenan basenergi 2026-11-11, EN mätning för båda systemen; förr DMX effects.ts bHi/bLo/eBass): basens NIVÅ
   *  (sub+kick i rå dB, vikt 0,25/0,75) mot ett TAK, som dB-skillnad över ett fast spann: 1 = vid taket, 0 = BE_SPAN_DB eller mer
   *  under det. Taket räknas med SLAGET SOM TIDSENHET (klockans tempo; utan klocka 500 ms). TVÅ SKALOR:
   *  bassEnergy = mot FRASEN (taket = de starkaste slagen, glöms på BE_TOP_BEATS slag: starka och svaga partier skiljs åt),
   *  bassEnergyShort = mot TAKTEN (glöms på BE_FAST_BEATS slag: varje slag mot sina närmaste grannar, ikapp två slag efter ett
   *  nivåbyte). bassEnergyShort >= bassEnergy. Bara dB-skillnader: oberoende av ingångsnivån; 0 när ramen är tyst. Ren mätning:
   *  ingen dal, ingen uttoning, ingen kurva - hur fort ljuset släpper efter ett slag (pulsens bredd), vilken skala det följer och
   *  dropläget ligger i effekterna. Se bassEnergyStep.
   *  bassLevel (0..1) = PARTIETS BASNIVÅ MOT LÅTENS REFERENS: frasens tak mot refrängens tak som amplitudkvot (6 dB under = 0,5),
   *  så som levelVsHighDb mäter hela nivån mot refrängen. I refrängen (section 'high') ÄR frasens tak referensen (1); i vers, break
   *  och uppbyggnad står referensen kvar som låtens minne (följer ett starkare tak direkt upp, glöms på BE_MEM_BEATS slag). Före
   *  låtens första refräng är referensen det starkaste partiet hittills. Hur mycket ett svagare parti ska dämpas väljer konsumenten. */
  bassEnergy: number; bassEnergyShort: number; bassLevel: number;
  /** ABSOLUT mid+diskant-niva i dB (band 3-7, >250 Hz), RMS-kombinerad, ingen AGC. */
  midHiDb: number;
  onset: Spectrum;      // per-band ONSET/anslag (halvvågs-flux mot adaptiv baslinje, 0..1)
  /** TRUM-KIT-envelopes (0..1): peak-hold + decay PÅ HOP-TAKT (375Hz) → fångar
   *  varje anslag, aldrig missat mellan två render-frames. kick=diskret kick +
   *  snare=highMid-onset, hat=treble-onset, bass=spec.bass (nivå).
   *  OBS: kick drivs ENBART av den diskreta kick-detektorn. Den fylldes forut
   *  ocksa pa av onset.kick (bandOn[1]), men det bandet domineras av sustained
   *  bas — MATT 816-1377 anslag/min dar ~110 fanns, dvs 8x for manga. */
  drum: { kick: number; snare: number; hat: number; bass: number };
}

// ── DROP-DETEKTOR ──────────────────────────────────────────────────────────────────────────────
// Kroppen ar RA dB -> alla grindar ar dB-SKILLNADER (gain-oberoende). underPeak-kvalitetsgrinden skiljer
// riktiga slam (landar pa toppen) fran falska partiella aterhamtningar. Alla rattar inerta i standard.
export const BODY_RISE_DB = Number(env('BODY_RISE_DB') ?? 17);   // 18+ halverar traffarna (matt)
export const BODY_GONE_MIN_MS = Number(env('BODY_GONE_MIN_MS') ?? 2000);   // breakdown-langd som kravs
// HARD KVALITETSGRIND vid fyrningen: underPeak (bodyPeak-bodyFast) ar BIMODAL - riktiga drops slar till full
// niva (< 3 dB), falska ar partiella aterhamtningar kring 9-10 dB. Att kapa i gapet dodar de falska.
export const DROP_QUALITY_DB = Number(env('DROP_QUALITY_DB') ?? 3.5);
// DROP_RISE_MIN: stigningen mats mot MINIMUM av bodyFast senaste 0,5 s, inte mot punkten 0,5 s bakat. Mjuka
// pop-drops har ett SUG (dipp 100-200 ms) fore dropen; med punkt-referensen nas kravet forst nar referensen
// hamnar i dippen -> fyrningen landar 0,5 s sent = en takt vid 130 BPM ("drop en takt efter").
// VILLKORAT STIGNINGSKRAV: landar kandidaten NARA TOPPEN (underPeak < DROP_RISE_LOW_Q) racker DROP_RISE_LOW_DB. 0 = av.
export const DROP_RISE_LOW_DB = Number(env('DROP_RISE_LOW_DB') ?? 0);
// LUGN-SEKTIONS-GRIND (opt-in <prefix>DROP_CALM_GATE=1): i lugna partier (sektion low/intro, eller >= DROP_CALM_DB under senaste
// refrangen) kravs starkare bevis (riser, landning vid toppen eller extra lyft). DROP_CALM_LAND_MS > 0 -> kandidaten halls och fyrar
// forst vid verifierad landning; 0 -> nekas.
export const DROP_UNDERPEAK_MIN = Number(env('DROP_UNDERPEAK_MIN') ?? 0);   // se 'INTE I TAKET'
// KICK-LAS (opt-in DROP_KICK_LOCK_MS > 0): kroppsvillkoret armerar, fyrningen sker pa forsta kicken darefter (tak DROP_KICK_LOCK_MS
// eller en halv takt). DROP_KICK_LOCK_GRID=1: nasta rasterslag ar malet om gridfasen ar palitlig.

// MINIDROPS: egen losare lyft-detektor med eget avstand MINI_SPACING_MS. 0 = av.
export const MINI_SPACING_MS = Number(env('MINI_SPACING_MS') ?? 0);
export const BODY_CEIL_DB_S = 0.15;   // taket haller latens loud-referens lange

/** Instansfalt som MATT (--trace-generalization, 240 s pop-facit, 2026-09-27) byter Smi->Double efter start. Ges Double-form i
 *  konstruktorn (se slutet av constructor) sa kartan inte deprecerar mitt i driften. Fyra av dem stod har redan sedan 896ab7c. */
const DOUBLE_FROM_START = [
  'expectHighMs', 'levelVsHighDb', 'sumSq', 'lastT', 'dbgRms', 'envAccum', 'envAccumT', 'envBassAccum', 'blAccum', 'lvlSmooth',
  'lvlVU', 'engSmooth', 'activeMs', 'buildUp', 'kickHit', 'snareHit', 'hatHit', 'pendingKickMs', 'kfPrev', 'kfPrev2',
  'beatAnchorMs', 'profBassline', 'bassOnsetsPerBeat', 'rawBpmLast', 'localBpmConfidence', 'sectionStartMs', 'secBuildAt', 'secBuildSeen', 'repeatSim', 'repeatAgoMs',
] as const;
/** TYPSTABILA TALFALT (2026-09-27, realtidsprincipen): skriv ett icke-heltal och sedan ursprungsvardet, sa V8 ger faltet
 *  Double-representation fran start. Ett Smi-initierat falt (0, -1 ...) som senare far ett decimaltal deprecerar objektets
 *  form, och TurboFan kastar all kod som lastes med den formen (matt: 'wrong map'-deopts av process() i stabilt lage). */
function stabiliseNumbers(o: object): void {
  const r = o as Record<string, unknown>;
  for (const k of Object.keys(r)) { const v = r[k]; if (typeof v === 'number') { r[k] = 0.5; r[k] = v; } }
}

export class Analyser {
  private fft: FFT;
  private window: Float32Array;
  private buffer: Float32Array;      // sliding FFT window
  private prevMag: Float32Array;     // transformed magnitude from the previous hop
  private onsetPeak!: Float32Array;  // per-bin whitening peak history
  private onsetPrev!: Float32Array;  // previous raw magnitude for onset differencing
  private onsetPeakReady = false;
  private onsetPeakDecay = 0;
  // --- Pre-allokerade scratchpads för 512-FFT + utdata (GC-skydd: process()
  //     allokerade ~7KB/hop → ~2.6 MB/s skräp @375Hz. Nu 0 alloc/hop). ---
  private windowed512!: Float32Array;   // fönstrad tidssignal (scratch)
  private spectrum512!: number[];       // fft.js komplex-spektrum (scratch)
  private mag512!: Float32Array;        // magnitud denna hop (swap:as med prevMag)
  private outSpecAbs: Spectrum = { sub: 0, kick: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0 };
  private outSpec: Spectrum = { sub: 0, kick: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0 };
  private outOnset: Spectrum = { sub: 0, kick: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0 };
  private outDrum = { kick: 0, snare: 0, hat: 0, bass: 0 };   // trum-envelopes (återanvänt)
  private outFrame!: Frame;             // ETT återanvänt Frame (muteras/hop; säkert — main-tråden läser synkront)
  // TRUM-KIT peak-hold-envelopes (håll mellan hops). Flyttade FRÅN effects.ts render
  // (100Hz) hit (375Hz) → fångar varje onset-topp. tau bevarade: hat 60ms / snare
  // 110ms / kick 150ms. (Block 3 av arkitektur-refaktoreringen.)
  private hatHit = 0;
  private snareHit = 0;
  kickHit = 0;
  // --- DUBBEL-FFT: en parallell 2048-FFT enbart för effekternas ljudbild.
  //     512:an ovan sköter RMS/kick/BPM/onset ORÖRT (all tightad timing intakt);
  //     denna ger 23 Hz/bin (4× uppl. i botten) → kick och bas kan äntligen skiljas. ---
  private fftBig!: FFT;
  private windowBig!: Float32Array;
  private windowedBig!: Float32Array;   // scratch (återanvänds, ingen alloc/frame)
  private bufferBig!: Float32Array;     // egen glidande buffert (matas samma hops) - RING (a7): äldsta sampel vid bigPos
  private bigPos = 0;
  private prevMagBig!: Float32Array;    // för per-band flux
  private magBig!: Float32Array;        // scratch magnitud
  private magBigMax = 0;                // högsta bin någon läser (band 8-taket)
  /** Cachade vyer (0..magBigMax) till specSink — subarray() per stor-FFT vore 125
   *  alloc/s. Vyerna växlas tillsammans med buffertarna, annars pekar de fel
   *  varannan frame. */
  private magBigView!: Float32Array;
  private prevMagBigView!: Float32Array;

  private specBig!: number[];           // scratch complex (fft.js createComplexArray)
  private static readonly BAND_HZ = [20, 60, 120, 250, 500, 1200, 3500, 10000, 16000];
  private bandLo: number[] = [];        // bin-start per band (förberäknat)
  private bandHi: number[] = [];        // bin-slut per band
  private bandPeak = new Float32Array(8);  // per-band AGC-peak (själv-skalande nivå)
  bandAbs = new Float32Array(8);   // absolut per-band magnitud före AGC
  private onsetMed = new Float32Array(8);  // robust glidande median av per-band-fluxen
  private onsetMad = new Float32Array(8);  // robust MAD -> troskelspridning per band
  private static readonly ONSET_K = 3.0;   // troskel = median + K*MAD
  bandLvl = new Float32Array(8);   // scratch: per-band nivå denna frame (~90ms smoothad)
  bandOn = new Float32Array(8);    // scratch: per-band onset denna frame
  static readonly BE_SPAN_DB = BASS_SPAN_DB; static readonly BE_MEM_BEATS = 240;
  static readonly BE_FALLBACK_MS = 500;
   
  private bigCounter = 0;                  // decimering av 2048-FFT:n (se BIG_EVERY)
  private static readonly BIG_EVERY = 3;   // kor stor-FFT var N:e hop → analysen ryms i realtid
  /** bandPeak-decay per stor-FFT (τ ≈ 3.8 s oavsett BIG_EVERY). */
  private static readonly PEAK_DECAY = Math.pow(0.9993, Analyser.BIG_EVERY);
  /** SNABBA BANDEN FÖR LJUSET (opt-in <prefix>FAST_BANDS=1, DMX-fyndet 10-21): ramens LJUSFÄLT - spec, specAbs, onset, drum.hat/
   *  snare/bass, midHiDb - räknas VARJE hop ur en snabb väg i stället för ur 2048-FFT:n (42,7 ms Hann, var 3:e hop: 21-27 ms efter
   *  ljudet). Sub/kick/bas (band 0-2) ur en IIR-filterbank i tidsdomänen (Butterworth HP+LP per band, effekten per hop utjämnad
   *  FB_TAU_MS), band 3-7 ur 512-FFT:n (94 Hz per bin räcker där). Egen uppsättning (fb*): 2048-vägens band räknas OFÖRÄNDRAT och
   *  matar allt som är analys eller drop - dropkroppen (bodyDb), sektionen, karaktärsprofilen, basgången, risern. Nivåerna är
   *  kalibrerade mot 2048-vägens bandmedel (FB_K) så dB-skalan är densamma; tidskonstanterna desamma (90 ms nivå, peak-decay ~3,8 s,
   *  onset-medianens steg, uppvärmning), räknade per hop. Mätt 10-21 (faltLatens, 2 filer): specAbs.kick 21 -> 5 ms, onset.kick 27 -> 5,
   *  onset.treble 21 -> 3 ms efter ljudet. */
  private static readonly FAST_BANDS = sysEnv('FAST_BANDS') === '1';
  private static readonly FB_TAU_MS = [12, 6, 3];
  private static readonly FB_K = [385, 475, 313, 1.46, 1.62, 1.8, 2.03, 2.12];   // 2048-medel / snabbt medel, median över 4 ladan-inspelningar (+-2 dB mellan filerna)
  private fbMag = new Float32Array(256); private fbPrevMag = new Float32Array(256);
  private fbLo = new Int32Array(8); private fbHi = new Int32Array(8);
  private fbCoef = new Float64Array(3 * 2 * 5);   // per lågband: HP-biquad + LP-biquad (b0 b1 b2 a1 a2)
  private fbState = new Float64Array(3 * 2 * 4); // x1 x2 y1 y2 per biquad
  private fbPow = new Float64Array(3); private fbPrevAmp = new Float64Array(3); private fbA = new Float64Array(3);
  private fbAbs = new Float32Array(8); private fbDbRaw = new Float32Array(8); private fbLvl = new Float32Array(8); private fbOn = new Float32Array(8);
  private fbPeak = new Float32Array(8).fill(1e-4); private fbOnMed = new Float32Array(8); private fbOnMad = new Float32Array(8);
  private fbAlvl = 0.5; private fbMax = 0; private fbWarm = 0;
  /** Valfri avlyssnare på den stora magnituden (låtminnets fingeravtryck). */
  private specSink: ((mag: Float32Array, binHz: number) => void) | null = null;
  setSpectrumSink(fn: ((mag: Float32Array, binHz: number) => void) | null): void { this.specSink = fn; }
  private static readonly ENV_HZ = 100;
  private static readonly ONSET_PEAK_FLOOR = 0.05;
  /** Onset-ringens langd i sekunder x 100 Hz. Env LOTUS_TEMPO_ENV_S bara for korbanken (bench.mjs) - 5 s ar driftvardet. */
  private static readonly ENV_LEN = 100 * Math.max(3, Math.min(20, Number(sysEnv('TEMPO_ENV_S')) || 5));
  private envRing = new Float32Array(Analyser.ENV_LEN);
  private envPos = 0;
  /** Fasval: 'sum' = bas+helband (standard), 'bass' = basringen forst, helbandet bara nar basen ar tvetydig (kvot < BASS_MIN). Korbank-A/B. */

  /** GRIDFASENS SYSTEMATISKA SLAP (2026-09-23, opt-in LOTUS_GRID_PHASE_TRIM=1). PC-referensen tre dygn i rad:
   *  gridets slap mot Beat This!-slagen 5,7 -> 9,9 -> 18,3 ms (median) medan KICKARNAS bias ar 0,0 ms
   *  (onset bias +0,1 ms, on-beat-recall 0,95). Felet sitter alltsa i fasmatningen, inte i kedjan: fasen mats
   *  pa envelope-ringen i 10 ms-hinkar (ENV_HZ) med max over +-1 sampel, vilket lagger estimatet en halv hink
   *  eller mer efter det verkliga anslaget. Kickarna ar sub-hop-forfinade (parabeltopp) och darmed obiaserade.
   *  TRIM: median av de senaste 8 on-beat-kickarnas offset mot RA gridfas, klampt till +-TRIM_MS, laggs pa
   *  frame.beatPhaseMs. Ingen aterkoppling: offseten mats alltid mot den ORORDA fasen, sa trimmen ar en
   *  absolut skattning och kan inte skena. Rors bara i den snabba vagen (worker/odelad ger samma varde).
   *  MATT 2026-09-23 (korbank, 145 banklatar, live-flaggor, foljar-emulering mot Beat This!-slagen):
   *    av:  offset-median +15 ms, |offset| 22 ms, puls on-beat 0,84, andel |offset| <= 30 ms 0,63
   *    pa:  offset-median +16 ms, |offset| 23 ms, puls on-beat 0,82, andel 0,60   (tempo 114/145 i bada)
   *  ALLTSA INGEN VINST - och det motbevisar premissen: hade kickarna legat 15 ms fore gridet hade trimmen
   *  dragit gridet dit. Att den inte ror sig betyder att kickarna ligger i SAMMA fas som gridet, dvs. hela
   *  onset-fronten (bade analysatorns kickar och PC-referensens onsets, dar biasen mattes till 0 ms) ligger
   *  ~15 ms efter ML-slagen. Det ar en KONSTANT i detektorn, inte ett fasfel att folja. Flaggan lamnas
   *  opt-in och AV som dokumentation av det negativa resultatet; nasta prov ar en konstant, inte en trim. */

  /** ONSET-FRONTENS KONSTANTA SLAP (2026-09-23, opt-in LOTUS_GRID_PHASE_OFFSET_MS, standard 0).
   *  Mattes fram av trimmens misslyckande (se ovan): gridet OCH kickarna ligger i samma fas, ~15 ms efter
   *  ML-slagen (Beat This!). Kedjan ljud->ljus (30 ms, mat med klapp + 240 fps) ar en ANNAN sak och
   *  kompenseras avsiktligt inte - det har ar ett matfel i sjalva detektorn: envelope-ringen ar 10 ms-hinkar
   *  och fasscoret tar max over +-1 sampel, vilket skjuter estimatet efter anslaget. Darfor dras en KONSTANT
   *  fran den utsanda gridfasen (positivt varde = rapportera slaget tidigare). Ingen inlarning, inget att
   *  skena med. Mats i banken som foljarens offset-median mot Beat This!-slagen. */
  private static readonly GRID_PHASE_OFFSET_MS = Number(sysEnv('GRID_PHASE_OFFSET_MS')) || 0;

  // ── SEKTION (opt-in LOTUS_SECTION=1) ──────────────────────────────────────
  /** SEKTIONSLAGE: 'rank' (standard, 09-20 15:35) = kausal percentilrang av 4 s-fonstrets energi+anslagstathet mot alla block
   *  hittills i laten (samma matt som referens, sektionsreferensen, fast i realtid); 'tier' = gamla intensity-tiern (bank: 0,53 = slump). */

  /** SEKTIONEN NOLLAS VID LATBYTE (2026-09-23, opt-in LOTUS_SECTION_ON_HINT=1).
   *  MATT pa 128 latborjor fran kvallens lyssning: vid borjan av en NY lat sager sektionsetiketten 'low' i 77 %,
   *  'high' i 12 %, 'build' i 9 % - och 'intro' i 2 %. Sektionsindex vid ny lat: median 44, max 174. Sektions-
   *  maskineriet nollas namligen BARA vid 10 s tystnad eller full resetTempo, sa i en spellista rullar det vidare
   *  genom hela kvallen: rang-percentilerna jamfor nya laten mot FORRA latens block, `levelVsHighDb` mater mot
   *  forra latens refrang, och 'intro' (som drop-grinden hanger pa) kan aldrig intraffa efter forsta laten.
   *  Det ar samma klass av overhang som kommentaren i hintTrackChange redan dokumenterar for tempogrammet -
   *  och det ar orsaken till agarens "falska drops vid latbyte/intro/outro".
   *  Tempot ror vi INTE: hinten ar fortfarande mjuk dar, av de skal som star i hintTrackChange. */
  /** BLOCK OVER LATGRANSEN (opt-in <prefix>SECTION_CARRY=N, 2026-10-14, DMX-fyndet 'intro 17 % av ladans tid'): hintTrackChange
   *  nollar sektionerna och etiketten star 'intro' tills 20 nya block finns - en FALSK latgrans ger 20 s intro mitt i refrangen.
   *  N > 0: de senaste N blocken (niva/tathet/klang) bars over nollningen, sa rangen fortsatter direkt. 0 = som forr. */
  private static readonly SECTION_CARRY = Analyser.secEnv('SECTION_CARRY', 0);
  private static secEnv(name: string, def: number): number { const v = sysEnv(name); const x = Number(v); return v !== undefined && v !== '' && Number.isFinite(x) ? x : def; }
  /** RANG-RATTAR (09-21, agent-sec1; offline-simulering av 12 hela latar + bank): referens rankar SEGMENTMEDEL, sa fonstret rankas mot
   *  alla 4 s-FONSTERMEDEL hittills (RANK_WIN=0 -> mot enskilda block som forr); kickvikt 0,5 (kicktatheten korrelerar 0,87 med dB men
   *  -0,05 med referensens onsettathet - den ar en nivaproxy, inte ett eget sardrag); centroid 0,5 (basta proxyn for referensens onsettathet,
   *  0,55); hysteres 0,15 kring trosklarna for den redan satta tiern; 3 raka block. Bank: high==high 0,51 -> 0,60, refrang-recall
   *  0,34 -> 0,73, falsk-high 0,58 -> 0,41, byten/lat 15 -> 7. Taket med referensens egna granser och dB ensamt ar ~0,64 (referensens
   *  onsettathet ar negativt korrelerad med dess dB, -0,23). */

  static readonly RANK_WIN = Analyser.secEnv('SECTION_WIN', 4);
  /** Basonset-toppplockning (snabba sidan, var BIG_EVERY:e hop = 8 ms): librosa onset_detect-lika parametrar i sampel a 8 ms:
   *  pre_max 4 (30 ms), pre/post_avg 12 (100 ms), wait 4 (30 ms), delta i dB (librosas 0,07 pa ett dB-envelope). */
  private static readonly BASSON_DELTA = 0.07;
  static readonly BASSON_LEN = 32; private static readonly BASSON_AVG = 12; private static readonly BASSON_MAX = 4; private static readonly BASSON_WAIT = 4;
  bassOnRing = new Float32Array(Analyser.BASSON_LEN); bassOnN = 0; private bassOnLastPk = -1e9; bassOnPeak = false;
     static readonly RANK_RUN = Analyser.secEnv('SECTION_RUN', 3);
  /** SNABB ATTACK (09-22, agent-sec5, matt REFRANG 2): LOTUS_SECTION_RUN_IN = antal raka block for att ga IN i tier 2 (high) fran en
   *  lagre tier (0 = som RANK_RUN). Ut ur high galler RANK_RUN som forr (asymmetrisk hysteres: refrangen ska synas direkt, slappa langsamt).
   *  LOTUS_SECTION_HOLD_BARS = N (0 = av): uppehallet i high (REPEAT bit 16/32) ersatts av TAKTSTRUKTUR - minst N takter fran high-starten,
   *  sedan slapps high bara pa en 4-taktsgrans (fas +-1 takt) nar rangen inte langre sager high. */
  static readonly RANK_RUN_IN = Analyser.secEnv('SECTION_RUN_IN', 0);
  /** BASEN TILLBAKA = HIGH (2026-10-19, DMX-fyndet: 12/68 show-drops gick in i 'build' 2-8 s EFTER smallen): <prefix>SECTION_BODY_HIGH = ms
   *  kroppen (bodyEnv) maste ha varit borta (under taket - BODY_GONE_DB), 0 = av. Nar den kommer tillbaka och inom 2 s nar
   *  bodyPeak - SECTION_BODY_HIGH_DB raknas det som en drop for sektionen: 'high' direkt, forbi uppehallstiden. */
  static readonly BODY_HIGH_MS = Analyser.secEnv('SECTION_BODY_HIGH', 0);
  static readonly BODY_HIGH_DB = Analyser.secEnv('SECTION_BODY_HIGH_DB', 3);
   /** Klangnyhet 0..1 per 1 s-block mot det langsamma referensavtrycket (se BOUNDARY_NOV). 0 = av/okand. */
  boundaryNov = 0;
  /** Bandens absoluta magnitud for sektionsblocket (SECTION_AGG 'hop') - scratch sa hop-vagen inte allokerar. */
  secSpecHop = new Float64Array(8);
    /** Korbanks-dump (LOTUS_SECTION_DUMP=1): en rad per 1 s-block [tS, dB, kickar, centroid, bInt, breaking, dropped, spec0..7, tier, label] for offline-simulering av rangloggiken. */
  secDump: number[][] | null = sysEnv('SECTION_DUMP') === '1' ? [] : null;
  secBuildAt = 0; secBuildSeen = 0;   // uppbyggnadens start och senast sedd (ms, sektionens klocka) -> frame.buildProg
  section = 'intro'; sectionStartMs = 0; sectionIndex = 0; sectionTier = 1; repeatSim = 0; repeatAgoMs = 0; repeatSection = '';
  // Sektionsminne (se Frame.expectHighInMs): logg over avslutade sektioner + forutsagelse + referensniva
  expectHighMs = 0; expectSource = 0; prevSection = ''; levelVsHighDb = 0;
                          /** UPPREPNINGSMINNE v2 (09-21, opt-in LOTUS_SECTION_REPEAT bitmask; bank agent-sec3). Det gamla avtrycket (11 positiva dim, cosinus)
   *  gav repeatSim 0,97-1,00 mot ALLT (bandandelar summerar till 1 - vinkeln ar alltid liten) och kunde inte anvandas i beslut.
   *  bit 1: nytt avtryck - 12 dim (8 bandandelar, centroid, kicktathet, intensitet, dB) per 2 s, Z-NORMERAT mot latens egen
   *         historik (alla lagrade avtryck) och SEKVENSMATCHAT (3 rutor = 6 s) mot alla lagen >= 16 s tillbaka. Det matchade
   *         partiet OMRANKAS med dagens kunskap (dess dB/kicktathet mot hela blockfordelningen) -> repeatTier, och tiden for
   *         forsta high-blocket efter det matchade partiet + lag -> repeatHighAtMs ("det forflutna spelas upp igen med lag L").
   *  bit 2: etikettregel HIGH - liknar nuet (sim >= REPEAT_THR) ett parti som nu rankas high och nuet inte ar tydligt lagt -> 'high'.
   *  bit 4: forutsagelse via lag (predictHigh, hogsta prioritet).   bit 8: etikettregel LOW (matchat parti rankas low -> ej 'high').
   *  bit 16: uppehall i high = langsta omrankade high-korningen hittills (tak 40 s); bit 32: prior 8 takter; bit 64: intrade i high nar
   *  det forflutnas high-start + lag ar NU; bit 128: utgang ur high nar det forflutnas high-slut + lag ar NU (och hall tills dess).
   *  BANK 09-21 (12 hela latar, 22 refrangstarter; gransfel / high==high / recall / falsk-high; forutsedd, lead, falska/min):
   *    baslinje (0):        0,32 / 0,51 / 0,34 / 0,58;  8/22, 11,9 s, 6,0
   *    REKOMMENDERAD 117:   0,23 / 0,57 / 0,61 / 0,45;  9/22, 11,2 s, 5,2   (W 2; bit 2 gav inget utover 64, bit 8 sankte recall 0,54->0,47)
   *    245 (= 117 + 128):   0,29 / 0,57 / 0,56 / 0,48; 10/22, 11,2 s, 5,2
   *  Obs: repeatSim byter betydelse med bit 1 (cosinus av z-vektorer, -1..1, typiskt 0,2-0,9; gamla 0,92-troskeln galler inte).
   *  bit 256/512: KLANGMALL (09-22), se TEMPL_*. Varfor bit 2 inte gav nagot: avtryck var 2 s + sekvens 2 rutor = nuet syns forst
   *  4-6 s in i refrangen, dessutom kravs st >= 1 (rangens 3-blocks-hysteres) och att det MATCHADE partiet omrankas high (dB+kickar,
   *  percentil >= 0,67 - i platt country ligger refrangen ofta under). Nar bit 64 (lag-intrade) traffar ar bit 2 overflodig; annars for sen. */
  static readonly REPEAT = Number(sysEnv('SECTION_REPEAT')) || 0;
               
  /** Klangmallens likhet for senaste blocket: mot refrangmallen / mot icke-refrangmallen (-1..1; 0 utan mall), antal mallblock. Bank-telemetri. */
  /** Matchat parti: tier med dagens rankning (-1 = inget), och nar 'high' vantas om det forflutna upprepas (absolut tid, 0 = ingen). */
  repeatTier = -1; repeatHighAtMs = 0; repeatHighEndAtMs = 0;    beatPhaseMs = 0; beatPhaseConf = 0;
  /** Korbanks-telemetri for gridfasen: vald fas mot motfas per band. */
  dbgPhase = { conf: 0, bassOn: 0, bassAnti: 0, fullOn: 0, fullAnti: 0, bestPh: 0, nPh: 0, pending: 0 };
  /** Korbanks-krok: ett anrop per sektionsblock (1 s) med blockets varden (null i drift, ingen kostnad). */
  dbgSecBlock: ((b: Record<string, unknown>) => void) | null = null;
  private envFilled = 0;
  private envAccum = 0;
  private envAccumT = 0;
  // ── DELAD ANALYSATOR (split.ts) ─────────────────────────────────────────────────────────────
  readonly role: 'all' | 'fast' | 'slow';
  private splitCtrl: Int32Array | null = null; private splitRing: Float64Array | null = null; private splitState: Float64Array | null = null;
  private stateCopy = new Float64Array(STATE_LEN); private stateRd = new StateReader();   // a7: kopian bara när blocket ändrats
  private recSeq = 0;              // fast: senast skrivna record; slow: senast lasta. JS-tal, wrap-sakert (split.ts seqDelta)
  private barrierSeq = 0;          // fast: tillstand aldre an detta record ignoreras (en flagga ar pa vag)
  private pendFlags = 0; private pendHintMs = 0; private pendVclock = 0;
  private flagCnt = new Int32Array(FLAG_BITS);   // fast: antal ganger varje flagga rests (packas i R_FLAGCNT, se split.ts)
  private slowLastCnt = -1;        // slow: R_FLAGCNT i senast behandlade record (-1 = okant, t.ex. direkt efter omstart)
  private slowGap = false;         // slow: records tappade sedan senast behandlade -> kontrollera forlorade flaggor
  private slowLostFlags = 0;       // slow: antal flaggor som aterskapats ur raknarna efter tapp (statistik)
  splitRestarts = 0;               // fast: antal omstarter av workern (satts av index.ts)
  /** TAKTVÄGEN (split.ts): klockan i den långsamma tråden. null = ingen (odelad analysator eller BEAT_FEED 'inline'). */
  hopLane: HopLaneFast | null = null;
  /** EN KLOCKA (klocka a8): analysatorn matar SJÄLV sin taktväg sist i process() - profilen utan BEAT_FEED (lotus), vars motor inte
   *  anropar hopLane.feed. DMX (BEAT_FEED 'slow') matar från index.ts som förr. Samma klocka, samma tråd (workern), bara vem som matar. */
  hopSelf = false;
  private syncWorker = false;      // fast: vänta på workern efter varje record; slow: notify efter publicering (bänkens synk-läge)
  /** HOPPETS VÄRDEN (2026-10-17, skräpjakten): decimaltal som skickas som argument till, eller returneras från, en metod som V8 inte
   *  inlinar blir ett nytt HeapNumber per anrop (process 47 -> 6 kB/s skräp när de gick via fält). De heta stegen läser därför hoppets
   *  värden ur fält som process() skriver. Alla initieras som decimaltal (0,5) så fälten har Double-form från start. */
  hRms = 0.5; hNow = 0.5; hDt = 0.5; hKickFlux = 0.5; hEnergy = 0.5; hHopMs = 0.5;
  hIntensity = 0.5; hNowWall = 0.5; hBody = 0.5; hKick = false; private hLevel = 0.5; hFlux = 0.5;
  private hInZone = false; hBreaking = false; private hInRiser = false; hKickAt = 0.5;
  secAgg = { n: 0, int: 0, kicks: 0, breaking: 0, rms2: 0, cent: 0, dt: 0, wall: 0, drops: 0, active: 0, build: 0, spec: new Float64Array(8), bon: 0, bpk: 0, flux: 0, rms4: 0 };
  private inlinePeer: Analyser | null = null;
  /** STORA VÄGEN (split.ts, a3): 2048-FFT, drop, riser, profil, basgång och sektionsaggregat i långsamma tråden, ett record per hop.
   *  fast: skriver recordet och läser tillbaka; slow: kör stegen. Bara med FAST_BANDS + SECTION_AGG 'hop' och split-buffertarna. */
  readonly bigOn: boolean = false;
  private bigRing: Float64Array | null = null; private bigPcm: Float32Array | null = null; private bigState: Float64Array | null = null; private specRing: Float32Array | null = null;
  private bigSeq = 0; private bigCopy = new Float64Array(BIG_STATE_LEN); private bigRd = new StateReader(); private specCopy = new Float32Array(0); private specDelivered = 0; private specN = 0; private bigSkipped = 0;
  private bigEnvFlag = 0; private bigEnvBpm = 0.5;
  /** Snabba sidans syn på långsamma värden vid hoppet (drop/profil/basgång läser dessa i stället för de levande fälten). */
  dSec = 'intro'; dLvh = 0.5; dConf = 0.5; dBpm = 0.5;
  /** PI:NS VERKLIGHET (a3r): EN worker-tråd (motorn är låst till 2 kärnor). Anropas efter varje behandlat env- och hop-record, så
   *  taktvägen (det motorn läser varje hop) körs mellan dem och aldrig köar bakom en hel 2048-backlog. null i bänkens inline/synk-läge
   *  (taktvägen är oberoende av analysatorn, så ordningen påverkar inga värden). */
  bigYield: (() => void) | null = null;
  secSpecDirty = true;
  private slowBusyEmaUs = 0; private slowBusyMaxUs = 0; private slowLagMaxMs = 0; private slowSkipped = 0; private slowProcessed = 0;
  localBpm = 0;
  private localBpmConfidence = 0;
  static readonly SECTION_EARLY_DB = Number(sysEnv('SECTION_EARLY_DB')) || 3;
  static readonly KICK_NOGATE = sysEnv('KICK_NOGATE') === '1';
  /** 0 = tempoanpassad: max(170, 0,6 slag) nar tempot ar kant, annars 170 ms. */
  static readonly KICK_COOLDOWN_MS = Number(sysEnv('KICK_COOLDOWN')) || 0;
  static readonly KICK_EFLOOR = Number(sysEnv('KICK_EFLOOR')) || 0.06;
  /** Korbank: tempogrammets argmax-lag och sokfonster i senaste anropet. */
  dbgKick: { flux: number; thresh: number; med: number; mad: number; energy: number; gain: number; rms: number; env: number; locked: boolean } | null = null; dbgRms = 0;
  dbgBestLag = 0; dbgLagMin = 0; dbgLagMax = 0; dbgTgAt = (lag: number): number => this.tempoGram[lag] ?? 0;
  evidRelockVotes = 0;
  /** Telemetri: antal tempovaxlingar (TEMPO_SHIFT). */
  tempoShifts = 0;
 private localBpmF = 0;
  /** Antal evidensomlasningar (telemetri/korbank) + lasets senaste slagpoang. */
  evidenceRelocks = 0; evidenceLockScore = 0;
  private candLag = new Int32Array(12); private candVal = new Float32Array(12); private candScore = new Float32Array(12); private candHalf = new Float32Array(12); private candHit = new Float32Array(12);
  /** Senaste evidensvalets telemetri: vald kandidats slagpoang, halvslagskvot, antal kandidater, tvaans poang. */
  evidenceScore = 0; evidenceHalf = 0; evidenceCands = 0; evidenceSecond = 0;
  /** Senaste RA-estimatet (vikt till 80..160) fore las/median - for korbanken. */
  rawBpmLast = 0;
  /** Korbank: kandidaterna fran senaste evidensvalet. */
  debugCandidates(): Array<{ lag: number; bpm: number; tg: number; score: number; half: number; hit: number }> {
    const out: Array<{ lag: number; bpm: number; tg: number; score: number; half: number; hit: number }> = []; for (let i = 0; i < this.evidenceCands; i++) out.push({ lag: this.candLag[i], bpm: Math.round(Analyser.ENV_HZ * 60 / this.candLag[i] * 10) / 10, tg: this.candVal[i], score: this.candScore[i], half: this.candHalf[i], hit: this.candHit[i] });
    return out;
  }
  private static readonly REFRAC_N = 20;   // 200 ms @ ENV_HZ 100
  // Förberäknade EMA-alfor / decay-faktorer (fasta dtHop + fasta tidskonstanter).
  dtHop = 0; private hopMs = 0;

  private aAtt = 0; private aRel = 0; private aVU = 0;
  private aBandLvl = 0;
  private dHat = 0; private dSnare = 0; private dKick = 0;
  /** BASBANDETS onset-envelope (kick-flux), samma raster och position som envRing. */
  private envBassRing = new Float32Array(Analyser.ENV_LEN);
  private envBassAccum = 0;
  /** Ackumulerat tempogram (EMA av hela lag-kurvan mellan anrop). */
  private tempoGram = new Float32Array(Analyser.ENV_LEN);
  hGated = false;   // brusgrinden för hoppet (process)
  private silenceLevel = SILENCE_LEVEL;
  /** Släckgränsen live (index.ts, /setup-ratten cfg.silenceLevel). */
  setSilenceLevel(v: number | undefined): void { this.silenceLevel = silenceLevelLive = v ?? SILENCE_LEVEL; }
  private diagLagMin = 0; private diagLagMax = 0;
  /** Tempogrammets lagfonster i senaste anropet (diagnostik). */
  get lagBounds(): [number, number] { return [this.diagLagMin, this.diagLagMax]; }
  get tempoGramSnapshot(): Float32Array { return this.tempoGram; }
  private static readonly REFRAC_ATT = 0;   // env-ringens refraktar: 0 = nolla sampel efter stort anslag
  /** TYDLIG BASGANG: basNOTER (bandLvl[1]+bandLvl[2], 60-250 Hz) mellan kickarna pa env-rastret; en topp ar en not om den
   *  reser sig >= 25 % av senaste topphojd over dalen och inte ligger inom 60 ms efter en kick. Noter per slag (2 s fonster)
   *  -> profile.bassline 0..1, glattat ~1 s. */
  blAccum = 0;       profBassline = 0;  blKickSeq = -100;
  bassOnsetsPerBeat = 0;
  // DIAGNOSTIK (<prefix>HIGH_DIAG / HIGH_VOTE): diskant-onset-ring (bandOn[6]/[7]) - mater om diskanten bar tempot.
  private envHighRing = new Float32Array(Analyser.ENV_LEN);
  private envHighAccum = 0;
  beatAnchorMs = 0;
  // #2 sub-hop fas: kick-flankens flux-topp ligger sällan exakt på en hop. Vi
  // sparar de två föregående kick-flux-värdena och gör parabolisk interpolation
  // hoppet EFTER en kick → förfinar beatAnchorMs med ±0.5 hop (~1.3ms). Ren
  // fas-korrektion; själva kick-blixten fyrar oförändrat direkt.
  kfPrev = 0;
  kfPrev2 = 0;
  pendingKickMs = 0;   // >0 = kick väntar på fas-förfining nästa hop
  gain = 1;
  // Attack/release-smoothed outputs — raw per-hop values update ~370x/s and
  // read as flicker on the lamps. Fast attack keeps hits punchy; the slower
  // release lets light glide down instead of sputtering.
  lvlSmooth = 0;
  activeMs = 0;          // hur länge musik spelat (warmup för baslinjen)
  // DROP-DETEKTION (flyttad från effects: analys hör hemma här; show-reaktionen stannar där)
  levelCeil = 0.5;       // långsamt nivå-tak (låtens loud-topp)
  bandDbRaw = new Float32Array(8);   // RA dB per band (drop-detektorns kropp) — synk fran DMX-master 2026-09-03
  /** Stor-FFT-rutor med signal i rad. Onsets hålls tysta tills MAD hunnit byggas
   *  upp — se `ONSET_WARM` och kommentaren vid bandOn. */
  private onsetWarm = 0;
  /** ~1,5 s vid 125 Hz. MAD startar i noll efter tystnad och byggs upp med
   *  `mad ← 1.006·mad + 6e-5`, vilket tar ≈183 rutor att nå ett användbart värde. */
  private static readonly ONSET_WARM = 183;
  buildUp = 0;           // 0..1 uppbyggnads-envelope
  private lvlVU = 0;      // ~200ms hop-takt-smooth av levelRaw → VU-taket (låg jitter)
  private engSmooth = 0;
  centSmooth = 0.5;

  gainLocked = false;

  /** Called when the input routing changes — the old gain is meaningless for
   *  the new source's signal level, so re-converge from neutral. */

  resetGain(startGain = 1) {
    // Seed per input: line (aux) arrives hot -> 1x; the room mic is weak -> ~20x.
    this.gain = Math.max(0.5, Math.min(20, startGain));
    // NEUTRALT ÄR autoGainTarget, INTE 0: AGC:n räknar desired = target/max(1e-4, env),
    // så env = 0 ger ett enormt tal som slår gainen i 20x-taket innan envelopen
    // konvergerat — en hörbar ljuspump vid varje ingångsbyte.
    this.envelope = this.cfg.detection.autoGainTarget;
    this.levels.resetAgcBlocks();
  }

  /** Lock the AGC (aux: fixed 1x, level tracks the mixer directly) or let it run. */
  setGainLock(locked: boolean, fixed = 1) {
    this.gainLocked = locked;
    if (locked) { this.gain = fixed; this.envelope = this.cfg.detection.autoGainTarget; this.levels.resetAgcBlocks(); }
  }

  // ── DELAD ANALYSATOR: snabba sidan ────────────────────────────────────────────────────────────
  flagSlow(f: number): void {
    if (this.role !== 'fast') return;
    this.pendFlags |= f; this.barrierSeq = this.recSeq + 1;
    for (let k = 0; k < FLAG_BITS; k++) if (f & (1 << k)) this.flagCnt[k]++;
  }
  /** Ett record per env-sampel (100 Hz) till workern: ringvardena, flaggorna sedan forra recordet, sektionens blocksummor. */
  private pushSlowRecord(e: number, b: number, h: number): void {
    const r = this.splitRing!, ctrl = this.splitCtrl!;
    const seq = ++this.recSeq; const o = (seq % RING_N) * REC_LEN; const g = this.secAgg;
    r[o + R_PERF] = this.perfNow(); r[o + R_WALL] = this.wallNow(); r[o + R_TS] = Date.now();
    r[o + R_ENV] = e; r[o + R_BASS] = b; r[o + R_HIGH] = h; r[o + R_FLAGS] = this.pendFlags; r[o + R_HINT_MS] = this.pendHintMs; r[o + R_VCLOCK] = this.pendVclock;
    r[o + R_SEC_N] = g.n; r[o + R_SEC_INT] = g.int; r[o + R_SEC_KICKS] = g.kicks; r[o + R_SEC_BREAK] = g.breaking; r[o + R_SEC_RMS2] = g.rms2;
    r[o + R_SEC_CENT] = g.cent; r[o + R_SEC_DT] = g.dt; r[o + R_SEC_WALL] = g.wall;
    for (let i = 0; i < 8; i++) r[o + R_SEC_SPEC0 + i] = g.spec[i];
    r[o + R_SEC_BON] = g.bon; r[o + R_SEC_BPK] = g.bpk; r[o + R_SEC_FLUX] = g.flux; r[o + R_SEC_RMS4] = g.rms4;
    // SECTION_AGG 'hop': fakta fran sista aggregerade hoppet (som sectionHop sag dem i odelat lage); 'env': vid skrivningen.
    if (SECTION_AGG_HOP) { r[o + R_DROPS] = g.drops; r[o + R_ACTIVE] = g.active; r[o + R_BUILD] = g.build; }
    else { r[o + R_DROPS] = this.drop.dropCand + this.drop.secBodyRet; r[o + R_ACTIVE] = this.activeMs; r[o + R_BUILD] = this.buildUp; }
    r[o + R_FLAGCNT] = packFlagCounts(this.flagCnt);
    r[o + R_CLOCK] = this.localBpm; r[o + R_CLOCK_CONF] = this.localBpmConfidence;   // EN KÄLLA (r0): klockans tempo/tillit till långsamma sidan
    r[o + R_BIGSEQ] = this.bigSeq;                         // stora vägen: hop-record före detta (workern kör dem först)
    r[o + R_SEQ] = seq;                                    // sist: seq = recordet ar komplett
    g.n = 0; g.int = 0; g.kicks = 0; g.breaking = 0; g.rms2 = 0; g.cent = 0; g.dt = 0; g.spec.fill(0); g.bon = 0; g.bpk = 0; g.flux = 0; g.rms4 = 0;
    this.pendFlags = 0;
    Atomics.store(ctrl, C_WRITE, seqLow(seq));             // laga 32 bitarna; workern rekonstruerar via seqDelta (wrap-sakert)
    if (this.bigOn) {   // stora vägen: analysatortråden väntar på C_WAKE (C_WAITING_B); med taktväg väcker feed() i samma hop
      Atomics.add(ctrl, C_WAKE, 1);
      if ((this.syncWorker || !this.hopLane) && (Atomics.load(ctrl, C_WAITING) || Atomics.load(ctrl, C_WAITING_B))) Atomics.notify(ctrl, C_WAKE);
    } else if (!this.hopLane) { if (Atomics.load(ctrl, C_WAITING)) Atomics.notify(ctrl, C_WRITE, 1); }   // Dekker: workern satter C_WAITING fore wait-jamforelsen
    // a7: MED taktvägen väntar workern bara på C_WAKE - en notify på C_WRITE vore ett anrop i onödan.
    else { Atomics.add(ctrl, C_WAKE, 1); if (Atomics.load(ctrl, C_WAITING)) Atomics.notify(ctrl, C_WAKE, 1); }   // taktvägen: workern väntar på C_WAKE
    if (this.inlinePeer) { this.inlinePeer.drainRecords(); this.pullSlowState(); }   // inline-lage (korbank): synkront har, tillstandet hamtas direkt
    else if (this.syncWorker) { syncWait(ctrl, C_STATE_SEQ, () => this.stateRd.read(ctrl, this.splitState!, this.stateCopy) && this.stateCopy[S_REC_SEQ] >= seq); this.pullSlowState(); }
  }
  /** Hamta tempo/gridfas/sektion ur tillstandsblocket (varje hop, ~20 doubles). Aldre an barrierSeq ignoreras. */
  private pullSlowState(): void {
    if (!this.stateRd.read(this.splitCtrl!, this.splitState!, this.stateCopy)) return;
    const s = this.stateCopy; if (s[S_REC_SEQ] < this.barrierSeq) return;
    // (EN KÄLLA, r0: med klockan sätts localBpm/localBpmConfidence via setClock - inte av långsamma sidans tillstånd; lotus väg: som förr)
    this.beatPhaseMs = s[S_PHASE_MS]; this.beatPhaseConf = s[S_PHASE_CONF];
    this.section = SECTIONS[s[S_SECTION]] || 'intro'; this.sectionStartMs = s[S_SEC_START]; this.sectionIndex = s[S_SEC_INDEX]; this.sectionTier = s[S_SEC_TIER]; this.secBuildAt = s[S_BUILD_AT]; this.secBuildSeen = s[S_BUILD_SEEN];
    this.repeatSim = s[S_REP_SIM]; this.repeatAgoMs = s[S_REP_AGO]; this.repeatSection = SECTIONS[s[S_REP_SEC]] || '';
    this.expectHighMs = s[S_EXPECT_MS]; this.expectSource = s[S_EXPECT_SRC]; this.prevSection = SECTIONS[s[S_PREV_SEC]] || ''; this.levelVsHighDb = s[S_LVL_HIGH];
  }
  setInlinePeer(slow: Analyser | null): void { this.inlinePeer = slow; }
  /** Halsa for /api/live: hur langt efter workern ligger (records och ms), dess kostnad per record, tappade records. */
  getSplitStats(): { role: string; written: number; processed: number; behind: number; lagMs: number; lagMaxMs: number; busyUs: number; busyMaxUs: number; skipped: number; lostFlags: number; restarts: number } | null {
    if (this.role !== 'fast') return null;
    const s = this.stateCopy;
    return { role: this.role, written: this.recSeq, processed: s[S_PROCESSED], behind: this.recSeq - s[S_REC_SEQ], lagMs: +s[S_LAG_MS].toFixed(1), lagMaxMs: +s[S_LAG_MAX].toFixed(1),
      busyUs: Math.round(s[S_BUSY_US]), busyMaxUs: Math.round(s[S_BUSY_MAX_US]), skipped: s[S_SKIPPED], lostFlags: s[S_LOST_FLAGS], restarts: this.splitRestarts };
  }
  /** fast: senast skrivna record (full seq) resp. senast LASTA enligt workern (C_READ, wrap-sakert) — for omstart av workern. */
  fastWriteSeq(): number { return this.recSeq; }
  fastReadSeq(): number { const d = seqDelta(Atomics.load(this.splitCtrl!, C_READ), this.recSeq); return d > 0 ? this.recSeq : this.recSeq + d; }

  // ── DELAD ANALYSATOR: langsamma sidan (workern / inline) ─────────────────────────────────────
  slowReadSeq(): number { return this.recSeq; }
  /** Behandla alla records som skrivits sedan sist, publicera tillstandet. Returnerar antal. */
  drainRecords(): number {
    const ctrl = this.splitCtrl!, r = this.splitRing!;
    const w = this.recSeq + seqDelta(Atomics.load(ctrl, C_WRITE), this.recSeq); let n = 0;   // full seq ur 32 laga bitar (wrap-sakert)
    if (w - this.recSeq > RING_N - RING_MARGIN) { this.slowSkipped += (w - this.recSeq) - (RING_N - RING_MARGIN); this.recSeq = w - (RING_N - RING_MARGIN); this.slowGap = true; }   // ringen hann skrivas over
    let lagMs = 0;
    while (this.recSeq < w) {
      const seq = ++this.recSeq; const o = (seq % RING_N) * REC_LEN;
      if (r[o + R_SEQ] !== seq) { this.slowSkipped++; this.slowGap = true; continue; }
      const t0 = performance.now();
      if (this.slowGap) {
        // Records tappade sedan senast behandlade: flaggor som lag i dem far inte forsvinna utan konsekvens (split.ts).
        // Vardena (hint-fonster, virtuell klocka) ar borta -> standard 5000 ms resp. recordets egen tid.
        if (this.slowLastCnt >= 0) {
          const lost = lostFlags(this.slowLastCnt, r[o + R_FLAGCNT], r[o + R_FLAGS]);
          if (lost) { this.slowLostFlags++; this.applyFlags(lost, 5000, r[o + R_PERF]); }
        }
        this.slowGap = false;
      }
      if (this.bigOn) this.drainBig(r[o + R_BIGSEQ]);   // stora vägen: hoppen före recordet först (sektionsaggregatet, drop-räknaren)
      this.slowStep(o); this.slowLastCnt = r[o + R_FLAGCNT];
      if (this.bigYield) this.bigYield();
      const us = (performance.now() - t0) * 1000;
      this.slowBusyEmaUs = this.slowBusyEmaUs === 0 ? us : this.slowBusyEmaUs + 0.02 * (us - this.slowBusyEmaUs);
      if (us > this.slowBusyMaxUs) this.slowBusyMaxUs = us;
      lagMs = Date.now() - r[o + R_TS]; if (lagMs > this.slowLagMaxMs) this.slowLagMaxMs = lagMs;
      n++;
    }
    if (n > 0) {
      this.slowProcessed += n;
      Atomics.store(ctrl, C_READ, seqLow(this.recSeq));
      stateWrite(ctrl, this.splitState!, (s) => {
        s[S_REC_SEQ] = this.recSeq; s[S_BPM] = this.localBpm; s[S_CONF] = this.localBpmConfidence; s[S_BPMF] = this.localBpmF;
        s[S_PHASE_MS] = this.beatPhaseMs; s[S_PHASE_CONF] = this.beatPhaseConf;
        s[S_SECTION] = sectionCode(this.section); s[S_SEC_START] = this.sectionStartMs; s[S_SEC_INDEX] = this.sectionIndex; s[S_SEC_TIER] = this.sectionTier; s[S_BUILD_AT] = this.secBuildAt; s[S_BUILD_SEEN] = this.secBuildSeen;
        s[S_REP_SIM] = this.repeatSim; s[S_REP_AGO] = this.repeatAgoMs; s[S_REP_SEC] = sectionCode(this.repeatSection);
        s[S_EXPECT_MS] = this.expectHighMs; s[S_EXPECT_SRC] = this.expectSource; s[S_PREV_SEC] = sectionCode(this.prevSection); s[S_LVL_HIGH] = this.levelVsHighDb;
        s[S_PROCESSED] = this.slowProcessed; s[S_LAG_MS] = lagMs; s[S_LAG_MAX] = this.slowLagMaxMs; s[S_BUSY_US] = this.slowBusyEmaUs; s[S_BUSY_MAX_US] = this.slowBusyMaxUs; s[S_SKIPPED] = this.slowSkipped; s[S_LOST_FLAGS] = this.slowLostFlags;
      });
      if (this.syncWorker) Atomics.notify(ctrl, C_STATE_SEQ);
    }
    if (this.bigOn) this.drainBig(Infinity);
    return n;
  }

  // ── STORA VÄGEN (split.ts) ────────────────────────────────────────────────────────────────────
  /** fast: hoppets record (sampel + snabba sidans fakta) till långsamma tråden; hämta drop/riser/profil/kropp/spektrum tillbaka. */
  private pushBig(samples: Float32Array): void {
    const r = this.bigRing!, ctrl = this.splitCtrl!, seq = ++this.bigSeq, slot = seq % BIG_RING_N, o = slot * BIG_REC_LEN, n = samples.length;
    this.bigPcm!.set(samples, slot * BIG_HOP_MAX);
    r[o + B_N] = n; r[o + B_RMS] = this.hRms; r[o + B_LVL] = this.lvlSmooth; r[o + B_CENT] = this.centSmooth; r[o + B_ACTIVE] = this.activeMs;
    r[o + B_WALL] = this.hNowWall; r[o + B_KICK] = this.hKick ? 1 : 0; r[o + B_KICKHIT] = this.kickHit; r[o + B_INT] = this.hIntensity; r[o + B_BREAK] = this.hBreaking ? 1 : 0;
    r[o + B_SEC] = sectionCode(this.section); r[o + B_LVH] = this.levelVsHighDb; r[o + B_CONF] = this.localBpmConfidence;
    r[o + B_ENVF] = this.bigEnvFlag; r[o + B_ENVBPM] = this.bigEnvBpm; this.bigEnvFlag = 0;
    r[o + B_SEQ] = seq;                                    // sist: recordet ar komplett
    Atomics.store(ctrl, C_BIG_WRITE, seqLow(seq)); Atomics.add(ctrl, C_WAKE, 1);
    // Väckning: taktvägens feed() följer i samma hop och väcker workern - här bara i synk-läget eller utan taktväg.
    if ((this.syncWorker || !this.hopLane) && (Atomics.load(ctrl, C_WAITING) || Atomics.load(ctrl, C_WAITING_B))) Atomics.notify(ctrl, C_WAKE);
    if (this.inlinePeer) this.inlinePeer.drainBig(Infinity);
    else if (this.syncWorker) syncWait(ctrl, C_BIG_SEQ, () => this.bigRd.read(ctrl, this.bigState!, this.bigCopy, C_BIG_SEQ) && this.bigCopy[BS_SEQ] >= seq);
    const s = this.bigCopy;
    if (!this.bigRd.read(ctrl, this.bigState!, s, C_BIG_SEQ) || s[BS_SEQ] === 0) return;
    this.hBody = s[BS_BODY]; this.drop.dropCount = s[BS_DROPS]; this.drop.miniDropCount = s[BS_MINI]; this.bodyUnderDb = s[BS_UNDER];
    this.drop.dropDemoted = s[BS_DEMOTED]; this.drop.dropSpaced = s[BS_SPACED]; this.drop.dropRiseDb = s[BS_DROPRISE]; this.drop.nearDropDb = s[BS_NEAR]; this.drop.nearDipDb = s[BS_NEARDIP]; this.drop.liftDb = s[BS_LIFT]; this.drop.stopCount = s[BS_STOPS]; this.drop.stopS = s[BS_STOPSEC]; this.buildUp = s[BS_BUILD]; this.hInRiser = s[BS_RISER] === 1;
    const p = this.character.outProfile; p.punch = s[BS_PUNCH]; p.bass = s[BS_BASS]; p.bright = s[BS_BRIGHT]; p.beat = s[BS_BEAT]; p.bassline = s[BS_BASSLINE];
    const sn = s[BS_SPEC_N];
    if (sn > this.specDelivered) {
      const sink = this.specSink, binHz = this.cfg.audio.rate / this.bufferBig.length, R = this.specRing!, c = this.specCopy;
      for (let k = Math.max(this.specDelivered + 1, sn - SPEC_SLOTS + 1); k <= sn; k++) {
        if (sink) { const o2 = (k % SPEC_SLOTS) * SPEC_MAX; c.set(R.subarray(o2, o2 + c.length)); sink(c, binHz); }
      }
      this.specDelivered = sn;
    }
  }

  /** slow: behandla hop-recorden t.o.m. `limit` (full seq) i exakt snabba sidans gamla ordning, publicera. */
  drainBig(limit: number): number {
    const ctrl = this.splitCtrl!, r = this.bigRing!, pcm = this.bigPcm!;
    let w = this.bigSeq + seqDelta(Atomics.load(ctrl, C_BIG_WRITE), this.bigSeq); if (limit < w) w = limit;
    if (w - this.bigSeq > BIG_RING_N - RING_MARGIN) { this.bigSkipped += (w - this.bigSeq) - (BIG_RING_N - RING_MARGIN); this.bigSeq = w - (BIG_RING_N - RING_MARGIN); }
    let n = 0;
    while (this.bigSeq < w) {
      const seq = ++this.bigSeq, slot = seq % BIG_RING_N, o = slot * BIG_REC_LEN;
      if (r[o + B_SEQ] !== seq) { this.bigSkipped++; continue; }
      const hn = r[o + B_N];
      // basgången (process(): ackumulatorn med förra 2048-bandens nivå och förra hoppets kick, sedan env-sampelns steg)
      { const bl = this.bandLvl[1] + this.bandLvl[2]; if (bl > this.blAccum) this.blAccum = bl; if (this.kickHit >= 1) this.blKickSeq = this.bass.envSeq; }
      if (r[o + B_ENVF] === 1) { this.dBpm = r[o + B_ENVBPM]; this.bass.stepBassline(); }
      this.hRms = r[o + B_RMS]; this.lvlSmooth = r[o + B_LVL]; this.centSmooth = r[o + B_CENT]; this.activeMs = r[o + B_ACTIVE]; this.kickHit = r[o + B_KICKHIT];
      this.levels.zoneStep();
      const wall = r[o + B_WALL];
      { const po = slot * BIG_HOP_MAX; this.bigRingPush(pcm.subarray(po, po + hn)); }
      if (++this.bigCounter >= Analyser.BIG_EVERY) this.bigStep();
      this.hNowWall = wall; this.hBody = (this.bandDbRaw[0] + this.bandDbRaw[1] + this.bandDbRaw[2]) / 3;
      this.dSec = SECTIONS[r[o + B_SEC]]; this.dLvh = r[o + B_LVH];
      this.drop.dropStep();
      this.hInRiser = this.riser.riserStep();
      this.dConf = r[o + B_CONF];
      this.character.profileStep();
      this.bigAgg(r[o + B_INT], r[o + B_KICK] === 1, r[o + B_BREAK] === 1, wall);
      n++;
      if (this.bigYield) this.bigYield();
    }
    if (n > 0) {
      Atomics.store(ctrl, C_BIG_READ, seqLow(this.bigSeq));
      const p = this.character.outProfile;
      stateWrite(ctrl, this.bigState!, (s) => {
        s[BS_SEQ] = this.bigSeq; s[BS_BODY] = this.hBody; s[BS_DROPS] = this.drop.dropCount; s[BS_MINI] = this.drop.miniDropCount; s[BS_CAND] = this.drop.dropCand; s[BS_UNDER] = this.bodyUnderDb;
        s[BS_DEMOTED] = this.drop.dropDemoted; s[BS_SPACED] = this.drop.dropSpaced; s[BS_DROPRISE] = this.drop.dropRiseDb; s[BS_NEAR] = this.drop.nearDropDb; s[BS_NEARDIP] = this.drop.nearDipDb; s[BS_LIFT] = this.drop.liftDb; s[BS_STOPS] = this.drop.stopCount; s[BS_STOPSEC] = this.drop.stopS; s[BS_BUILD] = this.buildUp; s[BS_RISER] = this.hInRiser ? 1 : 0;
        s[BS_PUNCH] = p.punch; s[BS_BASS] = p.bass; s[BS_BRIGHT] = p.bright; s[BS_BEAT] = p.beat; s[BS_BASSLINE] = p.bassline; s[BS_SPEC_N] = this.specN; s[BS_SKIPPED] = this.bigSkipped;
      }, C_BIG_SEQ);
      if (this.syncWorker) Atomics.notify(ctrl, C_BIG_SEQ);
    }
    return n;
  }
  /** 2048-bufferten som RING (a7/a8): hoppet skrivs på den äldstas plats i stället för copyWithin (8 kB memmove per hop);
   *  bigStep läser ringen i tidsordning från bigPos -> samma sampel i samma ordning, bit-identiskt. Förutsätter hop <= 2048. */
  private bigRingPush(samples: Float32Array): void {
    const B = this.bufferBig, N = B.length, p = this.bigPos, hop = samples.length, first = N - p;
    if (hop <= first) B.set(samples, p);
    else { B.set(samples.subarray(0, first), p); B.set(samples.subarray(first), 0); }
    this.bigPos = (p + hop) % N;
  }
  /** slow: alla hop-record lästa? (workerns sömnvillkor) */
  bigIdle(): boolean { return seqLow(this.bigSeq) === Atomics.load(this.splitCtrl!, C_BIG_WRITE); }
  /** slow: sektionens hopaggregat (som snabba sidans SECTION_AGG 'hop'-gren förr, samma summeringsordning). */
  private bigAgg(intensity: number, kick: boolean, breaking: boolean, wall: number): void {
    const rms = this.hRms;
    const sp = this.secSpecHop;   // bandDbRaw ändras bara i bigStep (var 3:e hop): räkna om då, samma värden
    if (this.secSpecDirty) { this.secSpecDirty = false; for (let i = 0; i < 8; i++) sp[i] = Math.pow(10, this.bandDbRaw[i] / 20); }
    const g = this.secAgg; g.n++; g.int += intensity; if (kick) g.kicks++; g.rms2 += rms * rms; g.cent += this.centSmooth; g.dt += this.dtHop * 1000;
    g.breaking = breaking ? 1 : 0; g.wall = wall; g.drops = this.drop.dropCand + this.drop.secBodyRet; g.active = this.activeMs; g.build = this.buildUp;
    for (let i = 0; i < 8; i++) g.spec[i] += sp[i];
  }
  /** Snabba sidans kommandon i exakt den ordning de restes (virtuell klocka forst: den nollar ankare som resten skriver). */
  private applyFlags(flags: number, hintMs: number, vclock: number): void {
    if (flags & F_VCLOCK_NULL) this.setVirtualClock(null); else if (flags & F_VCLOCK_SET) this.setVirtualClock(vclock);
    if (flags & F_RESET_TEMPO) this.resetTempo();
    if (flags & F_HINT) this.hintTrackChange(hintMs);
    if (flags & F_RESET_BAR) this.resetBar();
    if (flags & F_SIL10) this.localBpm = 0;
  }
  /** Ett record = ett env-sampel: flaggor i ordning, ringvardena, snabba sidans fakta, sektionsblocket. */
  private slowStep(o: number): void {
    const r = this.splitRing!;
    this.applyFlags(r[o + R_FLAGS], r[o + R_HINT_MS], r[o + R_VCLOCK]);
    this.virtualMs = r[o + R_PERF]; this.virtualOn = true;   // perfNow() = snabba tradens tid vid sampeln (deterministiskt)
    this.envRing[this.envPos] = r[o + R_ENV]; this.envBassRing[this.envPos] = r[o + R_BASS];
    if (HIGH_ON) this.envHighRing[this.envPos] = r[o + R_HIGH];
    this.envPos = (this.envPos + 1) % Analyser.ENV_LEN;
    this.localBpm = r[o + R_CLOCK], this.localBpmConfidence = r[o + R_CLOCK_CONF];   // EN KÄLLA (r0): klockans tempo, inte en egen sökning
    this.envFilled = Math.min(this.envFilled + 1, Analyser.ENV_LEN);
    if (this.bigOn) {   // stora vägen: sektionens fakta och blocksummor ur den egna hopvägen (hoppen före recordet är redan körda)
      const g = this.secAgg;
      if (g.n > 0) this.sections.secVDrops = g.drops;
      if (g.n > 0) {
        const I = this.sections.shIn; I.hops = g.n; I.intSum = g.int; I.kicks = g.kicks; I.breaking = g.breaking > 0; I.nowMs = g.wall; I.dtMs = g.dt; I.rms2Sum = g.rms2; I.centSum = g.cent;
        I.specOff = 0; I.bonSum = g.bon; I.bpk = g.bpk; I.fluxSum = g.flux; I.rms4Sum = g.rms4;
        this.sections.sectionHop(g.spec);
        g.n = 0; g.int = 0; g.kicks = 0; g.breaking = 0; g.rms2 = 0; g.cent = 0; g.dt = 0; g.spec.fill(0); g.bon = 0; g.bpk = 0; g.flux = 0; g.rms4 = 0;
      }
      return;
    }
    const secN = r[o + R_SEC_N] > 0;
    if (!SECTION_AGG_HOP || secN) { this.drop.dropCand = r[o + R_DROPS]; this.activeMs = r[o + R_ACTIVE]; this.buildUp = r[o + R_BUILD]; }
    if (secN)
    { const I = this.sections.shIn; I.hops = r[o + R_SEC_N]; I.intSum = r[o + R_SEC_INT]; I.kicks = r[o + R_SEC_KICKS]; I.breaking = r[o + R_SEC_BREAK] > 0; I.nowMs = r[o + R_SEC_WALL];
      I.dtMs = r[o + R_SEC_DT]; I.rms2Sum = r[o + R_SEC_RMS2]; I.centSum = r[o + R_SEC_CENT]; I.specOff = o + R_SEC_SPEC0; I.bonSum = r[o + R_SEC_BON]; I.bpk = r[o + R_SEC_BPK];
      I.fluxSum = r[o + R_SEC_FLUX]; I.rms4Sum = r[o + R_SEC_RMS4];
      this.sections.sectionHop(r); }
  }

  /** Sparets tid (s sedan den virtuella epoken; diagnostik, bara med sparflaggor). */
  private traceT(): number { return (this.wallNow() - 1700000000000) / 1000; }
  /** Nollställ analysatorns kopia av klockans tempo (verktygens krok; klockan anropar den aldrig). */
  resetTempo(): void {
    if (BPM_TRACE) console.log(`[bpmrst] t=${this.traceT().toFixed(1)} RESET bpm=${this.localBpm}`);
    this.flagSlow(F_RESET_TEMPO);
    this.localBpm = 0; this.localBpmConfidence = 0;
  }

  /** LÅTGRÄNSEN (a4 entempo): antal låtgränser (boundaryDetector -> hintTrackChange). Klockan läser den per hop (hop-recordet H_BOUND) -
   *  det är klockans ENDA signal om låtbyte. */
  trackBoundaries = 0;
  /** LÅTGRÄNSEN ÄR SÄKER (LÅTENS MINNE i klockan): värden sätter den när låtgränsen kommer utifrån och spåret är EN låt (lotus: Sonos-spår,
   *  inte mix/radio/tv). Då är allt mellan två låtgränser samma låt. Osatt (DMX: gränsdetektorn missar byten) = av. Hop-recordet H_SURE. */
  boundSure = false;
  /** BASKROPPEN UNDER TAKET (klockans break-håll): hur många dB dropdetektorns baskropp (bodyEnv) ligger under sitt tak (bodyCeil) just nu.
   *  0 = på taket; ett riktigt break tar bort basen nästan helt, ett låtbyte några dB. Hop-recordet H_UNDER. */
  bodyUnderDb = 0;
  /** Tystnad i ms (klockans tystnadssignal, hop-recordet H_QUIET; > 10 s släpper klockan som förr F_SIL10 släppte tempot). */
  get quietMs(): number { return this.levels.silentMs; }
  /** EN KÄLLA (r0 entempo): analysatorns ENDA tempo och tillit = klockans (taktvägen i analysatorns långsamma väg, efter varje hop).
   *  Läses av kickspärren/-grinden (via rutnätet), sectionBars, basgången, sektionernas långsamma sida (env-recordet R_CLOCK) och ramen. */
  setClock(bpm: number, conf: number): void { this.localBpm = bpm > 40 ? bpm : 0; this.localBpmConfidence = bpm > 40 ? conf : 0; }
  hintTrackChange(windowMs = 5000, sections = true): void {
    if (this.role !== 'slow') this.trackBoundaries++;
    if (BPM_TRACE) console.log(`[bpmrst] t=${this.traceT().toFixed(1)} HINT bpm=${this.localBpm} conf=${this.localBpmConfidence.toFixed(2)}`);
    if (this.role === 'fast') { this.pendHintMs = windowMs; this.flagSlow(F_HINT); }
    // NY LAT = NY STRUKTUR. Tempot ar klockans sak (H_BOUND), men sektionshistoriken tillhor forra laten och maste bort:
    // annars rangordnas nya laten mot gamla block och 'intro' intraffar aldrig. sectionReset() ar samma nollning
    // som 10 s tystnad redan gor - enda skillnaden ar att vi nu ocksa litar pa latbytes-signalen.
    if (sections) {
      const N = Analyser.SECTION_CARRY;
      if (N > 0) {
        const keep = <T>(x: T[]) => x.slice(Math.max(0, x.length - N)); const H = this.sections.secBlkH;
        const c = [keep(this.sections.secBlkDb), keep(this.sections.secBlkDens), keep(this.sections.secBlkCentH), keep(this.sections.secBlkHighH), keep(this.sections.secBlkT), keep(this.sections.secBlkFeat), keep(this.sections.secBlkHi), keep(H.bon), keep(H.bpk), keep(H.high), keep(H.flat), keep(H.flux), keep(H.dyn)];
        const hd = this.sections.lastHighDb === this.sections.lastHighDb ? this.sections.lastHighDb : this.sections.secCarryHighDb;
        this.sections.sectionReset(); this.sections.secCarryHighDb = hd;
        const put = <T>(x: T[], v: T[]) => { x.length = 0; for (const e of v) x.push(e); };
        put(this.sections.secBlkDb, c[0] as number[]); put(this.sections.secBlkDens, c[1] as number[]); put(this.sections.secBlkCentH, c[2] as number[]); put(this.sections.secBlkHighH, c[3] as number[]); put(this.sections.secBlkT, c[4] as number[]); put(this.sections.secBlkFeat, c[5] as Float32Array[]); put(this.sections.secBlkHi, c[6] as number[]);
        put(H.bon, c[7] as number[]); put(H.bpk, c[8] as number[]); put(H.high, c[9] as number[]); put(H.flat, c[10] as number[]); put(H.flux, c[11] as number[]); put(H.dyn, c[12] as number[]);
      } else this.sections.sectionReset();
    }
  }

  /** Taktfasen är applicerad av motorn (ankaret flyttat) → börja om räkningen. */
  resetBar(): void { this.flagSlow(F_RESET_BAR); }

  envelope: number;
  // 0 = "ej satt". Får INTE seedas med performance.now(): vid virtuell klocka
  // (perfNow → virtualMs, startar nära 0) blir första dt negativ → exp(+stort)
  // → NaN i envelope/gain, och NaN passerar båda clamparna nedan.
  private lastT = 0;
  /** Löpande kvadratsumma över `buffer` (glidande RMS) + räknare för full omräkning. */
  private sumSq = 0;
  private rmsRecalc = 0;

  /** VIRTUELL KLOCKA. Analysatorns dtHop är sampelbaserad, men fyra beslut läser
   *  väggklockan — drop-spärren ("8 takter sedan förra"), svackans ålder, riserns
   *  ålder. Spelar man upp ljud snabbare än realtid hinner åtta takter
   *  gå på några millisekunder och hela strukturlogiken kollapsar.
   *
   *  Med en injicerbar klocka blir analysatorn DETERMINISTISK: samma ljud in ger
   *  samma bildrutor ut, oavsett hur fort man matar den. Det är förutsättningen
   *  för en regressionsbänk — och för att kunna välja tröskelvärden mot tjugo
   *  låtar i stället för mot en. Live är beteendet oförändrat (null = riktig tid). */
  // TYPSTABIL (2026-09-27, realtidsprincipen): aldrig null<->tal i ett falt som lases varje hop - det deprecerar
  // instansens map och kastar TurboFan-koden. virtualOn ar vaxeln, virtualMs alltid ett tal (NaN nar av).
  private virtualMs = NaN; private virtualOn = false;
  /** Driv analysatorn på en virtuell klocka (offline-uppspelning). Anropas med
   *  ackumulerad ljudtid i ms före varje process(). null = tillbaka till realtid. */
  /**
   * VIRTUELL KLOCKA FOR OFFLINE-BANKEN.
   *
   * Alla klockankare maste nollstallas, annars laser detektorerna sig. Uppmatt
   * mekanism: efter en live-korning ar `lastKick` ~1e6 medan `now` startar om
   * pa ~0, sa `now - lastKick` blir NEGATIVT → cooldown-villkoret blir aldrig
   * sant → ingen kick fyrar nagonsin igen, och eftersom `lastKick` bara skrivs
   * NAR en kick fyrar ar lasningen permanent. Samma falla gallde flera andra
   * ankare. Att bara satta `virtualMs` racker alltsa inte.
   */
  setVirtualClock(ms: number | null) {
    if (this.role === 'fast') { if (ms === null) this.flagSlow(F_VCLOCK_NULL); else { this.pendVclock = ms; this.flagSlow(F_VCLOCK_SET); } }
    // LAGESBYTE bara vid ett HOPP (forsta anropet, bakat, eller > 1 s framat): en bank som anropar per hop med
    // ljudtiden far bara klockan flyttad (som advanceVirtualClock) - ankarna nollas inte varje hop.
    const prev = this.virtualMs;
    const jump = ms === null || !this.virtualOn || ms < prev || ms - prev > 1000;
    if (ms === null) { this.virtualOn = false; this.virtualMs = NaN; } else { this.virtualOn = true; this.virtualMs = ms; }
    if (!jump) return;
    this.kicks.lastKick = 0;
    this.pendingKickMs = 0;
    this.beatAnchorMs = 0; this.beatPhaseMs = 0; this.beatPhaseConf = 0; this.sections.sectionReset();
    this.lastT = 0;
  }
  /** KORBANK (09-20): flytta bara den virtuella klockan, utan att nolla nagra ankare. setVirtualClock() ar ett
   *  LAGESBYTE (nollar lastT/lastKick/pendingKickMs/lastVoteMs...) och far bara anropas en gang - anropad per hop
   *  fros AGC:n (dt=0), kickar forfinades aldrig (0 kickar) och rosterna foll varje anrop. */
  advanceVirtualClock(ms: number): void { this.virtualMs = ms; this.virtualOn = true; }
  private perfNow(): number { return this.virtualOn ? this.virtualMs : performance.now(); }
  /**
   * LJUDKLOCKAN — ms sedan start raknat ur ANTALET BEARBETADE SAMPEL, satt av
   * matningen strax fore varje process(). -1 = inte satt (aldre anropare).
   *
   * VARFOR: slagtiden (`beatAnchorMs` -> `kickAtMs`) forfinas sub-hop med en
   * parabel och PLL:en litar pa den som "+-1,3 ms". Men stampeln som parabeln
   * forfinar RELATIVT var `Date.now()` vid den hop som sag slaget — alltsa
   * exakt den ALSA-leveransjitter PLL-kommentaren tror sig ha undvikit.
   * Perioden ar 5,3 ms, callbacks kommer i klumpar om 1-3 hop, plus
   * handelseloopens fordrojning: verklig fasnoise +-5-8 ms per slag, och
   * systematiskt sen. Sub-hop-precisionen var alltsa illusorisk.
   *
   * Ljudklockan bar ingen leveransjitter alls. Den mappas till vaggtid via en
   * LANGSAMT filtrerad offset, sa PLL:ens vaggklocke-ram behalls men jittret
   * forsvinner. Det tar ocksa bort analyslatensen ur fasen: slaget stamplas
   * nar det VAR i ljudet, inte nar det rapporterades.
   */
  private audioClockMs = -1;
  private audioToWallOffset = 0;
  private audioOffsetSeeded = false;
  setAudioClockMs(ms: number): void {
    this.audioClockMs = ms;
    const raw = Date.now() - ms;
    if (!this.audioOffsetSeeded) { this.audioToWallOffset = raw; this.audioOffsetSeeded = true; return; }
    // DISKONTINUITET (mic-omstart, stall): ljudklockan star still medan
    // vaggklockan gar, och en EMA med tau ~5 s skulle lamna slagen felstamplade i
    // sekunder. Ett hopp storre an ett taktslag ar aldrig drift — sa om direkt.
    if (Math.abs(raw - this.audioToWallOffset) > 250) { this.audioToWallOffset = raw; return; }
    // Tidskonstant ~5 s vid 375 Hz: foljer klockdrift, slatar ut leveransjitter.
    this.audioToWallOffset += (raw - this.audioToWallOffset) * 0.0005;
  }
  /** Tillbaka till Date.now(). Nasta setAudioClockMs sar om offseten. */
  clearAudioClock(): void { this.audioClockMs = -1; this.audioOffsetSeeded = false; this.audioToWallOffset = 0; }
  wallNow(): number {
    if (this.virtualOn) return this.virtualEpoch + this.virtualMs;
    return this.audioClockMs >= 0 ? this.audioClockMs + this.audioToWallOffset : Date.now();
  }
  private virtualEpoch = 1700000000000;

  cfg: {
    audio: { rate: number };
    fft: { size: number; hop: number };
    detection: AnalyserDetection;
    onset: { enhancements: boolean };
  };
  /** Taktrastret (kick-grind + taktfas). Nastlad konfig: motorns eget objekt (lases lopande); platt: internt, via setBeatGrid. */
  beatSrc: { beat?: BeatGrid | null };

  /** EN KLOCKA: rutnätet utifrån (lotus PLL via setAnalyserBeatGrid, bänkens BENCH_GRID) är INGEN rutnätskälla - kickgrinden läser
   *  klockans inre rutnät (setClockGrid). Det sparas bara som REFERENS för slagindexet i frame.barShift (EN ETTA, publishPhase):
   *  klockans etta uttryckt i systemets eget rutnäts index. */
  setBeatGrid(grid: BeatGrid | null): void { this.extGrid = grid; }
  private extGrid: BeatGrid | null = null;
  /** Klockans inre rutnät (analyserClock.update / taktvägen HopLaneFast) - analysatorns enda rutnät. */
  setClockGrid(grid: BeatGrid | null): void { this.beatSrc.beat = grid; }

  constructor(cfgIn: AnalyserConfig, splitIn?: SplitInit) {
    this.role = splitIn?.role ?? cfgIn.role ?? 'all';
    const splitBuf = splitIn?.split ?? cfgIn.split;
    if (this.role !== 'all') {
      if (!splitBuf) throw new Error('Analyser: roll ' + this.role + ' kraver split-buffertar');
      const v = viewsOf(splitBuf); this.splitCtrl = v.ctrl; this.splitRing = v.ring; this.splitState = v.state;
      // resumeSeq (full JS-seq) fran index.ts: slow = senast lasta record (omstart av workern fortsatter dar den dog,
      // drainRecords klipper backloggen till RING_N-RING_MARGIN); C_READ ar bara 32 laga bitar och duger inte ensamt.
      this.recSeq = splitIn?.resumeSeq ?? cfgIn.resumeSeq ?? 0;
      this.syncWorker = splitIn?.sync === true;
      if (this.role === 'slow') {
        this.slowGap = true;   // forsta recordet: okand forhistoria -> raknarna tas som utgangspunkt
        // Seqlock-paritet: dog forra workern MITT I stateWrite (terminate/OOM) star C_STATE_SEQ udda for alltid och varje
        // stateRead pa snabba sidan misslyckas — aven mot den nya workern (som skulle skriva udda→jamn→udda). En skribent
        // i taget, sa det ar sakert att jamna till har.
        const sq = Atomics.load(v.ctrl, C_STATE_SEQ); if (sq & 1) Atomics.store(v.ctrl, C_STATE_SEQ, sq + 1);
      }
      if (Analyser.FAST_BANDS && SECTION_AGG_HOP && splitBuf.big && splitBuf.bigPcm && splitBuf.bigState && splitBuf.spec) {
        (this as { bigOn: boolean }).bigOn = true;
        this.bigRing = new Float64Array(splitBuf.big); this.bigPcm = new Float32Array(splitBuf.bigPcm); this.bigState = new Float64Array(splitBuf.bigState); this.specRing = new Float32Array(splitBuf.spec);
        if (this.role === 'slow') {   // omstart av workern: fortsätt i sekvensen, med räknarna (en drop-räknare som hoppar bakåt vore en ny 'drop')
          const sq = Atomics.load(v.ctrl, C_BIG_SEQ); if (sq & 1) Atomics.store(v.ctrl, C_BIG_SEQ, sq + 1);
          const st = this.bigState; this.bigSeq = st[BS_SEQ]; this.drop.dropCount = st[BS_DROPS]; this.drop.miniDropCount = st[BS_MINI]; this.specN = st[BS_SPEC_N]; this.drop.dropCand = st[BS_CAND]; this.sections.secVDrops = this.drop.dropCand;
          this.drop.dropDemoted = st[BS_DEMOTED]; this.drop.dropSpaced = st[BS_SPACED]; this.drop.stopCount = st[BS_STOPS];
        }
      }
    }
    const cfg = this.cfg = {
      audio: { rate: cfgIn.audio?.rate ?? cfgIn.sampleRate ?? 48000 },
      fft: { size: cfgIn.fft?.size ?? cfgIn.fftSize ?? 512, hop: cfgIn.fft?.hop ?? cfgIn.hopSize ?? 128 },
      // Nastlad form: motorns detection-objekt anvands sjalvt (UI:t kan andra AGC-rattarna under drift).
      detection: cfgIn.detection ?? {
        autoGainTarget: cfgIn.autoGainTarget ?? 0.15,
        tauUp: cfgIn.tauUp ?? 3,
        tauDown: cfgIn.tauDown ?? 8,
        noiseFloor: cfgIn.noiseFloor ?? 0.002,
        maxGain: cfgIn.maxGain ?? 20,
      },
      onset: { enhancements: cfgIn.onsetEnhancements ?? false },
    };
    this.beatSrc = cfgIn.detection ? cfgIn : { beat: null };
    this.setSilenceLevel(cfgIn.silenceLevel);
    this.fft = new FFT(cfg.fft.size);
    this.window = hannWindow(cfg.fft.size);
    this.buffer = new Float32Array(cfg.fft.size);
    this.prevMag = new Float32Array(cfg.fft.size / 2);
    this.onsetPeak = new Float32Array(cfg.fft.size / 2);
    this.onsetPrev = new Float32Array(cfg.fft.size / 2);
    this.windowed512 = new Float32Array(cfg.fft.size);
    this.spectrum512 = this.fft.createComplexArray();
    this.mag512 = new Float32Array(cfg.fft.size / 2);
    this.envelope = cfg.detection.autoGainTarget;
    // Dubbel-FFT: 2048 för hög låg-uppl. Egen buffert, matas samma hop-chunks.
    const BIG = 2048;
    this.fftBig = new FFT(BIG);
    this.windowBig = hannWindow(BIG);
    this.windowedBig = new Float32Array(BIG);
    this.bufferBig = new Float32Array(BIG);
    this.prevMagBig = new Float32Array(BIG / 2);
    this.magBig = new Float32Array(BIG / 2);
    this.specBig = this.fftBig.createComplexArray();
    const binHzBig = cfg.audio.rate / BIG;
    for (let b = 0; b < 8; b++) {
      this.bandLo[b] = Math.max(1, Math.round(Analyser.BAND_HZ[b] / binHzBig));
      this.bandHi[b] = Math.min(BIG / 2, Math.round(Analyser.BAND_HZ[b + 1] / binHzBig));
      this.bandPeak[b] = 1e-4;   // seed → själv-kalibrerar inom ~1s
    }
    if (Analyser.FAST_BANDS) {   // snabba banden: 512-binnar för band 3-7, biquads för band 0-2 (RBJ, Q 0,707)
      const binHz = cfg.audio.rate / cfg.fft.size, half = cfg.fft.size / 2;
      for (let b = 3; b < 8; b++) { this.fbLo[b] = Math.max(1, Math.round(Analyser.BAND_HZ[b] / binHz)); this.fbHi[b] = Math.min(half, Math.max(this.fbLo[b] + 1, Math.round(Analyser.BAND_HZ[b + 1] / binHz))); }
      this.fbMax = Math.min(half, this.fbHi[7] + 1);
      if (this.fbMag.length < half) { this.fbMag = new Float32Array(half); this.fbPrevMag = new Float32Array(half); }
      const dtMs = cfg.fft.hop / cfg.audio.rate * 1000;
      for (let b = 0; b < 3; b++) {
        for (let s = 0; s < 2; s++) {
          const f0 = Analyser.BAND_HZ[b + s], w = 2 * Math.PI * f0 / cfg.audio.rate, c = Math.cos(w), al = Math.sin(w) / (2 * Math.SQRT1_2), a0 = 1 + al;
          const o = (b * 2 + s) * 5, C = this.fbCoef;
          if (s === 0) { C[o] = (1 + c) / 2 / a0; C[o + 1] = -(1 + c) / a0; C[o + 2] = (1 + c) / 2 / a0; }   // HP vid bandets nedre kant
          else { C[o] = (1 - c) / 2 / a0; C[o + 1] = (1 - c) / a0; C[o + 2] = (1 - c) / 2 / a0; }          // LP vid övre kanten
          C[o + 3] = -2 * c / a0; C[o + 4] = (1 - al) / a0;
        }
        this.fbA[b] = 1 - Math.exp(-dtMs / Analyser.FB_TAU_MS[b]);
      }
      this.fbAlvl = 1 - Math.exp(-dtMs / 90);
    }
    this.magBigMax = Math.min(BIG / 2, this.bandHi[7] + 1);
    this.magBigView = this.magBig.subarray(0, this.magBigMax);
    this.prevMagBigView = this.prevMagBig.subarray(0, this.magBigMax);
    if (this.bigOn) this.specCopy = new Float32Array(Math.min(SPEC_MAX, this.magBigMax));

    // FÖRBERÄKNADE EMA-ALFOR. dtHop och alla tidskonstanter är fasta, så de 11
    // Math.exp()-anropen per hop (~4000/s vid 375 Hz) hörde inte hemma i tick-vägen.
    const dtHop = cfg.fft.hop / cfg.audio.rate;
    this.dtHop = dtHop;
    this.hopMs = dtHop * 1000;
    const bigDt = dtHop * Analyser.BIG_EVERY;

    this.aAtt = 1 - Math.exp(-dtHop / 0.015);
    this.aRel = 1 - Math.exp(-dtHop / 0.4);
    this.aVU = 1 - Math.exp(-dtHop / 0.20);
    this.levels.aIUp = 1 - Math.exp(-dtHop / 1.5);
    this.levels.aIDown = 1 - Math.exp(-dtHop / 3.0);
    this.aBandLvl = 1 - Math.exp(-bigDt / 0.09);
    this.dHat = Math.exp(-dtHop / 0.06);
    this.dSnare = Math.exp(-dtHop / 0.11);
    this.dKick = Math.exp(-dtHop / 0.15);
    this.riser.aSpecSlow = 1 - Math.exp(-dtHop / 2.0);
    this.riser.aNovSlow = 1 - Math.exp(-dtHop / 1.5);
    this.character.aProf = 1 - Math.exp(-dtHop / 8.0);
    // Ett återanvänt Frame (spec/onset pekar på de pre-allokerade objekten).
    this.outFrame = {
      silent: true, level: 0, levelRaw: 0, levelVU: 0, energy: 0, centroid: 0, flux: 0,
      kick: false, gain: 1, bpm: 0, bpmConfidence: 0, intensity: 0.5,
      dropCount: 0, miniDropCount: 0, dropDemoted: 0, dropSpaced: 0, dropRiseDb: 0, nearDropDb: 0, nearDipDb: 0, liftDb: 0, stopCount: 0, stopS: 0, bodyDb: 0, bassEnergy: 0, bassEnergyShort: 0, bassLevel: 1, midHiDb: -120, inZone: false, breaking: false, buildUp: 0, buildProg: 0, inRiser: false, profile: this.character.outProfile, beatAnchorMs: 0,
      kickAtMs: 0, barShift: -1, beatPhaseMs: 0, beatPhaseConf: 0, beatTrust: 0, section: 'intro', sectionAgeMs: 0, sectionIndex: 0, sectionTier: 1, repeatSim: 0, repeatAgoMs: 0, repeatSection: '', expectHighInMs: -1, prevSection: '', levelVsHighDb: 0, sectionBars: 0,
      spec: this.outSpec, specAbs: this.outSpecAbs, onset: this.outOnset, drum: this.outDrum,
    };
    // Ramen och dess delobjekt skrivs varje hop av optimerad kod: ge alla talfalt Double-form redan har (se stabiliseNumbers).
    for (const o of [this.outFrame, this.character.outProfile, this.outSpec, this.outSpecAbs, this.outOnset, this.outDrum]) stabiliseNumbers(o);
    // Instansfalt som i stabilt lage bytte Smi->Double forst vid sallsynta handelser (V8 --trace-generalization, 540 s).
    // FORSLAG 2026-09-27 (minnesgranskningen, tools/mem/): --trace-generalization over 240 s pop-facit visade att 60 instansfalt
    // byter Smi->Double EFTER start (var och en deprecerar Analyser-kartan: +10..+369 kartor per falt) -> scoreEnv deoptades 41 ggr,
    // process() 13 ggr ("wrong map", "Maps became deprecated during optimization"), och ooptimerad kod boxar varje flyttal:
    // 43 kB skrap/hop kallt mot 1,2 kB/hop stabilt (--no-opt: 1 MB/hop). Listan ar exakt de falt som mattes generalisera.
    for (const k of DOUBLE_FROM_START) { const v = (this as unknown as Record<string, number>)[k]; if (typeof v === 'number') { (this as unknown as Record<string, number>)[k] = 0.5; (this as unknown as Record<string, number>)[k] = v; } }
    stabiliseNumbers(this.sections.secRank as unknown as Record<string, unknown>);
  }

  /** Feed a hop-sized chunk of mono samples, get a frame back. */
  process(samples: Float32Array): Frame {
    if (this.hopLane) this.setClock(this.hopLane.clockBpm, this.hopLane.clockConf);   // EN KÄLLA (a7r): klockans tal ur analysatorns EGEN taktväg (förra hoppets publicering)
    if (this.role === 'fast') this.pullSlowState();
    // Slide buffer left by hop, append new samples at end.
    const hop = samples.length;
    // RMS på rå (o-fönstrad) buffert — LÖPANDE SUMMA. Bufferten glider en hop i
    // taget, så det räcker att dra av utgående hop och lägga till den inkommande
    // (128 ops i stället för 512 kvadrater, 375 gånger i sekunden). Full omräkning
    // ~1×/s mot flyttalsdrift.
    let ss = this.sumSq;
    for (let i = 0; i < hop; i++) { const v = this.buffer[i]; ss -= v * v; }
    this.buffer.copyWithin(0, hop);
    this.buffer.set(samples, this.buffer.length - hop);
    // Läs den INKOMMANDE hopen ur this.buffer (efter set), inte ur `samples`: annars
    // adderas float64-tal och subtraheras float32-tal → systematisk drift, inte brus.
    for (let i = this.buffer.length - hop; i < this.buffer.length; i++) { const v = this.buffer[i]; ss += v * v; }
    if (++this.rmsRecalc >= 400 || ss < 0) {
      this.rmsRecalc = 0; ss = 0;
      for (let i = 0; i < this.buffer.length; i++) { const v = this.buffer[i]; ss += v * v; }
    }
    this.sumSq = ss;
    // DC-HANTERING: PROVAT OCH FÖRKASTAT (2026-08-23), båda vägarna kostade lås:
    //  • utesluta bin 0 ur bass/kick-banden — binbredden är 93.75 Hz, så bin 0 är
    //    0–94 Hz och BÄR bastrumman ("brusigt rum 136" gick 100 % → 0 %);
    //  • dra bort fönstrets medelvärde före FFT:n — vid 512 sampel (10.7 ms) är det
    //    ett högpass kring 100 Hz som dämpade 58 Hz-kicken (92/100 BPM låste på 113);
    //  • RMS som standardavvikelse (ss/N − mean²) — sänkte nivån just under
    //    energi-grinden i brusiga rum (100 % → 0 %).
    const rms = Math.sqrt(ss / this.buffer.length);

    // Windowed FFT (pre-allokerade scratchpads → ingen alloc/hop)
    const windowed = this.windowed512;
    { const buf = this.buffer, win = this.window; for (let i = 0; i < windowed.length; i++) windowed[i] = buf[i] * win[i]; }
    const spectrum = this.spectrum512;
    this.fft.realTransform(spectrum, windowed);

    // Magnitude spectrum + bass band (mag återanvänds; swap:as med prevMag nedan)
    const half = this.cfg.fft.size / 2;
    const mag = this.mag512;
    let bassEnergy = 0;
    let flux = 0;
    let kickFlux = 0;                               // onset ENBART i kick-bandet (sub-bas)
    let powSum = 0, powW = 0;                       // för spektralt centroid (EFFEKT-viktat)
    const bassBins = Math.min(16, half);                            // ~0–1.5 kHz
    const kickBins = Math.min(1, half);                             // ENBART bin 0 ≈ 0–94 Hz (bastrummans transient, inte basgången)
    const enhancedOnset = this.cfg.onset.enhancements;

    // Ljusets nivå använder fortfarande rå magnitud. Onset-vägen kan däremot
    // komprimeras och vitbalanseras per FFT-bin, så en högljudd/tonal källa inte
    // sväljer svagare transienter i tempogrammet.
    // TRE LOOPAR I STÄLLET FÖR EN (a7, samma aritmetik i samma ordning): basbinnen (onset + snabba bandens magnitud = samma
    // sqrt som m), binnen upp till de snabba bandens tak (sqrt) och resten (bara centroidens summor). Fälten hissade ut ur
    // loopen (ingen this-läsning per varv); powSum/powW summeras fortfarande i stigande bin-ordning.
    const fbMax = Analyser.FAST_BANDS ? this.fbMax : 0, fbMag = this.fbMag;
    const onsetPeak = this.onsetPeak, onsetPrev = this.onsetPrev, peakDecay = this.onsetPeakDecay, peakReady = this.onsetPeakReady, PFLOOR = Analyser.ONSET_PEAK_FLOOR;
    for (let i = 0; i < bassBins; i++) {
      const re = spectrum[2 * i];
      const im = spectrum[2 * i + 1];
      const p = re * re + im * im;
      const m = Math.sqrt(p);
      bassEnergy += m;
      let onsetMag = m;
      if (enhancedOnset) {
        // Log-kompression före differensen + SuperFlux-liknande långsam
        // per-bin-whitening. Peak uppdateras före division så varje bin börjar
        // på en stabil skala även när signalen startar från tystnad.
        const compressed = Math.log1p(m);
        let peak = onsetPeak[i] * peakDecay;
        if (compressed > peak) peak = compressed;
        onsetPeak[i] = peak;
        onsetMag = peakReady ? compressed / Math.max(PFLOOR, peak) : 0;
      }
      mag[i] = m;
      const dd = onsetMag - onsetPrev[i];
      onsetPrev[i] = onsetMag;
      if (dd > 0) { flux += dd; if (i < kickBins) kickFlux += dd; }   // half-wave rectified
      powSum += p; powW += i * p;
      if (i < fbMax) fbMag[i] = m;
    }
    const fbEnd = Math.max(bassBins, Math.min(fbMax, half));
    for (let i = bassBins; i < fbEnd; i++) {
      const re = spectrum[2 * i], im = spectrum[2 * i + 1], p = re * re + im * im;
      powSum += p; powW += i * p;
      fbMag[i] = Math.sqrt(p);
    }
    for (let i = fbEnd; i < half; i++) {
      const re = spectrum[2 * i], im = spectrum[2 * i + 1], p = re * re + im * im;
      powSum += p; powW += i * p;
    }
    this.onsetPeakReady = true;
    if (enhancedOnset) {
      for (let i = 0; i < bassBins; i++) this.prevMag[i] = this.onsetPrev[i];
    }

    // Swap: denna hops magnitud blir nästa hops prevMag (zero-copy, ingen alloc).
    { const t = this.prevMag; this.prevMag = this.mag512; this.mag512 = t; }
    // Gain-compensated like `level` — otherwise the band-driven fixtures and
    // the kick energy gate die at low volume while the AGC keeps level alive.
    const energy = Math.min(1, (bassEnergy / bassBins) * 0.02 * this.gain);
    // CENTROID-KALIBRERING (mätt 2026-08-23, 60 s syntetisk låt 128 BPM, statistik
    // på `frame.centroid` = det EMA-utjämnade värdet, inte råvärdet per hop):
    //   magnitudviktad (gamla) p10/p50/p90 = 0.194 / 0.254 / 0.343
    //   effektviktad rå                    = 0.025 / 0.044 / 0.115
    // Effektvikten kvadrerar ungefär tyngdpunkten, så sqrt återställer skalan.
    // KONSTANTEN 1.47 ÄR PASSAD MOT MEDIANEN, inget annat: sqrt är monoton, så en
    // enda faktor kan bara träffa en percentil. Efter ändringen mätte utjämnade
    // p10/p50/p90 = 0.176 / 0.223 / 0.353 — p50 landar där den låg, svansarna
    // ungefär (den övre något bredare). Kostar 1 sqrt/hop i stället för 240, och
    // `centSmooth > centSlow + 0.06` samt effektlagrets färgtemperatur läser rätt
    // storleksordning igen.
    // FOTNOT: sqrt(effektviktad tyngdpunkt) är INTE samma mått som magnitudviktad —
    // effektvikten ger de starkaste binen mer att säga till om, så glesa/ljusa
    // arrangemang (sparsam techno, akustiskt) kan landa annorlunda. Riser-grinden är
    // relativ och tål det; färgtemperaturen är absolut och märks först. Ser lamporna
    // ovanligt varma ut på ett spår utanför sviten är det här konstanten sitter.
    const centroid = powSum > 1e-12 ? Math.min(1, Math.sqrt(1.47 * (powW / powSum) / half)) : 0;
    const fluxNorm = Math.min(1, flux * (enhancedOnset ? 0.08 : 0.005));

    // Auto-gain (slow: seconds-to-minute timescales)
    const now = this.perfNow();
    const dt = this.lastT === 0 ? 0 : Math.max(0, Math.min(0.1, (now - this.lastT) / 1000));
    this.lastT = now;
    const d = this.cfg.detection;
    // AGC körs BARA för mic (aux låser gain på 1× — line-level är hett & stabilt).
    // PERCENTIL-AGC (från Lotus, live-mätt): envelopen är 95:e percentilen av RÅ rms
    // över ~2 s, inte en EMA av den gainade momentannivån. Målet är ett TAK för
    // topparna. Långsam attack (tauUp×2) så uppbyggnader får höras, snabb retreat
    // (tauDown×0.25) eftersom AGC:n inte kan ta bort redan inbränd klippning.
    this.dbgRms = rms;
    this.hRms = rms; this.hNow = now; this.hDt = dt;
    this.hGated = rms >= this.cfg.detection.noiseFloor * 1.5;   // BRUSGRINDEN (a7): enda jämförelsen, snabba sidan; workern läser activeMs > 0 (B_ACTIVE)
    if (!this.gainLocked && rms > d.noiseFloor) this.levels.agcStep();

    const level = Math.min(1, rms * this.gain);

    this.hKickFlux = kickFlux; this.hEnergy = energy;
    const kick = this.kicks.kickStep();

    // Hoppets längd i ms. (Tva stallen nedan raknar fortfarande `dtHop * 1000`
    // for hand i stallet for att lasa den har — numeriskt identiskt, men
    // pastaendet "en enda forberaknad konstant" var inte sant.)
    const hopMs = this.hopMs;
    // Tystnad → nollställ BPM-klockan så beat-effekter inte fortsätter i fantom-takt.
    this.hHopMs = hopMs;
    this.levels.silenceStep();
    // --- Onset-envelope → lokal BPM (nedsamplad till 100 Hz) ---

    this.envAccum = Math.max(this.envAccum, fluxNorm);
    // Basbandets egen envelope (kick-flux) — samma raster, oberoende signal.
    const bassFluxNorm = Math.min(1, kickFlux * (this.cfg.onset.enhancements ? 0.5 : 0.02));
    if (bassFluxNorm > this.envBassAccum) this.envBassAccum = bassFluxNorm;
    // TYDLIG BASGANG: basnivans topp per env-sampel + senaste kick (se stepBassline).
    const big = this.bigOn;   // STORA VÄGEN (fast): basgången, 2048-vägen, drop, riser, profil och sektionsaggregatet körs i långsamma tråden
    if (!big) { const bl = this.bandLvl[1] + this.bandLvl[2]; if (bl > this.blAccum) this.blAccum = bl; if (this.kickHit >= 1) this.blKickSeq = this.bass.envSeq; }
    if (HIGH_ON) { const hi = this.bandOn[6] > this.bandOn[7] ? this.bandOn[6] : this.bandOn[7]; if (hi > this.envHighAccum) this.envHighAccum = hi; }
    this.envAccumT += hopMs;
    if (this.envAccumT >= 1000 / Analyser.ENV_HZ) this.envSampleStep();
    // #2 Förfina förra kickens fas: nu har vi y(-1)=kfPrev2, y(0)=kfPrev, y(+1)=kickFlux
    // runt kick-hopet. Parabelns topp ger sub-hop-offset δ ∈ [-0.5,0.5] hop.
    let kickAtMs = 0;

    if (this.pendingKickMs > 0) { this.kicks.kickRefine(); kickAtMs = this.hKickAt; }
    if (kick) {
      this.beatAnchorMs = this.wallNow();
      this.pendingKickMs = this.beatAnchorMs;
    }

    this.kfPrev2 = this.kfPrev;
    this.kfPrev = kickFlux;

    const dtHop = this.dtHop;
    const aAtt = this.aAtt;
    const aRel = this.aRel;
    // Modulnivå-funktion, inte closure: två closures per hop (~750/s) allokerades
    // rakt emot filens 0-alloc-ambition.
    this.lvlSmooth = ema(this.lvlSmooth, level, aAtt, aRel);
    // VU-nivå: symmetrisk ~200ms lågpass PÅ HOP-TAKT (integrerar alla 375 hops/s
    // → långt mindre brus än att smootha rå-nivån efter 50Hz-decimering). ≤200 BPM
    // = ett slag var ≥300ms, så 200ms suddar aldrig ut en äkta beat — bara brus.
    this.lvlVU += (level - this.lvlVU) * this.aVU;
    this.engSmooth = ema(this.engSmooth, energy, aAtt, aRel);
    this.centSmooth = ema(this.centSmooth, centroid, aAtt, aRel);

    this.levels.intensityStep();
    const intensity = this.hIntensity;

    // --- DUBBEL-FFT: hög-upplöst log-spektrum för effekterna ---
    // Egen glidande 2048-buffert, matas samma hop. Ger 23 Hz/bin i botten så
    // sub/kick/bas separeras. Per-band AGC-nivå + per-band adaptiv onset.
    // Bufferten matas VARJE hop (glidande fönster måste vara obrutet)...
    if (!big) {
    this.bigRingPush(samples);
    // ...men själva FFT:n + band-analysen körs bara var BIG_EVERY:e hop. 2048-FFT:n
    // är analysatorns dyraste steg och spec-NIVÅERNA smoothas ändå ~90ms — de behöver
    // inte 375Hz. MÄTT: analysen tog 3.8ms/hop mot 2.67ms budget → ljud droppades och
    // ljuset låg 40–140ms efter. Decimeringen får den att rymmas i realtid.
    // Tidssteget skalas (bigDt) så smoothing-tidskonstanterna blir oförändrade.
    if (++this.bigCounter >= Analyser.BIG_EVERY) this.bigStep();
    }
    if (Analyser.FAST_BANDS) this.fastBandStep(samples);
    // TRUM-KIT peak-hold-envelopes PÅ HOP-TAKT (var 2.7ms) → fångar varje anslag,
    // aldrig missat mellan två render-frames (100Hz). tau bevarade från effects.ts:
    // hat 60ms (treble+air-onset O[6]/O[7]) / snare 110ms (highMid-onset O[5]) / kick 150ms
    // (ENBART diskret kick — se nedan). bass = spec.bass-NIVÅ (L[2], ingen envelope).
    // Hi-hats/sizzle i modern EDM/trap ligger ofta >10 kHz, så hat får lyssna på både
    // treble (3,5–10 kHz) och air (10–16 kHz) och ta den starkaste transienten.
    const ON = Analyser.FAST_BANDS ? this.fbOn : this.bandOn;   // trumenveloperna är ljus: snabba banden med FAST_BANDS
    const hatOnset = ON[6] > ON[7] ? ON[6] : ON[7];
    this.hatHit = Math.max(this.hatHit * this.dHat, hatOnset);
    this.snareHit = Math.max(this.snareHit * this.dSnare, ON[5]);
    // Drivs ENBART av den riktiga kick-detektorn (median + 4.5*MAD). Tidigare
    // fylldes den ocksa pa av bandOn[1], men det bandet (60-120 Hz) domineras av
    // sustained bas: MATT 816-1377 anslag/min dar ~110 fanns, dvs 8x for manga.
    // Den svammade over den korrekta detektorn sa envelopen aldrig slocknade och
    // kicken forlorade sin accent.
    if (kick) this.kickHit = 1;
    else this.kickHit = this.kickHit * this.dKick;
    // ── DROP-DETEKTION (flyttad hit: att AVGÖRA om det är en drop är analys) ──
    // En "riktig" drop = nivån surgar upp mot låtens tak EFTER en break (svacka).
    // Topp-zonen har hysteres (in vid 85% av taket, ut först vid 70%) så nivån inte
    // flimrar kring tröskeln. Kräver ≥2s musik så låtens INTRO (tystnad→musik) inte
    // läses som en drop. Resultatet exponeras som en MONOTON räknare → en konsument
    // på lägre takt kan aldrig missa flanken.
    const nowWallA = this.wallNow();
    this.levels.zoneStep();
    // `breaking` = nivån ligger i en svacka. Exponeras till effektlagret (lugnt läge).
    // Den GAMLA svack-stämpeln (breakAtMs, 400 ms ihållande) grindade drop-villkoret
    // innan flanken flyttades till baskroppen; den är borttagen med sitt villkor.
    const breaking = this.lvlSmooth < this.levelCeil * 0.65;
    const inZone = this.levels.inZoneState;
    // BASKROPPEN — drop-detektionens egen signal (tak + frånvaro + stigningstakt).
    // `inZone` lämnas orörd: effektlagret använder den som "musiken ligger högt".

    this.hKick = kick; this.hNowWall = nowWallA;
    let inRiser: boolean;
    if (big) {
      this.hIntensity = intensity; this.hBreaking = breaking;
      this.pushBig(samples);
      inRiser = this.hInRiser;
    } else {
      const bodyNow = (this.bandDbRaw[0] + this.bandDbRaw[1] + this.bandDbRaw[2]) / 3;   // ra dB
      this.hBody = bodyNow;
      this.dSec = this.section; this.dLvh = this.levelVsHighDb;
      this.drop.dropStep();
      inRiser = this.riser.riserStep();
      this.dConf = this.localBpmConfidence;
      this.character.profileStep();
    }
    this.hLevel = level; this.hFlux = fluxNorm; this.hIntensity = intensity; this.hInZone = inZone; this.hBreaking = breaking; this.hInRiser = inRiser;
    this.hKickAt = kickAtMs;
    return this.fillFrame();
  }

  /** Ett onset-envelope-sampel (ENV_HZ): dubbelslagsdampning, ringar, basgang, sektionsflush/record till workern. */
  private envSampleStep(): void {
      this.envAccumT -= 1000 / Analyser.ENV_HZ;
      // DUBBELSLAG: tva anslag narmare an REFRAC_N sampel ar SAMMA handelse.
      // Anvandarens regel: "om det ar mindre an X ms mellan slag ar det ett
      // dubbelslag och 1a ska raknas till bpm". Implementerad som icke-max-
      // undertryckning (standard onset-peakplockning): ett sampel som foregas av
      // ett STORRE inom fonstret dampas bort.
      // 200 ms (20 sampel @ ENV_HZ 100) UPPMATT som optimum pa 110 ljudklipp
      // ur tva genrer: unika latar ratt 13/18 -> 15/18, snitt 89.7 -> 91.7 %.
      //   100 ms 13/18 · 150 ms 15/18 (90.8) · 200 ms 15/18 (91.7) · 250 ms 12/18
      //   300 ms 14/18 · 400 ms 13/18
      // Att 200 slar 300 ar logiskt: vid 150 BPM ar en attondel exakt 200 ms, sa
      // ett bredare fonster borjar ata genuina attondelar i stallet for prydnadsslag.
      // Loste dessutom syntetscenariot "svag bas + pad 132" som legat pa 0 % sedan
      // lange -- just utsmetade anslag ar dar dubbelslagen gor mest skada.
      let _e = this.envAccum;
      const _R = Analyser.REFRAC_N;
      if (_R > 0 && _e > 0) {
        let _big = false;
        for (let _k = 1; _k <= _R; _k++) {
          const _i = (this.envPos - _k + Analyser.ENV_LEN * 2) % Analyser.ENV_LEN;
          if (this.envRing[_i] >= _e) { _big = true; break; }
        }
        if (_big) _e *= Analyser.REFRAC_ATT;
      }
      const _b = this.envBassAccum, _h = this.envHighAccum;
      this.envRing[this.envPos] = _e;
      this.envBassRing[this.envPos] = _b;
      if (this.bigOn) { this.bigEnvFlag = 1; this.bigEnvBpm = this.localBpm; } else { this.dBpm = this.localBpm; this.bass.stepBassline(); }
      if (HIGH_ON) this.envHighRing[this.envPos] = _h;
      this.envPos = (this.envPos + 1) % Analyser.ENV_LEN;
      this.envFilled = Math.min(this.envFilled + 1, Analyser.ENV_LEN);
      this.envAccum = 0;
      this.envBassAccum = 0;
      if (HIGH_ON) this.envHighAccum = 0;
      // Sektionens blocksummor levereras per ENV-SAMPEL i bada rollerna (SECTION_AGG 'env': samma kodvag -> delad och odelad
      // analysator ar bit-identiska). SECTION_AGG 'hop': odelad analysator kor sectionHop per hop sist i process().
      if (this.role === 'fast') { this.pushSlowRecord(_e, _b, _h); } else if (!SECTION_AGG_HOP) this.sections.sectionFlushAgg();
  }

  /** SNABBA BANDEN (FAST_BANDS, se fältet): varje hop, till fb*-uppsättningen. Samma nivå/AGC/onset-räkning som 2048-vägens bandloop
   *  i bigStep, med tidskonstanterna per hop i stället för per stor-FFT (nivå 90 ms, peak-decay 0,9993, onset-steg 0,002, uppvärmning
   *  ONSET_WARM x BIG_EVERY hop). */
  private fastBandStep(samples: Float32Array): void {
    const gated = this.hGated;
    if (gated) this.fbWarm++; else this.fbWarm = 0;
    const warm = gated && this.fbWarm >= Analyser.ONSET_WARM * Analyser.BIG_EVERY;
    const C = this.fbCoef, S = this.fbState, n = samples.length;
    for (let b = 0; b < 8; b++) {
      let avg: number, fluxN: number;
      if (b < 3) {   // biquad HP + LP i följd, effekten per hop, utjämnad; amplitud = rot ur effekten, skalad till ett bandmedel
        const o1 = b * 10, o2 = o1 + 5, s1 = b * 8, s2 = s1 + 4;
        let x1 = S[s1], x2 = S[s1 + 1], y1 = S[s1 + 2], y2 = S[s1 + 3], u1 = S[s2], u2 = S[s2 + 1], v1 = S[s2 + 2], v2 = S[s2 + 3], pw = 0;
        // Koefficienterna i lokala konstanter (a7): tio typade läsningar per sampel bort, samma tal i samma uttryck.
        const a0 = C[o1], a1 = C[o1 + 1], a2 = C[o1 + 2], a3 = C[o1 + 3], a4 = C[o1 + 4];
        const c0 = C[o2], c1 = C[o2 + 1], c2 = C[o2 + 2], c3 = C[o2 + 3], c4 = C[o2 + 4];
        for (let i = 0; i < n; i++) {
          const x = samples[i];
          const y = a0 * x + a1 * x1 + a2 * x2 - a3 * y1 - a4 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y;
          const v = c0 * y + c1 * u1 + c2 * u2 - c3 * v1 - c4 * v2; u2 = u1; u1 = y; v2 = v1; v1 = v;
          pw += v * v;
        }
        S[s1] = x1; S[s1 + 1] = x2; S[s1 + 2] = y1; S[s1 + 3] = y2; S[s2] = u1; S[s2 + 1] = u2; S[s2 + 2] = v1; S[s2 + 3] = v2;
        this.fbPow[b] += (pw / n - this.fbPow[b]) * this.fbA[b];
        avg = Math.sqrt(this.fbPow[b]) * Analyser.FB_K[b];
        const d = avg - this.fbPrevAmp[b]; fluxN = d > 0 ? d : 0; this.fbPrevAmp[b] = avg;
      } else {       // 512-FFT:ns binnar (fbMag fylls i process()), flux mot förra hoppet
        const lo = this.fbLo[b], hi = this.fbHi[b], m = this.fbMag, pm = this.fbPrevMag;
        let sum = 0, fl = 0;
        for (let i = lo; i < hi; i++) { const v = m[i]; sum += v; const d = v - pm[i]; if (d > 0) fl += d; }
        const nb = hi - lo;
        avg = sum / nb * Analyser.FB_K[b]; fluxN = fl / nb * Analyser.FB_K[b];
      }
      this.fbAbs[b] = avg;
      if (b >= 3) this.fbDbRaw[b] = 20 * Math.log10(avg + 1e-7);   // bara band 3-7 läses (midHiDb)
      const minPeak = this.lvlSmooth * 0.15;
      if (gated && avg > this.fbPeak[b]) this.fbPeak[b] = Math.max(avg, minPeak);
      else this.fbPeak[b] = Math.max(this.fbPeak[b] * 0.9993, minPeak);
      const lvlRawB = gated ? Math.min(1, avg / (this.fbPeak[b] + 1e-6)) : 0;
      this.fbLvl[b] += (lvlRawB - this.fbLvl[b]) * this.fbAlvl;
      const oStep = 0.002;
      const dOMed = fluxN - this.fbOnMed[b];
      this.fbOnMed[b] += (dOMed > 0 ? 1 : dOMed < 0 ? -1 : 0) * oStep * (this.fbOnMed[b] + 0.01);
      const dOMad = Math.abs(fluxN - this.fbOnMed[b]) - this.fbOnMad[b];
      this.fbOnMad[b] += (dOMad > 0 ? 1 : dOMad < 0 ? -1 : 0) * oStep * (this.fbOnMad[b] + 0.01);
      if (this.fbOnMed[b] < 0) this.fbOnMed[b] = 0;
      if (this.fbOnMad[b] < 0) this.fbOnMad[b] = 0;
      const oThr = this.fbOnMed[b] + Analyser.ONSET_K * this.fbOnMad[b];
      this.fbOn[b] = warm ? Math.max(0, Math.min(1, (fluxN - oThr) / Math.max(1e-6, this.fbOnMad[b] * 3))) : 0;
    }
    { const t = this.fbPrevMag; this.fbPrevMag = this.fbMag; this.fbMag = t; }
  }

  /** Decimerad stor-FFT (var BIG_EVERY:e hop): 2048-magnitud, latminnets spec-sink, basonset-envelope, 8 band (niva/AGC/onset) + swap. */
  private bigStep(): void {
    this.bigCounter = 0;
    { const buf = this.bufferBig, w = this.windowBig, out = this.windowedBig, B = buf.length, p = this.bigPos, n1 = B - p;
      for (let i = 0; i < n1; i++) out[i] = buf[p + i] * w[i];
      for (let i = n1; i < B; i++) out[i] = buf[i - n1] * w[i]; }
    this.fftBig.realTransform(this.specBig, this.windowedBig);
    // Bara upp till högsta bin som någon läser (band 8 slutar vid 16 kHz ≈ bin 683,
    // låtminnet slutar vid 5 kHz ≈ bin 218). Resterande ~340 sqrt per stor-FFT hade
    // ingen läsare.
    // Hissade referenser: JIT:en slipper verifiera this-formen per varv och kan
    // hålla pekarna i register. Samma aritmetik, samma utfall.
    const specBig = this.specBig, magBig = this.magBig, magMax = this.magBigMax;
    for (let i = 0; i < magMax; i++) {
      const re = specBig[2 * i], im = specBig[2 * i + 1];
      magBig[i] = Math.sqrt(re * re + im * im);
    }

    // LÅTMINNET får samma magnitud (ingen extra FFT). Anropas före swap:en nedan,
    // så bufferten faktiskt innehåller DENNA frames spektrum. Skickas som cachad vy
    // (0..magBigMax) — svansen räknas inte, så ingen läsare kan tyst få nollor.
    if (this.bigOn) { const k = ++this.specN, R = this.specRing!, o = (k % SPEC_SLOTS) * SPEC_MAX; R.set(this.magBigView.subarray(0, this.specCopy.length), o); }
    else this.specSink?.(this.magBigView, this.cfg.audio.rate / this.bufferBig.length);
    const gated = this.activeMs > 0;   // brusgrinden ur snabba sidan (B_ACTIVE) - workerns cfg-kopia läses inte

    // Signal i rad? Räknaren driver ONSET_WARM ovan.

    if (gated) this.onsetWarm++; else this.onsetWarm = 0;

    // Samma hissning som magnitud-loopen: pekarna ut ur this före det inre varvet.
    const bandLo = this.bandLo, bandHi = this.bandHi;
    const prevMagBig = this.prevMagBig;
    if (!SECTION_AGG_HOP) {   // a3r: bara SECTION_AGG 'env' laser basonset-ringen (g.bon/g.bpk); i 'hop' (DMX) var den dod - 11 log10 per stor-FFT
      // BASONSET-ENVELOPE (09-23, sektionssardrag): som librosa onset_strength(fmax 220): medel over basbinen (20-250 Hz) av
      // halvvagslikriktad dB-skillnad mot forra stor-FFT:n. Toppplockning som onset_detect (pre_max/avg/post_avg/wait/delta) pa
      // 8 ms-raster med 100 ms fordrojning (post_avg) - toppen raknas i det block som pagar, sa fordrojningen ar harmlos.
      const lo = bandLo[0], hi = bandHi[2]; let o = 0;
      for (let i = lo; i < hi; i++) { const d = 20 * Math.log10((magBig[i] + 1e-6) / (prevMagBig[i] + 1e-6)); if (d > 0) o += d; }
      o /= Math.max(1, hi - lo);
      const L = Analyser.BASSON_LEN, R = this.bassOnRing, n = this.bassOnN, A = Analyser.BASSON_AVG;
      R[n % L] = o; this.bassOnN = n + 1;
      // kandidat c = n - A (100 ms bakat): lokalt max over [c - pre_max, c], >= medel over [c - A, c + A] + delta, wait sedan forra toppen
      if (n >= 2 * A) {
        const c = n - A; const xc = R[c % L]; let ok = true;
        for (let k = 1; k <= Analyser.BASSON_MAX && ok; k++) if (R[(c - k) % L] > xc) ok = false;
        if (ok) { let s = 0; for (let k = c - A; k <= n; k++) s += R[k % L]; if (xc < s / (2 * A + 1) + Analyser.BASSON_DELTA) ok = false; }
        if (ok && c - this.bassOnLastPk > Analyser.BASSON_WAIT) { this.bassOnLastPk = c; this.bassOnPeak = true; }
      }
    }
    for (let b = 0; b < 8; b++) {
      const lo = bandLo[b], hi = bandHi[b];
      const nb = Math.max(1, hi - lo);
      let sum = 0, fl = 0;
      for (let i = lo; i < hi; i++) {
        const m = magBig[i];
        sum += m;
        const d = m - prevMagBig[i];
        if (d > 0) fl += d;
      }
      const avg = sum / nb;
      // Lotus-adaptern använder rå bandmagnitud som spektral andel för ljuset.
      // Den får inte ersättas av bandLvl, som är per-band AGC-normaliserad.
      this.bandAbs[b] = avg;
      // Obehandlad nivå i dB. Ingen AGC → en stigning syns som stigning (riserns fönster: se riserStep).
      const db = 20 * Math.log10(avg + 1e-7);
      this.bandDbRaw[b] = db;   // RA dB (drop-kropp, riser)
      this.secSpecDirty = true;
      // Per-band AGC: skala mot egen långsamt sjunkande peak → varje band nyttjar
      // full range oavsett mix (bas dominerar annars alltid rå-magnituden).
      // GOLV (~0.15·lvlSmooth): peaken nollställs INTE i tystnad → när ett tidigare
      // tyst band (t.ex. diskant i ett intro) smäller till blir det en balanserad
      // respons, inte en överstyrd ljus-chock/pump. (Gemini.)
      const minPeak = this.lvlSmooth * 0.15;
      // DECAYEN SKALAS MED BIG_EVERY: blocket körs 125/s, inte 375/s. Rå 0.9993 gav
      // τ ≈ 11 s i stället för kalibrerade ~3.8 s (ett hett band höll sin peak in i
      // nästa parti → konstlat låg diskant efter en drop). PEAK_DECAY = 0.9993^BIG_EVERY.
      if (gated && avg > this.bandPeak[b]) this.bandPeak[b] = Math.max(avg, minPeak);
      else this.bandPeak[b] = Math.max(this.bandPeak[b] * Analyser.PEAK_DECAY, minPeak);
      // Nivån smoothas ~90ms PÅ HOP-TAKT → nivå-drivna/lugna effekter (som läser
      // spec via ctx.band) flimrar inte av det råa per-hop-AGC-bruset. onset lämnas
      // skarp (nedan) så transient-drivna effekter behåller sin punch.
      const lvlRawB = gated ? Math.min(1, avg / (this.bandPeak[b] + 1e-6)) : 0;
      // EN array, inte tva. `bandLvlSm` hade exakt en lasare — kopieringen till
      // `bandLvl` — sa tva Float32Array(8) bar identiska varden hela tiden.
      this.bandLvl[b] += (lvlRawB - this.bandLvl[b]) * this.aBandLvl;
      // Per-band onset: halvvågs-flux mot adaptiv baslinje (som kick-detektorn) →
      // rena anslag oberoende av bandets absoluta energi.
      const fluxN = fl / nb;
      // ROBUST PROMINENS-GRIND (samma som kick-detektorn anvander, banden fick den
      // aldrig). Den gamla grinden var "1.3x en EMA-baslinje x6", vilket slapper
      // igenom varje transient i bandet i stallet for verkliga trumslag.
      //   MATT vid BPM 134: kick 1116 slag/min (borde ~134, 8x for manga),
      //   virvel 429/min (borde ~67, 6x). Darfor kandes trum-envelopen alltid pa
      //   och gav ingen musikalisk accent - den var inte matttad, den overtriggade.
      // Sign-baserad median + MAD ar okanslig for outliers (ett slag ar en outlier
      // och far darfor INTE dra upp sin egen troskel, till skillnad fran en EMA).
      // Steget skalas med BIG_EVERY sa tidskonstanten blir samma som kickens trots
      // att banden uppdateras var tredje hop.
      const oStep = 0.002 * Analyser.BIG_EVERY;
      const dOMed = fluxN - this.onsetMed[b];
      this.onsetMed[b] += (dOMed > 0 ? 1 : dOMed < 0 ? -1 : 0) * oStep * (this.onsetMed[b] + 0.01);
      const dOMad = Math.abs(fluxN - this.onsetMed[b]) - this.onsetMad[b];
      this.onsetMad[b] += (dOMad > 0 ? 1 : dOMad < 0 ? -1 : 0) * oStep * (this.onsetMad[b] + 0.01);
      // Samma klamp som kick-spåraren ovan, av samma skäl: -0.01 är en dödsfälla.
      // Här blir följden att ALLA åtta band låser på bandOn = 1 konstant.
      if (this.onsetMed[b] < 0) this.onsetMed[b] = 0;
      if (this.onsetMad[b] < 0) this.onsetMad[b] = 0;
      const oThr = this.onsetMed[b] + Analyser.ONSET_K * this.onsetMad[b];
      // Skala mot MAD i stallet for en fast faktor -> sjalvskalande per band.
      // UPPVÄRMNING — ANNARS BLIXTRAR ALLA ÅTTA BAND TILL 1,0 EFTER VARJE TYSTNAD.
      // Nämnaren är MAD, och MAD sjunker mot noll under tystnad (τ ≈ 1,3 s). När
      // musiken kommer tillbaka slår `gated` om i samma ögonblick, nämnaren står
      // på golvet 1e-6, och varje positivt flux klampar till 1 — i ~1,5 s, i alla
      // band samtidigt. Alltså en fullskalig ljussmäll vid varje låtgräns med paus.
      // Vi väntar in MAD i stället för att gissa en amplitudtröskel: räknaren mäter
      // exakt den uppbyggnadstid nämnaren behöver.
      this.bandOn[b] = (gated && this.onsetWarm >= Analyser.ONSET_WARM)
        ? Math.max(0, Math.min(1, (fluxN - oThr) / Math.max(1e-6, this.onsetMad[b] * 3)))
        : 0;
    }
    { const t = this.prevMagBig; this.prevMagBig = this.magBig; this.magBig = t;
      const v = this.prevMagBigView; this.prevMagBigView = this.magBigView; this.magBigView = v; }
  }

  /** Muterar det ateranvanda Frame:t (spec/onset/drum + alla skalarer) och kor sektionsaggregatet. Bara skalarer in: ingen allokering per hop. */
  private fillFrame(): Frame {
    const level = this.hLevel, fluxNorm = this.hFlux, kick = this.hKick, intensity = this.hIntensity, bodyNow = this.hBody, inZone = this.hInZone, breaking = this.hBreaking,
      inRiser = this.hInRiser, kickAtMs = this.hKickAt, nowWallA = this.hNowWall;
    const FB = Analyser.FAST_BANDS, L = FB ? this.fbLvl : this.bandLvl, A = FB ? this.fbAbs : this.bandAbs, O = FB ? this.fbOn : this.bandOn;   // ljusfälten
    const spec = this.outSpec, specAbs = this.outSpecAbs, onset = this.outOnset;
    spec.sub = L[0]; spec.kick = L[1]; spec.bass = L[2]; spec.lowMid = L[3]; spec.mid = L[4]; spec.highMid = L[5]; spec.treble = L[6]; spec.air = L[7];
    specAbs.sub = A[0]; specAbs.kick = A[1]; specAbs.bass = A[2]; specAbs.lowMid = A[3]; specAbs.mid = A[4]; specAbs.highMid = A[5]; specAbs.treble = A[6]; specAbs.air = A[7];
    onset.sub = O[0]; onset.kick = O[1]; onset.bass = O[2]; onset.lowMid = O[3]; onset.mid = O[4]; onset.highMid = O[5]; onset.treble = O[6]; onset.air = O[7];
    const dr = this.outDrum;
    dr.kick = this.kickHit; dr.snare = this.snareHit; dr.hat = this.hatHit; dr.bass = L[2];

    // Mutera det återanvända Frame:t (spec/onset pekar redan på outSpec/outOnset).
    const f = this.outFrame;
    f.silent = this.lvlSmooth <= this.silenceLevel; f.level = this.lvlSmooth; f.levelRaw = level; f.levelVU = this.lvlVU;
    f.energy = this.engSmooth;
    f.centroid = this.centSmooth; f.flux = fluxNorm; f.kick = kick; f.gain = this.gain;
    f.bpm = this.localBpm; f.bpmConfidence = this.localBpmConfidence; f.intensity = intensity; f.beatAnchorMs = this.beatAnchorMs;
    f.bodyDb = bodyNow; { const be = this.bass.bassEnergyStep(A[0], A[1]); f.bassEnergy = f.silent ? 0 : be; f.bassEnergyShort = f.silent ? 0 : this.bass.beShort; f.bassLevel = Math.pow(10, (this.bass.beHi - this.bass.beRef) / 20); }
    { let s2 = 1e-12; for (let b = 3; b < 8; b++) { const lin = Math.pow(10, (FB ? this.fbDbRaw : this.bandDbRaw)[b] / 20); s2 += lin * lin; } f.midHiDb = 20 * Math.log10(Math.sqrt(s2)); }
    f.dropCount = this.drop.dropCount; f.miniDropCount = this.drop.miniDropCount; f.dropDemoted = this.drop.dropDemoted; f.dropSpaced = this.drop.dropSpaced; f.dropRiseDb = this.drop.dropRiseDb;
    f.nearDropDb = this.drop.nearDropDb; f.nearDipDb = this.drop.nearDipDb; f.liftDb = this.drop.liftDb; f.stopCount = this.drop.stopCount; f.stopS = this.drop.stopS; f.inZone = inZone; f.breaking = breaking; f.buildUp = this.buildUp; f.inRiser = inRiser;
    f.kickAtMs = kickAtMs; f.barShift = -1;   // EN ETTA (r0): klockans etta sätts av publishPhase nedan (lotus); DMX läser ettan i cfg.beat
    // Gridfasen ut: konstant offset (detektorns slap) och/eller trim. Bada 0/av som standard => oforandrad fas.
    f.beatPhaseMs = this.beatPhaseMs > 0 ? this.beatPhaseMs - Analyser.GRID_PHASE_OFFSET_MS : this.beatPhaseMs;
    f.beatPhaseConf = this.beatPhaseConf;
    this.sections.sectionAggStep();
    const nowS = SECTION_AGG_HOP ? this.wallNow() : nowWallA;
    f.buildProg = this.secBuildAt > 0 && nowS - this.secBuildSeen <= 2000 ? Math.min(1, (nowS - this.secBuildAt) / (32 * (this.localBpm > 0 ? 60000 / this.localBpm : Analyser.BE_FALLBACK_MS))) : 0;
    f.section = this.section; f.sectionAgeMs = this.sectionStartMs > 0 ? nowS - this.sectionStartMs : 0; f.sectionIndex = this.sectionIndex; f.sectionTier = this.sectionTier;
    f.repeatSim = this.repeatSim; f.repeatAgoMs = this.repeatAgoMs; f.repeatSection = this.repeatSection;
    f.expectHighInMs = this.section === 'high' ? 0 : this.expectHighMs > 0 ? Math.max(0, this.expectHighMs - nowS) : -1;
    f.prevSection = this.prevSection; f.levelVsHighDb = this.levelVsHighDb;
    f.sectionBars = this.localBpm > 0 && this.sectionStartMs > 0 ? (nowS - this.sectionStartMs) / (240000 / this.localBpm) : 0;
    if (this.clock || this.hopSelf) {
      if (this.clock) this.clock.update(f, this.clockOut, this, Date.now());   // KLOCKAN I process() (BEAT_FEED 'inline', eller ingen delning)
      else this.hopLane!.feed(f, this.clockOut, this);                          // KLOCKAN I WORKERN (lotus delad: taktvägen, egen matning)
      // EN FAS OCH EN ETTA (r0): ramens fas och etta = klockans publicerade rutnät och taktmodell (publishPhase, analyserClock.ts)
      publishPhase(f, this.clockOut.beat, this.clock ? this.clock.barKnown() : this.hopLane!.barKnown, this.extGrid, Date.now(), Analyser.GRID_PHASE_OFFSET_MS);
    }
    return f;
  }
  /** ANALYSATORNS KLOCKA utan taktväg (a7r; lotus profil, eller DMX utan delning): körs sist i process(), utfallet här. */
  clock: BeatFeed | null = null;
  readonly clockOut: ClockCfg = { beat: undefined, beatErr: undefined };
  /** Klockans utfall till motorn (som hopLane.feed gör med taktvägen): rutnätet och fasfelet. */
  publishClock(cfg: ClockCfg): void { cfg.beat = this.clockOut.beat; cfg.beatErr = this.clockOut.beatErr; }
  /** DROP: flanken, slam-kandidaten, minidrop, lyft/nästan-drop/stopp (analyserDrop.ts) */
  readonly drop = new DropDetector(this);
  /** SEKTIONER: block, rang (intro/low/build/high/break), upprepning, förutsägelse (analyserSection.ts) */
  readonly sections = new SectionTracker(this);
  /** UPPBYGGNAD: riser (spektral nyhet + klang/nivå) och buildUp (analyserRiser.ts) */
  readonly riser = new RiserDetector(this);
  /** KARAKTÄR: låtens långsamma profil (punch, bas, ljushet, täthet) (analyserCharacter.ts) */
  readonly character = new CharacterProfile(this);
  /** KICK: anslag i snabba vägen (kick, virvel, hi-hat) och förfiningen (analyserKick.ts) */
  readonly kicks = new KickDetector(this);
  /** BAS: basenergin per slag och basgången (analyserBass.ts) */
  readonly bass = new BassTracker(this);
  /** NIVÅ: förstärkning/AGC, tystnad, intensitet, nivåtak och topp-zon (analyserLevel.ts) */
  readonly levels = new LevelTracker(this);
}

/** Asymmetrisk EMA (snabb attack, långsam release) — modulnivå så tick-vägen
 *  inte allokerar en closure per hop. */
function ema(prev: number, x: number, aUp: number, aDown: number): number {
  return prev + (x - prev) * (x > prev ? aUp : aDown);
}

function hannWindow(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

// ── DELAD ANALYSATOR: fabriken ────────────────────────────────────────────────────────────────
/** Omstart av workern: backoff 1/2/5/5/5 s, hogst 5 omstarter per 10 min, sedan ges upp (snabba
 *  sidan fortsatter leverera ljus med senaste tillstandet i blocket; tempo/sektion fryser). */
export const WORKER_RESTART_BACKOFF_MS = [1000, 2000, 5000, 5000, 5000];
export const WORKER_RESTART_MAX = 5;
export const WORKER_RESTART_WINDOW_MS = 10 * 60_000;

/**
 * <prefix>ANALYSER_SPLIT (se split.ts):
 *   (osatt)   en analysator i en trad.
 *   worker    snabba delen har, langsamma (tempo/gridfas/sektion) i en worker_threads-Worker pa egen karna.
 *   inline    bada i SAMMA trad, workern kord synkront efter varje record — for banken: bevisar att den delade
 *             analysatorn ger identiskt resultat som den odelade (deterministiskt, virtuell klocka).
 *
 * Testkrokar pa den returnerade analysatorn (bara worker-laget): __worker (aktuell Worker), __stopWorker() (stanger
 * utan omstart), splitRestarts (antal omstarter hittills).
 *
 * `mode` (andra argumentet, bara bänken) går före ratten; 'sync' = den RIKTIGA workern i lås-steg (snabba sidan väntar på
 * varje publicering) - deterministiskt, för att jämföra workern hop för hop mot inline-läget.
 *
 * TAKTVÄGEN (split.ts): klockan (analyserClock.ts) körs i den långsamma vägen om inte <prefix>BEAT_FEED är 'inline' (clockMode).
 * DMX (BEAT_FEED 'slow'): motorn matar den med analyser.hopLane.feed(frame, cfg, analyser). Lotus (BEAT_FEED osatt): analysatorn
 * matar den själv sist i process() (hopSelf).
 */
export function createAnalyser(cfg: AnalyserConfig, modeIn?: 'worker' | 'inline' | 'sync'): Analyser {
  const mode = modeIn ?? sysEnv('ANALYSER_SPLIT');
  const cm = clockMode();
  if (mode !== 'worker' && mode !== 'inline' && mode !== 'sync') { const a = new Analyser(cfg); a.clock = new BeatFeed(); return a; }
  const sync = mode === 'sync';
  const feedMk = cm === 'slow' ? hopFeedFactory() : undefined;
  const buffers = createSplitBuffers(!!feedMk);
  const fast = new Analyser(cfg, { role: 'fast', split: buffers, sync });
  if (cm === 'inline') fast.clock = new BeatFeed();
  if (feedMk) { fast.hopLane = new HopLaneFast(buffers, sync); fast.hopSelf = sysEnv('BEAT_FEED') === undefined; }
  if (mode === 'inline') {
    fast.setInlinePeer(new Analyser(cfg, { role: 'slow', split: buffers }));
    if (feedMk) fast.hopLane!.peer = new HopLaneSlow(buffers, feedMk());
    return fast;
  }
  // Worker: SAB:arna delas via workerData (structured clone DELAR SharedArrayBuffer). cfg ar ren data och klonas.
  // Importen ar dynamisk sa modulen fortfarande laddar i miljoer utan worker_threads (bank, webblasare). Synk-läget måste starta
  // workern innan första process() (den väntar på den) och tar modulen synkront.
  const withWorker = ({ Worker }: typeof import('node:worker_threads')) => {
    let stopped = false;
    const attempts: number[] = [];   // tidpunkter for omstarter inom fonstret
    // STORA VÄGEN + TAKTVÄG (a3): två trådar - 'lane' (bara taktmatningen) och 'slow' (analysatorn: env + stora vägen). Annars en.
    // PI:NS VERKLIGHET (a3r): EN worker-tråd även med stora vägen - motorn är låst till 2 kärnor (CPUAffinity), en tredje tråd delar
    // kärna med ljusvägen. Taktvägen får förtur i tråden via bigYield (slowWorker.ts). Delningen 'lane'/'slow' finns kvar i slowWorker.
    const parts: Array<'all' | 'lane' | 'slow'> = ['all'];
    const workers: Array<{ postMessage: (m: unknown) => void }> = [];
    const start = (part: 'all' | 'lane' | 'slow', resumeSeq: number, why: string) => {
      const data: WorkerData = { cfg: { ...cfg }, buffers, resumeSeq, sync, part };
      // Pekar pa den BYGGDA filen (slowWorker.js bredvid denna).
      const w = new Worker(new URL('./slowWorker.js', import.meta.url), { workerData: data });
      w.on('error', (e) => console.error('[analyser-split] worker FEL:', e?.message ?? e));
      w.on('exit', (code) => {
        if (stopped || code === 0) { console.log(`[analyser-split] worker stangd (kod ${code})`); return; }
        const now = Date.now();
        while (attempts.length && now - attempts[0] > WORKER_RESTART_WINDOW_MS) attempts.shift();
        if (attempts.length >= WORKER_RESTART_MAX) {
          console.error(`[analyser-split] worker dog (kod ${code}) — ${WORKER_RESTART_MAX} omstarter pa ${WORKER_RESTART_WINDOW_MS / 60000} min, ger upp: tempo/sektion fryser pa senaste tillstandet; starta om motorn`);
          return;
        }
        const delay = WORKER_RESTART_BACKOFF_MS[Math.min(attempts.length, WORKER_RESTART_BACKOFF_MS.length - 1)];
        attempts.push(now);
        console.warn(`[analyser-split] worker dog (kod ${code}) — omstart #${attempts.length} om ${delay} ms, aterupptar vid record ${fast.fastReadSeq()} (skrivet ${fast.fastWriteSeq()})`);
        const t = setTimeout(() => { if (stopped) return; fast.splitRestarts++; start(part, part === 'lane' ? 0 : fast.fastReadSeq(), 'omstart'); }, delay);
        t.unref();
      });
      w.unref();
      workers[parts.indexOf(part)] = w;
      if (part !== 'lane') (fast as unknown as { __worker: unknown }).__worker = w;
      console.log(`[analyser-split] langsam analysator i worker startad (${part}) — ${why}, fran record ${resumeSeq}`);
    };
    (fast as unknown as { __stopWorker: () => void }).__stopWorker = () => {
      stopped = true;
      for (const w of workers) w?.postMessage({ type: 'stop' });
    };
    for (const p of parts) start(p, 0, 'start');
  };
  if (sync) withWorker((process as unknown as { getBuiltinModule(id: string): typeof import('node:worker_threads') }).getBuiltinModule('node:worker_threads'));
  else import('node:worker_threads').then(withWorker).catch((e) => console.error('[analyser-split] kunde inte starta worker:', e?.message ?? e));
  return fast;
}

/** TAKTVÄGEN: klockan för den långsamma vägen, om inte <prefix>BEAT_FEED är 'inline' (clockMode). */
export function hopFeedFactory(): (() => HopFeed) | undefined {
  return clockMode() === 'slow' ? () => new BeatFeed() : undefined;
}
/** VAR KLOCKAN KÖRS - profilen på ETT ställe (sys.BEAT_FEED): 'slow' = i taktvägen (analysatorns långsamma väg, workern) när
 *  analysatorn är delad, annars sist i process(); 'inline' = alltid sist i process() (ingen taktväg); osatt (lotus) = som 'slow', men analysatorn matar taktvägen själv (hopSelf; EN KLOCKA: det finns ingen annan tempoväg). */
function clockMode(): 'slow' | 'inline' { return sysEnv('BEAT_FEED') === 'inline' ? 'inline' : 'slow'; }
