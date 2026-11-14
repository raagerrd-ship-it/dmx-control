/** BASEN (utbruten ur analyser.ts 2026-11-14). Basenergin i slagets skala och basgångens anslag per slag. Läser banden och klockans tempo ur analysatorn (this.a). */
import { Analyser } from "./analyser.js";

/** Talfält som ska vara flyttal från start (se stabiliseringen i analyser.ts). */
const DOUBLE_FROM_START = ['blPrev1', 'blPrev2', 'blTrough'] as const;

export class BassTracker {
  /** analysatorn som äger den här delen (delade signaler läses via den) */
  a: Analyser;
  constructor(a: Analyser) {
    this.a = a;
    for (const k of DOUBLE_FROM_START) { const v = (this as unknown as Record<string, number>)[k]; if (typeof v === 'number') { (this as unknown as Record<string, number>)[k] = 0.5; (this as unknown as Record<string, number>)[k] = v; } }
  }
  /** BASENERGIN MED SLAGET SOM TIDSENHET (frame.bassEnergy / bassEnergyShort). Alla tider räknas i SLAG ur klockans tempo (60000 / bpm,
   *  hållet inom BE_BEAT_MIN_MS..BE_BEAT_MAX_MS så ett halv-/dubbeltempo inte flyttar skalan långt; utan klocka BE_FALLBACK_MS):
   *  TAKET följer basen direkt upp och glöms mot den på BE_TOP_BEATS slag (frasens skala) resp. BE_FAST_BEATS slag (taktens skala) -
   *  hur fort skalan hinner ikapp ett nivåbyte följer musikens tempo i stället för en klocka i sekunder. Fältet = basens läge i ett
   *  FAST spann BE_SPAN_DB under taket. Bara dB-SKILLNADER: ingen tystnadsgrind och ingen absolut nivå i mätningen (oberoende av
   *  ingångsnivån). Fyra tal i tillstånd (beRef = låtens referens för frame.bassLevel), inga objekt per hop. INGEN DAL HÄR (ägaren 11-11: en dal som återhämtar sig inom slaget
   *  bestämmer pulsens bredd = ljusstyrning) - den ligger i effects.ts stepEnergy och följer fältet, inte ljudet.
   *  (Provat och förkastat i arenan: toppen som kvantil/median av de 32 senaste slagtopparna - plattare ljus, sämre takt i bänken.) */
  private static readonly BE_TOP_BEATS = 16;private static readonly BE_FAST_BEATS = 2;  private static readonly BE_BEAT_MIN_MS = 300;private static readonly BE_BEAT_MAX_MS = 600;  beHi = NaN;private beHiShort = NaN;beRef = NaN;beShort = 0;
  /** Stegar skalorna ett hop; returnerar frasens värde, taktens ligger i beShort. */
  bassEnergyStep(sub: number, kick: number): number {
    const x = 5 * Math.log10(sub + 1e-7) + 15 * Math.log10(kick + 1e-7), hopMs = this.a.dtHop * 1000;   // 0,25 x sub dB + 0,75 x kick dB
    let per = this.a.localBpm > 40 ? 60000 / this.a.localBpm : Analyser.BE_FALLBACK_MS;   // slagets längd ur klockan
    per = per < BassTracker.BE_BEAT_MIN_MS ? BassTracker.BE_BEAT_MIN_MS : per > BassTracker.BE_BEAT_MAX_MS ? BassTracker.BE_BEAT_MAX_MS : per;
    this.beHi = !(x <= this.beHi) ? x : this.beHi + (x - this.beHi) * (hopMs / (BassTracker.BE_TOP_BEATS * per));
    this.beHiShort = !(x <= this.beHiShort) ? x : this.beHiShort + (x - this.beHiShort) * (hopMs / (BassTracker.BE_FAST_BEATS * per));
    this.beRef = this.a.section === 'high' || !(this.beHi <= this.beRef) ? this.beHi : this.beRef + (this.beHi - this.beRef) * (hopMs / (Analyser.BE_MEM_BEATS * per));   // låtens referens = refrängens tak
    let e = 1 - (this.beHiShort - x) / Analyser.BE_SPAN_DB;
    this.beShort = e > 0 ? e : 0;
    e = 1 - (this.beHi - x) / Analyser.BE_SPAN_DB;
    return e > 0 ? e : 0;
  }
private blPrev1 = 0;private blPrev2 = 0;private blRef = 0.1;private blLastOnset = -100;
  private blOnsets = new Int32Array(32);private blOnsetPos = 0;envSeq = 0;private blTrough = 1;
  /** TYDLIG BASGANG (env-rastret, 100 Hz): se blAccum. */
  stepBassline(): void {
    const v = this.a.blAccum; this.a.blAccum = 0;
    const seq = ++this.envSeq;
    const p1 = this.blPrev1;
    if (v < this.blTrough) this.blTrough = v;
    if (p1 >= this.blPrev2 && p1 > v && p1 > 0.05 && p1 - this.blTrough >= 0.25 * this.blRef && seq - 1 - this.blLastOnset >= 6) {
      if (seq - 1 - this.a.blKickSeq >= 6) { this.blOnsets[this.blOnsetPos] = seq - 1; this.blOnsetPos = (this.blOnsetPos + 1) & 31; }
      this.blLastOnset = seq - 1;
      this.blRef += (p1 - this.blRef) * 0.1;
      this.blTrough = p1;
    } else if (this.blRef > 0.05) this.blRef *= 0.999;
    this.blPrev2 = p1; this.blPrev1 = v;
    let n = 0; for (let i = 0; i < 32; i++) if (seq - this.blOnsets[i] <= 200 && this.blOnsets[i] > 0) n++;
    const beats2s = (this.a.dBpm > 0 ? this.a.dBpm : 120) / 30;
    const opb = n / beats2s;
    this.a.bassOnsetsPerBeat = opb;
    const raw = Math.max(0, Math.min(1, (opb - 0.4) / 0.8));
    this.a.profBassline += (raw - this.a.profBassline) * 0.01;
  }
}
