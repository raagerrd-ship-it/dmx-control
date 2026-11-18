import json,io,sys,numpy as np
S=sys.argv[1]
BT={}
for l in io.open('tools/ladan-2026-11-13/beatthis.jsonl',encoding='utf-8'):
  d=json.loads(l); BT[d['path'].replace(chr(92),'/').split('/')[-1].replace('-oklippt','')]=d
print('fil     val-fel (rel BT: 0/1/2/3 %)   1-mot-3 rätt per röst K R L | 1-mot-2/4 rätt K R L X  (andel taktbeslut där rösten ger BT-ettan mer än det andra slaget)')
for f in ['151659','160345','171840','200719','193040','193818']:
  key=[k for k in BT if f in k][0]; bt=BT[key]; B=np.array(bt['beatsS']); D=np.array(bt['downbeatsS'])
  nb=np.diff(np.searchsorted(B,D-1e-3)); odd=D[:-1][nb!=4]
  h=np.zeros(4); w13=np.zeros(3); w24=np.zeros(4); n=0
  for l in io.open(S+'/diag-'+key[:-4]+'.err',encoding='utf-8',errors='replace'):
    if not l.startswith('BARDIAG'): continue
    a=l.split('|')[0].split()[1:]; t=(float(a[0])-1.7e12)/1000; slot,barM,bi,nn=map(int,a[1:5]); v=np.array(list(map(float,a[5:21]))).reshape(4,4)
    if t<15 or (len(odd) and np.min(abs(odd-t))<16): continue
    k=int(np.argmin(abs(B-t)))
    if abs(B[k]-t)>0.25: continue
    dd=np.searchsorted(D,B[k]+1e-3)-1
    if dd<0: continue
    c=(slot-(int(np.searchsorted(B,B[k]+1e-3)-np.searchsorted(B,D[dd]))-1))%4
    h[(barM-c)%4]+=1; n+=1
    for j in range(3): w13[j]+= v[c,j]>v[(c+2)%4,j]
    for j in range(4): w24[j]+= v[c,j]>max(v[(c+1)%4,j],v[(c+3)%4,j])
  print(f, (100*h/n).round(0).astype(int).tolist(), '  ', ' '.join('%.0f'%(100*x/n) for x in w13), ' | ', ' '.join('%.0f'%(100*x/n) for x in w24))
