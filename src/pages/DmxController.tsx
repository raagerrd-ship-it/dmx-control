import { useState, useRef, useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useMockLive } from "@/hooks/useMockLive";
import { useDmx } from "@/store/dmx";
import {
  CALM_MODES, FAST_MODES, FULL_MODES, MODE_DRIVES,
  usePi, usePlayingMode, setPi, setRotation, applyIntensity,
} from "@/hooks/usePiMock";
import { useLocation } from "react-router-dom";

/**
 * Mock-preview som speglar Pi:ns riktiga UI (pi-dmx/engine/public/index.html)
 * så nära det går. Samma sektions-ordning, samma kontroller, samma etiketter —
 * så man i Lovable ser exakt vad hyresgästen ser på Pi:n.
 *
 * Håll i synk med pi-dmx/engine/public/index.html när något ändras där.
 */
export default function DmxController() {
  useMockLive();
  const location = useLocation();
  const ownerMode = /setup/i.test(location.pathname) || /setup/i.test(location.hash);

  return (
    <main className="mx-auto max-w-md px-4 pt-1 pb-16 safe-bottom overflow-x-clip">
      <header className="flex flex-col items-center -mt-1 -mb-1">
        <BrandLogo className="h-24 w-auto opacity-95 sm:h-28 md:h-32 lg:h-32 landscape:h-20" />
        <span className="mt-1 text-[10px] tracking-[0.3em] uppercase text-muted-foreground/60 font-medium">
          Ljus som lyssnar
        </span>
      </header>

      <HeroCard />



      <MoreDetails />

      {ownerMode && <OwnerSections />}

      <StatusFooter />
    </main>
  );
}

function StatusFooter() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)] text-center text-[10px] tracking-[0.24em] uppercase text-muted-foreground/40 font-mono bg-background/80 backdrop-blur-md border-t border-border/60">
      Ansluten · v1.4.0 · 4 lampor
    </div>
  );
}

/* ────────── Stämning: 0..10-slider (speglar KY-040-vredet på Pi; 0 = av) ──────────
   Renderas som appens huvudkontroll — ingen kort-ruta runt, ligger direkt på sidan
   så den känns som den enda saken hyresgästen behöver röra. */

