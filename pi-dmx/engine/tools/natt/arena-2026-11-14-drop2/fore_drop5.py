"""Vad skiljer agarens DROP fran hans MINIDROP i ljudet, i de tva inspelningarna var for sig?
Raknar en rad matt per handelse ur sekunderna FORE (kausalt) och visar per fil: median drop, median mini, AUC (1.0 = alla drop over alla mini).
Fragan: finns det nagot matt som skiljer i BADA filerna? Da kan en ny arena lyckas pa det material som finns."""
import json, sys
import numpy as np, soundfile as sf
from scipy.signal import stft

import os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
FILER = ["ladan-2026-11-13/lang-20261113T160345", "ladan-2026-11-14/lang-20261114T193040", "ladan-2026-11-14/lang-20261114T193818", "ladan-2026-11-13/lang-20261113T151659", "ladan-2026-11-14/lang-20261114T200719"]

def band(f, P, lo, hi):
    m = (f >= lo) & (f < hi)
    return 10 * np.log10(P[m].sum(axis=0) + 1e-12)

def las(namn):
    x, sr = sf.read(os.path.join(D, namn + ".wav"), always_2d=True)
    x = x.mean(axis=1)
    f, t, Z = stft(x, fs=sr, nperseg=2048, noverlap=1024, padded=False, boundary=None)
    P = np.abs(Z) ** 2
    b = {"bas": band(f, P, 30, 150), "lmid": band(f, P, 150, 500), "mid": band(f, P, 500, 2000),
         "hog": band(f, P, 2000, 8000), "luft": band(f, P, 8000, 16000), "tot": band(f, P, 30, 16000),
         "ovre": band(f, P, 500, 16000)}
    m = (f >= 100) & (f < 16000)
    b["cent"] = np.log2((f[m][:, None] * P[m]).sum(axis=0) / (P[m].sum(axis=0) + 1e-12) + 1e-9)
    # flode (onsets) i 500 Hz-16 kHz
    mm = (f >= 500) & (f < 16000)
    L = np.log10(P[mm] + 1e-10)
    fl = np.maximum(0, np.diff(L, axis=1)).sum(axis=0); fl = np.concatenate([[0], fl])
    b["flode"] = fl
    # 24 logband for arrangemangets form
    kant = np.geomspace(60, 16000, 25)
    b["form"] = np.stack([band(f, P, kant[i], kant[i + 1]) for i in range(24)])
    return t, b

def seg(t, v, a, c):
    m = (t >= a) & (t < c)
    return v[..., m]

def ons(t, fl, a, c):
    m = (t >= a) & (t < c)
    if m.sum() < 5: return 0.0
    v = fl[m]; med = np.median(fl[(t >= a - 4) & (t < c + 0.01)])
    thr = med * 1.6 + 1e-9
    pk = (v[1:-1] > thr) & (v[1:-1] >= v[:-2]) & (v[1:-1] > v[2:])
    return pk.sum() / max(c - a, 1e-6)

