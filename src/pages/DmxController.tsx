import { useState } from "react";
import { useMockLive } from "@/hooks/useMockLive";
import { useDmx } from "@/store/dmx";
import {
  CALM_MODES, FAST_MODES, FULL_MODES,
  usePi, usePlayingMode, setPi, setRotation, applyIntensity,
  type Dwell, type PiSettings,
} from "@/hooks/usePiMock";
import { usePiConfig, usePiConnected } from "@/hooks/usePiEngine";
import { useLocation } from "react-router-dom";

/**
 * HYRESGÄST-UI (mock). Prioritet i den ordningen:
 *  1) Är ljuset PÅ? (stor switch)
 *  2) Vilken stämning? (Chill / Fest / Galet — 3 stora tiles, ett tap sätter allt)
 *  3) Ljudkälla
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
  const val = Math.round(s.intensity * 9) + 1; // 1..10
  const label = val <= 3 ? "Chill" : val <= 7 ? "Fest" : "Galet";
  const dim = !s.power;
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-2 px-1">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Stämning</span>
        <span className="text-[13px] font-semibold tabular-nums">
          <span className="text-primary">{label}</span>
          <span className="text-muted-foreground"> · {val}/10</span>
        </span>
      </div>
      <div className={`bg-card border-2 rounded-[14px] px-4 pt-4 pb-3 transition-colors ${
        dim ? "border-border opacity-60" : "border-primary/40"
      }`}>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={val}
          onChange={(e) => {
            if (!s.power) setPi({ power: true });
            applyIntensity((Number(e.target.value) - 1) / 9);
          }}
          className="w-full h-2 accent-[hsl(var(--primary))] cursor-pointer"
          aria-label="Stämning från Chill till Galet"
        />
        <div className="flex justify-between text-[11px] uppercase tracking-[0.12em] text-muted-foreground mt-2 px-0.5">
          <span>Chill</span>
          <span>Fest</span>
          <span>Galet</span>
        </div>
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

/* ────────── Mer: ljusstyrka, live-nivå, effekter, avancerat ────────── */

function AudioMeterCard() {
  const audio = useDmx((st) => st.audioLevel);
  const kick = useDmx((st) => st.kick);
  const bpm = useDmx((st) => st.bpm);
  const conf = useDmx((st) => st.bpmConfidence);
  const beat = useDmx((st) => st.beat);
  const pct = Math.round(audio * 100);
  const confPct = Math.round(conf * 100);
  const locked = bpm > 0 && conf >= 0.5;
  const confLabel = conf < 0.3 ? "Söker" : conf < 0.6 ? "Osäker" : conf < 0.85 ? "Stabil" : "Låst";
  return (
    <Section title="Ljudnivå">
      {/* BPM + beat-lås-prick + confidence */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[22px] font-semibold tabular-nums leading-none">
            {bpm > 0 ? Math.round(bpm) : "—"}
          </span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">BPM</span>
          <span
            className="w-2 h-2 rounded-full inline-block ml-1 transition-all duration-100"
            style={{
              background: beat && locked ? "hsl(var(--accent))" : "hsl(var(--muted))",
              boxShadow: beat && locked ? "0 0 10px hsl(var(--accent))" : "none",
              transform: beat && locked ? "scale(1.4)" : "scale(1)",
            }}
            aria-label={beat ? "taktslag" : ""}
          />
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
    <div className="mt-3 space-y-4">
      {/* ────────── EFFEKT-SEKTION ────────── */}
      <div>
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-2 px-1">Effekter</h2>
        <div className="bg-card border border-border rounded-[14px] p-4 divide-y divide-border">
          {/* Vilken effekt spelar */}
          <div className="pb-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-1.5">Spelar nu</div>
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
                  // Manuellt val → nolla aktiv stämning (matchar engine: setMode nollar activeMood).
                  setPi({ scene: null });
                }}
                className="py-2.5 px-4 rounded-[10px] border border-border bg-card text-[13px] font-semibold"
              >
                Nästa
              </button>
            </div>
          </div>

          {/* Byter-effekt-hastighet */}
          <div className="py-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-1.5">Byter effekt</div>
            <Seg<Dwell>
              value={s.dwell}
              onChange={(v) => setPi({ dwell: v })}
              options={[
                { v: "slow", label: "Sällan" },
                { v: "normal", label: "Normal" },
                { v: "fast", label: "Ofta" },
              ]}
            />
          </div>

          {/* Rotation-listor */}
          <div className="pt-2">
            <AdvancedRotation />
          </div>
        </div>
      </div>

      {/* ────────── LJUD/LJUS-INSTÄLLNINGAR ────────── */}
      <div>
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-2 px-1">Ljud/ljus-inställningar</h2>
        <div className="bg-card border border-border rounded-[14px] p-4">
          {/* Ljusstyrka */}
          <div className="mb-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-1.5">Ljusstyrka</div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[13px] text-muted-foreground tabular-nums">{Math.round(s.master * 100)}%</span>
            </div>
            <Seg
              value={s.master}
              onChange={(v) => setPi({ master: v })}
              options={[
                { v: 0.5,  label: "50%" },
                { v: 0.75, label: "75%" },
                { v: 1,    label: "100%" },
              ]}
            />
          </div>

          {/* Avancerat: tekniska reglage */}
          <AdvancedTechnical />
        </div>
      </div>

      {/* ────────── LED-RING (runt fysiska vredet) ────────── */}
      <div>
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-2 px-1">LED-ring runt vredet</h2>
        <div className="bg-card border border-border rounded-[14px] p-4">
          <RingSettings />
        </div>
      </div>
    </div>
  );
}

