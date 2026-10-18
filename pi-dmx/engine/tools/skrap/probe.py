# Sätter in __probe(k) före varje sats på ett givet indrag i en metod i en dist-kopia (skräpjakten 2026-10-17).
#   python probe.py <dist-fil.js> <metod eller toppnivåfunktion> [indrag=8]
# Läses av probeHook.mjs (allokerat per avsnitt). Kommentar- och tomrader hoppas över när föregående sats söks.
import sys, re, json
import os
RET = os.environ.get('PROBE_RET') == '1'
p, fn = sys.argv[1], sys.argv[2]; IND = int(sys.argv[3]) if len(sys.argv) > 3 else 8
L = open(p, encoding='utf-8').read().split('\n')
st = [i for i, l in enumerate(L) if re.match(r'^    ' + fn + r'\(.*\) \{$', l) or re.match(r'^(export )?function ' + fn + r'\(.*\) \{$', l)][0]
END = '}' if L[st].startswith(('function', 'export')) else '    }'   # toppnivåfunktion (alsaMic) eller metod
en = [i for i in range(st + 1, len(L)) if L[i] == END or (END == '    }' and L[i] == '    },')][0]   # metod i objektlitteral (effekterna) slutar med '},'
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
    if i == en: out.append(' ' * IND + '__probe(-1);')
    if RET and st < i < en:   # PROBE_RET=1: stang proben vid varje return (annars far en tidig retur allt fram till nasta anrop)
        l = re.sub(r'\breturn;', 'return void __probe(-1);', l)
        l = re.sub(r'\breturn (?!void __probe)(.+);(\s*(//.*)?)$', r'return __probeRet(\1);\2', l)
    out.append(l)
open(p, 'w', encoding='utf-8').write('\n'.join(out)); json.dump(mp, open(p + '.probes.json', 'w')); print(fn, 'probes', k, 'rader', st + 1, en + 1)
