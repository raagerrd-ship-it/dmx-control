/** SEKTIONSFÖLJAREN (utbruten ur analyser.ts 2026-11-14). Samlar låtens block (nivå, täthet, klang), rangordnar dem till sektionsetiketter, känner igen upprepning och förutsäger nästa refräng. Körs i långsamma vägen; läser nivå, klang, drop-räknare och klockans tempo ur analysatorn (this.a). */
import { Analyser, SECTION_AGG_HOP, SECTION_SCORE_F32 } from "./analyser.js";

/** Talfält som ska vara flyttal från start (se stabiliseringen i analyser.ts). */
const DOUBLE_FROM_START = ['secHiStartMs', 'secHiEndMs', 'secPct', 'secSongStartMs', 'secBlkMs', 'secBlkInt', 'secBlkCent', 'secBlkRms2', 'secCurDbSum'] as const;

export class SectionTracker {
  /** analysatorn som äger den här delen (delade signaler läses via den) */
  a: Analyser;
  constructor(a: Analyser) {
    this.a = a;
    for (const k of DOUBLE_FROM_START) { const v = (this as unknown as Record<string, number>)[k]; if (typeof v === 'number') { (this as unknown as Record<string, number>)[k] = 0.5; (this as unknown as Record<string, number>)[k] = v; } }
  }
  /** Forutsagelsens kallor (bitmask): 1 = minne (tidigare sektion med samma etikett), 2 = fras (stigande energi -> 8-taktsgrans). Bank-A/B. */
  private static readonly PREDICT_SRC = 2;   // standard 2 sedan frasgittret: minnet gav +1,6 falska/min utan traffar (09-21 kvall)
  /** Frasregel: LOS (standard): 2 stigande block ELLER energi, horisont 16 takter; LOTUS_PREDICT_STRICT=1: 3 block OCH energi, 8 takter.
   *  Bank 09-21 (12 hela latar, 22 refrangstarter): los 8/22 forutsedda inom +-2 s, lead 11,9 s, 6,0 falska/min; stram 4/22, 4,0/min;
   *  bara minne 2/22, 2,0/min. Taket satts av sektionsdetektorn sjalv (high==high 0,51) - battre sektioner -> battre forutsagelse. */

  /** FRASGITTER (09-21 kvall, agent-sec4): LOTUS_PREDICT_GRID = 'hi' (standard) forankrar frasgittret i senaste 'high'-STARTEN (fore forsta
   *  refrangen: sektionsstarten) i stallet for i varje sektionsstart (som flimrar 6 byten/min) -> samma maltid oavsett nar regeln tander.
   *  'sec' = gamla. LOTUS_PREDICT_LAT = gitterlangd i takter (standard 4; gamla 8). LOTUS_PREDICT_RISE = minsta antal raka stigande block
   *  (secRiseRun) for frasregeln (standard 4; 0 = gamla losa regeln riseRun>=2 || buildUp>0,35 || bInt>0,55). LOTUS_PREDICT_DIP = dB (0 = av):
   *  SUG-regel - blockets dB dyker >= DIP dB under medianen av de 6 blocken fore, i hog kontext (medianen >= refrangens dB - 4) -> high om 2 s
   *  (kalla 3; bara pa dykets forsta block). Bank (12 hela latar, 22 refrangstarter): standard 8/22, 2,0 falska/min (var 8/22, 6,0);
   *  RISE=0 12/22, 6,0/min; DIP=5 ensam 3/22, 0,8/min (kort lead 2,3 s) men +1,2/min ovanpa standard utan nya traffar. */

  private static readonly PREDICT_LAT = 4;
  private static readonly PREDICT_RISE = 4;

  private static readonly RANK_HI = 0.67;
  private static readonly RANK_LO = 0.33;
  private static readonly RANK_W_DENS = 0.5;
  private static readonly RANK_W_CENT = 0.5;
  /** NYA SARDRAG I RANGPOANGEN (09-23, agent-sec6; alla 0 = av = identisk poang). Bakgrund: vers 2 och refrang skiljer < 1,5 dB,
   *  kickraknaren ar mattad (~5,8/s overallt, den raknar tempo) och centroiden skiljer ~0,02 - vers 2 ar oskiljbar med dB/kick/centroid.
   *  Referensens tiers (sektionsreferensen) = librosa-RMS + BASONSET-TATHET (onset_strength fmax 220 Hz -> onset_detect toppar/s).
   *  Kandidater, alla per 1 s-block, z-normerade mot latens historik som dB: W_BASSON = basonset-toppar/s (librosa-lik toppplockning
   *  pa ett dB-flux-envelope 20-250 Hz, INTE kickdetektorn), W_BASSENV = medelvarde av samma envelope, W_HIGH = de hoga bandens
   *  absolutniva (bandAbs 6+7, 3,5-16 kHz, dB), W_FLAT = spektral flathet over 8 band (geometriskt/aritmetiskt medel),
   *  W_FLUX = helbandsflux (fluxNorm-medel), W_DYN = dynamik inom blocket (variationskoefficient for rms^2).
   *  MATT 09-23 (blockdump, AUC 4 s-fonster mot proxy-tier / akustiskt upprepningsreferens, train): basonset-toppar 0,51/0,48 (skiljer INGET -
   *  referensens egen onsetPerS skiljer refrang fran vers 2 bara 0,59 mot 0,71 for dB), basenvelope 0,59/0,51, hoga band 0,63/0,71,
   *  flathet 0,56/0,64, flux 0,62/0,73, dynamik 0,46/0,42 (fel tecken), dagens poang 0,64/0,68. BANK (frusen bankmaterial 165, REPEAT 117):
   *  W_HIGH 1,0 = enda som vinner pa TEST mot bada referenserna: sektionsreferens 0,29/0,54/0,65/0,52 -> 0,29/0,57/0,71/0,52 (falsk-high lika),
   *  refrang 2 <= 4 s akustiskt 7/30 -> 9/30 (median 9,1 -> 7,5 s), proxy 1/20 -> 2/20 (proxyns <= 8 s 6 -> 4/20, n litet);
   *  train 0,29/0,61/0,71/0,47 -> 0,38/0,61/0,75/0,47, vers 2 ej high 0,50 -> 0,58. W_FLUX 1,0-1,5 neutral/samre pa refrang 2,
   *  W_HIGH 1,5 lika bra pa test men sektionsreferens oforandrad pa train. Standard 0 (av) tills agaren slar pa. */
  private static readonly RANK_W_BASSON = 0;
  private static readonly RANK_W_BASSENV = 0;
  private static readonly RANK_W_HIGH = 1.0;
  private static readonly RANK_W_FLAT = 0;
  private static readonly RANK_W_FLUX = 0;
  private static readonly RANK_W_DYN = 0;
  private secBlkBon = 0;private secBlkBpk = 0;private secBlkFlux = 0;private secBlkRms4 = 0;
  secBlkH: { bon: number[]; bpk: number[]; high: number[]; flat: number[]; flux: number[]; dyn: number[] } = { bon: [], bpk: [], high: [], flat: [], flux: [], dyn: [] };
  private static readonly RANK_HYST = 0.15;
 
  /** ATERINTRADE (09-22, agent-sec5): efter forsta refrangen ar refrangnivan kand (lastHighDb). Ar 2-blocksmedlet tillbaka pa den nivan
   *  (>= lastHighDb - REENTRY_DB) och 4 s-fonstrets rang >= REENTRY_PCT (under RANK_HI 0,67) -> 'high' DIREKT utan 3-blocks-run.
   *  Offline-sim pa train-dumpen (14 latar med refrang 2): refrang 2 <= 4 s 0 -> 3/14 (median 12,3 -> 8,0 s), vers 2 oforandrad,
   *  refrang-recall 0,58 -> 0,67, falsk-high 0,54 -> 0,55; dB-gransen binder nastan aldrig (0,5-2,0 lika), rangen ar det som avgor.
   *  REENTRY_PCT = 0 (standard) = av. */

