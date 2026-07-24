/**
 * Ringbuffert med drift-händelser för fjärrsupport av uthyrda enheter.
 *
 * Uthyrning-kritiskt: när hyresgästen ringer och säger "lamporna slutade
 * blinka runt midnatt" behöver support kunna se vad som HÄNDE — inte bara
 * dagens journald, som är rensad nästa gång boxen bootar. 500 rader i minnet
 * räcker för en hel kväll och kostar ingen SD-slitage.
 *
 * Ingen persistens: en krasch mister loggen, men syftet är just att ge support
 * ett fönster in i den aktuella session som ledde till samtalet. Krascher som
 * överlevde ett SIGKILL syns ändå i journalctl.
 */
export type HealthEvent = {
  t: number;                          // Date.now() vid händelsen
  sev: "info" | "warn" | "err";
  tag: string;                        // "dmx" | "audio" | "ble" | "update" | "mode" | ...
  msg: string;                        // en rad, ingen stacktrace
};

const MAX = 500;
const buf: HealthEvent[] = [];

export function logHealth(sev: HealthEvent["sev"], tag: string, msg: string): void {
  buf.push({ t: Date.now(), sev, tag, msg: msg.slice(0, 240) });
  if (buf.length > MAX) buf.splice(0, buf.length - MAX);
  // Skriv också till stdout så journald har samma tidslinje.
  const line = `[${tag}] ${msg}`;
  if (sev === "err") console.error(line);
  else if (sev === "warn") console.warn(line);
  else console.log(line);
}

export function getHealthLog(): HealthEvent[] {
  return buf.slice();
}
