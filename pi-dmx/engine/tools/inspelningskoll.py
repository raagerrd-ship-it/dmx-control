"""INSPELNINGSKOLL (2026-11-13, ägaren: "vi måste ju få till grund-låtarna som motorn trimmas mot, är dom skit så förstår jag att
agenterna inte lyckas"). Betygsätter varje inspelning INNAN den får bli övnings- eller kontrollmaterial.
  python tools/inspelningskoll.py <wav eller mapp> ...        (python med numpy; från engine/)
Per fil:
  topp        högsta nivån (0..1)
  klippt %    andel sekunder med musik där toppen står i digitalt tak (>= 0,999) - ska vara 0
  platå       längsta raden sampel i rad vid taket - ska vara < 4
  toppfaktor  topp/RMS i dB, median per sekund - ren musik 10-18; under 6 = sönderklippt
  brusgolv    tystaste halvsekunden i dBFS - en ren linjeingång ligger under -70
  ljushet     spektraltäthet 6-12 kHz mot 0,8-1,6 kHz i de starkaste sekunderna, dB - musik ligger normalt under -12; över -8 = misstänkt
  DOM         TRASIG (klippt) / MISSTÄNKT (ovanligt ljus eller hög brusnivå) / OK"""
import sys, os, glob
import numpy as np

def las(p):
    b = open(p, 'rb').read(); ch = int.from_bytes(b[22:24], 'little'); sr = int.from_bytes(b[24:28], 'little'); bits = int.from_bytes(b[34:36], 'little')
    if bits != 16: raise ValueError('bara 16 bitar (%d)' % bits)
    o = 12; start = 44
    while o + 8 <= len(b):
        cid = b[o:o + 4]; ln = int.from_bytes(b[o + 4:o + 8], 'little')
        if cid == b'data': start = o + 8; break
        o += 8 + ln + (ln & 1)
    y = np.frombuffer(b, dtype='<i2', offset=start, count=(len(b) - start) // 2)
    return (y[::ch] if ch > 1 else y).astype(np.float32) / 32768.0, sr

def koll(p):
    y, sr = las(p); n = len(y) // sr
    if n < 3: return None
    Y = y[:n * sr].reshape(n, sr); mx = np.abs(Y).max(axis=1); rms = np.sqrt((Y ** 2).mean(axis=1)) + 1e-9; akt = rms > 0.25 * np.median(rms)
    klippt = 100 * float(np.mean(mx[akt] >= 0.999)); vid = np.abs(y) >= 0.999
    r = np.flatnonzero(np.diff(np.concatenate(([0], vid.view(np.int8), [0])))); plat = int((r[1::2] - r[::2]).max()) if len(r) else 0
    crest = float(np.median(20 * np.log10(mx[akt] / rms[akt])))
    h = sr // 2; m = len(y) // h; H = y[:m * h].reshape(m, h); H = H - H.mean(axis=1, keepdims=True); golv = float(20 * np.log10(np.sqrt((H ** 2).mean(axis=1)).min() + 1e-9))
    stark = np.argsort(rms)[-max(3, n // 20):]; seg = np.concatenate([Y[i] for i in sorted(stark)])
    N = 1 << 13; w = np.hanning(N); P = np.zeros(N // 2 + 1)
    for i in range(0, len(seg) - N, N // 2): P += np.abs(np.fft.rfft(seg[i:i + N] * w)) ** 2
    fr = np.fft.rfftfreq(N, 1 / sr); d = lambda a, b_: 10 * np.log10(P[(fr >= a) & (fr < b_)].mean() + 1e-18)
    ljus = float(d(6000, min(12000, sr / 2 - 1)) - d(800, 1600)) if sr >= 16000 else float('nan')
    dom = 'TRASIG' if klippt > 1 or plat >= 8 or crest < 6 else ('MISSTÄNKT' if ljus > -8 or (golv > -60 and float(rms.min()) < 0.05 * float(np.median(rms))) or klippt > 0 else 'OK')   # brusgolvet döms bara om filen HAR en tyst stund (11-13: musik utan paus gav -41 = falskt larm)
    return dict(fil=p, s=n, topp=float(mx.max()), klippt=klippt, plat=plat, crest=crest, golv=golv, ljus=ljus, dom=dom)

if __name__ == '__main__':
    filer = []
    for a in sys.argv[1:]: filer += sorted(glob.glob(os.path.join(a, '*.wav'))) if os.path.isdir(a) else [a]
    print('%-44s %5s %5s %8s %6s %10s %8s %7s  %s' % ('fil', 's', 'topp', 'klippt %', 'platå', 'toppfaktor', 'brusgolv', 'ljushet', 'DOM'))
    rader = []
    for f in filer:
        try: r = koll(f)
        except Exception as e: print('%-44s FEL %s' % (os.path.basename(f)[:44], e)); continue
        if not r: continue
        rader.append(r); print('%-44s %5d %5.2f %8.1f %6d %10.1f %8.1f %7.1f  %s' % (os.path.basename(f)[:44], r['s'], r['topp'], r['klippt'], r['plat'], r['crest'], r['golv'], r['ljus'], r['dom']))
    if len(rader) > 1:
        from collections import Counter
        print('SUMMA %d filer, %.0f min: %s' % (len(rader), sum(r['s'] for r in rader) / 60, dict(Counter(r['dom'] for r in rader))))
