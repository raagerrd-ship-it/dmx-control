"""LIVE MOT BÄNK (2026-11-13, ägaren: "analys ... så vi har det som grund till bänken också"). Jämför vad motorn gjorde LIVE i ladan
(<namn>.events.json ur långinspelningen) med vad bänken gör OFFLINE på samma ljud (<namn>.replay.json ur
`node tools/konsertReplay.mjs <wav> --json <namn>.replay.json`).   python tools/liveMotBank.py <mapp>
Per fil: andel av tiden med samma sektion / samma effekt, fördelningarna, tempo, och drop live mot offline (inom 1,5 s)."""
import sys, json, glob, os, collections, bisect
for rp in sorted(glob.glob(os.path.join(sys.argv[1], '*.replay.json'))):
    f = rp[:-len('.replay.json')]; r = json.load(open(rp, encoding='utf-8')); ev = json.load(open(f + '.events.json', encoding='utf-8'))
    ci = {k: i for i, k in enumerate(r['columns'])}; ei = {k: i for i, k in enumerate(ev['columns'])}; F = ev['flags']; t0 = ev['captureStartWallMs']
    lt = [(x[0] - t0) / 1000 for x in F]
    live = lambda t, col: F[max(0, bisect.bisect_right(lt, t) - 1)][ei[col]]
    n = sec = look = 0; ls = collections.Counter(); os_ = collections.Counter(); ll = collections.Counter(); ol = collections.Counter(); tl = []; to = []
    for row in r['rows']:
        t = row[0]
        if t < 20 or t > lt[-1]: continue
        n += 1; a = row[ci['sec']]; b = live(t, 'section'); sec += a == b; os_[a] += 1; ls[b] += 1
        la = row[ci['look']]; lb = live(t, 'look'); look += la == lb; ol[la] += 1; ll[lb] += 1
        tl.append(live(t, 'bpm') or 0); to.append(row[ci['bpm']] or 0)
    sh = lambda c: ', '.join('%s %.0f%%' % (k, 100 * v / n) for k, v in c.most_common(7))
    tsame = sum(1 for a, b in zip(tl, to) if a > 0 and b > 0 and abs(a / b - 1) < 0.04) / max(1, n)
    hop = lambda v: sum(1 for a, b in zip(v, v[1:]) if a > 0 and b > 0 and abs(b / a - 1) > 0.04) / (n / 600)
    print('\n%s  (%d s jämförda efter 20 s insvängning)' % (os.path.basename(f), n / 10))
    print('  samma sektion live och offline %.0f %% av tiden | samma effekt %.0f %% | samma tempo (inom 4 %%) %.0f %%' % (100 * sec / n, 100 * look / n, 100 * tsame))
    print('  tempobyten över 4 %% per minut: live %.2f, offline %.2f' % (hop(tl), hop(to)))
    print('  sektion live:    ' + sh(ls)); print('  sektion offline: ' + sh(os_))
    print('  effekt live:     ' + sh(ll)); print('  effekt offline:  ' + sh(ol))
    ld = []; pd = F[0][ei['dropCount']]
    for x in F:
        if x[ei['dropCount']] > pd: ld.append(round((x[0] - t0) / 1000, 1))
        pd = x[ei['dropCount']]
    od = []; pd = r['rows'][0][ci['drops']]
    for row in r['rows']:
        if row[ci['drops']] > pd: od.append(round(row[0], 1))
        pd = row[ci['drops']]
    par = sum(1 for a in ld if any(abs(a - b) <= 1.5 for b in od))
    print('  drop live %d: %s' % (len(ld), ld)); print('  drop offline %d: %s  | gemensamma (inom 1,5 s): %d' % (len(od), od, par))
