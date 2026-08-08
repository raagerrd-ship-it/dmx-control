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
    // TAK PÅ FÖRSTÄRKNINGEN. Ett hårt av/på vid 0.08 lämnade ett fönster där en jämn
    // låt fick tiofaldig förstärkning: p5..p95 ligger tätt, och då blir varje liten
    // nivåvariation full ljusrörelse. MÄTT 2026-08-07: fladder i partier med konstant
    // energi. Golvet under spannet begränsar förstärkningen till ~4× och tonar in
    // mjukt i stället för att slå om.
    // 0.50 ⇒ högst 2× förstärkning. MÄTT 2026-08-07: vid 4× var ljuset perfekt i
    // DYNAMISKA låtar men fladdrade så fort låten blev jämn — då ligger p5..p95 tätt
    // och varje liten nivåvariation blev full ljusrörelse. Hjärtslaget står för
    // dynamiken; taket ska bara följa låtens nivå utan att blåsa upp brus till ljus.
    const span2 = Math.max(span, 0.50);
    const x = (level - lo) / span2;
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
