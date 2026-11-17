"""REN 4/4 (etta2 11-17): rätt etta skild på tick nära (16 s) en Beat This-takt som inte har 4 slag mot rena partier.
Kör från engine/: python tools/arena/ren44.py bas,a8 193040 193818 ... (läser .arena/etta2/<m>/ettdom/kr-<fil>.json)."""
import os, json,io,sys,numpy as np
BT={}
for l in io.open('tools/ladan-2026-11-13/beatthis.jsonl',encoding='utf-8'):
    d=json.loads(l); BT[d['path'].replace(chr(92),'/').split('/')[-1].replace('-oklippt','')]=d
def ana(rp,f):
    bt=[v for k,v in BT.items() if f in k][0]; B=np.array(bt['beatsS']); D=np.array(bt['downbeatsS'])
    nb=np.diff(np.searchsorted(B,D-1e-3))  # beats per bar
    odd=D[:-1][nb!=4]
    TK=json.load(io.open(rp,encoding='utf-8'))['ticks']; T=np.array(TK[0::2],float); I=np.array(TK[1::2],float)
    ren=[0,0];smut=[0,0]
    for t,i in zip(T,I):
        if t<15 or t>B[-1]: continue
        k=int(np.argmin(abs(B-t)))
        if abs(B[k]-t)>0.12: continue
        dd=np.searchsorted(D,B[k]+1e-3)-1
        if dd<0: continue
        bp=int(np.searchsorted(B,B[k]+1e-3)-np.searchsorted(B,D[dd]))-1
        p=int((int(i)%4-bp)%4)
        near=len(odd) and np.min(abs(odd-t))<16
        x=smut if near else ren; x[0]+=1; x[1]+=(p==0)
    return len(odd),len(nb),ren,smut
for f in sys.argv[2:]:
    for m in sys.argv[1].split(','):
        o,nb,r,s=ana((os.environ.get('REN44_DIR','.arena/etta2')+'/%s/ettdom/kr-%s.json')%(m,f),f)
        print(f,m,'udda takter %d/%d'%(o,nb),'REN 4/4: rätt %.1f %% av %d'%(100*r[1]/max(1,r[0]),r[0]),' NÄRA UDDA: rätt %.1f %% av %d'%(100*s[1]/max(1,s[0]),s[0]))
