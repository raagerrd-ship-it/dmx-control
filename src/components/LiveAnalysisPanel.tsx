import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Activity, Waves } from "lucide-react";
import { useLiveAnalysis } from "@/store/liveAnalysis";
import { useLiveAnalysisRunner } from "@/hooks/useLiveAnalysis";

export function LiveAnalysisPanel() {
  const s = useLiveAnalysis();
  useLiveAnalysisRunner();

  const statusColor =
    s.status === "locked" ? "bg-emerald-500/20 text-emerald-300"
    : s.status === "listening" ? "bg-blue-500/20 text-blue-300"
    : s.status === "loading" ? "bg-amber-500/20 text-amber-300"
    : s.status === "error" ? "bg-red-500/20 text-red-300"
    : "bg-muted text-muted-foreground";

  const statusLabel =
    s.status === "locked" ? `Låst ${s.bpm} BPM`
    : s.status === "listening" ? "Lyssnar"
    : s.status === "loading" ? "Laddar Essentia…"
    : s.status === "error" ? "Fel"
    : "Av";

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Live Analysis</h3>
            <p className="text-xs text-muted-foreground">Essentia.js — BPM-lås, drop-lookahead, tonart</p>
          </div>
        </div>
        <Switch checked={s.enabled} onCheckedChange={s.setEnabled} />
      </div>

      {s.enabled && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={statusColor}>{statusLabel}</Badge>
            {s.key && <Badge variant="outline">{s.key}</Badge>}
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3" />
              {(s.energy * 100).toFixed(0)}%
            </Badge>
          </div>

          {s.errorMsg && (
            <p className="text-xs text-red-400">{s.errorMsg}</p>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <Label>Drop-känslighet</Label>
              <span className="text-muted-foreground">{(s.sensitivity * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={[s.sensitivity * 100]}
              onValueChange={(v) => s.setSensitivity(v[0] / 100)}
              min={0}
              max={100}
              step={5}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <ToggleRow label="Skicka beats" checked={s.sendBeats} onChange={s.setSendBeats} />
            <ToggleRow label="Skicka drops (lookahead 200 ms)" checked={s.sendDrops} onChange={s.setSendDrops} />
            <ToggleRow label="Skicka färg-hint från tonart" checked={s.sendHues} onChange={s.setSendHues} />
          </div>
        </>
      )}
    </Card>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
