/** DROP-DETEKTORN (utbruten ur analyser.ts 2026-11-14). Baskroppens tak och frånvaro, flanken (full drop), slam-kandidaten, minidrop, klassningen och lyft/nästan-drop/stopp. Körs i långsamma vägen per stor-FFT; läser baskroppen, nivån och klockans tempo ur analysatorn (this.a) och skriver dropCount/miniDropCount m.m. */
import { Analyser, BODY_CEIL_DB_S, BODY_GONE_MIN_MS, BODY_RISE_DB, DROP_QUALITY_DB, DROP_RISE_LOW_DB, DROP_TRACE, DROP_UNDERPEAK_MIN, MINI_SPACING_MS } from "./analyser.js";

const BODY_GONE_DB = 5;
const BODY_PEAK_DB = 10;   // BRED onset-grind (en ren edge per event)
// ARMERAT FONSTER: edgen ARMERAR, fyrningen sker nar fullSlam blir sann inom fonstret (mjuka pop-drops toppar
// 50-200 ms efter edgen). 0 = bara edge-ogonblicket.
const DROP_ARM_MS = 300;
// FYR-LAGG: hela laggen ar bodyFast-filtret (tau 120 ms) som alla tre villkor laser. BODY_FAST_S sveper tau.
const BODY_FAST_S = 0.06;
const DROP_RISE_LOW_Q = 3;
/** STRIKT INTRO (opt-in DROP_CALM_INTRO_STRICT=1, kraver <prefix>DROP_CALM_GATE): i 'intro' fyrar en drop bara efter riser (buildUp >= DROP_CALM_BUILD). */
const DROP_CALM_DB = 6;
const DROP_CALM_BUILD = 0.25;
const DROP_CALM_Q = 1.5;
const DROP_CALM_RISE_DB = 8;
const DROP_CALM_LAND_MS = 0;
const MINI_RISE_DB = 10;
const MINI_GONE_DB = 3;
const MINI_GONE_MS = 800;
const MINI_PEAK_DB = 10;
const DROP_SHORT_MS = 4000;    // minsta drop-avstand nar dropen ESKALERAR
const DROP_LONG_MS = 20000;    // annars maste sa har lang tid ga (mot falska upprepningar)
const DROP_ESCALATE_DB = 3;    // tatare drops maste vara TYDLIGT starkare for att fyra
// FULL DROP PÅ FLANKEN (flyttad ur effects.ts 11-09, a3 - historiken: ägarens ladan 10-12..10-30, se git-historiken för effects.ts):
// baskroppens topp (bodyFast över FLANK_HOLD_S) har legat >= FLANK_GONE_DB under taket (bodyCeil) i >= FLANK_BREAK_S (eller
// >= FLANK_SHORT_S med >= FLANK_SHORT_RISE_DB djup), och fyrar när bodyFast går upp till taket - FLANK_LAND_DB med >= FLANK_RISE_DB
// stigning på 0,5 s. Helt tyst (lvlSmooth <= FLANK_SILENT_LV) i breaket = låtlucka, ingen drop. Samma filter som slam-kandidaten
// (bodyFast 60 ms, bodyEnv 350 ms, bodyCeil -0,15 dB/s) - förr en egen kopia i effekterna.
const FLANK_GONE_DB = 10, FLANK_BREAK_S = 4, FLANK_LAND_DB = 6, FLANK_RISE_DB = 12, FLANK_HOLD_S = 0.6, FLANK_GRACE_S = 1;
const FLANK_SHORT_S = 2, FLANK_SHORT_RISE_DB = 24, FLANK_SILENT_LV = 0.005;
// BREAK-TAKET (2026-11-14, ur arenan drop1 a7; ägarens facit i ladan 11-13): har basen varit borta i FLANK_ROOF_BEATS slag eller mer
// (2 takter, räknat i klockans tempo) är återkomsten en ny sektion som börjar, inte en drop. Mätt på ägarens två markerade inspelningar:
// hans egna drop har basen borta högst 6 slag, återkomsterna han INTE kallar drop (omarkerade, "inte drop", låtbyte) minst drygt 8.
// Samma dom för tak 6-9 slag. Slam-kandidaten kan fortfarande göra återkomsten till minidrop.
const FLANK_ROOF_BEATS = 8;
const SHOW_DROP_GAP_MS = 12000;   // spärr mellan full drops (ägaren 10-12): flank inom spärren = minidrop (dropSpaced)
// LYFT/NÄSTAN-DROP/STOPP (flyttade ur effects.ts stepLifts 11-09): kroppen 120 ms (nearB), normalnivån 8 s, historik i 25 ms-rutor.
const NEAR_RISE_DB = 10, NEAR_DIP_DB = 8, LIFT_DB = 10, STOP_MINI_S = 0.6;
/** Talfält som ska vara flyttal från start (se stabiliseringen i analyser.ts). */
const DOUBLE_FROM_START = ['bodyEnv', 'bodyFast', 'bodyCeil', 'bodyPeak', 'lastGoneSpanMs', 'lastDropMs', 'lastMiniGoneMs', 'lastMiniMs', 'miniGoneMs', 'bodyGoneMs', 'lastBodyGoneMs', 'dropArmUntil', 'dropArmAt', 'fdGone', 'fdSpan', 'fdEnd', 'fdAt', 'fdQuietAt', 'lastShowDropMs', 'dropRiseDb', 'nearB', 'nearNorm', 'nearFloor', 'liftCalm', 'liftLift', 'liftHistAt', 'stopRunS', 'nearDropDb', 'nearDipDb', 'liftDb', 'stopS'] as const;

