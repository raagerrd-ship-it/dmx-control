"""Slår ladans ingång i ett analogt tak? Om ljudet klipps före digitaliseringen når topparna samma nivå sekund efter sekund.
Per fil: högsta toppen, andel sekunder vars topp ligger inom 5 % av den (ren musik: några få %; tak: en stor del), toppfaktor
(topp/RMS i dB: ren musik 12-18, hårt överstyrt < 10), positiva och negativa taket var för sig.
python tools/natt/bygg-facit/tak.py <wav> ...   (lotus-venv:ens python, från engine/)"""
import sys, os
import numpy as np, soundfile as sf
print('%-34s %6s %6s  %s  %s  %s' % ('fil', 'topp+', 'topp-', 'sek vid taket', 'toppfaktor dB (median/sek)', 'RMS'))
for p in sys.argv[1:]:
    info = sf.info(p); sr = info.samplerate; ch = info.channels
    raw = np.fromfile(p, dtype='<i2', offset=44)                      # tål huvuden utan längd (megamix/pop)
    y = raw[::ch].astype(np.float32) / 32768.0 if ch > 1 else raw.astype(np.float32) / 32768.0
    n = len(y) // sr; Y = y[:n * sr].reshape(n, sr)
    mx = Y.max(axis=1); mn = -Y.min(axis=1); rms = np.sqrt((Y ** 2).mean(axis=1)) + 1e-9
    akt = rms > 0.25 * np.median(rms)                                   # sekunder med musik
    pp, pn = float(np.percentile(mx[akt], 99.5)), float(np.percentile(mn[akt], 99.5))
    vid = 100 * np.mean((mx[akt] >= 0.95 * pp) | (mn[akt] >= 0.95 * pn))
    crest = 20 * np.log10(np.maximum(mx, mn)[akt] / rms[akt])
    print('%-34s %6.3f %6.3f  %10.0f %%  %12.1f               %.3f' % (os.path.basename(p)[:34], pp, pn, vid, float(np.median(crest)), float(np.median(rms[akt]))))
