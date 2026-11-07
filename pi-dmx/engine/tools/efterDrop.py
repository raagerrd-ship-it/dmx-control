"""EFTER DROPEN (dagkörningen 2026-11-07). Ägaren: 'efter drop räkna med att det är refräng så taket är 95 %, men jag tror att
öka golvet till 70 % är fel, då dödar vi ju bara dynamik.' Mäter per show-drop vad energilyftet gör med ljuset efter dropen.

Kör tools/efterDropTrace.mjs (analysator + effektmotor SOM LIVE: 200 Hz render, delad analysator med motorns cfg, kick-bypass)
på varje wav och läser ljudets basanslag ur samma wav (som ljusLag.py: bas 40-150 Hz, stigning / 2 s-medel, de 30 % starkaste
lokala topparna = 'starka basanslag').

Per show-drop (motorns egen flank = dropens smäll startar, efter 15 s; 'godkänd' = lyftet pågår 1 s efter, dvs. efterkontrollen
släppte igenom den - analysatorns dropCount utan motorns flank blir minidrop och räknas inte här), fönster A = 0,8-8 s (lyftet)
och B = 8-12 s (fallet), avkortade före nästa drop:
  (a) PULS   p90-p10 av riggens ljus (medel av 4 lampor) och av ljusaste lampan; medel per slag av (max - min) inom varje slag
             (slaglängd = effektklockans bpm i fönstret) - 'pumpar takten'
  (b) ENERGI medelljus i A mot samma drops senare refräng (sektion high, utan lyft, 12-60 s efter, före nästa drop) och mot före
             dropen (-8..-1 s) - 'energin får inte dö'
  (c) TAKET  andel starka basanslag i A där ljusaste lampans topp 0..150 ms efter anslaget når >= 90 % av 95 % ('taket 95 %');
             tak90rel = samma mot rutans eget tak (sektionstaket x 0,95 + dropens öppning)
  (d) DROPSPRÅNG riggens ljus 0,5 s före mot max inom 0,8 s efter (lugna = intro/low/break, höga = resten), som showTight
  + sektionstaket (secCeil) i A (kontroll: 1 under lyftet), lampspridning (max - min mellan lampor, DMX-steg) i A och i hela filen
'alla_*' = medel över ALLA show-drops (även de efterkontrollen fäller) - parat, jämförbart när en ändring flyttar vilka som godkänns;
'A_*' = bara de godkända (där lyftet och golvet faktiskt verkar).
Minidrops (minilyftets start, utanför dropens lyft): puls per slag 0,3-3,5 s efter mot -3..-0,3 s före, medelljus efter/före.

  python tools/efterDrop.py --tag NAMN [--env K=V ...] [--wav pop,megamix,lang1021,kvall] [--mot bas.json] [--ateranvand] [--dist kopia]
  -> EFTERDROP_DIR (standard %TEMP%/efterdrop) <tag>.json + spår <tag>-<wav>.f32; kvällen ~11 min/kandidat, mixarna ~1 min/st
"""
import argparse, json, os, subprocess, sys, time
import numpy as np
from scipy.signal import butter, sosfiltfilt

HERE = os.path.dirname(os.path.abspath(__file__)); ENGINE = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from ladan import SHOW_ENV
WAVS = {'pop': 'tools/pop_ladan.wav', 'megamix': 'tools/megamix_ladan.wav', 'lang1021': 'tools/ladan-2026-10-21/lang-20261021T203952.wav',
        'kvall': 'tools/ladan-2026-10-11/kvall-svep.wav'}   # kvall = 10-11-kvällens 23 lang skarvade (natt.py kvall_wav), 141 min riktig ladan
COLS = ["t", "sec", "l0", "l1", "l2", "l3", "md", "secCeil", "ceil", "eBass", "liftLeft", "miniLeft", "dropCount", "bpm", "kick", "drv", "bangLeft", "eSm", "preDrop"]
C = {k: i for i, k in enumerate(COLS)}
OUT = os.environ.get('EFTERDROP_DIR') or os.path.join(__import__('tempfile').gettempdir(), 'efterdrop')   # spåren är stora (kvällen 120 MB/kandidat): aldrig i repot


