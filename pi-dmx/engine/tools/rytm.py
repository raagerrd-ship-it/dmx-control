"""RYTM (dagkörningen 2026-11-07, ägaren: 'takten som syns i lamporna, kan man få den att följa själva basrytmen bättre (energilagret)').
Följer riggens ljus BASRYTMEN? Samma kedja som ljusLag.py (konsertReplay --step 5 --delad-cfg --trace: varje renderruta 200 Hz, lampornas
ljus efter kalibreringen) mot wav:en. Ett replay ger både rytmmåtten och ljusLag-måtten (korskorr/t90, ordagrant ljusLag:s räkning).
  ljud: basens effekt per 5 ms i två band - bas 40-150 Hz (som ljusLag) och kickband 60-120 Hz (nollfas butter 2:a ordn.), i dB; + subband 20-60 Hz (rS)
  ljus: riggens summa (4 lampor) och ljusaste lampan, linjärt (DMX/255 efter kalibreringen)
MÅTT
  (a) rA / rAbest  takt-skalans korrelation: båda bandpassade 0,7-6 Hz (nollfas), pearson r vid 0 ms och bästa r över lag 0..150 ms
                   (ljuset efter ljudet) + den lagen. rK = samma mot kickbandet, rS mot subbandet 20-60 Hz (kontroll att måttet inte gynnar kickbandet). rTop = ljusaste lampan mot basen.
  (b) djup / synl  per STARKT basanslag (ljusLag:s anslag: 30 % starkaste lokala topparna i basens stigning): ljusets topp 0..150 ms efter
                   minus dalen 150 ms före, relativt det lokala ljuset (medel +-1 s). djup = median, synl = andel anslag med djup >= 10 %.
  (c) gapR / gapK  'pumpar i luckorna': (c1) gapR = r ljus mot bas (bandpassade, vid bästa lag) BARA utanför anslagsfönstren (-50..+200 ms
                   kring varje basanslag över medianen) - rör sig ljuset med basen även mellan slagen; (c2) gapK = ljusets rörelse (|d ljus|
                   bandpassat) utanför fönstren / inuti fönstren per sample - lägre = ljuset rör sig PÅ slagen, inte mellan.
  (d) KONTRAST (runda 2): slagK = (topp 0..150 ms efter - dal 150 ms före) / topp per starkt anslag (median; slagKtop = ljusaste lampan),
                   slagMod = taktbandets ljusrörelse / medelljus, mörkt (riggens medel < 0,02) delat i slocknat1s (mörka stunder >= 1 s, släckt
                   rigg = dåligt) och mörktKort (< 1 s, mörkt mellan slagen = bra), lampspr = medel (ljusaste - mörkaste lampan) ur tracen.
  per sektion (konsertReplay:s sektion i tracen): rAbest och djup/synl per sektionstyp (intro/low/build/high/break).
  python tools/rytm.py <wav> [--s 300] [--env K=V ...] [--json ut.json] [--trace-in fil.f32 | --trace-ut fil.f32]
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt

args = sys.argv[1:]
wav = next(a for a in args if a.endswith('.wav'))
opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
S = float(opt('--s', 300))
env = dict(os.environ)
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
from ladan import SHOW_ENV   # som natt.py: ladans env + DMX_QUIET, sedan --env ovanpå
for k, v, _ in SHOW_ENV: env[k] = v
env['DMX_QUIET'] = '1'
for i, a in enumerate(args):
    if a == '--env': k, v = args[i + 1].split('=', 1); env[k] = v
sr = 48000
x = np.fromfile(wav, dtype='<i2', offset=44).astype(np.float64) / 32768.0
x = x[: int(S * sr)]
tin = opt('--trace-in')
if tin:
    tr = tin
else:
    fd, tr = tempfile.mkstemp(suffix='.f32'); os.close(fd)
    fd, js = tempfile.mkstemp(suffix='.json'); os.close(fd)
    clip = wav
    if len(x) < os.path.getsize(wav) // 2 - 100:
        fd, clip = tempfile.mkstemp(suffix='.wav'); os.close(fd)
        wavfile.write(clip, sr, (x * 32767).astype(np.int16))
    subprocess.run(['node', os.path.join(here, 'konsertReplay.mjs'), clip, '--step', '5', '--delad-cfg', '--json', js, '--trace', tr], env=env, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(js)
    if clip != wav: os.remove(clip)
T = np.fromfile(tr, dtype=np.float32).reshape(-1, 10)
if opt('--trace-ut'):
    import shutil; shutil.copy(tr, opt('--trace-ut'))
if not tin: os.remove(tr)
t = T[:, 0].astype(np.float64); lamps = T[:, 2:6].astype(np.float64); Lsum = lamps.sum(axis=1); Ltop = lamps.max(axis=1); secT = T[:, 1]
step = int(sr * 0.005)
def band_pw(lo, hi):
    b = sosfiltfilt(butter(2, [lo, hi], btype='band', fs=sr, output='sos'), x)
    nb = len(b) // step
    return (b[: nb * step] ** 2).reshape(nb, step).mean(axis=1)
pw = band_pw(40, 150); nb = len(pw)
pwK = band_pw(60, 120)[:nb]
pwS = band_pw(20, 60)[:nb]
# ljuset på 5 ms-rastret (som ljusLag: rutan vid t -> fack round(t/5 ms))
k = np.round(t / 0.005).astype(int); ok = k < nb; k = k[ok]
lig = np.zeros(nb); lig[k] = Lsum[: len(ok)][ok]
top = np.zeros(nb); top[k] = Ltop[: len(ok)][ok]
sec = np.full(nb, 5.0); sec[k] = secT[: len(ok)][ok]
# luckor (render varje 5 ms, men kick-bypass kan ge extra rutor; fack utan ruta = föregående)
seen = np.zeros(nb, bool); seen[k] = True
for arr in (lig, top, sec):
    last = arr[0]
    for i in range(nb):
        if seen[i]: last = arr[i]
        else: arr[i] = last
start = int(15 / 0.005)

# ---- ljusLag (ordagrant tools/ljusLag.py) ----
avg = np.convolve(pw, np.ones(400) / 400, mode='same') + 1e-12
rise = np.maximum(0, np.diff(pw, prepend=pw[0])) / avg
ligLL = np.zeros(nb); ligLL[k] = Lsum[: len(ok)][ok]   # ljusLag fyller inte luckor
lup = np.maximum(0, np.diff(ligLL, prepend=ligLL[0]))
def xc(a, c, lo=-10, hi=40):
    best, bl = -1, 0
    for l in range(lo, hi + 1):
        v = np.dot(a[start:nb - hi], c[start + l:nb - hi + l])
        if v > best: best, bl = v, l
    return bl * 5
lag = xc(rise, lup)
W = 12; cand = [i for i in range(start, nb - 40) if rise[i] > 0 and rise[i] == rise[i - W:i + W + 1].max()]
thr = np.quantile([rise[i] for i in cand], 0.7); ons = [i for i in cand if rise[i] >= thr]
A = np.array([ligLL[i - 20:i + 31] for i in ons if i >= 20])
mc = A.mean(axis=0); mc = mc - mc[0]; tt = np.arange(-20, 31) * 5
pk = int(np.argmax(mc)); t90 = int(np.argmax(mc >= 0.9 * mc[pk]))
LL = {'korskorr': lag, 't90': int(tt[t90]), 'topp': int(tt[pk]), 'lyft': round(float(mc[pk]), 4)}

# ---- (a) takt-skalans korrelation ----
fs = 200.0
bp = butter(2, [0.7, 6.0], btype='band', fs=fs, output='sos')
db = lambda p: 10 * np.log10(p + 1e-10)
aB = sosfiltfilt(bp, db(pw)); aK = sosfiltfilt(bp, db(pwK)); aS = sosfiltfilt(bp, db(pwS)); lS = sosfiltfilt(bp, lig); lT = sosfiltfilt(bp, top)
end = nb - 40
def pr(a, b, m=None):
    if m is not None: a, b = a[m], b[m]
    a = a - a.mean(); b = b - b.mean(); d = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / d) if d > 0 else float('nan')
def rbest(a, l, m=None):   # bästa r med ljuset 0..150 ms efter ljudet
    best, bl = -2, 0
    for g in range(0, 31):
        mm = None if m is None else m[start:end]
        v = pr(a[start:end], l[start + g:end + g], mm)
        if v > best: best, bl = v, g
    return best, bl * 5
r0 = pr(aB[start:end], lS[start:end]); rb, rbl = rbest(aB, lS); rk, rkl = rbest(aK, lS); rs_, rsl = rbest(aS, lS); rt, rtl = rbest(aB, lT)

# ---- (b) ljusets uppgång per starkt anslag ----
def depth(i):
    lo = lig[i - 30:i].min(); hi = lig[i:i + 31].max(); loc = lig[max(0, i - 200):i + 200].mean()
    return (hi - lo) / max(loc, 0.02)
D = np.array([depth(i) for i in ons if i >= 200 and i + 200 < nb]); onsD = [i for i in ons if i >= 200 and i + 200 < nb]

# ---- (c) pumpar i luckorna ----
thrAll = np.quantile([rise[i] for i in cand], 0.5); onsAll = [i for i in cand if rise[i] >= thrAll]
inwin = np.zeros(nb, bool)
for i in onsAll: inwin[max(0, i - 10):i + 41] = True
gap = ~inwin
g = rbl // 5
gapR = pr(aB[start:end], lS[start + g:end + g], gap[start + g:end + g])
dl = np.abs(np.diff(lS, prepend=lS[0]))
gapK = float(dl[start:end][gap[start:end]].mean() / max(1e-12, dl[start:end][inwin[start:end]].mean()))

# ---- (d) KONTRAST PÅ BASRYTMEN (runda 2, ägaren 11-07: 'målet är inte mer ljus överlag ... basgången skall kännas i ögonen') ----
# slagK: per starkt anslag (topp 0..150 ms efter - dal 150 ms före) / toppen; 1 = mörkt mellan slagen, 0 = platt. slagKtop = samma för ljusaste lampan.
# slagMod: ljusets rörelse i taktbandet (std av bandpassat 0,7-6 Hz) / medelljuset. mörkt = riggens medel < 0,02 (showTight:s DARK);
# slocknat1s = andel tid i mörka stunder >= 1 s (släckt rigg = dåligt), mörktKort = andel tid i mörka stunder < 1 s (mörkt mellan slagen = bra).
def kontr(a, i):
    hi = a[i:i + 31].max(); lo = a[i - 30:i].min(); return (hi - lo) / max(hi, 0.02)
SK = np.array([kontr(lig, i) for i in onsD]); SKt = np.array([kontr(top, i) for i in onsD])
slagMod = float(lS[start:end].std() / max(1e-6, lig[start:end].mean()))
dark = (lig / 4) < 0.02
runLong = np.zeros(nb, bool); i0 = None
for i in range(start, end + 1):
    d = dark[i] if i < end else False
    if d and i0 is None: i0 = i
    elif not d and i0 is not None:
        if i - i0 >= 200: runLong[i0:i] = True
        i0 = None
slock = float(runLong[start:end].mean()); morkK = float((dark[start:end] & ~runLong[start:end]).mean())

# ---- per sektion ----
SEC = {0: 'intro', 1: 'low', 2: 'build', 3: 'high', 4: 'break'}
per = {}
for s, nm in SEC.items():
    m = sec == s
    if m[start:end].sum() < 2000: continue   # minst 10 s
    rs, _ = rbest(aB, lS, m)
    ds = np.array([depth(i) for i in onsD if sec[i] == s])
    per[nm] = {'s': round(float(m[start:end].sum()) * 0.005), 'rAbest': round(rs, 3), 'djup': round(float(np.median(ds)), 3) if len(ds) else None,
               'synl': round(float(np.mean(ds >= 0.10)), 3) if len(ds) else None, 'n': int(len(ds)),
               'ljus': round(float(lig[start:end][m[start:end]].mean() / 4), 3), 'slocknat1s': round(float(runLong[start:end][m[start:end]].mean()), 4),
               'slagK': round(float(np.median([kontr(lig, i) for i in onsD if sec[i] == s])), 3) if len(ds) else None}

res = {'wav': os.path.basename(wav), 's': round(len(x) / sr), 'env': [a for i, a in enumerate(args) if i > 0 and args[i - 1] == '--env'],
       'rA0': round(r0, 3), 'rAbest': round(rb, 3), 'rAlag': rbl, 'rK': round(rk, 3), 'rKlag': rkl, 'rS': round(rs_, 3), 'rSlag': rsl, 'rTop': round(rt, 3),
       'djup': round(float(np.median(D)), 3), 'djupP25': round(float(np.percentile(D, 25)), 3), 'synl': round(float(np.mean(D >= 0.10)), 3), 'nAnslag': int(len(D)),
       'gapR': round(gapR, 3), 'gapK': round(gapK, 3), 'ljus': round(float(lig[start:end].mean() / 4), 3),
       'slagK': round(float(np.median(SK)), 3), 'slagKtop': round(float(np.median(SKt)), 3), 'slagMod': round(slagMod, 3),
       'mork': round(float(dark[start:end].mean()), 4), 'slocknat1s': round(slock, 4), 'morktKort': round(morkK, 4),
       'lampspr': round(float((lamps.max(axis=1) - lamps.min(axis=1))[3000:].mean()), 4),
       'ljusLag': LL, 'sektion': per}
print(f"{res['wav']} {res['s']} s  rA {r0:.3f} best {rb:.3f}@{rbl} ms  rK {rk:.3f}@{rkl}  rS {rs_:.3f}@{rsl}  rTop {rt:.3f}  djup {res['djup']:.3f} (p25 {res['djupP25']:.3f}) synl {100*res['synl']:.0f} % av {len(D)}"
      f"  gapR {gapR:.3f} gapK {gapK:.3f}  ljus {res['ljus']:.3f}  ljusLag korskorr {lag} t90 {LL['t90']} lyft {LL['lyft']}\n"
      f"  KONTRAST slagK {res['slagK']:.3f} (top {res['slagKtop']:.3f}) slagMod {slagMod:.3f}  mörkt {100*res['mork']:.1f} % = slocknat>=1s {100*slock:.1f} % + kort {100*morkK:.1f} %  lampspr {res['lampspr']:.3f}")
for nm, v in per.items(): print(f"  {nm:6s} {v['s']:4d} s  rAbest {v['rAbest']:.3f}  djup {v['djup']}  synl {v['synl']} (n {v['n']})  slagK {v['slagK']}  ljus {v['ljus']}  slocknat {v['slocknat1s']}")
if opt('--json'): json.dump(res, open(opt('--json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
