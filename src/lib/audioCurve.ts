/**
 * Delad exponentialkurva för mjukhet/release-tid.
 * Portad från Lotus Lantern (`PiMobile.tsx` → `curveToAlpha`) så samma UI-värde
 * ger identiskt beteende när Pi-engine tar över mock-loopen.
 *
 *   0   → alpha 1.000  (rått fall, ingen smoothing)
 *   100 → alpha 0.005  (mycket mjukt release)
 *
 * Attack är motsatsen: attackAlpha = curveToAlpha(100 - attack).
 * I den här appen kör vi attack = 100 (omedelbar rise) och låter Mjukhet
 * styra release-alpha.
 */
export function curveToAlpha(v: number): number {
  const t = Math.max(0, Math.min(1, v / 100));
  const alpha = 1.0 - 0.995 * Math.pow(t, 0.7);
  return Math.max(0.005, Math.round(alpha * 1000) / 1000);
}

export function softnessToAlpha(s: number): number {
  return curveToAlpha(s);
}

/**
 * Ett-stegs smoothing: hög värde → gå direkt till target (attack),
 * lågt → långsamt fall mot target (release). Kör per tick.
 */
export function smoothStep(prev: number, target: number, attackAlpha: number, releaseAlpha: number): number {
  const alpha = target > prev ? attackAlpha : releaseAlpha;
  return prev + (target - prev) * alpha;
}
