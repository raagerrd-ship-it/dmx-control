"""Klipp i full kvalitet till märksidan (ersätter klipp.py:s ljuddel: den halverade takten utan filter = vikning i diskanten, och låg mp3-takt).
Originalets 48 kHz behålls, ingen nivåändring utöver en gemensam förstärkning utan klippning, mp3 i högsta kvalitet. Bilden görs ur samma ljud.
python tools/natt/bygg-facit/klipp2.py k001 k002 ...   (eller 'alla')   - lotus-venv:ens python, från engine/"""
import json, os, sys, struct, zlib
import numpy as np, soundfile as sf, librosa
K = json.load(open('tools/natt/bygg-facit/kandidater-20261113.json', encoding='utf-8')); FORE, EFTER = K['fore'], K['efter']
D = os.path.join(os.getcwd(), '.arena', 'bygg2', 'sida')
vill = sys.argv[1:]; klipp = [k for k in K['klipp'] if 'alla' in vill or k['id'] in vill]
STOPS = np.array([[11, 13, 26], [45, 28, 110], [179, 18, 79], [242, 178, 58], [255, 246, 216]], dtype=np.float64)
def png(path, rgb):
    h, w, _ = rgb.shape; raw = b''.join(b'\x00' + rgb[y].tobytes() for y in range(h))
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
tot = 0
for k in klipp:
    sr = sf.info(k['wav']).samplerate
    y, _ = sf.read(k['wav'], start=int((k['t'] - FORE) * sr), frames=int((FORE + EFTER) * sr), dtype='float32', always_2d=True); y = y.mean(axis=1)
    pk = float(np.max(np.abs(y))) or 1.0; y = y * min(2.0, 0.89 / pk)          # bara nivå, aldrig över full skala
    fade = int(0.03 * sr); y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
    p = os.path.join(D, 'ljud', k['id'] + '.mp3'); sf.write(p, y, sr, format='MP3', subtype='MPEG_LAYER_III', bitrate_mode='CONSTANT', compression_level=0.0); tot += os.path.getsize(p)
    S = librosa.feature.melspectrogram(y=y, sr=sr, n_fft=4096, hop_length=sr // 20, n_mels=64, fmin=30, fmax=16000, power=2.0)
    db = librosa.power_to_db(S, ref=np.max(S), top_db=70.0); x = (np.clip((db + 70.0) / 70.0, 0, 1) ** 1.3)[::-1]
    pos = x * (len(STOPS) - 1); i0 = np.minimum(pos.astype(int), len(STOPS) - 2); fr = (pos - i0)[..., None]
    rgb = np.repeat(np.repeat((STOPS[i0] * (1 - fr) + STOPS[i0 + 1] * fr).astype(np.uint8), 3, axis=0), 2, axis=1)
    png(os.path.join(D, 'viz', k['id'] + '.png'), rgb)
    i = sf.info(p); print(k['id'], k['kalla'], '%d Hz, %.1f s, %d kB = %.0f kbit/s' % (i.samplerate, i.duration, os.path.getsize(p) // 1000, os.path.getsize(p) * 8 / i.duration / 1000))
print('klipp', len(klipp), 'totalt %.1f MB' % (tot / 1e6))
