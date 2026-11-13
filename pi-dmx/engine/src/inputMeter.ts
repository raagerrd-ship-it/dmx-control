/**
 * INGÅNGSMÄTAREN (2026-11-13, ägaren: "gör en funktion på DMX webb UI, där vi kan justera input till rätt. Där man spelar låt med fart
 * och sakta sakta ökar input till en nivå som är bra. Låser den och jag läser av inställningen på mixern, som kan sparas i UI").
 *
 * Mäter det RÅA ljudet från ingången (samma hop som analysatorn får, före all förstärkning) och håller de senaste sekunderna i en ring,
 * så /setup kan visa nivån och spela upp ett klipp av det Pi:n faktiskt hör. Bakgrund: ladans övningsfiler pop_ladan och megamix_ladan
 * visade sig vara klippta i 98-100 % av sekunderna (tools/inspelningskoll.py), och ägaren hörde att även de oklippta lät illa.
 *
 * VILAR när ingen frågar: status() och wav() håller mätaren vaken i WAKE_MS; annars kostar push() en jämförelse per hop.
 */
const WAKE_MS = 4000, BLOCK_S = 0.25, HIST = 12 /* 3 s */, RING_S = 8;
/** Vid eller över den här nivån räknas ett sampel som klippt (16 bitar: 32440 av 32767). */
const CLIP = 0.99;

export interface InputLevel {
  /** 'vilar' = mätaren har inte hunnit mäta, 'tyst' = inget ljud, 'lag', 'bra', 'hog', 'klipper'. */
  state: "vilar" | "tyst" | "lag" | "bra" | "hog" | "klipper";
  /** Högsta toppen de senaste 3 s, 0..1 och i dBFS. */
  peak: number; peakDb: number;
  /** Medelnivån (RMS) de senaste 3 s i dBFS, och toppfaktorn (topp/RMS, dB): ren musik 10-18, sönderklippt under 6. */
  rmsDb: number; crestDb: number;
  /** Andel klippta sampel de senaste 3 s (%), och längsta raden klippta sampel i följd. */
  clipPct: number; clipRun: number;
  /** Ljushet: energin i ljudets förändring mot energin i ljudet, dB. Stiger när ljudet spricker (distorsion ger diskant som inte fanns). */
  brightDb: number;
  /** Senaste kvartssekundens topp i dBFS (stapelns rörliga del). */
  nowDb: number;
}

export class InputMeter {
  private until = 0;
  private readonly ring: Int16Array; private pos = 0; private filled = 0;
  private readonly blockN: number; private n = 0; private pk = 0; private sum2 = 0; private dsum2 = 0; private clipN = 0; private run = 0; private runMax = 0; private prev = 0;
  private readonly hPk = new Float64Array(HIST); private readonly hSum2 = new Float64Array(HIST); private readonly hD2 = new Float64Array(HIST);
  private readonly hClip = new Float64Array(HIST); private readonly hRun = new Float64Array(HIST); private hPos = 0; private hN = 0;

  constructor(private readonly rate: number) { this.ring = new Int16Array(Math.round(rate * RING_S)); this.blockN = Math.round(rate * BLOCK_S); }

  /** Varje rå hop från ingången. Gör ingenting när ingen tittar. */
  push(s: Float32Array): void {
    if (this.until === 0) return;
    if (Date.now() > this.until) { this.until = 0; this.hN = 0; this.n = 0; this.pk = 0; this.sum2 = 0; this.dsum2 = 0; this.clipN = 0; this.run = 0; this.runMax = 0; return; }
    const ring = this.ring, R = ring.length; let pos = this.pos, prev = this.prev;
    for (let i = 0; i < s.length; i++) {
      const x = s[i], a = x < 0 ? -x : x, d = x - prev; prev = x;
      ring[pos] = x >= 1 ? 32767 : x <= -1 ? -32768 : Math.round(x * 32767); pos = pos + 1 === R ? 0 : pos + 1;
      if (a > this.pk) this.pk = a;
      this.sum2 += x * x; this.dsum2 += d * d;
      if (a >= CLIP) { this.clipN++; if (++this.run > this.runMax) this.runMax = this.run; } else this.run = 0;
      if (++this.n >= this.blockN) {
        const h = this.hPos; this.hPk[h] = this.pk; this.hSum2[h] = this.sum2; this.hD2[h] = this.dsum2; this.hClip[h] = this.clipN; this.hRun[h] = this.runMax;
        this.hPos = h + 1 === HIST ? 0 : h + 1; if (this.hN < HIST) this.hN++;
        this.n = 0; this.pk = 0; this.sum2 = 0; this.dsum2 = 0; this.clipN = 0; this.runMax = 0;
      }
    }
    this.pos = pos; this.prev = prev; if (this.filled < R) this.filled = Math.min(R, this.filled + s.length);
  }

  /** Nivån de senaste 3 s. Håller mätaren vaken. */
  status(): InputLevel {
    this.until = Date.now() + WAKE_MS;
    const db = (v: number) => 20 * Math.log10(Math.max(v, 1e-6));
    if (this.hN === 0) return { state: "vilar", peak: 0, peakDb: -120, rmsDb: -120, crestDb: 0, clipPct: 0, clipRun: 0, brightDb: -120, nowDb: -120 };
    let pk = 0, s2 = 0, d2 = 0, cl = 0, run = 0;
    for (let i = 0; i < this.hN; i++) { if (this.hPk[i] > pk) pk = this.hPk[i]; s2 += this.hSum2[i]; d2 += this.hD2[i]; cl += this.hClip[i]; if (this.hRun[i] > run) run = this.hRun[i]; }
    const N = this.hN * this.blockN, rms = Math.sqrt(s2 / N), last = this.hPk[(this.hPos + HIST - 1) % HIST];
    const state: InputLevel["state"] = rms < 0.001 ? "tyst" : (cl > 0 || run >= 2) ? "klipper" : pk > 0.8 ? "hog" : pk < 0.1 ? "lag" : "bra";
    return { state, peak: pk, peakDb: db(pk), rmsDb: db(rms), crestDb: db(pk) - db(rms), clipPct: 100 * cl / N, clipRun: run, brightDb: s2 > 0 ? 10 * Math.log10(Math.max(d2 / s2, 1e-9)) : -120, nowDb: db(last) };
  }

  /** De senaste `seconds` sekunderna rått ljud som WAV (16 bitar mono), för uppspelning i /setup. Håller mätaren vaken. */
  wav(seconds: number): Buffer {
    this.until = Date.now() + WAKE_MS;
    const R = this.ring.length, n = Math.min(this.filled, Math.max(1, Math.round(Math.min(seconds, RING_S) * this.rate)));
    const b = Buffer.alloc(44 + n * 2);
    b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
    b.writeUInt32LE(this.rate, 24); b.writeUInt32LE(this.rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
    let p = (this.pos - n + R * 2) % R;
    for (let i = 0; i < n; i++) { b.writeInt16LE(this.ring[p], 44 + i * 2); p = p + 1 === R ? 0 : p + 1; }
    return b;
  }
}