export class DropDetector {
  /** analysatorn som äger den här delen (delade signaler läses via den) */
  a: Analyser;
  constructor(a: Analyser) {
    this.a = a;
    for (const k of DOUBLE_FROM_START) { const v = (this as unknown as Record<string, number>)[k]; if (typeof v === 'number') { (this as unknown as Record<string, number>)[k] = 0.5; (this as unknown as Record<string, number>)[k] = v; } }
  }
  secBodyRet = 0; private secBodyArmMs = 0;
  /** BASKROPPEN — (sub+kick+bas)/3, utjämnad. Det är HÄR en drop syns.
   *  MÄTT över 15 min av ägarens egen musik: `level` ligger i sin övre tredjedel
   *  67 % av tiden (dynamik p90/p10 = 2.1) — den kan omöjligt peka ut ett särskilt
   *  ögonblick. Baskroppen ligger högt bara 9 % av tiden (dynamik 5.6). Sång och
   *  synth håller uppe nivån hela låten; det som FÖRSVINNER i en breakdown och
   *  SLÅR TILLBAKA i dropen är basen.
   *  Nivå-baserad zon gav 172 flanker på 15 min (en var 5:e sekund) för ~19 drops.
   *  Baskropps-zonen ger 46 (en var 20:e sekund) — rätt storleksordning. */
  private bodyEnv = -120;
  /** Snabb envelopp (0.12 s) ENBART for stigningstakten. Den langsammare
   *  bodyEnv (0.35 s) styr tak och franvaro. Blandar man ihop dem dampas
   *  stigningen och trosklarna slutar motsvara det som mattes i banken. */
  private bodyFast = -120;
  private bodyCeil = -300;   // dB
  private bodyPeak = -300;   // SEG topp (loud-referens i minuter) for landa-hogt
  private lastGoneSpanMs = 0;
  private lastDropRise = -0;   // -0 = HeapNumber: Double-falt fran start (typstabilt), beter sig som 0
  private wasBodyOnset = false;
  /** ANSLAGSDETEKTION. En tröskel som ska NÅS korsas först när basen redan
   *  kommit — uppmätt 2.5 s efter anslaget. STIGNINGSTAKTEN fyrar när den
   *  börjar: uppmätt 0.1 s. Ringbuffert med 0.5 s historik (förallokerad). */
  private bodyHist = new Float32Array(200);
  private bodyHistPos = 0;
  private bodyHistLen = 1;
  /** Ihållande bas-FRÅNVARO. Det som gör en drop till en drop är att basen
   *  varit BORTA. Utan varaktighetskrav räcker en trumfill, och då är villkoret
   *  uppfyllt nästan jämt — då blir 8-takters-spärren det enda som begränsar
   *  takten och detektorn förvandlas till en METRONOM. Uppmätt live: den fyrade
   *  var 15:e sekund (= spärren) och användarens riktiga drops låg 9-15 s FEL,
   *  blockerade av den föregående falska avfyrningen. */
  private bodyGoneMs = 0;
  private lastBodyGoneMs = -1e9;
  miniDropCount = 0; private lastMiniMs = -1e9; private miniGoneMs = 0; private lastMiniGoneMs = -1e9; private wasMiniOnset = false;
  private dropArmUntil = 0; private dropArmAt = 0; private dropArmGoneMs = -1.5;   // armerat drop-fonster (DROP_ARM_MS)
  private calmHoldStart = -0; private calmHoldRise = -0;   // DROP_CALM_LAND_MS: kandidat som halls for verifierad landning

