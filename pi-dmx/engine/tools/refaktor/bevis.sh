#!/usr/bin/env bash
# BEVISET FÖR UPPDELNINGEN (refaktorn 2026-11-14): bygger och jämför mot det frysta bygget .arena/ref/dist0 (taggen backup/fore-uppdelning-20261114).
#   [REF=.arena/ref/dist-kedja0] bash tools/refaktor/bevis.sh [snabb]      (REF = referensbygget, standard .arena/ref/dist0; NY = nya bygget, standard dist)
# 1. tsc   2. analyserParity: VARJE fält i VARJE ruta, odelad och delad (inline), med låtbytes-hint och temponollning, tre inspelningar
#    + splitProof: delat mot odelat i nya bygget, bara baslinjens fält får skilja
# 3. dmxDump: md5 av hela DMX-sekvensen per lampa med den riktiga workern i lås-steg (sync)   4. tid per hopp gammal/ny (växelvis)
# FLYTTEN (2026-11-21): 5. TID piBench 4 par  6. DEOPT  7. LOTUSGRINDEN  8. STARTVÄRDEN  9. OMSTART (a014-planen, avsnitt e/f)
cd "$(dirname "$0")/../.." || exit 1
REF=${REF:-.arena/ref/dist0}; NY=${NY:-dist}
W=tools/ladan-2026-11-13; F="$W/lang-20261113T160345.wav $W/lang-20261113T151659.wav $W/lang-20261113T171840.wav"
SECS=700; [ "$1" = snabb ] && { SECS=150; F="$W/lang-20261113T160345.wav"; }
npx tsc -p tsconfig.json || { echo "BYGGFEL"; exit 1; }
ok=1
node tools/analyserParity.mjs --old $REF/analyser.js --new $NY/analyser.js --style dmx --cfg $NY/config.js --secs $SECS --grid --hint-every 97 --reset-every 211 $F > .arena/ref/paritet-odelad.txt 2>&1 || ok=0
echo "paritet odelad: $(tail -1 .arena/ref/paritet-odelad.txt)"
node tools/analyserParity.mjs --old $REF/analyser.js --new $NY/analyser.js --style dmx --cfg $NY/config.js --secs $SECS --grid --hint-every 97 --reset-every 211 --split inline $F > .arena/ref/paritet-inline.txt 2>&1 || ok=0
echo "paritet inline: $(tail -1 .arena/ref/paritet-inline.txt)"
# DELAT MOT ODELAT i nya bygget (2026-11-21): bara fälten i splitProofs baslinje får skilja
node tools/splitProof.mjs --dist $NY --n $([ "$1" = snabb ] && echo 1 || echo 3) > .arena/ref/delning.txt 2>&1 || ok=0
echo "delning: $(tail -1 .arena/ref/delning.txt)"
for f in $F; do
  a=$(DUMP_SPLIT=sync node tools/dmxDump.mjs "$PWD/$REF" $f $SECS 2>/dev/null | grep '"md5"' | tail -1); b=$(DUMP_SPLIT=sync node tools/dmxDump.mjs "$PWD/$NY" $f $SECS 2>/dev/null | grep '"md5"' | tail -1)
  ma=$(echo "$a" | sed 's/.*"md5":\(\[[^]]*\]\).*/\1/'); mb=$(echo "$b" | sed 's/.*"md5":\(\[[^]]*\]\).*/\1/')
  ca=$(echo "$a" | sed 's/.*"cpuUsPerHop":\([0-9.]*\).*/\1/'); cb=$(echo "$b" | sed 's/.*"cpuUsPerHop":\([0-9.]*\).*/\1/')
  if [ "${ma:0:1}" = "[" ] && [ "$ma" = "$mb" ]; then echo "dmx md5 $(basename $f): IDENTISK  (us/hopp $ca -> $cb)"; else echo "dmx md5 $(basename $f): SKILJER"; echo "$a" | cut -c1-200; echo "$b" | cut -c1-200; ok=0; fi
done
# 5. TID: hela analysen (lotusstil, inline), 4 par växelvis. FEL över +3 %, vid utslag en omkörning.
tid() { node tools/refaktor/piBench.mjs $REF/analyser.js $NY/analyser.js $W/lang-20261113T160345.wav 4 | tail -1 | sed 's/.*(\(-\{0,1\}[0-9.]*\) %).*/\1/'; }
over() { case $1 in ''|*[!0-9.-]*) return 0;; esac; awk "BEGIN{exit !($1 > 3)}"; }
p=$(tid); echo "tid ny mot ref: $p %"; over "$p" && { p=$(tid); echo "tid omkörning: $p %"; over "$p" && { echo "TID FEL"; ok=0; }; }
# 6. DEOPT: FEL över ref + 1, vid utslag en omkörning. --single-threaded: utan den brusar räkningen 141–147 (och 1838–2713 under last).
dc() { node --trace-deopt --single-threaded tools/dmxDump.mjs "$PWD/$1" $W/lang-20261113T160345.wav 150 2>/dev/null | grep -c 'bailout (kind: deopt'; }
d0=$(dc $REF); d1=$(dc $NY); echo "deopt $d0 -> $d1"
[ "$d0" -gt 0 ] && [ "$d1" -le $((d0 + 1)) ] || { d0=$(dc $REF); d1=$(dc $NY); echo "deopt omkörning $d0 -> $d1"; [ "$d0" -gt 0 ] && [ "$d1" -le $((d0 + 1)) ] || { echo "DEOPT FEL"; ok=0; }; }
# 7. LOTUS: samma bygge med lotus profilfil (kopior under .arena/flytten/lotus). --style lotus odelat och inline (hopSelf), Date.now = ljudklockan.
L=.arena/flytten/lotus; LP=../../../lotus-light-link/pi/src/audio-analyser/analyserProfile.ts
lp() { rm -rf "$2"; mkdir -p "$L"; cp -r "$1" "$2"; npx tsc $LP --outDir "$2" --target es2022 --module nodenext --moduleResolution nodenext --skipLibCheck --types node && grep -q "envPrefix: 'LOTUS_'" "$2/analyserProfile.js" || { echo "LOTUSBYGGE FEL $2"; ok=0; }; }
lp $REF $L/ref; lp $NY $L/ny
for s in "" "--split inline"; do
  node tools/refaktor/fakenow.mjs --old $L/ref/analyser.js --new $L/ny/analyser.js --style lotus --secs $SECS --grid --hint-every 97 --reset-every 211 $s $F > $L/paritet${s:+-inline}.txt 2>&1
  r=$(tail -1 $L/paritet${s:+-inline}.txt); echo "lotus ${s:-odelad}: $r"; echo "$r" | grep -q 'avvikande hop 0, avvikande loggrader 0' || ok=0
done
# 8. STARTVÄRDEN: varje flyttat fält har dagens värde före första hoppet (flyttkarta.json växer steg för steg).
#    Mot bygget före flytten (kartan går från de gamla namnen), också när REF är en senare referens.
node tools/refaktor/startvarden.mjs .arena/ref/dist-kedja1/analyser.js $NY/analyser.js tools/refaktor/flyttkarta.json || ok=0
# 9. OMSTART: långsamma sidan byts var 60:e sekund (inline, resumeSeq), byte för byte mot ref, räknarna aldrig lägre.
node tools/refaktor/omstart.mjs $REF $NY $SECS $F > .arena/flytten/omstart.txt 2>&1 || ok=0
echo "omstart: $(tail -1 .arena/flytten/omstart.txt)"
[ $ok = 1 ] && echo "BEVIS OK" || { echo "BEVIS FEL"; exit 1; }