  /** NIVAMINNE (09-22, agent-a47; opt-in LOTUS_SECTION_LEVELREF bitmask): efter refrang 1 finns en ABSOLUT referens (lastHighDb =
   *  refrangens medel-dB, lastHighDens = dess kickar/s). Percentilrangen ar relativ mot allt hittills och trog (4 s-fonster, 3 block,
   *  hysteres) - refrang 2 tog lika lang tid som refrang 1 (bank 09-22: median 12 s). bit 1 INTRADE: blockets dB >= ref - LVL_IN och
   *  kickar >= ref x LVL_IN_DENS i LVL_IN_RUN block i rad -> 'high' direkt, forbi rangen. bit 2 UTTRADE/GRIND: dB <= ref - LVL_OUT i
   *  LVL_OUT_RUN block i rad -> inte 'high' (ur high: 'break'), aven om uppehallet (REPEAT 16/32) sager high - det ar vers 2.
   *  bit 4 REFRANG 1 SNABBT: fore forsta high - blocket >= latens hittills hogsta 4 s-fonstermedel + LVL_PEAK dB och kickar >= medel,
   *  LVL_IN_RUN block i rad -> 'high' (fran 10 s, i stallet for rangens 20 s historik). Referensen nollas med sectionReset (10 s tystnad).
   *  BANK 09-22 (bankmaterial, bench.mjs REFRANG 2, REPEAT 117): block-dB ar i praktiken PLATT genom latarna (median refrang 1 - vers 2 = 0,0 dB,
   *  refrang 2 - refrang 1 = 0,2 dB) och kickraknaren mattad (~5,8/s overallt) - referensens energitiers vilar pa sub-dB-skillnader +
   *  librosa-basonsettathet. Darfor: LVL_IN 2 dB fyrar nastan alltid (vers 2 ej high 0,43 -> 0,22), LVL_OUT 5 dB fyrar aldrig, 1 dB
   *  sanker recall (0,58 -> 0,53); bit 4 gor inget (+1,5 dB over hittills hogsta finns inte). Basta: bit 1 med LVL_IN 0 (hogre an
   *  refrangens medel) i 3 block: train refrang 2 <= 4 s 0/14 -> 5/14, <= 8 s 5 -> 7, median 12,3 -> 6,8 s, vers 2 ej high 0,43 (of.),
   *  refrang-recall 0,58 -> 0,69; med 2 block 6/14, 8/14, 5,4 s men vers 2 0,39. TEST (2 block): 0/13 -> 1/13, 3 -> 4, 30 -> 25 s,
   *  vers 2 0,26 -> 0,21, high==high 0,54 -> 0,49 - vinsten overfors svagt. Standard = 0 (av). */

  secBlkCentH: number[] = [];private secScoreBuf: Float64Array | Float32Array = SECTION_SCORE_F32 ? new Float32Array(600) : new Float64Array(600);
  secBlkHighH: number[] = [];
  /** levelVsHighDb-referens: 'section' = senaste refrangens medel-dB (standard), 'rank' = HIGH_REF_P-percentilen av latens block-dB. */

  /** LATGRANS-NYHET (opt-in <prefix>BOUNDARY_NOV=1): bandfordelning + centroid per 1 s-block mot ett langsamt referensavtryck
   *  (BOUNDARY_TAU block); kosinusavstandet stiger nar klangen byts. Raknas pa den sida som kor sectionHop. */

 private bndRef = new Float32Array(9);
  private secBlkRms2 = 0;secBlkDb: number[] = [];secBlkDens: number[] = [];
  private secHiStartMs = 0;   // frasgittrets ankare (senaste high-start), sug-regelns mal + flank
  private secLog: Array<{ label: string; startMs: number; endMs: number; db: number; dens: number }> = [];
  private secCurDbSum = 0;private secCurDbN = 0;private secCurDens = 0;lastHighDb = NaN;
  /** SNABBA KANTER (2026-11-12, uppföljningen av arenan bygg): rangen avgör VILKA partier som är 'high', nivåns kant avgör NÄR.
   *  SEC_EDGE_DB = så stort ska ett nivåskifte vara för att räknas som kant (dB; samma tal åt båda håll och för 'når referensen').
   *  UPP: blocket ligger SEC_EDGE_DB över medianen av frasen före (4 takter ur klockan - medianen ser varken ett hål eller en smäll på
   *  något slag) och når referensen (inom SEC_EDGE_DB från senaste 'high'-partiets nivå, lastHighDb) -> 'high' direkt, rangen ställs på 2.
   *  NED: blocket ligger SEC_EDGE_DB under referensen och blocket före minst halvvägs (skiftet träffar sällan blockgränsen; ett stopp på
   *  ett enda block är inget sektionsbyte) -> ur 'high' direkt till 'low' (dit rangen själv går ur 'high' när nivån fallit), rangen
   *  ställs på 0 och får kvalificera sig på nytt.
   *  Samma mått håller rangen tillbaka: så länge partiet ligger under den refräng musiken lämnade (samma villkor som NED) är rangens
   *  topp 'build' (på väg upp), inte 'high' - annars tar rangen tillbaka ett tyst parti några sekunder efter kanten.
   *  secCarryHighDb = förra låtens referens, buren över låtgränsen som blocken (SECTION_CARRY) tills nya låten har en egen (bara UPP). */
  private static readonly SEC_EDGE_DB = 4;
  secCarryHighDb = NaN;private secHiEndMs = 0;private secEdgeBuf = new Float64Array(16);
  private secBlkMs = 0;private secBlkN = 0;private secBlkInt = 0;private secBlkKicks = 0;private secBlkCent = 0;private secBlkSpec = new Float32Array(8);
  private secTierRun = 0;private secTierCand = 1;private secRiseRun = 0;private secSongStartMs = 0;private secDropSeen = 0;private secSilentBlocks = 0;private secDropHoldUntil = 0;
  private secHist = new Float32Array(16);private secHistPos = 0;private secHistN = 0;
  private static readonly FP_DIM = 11;private static readonly FP_MAX = 96;
  private secFp = new Float32Array(SectionTracker.FP_MAX * SectionTracker.FP_DIM);private secFpT = new Float64Array(SectionTracker.FP_MAX);private secFpLab: string[] = [];
  private secFpN = 0;private secFpPos = 0;private secFpAcc = new Float32Array(SectionTracker.FP_DIM);private secFpAccN = 0;
  private static readonly REPEAT_THR = 0.7;
  private static readonly REPEAT_STEP = 2;
  private static readonly REPEAT_W = 2;
  private static readonly FP2_DIM = 12;private static readonly FP2_MAX = 128;
  private secFp2 = new Float32Array(SectionTracker.FP2_MAX * SectionTracker.FP2_DIM);private secFp2Z = new Float32Array(SectionTracker.FP2_MAX * SectionTracker.FP2_DIM);
  private secFp2T = new Float64Array(SectionTracker.FP2_MAX);private secFp2Db = new Float32Array(SectionTracker.FP2_MAX);private secFp2Dens = new Float32Array(SectionTracker.FP2_MAX);private secFp2Lab: string[] = [];
  private secFp2N = 0;private secFp2Pos = 0;private secFp2Acc = new Float32Array(SectionTracker.FP2_DIM);private secFp2AccN = 0;private secFp2AccDb = 0;private secFp2AccDens = 0;
  private secFp2Mu = new Float32Array(SectionTracker.FP2_DIM);private secFp2Sd = new Float32Array(SectionTracker.FP2_DIM);
  secBlkT: number[] = [];secRank = { md: 0, sd: 1, mk: 0, sk: 1 };private secScoreSorted = new Float64Array(601);   // 2026-10-17: typad scratch, sorteras på plats (var number[] + sort((a, b) => a - b): ~10 kB skräp per block)
  /** KLANGMALL (09-22, REPEAT bit 256/512; bank agent 'refrang 2'): refrang 2 later som refrang 1. I stallet for W rutor mot EN punkt
   *  (bit 2: avtryck var 2 s, sekvens 2 rutor = nuet syns forst 4-6 s in i refrangen, och st >= 1 kravde rangens 3-blocks-hysteres) matchas
   *  VARJE 1 s-block (glidande medel TEMPL_SM block) mot MEDELAVTRYCKET av alla block som hittills varit refrang (TEMPL_SRC 'lab' = egna
   *  'high'-etiketter, 'rank' = omrankade high-block) resp. INTE refrang, minst 8 s gamla; z-normerat mot latens alla block, cosinus.
   *  bit 256: simHi >= TEMPL_THR och simHi - simLo >= TEMPL_MARGIN och 4 s-fonstrets rang >= TEMPL_MINPCT -> 'high' direkt (ingen rang-dwell).
   *  bit 512: i 'high' som halls av minnet/prior (st < 2): simLo - simHi >= TEMPL_MARGIN i TEMPL_RUN raka block -> 'break' (vers 2 liknar vers 1).
   *  TEMPL_W: dimensionsvikter 'full' | 'nobass' (band 0-2 bort) | 'timbre' (bara band + centroid) | 'nolvl' (dB bort).
   *  BANK 09-22 (bench.mjs 'refrang2': refrang 2 igenkand <= 4 s / <= 8 s, median; vers 2 ej high; sektionsreferens gransfel/high==high/recall/falsk):
   *    train (n 14)  117 (Pi):            0/14, 5/14, 12,3 s; 0,43; 0,31/0,51/0,58/0,54      119 (bit 2): identiskt med 117
   *                  373 rank (117+256):  4/14, 7/14,  7,8 s; 0,43; 0,30/0,51/0,71/0,55      373 lab: 2/14, 5/14, 11,9 s
   *                  325 rank (uppehall 16/32 AV + 256): 5/14, 8/14, 5,2 s; 0,51; 0,31/0,52/0,62/0,52   <- REKOMMENDERAD
   *    test  (n 13)  117: 0/13, 3/13, 30,1 s; 0,26; 0,27/0,54/0,65/0,52   373 rank: 3/13, 5/13, 25,4 s; 0,17   325 rank: 4/13, 6/13, 15,3 s; 0,26; 0,33/0,52/0,71/0,53
   *  Uppehallet (16/32) var det som gjorde vers 2 till 'high' (halls sa lange som forra refrangen); med mallinträdet ateroppnas high inom
   *  1-2 s nar refrangen ar tillbaka, sa uppehallet behovs inte. Bit 512 (utgang pa klang) ar INTE bankad: offline ar klangen per block
   *  inte separerbar (vers 2 liknar refrangmallen lika ofta som refrang 2; nyhet vid gransen = nyhet inne i sektionen), sa den ar av. */

