/**
 * Verifiering av låtminnet med SIMULERAD klocka (går på sekunder i stället för
 * att behöva spela låtar i realtid).
 *   1. Lär in låt A → sparas.
 *   2. Spela A igen → ska kännas igen och drops komma från minnet.
 *   3. Spela låt B (annat ljud) → får INTE matcha A.
 *
 * ISOLERAT MINNE: testet skriver alltid till en TOM temp-fil. Utan detta ärver
 * körningen ett riktigt låtminne (/var/lib/audio-dmx-engine/songs.bin) och blir
 * icke-deterministisk — extra lärda låtar ändrar röster och offset-marginaler.
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.SONGS_PATH = join(mkdtempSync(join(tmpdir(), "songmem-")), "songs.bin");
const { SongMemory } = await import("../dist/songMemory.js");


const BINS = 1024, BIN_HZ = 48000 / 2048, STEP = 8;   // ms per stor-FFT-ram

function mkSong(seed) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  // Stabil "låt": 40 toner som byts var 2:a sekund → reproducerbart spektrum.
  // Toner byts var 200 ms över hela spektrumet → varierat, låt-likt förlopp.
  const notes = Array.from({ length: 600 }, () => Array.from({ length: 4 }, () => 3 + Math.floor(rnd() * 210)));
  return (tMs, mag) => {
    mag.fill(0.001);
    const set = notes[Math.floor(tMs / 200) % notes.length];
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

/** Spela en källa vars position kan skilja sig från väggklockan. Det simulerar
 *  både sen inkoppling och seek utan att ändra SongMemorys injicerade klocka. */
