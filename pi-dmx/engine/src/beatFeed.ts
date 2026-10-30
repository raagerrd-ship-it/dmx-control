/**
 * TAKTMATNINGEN (utbruten ur index.ts 2026-10-10, ordagrant): fasprediktionstilliten, den löpande takten (10-19, ersatte kick-PLL:en och fasfoljaren), taktfasen
 * (ettan) och coasten som haller cfg.beat (ankare + bpm + konfidens) levande per hop. Samma kod i motorn OCH i bankarna -
 * matfalla 43: bankerna satte cfg.beat.anchorMs = fr.beatAnchorMs varje hop, sa ctx.beatFrac hoppade 0,00 -> 0,45 pa 27 ms per slag
 * (halverad effektklocka + ankarhopp) och takteffekternas toppar ritades aldrig i banken. Klockan ar Date.now() (banken byter den per hop).
 */
import { isLogOn } from "./quiet.js";
import { MIN_BEAT_CONFIDENCE } from "./beatClock.js";
import type { Frame } from "./analyser.js";
import type { EngineConfig } from "./config.js";

// COAST: konfidensen dippar i breakdowns/brus men TEMPOT är oftast fortfarande rätt.
// Släpper vi gridet direkt hoppar effekterna till kick-drift och glider tillbaka när
// takten kommer igen. Vi håller därför gridet fri-rullande en stund innan vi ger upp.
const GRID_ON_CONF = 0.35;   // tydlig takt igen → coast avbryts
const GRID_COAST_MS = 4000;  // så länge håller vi gridet på svag konfidens

// TILLITEN = MÖNSTRET ÅTERKOMMER (natt 10-13, ägarens punkt 4 'taktsäkerhet', 'varje slag ska kännas'). Förr räknades en kick
// som bevis bara om den låg inom ±0,25 slag från gridets slag. Mätt på katalogkorpusen frozen6 (161 klipp, taktklockan mot
// facit, var 0,25 s): det måttet var SÄMRE än slumpen på att skilja rätt tempo från fel (AUC 0,43 - rätt klocka median 0,41,
// fel klocka 0,48), för ±0,25 slag täcker halva cirkeln (slumpkickar ger 0,5) och synkoperade mönster räknas som miss.
// I ladan (23 inspelningar, konsertReplay med MÄTFÄLLA 47+48 rättade) stod tilliten i cykeln 0,29/0,33/0,38 = träff-miss-miss
// 42 % av tiden: kickmönster med 3 kickar per 2 slag (314/416/315 ms vid 114,5 BPM) - exakt periodiska över 2 slag, klockan
// rätt, men 2 av 3 kickar 'av'. Nu räknas kicken som bevis om den ligger på slaget (som förr) ELLER om en kick kom exakt TVÅ
// SLAG tidigare (±6 % av slaget): då förutsäger gridets tempo mönstret, vilken plats i takten kicken än har. Korpusen: rätt
// klocka median 0,41 -> 0,95, fel klocka 0,48 -> 0,87 (AUC 0,43 -> 0,64: måttet gynnar inte längre fel tempo). Tempot rörs inte:
// Coastens tempo-nollning läser fortfarande fasträffarna (pllConf) - med det nya måttet
// även där nollades tempot mer sällan och korpusens klocka föll 81,5 -> 76,7 % (fel tidiga lås hölls kvar).
// DMX_TRUST_REPEAT=0 = gamla måttet (bit-identiskt).
const TRUST_REPEAT_BEATS = 2, TRUST_REPEAT_TOL = 0.06;
/** LÖPANDE TAKT - RUTNÄTET PÅ LJUDETS SLAG (ägaren 10-19: 'allt i bakgrunden så snabbt som möjligt, effekten får info om exakta
 *  takten så snabbt det går'). Mätt i bänken (showTight --step 5, pop): kickbandets anslag (frame.onset.kick) är tydligt periodiskt, men
 *  rutnätets slag låg 40-160 ms fel och gled (tempo 1-1,5 BPM fel) - kick-PLL:en drar 10 % per kick och 'kick' fyrar på kylningens kant.
 *  Här viks de senaste ONSET_WIN_MS av kickbandets anslag (sedan 10-27 basens dB-stigning, se nedan) var ONSET_EVERY_MS på tempon kring det låsta (+-2,5 %), och rutnätet sätts DIREKT på
 *  toppen (fas + tempo, slagindex bevaras). Sökningen sker kring rutnätets eget tempo OCH analysatorns (nytt tempo/låt); utan tydlig
 *  topp (< ONSET_MIN_PEAK x medel) rullar rutnätet vidare som det är. Ersatte kick-PLL:en, TEMPO_PERSIST och fasföljaren (enda vägen). */
