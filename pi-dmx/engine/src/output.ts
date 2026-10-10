/**
 * OUTPUT-TJÄNSTEN — översätter ljus till inkopplade lampor.
 *
 * Dirigenten, effekterna och sluttrimningen ska INTE behöva veta hur en lampa
 * fungerar. De säger "skala ljusstyrkan ×0.4" eller "kalibrera och lägg på taket";
 * den här modulen vet resten: vilken kanal som bär ljusstyrkan, vilka som är färg,
 * vilka som är specialroller (strobe/hazer/uv/blinder/laser/co2) och hur varje
 * armaturs tändpunkt ska mappas.
 *
 * Masker: `cal` = kanaler som kalibreras (färg, och dim på en fixtur utan färg), `dimCal` = dim på en färgfixtur (en konstant,
 * se EN VAG FOR LJUSET), `colorMask`/`colorGroups` = färgkanalerna per lampa (postprocess tonar per lampa), `direct` = specialroller.
 * (Ljusmasken `light` - dimmern bar ljusstyrkan och hjärtslaget - borttagen 2026-10-10.)
 */

import type { FixtureConfig } from "./config.js";
import { fixtureRoles } from "./config.js";

/** Specialsignaler som inte är färg: rök, UV, blinder osv. Motorn sätter dem,
 *  output-tjänsten placerar dem på rätt kanal. */
export interface SpecialtyValues {
  hazer: number; uv: number; blinder: number; strobe: number; laser: number; co2: number;
}

/** EN VAG FOR LJUSET (agaren 2026-10-10: "jag forstar inte varfor det maste vara separat? allt kanns bara som vi gor det krangligare
 *  och svarare att stalla in"). Forr tva vagar: energin pa fargen och taktpuls/drop/golv pa dimmern, var sin mappning och toning.
 *  Nu bar R/G/B allt och DIMMERN AR EN KONSTANT (lampans fullpunkt) - inget i motorn raknar pa den.
 *  MAPPNINGEN (sist): effektens 1..255 -> lampans tandpunkt+1 (agarens 1 %) .. MAP_TOP x tak (95 %); 0 = slackt. Bara en FULL drop
 *  oppnar de sista 5 %: taket = MAP_TOP + (1 - MAP_TOP) x dropOpen. (Backup fore: git-taggen backup/fore-ett-ljus-2026-10-10;
 *  borta: DMX_FLOOR_CH, DMX_PULSE_ROOM, dimmerns mappning/puls, DMX_DIM_FULL.) */
const MAP_TOP = Math.max(0.5, Math.min(1, Number(process.env.DMX_MAP_TOP ?? 0.95)));
const HOLD_MS = 120;
const FOG_HEAT_MAX = 45000;   // datablad: 40–50 s sprutning i sträck
const FOG_RECOVER = 0.15;     // vila dränerar 15 % av realtid  // släpp-håll: bryggar mikro-0-dippar så dioden inte strobar

// Förberäknad LUT för Gamma 2.2 för att eliminera Math.pow i den heta loopen
/** GAMMA (DMX_GAMMA, prov ladan 2026-10-09: "varfor jobbar inte effekten med starkare ljus?"): effektens 0..1 -> DMX som v^GAMMA. 2,2 gor
 *  att 0,5 -> 22 % och 0,7 -> 46 % - effekterna ligger mest 0,4-0,7 och riggen lyser darfor ~20 % vid full energi. Lagre gamma = starkare
 *  mellanlagen (men energins dampning far ocksa mindre verkan i DMX, md^GAMMA). Standard 2,2 = oforandrat. */
const GAMMA = Math.max(1, Math.min(3, Number(process.env.DMX_GAMMA ?? 1.6)));   // 2,2 -> 1,6 (ladan 10-09, standard 10-10)
const GAMMA_LUT = new Uint8Array(1024);
for (let i = 0; i < 1024; i++) {
  GAMMA_LUT[i] = Math.round(Math.pow(i / 1023, GAMMA) * 255);
}

