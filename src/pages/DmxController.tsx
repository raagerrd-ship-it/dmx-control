import { useState } from "react";
import { useMockLive } from "@/hooks/useMockLive";
import { useDmx } from "@/store/dmx";
import {
  CALM_MODES, FAST_MODES, FULL_MODES,
  usePi, usePlayingMode, setPi, setRotation,
  type Dwell, type DropSens,
} from "@/hooks/usePiMock";
import { useLocation } from "react-router-dom";

/**
 * Preview-UI för HYRESGÄST-läget.
 * Prioritet: stort AV/PÅ + Blackout överst, enkelt språk, stora touch-targets.
 * Tekniska reglage (Reaktion / Dynamik / Dropp) döljs bakom "Avancerat".
 * Pi-HTML:en är INTE uppdaterad ännu (medvetet val) — portas senare.
 */
export default function DmxController() {
  useMockLive();
  const location = useLocation();
  const ownerMode = /setup/i.test(location.pathname) || /setup/i.test(location.hash);

  return (
    <main className="mx-auto max-w-md px-4 pt-3 pb-6 safe-bottom">
      <PowerCard />
      <ShowCard />
      <LevelCard />
      <RotationCard title="Lugna effekter"          modes={CALM_MODES} />
      <RotationCard title="Effekter med fart"       modes={FAST_MODES} />
      <RotationCard title="Effekter med full fart"  modes={FULL_MODES} />
      <AdvancedCard />
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
    <label className="flex items-center justify-between py-2.5 text-[15px] cursor-pointer">
      <span>{label}</span>
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
  const pad = size === "sm" ? "px-2.5 py-2 text-xs" : "px-2 py-3 text-[15px]";
  return (
    <div className="flex gap-1.5">
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={String(o.v)}
            onClick={() => onChange(o.v)}
            className={`flex-1 ${pad} rounded-[10px] border font-medium transition-colors ${
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

/* ────────── AV / PÅ + Blackout (nytt: högst upp) ────────── */

function PowerCard() {
  const s = usePi();
  const on = s.power;
  return (
    <div className="bg-card border border-border rounded-[14px] p-4 mt-3 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Status</div>
          <div className={`text-lg font-semibold mt-0.5 ${on ? "text-foreground" : "text-muted-foreground"}`}>
            {on ? "Ljuset styrs av musiken" : "Ljuset är av"}
          </div>
        </div>
        <button
          role="switch"
          aria-checked={on}
          onClick={() => setPi({ power: !on })}
          className={`w-[72px] h-10 rounded-full relative transition-colors flex-none ${on ? "bg-primary" : "bg-muted"}`}
          aria-label={on ? "Stäng av" : "Slå på"}
        >
          <span
            className="absolute top-1 left-1 w-8 h-8 rounded-full bg-white transition-transform shadow"
            style={{ transform: on ? "translateX(32px)" : "none" }}
          />
        </button>
      </div>
      <button
        onClick={() => setPi({ power: false })}
        disabled={!on}
        className="w-full py-3.5 rounded-[10px] border border-border bg-background text-[15px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:opacity-40 active:bg-muted"
      >
        Blackout
      </button>
    </div>
  );
}

/* ────────── Show ────────── */

function ShowCard() {
  const s = usePi();
  return (
    <Section title="Show">
      <div className="text-[13px] text-muted-foreground mb-1">
        Ljuset följer musiken automatiskt och byter effekt då och då.
      </div>
      <Toggle label="Energi styr läget" checked={s.energyDrivesMode} onChange={(v) => setPi({ energyDrivesMode: v })} />
      <div className="flex items-center justify-between py-2 text-[15px] gap-3">
        <span className="flex-none">Byter effekt</span>
        <div className="flex-1 max-w-[220px]">
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
      <div className="mt-3">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] mb-1.5">Ljusstyrka</div>
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

/* ────────── Level ────────── */

function LevelCard() {
  const audio = useDmx((st) => st.audioLevel);
  const kick = useDmx((st) => st.kick);
  const s = usePi();
  const pct = Math.round(audio * 100);

  return (
    <Section
      title="Ljudnivå"
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
        <span className="text-[13px] text-muted-foreground">Nivå från källan</span>
        <span className="text-[13px] tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full transition-[width] duration-[60ms] linear"
          style={{ width: pct + "%", background: "linear-gradient(90deg, hsl(var(--ok)), hsl(var(--accent)))" }}
        />
      </div>
      <div className="flex gap-2 mt-3">
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

/* ────────── Rotation-lists ────────── */

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
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => setRotation(m, e.target.checked)}
                className="ml-3 w-[48px] h-7 appearance-none rounded-full bg-muted checked:bg-primary relative cursor-pointer transition-colors flex-none
                  after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-6 after:h-6 after:rounded-full after:bg-white after:transition-transform
                  checked:after:translate-x-[20px]"
              />
            </label>
          );
        })}
      </div>
    </Section>
  );
}

/* ────────── Avancerat (Reaktion / Dynamik / Dropp) ────────── */

function AdvancedCard() {
  const s = usePi();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full mt-5 mb-3 py-3 rounded-[10px] border border-border bg-card text-[13px] uppercase tracking-[0.12em] text-muted-foreground font-semibold flex items-center justify-center gap-2"
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
          <div>
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
        </div>
      )}
    </>
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
