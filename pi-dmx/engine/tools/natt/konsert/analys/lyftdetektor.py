import json,glob,statistics as st,bisect
exec(open('cmp.py').read().split('LC={}')[0])
B='C:/Users/richa/Desktop/Claude/dmx-control/pi-dmx/engine/tools/natt/konsert/replay/'
data=[]
for p in sorted(glob.glob(B+'*.json')):
    R=json.load(open(p))['rows']; data.append((R,lifts(R)))
T=sum(R[-1][0]-R[0][0] for R,_ in data)/60
def det(R,win,TH,gap=8,maxc=None):
    t=[r[0] for r in R]; b=[max(-60,r[13]) for r in R]; out=[];last=-99
    for i in range(len(R)):
        x=b[bisect.bisect_left(t,t[i]-win):i+1]; c=b[bisect.bisect_left(t,t[i]-6):bisect.bisect_left(t,t[i]-2)]
        if len(c)<20 or not x: continue
        cm=st.mean(c)
        if st.mean(x)-cm>=TH and t[i]-last>gap and (maxc is None or max(c)-cm<maxc): out.append(t[i]); last=t[i]
    return out
for win in (0.3,0.6,1.0):
  for TH in (6,8,10):
    N=hit=resp=ok=0
    for R,L in data:
        D=det(R,win,TH); resp+=len(D); ok+=sum(any(-1<=d-a<=1.5 for a in L) for d in D); N+=len(L); hit+=sum(any(-1<=d-a<=1.5 for d in D) for a in L)
    print(f"fönster {win} s, {TH} dB: {resp/T:.1f}/min, på lyft {ok/max(1,resp):.0%}, lyft fångade {hit/N:.0%}")
