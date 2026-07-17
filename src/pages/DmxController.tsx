import { useState } from "react";
import { useMockLive } from "@/hooks/useMockLive";
import { useDmx } from "@/store/dmx";
import {
  CALM_MODES, FAST_MODES, FULL_MODES, SCENES,
  usePi, usePlayingMode, setPi, setRotation, applyScene,
  type Dwell, type DropSens, type Scene,
} from "@/hooks/usePiMock";
import { useLocation } from "react-router-dom";

/**
 * HYRESGÄST-UI (mock). Prioritet i den ordningen:
 *  1) Är ljuset PÅ? (stor switch)
 *  2) Vilken stämning? (Chill / Fest / Galet — 3 stora tiles, ett tap sätter allt)
 *  3) Ljusstyrka
 * Allt annat gömt bakom "Mer inställningar". Pi-HTML:en är fortfarande orörd.
 */
export default function DmxController() {
  useMockLive();
  const location = useLocation();
  const ownerMode = /setup/i.test(location.pathname) || /setup/i.test(location.hash);
  const [showMore, setShowMore] = useState(false);

  return (
    <main className="mx-auto max-w-md px-4 pt-4 pb-8 safe-bottom">
      <PowerHero />
      <SceneTiles />
      <AudioSourceCard />
      <AudioMeterCard />
      <MoreButton open={showMore} onToggle={() => setShowMore((o) => !o)} />
      {showMore && <MoreSections />}
      {ownerMode && <OwnerSections />}
    </main>
  );
}

/* ────────── 1. Stor AV/PÅ + Blackout (hero) ────────── */

