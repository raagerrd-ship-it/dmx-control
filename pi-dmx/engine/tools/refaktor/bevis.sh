#!/usr/bin/env bash
# BEVISET FÖR UPPDELNINGEN (refaktorn 2026-11-14): bygger och jämför mot det frysta bygget .arena/ref/dist0 (taggen backup/fore-uppdelning-20261114).
#   bash tools/refaktor/bevis.sh [snabb]
# 1. tsc   2. analyserParity: VARJE fält i VARJE ruta, odelad och delad (inline), med låtbytes-hint och temponollning, tre inspelningar
# 3. dmxDump: md5 av hela DMX-sekvensen per lampa med den riktiga workern i lås-steg (sync)   4. tid per hopp gammal/ny (växelvis)
cd "$(dirname "$0")/../.." || exit 1
W=tools/ladan-2026-11-13; F="$W/lang-20261113T160345.wav $W/lang-20261113T151659.wav $W/lang-20261113T171840.wav"
SECS=700; [ "$1" = snabb ] && { SECS=150; F="$W/lang-20261113T160345.wav"; }
npx tsc -p tsconfig.json || { echo "BYGGFEL"; exit 1; }
ok=1
node tools/analyserParity.mjs --old .arena/ref/dist0/analyser.js --new dist/analyser.js --style dmx --cfg dist/config.js --secs $SECS --grid --hint-every 97 --reset-every 211 $F > .arena/ref/paritet-odelad.txt 2>&1 || ok=0
echo "paritet odelad: $(tail -1 .arena/ref/paritet-odelad.txt)"
node tools/analyserParity.mjs --old .arena/ref/dist0/analyser.js --new dist/analyser.js --style dmx --cfg dist/config.js --secs $SECS --grid --hint-every 97 --reset-every 211 --split inline $F > .arena/ref/paritet-inline.txt 2>&1 || ok=0
echo "paritet inline: $(tail -1 .arena/ref/paritet-inline.txt)"
for f in $F; do
  a=$(DUMP_SPLIT=sync node tools/dmxDump.mjs "$PWD/.arena/ref/dist0" $f $SECS 2>/dev/null | grep '"md5"' | tail -1); b=$(DUMP_SPLIT=sync node tools/dmxDump.mjs "$PWD/dist" $f $SECS 2>/dev/null | grep '"md5"' | tail -1)
  ma=$(echo "$a" | sed 's/.*"md5":\(\[[^]]*\]\).*/\1/'); mb=$(echo "$b" | sed 's/.*"md5":\(\[[^]]*\]\).*/\1/')
  ca=$(echo "$a" | sed 's/.*"cpuUsPerHop":\([0-9.]*\).*/\1/'); cb=$(echo "$b" | sed 's/.*"cpuUsPerHop":\([0-9.]*\).*/\1/')
  if [ "${ma:0:1}" = "[" ] && [ "$ma" = "$mb" ]; then echo "dmx md5 $(basename $f): IDENTISK  (us/hopp $ca -> $cb)"; else echo "dmx md5 $(basename $f): SKILJER"; echo "$a" | cut -c1-200; echo "$b" | cut -c1-200; ok=0; fi
done
[ $ok = 1 ] && echo "BEVIS OK" || { echo "BEVIS FEL"; exit 1; }
