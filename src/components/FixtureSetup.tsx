import { channelsFor, useDmx, type FixtureMode } from "@/store/dmx";

const MODES: { id: FixtureMode; label: string }[] = [
  { id: "rgb", label: "RGB (3ch)" },
  { id: "rgbw", label: "RGBW (4ch)" },
  { id: "dimmer", label: "Dimmer (1ch)" },
];

export function FixtureSetup() {
  const fixtures = useDmx((s) => s.fixtures);
  const add = useDmx((s) => s.addFixture);
  const upd = useDmx((s) => s.updateFixture);
  const rm  = useDmx((s) => s.removeFixture);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display font-bold text-base">Fixtures</div>
          <div className="text-xs text-muted-foreground">DMX-kanaler per lampa</div>
        </div>
        <button
          onClick={add}
          className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium"
        >
          + Lägg till
        </button>
      </div>

      <div className="space-y-2">
        {fixtures.map((f) => {
          const end = f.startCh + channelsFor(f.mode) - 1;
          return (
            <div key={f.id} className="rounded-xl bg-muted/40 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={f.name}
                  onChange={(e) => upd(f.id, { name: e.target.value })}
                  className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-border"
                />
                <button
                  onClick={() => rm(f.id)}
                  className="text-xs text-muted-foreground hover:text-destructive px-2 py-1"
                  aria-label="Ta bort"
                >
                  Ta bort
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">
                  <div className="text-muted-foreground mb-1">Startkanal</div>
                  <input
                    type="number"
                    min={1}
                    max={512}
                    value={f.startCh}
                    onChange={(e) => upd(f.id, { startCh: Math.max(1, Math.min(512, Number(e.target.value) || 1)) })}
                    className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm tabular-nums"
                  />
                </label>
                <label className="text-xs">
                  <div className="text-muted-foreground mb-1">Läge</div>
                  <select
                    value={f.mode}
                    onChange={(e) => upd(f.id, { mode: e.target.value as FixtureMode })}
                    className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm"
                  >
                    {MODES.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                Kanaler {f.startCh}–{end}
              </div>
            </div>
          );
        })}
        {fixtures.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            Inga fixtures. Lägg till en för att börja.
          </div>
        )}
      </div>
    </div>
  );
}
