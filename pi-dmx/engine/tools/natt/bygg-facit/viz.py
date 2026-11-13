"""Bild av ljudet för märksidan: ett mel-spektrogram per klipp (tid åt höger, bas längst ned, diskant överst) som PNG.
Körs med lotus-venv:ens python från engine/:  python tools/natt/bygg-facit/viz.py"""
import os, glob, struct, zlib
import numpy as np, soundfile as sf, librosa
D = os.path.join(os.getcwd(), '.arena', 'bygg2', 'sida'); os.makedirs(os.path.join(D, 'viz'), exist_ok=True)
STOPS = np.array([[11, 13, 26], [45, 28, 110], [179, 18, 79], [242, 178, 58], [255, 246, 216]], dtype=np.float64)   # mörk -> lila -> rött -> bärnsten -> ljus
def png(path, rgb):
    h, w, _ = rgb.shape; raw = b''.join(b'\x00' + rgb[y].tobytes() for y in range(h))
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
tot = 0
for f in sorted(glob.glob(os.path.join(D, 'ljud', '*.mp3'))):
    y, sr = sf.read(f, dtype='float32')
    S = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=2048, hop_length=sr // 20, n_mels=64, fmin=30, fmax=sr / 2, power=2.0)   # 50 ms per kolumn
    db = librosa.power_to_db(S, ref=np.max(S), top_db=65.0)
    x = np.clip((db + 65.0) / 65.0, 0, 1) ** 1.15                       # 0..1, lite kontrast
    x = x[::-1]                                                          # diskant överst
    pos = x * (len(STOPS) - 1); i0 = np.minimum(pos.astype(int), len(STOPS) - 2); fr = (pos - i0)[..., None]
    rgb = (STOPS[i0] * (1 - fr) + STOPS[i0 + 1] * fr).astype(np.uint8)
    rgb = np.repeat(np.repeat(rgb, 3, axis=0), 2, axis=1)                # 64 x 441 -> 192 x 882 bildpunkter
    p = os.path.join(D, 'viz', os.path.basename(f)[:-4] + '.png'); png(p, rgb); tot += os.path.getsize(p)
print('bilder', len(glob.glob(os.path.join(D, 'viz', '*.png'))), 'totalt %.1f MB' % (tot / 1e6), 'storlek', rgb.shape)
