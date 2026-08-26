# Hämta hem stabilitetslärdomarna från Lotus Lantern Control

Jag har läst Lotus-projektets kod och driftminnen. Analysatorn där är en spegel av den här motorn, så BPM/beat-delen har inget nytt att ge. Det som är nytt i Lotus är **drifthärdning som är mätt på riktig hårdvara under dagar** — och den delen saknas här. Nedan är det som är värt att flytta över, i den ordning som ger mest per rad kod.

## 1. Percentil-AGC på analysatortappen

Lotus mätte live att en momentan-nivå-AGC pinnade `level` ≥ 0,95 i ~55 % av tiden med upp till 21 % klippning — uppbyggnader blev osynliga eftersom nivån redan låg i taket. Vår `analyser.ts` har kvar exakt den gamla envelope-AGC:n (och en kommentar som redan konstaterar att percentil-varianten vore bättre).

Åtgärd: byt `envelope` till en hög percentil av rå RMS (16 blockmaxima à 128 ms ≈ 2 s, näst största värdet), långsam attack / snabb retreat, `autoGainTarget` som tak. Mäts med en ny bänkkörning: andel sampel ≥ 0,95 ska under 15 %, klipp ~0, och BPM-sviten ska vara oförändrat grön.

## 2. Runtime-hälsa som siffror i stället för känsla

Lotus har `runtimeHealth.ts`: `fftFps`, `loopLagMs`, `tickJitterMs`, sena tickar, ALSA-overruns, samt peak-tid för långsamma anrop — max nollställs vid läsning. Poängen: CPU-% ljuger, ALSA kapar bufferten tyst långt innan lasten syns.

Åtgärd: portera modulen, koppla in den i renderloopen och ljudcallbacken, och exponera den under befintliga `/api/health-log` (samma kort i UI:t, ny rad "runtime"). Ingen ny timer.

## 3. Tysta ljudstall — upptäck och laga utan processomstart

Vår `audio.ts` respawnar `arecord` vid `exit` och `error`, men inte när processen lever och slutar leverera samples. Lotus fick omstart ~1×/10 h av just det fallet, och löste det med stall-detektering + riktad omstart av rätt delsystem.

Åtgärd: om ingen chunk kommit på 1500 ms → logga i hälsologgen och respawna capturen. Watchdogen får diagnos först (ljud eller DMX?) och slår bara till på processomstart efter tre misslyckade riktade försök. Fallback-uttoningen till svart rörs inte.

## 4. Heap-tak och swappiness

Lotus spårade återkommande 8-sekundersfrysningar till ett för högt V8-heaptak: RSS växte, systemet swappade, full GC blev en swap-in-storm. Vi kör motorn med 200 MB heap plus BLE-sidecar 80 MB på en 512 MB-Pi — samma fälla.

Åtgärd: sänk motorn till 112 MB och sidecarn till 64 MB (`--max-semi-space-size=4`), och skriv `vm.swappiness=10` från `install.sh`. MemoryMax/MemoryHigh rörs inte.

## 5. Anti-churn runt BLE-anslutningar

BLEDOM-kloner hänger sin firmware vid snabb connect/disconnect-churn och kräver då strömcykel. Vår sidecar reconnectar med 0,8–2,3 s backoff utan tak eller golv.

Åtgärd: hårt golv 2 s mellan connect-försök per slinga, churn-vakt (>5 försök på 30 s → pausa 15 s), och tidsgränsad disconnect vid avstängning så processen alltid hinner ut. Ingen ändring i skrivvägen.

## 6. Loggtak på återkommande varningar

Lotus fyllde journald när BLE hängde. Vi har samma mönster på overrun- och skrivfel.

Åtgärd: räkna tyst, varna högst var 10:e sekund.

## Medvetet uteslutet

ACL-drain-gaten och conn-interval-forceringen (gäller Lotus enprocess-BLE, vår skrivväg är redan takad), Sonos/SSE-koordinering (finns inte här), och Dirigent v2:s ljusform (vår stämning/moods äger den formen).

## Verifiering

1. Percentil-AGC → mät pinnad andel + klipp, kör `testBpmHard`/`testBpm`/`testDownbeat`/`testSeekLocked` → identiska lås.
2. Hälsomått → `fftFps` nära förväntad hop-takt, `loopLag` max under 100 ms i vila.
3. Ljudstall → döda `arecord` mitt i drift: riggen tonar till svart, capturen kommer tillbaka utan processomstart.
4. Heap → uptime-körning där RSS planar ut i stället för att klättra.
5. BLE-churn → fem snabba omstarter i rad ska inte kräva strömcykel på slingan.
