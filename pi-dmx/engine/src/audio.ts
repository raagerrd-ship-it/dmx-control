/**
 * ALSA capture via `arecord` subprocess. Simplest reliable path — no native
 * addon to maintain, ~15 ms latency which is well within our 40-80 ms budget.
 *
 * Emits Float32 mono samples (L+R averaged) in fixed-size chunks matching
 * the analyser's hop size. Auto-restarts on subprocess exit.
 */

import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { EventEmitter } from "node:events";

export interface AudioCaptureOptions {
  device: string;
  rate: number;
  channels: 1 | 2;
  /** Vilken kanal som bar signalen — se EngineConfig.audioChannel. */
  /** "auto" (standard) later motorn valja sjalv — se toMonoFloat32. */
  channel?: "mix" | "left" | "right" | "auto";
  hopSamples: number;   // emit chunks of this many mono samples
}

export class AudioCapture extends EventEmitter {
  private proc: ChildProcessByStdio<null, Readable, Readable> | null = null;
  private stopped = false;
  private leftover: Buffer = Buffer.alloc(0);
  private readonly bytesPerFrame: number;   // S16LE = 2 bytes/sample × channels
  /** Kanalbalans-mätning (se toMonoFloat32). Nollställs var tredje sekund. */
  private balL = 0; private balR = 0; private balN = 0;
  /** Vad auto-laget valt just nu, och hur manga fonster i rad som pekat dit. */
  private autoPick: "mix" | "left" | "right" = "mix";
  private autoVotes = 0;
  private autoCand: "mix" | "left" | "right" = "mix";
  private readonly chunkBytes: number;
  /** Katastrofgräns: bara när ETT batch bär mer ljud än så är det så gammalt att
   *  en lucka är bättre än att spela det. MÄTT: normala batchar når 32 ms, värsta
   *  vid uppstart 163 ms, och enstaka event-loop-stalls ger 341 ms → 1500 ms ger
   *  4× marginal till det värsta uppmätta. Ren försäkring, fyrar aldrig i drift. */
  private static readonly STALE_MS = 1500;
  /** TYST STALL: arecord kan LEVA men sluta leverera (ALSA-enheten hänger, t.ex.
   *  när codec-zero:n byter ingång under drift). Då fyrar varken 'exit' eller
   *  'error', så den befintliga respawn-vägen ser ingenting — riggen tonar ned
   *  till svart och står så tills någon startar om tjänsten. Vakten dödar
   *  processen i stället; 'exit'-handlern respawnar den om 1 s.
   *  1500 ms = samma marginal som STALE_MS (värsta uppmätta batch-lucka 341 ms). */
  private static readonly STALL_MS = 1500;
  private lastDataAt = 0;
  private stallTimer: NodeJS.Timeout | null = null;
  /** Se toMonoFloat32: återanvänd mono-buffert, giltig bara under 'chunk'-handlern. */
  private readonly mono: Float32Array;

  // ── ÅTERHÄMTNINGSTRAPPA ────────────────────────────────────────────────────
  // Portad från Lotus (micRecovery.ts). Blind respawn i all evighet är fel svar:
  // när ALSA-enheten är verkligt borta (kort tappat på USB/I2S, codec i fel läge)
  // spawnar vi arecord en gång per sekund för alltid — varje försök kostar CPU och
  // journald-rader, och riggen står svart utan att någon får veta VARFÖR.
  // Trappan: 2 rena respawns → 2 respawns med omdirigering av ALSA-ingången
  // ('rebind', index.ts sätter om mixern) → SÄKERT LÄGE: sluta jaga, säg det högt,
  // och prova bara en gång per minut. Räknaren nollställs när capturen levererat
  // oavbrutet i 5 s, så en enstaka nattlig hicka aldrig äter upp trappan.
  private static readonly CLEAN_RESPAWNS = 2;
  private static readonly LADDER_MAX = 4;
  private static readonly HEALTHY_MS = 5000;
  private static readonly SAFE_RETRY_MS = 60_000;
  private recoveries = 0;
  private firstDataAt = 0;
  private safeMode = false;
  private respawnTimer: NodeJS.Timeout | null = null;

  /** True när trappan är slut: ingen respawn-jakt, bara ett försök per minut. */
  get inSafeMode(): boolean { return this.safeMode; }

