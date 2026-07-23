import { useMockLive } from "@/hooks/useMockLive";
import { useDmx } from "@/store/dmx";
import {
  CALM_MODES, FAST_MODES, FULL_MODES,
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
    <main className="mx-auto max-w-md px-4 pt-1 pb-8 safe-bottom">
      <PowerHero />

      <SectionTitle>Stämning</SectionTitle>
      <MoodSlider />

      <SectionTitle>Ljudkälla</SectionTitle>
      <AudioSourceCard />

      <AudioMeterCard />

      <MoreDetails />

      {ownerMode && <OwnerSections />}
    </main>
  );
}

/* ────────── Power (hero) ────────── */

function PowerHero() {
  const s = usePi();
  const on = s.power;
  return (
    <button
      onClick={() => setPi({ power: !on })}
      className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border transition-colors ${
        on
          ? "border-primary bg-[color-mix(in_srgb,hsl(var(--accent))_12%,hsl(var(--card)))]"
          : "border-border bg-card"
      }`}
      aria-pressed={on}
    >
      <div
        className={`w-[52px] h-[52px] rounded-full flex-none flex items-center justify-center text-2xl ${
          on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        ⏻
      </div>
      <div className="min-w-0 text-left">
        <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {on ? "Ljuset är på" : "Ljuset är av"}
        </div>
        <div className="text-[19px] font-semibold leading-tight mt-0.5">
          {on ? "Tryck för att släcka" : "Tryck för att tända"}
        </div>
      </div>
    </button>
  );
}

/* ────────── Stämning: 1..10-slider (speglar KY-040-vredet på Pi) ────────── */

function MoodSlider() {
  const s = usePi();
  const v = Math.max(1, Math.min(10, Math.round(s.intensity * 9) + 1));
  const label = v <= 3 ? "Chill" : v <= 7 ? "Fest" : "Galet";
  const dim = !s.power;
  return (
    <div
      className={`bg-card border rounded-[14px] px-3.5 pt-3.5 pb-3 mb-3 transition-colors ${
        dim ? "border-border opacity-70" : "border-[color-mix(in_srgb,hsl(var(--accent))_55%,hsl(var(--border)))]"
      }`}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Chill → Galet</span>
        <span className="text-[13px] font-semibold tabular-nums">
          <span className="text-primary">{label}</span>
          <span className="text-muted-foreground"> · {v}/10</span>
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={v}
        onChange={(e) => {
          if (!s.power) setPi({ power: true });
          applyIntensity((Number(e.target.value) - 1) / 9);
        }}
        className="w-full h-6 accent-[hsl(var(--primary))] cursor-pointer"
        aria-label="Stämning från Chill till Galet"
      />
      <div className="flex justify-between text-[11px] uppercase tracking-[0.1em] text-muted-foreground mt-1 px-0.5">
        <span>Chill</span>
        <span>Fest</span>
        <span>Galet</span>
      </div>
    </div>
  );
}

/* ────────── Ljudkälla ────────── */

function AudioSourceCard() {
  const s = usePi();
  return (
    <Card>
      <div className="flex gap-2">
        <SourceBtn active={s.audioInput === "aux"} onClick={() => setPi({ audioInput: "aux" })}>
          AUX (kabel)
        </SourceBtn>
        <SourceBtn active={s.audioInput === "mic"} onClick={() => setPi({ audioInput: "mic" })}>
          Mikrofon
        </SourceBtn>
      </div>
    </Card>
  );
}

function SourceBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 rounded-[10px] border font-medium text-[14px] ${
        active
          ? "bg-primary border-primary text-primary-foreground"
          : "bg-card border-border text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ────────── Ljudnivå (matchar Pi:s rader) ────────── */

function AudioMeterCard() {
  const audio = useDmx((st) => st.audioLevel);
  const kick = useDmx((st) => st.kick);
  const bpm = useDmx((st) => st.bpm);
  const conf = useDmx((st) => st.bpmConfidence);
  const beat = useDmx((st) => st.beat);
  const pct = Math.round(audio * 100);
  const confPct = Math.round(conf * 100);
  const locked = bpm > 0;
  const beatErrMs = 0; // preview: PLL-fasfel finns bara på Pi
  const beatErrLabel = locked ? "±0 ms" : "söker…";
  const beatErrColor = locked ? "hsl(var(--ok))" : "hsl(var(--muted-foreground))";
  return (
    <>
      <SectionTitle>
        Ljudnivå <KickDot on={kick > 0.4} />
      </SectionTitle>
      <Card>
        <MeterRow label="BPM" value={locked ? `${Math.round(bpm)} BPM` : "–"} />
        <MeterRow
          label={<>Beat-synk <KickDot on={beat && locked} /></>}
          value={<span style={{ color: beatErrColor }}>{beatErrLabel}</span>}
        />
        <MeterRow label="Konfidens" value={locked ? `${confPct}%` : "–"} />
        <MeterRow label="Nivå just nu" value={`${pct}%`} className="mt-2.5" />
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="h-full transition-[width] duration-[60ms] linear"
            style={{
              width: pct + "%",
              background: "linear-gradient(90deg, hsl(var(--ok)), hsl(var(--accent)))",
            }}
          />
        </div>
        <div className="text-[12px] text-muted-foreground mt-2">
          Auto-gain: <span className="tabular-nums text-foreground">1.0</span>×
        </div>
      </Card>
    </>
  );
}

function MeterRow({
  label, value, className,
}: {
  label: React.ReactNode; value: React.ReactNode; className?: string;
}) {
  return (
    <div className={`flex justify-between items-center mb-1.5 ${className ?? ""}`}>
      <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">{label}</span>
      <span className="text-[13px] tabular-nums">{value}</span>
    </div>
  );
}

function KickDot({ on }: { on: boolean }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full align-middle transition-colors"
      style={{
        background: on ? "hsl(var(--accent))" : "hsl(var(--muted))",
        boxShadow: on ? "0 0 12px hsl(var(--accent))" : "none",
      }}
    />
  );
}

/* ────────── Mer inställningar (details) — Show + Finjustering + rotation ────────── */

function MoreDetails() {
  return (
    <details className="mt-2 group">
      <summary className="py-3.5 rounded-[12px] border border-border bg-card text-[12px] uppercase tracking-[0.1em] text-muted-foreground font-semibold text-center cursor-pointer list-none [&::-webkit-details-marker]:hidden group-open:text-foreground">
        <span>Mer inställningar</span>
        <span className="ml-1 group-open:hidden"> ⌄</span>
        <span className="ml-1 hidden group-open:inline"> ⌃</span>
      </summary>

      <ShowCard />
      <FinjusteringCard />

      <SectionTitle>Lugna effekter</SectionTitle>
      <RotationList modes={CALM_MODES} />
      <SectionTitle>Effekter med fart</SectionTitle>
      <RotationList modes={FAST_MODES} />
      <SectionTitle>Effekter med full fart</SectionTitle>
      <RotationList modes={FULL_MODES} />
    </details>
  );
}

/* ────────── Show ────────── */

function ShowCard() {
  const s = usePi();
  const smart = true; // preview har ingen manuell effekt-lås just nu
  return (
    <>
      <SectionTitle>Show</SectionTitle>
      <Card>
        <div className="text-[12px] text-muted-foreground mb-2 leading-snug">
          {smart
            ? "Smart-läge — anpassar ljuset efter musiken och roterar mellan de effekter du kryssat i."
            : "Manuellt läge — tryck på effekten du vill köra just nu."}
        </div>
        <TglRow
          label="Energi styr läget (av = manuellt)"
          checked={s.energyDrivesMode}
          onChange={(v) => setPi({ energyDrivesMode: v })}
        />
        <div className="flex items-center justify-between py-2">
          <span className="text-[14px]">Byter effekt</span>
          <SegMini
            value={s.dwell}
            options={[
              { v: "slow", label: "Sällan" },
              { v: "normal", label: "Normal" },
              { v: "fast", label: "Ofta" },
            ]}
            onChange={(v) => setPi({ dwell: v })}
          />
        </div>
        <TglRow
          label="Pulsa ljuset på taktslag"
          checked={s.beatPulse}
          onChange={(v) => setPi({ beatPulse: v })}
        />
      </Card>
    </>
  );
}

/* ────────── Finjustering (Reaktion / Dynamik / Ljusstyrka) ────────── */

function FinjusteringCard() {
  const s = usePi();
  return (
    <>
      <SectionTitle>Finjustering</SectionTitle>
      <Card>
        <SetRow label="Reaktion på musiken">
          <Seg
            value={s.agcAgg}
            options={[
              { v: 0.15, label: "Långsam" },
              { v: 0.85, label: "Snabb" },
            ]}
            onChange={(v) => setPi({ agcAgg: v })}
          />
        </SetRow>
        <SetRow label="Dynamik (tyst ↔ högt)">
          <Seg
            value={s.dynamics}
            options={[
              { v: 0.35, label: "Lugn" },
              { v: 0.6,  label: "Normal" },
              { v: 0.85, label: "Maxad" },
            ]}
            onChange={(v) => setPi({ dynamics: v })}
          />
        </SetRow>
        <SetRow label="Ljusstyrka" last>
          <Seg
            value={s.master}
            options={[
              { v: 0.5,  label: "50%" },
              { v: 0.75, label: "75%" },
              { v: 1,    label: "100%" },
            ]}
            onChange={(v) => setPi({ master: v })}
          />
        </SetRow>
      </Card>
    </>
  );
}

/* ────────── Rotation-lista (matchar Pi:s .rotrow) ────────── */

function RotationList({ modes }: { modes: [string, string, string][] }) {
  const s = usePi();
  const playing = usePlayingMode();
  return (
    <Card>
      <div>
        {modes.map(([m, label, desc], i) => {
          const on = s.rotation[m] !== false;
          const isPlaying = playing === m && s.power;
          return (
            <label
              key={m}
              className={`flex items-center justify-between py-2.5 px-2 rounded-md border-l-[3px] transition-colors cursor-pointer ${
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
                <span className="text-xs text-muted-foreground/70 leading-snug">{desc}</span>
              </span>
              <SwitchBtn checked={on} onChange={(v) => setRotation(m, v)} />
            </label>
          );
        })}
      </div>
    </Card>
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
      <SectionTitle>Lampor</SectionTitle>
      <Card>
        <div className="text-xs text-muted-foreground">
          Fixture-editorn finns bara på Pi:n. Öppna <code>/setup</code> på
          <code> pi-dmx.local</code> för att redigera.
        </div>
      </Card>
      <SectionTitle>System</SectionTitle>
      <Card>
        <div className="flex justify-between text-[13px]">
          <span className="text-muted-foreground">Version</span>
          <span className="tabular-nums">preview</span>
        </div>
      </Card>
    </>
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
}: { label: string; children: React.ReactNode; last?: boolean }) {
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
