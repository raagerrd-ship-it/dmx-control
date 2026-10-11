import json,glob,statistics as st,collections,sys,bisect
B='C:/Users/richa/Desktop/Claude/dmx-control/pi-dmx/engine/tools/natt/konsert/'
BUILD={'upptakt','nedrakning','fyllning','pingpong','virvel'}
def lifts(R,TH=8):
    t=[r[0] for r in R]; b=[max(-60,r[13]) for r in R]; n=len(R); S=[]
    for i in range(n):
        a=b[bisect.bisect_left(t,t[i]-6):bisect.bisect_left(t,t[i]-1)]; c=b[i:bisect.bisect_left(t,t[i]+3)]
        S.append(st.mean(c)-st.mean(a) if len(a)>20 and len(c)>20 else 0)
    out=[];last=-99
    for i in range(1,n-1):
        if S[i]>=TH and S[i]>=S[i-1] and S[i]>=S[i+1] and t[i]-last>8: out.append(t[i]); last=t[i]
    return out
LC={}
for v in sys.argv[1:]:
    T=0;sw=0;why=collections.Counter();bt=0;bsec=0;eps=[];resp=0;rok=0;N=0;hit=0;light=collections.defaultdict(list);nl=collections.defaultdict(list);dr=0;drok=0;durs=[]
    for p in sorted(glob.glob(B+v+'/*.json')):
        R=json.load(open(p))['rows']; k=p[-11:]
        if k not in LC: LC[k]=lifts(R)
        L=LC[k]; dur=R[-1][0]-R[0][0]; T+=dur; dt=dur/len(R)
        s0=0
        for i in range(1,len(R)):
            a,b=R[i-1],R[i]
            if a[1] in BUILD: bt+=dt
            if a[3]=='build': bsec+=dt
            light[a[3]].append(a[5]); nl[a[3]].append(a[6])
            if b[1]!=a[1]: sw+=1; why[b[2]]+=1; durs.append(b[0]-R[s0][0]); s0=i
        on=[R[i][0] for i in range(1,len(R)) if (R[i][10] and not R[i-1][10]) or R[i][7]>R[i-1][7] or R[i][11]>R[i-1][11]]
        d=[R[i][0] for i in range(1,len(R)) if R[i][7]>R[i-1][7] or R[i][11]>R[i-1][11]]
        resp+=len(on); rok+=sum(any(-1<=o-a<=1.5 for a in L) for o in on); N+=len(L); hit+=sum(any(-1<=o-a<=1.5 for o in on) for a in L)
        dr+=len(d); drok+=sum(any(-1<=o-a<=1.5 for a in L) for o in d)
        i=0
        while i<len(R):
            if R[i][1] in BUILD:
                j=i
                while j+1<len(R) and R[j+1][1] in BUILD: j+=1
                land = (j+1<len(R) and (R[j+1][7]>R[j][7] or R[j+1][11]>R[j][11])) or R[j][7]>R[i][7] or R[j][11]>R[i][11]
                eps.append((R[j][0]-R[i][0], land)); i=j+1
            else: i+=1
    m=T/60
    print(f"\n## {v}: lookbyten/min {sw/m:.1f} (median looktid {st.median(durs):.0f} s) | svar/min {resp/m:.1f}, på lyft {rok/resp:.0%} | lyft som fick svar {hit/N:.0%} ({N} lyft) | drops+landningar/min {dr/m:.2f}, på lyft {drok/max(1,dr):.0%}")
    print(f"   build-look {bt/T:.0%} av tiden (sektion build {bsec/T:.0%}), {len(eps)} build-episoder, median {st.median([e[0] for e in eps]):.0f} s, landar i drop {sum(e[1] for e in eps)/len(eps):.0%}")
    print(f"   ljus high {st.mean(light['high']):.2f} build {st.mean(light['build']):.2f} low {st.mean(light['low']):.2f} intro {st.mean(light['intro']):.2f} | lampor high {st.mean(nl['high']):.1f} low {st.mean(nl['low']):.1f}")
    print('   orsak', why.most_common(7))
