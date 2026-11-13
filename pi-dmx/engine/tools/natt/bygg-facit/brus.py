"""Vad finns i de TYSTASTE partierna? Brus och sprak kan inte gömma sig där. Per fil: nivån i de tystaste sekunderna (dBFS), deras spektrum
(täthet mot 800-1600 Hz i samma sekunder), och hur spikigt ljudet över 4 kHz är (kurtosis: jämnt brus ~3, sprak/klick >> 3).
Jämför med samma mått på de starkaste sekunderna.   python tools/natt/bygg-facit/brus.py <wav> ..."""
import sys, os
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
from scipy.stats import kurtosis
kant = [100, 400, 800, 1600, 3200, 6400, 9000, 12000, 16000, 20000, 24000]
def spek(y, sr):
    n = 1 << 13; w = np.hanning(n); P = np.zeros(n // 2 + 1); c = 0
    for i in range(0, len(y) - n, n // 2): P += np.abs(np.fft.rfft(y[i:i + n] * w)) ** 2; c += 1
    fr = np.fft.rfftfreq(n, 1 / sr); P /= max(1, c)
    return [10 * np.log10(P[(fr >= lo) & (fr < hi)].mean() + 1e-18) for lo, hi in zip(kant, kant[1:])]
for p in sys.argv[1:]:
    info = sf.info(p); sr = info.samplerate; ch = info.channels
    raw = np.fromfile(p, dtype='<i2', offset=44); y = (raw[::ch] if ch > 1 else raw).astype(np.float32) / 32768.0
    n = len(y) // sr; Y = y[:n * sr].reshape(n, sr); rms = np.sqrt((Y ** 2).mean(axis=1)) + 1e-9
    ordn = np.argsort(rms); tyst = ordn[:max(3, n // 20)]; stark = ordn[-max(3, n // 20):]
    hp = butter(4, 4000, 'hp', fs=sr, output='sos')
    def rad(idx):
        seg = np.concatenate([Y[i] for i in sorted(idx)]); s = spek(seg, sr); ref = s[2]
        return 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9), ' '.join('%4.0f' % (x - ref) for x in s), float(kurtosis(sosfilt(hp, seg), fisher=False)), 20 * np.log10(np.sqrt((sosfilt(hp, seg) ** 2).mean()) + 1e-9)
    print(os.path.basename(p)[:36])
    print('   band (Hz):                        ' + ' '.join('%4s' % (('%dk' % (k // 1000)) if k >= 1000 else k) for k in kant[:-1]))
    for namn, idx in (('tystaste 5 %', tyst), ('starkaste 5 %', stark)):
        lv, sp, ku, hf = rad(idx)
        print('   %-13s %6.1f dBFS  spektrum %s   över 4 kHz: %6.1f dBFS, spikighet %.1f' % (namn, lv, sp, hf, ku))