const ONSET_WIN_MS = 5000, ONSET_EVERY_MS = 250, ONSET_BINS = 48, ONSET_RING = 1024, ONSET_MIN_PEAK = 1.5;
/** BASENS STIGNING (STANDARD i ladan 10-27, ägaren: 'ser bra ut'; backup-tagg backup/fore-feed-rise-2026-10-27; gallop-felet i videon 10-26):
 *  onset.kick är klampad 0/1 (fynd 10-22) och mättar på hela bas-svallet i pumpande musik - vikningen lade då rutnätet där ettorna var
 *  tätast, mätt +120..170 ms efter kickens ansats (gallop: grupp A tändes +130 ms, B:s 0,75-slag på kicken). Nu viks basens (sub+kick,
 *  specAbs) STIGNING i dB över FEED_RISE_HOPS hop (omättad, toppar på ansatsen): gridet -32 ms (showLead före), taktKorpus 67,1 -> 83,2 %. */
const FEED_RISE_HOPS = 6;
/** TVÅ RUTNÄT (STANDARD i ladan 10-28, ägaren; backup-tagg backup/fore-feed-rise2-2026-10-28): analysatorns kickgrind och taktfas läser
 *  rutnätet (beatSrc.beat) - rise-rutnätet flyttade därmed kickarna -> sektionerna (upp 2,6 -> 4,1 s). Analysatorn har därför ett EGET
 *  rutnät som viks som före 10-27 (onset.kick, en skugg-BeatFeed som också sköter analysatorns resetTempo/resetBar); effektklockan
 *  (cfg.beat) har rise-rutnätet. Analysatorn MÅSTE byggas med BeatFeed.analyserCfg(cfg) i alla vägar (motorn och bänkarna) - annars
 *  skriver setBeatGrid analysatorns rutnät i motorns cfg.beat. natt 10-28: sektion upp 4,1 -> 2,6 s, återseende 79 -> 83, mega r 0,03 -> 0,17. */
const NO_AN = { resetTempo(): void {}, resetBar(): void {} };
/** HELA TEMPOOMRÅDET (2026-10-30, ägaren: 'få rutnätet att ha rätt tempo'): effektklockans andra sökcentrum var analysatorns bpm, som
 *  i en mix står fel länge efter ett låtbyte (tempoMix: rätt 63 %, icke-harmoniskt fel 20 %, lås median 6 s). Nu viks basens stigning
 *  över ALLA tempon 80-160 (1 %-steg, ett tempo var FULL_EVERY:e hop = ett varv per 0,6 s, minst FULL_MIN_N värden = 3 s ljud); vinnaren
 *  och dess harmoniska syskon (FULL_SIBLINGS) döms sedan på basens topp x virvelns/diskantens topp (2/3- och 4/3-felen i shuffle) och
 *  domarens val blir andra sökcentrum (utan topp: analysatorns bpm som förr). Aldrig oktavbyte (80-160 rymmer både slaget och halvslaget:
 *  en låt på 160 hoppade annars 160 <-> 80), och ett tempo kring andra centrum måste slå klockans eget med FULL_MARGIN (annars hoppar
 *  klockan mellan harmoniska tvillingar). tempoMix --all (161 klipp, 99 min): klockan rätt 75,8 -> 84,5 %, lås efter låtbyte median
 *  5,1 -> 2,8 s, rätt inom 5 s 78 -> 127/161, aldrig rätt 9 -> 2, tempohopp inom låt 0,90 -> 0,57/min. taktKorpus (161 klipp var för
 *  sig): klockan 81,7 -> 91,3 %, tempobyten 1,29 -> 1,20/klipp. Provat och förkastat: marginal 1 (1,23 hopp/min, gridfasen på kvällen
 *  10-21 95 -> 27 %) och 1,25 (0,95/min, 72 %), bekräftelse två varv, 0,5 %-steg (längre varv), HMM-utjämning av varvets vinnare
 *  (sämre), samma tempo till analysatorns rutnät (sektion upp 2,6 -> 4,1 s, som 10-29). Analysatorns rutnät orört. */