  constructor(private opts: AudioCaptureOptions) {
    super();
    this.bytesPerFrame = 2 * opts.channels;
    this.chunkBytes = opts.hopSamples * this.bytesPerFrame;
    this.mono = new Float32Array(opts.hopSamples);
  }

  start() {
    this.stopped = false;
    this.spawnArecord();
    if (!this.stallTimer) {
      this.stallTimer = setInterval(() => this.checkStall(), 500);
      this.stallTimer.unref?.();
    }
  }

  stop() {
    this.stopped = true;
    if (this.stallTimer) { clearInterval(this.stallTimer); this.stallTimer = null; }
    if (this.respawnTimer) { clearTimeout(this.respawnTimer); this.respawnTimer = null; }
    this.proc?.kill("SIGTERM");
    this.proc = null;
  }

  /**
   * Manuellt återhämtningsförsök (watchdogens riktade åtgärd). Nollställer
   * trappan så capturen får en ärlig ny chans utan att motorn startas om.
   */
  recover() {
    if (this.stopped) return;
    this.recoveries = 0;
    this.safeMode = false;
    if (this.respawnTimer) { clearTimeout(this.respawnTimer); this.respawnTimer = null; }
    this.lastDataAt = 0;
    if (this.proc) this.proc.kill("SIGKILL");   // 'exit'-handlern respawnar
    else this.spawnArecord();
  }

  /** Dödar en levande men tyst arecord. Respawn sker via 'exit'-handlern. */
  private checkStall() {
    if (this.stopped || !this.proc || this.lastDataAt === 0) return;
    const gap = Date.now() - this.lastDataAt;
    if (gap < AudioCapture.STALL_MS) return;
    this.emit("stall", gap);
    this.lastDataAt = 0;          // ingen andra dödsstöt innan nästa process levererat
    this.proc.kill("SIGKILL");    // TERM kan hänga i samma ALSA-anrop som tystnade
  }

  /** Nästa steg i trappan efter att en capture dött eller tystnat. */
  private scheduleRecovery() {
    if (this.stopped || this.respawnTimer) return;
    this.recoveries++;
    if (this.recoveries > AudioCapture.CLEAN_RESPAWNS && this.recoveries <= AudioCapture.LADDER_MAX) {
      // Rena respawns räckte inte → ALSA-ingången kan ha hamnat i fel läge
      // (codec-zero byter rutt när jacket rörs). index.ts sätter om mixern.
      this.emit("rebind", this.recoveries);
    }
    if (this.recoveries > AudioCapture.LADDER_MAX) {
      if (!this.safeMode) { this.safeMode = true; this.emit("safe", this.recoveries); }
      this.respawnTimer = setTimeout(() => { this.respawnTimer = null; this.spawnArecord(); }, AudioCapture.SAFE_RETRY_MS);
      this.respawnTimer.unref?.();
      return;
    }
    this.respawnTimer = setTimeout(() => { this.respawnTimer = null; this.spawnArecord(); }, 1000);
    this.respawnTimer.unref?.();
  }



