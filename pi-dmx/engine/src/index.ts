/**
 * audio-dmx-engine entry point.
 *
 * Pipeline: arecord → Analyser → EffectEngine → DmxSender → Unix socket
 *                                                       ↓
 *                                                  dmx-helper → PL011 → MAX485
 *
 * Fastify serves the mobile control UI on :80 and pushes live state via WS.
 * A physical push-button on GPIO cycles through modes (see cfg.modeButton).
 * Runtime config is loaded from /var/lib/audio-dmx-engine/config.json and
 * saved back (debounced) whenever anything changes it.
 */

import { isLogOn } from "./quiet.js";   // FORST: tystar console.log innan ovriga moduler hinner logga (DMX_QUIET)
import { readFileSync, existsSync } from "node:fs";
import { AudioCapture } from "./audio.js";
import { BoundaryDetector } from "./boundaryDetector.js";
import { createAnalyser, type Frame } from "./analyser.js";
import { EffectEngine } from "./effects.js";
import { warmUpInBackground } from "./warmup.js";
import { DmxSender } from "./dmx.js";
import { startServer, applyInputRouting, type Server } from "./server.js";
import { loadConfig, scheduleSave } from "./persist.js";
import { Button } from "./button.js";
import { IntensityKnob } from "./intensityKnob.js";
import { KnobRing } from "./knobRing.js";
import { BleClient, type BleScanDevice, type BleCal } from "./bleClient.js";
import { applyIntensity } from "./moods.js";
import { BeatFeed } from "./beatFeed.js";
import * as health from "./runtimeHealth.js";
import { logHealth } from "./healthLog.js";



import { activeSlots, fixtureRoles, type Mode } from "./config.js";
import { EFFECT_KEYS, EFFECT_MAP } from "./effects/registry.js";

// DMX_QUIET=1 (ladan 2026-09-27, agaren: "inaktivera logg tills vi sager att vi ska kolla nagot"): tystar all console.log
// (journald pa karna 0 kostar CPU och I/O under spelning). console.warn/error gar fortfarande igenom. Standard PA sedan 09-29; DMX_QUIET=0 slar pa loggen.
// Brytaren bor i quiet.ts (importerad forst, se ovan) och kan slas om under drift: PUT /api/debug/verbose (2026-10-04).

// Physical button cycles through the fun modes (skips blackout so the button never kills the show).
// Härlett ur effekt-registret (samma ordning) → ingen lista att hålla i synk.
const MODE_CYCLE: Mode[] = ["smart", ...EFFECT_KEYS];

const cfg = await loadConfig();
// Migrate legacy mode names from persisted configs.
// Migrera BORTTAGNA lägesnamn (strobe/pulse är RIKTIGA nuvarande lägen → ej här).
const LEGACY_MODES: Record<string, Mode> = { auto: "wave", comet: "wave", spectrum: "eq", vu: "gravity" };
if (LEGACY_MODES[cfg.mode as string]) cfg.mode = LEGACY_MODES[cfg.mode as string];
if (cfg.mode !== "smart" && cfg.mode !== "blackout" && !EFFECT_MAP.has(cfg.mode)) cfg.mode = "smart";
cfg.fft.hop = 128;   // analys 375 Hz (beprövad tuning); render/DMX separat 100 Hz
if (!cfg.dmxMaxHz || cfg.dmxMaxHz <= 50) cfg.dmxMaxHz = 100;   // migrera gamla 50-taket → tightare synk
// Migrera äldre intensityRing utan de nya fälten (maxBright/pulseBoost/blackoutFadeMs).
if (cfg.intensityRing) {
  const r = cfg.intensityRing as Partial<NonNullable<typeof cfg.intensityRing>>;
  cfg.intensityRing = {
    bus: r.bus ?? 0, device: r.device ?? 0,
    maxBright: r.maxBright ?? 0.40,
    pulseBoost: r.pulseBoost ?? 0.18,
    blackoutFadeMs: r.blackoutFadeMs ?? 400,
  };
}

// RÖKENS UPPVÄRMNINGSKLOCKA FÅR INTE ÖVERLEVA EN STRÖMCYKEL.
// cfg.fog.warmStartMs persisteras med flit så en MOTOR-omstart (deploy, krasch,
// systemd-restart) inte påstår "10 min kvar" om en maskin som stått varm. Men i
// en bar slås hela lådan av över natten: då bootar den, warmStartMs är från
// igår, och UI:t säger "✓ Redo" om en rökmaskin som stått kall i arton timmar —
// exakt det problem nedräkningen fanns till för att lösa.
// Exakt test i stället för tumregel: räkna fram NÄR Pi:n bootade och kasta
// tiden bara om den sattes FÖRE det. En motoromstart 3 min efter boot bevaras
// alltså korrekt, vilket en enkel "uptime < N"-gräns hade slarvat bort.
try {
  const upSec = Number(readFileSync("/proc/uptime", "utf8").split(" ")[0]);
  const bootMs = Date.now() - upSec * 1000;
  if (cfg.fog?.warmStartMs && cfg.fog.warmStartMs < bootMs) {
    cfg.fog.warmStartMs = 0;   // kallstart → nedräkningen börjar om vid första render
    console.log("[fog] kallstart — uppvärmningen räknas om");
  }
} catch { /* /proc saknas (ej Linux) → behåll det persisterade värdet */ }

