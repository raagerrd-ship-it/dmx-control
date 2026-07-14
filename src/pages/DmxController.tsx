import { useMockLive } from "@/hooks/useMockLive";
import { useDmx } from "@/store/dmx";
import {
  CALM_MODES, FAST_MODES, FULL_MODES,
  usePi, usePlayingMode, setPi, setRotation,
  type Dwell, type DropSens, type AudioIn,
} from "@/hooks/usePiMock";
import { useLocation } from "react-router-dom";

/**
 * Preview-UI = visuell spegel av pi-dmx/engine/public/index.html.
 * Sektionsordning, texter och färger MÅSTE matcha Pi-HTML:en pixel-för-pixel
 * (det är själva poängen med denna sida). Ändra båda samtidigt om något justeras.
 */
export default function DmxController() {
  useMockLive();
  const location = useLocation();
  const ownerMode = /setup/i.test(location.pathname) || /setup/i.test(location.hash);

  return (
    <main className="mx-auto max-w-md px-4 pt-3 pb-6 safe-bottom">
      <ShowCard />
      <LevelCard />
      <RotationCard title="Lugna effekter"          modes={CALM_MODES} />
      <RotationCard title="Effekter med fart"       modes={FAST_MODES} />
      <RotationCard title="Effekter med full fart"  modes={FULL_MODES} />
      <EffectsCard />
      <SettingsCard />
      {ownerMode && <OwnerSections />}
      <div className="text-xs text-muted-foreground mt-2">Preview (mock)</div>
    </main>
  );
}

/* ────────── Delar (matchar Pi:s .card / h1-typografi) ────────── */

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-[13px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mt-5 mb-2.5 flex items-center gap-2">
        <span>{title}</span>
        {right}
      </h1>
      <div className="bg-card border border-border rounded-[14px] p-3.5 mb-3">{children}</div>
    </>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-2 text-sm cursor-pointer">
      <span>{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-[42px] h-6 rounded-full relative transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(18px)" : "none" }}
        />
      </button>
    </label>
  );
}

function Seg<T extends string | number>({
  value, options, onChange, size = "md",
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
  size?: "md" | "sm";
}) {
  const pad = size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-2 py-2.5 text-sm";
  return (
    <div className={`flex gap-${size === "sm" ? "1" : "1.5"}`}>
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={String(o.v)}
            onClick={() => onChange(o.v)}
            className={`flex-1 ${pad} rounded-[9px] border font-medium transition-colors ${
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

/* ────────── Show ────────── */

function ShowCard() {
  const s = usePi();
  return (
    <Section title="Show">
      <div className="text-xs text-muted-foreground mb-2">
        Smart-läge — anpassar ljuset efter musiken och roterar mellan de effekter du kryssat i.
      </div>
      <Toggle label="Energi styr läget" checked={s.energyDrivesMode} onChange={(v) => setPi({ energyDrivesMode: v })} />
      <div className="flex items-center justify-between py-2 text-sm">
        <span>Byter effekt</span>
        <div className="w-[180px]">
          <Seg<Dwell>
            size="sm"
            value={s.dwell}
            onChange={(v) => setPi({ dwell: v })}
            options={[
              { v: "slow", label: "Sällan" },
              { v: "normal", label: "Normal" },
              { v: "fast", label: "Ofta" },
            ]}
          />
        </div>
      </div>
      <Toggle label="Pulsa ljuset på taktslag" checked={s.beatPulse} onChange={(v) => setPi({ beatPulse: v })} />
    </Section>
  );
}

/* ────────── Level ────────── */

function LevelCard() {
  const audio = useDmx((st) => st.audioLevel);
  const kick = useDmx((st) => st.kick);
  const s = usePi();
  const pct = Math.round(audio * 100);
  // Fake auto-gain: högre när nivån är låg. Bara visuellt.
  const gain = (1 + (1 - audio) * 3).toFixed(1);

  return (
    <Section
      title="Level"
      right={
        <span
          className="w-2 h-2 rounded-full transition-colors"
          style={{
            background: kick > 0.4 ? "hsl(var(--accent))" : "hsl(var(--muted))",
            boxShadow: kick > 0.4 ? "0 0 12px hsl(var(--accent))" : "none",
          }}
        />
      }
    >
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[13px] text-muted-foreground">Input</span>
        <span className="text-[13px] tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-[width] duration-[60ms] linear"
          style={{ width: pct + "%", background: "linear-gradient(90deg, hsl(var(--ok)), hsl(var(--accent)))" }}
        />
      </div>
      <div className="text-xs text-muted-foreground mt-2">Auto-gain: <span className="tabular-nums text-foreground">{gain}</span>×</div>
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={() => setPi({ audioInput: "aux" })}
          className={`flex-1 py-3 rounded-[10px] border font-medium text-sm ${
            s.audioInput === "aux"
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-card border-border"
          }`}
        >AUX (kabel-in)</button>
        <button
          onClick={() => setPi({ audioInput: "mic" })}
          className={`flex-1 py-3 rounded-[10px] border font-medium text-sm ${
            s.audioInput === "mic"
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-card border-border"
          }`}
        >Mic (inbyggd)</button>
      </div>
    </Section>
  );
}

/* ────────── Rotation-lists ────────── */

function RotationCard({ title, modes }: { title: string; modes: [string, string, string][] }) {
  const s = usePi();
  const playing = usePlayingMode();
  return (
    <Section title={title}>
      <div>
        {modes.map(([m, label, desc], i) => {
          const on = s.rotation[m] !== false;
          const isPlaying = playing === m;
          return (
            <label
              key={m}
              className={`flex items-center py-2 pl-2 pr-1 border-l-[3px] rounded-md transition-colors cursor-pointer ${
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
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => setRotation(m, e.target.checked)}
                className="ml-3 w-[42px] h-6 appearance-none rounded-full bg-muted checked:bg-primary relative cursor-pointer transition-colors
                  after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:transition-transform
                  checked:after:translate-x-[18px]"
              />
            </label>
          );
        })}
      </div>
    </Section>
  );
}

