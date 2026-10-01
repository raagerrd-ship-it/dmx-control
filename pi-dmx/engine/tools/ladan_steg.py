r"""STEGTEST FOR LJUSKURVAN (ladan 2026-10-01). Satter DIM-varde per lampa (lampa 1..4) med fargen pa full, forbi showen,
sa agaren kan jamfora stegen sida vid sida. Showen ar AV medan testet ar pa.
  python tools\ladan_steg.py 16 20 24 32          lampa 1-4 = DIM 16/20/24/32, vitt (alla farger)
  python tools\ladan_steg.py 16 20 24 32 --farg r  bara rod kanal
  python tools\ladan_steg.py av                     tillbaka till showen
PI_HOST valfri; annars pi-dmx.local."""
import json, os, socket, sys, paramiko
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ladan
args = [a for a in sys.argv[1:]]
farg = 'all'
if '--farg' in args: i = args.index('--farg'); farg = args[i + 1]; del args[i:i + 2]
vals = [] if (not args or args[0] == 'av') else [int(a) for a in args]
host = os.environ.get('PI_HOST') or socket.getaddrinfo('pi-dmx.local', 22, socket.AF_INET)[0][4][0]
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username='pi', password=ladan.pw(), timeout=10, look_for_keys=False, allow_agent=False)
msg = json.dumps({'type': 'setLevelTest', 'values': vals, 'channel': farg})
js = ("const W=require('/opt/audio-dmx-engine/node_modules/ws');const w=new W('ws://127.0.0.1/ws');"
      "w.on('open',()=>{w.send(process.argv[2]);setTimeout(()=>process.exit(0),300)});w.on('error',e=>{console.log('ws-fel',e.message);process.exit(1)})")
sf = c.open_sftp()
with sf.open('/tmp/steg.js', 'w') as f: f.write(js)
sf.close()
i, o, e = c.exec_command("cd /tmp && node /tmp/steg.js '" + msg.replace("'", "") + "'", timeout=20)
o.channel.recv_exit_status(); print(o.read().decode().strip() or ('stegtest: ' + (', '.join(f'lampa {n+1}={v}' for n, v in enumerate(vals)) + f' ({farg})' if vals else 'AV - showen tillbaka')))
