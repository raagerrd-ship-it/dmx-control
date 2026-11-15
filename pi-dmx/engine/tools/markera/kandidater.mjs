/** MOTORNS KANDIDATER TILL MARKERA: var dagens kod säger drop och låtgräns i varje inspelning -> <namn>.kandidater.json bredvid ljudfilen
 *  ({ drop: [s], latgrans: [s] }). Sidan visar dem i lanen "motorn"; de utan markering är ställen ägaren kan ha missat.
 *    node tools/markera/kandidater.mjs [wav ...]        (från engine/; utan argument: alla tools/ladan-<datum>/lang-*.wav med helt huvud)
 *  Kör hela analysatorn (tools/arena/dropdom2Kor.mjs, ladans config) en gång per fil; resultatet sparas i .arena/markera-cache/. */
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process"; import { fileURLToPath } from "node:url";
const ENGINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."), CACHE = path.join(ENGINE, ".arena", "markera-cache"); fs.mkdirSync(CACHE, { recursive: true });
let wavs = process.argv.slice(2);
if (!wavs.length) for (const d of fs.readdirSync(path.join(ENGINE, "tools")).filter(x => /^ladan-/.test(x)).sort()) for (const f of fs.readdirSync(path.join(ENGINE, "tools", d)).filter(x => /^lang-\w+\.wav$/.test(x))) wavs.push(`tools/${d}/${f}`);
for (const w of wavs) {
  const p = path.resolve(ENGINE, w), fd = fs.openSync(p, "r"), h = Buffer.alloc(4); fs.readSync(fd, h, 0, 4, 0); fs.closeSync(fd);
  if (h.toString("latin1") !== "RIFF") { console.log(`${w}: nollat huvud - hoppar över (laga en kopia först)`); continue; }
  const raw = path.join(CACHE, `raw-${path.basename(p, ".wav")}-${fs.statSync(p).size}.json`);
  if (!fs.existsSync(raw)) execFileSync("node", ["tools/arena/dropdom2Kor.mjs", path.relative(ENGINE, p).replace(/\\/g, "/"), raw], { cwd: ENGINE, stdio: "inherit" });
  const r = JSON.parse(fs.readFileSync(raw, "utf8")); fs.writeFileSync(p.replace(/\.wav$/, ".kandidater.json"), JSON.stringify({ kod: "dagens kod", drop: r.drops, latgrans: r.grans }));
  console.log(`${w}: ${r.drops.length} drop, ${r.grans.length} låtgränser`);
}
