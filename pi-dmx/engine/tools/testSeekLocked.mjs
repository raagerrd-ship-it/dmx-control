/**
 * INTEGRATIONSTEST: verklig spolning med LÅST synk.
 *
 * Scenariot är det som gör mest skada i verkligheten: showen är låst mot en
 * lärd låt och användaren spolar i appen. Då får inga drops fyras på fel plats —
 * en MISSAD drop är alltid bättre än en drop som kommer 30 s från sitt läge.
 *
 * Testet lär in låt A (drops på kända ställen), låser synken från låtens början
 * och kör sedan en kedja av spolningar: långt framåt, långt bakåt, litet hopp
 * inom drift-tröskeln och åter framåt. Efter varje spolning kontrolleras att
 * varje avfyrad drop ligger nära en riktig drop i KÄLLANS tidslinje.
 *
 * ISOLERAT MINNE: skriver till en tom temp-fil så ett riktigt låtminne på disk
 * inte påverkar röster och offset-marginaler.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.SONGS_PATH = join(mkdtempSync(join(tmpdir(), "seeklock-")), "songs.bin");
const { SongMemory } = await import("../dist/songMemory.js");

const BINS = 1024, BIN_HZ = 48000 / 2048, STEP = 8;
const TOL_MS = 800;          // så nära en riktig drop måste en avfyrad drop ligga

function mkSong(seed) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const notes = Array.from({ length: 600 }, () => Array.from({ length: 4 }, () => 3 + Math.floor(rnd() * 210)));
  return (tMs, mag) => {
    mag.fill(0.001);
    const set = notes[Math.floor(tMs / 200) % notes.length];
    for (const b of set) mag[b] = 1 + 0.05 * Math.sin(tMs / 130 + b);
  };
}

/** Lär in: spelar låten från början och matar in dess drops. */
async function learn(mem, song, clock, durMs, drops) {
  const mag = new Float32Array(BINS);
  const start = clock.t;
  let next = 0;
  for (let t = 0; t < durMs; t += STEP) {
    clock.t = start + t;
    song(t, mag);
    mem.pushSpectrum(mag, BIN_HZ);
    const isDrop = next < drops.length && t >= drops[next];
    if (isDrop) next++;
    mem.tick({ level: 0.5, dropped: !!isDrop, bpm: 128, bpmConfidence: 0.8, intensity: 0.6, beatAnchorMs: clock.t });
    mem.takeDrop();
  }
  for (let t = 0; t < 4000; t += 100) {
    clock.t = start + durMs + t;
    mem.tick({ level: 0, dropped: false, bpm: 0, bpmConfidence: 0, intensity: 0.5, beatAnchorMs: 0 });
  }
}

/** Spela ett segment ur källan (utan inlärning) och returnera avfyrade drops i
 *  KÄLLANS tidslinje samt största klockhopp. */
async function playSegment(mem, song, clock, sourceStartMs, durMs) {
  const mag = new Float32Array(BINS);
  const fired = [];
  const start = clock.t;
  let prevPos = 0, maxJump = 0;
  for (let elapsed = 0; elapsed < durMs; elapsed += STEP) {
    clock.t = start + elapsed;
    const sourceT = sourceStartMs + elapsed;
    song(sourceT, mag);
    mem.pushSpectrum(mag, BIN_HZ, false);
    mem.tick({ level: 0.5, dropped: false, bpm: 128, bpmConfidence: 0.8, intensity: 0.6, beatAnchorMs: clock.t, learn: false });
    if (mem.takeDrop() > 0) fired.push(sourceT);
    const pos = mem.state().positionMs;
    if (prevPos > 0) maxJump = Math.max(maxJump, Math.abs(pos - prevPos - STEP));
    prevPos = pos;
  }
  return { fired, maxJump };
}

const clock = { t: 1_700_000_000_000 };
const mem = new SongMemory(() => clock.t);
await mem.load();

const A = mkSong(7);
const dropsA = [18000, 42000, 66000, 92000];
const SONG_MS = 120000;

await learn(mem, A, clock, SONG_MS, dropsA);
const learned = mem.state();
console.log("inlärd:", learned.songs, "låt(ar)");

// Lås synken från låtens början (igenkänningsfönstret kräver start nära 0).
await playSegment(mem, A, clock, 0, 25000);
const locked = mem.state();
console.log("låst synk:", locked.known, "position", locked.positionMs.toFixed(0), "ms");

// Kedja av verkliga spolningar. Varje steg: hoppa i källan, spela vidare 20 s.
const seeks = [
  { label: "framåt +50 s", to: 75000, dur: 20000 },
  { label: "bakåt -55 s", to: 20000, dur: 20000 },
  { label: "litet hopp +0,4 s", to: 40400, dur: 15000 },
  { label: "framåt till slutet", to: 100000, dur: 15000 },
];

const misplaced = [];
let jump = 0;
for (const s of seeks) {
  const r = await playSegment(mem, A, clock, s.to, s.dur);
  const bad = r.fired.filter((t) => !dropsA.some((d) => Math.abs(d - t) < TOL_MS));
  jump = Math.max(jump, r.maxJump);
  misplaced.push(...bad);
  console.log(`${s.label}: drops ${r.fired.length}, fel plats ${bad.length}, känd ${mem.state().known}, största klockhopp ${r.maxJump.toFixed(0)} ms`);
}

const ok = learned.songs === 1
  && locked.known === true
  && misplaced.length === 0
  && jump < 4000;   // ingen okontrollerad tidslinje-rusning
console.log("drops på fel plats totalt:", misplaced.length);
console.log(ok ? "OK" : "MISSLYCKADES");
process.exit(ok ? 0 : 1);
