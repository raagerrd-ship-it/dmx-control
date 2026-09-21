/** Skicka ett ws-meddelande till motorns UI-socket: node tools/wsset.mjs <host> <type> <value(json)> */
import WebSocket from "ws";
const [host, type, raw] = process.argv.slice(2); const value = raw === undefined ? undefined : JSON.parse(raw);
const ws = new WebSocket(`ws://${host}/ws`);
ws.on("open", () => { ws.send(JSON.stringify({ type, value })); setTimeout(() => { ws.close(); process.exit(0); }, 500); });
ws.on("error", (e) => { console.error("ws-fel", e.message); process.exit(1); });
