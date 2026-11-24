/**
 * RÖKEN SOM NYCKELKNIPPA (2026-11-24; ägarens nyckelmodell 11-22: "det går ju lägga till rökmaskinens nyckel att det är max var 30e
 * sekund osv"). Hela rökbeslutet bor här. Motorn (effects.ts) lämnar rutans händelser, output.writeFog skriver kanalen.
 *
 * En puff startar när ALLA nycklar i en knippa hålls. En knippa per anledning: en ny anledning är en ny knippa, inte en ELLER-formel.
 * Loggen säger knippan och dess nycklar, eller vilken nyckel som föll när anledningen fanns men puffen uteblev.
 *
 * Uppvärmningen (fog.warmupMs) är INGEN nyckel: den är en nedräkning i UI:t och spärrar inga puffar (en maskin kan stå varm efter en
 * motoromstart, config.ts). Värmebudgeten och nödstoppet är maskinskyddet; PAUS är den musikaliska glesheten.
 */
import type { EngineConfig } from "./config.js";
import { isLogOn } from "./quiet.js";

const HUNGER_MS = 300000;   // HUNGER (ägaren i ladan 10-04: "har rökmaskinen inte kört på kanske 5 min, gör det enklare att köra en puff")
const VARME_MAX = 45000;    // VARMEBUDGET: databladet säger 40–50 s sprutning i sträck
const VARME_ATER = 0.15;    // vila dränerar 15 % av realtid

// NYCKLARNA: en rad per nyckel = bit. Villkoret står på nyckelns rad i step().
const RK = { DROP: 0, MINIDROP: 1, REFRANG: 2, KNAPP: 3, EFFEKT: 4, AUTO: 5, HUNGER: 6, EJ_STUND: 7, PAUS: 8, LEDIG: 9, VARMEBUDGET: 10 } as const;
const RK_NAMN = Object.keys(RK).map((s) => s.replace(/_/g, ' '));
const B = (...k: number[]): number => k.reduce((m, i) => m | (1 << i), 0);
const namn = (m: number): string => RK_NAMN.filter((_, i) => m & (1 << i)).join(' ');
const SPARR = B(RK.EJ_STUND, RK.PAUS, RK.LEDIG, RK.VARMEBUDGET);   // spärrarna: saknas bara en spärr fanns anledningen, och loggen säger vilken som föll
const KNIPPOR: readonly { namn: string; n: number }[] = [   // ordningen = vilken knippa loggen nämner när flera öppnar samma ruta
  { namn: 'DROP', n: B(RK.DROP, RK.AUTO) | SPARR },
  { namn: 'KNAPP', n: B(RK.KNAPP, RK.LEDIG, RK.VARMEBUDGET) },   // Rök nu kringgår PAUS (ladan 09-04: knappen tappades tyst inom 2 min efter en drop-rök) och gäller även under en stund
  { namn: 'EFFEKT', n: B(RK.EFFEKT) | SPARR },
  { namn: 'HUNGER MINIDROP', n: B(RK.MINIDROP, RK.HUNGER, RK.AUTO) | SPARR },
  { namn: 'HUNGER REFRANG', n: B(RK.REFRANG, RK.HUNGER, RK.AUTO) | SPARR },
];

export class Rok {
  /** Rutans klocka och steg (ms) via fält, inte argument (decimaltal som argument packas in varje ruta, se output.ts calMaster). */
  now = 0.5; dt = 0.5;
  private until = 0;            // pågående puff till (ms)
  private last = -1e9;          // senaste puffens start
  private start = Date.now();   // motorstart: hungern räknas tidigast härifrån
  private heat = 0;             // värmekonto (ms)
  private on = false;           // maskinen var påslagen förra rutan
  private sec = '';             // senaste sektion (REFRANG = inträdet i high)
  private nej = -1;             // senast loggade nekande (en loggrad per ändring)