function RingSettings() {
  const s = usePi();
  const r = s.ring;
  const set = (patch: Partial<PiSettings["ring"]>) =>
    setPi({ ring: { ...r, ...patch } });
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Max-ljusstyrka</div>
          <div className="text-[13px] tabular-nums text-muted-foreground">{Math.round(r.maxBright * 100)}%</div>
        </div>
        <input
          type="range" min={5} max={100} step={5}
          value={Math.round(r.maxBright * 100)}
          onChange={(e) => set({ maxBright: Number(e.target.value) / 100 })}
          className="w-full h-2 accent-[hsl(var(--primary))] cursor-pointer"
          aria-label="Max-ljusstyrka på LED-ringen"
        />
        <div className="text-[11px] text-muted-foreground/80 mt-1 leading-snug">
          Tak för hur starkt ringen får lysa. Håll under ~50 % om ringen delar 5 V med Codec Zero.
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Pulse-boost på beat</div>
          <div className="text-[13px] tabular-nums text-muted-foreground">+{Math.round(r.pulseBoost * 100)}%</div>
        </div>
        <input
          type="range" min={0} max={50} step={2}
          value={Math.round(r.pulseBoost * 100)}
          onChange={(e) => set({ pulseBoost: Number(e.target.value) / 100 })}
          className="w-full h-2 accent-[hsl(var(--primary))] cursor-pointer"
          aria-label="Ringens pulse-boost på taktslag"
        />
        <div className="text-[11px] text-muted-foreground/80 mt-1 leading-snug">
          Extra blink när takten träffar. 0 % = stilla ring.
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Blackout-fade</div>
          <div className="text-[13px] tabular-nums text-muted-foreground">{r.blackoutFadeMs} ms</div>
        </div>
        <input
          type="range" min={0} max={2000} step={50}
          value={r.blackoutFadeMs}
          onChange={(e) => set({ blackoutFadeMs: Number(e.target.value) })}
          className="w-full h-2 accent-[hsl(var(--primary))] cursor-pointer"
          aria-label="Hur mjukt ringen slocknar vid blackout"
        />
        <div className="text-[11px] text-muted-foreground/80 mt-1 leading-snug">
          Hur mjukt ringen slocknar när ljuset släcks. 0 = instant.
        </div>
      </div>
    </div>
  );
}

function AdvancedRotation() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full py-3 text-[13px] uppercase tracking-[0.12em] text-muted-foreground font-semibold flex items-center justify-center gap-2"
        aria-expanded={open}
      >
        <span>Anpassa effekter</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="space-y-3 pt-1">
          <RotationCard title="Lugna effekter"         modes={CALM_MODES} />
          <RotationCard title="Effekter med fart"      modes={FAST_MODES} />
          <RotationCard title="Effekter med full fart" modes={FULL_MODES} />
        </div>
      )}
    </>
  );
}

