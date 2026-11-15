"""MOLNSVEPET: sektionsförslag ur all-in-one-modellen via Replicate (ägaren 2026-11-15: "kör även via replicate"). LADDAR UPP LJUDET till
Replicate och kostar GPU-sekunder (några öre per låt) - körs för hand, aldrig automatiskt. Kör svep.py först (låtgränserna tas därifrån).
  <lotus>/tools/tempo-facit-pc/.venv/Scripts/python.exe tools/markera/svep_moln.py <wav> [...]      (från engine/)
Varje LÅT (mellan ägarens och svepets låtbyten) klipps ut och analyseras för sig - modellen behöver hela låten för att sätta etiketter.
Svaren sparas i .arena/markera-cache/moln-*.json (en låt betalas en gång). I <namn>.forslag.json byts svepets lokala sektionsförslag ut
mot molnets för de låtar som gått igenom: intro -> intro, verse -> vers, chorus -> refräng, outro -> outro, break/bridge -> break,
inst/solo -> vers (molnets egen etikett står i förslagets 'why'). Övriga förslag (låtbyten, drop, uppbyggnad) rörs inte.
Nyckeln läses av lotus allin1_facit.py (~/.lotus-secrets/replicate.token) och skrivs aldrig ut."""
import sys, os, json, io, time, tempfile
import numpy as np, soundfile as sf
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import svep
sys.path.insert(0, svep.LOTUS)
import allin1_facit as A1
CACHE = os.path.join(svep.E, '.arena', 'markera-cache'); os.makedirs(CACHE, exist_ok=True)
MAP = dict(intro='intro', verse='vers', chorus='refrang', outro='outro', bridge='break', inst='vers', solo='vers')
MAP['break'] = 'break'
SEK = ('intro', 'vers', 'refrang', 'outro', 'break')

def moln(p):
    y, sr = svep.las_wav(p); dur = len(y) / sr; bas = p[:-4]; namn = os.path.basename(bas)
    if not os.path.exists(bas + '.forslag.json'): print(namn, ': kör svep.py först'); return
    F = json.load(io.open(bas + '.forslag.json', encoding='utf-8')); egna = []
    for f in (bas + '.marks-hand.json', bas + '.marks-fin.json'):
        if os.path.exists(f): egna = [m for m in json.load(io.open(f, encoding='utf-8'))['marks'] if not m.get('skip') and not m.get('forslag')]; break
    kant = sorted(set([0.0, dur] + [m['fineS'] for m in egna if m['kind'] == 'latbyte'] + [m['fineS'] for m in F['marks'] if m['kind'] == 'latbyte']))
    kant = [k for i, k in enumerate(kant) if i == 0 or k - kant[i - 1] > 5 or k == dur]
    nya = []; klara = []; gpu = 0.0
    for a, b in zip(kant, kant[1:]):
        if b - a < 45: continue
        cp = os.path.join(CACHE, 'moln-%s-%d-%d.json' % (namn, round(a), round(b)))
        if os.path.exists(cp): res = json.load(io.open(cp, encoding='utf-8'))
        else:
            tmp = os.path.join(tempfile.gettempdir(), 'markera-lat-%d.wav' % os.getpid())
            try:
                sf.write(tmp, y[int(a * sr):int(b * sr)], sr, subtype='PCM_16'); t0 = time.time()
                for forsok in range(4):   # uppladdningen ger ibland 502/401 tillfälligt: försök igen
                    try: r, pt, wall = A1.analyse(tmp); break
                    except Exception as e:
                        if forsok == 3: raise
                        print('    försök %d: %s - väntar' % (forsok + 1, str(e)[:80]), flush=True); time.sleep(8 * (forsok + 1))
                res = dict(segments=[dict(start=s.get('start'), end=s.get('end'), label=s.get('label')) for s in (r.get('segments') or [])], bpm=r.get('bpm'), predictTimeS=pt, at=int(time.time()))
                json.dump(res, io.open(cp, 'w', encoding='utf-8')); gpu += float(pt or 0)
                print('  %s %5.0f-%5.0f s: %d avsnitt, gpu %.0f s, vägg %.0f s' % (namn[-6:], a, b, len(res['segments']), float(pt or 0), time.time() - t0), flush=True)
            except Exception as e: print('  %s %5.0f-%5.0f s: FEL %s' % (namn[-6:], a, b, str(e)[:160]), flush=True); continue
            finally:
                if os.path.exists(tmp): os.remove(tmp)
        klara.append((a, b)); forra = None
        for s in res['segments']:
            k = MAP.get(str(s.get('label')).lower())
            if not k or s.get('start') is None or (s.get('end') or 0) - s['start'] < 2: continue
            if k != forra: nya.append(dict(kind=k, fineS=round(a + max(0.0, float(s['start'])), 3), why='moln: ' + str(s['label'])))
            forra = k
    kvar = [m for m in F['marks'] if not (m['kind'] in SEK and any(a <= m['fineS'] < b for a, b in klara))] + nya
    kvar.sort(key=lambda m: m['fineS']); F['marks'] = kvar; F['moln'] = time.strftime('%Y-%m-%d %H:%M')
    json.dump(F, io.open(bas + '.forslag.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from collections import Counter
    print('%s: %d låtar genom molnet, %d sektionsförslag (%s), ny gpu-tid %.0f s' % (namn, len(klara), len(nya), ', '.join('%d %s' % (v, k) for k, v in Counter(m['kind'] for m in nya).items()), gpu), flush=True)

if __name__ == '__main__':
    if not sys.argv[1:]: sys.exit('ange inspelning(ar): tools/ladan-<datum>/lang-*.wav')
    for w in sys.argv[1:]: moln(os.path.abspath(w))
