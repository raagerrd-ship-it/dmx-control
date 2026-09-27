# Kor ett node-kommando med --trace-gc, foljer RSS-toppen (WorkingSet64/PeakWorkingSet64 var 250 ms) och skriver en rad.
#   powershell -File tools/mem/gcRun.ps1 -Name a -NodeFlags "--max-old-space-size=200" -Script tools/showBench.mjs -ScriptArgs "<wav>" -OutDir <dir> -Cwd <engine>
# GC-loggen hamnar i <OutDir>/<Name>.gc.log (stderr), skriptets stdout i <Name>.out.log. Sammanfatta med gcParse.mjs.
param([string]$Name, [string]$NodeFlags = "", [string]$Script, [string]$ScriptArgs = "", [string]$OutDir = ".", [string]$Cwd = ".")
$log = Join-Path $OutDir "$Name.gc.log"; $out = Join-Path $OutDir "$Name.out.log"
$argList = "--trace-gc $NodeFlags $Script $ScriptArgs"
$sw = [Diagnostics.Stopwatch]::StartNew()
$p = Start-Process -FilePath node -ArgumentList $argList -WorkingDirectory $Cwd -RedirectStandardOutput $out -RedirectStandardError $log -PassThru -NoNewWindow
$peak = 0; $samples = New-Object System.Collections.ArrayList
while (-not $p.HasExited) {
  try { $p.Refresh(); $ws = $p.WorkingSet64; if ($ws -gt $peak) { $peak = $ws }; $pk = $p.PeakWorkingSet64; if ($pk -gt $peak) { $peak = $pk }; [void]$samples.Add($ws) } catch {}
  Start-Sleep -Milliseconds 250
}
$sw.Stop()
$sorted = $samples | Sort-Object
$med = 0; if ($sorted.Count -gt 0) { $med = $sorted[[int]($sorted.Count / 2)] }
"$Name flags=[$NodeFlags] wall=$([int]$sw.Elapsed.TotalSeconds) s exit=$($p.ExitCode) rssPeakMB=$([math]::Round($peak/1MB,1)) rssMedianMB=$([math]::Round($med/1MB,1)) samples=$($samples.Count)"
