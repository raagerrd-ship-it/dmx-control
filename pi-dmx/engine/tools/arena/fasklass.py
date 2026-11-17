import json, sys, numpy as np, glob, os
BT={}
for l in open('tools/ladan-2026-11-13/beatthis.jsonl',encoding='utf-8'):
    d=json.loads(l); BT[os.path.basename(d['path'])[-10:-4]]=d
W=10.0
def mmss(s): return f"{int(s//60):02d}:{s%60:05.2f}"
tot={'på slaget':0,'motslag':0,'oklart':0}
for p in sorted(glob.glob(sys.argv[1]+'/kr-*.json')):
    f=p[-11:-5]; j=json.load(open(p,encoding='utf-8')); T=np.array(j['ticks'][0::2],float)
    B=np.array(BT[f]['beatsS']); m0=(T>15)&(T<B[-1])
    def off(x):
        k=np.searchsorted(B,x).clip(1,len(B)-1); a=B[k]-x; b=B[k-1]-x; return np.where(abs(a)<abs(b),a,b)
    o=off(T); g=np.median(o[m0])
    cls={'på slaget':0,'motslag':0,'oklart':0}; mot=[]
    for a in np.arange(15,B[-1]-W,W):
        m=(T>=a)&(T<a+W)
        if m.sum()<4: continue
        x=o[m]-g; bb=B[(B>=a-1)&(B<a+W+1)]; ibi=np.median(np.diff(bb)) if len(bb)>2 else 0.5
        on=np.mean(abs(x)<0.06)
        # motslag: ticket ligger mitt mellan Beat This-slag (en halv slaglängd fel)
        half=np.mean(abs(abs(x)-ibi/2)<0.06)
        if on>=0.7: cls['på slaget']+=1
        elif half>=0.7: cls['motslag']+=1; mot.append(a)
        else: cls['oklart']+=1
    n=sum(cls.values())
    # slå ihop motslags-fönster till perioder
    per=[]; 
    for a in mot:
        if per and a-per[-1][1]<=W+0.1: per[-1][1]=a+W
        else: per.append([a,a+W])
    print(f"{f}: på slaget {100*cls['på slaget']/n:4.0f} %  motslag {100*cls['motslag']/n:4.0f} %  oklart {100*cls['oklart']/n:4.0f} %   lead {g*1000:.0f} ms   motslag: {', '.join(mmss(a)+'-'+mmss(b) for a,b in per) or '-'}")
    for k in tot: tot[k]+=cls[k]
n=sum(tot.values()); print('ALLA:', {k: f'{100*v/n:.0f} %' for k,v in tot.items()}, f'({n} fönster à {W:.0f} s)')
