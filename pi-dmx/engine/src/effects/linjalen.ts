import type { EffectDef } from "./types.js";

// LINJALEN (labb 6, ägaren i ladan 2026-11-13 med åtta lampor: "detta är en vers effekt, inte refräng, men den är snygg!"): takten
// ritad över raden. Alla lampor andas med basen i EN kulör (golv .. 65 %), och en LÖPARE flyttar sig en lampa per slag (bastakten),
// ettan störst (95 %), åtta slag = två takter över raden; hållet byter efter varje varv. Fyra takter är löparen en REN grundfärg som
// inte är grundens (röd/grön/blå), fyra takter är den SVART - en släckt lampa som vandrar genom de tända.
// Ägarens ord som formen bygger på: "samma färg på alla och då en färg på den som åker, och inte alltid från samma håll" · "den borde
// ju flytta sig till bastakten" · "de andra går mellan floor och säg 65%, så får löparen köra upp till 95%" · "hoppande färgen
// kanske bara får vara Röd, Grön, Blå eller Svart" · "färgen måste alltid vara en annan än vad alla lampor kör" · "lägg på en lång
// fade out på löparen, gör inget om två lampor smetas" · "tänk att svart är avstängd".
// EFFEKTEN ÄGER LJUSET (own, types.ts): värdena är andel av lampans ljus, motorn lägger inget på, och 0/0/0 är släckt.
// Samma räkning som src/lab6.ts 'linjalen' (prov: tools/linjalenProv.mjs jämför dem ruta för ruta).
const TOP = 0.95, VOL_TAU_S = 5, VOL_REF = 0.2;                       // som stundernas närvaro (moment.ts): volymen följd över 5 s
const SECT: [number, number, number][] = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1], [1, 0, 1]];
const col = (s: number) => SECT[((Math.round(s) % 6) + 6) % 6];
const st = { at: 0, vol: 0, eSm: 0, eHi: 0, eLo: 1, runLv: new Float32Array(64), runK: -1, runPeak: 0, out: new Float32Array(192), n: 0 };
const put = (i: number, s: number, share: number) => {
  const v = TOP * Math.max(0, Math.min(1, share)), o = i * 3, c = col(s);
  if (v > Math.max(st.out[o], st.out[o + 1], st.out[o + 2])) { st.out[o] = c[0] * v; st.out[o + 1] = c[1] * v; st.out[o + 2] = c[2] * v; }
};
export const linjalen: EffectDef = {
  key: "linjalen", label: "Linjalen", tier: "fart", modulate: { energy: false, pulse: false }, section: ["low"], toggle: true, own: true,
  desc: "Vers: alla lampor andas med basen i en kulör, en löpare i ren kontrastfärg - eller en släckt lampa - går ett steg per slag.",
  render(c) {
    if (c.now !== st.at) {                                              // en gång per ruta: hela raden räknas här
      const dt = st.at > 0 ? Math.min(0.2, Math.max(0, (c.now - st.at) / 1000)) : 0.025; st.at = c.now;
      const n = Math.max(1, Math.min(64, c.count)); st.n = n; st.out.fill(0, 0, n * 3);
      st.vol += (c.frame.level - st.vol) * Math.min(1, dt / VOL_TAU_S);
      const presence = Math.min(1, st.vol / VOL_REF), kick = c.drum.kick, body = c.bassBody;
      const energy = 0.4 + 0.6 * Math.min(1, Math.max(kick, body));
      const sect = c.mixedSector(Math.floor(c.beatIdx / 32));           // grundens kulör, byts var åttonde takt (på ettan)
      const k = ((c.beatIdx % 8) + 8) % 8, fr = c.beatFrac;             // slaget i tvåtaktsfrasen och hur långt in i det
      const rev = ((Math.floor(c.beatIdx / 8) % 2) + 2) % 2 === 1;      // hållet byter efter varje varv
      const at = (kk: number) => { const x = Math.min(n - 1, Math.floor(kk * n / 8)); return rev ? n - 1 - x : x; };
      // grunden andas mot basens EGET spann de senaste sekunderna (lägst..högst): syns oavsett hur stark basen är
      const x0 = Math.min(1, Math.max(kick, body)); st.eHi = Math.max(x0, st.eHi - dt * 0.15); st.eLo = Math.min(x0, st.eLo + dt * 0.15);
      const eNow = st.eHi - st.eLo > 0.08 ? (x0 - st.eLo) / (st.eHi - st.eLo) : 0; st.eSm += (eNow - st.eSm) * (eNow > st.eSm ? Math.min(1, dt / 0.03) : Math.min(1, dt / 0.25));
      const hole = ((Math.floor(c.beatIdx / 16) % 2) + 2) % 2 === 1, i = at(k);
      const run = sect % 2 === 1 ? sect + 3 : sect + 2;                 // ren grundfärg som inte är grundens
      // löparens färg tonar ut över ~2 slag per lampa (tidskonstant 0,8 slag), intoning 40 ms
      const bpm = c.frame.bpm > 40 ? c.frame.bpm : 120, dec = Math.exp(-(dt * bpm / 60) / 0.8);
      for (let x = 0; x < n; x++) st.runLv[x] *= dec;
      if (k !== st.runK) { st.runK = k; st.runPeak = 0; }
      if (hole && c.hasBeat) st.runLv[i] = 0;                           // hålets lampa är svart även om löparens färg nyss stod där
      if (!hole && c.hasBeat) {
        if (fr < 0.25) st.runPeak = Math.max(st.runPeak, (k % 4 === 0 ? 1 : 0.9) * energy * presence);
        const up = 40 * bpm / 60000;
        st.runLv[i] = Math.max(st.runLv[i], st.runPeak * (fr < up ? fr / up : Math.exp(-(fr - up) / 0.8)));
      }
      for (let x = 0; x < n; x++) {
        const g = ((hole ? 0.22 : 0.05) + (hole ? 0.46 : 0.63) * st.eSm * presence) / TOP * 0.95;   // golv .. 65 %
        const r = st.runLv[x], back = r < 0.12 ? 1 - r / 0.12 : 0;      // grunden tillbaka först när löparens färg slocknat (aldrig blandat)
        if (r > 0.01) put(x, run, r);
        put(x, sect, hole && c.hasBeat && x === i ? 0 : g * back);      // hålet: 0/0/0 hela slaget
      }
    }
    const o = Math.min(st.n - 1, c.lamp) * 3;
    return [st.out[o], st.out[o + 1], st.out[o + 2]];
  },
};
