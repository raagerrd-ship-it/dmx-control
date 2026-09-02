#!/bin/bash
# Kor hela regressionssviten mot verifierat facit och skriver EN rad per klipp
# plus en summa. Anvands efter varje andring -- ingen slutsats utan denna.
cd "$(dirname "$0")/.." || exit 1
CLIPS="stranden.wav:114 utandig.wav:90 real.wav:90 drickervin.wav:124"
[ -n "$EXTRA" ] && CLIPS="$CLIPS $EXTRA"
tot=0; n=0; line=""
for c in $CLIPS; do
  f=${c%%:*}; t=${c##*:}
  [ -f "tools/$f" ] || continue
  out=$(TRUTH=$t node tools/replayWav.mjs "tools/$f" 2>&1 | head -1)
  p=$(echo "$out" | sed 's/.*±4%)://;s/|.*//' | tr -d ' %')
  m=$(echo "$out" | grep -oE 'median [0-9]+' | tr -d 'median ')
  line="$line  $(printf '%-14s' ${f%.wav})$(printf '%6s' $p)%% (med $m, facit $t)\n"
  tot=$(python3 -c "print($tot+$p)"); n=$((n+1))
done
printf "$line"
python3 -c "print('  ---- SNITT %.1f %% over $n klipp' % ($tot/$n))"
