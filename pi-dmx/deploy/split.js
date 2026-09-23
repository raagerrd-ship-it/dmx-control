/**
 * DELAD ANALYSATOR (portad fran lotus-light 2026-09-22, dar den ar i drift sedan 09-21):
 * transporten mellan den SNABBA tradens ljudvag (FFT, band, onset, kick, niva, drop - maste svara
 * inom en hop) och den LANGSAMMA analysen (tempo, gridfas, sektion - sekunder ar ok). Den langsamma
 * kor i en worker_threads-Worker med egen V8-heap och egen karna, sa dess berakningar och
 * skrapsamling aldrig ligger i vagen for hop-loopen.
 *
 * VARFOR HAR: DMX-motorn mater 15,6 % av hoppen over budget (0,99 ms snitt, toppar 235 ms mot
 * budgeten 2,67 ms vid hop 128 / 48 kHz). Det ar precis computeBpm (~470 us, scoreEnv 2 x 201 us)
 * plus sektionsblocket som ligger i vagen - alltsa just det som flyttas har. Lotus matte
 * process() 820 -> 476 us och over budget 615 -> 187 nar delningen slogs pa.
 *
 * Snittet (kartlagt i dmx-analysatorn): computeBpm/computeGridPhase laser bara 100 Hz-ringarna
 * (helband + bas + diskant-diagnosringen) plus sin egen tid; sectionHop laser blocksummor per hop
 * (intensitet, kickar, rms^2, centroid, bandAbs) plus dropCount/activeMs/buildUp. Tillbaka gar
 * ~16 tal: bpm, konfidens, gridfas, sektion, forutsagelse, upprepning.
 *
 * Transport: en SharedArrayBuffer-ring med ett RECORD per env-sampel (100 Hz, 30 doubles) skrivet av
 * den snabba traden, och ett TILLSTANDSBLOCK (seqlock) skrivet av den langsamma. Inga meddelanden i
 * driftvagen, ingen allokering, ingen kopiering. Kommandon (tystnadsnollning, resetTempo,
 * latbyteshint, virtuell klocka) aker som flaggor I recordet, sa ordningen mot ljuddata bevaras
 * exakt - det gor att inline-laget (bada i samma trad, se createAnalyser i analyser.ts) ger
 * BIT-IDENTISKT tempo mot den odelade analysatorn, vilket tools/splitProof.mjs bevisar.
 *
 * SKILLNADER MOT LOTUS-FORLAGAN (medvetna, inte slarv):
 *   - R_HIGH: dmx har en diskantring (envHighRing, DMX_HIGH_DIAG/DMX_HIGH_VOTE) som lotus saknar.
 *     Den bars med i recordet sa prototyp-rosten inte tyst tappas i delat lage.
 *   - Ingen F_RESET_BAR: i dmx lever barAcc/barCount BARA i den snabba hop-vagen (taktfasen,
 *     barShift). resetBar() har alltsa ingen langsam sida att meddela.
 *   - Inget S_BPMF: dmx har ingen finupplost localBpmF.
 */
export const REC_LEN = 30;
export const RING_N = 1024; // ~10 s vid 100 Hz - workern far ligga efter utan att tappa
export const RING_MARGIN = 8; // records workern lamnar ororda mot skrivaren (80 ms) - las aldrig narmare kanten
// Record-falt (Float64)
export const R_SEQ = 0, R_PERF = 1, R_WALL = 2, R_ENV = 3, R_BASS = 4, R_HIGH = 5, R_FLAGS = 6, R_HINT_MS = 7, R_VCLOCK = 8, R_SEC_N = 9, R_SEC_INT = 10, R_SEC_KICKS = 11, R_SEC_BREAK = 12, R_SEC_RMS2 = 13, R_SEC_CENT = 14, R_SEC_DT = 15, R_SEC_WALL = 16, R_DROPS = 17, R_ACTIVE = 18, R_BUILD = 19, R_SEC_SPEC0 = 20 /* ..27 */, R_TS = 28 /* Date.now() vid skrivning, for lagmatt over tradar */, R_FLAGCNT = 29 /* packade flaggraknare (se packFlagCounts): hur manga ganger varje flagga rests t.o.m. detta record */;
// Flaggor (bitmask i R_FLAGS)
export const F_SIL350 = 1, F_SIL10 = 2, F_RESET_TEMPO = 4, F_HINT = 8, F_VCLOCK_SET = 16, F_VCLOCK_NULL = 32;
export const FLAG_BITS = 6;
/**
 * FALLA 1 - TAPPADE FLAGGOR. Om workern ligger > RING_N-RING_MARGIN records efter skrivs ringen over
 * och records TAPPAS. En flagga (t.ex. F_SIL10 = "slapp tempot") som lag i ett overskrivet record
 * fick forr ingen konsekvens alls: snabba sidan hade nollat lokalt, men nasta tillstandsblock
 * (S_REC_SEQ >= barrierSeq) aterstallde tempot. Darfor bar varje record en PACKAD RAKNARE per flagga
 * (6 flaggor x 7 bitar = 42 bitar, exakt i en double): antal ganger flaggan rests t.o.m. recordet,
 * modulo 128. Workern jamfor raknaren i recordet den aterupptar vid med raknaren i det senast
 * behandlade och far exakt vilka flaggor som gatt forlorade - utan nagon kapplopning mot skrivaren
 * (allt ligger i recordet, som seq:en). Modulo 128 racker: ingen flagga kan resas 128 ganger pa de
 * <= 10 s ett tapp omfattar.
 */