  secBlkFeat: Float32Array[] = [];secBlkHi: number[] = [];private secPct = 0;
private repeatHighRun = 0;private secHighRunMs = 0;
  /** sectionHop:s summor (samma skäl): anroparen fyller, sectionHop läser. */
  shIn = { hops: 0.5, intSum: 0.5, kicks: 0.5, breaking: false, nowMs: 0.5, dtMs: 0.5, rms2Sum: 0.5, centSum: 0.5, specOff: 0.5, bonSum: 0.5, bpk: 0.5, fluxSum: 0.5, rms4Sum: 0.5 };
  /** slow + stora vägen: sektionens syn på drop-räknaren (som R_DROPS förr: värdet vid förra env-recordet). */
  secVDrops = 0;
  /** TIDIG REFRANG KRAVER NIVA (2026-09-24, drejboken i ladan: varje lat fick intro -> build -> high vid 20-28 s): direkt efter 20 s-
   *  uppvarmningen rangordnas nuet mot bara introt, sa forsta starkare parti blir 'high' aven om det ar en vers. De forsta
   *  <prefix>SECTION_EARLY_S sekunderna (0 = av) far 'high' bara om de senaste 4 blockens medel ligger >= SECTION_EARLY_DB over
   *  latens blockmedian hittills; annars 'build' (pa vag upp) / kvar. Drop far alltid ge high. */
  private static readonly SECTION_EARLY_S = 45;


  /** SEKTION (2026-09-20). Realtidens sektionstillstand ur latens EGEN historik - inget latminne, ingen PC, inget moln
   *  (slutlaget: bada Pi-systemen kor allt i realtid). Bygger pa intensity (niva relativt latens robusta baslinje),
   *  buildUp/breaking/drop-detektorn och en 1 s-blockstatistik. Tier (lag/mellan/hog) med 3 s hysteres; trend = skillnad
   *  mot 8 s tidigare. Upprepning: ett klangavtryck per 4 s (8 band normerade + centroid + kicktathet + intensitet, L2)
   *  jamfors med alla avtryck >= 16 s tillbaka (max 96 = 6,4 min); bast cosinus -> repeatSim/repeatAgoMs/repeatSection.
   *  Kostnad: nagra adds per hop, ~100 punktprodukter a 11 var fjarde sekund. Referens for bansken: all-in-one pa hela latar. */
  /** Sektionens drop-evidens: levande i roll 'all'/'fast'; i workern med stora vägen värdet vid förra env-recordet (som R_DROPS förr). */
  private secDropsNow(): number { return this.a.role === 'slow' && this.a.bigOn ? this.secVDrops : this.a.drop.dropCand + this.a.drop.secBodyRet; }
  sectionReset(): void {
    this.a.secBuildAt = 0; this.a.secBuildSeen = 0;
    this.a.section = 'intro'; this.a.sectionStartMs = 0; this.a.sectionIndex = 0; this.a.sectionTier = 1; this.a.repeatSim = 0; this.a.repeatAgoMs = 0; this.a.repeatSection = '';
    this.secBlkMs = 0; this.secBlkN = 0; this.secBlkInt = 0; this.secBlkKicks = 0; this.secBlkCent = 0; this.secBlkSpec.fill(0);
    this.secBlkBon = 0; this.secBlkBpk = 0; this.secBlkFlux = 0; this.secBlkRms4 = 0; const H = this.secBlkH; H.bon.length = 0; H.bpk.length = 0; H.high.length = 0; H.flat.length = 0; H.flux.length = 0; H.dyn.length = 0;
    this.secTierRun = 0; this.secTierCand = 1; this.secRiseRun = 0; this.secSongStartMs = 0; this.secBlkRms2 = 0; this.secBlkDb.length = 0; this.secBlkDens.length = 0; this.secBlkCentH.length = 0; this.secDropSeen = this.secDropsNow(); this.secSilentBlocks = 0; this.secDropHoldUntil = 0;
    this.secHistN = 0; this.secHistPos = 0; this.secFpN = 0; this.secFpPos = 0; this.secFpLab.length = 0; this.secFpAcc.fill(0); this.secFpAccN = 0;
    this.secLog.length = 0; this.secCurDbSum = 0; this.secCurDbN = 0; this.secCurDens = 0; this.lastHighDb = NaN; this.secCarryHighDb = NaN; this.secHiEndMs = 0; this.a.expectHighMs = 0; this.a.expectSource = 0; this.a.prevSection = ''; this.a.levelVsHighDb = 0;
    
    this.secHiStartMs = 0; this.secPct = 0;
    this.secFp2N = 0; this.secFp2Pos = 0; this.secFp2Lab.length = 0; this.secFp2Acc.fill(0); this.secFp2AccN = 0; this.secFp2AccDb = 0; this.secFp2AccDens = 0;
    this.secBlkT.length = 0; this.secRank.md = 0; this.secRank.sd = 1; this.secRank.mk = 0; this.secRank.sk = 1; this.a.repeatTier = -1; this.a.repeatHighAtMs = 0; this.a.repeatHighEndAtMs = 0; this.repeatHighRun = 0; this.secHighRunMs = 0;
    this.secBlkFeat.length = 0; this.secBlkHi.length = 0; this.secPct = 0;

    this.secBlkHighH.length = 0; this.bndRef.fill(0); this.a.boundaryNov = 0;
  }

