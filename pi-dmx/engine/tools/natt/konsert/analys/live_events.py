import json,glob,os,collections,datetime
D='C:/Users/richa/Desktop/Claude/dmx-control/pi-dmx/engine/tools/ladan-2026-10-11/'
TZ=datetime.timezone(datetime.timedelta(hours=2))
f=lambda ms: datetime.datetime.fromtimestamp(ms/1000,TZ).strftime('%H:%M:%S')
BUILD={'upptakt','nedrakning','fyllning','pingpong','virvel'}
tot=collections.Counter(); whyc=collections.Counter(); sect=collections.Counter(); T=0; SW=0; DR=0; MI=0
for p in sorted(glob.glob(D+'lang-*.events.json')):
    d=json.load(open(p)); fl=d['flags']; s0=d['captureStartWallMs']; sec=d['seconds']; end=s0+sec*1000
    if not fl: continue
    looks=collections.Counter(); prev=None; sw=0; sc=collections.Counter()
    rows=fl+[[end]+fl[-1][1:]]
    for a,b in zip(rows,rows[1:]):
        dt=(b[0]-a[0])/1000; looks[a[9]]+=dt; sc[a[3]]+=dt
    for r in fl:
        if r[9]!=prev:
            if prev is not None: sw+=1; whyc[r[10] or '-']+=1
            prev=r[9]
    dr=fl[-1][1]-fl[0][1]; mi=fl[-1][2]-fl[0][2]
    bt=sum(v for k,v in looks.items() if k in BUILD)
    print(f"{os.path.basename(p)[5:20]} {f(s0)} {sec:4.0f}s byten/min {sw/sec*60:4.1f} drops {dr:2d} mini {mi:2d} build {bt/sec*100:3.0f}% sekt "+' '.join(f"{k}:{v/sec*100:.0f}" for k,v in sc.most_common()))
    tot.update(looks); sect.update(sc); T+=sec; SW+=sw; DR+=dr; MI+=mi
print(f"\nTOTALT {T/60:.0f} min, byten/min {SW/T*60:.1f}, drops/min {DR/T*60:.2f}, mini/min {MI/T*60:.2f}")
print('sektioner', {k:round(v/T*100) for k,v in sect.most_common()})
print('looks % tid:', ', '.join(f"{k} {v/T*100:.1f}" for k,v in tot.most_common()))
print('orsak vid byte:', whyc.most_common(25))
