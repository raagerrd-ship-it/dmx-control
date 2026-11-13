"""Brusgolvet i ladans inspelningar: leta upp de tystaste halvsekunderna i varje fil (pauser mellan låtar) och mät dem.
En ren linjeingång ligger under -70 dBFS i tystnad. Mikrofonförstärkarbrus: högre, ljust spektrum; sprak: spikigt (kurtosis >> 3).
python tools/natt/bygg-facit/tystnad.py <wav> ...   (lotus-venv:ens python, från engine/)"""
import sys, os
import numpy as np, soundfile as sf
from scipy.stats import kurtosis
kant = [50, 200, 800, 1600, 3200, 6400, 12000, 16000, 20000, 24000]
print('%-30s %9s %8s %9s %9s  %s' % ('fil', 'tystast s', 'dBFS', 'spikighet', 'DC', 'spektrum dBFS/band: ' + ' '.join(('%dk' % (k // 1000)) if k >= 1000 else str(k) for k in kant[:-1])))
for p in sys.argv[1:]:
    info = sf.info(p); sr = info.samplerate; ch = info.channels
    raw = np.fromfile(p, dtype='<i2', offset=44); y = (raw[::ch] if ch > 1 else raw).astype(np.float32) / 32768.0
    w = sr // 2; n = len(y) // w; Y = y[:n * w].reshape(n, w); Yc = Y - Y.mean(axis=1, keepdims=True); rms = np.sqrt((Yc ** 2).mean(axis=1))
    i = int(np.argmin(rms[2:-2])) + 2; seg = Yc[i]
    P = np.abs(np.fft.rfft(seg * np.hanning(w))) ** 2 / (w * w / 4 * 0.375 * 2); fr = np.fft.rfftfreq(w, 1 / sr)
    band = [10 * np.log10(P[(fr >= lo) & (fr < hi)].sum() + 1e-15) for lo, hi in zip(kant, kant[1:])]
    print('%-30s %9.1f %8.1f %9.1f %9.4f  %s   (tysta halvsekunder < -55 dBFS: %d)' % (os.path.basename(p)[:30], i * 0.5, 20 * np.log10(rms[i] + 1e-9), float(kurtosis(seg, fisher=False)), float(Y[i].mean()),
          ' '.join('%4.0f' % b for b in band), int(np.sum(20 * np.log10(rms + 1e-9) < -55))))