  /** Tar BLOCKSUMMOR (n hop): i roll 'all' anropas den per hop med n = 1, i workern en gang per env-sampel med summorna
   *  for de ~4 hoppen (split.ts). Samma matematik - medelvardena delas med secBlkN i bada fallen. */
  sectionHop(spec: ArrayLike<number>): void {
    const I = this.shIn, hops = I.hops, intSum = I.intSum, kicks = I.kicks, breaking = I.breaking, nowMs = I.nowMs, dtMs = I.dtMs, rms2Sum = I.rms2Sum, centSum = I.centSum,
      specOff = I.specOff, bonSum = I.bonSum, bpk = I.bpk, fluxSum = I.fluxSum, rms4Sum = I.rms4Sum;
    if (this.secSongStartMs === 0) { this.secSongStartMs = nowMs; this.a.sectionStartMs = nowMs; this.secDropSeen = this.secDropsNow(); }
    this.secBlkMs += dtMs; this.secBlkN += hops; this.secBlkInt += intSum; this.secBlkKicks += kicks; this.secBlkCent += centSum; this.secBlkRms2 += rms2Sum;
    this.secBlkBon += bonSum; this.secBlkBpk += bpk; this.secBlkFlux += fluxSum; this.secBlkRms4 += rms4Sum;
    for (let i = 0; i < 8; i++) this.secBlkSpec[i] += spec[specOff + i];
    if (this.secBlkMs < 1000) return;
    this.sectionBlock(nowMs, breaking);
  }

