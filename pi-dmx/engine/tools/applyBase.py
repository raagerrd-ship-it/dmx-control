# Lagger det VERIFIERADE laget pa en ren git-utcheckning av analyser.ts.
# Idempotent: kor alltid "git checkout -- src/analyser.ts" forst, sedan detta.
#
# Bakgrund: handpatchning med find/replace raderade vid ett tillfalle 88 rader
# (sokmarkoren "      const committed" matchade "const committedNow" langre ner),
# och alla matningar efter det var ogiltiga utan att det markes. Darfor ligger
# basen i ETT skript med assertions i stallet.
#
#   python tools/applyBase.py            -> verifierat lage
#   python tools/applyBase.py --comb     -> + multiplikativ comb (experiment)
import io, sys, re

F = 'src/analyser.ts'
s = io.open(F, encoding='utf-8').read()
assert 'HARM_PENALTY' not in s, 'kor "git checkout -- src/analyser.ts" forst'

# 1) OCT_UP 8 -> 24
a = "  private static readonly OCT_UP = 8;"
b = """  // OCT_UP 8 -> 24: med EXAKT en oktavs vikning kan ett akta oktavfel aldrig
  // overleva vikningen, sa ratio > 1.4 ar alltid en triol-artefakt. Far dock inte
  // stangas helt -- vid 32 fastnade real.wav pa 113. MATT: 8 -> 14.4/53.2/100 %,
  // 24 -> 25.0/68.2/100 %, 32 -> 25.0/0.0/100 %.
  private static readonly OCT_UP = 24;
  private static readonly HARM_TOL = 0.035;
  private static readonly HARM_PENALTY = 6;"""
assert s.count(a) == 1, 'OCT_UP'
s = s.replace(a, b, 1)

# 2) harmoni-veto i grannrattningen  (25.0 % -> 70.6 % pa utandig)
a = "          if (this.nearVote >= (reacq ? 3 : 8)) {"
b = """          // HARMONI-VETO. Grann-bandet [1.11,1.4] rymmer 4/3 och [0.7,0.9] rymmer
          // 3/4 -- en TRIOLTOPP gar alltsa in genom halet som ar avsett for grannfel,
          // pa atta roster, och conf stoppar den inte (den mater tempogrammets
          // SKARPA, inte dess korrekthet: 1.00 aven nar tempot ar 32 % fel).
          // MATT pa utandig.wav (facit 90): 90 -> 118 vid t=21s, laset kom aldrig
          // tillbaka. Vetot: 25 % -> 70.6 % ratt, median 119 -> 89.
          // PROVAT och FORKASTAT: slappa vetot nar utmanaren ar mycket starkare
          // (rival > 3) -- sankte utandig 70.6 -> 26.2 % utan att hjalpa stranden.
          const _harm = Math.abs(ratio * 0.75 - 1) <= Analyser.HARM_TOL
                     || Math.abs(ratio / 0.75 - 1) <= Analyser.HARM_TOL;
          if (this.nearVote >= (reacq ? 3 : 8) * (_harm ? Analyser.HARM_PENALTY : 1)) {"""
assert s.count(a) == 1, 'nearVote'
s = s.replace(a, b, 1)

# 3) samma veto pa latbytesvagen
a = "        const needMs = rival > 2.5 ? 1500 : rival > 1.6 ? 4000 : 25000;"
b = """        // HAR SATT TIDIGARE ETT HARMONI-VETO. BORTTAGET 2026-09-01.
        // Det mattes till NOLL effekt nar det lades in, och visade sig sedan vara
        // aktivt skadligt: "LINEDANCE" (facit 145) har 26 s tvetydigt intro dar
        // bevisen pekar pa 90-100, laset committar pa 96, och forst vid 28 s
        // framtrader ratt tempo (146.3 @0.77, alltsa 3.5x starkare an 96.8).
        // Kvoten 146/96 = 1.52 ligger 1.3 % fran 3/2 -- vetot hojde darfor
        // beviskravet fran 4 s till 24 s, vilket ar omojligt att na.
        // Vetot i GRANNRATTNINGEN ar validerat (+45 p.e.) och star kvar; det ar
        // bara den har vagen som tas bort.
        const needMs = rival > 2.5 ? 1500 : rival > 1.6 ? 4000 : 25000;"""
assert s.count(a) == 1, 'needMs'
s = s.replace(a, b, 1)

