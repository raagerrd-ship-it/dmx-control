# Deploy fran en dator utan node (ladan, 2026-09-21)

`analyser.js` har ar byggd ur `pi-dmx/engine/src/analyser.ts` (commit 824f5b1): evidensval + kickrattar som OPT-IN,
standard bit-identisk med driften (frozen6 48/76). md5 (git-blob, LF) `c20876b88d0d7ee6ee3cdf2eae4e60f6`.

Adress: pa Pi:ns eget AP (WiFi `pi-dmx`) ar den `192.168.4.1`; pa hotspoten `Pixel_9285` svarar den som `pi-dmx.local`
= `172.29.167.218` (mDNS). Nedan `PI=172.29.167.218` - byt vid behov.

OBS core.autocrlf: den utcheckade filen pa Windows har CRLF (md5 b946e9e8...). Skicka LF-varianten:
```
git show HEAD:pi-dmx/deploy/analyser.js > $env:TEMP\analyser.js
scp $env:TEMP\analyser.js pi@$PI:/tmp/analyser.js
ssh pi@$PI
```
pa Pi:n (`node --check` maste koras i en mapp med `"type":"module"` - i /tmp tolkas `import` som CommonJS och faller, Node 18.20.4):
```
mkdir -p /tmp/chk && echo '{"type":"module"}' > /tmp/chk/package.json && cp /tmp/analyser.js /tmp/chk/ && node --check /tmp/chk/analyser.js && sudo cp /opt/audio-dmx-engine/dist/analyser.js /opt/audio-dmx-engine/dist/analyser.js.bak-20260921 && sudo cp /tmp/analyser.js /opt/audio-dmx-engine/dist/analyser.js && sudo chmod 644 /opt/audio-dmx-engine/dist/analyser.js && sudo systemctl restart audio-dmx-engine && sleep 5 && systemctl is-active audio-dmx-engine
```
`sudo` gar utan losenord for `pi`. SSH-nyckel fran laptopen (VMTRAILER-PC27, `~/.ssh/id_ed25519_pi`) ligger i `authorized_keys` sedan 2026-09-21,
sa `ssh -i ~/.ssh/id_ed25519_pi pi@$PI` behover inget losenord. Med losenord och python: `PI_HOST=$PI PI_PASS=... python tools/deploy-dist.py analyser.js` i `pi-dmx/engine` (kraver `dist/analyser.js`).

Aterstall: `sudo cp /opt/audio-dmx-engine/dist/analyser.js.bak-20260921 /opt/audio-dmx-engine/dist/analyser.js && sudo systemctl restart audio-dmx-engine`

Deployad 2026-09-21 16:25 fran laptopen: backup .bak-20260921 (146020 B, md5 ebda6b4ac203ed1a3eeedb3d717f806f), ny 155885 B, is-active: active.

A/B pa plats (evidensval + 10 s ring, bank: slutlas 48 -> 51/76, men 2x-fel tillkommer pa langsam country):
```
printf '[Service]\nEnvironment=DMX_TEMPO_EVIDENCE=1\nEnvironment=DMX_TEMPO_ENV_S=10\n' | sudo tee /etc/systemd/system/audio-dmx-engine.service.d/evidens.conf && sudo systemctl daemon-reload && sudo systemctl restart audio-dmx-engine
```
Ta bort: `sudo rm /etc/systemd/system/audio-dmx-engine.service.d/evidens.conf && sudo systemctl daemon-reload && sudo systemctl restart audio-dmx-engine`

## 2026-09-21 kvall: "liv" i nivan (DMX_LIVE_LEVEL) - effects.js tillkommer
Agaren i kallaren: BLE-remsan har mer liv (brightness som foljer ljudet) an DMX-lamporna. Orsak: DMX:s loudness = frame.intensity
(SEKTIONSNIVA, sekunder); lotus driver nivan fran ra mid/diskant per tick genom ett 10 dB-fonster mot ett langsamt ankare
(instant attack, 350 ms release). Portat som opt-in i effects.ts (DMX_LIVE_LEVEL=1; rattar LIVE_WIN_DB 10, LIVE_OFFSET_DB 4,5,
LIVE_ANCHOR_S 120, LIVE_RELEASE_MS 350, LIVE_BASS_W 0,25, DMX_LIVE_TRACE=1 loggar). Offline (tools/testLiveLevel.mjs): rorelse pa
slagskala 1,4-3,4x, sektionsskala oforandrad. Deploya BADA filerna (analyser.js + effects.js), samma steg som ovan for var fil.
A/B: `printf '[Service]\nEnvironment=DMX_LIVE_LEVEL=1\n' | sudo tee /etc/systemd/system/audio-dmx-engine.service.d/liveniva.conf && sudo systemctl daemon-reload && sudo systemctl restart audio-dmx-engine`
Nar nivan lever kan golven i ladan sankas (LIGHT_FLOOR 0,45 -> ~0,3, BEAT_MIN 0,30 -> ~0,2) - annars ar dynamikspannet bara 55 %.