  /** Blockets sardrag och etikett (1 s): den kalla delen av sectionHop, egen funktion sa att dess sallan korda grenar inte deoptimerar 100 Hz-ackumuleringen. */
  private sectionBlock(nowMs: number, breaking: boolean): void {
    const n = this.secBlkN || 1; const bInt = this.secBlkInt / n; const bKicks = this.secBlkKicks; const bCent = this.secBlkCent / n;
    const blkDb = 10 * Math.log10(this.secBlkRms2 / n + 1e-10);
    // NYA SARDRAG (09-23): basonset-envelope/toppar, hoga band, flathet, flux, dynamik - per block, se RANK_W_*.
    const bBon = this.secBlkBon / n, bBpk = this.secBlkBpk / Math.max(0.25, this.secBlkMs / 1000), bFlux = this.secBlkFlux / n;
    const m2 = this.secBlkRms2 / n, v2 = this.secBlkRms4 / n - m2 * m2; const bDyn = m2 > 1e-12 ? Math.sqrt(Math.max(0, v2)) / m2 : 0;
    let sAr = 0, sGe = 0; for (let i = 0; i < 8; i++) { const v = this.secBlkSpec[i] / n + 1e-7; sAr += v; sGe += Math.log(v); }
    const bFlat = Math.exp(sGe / 8) / (sAr / 8); const bHigh = 20 * Math.log10((this.secBlkSpec[6] + this.secBlkSpec[7]) / n + 1e-7);
    // tystnad mellan latar: 3 tysta block -> ny lat
    if (this.a.activeMs === 0) { if (++this.secSilentBlocks >= 10) { this.sectionReset(); return; } }   // 10 s tystnad (var 3: en tyst vers nollade laten, Regnblota 100 s)
    else this.secSilentBlocks = 0;
    // tier med hysteres
    let tier = bInt >= 0.62 ? 2 : bInt <= 0.40 ? 0 : 1;
    {
      // KAUSAL PERCENTILRANG (15:35): blockets dB (ra rms, fore AGC) och basonset-tathet (kickar/s) z-normeras mot alla block
      // hittills i laten, 4 s-fonstrets medelpoang rangordnas mot alla blockpoang hittills. Minst 20 s historik; innan dess 'intro'.
      const db = 10 * Math.log10(this.secBlkRms2 / n + 1e-10); this.secBlkDb.push(db); this.secBlkDens.push(bKicks); this.secBlkCentH.push(bCent); this.secBlkHighH.push(bHigh); if (Analyser.REPEAT & 1) this.secBlkT.push(nowMs);
      { const H = this.secBlkH; H.bon.push(bBon); H.bpk.push(bBpk); H.high.push(bHigh); H.flat.push(bFlat); H.flux.push(bFlux); H.dyn.push(bDyn); }
      if (this.secBlkDb.length > 600) { this.secBlkDb.shift(); this.secBlkDens.shift(); this.secBlkCentH.shift(); this.secBlkHighH.shift(); { const H = this.secBlkH; H.bon.shift(); H.bpk.shift(); H.high.shift(); H.flat.shift(); H.flux.shift(); H.dyn.shift(); } if (Analyser.REPEAT & 1) this.secBlkT.shift();  }
      const nb = this.secBlkDb.length;
      if (nb >= 20) {
        tier = this.rankTier(nb);
      } else { tier = 1; this.secPct = 0; }
    }
    if (tier === this.secTierCand) this.secTierRun++; else { this.secTierCand = tier; this.secTierRun = 1; }
    const runNeed = (Analyser.RANK_RUN_IN > 0 && this.secTierCand === 2 && this.a.sectionTier < 2) ? Analyser.RANK_RUN_IN : Analyser.RANK_RUN;
    if (this.secTierRun >= runNeed) this.a.sectionTier = this.secTierCand;
    // SNABBA KANTER (se SEC_EDGE_DB): nivåskiftet mot referensen tar etiketten direkt, förbi rangens fönster, lopp och uppehållstid.
    let edgeUp = false, edgeDown = false, fallen = false;
    {
      const D = this.secBlkDb, nb = D.length, E = SectionTracker.SEC_EDGE_DB, ref = this.lastHighDb === this.lastHighDb ? this.lastHighDb : this.secCarryHighDb;
      fallen = nb >= 2 && blkDb <= this.lastHighDb - E && D[nb - 2] <= this.lastHighDb - E / 2;   // partiet ligger under låtens egen referens
      if (this.a.section === 'high') edgeDown = fallen;
      else if (blkDb >= ref - E) {
        const barMs = this.a.localBpm > 40 ? 240000 / this.a.localBpm : 4 * Analyser.BE_FALLBACK_MS;
        const m = Math.min(nb - 1, 4 * Math.max(2, Math.min(4, Math.round(barMs / 1000)))), w = this.secEdgeBuf;   // frasen före blocket, i block
        if (m >= 4) {
          for (let i = 0; i < m; i++) { const v = D[nb - 2 - i]; let k = i; while (k > 0 && w[k - 1] > v) { w[k] = w[k - 1]; k--; } w[k] = v; }
          edgeUp = blkDb - w[m >> 1] >= E;
        }
      }
      if (edgeUp || edgeDown) { this.a.sectionTier = edgeUp ? 2 : 0; this.secTierCand = this.a.sectionTier; this.secTierRun = 0; }
    }
    const st = this.a.sectionTier;
    // trend mot 8 s sedan
    this.secHist[this.secHistPos] = bInt; this.secHistPos = (this.secHistPos + 1) & 15; if (this.secHistN < 16) this.secHistN++;
    const rise = this.secHistN >= 9 ? bInt - this.secHist[(this.secHistPos - 9 + 16) & 15] : 0;
    this.secRiseRun = rise >= 0.10 ? this.secRiseRun + 1 : 0;
    const sinceStart = nowMs - this.secSongStartMs; const dropEv = this.secDropsNow(); const dropped = dropEv !== this.secDropSeen; this.secDropSeen = dropEv;
    const prev = this.a.section; let label: string;
    {
      // rang-lage: tier 2 = high, tier 0 = low, mitten = 'break' pa vag ner fran high, 'build' pa vag upp fran low/intro, annars kvar
      // SECTION_BODY_HIGH aven i intro (DMX-fyndet 10-20: latgransen 0,1-7 s fore dropen nollade till intro, smallen nadde aldrig high):
      // basen tillbaka = 'high' direkt och kvar tills rangen har 20 block.
      if (this.secBlkDb.length < 20) label = edgeDown ? 'low' : edgeUp || (Analyser.BODY_HIGH_MS > 0 && (dropped || prev === 'high')) ? 'high' : 'intro';
      else if (dropped || st === 2) label = 'high';
      else if (st === 0) label = 'low';
      else label = prev === 'high' || prev === 'break' ? 'break' : (prev === 'low' || prev === 'intro' || prev === 'build') ? 'build' : prev;
      if (label === 'high' && !dropped && !edgeUp && prev !== 'high' && sinceStart < SectionTracker.SECTION_EARLY_S * 1000 && this.secBlkDb.length >= 4) {
        const D = this.secBlkDb, nb = D.length; const srt = D.slice().sort((a, b) => a - b); const med = srt[nb >> 1];
        const m4 = (D[nb - 1] + D[nb - 2] + D[nb - 3] + D[nb - 4]) / 4;
        if (m4 < med + Analyser.SECTION_EARLY_DB) label = prev === 'intro' || prev === 'low' || prev === 'build' ? 'build' : prev;
      }
      // MINNET (bit 2/8): nuet liknar ett tidigare parti -> det partiets tier (omrankad med dagens kunskap) vager in.
      // INTRADE VIA LAG (bit 64): det forflutnas high-start + lag ar NU (-1,5..+1 s) -> high direkt, utan rangens 2-blocks-hysteres + 4 s-fonster
      if ((Analyser.REPEAT & 64) && this.a.repeatSim >= SectionTracker.REPEAT_THR && this.a.repeatHighAtMs > 0 && st >= 1 && label !== 'high' && !dropped) {
        const d = this.a.repeatHighAtMs - nowMs; if (d >= -1500 && d <= 1000) label = 'high';
      }
      // ATERINTRADE (REENTRY_PCT): nivan ar tillbaka pa refrangens och rangen nastan uppe -> high direkt (refrang 2 <= 4 s)
      // KLANGMALL IN (bit 256): blocket later som refrangen hittills (och inte som resten) och rangen ar inte tydligt lag -> high direkt
      // UPPEHALL I HIGH (bit 16 minne / bit 32 prior 8 takter): rangen dippar till mellan mitt i refrangen (4 s-fonster) -> high -> break -> high
      // var 4 s (baslinjen: joaquinphoenix 24h 28b 32h 36b 45h mot referens high 27-102 s). Sa lange forra refrangen varade halls high; tier 0 slapper.
      if ((Analyser.REPEAT & 48) && prev === 'high' && label === 'break' && st === 1) {
        {
          let hold = (Analyser.REPEAT & 16) ? Math.min(40000, this.secHighRunMs) : 0;
          if ((Analyser.REPEAT & 32) && this.a.localBpm > 0) hold = Math.max(hold, 8 * 240000 / this.a.localBpm);
          if (nowMs - this.a.sectionStartMs < hold) label = 'high';
        }
      }
      // DROPEN HALLER HIGH (2026-11-03, DMX-fyndet 11-02: break med full bas efter dropen, high 66,2 -> break -> high 71,3 i ladan):
      // dropped ger high i ett block, men rangens 4 s-fonster bar breakets block i RANK_WIN + RANK_RUN block till - sa lange halls
      // 'high' efter en drop om tier >= 1; tier 0 slapper. Standard i koden sedan 11-03 (agaren; backup/fore-drop-hold-20261103).
      if (dropped && label === 'high') this.secDropHoldUntil = nowMs + (Analyser.RANK_WIN + Analyser.RANK_RUN) * 1000;
      else if (prev === 'high' && label !== 'high' && st >= 1 && nowMs < this.secDropHoldUntil) label = 'high';
      // UTGANG VIA LAG (bit 128): det forflutnas high-SLUT + lag. Sa lange det forflutna fortfarande ar high halls high (st 1);
      // nar slutet ar NU (-1,5..+1,5 s) och rangen inte langre sager high -> 'break' direkt (minnets grans i stallet for uppehallets slut).
      // NIVAMINNE (LEVELREF, se flaggan): absolut referens fran refrang 1 i stallet for den troga percentilrangen. Drop vinner alltid.
      // KLANGMALL UT (bit 512): high som bara halls (rangen sager inte high) men blocket later som icke-refrangen i TEMPL_RUN raka block -> break
    }
    // RANGEN NÅR INTE REFERENSEN (se SEC_EDGE_DB): rangen säger topp men partiet ligger kvar under den refräng musiken lämnade ->
    // på väg upp ('build'), inte framme. Gäller så länge den referensen är färsk (BE_MEM_BEATS slag, som basenergins referens).
    if (label === 'high' && prev !== 'high' && !dropped && !edgeUp && fallen && nowMs - this.secHiEndMs < Analyser.BE_MEM_BEATS * (this.a.localBpm > 40 ? 60000 / this.a.localBpm : Analyser.BE_FALLBACK_MS)) {
      label = prev === 'break' ? 'break' : 'build'; this.a.sectionTier = 1;
    }
    // UPPEHALLSTID (09-20, forsta forsta hela laten: build/intro/low bytte var 1-3 s): ett byte kravs ha statt >= 4 s i nuvarande
    // sektion, utom in i 'high' (drop/topp ska synas direkt) och ur 'high' till 'break' (svackan ar en flank).
    // uppehallstid 8 s (var 4: build/low/high bytte var 4 s pa pop 14:30), utom in i 'high' (4 s) och high -> break (direkt)
    const dwellMs = label === 'high' ? 4000 : 8000;
    const dwellOk = nowMs - this.a.sectionStartMs >= dwellMs || (prev === 'high' && label === 'break') || (Analyser.BODY_HIGH_MS > 0 && dropped && label === 'high') || edgeUp || edgeDown;
    if (label !== prev && dwellOk) {
      // MINNE: avslutad sektion till loggen (medel-dB, kickar/s); refrangens dB blir referensen for levelVsHighDb.
      const dbMean = this.secCurDbN ? this.secCurDbSum / this.secCurDbN : blkDb;
      this.secLog.push({ label: prev, startMs: this.a.sectionStartMs, endMs: nowMs, db: dbMean, dens: this.secCurDbN ? this.secCurDens / this.secCurDbN : 0 });
      if (this.secLog.length > 48) this.secLog.shift();
      if (prev === 'high') { this.lastHighDb = dbMean; this.secHiEndMs = nowMs; }
      this.a.prevSection = prev; this.secCurDbSum = 0; this.secCurDbN = 0; this.secCurDens = 0;
      this.a.sectionStartMs = nowMs; if (label === 'high') { this.a.sectionIndex++; this.secHiStartMs = nowMs; } this.a.section = label;
    }
    // UPPBYGGNADENS START (frame.buildProg): 'build' som återkommer inom 2 s räknas som samma uppbyggnad (sektionsfladder).
    if (prev === 'build' || this.a.section === 'build') { if (this.a.section === 'build' && (this.a.secBuildAt === 0 || nowMs - this.a.secBuildSeen > 2000)) this.a.secBuildAt = nowMs; this.a.secBuildSeen = nowMs; }
    this.secCurDbSum += blkDb; this.secCurDbN++; this.secCurDens += bKicks;
    if (this.a.secDump) { const row = [(nowMs - this.secSongStartMs) / 1000, blkDb, bKicks, bCent, bInt, breaking ? 1 : 0, dropped ? 1 : 0]; for (let i = 0; i < 8; i++) row.push(this.secBlkSpec[i] / n); row.push(st, ['intro', 'low', 'build', 'high', 'break'].indexOf(this.a.section)); this.a.secDump.push(row); }
    if (this.a.section === 'high') { this.lastHighDb = this.secCurDbSum / this.secCurDbN; }   // pagaende refrang = farskaste referensen
    this.a.levelVsHighDb = Number.isFinite(this.lastHighDb) ? blkDb - this.lastHighDb : 0;
    this.predictHigh(nowMs, bInt);
    if (this.a.dbgSecBlock) this.a.dbgSecBlock({ nowMs, section: this.a.section, sectionStartMs: this.a.sectionStartMs, prev, label, bpm: this.a.localBpm, bInt, bKicks, bCent, blkDb, buildUp: this.a.buildUp, riseRun: this.secRiseRun, rise, dropped, breaking, tier: this.a.sectionTier, repeatSim: this.a.repeatSim, repeatAgoMs: this.a.repeatAgoMs, repeatSection: this.a.repeatSection, spec: Array.from(this.secBlkSpec, (v) => v / n), lastHighDb: this.lastHighDb, expectHighMs: this.a.expectHighMs, expectSource: this.a.expectSource, beatPhaseMs: this.a.beatPhaseMs, secLogN: this.secLog.length, secLogLast: this.secLog[this.secLog.length - 1] ?? null, bBon, bBpk, bFlux, bDyn, bHigh, bFlat, pct: this.secPct });
    if (Analyser.REPEAT & 1) { this.repeatStep(nowMs, blkDb, bKicks, bCent, bInt); this.secBlkMs = 0; this.secBlkN = 0; this.secBlkInt = 0; this.secBlkKicks = 0; this.secBlkCent = 0; this.secBlkSpec.fill(0); this.secBlkRms2 = 0; this.secBlkBon = 0; this.secBlkBpk = 0; this.secBlkFlux = 0; this.secBlkRms4 = 0; return; }
    // klangavtryck var 4:e sekund
    let sum = 0; for (let i = 0; i < 8; i++) sum += this.secBlkSpec[i];
    const acc = this.secFpAcc; for (let i = 0; i < 8; i++) acc[i] += sum > 0 ? this.secBlkSpec[i] / sum : 0;
    acc[8] += bCent; acc[9] += Math.min(1, bKicks / 4); acc[10] += bInt; this.secFpAccN++;
    if (this.secFpAccN >= 4) {
      const D = SectionTracker.FP_DIM; let nrm = 0; for (let i = 0; i < D; i++) { acc[i] /= this.secFpAccN; nrm += acc[i] * acc[i]; }
      nrm = Math.sqrt(nrm) || 1; for (let i = 0; i < D; i++) acc[i] /= nrm;
      let best = 0, bestAt = 0, bestLab = '';
      for (let k = 0; k < this.secFpN; k++) {
        if (nowMs - this.secFpT[k] < 16000) continue;
        let dot = 0; const o = k * D; for (let i = 0; i < D; i++) dot += acc[i] * this.secFp[o + i];
        if (dot > best) { best = dot; bestAt = this.secFpT[k]; bestLab = this.secFpLab[k]; }
      }
      this.a.repeatSim = best; this.a.repeatAgoMs = best > 0 ? nowMs - bestAt : 0; this.a.repeatSection = bestLab;
      const o = this.secFpPos * D; for (let i = 0; i < D; i++) this.secFp[o + i] = acc[i];
      this.secFpT[this.secFpPos] = nowMs; this.secFpLab[this.secFpPos] = this.a.section;
      this.secFpPos = (this.secFpPos + 1) % SectionTracker.FP_MAX; if (this.secFpN < SectionTracker.FP_MAX) this.secFpN++;
      acc.fill(0); this.secFpAccN = 0;
    }
    this.secBlkMs = 0; this.secBlkN = 0; this.secBlkInt = 0; this.secBlkKicks = 0; this.secBlkCent = 0; this.secBlkSpec.fill(0); this.secBlkRms2 = 0; this.secBlkBon = 0; this.secBlkBpk = 0; this.secBlkFlux = 0; this.secBlkRms4 = 0;
  }

