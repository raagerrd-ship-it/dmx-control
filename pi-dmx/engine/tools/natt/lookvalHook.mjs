// LOOKVALET (nattagenten 2026-11-21): varför väljs en effekt aldrig? Preload-krok för showTight (ändrar inget i motorn, bara läser):
//   LOOKVAL_UT=ut.json node --import ./tools/natt/lookvalHook.mjs tools/showTight.mjs <wav>
// Vid varje lookbyte i smart-läget sparas sektion, tier, bpm, profil och valet; analysera med tools/natt/lookval.py.
import { writeFileSync } from "node:fs";
const DIST = new URL("../../dist/", import.meta.url).href;
const { EffectEngine } = await import(DIST + "effects.js");
const orig = EffectEngine.prototype.switchLook; const rows = [];
EffectEngine.prototype.switchLook = function (frame, bpm, tierS, tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, ...rest) {
  const before = this.smartMode; const r = orig.call(this, frame, bpm, tierS, tierName, bassClear, allaBuild, buildEntry, buildExit, dropSwitch, liveSec, ...rest);
  const p = frame.profile ?? {};
  rows.push({ t: this.rNowWall, sec: liveSec, tier: tierName, bpm, bassClear, allaBuild, drop: dropSwitch, land: this.landForce, from: before, to: this.smartMode,
    why: this.switchWhy, manusTog: this.manusTog, p: { punch: p.punch, bass: p.bass, bright: p.bright, beat: p.beat, bassline: p.bassline } });
  return r;
};
process.on("exit", () => writeFileSync(process.env.LOOKVAL_UT || "lookval.json", JSON.stringify(rows)));
