/** MARKERA (2026-11-15, ägaren: "en version som jag kör på datorn ... se spektrumet, pausa, zooma, sätta uppbyggnad inför drop, lägga till
 *  intro, vers, refräng, outro, enkelt pausa och finjustera var jag markerar"). Lokal sida för att gå igenom en inspelning och sätta facit.
 *    node tools/markera/server.mjs        (från engine/; eller dubbelklicka tools/markera/starta.cmd)  ->  http://localhost:3777
 *  Läser inspelningarna i tools/ladan-<datum>/lang-*.wav. Första gången en fil öppnas räknas spektrum (10-30 s) och sparas i
 *  .arena/markera-cache/. Markeringarna sparas löpande i <namn>.marks-hand.json bredvid ljudfilen (samma form som marks-fin.json:
 *  kind, fineS, pressS, skip). Finns ingen hand-fil visas knapptrycken från inspelningen (marks-fin.json) som utgångsläge.
 *  ANALYSERNA visas som egna rader under ägarens markeringar: lokalt svep (svep.py -> <namn>.forslag.json), molnet (svep_moln.py ->
 *  <namn>.forslag-moln.json) och motorn (kandidater.mjs -> <namn>.kandidater.json). Ägaren tar in det som stämmer (G) eller sätter eget.
 *  Äldre versioner av hand-filen kopieras till .arena/markera-backup/ (högst var tionde minut). Inga beroenden; lyssnar bara på 127.0.0.1.
 *  FRÅN EN ANNAN DATOR i hemmanätet (ägaren 11-15: den här har dåligt batteri): starta-lan.cmd (MARKERA_LAN=1) lyssnar på alla
 *  nätkort och skriver ut adressen. Ingen inloggning - bara i ett nät du litar på. Ha sidan öppen på EN dator åt gången. */
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), ENGINE = path.resolve(HERE, "..", ".."), PORT = +((process.argv.includes("--port") && process.argv[process.argv.indexOf("--port") + 1]) || process.env.MARKERA_PORT || 3777), LAN = process.env.MARKERA_LAN === "1";
const CACHE = path.join(ENGINE, ".arena", "markera-cache"), BACKUP = path.join(ENGINE, ".arena", "markera-backup");
const OKF = /^tools\/ladan-[\w-]+\/lang-\w+\.wav$/, KINDS = new Set(["drop", "mini", "intedrop", "latbyte", "uppbyggnad", "intro", "vers", "refrang", "outro", "break"]);
const NFFT = 2048, HOP = 480, NB = 144, F_LO = 30, F_HI = 16000, DB_LO = -110, DB_HI = 0;
const LOW_HZ = 300, DEC = 8, LFFT = 1024, LTAPS = 64, LCUT = 1500, EXTRA = 2, VER = 2;   // basen för sig: ljudet nedsamplat 8 ggr -> 5,9 Hz per bin under LOW_HZ
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

/** FFT (radix 2) för längden N: run() räknar på plats i re/im; rev = bitvänd ordning att fylla i */
function mkFft(N) {
  const bits = Math.log2(N), rev = new Uint16Array(N), cs = new Float64Array(N / 2), sn = new Float64Array(N / 2), win = new Float64Array(N), re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) { let r = 0; for (let k = 0; k < bits; k++) if (i & (1 << k)) r |= 1 << (bits - 1 - k); rev[i] = r; win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N); }
  for (let k = 0; k < N / 2; k++) { cs[k] = Math.cos(2 * Math.PI * k / N); sn[k] = Math.sin(2 * Math.PI * k / N); }
  const run = () => { for (let size = 2; size <= N; size <<= 1) { const half = size >> 1, step = N / size;
    for (let i = 0; i < N; i += size) for (let j = i, k = 0; j < i + half; j++, k += step) { const x = re[j + half], y = im[j + half], tr = x * cs[k] + y * sn[k], ti = y * cs[k] - x * sn[k];
      re[j + half] = re[j] - tr; im[j + half] = im[j] - ti; re[j] += tr; im[j] += ti; } } };
  return { rev, win, re, im, run };
}

/** spektrum: NB log-band F_LO..F_HI, en kolumn per HOP sampel, dB som 0..255. Band under LOW_HZ räknas på ljudet nedsamplat DEC ggr
 *  (fyra gånger finare i frekvens, fönster 171 ms); övriga på fullt ljud (fönster 43 ms). Sist i varje kolumn EXTRA värden för kurvorna:
 *  basen 30-150 Hz och hela nivån, båda ur det korta fönstret (skarpa i tid).
 *  Huvud 28 byte: kolumner, band, kolumner/s, första kolumnens tid, F_LO, F_HI, EXTRA */