// Re-apply the chosen codec input routing (the boot service restores the aux
// default; this honors a persisted mic choice).
applyInputRouting(cfg.audioInput === "mic" ? "mic" : "aux");
// DELAD ANALYSATOR (analyser.ts/split.ts): utan DMX_ANALYSER_SPLIT ar detta exakt `new Analyser(cfg)`.
// Med DMX_ANALYSER_SPLIT=worker flyttas tempo/gridfas/sektion till en egen trad pa en egen karna —
// motivet ar matningen 15,6 % av hoppen over budget (0,99 ms snitt, toppar 235 ms mot 2,67 ms).
const analyser = createAnalyser(cfg);
analyser.resetGain(cfg.audioInput === "mic" ? 20 : 1);
analyser.setGainLock(cfg.audioInput !== "mic", 1);  // aux: fixed 1x
const effects = new EffectEngine(cfg);
const dmx = new DmxSender();
dmx.setMaxHz(cfg.dmxMaxHz);

// LATGRANS UR LJUDET (2026-09-23). Det enda som blev kvar av latminnet: allt annat - fingeravtryck,
// igenkanning, replay, inlarning, offline-tvatt, strukturanalys, namngivning - var offline-arbete som ska ske
// pa PC:n och kostade i drift synkron disk-I/O + en BigInt-indexombyggnad (sekunder pa Pi:n) vid varje
// latcommit. Gransdetektorn ar utbruten oforandrad (tools/boundaryEquiv.mjs bevisar samma hop) och matas
// fran analysatorns stora FFT precis som forr - ingen extra transform.
const bounds = new BoundaryDetector();
analyser.setSpectrumSink((mag, binHz) => bounds.pushSpectrum(mag, binHz));




// TAKTMATNINGEN (kick-PLL, tillit, fasfoljare, coast) bor i beatFeed.ts - samma kod som bankerna kor (matfalla 43).
const beatFeed = new BeatFeed();
let latestFrame: Frame | null = null;
let lastChunkAt = Date.now();   // hälsokoll: uppdateras varje ljud-chunk
let lastRenderMs = 0;
/** Kopia av senast SÄNDA ramen. Fallback-ticken tonar ned den vid ljudavbrott —
 *  den gissar aldrig fram en ny bild, för den har ingen giltig indata att gissa ur. */
let lastUniverse: Uint8Array | null = null;
let fadeUniverse = new Uint8Array(0);
const dmxProbe = { left: 0, chs: [] as number[], rows: [] as string[], t0: 0 };
let lastLiveDrop = 0;        // senast sedda drop-räknare FRÅN analysatorn
let lastBoundary = 0;        // senast sedda låtgräns-räknare (dynamikens omkalibrering)
let lastCharShift = 0;
let lastTempoShift = 0;
let outDrop = 0;             // drop-räknaren effekterna ser (live eller replay)
const slotsFor = () => Math.max(activeSlots(cfg.fixtures), cfg.fog?.enabled ? cfg.fog.address : 0);
let curSlots = slotsFor();


const capture = new AudioCapture({
  device: cfg.audio.device,
  rate: cfg.audio.rate,
  channels: cfg.audio.channels,
  channel: cfg.audioChannel ?? "auto",
  hopSamples: cfg.fft.hop,
});