def onsets(wav):
    cache = os.path.join(OUT, 'ons-' + os.path.basename(wav) + '.npy')
    if os.path.exists(cache): return np.load(cache)
    sr = 48000
    raw = np.memmap(os.path.join(ENGINE, wav), dtype='<i2', mode='r', offset=44)
    sos = butter(2, [40, 150], btype='band', fs=sr, output='sos'); step = int(sr * 0.005); nb = len(raw) // step
    CH, PAD = 120 * sr, sr; pw = np.zeros(nb)   # i bitar à 120 s (+1 s kant) - kvällens 141 min ryms inte i minnet som float64
    for a0 in range(0, nb * step, CH):
        lo, hi = max(0, a0 - PAD), min(nb * step, a0 + CH + PAD)
        b = sosfiltfilt(sos, raw[lo:hi].astype(np.float64) / 32768.0)[a0 - lo: a0 - lo + min(CH, nb * step - a0)]
        n = len(b) // step; pw[a0 // step: a0 // step + n] = (b[: n * step] ** 2).reshape(n, step).mean(axis=1)
    avg = np.convolve(pw, np.ones(400) / 400, mode='same') + 1e-12
    rise = np.maximum(0, np.diff(pw, prepend=pw[0])) / avg
    W = 12; cand = [i for i in range(W, nb - W) if rise[i] > 0 and rise[i] == rise[i - W:i + W + 1].max()]
    thr = np.quantile([rise[i] for i in cand], 0.7)
    ons = np.array([i * 0.005 for i in cand if rise[i] >= thr])
    np.save(cache, ons); return ons


def trace(wav, tr, env, dist=None):
    r = subprocess.run(['node', '--max-old-space-size=4096', 'tools/efterDropTrace.mjs', wav, '--trace', tr] + (['--fx-dist', dist] if dist else []), cwd=ENGINE, env=env,
                       capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=3600)
    if r.returncode: raise SystemExit(r.stderr[-800:])


def mean(a): a = [x for x in a if x == x]; return float(np.mean(a)) if a else float('nan')
def medn(a): a = [x for x in a if x == x]; return float(np.median(a)) if a else float('nan')


def per_beat(t, y, t0, t1, bpm):
    bl = 60.0 / bpm; out = []; s = t0
    while s + bl <= t1 + 1e-9:
        m = (t >= s) & (t < s + bl)
        if m.sum() > 3: out.append(y[m].max() - y[m].min())
        s += bl
    return mean(out)