def matt(t, b, s):
    r = {}
    bas = b["bas"]; tot = b["tot"]
    efter = np.median(seg(t, bas, s + 0.2, s + 2.0))
    fore = seg(t, bas, s - 8, s - 0.1)
    borta = fore < efter - 6
    r["bas borta 8 s (%)"] = 100 * borta.mean()
    # langsta stycke
    dt = t[1] - t[0]; n = 0; mx = 0
    for q in borta:
        n = n + 1 if q else 0; mx = max(mx, n)
    r["langsta baslucka (s)"] = mx * dt
    r["diskant stiger (dB)"] = np.mean(seg(t, b["hog"], s - 2, s)) - np.mean(seg(t, b["hog"], s - 8, s - 6))
    r["luft stiger (dB)"] = np.mean(seg(t, b["luft"], s - 2, s)) - np.mean(seg(t, b["luft"], s - 8, s - 6))
    r["tyngdpunkt stiger (okt)"] = np.mean(seg(t, b["cent"], s - 2, s)) - np.mean(seg(t, b["cent"], s - 8, s - 6))
    a1 = ons(t, b["flode"], s - 2, s); a0 = ons(t, b["flode"], s - 8, s - 4)
    r["anslag/s sista 2 s"] = a1
    r["anslag tatnar (x)"] = a1 / max(a0, 0.25)
    t100 = seg(t, tot, s - 1.0, s - 0.02)
    r["paus fore slaget (dB)"] = (np.min(np.convolve(t100, np.ones(4) / 4, "valid")) if len(t100) >= 4 else 0) - np.median(seg(t, tot, s - 8, s - 1))
    # ny topp: nivan efter mot hogsta 1-s-medel de 25 s fore
    pre = seg(t, tot, s - 25, s - 0.5); k = int(round(1.0 / dt))
    hog = np.max(np.convolve(10 ** (pre / 10), np.ones(k) / k, "valid")) if len(pre) > k else np.nan
    r["ny topp mot 25 s (dB)"] = 10 * np.log10(np.mean(10 ** (seg(t, tot, s + 0.2, s + 2.0) / 10))) - 10 * np.log10(hog)
    preb = seg(t, bas, s - 25, s - 0.5)
    hogb = np.max(np.convolve(10 ** (preb / 10), np.ones(k) / k, "valid")) if len(preb) > k else np.nan
    r["bas ny topp mot 25 s (dB)"] = 10 * np.log10(np.mean(10 ** (seg(t, bas, s + 0.2, s + 2.0) / 10))) - 10 * np.log10(hogb)
    r["nivasteg efter-fore (dB)"] = np.median(seg(t, tot, s + 0.2, s + 2)) - np.median(seg(t, tot, s - 8, s - 0.5))
    r["ovre band tunnas (dB)"] = np.median(seg(t, b["ovre"], s - 4, s - 0.2)) - np.median(seg(t, b["ovre"], s - 16, s - 8))
    r["mellan tunnas (dB)"] = np.median(seg(t, b["lmid"], s - 4, s - 0.2)) - np.median(seg(t, b["lmid"], s - 16, s - 8))
    r["ovre band ror sig (dB std)"] = np.std([np.mean(seg(t, b["ovre"], s - 8 + i, s - 7 + i)) for i in range(8)])
    fa = np.median(seg(t, b["form"], s + 0.3, s + 3.0), axis=1)
    fn = np.median(seg(t, b["form"], s - 8, s - 1.0), axis=1)
    fl = np.median(seg(t, b["form"], s - 20, s - 10), axis=1) if s > 21 else fn
    r["form byter efter mot 8 s fore (dB)"] = np.mean(np.abs((fa - fa.mean()) - (fn - fn.mean())))
    r["form byter efter mot 10-20 s fore (dB)"] = np.mean(np.abs((fa - fa.mean()) - (fl - fl.mean())))
    r["form: fore mot 10-20 s fore (dB)"] = np.mean(np.abs((fn - fn.mean()) - (fl - fl.mean())))
    tak = np.percentile(seg(t, tot, max(0, s - 60), s), 95)
    r["niva fore under 60 s-taket (dB)"] = np.median(seg(t, tot, s - 8, s - 1)) - tak
    bastak = np.percentile(seg(t, bas, max(0, s - 60), s), 95)
    r["bas 8 s fore under 60 s-taket (dB)"] = np.median(seg(t, bas, s - 8, s - 0.5)) - bastak
    r["bas 16-8 s fore under taket (dB)"] = np.median(seg(t, bas, s - 16, s - 8)) - bastak
    # hur lange sedan basen senast spelade fullt (inom 6 dB av efter) i minst 2 s
    full = bas > efter - 6
    kk = int(round(2.0 / dt)); i0 = np.searchsorted(t, s - 0.1); sedan = 40.0
    run = 0
    for i in range(i0, max(0, i0 - int(40 / dt)), -1):
        run = run + 1 if full[i] else 0
        if run >= kk: sedan = s - t[i + kk - 1]; break
    r["sedan basen spelade fullt 2 s (s)"] = sedan
    return r

def auc(a, c):
    a = np.asarray(a, float); c = np.asarray(c, float)
    if len(a) == 0 or len(c) == 0: return np.nan
    w = 0.0
    for x in a: w += (x > c).sum() + 0.5 * (x == c).sum()
    return w / (len(a) * len(c))

ut = {}
for namn in FILER:
    t, b = las(namn)
    mk = json.load(open(os.path.join(D, namn + ".marks-fin.json"), encoding="utf-8"))["marks"]
    rad = {"drop": [], "mini": [], "intedrop": []}
    for m in mk:
        if m.get("skip") or m["kind"] not in rad: continue
        s = m["fineS"]
        if s < 9 or s > t[-1] - 4: continue
        rad[m["kind"]].append(matt(t, b, s))
    ut[namn] = rad
nycklar = list(ut[FILER[0]]["drop"][0].keys()); kort = [n[-6:] for n in FILER]
print("antal drop / mini+inte per fil: " + ", ".join("%s %d/%d" % (k, len(ut[n]["drop"]), len(ut[n]["mini"]) + len(ut[n]["intedrop"])) for k, n in zip(kort, FILER)))
print("AUC drop mot mini+inte (1,0 = alla drop over alla mini; 0,5 = slump). ALLA = alla fem filer i en hog. 'haller' = samma hall i alla fem och minst 0,65 fran slumpen raknat.")
print("%-40s | %s | %5s | haller" % ("matt", " ".join("%6s" % k for k in kort), "ALLA"))
rader = []
for k in nycklar:
    A = []; dd = []; mm = []
    for n in FILER:
        d = [m[k] for m in ut[n]["drop"]]; mi = [m[k] for m in ut[n]["mini"]] + [m[k] for m in ut[n]["intedrop"]]
        A.append(auc(d, mi)); dd += d; mm += mi
    al = auc(dd, mm); sida = [a - 0.5 for a in A if a == a]
    h = (all(x > 0 for x in sida) or all(x < 0 for x in sida)) and min(abs(x) for x in sida) >= 0.15
    rader.append((abs(al - 0.5), "%-40s | %s | %5.2f | %s" % (k, " ".join("%6.2f" % a for a in A), al, "JA" if h else "")))
for _, r in sorted(rader, reverse=True): print(r)