// LJUDKLOCKA: varje chunk ar ett hop (hopSamples = cfg.fft.hop), sa antalet
// chunkar x hoplangd ar exakt hur mycket ljud som passerat — utan leveransjitter.
// Matas till analysatorn FORE process() sa slagtiden stamplas ur ljudet, inte ur
// vaggklockan. Se Analyser.setAudioClockMs.
let audioChunks = 0;
const HOP_MS = (cfg.fft.hop / cfg.audio.rate) * 1000;
health.setAnalyserBudgetMs(HOP_MS);   // en hop far kosta hogst en hop-period
// OPT-IN (DMX_AUDIO_CLOCK=1) tills det ar matt PA DEN HAR hardvaran. Pa lotus
// gav samma fix -18 % median-jitter i onset-intervall (samma lat, 2300 intervall
// per villkor, 2026-09-04) — verkligt men litet (~1 ms). Mic-omstartsrisken ar
// stangd med en diskontinuitetsvakt i Analyser.setAudioClockMs. Mat med
// lotus tools/kick-ab.py-upplagget innan default vands.
const AUDIO_CLOCK_ON = process.env.DMX_AUDIO_CLOCK === '1';
// INSPELAREN (recorder/recorder.ts - samma fil som i lotus, bredvid analysatorn). AV i DMX; DMX_RECORDER=1 slar pa. Den far
// samma hop som analysatorn och laser dropCount/sektion ur ramen; varje latgrans (boundaryDetector) ar en ny "lat"
// (ladan-<n>). Fangsterna (tempo 10 s in/30 s, drop 15+15 s, max 2 per lat, ko 30) hamnar i DMX_RECORDER_DIR.
let recorder: import("./recorder/recorder.js").Recorder | null = null;   // PC-/optimeringsmodul: laddas BARA med DMX_RECORDER=1 (realtidsprincipen)
if (process.env.DMX_RECORDER === "1") {
  const { Recorder } = await import("./recorder/recorder.js");
  recorder = new Recorder({ dir: process.env.DMX_RECORDER_DIR || "/var/lib/audio-dmx-engine/snippets", sampleRate: cfg.audio.rate, enabled: true }, {
    latestFrame: () => latestFrame,
    beatInfo: () => cfg.beat ?? null,
    isPlaying: () => Date.now() - lastChunkAt < 1000,
    songKey: (artist, title) => (artist + "|" + title).toLowerCase().replace(/[^a-z0-9|]+/g, ""),
  });
  recorder.enablePreroll(true);
  recorder.noteTrack("ladan-0", "dmx");
  recorder.start();
}
// Argumentobjekt som fylls per hop i stallet for nya literaler (skrapjakten 10-01: 375 Hz). Mottagarna laser dem synkront.
const boundsArg = { level: 0, bpm: 0, bpmConfidence: 0 };
const ringArg = { intensity: 0.5, blackout: false, beat: false };
capture.on("chunk", (samples: Float32Array) => {
  // MATNING BARA VID FELSOKNING (2026-10-04, agaren): runtimeHealth ar ren diagnostik (/api/health-log); watchdogens /health
  // bygger pa lastChunkAt och paverkas inte. PUT /api/debug/verbose {enabled:true} slar pa tidtagningen.
  const diag = isLogOn();
  const t0 = diag ? performance.now() : 0;
  if (AUDIO_CLOCK_ON) analyser.setAudioClockMs(audioChunks++ * HOP_MS);
  const frame = analyser.process(samples);
  if (diag) {
    const anMs = performance.now() - t0;
    health.noteSlowCall("analyser.process", anMs);
    health.noteAnalyser(anMs);   // kostnad mot hop-budgeten (avgor om DMX ocksa behover worker-delningen)
    health.noteChunk();
  }
  recorder?.push(samples);   // inspelaren (AV utan DMX_RECORDER=1): samma hop som analysatorn
  latestFrame = frame;
  lastChunkAt = Date.now();

  const liveDrop = frame.dropCount !== lastLiveDrop;
  lastLiveDrop = frame.dropCount;
  // LATGRANS (se boundaryDetector.ts) -> mjuk omkalibrering av den lopande dynamiken (auto-rangen far krypa in
  // pa nya latens nivaer inom sekunder i stallet for en minut) och latbytes-hint till tempot: medianfonstret
  // (~5 s) och tempogrammet tillhor forra laten. DMX_BOUNDARY_SOFT: mjuk hint i st.f. hard nollstallning -
  // falska latgranser pa pop kastade tempolaset 5x/5 min (ladan 2026-09-04).
  boundsArg.level = frame.level; boundsArg.bpm = frame.bpm; boundsArg.bpmConfidence = frame.bpmConfidence;
  bounds.tick(boundsArg);
  if (bounds.charShiftCount !== lastCharShift) { lastCharShift = bounds.charShiftCount; effects.noteCharShift(); }
  // TEMPOVAXLING UPPAT -> samma bytesskal som karaktarsskiftet (6 s giltigt, MIN_HOLD galler), egen text i loggen.
  if (bounds.tempoShiftCount !== lastTempoShift) { lastTempoShift = bounds.tempoShiftCount; effects.noteCharShift(`tempovaxling ${bounds.tempoShiftFrom}->${bounds.tempoShiftTo} BPM`); }
  if (bounds.boundaryCount !== lastBoundary) {
    lastBoundary = bounds.boundaryCount; effects.softenRange(); if (process.env.DMX_BOUNDARY_SOFT !== '0') analyser.hintTrackChange(5000); else { analyser.resetTempo(); if ((process.env.DMX_SECTION_HINT_LOWCONF ?? '0') === '0') analyser.hintTrackChange(5000); }   // riktig latgrans nollar sektionerna (tempotappet gor det inte langre)
    if (recorder) { const name = "ladan-" + lastBoundary; recorder.noteTrack(name, "dmx"); recorder.trackChanged("dmx", name); }
  }



  if (liveDrop) outDrop++;   // realtidsdetektorn ager dropsen (latminnet borta 2026-09-23)

  frame.dropCount = outDrop;
  beatFeed.update(frame, cfg, analyser);   // tillit + taktklocka (beatFeed.ts; forr inline har)
  // Akustisk tröghet: mata bastransienten till effektmotorn (i full 375 Hz så
  // inga slag missas) → show-tiden får en knuff, starkare ju tyngre basen är.
  if (frame.kick) effects.registerKick(0.4 + Math.min(1, frame.energy * 1.4) * 0.6);
  // KICK-BYPASS: vänta inte på nästa rasterruta för en bastransient — den är
  // exakt det ögonblick ögat jämför mot örat. Rendera direkt och flytta fram
  // rasterdeadlinen så vi inte får två rutor på 1 ms.
  if (frame.kick) { renderAndSend(); nextRenderAt = performance.now() + RENDER_MS; }

  // WS2812-ringen: mata intensity + kick-puls varje frame (billig update; ringen
  // renderar själv i egen takt @ 30 Hz och avklingar puffen mjukt).
  if (ring) {
    ringArg.intensity = cfg.activeIntensity ?? 0.5;
    ringArg.blackout = cfg.mode === "blackout";
    ringArg.beat = frame.kick;
    ring.update(ringArg);
  }

  // Renderingen ligger INTE här längre — se renderTick nedan. Analysen (FFT/onset/
  // BPM) körs varje chunk (~375 Hz) för tighta drops; effekterna renderas på ett
  // EGET fast raster så renderintervallet inte längre varierar med analyslasten.
});


