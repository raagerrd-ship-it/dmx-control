"""Är mp3-klippen trogna originalet? Avkoda klippet, lägg det i fas med originalsegmentet (korskorrelation) och mät felet.
SNR > 30 dB = hörbart identiskt; < 15 dB = något är trasigt i kodningen.   python tools/natt/bygg-facit/mp3koll.py k001 k005
(lotus-venv:ens python, från engine/)"""
import json, os, sys
import numpy as np, soundfile as sf
K = json.load(open('tools/natt/bygg-facit/kandidater-20261113.json', encoding='utf-8')); FORE, EFTER = K['fore'], K['efter']
for kid in sys.argv[1:]:
    k = next(x for x in K['klipp'] if x['id'] == kid); sr = sf.info(k['wav']).samplerate
    y, _ = sf.read(k['wav'], start=int((k['t'] - FORE) * sr), frames=int((FORE + EFTER) * sr), dtype='float32', always_2d=True); y = y.mean(axis=1)
    for mapp in ('ljud2', 'ljud'):
        p = os.path.join('.arena', 'bygg2', 'sida', mapp, kid + '.mp3')
        if not os.path.exists(p): continue
        m, sm = sf.read(p, dtype='float32')
        if sm != sr: print(kid, mapp, 'annan takt', sm); continue
        a = y[sr * 5: sr * 9]; b = m[sr * 5 - 4000: sr * 9 + 4000]                       # 4 s mitt i klippet
        c = np.fft.irfft(np.fft.rfft(b, 1 << 19) * np.conj(np.fft.rfft(a, 1 << 19))); lag = int(np.argmax(c[:8000]))
        bb = b[lag: lag + len(a)]; g = float(np.dot(a, bb) / (np.dot(bb, bb) + 1e-12)); err = a - g * bb
        snr = 10 * np.log10(np.sum(a ** 2) / (np.sum(err ** 2) + 1e-12))
        print('%s %-5s %d Hz  topp original %.2f, mp3 %.2f (över 0,999: %d sampel)  förstärkning %.2f  fördröjning %d sampel  SNR %.1f dB' % (kid, mapp, sm, np.max(np.abs(y)), np.max(np.abs(m)), int(np.sum(np.abs(m) >= 0.999)), 1 / g, lag - 4000, snr))
