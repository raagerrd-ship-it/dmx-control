/**
 * OUTPUT-TJÄNSTEN — översätter ljus till inkopplade lampor.
 *
 * Dirigenten, effekterna och sluttrimningen ska INTE behöva veta hur en lampa
 * fungerar. De säger "skala ljusstyrkan ×0.4" eller "kalibrera och lägg på taket";
 * den här modulen vet resten: vilken kanal som bär ljusstyrkan, vilka som är färg,
 * vilka som är specialroller (strobe/hazer/uv/blinder/laser/co2) och hur varje
 * armaturs tändpunkt ska mappas.
 *
 * MOTIVET ÄR MÄTT (2026-08-07): kunskapen låg utspridd i ljustaket, hjärtslaget,
 * drop-headroom och kalibreringen — var och en via en kanalmask som måste minnas
 * att `dim` finns. Den glömdes: i en rigg med rollerna [dim,r,g,b,strobe,…] låg dim
 * på 183/255 medan färgkanalerna låg på 17 och 0, och eftersom masken uteslöt dim
 * nådde hjärtslaget aldrig lamporna (autokorrelation på DMX-utgången +0,09 vid
 * takten mot +0,11 för kontrollfördröjningen = ren slump). Efter inkapslingen:
 * +0,81 mot +0,24.
 *
 * Två masker med SKILDA syften — de var förut en, vilket var själva felet:
 *   light : kanalen som bär LJUSSTYRKAN (dim om fixturen har en, annars färgen).
 *           Bara en av dem, annars blir dämpningen kvadratisk.
 *   cal   : kanaler som ska KALIBRERAS — färg (och dim på en fixtur utan färg).
 *           Tändpunkten är en egenskap hos dioden; dim har ingen. Att ta med dim
 *           här komprimerade bort hjärtslaget (autokorrelation föll 0,53 → 0,15).
 */

import type { FixtureConfig } from "./config.js";
import { fixtureRoles } from "./config.js";

/** Specialsignaler som inte är färg: rök, UV, blinder osv. Motorn sätter dem,
 *  output-tjänsten placerar dem på rätt kanal. */
export interface SpecialtyValues {
  hazer: number; uv: number; blinder: number; strobe: number; laser: number; co2: number;
}

const HOLD_MS = 120;
const FOG_HEAT_MAX = 45000;   // datablad: 40–50 s sprutning i sträck
const FOG_RECOVER = 0.15;     // vila dränerar 15 % av realtid  // släpp-håll: bryggar mikro-0-dippar så dioden inte strobar

// Förberäknad LUT för Gamma 2.2 för att eliminera Math.pow i den heta loopen
const GAMMA_LUT = new Uint8Array(1024);
for (let i = 0; i < 1024; i++) {
  GAMMA_LUT[i] = Math.round(Math.pow(i / 1023, 2.2) * 255);
}

export class FixtureOutput {
  // Publika Array-vyer så postprocess.ts slipper funktionsanrop
  public readonly light = new Uint8Array(512);
  public readonly direct = new Uint8Array(512);

  private cal = new Uint8Array(512);
  private dimCal = new Uint8Array(512);   // dim: bara tändpunkt (clamp), ingen remap
  private holdVal = new Float32Array(512);
  private holdUntil = new Float32Array(512);
  private builtFor: unknown = null;
  // Rökmaskinens tillstånd — enhetens egen, inte musikens.
  private fogUntil = 0;         // pågående puff till (wall-clock ms)
  private lastFogMs = -1e9;     // senaste puff (cooldown)
  private fogHeat = 0;          // värmekonto (ms)
  private fogWasEnabled = false;
  /** Högsta använda kanal + 1 — loopar behöver aldrig gå längre. */
  maxCh = 0;

  // Pre-kalkylerade fixtur-analyser för att slippa strängjämförelser i writeFixture
  private fastFixtures: Array<{
    base: number;
    roles: string[];
    hasColor: boolean;
    hasDim: boolean;
    hasW: boolean;
  }> = [];

  /** Bygg om maskerna när fixture-listan byts (referensjämförelse → gratis per frame). */
  build(fixtures: FixtureConfig[]): void {
    if (this.builtFor === fixtures) return;
    this.builtFor = fixtures;
    this.light.fill(0); this.cal.fill(0); this.dimCal.fill(0); this.direct.fill(0);
    this.fastFixtures = [];
    let mx = 0;

    for (const fx of fixtures) {
      const roles = fixtureRoles(fx);
      const hasColor = roles.includes("r") || roles.includes("g") || roles.includes("b") || roles.includes("w");
      const hasDim = roles.includes("dim");
      const hasW = roles.includes("w");

      this.fastFixtures.push({ base: fx.address - 1, roles, hasColor, hasDim, hasW });

      for (let r = 0; r < roles.length; r++) {
        const ch = fx.address - 1 + r;
        if (ch < 0 || ch >= 512) continue;   // hög adress får aldrig skriva utanför universet
        const role = roles[r];
        const isColor = role === "r" || role === "g" || role === "b" || role === "w";
        // Specialroller skrivs direkt av motorn per frame och får INTE glidas ut av
        // ballistiken: en 255 som tonar nedåt skulle få strobe att fara mellan takter,
        // blinder att klänga kvar en halv sekund och hazer att flimra.
        if (role === "strobe" || role === "hazer" || role === "uv" || role === "blinder" || role === "laser" || role === "co2") this.direct[ch] = 1;
        if (role === "dim") this.light[ch] = 1;
        else if (isColor && !hasDim) this.light[ch] = 1;
        if (isColor || (role === "dim" && !hasColor)) this.cal[ch] = 1;
        // DIM PÅ EN FÄRGFIXTUR: tändpunkten gäller ändå — dioden lyser inte under den —
        // men bara som ett GOLV. Full remap (1..255 → on..tak) skulle komprimera
        // hjärtslaget, vilket mättes: autokorrelationen på utgången föll 0,53 → 0,15.
        else if (role === "dim") this.dimCal[ch] = 1;
        if (ch + 1 > mx) mx = ch + 1;
      }
    }
    this.maxCh = Math.min(512, mx);
  }

