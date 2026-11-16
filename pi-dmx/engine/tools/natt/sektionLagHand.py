"""SEKTIONSBYTET MOT ÄGARENS SEKTIONER (natt 11-16, uppdrag (a) efter SWITCH_ON 4 som föll två gånger).
Läser konsertReplay --json (rows: t, look, why ...) och ägarens marks-hand.json (klar) + Beat This!-facit (beatthis.jsonl).
För varje dirigentbyte med orsak 'sektion': närmaste ägarmarkering (sektion/uppbyggnad/drop) FÖRE bytet inom 20 s -> eftersläp i s och i
Beat This-slag, och bytets läge i frasen räknat från ägarens markering (slag mod 16). Plus ägarmarkeringarnas avstånd till närmaste
Beat This-etta (ligger hans gränser på ettan?).
  python tools/natt/sektionLagHand.py <replay.json> <wav>   (marks-hand och beatthis hittas bredvid wav:en / i ladan-2026-11-13)"""
import json, sys, os, bisect
import numpy as np
rp, wav = sys.argv[1], sys.argv[2]
R = json.load(open(rp, encoding='utf-8'))['rows']
mh = json.load(open(wav[:-4] + '.marks-hand.json', encoding='utf-8'))
SEK = {'intro', 'vers', 'refrang', 'outro', 'break', 'uppbyggnad', 'drop'}
M = sorted(m['fineS'] for m in mh['marks'] if m['kind'] in SEK and not m.get('skip'))
bt = None
for l in open(os.path.join(os.path.dirname(__file__), '..', 'ladan-2026-11-13', 'beatthis.jsonl'), encoding='utf-8'):
    d = json.loads(l)
    if os.path.basename(d['path']).replace('-oklippt', '') == os.path.basename(wav): bt = d
B = np.array(bt['beatsS']); D = np.array(bt['downbeatsS'])
def beats_between(a, b): return int(np.searchsorted(B, b) - np.searchsorted(B, a))
sw = [R[i][0] for i in range(1, len(R)) if R[i][1] != R[i - 1][1] and R[i][2] == 'sektion' and R[i][0] < B[-1]]
lag, lagb, fr = [], [], []
for t in sw:
    j = bisect.bisect_right(M, t) - 1
    if j < 0 or t - M[j] > 20: continue
    lag.append(t - M[j]); nb = beats_between(M[j], t); lagb.append(nb); fr.append(nb % 16)
# ägarens markeringar mot ettorna (slag till närmaste etta, med tecken)
off = []
for m in M:
    if m > B[-1]: continue
    k = np.argmin(abs(D - m)); off.append(beats_between(min(m, D[k]), max(m, D[k])) * (1 if m >= D[k] else -1))
print(f"{os.path.basename(wav)}: {len(sw)} sektionsbyten, {len(lag)} inom 20 s efter en ägarmarkering ({len(M)} markeringar)")
if lag:
    print(f"  eftersläp s p25/p50/p75 {np.percentile(lag,25):.1f}/{np.median(lag):.1f}/{np.percentile(lag,75):.1f}, slag p50 {np.median(lagb):.0f}, "
          f"på frasen (slag mod 16 i 15/0/1) {100*sum(1 for f in fr if f in (15,0,1))/len(fr):.0f} %, på takten (mod 4 = 0) {100*sum(1 for b in lagb if b%4==0)/len(lagb):.0f} %")
    print('  slag efter markeringen:', ' '.join(str(b) for b in lagb))
print(f"  ägarens markeringar på ettan (0 slag) {100*sum(1 for o in off if o==0)/max(1,len(off)):.0f} %, inom ±1 slag {100*sum(1 for o in off if abs(o)<=1)/max(1,len(off)):.0f} %  ({len(off)} st)")
# TAKTKLOCKANS ETTA (replay med --slag bär 'ticks' = t, beatIdx): var ligger motorns etta (beatIdx % 4 = 0) mot Beat This-ettan?
TK = json.load(open(rp, encoding='utf-8')).get('ticks')
if TK:
    T = np.array(TK[0::2]); I = np.array(TK[1::2]); ok = (T > 15) & (T < B[-1])
    # varje tick -> närmaste Beat This-slag; dess plats i takten (0 = etta) räknat från föregående Beat This-etta
    pos = []
    for t, i in zip(T[ok], I[ok]):
        k = int(np.argmin(abs(B - t)))
        if abs(B[k] - t) > 0.12: continue
        d = np.searchsorted(D, B[k] + 1e-3) - 1
        if d < 0: continue
        bp = beats_between(D[d], B[k] + 1e-3) - 1
        pos.append(((i % 4) - bp) % 4)
    h = np.bincount(pos, minlength=4)
    print(f"  motorns etta mot Beat This-ettan: förskjutning 0/1/2/3 slag {' / '.join(f'{100*x/len(pos):.0f}' for x in h)} %  ({len(pos)} tick på ett Beat This-slag av {ok.sum()})")