  /** EN RUTA: sant = maskinen sprutar. Händelserna gäller rutan de kommer i (ingen hålltid). */
  step(fog: NonNullable<EngineConfig["fog"]>, drop: boolean, mini: boolean, sec: string, knapp: boolean, effekt: boolean, stund: boolean): boolean {
    const now = this.now, dt = this.dt;
    const refrang = sec === 'high' && this.sec !== '' && this.sec !== 'high';
    if (sec) this.sec = sec;
    if (!fog.enabled) {
      if (this.on) { this.on = false; fog.warmStartMs = 0; this.until = 0; }   // avstängd: glöm uppvärmningen och släpp pågående puff, annars fastnar rök-kanalen tänd
      return false;
    }
    if (!this.on) { this.on = true; if (!fog.warmStartMs) fog.warmStartMs = now; }   // påslagen: uppvärmningsklockan startar (bara om den saknas, så en omstart ärver den riktiga påslagstiden)
    const spraying = now < this.until;
    if (spraying) { this.heat += dt; fog.sprayMs = (fog.sprayMs ?? 0) + dt; }   // drifträknare (vätska + värmearbete)
    else this.heat = Math.max(0, this.heat - dt * VARME_ATER);
    if (spraying && this.heat >= VARME_MAX) this.until = 0;   // nödstopp
    const held = (drop ? 1 << RK.DROP : 0)                                           // DROP         full drop den här rutan
      | (mini ? 1 << RK.MINIDROP : 0)                                               // MINIDROP     minidrop-looken eller en nästan-drop den här rutan (ladan 11-01: 6 nästan-drop på 2,5 min, ingen minidrop)
      | (refrang ? 1 << RK.REFRANG : 0)                                             // REFRANG      musiken gick in i high den här rutan
      | (knapp ? 1 << RK.KNAPP : 0)                                                 // KNAPP        Rök nu, eller första dansens puff (moment.ts)
      | (effekt ? 1 << RK.EFFEKT : 0)                                               // EFFEKT       en effekt bad om rök (ctx.want.fog)
      | (fog.onDrop ? 1 << RK.AUTO : 0)                                             // AUTO         "rök på drop" är på
      | (now - Math.max(this.last, this.start) > HUNGER_MS ? 1 << RK.HUNGER : 0)    // HUNGER       ingen puff på 5 min (räknat tidigast från motorstart)
      | (!stund ? 1 << RK.EJ_STUND : 0)                                             // EJ STUND     ingen bröllopsstund pågår (under en stund: bara knappen)
      | (now - this.last > fog.cooldownMs ? 1 << RK.PAUS : 0)                       // PAUS         längre än cooldownMs sedan förra puffen startade
      | (!spraying ? 1 << RK.LEDIG : 0)                                             // LEDIG        ingen puff pågår
      | (this.heat + fog.burstMs <= VARME_MAX ? 1 << RK.VARMEBUDGET : 0);           // VARMEBUDGET  puffen ryms i värmekontot
    let door = -1, fall = -1;   // fall = första knippan där bara spärrar saknas
    for (let i = 0; i < KNIPPOR.length && door < 0; i++) {
      const miss = KNIPPOR[i].n & ~held;
      if (miss === 0) door = i; else if (fall < 0 && (miss & ~SPARR) === 0) fall = i;
    }
    if (door >= 0) {
      this.until = now + fog.burstMs; this.last = now; fog.bursts = (fog.bursts ?? 0) + 1;
      if (isLogOn()) console.log(`[rok] knippa ${KNIPPOR[door].namn}: ${namn(KNIPPOR[door].n)}`);
    }
    const nej = door < 0 && fall >= 0 ? fall * 2048 + (KNIPPOR[fall].n & ~held) : -1;
    if (nej !== this.nej) {
      this.nej = nej;
      if (nej >= 0 && isLogOn()) console.log(`[rok] ${KNIPPOR[fall].namn} föll på ${namn(KNIPPOR[fall].n & ~held)}`);
    }
    return now < this.until;
  }

  /** För UI:t: sprutar maskinen nu, och värmekontot 0..1. */
  state(nowMs: number): { spraying: boolean; heat: number } {
    return { spraying: nowMs < this.until, heat: Math.min(1, this.heat / VARME_MAX) };
  }
}