function spektrum(p) {
  const st = fs.statSync(p), cp = path.join(CACHE, `${path.basename(p, ".wav")}-${st.size}-v${VER}-${NFFT}-${HOP}-${NB}.bin`);
  if (fs.existsSync(cp)) return fs.readFileSync(cp);
  const t0 = Date.now(), w = wavInfo(p), buf = fs.readFileSync(p), n = Math.floor(w.len / 2 / w.ch), cols = Math.max(0, Math.floor((n - NFFT) / HOP) + 1);
  const al = (buf.byteOffset + w.start) % 2 === 0, S = al ? new Int16Array(buf.buffer, buf.byteOffset + w.start, n * w.ch) : null, X = i => S ? S[i * w.ch] : buf.readInt16LE(w.start + i * 2 * w.ch);
  // nedsamplat ljud för basen: fönstrad sinc (Blackman), gräns LCUT
  const h = new Float64Array(LTAPS); let hs = 0;
  for (let k = 0; k < LTAPS; k++) { const x = k - (LTAPS - 1) / 2, fc = LCUT / w.sr, si = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x); h[k] = si * (0.42 - 0.5 * Math.cos(2 * Math.PI * k / (LTAPS - 1)) + 0.08 * Math.cos(4 * Math.PI * k / (LTAPS - 1))); hs += h[k]; }
  for (let k = 0; k < LTAPS; k++) h[k] /= hs;
  const nd = Math.floor(n / DEC), D = new Float32Array(nd);
  for (let m = 0; m < nd; m++) { const o = m * DEC - (LTAPS >> 1); let a = 0; if (o >= 0 && o + LTAPS <= n) for (let k = 0; k < LTAPS; k++) a += h[k] * X(o + k); D[m] = a; }
  const A = mkFft(NFFT), B = mkFft(LFFT), binHz = w.sr / NFFT, binL = w.sr / DEC / LFFT, bLo = new Int32Array(NB), bHi = new Int32Array(NB), low = new Uint8Array(NB);
  for (let b = 0; b < NB; b++) { const lo = F_LO * Math.pow(F_HI / F_LO, b / NB), hi = F_LO * Math.pow(F_HI / F_LO, (b + 1) / NB), mid = Math.sqrt(lo * hi); low[b] = mid < LOW_HZ ? 1 : 0;
    const bz = low[b] ? binL : binHz, top = (low[b] ? LFFT : NFFT) / 2 - 1; let i0 = Math.ceil(lo / bz), i1 = Math.floor(hi / bz);
    if (i1 < i0) i0 = i1 = Math.round(mid / bz); bLo[b] = Math.max(1, i0); bHi[b] = Math.min(top, Math.max(bLo[b], i1)); }
  const pw = new Float64Array(NFFT / 2), pl = new Float64Array(LFFT / 2), norm = 1 / Math.pow(32768 * NFFT / 4, 2), normL = 1 / Math.pow(32768 * LFFT / 4, 2), R = NB + EXTRA, ut = Buffer.alloc(28 + cols * R);
  const e0 = Math.max(1, Math.round(30 / binHz)), e1 = Math.round(150 / binHz), u8 = db => Math.max(0, Math.min(255, Math.round(255 * (db - DB_LO) / (DB_HI - DB_LO))));
  ut.writeUInt32LE(cols, 0); ut.writeUInt32LE(NB, 4); ut.writeFloatLE(w.sr / HOP, 8); ut.writeFloatLE(NFFT / 2 / w.sr, 12); ut.writeFloatLE(F_LO, 16); ut.writeFloatLE(F_HI, 20); ut.writeUInt32LE(EXTRA, 24);
  for (let c = 0; c < cols; c++) {
    const o = c * HOP, ol = Math.round((o + NFFT / 2) / DEC) - LFFT / 2, q = 28 + c * R;
    for (let i = 0; i < NFFT; i++) { const j = A.rev[i]; A.re[j] = X(o + i) * A.win[i]; A.im[j] = 0; }
    A.run(); let tot = 0, bas = 0; for (let i = 1; i < NFFT / 2; i++) { const v = (A.re[i] * A.re[i] + A.im[i] * A.im[i]) * norm; pw[i] = v; tot += v; if (i >= e0 && i <= e1) bas += v; }
    for (let i = 0; i < LFFT; i++) { const j = B.rev[i], k = ol + i; B.re[j] = k >= 0 && k < nd ? D[k] * B.win[i] : 0; B.im[j] = 0; }
    B.run(); for (let i = 1; i < LFFT / 2; i++) pl[i] = (B.re[i] * B.re[i] + B.im[i] * B.im[i]) * normL;
    for (let b = 0; b < NB; b++) { const P = low[b] ? pl : pw; let s = 0; for (let i = bLo[b]; i <= bHi[b]; i++) s += P[i]; ut[q + b] = u8(10 * Math.log10(s / (bHi[b] - bLo[b] + 1) + 1e-14)); }
    ut[q + NB] = u8(10 * Math.log10(bas + 1e-14)); ut[q + NB + 1] = u8(10 * Math.log10(tot + 1e-14));
  }
  fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(cp, ut); console.log(`spektrum ${path.basename(p)}: ${cols} kolumner på ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return ut;
}

function marks(p) {
  const hand = bredvid(p, ".marks-hand.json"), fin = bredvid(p, ".marks-fin.json"), kand = bredvid(p, ".kandidater.json");
  const k = fs.existsSync(kand) ? las(kand) : { drop: [], latgrans: [] };
  const rad = (id, namn, sv, fn) => { const fp = bredvid(p, sv); if (!fs.existsSync(fp)) return null;   // en rad per analys: sidan visar dem under ägarens egna markeringar
    try { return { id, namn, marks: fn(las(fp)).filter(m => KINDS.has(m.kind) && Number.isFinite(m.fineS)).sort((a, b) => a.fineS - b.fineS) }; } catch { return null; } };
  const rader = [rad("lokal", "Lokalt svep", ".forslag.json", d => d.marks || []), rad("moln", "Molnet (Replicate)", ".forslag-moln.json", d => d.marks || []),
    rad("motor", "Motorn", ".kandidater.json", d => [...(d.drop || []).map(t => ({ kind: "drop", fineS: t, why: "motorn slog här" })), ...(d.latgrans || []).map(t => ({ kind: "latbyte", fineS: t, why: "motorns låtgräns" }))])].filter(Boolean);
  if (fs.existsSync(hand)) { const h = las(hand); return { kalla: "hand", klar: !!h.klar, marks: h.marks || [], kandidater: k, rader }; }
  if (fs.existsSync(fin)) return { kalla: "tryck", klar: false, kandidater: k, rader, marks: (las(fin).marks || []).filter(m => KINDS.has(m.kind)).map(m => ({ kind: m.kind, fineS: m.fineS, pressS: m.pressS, skip: !!m.skip, hand: false })) };
  return { kalla: "tom", klar: false, marks: [], kandidater: k, rader };
}

const senastBackup = new Map();
function spara(p, body) {
  const d = JSON.parse(body); if (!Array.isArray(d.marks)) throw new Error("marks saknas");
  const ms = d.marks.filter(m => KINDS.has(m.kind) && Number.isFinite(m.fineS)).map(m => ({ kind: m.kind, fineS: +(+m.fineS).toFixed(3), pressS: +(+(Number.isFinite(m.pressS) ? m.pressS : m.fineS)).toFixed(3), sure: true, skip: !!m.skip, hand: !!m.hand, ...(m.forslag ? { forslag: true } : {}), ...(m.why ? { why: String(m.why).slice(0, 120) } : {}) })).sort((a, b) => a.fineS - b.fineS);
  const hand = bredvid(p, ".marks-hand.json");
  if (fs.existsSync(hand) && Date.now() - (senastBackup.get(hand) || 0) > 600000) { fs.mkdirSync(BACKUP, { recursive: true }); const t = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
    fs.copyFileSync(hand, path.join(BACKUP, `${path.basename(hand, ".json")}.${t}.json`)); senastBackup.set(hand, Date.now()); }
  const ut = { file: path.basename(p), note: "Ägarens genomgång i tools/markera (fineS = händelsen i ljudet, s från filens början; hand = flyttad/satt i verktyget; skip = feltryck; forslag = osett förslag från svepet, räknas inte som facit). uppbyggnad/intro/vers/refrang/outro/break = börjar här.", savedAt: new Date().toISOString(), klar: !!d.klar, marks: ms };
  fs.writeFileSync(hand + ".tmp", JSON.stringify(ut, null, 1)); fs.renameSync(hand + ".tmp", hand); return { ok: true, n: ms.length };
}

function filer() {
  const ut = []; const T = path.join(ENGINE, "tools");
  for (const d of fs.readdirSync(T).filter(x => /^ladan-/.test(x)).sort()) for (const f of fs.readdirSync(path.join(T, d)).filter(x => /^lang-\w+\.wav$/.test(x)).sort()) {
    const p = path.join(T, d, f); let w; try { w = wavInfo(p); } catch { continue; }
    let n = 0, nf = 0, kalla = "tom", klar = false; try { const m = marks(p); n = m.marks.filter(x => !x.skip && !x.forslag).length; nf = m.marks.filter(x => x.forslag).length; kalla = m.kalla; klar = m.klar; } catch { /* trasig markeringsfil: visas som tom */ }
    ut.push({ f: `tools/${d}/${f}`, namn: f.replace(/^lang-|\.wav$/g, ""), seconds: w.seconds, n, nf, kalla, klar, lagad: w.lagad });
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
  .listen(PORT, LAN ? "0.0.0.0" : "127.0.0.1", () => { console.log(`Markera: http://localhost:${PORT}   (Ctrl+C stänger)`);
    if (LAN) for (const a of Object.values(os.networkInterfaces()).flat()) if (a && a.family === "IPv4" && !a.internal) console.log(`  från en annan dator i samma nät: http://${a.address}:${PORT}`); });
