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
    <main className="mx-auto max-w-md px-4 pt-1 pb-8 safe-bottom">
      <PowerHero />

      <SectionTitle>Stämning</SectionTitle>
      <MoodSlider />

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
  const info =
    v <= 2 ? { name: "Chill",  desc: "Mjukt och långsamt, följer inte taktslag" } :
    v <= 4 ? { name: "Chill+", desc: "Följer musiken lugnt" } :
    v <= 6 ? { name: "Fest",   desc: "Pulsar på taktslag, byter effekt ibland" } :
    v <= 8 ? { name: "Fest+",  desc: "Klubb-läge, byter effekt oftare" } :
             { name: "Galet",  desc: "Full fart, drop-blackout, riser-strobe" };
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
          <span className="text-primary">{info.name}</span>
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
      <div className="mt-2.5 pt-2.5 border-t border-border text-[13px] leading-snug">
        {info.desc}
      </div>
    </div>
  );
}

/* ────────── Ljud (källa + nivå + teknisk info) ────────── */

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

function AudioMeterCard() {
  const s = usePi();
  const audio = useDmx((st) => st.audioLevel);
  const kick = useDmx((st) => st.kick);
  const bpm = useDmx((st) => st.bpm);
  const conf = useDmx((st) => st.bpmConfidence);
  const beat = useDmx((st) => st.beat);
  const pct = Math.round(audio * 100);
  const confPct = Math.round(conf * 100);
  const locked = bpm > 0;
  const beatErrLabel = locked ? "±0 ms" : "söker…";
  const beatErrColor = locked ? "hsl(var(--ok))" : "hsl(var(--muted-foreground))";
  return (
    <>
      <SectionTitle>
        Ljud <KickDot on={kick > 0.4} />
      </SectionTitle>
      <Card>
        <div className="flex gap-2">
          <SourceBtn active={s.audioInput === "aux"} onClick={() => setPi({ audioInput: "aux" })}>
            AUX (kabel)
          </SourceBtn>
          <SourceBtn active={s.audioInput === "mic"} onClick={() => setPi({ audioInput: "mic" })}>
            Mikrofon
          </SourceBtn>
        </div>
        <MeterRow label="Nivå just nu" value={`${pct}%`} className="mt-3.5" />
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className="h-full transition-[width] duration-[60ms] linear"
            style={{
              width: pct + "%",
              background: "linear-gradient(90deg, hsl(var(--ok)), hsl(var(--accent)))",
            }}
          />
        </div>
        <details className="mt-3 group/tech">
          <summary className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground font-semibold cursor-pointer list-none [&::-webkit-details-marker]:hidden py-1.5 group-open/tech:text-foreground">
            <span>Teknisk info</span>
            <span className="ml-1 group-open/tech:hidden"> ⌄</span>
            <span className="ml-1 hidden group-open/tech:inline"> ⌃</span>
          </summary>
          <div className="mt-2">
            <MeterRow label="BPM" value={locked ? `${Math.round(bpm)} BPM` : "–"} />
            <MeterRow
              label={<>Beat-synk <KickDot on={beat && locked} /></>}
              value={<span style={{ color: beatErrColor }}>{beatErrLabel}</span>}
            />
            <MeterRow label="Konfidens" value={locked ? `${confPct}%` : "–"} />
            <div className="text-[12px] text-muted-foreground mt-2">
              Auto-gain: <span className="tabular-nums text-foreground">1.0</span>×
            </div>
          </div>
        </details>
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
    <>
      <details className="mt-2 group/eff">
        <summary className="py-3 rounded-[12px] border border-border bg-card text-[12px] uppercase tracking-[0.1em] text-muted-foreground font-semibold text-center cursor-pointer list-none [&::-webkit-details-marker]:hidden group-open/eff:text-foreground">
          <span>Effekt-val · välj vilka som roterar</span>
          <span className="ml-1 group-open/eff:hidden"> ⌄</span>
          <span className="ml-1 hidden group-open/eff:inline"> ⌃</span>
        </summary>
        <SectionTitle>Lugna effekter</SectionTitle>
        <RotationList modes={CALM_MODES} />
        <SectionTitle>Effekter med fart</SectionTitle>
        <RotationList modes={FAST_MODES} />
        <SectionTitle>Effekter med full fart</SectionTitle>
        <RotationList modes={FULL_MODES} />
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
    <details className="mt-3.5 group">
      <summary className="py-3.5 rounded-[12px] border border-border bg-card text-[12px] uppercase tracking-[0.1em] text-muted-foreground font-semibold text-center cursor-pointer list-none [&::-webkit-details-marker]:hidden group-open:text-foreground">
        <span>Avancerat · spegel av stämningen</span>
        <span className="ml-1 group-open:hidden"> ⌄</span>
        <span className="ml-1 hidden group-open:inline"> ⌃</span>
      </summary>
      <div className="mt-1">
        <Card>
          <div className="text-[12px] text-muted-foreground leading-snug mb-2.5">
            Skrivskyddad vy. Stämnings-slidern (och det fysiska vredet) sätter allt nedan — dessa värden speglar motorn i realtid.
          </div>
          <AdvBar label="Dynamik"       pct={f.dynamics * 100}    value={Math.round(f.dynamics * 100) + "%"} />
          <AdvBar label="Reaktion"      pct={f.sensitivity * 100} value={Math.round(f.sensitivity * 100) + "%"} />
          <AdvBar label="Ljustak"       pct={f.master * 100}      value={Math.round(f.master * 100) + "%"} />
          <AdvBar label="Tröghet"       pct={decayPct}            value={f.calmDecay.toFixed(2) + "s"} />
          <AdvBar label="Byter effekt"  pct={dwellPct}            value={dwellLbl} />
          <div className="mt-3 pt-2.5 border-t border-border grid grid-cols-2 gap-x-3 gap-y-1.5">
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
        </Card>
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
          // Mock:en har inga specialroll-fixtures konfigurerade (bara PAR i
          // demo-state) → alla effekter vars `drives` kräver hazer/uv/etc. gråas
          // ut med "kräver: X"-tagg. Exakt samma logik som på Pi:n; skillnaden
          // är bara att Pi:ns cfg.fixtures verkligen kan innehålla de rollerna.
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
    </Card>
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
  const [fogEnabled, setFogEnabled] = useState(false);
  const [fogOnDrop, setFogOnDrop] = useState(true);
  const [fogAddr, setFogAddr] = useState(200);
  const [regi, setRegi] = useState({
    dropBlackout: true, scenicAnchor: false, energyCeiling: true,
    clubMode: false, ambientGlow: true, riserStrobe: false,
    strobeUnlimited: false, dropHeadroom: false,
  });
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
        <SetRow label="Beat-synk" last>
          <Seg
            value={beatSync}
            onChange={setBeatSync}
            options={[
              { v: 0,    label: "Av" },
              { v: 0.10, label: "Mjuk" },
              { v: 0.18, label: "Normal" },
              { v: 0.30, label: "Aggressiv" },
            ]}
          />
        </SetRow>
        <div className="text-[12px] text-muted-foreground leading-snug mt-2">
          Hur hårt pulsen knuffas i fas mot faktiska trumslag. Av = fri-rullande
          på detekterad BPM. Aggressiv låser snabbast men kan rycka på taktrik musik.
        </div>
      </Card>

      <SectionTitle>Rökmaskin</SectionTitle>
      <Card>
        <TglRow label="Rökmaskin ansluten" checked={fogEnabled} onChange={setFogEnabled} />
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
      </Card>

      <SectionTitle>Regi (pro)</SectionTitle>
      <Card>
        <RegiTgl label="Drop-blackout" sub="Kort kolsvart just före drop-explosionen — dubbelt så hård kontrast." checked={regi.dropBlackout} onChange={rg("dropBlackout")} />
        <RegiTgl label="Sceniskt djup" sub="Mittlamporna hålls som fasta uplights i höga lägen. Kräver lampor i rad V→H." checked={regi.scenicAnchor} onChange={rg("scenicAnchor")} />
        <RegiTgl label="Dynamiskt ljustak (VU)" sub="Max-styrkan följer sektionsenergin — lugna partier lyser dämpat, bara topparna når 100%." checked={regi.energyCeiling} onChange={rg("energyCeiling")} />
        <RegiTgl label="Klubb-läge (hård kontrast)" sub="Kvadrerar VU-taket → mörkt mellan slagen, explosion på topparna. Kräver VU-taket på." checked={regi.clubMode} onChange={rg("clubMode")} />
        <RegiTgl label="Varm vilo-glöd i tystnad" sub="Dim bärnsten-glöd när ingen musik spelar, istället för helt mörkt." checked={regi.ambientGlow} onChange={rg("ambientGlow")} />
        <RegiTgl label="Riser-strobe (build → drop)" sub="Accelererande strobe under uppbyggnad, blackout på dropen. Begränsad till 1,5/s." checked={regi.riserStrobe} onChange={rg("riserStrobe")} />
        <RegiTgl label="Släpp strobe-taket (scenläge)" sub="⚠ Höjer blixttakten till 9/s. Slå bara på om lokalen skyltar om strobe vid entrén." checked={regi.strobeUnlimited} onChange={rg("strobeUnlimited")} />
        <RegiTgl label="Drop-headroom (max 90%, drops 100%)" sub="Normalläget kapas till 90% så drops poppar tydligare." checked={regi.dropHeadroom} onChange={rg("dropHeadroom")} last />
      </Card>

      <SectionTitle>Lampor</SectionTitle>
      <Card>
        <div className="space-y-2">
          {[
            { name: "PAR 1", type: "RGBW", addr: 1 },
            { name: "PAR 2", type: "RGBW", addr: 8 },
            { name: "PAR 3", type: "RGBW", addr: 15 },
            { name: "PAR 4", type: "RGBW", addr: 22 },
          ].map((f) => (
            <div key={f.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <div className="text-[14px] font-medium">{f.name}</div>
                <div className="text-[11px] text-muted-foreground">{f.type} · DMX {f.addr}</div>
              </div>
              <button className="px-2.5 py-1.5 rounded-[8px] border border-border bg-card text-[12px]">Blinka</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 py-2 rounded-[9px] border border-border bg-card text-[13px]">+ Lägg till</button>
          <button className="flex-1 py-2 rounded-[9px] border border-border bg-card text-[13px]">Auto-adressera</button>
        </div>
        <div className="text-[12px] text-muted-foreground mt-2 leading-snug">
          Mock — riktig fixture-editor finns på Pi:ns <code>/setup</code>.
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

function RegiTgl({
  label, sub, checked, onChange, last,
}: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <label className={`flex items-start justify-between gap-3 py-2.5 cursor-pointer ${last ? "" : "border-b border-border"}`}>
      <span className="flex-1 min-w-0">
        <span className="text-[14px] block">{label}</span>
        <span className="text-[11px] text-muted-foreground leading-snug block mt-0.5">{sub}</span>
      </span>
      <SwitchBtn checked={checked} onChange={onChange} />
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
