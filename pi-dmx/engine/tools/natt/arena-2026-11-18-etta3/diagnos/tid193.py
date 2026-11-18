import json,io,sys,numpy as np
f=sys.argv[1]; kr=sys.argv[2]
BT={}
for l in io.open('tools/ladan-2026-11-13/beatthis.jsonl',encoding='utf-8'):
  d=json.loads(l); BT[d['path'].replace(chr(92),'/').split('/')[-1].replace('-oklippt','')]=d
bt=[v for k,v in BT.items() if f in k][0]; B=np.array(bt['beatsS']); D=np.array(bt['downbeatsS'])
nb=np.diff(np.searchsorted(B,D-1e-3)); odd=D[:-1][nb!=4]
d=json.load(io.open(kr,encoding='utf-8')); TK=d['ticks']; T=np.array(TK[0::2],float); I=np.array(TK[1::2],float)
C=d['columns']; R=d['rows']; ci={c:i for i,c in enumerate(C)}
rt=np.array([r[0] for r in R])
W=10
for s in np.arange(0,B[-1],W):
  m=(T>=s)&(T<s+W); h=[0,0,0,0]; nr=0
  for t,i in zip(T[m],I[m]):
    k=int(np.argmin(abs(B-t)))
    if abs(B[k]-t)>0.12: continue
    dd=np.searchsorted(D,B[k]+1e-3)-1
    if dd<0: continue
    bp=int(np.searchsorted(B,B[k]+1e-3)-np.searchsorted(B,D[dd]))-1
    h[int((int(i)%4-bp)%4)]+=1
  near=len(odd) and np.min(abs(odd-(s+5)))<16
  j=np.searchsorted(rt,s+5); r=R[min(j,len(R)-1)]
  bpm_bt=60/np.median(np.diff(B[(B>=s)&(B<s+W)])) if ((B>=s)&(B<s+W)).sum()>2 else 0
  dom=int(np.argmax(h)) if sum(h) else -1
  print('%02d:%02d'%(s//60,s%60), 'forskj',h, 'DOM',dom, 'udda' if near else 'ren ', 'sek',r[ci['sec']],'bpm',r[ci['bpm']],'cbpm',r[ci['cbpm']],'BT %.0f'%bpm_bt,'lock',r[ci['lock']],'conf',r[ci['conf']])