function HeroCard() {
  return (
    <section className="relative mt-5 mb-5 px-2">
      {/* Neon ambient glows behind everything, no card frame */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-16 w-64 h-64 rounded-full bg-primary/10 blur-[90px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 w-56 h-56 rounded-full bg-primary/[0.07] blur-[80px]" />

      <div className="relative">
        <MoodSlider />

        <div className="mt-6 rounded-2xl bg-foreground/[0.03] ring-1 ring-inset ring-border/60 p-4">
          <InputLevel />

          <div className="mt-5">
            <SourcePill />
          </div>

          <div className="mt-5">
            <TechGrid />
          </div>
        </div>
      </div>
    </section>
  );
}

function MoodSlider() {
  const s = usePi();
  const off = !s.power;
  const v = off ? 0 : Math.max(1, Math.min(10, Math.round(s.intensity * 9) + 1));
  const fillPct = (v / 10) * 100;
  return (
    <div>
      <div className="relative h-12 flex items-center">
        <div aria-hidden className="absolute inset-0 bg-primary/[0.04] blur-xl pointer-events-none" />
        <div className="mood-ticks" aria-hidden>
          {Array.from({ length: 11 }).map((_, i) => <span key={i} />)}
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={v}
          onChange={(e) => {
            const nv = Number(e.target.value);
            if (nv === 0) {
              setPi({ power: false });
            } else {
              if (!s.power) setPi({ power: true });
              applyIntensity((nv - 1) / 9);
            }
          }}
          style={{ ["--mood-fill" as string]: `${fillPct}%` }}
          className={`mood-range relative ${off ? "is-off" : ""}`}
          aria-label="Stämning från Av till Galet"
        />
      </div>

      <div className="flex justify-between mt-2 px-1 font-mono">
        <span className={`text-[9px] font-bold tracking-widest ${off ? "text-primary/80" : "text-muted-foreground/40"}`}>AV</span>
        <span className={`text-[9px] font-bold tracking-widest uppercase ${off ? "text-muted-foreground/40" : "text-foreground/85"}`}>{moodInfoFor(v).name}</span>
        <span className={`text-[9px] font-bold tracking-widest ${v >= 9 ? "text-primary" : "text-muted-foreground/40"}`}>MAX</span>
      </div>

    </div>
  );
}

/* ────────── Ljud (källa + nivå) ────────── */

function moodInfoFor(v: number) {
  if (v <= 0) return { name: "Av",     desc: "Ljuset är släckt — dra åt höger för att tända" };
  if (v <= 2) return { name: "Chill",  desc: "Mjukt och långsamt, följer inte taktslag" };
  if (v <= 4) return { name: "Chill+", desc: "Följer musiken lugnt" };
  if (v <= 6) return { name: "Fest",   desc: "Pulsar på taktslag, byter effekt ibland" };
  if (v <= 8) return { name: "Fest+",  desc: "Klubb-läge, byter effekt oftare" };
  return               { name: "Galet",  desc: "Full fart, drop-blackout, riser-strobe" };
}

/* Horisontell input-mätare: visar verklig ljudnivå (0–100 %) med peak-hold.
   Samma visuella språk som stämningsslidern så det känns som en logisk mätare. */
function InputLevel() {
  const audio = useDmx((st) => st.audioLevel);
  const pct = Math.max(0, Math.min(100, Math.round(audio * 100)));
  const hot = pct > 85;
  const silent = pct < 4;

  const peakRef = useRef(0);
  const [peak, setPeak] = useState(0);
  useEffect(() => {
    if (pct >= peakRef.current) {
      peakRef.current = pct;
      setPeak(pct);
    } else {
      peakRef.current = Math.max(pct, peakRef.current - 1.5);
      setPeak(peakRef.current);
    }
  }, [pct]);

  return (
    <div>
      <div className="flex items-baseline justify-between px-1 mb-2">
        <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70 font-bold">
          Ljudnivå
        </span>
        <span className={`text-[11px] font-mono tabular-nums ${hot ? "text-primary" : silent ? "text-muted-foreground/40" : "text-muted-foreground/80"}`}>
          {String(pct).padStart(2, "0")}%
        </span>
      </div>

      <div className="relative h-2.5 rounded-full bg-muted/50 overflow-hidden" style={{ boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.04)" }}>
        {/* fyllnad — samma fade som stämningsslidern */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-100 ${hot ? "shadow-[0_0_12px_hsl(var(--primary)/0.7)]" : ""}`}
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, hsl(var(--primary) / 0) 0%, hsl(var(--primary) / ${hot ? 1 : 0.85}) 100%)`,
          }}
        />

        {/* peak-hold linje */}
        <div
          aria-hidden
          className="absolute inset-y-0 w-[2px] bg-primary/90 shadow-[0_0_6px_hsl(var(--primary))] transition-[left] duration-150"
          style={{ left: `calc(${peak}% - 1px)`, opacity: silent ? 0 : 1 }}
        />
        {/* skala — 11 tunna ticks (matchar stämningsslidern) */}
        <div aria-hidden className="absolute inset-y-0 left-[14px] right-[14px] flex justify-between items-center pointer-events-none">
          {Array.from({ length: 11 }).map((_, i) => (
            <span key={i} className="w-[2px] h-1 rounded-[1px] bg-foreground/[0.12]" />
          ))}
        </div>
      </div>

    </div>
  );
}

function SourcePill() {
  const s = usePi();
  const source = s.audioInput;
  const isMic = source === "mic";
  return (
    <div
      role="tablist"
      aria-label="Ljudkälla"
      className="relative grid grid-cols-2 gap-0 rounded-full bg-foreground/[0.03] p-1 ring-1 ring-foreground/[0.06]"
    >
      {/* sliding thumb */}
      <div
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-foreground/[0.05] ring-1 ring-foreground/10 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ transform: isMic ? "translateX(100%)" : "translateX(0)" }}
      />
      {[
        { id: "aux", label: "AUX (kabel)" },
        { id: "mic", label: "Mikrofon" },
      ].map((o) => {
        const active = source === o.id;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => setPi({ audioInput: o.id as "aux" | "mic" })}
            className={`relative z-10 flex items-center justify-center gap-2 py-2.5 rounded-full text-[11px] font-medium transition-colors ${
              active ? "text-foreground" : "text-muted-foreground/50"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                active ? "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.8)]" : "bg-muted-foreground/30"
              }`}
            />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TechGrid() {
  const s = usePi();
  const bpm = useDmx((st) => st.bpm);
  const conf = useDmx((st) => st.bpmConfidence);
  const beat = useDmx((st) => st.beat);
  const off = !s.power;
  const moodV = off ? 0 : Math.max(1, Math.min(10, Math.round(s.intensity * 9) + 1));
  const locked = bpm > 0;
  const confPct = Math.round(conf * 100);
  const info = moodInfoFor(moodV);
  return (
    <div className="relative pt-4 border-t border-foreground/[0.06]">
      <div className="flex items-stretch divide-x divide-foreground/[0.06]">
        <TechCell label="BPM"        value={locked ? String(Math.round(bpm)) : "— —"} accent={locked} dot={locked ? beat : true} pulseDot={!locked} muted={!locked} />
        <TechCell label="Konfidens"  value={locked ? `${confPct}%` : "— —"}          accent={locked && confPct >= 70} muted={!locked} />
      </div>
      <div className="mt-4 pt-4 border-t border-foreground/[0.06] text-[11px] leading-snug text-muted-foreground/80">
        {off ? "Ljuset är släckt — dra åt höger för att tända" : info.desc}
      </div>
    </div>
  );
}

function TechCell({ label, value, accent, dot, pulseDot, muted }: { label: string; value: string; accent?: boolean; dot?: boolean; pulseDot?: boolean; muted?: boolean }) {
  return (
    <div className="flex-1 px-3 first:pl-0 last:pr-0 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-[0.22em]">{label}</span>
        {dot && (
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full bg-primary ${
              pulseDot ? "shadow-[0_0_6px_hsl(var(--primary)/0.7)] animate-pulse" : "shadow-[0_0_8px_hsl(var(--primary))]"
            }`}
          />
        )}
      </div>
      <div
        className={`text-[28px] font-mono font-semibold tabular-nums leading-none tracking-tight ${
          accent ? "text-primary" : muted ? "text-foreground/40" : "text-foreground/85"
        }`}
      >
        {value}
      </div>
    </div>
  );
}



/* ────────── Mer inställningar (details) — Show + Finjustering + rotation ────────── */

function MoreDetails() {
  return (
    <>
      <details className="mt-5 group/eff rounded-2xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
        <summary className="px-4 py-4 text-center cursor-pointer list-none [&::-webkit-details-marker]:hidden text-muted-foreground/80 text-[10px] font-black uppercase tracking-[0.24em] hover:text-foreground/90 group-open/eff:text-foreground/90 group-open/eff:border-b group-open/eff:border-foreground/10 transition-colors">
          <span>Effekt-val</span>
          <span className="ml-2 inline-block px-2 py-[2px] rounded-full bg-foreground/[0.04] ring-1 ring-foreground/10 text-foreground/60 text-[9px] font-bold tracking-[0.12em] align-[1px]">AUTO</span>
          <span className="ml-1.5 opacity-70 group-open/eff:hidden">⌄</span>
          <span className="ml-1.5 opacity-70 hidden group-open/eff:inline">⌃</span>
        </summary>
        <div className="p-4">
          <EffectList />
        </div>
      </details>


      <AdvancedMirror />
    </>
  );
}

/* ────────── Avancerat · spegel av stämningen (skrivskyddad) ────────── */

/** Härled hela FEEL-uppsättningen från intensity 0..1 — speglar
 *  pi-dmx/engine/src/moods.ts (5 kontinuerliga lerp + 8 bucket-snap). */
function deriveFeel(x: number) {
  const clamped = Math.max(0, Math.min(1, x));
  const A = { dynamics: 0.30, sensitivity: 0.50, master: 0.30, calmDecay: 1.20, smartDwellMs: 40000,
    energyDrivesMode: false, beatPulse: false, dropBlackout: false, clubMode: false,
    ambientGlow: true,  energyCeiling: true, riserStrobe: false, dropHeadroom: false };
  const B = { dynamics: 0.60, sensitivity: 0.60, master: 1.00, calmDecay: 0.42, smartDwellMs: 15000,
    energyDrivesMode: true,  beatPulse: true,  dropBlackout: true,  clubMode: false,
    ambientGlow: false, energyCeiling: true, riserStrobe: false, dropHeadroom: false };
  const C = { dynamics: 0.85, sensitivity: 0.70, master: 1.00, calmDecay: 0.42, smartDwellMs: 10000,
    energyDrivesMode: true,  beatPulse: true,  dropBlackout: true,  clubMode: true,
    ambientGlow: false, energyCeiling: true, riserStrobe: true,  dropHeadroom: true  };
  const [a, b, t] = clamped <= 0.5
    ? [A, B, clamped / 0.5] as const
    : [B, C, (clamped - 0.5) / 0.5] as const;
  const lerp = (u: number, v: number) => u + (v - u) * t;
  const bucket = clamped < 1 / 3 ? A : clamped < 2 / 3 ? B : C;
  return {
    dynamics: lerp(a.dynamics, b.dynamics),
    sensitivity: lerp(a.sensitivity, b.sensitivity),
    master: lerp(a.master, b.master),
    calmDecay: lerp(a.calmDecay, b.calmDecay),
    smartDwellMs: Math.round(lerp(a.smartDwellMs, b.smartDwellMs)),
    energyDrivesMode: bucket.energyDrivesMode,
    beatPulse: bucket.beatPulse,
    dropBlackout: bucket.dropBlackout,
    clubMode: bucket.clubMode,
    ambientGlow: bucket.ambientGlow,
    energyCeiling: bucket.energyCeiling,
    riserStrobe: bucket.riserStrobe,
    dropHeadroom: bucket.dropHeadroom,
  };
}

function AdvancedMirror() {
  const s = usePi();
  const f = deriveFeel(s.intensity);
  const decayPct = ((f.calmDecay - 0.30) / 0.90) * 100;
  const dwellPct = ((40000 - f.smartDwellMs) / 35000) * 100;
  const dwellLbl = f.smartDwellMs >= 20000 ? "Sällan" : f.smartDwellMs >= 10000 ? "Normal" : "Ofta";
  return (
    <details className="mt-5 group rounded-2xl border border-foreground/10 bg-foreground/[0.02] overflow-hidden">
      <summary className="px-4 py-4 text-center cursor-pointer list-none [&::-webkit-details-marker]:hidden text-muted-foreground/80 text-[10px] font-black uppercase tracking-[0.24em] hover:text-foreground/90 group-open:text-foreground/90 group-open:border-b group-open:border-foreground/10 transition-colors">
        <span>Avancerat</span>
        <span className="ml-1.5 opacity-70 group-open:hidden">⌄</span>
        <span className="ml-1.5 opacity-70 hidden group-open:inline">⌃</span>
      </summary>
      <div className="p-4">
        <div className="text-[12px] text-muted-foreground leading-snug mb-3">
          Skrivskyddad vy. Stämnings-slidern (och det fysiska vredet) sätter allt nedan — dessa värden speglar motorn i realtid.
        </div>
        <AdvBar label="Dynamik"       pct={f.dynamics * 100}    value={Math.round(f.dynamics * 100) + "%"} />
        <AdvBar label="Reaktion"      pct={f.sensitivity * 100} value={Math.round(f.sensitivity * 100) + "%"} />
        <AdvBar label="Ljustak"       pct={f.master * 100}      value={Math.round(f.master * 100) + "%"} />
        <AdvBar label="Tröghet"       pct={decayPct}            value={f.calmDecay.toFixed(2) + "s"} />
        <AdvBar label="Byter effekt"  pct={dwellPct}            value={dwellLbl} />
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-x-3 gap-y-1.5">
          <AdvFlag on={f.energyDrivesMode} label="Energi styr läget" />
          <AdvFlag on={f.beatPulse}        label="Pulsa på taktslag" />
          <AdvFlag on={f.dropBlackout}     label="Drop-blackout" />
          <AdvFlag on={f.clubMode}         label="Klubb-läge" />
          <AdvFlag on={f.ambientGlow}      label="Vilo-glöd" />
          <AdvFlag on={f.energyCeiling}    label="Dynamiskt ljustak" />
          <AdvFlag on={f.riserStrobe}      label="Riser-strobe" />
          <AdvFlag on={f.dropHeadroom}     label="Drop-headroom" />
          <AdvFlag on={false}              label="Rökmaskin aktiv" />
          <AdvFlag on={false}              label="DMX-strobe aktiv" />
          <AdvFlag on={false}              label="Hazer aktiv" />
          <AdvFlag on={false}              label="UV aktiv" />
          <AdvFlag on={false}              label="Blinder aktiv" />
          <AdvFlag on={false}              label="Laser aktiv" />
          <AdvFlag on={false}              label="CO₂ aktiv" />
          <AdvFlag on={false}              label="BLE-slingor aktiva" />
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.22em]">Lampor</span>
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.16em]">DMX-adress</span>
          </div>
          <div className="divide-y divide-foreground/[0.05]">
            {[
              { name: "Par 1", type: "RGB 7-kanal", addr: 1 },
              { name: "Par 2", type: "RGB 7-kanal", addr: 8 },
              { name: "Par 3", type: "RGB 7-kanal", addr: 15 },
              { name: "Par 4", type: "RGB 7-kanal", addr: 22 },
            ].map((fx) => (
              <div key={fx.name} className="flex items-center justify-between py-2 text-[13px]">
                <div className="flex flex-col">
                  <span className="text-foreground/85">{fx.name}</span>
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.14em]">{fx.type}</span>
                </div>
                <span className="font-mono tabular-nums text-foreground/70 text-[13px]">{fx.addr}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </details>

  );
}

function AdvBar({ label, pct, value }: { label: string; pct: number; value: string }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="grid grid-cols-[110px_1fr_44px] gap-2.5 items-center mb-2">
      <span className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{label}</span>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden opacity-90">
        <div
          className="h-full transition-[width] duration-200"
          style={{ width: w + "%", background: "linear-gradient(90deg, hsl(var(--ok)), hsl(var(--accent)))" }}
        />
      </div>
      <span className="text-right text-[12px] tabular-nums">{value}</span>
    </div>
  );
}

function AdvFlag({ on, label }: { on: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-[13px] ${on ? "text-foreground" : "text-muted-foreground"}`}>
      <span
        className="w-2.5 h-2.5 rounded-full flex-none transition-colors"
        style={{
          background: on ? "hsl(var(--ok))" : "hsl(var(--muted))",
          boxShadow: on ? "0 0 8px color-mix(in srgb, hsl(var(--ok)) 60%, transparent)" : "none",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

/* ────────── Show + Finjustering borttagna (styrs av stämnings-slidern) ────────── */


/* ────────── Effekt-lista (3 stilar i ett kort med avdelare) ────────── */

function EffectList() {
  const s = usePi();
  const playing = usePlayingMode();
  const categories = [
    { title: "Lugna effekter", modes: CALM_MODES },
    { title: "Effekter med fart", modes: FAST_MODES },
    { title: "Effekter med full fart", modes: FULL_MODES },
  ];
  return (
    <div>
      {categories.map(({ title, modes }, catIdx) => (
        <div key={title}>
          <div
            className={`text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-2 ${
              catIdx === 0 ? "mt-0" : "mt-3"
            }`}
          >
            {title}
          </div>
          <div>
            {modes.map(([m, label, desc], i) => {
              const on = s.rotation[m] !== false;
              const isPlaying = playing === m && s.power;
              const missing = MODE_DRIVES[m] || [];
              const dim = missing.length > 0;
              return (
                <label
                  key={m}
                  className={`flex items-center justify-between py-2.5 px-2 rounded-md border-l-[3px] transition-colors cursor-pointer ${
                    isPlaying ? "border-l-primary" : "border-l-transparent"
                  } ${i > 0 ? "border-t border-t-border" : ""}`}
                  style={{
                    ...(isPlaying ? { background: "color-mix(in srgb, hsl(var(--accent)) 18%, transparent)" } : {}),
                    ...(dim ? { opacity: 0.45 } : {}),
                  }}
                >
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className={`text-[15px] ${isPlaying ? "font-semibold" : "font-medium"}`}>
                      {label}
                      {isPlaying && (
                        <span className="ml-2 text-[10px] font-bold tracking-wider align-middle" style={{ color: "hsl(var(--accent))" }}>
                          ● SPELAS
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground/70 leading-snug">
                      {desc}
                      {dim && <span className="opacity-70"> · kräver: {missing.join(", ")}</span>}
                    </span>
                  </span>
                  <SwitchBtn checked={on} onChange={(v) => setRotation(m, v)} />
                </label>
              );
            })}
          </div>
          {catIdx < categories.length - 1 && <div className="my-2 border-t border-border" />}
        </div>
      ))}
    </div>
  );
}

/* ────────── Owner-only ────────── */

/* Owner-only mock. Speglar pi-dmx/engine/public/index.html #ownerOnly-blocket
 * (Beat-synk, Rökmaskin, Regi pro, Lampor, BLE-slingor, LED-ring, System, WiFi)
 * så previewn ser likadan ut som /setup på Pi:n. Alla värden är lokal state —
 * inget skickas någonstans, det är bara en visuell mirror.
 * Håll i synk med Pi:ns HTML när något ändras där.                        */
function OwnerSections() {
  const [beatSync, setBeatSync] = useState(0.18);
  const [beatSyncOverride, setBeatSyncOverride] = useState(false);
  
  const [fogEnabled, setFogEnabled] = useState(false);
  const [fogOnDrop, setFogOnDrop] = useState(true);
  const [fogAddr, setFogAddr] = useState(200);
  const [regi, setRegi] = useState({
    dropBlackout: true, scenicAnchor: false, energyCeiling: true,
    clubMode: false, ambientGlow: true, riserStrobe: false,
    strobeUnlimited: false, dropHeadroom: false,
  });
  const [regiPro, setRegiPro] = useState(false);
  const rg = (k: keyof typeof regi) => (v: boolean) => setRegi((s) => ({ ...s, [k]: v }));
  const [ring, setRing] = useState({ maxBright: 60, pulseBoost: 20, blackoutFadeMs: 800 });
  return (
    <>
      <div
        className="rounded-[10px] p-2.5 px-3 mt-4 mb-1 text-[13px] leading-snug border"
        style={{
          background: "color-mix(in srgb, hsl(var(--accent)) 14%, transparent)",
          borderColor: "hsl(var(--accent))",
        }}
      >
        🔧 Ägarläge (setup). Den här sidan är dold för hyresgäster — de öppnar
        adressen utan <b>/setup</b>.
      </div>

      <SectionTitle>Beat-synk</SectionTitle>
      <Card>
        <SetRow label={<>Beat-synk {!beatSyncOverride
            ? <em className="not-italic ml-1.5 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider rounded-full border align-middle"
                style={{ color: "#e5b8ff", background: "rgba(180,120,255,.14)", borderColor: "rgba(180,120,255,.35)" }}>Följer stämning</em>
            : <em className="not-italic ml-1.5 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider rounded-full border align-middle"
                style={{ color: "#ffd39a", background: "rgba(255,180,80,.14)", borderColor: "rgba(255,180,80,.35)" }}>Manuell</em>}</>} last>
          <Seg<string>
            value={!beatSyncOverride ? "auto" : String(beatSync)}
            onChange={(v) => {
              if (v === "auto") { setBeatSyncOverride(false); }
              else { setBeatSyncOverride(true); setBeatSync(Number(v)); }
            }}
            options={[
              { v: "auto", label: "Auto" },
              { v: "0",    label: "Av" },
              { v: "0.1",  label: "Lugnt" },
              { v: "0.18", label: "Normal" },
              { v: "0.3",  label: "Aggressiv" },
            ]}
          />
        </SetRow>
        <div className="text-[12px] text-muted-foreground leading-snug mt-2">
          Hur hårt pulsen knuffas i fas mot faktiska trumslag. <b>Auto</b> följer stämningen (Chill=Lugnt, Fest=Normal, Galet=Aggressiv). Välj en styrka manuellt för att åsidosätta.
        </div>
      </Card>

      <SectionTitle>Rökmaskin</SectionTitle>
      <Card>
        <TglRow label="Rökmaskin ansluten" checked={fogEnabled} onChange={setFogEnabled} />
        {fogEnabled && (
          <>
            <TglRow label="Rök på drop" checked={fogOnDrop} onChange={setFogOnDrop} />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[13px] text-muted-foreground">DMX-adress</span>
              <input
                type="number" min={1} max={512} value={fogAddr}
                onChange={(e) => setFogAddr(Number(e.target.value) || 1)}
                className="w-20 bg-muted border border-border rounded-md px-2 py-1 text-[13px] tabular-nums text-right"
              />
            </div>
            <div className="mt-3">
              <button className="w-full py-2.5 rounded-[9px] bg-primary text-primary-foreground font-medium text-[14px]">
                💨 Rök nu
              </button>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-3">
              <div className="h-full w-[15%]" style={{ background: "linear-gradient(90deg, hsl(var(--ok)), hsl(var(--warn, 40 100% 55%)))" }} />
            </div>
            <div className="text-[12px] text-muted-foreground mt-2 leading-snug">
              Ställ rökmaskinen på samma DMX-adress. Värmekontot ersätter fast vila:
              en lång puff kostar mer än en kort.
            </div>
          </>
        )}
      </Card>

      <SectionTitle>Regi (pro)</SectionTitle>
      <Card>
        <RegiTgl
          label="Regi (pro) aktiv"
          sub="När av: stämnings-vredet rör inte flaggorna nedan — du äger dem själv. När på: Chill/Fest/Galet sätter dem som preset, du kan justera fritt efteråt."
          checked={regiPro}
          onChange={setRegiPro}
        />
        <div className="border-t border-border my-2" />
        <RegiTgl label="Sceniskt djup" sub="Mittlamporna hålls som fasta uplights i höga lägen. Kräver lampor i rad V→H." checked={regi.scenicAnchor} onChange={rg("scenicAnchor")} />
        <RegiTgl label="Släpp strobe-taket (scenläge)" sub="⚠ Höjer blixttakten till 9/s. Slå bara på om lokalen skyltar om strobe vid entrén." checked={regi.strobeUnlimited} onChange={rg("strobeUnlimited")} />
        <div className={regiPro ? "" : "opacity-45 pointer-events-none"}>
          <div className="border-t border-border my-2" />
          <RegiTgl label="Drop-blackout" sub="Kort kolsvart just före drop-explosionen — dubbelt så hård kontrast." checked={regi.dropBlackout} onChange={rg("dropBlackout")} />
          <RegiTgl label="Dynamiskt ljustak (VU)" sub="Max-styrkan följer sektionsenergin — lugna partier lyser dämpat, bara topparna når 100%." checked={regi.energyCeiling} onChange={rg("energyCeiling")} />
          <RegiTgl label="Klubb-läge (hård kontrast)" sub="Kvadrerar VU-taket → mörkt mellan slagen, explosion på topparna. Kräver VU-taket på." checked={regi.clubMode} onChange={rg("clubMode")} />
          <RegiTgl label="Varm vilo-glöd i tystnad" sub="Dim bärnsten-glöd när ingen musik spelar, istället för helt mörkt." checked={regi.ambientGlow} onChange={rg("ambientGlow")} />
          <RegiTgl label="Riser-strobe (build → drop)" sub="Accelererande strobe under uppbyggnad, blackout på dropen. Begränsad till 1,5/s." checked={regi.riserStrobe} onChange={rg("riserStrobe")} />
          <RegiTgl label="Drop-headroom (max 90%, drops 100%)" sub="Normalläget kapas till 90% så drops poppar tydligare." checked={regi.dropHeadroom} onChange={rg("dropHeadroom")} last />
        </div>
      </Card>

      <SectionTitle>Lampor</SectionTitle>
      <Card>
        <div className="space-y-2">
          {([
            { name: "PAR 1", type: "RGB7" as const, addr: 1 },
            { name: "PAR 2", type: "RGB7" as const, addr: 8 },
            { name: "PAR 3", type: "RGB7" as const, addr: 15 },
            { name: "PAR 4", type: "RGB7" as const, addr: 22 },
          ]).map((f) => {
            const roles: { label: string; cls: string }[] =
              f.type === "RGB7"
                ? [
                    { label: "R", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
                    { label: "G", cls: "bg-green-500/20 text-green-300 border-green-500/30" },
                    { label: "B", cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
                    { label: "DIM", cls: "bg-muted text-foreground/80 border-border" },
                    { label: "STR", cls: "bg-yellow-500/20 text-yellow-200 border-yellow-500/30" },
                    { label: "MAC", cls: "bg-muted/40 text-muted-foreground border-border" },
                    { label: "SPD", cls: "bg-muted/40 text-muted-foreground border-border" },
                  ]
                : f.type === "RGBW"
                ? [
                    { label: "R", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
                    { label: "G", cls: "bg-green-500/20 text-green-300 border-green-500/30" },
                    { label: "B", cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
                    { label: "W", cls: "bg-amber-100/15 text-amber-100 border-amber-100/30" },
                  ]
                : f.type === "RGB"
                ? [
                    { label: "R", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
                    { label: "G", cls: "bg-green-500/20 text-green-300 border-green-500/30" },
                    { label: "B", cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
                  ]
                : [{ label: "DIM", cls: "bg-muted text-foreground/80 border-border" }];
            const last = f.addr + roles.length - 1;
            return (
              <div key={f.name} className="flex items-start justify-between py-2 border-b border-border last:border-0 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[14px] font-medium">{f.name}</div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{f.type}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">DMX {f.addr}{roles.length > 1 ? `–${last}` : ""} · {roles.length} kanal{roles.length > 1 ? "er" : ""}</div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {roles.map((r, i) => (
                      <span key={i} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${r.cls}`}>
                        {f.addr + i}·{r.label}
                      </span>
                    ))}
                  </div>
                </div>
                <button className="px-2.5 py-1.5 rounded-[8px] border border-border bg-card text-[12px] shrink-0">Blinka</button>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 py-2 rounded-[9px] border border-border bg-card text-[13px]">+ Lägg till</button>
          <button className="flex-1 py-2 rounded-[9px] border border-border bg-card text-[13px]">Auto-adressera</button>
        </div>
        <div className="text-[12px] text-muted-foreground mt-2 leading-snug">
          Auto-detektering av lamp-typ finns inte — DMX är enkelriktat. Välj läge (RGB/RGBW/Dimmer) manuellt; Auto-adressera räknar ut startadresser åt dig. Riktig editor: Pi:ns <code>/setup</code>.
        </div>
      </Card>

      <SectionTitle>BLE-slingor</SectionTitle>
      <Card>
        <div className="text-[13px] text-muted-foreground">Söker sidecar… <span className="opacity-60">(mock)</span></div>
        <div className="mt-3 py-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium">Slinga · A4:C1:38:XX:XX</div>
              <div className="text-[11px] text-muted-foreground">Parad · ansluten</div>
            </div>
            <button className="px-2.5 py-1.5 rounded-[8px] border border-border bg-card text-[12px]">Blinka</button>
          </div>
        </div>
        <button className="w-full mt-3 py-2.5 rounded-[9px] bg-primary text-primary-foreground font-medium text-[14px]">
          Sök nya slingor (8 s)
        </button>
        <div className="text-[12px] text-muted-foreground mt-2 leading-snug">
          BLEDOM-klonade RGB-band paras här. Tryck <b>Blinka</b> för att pulsa
          lampan i magenta så du ser vilken fysisk slinga det är innan parning.
        </div>
      </Card>

      <SectionTitle>LED-ring (vred)</SectionTitle>
      <Card>
        <RangeRow label="Max ljusstyrka" min={5} max={100} step={1} value={ring.maxBright} unit=""
          onChange={(v) => setRing((s) => ({ ...s, maxBright: v }))} />
        <RangeRow label="Pulse-boost" min={0} max={50} step={1} value={ring.pulseBoost} unit=""
          onChange={(v) => setRing((s) => ({ ...s, pulseBoost: v }))} />
        <RangeRow label="Blackout-fade" min={0} max={3000} step={50} value={ring.blackoutFadeMs} unit=" ms"
          onChange={(v) => setRing((s) => ({ ...s, blackoutFadeMs: v }))} last />
        <div className="text-[12px] text-muted-foreground mt-1 leading-snug">
          Max = takljus. Pulse-boost = extra puff på taktslag. Fade = hur mjukt ringen tonar ut vid släckt läge.
        </div>
      </Card>

      <SectionTitle>System</SectionTitle>
      <Card>
        <div className="flex justify-between text-[13px] mb-1">
          <span className="text-muted-foreground">Version</span>
          <span className="tabular-nums">preview</span>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 py-2.5 rounded-[9px] bg-primary text-primary-foreground font-medium text-[14px]">
            Update to latest
          </button>
          <button className="flex-1 py-2.5 rounded-[9px] border border-border bg-card text-[14px]">
            Rollback
          </button>
        </div>
        <button
          className="w-full mt-2 py-2.5 rounded-[9px] border text-[14px]"
          style={{ borderColor: "hsl(var(--warn, 40 100% 55%))", color: "hsl(var(--warn, 40 100% 55%))" }}
        >
          Fabriks-reset (raderar fixtures)
        </button>
      </Card>

      <TypskyltCard />

      <SectionTitle>WiFi</SectionTitle>

      <Card>
        <div className="flex justify-between text-[13px] mb-1.5">
          <span className="text-muted-foreground">Aktivt nät</span>
          <span className="tabular-nums">pi-dmx (AP)</span>
        </div>
        <div className="flex justify-between text-[13px] mb-3">
          <span className="text-muted-foreground">Sparad hotspot</span>
          <span className="tabular-nums opacity-60">—</span>
        </div>
        <SetRow label="Hotspot-namn (SSID)">
          <input placeholder="t.ex. Richards iPhone"
            className="w-full bg-muted border border-border rounded-md px-2.5 py-2 text-[14px]" />
        </SetRow>
        <SetRow label="Lösenord" last>
          <input type="password" placeholder="hotspottens lösenord"
            className="w-full bg-muted border border-border rounded-md px-2.5 py-2 text-[14px]" />
        </SetRow>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 py-2.5 rounded-[9px] bg-primary text-primary-foreground font-medium text-[14px]">Spara</button>
          <button className="flex-1 py-2.5 rounded-[9px] border border-border bg-card text-[14px]" disabled>Anslut</button>
          <button className="flex-1 py-2.5 rounded-[9px] border border-border bg-card text-[14px]" disabled>Glöm</button>
        </div>
        <div className="text-[12px] text-muted-foreground mt-2 leading-snug">
          Sparad hotspot används automatiskt vid uppstart. Annars startar Pi:n sin egen AP "pi-dmx".
        </div>
      </Card>
    </>
  );
}

// ---- Typskylt (CE-nameplate + EU-DoC generator) --------------------------
// Speglar Pi:ns /setup-kort. State sparas i localStorage under samma nyckel
// som Pi-UI:t använder, så samma värden syns på båda ställen.
const TS_FIELDS = [
  { k: "Mfg", label: "Företagsnamn / tillverkare", ph: "t.ex. Firma AB" },
  { k: "Org", label: "Org.nr (valfritt)", ph: "556123-4567" },
  { k: "Addr1", label: "Postadress", ph: "Gatan 1" },
  { k: "Addr2", label: "Postnr & ort", ph: "123 45 Ort" },
  { k: "Country", label: "Land", ph: "Sverige", def: "Sverige" },
  { k: "Contact", label: "Kontakt (e-post/URL)", ph: "support@…" },
  { k: "Model", label: "Modell", ph: "PDMX-1", def: "PDMX-1" },
  { k: "SN", label: "Serienummer", ph: "2026-0001" },
  { k: "MfgDate", label: "Tillverkningsdatum (ISO-vecka)", ph: "2026-W03" },
  { k: "Ip", label: "IP-klass", ph: "IP20", def: "IP20" },
] as const;

type TsVals = Record<string, string>;

function buildNameplate(v: TsVals): string {
  const line = "──────────────────────────────────────────────────────";
  const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
  return [
    "  pi-dmx Controller           Model: " + (v.Model || "PDMX-1"),
    "  " + line,
    "  SN: " + pad(v.SN || "—", 22) + " Mfg: " + (v.MfgDate || "—"),
    "",
    "  Input:  5 V ⎓  3 A max  (USB-C)",
    "  Power:  15 W max",
    "  IP:     " + (v.Ip || "IP20") + "  (indoor use only)",
    "",
    "  Radio:  Wi-Fi 2.4 GHz  ≤100 mW EIRP",
    "          BT 4.2 LE      ≤10 mW EIRP",
    "",
    "  Manufacturer:",
    "    " + (v.Mfg || "[företagsnamn]") + (v.Org ? "  (" + v.Org + ")" : ""),
    "    " + (v.Addr1 || "[gatuadress]"),
    "    " + (v.Addr2 || "[postnr ort]") + ", " + (v.Country || "Sverige"),
    "    " + (v.Contact || "[e-post/URL]"),
    "",
    "  Made in " + (v.Country || "Sweden"),
    "",
    "      ( C E )        ( WEEE — överkryssad soptunna )",
    "",
    "  ⚠ Stroboskop — se manual. Endast inomhus.",
    "  ⚠ Strobe — see manual. Indoor use only.",
  ].join("\n");
}

function buildDocHtml(v: TsVals): string {
  const esc = (s: string) => (s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as Record<string,string>)[c]);
  const today = new Date().toISOString().slice(0, 10);
  const mfg = esc(v.Mfg || "[Företagsnamn]");
  const addr = [v.Addr1, v.Addr2, v.Country].filter(Boolean).map(esc).join(", ") || "[Adress]";
  const model = esc(v.Model || "PDMX-1");
  const sn = esc(v.SN || "[Serienummer / batch]");
  const contact = esc(v.Contact || "[E-post/URL]");
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>EU DoC — ${model}</title>
<style>
  @page { size:A4; margin:22mm 20mm; }
  body { font-family: Georgia, "Times New Roman", serif; color:#111; font-size:11pt; line-height:1.55; }
  h1 { font-size:16pt; margin:0 0 4px; }
  h2 { font-size:11pt; margin:22px 0 6px; text-transform:uppercase; letter-spacing:.08em; border-bottom:1px solid #333; padding-bottom:2px; }
  .sub { color:#555; font-size:10pt; margin-bottom:18px; }
  table { width:100%; border-collapse:collapse; margin:6px 0; }
  td { padding:4px 6px; vertical-align:top; border-bottom:1px solid #eee; }
  td.k { width:38%; color:#555; }
  ul { margin:4px 0 4px 20px; padding:0; } li { margin:2px 0; }
  .sig { margin-top:36px; display:flex; gap:40px; }
  .sig div { flex:1; } .sig .line { border-top:1px solid #111; margin-top:48px; padding-top:4px; font-size:9pt; color:#555; }
  .foot { margin-top:24px; font-size:9pt; color:#666; }
  .warn { font-size:9pt; color:#555; font-style:italic; }
  .noprint { position:fixed; top:8px; right:8px; }
  .noprint button { font:inherit; padding:8px 14px; cursor:pointer; }
  @media print { .noprint { display:none; } }
</style></head><body>
<div class="noprint"><button onclick="window.print()">Skriv ut / Spara som PDF</button></div>
<h1>EU Declaration of Conformity</h1>
<div class="sub">EU-försäkran om överensstämmelse · Utfärdad ${today}</div>
<h2>1. Product / Produkt</h2>
<table>
  <tr><td class="k">Product name</td><td>pi-dmx Controller — audio-reactive DMX lighting controller</td></tr>
  <tr><td class="k">Model / Type</td><td>${model}</td></tr>
  <tr><td class="k">Serial number / Batch</td><td>${sn}</td></tr>
</table>
<h2>2. Manufacturer / Tillverkare</h2>
<table>
  <tr><td class="k">Name</td><td>${mfg}${v.Org ? " (Org.nr " + esc(v.Org) + ")" : ""}</td></tr>
  <tr><td class="k">Address</td><td>${addr}</td></tr>
  <tr><td class="k">Contact</td><td>${contact}</td></tr>
</table>
<h2>3. Object of the declaration</h2>
<p>This declaration of conformity is issued under the sole responsibility of the manufacturer.
Föremålet för försäkran ovan överensstämmer med relevant harmoniserad unionslagstiftning:</p>
<ul>
  <li><b>Radio Equipment Directive (RED)</b> — 2014/53/EU</li>
  <li><b>RoHS</b> — 2011/65/EU (as amended by (EU) 2015/863)</li>
  <li><b>WEEE</b> — 2012/19/EU</li>
  <li><b>General Product Safety Regulation</b> — (EU) 2023/988</li>
</ul>
<h2>4. Harmonised standards applied</h2>
<ul>
  <li>EN 301 489-1 / EN 301 489-17 — EMC for radio equipment (Wi-Fi/BT)</li>
  <li>EN 300 328 — Wideband transmission systems, 2.4 GHz band</li>
  <li>EN IEC 62368-1 — Audio/video, ICT equipment — Safety</li>
  <li>EN IEC 63000 — Technical documentation for RoHS</li>
  <li>EN 62479 — Assessment of low-power electronic equipment (RF exposure)</li>
</ul>
<p class="warn">Justera listan efter faktiskt genomförd provning.</p>
<h2>5. Radio characteristics</h2>
<table>
  <tr><td class="k">Frequency band</td><td>2400–2483.5 MHz</td></tr>
  <tr><td class="k">Wi-Fi max EIRP</td><td>≤ 100 mW (20 dBm)</td></tr>
  <tr><td class="k">Bluetooth LE max EIRP</td><td>≤ 10 mW (10 dBm)</td></tr>
  <tr><td class="k">Radio module</td><td>Integrated in Raspberry Pi Zero 2 W (CYW43438)</td></tr>
</table>
<h2>6. Additional information</h2>
<table>
  <tr><td class="k">Input</td><td>5 V DC, 3 A max, USB-C</td></tr>
  <tr><td class="k">Power consumption</td><td>15 W max</td></tr>
  <tr><td class="k">Ingress protection</td><td>${esc(v.Ip || "IP20")} — indoor use only</td></tr>
  <tr><td class="k">Manufacturing date / batch</td><td>${esc(v.MfgDate || "—")}</td></tr>
</table>
<h2>7. Signature / Undertecknat för och på uppdrag av tillverkaren</h2>
<div class="sig">
  <div><div class="line">Ort och datum</div></div>
  <div><div class="line">Namn, befattning</div></div>
  <div><div class="line">Underskrift</div></div>
</div>
<div class="foot">Dokumentet arkiveras hos tillverkaren i minst 10 år efter att sista enheten släppts på marknaden. Kopia medföljer varje enhet vid leverans.</div>
</body></html>`;
}

function TypskyltCard() {
  const [v, setV] = useState<TsVals>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("pi-dmx-typskylt-v1") || "{}");
      const out: TsVals = {};
      for (const f of TS_FIELDS) out[f.k] = saved[f.k] ?? (f as any).def ?? "";
      return out;
    } catch {
      const out: TsVals = {};
      for (const f of TS_FIELDS) out[f.k] = (f as any).def ?? "";
      return out;
    }
  });
  const setField = (k: string, val: string) => {
    setV((s) => {
      const n = { ...s, [k]: val };
      try { localStorage.setItem("pi-dmx-typskylt-v1", JSON.stringify(n)); } catch {}
      return n;
    });
  };
  const preview = buildNameplate(v);
  const copy = async () => {
    try { await navigator.clipboard.writeText(preview); }
    catch { alert("Kunde inte kopiera — markera texten manuellt."); }
  };
  const openDoc = () => {
    const w = window.open("", "_blank");
    if (!w) { alert("Popup blockerad — tillåt popups för att generera DoC."); return; }
    w.document.write(buildDocHtml(v));
    w.document.close();
    w.focus();
  };
  const printLabel = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write("<pre style='font-family:ui-monospace,Menlo,monospace;font-size:12px;padding:20px'>" + preview.replace(/</g, "&lt;") + "</pre>");
    w.document.close(); w.focus(); w.print();
  };
  return (
    <>
      <SectionTitle>Typskylt</SectionTitle>
      <Card>
        <div className="text-[12px] text-muted-foreground mb-3 leading-snug">
          Obligatorisk märkning på varje enhet som säljs/hyrs ut i EU. Fyll i fälten — förhandsvisningen uppdateras och kan skickas till etiketttrycket eller exporteras som EU-DoC (PDF).
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TS_FIELDS.map((f) => (
            <label key={f.k} className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">{f.label}</span>
              <input
                value={v[f.k] || ""}
                onChange={(e) => setField(f.k, e.target.value)}
                placeholder={f.ph}
                className="bg-muted border border-border rounded-md px-2.5 py-2 text-[13px]"
              />
            </label>
          ))}
        </div>
        <pre className="mt-3 p-3 rounded-md border border-border bg-black/40 text-[11px] leading-relaxed overflow-auto whitespace-pre font-mono text-neutral-200">
{preview}
        </pre>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={copy} className="flex-1 py-2.5 rounded-[9px] border border-border bg-card text-[14px]">Kopiera etikett</button>
          <button onClick={printLabel} className="flex-1 py-2.5 rounded-[9px] border border-border bg-card text-[14px]">Skriv ut</button>
          <button onClick={openDoc} className="basis-full py-2.5 rounded-[9px] bg-primary text-primary-foreground font-medium text-[14px]">EU-DoC (PDF)</button>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-muted-foreground py-1">Måste också medfölja enheten (inte på skylten)</summary>
          <ul className="mt-2 ml-4 list-disc text-[12px] text-muted-foreground leading-relaxed">
            <li>EU-DoC — signerad, listar RED 2014/53/EU + RoHS 2011/65/EU</li>
            <li>Bruksanvisning på svenska — säkerhet, epilepsi- &amp; rökmaskin-varning</li>
            <li>WEEE-registrering hos El-Kretsen innan första försäljning</li>
            <li>Serienummerregister — arkiveras i 10 år</li>
          </ul>
        </details>
      </Card>
    </>
  );
}



function RegiTgl({
  label, sub, checked, onChange, last, moodLocked,
}: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean; moodLocked?: boolean }) {
  return (
    <label className={`flex items-start justify-between gap-3 py-2.5 ${moodLocked ? "cursor-default opacity-85" : "cursor-pointer"} ${last ? "" : "border-b border-border"}`}>
      <span className="flex-1 min-w-0">
        <span className="text-[14px] block">
          {label}
          {moodLocked && (
            <em className="not-italic ml-1.5 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider rounded-full border align-middle"
                style={{ color: "#e5b8ff", background: "rgba(180,120,255,.14)", borderColor: "rgba(180,120,255,.35)" }}>
              Följer stämning
            </em>
          )}
        </span>
        <span className="text-[11px] text-muted-foreground leading-snug block mt-0.5">{sub}</span>
      </span>
      <SwitchBtn checked={checked} onChange={moodLocked ? () => {} : onChange} />
    </label>
  );
}

function RangeRow({
  label, min, max, step, value, unit, onChange, last,
}: {
  label: string; min: number; max: number; step: number;
  value: number; unit: string; onChange: (v: number) => void; last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${last ? "" : "mb-2.5"}`}>
      <span className="text-[13px] text-muted-foreground w-[110px] flex-none">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[hsl(var(--primary))]"
      />
      <span className="text-[13px] tabular-nums w-14 text-right">{value}{unit}</span>
    </div>
  );
}

/* ────────── Delar (matchar Pi:s .card / h1 / .seg / .tgl) ────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  // Pi: h1 { font-size:13px; letter-spacing:.12em; uppercase; color:--dim; margin:20px 0 10px }
  return (
    <h1 className="text-[13px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mt-5 mb-2.5 px-0.5">
      {children}
    </h1>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-[14px] p-3.5 mb-3">{children}</div>;
}

function SetRow({
  label, children, last,
}: { label: React.ReactNode; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? "" : "mb-3.5"}>
      <div className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function TglRow({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-2 text-[14px] cursor-pointer">
      <span>{label}</span>
      <SwitchBtn checked={checked} onChange={onChange} />
    </label>
  );
}

function SwitchBtn({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-[42px] h-6 rounded-full relative transition-colors flex-none ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(18px)" : "none" }}
      />
    </button>
  );
}

function Seg<T extends string | number>({
  value, options, onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={String(o.v)}
            onClick={() => onChange(o.v)}
            className={`flex-1 px-2 py-2.5 rounded-[9px] border font-medium text-[14px] transition-colors ${
              active
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-card border-border text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SegMini<T extends string | number>({
  value, options, onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={String(o.v)}
            onClick={() => onChange(o.v)}
            className={`px-2.5 py-1.5 rounded-[8px] border font-medium text-[12px] transition-colors ${
              active
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-card border-border text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