export const FLAG_MOD = 128;
export function packFlagCounts(cnt) {
    let v = 0, m = 1;
    for (let k = 0; k < FLAG_BITS; k++) {
        v += (cnt[k] % FLAG_MOD) * m;
        m *= FLAG_MOD;
    }
    return v;
}
/** Bitmask over flaggor vars raknare skiljer mellan `before` och `after` (packade), minus flaggorna i
 *  `ownFlags` (recordet man aterupptar vid behandlas anda normalt, dess egna flaggor ska inte dubbleras). */
export function lostFlags(before, after, ownFlags) {
    let lost = 0;
    for (let k = 0; k < FLAG_BITS; k++) {
        const a = Math.floor(after / FLAG_MOD ** k) % FLAG_MOD, b = Math.floor(before / FLAG_MOD ** k) % FLAG_MOD;
        let d = (a - b + FLAG_MOD) % FLAG_MOD;
        if (ownFlags & (1 << k))
            d = (d - 1 + FLAG_MOD) % FLAG_MOD;
        if (d !== 0)
            lost |= 1 << k;
    }
    return lost;
}
// Kontrollord (Int32, Atomics)
export const C_WRITE = 0; // antal skrivna records (monotont) - workern vantar pa detta
export const C_READ = 1; // antal lasta records
export const C_STATE_SEQ = 2; // seqlock for tillstandsblocket (udda = skrivning pagar)
export const C_WAITING = 3; // 1 = workern ligger i Atomics.wait (skrivaren notify:ar bara da)
/**
 * FALLA 2 - SEQ-WRAP. C_WRITE/C_READ ar Int32 och seq:en vaxer 100/s -> 2^31 efter 248 dagar. Bada
 * sidor raknar darfor seq som JS-tal (double, aldrig wrap) och lagger bara de laga 32 bitarna i
 * kontrollordet (`seq | 0`). Lasaren rekonstruerar ur en SIGNERAD 32-bitars skillnad mot sin egen
 * seq, korrekt sa lange avstandet ar < 2^31 records (248 dagar efter varandra - ringen ar 1 024).
 * Aldrig `Atomics.load(C_WRITE)` rakt mot en JS-seq: jamfor med seqDelta().
 */
export function seqLow(seq) { return seq | 0; }
/** Signerad skillnad (ctrlLow - mySeq) i records, wrap-saker. */
export function seqDelta(ctrlLow, mySeq) { return (ctrlLow - (mySeq | 0)) | 0; }
// Tillstandsblock (Float64)
export const S_REC_SEQ = 0, S_BPM = 1, S_CONF = 2, S_PHASE_MS = 3, S_PHASE_CONF = 4, S_SECTION = 5, S_SEC_START = 6, S_SEC_INDEX = 7, S_SEC_TIER = 8, S_REP_SIM = 9, S_REP_AGO = 10, S_REP_SEC = 11, S_EXPECT_MS = 12, S_EXPECT_SRC = 13, S_PREV_SEC = 14, S_LVL_HIGH = 15, S_PROCESSED = 16, S_LAG_MS = 17, S_LAG_MAX = 18, S_BUSY_US = 19, S_BUSY_MAX_US = 20, S_SKIPPED = 21, S_LOST_FLAGS = 22 /* flaggor aterskapade ur raknarna efter tapp */;
export const STATE_LEN = 23;
export const SECTIONS = ['', 'intro', 'low', 'build', 'high', 'break'];
export function sectionCode(s) { const i = SECTIONS.indexOf(s); return i < 0 ? 0 : i; }
export function createSplitBuffers() {
    return {
        ctrl: new SharedArrayBuffer(16 * 4),
        ring: new SharedArrayBuffer(RING_N * REC_LEN * 8),
        state: new SharedArrayBuffer(STATE_LEN * 8),
    };
}
export function viewsOf(b) {
    return { ctrl: new Int32Array(b.ctrl), ring: new Float64Array(b.ring), state: new Float64Array(b.state) };
}
/** Skriv tillstandsblocket under seqlock (skrivaren ar ensam: workern). */
export function stateWrite(ctrl, state, fill) {
    const s = Atomics.load(ctrl, C_STATE_SEQ);
    Atomics.store(ctrl, C_STATE_SEQ, s + 1);
    fill(state);
    Atomics.store(ctrl, C_STATE_SEQ, s + 2);
}
/** Las tillstandsblocket konsistent till `out` (kopia). false = fick ingen konsistent lasning (behall forra). */
export function stateRead(ctrl, state, out) {
    for (let tries = 0; tries < 4; tries++) {
        const s1 = Atomics.load(ctrl, C_STATE_SEQ);
        if (s1 & 1)
            continue;
        out.set(state);
        const s2 = Atomics.load(ctrl, C_STATE_SEQ);
        if (s1 === s2)
            return true;
    }
    return false;
}