function AdvancedTechnical() {
  const [open, setOpen] = useState(false);
  const cfg = usePiConfig();
  const connected = usePiConnected();

  // Skalor matchar moods.ts (FEEL): chill → galet ändpunkter per fält.
  const pct = (v: number | undefined, lo: number, hi: number) =>
    v === undefined ? null : Math.round(((v - lo) / (hi - lo)) * 100);
  const bool = (v: boolean | undefined) => (v === undefined ? null : v ? 100 : 0);
  // smartDwellMs: låg = ofta byte, hög = sällan → invertera för "Byter effekt".
  const dwellPct = (ms: number | undefined) =>
    ms === undefined ? null : Math.round(((40000 - Math.max(10000, Math.min(40000, ms))) / 30000) * 100);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full py-3 text-[13px] uppercase tracking-[0.12em] text-muted-foreground font-semibold flex items-center justify-center gap-2"
        aria-expanded={open}
      >
        <span>Avancerat</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="space-y-4 pt-1">
          <div className="text-[11px] text-muted-foreground/80 leading-snug -mt-1">
            Live-värden direkt från motorn. Alla sätts automatiskt av stämningen
            (slider eller det fysiska vredet).
            {!connected && (
              <span className="text-accent"> · Ansluter till motorn…</span>
            )}
          </div>
          {/* Kontinuerliga rattar (lerpas av applyIntensity) */}
          <ReadonlyMeter label="Ljusstyrka"           pct={pct(cfg?.master,      0.30, 1.00)} leftLabel="30%"   rightLabel="100%" />
          <ReadonlyMeter label="Reaktion på musiken"  pct={pct(cfg?.sensitivity, 0.50, 0.70)} leftLabel="Långsam" rightLabel="Snabb" />
          <ReadonlyMeter label="Dynamik (tyst ↔ högt)" pct={pct(cfg?.dynamics,   0.30, 0.85)} leftLabel="Lugn"  rightLabel="Maxad" />
          <ReadonlyMeter label="Reaktions-tröghet"    pct={pct(cfg?.calmDecay,   1.20, 0.42)} leftLabel="Trögt" rightLabel="Snärtigt" />
          <ReadonlyMeter label="Byter effekt"         pct={dwellPct(cfg?.smartDwellMs)}       leftLabel="Sällan" rightLabel="Ofta" />
          {/* Bucket-flaggor (snäpper vid chill/fest/galet) */}
          <ReadonlyMeter label="Pulsa ljuset på taktslag" pct={bool(cfg?.beatPulse)}        leftLabel="Av" rightLabel="På" />
          <ReadonlyMeter label="Energi styr läget"        pct={bool(cfg?.energyDrivesMode)} leftLabel="Av" rightLabel="På" />
          <ReadonlyMeter label="Blackout före drop"       pct={bool(cfg?.dropBlackout)}     leftLabel="Av" rightLabel="På" />
          <ReadonlyMeter label="Klubb-kontrast"           pct={bool(cfg?.clubMode)}         leftLabel="Av" rightLabel="På" />
          <ReadonlyMeter label="Vilo-glöd i tystnad"      pct={bool(cfg?.ambientGlow)}      leftLabel="Av" rightLabel="På" />
          <ReadonlyMeter label="Dynamiskt ljustak"        pct={bool(cfg?.energyCeiling)}    leftLabel="Av" rightLabel="På" />
          <ReadonlyMeter label="Riser-strobe (uppbyggnad)" pct={bool(cfg?.riserStrobe)}     leftLabel="Av" rightLabel="På" />
          <ReadonlyMeter label="Drop-headroom (drops = 100%)" pct={bool(cfg?.dropHeadroom)} leftLabel="Av" rightLabel="På" />
        </div>
      )}
    </>
  );
}

function ReadonlyMeter({
  label, pct, leftLabel, rightLabel,
}: {
  label: string; pct: number | null; leftLabel: string; rightLabel: string;
}) {
  const missing = pct === null || pct === undefined || Number.isNaN(pct);
  const clamped = missing ? 0 : Math.max(0, Math.min(100, pct as number));
  return (
    <div className={missing ? "opacity-50" : undefined}>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.08em]">{label}</div>
        <div className="text-[11px] tabular-nums text-muted-foreground/70">{missing ? "—" : "auto"}</div>
      </div>
      <input
        type="range" min={0} max={100} step={1}
        value={clamped}
        readOnly disabled
        className="w-full h-2 accent-[hsl(var(--primary))] opacity-70 cursor-not-allowed"
        aria-label={`${label} (styrs av stämning)`}
      />
      <div className="flex justify-between text-[11px] uppercase tracking-[0.1em] text-muted-foreground/70 mt-1 px-0.5">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
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