  private goneEpisodeMs = -1.5;   // (double fran start, se dropArmGoneMs) gone-episodens START (lastBodyGoneMs uppdateras varje hop och duger INTE som id)
  dropCount = 0;         // monoton drop-räknare (edge-säker för konsumenter) - full drop på flanken
  dropCand = 0;          // slam-kandidaterna (förr dropCount): sektionens drop-evidens och minidrop utan flank
  dropDemoted = 0; dropSpaced = 0; dropRiseDb = -0;
  private fdGone = -0; private fdSpan = -0; private fdEnd = -1e12; private fdAbove = true; private fdAt = -1e12; private fdQuietAt = -1e12; private lastShowDropMs = -1e12;
  private fdT = new Float64Array(1024); private fdV = new Float64Array(1024); private fdS0 = 0; private fdN = 0;   // (tid, bodyFast) för toppens fönster
  private nearOn = false; private nearB = -0; private nearNorm = -0; private nearFloor = 1e9; private liftCalm = -0; private liftLift = -0;
  private liftHist = new Float64Array(240); private liftW = 0; private liftN = 0; private liftHistAt = -1e12; private stopRunS = -0;
  nearDropDb = -0; nearDipDb = -0; liftDb = -0; stopCount = 0; stopS = -0;
  lastDropMs = -1.5e9;   // utanfor Smi-intervallet -> Double fran start (typstabilt)

