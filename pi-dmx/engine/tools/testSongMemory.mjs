/**
 * Verifiering av låtminnet med SIMULERAD klocka (går på sekunder i stället för
 * att behöva spela låtar i realtid).
 *   1. Lär in låt A → sparas.
 *   2. Spela A igen → ska kännas igen och drops komma från minnet.
 *   3. Spela låt B (annat ljud) → får INTE matcha A.
 */
import { SongMemory } from "../dist/songMemory.js";

const BINS = 1024, BIN_HZ = 48000 / 2048, STEP = 8;   // ms per stor-FFT-ram

function mkSong(seed) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  // Stabil "låt": 40 toner som byts var 2:a sekund → reproducerbart spektrum.
  const notes = Array.from({ length: 60 }, () => Array.from({ length: 4 }, () => 3 + Math.floor(rnd() * 200)));
  return (tMs, mag) => {
    mag.fill(0.001);
    const set = notes[Math.floor(tMs / 2000) % notes.length];
    for (const b of set) mag[b] = 1 + 0.05 * Math.sin(tMs / 130 + b);
  };
}

async function play(mem, song, clock, durMs, drops, learnDrops) {
  const mag = new Float32Array(BINS);
  const fired = [];
  const start = clock.t;
  let nextDrop = 0;
  for (let t = 0; t < durMs; t += STEP) {
    clock.t = start + t;
    song(t, mag);
    mem.pushSpectrum(mag, BIN_HZ);
    const isDrop = learnDrops && nextDrop < drops.length && t >= drops[nextDrop];
    if (isDrop) nextDrop++;
    mem.tick({ level: 0.5, dropped: !!isDrop, bpm: 128, bpmConfidence: 0.8, intensity: 0.6, beatAnchorMs: clock.t });
    const d = mem.takeDrop();
    if (d > 0) fired.push(t);
  }
  // Tystnad → commit
  for (let t = 0; t < 4000; t += 100) { clock.t = start + durMs + t; mem.tick({ level: 0, dropped: false, bpm: 0, bpmConfidence: 0, intensity: 0.5, beatAnchorMs: 0 }); }
  return fired;
}

const clock = { t: 1_700_000_000_000 };
const mem = new SongMemory(() => clock.t);
await mem.load();

const A = mkSong(7), B = mkSong(99);
const dropsA = [30000, 62000, 95000];

await play(mem, A, clock, 120000, dropsA, true);
console.log("efter inlärning:", mem.state());

const fired = await play(mem, A, clock, 120000, dropsA, true);
const st = mem.state();
console.log("andra spelningen: drops ur minnet @", fired.map((x) => (x / 1000).toFixed(1) + "s").join(", "));

await new Promise((r) => setTimeout(r, 300));   // låt sparningen landa
const mem2 = new SongMemory(() => clock.t);
await mem2.load();
console.log("laddat från disk:", mem2.state().songs, "låtar");
const firedB = await play(mem2, B, clock, 120000, [], true);
console.log("annan låt matchade:", mem2.state().known, "(ska vara false), drops ur minnet:", firedB.length);

const ok = fired.length >= 2
  && fired.every((f) => dropsA.some((d) => Math.abs(d - f) < 800))
  && mem2.state().known === false;
console.log(ok ? "OK" : "MISSLYCKADES");
process.exit(ok ? 0 : 1);