const FULL_MIN = 80, FULL_STEP = 1.01, FULL_N = 70, FULL_EVERY = 3, FULL_MIN_N = 560, FULL_MARGIN = 1.5, FULL_SIBLINGS = [1.5, 2 / 3, 4 / 3, 0.75];
/** Helsökningen byter aldrig oktav (80..160 rymmer både slaget och halvslaget): vinnare = dubbla/halva klockans tempo -> klockans. */
const sameOctave = (b: number, ref: number): number => Math.abs(b / ref / 2 - 1) < 0.04 || Math.abs((b / ref) * 2 - 1) < 0.04 ? ref : b;

/**
 * FAS-PREDIKTIONSTILLIT — landar verkliga trumslag dar rutnatet pastar?
 *
 * Tempogrammets peak-to-mean (`frame.bpmConfidence`) matte fel sak for det har
 * andamalet. Tva invandningar, bada mekaniska:
 *   1. Harmonikerna pa 2L och 3L lyfter medelvardet i namnaren och SANKER
 *      darmed konfidensen — precis nar takten ar som tydligast.
 *   2. Hjartslaget behover inte veta hur spetsigt tempogrammet ar, utan om
 *      rutnatet FORUTSAGER slagen. Det ar en annan fraga.
 * Den fragan ar redan nastan besvarad: PLL:en raknar fasfelet per kick.
 *
 * Bevaras: i ett lugnt parti kommer inga kickar, bevisen slutar komma, tilliten
 * lacker ner och pulsen drar sig undan — samma beteende som forut, men nu med
 * en principiell grund i stallet for som biprodukt av ett tempogram.
 */
export class BeatFeed {
  onBeatRate = 0;          // andel kickar med |fasfel| < 0.25 (coasten; tilliten utan TRUST_REPEAT)
  repeatRate = 0;          // TRUST_REPEAT: andel kickar på slaget ELLER som upprepar en kick två slag tidigare (tilliten)
  pllKicks = 0;            // hur mycket bevis fasprediktionen faktiskt vilar pa
  private lastTrustLog = 0;
  private lastPllKickMs = 0;
  private readonly kickRing = new Float64Array(64); private kickRingPos = 0; private kickRingN = 0; private kickRingLast = 0;
  /** analysatorns bpm som taktklockan LÅSTES på (om-ankrings-referens, skild från cfg.beat.bpm som frekvens-termen finjusterar) */
  clockDetBpm = 0;
  private gridWeakSince = 0;       // ms-tidpunkt då konfidensen föll under grinden (0 = stark)
  private gridCoasting = false;
  // LÖPANDE TAKT: ring med (tid, onset.kick) per hop + vikningens arbetsytor (inga allokeringar per hop)
  private readonly onT = new Float64Array(ONSET_RING); private readonly onV = new Float32Array(ONSET_RING); private readonly hiV = new Float32Array(ONSET_RING); private hiPrev = 0; private onPos = 0; private onN = 0; private onHalf = false; private onPrev = 0;
  private readonly foldS = new Float64Array(ONSET_BINS); private readonly foldN = new Float64Array(ONSET_BINS); private onNext = 0;
  onsetFixes = 0;
  private readonly riseDb = new Float64Array(FEED_RISE_HOPS); private risePos = 0;
  // HELA TEMPOOMRÅDET: egna vikningsytor, varvets bästa och förra varvets vinnare (fullBpm = andra sökcentrum, 0 = ingen topp)
  private readonly fullS = new Float64Array(ONSET_BINS); private readonly fullN = new Float64Array(ONSET_BINS);
  private fullK = 0; private fullHop = 0; private fullBest = 0; private fullBestBpm = 0; private fullBase = 0; private fullW = 0; private fullWV = 0; fullBpm = 0;
  /** kickFold = vik onset.kick som före 10-27 (analysatorns skugga, se TVÅ RUTNÄT). Standard = basens stigning. */
  private readonly ana: BeatFeed | null; private readonly anaGrid = { beat: null } as unknown as EngineConfig;
  constructor(private readonly kickFold = false) { this.ana = kickFold ? null : new BeatFeed(true); }
  /** Det cfg analysatorn ska byggas med: en grund kopia med eget rutnät (sätts via setBeatGrid i update). */
  static analyserCfg<T extends object>(cfg: T): T { return { ...cfg, beat: null }; }