  /** Drop-detektionen (baskropp, franvaro, stigning, armering, minidrop, lugn-grind, kick-las, fyrning). Manga kalla grenar: egen funktion sa att en deopt bara kostar den har, inte hetslingan. */
  dropStep(): void {
    const nowWallA = this.a.hNowWall, bodyNow = this.a.hBody;
    const dtHop = this.a.dtHop;
    this.bodyEnv += (bodyNow - this.bodyEnv) * Math.min(1, dtHop / 0.35);
    this.bodyFast += (bodyNow - this.bodyFast) * Math.min(1, dtHop / BODY_FAST_S);
    const bodyPeek = this.bodyFast;   // (DROP_PEEK forkastad 09-08: ra-min oppnade falska klassen)   // 0.06 testat men gav falsklarm live utan att fixa beat-lagget (det sitter i lamp-vagen/energin, inte har)
    // TAKET SJUNKER I dB PER SEKUND, inte i procent. Kroppen ar nu ett dB-tal
    // (negativt), och "1,5 % av ett negativt tal" gor taket STORRE, inte mindre —
    // den gamla raden var matematiskt omvand sa fort skalan blev logaritmisk.
    this.bodyCeil = Math.max(this.bodyEnv, this.bodyCeil - dtHop * BODY_CEIL_DB_S);
    this.bodyPeak = Math.max(this.bodyEnv, this.bodyPeak - dtHop * 0.04);   // ~0.04 dB/s ≈ haller loud-referensen i minuter
    this.a.bodyUnderDb = this.bodyCeil - this.bodyEnv;
    const flank = this.flankStep(nowWallA, dtHop);   // EN DROPDETEKTOR: flanken på samma filter (se FLANK_GONE_DB)
    this.liftStep(nowWallA, dtHop, bodyNow);

    // BAS-FRÅNVARO med VARAKTIGHETSKRAV: under 40 % av taket i ≥2 s i sträck.
    // FRANVARO = ETT AVSTAND I dB, inte en kvot. En kvot mellan tva logaritmer
    // betyder ingenting fysiskt.
    if (this.bodyEnv < this.bodyCeil - BODY_GONE_DB) {
      this.bodyGoneMs += dtHop * 1000;
      // BODY_GONE_MIN_MS: hur LÄNGE kroppen måste ha varit borta för att räknas
      // som en riktig breakdown. En 2s sidechain-dipp i en megamix är inte en
      // drop-förberedelse; en riktig breakdown varar flera sekunder. Env-tunbar
      // så den kan svepas mot referens offline.
      if (this.bodyGoneMs >= BODY_GONE_MIN_MS) {
        if (this.bodyGoneMs - dtHop * 1000 < BODY_GONE_MIN_MS) this.goneEpisodeMs = nowWallA;   // NY episod (korsningen), oforandrad tills nasta
        this.lastBodyGoneMs = nowWallA;
      }
    } else {
      if (Analyser.BODY_HIGH_MS > 0 && this.bodyGoneMs >= Analyser.BODY_HIGH_MS) this.secBodyArmMs = nowWallA;
      if (this.bodyGoneMs > 0) this.lastGoneSpanMs = this.bodyGoneMs; this.bodyGoneMs = 0;
      if (this.secBodyArmMs > 0) { if (nowWallA - this.secBodyArmMs > 2000) this.secBodyArmMs = 0; else if (this.bodyEnv >= this.bodyPeak - Analyser.BODY_HIGH_DB) { this.secBodyRet++; this.secBodyArmMs = 0; } }
    }
    // STIGNINGSTAKT över 0.5 s (ringbuffert, ingen allokering).
    const hist = this.bodyHist, HL = hist.length;
    const oldest = hist[(this.bodyHistPos + HL - this.bodyHistLen) % HL];
    let riseRef = oldest;
    // MINIMUM UTAN MODULO (a7): fönstret pos-1 .. pos-len läses som högst två raka bitar (var en heltalsdivision per varv,
    // ~188 varv per hop). Samma mängd värden -> samma minimum.
    { const pos = this.bodyHistPos, len = this.bodyHistLen; let mn = oldest;
      const n1 = len < pos ? len : pos;   // pos-1 .. pos-n1
      for (let j = pos - n1; j < pos; j++) { const v = hist[j]; if (v < mn) mn = v; }
      for (let j = HL - (len - n1); j < HL; j++) { const v = hist[j]; if (v < mn) mn = v; }   // resten från slutet
      riseRef = mn; }
    let bodyRise = bodyPeek - riseRef;   // let: CALMLAND/KICKLOCK bar kandidatens lyft vidare till fyrningen
    hist[this.bodyHistPos] = this.bodyFast;
    this.bodyHistPos = (this.bodyHistPos + 1) % HL;
    const want = Math.min(HL - 1, Math.max(1, Math.round(0.5 / dtHop)));
    if (this.bodyHistLen < want) this.bodyHistLen++;
    // Anslaget: basen stiger snabbt OCH den var nyss borta på riktigt.
    // TROSKLARNA ar svepta mot 15 min av agarens musik (20 varianter). Ett
    // STORRE stigningskrav vann i tre av fyra franvaro-varianter — riktningen
    // ar alltsa robust, aven om decimalerna inte ar det (n=17 referenspunkter).
    // 40 %/2 s slar 30 %/3 s: verkliga drops kommer ofta efter en DELVIS
    // nedgang, inte total tystnad — 10 av 11 missade drops foll pa just det.
    // Precision 46 -> 56 %, recall 35 -> 53 %.
    // MÅSTE LANDA HÖGT, inte bara stiga. bodyRise är i dB, så en liten uppgång från
    // nära-tystnad (en djup breakdown) ger ett STORT dB-lyft trots att den landar på
    // en fortfarande LÅG nivå → falsk drop "där energin knappt gått upp" (ägaren i
    // ladan 2026-09-03). Kräv att kroppen landar inom BODY_PEAK_DB av den senaste
    // toppen (bodyCeil) — en riktig drop når nästan sitt eget tak; en uppgång i ett
    // tyst parti gör det inte.
    // Mot SEGA toppen (bodyPeak), inte snabba taket: en falsk drop i ett tyst parti
    // landar lagt (fast ~10) medan riktiga landar hogt (fast ~34+); den sega toppen
    // haller loud-referensen (~44) sa den laga landningen avvisas aven om taket tillf. sjunkit.
    const landsHigh = bodyPeek > this.bodyPeak - BODY_PEAK_DB;
    const riseOk = bodyRise > BODY_RISE_DB || (DROP_RISE_LOW_DB > 0 && bodyRise > DROP_RISE_LOW_DB && this.bodyPeak - bodyPeek < DROP_RISE_LOW_Q);
    const bodyOnset = riseOk && landsHigh && nowWallA - this.lastBodyGoneMs < 6000;
    // EN DROP MASTE LANDA I HOG ENERGI. Villkoren ovan tittar bara pa LOKALA
    // nivasprang (svacka -> topp-zon) och vet inget om var i laten vi ar, sa varje
    // liten variation i ett tyst parti raknades som en drop.
    //   MATT: 4.7 drops/minut, varav 71% vid intensitet under 0.45. Uppmatta
    //   drop-intensiteter: 0.39 0.32 0.81 0.34 0.40 0.37 0.51 - bara EN av sju
    //   lag i genuint hog energi.
    // En drop ar per definition ett sprang IN i hog energi, inte bara ett sprang.
    // intensity ar nu en levande signal (se 4392f61) och raknas fram i samma
    // funktion, sa gransen kostar ingenting.
    // TVA VAGAR IN I EN DROP, inte en. Villkoret krävde tidigare att nivan FALLIT
    // (breakAtMs inom 3.5s) fore zonintradet - alltsa breakdown -> drop. Men en
    // modern EDM-uppbyggnad STIGER rakt in i dropen utan att forst falla, och da
    // blockerades den.
    //   MATT vid atta zonintraden: ett hade energi 1.00 OCH aktiv riser - ett
    //   solklart drop - men blockerades for att senaste svackan lag 8.0s bort.
    // Nu racker antingen en svacka (klassisk breakdown) ELLER en riser (modern
    // uppbyggnad) strax innan. Riser-signalen ar bekraftat levande: den fyrar
    // 9.8% av tiden och buildUp nar 0.61.
    // ENERGIGOLVET (intensity > 0.45) och svacka/riser-fönstren är BORTA som villkor
    // sedan flanken flyttades till baskroppen: de mättes fram mot den gamla
    // nivå-zon-detektorn och grindade signaler som inte längre bär beslutet.
    // Innan något av dem återinförs måste det mätas om mot bodyOnset.

    // REFRAKTARPERIOD. Det fanns ingen alls: en drop kunde folja pa en annan
    // inom brakdelen av en sekund. MATT i drop-intervall-loggen: tva av tio
    // intervall lag pa 0.2 och 0.5 TAKTER, dvs dubbelfyrningar - resten lag pa
    // 8-40 takter. En drop ar en sektionsgrans; tva sadana kan inte ligga en
    // halv sekund isar. 2s ar valdigt lagt satt mot narmaste akta intervall
    // (8 takter = ~13s vid 150 BPM), sa den kan inte kapa nagot verkligt.
    // SPARRAS I TAKTER, INTE SEKUNDER. Musik raknas inte i millisekunder: 2s var
    // drygt EN takt vid 150 BPM. Uppmatta AKTA drop-intervall lag pa 8-40 takter,
    // dar 8 var det kortaste. En drop kan alltsa omojligt folja pa en annan inom
    // 8 takter (32 taktslag). Gransen skalar nu med tempot: ~13s vid 150 BPM,
    // ~21s vid 90 BPM.
    // REFRAKTAR = 32 taktslag (8 takter). MATT: verkliga drop-avstand 8-40 takter.
    // TESTAT 2026-09-02 att korta till 16: F1 45 -> 33, +50 falsklarm (modern-spar
    // fyrar flera ggr per drop utan spärren). "Kroppen-var-borta"-kravet racker INTE
    // som ensamt skydd → spärren behalls. En falsk drop som lasar ute en riktig loses
    // med BATTRE PRECISION eller energi-gasen, inte med kortare spärr.
    // DROP-REFRAKTÄR 4 s (ägaren i ladan 2026-09-03: vill ha tätare lamp-drops).
    // Var 32 taktslag (~15 s). Röken översprutar INTE av detta — den har egen
    // cooldown (fog.cooldownMs = 30 s) som gatar den oberoende av lampornas drop.
    // OBS: kortare spärr → fler drops (och fler falska); medvetet val, agaren dömer
    // live. testDrops-F1 sjunker (spärren gjorde jobb där) men det är sekundärt här.
    // ESKALERINGS-REFRAKTÄR (ägaren i ladan 2026-09-03, mot falska drops): en drop
    // strax efter en annan får BARA fyra om den är TYDLIGT STARKARE (större bas-lyft)
    // än den förra — annars måste 20 s gå. Riktiga drops eskalerar (varje större);
    // falska är svagare upprepningar och sållas bort. En eskalerande drop (kvällens
    // stora ögonblick) släpps ändå igenom direkt (ned till 4 s).
    const sinceDrop = nowWallA - this.lastDropMs;
    const stronger = bodyRise > this.lastDropRise + DROP_ESCALATE_DB;
    const dropSpacingOk = sinceDrop > DROP_LONG_MS || (sinceDrop > DROP_SHORT_MS && stronger);   // (DROP_UPGRADE_DB matt 09-12, av: risk for dubbelsmall)
    // RISER-KRAVET AR AVSTANGT — men INTE for att signalen ar dod. Den gamla
    // motiveringen ("inRiser 0% av tiden, buildUp p99=0.31") mattes mot en
    // aldre riser-detektor och ar RADERAD som falsk.
    //   OMMATT mot novelty-baserad novRiser (tools/testDrops.mjs, 8 seeder):
    //   inRiser 8.8% av tiden, buildUp p50=0.00 p90=0.00 p99=0.42 max=0.85.
    //   p50/p90=0 ar forvantat — en riser SKA vara sallsynt. I ett brusigt rum
    //   fyrar den nastan aldrig (0.6%, max 0.04), sa ett hart riser-krav skulle
    //   sla av drop-detektionen just dar mikrofonen sitter.
    // Kravet ar fortfarande avstangt: risern lever igen (relativa granser, 2026-11-14)
    // men ser bara svep, inte breakdowns (drop1: 1 av agarens 6 uppbyggnader).

    // FLANKEN TAS PÅ BASKROPPEN, inte på nivån. Nivå-zonen var sann 80 % av tiden
    // i ägarens musik → dess flanker låg godtyckligt, och 8-takters-spärren blev
    // i praktiken den som VALDE när en drop fyrade (första flanken efter att
    // fönstret löpt ut). Uppmätt resultat: 3 träffar av 19, 16 falsklarm.
    // STIGANDE FLANK: `bodyOnset` är sann KONTINUERLIGT i höga/pumpande partier (basen
    // dippar och återhämtar ~17 dB varje takt via sidechain → bodyRise ligger konstant
    // över tröskeln). MÄTT 2026-09-03: många kandidater/sekund. Fyra bara på den FÖRSTA
    // framen lyftet passerar tröskeln → ett kandidat-event per verkligt lyft, inte per
    // frame. Då blir eskalerings-/spärr-kravet meningsfullt (jämför distinkta lyft).
    const bodyOnsetEdge = bodyOnset && !this.wasBodyOnset;
    this.wasBodyOnset = bodyOnset;
    // Armera bara EN gang per "borta"-episod. Floden vid ARM=300 (36 mot 19 pa referens) kom fran
    // UPPREPADE aterhamtnings-edges i samma post-breakdown-fonster. Forsta edgen efter en ny
    // gone-episod armerar (fangar en mjuk drops fordrojda topp); senare edges far bara ogonblicket.
    if (bodyOnsetEdge && this.goneEpisodeMs !== this.dropArmGoneMs) { this.dropArmUntil = nowWallA + DROP_ARM_MS; this.dropArmAt = nowWallA; this.dropArmGoneMs = this.goneEpisodeMs; }
    const armed = bodyOnsetEdge || nowWallA < this.dropArmUntil;
    // (KICK-FIRST forkastad 09-04: flod pa megamix; [firstkick]-sparet borttaget 09-27.)
    // MINIDROP-lyftet (se MINI_*). Egen svacka-raknare (kortare/grundare an gone) och egen flank.
    if (MINI_SPACING_MS > 0) {
      if (this.bodyEnv < this.bodyCeil - MINI_GONE_DB) { this.miniGoneMs += dtHop * 1000; if (this.miniGoneMs >= MINI_GONE_MS) this.lastMiniGoneMs = nowWallA; }
      else this.miniGoneMs = 0;
      // Samma fönster som riseRef plus det nyss skrivna värdet (minus inget: den äldsta platsen ingår via `oldest`) -> en jämförelse
      // i stället för en andra genomläsning (a7).
      const nv = hist[(this.bodyHistPos + HL - 1) % HL]; const mnRef = nv < riseRef ? nv : riseRef;
      const miniOnset = (bodyPeek - mnRef) > MINI_RISE_DB && bodyPeek > this.bodyPeak - MINI_PEAK_DB && nowWallA - this.lastMiniGoneMs < 4000;
      const miniEdge = miniOnset && !this.wasMiniOnset; this.wasMiniOnset = miniOnset;
      if (miniEdge && this.a.activeMs > 2000 && nowWallA - this.lastDropMs > MINI_SPACING_MS && nowWallA - this.lastMiniMs > MINI_SPACING_MS
          && (DROP_UNDERPEAK_MIN <= 0 || this.bodyPeak - bodyPeek >= DROP_UNDERPEAK_MIN)) {   // INTE I TAKET galler aven minidrops (19:19: 'falsk' = minidrop med underPeak 0,6)
        this.miniDropCount++; this.lastMiniMs = nowWallA;
        if (DROP_TRACE) console.log(`[minidrop] wall ${this.a.wallNow()} rise ${(bodyPeek - mnRef).toFixed(1)} underPeak ${(this.bodyPeak - bodyPeek).toFixed(1)} goneAgo ${((nowWallA - this.lastMiniGoneMs)/1000).toFixed(1)}s`);
      }
    }
    const fullSlam = this.bodyPeak - bodyPeek < DROP_QUALITY_DB;
    // DMX_DROP_TRACE=1: logga KONSUMERADE edges (kandidat som INTE fyrade) — var ligger kroppen vid
    // forsta takten? Matdata for DROP_QUALITY_DB pa mjukare material (pop) dar inget referens finns.
    if (DROP_TRACE && bodyOnsetEdge && !(dropSpacingOk && fullSlam)) console.log(`[dropedge] rise ${bodyRise.toFixed(1)} underPeak ${(this.bodyPeak - this.bodyFast).toFixed(1)} fast ${this.bodyFast.toFixed(1)} peak ${this.bodyPeak.toFixed(1)} goneAgo ${((nowWallA - this.lastBodyGoneMs)/1000).toFixed(1)}s spacingOk ${dropSpacingOk} sinceDrop ${(sinceDrop/1000).toFixed(1)}s`);
    // INTE I TAKET (opt-in DROP_UNDERPEAK_MIN, ladan 2026-09-29): en drop som fyrar nar kroppen redan ligger vid sin topp (underPeak
    // 0,4/0,8 dB) ar en upprepning av samma small, inte en ny - agarens markeringar: ratta 2,4-6,5 dB, falska 0,4/0,8/2,9. 0 = av.
    const notAtCeil = DROP_UNDERPEAK_MIN <= 0 || this.bodyPeak - this.bodyFast >= DROP_UNDERPEAK_MIN;
    let fireNow = dropSpacingOk && armed && this.a.activeMs > 2000 && fullSlam && notAtCeil;
    let fireTag = '';
    const underNow = this.bodyPeak - bodyPeek;
    // LUGN-SEKTIONS-GRINDEN (se DROP_CALM_GATE). Domen tas per kandidat-hop; den hallna kandidaten (DROP_CALM_LAND_MS) foljs nedan.
    if (fireNow) {
      const calm = (this.a.dSec === 'low' || this.a.dSec === 'intro') || this.a.dLvh <= -DROP_CALM_DB;
      let strong = this.a.buildUp >= DROP_CALM_BUILD || underNow < DROP_CALM_Q || bodyRise >= BODY_RISE_DB + DROP_CALM_RISE_DB;
      // STRIKT INTRO (ladan 09-24: 'den gjorde fortfarande drop i intro'): landning vid toppen racker inte i intro - bara en riktig riser.
      if (this.a.dSec === 'intro') strong = this.a.buildUp >= DROP_CALM_BUILD;
      if (calm && !strong) {
        fireNow = false;
        if (DROP_CALM_LAND_MS > 0 && this.calmHoldStart === 0) { this.calmHoldStart = nowWallA; this.calmHoldRise = bodyRise; }
        if (DROP_TRACE && bodyOnsetEdge) console.log(`[dropcalm] wall ${this.a.wallNow()} ${DROP_CALM_LAND_MS > 0 ? 'HALLS' : 'NEKAD'} sect ${this.a.dSec} lvh ${this.a.dLvh.toFixed(1)} build ${this.a.buildUp.toFixed(2)} underPeak ${underNow.toFixed(1)} rise ${bodyRise.toFixed(1)}`);
      }
    }
    if (this.calmHoldStart > 0) {   // verifierad landning: kroppen maste ligga kvar vid toppen hela DROP_CALM_LAND_MS
      if (!fullSlam) { if (DROP_TRACE) console.log(`[dropcalm] wall ${this.a.wallNow()} SLAPPT efter ${(nowWallA - this.calmHoldStart).toFixed(0)} ms (underPeak ${underNow.toFixed(1)})`); this.calmHoldStart = 0; }
      else if (fireNow) this.calmHoldStart = 0;   // fyrar anda (starkare bevis kom)
      else if (nowWallA - this.calmHoldStart >= DROP_CALM_LAND_MS && dropSpacingOk) { fireNow = true; fireTag = ` CALMLAND +${(nowWallA - this.calmHoldStart).toFixed(0)}ms`; bodyRise = Math.max(bodyRise, this.calmHoldRise); this.calmHoldStart = 0; }
    }
    // KICK-LASET (se DROP_KICK_LOCK_MS): kandidaten vantar in forsta kicken, hogst en halv takt / DROP_KICK_LOCK_MS.
    if (fireNow) {
      this.dropArmUntil = 0; this.calmHoldStart = 0;
      this.dropCand++; this.lastDropMs = nowWallA; this.lastDropRise = bodyRise;
      console.log(`[dropfire] wall ${this.a.wallNow()}${fireTag} rise ${bodyRise.toFixed(1)} fast ${this.bodyFast.toFixed(1)} peak ${this.bodyPeak.toFixed(1)} ceil ${this.bodyCeil.toFixed(1)} underPeak ${(this.bodyPeak - this.bodyFast).toFixed(1)} sinceDrop ${(sinceDrop/1000).toFixed(1)}s goneAgo ${((nowWallA - this.lastBodyGoneMs)/1000).toFixed(1)}s goneSpan ${(this.lastGoneSpanMs/1000).toFixed(1)}s edgeAgo ${(nowWallA - this.dropArmAt).toFixed(0)}ms`);
    }
    this.dropClassify(flank, fireNow, nowWallA);
  }

