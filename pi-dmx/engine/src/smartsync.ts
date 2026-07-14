/**
 * SmartSync: identify the playing song and drive the light show from its
 * actual structure instead of raw audio alone.
 *
 * Pipeline (all on the Pi — needs internet, i.e. phone-hotspot boot mode):
 *   line-in audio (6 s) → ACRCloud identify (song + play position)
 *     → Spotify audio-analysis (sections, bars, drops)
 *     → local event timeline: mode/hue changes per section, white flash
 *       right before loud drops.
 *
 * The cloud calls reuse the Supabase edge functions from the Lovable app
 * (acrcloud-identify, spotify-track-analysis) — same keys, same contract.
 */

import type { EngineConfig, Mode } from "./config.js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://ohxhttvznsuioiengpde.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oeGh0dHZ6bnN1aW9pZW5ncGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTIzMzAsImV4cCI6MjA5ODkyODMzMH0.ZMlR3sH6oWC7NwunZWvDBDbyd4z1NbDxJ9WM2X2-m-I";

const CHUNK_MS = 6000;          // audio sample length sent for identification
const RETRY_MS = 12_000;        // pause between attempts when nothing matched
const MAX_SYNced_WAIT_MS = 45_000; // re-identify at least this often while synced
const TARGET_RATE = 16_000;     // WAV sample rate sent to ACRCloud

export type SmartSyncStatus =
  | "off" | "listening" | "identifying" | "analyzing"
  | "synced" | "no-match" | "error";

export interface SmartSyncPublicState {
  enabled: boolean;
  status: SmartSyncStatus;
  errorMsg: string | null;
  track: { name: string; artists: string; durationMs: number } | null;
  /** >0 when the beat clock is locked to the song's tempo. */
  bpm: number;
}

type TimelineEvent =
  | { atMs: number; type: "section"; preset: string; primaryHue: number; secondaryHue: number; energy: number }
  | { atMs: number; type: "flash"; durationMs: number }
  | { atMs: number; type: "bar"; conf: number };

interface Deps {
  cfg: EngineConfig;
  /** Called whenever cfg was mutated by a timeline event (persist + push to UI). */
  onConfigChanged: () => void;
  /** Called whenever the SmartSync state changed (push to UI). */
  onState: (s: SmartSyncPublicState) => void;
}

const VALID_MODES: Mode[] = ["drops", "party", "chase", "wave", "cycle", "breathe", "tide", "snap", "bounce", "mono"];
// The Spotify edge function still speaks the old mode names.
const PRESET_MAP: Record<string, Mode> = { auto: "cycle", comet: "wave", split: "party" };

export class SmartSync {
  private enabled = false;
  private status: SmartSyncStatus = "off";
  private errorMsg: string | null = null;
  private track: SmartSyncPublicState["track"] = null;

  private inputRate: number;
  private collecting = false;
  private collected: Float32Array[] = [];
  private collectedSamples = 0;
  private collectTarget = 0;
  private collectResolve: (() => void) | null = null;

  private timers: NodeJS.Timeout[] = [];
  private loopTimer: NodeJS.Timeout | null = null;
  private generation = 0; // bumped on disable to invalidate an in-flight cycle
  private currentBpm = 0;

  constructor(private deps: Deps) {
    this.inputRate = deps.cfg.audio.rate;
  }

  state(): SmartSyncPublicState {
    return { enabled: this.enabled, status: this.status, errorMsg: this.errorMsg, track: this.track, bpm: this.deps.cfg.beat ? this.currentBpm : 0 };
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.setStatus("listening");
    void this.cycle(this.generation);
  }

  disable() {
    this.enabled = false;
    this.generation++;
    this.collecting = false;
    this.collectResolve?.();
    this.collectResolve = null;
    if (this.loopTimer) { clearTimeout(this.loopTimer); this.loopTimer = null; }
    this.clearTimeline();
    this.track = null;
    this.deps.cfg.flashUntil = null;
    this.deps.cfg.beat = null;
    this.setStatus("off");
  }

