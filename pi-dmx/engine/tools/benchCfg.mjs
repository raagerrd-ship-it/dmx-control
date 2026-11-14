// BÄNKENS CONFIG = LADANS (natt 2026-11-14). Bänkarna körde defaultConfig: 4 lampor, släckgräns 0,05, lead 50 ms - ladan kör 8 lampor,
// 0,015 och 90 ms. På rent ljud (nivå-median 0,16) släckte bänken därför riggen 22-27 % av tiden (längst 21 s) där ladan lyser.
//   import { ladanCfg } from "./benchCfg.mjs";  const cfg = ladanCfg(defaultConfig);
// Lägger tools/ladanCfg.json (ögonblicksbild av Pi:ns config, bara nycklar som skiljer från standard) ovanpå en kopia av defaultConfig.
// DMX_BENCH_CFG=standard -> ren defaultConfig (som före 11-14, för jämförelse); DMX_BENCH_CFG=<fil.json> -> en annan bild.
import { readFileSync } from "node:fs";
export function ladanCfg(defaultConfig) {
  const cfg = JSON.parse(JSON.stringify(defaultConfig)), v = process.env.DMX_BENCH_CFG;
  if (v === "standard") return cfg;
  const o = JSON.parse(readFileSync(v || new URL("./ladanCfg.json", import.meta.url), "utf8"));
  for (const k of Object.keys(o)) if (k !== "_") cfg[k] = o[k];
  return cfg;
}
