import { useSmartSync } from "@/store/smartSync";
import { useSmartSync_Runner } from "@/hooks/useSmartSync";
import { Sparkles, Loader2, Music, AlertCircle, RadioTower, Radio } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  off:         "Av",
  listening:   "Lyssnar...",
  identifying: "Identifierar...",
  analyzing:   "Analyserar låt...",
  synced:      "Synkad",
  "no-match":  "Ingen träff — försöker igen",
  error:       "Fel",
};

const STATUS_ICON = {
  off:         Sparkles,
  listening:   Radio,
  identifying: Loader2,
  analyzing:   Loader2,
  synced:      RadioTower,
  "no-match":  AlertCircle,
  error:       AlertCircle,
} as const;

export function SmartSyncPanel() {
  useSmartSync_Runner();
  const enabled = useSmartSync((s) => s.enabled);
  const status = useSmartSync((s) => s.status);
  const err = useSmartSync((s) => s.errorMsg);
  const track = useSmartSync((s) => s.track);
  const events = useSmartSync((s) => s.events);
  const setEnabled = useSmartSync((s) => s.setEnabled);

  const Icon = STATUS_ICON[status] ?? Sparkles;
  const spin = status === "identifying" || status === "analyzing" || status === "listening";

  return (
    <section className="rounded-2xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "hsl(var(--accent))" }} />
          <div>
            <div className="font-display font-semibold text-sm">Smart Sync</div>
            <div className="text-[11px] text-muted-foreground">Identifierar låten och koreograferar ljuset</div>
          </div>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-accent" : "bg-muted"}`}
          aria-pressed={enabled}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${enabled ? "translate-x-5" : ""}`}
          />
        </button>
      </div>

      {enabled && (
        <div className="flex items-center gap-2 text-xs">
          <Icon className={`w-3.5 h-3.5 ${spin ? "animate-spin" : ""}`} style={{ color: "hsl(var(--muted-foreground))" }} />
          <span className="text-muted-foreground">{STATUS_LABEL[status] ?? status}</span>
          {err && <span className="text-destructive truncate">— {err}</span>}
        </div>
      )}

      {enabled && track && (
        <div className="flex items-center gap-3 pt-1">
          {track.artUrl ? (
            <img src={track.artUrl} alt="" className="w-12 h-12 rounded-md object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
              <Music className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{track.name}</div>
            <div className="text-xs text-muted-foreground truncate">{track.artists}</div>
            <div className="text-[10px] text-muted-foreground/70 mt-0.5">
              {events.length} events i timeline
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
