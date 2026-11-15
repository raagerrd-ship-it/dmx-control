/** MARKERA (2026-11-15, ägaren: "en version som jag kör på datorn ... se spektrumet, pausa, zooma, sätta uppbyggnad inför drop, lägga till
 *  intro, vers, refräng, outro, enkelt pausa och finjustera var jag markerar"). Lokal sida för att gå igenom en inspelning och sätta facit.
 *    node tools/markera/server.mjs        (från engine/; eller dubbelklicka tools/markera/starta.cmd)  ->  http://localhost:3777
 *  Läser inspelningarna i tools/ladan-<datum>/lang-*.wav. Första gången en fil öppnas räknas spektrum (10-30 s) och sparas i
 *  .arena/markera-cache/. Markeringarna sparas löpande i <namn>.marks-hand.json bredvid ljudfilen (samma form som marks-fin.json:
 *  kind, fineS, pressS, skip). Finns ingen hand-fil visas knapptrycken från inspelningen (marks-fin.json) som utgångsläge.
 *  Äldre versioner av hand-filen kopieras till .arena/markera-backup/ (högst var tionde minut). Inga beroenden; lyssnar bara på 127.0.0.1. */
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ENGINE = path.resolve(HERE, "..", ".."), PORT = +(process.env.MARKERA_PORT || 3777);
const CACHE = path.join(ENGINE, ".arena", "markera-cache"), BACKUP = path.join(ENGINE, ".arena", "markera-backup");
const OKF = /^tools\/ladan-[\w-]+\/lang-\w+\.wav$/, KINDS = new Set(["drop", "mini", "intedrop", "latbyte", "uppbyggnad", "intro", "vers", "refrang", "outro"]);
const NFFT = 2048, HOP = 480, NB = 96, F_LO = 30, F_HI = 16000, DB_LO = -110, DB_HI = 0;
const abs = f => { if (!OKF.test(f || "")) throw new Error("ogiltig fil"); return path.join(ENGINE, f); };
const bredvid = (p, s) => p.replace(/\.wav$/, s), las = p => JSON.parse(fs.readFileSync(p, "utf8"));

/** ljudets plats i filen; en inspelning som aldrig stängdes har nollat huvud och antas vara mono 48 kHz 16 bit från byte 44 */
function wavInfo(p) {
  const fd = fs.openSync(p, "r"), h = Buffer.alloc(4096), got = fs.readSync(fd, h, 0, 4096, 0); fs.closeSync(fd); const size = fs.statSync(p).size;
  let ch = 1, sr = 48000, start = 44, len = size - 44, lagad = true;
  if (h.toString("latin1", 0, 4) === "RIFF") { lagad = false; ch = h.readUInt16LE(22) || 1; sr = h.readUInt32LE(24) || 48000;
    let o = 12; while (o + 8 <= got) { const id = h.toString("latin1", o, o + 4), ln = h.readUInt32LE(o + 4); if (id === "data") { start = o + 8; len = Math.min(ln || size - start, size - start); break; } o += 8 + ln + (ln & 1); } }
  len -= len % (2 * ch); return { ch, sr, start, len, size, lagad, seconds: len / 2 / ch / sr };
}

/** ljudet med ett rent huvud (även för filer med nollat huvud), med stöd för Range så att spelaren kan hoppa */
function ljud(req, res, p) {
  const w = wavInfo(p), total = 44 + w.len, hd = Buffer.alloc(44);
  hd.write("RIFF", 0, "latin1"); hd.writeUInt32LE(36 + w.len, 4); hd.write("WAVEfmt ", 8, "latin1"); hd.writeUInt32LE(16, 16); hd.writeUInt16LE(1, 20); hd.writeUInt16LE(w.ch, 22);
  hd.writeUInt32LE(w.sr, 24); hd.writeUInt32LE(w.sr * w.ch * 2, 28); hd.writeUInt16LE(w.ch * 2, 32); hd.writeUInt16LE(16, 34); hd.write("data", 36, "latin1"); hd.writeUInt32LE(w.len, 40);
  let a = 0, b = total - 1; const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
  if (m) { if (m[1] === "") a = Math.max(0, total - +m[2]); else { a = +m[1]; if (m[2] !== "") b = Math.min(b, +m[2]); } }
  if (a > b || a >= total) { res.writeHead(416, { "Content-Range": `bytes */${total}` }); return res.end(); }
  res.writeHead(m ? 206 : 200, { "Content-Type": "audio/wav", "Accept-Ranges": "bytes", "Content-Length": b - a + 1, "Cache-Control": "no-store", ...(m ? { "Content-Range": `bytes ${a}-${b}/${total}` } : {}) });
  if (req.method === "HEAD") return res.end();
  if (a < 44) res.write(hd.subarray(a, Math.min(44, b + 1)));
  if (b >= 44) fs.createReadStream(p, { start: w.start + Math.max(a, 44) - 44, end: w.start + b - 44 }).pipe(res); else res.end();
}

