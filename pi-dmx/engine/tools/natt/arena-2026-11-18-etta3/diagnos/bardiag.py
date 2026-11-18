import json,io,sys,numpy as np
f,err,t0,t1,step=sys.argv[1],sys.argv[2],float(sys.argv[3]),float(sys.argv[4]),float(sys.argv[5])
BT={}
for l in io.open('tools/ladan-2026-11-13/beatthis.jsonl',encoding='utf-8'):
  d=json.loads(l); BT[d['path'].replace(chr(92),'/').split('/')[-1].replace('-oklippt','')]=d
bt=[v for k,v in BT.items() if f in k][0]; B=np.array(bt['beatsS']); D=np.array(bt['downbeatsS'])
rows=[]
for l in io.open(err,encoding='utf-8',errors='replace'):
  if not l.startswith('BARDIAG'): continue
  a=l.split('|')[0].split()[1:]; t=(float(a[0])-1.7e12)/1000; slot,barM,bi,n=map(int,a[1:5]); v=np.array(list(map(float,a[5:21]))).reshape(4,4)
  k=int(np.argmin(abs(B-t)));
  if abs(B[k]-t)>0.25: continue
  dd=np.searchsorted(D,B[k]+1e-3)-1
  if dd<0: continue
  bp=int(np.searchsorted(B,B[k]+1e-3)-np.searchsorted(B,D[dd]))-1
  c=(slot-bp)%4   # motorns slot som är BT-ettan
  rows.append((t,c,barM,bi,v))
print('tid    vald(rel BT-etta)  K1 K3  R1 R3  L1 L3  X1 X3 | summa1 summa3  (1 = BT-ettan, 3 = två slag senare)')
for s in np.arange(t0,t1,step):
  R_=[r for r in rows if s<=r[0]<s+step]
  if not R_: continue
  rel=[(r[2]-r[1])%4 for r in R_]; V=np.mean([np.roll(r[4],-r[1],axis=0) for r in R_],axis=0)
  print('%02d:%02d'%(s//60,s%60),'vald',np.bincount(rel,minlength=4).tolist(),
        ' '.join('%.2f %.2f'%(V[0,j],V[2,j]) for j in range(4)),'| %.2f %.2f'%(V[0].sum(),V[2].sum()))