  /**
   * Skala ljusstyrkan på alla fixturer. Anroparen behöver inte veta något om lampor.
   * @param mul 0..1 multiplikator
   */
  scale(universe: Uint8Array, mul: number): void {
    for (let ch = 0; ch < this.maxCh; ch++) {
      if (!this.light[ch]) continue;
      const v = universe[ch];
      if (v === 0) continue;                       // redan släckt — lämna det så
      const out = (v * mul + 0.5) | 0;             // Bitvis avrundning
      universe[ch] = out < 1 ? 1 : out;            // tänt förblir tänt
    }
  }

  /**
   * GE HJÄRTSLAGET UTRYMME ATT PULSA I.
   * En lugn effekt kan ligga strax över tändpunkten — MÄTT 2026-08-07 gav `breathe`
   * DMX 18 med tändpunkt 16. Pulsen vill då ta 18 → 8, men kalibreringsgolvet lyfter
   * tillbaka till 16: åtta av tio steg äts upp och slaget syns inte alls.
   * Lösningen är inte att ändra pulsen utan att se till att det FINNS mörker under
   * ljuset. Allt som lyser men ligger under `on + room` lyfts till den nivån; ljusa
   * partier rörs inte. Effekten blir att lugna lägen ligger på ~20 % i stället för 7 %
   * — vilket också var önskemålet "behåll gärna 20 % ljusstyrka".
   * @param room hur många DMX-steg över tändpunkten som minsta nivå ska ligga
   */
  ensurePulseRoom(universe: Uint8Array, fixtures: FixtureConfig[], room: number): void {
    // Vi kan iterera via this.fastFixtures här för snabbare lookup
    for (let f = 0; f < fixtures.length; f++) {
      const fx = fixtures[f];
      const fast = this.fastFixtures[f];
      const on = fx.cal ? (fx.cal.on || 0) : 0;
      const min = on + room;
      const base = fast.base;
      for (let i = 0; i < fast.roles.length; i++) {
        const ch = base + i;
        if (ch < 0 || ch >= 512 || !this.light[ch]) continue;
        const v = universe[ch];
        if (v > 0 && v < min) universe[ch] = min;
      }
    }
  }

  /** Kläm ljusstyrkan mot ett tak i byte (drop-headroom) — skalar inte, klipper bara. */
  cap(universe: Uint8Array, capByte: number): void {
    for (let ch = 0; ch < this.maxCh; ch++) {
      if (this.light[ch] && universe[ch] > capByte) universe[ch] = capByte;
    }
  }

  /**
   * SISTA STEGET FÖRE UTGÅNG: tändpunkt som GOLV + master som TAK.
   */
  calibrate(universe: Uint8Array, fixtures: FixtureConfig[], master: number, nowMs: number): void {
    const top = (255 * master + 0.5) | 0;
    for (let f = 0; f < fixtures.length; f++) {
      const fx = fixtures[f];
      const fast = this.fastFixtures[f];
      const c = fx.cal;
      const base = fast.base;
      const on = c ? (c.on || 0) : 0;

      for (let i = 0; i < fast.roles.length; i++) {
        const ch = base + i;
        if (ch < 0 || ch >= 512) continue;
        const isCal = this.cal[ch] === 1, isDim = this.dimCal[ch] === 1;
        if (!isCal && !isDim) continue;

        const role = fast.roles[i];
        const onCh = !c ? 0 : isDim ? on
          : ((role === "r" ? c.onR : role === "g" ? c.onG : role === "b" ? c.onB : role === "w" ? c.onW : undefined) ?? on);

        const raw = universe[ch];
        let out: number;
        if (raw > 0) {
          out = raw < onCh ? onCh : raw > top ? top : raw;
          this.holdVal[ch] = out;
          this.holdUntil[ch] = nowMs + HOLD_MS;
        } else if (nowMs < this.holdUntil[ch]) {
          out = this.holdVal[ch];
        } else {
          out = 0;
        }
        universe[ch] = out;
      }
    }
  }

