# Sätter in __probe(k) före varje toppnivåsats i en funktion i en dist-kopia (8 blankors indrag = funktionskroppen).
import sys,re,json
p,fn=sys.argv[1],sys.argv[2]; L=open(p,encoding='utf-8').read().split('\n')
st=[i for i,l in enumerate(L) if re.match(r'^    '+fn+r'\(.*\) \{$',l)][0]
en=[i for i in range(st+1,len(L)) if L[i]=='    }'][0]
out=[]; mp={}; k=0
for i,l in enumerate(L):
    if st<i<en and re.match(r'^        [^ }/.)\]]',l) and not re.match(r'^        (else|catch|finally|case|default)\b',l):
        prev=L[i-1].rstrip()
        if prev.endswith((';','{','}')) or i==st+1:
            out.append('        __probe(%d);'%k); mp[k]=i+1; k+=1
    if i==en: out.append('        __probe(-1);')
    out.append(l)
open(p,'w',encoding='utf-8').write('\n'.join(out)); json.dump(mp,open(p+'.probes.json','w')); print(fn,'probes',k,'rader',st+1,en+1)
