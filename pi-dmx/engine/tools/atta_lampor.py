r"""ATTA LAMPOR (hardvaran 2026-11-08): lagger in Par 5-8 i Pi:ns SPARADE config och flyttar roken ur lampornas kanaler.
De nya U`King-parkanorna ar samma modell som Par 1-4, sa de far preset rgb7 och KOPIERAR sin partners kalibrering (cal) och band:
Par 5 <- Par 1, Par 6 <- Par 2, Par 7 <- Par 3, Par 8 <- Par 4. Ogonkolla sedan att de nya tands likt de gamla vid lag niva.

  cd C:\Users\richa\Desktop\Claude\dmx-control\pi-dmx\engine
  python tools\atta_lampor.py              visar vad som skulle andras, ror ingenting
  python tools\atta_lampor.py --kor        skickar andringen (motorn sparar config.json sjalv, ingen omstart)
  python tools\atta_lampor.py --tillbaka <backupfil>   lagger tillbaka fixtures + rok ur en backup

Standardconfigen i src/config.ts har med flit KVAR 4 lampor: banken och arenan kor pa den, och 8 skulle flytta alla matt.
Las: GET /api/config/export (utan hemliga falt) -> backup i tools/ladan-<datum>/. Skriv: setFixtures + setFog over ws://<pi>/ws.
PI_HOST valfri; annars samma adresser som ladan.py provar. Roken behaller enabled/niva/tider, bara adressen flyttas."""
import datetime, json, os, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HERE = os.path.dirname(os.path.abspath(__file__))
NEW = [("Par 5", 29), ("Par 6", 36), ("Par 7", 43), ("Par 8", 50)]
WIDTH = {"rgb": 3, "rgb7": 7, "rgbw": 4, "dimmer": 1}


def hosts():
    if os.environ.get("PI_HOST"): return [os.environ["PI_HOST"]]
    import socket
    out = []
    try: out.append(socket.getaddrinfo("pi-dmx.local", 80, socket.AF_INET)[0][4][0])
    except Exception: pass
    return out + ["192.168.4.1", "172.29.167.218", "192.168.1.176"]


def fetch(h):
    with urllib.request.urlopen(f"http://{h}/api/config/export", timeout=5) as r:
        return json.loads(r.read().decode("utf-8"))["config"]


def width(fx):
    return len(fx["roles"]) if fx.get("preset") == "custom" else WIDTH[fx["preset"]]


def span(fx):
    return fx["address"], fx["address"] + width(fx) - 1


def overlaps(fixtures):
    bad, sp = [], sorted((span(f), f["name"]) for f in fixtures)
    for (a, n1), (b, n2) in zip(sp, sp[1:]):
        if b[0] <= a[1]: bad.append(f"{n1} {a[0]}-{a[1]} / {n2} {b[0]}-{b[1]}")
    return bad


def send(h, msgs):
    import websocket
    ws = websocket.create_connection(f"ws://{h}/ws", timeout=5)
    for m in msgs: ws.send(json.dumps(m))
    ws.close()


def show(cfg, title):
    print(title)
    for f in cfg["fixtures"]:
        a, b = span(f)
        print(f"  {f['name']:<8} {a:>3}-{b:<3} {f['preset']:<6} cal={json.dumps(f.get('cal'))}" + (f" band={f['bands']}" if f.get("bands") else ""))
    fog = cfg.get("fog") or {}
    print(f"  rok      adress {fog.get('address')}  {'PA' if fog.get('enabled') else 'av'}")


def plan(cfg):
    fx = [dict(f) for f in cfg["fixtures"]]
    have = {f["address"] for f in fx}
    for k, (name, addr) in enumerate(NEW):
        if addr in have: continue
        partner = fx[k] if k < len(fx) else fx[0]
        nf = {"name": name, "address": addr, "preset": "rgb7"}
        if partner.get("cal"): nf["cal"] = dict(partner["cal"])
        if partner.get("bands"): nf["bands"] = list(partner["bands"])
        fx.append(nf)
    fog = dict(cfg.get("fog") or {})
    last = max(span(f)[1] for f in fx)
    if fog and any(span(f)[0] <= fog.get("address", 0) <= span(f)[1] for f in fx):
        fog["address"] = last + 1
    return fx, fog


def main():
    args = sys.argv[1:]
    h = None
    for cand in hosts():
        try: cfg = fetch(cand); h = cand; break
        except Exception: print(f"  {cand} svarar inte")
    if not h: sys.exit('Pi-DMX gar inte att na. Anslut till WiFi "pi-dmx" (eller satt PI_HOST) och kor igen.')
    print(f"Pi-DMX svarar pa {h}")
    show(cfg, "NU:")

    if "--tillbaka" in args:
        bk = json.load(open(args[args.index("--tillbaka") + 1], encoding="utf-8"))["config"]
        send(h, [{"type": "setFixtures", "fixtures": bk["fixtures"]}] + ([{"type": "setFog", "fog": bk["fog"]}] if bk.get("fog") else []))
        time.sleep(1.0)
        show(fetch(h), "TILLBAKA, Pi:n sager nu:")
        return

    fx, fog = plan(cfg)
    bad = overlaps(fx)
    if bad: sys.exit("KROCK mellan lampor, inget skickat: " + "; ".join(bad))
    new = {**cfg, "fixtures": fx, "fog": fog}
    show(new, "BLIR:")
    if fx == cfg["fixtures"] and fog == (cfg.get("fog") or {}):
        print("Inget att andra - Par 5-8 finns redan och roken ligger fritt."); return
    if "--kor" not in args:
        print("Torrkorning. Kor med --kor for att skicka."); return

    day = datetime.date.today().isoformat()
    d = os.path.join(HERE, f"ladan-{day}"); os.makedirs(d, exist_ok=True)
    bp = os.path.join(d, f"config-fore-8-lampor-{datetime.datetime.now():%H%M%S}.json")
    json.dump({"config": cfg}, open(bp, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"backup: {bp}")
    msgs = [{"type": "setFixtures", "fixtures": fx}]
    if fog: msgs.append({"type": "setFog", "fog": {k: fog[k] for k in ("enabled", "address", "onDrop", "burstMs", "cooldownMs", "level", "warmupMs") if k in fog}})
    send(h, msgs)
    time.sleep(1.0)   # motorn hanterar meddelandena i tur och ordning; las efter
    after = fetch(h)
    show(after, "Pi:n sager nu:")
    ok = [(f["name"], f["address"]) for f in after["fixtures"]] == [(f["name"], f["address"]) for f in fx] and (after.get("fog") or {}).get("address") == fog.get("address")
    print("OK - sparas av motorn inom en halv sekund." if ok else "VARNING: Pi:n visar inte det som skickades - kolla /setup.")


if __name__ == "__main__":
    main()