  fogTick(nowMs: number, dtMs: number, want: boolean, fog: {
    enabled?: boolean; burstMs: number; cooldownMs: number;
    warmStartMs?: number; sprayMs?: number; bursts?: number;
  }): boolean {
    if (!fog.enabled) {
      if (this.fogWasEnabled) {   // avstängd → glöm uppvärmning och släpp pågående puff,
        this.fogWasEnabled = false;   // annars fastnar rök-kanalen tänd
        fog.warmStartMs = 0;
        this.fogUntil = 0;
      }
      return false;
    }
    // Flank: maskinen slogs precis på → starta uppvärmningsklockan. Sätts bara om den
    // saknas, så en omstart ärver den riktiga påslagstiden.
    if (!this.fogWasEnabled) { this.fogWasEnabled = true; if (!fog.warmStartMs) fog.warmStartMs = nowMs; }
    const spraying = nowMs < this.fogUntil;
    if (spraying) {
      this.fogHeat += dtMs;
      fog.sprayMs = (fog.sprayMs ?? 0) + dtMs;   // drifträknare (vätska + värmearbete)
    } else {
      this.fogHeat = Math.max(0, this.fogHeat - dtMs * FOG_RECOVER);
    }
    if (spraying && this.fogHeat >= FOG_HEAT_MAX) this.fogUntil = 0;   // nödstopp
    const gapOk = nowMs - this.lastFogMs > fog.cooldownMs;
    const heatOk = this.fogHeat + fog.burstMs <= FOG_HEAT_MAX;
    if (want && !spraying && gapOk && heatOk) {
      this.fogUntil = nowMs + fog.burstMs;
      this.lastFogMs = nowMs;
      fog.bursts = (fog.bursts ?? 0) + 1;
    }
    return nowMs < this.fogUntil;
  }

  fogState(nowMs: number): { spraying: boolean; heat: number } {
    return { spraying: nowMs < this.fogUntil, heat: Math.min(1, this.fogHeat / FOG_HEAT_MAX) };
  }

  writeFog(u: Uint8Array, address: number, level: number): void {
    const ch = address - 1;
    if (ch >= 0 && ch < 512) u[ch] = Math.max(0, Math.min(255, (level + 0.5) | 0));
  }

  /**
   * SKRIV EN FIXTUR: abstrakt färg + specialsignaler → dess faktiska kanaler.
   * Effekterna returnerar [r,g,b] i 0..1 och vet ingenting om kanaler; hela
   * översättningen bor här. En ny fixturtyp kräver bara en rolltabell.
   *
   * RGBW: vitt = min(r,g,b) så färgkanalerna behåller sin mättnad.
   * Har fixturen en dim bär DEN ljusstyrkan (färgen skalas inte av master), annars
   * skalas färgen — samma princip som `light`-masken ovan.
   */
  writeFixture(
    u: Uint8Array,
    fx: FixtureConfig,
    rgb: [number, number, number],
    master: number,
    strobeVal = 0,
    specialty?: SpecialtyValues,
  ): void {
    // Hitta indexet i cfg.fixtures som matchar för att ta fram fastFixture
    // Alternativt kan anroparen skicka med indexet för O(1) lookup. För nu loopar vi:
    const fast = this.fastFixtures.find(f => f.base === fx.address - 1);
    if (!fast) return;

    const base = fast.base;   // DMX är 1-indexerat
    const m = clamp01(master);
    const [r, g, b] = rgb;
    const w = Math.min(r, g, b);
    const dim = Math.max(r, g, b);
    const colorScale = fast.hasDim ? 1 : m;

    for (let i = 0; i < fast.roles.length; i++) {
      const ch = base + i;
      if (ch < 0 || ch >= 512) continue;

      switch (fast.roles[i]) {
        case "r":       u[ch] = GAMMA_LUT[(clamp01((r - (fast.hasW ? w : 0)) * colorScale) * 1023) | 0]; break;
        case "g":       u[ch] = GAMMA_LUT[(clamp01((g - (fast.hasW ? w : 0)) * colorScale) * 1023) | 0]; break;
        case "b":       u[ch] = GAMMA_LUT[(clamp01((b - (fast.hasW ? w : 0)) * colorScale) * 1023) | 0]; break;
        case "w":       u[ch] = GAMMA_LUT[(clamp01(w * colorScale) * 1023) | 0]; break;
        case "dim":     u[ch] = GAMMA_LUT[(clamp01(fast.hasColor ? m : dim * m) * 1023) | 0]; break;
        case "strobe":  u[ch] = Math.max(0, Math.min(255, Math.max(strobeVal, specialty?.strobe ?? 0))); break;
        case "hazer":   u[ch] = specialty?.hazer   ?? 0; break;
        case "uv":      u[ch] = specialty?.uv      ?? 0; break;
        case "blinder": u[ch] = specialty?.blinder ?? 0; break;
        case "laser":   u[ch] = specialty?.laser   ?? 0; break;
        case "co2":     u[ch] = specialty?.co2     ?? 0; break;
      }
    }
  }
}

const clamp01 = (x: number) => x < 0 ? 0 : x > 1 ? 1 : x;
