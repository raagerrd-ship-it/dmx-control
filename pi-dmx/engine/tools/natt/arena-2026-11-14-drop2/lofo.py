"""GAR DET ATT LARA? Logistisk regression (L2) pa forkollens 21 matt, drop mot mini + inte drop, tranad pa fyra inspelningar och provad pa den femte
(lamna-en-fil-ute). AUC pa den utelamnade filen: 0,5 = slump. Kor mk_fore5.py + fore_drop5.py forst (skriver fore5.json).
  python tools/natt/arena-2026-11-14-drop2/lofo.py"""
import json, os, numpy as np
H = os.path.dirname(os.path.abspath(__file__)); U = json.load(open(os.path.join(H, 'fore5.json'))); F = list(U); K = list(U[F[0]]['drop'][0])
def XY(n):
    X = [[m[k] for k in K] for m in U[n]['drop']] + [[m[k] for k in K] for s in ('mini', 'intedrop') for m in U[n][s]]
    return np.nan_to_num(np.array(X, float)), np.array([1] * len(U[n]['drop']) + [0] * (len(X) - len(U[n]['drop'])), float)
def auc(p, y):
    a = p[y == 1]; c = p[y == 0]; return float(np.mean([(x > c).mean() + 0.5 * (x == c).mean() for x in a])) if len(a) and len(c) else float('nan')
def fit(X, y, lam):
    w = np.zeros(X.shape[1]); b = 0.0
    for _ in range(4000):
        p = 1 / (1 + np.exp(-(X @ w + b))); g = X.T @ (p - y) / len(y) + lam * w; w -= 0.1 * g; b -= 0.1 * float(np.mean(p - y))
    return w, b
for lam in (0.03, 0.3, 1.0):
    rad = []; alla_p = []; alla_y = []
    for ute in F:
        Xt = np.vstack([XY(n)[0] for n in F if n != ute]); yt = np.concatenate([XY(n)[1] for n in F if n != ute]); mu = Xt.mean(0); sd = Xt.std(0) + 1e-9
        w, b = fit((Xt - mu) / sd, yt, lam); Xu, yu = XY(ute); p = (Xu - mu) / sd @ w + b; rad.append('%s %.2f' % (ute[-6:], auc(p, yu))); alla_p += list(p); alla_y += list(yu)
    print('L2 %.2f  AUC pa utelamnad fil: %s   alla utelamnade tillsammans %.2f' % (lam, '  '.join(rad), auc(np.array(alla_p), np.array(alla_y))))
