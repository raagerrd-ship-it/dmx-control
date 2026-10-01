# bytecode-offset -> kallrad i dist/effects.js for EffectEngine.render (forsta funktionen i bc.log)
import re,sys
bc=open(sys.argv[1],encoding='utf8',errors='replace').read().split('\n')
src=open(sys.argv[2],encoding='utf8').read()
offs=[int(x) for x in sys.argv[3:]]
pos=None; table=[]
for l in bc[4:]:
    if l.startswith('[generated') or l.startswith('Constant pool'): break
    m=re.match(r'\s*(\d+)\s+[SE]>\s+(?:0x)?[0-9A-Fa-f]+ @\s+(\d+)',l)
    if m: pos=int(m.group(1)); table.append((int(m.group(2)),pos)); continue
    m=re.match(r'\s+(?:0x)?[0-9A-Fa-f]+ @\s+(\d+)',l)
    if m and pos is not None: table.append((int(m.group(1)),pos))
for o in offs:
    best=None
    for bo,p in table:
        if bo<=o: best=p
        else: break
    line=src[:best].count('\n')+1
    print(o, 'L%d'%line, src.split('\n')[line-1].strip()[:150])