def analyse(T, ons):
    t = T[:, C['t']].astype(np.float64); L = T[:, C['l0']:C['l3'] + 1].astype(np.float64)
    rig = L.mean(axis=1); top = L.max(axis=1); spr = (L.max(axis=1) - L.min(axis=1)) * 255
    sec = T[:, C['sec']]; dc = T[:, C['dropCount']]; lift = T[:, C['liftLeft']]; mini = T[:, C['miniLeft']]
    bpm = T[:, C['bpm']]; ceil = T[:, C['ceil']]; secc = T[:, C['secCeil']]
    bpm_all = np.median(bpm[bpm > 0]) if (bpm > 0).any() else 120.0
    bang = T[:, C['bangLeft']]
    # SHOWENS DROP = motorns flank (stepDrop: dropBangUntil + dropLiftUntil sätts), inte analysatorns dropCount (den utan egen flank = minidrop)
    di = [i for i in range(1, len(t)) if bang[i] > bang[i - 1] + 300 and t[i] >= 15]
    dt_ = [t[i] for i in di]
    def win(a, b): return (t >= a) & (t < b)
    drops = []
    for k, i in enumerate(di):
        t0 = t[i]; nxt = dt_[k + 1] if k + 1 < len(dt_) else 1e9; prv = dt_[k - 1] if k else -1e9
        ok = bool(lift[np.searchsorted(t, t0 + 1.0)] > 0) if t0 + 1 < t[-1] else False
        r = {'t': round(float(t0), 2), 'sec': int(sec[i]), 'godkand': ok}
        # (d) dropsprånget
        pre = rig[win(t0 - 0.5, t0)]; post = rig[win(t0, t0 + 0.8)]
        r['sprang'] = float(post.max() - pre.mean()) if len(pre) and len(post) else float('nan')
        for nm, a, b in (('A', 0.8, 8.0), ('B', 8.0, 12.0)):
            a1, b1 = t0 + a, min(t0 + b, nxt - 0.3)
            m = win(a1, b1)
            if m.sum() < 100: continue
            bb = bpm[m]; bp = float(np.median(bb[bb > 0])) if (bb > 0).any() else bpm_all
            while bp > 180: bp /= 2
            while bp < 70: bp *= 2
            q = {'s': round(b1 - a1, 2),
                 'p9010': float(np.percentile(rig[m], 90) - np.percentile(rig[m], 10)),
                 'p9010top': float(np.percentile(top[m], 90) - np.percentile(top[m], 10)),
                 'slag': per_beat(t, rig, a1, b1, bp), 'slagTop': per_beat(t, top, a1, b1, bp),
                 'ljus': float(rig[m].mean()), 'ljusTop': float(top[m].mean()), 'spr': float(spr[m].mean()),
                 'secCeil': float(secc[m].mean()), 'secCeilMin': float(secc[m].min()), 'lyft': float((lift[m] > 0).mean())}
            # (c) taket: starka basanslag i fönstret
            oo = ons[(ons >= a1) & (ons < b1 - 0.15)]; hits = []; rel = []
            for o in oo:
                mm = win(o, o + 0.15)
                if mm.sum() < 3: continue
                hits.append(top[mm].max() >= 0.9 * 0.95); rel.append(top[mm].max() >= 0.9 * ceil[mm].max())
            q['tak90'] = float(np.mean(hits)) if hits else float('nan'); q['ansl'] = len(hits)   # mot 95 % (ägarens tak), fast
            q['tak90rel'] = float(np.mean(rel)) if rel else float('nan')                          # mot rutans tak (sektionstaket x 0,95)
            r[nm] = q
        # (b) före och senare refräng
        mp = win(max(t0 - 8, prv + 12), t0 - 1)
        r['fore'] = float(rig[mp].mean()) if mp.sum() > 100 else float('nan')
        mr = win(t0 + 12, min(t0 + 60, nxt - 1)) & (sec == 3) & (lift == 0) & (mini == 0)
        r['refrang'] = float(rig[mr].mean()) if mr.sum() > 400 else float('nan')
        drops.append(r)
    # minidrops: minilyftets start (hopp uppåt i miniLeft) utanför dropens lyft
    mi = [i for i in range(1, len(t)) if mini[i] > mini[i - 1] + 1000 and lift[i] == 0 and t[i] >= 15]
    minis = []
    for i in mi:
        t0 = t[i]; ma = win(t0 + 0.3, t0 + 3.5); mb = win(t0 - 3.0, t0 - 0.3)
        if ma.sum() < 100 or mb.sum() < 100 or (lift[ma] > 0).any(): continue
        bb = bpm[ma]; bp = float(np.median(bb[bb > 0])) if (bb > 0).any() else bpm_all
        while bp > 180: bp /= 2
        while bp < 70: bp *= 2
        minis.append({'t': round(float(t0), 2), 'slag': per_beat(t, rig, t0 + 0.3, t0 + 3.5, bp), 'slagFore': per_beat(t, rig, t0 - 3.0, t0 - 0.3, bp),
                      'ljus': float(rig[ma].mean()), 'ljusFore': float(rig[mb].mean())})
    g = [d for d in drops if d['godkand'] and 'A' in d]
    def agg(key, w='A', f=mean): return f([d[w][key] for d in g if w in d])
    al = [d for d in drops if 'A' in d]
    def aall(key, w='A'): return mean([d[w][key] for d in al if w in d])
    s = {'drops': len(drops), 'godkanda': len(g),
         'alla_ljus': aall('ljus'), 'alla_slag': aall('slag'), 'alla_slagTop': aall('slagTop'), 'alla_p9010': aall('p9010'), 'alla_tak90': aall('tak90'), 'alla_spr': aall('spr'),
         'alla_B_ljus': aall('ljus', 'B'), 'alla_B_slag': aall('slag', 'B'),
         'alla_mot_refrang': medn([d['A']['ljus'] / d['refrang'] for d in al if d['refrang'] == d['refrang'] and d['refrang'] > 0]),
         'A_p9010': agg('p9010'), 'A_p9010top': agg('p9010top'), 'A_slag': agg('slag'), 'A_slagTop': agg('slagTop'),
         'A_ljus': agg('ljus'), 'A_ljusTop': agg('ljusTop'), 'A_tak90': agg('tak90'), 'A_spr': agg('spr'), 'A_secCeil': agg('secCeil'), 'A_secCeilMin': agg('secCeilMin', f=lambda a: float(np.min(a)) if a else float('nan')),
         'B_p9010': agg('p9010', 'B'), 'B_slag': agg('slag', 'B'), 'B_ljus': agg('ljus', 'B'), 'B_tak90': agg('tak90', 'B'),
         'A_mot_refrang': medn([d['A']['ljus'] / d['refrang'] for d in g if d['refrang'] == d['refrang'] and d['refrang'] > 0]),
         'A_mot_fore': medn([d['A']['ljus'] / d['fore'] for d in g if d['fore'] == d['fore'] and d['fore'] > 0]),
         'nRefrang': sum(1 for d in g if d['refrang'] == d['refrang']),
         'sprangLugn': mean([d['sprang'] for d in drops if d['sec'] in (0, 1, 4)]), 'sprangHog': mean([d['sprang'] for d in drops if d['sec'] not in (0, 1, 4)]),
         'nLugn': sum(1 for d in drops if d['sec'] in (0, 1, 4)),
         'minis': len(minis), 'mini_slag': mean([m['slag'] for m in minis]), 'mini_slagFore': mean([m['slagFore'] for m in minis]),
         'mini_ljus': mean([m['ljus'] for m in minis]), 'mini_ljusFore': mean([m['ljusFore'] for m in minis]),
         'ljusHela': float(rig[t >= 15].mean()), 'sprHela': float(spr[t >= 15].mean())}
    return s, drops, minis