/**
 * DIAGNOSTIK: sampla den FAKTISKA DMX-utgången (efter puls, tak och kalibrering)
 * så pulsen kan verifieras på det som lamporna får — inte på en mellansignal.
 *
 * Anropas från BÅDA sändvägarna. Låg den bara i renderAndSend blev fallback-vägen
 * osynlig för proben — och då går felläget inte att mäta med det verktyg som ska
 * bevisa det. (Precis det hände 2026-08-08: uttoningen gav noll rader.)
 */
function probeSample(universe: Uint8Array): void {
  if (dmxProbe.left <= 0) return;
  dmxProbe.left--;
  // Taktfasen räknas ur samma klocka som effekterna använder → 0 = precis på slaget.
  let bf = -1;
  if (cfg.beat && cfg.beat.bpm > 40) {
    const bMs = 60000 / cfg.beat.bpm;
    bf = ((((Date.now() - cfg.beat.anchorMs) % bMs) + bMs) % bMs) / bMs;
  }
  dmxProbe.rows.push(`${Math.round(performance.now() - dmxProbe.t0)},${bf.toFixed(3)},${dmxProbe.chs.map((c) => universe[c]).join(",")}`);
  if (dmxProbe.left === 0) console.log("[dmxprobe] ms,beatFrac," + dmxProbe.chs.join(",") + "|" + dmxProbe.rows.join("|"));
}

/**
 * RENDER + SÄND — den ENDA vägen ut till lamporna.
 *
 * Bröts ut ur chunk-hanteraren så att fallback-ticken (se nedan) kan köra EXAKT
 * samma väg. Två renderingsvägar hade blivit två sanningar om vad som ska lysa,
 * och de skulle glida isär vid första ändringen.
 */
function renderAndSend(): void {
    if (!latestFrame) return;   // inget ljud har någonsin kommit — inget att rendera
    lastRenderMs = performance.now();   // FUNKTIONELL (fallback-ticken laser den) - alltid
    const diag = isLogOn();   // halsomatningen bara vid felsokning (se chunk-hanteraren)
    if (diag) health.noteRender(lastRenderMs, RENDER_MS);
    const universe = effects.render(latestFrame);
    probeSample(universe);
    dmx.send(universe, curSlots);
    if (diag) health.noteSlowCall("render+dmx", performance.now() - lastRenderMs);

    // Spara ramen så fallback-ticken har något att tona ned om ljudet dör.
    if (!lastUniverse || lastUniverse.length !== universe.length) {
      lastUniverse = new Uint8Array(universe.length);
      fadeUniverse = new Uint8Array(universe.length);
    }
    lastUniverse.set(universe);
    // BLE-slingorna får riggens dominanta färg: medelvärde av alla R/G/B/W-kanaler
    // (W adderas i alla tre → varmvit blir vit på BLEDOM som saknar W). Master
    // skickas som separat brightness så sidecarn kan gamma-korrigera. Billigt
    // (max ~40 iterationer @ 100 Hz) och håller BLE i takt med DMX utan att
    // effekterna behöver veta om att slingorna finns.
    if (bleClient && cfg.bleDevices && cfg.bleDevices.length > 0) {
      let rs = 0, gs = 0, bs = 0, n = 0;
      const fixtures = cfg.fixtures;
      for (let f = 0; f < fixtures.length; f++) {
        const fx = fixtures[f];
        const roles = fixtureRoles(fx);
        let r = 0, g = 0, b = 0, w = 0, hasRgb = false;
        for (let i = 0; i < roles.length; i++) {
          const v = universe[fx.address - 1 + i] ?? 0;
          const role = roles[i];
          if (role === "r") { r = v; hasRgb = true; }
          else if (role === "g") { g = v; hasRgb = true; }
          else if (role === "b") { b = v; hasRgb = true; }
          else if (role === "w") { w = v; }
          else if (role === "dim") { r = g = b = v; hasRgb = true; }
        }
        if (hasRgb) { rs += Math.min(255, r + w); gs += Math.min(255, g + w); bs += Math.min(255, b + w); n++; }
      }
      if (n > 0) bleClient.setColor(rs / n / 255, gs / n / 255, bs / n / 255, cfg.master);
    }
}