  private spawnArecord() {
    this.leftover = Buffer.alloc(0);
    this.firstDataAt = 0;
    const args = [
      "-D", this.opts.device,
      "-f", "S16_LE",
      "-r", String(this.opts.rate),
      "-c", String(this.opts.channels),
      "-t", "raw",
      "--buffer-size=1024",   // ~21 ms — håll capture-latensen låg, låt drift droppa via overrun
      "--period-size=128",
      "-q",
    ];
    const p = spawn("arecord", args, { stdio: ["ignore", "pipe", "pipe"] });
    // Pinna ljudinfångningen till kärna 0 — den ÄRVER annars motorns affinitet
    // (CPUAffinity=1 2) och slåss då om kärna med analys/render. Egen kärna =
    // ALSA-bufferten töms i tid även när motorn har en burst. Fire-and-forget:
    // saknas taskset fortsätter arecord ändå, bara utan pinning.
    if (p.pid) spawn("taskset", ["-pc", "0", String(p.pid)], { stdio: "ignore" }).on("error", () => {});
    this.proc = p;

    p.stdout.on("data", (buf: Buffer) => {
      const now = Date.now();
      this.lastDataAt = now;
      // FRISK CAPTURE = oavbruten leverans i 5 s. Först då nollställs trappan:
      // annars räcker en enda chunk mellan två stall för att nollställa den, och
      // en enhet som levererar i ryck skulle jaga respawns i evighet.
      if (this.firstDataAt === 0) this.firstDataAt = now;
      else if (this.recoveries > 0 && now - this.firstDataAt >= AudioCapture.HEALTHY_MS) {
        this.recoveries = 0;
        if (this.safeMode) { this.safeMode = false; this.emit("recovered"); }
      }
      this.onData(buf);
    });
    p.stderr.on("data", (buf: Buffer) => {
      const s = buf.toString().trim();
      if (s) this.emit("stderr", s);
    });
    p.on("exit", (code) => {
      this.emit("exit", code);
      this.proc = null;
      this.scheduleRecovery();
    });
    // 'error' fyrar om själva spawn:en failar (arecord saknas på PATH, eller
    // EAGAIN när fork inte får minne på 512MB-Pi:n). Utan denna lyssnare skulle
    // ChildProcess kasta ett ohanterat fel → hela motorn kraschar; och 'exit'
    // fyrar INTE vid spawn-fel, så respawn:en ovan uteblir. Respawna här i stället.
    p.on("error", (err) => {
      this.emit("stderr", `spawn: ${(err as Error).message}`);
      this.proc = null;
      this.scheduleRecovery();
    });
  }


  private onData(buf: Buffer) {
    // Concat leftover + new; slice into fixed chunks; keep remainder.
    const combined = this.leftover.length
      ? Buffer.concat([this.leftover, buf])
      : buf;

    let offset = 0;
    while (combined.length - offset >= this.chunkBytes) {
      const chunk = combined.subarray(offset, offset + this.chunkBytes);
      offset += this.chunkBytes;

      // Ett STORT batch betyder inte att vi ligger efter — det betyder att node
      // buntade ihop läsningar och gav oss ikapp-ljudet på en gång. MÄTT: normala
      // batchar bär upp till 32 ms, uppstart 163 ms. Ljudet är redan i handen och
      // vi kör på ~47 % av realtidsbudgeten, så att bearbeta HELA batchet är både
      // rätt och snabbast — vi hinner ikapp av oss själva. Att slänga det är att
      // slänga riktig musik: en tidigare version av den här vakten sköt på 50 ms
      // och kastade då 28 % av ljudet i varje burst, vilket syntes som fladder i
      // låga partier (kalibreringsmappningen förstorar varje lucka).
      //
      // Två tidigare mått som ledde fel, så de inte provas igen:
      //   • `behind` (väggtid − ljud ur pipen) mätte ALSA-overruns, inte kö. Den
      //     kunde bara växa och drop kunde inte reparera den → vid >120 ms
      //     droppades varje chunk för alltid och riggen frös.
      //   • `stdout.readableLength` är alltid 0: backloggen ligger i OS-pipen,
      //     osynlig härifrån. Den mätte ingenting.
      const staleMs = ((combined.length - offset) / this.bytesPerFrame / this.opts.rate) * 1000;
      if (staleMs > AudioCapture.STALE_MS) continue;   // katastrofal stall → lucka slår gammalt ljud

      this.emit("chunk", this.toMonoFloat32(chunk));
    }
    this.leftover = combined.subarray(offset);
  }