  /** EN DROPDETEKTOR - klassningen (a3): flanken är full drop (efter spärren), slam-kandidaten utan egen flank inom 2 s är minidrop. */
  private dropClassify(flank: boolean, cand: boolean, nowWallA: number): void {
    if (flank) {
      if (nowWallA - this.lastShowDropMs < SHOW_DROP_GAP_MS) { this.dropSpaced++; this.miniDropCount++; }
      else { this.lastShowDropMs = nowWallA; this.dropCount++; }
    } else if (cand && nowWallA - this.fdAt > 2000) { this.dropDemoted++; this.miniDropCount++; }
  }

  /** FULL DROP PÅ FLANKEN (se FLANK_GONE_DB): på dropStep:s egna filter (bodyFast/bodyEnv/bodyCeil), per hop. */
  private flankStep(now: number, dt: number): boolean {
    const CAP = 1024, T = this.fdT, V = this.fdV, f = this.bodyFast, ceil = this.bodyCeil;
    if (this.fdN === CAP) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
    { const w = (this.fdS0 + this.fdN) & (CAP - 1); T[w] = now; V[w] = f; this.fdN++; }
    while (this.fdN > 1 && now - T[this.fdS0] > FLANK_HOLD_S * 1000) { this.fdS0 = (this.fdS0 + 1) & (CAP - 1); this.fdN--; }
    let top = -1e9, low = 1e9; for (let q = 0; q < this.fdN; q++) { const i = (this.fdS0 + q) & (CAP - 1); if (V[i] > top) top = V[i]; if (now - T[i] <= 500 && V[i] < low) low = V[i]; }
    if (top < ceil - FLANK_GONE_DB) this.fdGone += dt; else { if (this.fdGone > 0) { this.fdSpan = this.fdGone; this.fdEnd = now; } this.fdGone = 0; }
    const above = f > ceil - FLANK_LAND_DB, edge = above && !this.fdAbove; this.fdAbove = above;
    const span = this.fdGone > 0 ? this.fdGone : now - this.fdEnd < FLANK_GRACE_S * 1000 ? this.fdSpan : 0;
    if (this.a.lvlSmooth <= FLANK_SILENT_LV) this.fdQuietAt = now;
    if (!edge || f - low < FLANK_RISE_DB || (span < FLANK_BREAK_S && !(span >= FLANK_SHORT_S && ceil - low >= FLANK_SHORT_RISE_DB))) return false;
    if (span * (this.a.dBpm > 40 ? this.a.dBpm : 60000 / Analyser.BE_FALLBACK_MS) >= FLANK_ROOF_BEATS * 60) return false;   // BREAK-TAKET: ny sektion, ingen drop
    if (now - this.fdQuietAt < span * 1000 + 500) { this.fdGone = 0; this.fdSpan = 0; if (DROP_TRACE) console.log(`[flank] ingen drop: helt tyst i breaket (latstart), break ${span.toFixed(1)} s`); return false; }
    this.fdGone = 0; this.fdSpan = 0; this.fdAt = now; this.dropRiseDb = f - low;
    if (DROP_TRACE) console.log(`[flank] full drop pa flanken: break ${span.toFixed(1)} s, stigning ${(f - low).toFixed(1)} dB`);
    return true;
  }

