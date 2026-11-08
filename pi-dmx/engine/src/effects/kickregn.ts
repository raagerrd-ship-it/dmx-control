import type { EffectDef } from "./types.js";
import { hsv } from "./color.js";
import { slotSize } from "./rig.js";

// (skräpjakten 10-18: förr en closure/array som skapades i render per lampa och ruta - samma räkning)
const h = (x: number, n: number) => (Math.imul(x, 2654435761) >>> 0) % n;
/** PAR (STANDARD 2026-11-08 (ladan 11-07: godkänt; backup-tagg backup/fore-tio-standard-20261108); förr PROV DMX_KICKREGN_PAR): i refrängen tänder kicken ETT PAR (lampan + den mittemot) i
 *  stället för en lampa - korpusen r 0,38 -> 0,35 efter omtaggningen 6e448a3 satt i fem klipp där kickregn tog refrängen efter
 *  tryckvag/drops med en lampa av fyra (refrängen mörkare än versen). Introt orört. */

// KICKREGN (full x intro, situationsrutnätet 2026-10-12 - rutan var tom): en fullfartslåts intro som redan har kicken. Varje slag
// tänder EN lampa (hash på slaget, ny plats varje gång) fullt på kicken och på efterslaget en annan lampa till hälften i motfärg -
// regn av slag över riggen. Övriga släckta.
// OMTAGGNING 2026-11-05 (ägaren: "fixa" - dynamik.md varför-tabellen, aldrig vald): full-tier men bara intro (introt sällan full) -> även refrängen.
export const kickregn: EffectDef = {
  key: "kickregn", label: "Kickregn", tier: "full", modulate: { energy: true, pulse: false }, section: ["intro", "high"],
  desc: "Intro i full fart: varje kick tänder en ny lampa, efterslaget en annan i motfärg.",
  render(c) {
    const g = slotSize(c.count), n = Math.max(1, Math.ceil(c.count / g)), me = Math.floor(c.idx / g);   // hyrkitet: platser om g lampor
    const on = h(c.beatIdx, n);
    let off = (on + 1 + (h(c.beatIdx + 7, n) % Math.max(1, n - 1))) % n;
    const on2 = c.section === "high" && n >= 3 ? (on + (n >> 1)) % n : -1;
    if (off === on2) off = (off + 1) % n === on ? off : (off + 1) % n;
    const base = c.mixedSector(Math.floor(c.hueIdx / 16));
    if (me === on || me === on2) return hsv(base / 6, 1, Math.min(1, 0.2 + 0.8 * Math.max(c.kickEnv, Math.exp(-c.beatFrac / 0.2))));
    if (me === off && c.beatFrac >= 0.5) return hsv(((base + 3) % 6) / 6, 1, 0.5 * Math.exp(-(c.beatFrac - 0.5) / 0.15));
    return hsv(0, 0, 0);
  },
};