/**
 * RENDER-RASTER — 100 Hz på EGEN tidsaxel, inte piggyback på ljud-chunkarna.
 *
 * Förr renderades det inne i chunk-hanteraren med villkoret "≥10 ms sedan sist".
 * Chunkarna kommer ~375 Hz (2,7 ms), så det faktiska intervallet blev 10,7–13,4 ms
 * och varierade med analyslasten: en BPM-beräkning eller en tung chunk sköt render
 * framåt, och fasen mot taktklockan gled. Här sätts deadline i förväg och
 * kompenseras, så rutan ligger på 10 ms oavsett vad analysen gjorde.
 *
 * LJUDBEROENDET ÄR KVAR: rastret renderar bara när det finns FÄRSKT ljud. Utan
 * chunk senaste 40 ms lämnas ramen orörd så fallback-ticken nedan tar över och
 * tonar ned — motorn ska aldrig rendera vidare på en gammal frame.
 */
const RENDER_MS = 5;   // 200 Hz — halverar rastrets bidrag till latens (5 ms → 2,5 ms i snitt)
let nextRenderAt = performance.now() + RENDER_MS;
function renderTick(): void {
  const now = performance.now();
  nextRenderAt += RENDER_MS;
  // Låg vi efter (GC, tung chunk)? Hoppa fram i stället för att köra igen en
  // skur av inhämtningsrutor — lamporna vinner inget på att få gammal ljus.
  if (nextRenderAt < now) nextRenderAt = now + RENDER_MS;
  if (Date.now() - lastChunkAt <= FALLBACK_AFTER_MS) renderAndSend();
  setTimeout(renderTick, Math.max(0, nextRenderAt - performance.now()));
}
setTimeout(renderTick, RENDER_MS);



// FALLBACK-TICK — riggen får inte FRYSA om ljudet tystnar i utgången.
// Renderingen drivs av ljud-chunkar: ingen chunk ⇒ ingen render() ⇒ ingen
// dmx.send(), och lamporna står kvar på sista ramen. Mitt i en drop kan det vara
// full vit, och den står kvar tills någon startar om tjänsten. Tystnadsgrinden
// kan inte rädda det, för den bor INUTI render.
//   MÄTT 2026-08-08: noll "[arecord] exited" på sju dagar (mot 46 overruns, som
//   är något annat — tappat ljud, inte död process). Det här är alltså försäkring
//   mot ett sällsynt men elakt fel, inte en lagning av något som händer i drift.
// Ramen TONAS NED i stället för att frysa, så den BEFINTLIGA input-off-vägen
// (nivå under 0,02 i 2 s → allt släckt) mörklägger riggen av sig själv. Inget
// nytt beteende, ingen andra sanning om när det ska vara mörkt.
const FALLBACK_AFTER_MS = 40;   // 4 missade 100 Hz-rutor → ljudet driver inte längre
const FALLBACK_FADE_MS = 400;   // uttoning till svart när ljudet är borta
const FALLBACK_HOLD_MS = Number(process.env.DMX_FALLBACK_HOLD_MS ?? 250);   // korta ljudluckor: hall ramen, dampa inte
setInterval(() => {
  // Normal drift: renderingen är alltid färsk (100 Hz) → vi avslutar direkt.
  if (performance.now() - lastRenderMs < FALLBACK_AFTER_MS) return;
  if (!lastUniverse) return;    // inget har någonsin lyst — inget att tona ned
  // FÖRSTA FÖRSÖKET MATADE MOTORN MED PÅHITTADE, AVTAGANDE RAMAR. Det gick åt
  // FEL HÅLL: `ceilingActive`/`pulseActive` i effects.ts kräver `silenceGate > 0.5`,
  // så när den påhittade nivån sjönk slutade LJUSTAKET appliceras — och taket är
  // det som håller riggen på DMX 20–60. MÄTT 2026-08-08 med arecord dödad mitt i
  // showen: utgången rampade 27 → 145 → 225 och låg kvar på 225 tills ljudet kom
  // tillbaka. Alltså full vit i stället för mörker, precis det vi ville undvika.
  // Nu rör vi inte effektmotorn alls under avbrottet. Den har ingen giltig indata
  // och ska inte tvingas gissa. Vi tonar bara ned DET SOM REDAN LÖSTE och håller
  // svart tills ljudet är tillbaka — ett entydigt felläge utan nya beteenden.
  // HALL FORST, TONA SEN (ladan 2026-09-24, DMX-sonden: mikroflimmer). Forr dampade forsta reservramen direkt (10 % efter 40 ms) - ljudblock
  // som kommer i klump gav en morkare ram mellan tva normala = flimmer over hela riggen. Nu: oforandrad ram FALLBACK_HOLD_MS, sedan uttoning.
  const k = Math.max(0, 1 - Math.max(0, Date.now() - lastChunkAt - FALLBACK_HOLD_MS) / FALLBACK_FADE_MS);
  for (let i = 0; i < lastUniverse.length; i++) fadeUniverse[i] = (lastUniverse[i] * k + 0.5) | 0;
  probeSample(fadeUniverse);
  dmx.send(fadeUniverse, curSlots);
  lastRenderMs = performance.now();
}, 20);