  private foldMean(k: number): number { const q = (k + ONSET_BINS) % ONSET_BINS; return this.foldN[q] ? this.foldS[q] / this.foldN[q] : 0; }

  // Sökningen sprids över hoppen: ETT tempo per hop (Pi Zero: hela sökningen i ett anrop = 2 ms på PC:n, ~20 ms på Pi:n = stopp i slingan).
  private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0; private scanC1 = 0;
  private bestScore = 0; private bestBpm = 0; private bestPh = 0; private bestC0 = false;

  /** LÖPANDE TAKT: ett hop av sökningen - vik ringen (fönstret före sökningens start) på nästa tempo; sist läggs rutnätet på toppen. */
  private onsetStep(cfg: EngineConfig, now: number): void {
    const beat = cfg.beat; if (!beat || beat.bpm <= 0) { this.scanC = 99; return; }
    if (this.scanC > this.scanEnd) {   // ingen sökning pågår
      if (now < this.onNext) return;
      this.onNext = now + ONSET_EVERY_MS;
      this.scanRef = beat.anchorMs; this.scanNow = now; this.scanC0 = beat.bpm; this.scanC1 = this.fullBpm ? sameOctave(this.fullBpm, beat.bpm) : this.clockDetBpm;
      this.scanEnd = this.scanC1 > 0 && Math.abs(this.scanC1 / this.scanC0 - 1) > 0.025 ? 16 : 5;   // helsökningens vinnare (annars analysatorns tempo) = andra sökcentrum
      this.scanC = -5; this.bestScore = 0; this.bestC0 = false;
    }
    const c = this.scanC++, ref = this.scanRef;
    const bpm = c <= 5 ? this.scanC0 * (1 + c * 0.005) : this.scanC1 * (1 + (c - 11) * 0.005), bm = 60000 / bpm;
    this.foldS.fill(0); this.foldN.fill(0);
    let tot = 0, n = 0;
    for (let i = 0; i < this.onN; i++) {
      const j = (this.onPos - 1 - i + ONSET_RING) % ONSET_RING, t = this.onT[j];
      if (t > this.scanNow) continue;   // kom in efter sökningens start
      if (this.scanNow - t > ONSET_WIN_MS) break;
      const r = (t - ref) % bm, b = Math.floor(((r < 0 ? r + bm : r) / bm) * ONSET_BINS) % ONSET_BINS;
      this.foldS[b] += this.onV[j]; this.foldN[b]++; tot += this.onV[j]; n++;
    }
    if (n >= 100 && tot > 0) {
      const mean = tot / n; let mx = 0, mb = 0;
      for (let b = 0; b < ONSET_BINS; b++) { const v = this.foldN[b] ? this.foldS[b] / this.foldN[b] : 0; if (v > mx) { mx = v; mb = b; } }
      const score = mx / mean;
      if (score > this.bestScore * (c > 5 && this.bestC0 && !this.kickFold ? FULL_MARGIN : 1)) {
        this.bestC0 = c <= 5;
        const a = this.foldMean(mb - 1), cc = this.foldMean(mb), d = this.foldMean(mb + 1), den = a - 2 * cc + d;   // parabel genom toppen
        const off = den < 0 ? 0.5 * (a - d) / den : 0;
        this.bestScore = score; this.bestBpm = bpm; this.bestPh = (mb + 0.5 + off) / ONSET_BINS;
      }
    }
    if (c < this.scanEnd || this.bestScore < ONSET_MIN_PEAK) return;
    // nytt tempo med bevarat slagindex + fas, sedan fasen direkt på toppen (toppen låg på bestPh räknat från sökningens ankare)
    const oldMs = 60000 / beat.bpm, idx = Math.floor((now - beat.anchorMs) / oldMs), fr = (now - beat.anchorMs) / oldMs - idx;
    const nb = 60000 / this.bestBpm;
    beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
    const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;   // nya ankarets fas mot sökningens ankare
    let err = this.bestPh - shift; err -= Math.round(err);
    beat.anchorMs += err * nb;
    this.onsetFixes++;
  }

