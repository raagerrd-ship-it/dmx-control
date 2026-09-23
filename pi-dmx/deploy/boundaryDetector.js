/**
 * LATGRANS UR LJUDET — utbruten ur songMemory.ts 2026-09-23 nar latminnet togs bort fran driften.
 *
 * Det har ar det ENDA av latminnet som realtidsshowen faktiskt hangde pa: `boundaryCount` (index.ts) driver
 * dynamikens omkalibrering (effects.softenRange) och tempots latbytes-hint (analyser.hintTrackChange /
 * resetTempo). Allt annat i songMemory - fingeravtryck, igenkanning, replay, inlarning - var offline-arbete
 * som ska ske pa PC:n, och kostade i drift synkron disk-I/O + en BigInt-indexombyggnad (matt 196 ms pa PC,
 * dvs sekunder pa Pi:n) vid varje latcommit.
 *
 * MATEMATIKEN AR OFORANDRAD, avsiktligt: konstanter, ordning och aterstallningar ar kopierade rakt av sa att
 * boundaryCount stiger pa exakt samma hop som forr (bevisat i tools/boundaryEquiv.mjs mot den gamla modulen).
 * Grenarna for igenkand lat / manuell inlarning / karantan ar borta - de kunde aldrig sla till utan bibliotek.
 *
 * Signalen: KLANGSKIFTET bar gransen ensamt (matt mot facit, se kommentaren vid pushNovelty); nivadipp och
 * temposkifte sanker bara troskeln nar de finns. Allt grindas av min/max-langd pa segmentet.
 */
