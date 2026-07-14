import { useState } from "react";
import { PresetGrid } from "@/components/PresetGrid";
import { LiveControls } from "@/components/LiveControls";
import { FixtureSetup } from "@/components/FixtureSetup";
import { LivePreview } from "@/components/LivePreview";
import { HueColorCard } from "@/components/HueColorCard";

import { useMockLive } from "@/hooks/useMockLive";
import { useDmx, presetById } from "@/store/dmx";

type Tab = "live" | "fixtures";

export default function DmxController() {
  useMockLive();
  const [tab, setTab] = useState<Tab>("live");
  const preset = useDmx((s) => s.preset);
  const monoHue = useDmx((s) => s.params.monoHue);
  const cometHue = useDmx((s) => s.params.cometHue);
  const splitHueA = useDmx((s) => s.params.splitHueA);
  const splitHueB = useDmx((s) => s.params.splitHueB);
  const patch = useDmx((s) => s.patchParams);
  const p = presetById(preset);

  return (
    <main className="mx-auto max-w-md min-h-full flex flex-col">
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl leading-tight">DMX Lights</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "hsl(var(--accent))" }}
            />
            Preview (kör inte mot Pi)
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Preset</div>
          <div className="font-display font-bold text-lg" style={{ color: `hsl(${p.hue} 90% 65%)` }}>
            {p.name}
          </div>
        </div>
      </header>

      <div className="px-5">
        <div className="inline-flex rounded-xl bg-card border border-border p-1 text-sm">
          <button
            onClick={() => setTab("live")}
            className={`px-4 py-1.5 rounded-lg transition-colors ${
              tab === "live" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            Live
          </button>
          <button
            onClick={() => setTab("fixtures")}
            className={`px-4 py-1.5 rounded-lg transition-colors ${
              tab === "fixtures" ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
            }`}
          >
            Fixtures
          </button>
        </div>
      </div>

      <section className="flex-1 px-5 py-4 space-y-4 safe-bottom">
        {tab === "live" ? (
          <>
            <SmartSyncPanel />
            <LiveAnalysisPanel />
            <MicCalibration />

            <PresetGrid />
            {preset === "mono"  && <HueColorCard label="Mono-färg"  hue={monoHue}  onChange={(h) => patch({ monoHue: h })} />}
            {(preset === "comet" || preset === "chase") && (
              <HueColorCard label={preset === "comet" ? "Comet-färg" : "Chase-färg"} hue={cometHue} onChange={(h) => patch({ cometHue: h })} />
            )}
            {preset === "split" && (
              <>
                <HueColorCard label="Grupp A (bas)"     hue={splitHueA} onChange={(h) => patch({ splitHueA: h })} />
                <HueColorCard label="Grupp B (diskant)" hue={splitHueB} onChange={(h) => patch({ splitHueB: h })} />
              </>
            )}
            <LiveControls />
            <LivePreview />
          </>
        ) : (
          <>
            <FixtureSetup />
            <LivePreview />
          </>
        )}
      </section>
    </main>
  );
}