  /** HELA TEMPOOMRÅDET: vikningens topp/medel för ringen V på tempot bpm (fönstret ONSET_WIN_MS bakåt från now), 0 = för lite ljud. */
  private fullScore(V: Float32Array, bpm: number, now: number): number {
    const bm = 60000 / bpm; this.fullS.fill(0); this.fullN.fill(0);
    let tot = 0, n = 0;
    for (let i = 0; i < this.onN; i++) {
      const j = (this.onPos - 1 - i + ONSET_RING) % ONSET_RING, t = this.onT[j];
      if (now - t > ONSET_WIN_MS) break;
      const b = Math.floor(((t % bm) / bm) * ONSET_BINS) % ONSET_BINS;
      this.fullS[b] += V[j]; this.fullN[b]++; tot += V[j]; n++;
    }
    if (n < FULL_MIN_N || tot <= 0) return 0;
    let mx = 0; for (let b = 0; b < ONSET_BINS; b++) { const v = this.fullN[b] ? this.fullS[b] / this.fullN[b] : 0; if (v > mx) mx = v; }
    return mx / (tot / n);
  }

  /** HELA TEMPOOMRÅDET: ett steg per FULL_EVERY:e hop - först varvets FULL_N tempon på basen, sedan domaren bland vinnarens harmoniska
   *  syskon (basens topp x virvelns/diskantens topp, ett syskon per steg så inget hop bär mer än två vikningar), sist blir domarens
   *  val andra sökcentrum. */
  private fullStep(now: number): void {
    if (++this.fullHop < FULL_EVERY) return;
    this.fullHop = 0;
    const k = this.fullK++;
    if (k < FULL_N) {
      const bpm = FULL_MIN * Math.pow(FULL_STEP, k), score = this.fullScore(this.onV, bpm, now);
      if (score > this.fullBest) { this.fullBest = score; this.fullBestBpm = bpm; }
      if (k === FULL_N - 1) { this.fullW = this.fullBest >= ONSET_MIN_PEAK ? this.fullBestBpm : 0; this.fullWV = this.fullW ? this.fullBest * this.fullScore(this.hiV, this.fullW, now) : 0; this.fullBase = this.fullW; }
      return;
    }
    const r = k - FULL_N;
    if (r < FULL_SIBLINGS.length && this.fullBase > 0) {
      let c = this.fullBase * FULL_SIBLINGS[r]; while (c < FULL_MIN) c *= 2; while (c >= 2 * FULL_MIN) c /= 2;
      const v = this.fullScore(this.onV, c, now) * this.fullScore(this.hiV, c, now);
      if (v > this.fullWV) { this.fullWV = v; this.fullW = c; }
    }
    if (r < FULL_SIBLINGS.length - 1) return;
    this.fullBpm = this.fullW; this.fullK = 0; this.fullBest = 0;
  }

  /** Kom en tidigare kick (ringen, före denna) lag ms före t, inom ±tol? (TRUST_REPEAT) */
  private kickRepeats(t: number, lag: number, tol: number): boolean {
    const want = t - lag;
    for (let i = 0; i < this.kickRingN; i++) {
      const k = this.kickRing[(this.kickRingPos - 1 - i + 64) & 63];
      if (k < want - tol) return false;
      if (Math.abs(k - want) < tol) return true;
    }
    return false;
  }

