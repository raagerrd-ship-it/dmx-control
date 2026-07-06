import { useState } from "react";
import { PresetGrid } from "@/components/PresetGrid";
import { LiveControls } from "@/components/LiveControls";
import { FixtureSetup } from "@/components/FixtureSetup";
import { LivePreview } from "@/components/LivePreview";
import { useMockLive } from "@/hooks/useMockLive";
import { useDmx, presetById } from "@/store/dmx";

type Tab = "live" | "fixtures";

export default function DmxController() {
  useMockLive();
  const [tab, setTab] = useState<Tab>("live");
  const preset = useDmx((s) => s.preset);
  const conn = useDmx((s) => s.conn);
  const p = presetById(preset);

  return (
    <main className="mx-auto max-w-md min-h-full flex flex-col">
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl leading-tight">DMX Lights</h1>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background:
                  conn === "connected" ? "hsl(140 70% 50%)" :
                  conn === "connecting" ? "hsl(40 90% 55%)" :
                  conn === "mock" ? "hsl(var(--accent))" :
                  "hsl(0 60% 55%)",
              }}
            />
            {conn === "mock" ? "Mock-läge (ingen Pi)" : conn}
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
            <PresetGrid />
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
