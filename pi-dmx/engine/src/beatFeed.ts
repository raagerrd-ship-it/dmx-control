/**
 * TAKTMATNINGEN (utbruten ur index.ts 2026-10-10, ordagrant): fasprediktionstilliten, den löpande takten (10-19, ersatte kick-PLL:en och fasfoljaren), taktfasen
 * (ettan) och coasten som haller cfg.beat (ankare + bpm + konfidens) levande per hop. Samma kod i motorn OCH i bankarna -
 * matfalla 43: bankerna satte cfg.beat.anchorMs = fr.beatAnchorMs varje hop, sa ctx.beatFrac hoppade 0,00 -> 0,45 pa 27 ms per slag
 * (halverad effektklocka + ankarhopp) och takteffekternas toppar ritades aldrig i banken. Klockan ar Date.now() (banken byter den per hop).
 */
import { isLogOn } from "./quiet.js";
import { PROFILE } from "./analyserProfile.js";
import { MIN_BEAT_CONFIDENCE, GRID_EARLY_MS } from "./beatClock.js";
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
/** PROVRATTAR 2026-11-07 (dagkörningen; ladan 11-06: 'efter drop tog det 2-3 s innan den tydligt visade takten igen'): bara för bänken,
 *  osatt = dagens värden (json-identiskt). DMX_TRUST_UP = tillitens steg per kick UPPÅT (0,12 = som i dag, ned alltid 0,12);
 *  DMX_TRUST_LEAK_MS = hur fort tilliten läcker i ett break utan kickar (4000 = som i dag; längre = tilliten finns kvar när dropen kommer).
 *  DMX_BREAK_HOLD_MS/DMX_BREAK_RESTORE_MS (nattens förkastade patch prov/breakhold-20261107.patch) är åter inlagda som rattar för proven. */
const TRUST_UP = Number(process.env.DMX_TRUST_UP || '0.12'), TRUST_LEAK_MS = Number(process.env.DMX_TRUST_LEAK_MS || '4000');
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
/** TAKTEN GENOM BREAKET (STANDARD 2026-11-08 = 20000, ladan 11-07 godkänt; förr opt-in DMX_BREAK_HOLD_MS, natt 2026-11-07; ladan 11-06: 'efter drop tog det 2-3 s innan den tydligt visade
 *  takten igen' - ws-loggen: analysatorns bpm 0 i 14,6 s av breaket, effektklockan nollades och låste 4,2 s efter dropen). Med > 0:
 *  (1) när analysatorns bpm blir 0 rullar effektklockans rutnät vidare på sitt tempo i högst så många ms (tilliten läcker som förr, så
 *  takteffekterna lugnar sig i breaket); kommer bpm tillbaka på ett annat tempo (inte samma oktav +-4 %) tas det nya som förr;
 *  (2) första kicken efter > 1,5 s utan kickar (dropen) som ligger inom +-0,25 slag: fasen sätts på kicken och tilliten tas upp till
 *  värdet före tystnaden (rutnätet hade redan rätt tempo). 0 = av (bit-identiskt). Bara effektklockan, inte analysatorns skuggrutnät. */
const BREAK_HOLD_MS = 20000;   // STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108); förr opt-in DMX_BREAK_HOLD_MS
const BREAK_RESTORE_MS = Number(process.env.DMX_BREAK_RESTORE_MS ?? String(BREAK_HOLD_MS));   // (2) för sig (prov: hållet av, bara dropens upptag)
const NO_AN = { resetTempo(): void {}, resetBar(): void {} };
/** ETTAN I EFFEKTKLOCKANS RUTNÄT (a5, arenan tvavagar 2026-11-08). Förr flyttades effektklockan med analysatorns barShift, men den
 *  räknas mot ANALYSATORNS rutnät (TVÅ RUTNÄT, skuggan) - de två rutnätens slagindex skiljer ett godtyckligt antal slag, så ettan
 *  satt rätt bara när skillnaden råkade vara hela takter (testDownbeat-signalen: 23 % rätt, slumpen 25 %). Nu har effektklockan
 *  en EGEN taktmodell i den långsamma vägen: fyra hypoteser (taktens fyra platser i rutnätets slagindex) körs parallellt med långt
 *  minne (BAR_DECAY per slag, ~25 takter). Varje slag mäts i fönstret BAR_WIN0..BAR_WIN1 slag runt rutnätets slag: basens (sub+kick)
 *  linjära stigning (tyngsta slaget = ettan), basgångens stigning (specAbs.bass: basnoten byts på ettan) och virveln/diskanten
 *  (backbeat på 2 och 4 talar MOT platsen). Platsens andel av varje särdrag summeras; vinner en annan plats med marginalen BAR_MARGIN
 *  efter minst BAR_MIN slag blir den ettan. Ettan läggs bara i det PUBLICERADE ankaret (cfg.beat = inre rutnät + barOff hela slag):
 *  rutnätets egen sökning (onsetStep, vikningen mot ankaret) körs på det inre ankaret precis som förr, så tempo och fas är
 *  oförändrade - en flyttad etta stör aldrig vikningen. */