  /**
   * ÅTERANVÄND BUFFERT — chunkarna kommer ~375 gånger i sekunden, och en ny
   * Float32Array per chunk är konstant sopmängd på en maskin där en GC-paus
   * syns som fladder i ljuset.
   *
   * KONTRAKT: den utsända arrayen gäller BARA under 'chunk'-handlern. Båda
   * konsumenterna kopierar synkront innan de släpper den (analyser.process →
   * `buffer.set(samples)`, recorder.write → egen Int16-buffert), och onData
   * emittar en chunk i taget så nästa skrivning sker efter att den förra är
   * konsumerad. EN KONSUMENT SOM SPARAR ARRAYEN MELLAN CHUNKAR MÅSTE KOPIERA.
   */
  private toMonoFloat32(buf: Buffer): Float32Array {
    const n = this.opts.hopSamples;
    const out = this.mono;
    // Zero-copy Int16Array view over the incoming buffer. Pi Zero 2 W is
    // little-endian, matching S16_LE, so no byteswap needed. ~3-4× faster
    // than readInt16LE() in a hot loop.
    const i16 = new Int16Array(
      buf.buffer,
      buf.byteOffset,
      buf.byteLength >> 1,
    );
    if (this.opts.channels === 1) {
      const INV = 1 / 32768;
      for (let i = 0; i < n; i++) out[i] = i16[i] * INV;
    } else {
      const INV = 1 / 65536;
      // KANALBALANS — mäts på köpet, kostar två multiplikationer per sampel.
      // Vi MEDELVÄRDAR L och R. Bär bara ena kanalen signal (en mono-TS-kontakt i
      // ett stereouttag, eller en trasig ledare) halveras nivån — exakt 6 dB — och
      // AGC:n är LÅST på 1× på aux, så ingenting kompenserar. Följden är inte
      // "lite svagare" utan att drop-vägen stänger: `inZone` kräver ett absolut
      // golv på 0.65, samma golv som tystade droparna när mobilvolymen var nere.
      // Den sortens fel är osynligt i ljudet men dödligt för showen, så riggen
      // ska säga till om det själv i stället för att någon ska gissa.
      // VAL AV KANAL. "left"/"right" tar EN kanal pa full skala (1/32768) i
      // stallet for medelvardet — det ar skillnaden mellan full niva och 6 dB for
      // lag nar en monokalla sitter pa bara en kanal.
      const setting = this.opts.channel ?? "auto";
      const pick = setting === "auto" ? this.autoPick : setting;
      const ONE = 1 / 32768;
      let sl = 0, sr = 0;
      for (let i = 0, j = 0; i < n; i++, j += 2) {
        const l = i16[j], r = i16[j + 1];
        sl += l * l; sr += r * r;
        out[i] = pick === "left" ? l * ONE : pick === "right" ? r * ONE : (l + r) * INV;
      }
      this.balL += sl; this.balR += sr; this.balN += n;
      if (this.balN >= this.opts.rate * 3) {
        const dbL = 10 * Math.log10(this.balL / this.balN + 1e-12);
        const dbR = 10 * Math.log10(this.balR / this.balN + 1e-12);
        const quiet = Math.min(dbL, dbR), loud = Math.max(dbL, dbR);
        // Bara när det finns signal alls, och bara när skillnaden är stor nog att
        // vara en kopplingsfråga snarare än en panorerad mix.
        // AUTOMATISKT MONOLAGE.
        // Bar bara ena kanalen signal halveras medelvardet — exakt 6 dB — och
        // AGC:n ar last pa 1x pa aux, sa inget kompenserar. Da stanger `inZone`
        // (absolut golv 0.65) och droparna slutar renderas. Motorn maste alltsa
        // upptacka det sjalv; att krava ratt kabel ar att bygga in ett tyst fel.
        //
        // SVART ATT LURA MED FLIT. Ett panorerat parti i en riktig stereomix far
        // inte trigga: krav ar 12 dB skillnad i TRE fonster i rad, alltsa ~9 s
        // sammanhangande bevis. Samma krav at andra hallet for att ga tillbaka,
        // sa den inte kan flappa. Har agaren satt audioChannel explicit galler det.
        if (setting === "auto") {
          const cand: "mix" | "left" | "right" =
            loud <= -60 ? this.autoPick                      // for tyst for att doma
            : loud - quiet <= 12 ? "mix"
            : dbL > dbR ? "left" : "right";
          if (cand === this.autoCand) this.autoVotes++;
          else { this.autoCand = cand; this.autoVotes = 1; }
          if (this.autoVotes >= 3 && cand !== this.autoPick) {
            const from = this.autoPick;
            this.autoPick = cand;
            this.emit("stderr", cand === "mix"
              ? `KANALLAGE: bada kanalerna bar signal igen — tillbaka till stereosumma (var ${from}).`
              : `KANALLAGE: bara ${cand === "left" ? "vanster" : "hoger"} kanal bar signal `
                + `(${Math.min(99, loud - quiet).toFixed(0)} dB skillnad, ~9 s bevis) — byter till den kanalen pa full skala. `
                + "Utan det hade nivan legat 6 dB for lagt och drop-detektionen stangt.");
          }
        }
        this.balL = 0; this.balR = 0; this.balN = 0;
      }
    }
    return out;
  }
}
