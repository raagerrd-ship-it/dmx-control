import WebSocket from 'ws';
import fs from 'fs';
const out = fs.createWriteStream(process.argv[2]); const until = Date.now() + Number(process.argv[3]) * 1000;
const ws = new WebSocket('ws://10.171.211.218/ws');
ws.on('message', (m) => { const d = JSON.parse(m); if (d.type !== 'frame') return;
  out.write(JSON.stringify({ t: Date.now(), lv: d.level, e: d.energy, k: d.kick, b: d.beat, bpm: d.bpm, bc: d.bpmConfidence, dc: d.dropCount, bu: d.buildUp, r: d.inRiser, m: d.mode, pb: d.profile?.beat, i: d.intensity }) + '\n');
  if (Date.now() > until) { out.end(); ws.close(); process.exit(0); } });
ws.on('error', (e) => { console.error(e.message); process.exit(1); });