const BAR_DECAY = 0.99, BAR_MIN = 16, BAR_MARGIN = 0.06, BAR_W_BASS = 0.5, BAR_W_BACK = 0.5, BAR_WIN0 = -0.2, BAR_WIN1 = 0.3, BAR_RISE_HOPS = 6;
const ROT_TMP = new Float64Array(4);
/** a[i] = a[(i + n) & 3] (taktens fyra platser vrids med ankaret, ingen allokering). */
const rot4 = (a: Float64Array, n: number): void => { ROT_TMP.set(a); for (let i = 0; i < 4; i++) a[i] = ROT_TMP[(i + n) & 3]; };
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
const FULL_MARGIN = 1.5;   // andra sökcentrum (analysatorns bpm) måste slå klockans eget med så mycket - bara innan tempogrammet har en topp
/** Helsökningen byter aldrig oktav (80..160 rymmer både slaget och halvslaget): vinnare = dubbla/halva klockans tempo -> klockans. */
const sameOctave = (b: number, ref: number): number => Math.abs(b / ref / 2 - 1) < 0.04 || Math.abs((b / ref) * 2 - 1) < 0.04 ? ref : b;
/** EN TEMPOSÖKNING (arena tvavagar a1, 2026-11-08; ersätter HELA TEMPOOMRÅDET 10-30 + andra sökcentrumets skanning + klockans egen
 *  vandring): ETT ackumulerat tempogram i långsamma vägen som klockan läser. Förr sökte tre saker tempo var för sig - helsökningen
 *  (70 tempon à 1 %, ett varv utan minne, vinnaren flackade 97/145/84/126 mellan varven), andra sökcentrumet (+-2,5 % kring den) och
 *  klockans egen skanning (+-2,5 % kring sitt tempo var 250 ms, kunde vandra 122 -> 143 på 5 s). Nu: TG_K hypoteser på ett CIRKULÄRT
 *  log-rutnät över en oktav (80 * 2^(k/TG_K), 0,5 %-steg, 80 och 160 är grannar), TG_PER_HOP per hop (ett varv per ~0,37 s). Poängen per
 *  hypotes = BASENS vikning x VIRVELNS/DISKANTENS vikning, var och en (topp + värdet ett halvslag efter toppen) / 2 / medel: halvslaget
 *  (åttondelarna) är beviset som skiljer slaget från 2/3- och 4/3-fantomerna (en fantom har ingen topp mitt emellan sina slag). Poängen
 *  EMA:as per hypotes (TG_A per varv), vinnaren = tempogrammets topp (parabel i log-rutnätet), klämd till [80, 160). Klockan skannar
 *  sedan bara fint kring vinnaren (+-1,25 % i 0,25 %-steg) för fas och fintempo. Offline på basens signaler (a1/ev.mjs, 50 klipp + mixen):
 *  rätt tempo 88,9 -> 99,0 % (klipp) och 88,5 -> 97,8 % (mix), tempobyten i mixen 66 -> 2 (bara basens vikning: 89 / 88 %). */