# 4) PERCEPTUELL PRIOR: bredd 2.0 -> 0.7 (sigma 1.0 -> 0.59 oktav).
# Utsignalen viks ALLTID till [80,160), en enda oktav. En prior bredare an det
# fonstret later kandidater UTANFOR fonstret tavla pa nastan lika villkor -- och det
# ar just de som blir 4/3- och 2/3-artefakter efter vikningen.
# MATT pa 23 inspelade latar med publicerat facit + 22 latovergangar:
#   bredd 2.0  20/23 ratt, snitt 87.6 %, TVA 4/3-fel, overgangar 76.9 %
#   bredd 1.0  23/23 ratt, snitt 97.3 %, noll,        overgangar 78.0 %
#   bredd 0.7  23/23 ratt, snitt 97.6 %, noll,        overgangar 85.2 %  <- vald
#   bredd 0.5  23/23 ratt, snitt 98.3 %, noll,        overgangar 86.8 %
# 0.5 ar marginellt battre pa riktigt ljud men mjukar upp syntetscenariot
# "breakdown 142" fran 100 % till 88 % -- 0.7 tar nastan hela vinsten utan den
# kostnaden. Scenariot "158 (nara gransen)" pastas INTE av nagon av dem, alltsa
# offras inte fonsterkanten.
# TIDIGARE FELSLUT: pa bara fyra handplockade klipp (alla 90-124, dvs kring priorns
# topp) sag detta ut som overfittning och parkerades. Med 23 latars tempospridning
# ar trenden monoton pa BADA matten.
a = "      t[lag] = Math.exp(-(oct * oct) / 2.0);"
b = "      t[lag] = Math.exp(-(oct * oct) / 0.7);"
assert s.count(a) == 1, 'prior'
s = s.replace(a, b, 1)

# Diagnostik-accessor: ingen kostnad i het loop, gor banken mycket kraftfullare.
a = "  resetBar(): void {"
b = """  /** DIAGNOSTIK: det ackumulerade tempogrammet, for tools/peaks.mjs. */
  get tempoGramSnapshot(): Float32Array { return this.tempoGram; }
  /** DIAGNOSTIK: sokfonstrets granser i lag. */
  get lagBounds(): [number, number] { return [this.diagLagMin, this.diagLagMax]; }

  resetBar(): void {"""
assert s.count(a) == 1, 'accessor'
s = s.replace(a, b, 1)
a = "    const tg = this.tempoGram;"
b = """    const tg = this.tempoGram;
    this.diagLagMin = lagMin; this.diagLagMax = lagMax;"""
assert s.count(a) == 1, 'bounds'
s = s.replace(a, b, 1)
s = s.replace("  private priorLut = (() => {",
              """  private diagLagMin = 0;
  private diagLagMax = 0;
  private priorLut = (() => {""", 1)

if '--tg' in sys.argv:
    # TEMPOGRAM-AVKLINGNING VID LATBYTE.
    # hintTrackChange nollade bpmHist, roster och barAcc -- men INTE tempoGram,
    # som EMA:as med a=0.15 och alltsa bar forra latens tempobevis in i nasta.
    # MATT med tools/carryOver.mjs: "En dag pa stranden" gav 97 % med farsk
    # analysator men 0 % (median 151) efter foregaende lat -- exakt live-felet.
    a = """    this.bpmHistLen = 0; this.bpmHistPos = 0; this.lastVoteMs = 0;
    this.clearLockVotes();"""
    b = """    this.bpmHistLen = 0; this.bpmHistPos = 0; this.lastVoteMs = 0;
    // Tempogrammet ar EMA-ackumulerat (a = 0.15 nar last) och overlevde tidigare
    // latbytet -- forra latens toppar lag alltsa kvar och konkurrerade med den nya
    // latens bevis under de forsta, avgorande sekunderna.
    const k = Analyser.TG_KEEP;
    if (k <= 0) this.tempoGram.fill(0);
    else if (k < 1) for (let i = 0; i < this.tempoGram.length; i++) this.tempoGram[i] *= k;
    this.clearLockVotes();"""
    assert s.count(a) == 1, 'hintTrackChange'
    s = s.replace(a, b, 1)
    s = s.replace("  private static readonly HARM_TOL",
                  "  private static readonly TG_KEEP = 0;\n  private static readonly HARM_TOL", 1)