  /** Feed every analyser hop chunk here (mono Float32 @ cfg.audio.rate). */
  feed(samples: Float32Array) {
    if (!this.collecting) return;
    this.collected.push(samples.slice());
    this.collectedSamples += samples.length;
    if (this.collectedSamples >= this.collectTarget) {
      this.collecting = false;
      this.collectResolve?.();
      this.collectResolve = null;
    }
  }

  // ---- main loop -----------------------------------------------------------

  private async cycle(gen: number) {
    while (this.enabled && gen === this.generation) {
      this.setStatus("listening");
      const identifyStart = Date.now();
      const audioBase64 = await this.record(CHUNK_MS);
      if (!this.enabled || gen !== this.generation) return;
      if (!audioBase64) { await this.wait(RETRY_MS, gen); continue; }

      this.setStatus("identifying");
      const id = await this.callFn("acrcloud-identify", { audioBase64 });
      if (!this.enabled || gen !== this.generation) return;
      if (!id || id.error) {
        this.setStatus("error", id?.error === "acrcloud_not_configured"
          ? "ACRCloud saknar nycklar" : (id?.error ?? "offline? kräver internet/hotspot"));
        await this.wait(RETRY_MS, gen); continue;
      }
      if (!id.matched) {
        this.setStatus("no-match");
        await this.wait(RETRY_MS, gen); continue;
      }

      const playOffsetMs = Math.max(0, Number(id.playOffsetMs ?? 0));
      const durationMs = Math.max(0, Number(id.durationMs ?? 0));
      this.track = {
        name: String(id.title ?? "Okänd låt"),
        artists: String(id.artists ?? ""),
        durationMs,
      };

      if (!id.spotifyId) {
        // Matched but not in Spotify's catalog → show the track, keep current mode.
        this.setStatus("synced");
        await this.wait(Math.min(Math.max(durationMs - playOffsetMs, RETRY_MS), MAX_SYNced_WAIT_MS), gen);
        continue;
      }

      this.setStatus("analyzing");
      const an = await this.callFn("spotify-track-analysis", {
        trackId: id.spotifyId, playOffsetMs,
      });
      if (!this.enabled || gen !== this.generation) return;
      if (!an?.ok) {
        // Song identified but no Spotify analysis (e.g. deprecated API / 404).
        // Still useful: show the track, stay in current mode.
        this.setStatus("synced", an?.error ?? null);
        await this.wait(Math.min(Math.max(durationMs - playOffsetMs, RETRY_MS), MAX_SYNced_WAIT_MS), gen);
        continue;
      }

      if (an.track?.name) {
        this.track = {
          name: String(an.track.name),
          artists: String(an.track.artists ?? this.track.artists),
          durationMs: Number(an.track.durationMs ?? durationMs),
        };
      }

      // Anchor: at wall-clock `identifyStart` the song was at `playOffsetMs`.
      // Every event's atMs is already relative to playOffsetMs, so it fires at
      // identifyStart + atMs.
      this.currentBpm = Number(an.features?.tempo ?? 0);
      if (this.currentBpm > 40) this.deps.cfg.beat = { anchorMs: identifyStart, bpm: this.currentBpm };
      this.scheduleTimeline(identifyStart, (an.events ?? []) as TimelineEvent[], an, gen);
      this.setStatus("synced");

      const remaining = Math.max(0, (this.track.durationMs || 0) - playOffsetMs);
      await this.wait(Math.min(remaining + 2000, MAX_SYNced_WAIT_MS), gen);
    }
  }

