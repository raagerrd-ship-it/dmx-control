"""MOLNSVEPET: sektionsförslag ur all-in-one-modellen via Replicate (ägaren 2026-11-15: "kör även via replicate"). LADDAR UPP LJUDET till
Replicate och kostar GPU-sekunder (några öre per låt) - körs för hand, aldrig automatiskt. Kör svep.py först (låtgränserna tas därifrån).
  <lotus>/tools/tempo-facit-pc/.venv/Scripts/python.exe tools/markera/svep_moln.py <wav> [...]      (från engine/)
Varje LÅT (mellan ägarens och svepets låtbyten) klipps ut och analyseras för sig - modellen behöver hela låten för att sätta etiketter.
Svaren sparas i .arena/markera-cache/moln-*.json (en låt betalas en gång). Skriver <namn>.forslag-moln.json = raden "Molnet" i sidan:
ett förslag per avsnitt med molnets egen etikett (visas i raden) och sorten den motsvarar: intro -> intro, verse -> vers,
chorus -> refräng, outro -> outro, break/bridge -> break, inst/solo -> vers. Det lokala svepets fil rörs inte.
Nyckeln läses av lotus allin1_facit.py (~/.lotus-secrets/replicate.token) och skrivs aldrig ut."""
import sys, os, json, io, time, tempfile
import numpy as np, soundfile as sf, scipy.signal
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
import svep
sys.path.insert(0, svep.LOTUS)
import allin1_facit as A1
CACHE = os.path.join(svep.E, '.arena', 'markera-cache'); os.makedirs(CACHE, exist_ok=True)

def _upload(path):   # som A1.upload men med rätt innehållstyp för FLAC
    import uuid
    bd = '----markera' + uuid.uuid4().hex
    N = chr(13) + chr(10)
    body = ('--' + bd + N + 'Content-Disposition: form-data; name="content"; filename="' + os.path.basename(path) + '"' + N + 'Content-Type: audio/flac' + N + N).encode() + open(path, 'rb').read() + (N + '--' + bd + '--' + N).encode()
    d = A1.req('POST', A1.API + '/files', body, {'Content-Type': 'multipart/form-data; boundary=' + bd}, timeout=180)
    return (d.get('urls') or {}).get('get')
def _om(steg, f, n=6):
    """ett steg mot Replicate med omförsök: 502/401/tidsgräns kommer och går på deras sida"""
    for k in range(n):
        try: return f()
        except Exception as e:
            if k == n - 1: raise RuntimeError(steg + ': ' + str(e)[:100])
            print('    %s, försök %d: %s - väntar' % (steg, k + 1, str(e)[:60]), flush=True); time.sleep(6 * (k + 1))

def analys(path, grans_s=900):
    """uppladdning, start och avläsning var för sig - ett tillfälligt fel i avläsningen startar inte (och betalar inte) om körningen"""
    url = _om('uppladdning', lambda: _upload(path))
    if not url: raise RuntimeError('uppladdningen gav ingen adress')
    pred = _om('start', lambda: A1.req('POST', A1.API + '/predictions', json.dumps({'version': A1.VERSION, 'input': {'music_input': url, 'visualize': False, 'sonify': False}}).encode(), {'Content-Type': 'application/json'}))
    t0 = time.time()
    while pred.get('status') in ('starting', 'processing'):
        if time.time() - t0 > grans_s: raise RuntimeError('tidsgräns')
        time.sleep(5); pred = _om('avläsning', lambda: A1.req('GET', pred['urls']['get']), 12)
    if pred.get('status') != 'succeeded': raise RuntimeError('körningen ' + str(pred.get('status')) + ' ' + str(pred.get('error'))[:120])
    out = pred['output'] if isinstance(pred['output'], list) else [pred['output']]; ju = next((u for u in out if isinstance(u, str) and u.endswith('.json')), out[0])
    import urllib.request
    def hamta():
        with urllib.request.urlopen(urllib.request.Request(ju, headers={'User-Agent': 'lotus-facit/1.0'}), timeout=60) as r: return json.load(r)
    res = _om('svaret', hamta); res = res[0] if isinstance(res, list) else res
    return res, (pred.get('metrics') or {}).get('predict_time'), time.time() - t0
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
            tmp = os.path.join(tempfile.gettempdir(), 'markera-lat-%d.flac' % os.getpid())   # FLAC (förlustfritt, ~halva storleken): Replicates uppladdning ger 502 på stora wav-filer
            try:
                ys = y[int(a * sr):int(b * sr)]; ys = scipy.signal.resample_poly(ys, 2, 3).astype(np.float32) if sr == 48000 else ys; sf.write(tmp, ys, 32000 if sr == 48000 else sr, format='FLAC', subtype='PCM_16'); t0 = time.time()
                r, pt, wall = analys(tmp)
                res = dict(segments=[dict(start=s.get('start'), end=s.get('end'), label=s.get('label')) for s in (r.get('segments') or [])], bpm=r.get('bpm'), predictTimeS=pt, at=int(time.time()))
                json.dump(res, io.open(cp, 'w', encoding='utf-8')); gpu += float(pt or 0)
                print('  %s %5.0f-%5.0f s: %d avsnitt, gpu %.0f s, vägg %.0f s' % (namn[-6:], a, b, len(res['segments']), float(pt or 0), time.time() - t0), flush=True)
            except Exception as e: print('  %s %5.0f-%5.0f s: FEL %s' % (namn[-6:], a, b, str(e)[:160]), flush=True); continue
            finally:
                if os.path.exists(tmp): os.remove(tmp)
        klara.append((a, b))
        for s in res['segments']:   # VARJE avsnitt skrivs, även när etiketten upprepas: gränserna är molnets bästa bidrag
            k = MAP.get(str(s.get('label')).lower())
            if not k or s.get('start') is None or (s.get('end') or 0) - s['start'] < 2: continue
            nya.append(dict(kind=k, fineS=round(a + max(0.0, float(s['start'])), 3), why='molnets etikett: ' + str(s['label']), etikett=str(s['label'])))
    nya.sort(key=lambda m: m['fineS'])
    json.dump(dict(file=os.path.basename(p), skapad=time.strftime('%Y-%m-%d %H:%M'), marks=nya), io.open(bas + '.forslag-moln.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    from collections import Counter
    print('%s: %d låtar genom molnet, %d sektionsförslag (%s), ny gpu-tid %.0f s' % (namn, len(klara), len(nya), ', '.join('%d %s' % (v, k) for k, v in Counter(m['kind'] for m in nya).items()), gpu), flush=True)

if __name__ == '__main__':
    if not sys.argv[1:]: sys.exit('ange inspelning(ar): tools/ladan-<datum>/lang-*.wav')
    for w in sys.argv[1:]: moln(os.path.abspath(w))