// LOGGTAK för overruns: en dålig ALSA-minut kan ge hundratals identiska rader,
// och på SD-kort kostar journald-skrivningarna mer än felet de beskriver — de
// dränker dessutom de rader man faktiskt behöver läsa. Vi räknar varje overrun
// (syns exakt i /api/health-log) men skriver högst en rad per 10 s, med antalet.
let overrunSinceLog = 0;
let lastOverrunLogAt = 0;
capture.on("stderr", (s) => {
  if (/overrun|underrun/i.test(s)) {
    health.noteOverrun();
    overrunSinceLog++;
    const now = performance.now();
    if (now - lastOverrunLogAt < 10_000) return;
    lastOverrunLogAt = now;
    console.error(`[arecord] overrun ×${overrunSinceLog} (senaste 10s)`);
    overrunSinceLog = 0;
    return;
  }
  console.error("[arecord]", s);
});

capture.on("stall", (gap: number) => logHealth("warn", "audio", `tyst i ${gap}ms — startar om capturen`));

capture.on("exit", (code) => console.error("[arecord] exited", code));

// ── ÅTERHÄMTNINGSTRAPPAN (se audio.ts) ────────────────────────────────────────
// Steg 3–4: ren respawn hjälpte inte → sätt om ALSA-rutten. codec-zero kan hamna
// i fel ingång när jacket rörs, och då levererar arecord tystnad hur många gånger
// vi än startar om den.
capture.on("rebind", (n: number) => {
  logHealth("warn", "audio", `återhämtning ${n}: sätter om ALSA-ingången (${cfg.audioInput === "mic" ? "mik" : "aux"})`);
  applyInputRouting(cfg.audioInput === "mic" ? "mic" : "aux");
});
// Trappan slut → SÄKERT LÄGE. Riggen står svart via den befintliga uttoningen,
// men nu står det i hälsologgen VARFÖR, och vi slutar bränna CPU på respawn-jakt.
capture.on("safe", (n: number) => logHealth("err", "audio", `ingen ljudinfångning efter ${n} försök — säkert läge, nytt försök var 3:e sekund`));
capture.on("recovered", () => logHealth("info", "audio", "ljudinfångningen tillbaka — säkert läge avslutat"));


// 1 Hz-sampling av hälsomåtten (event-loop-lag mäts som schemats egen försening).
setInterval(() => { if (isLogOn()) health.sample(); }, 1000);   // diagnostik bara vid felsokning


capture.start();


// Shared mode cycler — used by both the physical button and the WS "cycleMode" message,
// so UI and hardware follow the exact same path.
let server: Server | undefined;
const cycleMode = (): Mode => {
  // Filter to modes the user has enabled in rotation; fall back to the full
  // list if they disabled everything so the button never becomes a no-op.
  const enabled = MODE_CYCLE.filter((m) => cfg.rotation?.[m] !== false);
  const list = enabled.length > 0 ? enabled : MODE_CYCLE;
  const cur = list.indexOf(cfg.mode);
  cfg.mode = list[(cur + 1) % list.length];
  scheduleSave(cfg);
  server?.broadcastConfig();   // kan anropas innan `server` tilldelats (WS i startfönstret)
  return cfg.mode;
};

// BLE-sidecarn (BLEDOM-slingor) — instansieras här så motorn kan mata färger
// varje render-frame. Om sidecarn är nere, socketen saknas, eller ingen slinga
// är parad så är alla setColor/scan-anrop tysta no-ops → resten av showen bryr
// sig inte.
const bleClient = new BleClient();
const bleScanSubs: ((d: BleScanDevice[]) => void)[] = [];
const blePairedSubs: (() => void)[] = [];
bleClient.setListeners({
  onScan:   (devices) => { for (const fn of bleScanSubs)  fn(devices); },
  onPaired: () =>        { for (const fn of blePairedSubs) fn(); },
});
bleClient.setKnownDevices(cfg.bleDevices ?? []);
bleClient.start();