/** spektrum: NB log-band F_LO..F_HI, en kolumn per HOP sampel, dB som 0..255. Huvud 24 byte: kolumner, band, kolumner/s, första kolumnens tid, F_LO, F_HI */
function spektrum(p) {
  const st = fs.statSync(p), cp = path.join(CACHE, `${path.basename(p, ".wav")}-${st.size}-${NFFT}-${HOP}-${NB}.bin`);
  if (fs.existsSync(cp)) return fs.readFileSync(cp);
  const t0 = Date.now(), w = wavInfo(p), buf = fs.readFileSync(p), n = Math.floor(w.len / 2 / w.ch), cols = Math.max(0, Math.floor((n - NFFT) / HOP) + 1);
  const al = (buf.byteOffset + w.start) % 2 === 0, S = al ? new Int16Array(buf.buffer, buf.byteOffset + w.start, n * w.ch) : null;
  const bits = Math.log2(NFFT), rev = new Uint16Array(NFFT), cs = new Float64Array(NFFT / 2), sn = new Float64Array(NFFT / 2), win = new Float64Array(NFFT);
  for (let i = 0; i < NFFT; i++) { let r = 0; for (let k = 0; k < bits; k++) if (i & (1 << k)) r |= 1 << (bits - 1 - k); rev[i] = r; win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / NFFT); }
  for (let k = 0; k < NFFT / 2; k++) { cs[k] = Math.cos(2 * Math.PI * k / NFFT); sn[k] = Math.sin(2 * Math.PI * k / NFFT); }
  const binHz = w.sr / NFFT, bLo = new Int32Array(NB), bHi = new Int32Array(NB);
  for (let b = 0; b < NB; b++) { const lo = F_LO * Math.pow(F_HI / F_LO, b / NB), hi = F_LO * Math.pow(F_HI / F_LO, (b + 1) / NB); let i0 = Math.ceil(lo / binHz), i1 = Math.floor(hi / binHz);
    if (i1 < i0) i0 = i1 = Math.round(Math.sqrt(lo * hi) / binHz); bLo[b] = Math.max(1, i0); bHi[b] = Math.min(NFFT / 2 - 1, Math.max(bLo[b], i1)); }
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT), pw = new Float64Array(NFFT / 2), norm = 1 / Math.pow(32768 * NFFT / 4, 2), ut = Buffer.alloc(24 + cols * NB);
  ut.writeUInt32LE(cols, 0); ut.writeUInt32LE(NB, 4); ut.writeFloatLE(w.sr / HOP, 8); ut.writeFloatLE(NFFT / 2 / w.sr, 12); ut.writeFloatLE(F_LO, 16); ut.writeFloatLE(F_HI, 20);
  for (let c = 0; c < cols; c++) {
    const o = c * HOP;
    for (let i = 0; i < NFFT; i++) { const j = rev[i]; re[j] = (S ? S[(o + i) * w.ch] : buf.readInt16LE(w.start + (o + i) * 2 * w.ch)) * win[i]; im[j] = 0; }
    for (let size = 2; size <= NFFT; size <<= 1) { const half = size >> 1, step = NFFT / size;
      for (let i = 0; i < NFFT; i += size) for (let j = i, k = 0; j < i + half; j++, k += step) { const x = re[j + half], y = im[j + half], tr = x * cs[k] + y * sn[k], ti = y * cs[k] - x * sn[k];
        re[j + half] = re[j] - tr; im[j + half] = im[j] - ti; re[j] += tr; im[j] += ti; } }
    for (let i = 1; i < NFFT / 2; i++) pw[i] = (re[i] * re[i] + im[i] * im[i]) * norm;
    for (let b = 0, q = 24 + c * NB; b < NB; b++) { let s = 0; for (let i = bLo[b]; i <= bHi[b]; i++) s += pw[i];
      const db = 10 * Math.log10(s / (bHi[b] - bLo[b] + 1) + 1e-14); ut[q + b] = Math.max(0, Math.min(255, Math.round(255 * (db - DB_LO) / (DB_HI - DB_LO)))); }
  }
  fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(cp, ut); console.log(`spektrum ${path.basename(p)}: ${cols} kolumner på ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return ut;
}

function marks(p) {
  const hand = bredvid(p, ".marks-hand.json"), fin = bredvid(p, ".marks-fin.json"), kand = bredvid(p, ".kandidater.json");
  const k = fs.existsSync(kand) ? las(kand) : { drop: [], latgrans: [] };
  if (fs.existsSync(hand)) { const h = las(hand); return { kalla: "hand", klar: !!h.klar, marks: h.marks || [], kandidater: k }; }
  if (fs.existsSync(fin)) return { kalla: "tryck", klar: false, kandidater: k, marks: (las(fin).marks || []).filter(m => KINDS.has(m.kind)).map(m => ({ kind: m.kind, fineS: m.fineS, pressS: m.pressS, skip: !!m.skip, hand: false })) };
  return { kalla: "tom", klar: false, marks: [], kandidater: k };
}

const senastBackup = new Map();
function spara(p, body) {
  const d = JSON.parse(body); if (!Array.isArray(d.marks)) throw new Error("marks saknas");
  const ms = d.marks.filter(m => KINDS.has(m.kind) && Number.isFinite(m.fineS)).map(m => ({ kind: m.kind, fineS: +(+m.fineS).toFixed(3), pressS: +(+(Number.isFinite(m.pressS) ? m.pressS : m.fineS)).toFixed(3), sure: true, skip: !!m.skip, hand: !!m.hand })).sort((a, b) => a.fineS - b.fineS);
  const hand = bredvid(p, ".marks-hand.json");
  if (fs.existsSync(hand) && Date.now() - (senastBackup.get(hand) || 0) > 600000) { fs.mkdirSync(BACKUP, { recursive: true }); const t = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
    fs.copyFileSync(hand, path.join(BACKUP, `${path.basename(hand, ".json")}.${t}.json`)); senastBackup.set(hand, Date.now()); }
  const ut = { file: path.basename(p), note: "Ägarens genomgång i tools/markera (fineS = händelsen i ljudet, s från filens början; hand = flyttad/satt i verktyget; skip = feltryck). uppbyggnad/intro/vers/refrang/outro = börjar här.", savedAt: new Date().toISOString(), klar: !!d.klar, marks: ms };
  fs.writeFileSync(hand + ".tmp", JSON.stringify(ut, null, 1)); fs.renameSync(hand + ".tmp", hand); return { ok: true, n: ms.length };
}

function filer() {
  const ut = []; const T = path.join(ENGINE, "tools");
  for (const d of fs.readdirSync(T).filter(x => /^ladan-/.test(x)).sort()) for (const f of fs.readdirSync(path.join(T, d)).filter(x => /^lang-\w+\.wav$/.test(x)).sort()) {
    const p = path.join(T, d, f); let w; try { w = wavInfo(p); } catch { continue; }
    let n = 0, kalla = "tom", klar = false; try { const m = marks(p); n = m.marks.filter(x => !x.skip).length; kalla = m.kalla; klar = m.klar; } catch { /* trasig markeringsfil: visas som tom */ }
    ut.push({ f: `tools/${d}/${f}`, namn: f.replace(/^lang-|\.wav$/g, ""), seconds: w.seconds, n, kalla, klar, lagad: w.lagad });
  }
  return ut;
}

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = u.searchParams.get("f"), json = (o, c = 200) => { res.writeHead(c, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); };
  try {
    if (u.pathname === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }); return res.end(fs.readFileSync(path.join(HERE, "index.html"))); }
    if (u.pathname === "/api/filer") return json(filer());
    if (u.pathname === "/ljud") return ljud(req, res, abs(f));
    if (u.pathname === "/api/spektrum") { const b = spektrum(abs(f)); res.writeHead(200, { "Content-Type": "application/octet-stream", "Content-Length": b.length, "Cache-Control": "no-store" }); return res.end(b); }
    if (u.pathname === "/api/marks" && req.method === "GET") return json(marks(abs(f)));
    if (u.pathname === "/api/marks" && req.method === "POST") { const p = abs(f); let body = ""; req.on("data", c => { body += c; if (body.length > 5e6) req.destroy(); });
      return req.on("end", () => { try { json(spara(p, body)); } catch (e) { json({ ok: false, fel: String(e.message || e) }, 400); } }); }
    json({ fel: "finns inte" }, 404);
  } catch (e) { json({ fel: String(e.message || e) }, 400); }
}).on("error", e => { console.log(e.code === "EADDRINUSE" ? `Verktyget är redan igång - öppna http://localhost:${PORT}` : String(e)); process.exit(e.code === "EADDRINUSE" ? 0 : 1); })
  .listen(PORT, "127.0.0.1", () => console.log(`Markera: http://localhost:${PORT}   (Ctrl+C stänger)`));
