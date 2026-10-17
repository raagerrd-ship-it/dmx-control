# Experiment 2 (ovanpå patch1): argumenten till heta metoder via fält i stället för parametrar (decimaltal över anropsgränsen boxas).
import sys,re
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
BOOL={'kick','breaking'}
def split_args(a):
    out=[];d=0;cur=''
    for ch in a:
        if ch in '([{': d+=1
        if ch in ')]}': d-=1
        if ch==',' and d==0: out.append(cur.strip()); cur=''
        else: cur+=ch
    if cur.strip(): out.append(cur.strip())
    return out
inits=[]
def conv(m):
    global s
    mm=re.search(r'\n    '+m+r'\(([^)]*)\) \{\n',s); assert mm,m
    params=[]; defs={}
    for x in split_args(mm.group(1)):
        if '=' in x: k,v=[t.strip() for t in x.split('=',1)]; params.append(k); defs[k]=v
        else: params.append(x)
    body='\n    '+m+'() {\n        const '+', '.join(f'{k} = this._{m}_{k}' for k in params)+';\n'
    s=s[:mm.start()]+body+s[mm.end():]
    for k in params: inits.append(f'this._{m}_{k} = {"false" if k in BOOL else "0.5"};')
    # anrop
    i=0; n=0
    while True:
        j=s.find('this.'+m+'(',i)
        if j<0: break
        k=j+len('this.'+m+'('); d=1; e=k
        while d: 
            if s[e]=='(': d+=1
            elif s[e]==')': d-=1
            e+=1
        args=split_args(s[k:e-1])
        if not args and not params: i=e; continue
        assign=[]
        for idx,pn in enumerate(params):
            v=args[idx] if idx<len(args) else defs[pn]
            assign.append(f'this._{m}_{pn} = {v}')
        rep='('+', '.join(assign)+', this.'+m+'())'
        s=s[:j]+rep+s[e:]; i=j+len(rep); n+=1
    print(m,'anrop',n)
for m in ['sectionAggStep','kickStep','silenceStep','bigStep','riserStep','kickRefine','sectionHop']: conv(m)
a="        this._iOut = 0.5;"
assert s.count(a)==1
s=s.replace(a,'        '+' '.join(inits)+'\n'+a)
open(p,'w',encoding='utf-8').write(s)
