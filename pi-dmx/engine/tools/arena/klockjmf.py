# Snabbjämförelse: lotus tempo (analysatorns egen sökning, lotus profil -> frame.bpm) mot DMX-klockan (cfg.beat) - samma klipp, samma facit.
import sys, os, json
sys.path.insert(0, 'tools/arena'); import tvavagar as T
env = dict(os.environ); env.pop('DMX_LABFX', None)
for hold in (False, True):
    M = T.MANGD[hold]; kl = [[T.F6(c[0])] + list(c[1:]) for c in M['korpus']]; mx = T.latar(M['korpus'], M['annan'])
    L = T.kor('.arena/tvavagar/lotusprov-3c5/dist', env, 'klipp', kl); D = T.kor('dist', env, 'klipp', kl)
    la = sum(x['ana'] for x in L) / len(L); dk = sum(x['klocka'] for x in D) / len(D)
    Lm = T.kor('.arena/tvavagar/lotusprov-3c5/dist', env, 'mix', mx)[0]; Dm = T.kor('dist', env, 'mix', mx)[0]
    print(json.dumps({'mängd': 'kontroll' if hold else 'övning', 'klipp_lotus_%': round(100 * la, 1), 'klipp_dmx_%': round(100 * dk, 1),
        'mix_lotus_%': round(Lm['ana'], 1), 'mix_dmx_%': round(Dm['klocka'], 1), 'dmx_las_s': Dm['lasMed'], 'dmx_hopp_min': round(Dm['hoppMin'], 2),
        'klipp_n': len(kl), 'sämst_lotus': sorted(((round(100*x['ana']), x['file']) for x in L))[:3], 'sämst_dmx': sorted(((round(100*x['klocka']), x['file']) for x in D))[:3]}, ensure_ascii=False))
