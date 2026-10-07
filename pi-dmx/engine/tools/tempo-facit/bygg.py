"""
TEMPOFACIT (natt-agenten 2026-10-07). Det fanns inget facit for "tempot okar" - frozen6-manifestets bpm_start/end
ar motorns las, inte latens tempo. Har syntetiseras det: ett frozen6-klipp med stabilt las (bpm_start ~ bpm_end),
de forsta T0 sekunderna orort, resten tidsstrackt med librosa (fas-vokoder, tonhojden kvar) med kand kvot.
Vaxlingspunkten ar exakt T0 och kvoten ar exakt. 30 ms korsfade vid skarven sa skarven sjalv inte blir en klick.

  <lotus-venv>/python tools/tempo-facit/bygg.py      (librosa + soundfile; finns i tempo-facit-pc/.venv)

Skriver tools/tempo-facit/*.wav (48 kHz mono 16-bit) + manifest.tsv (fil, t_s, fran->till, kvot, kalla).
"""
import csv, os, numpy as np, soundfile as sf, librosa
HERE = os.path.dirname(os.path.abspath(__file__))
F6 = os.path.join(os.path.dirname(HERE), 'frozen6')
SR, T0, LEN = 48000, 20.0, 40.0
KVOTER = [1.08, 1.12, 1.15]
rows = list(csv.DictReader(open(os.path.join(F6, 'manifest.tsv'), encoding='utf-8'), delimiter='\t'))
stab = [r for r in rows if r['bpm_start'] and r['bpm_end'] and float(r['bpm_start']) > 0
        and abs(float(r['bpm_end']) / float(r['bpm_start']) - 1) < 0.02 and 85 <= float(r['bpm_start']) <= 135]
seen = set(); stab = [r for r in stab if not (r['title'] in seen or seen.add(r['title']))]   # en per lat
stab = stab[::max(1, len(stab) // 12)][:12]
out = []
for i, r in enumerate(stab):
    y, sr = sf.read(os.path.join(F6, r['file']), dtype='float32')
    assert sr == SR
    k = KVOTER[i % len(KVOTER)]
    a = y[:int(T0 * SR)]
    rest = y[int(T0 * SR) - int(0.03 * SR):]
    b = librosa.effects.time_stretch(rest, rate=k)
    n = int(0.03 * SR); w = np.linspace(0, 1, n, dtype=np.float32)
    a[-n:] = a[-n:] * (1 - w) + b[:n] * w
    z = np.concatenate([a, b[n:]])[:int(LEN * SR)]
    z = np.clip(z, -1, 1)
    bpm = float(r['bpm_start'])
    fn = f"ts{i+1:02d}_{int(round((k-1)*100))}p_{r['file']}"
    sf.write(os.path.join(HERE, fn), z, SR, subtype='PCM_16')
    out.append([fn, f'{T0:.2f}', f'{bpm:.0f}->{bpm*k:.0f}', f'{k:.2f}', f"syntes: {r['artist']} - {r['title']} (frozen6 {r['n']}), librosa time_stretch"])
    print(fn, bpm, k)
with open(os.path.join(HERE, 'manifest.tsv'), 'w', encoding='utf-8', newline='') as f:
    wr = csv.writer(f, delimiter='\t'); wr.writerow(['fil', 't_s', 'fran->till', 'kvot', 'kalla']); wr.writerows(out)