const serverDeps = {
  cfg,
  getLatestFrame: () => latestFrame,
  getActiveMode: () => effects.getActiveMode(),
  // Frisk = en ljud-chunk bearbetad senaste 10 s (arecord + event-loop lever).
  getHealthy: () => Date.now() - lastChunkAt < 10000,
  // DIAGNOS för watchdogen: är felet ljud eller DMX? Ett ljudfel går att laga
  // riktat (starta om capturen) utan att slå ner hela showen med en processomstart.
  getFailReason: () => {
    if (Date.now() - lastChunkAt >= 10000) return capture.inSafeMode ? "audio-safe" : "audio";
    if (!dmx.isConnected()) return "dmx";
    return "";
  },
  recoverAudio: () => capture.recover(),
  getDmxConnected: () => dmx.isConnected(),

  getFogStatus: () => effects.getFogStatus(),
  resetFogService: () => effects.resetFogService(),
    probeDmx: (channels: number[], frames: number) => {
      dmxProbe.chs = channels; dmxProbe.rows = []; dmxProbe.t0 = performance.now(); dmxProbe.left = frames;
    },
  cycleMode,

  resetAgc: (g?: number) => analyser.resetGain(g),
  setGainLock: (locked: boolean) => analyser.setGainLock(locked, 1),
  onConfigChanged: () => {
    scheduleSave(cfg);
    curSlots = slotsFor();
    dmx.setMaxHz(cfg.dmxMaxHz);
    if (ring && cfg.intensityRing) ring.setOptions({
      maxBright: cfg.intensityRing.maxBright,
      pulseBoost: cfg.intensityRing.pulseBoost,
      blackoutFadeMs: cfg.intensityRing.blackoutFadeMs,
    });
    // Håll sidecarns persisterade lista i synk (paired/unpaired från vilket UI som helst).
    bleClient.setKnownDevices(cfg.bleDevices ?? []);
  },
  ble: {
    activeCount: () => bleClient.activeCount,
    paired: () => bleClient.pairedCache,
    scan:   () => bleClient.scan(),
    pair:   (mac: string) => bleClient.pair(mac),
    unpair: (mac: string) => bleClient.unpair(mac),
    identify: (mac: string) => bleClient.identify(mac),
    setCal: (mac: string, cal: BleCal) => bleClient.setCal(mac, cal),
    onScan:   (fn: (d: BleScanDevice[]) => void) => { bleScanSubs.push(fn); },
    onPaired: (fn: () => void) => { blePairedSubs.push(fn); },
  },
};
const s80 = await startServer(serverDeps, Number(process.env.PORT ?? 80));
// UPPVARMNING (2026-09-27, realtidsprincipen - se warmup.ts): V8 far se alla sallsynta grenar pa skrap-instanser sa att
// process() optimeras en gang och ligger kvar. Startas EFTER server + ljud (22:54: bitar under uppstarten forsenade /health
// -> vakthunden startade om) och kors i 10-hop-bitar i bakgrunden. DMX_WARMUP=0 stanger av.
{
  const wp = process.env.DMX_WARMUP ?? "/opt/audio-dmx-engine/warmup/warmup.wav";
  if (wp !== "0") {
    // I BAKGRUNDEN i sma bitar (22:49: synkron uppvarmning blockerade /health -> pi-dmx-watchdog startade om i loop).
    warmUpInBackground(cfg, wp, (r) => {
      if (r) console.warn(`[warmup] klar: ${r.secs.toFixed(0)} s ljud, ${r.hops} hop pa ${(r.ms / 1000).toFixed(1)} s (i bakgrunden)`);
      else console.warn(`[warmup] hoppas over: ${wp} saknas eller fel format (mono 16-bit ${cfg.audio.rate} Hz)`);
    });
  }
}

// HTTPS on 443 (self-signed) — kept in case future features need a secure
// context on the phone (getUserMedia etc.). Optional, serves same routes.
let s443: Server | null = null;
const TLS_KEY = "/etc/audio-dmx/tls/key.pem";
const TLS_CERT = "/etc/audio-dmx/tls/cert.pem";
if (existsSync(TLS_KEY) && existsSync(TLS_CERT)) {
  try {
    s443 = await startServer(serverDeps, 443, { key: readFileSync(TLS_KEY), cert: readFileSync(TLS_CERT) });
    console.log("https on :443");
  } catch (e) {
    console.error("[https] failed:", (e as Error).message);
  }
}
server = {
  app: s80.app,
  broadcastConfig: () => { s80.broadcastConfig(); s443?.broadcastConfig(); },
};
console.log(`audio-dmx-engine listening on ${server.app.server.address()}`);

// Physical mode button — short press cycles modes, long press toggles AGC
// aggressiveness between "Lugn" (a=0.1) and "Aggressiv" (a=0.8).
const AGC_CALM = 0.1;
const AGC_AGGRESSIVE = 0.8;
const applyAggressiveness = (a: number) => {
  cfg.detection.tauUp   = 180 * Math.pow(10 / 180, a);
  cfg.detection.tauDown = 60  * Math.pow(2  / 60,  a);
};