const SILENCE_END_MS = 3000; // tystnad sa lange = laten ar slut
const START_LEVEL = 0.15; // volymgrind: starta bara pa tydlig musik
const START_HOLD_MS = 1000; // ...som hallit i en sekund
const MIN_SEG_MS = 110000; // MATT: 75 s triggade direkt (tva segment exakt 75 s) -> hojt
const MAX_SEG_MS = 600000; // 10 min utan grans -> tvinga fram en
const BPM_JUMP = 0.07; // >7 % tempoandring = extrasignal
const BPM_HOLD_MS = 4000; // ...som haller i 4 s (inte en halvtaktsmiss)
const DIP_RATIO = 0.55; // niva under 55 % av snittet (extrasignal)
const DIP_WIN_MS = 6000; // dipp raknas som evidens sa lange efterat
const NOV_WIN_MS = 1500; // klangprofil per 1,5 s
const NOV_LAG_MS = 8000; // jamfor mot profilen sa langt bakat (facitmatningens fonster)
const NOV_STRONG = 0.68; // MATT: plata 0,60-0,75 gav 2/2 traff, 0 falska -> mitten
const NOV_WEAK = 0.55; // ...racker om nivadipp eller temposkifte ocksa fyrar
const NOV_BACK_MS = 0;
const NOV_WIN_KEEP_MS = 6000; // klangskifte raknas som evidens sa lange efterat
const NOV_Q = 0.97; // skiftet maste ligga i toppen av de senaste minuterna
const NOV_TAU_S = 45; // glomska pa fordelningen (~90 s effektivt fonster)
const NOV_DIST_MIN_S = 20; // innan sa mycket data samlats galler bara absoluta kravet
const NOV_DIST_BUCKETS = 48; // d ar ett L1-avstand i 0..2
const NOV_BANDS = [40, 80, 160, 320, 640, 1280, 2560, 5120, 11000];
export class BoundaryDetector {
    clock;
    constructor(clock = Date.now) {
        this.clock = clock;
    }
    /** Stiger vid varje passerad latgrans. Det ar den har motorn laser. */
    boundaryCount = 0;
    /** Varfor senaste gransen sattes (diagnostik). */
    lastBoundary = "";
    /** Gransignaler som var aktiva vid senaste kontrollen (diagnostik). */
    lastEvidence = [];
    playStart = 0; // vaggklocka da segmentet borjade
    lastLoud = 0;
    loudSince = 0;
    segBpm = 0; // tempot den pagaende sekvensen etablerat
    segBpmConf = 0;
    bpmOffSince = 0; // vaggklocka da tempot borjade avvika
    novAcc = new Float32Array(NOV_BANDS.length - 1);
    novN = 0;
    novStart = 0;
    novHist = [];
    novIdx = 0; // nasta slot i ringen
    novFilled = 0; // antal skrivna profiler
    novAt = 0; // vaggklocka for senaste klangskiftet
    novPeak = 0; // L1-avstandet vid det skiftet
    novDist = new Float32Array(NOV_DIST_BUCKETS); // fordelning over ALLA d
    novDistTotal = 0;
    levAvg = 0; // langsamt nivasnitt (dippdetektering)
    dipAt = 0; // vaggklocka for senaste nivadippen
    /** Ett segment (en lat) ar igang. */
    get active() { return this.playStart > 0; }
    /** Sa lange nuvarande segment varat (ms), 0 utanfor segment. */
    get segmentMs() { return this.playStart ? this.clock() - this.playStart : 0; }
    /** Matas fran analysatorns spektrum-sink (2048-magnitud, var 3:e hop). Ingen extra FFT. */
    pushSpectrum(mag, binHz) {
        if (!this.playStart)
            return;
        this.pushNovelty(mag, binHz);
    }
    /** Matas varje hop med ramens niva/tempo. */
    tick(o) {
        const now = this.clock();
        if (o.level > 0.02)
            this.lastLoud = now;
        if (!this.playStart) {
            // Volymgrind: starta bara pa tydlig musik som hallit en sekund, aldrig pa brusgolvet.
            if (o.level >= START_LEVEL) {
                if (!this.loudSince)
                    this.loudSince = now;
                else if (now - this.loudSince >= START_HOLD_MS) {
                    this.playStart = now;
                    this.lastLoud = now;
                    this.loudSince = 0;
                }
            }
            else
                this.loudSince = 0;
            return;
        }
        if (now - this.lastLoud > SILENCE_END_MS) {
            this.commit();
            return;
        }
        this.boundary(now, now - this.playStart, o);
    }
    /** KLANGSKIFTE. Energin samlas i oktavband, normaliseras (form, inte volym) och jamfors var 1,5 s med
     *  profilen NOV_LAG_MS bakat - exakt mattet som mattes mot facit (percentil 88 och 92 vid de verkliga
     *  granserna). Troskeln ar ABSOLUT: den adaptiva varianten drog upp ribban i just de partier dar en gaplos
     *  overgang sker, och missade bada facitgranserna. */
    pushNovelty(mag, binHz) {
        const now = this.clock();
        if (!this.novStart)
            this.novStart = now;
        for (let b = 0; b < this.novAcc.length; b++) {
            const lo = Math.max(1, Math.round(NOV_BANDS[b] / binHz));
            const hi = Math.min(mag.length - 1, Math.round(NOV_BANDS[b + 1] / binHz));
            let s = 0;
            for (let i = lo; i <= hi; i++)
                s += mag[i];
            this.novAcc[b] += hi >= lo ? s / (hi - lo + 1) : 0;
        }
        this.novN++;
        if (now - this.novStart < NOV_WIN_MS)
            return;
        this.novStart = now;
        let sum = 0;
        for (let b = 0; b < this.novAcc.length; b++)
            sum += this.novAcc[b];
        this.novN = 0;
        if (sum <= 0) {
            this.novAcc.fill(0);
            return;
        }
        const lag = Math.max(1, Math.round(NOV_LAG_MS / NOV_WIN_MS));
        const size = lag + 1;
        if (this.novHist.length !== size) {
            this.novHist = [];
            for (let i = 0; i < size; i++)
                this.novHist.push(new Float32Array(this.novAcc.length));
            this.novIdx = 0;
            this.novFilled = 0;
        }
        const prof = this.novHist[this.novIdx];
        for (let b = 0; b < prof.length; b++)
            prof[b] = this.novAcc[b] / sum;
        this.novAcc.fill(0);
        this.novIdx = (this.novIdx + 1) % size;
        this.novFilled++;
        if (this.novFilled > lag) {
            const past = this.novHist[this.novIdx]; // efter framflyttningen pekar idx pa aldsta = lag fonster bakat
            let d = 0;
            for (let b = 0; b < prof.length; b++)
                d += Math.abs(prof[b] - past[b]);
            // Fordelningen matas med VARJE d - aven de sma. Det ar dem som avgor vad "ovanligt" betyder i just den har laten.
            const dt = NOV_WIN_MS / 1000;
            const decay = Math.exp(-dt / NOV_TAU_S);
            for (let i = 0; i < NOV_DIST_BUCKETS; i++)
                this.novDist[i] *= decay;
            this.novDistTotal *= decay;
            let bk = Math.floor((d / 2) * NOV_DIST_BUCKETS);
            if (bk < 0)
                bk = 0;
            if (bk >= NOV_DIST_BUCKETS)
                bk = NOV_DIST_BUCKETS - 1;
            this.novDist[bk] += dt;
            this.novDistTotal += dt;
            if (d >= NOV_WEAK) {
                this.novAt = now;
                this.novPeak = d;
            }
        }
    }
    /** Troskeln som laten sjalv satter: NOV_Q-percentilen av de senaste minuternas klangskiften.
     *  Returnerar 0 innan tillrackligt med data samlats - da galler bara det absoluta kravet. */
    novRelThreshold() {
        if (this.novDistTotal < NOV_DIST_MIN_S)
            return 0;
        const target = this.novDistTotal * NOV_Q;
        let acc = 0;
        for (let i = 0; i < NOV_DIST_BUCKETS; i++) {
            acc += this.novDist[i];
            if (acc >= target)
                return ((i + 0.5) / NOV_DIST_BUCKETS) * 2;
        }
        return 2;
    }
    resetNovelty() {
        this.novAt = 0;
        this.novPeak = 0;
        this.novAcc.fill(0);
        this.novN = 0;
        this.novStart = 0;
        this.novDist.fill(0);
        this.novDistTotal = 0;
        this.novHist = [];
        this.novIdx = 0;
        this.novFilled = 0;
    }
    /** LATGRANS I EN GAPLOS STROM. Returnerar true om vi delade. */
    boundary(now, tLive, o) {
        // Nivadipp: extrasignal. Vid Spotify-crossfade faller nivan knappt alls (matt: kvot 0,98 och 0,91 vid
        // facitgranserna), sa den far aldrig kravas.
        this.levAvg = this.levAvg > 0 ? this.levAvg * 0.995 + o.level * 0.005 : o.level;
        if (this.levAvg > 0.05 && o.level < this.levAvg * DIP_RATIO)
            this.dipAt = now;
        if (o.bpmConfidence > 0.5 && o.bpm > 40 && !this.segBpm) {
            this.segBpm = o.bpm;
            this.segBpmConf = o.bpmConfidence;
        }
        let bpmShift = "";
        if (o.bpmConfidence > 0.5 && o.bpm > 40 && this.segBpm) {
            const dev = Math.abs(o.bpm - this.segBpm) / this.segBpm;
            if (dev > BPM_JUMP) {
                if (!this.bpmOffSince)
                    this.bpmOffSince = now;
                if (now - this.bpmOffSince > BPM_HOLD_MS)
                    bpmShift = `tempo ${this.segBpm.toFixed(0)}→${o.bpm.toFixed(0)} BPM`;
            }
            else {
                this.bpmOffSince = 0;
                this.segBpm = this.segBpm * 0.95 + o.bpm * 0.05;
                this.segBpmConf = Math.max(this.segBpmConf, o.bpmConfidence);
            }
        }
        if (tLive < MIN_SEG_MS + NOV_BACK_MS)
            return false;
        const novFresh = this.novAt > 0 && now - this.novAt < NOV_WIN_KEEP_MS;
        const ev = [];
        if (novFresh)
            ev.push(`klangskifte ${this.novPeak.toFixed(2)}`);
        if (bpmShift)
            ev.push(bpmShift);
        if (this.dipAt && now - this.dipAt < DIP_WIN_MS)
            ev.push("nivådipp");
        this.lastEvidence = ev;
        let why = "";
        let back = NOV_BACK_MS;
        // Ensam racker klangskiftet bara om det ar starkt BADE absolut och relativt latens egen fordelning.
        // Tva oberoende bevis racker.
        const novRel = this.novRelThreshold();
        const novSolo = this.novPeak >= NOV_STRONG && this.novPeak >= novRel;
        if (novFresh && (novSolo || ev.length >= 2))
            why = ev.join(" + ");
        else if (tLive > MAX_SEG_MS) {
            why = "maxlängd";
            back = 0;
        } // aldrig en 22-minuters grot igen
        if (!why)
            return false;
        const bAt = now - back;
        console.log(`[song] låtgräns efter ${((bAt - this.playStart) / 1000).toFixed(0)}s (${why})`);
        this.lastBoundary = why;
        this.lastLoud = bAt;
        this.commit();
        // Starta nasta sekvens direkt - strommen tystnar aldrig.
        this.playStart = bAt;
        this.lastLoud = now;
        return true;
    }
    /** Segmentet ar slut: rakna gransen och nollstall for nasta. Samma aterstallningar som songMemory.commit. */
    commit() {
        this.boundaryCount++; // grans passerad -> motorns auto-range far kalibrera om
        this.playStart = 0;
        this.segBpm = 0;
        this.segBpmConf = 0;
        this.bpmOffSince = 0;
        this.resetNovelty();
        this.levAvg = 0;
        this.dipAt = 0;
        this.loudSince = 0;
    }
}
