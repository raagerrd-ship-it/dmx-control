"""Tidslinje -32..+8 s runt varje drop/mini: bas och ovre band i 2-s-steg, dB under filens 95-percentil. Plus markeringarna i ordning."""
import json, sys
import numpy as np, soundfile as sf
from scipy.signal import stft
D = r"C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine\tools\ladan-2026-11-13"
for namn in ["lang-20261113T160345", "lang-20261113T151659"]:
    x, sr = sf.read(f"{D}\\{namn}.wav", always_2d=True); x = x.mean(axis=1)
    f, t, Z = stft(x, fs=sr, nperseg=2048, noverlap=1024, padded=False, boundary=None); P = np.abs(Z) ** 2
    def band(lo, hi):
        m = (f >= lo) & (f < hi); return 10 * np.log10(P[m].sum(axis=0) + 1e-12)
    bas, ov, tot = band(30, 150), band(500, 16000), band(30, 16000)
    tb, to = np.percentile(bas, 95), np.percentile(ov, 95)
    mk = json.load(open(f"{D}\\{namn}.marks-fin.json", encoding="utf-8"))["marks"]
    print(f"\n===== {namn} =====")
    print("markeringar:", "  ".join(f"{m['kind'][:4]}{'*' if m.get('skip') else ''}@{m['fineS']:.0f}" for m in mk))
    steg = list(range(-32, 8, 2))
    print("            s   " + " ".join(f"{a:4d}" for a in steg))
    for m in mk:
        if m.get("skip") or m["kind"] not in ("drop", "mini", "intedrop"): continue
        s = m["fineS"]
        def rad(v, tak):
            o = []
            for a in steg:
                q = (t >= s + a) & (t < s + a + 2)
                o.append(f"{np.median(v[q]) - tak:4.0f}" if q.sum() > 3 else "   .")
            return " ".join(o)
        upp = [u["pressS"] for u in mk if u["kind"] == "uppbyggnad" and not u.get("skip") and 0 < s - u["pressS"] < 40]
        print(f"{m['kind']:8s}{s:6.1f} bas {rad(bas, tb)}   uppb tryckt {', '.join(f'{s - u:.0f} s fore' for u in upp) or '-'}")
        print(f"{'':14s} ovr {rad(ov, to)}")