export class FixtureOutput {
  // Publika Array-vyer så postprocess.ts slipper funktionsanrop
  public readonly direct = new Uint8Array(512);
  /** Fargkanalerna (r/g/b/w) per lampa och som mask - postprocess kor ballistiken per lampa, inte per kanal. */
  public colorGroups: number[][] = [];
  public readonly colorMask = new Uint8Array(512);

  private cal = new Uint8Array(512);
  readonly dimCal = new Uint8Array(512);   // dim på en färgfixtur: en konstant (fullpunkten), se EN VAG FOR LJUSET
  /** 1 = effekten BEGAR kanalen den har rutan (writeFixture, fore ballistiken) - matvarde for tools/dynBench (ofrivillig blink). En kanal som klingar ut efter ett
   *  kulorbyte (ballistikens svans) har 0 och mappas som forr - svansen blir varken langre eller kortare an i dag. */
  intent = new Uint8Array(512);
  // HOLD_MS: sista vardet halls over enstaka nollor (se calibrate).
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
    this.cal.fill(0); this.dimCal.fill(0); this.direct.fill(0); this.colorMask.fill(0);
    this.fastFixtures = []; this.colorGroups = [];
    let mx = 0;

    for (const fx of fixtures) {
      const roles = fixtureRoles(fx);
      const hasColor = roles.includes("r") || roles.includes("g") || roles.includes("b") || roles.includes("w");
      const hasDim = roles.includes("dim");
      const hasW = roles.includes("w");

      this.fastFixtures.push({ base: fx.address - 1, roles, hasColor, hasDim, hasW });
      const grp: number[] = [];
      for (let r = 0; r < roles.length; r++) { const ch = fx.address - 1 + r; const ro = roles[r]; if (ch >= 0 && ch < 512 && (ro === "r" || ro === "g" || ro === "b" || ro === "w")) grp.push(ch); }
      if (grp.length) { this.colorGroups.push(grp); for (const ch of grp) this.colorMask[ch] = 1; }

      for (let r = 0; r < roles.length; r++) {
        const ch = fx.address - 1 + r;
        if (ch < 0 || ch >= 512) continue;   // hög adress får aldrig skriva utanför universet
        const role = roles[r];
        const isColor = role === "r" || role === "g" || role === "b" || role === "w";
        // Specialroller skrivs direkt av motorn per frame och får INTE glidas ut av
        // ballistiken: en 255 som tonar nedåt skulle få strobe att fara mellan takter,
        // blinder att klänga kvar en halv sekund och hazer att flimra.
        if (role === "strobe" || role === "hazer" || role === "uv" || role === "blinder" || role === "laser" || role === "co2") this.direct[ch] = 1;
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
  /** SISTA STEGET FORE UTGANG - EN mappning (se EN VAG FOR LJUSET). */
  calibrate(universe: Uint8Array, fixtures: FixtureConfig[], master: number, nowMs: number, dropOpen = 0): void {
    const top = (255 * master + 0.5) | 0;
    const colTop = Math.round(top * MAP_TOP + (top - top * MAP_TOP) * Math.max(0, Math.min(1, dropOpen)));   // 95 %, full drop -> tak
    for (let f = 0; f < fixtures.length; f++) {
      const fx = fixtures[f];
      const fast = this.fastFixtures[f];
      const c = fx.cal;
      const base = fast.base;
      const on = c ? (c.on || 0) : 0;
      const dimTop = c && c.full && c.full < 255 ? Math.round(c.full * master) : top;   // FULLPUNKT (cal.full) = dimmerns konstant
      // FARGEN: lampans starkaste kanal 1..255 -> dess tandpunkt+1..colTop, alla fargkanaler med samma faktor (kuloren bevaras).
      let lampLit = true, colK = 1;
      if (c) {
        let mxRaw = 0, mxOn = on;
        for (let i = 0; i < fast.roles.length; i++) {
          const ch = base + i; if (ch < 0 || ch >= 512 || this.cal[ch] !== 1 || this.dimCal[ch] === 1) continue;
          const role = fast.roles[i]; if (role !== "r" && role !== "g" && role !== "b" && role !== "w") continue;
          if (universe[ch] > mxRaw) { mxRaw = universe[ch]; mxOn = (role === "r" ? c.onR : role === "g" ? c.onG : role === "b" ? c.onB : c.onW) ?? on; }
        }
        lampLit = mxRaw > 0;
        if (lampLit) colK = (mxOn + 1 + (colTop - mxOn - 1) * (mxRaw - 1) / 254) / mxRaw;
      }
      for (let i = 0; i < fast.roles.length; i++) {
        const ch = base + i;
        if (ch < 0 || ch >= 512) continue;
        if (this.dimCal[ch] === 1) { universe[ch] = dimTop; continue; }   // DIMMERN: konstant
        if (this.cal[ch] !== 1) continue;
        const role = fast.roles[i];
        let raw = universe[ch];
        if (role === "r" || role === "g" || role === "b" || role === "w") {   // farg: noll nollar direkt, ingen hallning
          if (!lampLit) { universe[ch] = 0; this.holdUntil[ch] = 0; continue; }
          if (colK !== 1) raw = Math.round(raw * colK);
          const v1 = raw > colTop ? colTop : raw; universe[ch] = v1; this.holdVal[ch] = v1; this.holdUntil[ch] = nowMs + HOLD_MS; continue;
        }
        // Dimmer pa en fixtur UTAN farg (monokrom): samma mappning som fargen, sista vardet halls HOLD_MS over enstaka nollor.
        let out: number;
        if (raw > 0) {
          out = Math.min(colTop, on + 1 + Math.round((colTop - on - 1) * (raw - 1) / 254));
          this.holdVal[ch] = out; this.holdUntil[ch] = nowMs + HOLD_MS;
        } else out = nowMs < this.holdUntil[ch] ? this.holdVal[ch] : 0;
        universe[ch] = out;
      }
    }
  }

  fogTick(nowMs: number, dtMs: number, want: boolean, fog: {
    enabled?: boolean; burstMs: number; cooldownMs: number;
    warmStartMs?: number; sprayMs?: number; bursts?: number;
  }, manual = false): boolean {
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
    const gapOk = manual || nowMs - this.lastFogMs > fog.cooldownMs;   // manuell puff (Rok nu) kringgar cooldownen
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
   * Har fixturen en dim skrivs den här, men kalibreringen sätter den till lampans fullpunkt (en konstant);
   * ljusstyrkan bärs av färgen.
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
    // (skrapjakten 10-01: forr .find med en closure per lampa och ruta; samma forsta traff med en slinga)
    const want = fx.address - 1;
    let fast: (typeof this.fastFixtures)[number] | undefined;
    for (let k = 0; k < this.fastFixtures.length; k++) if (this.fastFixtures[k].base === want) { fast = this.fastFixtures[k]; break; }
    if (!fast) return;

    const base = fast.base;   // DMX är 1-indexerat
    const m = clamp01(master);
    const r = rgb[0], g = rgb[1], b = rgb[2];
    const w = Math.min(r, g, b);
    const dim = Math.max(r, g, b);
    const colorScale = fast.hasDim ? 1 : m;

    for (let i = 0; i < fast.roles.length; i++) {
      const ch = base + i;
      if (ch < 0 || ch >= 512) continue;

      switch (fast.roles[i]) {
        case "r":       { const x = clamp01((r - (fast.hasW ? w : 0)) * colorScale), q = GAMMA_LUT[(x * 1023) | 0]; u[ch] = q; this.intent[ch] = x > 0 ? 1 : 0; break; }
        case "g":       { const x = clamp01((g - (fast.hasW ? w : 0)) * colorScale), q = GAMMA_LUT[(x * 1023) | 0]; u[ch] = q; this.intent[ch] = x > 0 ? 1 : 0; break; }
        case "b":       { const x = clamp01((b - (fast.hasW ? w : 0)) * colorScale), q = GAMMA_LUT[(x * 1023) | 0]; u[ch] = q; this.intent[ch] = x > 0 ? 1 : 0; break; }
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