  /** En hop: tilliten (kan skriva frame.bpmConfidence) och taktklockan (cfg.beat). Anropas efter dropraknaren, fore effekterna. */
  update(frame: Frame, cfg: EngineConfig, an: { resetTempo(): void; resetBar(): void; setBeatGrid?(g: EngineConfig["beat"]): void }): void {
    if (this.ana) {   // TVÅ RUTNÄT: analysatorns rutnät först (gamla vikningen, analysatorns återställningar), frame.bpmConfidence orörd
      const bc = frame.bpmConfidence; this.ana.update(frame, this.anaGrid, an); frame.bpmConfidence = bc;
      an.setBeatGrid?.(this.anaGrid.beat);
      an = NO_AN;
    }
    // TILLITEN KOMMER FRAN FASPREDIKTIONEN, inte fran tempogrammets form.
    // Coast: utan kickar finns inga nya bevis, sa tilliten lacker ner over ~4 s i
    // stallet for att falla direkt. Det ar det som far pulsen att dra sig undan i
    // ett lugnt parti utan att slockna vid ett enda missat slag.
    if (cfg.beat && this.lastPllKickMs) {
      const quiet = Date.now() - this.lastPllKickMs;
      if (quiet > 1500) {
        this.onBeatRate *= Math.max(0, 1 - (quiet - 1500) / 4000);
        this.repeatRate *= Math.max(0, 1 - (quiet - 1500) / 4000);
        if (quiet > 8000) this.pllKicks = 0;   // bevisen ar gamla — lamna over till tempogrammet
      }
    }
    {   // (forr: bara nar taktklockan inte var last ur latminnet - alltid sant sedan 2026-09-23)
      // DIAGNOSTIK: bada matten loggas sa de gar att jamfora mot varandra och mot
      // vad ogat ser, i stallet for att bytet ska behova tas pa tro.
      if (frame.bpmConfidence > 0.05 && Date.now() - this.lastTrustLog > 4000) {
        this.lastTrustLog = Date.now();
        if (isLogOn()) console.log(`[tillit] tempogram ${frame.bpmConfidence.toFixed(2)} · fasprediktion ${this.onBeatRate.toFixed(2)} · bpm ${frame.bpm}`);
      }
      // FASPREDIKTIONEN KRAVER KICKAR — OCH DE KOMMER INTE ALLTID.
      // MATT 2026-08-09 over 25 riktiga spar: 36 % gav NOLL kickar, medianen var
      // 5 kickar/min dar ~100-130 vantas. Pa sadant material (mjuk kick, 80-talspop,
      // ballader) skulle ett matt som bara uppdateras vid kick lacka mot noll och
      // slacka hjartslaget helt — dar tempogrammets form fortfarande vet ratt.
      // Darfor: fasprediktionen galler bara nar den VILAR PA BEVIS. Under det
      // behalls tempogrammet, som inte behover kickar for att saga nagot.
      if (this.pllKicks >= 12) {
        frame.bpmConfidence = this.onBeatRate;
        if (cfg.beat) cfg.beat.confidence = this.onBeatRate;
      }
    }
    // Coasten vilar kvar på fasträffarna (pllConf, se TRUST_REPEAT); tilliten som går ut till effekterna är mönstret.
    const pllConf = frame.bpmConfidence ?? 0;
    if (this.pllKicks >= 12) { frame.bpmConfidence = this.repeatRate; if (cfg.beat) cfg.beat.confidence = this.repeatRate; }

    // LÖPANDE TAKT (10-19, ersätter kick-PLL:en, tempospärren och fasföljaren - backup-taggen backup/fore-lopande-takt-2026-10-19):
    // analysatorns bpm ger bara det första låset och ett sökcentrum; sedan sätter onsetStep() fas och tempo direkt ur kickbandets
    // anslag var ONSET_EVERY_MS. Kickarna rör inte längre rutnätet - de mäter bara tilliten (som effekterna läser).
    const effBpm = frame.bpm;
    if (effBpm === 0) { cfg.beat = null; cfg.beatErr = 0; this.clockDetBpm = 0; this.onN = 0; this.scanC = 99; this.fullBpm = 0; this.fullK = 0; this.fullBest = 0; }   // tyst → stoppa beat-effekter direkt
    if (effBpm > 0) {
      if (!cfg.beat) cfg.beat = { anchorMs: frame.beatAnchorMs || Date.now(), bpm: effBpm, confidence: frame.bpmConfidence };
      this.clockDetBpm = effBpm;
      // TILLITEN: landar kickarna på rutnätets slag? (tidsstämpeln är slagets egen, frame.kickAtMs)
      if (frame.kickAtMs > 0) {
        const beatMs = 60000 / cfg.beat.bpm;
        const ph = ((((frame.kickAtMs - cfg.beat.anchorMs) % beatMs) + beatMs) % beatMs) / beatMs;
        const err = ph < 0.5 ? ph : ph - 1;   // -0.5..0.5 av ett taktslag
        const onBeat = Math.abs(err) < 0.25;  // off-beat/synkoperade slag räknas ej
        if (onBeat) cfg.beatErr = (cfg.beatErr ?? 0) * 0.85 + err * 0.15;   // UI: ihållande fasfel
        this.onBeatRate += ((onBeat ? 1 : 0) - this.onBeatRate) * 0.12;
        this.repeatRate += ((onBeat || this.kickRepeats(frame.kickAtMs, TRUST_REPEAT_BEATS * beatMs, TRUST_REPEAT_TOL * beatMs) ? 1 : 0) - this.repeatRate) * 0.12;
        this.lastPllKickMs = Date.now();
        if (this.pllKicks < 40) this.pllKicks++;
      }
      if (frame.kickAtMs > 0 && frame.kickAtMs !== this.kickRingLast) { this.kickRingLast = frame.kickAtMs; this.kickRing[this.kickRingPos] = frame.kickAtMs; this.kickRingPos = (this.kickRingPos + 1) & 63; if (this.kickRingN < 64) this.kickRingN++; }
      {   // ringen + vikningen
        const nowO = Date.now();
        // basens stigning i dB mot FEED_RISE_HOPS hop sedan (ringen håller de senaste); var 2:a hop in i vikningsringen (max av de två, ~187 Hz)
        let ok = frame.onset?.kick ?? 0;
        if (!this.kickFold) {
          const sa = frame.specAbs, db = 20 * Math.log10((sa?.sub ?? 0) + (sa?.kick ?? 0) + 1e-7);
          const old = this.riseDb[this.risePos]; this.riseDb[this.risePos] = db; this.risePos = (this.risePos + 1) % FEED_RISE_HOPS;
          ok = old !== 0 && db > old ? db - old : 0;
        }
        const hi = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0);   // virvel + diskant (helsökningens domare)
        if (this.onHalf) { this.onT[this.onPos] = nowO; this.onV[this.onPos] = ok > this.onPrev ? ok : this.onPrev; this.hiV[this.onPos] = hi > this.hiPrev ? hi : this.hiPrev; this.onPos = (this.onPos + 1) % ONSET_RING; if (this.onN < ONSET_RING) this.onN++; }
        this.onPrev = ok; this.hiPrev = hi; this.onHalf = !this.onHalf;
        this.onsetStep(cfg, nowO);
        if (!this.kickFold) this.fullStep(nowO);
      }
      // TAKTFAS (ettan): analysatorn har mätt vilken av fyrtaktens platser som bär
      // tyngsta slaget. Flytta ankaret HELA taktslag så takträknaren (beatIdx) börjar
      // på ettan — effekter som byter var fjärde takt landar då på musikens storsväng
      // i stället för på ett godtyckligt slag. Fasen inom takten rörs INTE.
      if (frame.barShift > 0 && cfg.beat) {
        cfg.beat.anchorMs += frame.barShift * (60000 / cfg.beat.bpm);
        an.resetBar();
      }
      // LEVANDE KONFIDENS + COAST. Tidigare skrevs confidence bara vid (om)låsning →
      // grinden nedströms stod och tittade på ett gammalt värde. Nu uppdateras den varje
      // ruta, men med hysteres: faller takt-tydligheten (eller taktfasen aldrig blir
      // säker) håller vi gridet fri-rullande i GRID_COAST_MS — fasen är kvar, så inget
      // glider när takten kommer tillbaka. Håller svagheten i sig är det en riktig
      // låt-/tempoändring: släpp gridet OCH nolla tempohistoriken så nästa lås tas på
      // ~0,5 s i stället för att medianen släpar med gammalt tempo.
      if (cfg.beat) {
        const liveConf = frame.bpmConfidence ?? 0;
        const nowMs = Date.now();
        // coastens släpp/tempo-nollning på fasträffarna som förr (TRUST_REPEAT: färre nollningar höll kvar fel tidiga lås)
        if (pllConf >= GRID_ON_CONF) { this.gridWeakSince = 0; this.gridCoasting = false; }
        else if (pllConf < MIN_BEAT_CONFIDENCE) {
          if (this.gridWeakSince === 0) { this.gridWeakSince = nowMs; this.gridCoasting = true; }
          else if (nowMs - this.gridWeakSince >= GRID_COAST_MS) {
            this.gridCoasting = false;
            this.gridWeakSince = nowMs;                 // fönstret startar om → ingen spam
            { an.resetTempo(); this.clockDetBpm = 0; }
          }
        }
        cfg.beat.confidence = this.gridCoasting ? Math.max(liveConf, MIN_BEAT_CONFIDENCE) : liveConf;
      }
    }
  }
}
