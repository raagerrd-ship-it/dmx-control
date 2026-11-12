/** EFFEKTERNAS UTTONING OCH MINSTA PÅ-TID (2026-11-12, ägaren: toningen 'skall ju ligga i effekterna', output har bara golvet mot strobe).
 *  Koden är ordagrant den som låg i output.ts (LampFade, fade-planen steg 1) och dessförinnan i effects.ts steg 2: DMX-md5-identiskt.
 *  Effekternas gemensamma uttoning: lampans ljus går upp direkt och faller med tidskonstanten cfg.fadeMinS (i lampans LJUS, output.ts
 *  lampFadeK översätter per lampa); en nivå lampan nått hålls cfg.minOnMs innan uttoningen börjar; en tänd färgkanal hålls cfg.chMinOnMs
 *  med sin senaste andel av ljuset. fast (effekter byggda på korta blixtar, types.ts fastLight) hoppar över de två hålltiderna.
 *  Tiderna är inställningar i /setup ('justerbara, så vi kan trimma in dom'). Uttoningen går aldrig under FADE_MIN_S: det är outputs
 *  golv (output.ts LampGuard), och ratten går bara mot långsammare. Tillstånd per lampa (64 lampor). */
import type { FixtureConfig } from "../config.js";
import { lampFadeK, sameLight, FADE_MIN_S, MIN_ON_MS, CH_MIN_ON_MS } from "../output.js";

const tal = (v: unknown, d: number, lo: number, hi: number): number => (typeof v === 'number' && v === v ? Math.max(lo, Math.min(hi, v)) : d);
export class EffectFade {
  private lvl = new Float32Array(64); private peakAt = new Float64Array(64); private chOnAt = new Float64Array(192); private ratio = new Float32Array(192);   // ljusstyrka + senaste kulör
  private prev = new Float32Array(192); private fo: [number, number, number] = [0, 0, 0]; private fn: [number, number, number] = [0, 0, 0];   // förra rutans färg per lampa
  private fadeS = FADE_MIN_S; private minOn = MIN_ON_MS; private chMinOn = CH_MIN_ON_MS;
  /** Läs inställningarna (en gång per ruta). */
  tune(cfg: { fadeMinS?: number; minOnMs?: number; chMinOnMs?: number }): void {
    this.fadeS = tal(cfg.fadeMinS, FADE_MIN_S, FADE_MIN_S, 2); this.minOn = tal(cfg.minOnMs, MIN_ON_MS, 0, 500); this.chMinOn = tal(cfg.chMinOnMs, CH_MIN_ON_MS, 0, 500);
  }
  /** En lampa, en ruta: rgb (effektens färg x energin, 0..1) skrivs om på plats. now = rutans klocka (ms), dtSec = rutans längd. */
  step(i: number, fx: FixtureConfig | undefined, rgb: [number, number, number], now: number, dtSec: number, fast: boolean): void {
    const mT = rgb[0] > rgb[1] ? (rgb[0] > rgb[2] ? rgb[0] : rgb[2]) : (rgb[1] > rgb[2] ? rgb[1] : rgb[2]);
    // MINSTA PA-TID (output.ts MIN_ON_MS, agaren i ladan 10-10: "kan man ge effekterna en minsta tankt 'pa' tid? nu blev det lite
    // flimrande igen"): en nivå lampan nått hålls minst MIN_ON_MS innan uttoningen börjar - korta blixtar blir en puls. Upp direkt.
    const holding = !fast && now - this.peakAt[i] < this.minOn;
    const fall = holding ? this.lvl[i] : this.lvl[i] * lampFadeK(fx, dtSec, this.fadeS), o = i * 3;   // tidskonstanten i lampans ljus (output.ts översätter)
    if (mT > 0) {
      // MINSTA PA-TID PER FARGKANAL (agaren 10-10: "lyser R sa far inte B bara komma igang under 100 ms"): en kanal som tands
      // halls tand minst CH_MIN_ON_MS (output.ts) med sin senaste andel av lampans ljus, aven om effekten slacker den direkt.
      for (let c = 0; c < 3; c++) {
        const q = o + c, r = rgb[c] / mT;
        if (r > 0) { if (this.chOnAt[q] === 0) this.chOnAt[q] = now; this.ratio[q] = r; }
        else if (!fast && this.chOnAt[q] !== 0 && now - this.chOnAt[q] < this.chMinOn) rgb[c] = this.ratio[q] * mT;   // hall kvar
        else { this.chOnAt[q] = 0; this.ratio[q] = 0; }
      }
    }
    if (mT >= fall) { if (mT > this.lvl[i] + 0.005 || !holding) this.peakAt[i] = now; this.lvl[i] = mT; }
    else {
      // UTTONINGEN STIGER ALDRIG I LJUS (ägaren i ladan 11-07: 'när en effekt fadar en färg så kan den hacka i slutet av fade, snabbt
      // öka ljusstyrka'; spårat 11-08: byter effekten kulör på en lampa som tonar ut fick den NYA kulören den hållna nivån per kanal -
      // röd 40 -> magenta 40+40 = dubbla ljuset). Den nya kulören får högst den gamla kulörens ljus på den här nivån (output.ts sameLight).
      const prevL = this.lvl[i], fo = this.fo, fn = this.fn, sc = prevL > 0 ? fall / prevL : 0;
      fn[0] = this.ratio[o] * fall; fn[1] = this.ratio[o + 1] * fall; fn[2] = this.ratio[o + 2] * fall;
      fo[0] = this.prev[o] * sc; fo[1] = this.prev[o + 1] * sc; fo[2] = this.prev[o + 2] * sc;
      this.lvl[i] = fall;
      if (sc > 0 && sameLight(fx, fo, fn)) { rgb[0] = fo[0]; rgb[1] = fo[1]; rgb[2] = fo[2]; }   // samma ljus som den gamla kulören
      else { rgb[0] = fn[0]; rgb[1] = fn[1]; rgb[2] = fn[2]; }                              // den nya har mindre ljus: som förr
    }
    this.prev[o] = rgb[0]; this.prev[o + 1] = rgb[1]; this.prev[o + 2] = rgb[2];
  }
}