const TG_SNAP = 0.03, TG_EDGE = 1.03, TG_OCT_HI = 148, TG_FULL_N = 900;   // oktavkanten +-3 %; övre oktaven bara om analysatorns bpm ligger nära den (>= 148); fullt fönster (~4,8 s)
const TG_K = 139, TG_STEP = Math.pow(2, 1 / TG_K), TG_PER_HOP = 1, TG_A = 0.21, TG_MIN_N = 300, TG_FINE = 0.0025, TG_HALF = ONSET_BINS >> 1;

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
  private readonly tgAcc = new Float64Array(TG_K).fill(-1); private readonly tgH = new Float64Array(ONSET_BINS); private tgK = 0; private tgN = 0;
  /** EN TEMPOSÖKNING: tempogrammets vinnare (0 = ingen topp än) - klockans skanningscentrum. */
  tempoBpm = 0;
  /** kickFold = vik onset.kick som före 10-27 (analysatorns skugga, se TVÅ RUTNÄT). Standard = basens stigning. */
  private holdSince = 0; private goodOn = 0; private goodRep = 0; private goodAt = 0;   // TAKTEN GENOM BREAKET
  // ETTAN (a5): fyra platsers särdrag (inre slagindex & 3), pågående slagets max, linjära ringar för stigningen, publicerat ankare
  private readonly barK = new Float64Array(4); private readonly barL = new Float64Array(4); private readonly barB = new Float64Array(4);
  private barN = 0; private barIdx = NaN; private bK = 0; private bL = 0; private bB = 0; private barOff = 0; barShifts = 0;
  private readonly linK = new Float64Array(BAR_RISE_HOPS); private readonly linL = new Float64Array(BAR_RISE_HOPS); private linPos = 0;
  private innerAnchor = 0; private innerBpm = 0; private innerValid = false;
  private readonly ana: BeatFeed | null; private readonly anaGrid = { beat: null } as unknown as EngineConfig;
  constructor(private readonly kickFold = false) { this.ana = kickFold ? null : new BeatFeed(true); }
  /** Det cfg analysatorn ska byggas med: en grund kopia med eget rutnät (sätts via setBeatGrid i update). */
  static analyserCfg<T extends object>(cfg: T): T { return { ...cfg, beat: null }; }

  private foldMean(k: number): number { const q = (k + ONSET_BINS) % ONSET_BINS; return this.foldN[q] ? this.foldS[q] / this.foldN[q] : 0; }

  // Sökningen sprids över hoppen: ETT tempo per hop (Pi Zero: hela sökningen i ett anrop = 2 ms på PC:n, ~20 ms på Pi:n = stopp i slingan).
  private scanStep = 0.005; private scanC = 99; private scanEnd = 0; private scanRef = 0; private scanNow = 0; private scanC0 = 0; private scanC1 = 0;
  private bestScore = 0; private bestBpm = 0; private bestPh = 0; private bestC0 = false;

  /** LÖPANDE TAKT: ett hop av sökningen - vik ringen (fönstret före sökningens start) på nästa tempo; sist läggs rutnätet på toppen. */
  private onsetStep(cfg: EngineConfig, now: number): void {
    const beat = cfg.beat; if (!beat || beat.bpm <= 0) { this.scanC = 99; return; }
    if (this.scanC > this.scanEnd) {   // ingen sökning pågår
      if (now < this.onNext) return;
      this.onNext = now + ONSET_EVERY_MS;
      this.scanRef = beat.anchorMs; this.scanNow = now;
      if (this.tempoBpm > 0 && Math.abs(beat.bpm / this.tempoBpm - 1) > TG_SNAP) { this.scanC0 = this.tempoBpm; this.scanStep = TG_FINE; this.scanEnd = 5; }   // EN TEMPOSÖKNING: klockan utanför tempogrammets topp -> dit
      else if (this.tempoBpm > 0) { this.scanC0 = beat.bpm; this.scanStep = 0.005; this.scanEnd = 5; }   // inom: klockans egen skanning som förr (fas, fintempo)
      else {   // före första toppen: som förr kring klockans tempo, analysatorns tempo = andra sökcentrum
        this.scanC0 = beat.bpm; this.scanStep = 0.005; this.scanC1 = this.clockDetBpm;
        this.scanEnd = this.scanC1 > 0 && Math.abs(this.scanC1 / this.scanC0 - 1) > 0.025 ? 16 : 5;
      }

      this.scanC = -5; this.bestScore = 0; this.bestC0 = false;
    }
    const c = this.scanC++, ref = this.scanRef;
    const bpm = c <= 5 ? this.scanC0 * (1 + c * this.scanStep) : this.scanC1 * (1 + (c - 11) * 0.005), bm = 60000 / bpm;
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
    if (this.tempoBpm > 0) this.bestBpm = Math.min(159.9, Math.max(80, this.bestBpm));   // samma oktavfönster som tempogrammet
    const oldMs = 60000 / beat.bpm, idx = Math.floor((now - beat.anchorMs) / oldMs), fr = (now - beat.anchorMs) / oldMs - idx;
    const nb = 60000 / this.bestBpm;
    beat.bpm = this.bestBpm; beat.anchorMs = now - (idx + fr) * nb;
    const shift = ((((beat.anchorMs - ref) % nb) + nb) % nb) / nb;   // nya ankarets fas mot sökningens ankare
    let err = this.bestPh - shift; err -= Math.round(err);
    beat.anchorMs += err * nb;
    this.onsetFixes++;
  }

  /** EN TEMPOSÖKNING: hypotesens poäng = basens x diskantens (topp + halvslaget efter toppen) / 2 / medel, en gemensam vikning av
   *  ringen (fönstret ONSET_WIN_MS bakåt från now). 0 = för lite ljud. */
  private tgScore(bpm: number, now: number): number {
    // Poängen beror inte på fasen: ringens värden ligger med jämn takt (vartannat hop), så fasen stegas fram med en addition per värde
    // i stället för t % period på väggklockan (3 x billigare; i realtid är ringens Date.now() dessutom ryckig - hoppens takt är exakt).
    const S = this.fullS, N = this.fullN, Hs = this.tgH, oT = this.onT, oV = this.onV, oH = this.hiV; S.fill(0); N.fill(0); Hs.fill(0);
    let lo = 0, hi = this.onN;   // n = antal värden inom fönstret (tiderna växer i ringen: binärsökning i st f att räkna)
    while (lo < hi) { const m = (lo + hi) >> 1; if (now - oT[(this.onPos - 1 - m + 2 * ONSET_RING) % ONSET_RING] > ONSET_WIN_MS) hi = m; else lo = m + 1; }
    const n = lo;
    if (n < TG_MIN_N) { this.tgN = n; return 0; }
    const jo = (this.onPos - n + 2 * ONSET_RING) % ONSET_RING; let j = jo;
    const dt = (oT[(this.onPos + ONSET_RING - 1) % ONSET_RING] - oT[jo]) / (n - 1), step = (dt * bpm / 60000) * ONSET_BINS;
    let tot = 0, totH = 0, ph = 0;
    for (let i = 0; i < n; i++) {
      const b = ph | 0, v = oV[j], h = oH[j];
      S[b] += v; Hs[b] += h; N[b]++; tot += v; totH += h;
      ph += step; if (ph >= ONSET_BINS) ph -= ONSET_BINS;
      j = j === ONSET_RING - 1 ? 0 : j + 1;
    }
    this.tgN = n;
    if (tot <= 0 || totH <= 0) return 0;
    let mx = 0, mb = 0, hx = 0, hb = 0;
    for (let b = 0; b < ONSET_BINS; b++) { if (!N[b]) continue; const v = S[b] / N[b], h = Hs[b] / N[b]; if (v > mx) { mx = v; mb = b; } if (h > hx) { hx = h; hb = b; } }
    const q = (mb + TG_HALF) % ONSET_BINS, qh = (hb + TG_HALF) % ONSET_BINS;
    const fb = (mx + (N[q] ? S[q] / N[q] : 0)) / 2 / (tot / n), fh = (hx + (N[qh] ? Hs[qh] / N[qh] : 0)) / 2 / (totH / n);
    return fb * fh;
  }

  /** EN TEMPOSÖKNING: TG_PER_HOP hypoteser per hop in i tempogrammet; sist i varvet blir toppen klockans centrum. */
  private tgStep(now: number): void {
    const acc = this.tgAcc;
    for (let r = 0; r < TG_PER_HOP; r++) {
      const k = this.tgK, s = this.tgScore(80 * Math.pow(TG_STEP, k), now);
      if (s > 0) acc[k] = acc[k] < 0 || this.tgN < TG_FULL_N ? s : acc[k] + TG_A * (s - acc[k]);   // minne först när fönstret är fullt (kort fönster = brusig, långsam-gynnad poäng)
      if (++this.tgK < TG_K) continue;
      this.tgK = 0;
      let bk = -1, bv = 0; for (let i = 0; i < TG_K; i++) if (acc[i] > bv) { bv = acc[i]; bk = i; }
      if (bk < 0) { this.tempoBpm = 0; return; }
      const a = acc[(bk + TG_K - 1) % TG_K], c = acc[(bk + 1) % TG_K], den = a - 2 * bv + c;   // parabel i log-rutnätet (cirkulärt)
      const off = a >= 0 && c >= 0 && den < 0 ? Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / den)) : 0;
      let t = 80 * Math.pow(TG_STEP, bk + off);
      // OKTAVKANTEN: 80 och 160 är grannar i det cirkulära rutnätet, och vikningen kan inte skilja dem (halvslagsbeviset gynnar 80).
      // Nära kanten avgör analysatorns oktav (lang1021 = 160: rutnätet på 80 missade varannan ansats; Cody Johnson = 80, analysatorn 104-116).
      if (t < 80 * TG_EDGE || t > 160 / TG_EDGE) { const lo = t < 120 ? t : t / 2; t = this.clockDetBpm >= TG_OCT_HI ? 2 * lo : lo; }
      this.tempoBpm = Math.min(159.9, Math.max(80, t));
      return;
    }
  }
  private tgReset(): void { this.tgAcc.fill(-1); this.tgK = 0; this.tempoBpm = 0; }

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

  private barReset(): void { this.barK.fill(0); this.barL.fill(0); this.barB.fill(0); this.barN = 0; this.barIdx = NaN; this.barOff = 0; }

  /** ETTAN (se BAR_DECAY): ett hop av effektklockans taktmodell, på det inre rutnätet. */
  private barStep(frame: Frame, beat: NonNullable<EngineConfig["beat"]>, now: number): void {
    const sa = frame.specAbs, p = this.linPos, k = (sa?.sub ?? 0) + (sa?.kick ?? 0), l = sa?.bass ?? 0;
    const rk = k - this.linK[p], rl = l - this.linL[p]; this.linK[p] = k; this.linL[p] = l; this.linPos = (p + 1) % BAR_RISE_HOPS;
    if (!(beat.bpm > 40)) return;
    const pos = (now - beat.anchorMs) / (60000 / beat.bpm), idx = Math.floor(pos - BAR_WIN0);
    if (idx !== this.barIdx) {
      if (idx === this.barIdx + 1) this.barCommit();
      this.barIdx = idx; this.bK = 0; this.bL = 0; this.bB = 0;
    }
    if (pos - idx <= BAR_WIN1) {
      if (rk > this.bK) this.bK = rk;
      if (rl > this.bL) this.bL = rl;
      const hb = (frame.onset?.highMid ?? 0) + (frame.onset?.treble ?? 0); if (hb > this.bB) this.bB = hb;
    }
  }

  /** Slaget barIdx är färdigmätt: bokför det på sin plats och döm de fyra hypoteserna (vinnaren med marginal blir ettan). */
  private barCommit(): void {
    const K = this.barK, L = this.barL, B = this.barB, slot = ((this.barIdx % 4) + 4) % 4;
    for (let i = 0; i < 4; i++) { K[i] *= BAR_DECAY; L[i] *= BAR_DECAY; B[i] *= BAR_DECAY; }
    K[slot] += this.bK; L[slot] += this.bL; B[slot] += this.bB;
    if (this.barN < 1000) this.barN++;
    if (this.barN < BAR_MIN) return;
    const sK = K[0] + K[1] + K[2] + K[3], sL = L[0] + L[1] + L[2] + L[3], sB = B[0] + B[1] + B[2] + B[3];
    if (!(sK > 0)) return;
    let bi = 0, best = -1e9, second = -1e9;
    for (let i = 0; i < 4; i++) {
      const v = K[i] / sK + (sL > 0 ? BAR_W_BASS * L[i] / sL : 0) - (sB > 0 ? BAR_W_BACK * B[i] / sB : 0);
      if (v > best) { second = best; best = v; bi = i; } else if (v > second) second = v;
    }
    if (bi !== this.barOff && best - second >= BAR_MARGIN) { this.barOff = bi; this.barShifts++; }
  }

  /** En hop: tilliten (kan skriva frame.bpmConfidence) och taktklockan (cfg.beat). Anropas efter dropraknaren, fore effekterna.
   *  `now` = hoppets klocka (2026-11-08: i analysatorns långsamma väg körs hoppet senare än det kom - klockan följer med recordet;
   *  förr läste varje ställe Date.now() för sig, i bänken samma tal). */
  update(frame: Frame, cfg: EngineConfig, an: { resetTempo(): void; resetBar(): void; setBeatGrid?(g: EngineConfig["beat"]): void }, now = Date.now()): void {
    if (this.ana) {   // TVÅ RUTNÄT: analysatorns rutnät först (gamla vikningen, analysatorns återställningar), frame.bpmConfidence orörd
      const bc = frame.bpmConfidence; this.ana.update(frame, this.anaGrid, an, now); frame.bpmConfidence = bc;
      an.setBeatGrid?.(this.anaGrid.beat);
      an = NO_AN;
      if (cfg.beat && this.innerValid) { cfg.beat.anchorMs = this.innerAnchor; cfg.beat.bpm = this.innerBpm; }   // ETTAN: matningen räknar på det inre ankaret
      this.updateInner(frame, cfg, an, now);
      if (cfg.beat) { this.innerAnchor = cfg.beat.anchorMs; this.innerBpm = cfg.beat.bpm; this.innerValid = true; cfg.beat.anchorMs += this.barOff * (60000 / cfg.beat.bpm) - GRID_EARLY_MS; }
      else this.innerValid = false;
      return;
    }
    this.updateInner(frame, cfg, an, now);
  }

  private updateInner(frame: Frame, cfg: EngineConfig, an: { resetTempo(): void; resetBar(): void; setBeatGrid?(g: EngineConfig["beat"]): void }, now: number): void {
    // TILLITEN KOMMER FRAN FASPREDIKTIONEN, inte fran tempogrammets form.
    // Coast: utan kickar finns inga nya bevis, sa tilliten lacker ner over ~4 s i
    // stallet for att falla direkt. Det ar det som far pulsen att dra sig undan i
    // ett lugnt parti utan att slockna vid ett enda missat slag.
    if (cfg.beat && this.lastPllKickMs) {
      const quiet = now - this.lastPllKickMs;
      if (quiet > 1500) {
        this.onBeatRate *= Math.max(0, 1 - (quiet - 1500) / TRUST_LEAK_MS);
        this.repeatRate *= Math.max(0, 1 - (quiet - 1500) / TRUST_LEAK_MS);
        if (quiet > 8000) this.pllKicks = 0;   // bevisen ar gamla — lamna over till tempogrammet
      }
    }
    {   // (forr: bara nar taktklockan inte var last ur latminnet - alltid sant sedan 2026-09-23)
      // DIAGNOSTIK: bada matten loggas sa de gar att jamfora mot varandra och mot
      // vad ogat ser, i stallet for att bytet ska behova tas pa tro.
      if (frame.bpmConfidence > 0.05 && now - this.lastTrustLog > 4000) {
        this.lastTrustLog = now;
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
    let effBpm = frame.bpm;
    if (BREAK_HOLD_MS > 0 && !this.kickFold && cfg.beat) {   // TAKTEN GENOM BREAKET (se BREAK_HOLD_MS)
      if (effBpm === 0) { if (this.holdSince === 0) this.holdSince = now; if (now - this.holdSince < BREAK_HOLD_MS) effBpm = cfg.beat.bpm; }
      else {
        if (this.holdSince !== 0 && Math.abs(sameOctave(effBpm, cfg.beat.bpm) / cfg.beat.bpm - 1) > 0.04) { this.barReset(); cfg.beat = null; cfg.beatErr = 0; this.clockDetBpm = 0; this.onN = 0; this.scanC = 99; this.tgReset(); }
        this.holdSince = 0;
      }
    }
    if (effBpm === 0) { this.barReset(); cfg.beat = null; cfg.beatErr = 0; this.clockDetBpm = 0; this.onN = 0; this.scanC = 99; this.tgReset(); }   // tyst → stoppa beat-effekter direkt
    if (effBpm > 0) {
      if (!cfg.beat) cfg.beat = { anchorMs: frame.beatAnchorMs || now, bpm: effBpm, confidence: frame.bpmConfidence };
      this.clockDetBpm = effBpm;
      // TILLITEN: landar kickarna på rutnätets slag? (tidsstämpeln är slagets egen, frame.kickAtMs)
      if (frame.kickAtMs > 0) {
        const beatMs = 60000 / cfg.beat.bpm;
        const ph = ((((frame.kickAtMs - cfg.beat.anchorMs) % beatMs) + beatMs) % beatMs) / beatMs;
        const err = ph < 0.5 ? ph : ph - 1;   // -0.5..0.5 av ett taktslag
        const onBeat = Math.abs(err) < 0.25;  // off-beat/synkoperade slag räknas ej
        if (BREAK_RESTORE_MS > 0 && !this.kickFold) {   // TAKTEN GENOM BREAKET (2): dropens kick tar upp rutnätet direkt
          const nowK = now, quiet = this.lastPllKickMs ? nowK - this.lastPllKickMs : 0;
          if (quiet > 1500 && onBeat && this.goodRep > 0 && nowK - this.goodAt < BREAK_RESTORE_MS + 1500) {
            cfg.beat.anchorMs += err * beatMs;
            this.onBeatRate = Math.max(this.onBeatRate, this.goodOn); this.repeatRate = Math.max(this.repeatRate, this.goodRep);
            if (this.pllKicks < 12) this.pllKicks = 12;
          }
        }
        if (onBeat) cfg.beatErr = (cfg.beatErr ?? 0) * 0.85 + err * 0.15;   // UI: ihållande fasfel
        { const x = onBeat ? 1 : 0; this.onBeatRate += (x - this.onBeatRate) * (x > this.onBeatRate ? TRUST_UP : 0.12); }
        { const x = onBeat || this.kickRepeats(frame.kickAtMs, TRUST_REPEAT_BEATS * beatMs, TRUST_REPEAT_TOL * beatMs) ? 1 : 0; this.repeatRate += (x - this.repeatRate) * (x > this.repeatRate ? TRUST_UP : 0.12); }
        this.lastPllKickMs = now;
        if (this.pllKicks < 40) this.pllKicks++;
        if (BREAK_RESTORE_MS > 0 && this.pllKicks >= 12) { this.goodOn = this.onBeatRate; this.goodRep = this.repeatRate; this.goodAt = this.lastPllKickMs; }
      }
      if (frame.kickAtMs > 0 && frame.kickAtMs !== this.kickRingLast) { this.kickRingLast = frame.kickAtMs; this.kickRing[this.kickRingPos] = frame.kickAtMs; this.kickRingPos = (this.kickRingPos + 1) & 63; if (this.kickRingN < 64) this.kickRingN++; }
      {   // ringen + vikningen
        const nowO = now;
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
        if (!this.kickFold) this.tgStep(nowO);
      }
      // TAKTFAS (ettan): analysatorn har mätt vilken av fyrtaktens platser som bär
      // tyngsta slaget. Flytta ankaret HELA taktslag så takträknaren (beatIdx) börjar
      // på ettan — effekter som byter var fjärde takt landar då på musikens storsväng
      // i stället för på ett godtyckligt slag. Fasen inom takten rörs INTE.
      if (frame.barShift > 0 && cfg.beat) {
        cfg.beat.anchorMs += frame.barShift * (60000 / cfg.beat.bpm);
        an.resetBar();
        if (!this.kickFold) { rot4(this.barK, frame.barShift); rot4(this.barL, frame.barShift); rot4(this.barB, frame.barShift); this.barIdx -= frame.barShift; this.barOff = (this.barOff - frame.barShift + 4) & 3; }   // ETTAN följer det inre ankaret
      }
      if (!this.kickFold && cfg.beat) this.barStep(frame, cfg.beat, now);   // ETTAN: effektklockans taktmodell
      // LEVANDE KONFIDENS + COAST. Tidigare skrevs confidence bara vid (om)låsning →
      // grinden nedströms stod och tittade på ett gammalt värde. Nu uppdateras den varje
      // ruta, men med hysteres: faller takt-tydligheten (eller taktfasen aldrig blir
      // säker) håller vi gridet fri-rullande i GRID_COAST_MS — fasen är kvar, så inget
      // glider när takten kommer tillbaka. Håller svagheten i sig är det en riktig
      // låt-/tempoändring: släpp gridet OCH nolla tempohistoriken så nästa lås tas på
      // ~0,5 s i stället för att medianen släpar med gammalt tempo.
      if (cfg.beat) {
        const liveConf = frame.bpmConfidence ?? 0;
        const nowMs = now;
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

// TAKTVÄGEN (2026-11-08): analysatorns långsamma väg skapar taktmatningen via profilen (analyserProfile.ts slowHopFeedModule).
PROFILE.slowHopFeed = () => new BeatFeed();