if '--warm' in sys.argv:
    # UPPVARMNING FORE FORSTA LASET.
    # `if (this.localBpm === 0) this.localBpm = Math.round(med);` tog laset pa det
    # ALLRA forsta estimatet, nar tempogrammet sett ~0.5 s och ar omoget. Sedan
    # stanger commiten (24 estimat) oktav- och grannrattningen, och ett daligt
    # initiallas sitter kvar hela laten.
    # MATT pa stranden.wav (facit 114): det MOGNA tempogrammet ger 113 = 0.6966 mot
    # 154 = 0.1218 -- ratt svar ar 5.7x starkare -- men laset togs innan dess.
    a = "    const med = scratch[n >> 1];"
    b = """    const med = scratch[n >> 1];
    if (this.localBpm === 0 && this.warmCalls++ < Analyser.WARM_N) return;"""
    assert s.count(a) == 1, 'warm'
    s = s.replace(a, b, 1)
    s = s.replace("  private diagLagMin = 0;",
                  "  private warmCalls = 0;\n  private diagLagMin = 0;", 1)
    s = s.replace("  private static readonly HARM_TOL",
                  "  private static readonly WARM_N = 48;\n  private static readonly HARM_TOL", 1)
    # ny lat -> varm upp igen
    a2 = "    this.octaveVote = 0; this.nearVote = 0; this.nearChallenger = 0; this.bpmStable = 0;"
    assert s.count(a2) == 1, 'warm-reset'
    s = s.replace(a2, "    this.warmCalls = 0;\n" + a2, 1)

if '--reset' in sys.argv:
    # SLAPP STARTGISSNINGEN VID LATBYTE.
    # hintTrackChange beholl `localBpm` som startgissning. Men uppvarmningen
    # (WARM_N) ar grindad pa `localBpm === 0`, sa den galler BARA vid kallstart --
    # inte vid latbyte. Det ar precis skillnaden mellan bank och verklighet:
    # offline kor varje klipp i en FARSK instans (localBpm = 0 -> uppvarmning),
    # live behaller tempot fran forra laten (ingen uppvarmning).
    # MATT: "Alltid en van i mej" (facit 102) fick 99-100 % offline men 135 live.
    # Startgissningen var dessutom motiverad av att tempogrammet lag kvar -- nu nar
    # det nollas finns inget bevis kvar som stodjer den.
    # LANGRE uppvarmning vid latbyte an vid kallstart: onset-envelopens ringbuffert
    # ar flera sekunder lang, sa direkt efter ett byte bestar halva autokorrelationen
    # fortfarande av FORRA laten. Att bara slappa startgissningen racker inte --
    # matt blev det ett nollsummespel (tva stora vinster, tva stora forluster).
    a = "    this.warmCalls = 0;\n    this.octaveVote = 0;"
    b = "    this.warmCalls = -Analyser.WARM_EXTRA; this.localBpm = 0;\n    this.octaveVote = 0;"
    assert s.count(a) == 1, 'reset-localBpm'
    s = s.replace(a, b, 1)
    s = s.replace("  private static readonly WARM_N = 48;",
                  "  private static readonly WARM_N = 48;\n  private static readonly WARM_EXTRA = 100;", 1)

if '--hold' in sys.argv:
    # HALL COMMITEN OPPEN TILLS ONSET-RINGEN AR REN.
    # Onset-envelopens ring ar ENV_LEN = 500 @ 100 Hz = 5 SEKUNDER lang. Direkt
    # efter ett latbyte bestar alltsa halva autokorrelationen av FORRA laten.
    # `committed` (bpmStable >= 24, ca 6 s) stanger oktav- och grannrattningen --
    # ungefar samtidigt som ringen blir ren, sa ett las taget pa orenad data hinner
    # aldrig rattas.
    # Att fordroja LASET (provat) lamnar lampan osynkad flera sekunder. Att fordroja
    # COMMITEN gor tvartom: laset kommer direkt, men far rattas anda tills bevisen
    # ar rena. `bpmStable` far darfor inte borja rakna forran HOLD_N anrop passerat.
    a = "        if (this.bpmStable < 100000) this.bpmStable++;"
    b = ("        if (this.holdCalls < Analyser.HOLD_N) this.holdCalls++;\n"
         "        else if (this.bpmStable < 100000) this.bpmStable++;")
    assert s.count(a) == 1, 'hold'
    s = s.replace(a, b, 1)
    s = s.replace("  private warmCalls = 0;",
                  "  private warmCalls = 0;\n  private holdCalls = 0;", 1)
    s = s.replace("  private static readonly WARM_N = 48;",
                  "  private static readonly WARM_N = 48;\n  private static readonly HOLD_N = 50;", 1)
    a2 = "    this.warmCalls = 0;"
    assert s.count(a2) == 1, 'hold-reset'
    s = s.replace(a2, "    this.warmCalls = 0; this.holdCalls = 0;", 1)

