"""LJUSLAG (natt 10-21): hur långt efter LJUDETS basanslag kommer RIGGENS ljusuppgång? Det ärliga tajthetsmåttet.
showTight:s 'kick->ljus' mäter från frame.kick, som fyrar på kylningens kant (analysator-fynd 10-19) - inte från ljudet.
Här: konsertReplay --step 5 --delad-cfg --trace (varje renderruta, 200 Hz: lampornas ljus efter kalibreringen) mot wav:en.
  ljud: nollfas-filtrerad bas 40-150 Hz (butter 2:a ordn fram+bak), effekt per 5 ms, stigning i linjär effekt / 2 s-medel
  ljus: summan av lampornas positiva steg per ruta
Korskorrelation över -50..+200 ms; toppen = ljusets fördröjning efter ljudet. Vikning av ljuset på ljudets anslag (de 30 %
starkaste lokala topparna) ger dessutom medianen till ljusets största stigning inom 0..150 ms efter anslaget.
  python tools/ljusLag.py <wav> [--s 300] [--env K=V ...]
"""
import os, subprocess, sys, tempfile
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt

args = sys.argv[1:]
wav = next(a for a in args if a.endswith('.wav'))
S = float(args[args.index('--s') + 1]) if '--s' in args else 300.0
env = dict(os.environ)
for i, a in enumerate(args):
    if a == '--env': k, v = args[i + 1].split('=', 1); env[k] = v
here = os.path.dirname(os.path.abspath(__file__))
fd, tr = tempfile.mkstemp(suffix='.f32'); os.close(fd)
fd, js = tempfile.mkstemp(suffix='.json'); os.close(fd)
sr = 48000   # mono 16-bit 48 kHz som alla ladans inspelningar; huvudet hoppas över (pop/megamix är strömskrivna med datalängd 0)
x = np.fromfile(wav, dtype='<i2', offset=44).astype(np.float64) / 32768.0
x = x[: int(S * sr)]
# konsertReplay läser hela filen: skriv ett klipp om --s är kortare
clip = wav
if len(x) < os.path.getsize(wav) // 2 - 100:
    fd, clip = tempfile.mkstemp(suffix='.wav'); os.close(fd)
    wavfile.write(clip, sr, (x * 32767).astype(np.int16))
subprocess.run(['node', os.path.join(here, 'konsertReplay.mjs'), clip, '--step', '5', '--delad-cfg', '--json', js, '--trace', tr], env=env, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
T = np.fromfile(tr, dtype=np.float32).reshape(-1, 10)
t = T[:, 0].astype(np.float64); L = T[:, 2:6].astype(np.float64).sum(axis=1)
# ljud på 5 ms-rastret (renderrutornas tider)
sos = butter(2, [40, 150], btype='band', fs=sr, output='sos')
b = sosfiltfilt(sos, x)
step = int(sr * 0.005)
nb = len(b) // step
pw = (b[: nb * step] ** 2).reshape(nb, step).mean(axis=1)
avg = np.convolve(pw, np.ones(400) / 400, mode='same') + 1e-12
rise = np.maximum(0, np.diff(pw, prepend=pw[0])) / avg
# ljuset per 5 ms-fack (ta rutans tid -> fack); rutan vid t visar ljudet t.o.m. t, energin i facket [k, k+1) * 5 ms
k = np.round(t / 0.005).astype(int); k = k[k < nb]
lig = np.zeros(nb); lig[k] = L[: len(k)]
lup = np.maximum(0, np.diff(lig, prepend=lig[0]))
start = int(15 / 0.005)
def xc(a, c, lo=-10, hi=40):
    best, bl = -1, 0; out = []
    for l in range(lo, hi + 1):
        if l >= 0: v = np.dot(a[start:nb - hi], c[start + l:nb - hi + l])
        else: v = np.dot(a[start:nb - hi], c[start + l:nb - hi + l])
        out.append(v)
        if v > best: best, bl = v, l
    return bl * 5, out
lag, cc = xc(rise, lup)
# vikning: ljusets största steg 0..150 ms efter de starkaste anslagen
W = 12; cand = [i for i in range(start, nb - 40) if rise[i] > 0 and rise[i] == rise[i - W:i + W + 1].max()]
thr = np.quantile([rise[i] for i in cand], 0.7); ons = [i for i in cand if rise[i] >= thr]
d = [int(np.argmax(lup[i:i + 31])) * 5 for i in ons if lup[i:i + 31].max() > 0]
hit = np.mean([lup[i:i + 31].max() > 0.05 for i in ons])
print(f"{os.path.basename(wav)} {len(x)/sr:.0f} s  ljus efter ljud (korskorr) {lag} ms  vikning: median {np.median(d):.0f} ms (p25 {np.percentile(d,25):.0f}, p75 {np.percentile(d,75):.0f}), anslag med ljussteg > 5 %: {100*hit:.0f} % av {len(ons)}")
for p in (tr, js): os.remove(p)
if clip != wav: os.remove(clip)
if '--kurva' in args:
    m = max(cc); print('  kurva (ms:rel) ' + ' '.join(f"{(i - 10) * 5}:{v / m:.2f}" for i, v in enumerate(cc) if i % 2 == 0))
# MEDELLJUSET RUNT ANSLAGEN (-100..+150 ms): när når riggen sin topp räknat från ljudets basanslag? (ägaren 10-19: 'till där
# lampan nått sin målljusstyrka'). Medelkurvan minus dess värde vid -100 ms; toppens tid och tid till 90 % av toppen.
A = np.array([lig[i - 20:i + 31] for i in ons if i >= 20])
mc = A.mean(axis=0); mc = mc - mc[0]; tt = np.arange(-20, 31) * 5
pk = int(np.argmax(mc)); t90 = int(np.argmax(mc >= 0.9 * mc[pk]))
print(f"  medelljus runt anslagen: topp {tt[pk]} ms, 90 % vid {tt[t90]} ms, lyft {mc[pk]:.3f}")