/* ────────── Effekter (drop) ────────── */

function EffectsCard() {
  const s = usePi();
  return (
    <Section title="Effekter">
      <div className="text-[12px] text-muted-foreground uppercase tracking-[0.08em] mb-1.5">Drop-blixt känslighet</div>
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
    </Section>
  );
}

/* ────────── Inställningar ────────── */

function SettingsCard() {
  const s = usePi();
  return (
    <Section title="Inställningar">
      <div className="mb-3.5">
        <div className="text-[12px] text-muted-foreground uppercase tracking-[0.08em] mb-1.5">Reaktion på musiken</div>
        <Seg
          value={s.agcAgg}
          onChange={(v) => setPi({ agcAgg: v })}
          options={[
            { v: 0.15 as const, label: "Långsam" },
            { v: 0.85 as const, label: "Snabb" },
          ]}
        />
      </div>
      <div className="mb-3.5">
        <div className="text-[12px] text-muted-foreground uppercase tracking-[0.08em] mb-1.5">Dynamik (tyst ↔ högt)</div>
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
      <div>
        <div className="text-[12px] text-muted-foreground uppercase tracking-[0.08em] mb-1.5">Ljusstyrka</div>
        <Seg
          value={s.master}
          onChange={(v) => setPi({ master: v })}
          options={[
            { v: 0.5  as const, label: "50%" },
            { v: 0.75 as const, label: "75%" },
            { v: 1    as const, label: "100%" },
          ]}
        />
      </div>
    </Section>
  );
}

/* ────────── Owner-only (Fixtures/System/WiFi) ────────── */

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
          Fixture-editorn finns bara på Pi:n (kräver DMX-adressering och
          identify-blink mot riktiga lampor). Öppna <code>/setup</code> på
          <code> pi-dmx.local</code> för att redigera.
        </div>
      </Section>
      <Section title="System">
        <div className="flex justify-between text-[13px] mb-1">
          <span className="text-muted-foreground">Version</span>
          <span className="tabular-nums">preview</span>
        </div>
        <div className="text-xs text-muted-foreground">Update-knappen fungerar bara på Pi:n.</div>
      </Section>
      <Section title="WiFi">
        <div className="text-xs text-muted-foreground">
          WiFi-inställningar finns bara på Pi:n.
        </div>
      </Section>
    </>
  );
}