function PowerHero() {
  const s = usePi();
  const on = s.power;
  return (
    <button
      onClick={() => setPi({ power: !on })}
      className={`w-full rounded-[18px] p-5 mb-4 text-left transition-all border-2 ${
        on
          ? "border-primary bg-[color-mix(in_srgb,hsl(var(--accent))_18%,transparent)]"
          : "border-border bg-card"
      }`}
      aria-pressed={on}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center flex-none transition-colors ${
            on ? "bg-primary" : "bg-muted"
          }`}
        >
          <PowerIcon on={on} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {on ? "Ljuset är på" : "Ljuset är av"}
          </div>
          <div className="text-[19px] font-semibold leading-tight mt-0.5">
            {on ? "Tap för att släcka" : "Tap för att tända"}
          </div>
        </div>
      </div>
    </button>
  );
}

function PowerIcon({ on }: { on: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke={on ? "#fff" : "hsl(var(--muted-foreground))"}
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v9" />
      <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
    </svg>
  );
}

/* ────────── 2. Scen-tiles ────────── */

function SceneTiles() {
  const s = usePi();
  return (
    <div className="mb-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2 px-1">Stämning</div>
      <div className="grid grid-cols-3 gap-2">
        {SCENES.map((sc) => {
          const active = s.scene === sc.id;
          const dim = !s.power;
          return (
            <button
              key={sc.id}
              onClick={() => { if (!s.power) setPi({ power: true }); applyScene(sc.id); }}
              className={`rounded-[14px] py-4 px-2 border-2 transition-all flex flex-col items-center gap-1.5 ${
                active
                  ? "border-primary bg-[color-mix(in_srgb,hsl(var(--accent))_16%,transparent)]"
                  : "border-border bg-card"
              } ${dim ? "opacity-60" : ""}`}
              aria-pressed={active}
            >
              <span className={`text-2xl leading-none ${active ? "text-primary" : "text-muted-foreground"}`}>{sc.icon}</span>
              <span className="text-[15px] font-semibold">{sc.label}</span>
              <span className="text-[11px] text-muted-foreground leading-tight">{sc.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ────────── 3. Ljudkälla (synligt i huvudvy) ────────── */

function AudioSourceCard() {
  const s = usePi();
  return (
    <Section title="Ljudkälla">
      <div className="flex gap-2">
        <button
          onClick={() => setPi({ audioInput: "aux" })}
          className={`flex-1 py-3.5 rounded-[10px] border font-semibold text-[15px] ${
            s.audioInput === "aux"
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-card border-border"
          }`}
        >AUX (kabel)</button>
        <button
          onClick={() => setPi({ audioInput: "mic" })}
          className={`flex-1 py-3.5 rounded-[10px] border font-semibold text-[15px] ${
            s.audioInput === "mic"
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-card border-border"
          }`}
        >Mikrofon</button>
      </div>
    </Section>
  );
}

/* ────────── "Mer inställningar" toggle ────────── */

function MoreButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full py-3.5 rounded-[12px] border border-border bg-card text-[13px] uppercase tracking-[0.12em] text-muted-foreground font-semibold flex items-center justify-center gap-2"
      aria-expanded={open}
    >
      <span>{open ? "Dölj mer" : "Mer inställningar"}</span>
      <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
    </button>
  );
}

/* ────────── Mer: ljudkälla, live-nivå, effekter, avancerat ────────── */

function AudioMeterCard() {
  const audio = useDmx((st) => st.audioLevel);
  const kick = useDmx((st) => st.kick);
  const bpm = useDmx((st) => st.bpm);
  const conf = useDmx((st) => st.bpmConfidence);
  const pct = Math.round(audio * 100);
  const confPct = Math.round(conf * 100);
  const locked = bpm > 0 && conf >= 0.5;
  const confLabel = conf < 0.3 ? "Söker" : conf < 0.6 ? "Osäker" : conf < 0.85 ? "Stabil" : "Låst";
  return (
    <Section title="Ljudnivå">
      {/* BPM + confidence */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[22px] font-semibold tabular-nums leading-none">
            {bpm > 0 ? Math.round(bpm) : "—"}
          </span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">BPM</span>
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1 ml-4">
          <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-[width] duration-200"
              style={{
                width: confPct + "%",
                background: locked ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))",
              }}
            />
          </div>
          <span
            className="text-[11px] tabular-nums w-14 text-right"
            style={{ color: locked ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }}
          >
            {confLabel}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[13px] text-muted-foreground flex items-center gap-2">
          Nivå just nu
          <span
            className="w-2 h-2 rounded-full transition-colors inline-block"
            style={{
              background: kick > 0.4 ? "hsl(var(--accent))" : "hsl(var(--muted))",
              boxShadow: kick > 0.4 ? "0 0 12px hsl(var(--accent))" : "none",
            }}
          />
        </span>
        <span className="text-[13px] tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-[width] duration-[60ms] linear"
          style={{ width: pct + "%", background: "linear-gradient(90deg, hsl(var(--ok)), hsl(var(--accent)))" }}
        />
      </div>
    </Section>
  );
}


function MoreSections() {
  const s = usePi();
  const playing = usePlayingMode();
  const playingLabel = [...CALM_MODES, ...FAST_MODES, ...FULL_MODES].find(([m]) => m === playing)?.[1] ?? playing;

  return (
    <div className="mt-3">
      {/* Ljusstyrka */}
      <Section title="Ljusstyrka">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] text-muted-foreground tabular-nums">{Math.round(s.master * 100)}%</span>
        </div>
        <Seg
          value={s.master}
          onChange={(v) => setPi({ master: v })}
          options={[
            { v: 0.5  as const, label: "50%" },
            { v: 0.75 as const, label: "75%" },
            { v: 1    as const, label: "100%" },
          ]}
        />
      </Section>


      {/* Vilken effekt spelar */}
      <Section title="Spelar nu">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[17px] font-semibold truncate">{playingLabel}</div>
            <div className="text-[12px] text-muted-foreground">Byts automatiskt beroende på scen</div>
          </div>
          <button
            onClick={() => {
              // hoppa till nästa aktiverade
              const all = [...CALM_MODES, ...FAST_MODES, ...FULL_MODES].map(([m]) => m);
              const enabled = all.filter((m) => s.rotation[m] !== false);
              const idx = enabled.indexOf(playing);
              const next = enabled[(idx + 1) % enabled.length];
              // simulera hopp genom att stänga av+på nuvarande så cycle-hooken re-syncar
              if (next) setRotation(next, true);
            }}
            className="py-2.5 px-4 rounded-[10px] border border-border bg-card text-[13px] font-semibold"
          >
            Nästa
          </button>
        </div>
      </Section>

      {/* Byter-effekt-hastighet */}
      <Section title="Byter effekt">
        <Seg<Dwell>
          value={s.dwell}
          onChange={(v) => setPi({ dwell: v })}
          options={[
            { v: "slow", label: "Sällan" },
            { v: "normal", label: "Normal" },
            { v: "fast", label: "Ofta" },
          ]}
        />
      </Section>

      {/* Avancerat: rotation-listor + tekniska reglage */}
      <AdvancedRotation />
      <AdvancedTechnical />
    </div>
  );
}

function AdvancedRotation() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full mt-2 mb-3 py-3 rounded-[10px] border border-border bg-card text-[13px] uppercase tracking-[0.12em] text-muted-foreground font-semibold flex items-center justify-center gap-2"
        aria-expanded={open}
      >
        <span>Anpassa effekter</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <>
          <RotationCard title="Lugna effekter"         modes={CALM_MODES} />
          <RotationCard title="Effekter med fart"      modes={FAST_MODES} />
          <RotationCard title="Effekter med full fart" modes={FULL_MODES} />
        </>
      )}
    </>
  );
}

function AdvancedTechnical() {
  const s = usePi();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full mb-3 py-3 rounded-[10px] border border-border bg-card text-[13px] uppercase tracking-[0.12em] text-muted-foreground font-semibold flex items-center justify-center gap-2"
        aria-expanded={open}
      >
        <span>Avancerat</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="bg-card border border-border rounded-[14px] p-3.5 mb-3">
          <div className="mb-4">
            <div className="text-[11px] text-muted-foreground uppercase tracking-[0.08em] mb-1.5">Reaktion på musiken</div>
            <Seg
              value={s.agcAgg}
              onChange={(v) => setPi({ agcAgg: v })}
              options={[
                { v: 0.15 as const, label: "Långsam" },
                { v: 0.85 as const, label: "Snabb" },
              ]}
            />
          </div>
          <div className="mb-4">
            <div className="text-[11px] text-muted-foreground uppercase tracking-[0.08em] mb-1.5">Dynamik (tyst ↔ högt)</div>
            <Seg
              value={s.dynamics}
              onChange={(v) => setPi({ dynamics: v })}
              options={[
                { v: 0.35 as const, label: "Lugn" },
                { v: 0.6  as const, label: "Normal" },
                { v: 0.85 as const, label: "Maxad" },
              ]}
            />
          </div>
          <div className="mb-4">
            <div className="text-[11px] text-muted-foreground uppercase tracking-[0.08em] mb-1.5">Drop-blixt känslighet</div>
            <Seg<DropSens>
              value={s.dropSensitivity}
              onChange={(v) => setPi({ dropSensitivity: v })}
              options={[
                { v: 0,   label: "Av" },
                { v: 0.3, label: "Låg" },
                { v: 0.6, label: "Normal" },
                { v: 0.9, label: "Hög" },
              ]}
            />
          </div>
          <label className="flex items-center justify-between py-1 text-[15px] cursor-pointer">
            <span>Pulsa ljuset på taktslag</span>
            <SwitchBtn checked={s.beatPulse} onChange={(v) => setPi({ beatPulse: v })} />
          </label>
          <label className="flex items-center justify-between py-1 text-[15px] cursor-pointer">
            <span>Energi styr läget</span>
            <SwitchBtn checked={s.energyDrivesMode} onChange={(v) => setPi({ energyDrivesMode: v })} />
          </label>
        </div>
      )}
    </>
  );
}

/* ────────── Delar ────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mt-4 mb-2 px-1">{title}</h1>
      <div className="bg-card border border-border rounded-[14px] p-4 mb-3">{children}</div>
    </>
  );
}

function SwitchBtn({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-[48px] h-7 rounded-full relative transition-colors flex-none ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(20px)" : "none" }}
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
            className={`flex-1 px-2 py-3 rounded-[10px] border font-medium text-[15px] transition-colors ${
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

function RotationCard({ title, modes }: { title: string; modes: [string, string, string][] }) {
  const s = usePi();
  const playing = usePlayingMode();
  return (
    <Section title={title}>
      <div>
        {modes.map(([m, label, desc], i) => {
          const on = s.rotation[m] !== false;
          const isPlaying = playing === m && s.power;
          return (
            <label
              key={m}
              className={`flex items-center py-2.5 pl-2 pr-1 border-l-[3px] rounded-md transition-colors cursor-pointer ${
                isPlaying ? "border-l-primary" : "border-l-transparent"
              } ${i > 0 ? "border-t border-t-border" : ""}`}
              style={isPlaying ? { background: "color-mix(in srgb, hsl(var(--accent)) 18%, transparent)" } : undefined}
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
                <span className="text-xs text-muted-foreground/80 leading-snug">{desc}</span>
              </span>
              <SwitchBtn checked={on} onChange={(v) => setRotation(m, v)} />
            </label>
          );
        })}
      </div>
    </Section>
  );
}

/* ────────── Owner-only ────────── */

function OwnerSections() {
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
      <Section title="Fixtures">
        <div className="text-xs text-muted-foreground">
          Fixture-editorn finns bara på Pi:n. Öppna <code>/setup</code> på
          <code> pi-dmx.local</code> för att redigera.
        </div>
      </Section>
      <Section title="System">
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">Version</span>
          <span className="tabular-nums">preview</span>
        </div>
      </Section>
    </>
  );
}