  /** RANGBERÄKNINGEN (2026-10-17, skräpjakten): utbruten ur sectionBlock. sectionBlock körs 1 gång/s och deoptas; V8 optimerar om
   *  först efter tusentals anrop, så looparna här över hela låtens block (~600) gick otolkade och boxade varje flyttal (~21 kB per
   *  block). Som egen metod med tunga loopar optimeras den på loopbudgeten. Samma räkning i samma ordning; returnerar tiern. */
  private rankTier(nb: number): number {
    const D = this.secBlkDb, K = this.secBlkDens, C = this.secBlkCentH, wk = SectionTracker.RANK_W_DENS, wc = SectionTracker.RANK_W_CENT;
    let md = 0, mk = 0, mc = 0; for (let i = 0; i < nb; i++) { md += D[i]; mk += K[i]; mc += C[i]; } md /= nb; mk /= nb; mc /= nb;
    let sd = 0, sk = 0, sc = 0; for (let i = 0; i < nb; i++) { sd += (D[i] - md) ** 2; sk += (K[i] - mk) ** 2; sc += (C[i] - mc) ** 2; }
    sd = Math.max(1.0, Math.sqrt(sd / nb)); sk = Math.max(0.3, Math.sqrt(sk / nb)); sc = Math.max(0.02, Math.sqrt(sc / nb));
    this.secRank.md = md; this.secRank.sd = sd; this.secRank.mk = mk; this.secRank.sk = sk;
    // Nya sardrag (RANK_W_*): z mot latens historik med sd-golv (skala per sardrag), viktade in i samma poang i fast
    // ordning. Poangen summeras i 64 bitar och lagras en gang (SECTION_SCORE_F32 avrundar da en gang, som aldre vagen).
    const terms = this.secTerms; let nt = 0;
    {
      const H = this.secBlkH;
      nt = this.rankTerm(nt, H.bpk, SectionTracker.RANK_W_BASSON, 0.5, nb); nt = this.rankTerm(nt, H.bon, SectionTracker.RANK_W_BASSENV, 0.02, nb); nt = this.rankTerm(nt, this.secBlkHighH, SectionTracker.RANK_W_HIGH, 1.0, nb);
      nt = this.rankTerm(nt, H.flat, SectionTracker.RANK_W_FLAT, 0.02, nb); nt = this.rankTerm(nt, H.flux, SectionTracker.RANK_W_FLUX, 0.01, nb); nt = this.rankTerm(nt, H.dyn, SectionTracker.RANK_W_DYN, 0.05, nb);
    }
    const S = this.secScoreBuf;
    for (let i = 0; i < nb; i++) {
      let v = (D[i] - md) / sd + wk * (K[i] - mk) / sk + wc * (C[i] - mc) / sc;
      for (let t = 0; t < nt; t++) { const T = terms[t]; v += T.w * (T.X[i] - T.m) / T.s; }
      S[i] = v;
    }
    let win = 0; const W = Math.min(Analyser.RANK_WIN, nb); for (let i = nb - W; i < nb; i++) win += S[i]; win /= W;
    let below = 0, cnt = 0;
    { let acc = 0; for (let e = 1; e <= nb; e++) { acc += S[e - 1]; if (e > W) acc -= S[e - 1 - W]; if (e >= W) { cnt++; if (acc / W < win) below++; } } }
    const pct = below / cnt; const cur = this.a.sectionTier, h = SectionTracker.RANK_HYST; this.secPct = pct;
    return pct >= SectionTracker.RANK_HI - (cur === 2 ? h : 0) ? 2 : pct <= SectionTracker.RANK_LO + (cur === 0 ? h : 0) ? 0 : 1;
  }

