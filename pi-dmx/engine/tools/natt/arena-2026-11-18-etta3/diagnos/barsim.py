import json,io,sys,numpy as np
S=sys.argv[1]
BT={}
for l in io.open('tools/ladan-2026-11-13/beatthis.jsonl',encoding='utf-8'):
  d=json.loads(l); BT[d['path'].replace(chr(92),'/').split('/')[-1].replace('-oklippt','')]=d
VAR={'bas':(1,1,1,1),'utan R':(1,0,1,1),'R x0,5':(1,.5,1,1),'R x0,25':(1,.25,1,1)}
res={k:{} for k in VAR}
for f in ['151659','160345','171840','200719','193040','193818']:
  key=[k for k in BT if f in k][0]; bt=BT[key]; B=np.array(bt['beatsS']); D=np.array(bt['downbeatsS'])
  nb=np.diff(np.searchsorted(B,D-1e-3)); odd=D[:-1][nb!=4]
  rows=[]
  for l in io.open(S+'/diag-'+key[:-4]+'.err',encoding='utf-8',errors='replace'):
    if not l.startswith('BARDIAG'): continue
    a=l.split('|')[0].split()[1:]; t=(float(a[0])-1.7e12)/1000; slot,barM,bi,n=map(int,a[1:5]); v=np.array(list(map(float,a[5:21]))).reshape(4,4)
    k=int(np.argmin(abs(B-t))); c=None
    if abs(B[k]-t)<0.25:
      dd=np.searchsorted(D,B[k]+1e-3)-1
      if dd>=0: c=(slot-(int(np.searchsorted(B,B[k]+1e-3)-np.searchsorted(B,D[dd]))-1))%4
    ren = c is not None and not (len(odd) and np.min(abs(odd-t))<16) and t>15
    rows.append((t,slot,barM,n,v,c,ren))
  for name,w in VAR.items():
    M=None; ok=tot=0; agree=0; nlog=0
    for i,(t,slot,barM,n,v,c,ren) in enumerate(rows):
      if n==16 or M is None: M=barM          # reset: start som motorn
      s=(v*np.array(w)).sum(1); o=np.argsort(-s); bi,best,sec=o[0],s[o[0]],s[o[1]]
      if bi!=M and best-sec>=0.06: M=bi
      if name=='bas' and i+1<len(rows) and rows[i+1][3]!=16: nlog+=1; agree+=(M==rows[i+1][2])
      if ren: tot+=1; ok+=(M==c)
    res[name][f]=100*ok/max(1,tot)
    if name=='bas': res['_sim'] = res.get('_sim',{}); res['_sim'][f]=100*agree/max(1,nlog)
print('simulatorn återger motorns val (bas):', {k:round(v,1) for k,v in res.pop('_sim').items()})
print('rätt etta i ren 4/4 per taktbeslut (%):')
for name,r in res.items(): print('%-8s'%name, '  '.join('%s %.1f'%(f,v) for f,v in r.items()), '  medel övn+mellan %.1f  kontroll %.1f'%(np.mean([r[f] for f in ['151659','160345','171840','200719']]), np.mean([r[f] for f in ['193040','193818']])))
