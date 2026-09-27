/** RATTEN "LÄGSTA NIVÅ" BITER? (2026-09-27) Kör en WAV genom den riktiga analysatorn + effektmotorn på virtuell klocka
 *  med cfg.levelWindowDb = 6 / 10 / 14 (eller --win a,b,c; "x" = fältet lämnas orört) och mäter LIVE_LEVEL-formen
 *  (liveShapeRaw per render, 40 Hz): andel frames med sh > 0 (ljuset ovanför golvet), andel sh >= 1 (klippt i taket),
 *  medel — samt md5 över hela sh-sekvensen så två byggen kan jämföras bit för bit (--dist <katalog> pekar på ett
 *  annat dist/, t.ex. en kopia av bygget före en ändring; katalogen måste ligga under engine/ för node_modules).
 *  OBS: riggens DMX-summa duger INTE som jämförelse — dirigenten drar Math.random vid lookval, så den skiljer mellan
 *  två identiska körningar. sh-sekvensen är deterministisk.
 *    node tools/levelWindowSweep.mjs tools/pop_ladan.wav [--win 6,10,14] [--dist dist-before] [--sekunder 600]
 *  Env LIVE_WIN_DB vinner över fältet — kör utan den för att mäta ratten. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const wav = args.find((a) => a.endsWith(".wav")) || "tools/pop_ladan.wav";
const distDir = opt("--dist", null);
const dist = distDir ? pathToFileURL(resolve(distDir) + "/").href : new URL("../dist/", import.meta.url).href;
const wins = String(opt("--win", "6,10,14")).split(",").map(Number);
const secs = Number(opt("--sekunder", 1e9));
const { Analyser } = await import(dist + "analyser.js");
const { EffectEngine } = await import(dist + "effects.js");
const { defaultConfig } = await import(dist + "config.js");
const { EFFECT_KEYS } = await import(dist + "effects/registry.js");
const d = readFileSync(wav); const n = (d.length - 44) >> 1; const SR = 48000, HOP = 128, EPOCH = 1700000000000;
const buf = new Float32Array(HOP);
const log = console.log; console.log = () => {};   // motorns [dirigent]/[lagniva]-rader tystas
log(`${wav}  dist=${dist}  env LIVE_WIN_DB=${process.env.LIVE_WIN_DB ?? "(ej satt)"}`);
log("win dB | sh>0    | sh>=1   | medel sh | form-md5 (sh-sekvensen)");
for (const win of wins) {
  // Samma rigg som showBench (ladans config): smart, alla lookar, master 1.
  const cfg = JSON.parse(JSON.stringify(defaultConfig));
  cfg.mode = "smart"; cfg.energyDrivesMode = true; cfg.beatPulse = true; cfg.master = 1; cfg.energyCeiling = true;
  cfg.rotation = {}; for (const k of EFFECT_KEYS) cfg.rotation[k] = true;
  if (Number.isFinite(win)) cfg.levelWindowDb = win;
  const an = new Analyser(JSON.parse(JSON.stringify(defaultConfig))); an.setGainLock(true, 1);
  const eng = new EffectEngine(cfg);
  const h = createHash("md5"); let lastRender = -1, frames = 0, on = 0, clip = 0, sum = 0;
  for (let off = 0; off + HOP <= n && off / SR < secs; off += HOP) {
    for (let i = 0; i < HOP; i++) buf[i] = d.readInt16LE(44 + (off + i) * 2) / 32768;
    const ms = EPOCH + (off / SR) * 1000; an.setVirtualClock(ms);
    Date.now = () => ms; performance.now = () => ms - EPOCH;
    const fr = an.process(buf);
    if (fr.bpm > 0) cfg.beat = { anchorMs: fr.beatAnchorMs || ms, bpm: fr.bpm, confidence: fr.bpmConfidence };
    if (ms - lastRender >= 25) {
      lastRender = ms; eng.render(fr);
      const sh = eng.liveShapeRaw; frames++; if (sh > 0) on++; if (sh >= 1) clip++; sum += sh; h.update(sh.toFixed(6));
    }
  }
  log(`${String(Number.isFinite(win) ? win : "(orört)").padStart(7)} | ${(100 * on / frames).toFixed(1).padStart(5)} % | ${(100 * clip / frames).toFixed(1).padStart(5)} % | ${(sum / frames).toFixed(3).padStart(8)} | ${h.digest("hex")}`);
}