  /** En RANK_W_*-term (2026-10-17: fasta objekt i secTerms i st f en ny array + objekt + closure per block). Samma räkning som förr. */
  private rankTerm(nt: number, X: number[], w: number, floor: number, nb: number): number {
    if (w === 0) return nt;
    let m = 0; for (let i = 0; i < nb; i++) m += X[i]; m /= nb; let s = 0; for (let i = 0; i < nb; i++) s += (X[i] - m) ** 2; s = Math.max(floor, Math.sqrt(s / nb));
    const T = this.secTerms[nt]; T.X = X; T.w = w; T.m = m; T.s = s; return nt + 1;
  }
  private secTerms = [0, 1, 2, 3, 4, 5].map(() => ({ X: [] as number[], w: 0.5, m: 0.5, s: 0.5 }));

  /** UPPREPNINGSMINNE v2 (se REPEAT). Kors per sektionsblock; avtryck var REPEAT_STEP:e block. Bara sectionHops blocksummor + egna falt. */
  private repeatStep(nowMs: number, blkDb: number, bKicks: number, bCent: number, bInt: number): void {
    const D = SectionTracker.FP2_DIM, MAX = SectionTracker.FP2_MAX, acc = this.secFp2Acc;
    let sum = 0; for (let i = 0; i < 8; i++) sum += this.secBlkSpec[i];
    for (let i = 0; i < 8; i++) acc[i] += sum > 0 ? this.secBlkSpec[i] / sum : 0;
    acc[8] += bCent; acc[9] += Math.min(1, bKicks / 4); acc[10] += bInt; acc[11] += blkDb / 10; this.secFp2AccDb += blkDb; this.secFp2AccDens += bKicks; this.secFp2AccN++;
    if (this.secFp2AccN < SectionTracker.REPEAT_STEP) return;
    const pos = this.secFp2Pos, o = pos * D; for (let i = 0; i < D; i++) this.secFp2[o + i] = acc[i] / this.secFp2AccN;
    this.secFp2T[pos] = nowMs; this.secFp2Db[pos] = this.secFp2AccDb / this.secFp2AccN; this.secFp2Dens[pos] = this.secFp2AccDens / this.secFp2AccN; this.secFp2Lab[pos] = this.a.section;
    this.secFp2Pos = (pos + 1) % MAX; if (this.secFp2N < MAX) this.secFp2N++;
    acc.fill(0); this.secFp2AccN = 0; this.secFp2AccDb = 0; this.secFp2AccDens = 0;
    const N = this.secFp2N; const idx = (m: number) => (pos - m + MAX) % MAX;   // m = alder i rutor (0 = nyaste)
    // z-normering mot latens egen historik: medel/std per dimension over alla lagrade avtryck, sedan enhetslangd
    const mu = this.secFp2Mu, sd = this.secFp2Sd; mu.fill(0); sd.fill(0);
    for (let m = 0; m < N; m++) { const q = idx(m) * D; for (let i = 0; i < D; i++) mu[i] += this.secFp2[q + i]; }
    for (let i = 0; i < D; i++) mu[i] /= N;
    for (let m = 0; m < N; m++) { const q = idx(m) * D; for (let i = 0; i < D; i++) sd[i] += (this.secFp2[q + i] - mu[i]) ** 2; }
    for (let i = 0; i < D; i++) sd[i] = Math.max(1e-3, Math.sqrt(sd[i] / N));
    const z = this.secFp2Z;
    for (let m = 0; m < N; m++) { const q = idx(m) * D; let nrm = 0; for (let i = 0; i < D; i++) { const v = (this.secFp2[q + i] - mu[i]) / sd[i]; z[q + i] = v; nrm += v * v; } nrm = Math.sqrt(nrm) || 1; for (let i = 0; i < D; i++) z[q + i] /= nrm; }
    // sekvensmatch: de W senaste rutorna mot W rutor som slutar >= 16 s tillbaka
    const W = Math.min(SectionTracker.REPEAT_W, N); let best = 0, bestM = -1;
    for (let m = W; m + W - 1 < N; m++) {
      if (nowMs - this.secFp2T[idx(m)] < 16000) continue;
      let s = 0; for (let j = 0; j < W; j++) { const a = idx(j) * D, b = idx(m + j) * D; for (let i = 0; i < D; i++) s += z[a + i] * z[b + i]; }
      s /= W; if (s > best) { best = s; bestM = m; }
    }
    const prevAt = this.a.repeatHighAtMs;
    this.a.repeatSim = best; this.a.repeatTier = -1; this.a.repeatHighAtMs = 0; this.a.repeatHighEndAtMs = 0;
    // omrankning med dagens kunskap: blockpoang sorterade -> percentil for det matchade partiet (medel over W rutor) och for blocken efter det
    const nb = this.secBlkDb.length; if (nb < 20) { this.a.repeatAgoMs = 0; this.a.repeatSection = ''; return; }
    const R = this.secRank; const score = (db: number, dens: number) => (db - R.md) / R.sd + (dens - R.mk) / R.sk;
    const ss = this.secScoreSorted; for (let i = 0; i < nb; i++) ss[i] = score(this.secBlkDb[i], this.secBlkDens[i]); ss.subarray(0, nb).sort();
    const pct = (v: number) => { let lo = 0, hi = nb; while (lo < hi) { const mid = (lo + hi) >> 1; if (ss[mid] < v) lo = mid + 1; else hi = mid; } return lo / nb; };
    // MINNE OM LANGD (bit 16): langsta high-korningen (omrankad, luckor <= 2 block) fore nuvarande sektion -> sa lange varar high
    if (Analyser.REPEAT & 16) {
      let run = 0, gap = 0, bestRun = 0;
      for (let i = 0; i < nb; i++) {
        if (this.secBlkT[i] >= this.a.sectionStartMs) break;
        if (pct(score(this.secBlkDb[i], this.secBlkDens[i])) >= SectionTracker.RANK_HI) { run += 1 + gap; gap = 0; if (run > bestRun) bestRun = run; }
        else if (run > 0 && ++gap > 2) { run = 0; gap = 0; }
      }
      this.secHighRunMs = bestRun * 1000;
    }
    if (bestM < 0) { this.a.repeatAgoMs = 0; this.a.repeatSection = ''; return; }
    const kEnd = idx(bestM); const lagMs = nowMs - this.secFp2T[kEnd];
    this.a.repeatAgoMs = lagMs; this.a.repeatSection = this.secFp2Lab[kEnd];
    let ps = 0; for (let j = 0; j < W; j++) { const k = idx(bestM + j); ps += score(this.secFp2Db[k], this.secFp2Dens[k]); } ps /= W;
    const p = pct(ps); this.a.repeatTier = p >= SectionTracker.RANK_HI ? 2 : p <= SectionTracker.RANK_LO ? 0 : 1;
    // det forflutnas framtid: forsta blocket efter det matchade partiet som (2 i rad) rankas high -> vantas igen efter lag
    const tEnd = this.secFp2T[kEnd]; let run = 0, at = 0, endAt = 0, lowRun = 0;
    for (let i = 0; i < nb; i++) {
      if (this.secBlkT[i] <= tEnd) continue;
      const hi = pct(score(this.secBlkDb[i], this.secBlkDens[i])) >= SectionTracker.RANK_HI;
      if (at === 0) { if (hi) { if (++run >= 2) at = this.secBlkT[i - 1] + lagMs; } else run = 0; }
      else if (!hi) { if (++lowRun >= 3) { endAt = this.secBlkT[i - 2] + lagMs; break; } } else lowRun = 0;   // slutet: 3 block i rad under high
    }
    this.a.repeatHighEndAtMs = at > 0 ? endAt : 0;
    // STABILT MAL: matchningens lag driver nagra sekunder mellan stegen (techno: allt liknar allt) och malet gled med (tim: 12 falska/min).
    // Ett aktivt mal behalls om det nya ligger inom +-4 s; ett mal publiceras forst nar det statt tva steg i rad (repeatHighRun).
    if (at > 0 && prevAt > nowMs && Math.abs(at - prevAt) <= 4000) { at = prevAt; this.repeatHighRun++; }
    else this.repeatHighRun = at > 0 ? 1 : 0;
    this.a.repeatHighAtMs = at;
  }

