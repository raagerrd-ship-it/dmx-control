/**
 * LÖPANDE AUTO-RANGE PÅ LJUDNIVÅN.
 *
 * Det som gör den tvättade showen snygg är att ljustaket är NORMALISERAT mot
 * just den låtens egna nivåer (p5..p95), inte mot en absolut skala. Den här
 * modulen räknar samma percentiler löpande — kausalt, utan fingeravtryck eller
 * tvätt — ur ett exponentiellt avtagande histogram över nivån.
 *
 * Ingen allokering efter konstruktion: fast Float32Array + skalär decay.
 */

const BUCKETS = 64;

export class LiveRange {
  private hist = new Float32Array(BUCKETS);
  private total = 0;
  /** Tidskonstant för glömska (s). ~30 s ⇒ effektivt fönster ~60–90 s. */
  private tau: number;
  /** Minsta samlade vikt innan percentilerna litas på (≈ tau/3 sekunder av data). */
  private minWeight: number;

  constructor(tau = 30) {
    this.tau = tau;
    this.minWeight = tau / 3;
  }

  /** Mata in en nivå (0..1) med tidssteget sedan förra anropet. */
  push(level: number, dtSec: number): void {
    const decay = Math.exp(-dtSec / this.tau);
    for (let i = 0; i < BUCKETS; i++) this.hist[i] *= decay;
    this.total *= decay;
    const v = level < 0 ? 0 : level > 1 ? 1 : level;
    let b = Math.floor(v * BUCKETS);
    if (b >= BUCKETS) b = BUCKETS - 1;
    // Vikten är dtSec → resultatet blir oberoende av anropstakten.
    this.hist[b] += dtSec;
    this.total += dtSec;
  }

  /** Percentil (0..1) ur histogrammet. */
  private p(q: number): number {
    const target = this.total * q;
    let acc = 0;
    for (let i = 0; i < BUCKETS; i++) {
      acc += this.hist[i];
      if (acc >= target) return (i + 0.5) / BUCKETS;
    }
    return 1;
  }

  /**
   * Normalisera nivån mot det rullande spannet → 0..1, samma kurva som tvättens
   * p5/p95-normalisering. Innan tillräckligt med data samlats (eller om spannet
   * är för smalt för att vara meningsfullt) returneras nivån orörd, så starten
   * aldrig blir konstigare än dagens rå-VU.
   */
  norm(level: number): number {
    if (this.total < this.minWeight) return level;
    const lo = this.p(0.05), hi = this.p(0.95);
    const span = hi - lo;
    if (span < 0.08) return level;
    const x = (level - lo) / span;
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  /**
   * Misstänkt låtbyte: halvera historikens vikt en gång så spannet kryper in på
   * den nya låtens nivåer inom sekunder i stället för en minut. En falsk gräns
   * kostar bara snabbare omkalibrering.
   */
  soften(): void {
    for (let i = 0; i < BUCKETS; i++) this.hist[i] *= 0.5;
    this.total *= 0.5;
  }
}
