# Sätter in __probe(k) före varje sats på ett givet indrag i en metod i en dist-kopia (skräpjakten 2026-10-17).
#   python probe.py <dist-fil.js> <metod> [indrag=8]
# Läses av probeHook.mjs (allokerat per avsnitt). Kommentar- och tomrader hoppas över när föregående sats söks.
import sys, re, json
p, fn = sys.argv[1], sys.argv[2]; IND = int(sys.argv[3]) if len(sys.argv) > 3 else 8
L = open(p, encoding='utf-8').read().split('\n')
st = [i for i, l in enumerate(L) if re.match(r'^    ' + fn + r'\(.*\) \{$', l)][0]
en = [i for i in range(st + 1, len(L)) if L[i] == '    }'][0]
out = []; mp = {}; k = 0
def prev_code(i):
    j = i - 1
    while j > st and (L[j].strip() == '' or L[j].strip().startswith('//') or L[j].strip().startswith('*') or L[j].strip().startswith('/*')): j -= 1
    return L[j].split('//')[0].rstrip()
for i, l in enumerate(L):
    if st < i < en and re.match(r'^' + ' ' * IND + r'[^ }/.)\]*]', l) and not re.match(r'^ *(else|catch|finally|case|default)\b', l):
        pc = prev_code(i)
        if pc.endswith((';', '{', '}')) or i == st + 1:
            out.append(' ' * IND + '__probe(%d);' % k); mp[k] = i + 1; k += 1
    if i == en: out.append('        __probe(-1);')
    out.append(l)
open(p, 'w', encoding='utf-8').write('\n'.join(out)); json.dump(mp, open(p + '.probes.json', 'w')); print(fn, 'probes', k, 'rader', st + 1, en + 1)