  /** FORUTSAGELSE av nasta 'high' (se Frame.expectHighInMs). Kors per sektionsblock (1 s) i workern. Kallor: 1 minne, 2 fras
   *  (stigande energi -> nasta gitterpunkt), 3 sug (dyk i dB strax fore smallen). Frasgittret ligger i takter fran senaste
   *  high-starten (PREDICT_GRID 'hi') sa att en forutsagelse pekar pa samma tid oavsett i vilket block regeln tander. */
  private predictHigh(nowMs: number, bInt: number): void {
    const bpm = this.a.localBpm; const barMs = bpm > 0 ? 240000 / bpm : 0;
    let exp = 0, src = 0;
    // (4) UPPREPNING (REPEAT bit 4): det forflutna spelas upp igen med lag L -> forra gangens high-start + L
    if ((Analyser.REPEAT & 4) && this.a.section !== 'high' && this.a.repeatSim >= SectionTracker.REPEAT_THR && this.repeatHighRun >= 2 && this.a.repeatHighAtMs > nowMs + 500 && this.a.repeatHighAtMs - nowMs <= 32000) { exp = this.a.repeatHighAtMs; src = 4; }
    if (!exp && this.a.section !== 'high' && barMs > 0) {
      // (1) MINNE: senaste tidigare sektion med samma etikett som foljdes av 'high' -> samma antal takter (avrundat till 4, minst 4)
      if (SectionTracker.PREDICT_SRC & 1) for (let i = this.secLog.length - 2; i >= 0; i--) {
        const a = this.secLog[i], b = this.secLog[i + 1];
        if (a.label !== this.a.section || b.label !== 'high') continue;
        const bars = Math.max(4, Math.round((a.endMs - a.startMs) / barMs / 4) * 4);
        const cand = this.a.sectionStartMs + bars * barMs;
        if (cand > nowMs + 500) { exp = cand; src = 1; }
        break;
      }
      // (2) FRAS: energin stiger -> nasta gitterpunkt (PREDICT_LAT takter) fran ankaret (minst en takt bort, hogst 16 takter)
      const rising = this.secRiseRun >= SectionTracker.PREDICT_RISE;
      if (!exp && (SectionTracker.PREDICT_SRC & 2) && rising) {
        const anchor = this.secHiStartMs > 0 ? this.secHiStartMs : this.a.sectionStartMs;
        const L = SectionTracker.PREDICT_LAT * barMs;
        const elapsed = nowMs - anchor; const k = Math.ceil((elapsed + barMs) / L);
        const cand = anchor + k * L;
        if (cand - nowMs <= 16 * barMs) { exp = cand; src = 2; }
      }
    }
    if (exp === 0 && this.a.expectHighMs > 0 && this.a.section !== 'high' && this.a.expectHighMs > nowMs - 2000) { exp = this.a.expectHighMs; src = this.a.expectSource; }   // hall forutsagelsen tills 2 s efter
    this.a.expectHighMs = exp; this.a.expectSource = src;
  }

  /** Roll 'all': sektionsblocket ur samma aggregat som workern far (se secAgg). */
  sectionFlushAgg(): void {
    const g = this.a.secAgg; if (g.n === 0) return;
    { const I = this.shIn; I.hops = g.n; I.intSum = g.int; I.kicks = g.kicks; I.breaking = g.breaking > 0; I.nowMs = g.wall; I.dtMs = g.dt; I.rms2Sum = g.rms2; I.centSum = g.cent;
      I.specOff = 0; I.bonSum = g.bon; I.bpk = g.bpk; I.fluxSum = g.flux; I.rms4Sum = g.rms4; }
    this.sectionHop(g.spec);
    g.n = 0; g.int = 0; g.kicks = 0; g.breaking = 0; g.rms2 = 0; g.cent = 0; g.dt = 0; g.spec.fill(0); g.bon = 0; g.bpk = 0; g.flux = 0; g.rms4 = 0;
  }

  /** Sektionens blocksummor per hop (SECTION_AGG 'env': ackumulator; 'hop': sectionHop direkt / snabba sidans aggregat). */
  sectionAggStep(): void {
    const intensity = this.a.hIntensity, kick = this.a.hKick, breaking = this.a.hBreaking, rms = this.a.hRms, fluxNorm = this.a.hFlux, nowWallA = this.a.hNowWall;
    const dtHop = this.a.dtHop;
      if (this.a.bigOn) return;   // stora vägen: aggregatet byggs i långsamma tråden (bigAgg)
      if (SECTION_AGG_HOP) {
        // Aldre vagen: bandens magnitud ur band-dB; odelad analysator kor sectionHop per hop, snabba sidan aggregerar.
        const sp = this.a.secSpecHop;   // bandDbRaw ändras bara i bigStep (var BIG_EVERY:e hop): potensen räknas om då, samma värden (a7/a8)
        if (this.a.secSpecDirty) { this.a.secSpecDirty = false; for (let i = 0; i < 8; i++) sp[i] = Math.pow(10, this.a.bandDbRaw[i] / 20); }
        if (this.a.role === 'fast') {
          const g = this.a.secAgg; g.n++; g.int += intensity; if (kick) g.kicks++; g.rms2 += rms * rms; g.cent += this.a.centSmooth; g.dt += this.a.dtHop * 1000;
          g.breaking = breaking ? 1 : 0; g.wall = this.a.wallNow(); g.drops = this.a.drop.dropCand + this.a.drop.secBodyRet; g.active = this.a.activeMs; g.build = this.a.buildUp;
          for (let i = 0; i < 8; i++) g.spec[i] += sp[i];
        } else { const I = this.shIn; I.hops = 1; I.intSum = intensity; I.kicks = kick ? 1 : 0; I.breaking = breaking; I.nowMs = this.a.wallNow(); I.dtMs = this.a.dtHop * 1000;
          I.rms2Sum = rms * rms; I.centSum = this.a.centSmooth; I.specOff = 0; I.bonSum = 0; I.bpk = 0; I.fluxSum = 0; I.rms4Sum = 0; this.sectionHop(sp); }
      } else {
        const g = this.a.secAgg; g.n++; g.int += intensity; if (kick) g.kicks++; if (breaking) g.breaking = 1; g.rms2 += rms * rms; g.cent += this.a.centSmooth; g.dt += dtHop * 1000; g.wall = nowWallA;
        for (let i = 0; i < 8; i++) g.spec[i] += this.a.bandAbs[i];
        g.bon += this.a.bassOnRing[(this.a.bassOnN - 1 + Analyser.BASSON_LEN) % Analyser.BASSON_LEN]; if (this.a.bassOnPeak) { g.bpk++; this.a.bassOnPeak = false; } g.flux += fluxNorm; g.rms4 += rms * rms * rms * rms;
      }
  }
}