KEYS = [('drops', 0), ('alla_ljus', 3), ('alla_mot_refrang', 2), ('alla_slag', 3), ('alla_p9010', 3), ('alla_tak90', 2), ('alla_spr', 1), ('alla_B_ljus', 3), ('godkanda', 0), ('A_p9010', 3), ('A_p9010top', 3), ('A_slag', 3), ('A_slagTop', 3), ('A_ljus', 3), ('A_mot_refrang', 2), ('A_mot_fore', 2), ('A_tak90', 2),
        ('A_spr', 1), ('A_secCeilMin', 2), ('B_p9010', 3), ('B_slag', 3), ('B_ljus', 3), ('sprangLugn', 3), ('sprangHog', 3), ('minis', 0), ('mini_slag', 3), ('mini_ljus', 3), ('mini_ljusFore', 3), ('ljusHela', 3), ('sprHela', 1)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tag', required=True); ap.add_argument('--env', action='append', default=[])
    ap.add_argument('--wav', default='pop,megamix,lang1021'); ap.add_argument('--mot', default=None); ap.add_argument('--ateranvand', action='store_true')
    ap.add_argument('--dist', default=None)   # patchad kopia av dist/ (prov på en kodändring utan att röra src/): effektmotorn laddas därifrån
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    env = dict(os.environ)
    for k, v, _w in SHOW_ENV: env[k] = v
    for e in a.env: k, _, v = e.partition('='); env[k] = v
    env['DMX_QUIET'] = '1'
    res = {'tag': a.tag, 'env': a.env, 'wav': {}}; t00 = time.time()
    for nm in a.wav.split(','):
        wav = WAVS[nm]; tr = os.path.join(OUT, f'{a.tag}-{nm}.f32')
        if not (a.ateranvand and os.path.exists(tr)): trace(wav, tr, env, a.dist)
        T = np.fromfile(tr, dtype=np.float32).reshape(-1, len(COLS))
        s, drops, minis = analyse(T, onsets(wav))
        res['wav'][nm] = {'sum': s, 'drops': drops, 'minis': minis}
    res['tidS'] = round(time.time() - t00)
    json.dump(res, open(os.path.join(OUT, a.tag + '.json'), 'w', encoding='utf-8'), indent=1)
    base = json.load(open(a.mot, encoding='utf-8')) if a.mot else None
    print(f"{a.tag}  {' '.join(a.env) or '(dagens)'}  {res['tidS']} s")
    for nm, w in res['wav'].items():
        s = w['sum']; b = base['wav'][nm]['sum'] if base and nm in base['wav'] else None
        cells = []
        for k, dgt in KEYS:
            v = s.get(k); cell = f'{k} {v:.{dgt}f}' if isinstance(v, float) else f'{k} {v}'
            if b and isinstance(v, float) and isinstance(b.get(k), float) and dgt: cell += f' ({v - b[k]:+.{dgt}f})'
            cells.append(cell)
        print(f'  {nm:8s} ' + '  '.join(cells))


if __name__ == '__main__':
    main()
