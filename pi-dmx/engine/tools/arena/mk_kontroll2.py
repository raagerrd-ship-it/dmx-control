"""KONTROLLMÄNGD 2 för klockdomaren (2026-11-13; den gamla är använd 16 gånger).  python tools/arena/mk_kontroll2.py  -> tools/arena/kontroll2.json
URVALET görs UTAN att titta på hur någon klocka klarar filerna - bara på facit och på vad som redan är använt:
  källa      lotus korpus (lotus-light-link/tools/tempo-facit-pc/corpus, 30 s-klipp från lotus-micen, samma sorts ljud som frozen6),
             bara filer i bench-manifest.txt (503) som har wav
  facit      result.bpm där två oberoende mätningar är överens (facitVotes 'pc+bt' och voteClass 'lika'), vikt till [80, 160)
  bort       var 4:e manifestfil (lotusbankens --snabb, 126 st: deltagarna har sett dem per fil), alla låtar i tools/frozen6/manifest.tsv
             (övning + gamla kontrollen + natt-korpusen), fler tagningar av samma låt (bara den första i filordning)
  ordning    md5 av låtnyckeln (fast, oberoende av allt annat); de 20 första = MIXEN (varje låt = klippet 5 gånger, 150 s; låtgräns-
             detektorn kräver >= 110 s), de 60 nästa = KLIPPEN (kallstart)
  långa      tre ladinspelningar som ingen domare använt (utflykter, syskontid, rutnätets fas)
  ettan      sex tempon som varken övningen eller gamla kontrollen har
Filen bär md5 per klipp så att en ändrad korpus syns. Skriv aldrig om filen efter första mätningen på en variant."""
import os, io, json, hashlib, re
HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(os.path.dirname(HERE))
LOT = os.path.normpath(os.path.join(ENGINE, '..', '..', '..', 'lotus-light-link', 'tools', 'tempo-facit-pc')); COR = os.path.join(LOT, 'corpus')
norm = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower().replace('å', 'a').replace('ä', 'a').replace('ö', 'o').replace('é', 'e'))
def fold(b):
    while b >= 160: b /= 2
    while b < 80: b *= 2
    return b
man = sorted(x.strip() for x in io.open(os.path.join(LOT, 'bench-manifest.txt'), encoding='utf-8') if x.strip())
snabb = set(man[::4])
anvanda = set()
for l in io.open(os.path.join(ENGINE, 'tools', 'frozen6', 'manifest.tsv'), encoding='utf-8').read().splitlines()[1:]:
    p = l.split('\t')
    if len(p) >= 3: anvanda.add(norm(p[2]))   # titeln räcker (samma titel med annan artist ryker också - hellre en för mycket)
kand, sedda, bort = [], set(), {'snabb': 0, 'frozen6': 0, 'facit': 0, 'dubblett': 0, 'wav': 0}
for f in man:
    wav = os.path.join(COR, f[:-5] + '.wav')
    if not os.path.exists(wav): bort['wav'] += 1; continue
    if f in snabb: bort['snabb'] += 1; continue
    d = json.load(io.open(os.path.join(COR, f), encoding='utf-8')); r = d.get('result') or {}; row = d.get('row') or {}
    if norm(row.get('title')) in anvanda: bort['frozen6'] += 1; continue
    if r.get('facitVotes') != 'pc+bt' or r.get('voteClass') != 'lika' or not r.get('bpm'): bort['facit'] += 1; continue
    key = norm(row.get('artist')) + '|' + norm(row.get('title'))
    if key in sedda: bort['dubblett'] += 1; continue
    sedda.add(key)
    kand.append({'key': key, 'wav': os.path.relpath(wav, ENGINE).replace(os.sep, '/'), 'facit': round(fold(float(r['bpm'])), 1), 'artist': row.get('artist'), 'title': row.get('title'),
                 'md5': hashlib.md5(open(wav, 'rb').read()).hexdigest()})
kand.sort(key=lambda k: hashlib.md5(k['key'].encode()).hexdigest())
mix, klipp = kand[:20], kand[20:80]
out = {'skapad': '2026-11-13', 'urval': __doc__.split('\n', 1)[1], 'kandidater': len(kand), 'bort': bort,
       'mix': [[[k['wav']] * 5, k['facit']] for k in mix], 'klipp': [[k['wav'], k['facit']] for k in klipp],
       'lang': [['l1028b', 'tools/ladan-2026-10-28/lang-20261028T181533.wav'], ['l1011b', 'tools/ladan-2026-10-11/lang-20261011T193430.wav'], ['l1012', 'tools/ladan-2026-10-11/lang-20261012T110658.wav']],
       'ettan': [92, 108, 118, 126, 138, 150], 'latar': {'mix': mix, 'klipp': klipp}}
io.open(os.path.join(HERE, 'kontroll2.json'), 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
import collections
h = collections.Counter(int(k['facit'] // 10) * 10 for k in mix + klipp)
print(f"kandidater {len(kand)} (bort {bort})  mix {len(mix)} låtar = {len(mix) * 150 / 60:.0f} min, klipp {len(klipp)}")
print('tempofördelning (10 BPM-fack):', dict(sorted(h.items())))
print('mixens tempon:', [k['facit'] for k in mix])