let button: Button | null = null;
if (cfg.modeButton) {
  button = new Button({ chip: cfg.modeButton.chip, line: cfg.modeButton.line });
  button.on("press", () => {
    const next = cycleMode();
    console.log(`[button] mode → ${next}`);
  });
  button.on("longPress", () => {
    // Decide from current tauUp which side we're on and flip.
    const isAggressiveNow = cfg.detection.tauUp < 60;
    const next = isAggressiveNow ? AGC_CALM : AGC_AGGRESSIVE;
    applyAggressiveness(next);
    console.log(`[button] AGC → ${next === AGC_CALM ? "Lugn" : "Aggressiv"} (tauUp=${cfg.detection.tauUp.toFixed(1)}s)`);
    scheduleSave(cfg);
    server?.broadcastConfig();
  });
  button.on("stderr", (s) => console.error("[gpiomon]", s));
  button.on("exit", (code) => console.error("[gpiomon] exited", code));
  button.start();
  console.log(`mode-button on ${cfg.modeButton.chip} line ${cfg.modeButton.line} (short=mode, long=AGC)`);
}

// KY-040 stämnings-vred → applyIntensity → samma kod-väg som WS "setIntensity".
// UI-slidern och vredet är alltså exakt samma "input" — vem som än rör den
// senast vinner, och båda syns hos alla klienter via `activeIntensity` i frame.
let knob: IntensityKnob | null = null;
let knobSw: Button | null = null;
if (cfg.intensityKnob) {
  const k = cfg.intensityKnob;
  knob = new IntensityKnob({
    chip: k.chip, clk: k.clk, dt: k.dt,
    initial: cfg.activeIntensity ?? 0.5,
  });
  knob.on("change", (v: number) => {
    applyIntensity(cfg, v);
    scheduleSave(cfg);
    server?.broadcastConfig();
  });
  knob.on("stderr", (s: string) => console.error("[knob]", s));
  knob.start();
  console.log(`intensity-knob on ${k.chip} CLK=${k.clk} DT=${k.dt}${k.sw != null ? ` SW=${k.sw}` : ""}`);

  // Push-knapp på vredet: kort tryck = hoppa till närmaste bucket-mitt
  // (0/0.5/1); långt tryck = blackout-toggle.
  if (k.sw != null) {
    knobSw = new Button({ chip: k.chip, line: k.sw });
    knobSw.on("press", () => {
      const x = cfg.activeIntensity ?? 0.5;
      const next = x < 1 / 3 ? 0.5 : x < 2 / 3 ? 1 : 0;
      applyIntensity(cfg, next);
      knob?.set(next);
      scheduleSave(cfg);
      server?.broadcastConfig();
      console.log(`[knob-sw] intensity → ${next.toFixed(2)}`);
    });
    knobSw.on("longPress", () => {
      cfg.mode = cfg.mode === "blackout" ? "smart" : "blackout";
      scheduleSave(cfg);
      server?.broadcastConfig();
    });
    knobSw.start();
  }

  // WS "setIntensity" från UI: håll vredets interna värde synkat så nästa
  // detent-vridning fortsätter från rätt position (och inte hoppar tillbaka).
  const origBroadcast = server?.broadcastConfig;
  if (origBroadcast && server) {
    server.broadcastConfig = () => { knob?.set(cfg.activeIntensity ?? knob.get()); origBroadcast.call(server); };
  }
}

// WS2812B LED-ring (Electrokit 12-LED) — visuell återkoppling för vredet på
// själva boxen: hyresgäster ser direkt vilket steg de valt utan att titta i UI:t.
let ring: KnobRing | null = null;
if (cfg.intensityRing) {
  const r = cfg.intensityRing;
  ring = new KnobRing({
    bus: r.bus, device: r.device,
    maxBright: r.maxBright, pulseBoost: r.pulseBoost, blackoutFadeMs: r.blackoutFadeMs,
  });
  ring.start();
  console.log(`intensity-ring on SPI${r.bus}.${r.device} (12 × WS2812B, max ${Math.round(r.maxBright * 100)}%)`);
}

// Rökens drifträknare tickar i RENDERLOOPEN, inte via config-meddelanden — utan
// det här skulle de bara nå flashen av en slump (nästa gång någon råkar röra en
// inställning). Spara var 5:e minut, och bara när något faktiskt rökt sedan
// sist: en tomgångsskrivning per 5 min hela kvällen sliter på SD-kortet i onödan.
let savedSprayMs = cfg.fog?.sprayMs ?? 0;
setInterval(() => {
  const s = cfg.fog?.sprayMs ?? 0;
  if (s !== savedSprayMs) { savedSprayMs = s; scheduleSave(cfg); }
}, 300000);


process.on("SIGTERM", () => {
  capture.stop();
  button?.stop();
  knob?.stop();
  knobSw?.stop();
  ring?.stop();
  dmx.close();
  process.exit(0);
});