  private scheduleTimeline(anchorWallMs: number, events: TimelineEvent[], an: any, gen: number) {
    this.clearTimeline();

    // Initial mode + palette from the track-level features, applied immediately.
    this.applySection(String(an.preset ?? "auto"),
      Number(an.hues?.primary ?? this.deps.cfg.monoHue),
      Number(an.hues?.secondary ?? this.deps.cfg.splitHueB),
      Number(an.features?.energy ?? 0.5));

    const now = Date.now();
    for (const e of events) {
      const fireIn = anchorWallMs + e.atMs - now;
      if (fireIn < -500) continue; // already passed
      // "bar" downbeats calibrate the beat clock so beat-locked effects stay in phase.
      const t = setTimeout(() => {
        if (gen !== this.generation) return;
        if (e.type === "bar") {
          if (this.currentBpm > 40) this.deps.cfg.beat = { anchorMs: Date.now(), bpm: this.currentBpm };
          return;
        }
        if (e.type === "section") {
          this.applySection(e.preset, e.primaryHue, e.secondaryHue, e.energy);
        } else if (e.type === "flash") {
          this.deps.cfg.flashUntil = Date.now() + e.durationMs;
        }
      }, Math.max(0, fireIn));
      this.timers.push(t);
    }
  }

  private applySection(preset: string, primaryHue: number, secondaryHue: number, energy?: number) {
    const cfg = this.deps.cfg;
    // In "smart" mode the engine picks the effect itself from the section
    // energy — only colors and energy flow through.
    if (cfg.mode !== "smart") {
      const mapped = PRESET_MAP[preset] ?? preset;
      cfg.mode = (VALID_MODES as string[]).includes(mapped) ? (mapped as Mode) : "party";
    }
    cfg.monoHue = primaryHue;
    cfg.cometHue = primaryHue;
    cfg.splitHueA = primaryHue;
    cfg.splitHueB = secondaryHue;
    this.deps.onConfigChanged();
  }

  private clearTimeline() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  // ---- audio capture → WAV base64 ------------------------------------------

  private record(ms: number): Promise<string | null> {
    this.collected = [];
    this.collectedSamples = 0;
    this.collectTarget = Math.floor((this.inputRate * ms) / 1000);
    this.collecting = true;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // arecord stalled — give up on this attempt rather than hanging.
        this.collecting = false;
        this.collectResolve = null;
        resolve(null);
      }, ms + 4000);
      this.collectResolve = () => {
        clearTimeout(timeout);
        resolve(this.collectedSamples >= this.collectTarget ? this.encodeWavB64() : null);
      };
    });
  }

  private encodeWavB64(): string {
    // Concatenate hops, then decimate inputRate → 16 kHz by simple averaging.
    const all = new Float32Array(this.collectedSamples);
    let off = 0;
    for (const c of this.collected) { all.set(c, off); off += c.length; }
    this.collected = [];

    const factor = Math.max(1, Math.round(this.inputRate / TARGET_RATE));
    const outLen = Math.floor(all.length / factor);
    const wav = Buffer.alloc(44 + outLen * 2);
    wav.write("RIFF", 0); wav.writeUInt32LE(36 + outLen * 2, 4); wav.write("WAVE", 8);
    wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22); wav.writeUInt32LE(TARGET_RATE, 24);
    wav.writeUInt32LE(TARGET_RATE * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
    wav.write("data", 36); wav.writeUInt32LE(outLen * 2, 40);
    for (let i = 0; i < outLen; i++) {
      let s = 0;
      for (let j = 0; j < factor; j++) s += all[i * factor + j];
      s /= factor;
      s = Math.max(-1, Math.min(1, s));
      wav.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, 44 + i * 2);
    }
    return wav.toString("base64");
  }

  // ---- helpers --------------------------------------------------------------

  private async callFn(name: string, body: unknown): Promise<any | null> {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
      return await res.json();
    } catch (e) {
      console.error(`[smartsync] ${name} failed:`, (e as Error).message);
      return null;
    }
  }

  private wait(ms: number, gen: number): Promise<void> {
    return new Promise((resolve) => {
      if (gen !== this.generation) return resolve();
      this.loopTimer = setTimeout(resolve, ms);
    });
  }

  private setStatus(s: SmartSyncStatus, err: string | null = null) {
    this.status = s;
    this.errorMsg = err;
    this.deps.onState(this.state());
  }
}
