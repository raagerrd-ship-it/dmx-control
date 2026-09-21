# Deploy fran en dator utan node (ladan, 2026-09-21)

`analyser.js` har ar byggd ur `pi-dmx/engine/src/analyser.ts` (commit 824f5b1): evidensval + kickrattar som OPT-IN,
standard bit-identisk med driften (frozen6 48/76). Pa en Windows-dator ansluten till WiFi `pi-dmx`:

```
scp pi-dmx\deploy\analyser.js pi@192.168.4.1:/tmp/analyser.js
ssh pi@192.168.4.1
```
pa Pi:n:
```
node --check /tmp/analyser.js && sudo cp /opt/audio-dmx-engine/dist/analyser.js /opt/audio-dmx-engine/dist/analyser.js.bak-20260921 && sudo cp /tmp/analyser.js /opt/audio-dmx-engine/dist/analyser.js && sudo systemctl restart audio-dmx-engine && sleep 5 && systemctl is-active audio-dmx-engine
```
Aterstall: `sudo cp /opt/audio-dmx-engine/dist/analyser.js.bak-20260921 /opt/audio-dmx-engine/dist/analyser.js && sudo systemctl restart audio-dmx-engine`

A/B pa plats (evidensval + 10 s ring, bank: slutlas 48 -> 51/76, men 2x-fel tillkommer pa langsam country):
```
printf '[Service]\nEnvironment=DMX_TEMPO_EVIDENCE=1\nEnvironment=DMX_TEMPO_ENV_S=10\n' | sudo tee /etc/systemd/system/audio-dmx-engine.service.d/evidens.conf && sudo systemctl daemon-reload && sudo systemctl restart audio-dmx-engine
```
Ta bort: `sudo rm /etc/systemd/system/audio-dmx-engine.service.d/evidens.conf && sudo systemctl daemon-reload && sudo systemctl restart audio-dmx-engine`