  /** NÄSTAN-DROP, ENERGILYFT, STOPP (a3, förr effects.ts stepLifts): VAD + STYRKA ut i ramen; effekterna avgör reaktionen. */
  private liftStep(now: number, dt: number, body: number): void {
    const x = Math.max(-90, body);
    if (!this.nearOn) { this.nearOn = true; this.nearB = x; this.nearNorm = x; }
    this.nearB += (x - this.nearB) * Math.min(1, dt / 0.12);
    this.nearNorm += (this.nearB - this.nearNorm) * Math.min(1, dt / 8);
    const h = this.liftHist;
    if (now - this.liftHistAt >= 25) {   // 25 ms-rutor AV TID: 60 rutor = dippens botten (1,5 s), 240 = lugnet 6..2 s + lyftet 0,6 s
      this.liftHistAt = now; h[this.liftW] = this.nearB; this.liftW = (this.liftW + 1) % 240; if (this.liftN < 240) this.liftN++;
      const n = this.liftN, o0 = this.liftW - n + 240;
      let fl = 1e9; for (let q = Math.max(0, n - 60), j = (o0 + q) % 240; q < n; q++) { const v = h[j]; if (v < fl) fl = v; if (++j === 240) j = 0; }
      this.nearFloor = fl;
      if (n >= 240) {
        let sum = 0; for (let q = 0, j = o0 % 240; q < 160; q++) { sum += h[j]; if (++j === 240) j = 0; }
        let now6 = 0; for (let q = n - 24, j = (o0 + q) % 240; q < n; q++) { now6 += h[j]; if (++j === 240) j = 0; }
        this.liftCalm = sum / 160; this.liftLift = now6 / 24 - this.liftCalm;
      }
    }
    const floor = this.nearFloor, rise = this.nearB - floor, dip = this.nearNorm - floor;
    const near = rise >= NEAR_RISE_DB && dip >= NEAR_DIP_DB && floor > -80 && this.nearB >= this.nearNorm - 1;   // floor > -80: inspelningsavbrott
    this.nearDropDb = near ? rise : 0; this.nearDipDb = near ? dip : 0;
    this.liftDb = this.liftN >= 240 && this.liftCalm > -80 && this.liftLift >= LIFT_DB ? this.liftLift : 0;
    if (this.nearB < this.nearNorm - 12) this.stopRunS += dt;
    else if (this.nearB >= this.nearNorm - 1) {
      if (this.stopRunS >= STOP_MINI_S && this.stopRunS <= 3) { this.stopCount++; this.stopS = this.stopRunS; }
      this.stopRunS = 0;
    }
  }
}
