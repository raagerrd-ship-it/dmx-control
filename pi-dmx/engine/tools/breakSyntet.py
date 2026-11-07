"""BREAK UTAN KICK (dagkörningen 2026-11-07, agent-tillit): bygger en testwav av riktiga ladan-låtar där varje låt får ett break UTAN
trummor (--typ pad: samma musiks spektrum utsmort 0,7 s med slumpfas, -6 dB = en matta utan transienter; --typ hp: högpass vid --hp Hz,
men då hittar kickdetektorn slag ändå), mjuk övergång 50 ms in, hårt tillbaka = dropen - det ladans
ws-logg 11-06 visade (dc 2->3: analysatorns bpm 0 i 14,6 s, klockan låste 4,2 s efter dropen). Mixarna och kvällen har nästan inga
sådana break (megamix: ingen kick-lucka > 0,61 s före någon drop), så tillitens återkomst efter ett tyst break mäts här.
  python tools/breakSyntet.py --ut x.wav [--break 4,8,16] [--hp 250]
Varje låt: 30 s original -> B s break -> 20 s original (dropen vid 30 + B). Låtarna (kvällens kvall-svep.wav, starka 'high'-partier)
läggs efter varandra med 2 s övertoning; utskriften = dropens tid per låt (facit för tillitKvall/dropTakt)."""
import argparse, numpy as np, os
from scipy.signal import butter, sosfilt, stft, istft
ap = argparse.ArgumentParser()
ap.add_argument('--ut', required=True)
ap.add_argument('--break', dest='brk', default='4,8,16')
ap.add_argument('--hp', type=float, default=250)
ap.add_argument('--gain', type=float, default=0.5)   # breakets nivå (0,5 = -6 dB, 0,1 = -20 dB)
ap.add_argument('--typ', default='pad')   # pad = trumlöst: STFT-magnitud utsmord 0,7 s + slumpfas, -6 dB (inga transienter); hp = högpass (kicken hittas ändå)
ap.add_argument('--kalla', default=os.path.join(os.path.dirname(__file__), 'ladan-2026-10-11', 'kvall-svep.wav'))
ap.add_argument('--t', default='600,880,3530,4650,5110,7590')   # s i kvall-svep: mitt i stadiga high-partier (tillit ~1 i replayen)
a = ap.parse_args()
SR = 48000
raw = np.memmap(a.kalla, dtype='<i2', mode='r', offset=44)
sos = butter(4, a.hp, 'highpass', fs=SR, output='sos')
y, facit = np.zeros(0, np.float32), []
F = int(2 * SR)
for B in [float(x) for x in a.brk.split(',')]:
    for t in [float(x) for x in a.t.split(',')]:
        s = raw[int(t * SR): int((t + 30 + B + 20) * SR)].astype(np.float32)
        if a.typ == 'hp': hp = sosfilt(sos, s).astype(np.float32)
        else:
            _f, _t, Z = stft(s, fs=SR, nperseg=16384, noverlap=16384 - 4096)
            M = np.abs(Z); k = 8; M = np.apply_along_axis(lambda v: np.convolve(v, np.ones(k) / k, 'same'), 1, M)
            rng = np.random.default_rng(int(t))
            _x, hp = istft(M * np.exp(2j * np.pi * rng.random(M.shape)), fs=SR, nperseg=16384, noverlap=16384 - 4096)
            hp = (hp[:len(s)] * a.gain).astype(np.float32)
            if len(hp) < len(s): hp = np.concatenate([hp, np.zeros(len(s) - len(hp), np.float32)])
        i0, i1, r = int(30 * SR), int((30 + B) * SR), int(0.05 * SR)
        w = np.ones(i1 - i0, np.float32); w[:r] = np.linspace(0, 1, r)
        s[i0:i1] = s[i0:i1] * (1 - w) + hp[i0:i1] * w
        start = max(0, len(y) - F)   # 2 s övertoning mot förra låten
        if len(y):
            x = np.linspace(0, 1, F, dtype=np.float32)
            y[-F:] = y[-F:] * (1 - x) + s[:F] * x
            y = np.concatenate([y, s[F:]])
        else: y = s
        facit.append((start / SR + 30 + B, B, t))
y = np.clip(y, -32768, 32767).astype('<i2')
with open(a.ut, 'wb') as fh:
    n = len(y) * 2
    fh.write(b'RIFF' + (36 + n).to_bytes(4, 'little') + b'WAVEfmt ' + (16).to_bytes(4, 'little') + (1).to_bytes(2, 'little') + (1).to_bytes(2, 'little')
             + SR.to_bytes(4, 'little') + (SR * 2).to_bytes(4, 'little') + (2).to_bytes(2, 'little') + (16).to_bytes(2, 'little') + b'data' + n.to_bytes(4, 'little'))
    fh.write(y.tobytes())
print(f'{a.ut}: {len(y) / SR:.0f} s')
for d, B, t in facit: print(f'drop {d:.2f} s  break {B:g} s  (kvall {t:g} s)')