if '--pulse' in sys.argv:
    # PULSTAGET SKA OCKSA STRAFFA ENERGI MELLAN PULSERNA.
    # `pulse[lag]` var medelvarden av envPos PA rutnatet vid basta fas. Den kan per
    # KONSTRUKTION inte skilja ett tempo fran sin subharmonik: for tempot P ger bade
    # lag = P och lag = 2P samma hoga medelvarde, eftersom man vid 2P traffar
    # varannat slag och alla traffar fortfarande ar slag. Termen ar alltsa blind for
    # precis den felfamilj som ar kvar (2/3 och 1/2).
    # Percival-Tzanetakis pulstag jamfor mot ETT IDEALT tag -- energi MELLAN pulserna
    # ska dra ner poangen. Med det blir 2P straffad: de overhoppade slagen ligger
    # da off-grid och har full energi.
    # Kostnad: en subtraktion och en division per fas. `total` raknas en gang.
    a = """      const q = (N / lag) | 0;
      const r = N - q * lag;"""
    b = """      const q = (N / lag) | 0;
      const r = N - q * lag;
      const offW = Analyser.PULSE_OFF;"""
    assert s.count(a) == 1, 'pulse-head'
    s = s.replace(a, b, 1)

    a = "        if (k > 0) { const norm = sAcc / k; if (norm > best) best = norm; }"
    b = """        if (k > 0 && k < N) {
          const off = (envPosTotal - sAcc) / (N - k);
          let norm = sAcc / k - offW * off;
          if (norm < 0) norm = 0;
          if (norm > best) best = norm;
        } else if (k > 0) { const norm = sAcc / k; if (norm > best) best = norm; }"""
    assert s.count(a) == 1, 'pulse-score'
    s = s.replace(a, b, 1)

    a = "    for (let i = 0; i < N; i++) envPos[i] = env[i] > 0 ? env[i] : 0;"
    b = """    for (let i = 0; i < N; i++) envPos[i] = env[i] > 0 ? env[i] : 0;
    let envPosTotal = 0;
    for (let i = 0; i < N; i++) envPosTotal += envPos[i];"""
    assert s.count(a) == 1, 'pulse-total'
    s = s.replace(a, b, 1)
    s = s.replace("  private static readonly HARM_TOL",
                  "  private static readonly PULSE_OFF = 1;\n  private static readonly HARM_TOL", 1)

if '--alpha' in sys.argv:
    # SNABB TEMPOGRAM-EMA MEDAN DET BYGGS UPP EFTER ETT LATBYTE.
    # `a = localBpm === 0 ? 0.30 : 0.15` -- den snabba takten galler bara vid
    # KALLSTART. Efter ett latbyte nollas tempogrammet (TG_KEEP = 0) men localBpm ar
    # kvar, sa uppbyggnaden sker med den LANGSAMMA takten, precis nar den behover
    # vara snabb. Anvand den snabba tills laset ar committat igen.
    a = "    const a = this.localBpm === 0 ? 0.30 : 0.15;"
    b = ("    const a = (this.localBpm === 0 || this.holdCalls < Analyser.HOLD_N)\n"
         "      ? 0.30 : 0.15;")
    assert s.count(a) == 1, 'alpha'
    s = s.replace(a, b, 1)

if '--relock' in sys.argv:
    # LAT HELHETSBEVISEN SLA IGENOM AVEN EFTER COMMIT.
    # ANVANDARENS OBSERVATION, verifierad i data: manga latar byter trumkomp mellan
    # avsnitt -- glesare i intro/vers, fyllt i refrang. Da andras periodiciteten
    # MITT I LATEN, och laset sitter kvar pa det som gallde i introt.
    # MATT pa "Where the Wild Things Are" (facit 117, oberoende kalla): bevisen
    # vaxlar 115-115-115-78-78-117-78x8-79-117-117. 78 ar EXAKT 117 * 2/3.
    # "The Gambler": 128 tio ganger, sedan 64 (exakt halva), sedan 128 igen.
    # Analysatorn har alltsa INTE fel i de avsnitten -- ljudet HAR den
    # periodiciteten. Felet ar att laset foljer AVSNITTET i stallet for LATEN.
    #
    # Tempogrammet ackumulerar over hela laten och ar darfor redan "latens" svar.
    # Slapp darfor oktavgrenarna efter commit NAR helhetsbevisen ar overvaldigande.
    a = "      } else if (!committed && ratio > 1.4) {"
    b = """      // Overvaldigande helhetsbevis: den nya kandidaten ar RELOCK_K ganger
      // starkare an laset i det ACKUMULERADE tempogrammet, alltsa over hela laten
      // och inte bara i det just spelade avsnittet.
      } else if ((!committed || overwhelming) && ratio > 1.4) {"""
    assert s.count(a) == 1, 'relock-up'
    s = s.replace(a, b, 1)

    a = "      } else if (!committed && ratio < 0.7) {"
    b = "      } else if ((!committed || overwhelming) && ratio < 0.7) {"
    assert s.count(a) == 1, 'relock-down'
    s = s.replace(a, b, 1)

    a = "      const ratio = med / this.localBpm;"
    b = """      const ratio = med / this.localBpm;
      const _lockLag = Math.round((HZ * 60) / this.localBpm);
      const overwhelming = _lockLag >= lagMin && _lockLag <= lagMax
        && bestVal > tg[_lockLag] * Analyser.RELOCK_K;"""
    assert s.count(a) == 1, 'relock-calc'
    s = s.replace(a, b, 1)
    s = s.replace("  private static readonly HARM_TOL",
                  "  private static readonly RELOCK_K = 3;\n  private static readonly HARM_TOL", 1)