async function playFrom(mem, song, clock, sourceStartMs, durMs, drops = []) {
  const mag = new Float32Array(BINS);
  const fired = [];
  const start = clock.t;
  let nextDrop = 0, prevPos = 0;
  for (let elapsed = 0; elapsed < durMs; elapsed += STEP) {
    clock.t = start + elapsed;
    const sourceT = sourceStartMs + elapsed;
    song(sourceT, mag);
    mem.pushSpectrum(mag, BIN_HZ, false);
    mem.tick({ level: 0.5, dropped: false, bpm: 128, bpmConfidence: 0.8, intensity: 0.6, beatAnchorMs: clock.t, learn: false });
    if (mem.takeDrop() > 0) { fired.push(sourceT); console.log('[t] DROP elapsed',elapsed,'sourceT',sourceT,'pos',mem.state().positionMs.toFixed(0)); }
    const pos = mem.state().positionMs;
    if (prevPos > 0) fired.maxJump = Math.max(fired.maxJump ?? 0, Math.abs(pos - prevPos - STEP));
    prevPos = pos;
    while (nextDrop < drops.length && drops[nextDrop] < sourceT - 1000) nextDrop++;
  }
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

// START MITT I LATEN → REALTID, INTE IGENKANNING (avsiktligt sedan 2026-08-07).
// Igenkanningen far bara etablera en match under latens forsta RECOG_WINDOW_MS och
// bara mot postens forsta RECOG_WINDOW_MS. En trask mot ett repeterat parti langre in
// kunde annars lasa pa fel position — MATT pekade medianen 44 s fel i en sadan lat.
// Priset: slas riggen pa mitt i en lat kor realtidsanalysen tills nasta lat borjar.
const midStart = 21037;
await playFrom(mem, A, clock, midStart, 12000);
const mid = mem.state();
// Inlärningens nollpunkt öppnas efter den 1 s långa musikgrinden; WAV,
// fingerprint och showdata delar därför sourceT - 1000 ms.
const expectedMid = midStart + 12000 - 1000;
const midError = Math.abs(mid.positionMs - expectedMid);
console.log("start mitt i laten:", mid.known ? `IGENKAND (positionsfel ${midError.toFixed(0)} ms)` : "realtid (ingen match) — forvantat");

// Seek framåt under en ETABLERAD match. Fortsatta fingerprint-träffar ska flytta
// showklockan och nästa drop-index, inte hålla kvar den första offseten.
// Matchen maste etableras fran latens BORJAN (igenkanningsfonstret) — foret arvdes
// den fran mitt-i-laten-testet, som numera avsiktligt inte ger nagon match.
// Etablera matchen fran latens BORJAN forst — med igenkanningsfonstret kan en match
// inte langre uppsta mitt i en lat, sa seek maste testas pa en REDAN etablerad match.
await playFrom(mem, A, clock, 0, 25000);
const beforeSeek = mem.state().positionMs;
const seekTo = 70083;
const seekFired = await playFrom(mem, A, clock, seekTo, 28000);
const afterSeek = mem.state();
console.log("seek: matchning", afterSeek.known ? "kvar" : "släppt (förväntat)", "— drops på fel plats:", seekFired.filter((t) => !dropsA.some((d) => Math.abs(d - t) < 800)).length);

await new Promise((r) => setTimeout(r, 300));   // låt sparningen landa
const mem2 = new SongMemory(() => clock.t);
await mem2.load();
console.log("laddat från disk:", mem2.state().songs, "låtar");
const firedB = await play(mem2, B, clock, 120000, [], true);
console.log("annan låt matchade:", mem2.state().known, "(ska vara false), drops ur minnet:", firedB.length);

// En etablerad match får aldrig leva förbi lagrad duration. Samma id blockeras
// efter släppet så kvarvarande gamla röster inte omedelbart låser tillbaka.
await playFrom(mem2, A, clock, 112000, 12000);
const pastEnd = mem2.state();
console.log("förbi lagrat slut: känd", pastEnd.known, "position", pastEnd.positionMs.toFixed(0), "ms");

await new Promise((r) => setTimeout(r, 300));
const mem3 = new SongMemory(() => clock.t);
await mem3.load();
// Gaplöst A→B utan tystnad. Den negativa offseten för B måste tillåtas så dess
// igenkänning kan sätta gränsen och nollpunkten nära början av låt #2.
await playFrom(mem3, A, clock, 0, 115000);
await playFrom(mem3, B, clock, 0, 15000);
const gapless = mem3.state();
console.log("gaplöst byte: låt #", gapless.songId, "position", gapless.positionMs.toFixed(0), "ms, gräns", gapless.lastBoundary);

await new Promise((r) => setTimeout(r, 300));
const mem4 = new SongMemory(() => clock.t);
await mem4.load();
// KORT föregående segment (under minsta låtlängd): inget får committas, men
// tidslinjen ska ändå ställas om direkt så showen är i synk med låt #2.
await playFrom(mem4, A, clock, 0, 40000);
await playFrom(mem4, B, clock, 0, 15000);
const shortPrev = mem4.state();
console.log("kort segment → snabb låsning: låt #", shortPrev.songId, "position", shortPrev.positionMs.toFixed(0), "ms, låtar", shortPrev.songs);

await new Promise((r) => setTimeout(r, 300));
const mem5 = new SongMemory(() => clock.t);
await mem5.load();
// DRIFT UNDER SEEK-TRÖSKELN (600 ms, t.ex. crossfade/buffertbyte). Nudgen ensam
// skulle ta ~20 s; den periodiska re-locken ska snappa tillbaka.
await playFrom(mem5, A, clock, 0, 20000);
const drifted = await playFrom(mem5, A, clock, 20000 + 600, 20000);
const dr = mem5.state();
const driftError = Math.abs(dr.positionMs - (20600 + 20000 - 1000));
console.log("drift 600ms: re-locks", dr.relocks, "kvarvarande fel", driftError.toFixed(0), "ms, största klockhopp", (drifted.maxJump ?? 0).toFixed(0), "ms");

// TRIMNING UR TVÄTTEN: ett orent segment (innehåller nästa låts början) ska
// klippas på trimAt, och en trimAt under minsta halva ska kasta hela låten.
await new Promise((r) => setTimeout(r, 300));
const mem6 = new SongMemory(() => clock.t);
await mem6.load();
const beforeTrim = mem6.state().songs;
mem6.applyRefined(1, { drops: [{ t: 5000, s: 1 }, { t: 90000, s: 1 }], bpm: 128, beatPhaseMs: 0, intensity: [], trimAt: 70000 });
const afterTrim = mem6.state().songs;
mem6.applyRefined(2, { drops: [], bpm: 128, beatPhaseMs: 0, intensity: [], trimAt: 30000 });
const afterDrop = mem6.state().songs;
console.log("trim:", beforeTrim, "låtar →", afterTrim, "(trimmad) →", afterDrop, "(kastad)");

const ok = fired.length >= 2

  && fired.every((f) => dropsA.some((d) => Math.abs(d - f) < 800))
  && !mid.known                      // start mitt i laten ska INTE kannas igen
  // SEEK PA EN LAST SYNK: positionen flyttas medvetet INTE (2026-08-08) — en stor
  // avvikelse ar nastan alltid ett repeterat parti, inte en spolning. Nara traffar
  // uteblir da och matchningen slapps av staleness-vagen → realtid resten av laten.
  && afterSeek.known === false
  // EFTER EN SEEK: inga drops pa FEL plats. En drop nara seek-punkten far missas —
  // positionen ar osaker i ~2,5 s och SEEK_CONFIRM tar 7,5 s att bekrafta, sa den hinner
  // passera. En missad drop ar battre an en pa fel stalle.
  && seekFired.every((t) => dropsA.some((d) => Math.abs(d - t) < 800))
  && gapless.songId === 2 && gapless.positionMs > 10000 && gapless.positionMs < 16000
  && gapless.lastBoundary === "igenkänd låt #2"
  && shortPrev.songId === 2 && shortPrev.positionMs > 10000 && shortPrev.positionMs < 16000
  && shortPrev.songs === 2
  && dr.known && driftError < 250 && (drifted.maxJump ?? 0) < 60
  && mem2.state().known === false
  && pastEnd.known === false
  && afterTrim === beforeTrim && afterDrop === beforeTrim - 1;
console.log(ok ? "OK" : "MISSLYCKADES");
process.exit(ok ? 0 : 1);
