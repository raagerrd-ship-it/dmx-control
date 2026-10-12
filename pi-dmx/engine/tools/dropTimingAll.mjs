/** Kör tools/dropTiming.mjs på alla lang-*.wav i en katalog, N parallellt. Env (t.ex. DMX_*) ärvs av barnen.
 *   node tools/dropTimingAll.mjs <wavkatalog> <utkatalog> [--par 8] [--dist dir] */
import { readdirSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
const [dir, out] = process.argv.slice(2);
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PAR = Number(opt("--par", 8)), dist = opt("--dist", null);
mkdirSync(out, { recursive: true });
const files = readdirSync(dir).filter((f) => /^lang-.*\.wav$/.test(f)).sort();
const tool = new URL("./dropTiming.mjs", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
let i = 0;
const next = () => new Promise((res) => {
  const f = files[i++]; if (!f) return res();
  const a = [tool, `${dir}/${f}`, "--json", `${out}/${f.replace(/\.wav$/, ".json")}`]; if (dist) a.push("--dist", dist);
  const p = spawn(process.execPath, a, { stdio: ["ignore", "pipe", "ignore"] });
  p.stdout.on("data", (b) => { const s = String(b).split("\n").filter((l) => l && !l.startsWith("[quiet]")).join("\n"); if (s) console.log(s); });
  p.on("close", () => next().then(res));
});
await Promise.all(Array.from({ length: PAR }, next));
