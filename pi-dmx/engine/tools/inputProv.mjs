// PROV av ingångsmätaren (inputMeter.ts) och den strömmande långinspelningen (longRecord.ts) med konstgjort ljud.
//   node tools/inputProv.mjs        (från engine/, efter npx tsc)     Skriver i en tillfällig mapp och städar efter sig.
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
const { InputMeter } = await import("../dist/inputMeter.js");
const { LongRecord } = await import("../dist/longRecord.js");
const SR = 48000, HOP = 128; let fel = 0;
const ok = (namn, villkor, visa) => { console.log((villkor ? "OK   " : "FEL  ") + namn + (visa !== undefined ? "  " + visa : "")); if (!villkor) fel++; };
const ton = (amp, sek, f = 100, klipp = 1) => { const y = new Float32Array(SR * sek); for (let i = 0; i < y.length; i++) { const v = amp * Math.sin(2 * Math.PI * f * i / SR); y[i] = Math.max(-klipp, Math.min(klipp, v)); } return y; };
const mata = (m, y) => { for (let i = 0; i + HOP <= y.length; i += HOP) m.push(y.subarray(i, i + HOP)); };

// ── mätaren ──
{ const m = new InputMeter(SR);
  mata(m, ton(0.5, 1)); ok("vilar tills någon frågar", m.status().state === "vilar");
  mata(m, ton(0.5, 3)); let s = m.status(); ok("ton 0,5 = bra, topp -6 dBFS, toppfaktor 3 dB", s.state === "bra" && Math.abs(s.peakDb + 6.02) < 0.1 && Math.abs(s.crestDb - 3.01) < 0.1, JSON.stringify({ state: s.state, peakDb: +s.peakDb.toFixed(2), crestDb: +s.crestDb.toFixed(2), brightDb: +s.brightDb.toFixed(1) }));
  mata(m, ton(0.05, 3)); s = m.status(); ok("ton 0,05 = lag", s.state === "lag", s.state);
  mata(m, ton(0.9, 3)); s = m.status(); ok("ton 0,9 = hog", s.state === "hog", s.state);
  mata(m, ton(1.6, 3, 100, 1)); s = m.status(); ok("överstyrd ton = klipper", s.state === "klipper" && s.clipRun > 10, JSON.stringify({ state: s.state, clipPct: +s.clipPct.toFixed(1), clipRun: s.clipRun, crestDb: +s.crestDb.toFixed(1) }));
  mata(m, new Float32Array(SR * 3)); s = m.status(); ok("tystnad = tyst", s.state === "tyst", s.state);
  const ren = ton(0.5, 3, 1000), sprucken = ton(1.5, 3, 1000, 0.5); mata(m, ren); const b1 = m.status().brightDb; mata(m, sprucken); const b2 = m.status().brightDb;
  ok("ljusheten stiger när tonen spricker", b2 > b1 + 1, `${b1.toFixed(1)} -> ${b2.toFixed(1)} dB`);
  mata(m, ton(0.5, 5, 440)); const w = m.wav(4);
  ok("klippet är en giltig WAV på 4 s", w.toString("ascii", 0, 4) === "RIFF" && w.readUInt32LE(24) === SR && w.readUInt32LE(40) === 4 * SR * 2 && w.length === 44 + 4 * SR * 2, `${w.length} byte`);
  let mx = 0; for (let i = 44; i < w.length; i += 2) mx = Math.max(mx, Math.abs(w.readInt16LE(i))); ok("klippets topp = 0,5", Math.abs(mx / 32767 - 0.5) < 0.001, (mx / 32767).toFixed(3));
}
// ── långinspelningen ──
{ const dir = mkdtempSync(join(tmpdir(), "dmxprov-"));
  const r = new LongRecord(dir, SR, { latestFrame: () => null, look: () => "prov", why: () => "", beat: () => null });
  const y = new Float32Array(SR * 23); for (let i = 0; i < y.length; i++) y[i] = 0.6 * Math.sin(i * 0.013) * Math.sin(i * 0.00007);
  const facit = new Int16Array(y.length); for (let i = 0; i < y.length; i++) facit[i] = Math.round(y[i] * 32767);
  ok("startar", r.start(3600).active === true);
  // mata i realtidslik takt: 1 s ljud, sedan släpp fram skrivningarna (poolen ska räcka)
  for (let s = 0; s < 23; s++) { mata(r, y.subarray(s * SR, (s + 1) * SR)); if (s === 5) r.mark("latbyte"); if (s === 9) r.mark("uppbyggnad"); if (s === 12) r.mark("drop"); if (s === 15) r.mark("mini"); if (s === 16) { r.mark("drop"); r.mark("drop"); } if (s === 17) { const st = r.status(); r.editMark(st.recent.at(-1).i, null); r.editMark(st.recent.at(-2).i, "intedrop"); } await new Promise((f) => setTimeout(f, 15)); }
  const st0 = r.status(); ok("räknar tid och markeringar under inspelning", Math.abs(st0.seconds - 22.99) < 0.02 && st0.marks === 5 && st0.recent.length === 5, JSON.stringify(st0));
  const st = r.stop(); ok("stoppar och namnger filen", !st.active && /^lang-\d{8}T\d{6}\.wav$/.test(st.file), st.file);
  await new Promise((f) => setTimeout(f, 800));
  const p = join(dir, st.file), w = readFileSync(p), n = (w.length - 44) / 2;
  ok("WAV-huvudet stämmer med längden", w.toString("ascii", 0, 4) === "RIFF" && w.readUInt32LE(40) === n * 2 && w.readUInt32LE(4) === 36 + n * 2 && w.readUInt32LE(24) === SR, `${n} sampel = ${(n / SR).toFixed(2)} s`);
  const hop = Math.floor(y.length / HOP) * HOP; ok("alla matade sampel finns med", n === hop, `${n} av ${hop}`);
  const a = createHash("md5").update(Buffer.from(facit.buffer, 0, n * 2)).digest("hex"), b = createHash("md5").update(w.subarray(44)).digest("hex"); ok("ljudet är bit för bit det som matades", a === b, b);
  const ev = JSON.parse(readFileSync(join(dir, st.file.replace(".wav", ".events.json")), "utf8"));
  ok("markeringarna sparade i ordning", ev.marks.map((m) => m.kind).join(",") === "latbyte,uppbyggnad,drop,mini,intedrop" && Math.abs(ev.seconds - n / SR) < 1e-6, ev.marks.map((m) => m.kind).join(","));
  ok("index-filen och marks.jsonl finns", existsSync(join(dir, st.file.replace(".wav", ".json"))) && readFileSync(join(dir, "marks.jsonl"), "utf8").trim().split("\n").length === 4);
  // för kort inspelning kastas
  r.start(3600); mata(r, y.subarray(0, SR * 2)); const k = r.stop(); await new Promise((f) => setTimeout(f, 400));
  ok("under 10 s kastas och filen tas bort", /kort/.test(k.error) && readFileSync(join(dir, "marks.jsonl"), "utf8").length > 0 && !existsSync(join(dir, (k.file || "saknas.wav"))), k.error);
  // taket: inspelningen stoppar själv
  const r2 = new LongRecord(dir, SR, { latestFrame: () => null, look: () => "", why: () => "", beat: () => null }); r2.start(11); mata(r2, y.subarray(0, SR * 12)); await new Promise((f) => setTimeout(f, 500));
  const s2 = r2.status(); ok("stoppar själv vid taket", !s2.active && !!s2.file && (readFileSync(join(dir, s2.file)).length - 44) / 2 === 11 * SR, `${s2.file}`);
  rmSync(dir, { recursive: true, force: true });
}
console.log(fel ? `\n${fel} FEL` : "\nALLT OK"); process.exit(fel ? 1 : 0);