if '--refrac' in sys.argv:
    # DUBBELSLAG: tva anslag narmare an REFRAC_MS ar SAMMA handelse.
    # Anvandarens regel: "om det ar mindre an 300 ms mellan slag ar det ett
    # dubbelslag och 1a ska raknas till bpm".
    # 300 ms = 200 BPM, alltsa snabbare an nagot tanbart tempo (sokfonstret slutar
    # vid 185). Sadana intervall ar per definition inte takten -- de ar flams,
    # kick-dubbleringar och prydnadsslag. De ligger redan utanfor SOKNINGEN, men de
    # SMETAR UT envelopen, och en utsmetad envelope var just varfor puls-straffet
    # mot energi mellan pulserna misslyckades tidigare.
    # Implementation: icke-max-undertryckning (standard onset-peakplockning). Ett
    # sampel som foregas av ett STORRE inom fonstret dampas med REFRAC_ATT.
    # Kostar ~30 jamforelser per 10 ms -- forsumbart.
    a = "      this.envRing[this.envPos] = this.envAccum;"
    b = """      let _e = this.envAccum;
      const _R = Analyser.REFRAC_N;
      if (_R > 0 && _e > 0) {
        let _big = false;
        for (let _k = 1; _k <= _R; _k++) {
          const _i = (this.envPos - _k + Analyser.ENV_LEN * 2) % Analyser.ENV_LEN;
          if (this.envRing[_i] >= _e) { _big = true; break; }
        }
        if (_big) _e *= Analyser.REFRAC_ATT;
      }
      this.envRing[this.envPos] = _e;"""
    assert s.count(a) == 1, 'refrac'
    s = s.replace(a, b, 1)
    # ENV_HZ = 100 -> 1 sampel = 10 ms. 30 sampel = 300 ms.
    s = s.replace("  private static readonly HARM_TOL",
                  "  private static readonly REFRAC_N = 20;\n"
                  "  private static readonly REFRAC_ATT = 0;\n"
                  "  private static readonly HARM_TOL", 1)

if '--comb' in sys.argv:
    # EXPERIMENT: tak pa overtonsbidraget. HARM_CAP = Infinity == originalet.
    a = """      let comb = ac[lag];
      let wSum = 1;
      if (2 * lag <= lagMax) { comb += 0.5 * ac[2 * lag]; wSum += 0.5; }
      if (3 * lag <= lagMax) { comb += 0.33 * ac[3 * lag]; wSum += 0.33; }
      comb /= wSum;"""
    b = """      // TAK pa overtonsbidraget: en overton far bidra, men hogst HARM_CAP ganger
      // grundtonen, sa en STARK OVERTON inte kan rada en SVAG grundton.
      // f <= 0 -> inget tak (exakt originalets beteende).
      const f = ac[lag];
      const cap = f > 0 ? f * Analyser.HARM_CAP : Infinity;
      let comb = f;
      let wSum = 1;
      if (2 * lag <= lagMax) { wSum += 0.5;  comb += 0.5  * Math.min(cap, ac[2 * lag]); }
      if (3 * lag <= lagMax) { wSum += 0.33; comb += 0.33 * Math.min(cap, ac[3 * lag]); }
      comb /= wSum;"""
    assert s.count(a) == 1, 'comb'
    s = s.replace(a, b, 1)
    s = s.replace("  private static readonly HARM_TOL",
                  "  private static readonly HARM_CAP = Infinity;\n  private static readonly HARM_TOL", 1)

io.open(F, 'w', encoding='utf-8').write(s)
print('  bas lagd' + (' + comb-experiment' if '--comb' in sys.argv else ''))
