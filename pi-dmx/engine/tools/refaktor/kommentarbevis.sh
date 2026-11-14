#!/usr/bin/env bash
# BEVIS ATT BARA KOMMENTARER OCH BLANKTECKEN ÄNDRATS: kompilerar src vid en git-revision och arbetskatalogens src med
# --removeComments och jämför all JS byte för byte.   bash tools/refaktor/kommentarbevis.sh [revision, standard HEAD]
cd "$(dirname "$0")/../.." || exit 1
REV=${1:-HEAD}; K=.arena/ref/kb; rm -rf $K; mkdir -p $K/fore/src $K/efter
git -C "$(git rev-parse --show-toplevel)" archive "$REV:pi-dmx/engine/src" | tar -x -C $K/fore/src || exit 1
[ -f $K/fore/src/analyser.ts ] || { echo "tom kopia av $REV"; exit 1; }
cp -r src $K/efter/src
for d in fore efter; do
  printf '{"compilerOptions":{"target":"ES2022","module":"ESNext","moduleResolution":"bundler","outDir":"js","rootDir":"src","strict":true,"esModuleInterop":true,"skipLibCheck":true,"resolveJsonModule":true,"removeComments":true},"include":["src/**/*"]}' > $K/$d/tsconfig.json
  node node_modules/typescript/bin/tsc -p $K/$d > $K/$d.txt 2>&1 || { echo "BYGGFEL $d"; head -5 $K/$d.txt; exit 1; }
done
n=$(find $K/fore/js -name '*.js' | wc -l)
if diff -rq $K/fore/js $K/efter/js > $K/diff.txt; then echo "KOMMENTARBEVIS OK: $n js-filer byte-identiska ($REV mot arbetskatalogen)"; else echo "KOMMENTARBEVIS FEL"; head -5 $K/diff.txt; exit 1; fi
