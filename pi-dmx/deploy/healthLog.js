const MAX = 500;
const buf = [];
export function logHealth(sev, tag, msg) {
    buf.push({ t: Date.now(), sev, tag, msg: msg.slice(0, 240) });
    if (buf.length > MAX)
        buf.splice(0, buf.length - MAX);
    // Skriv också till stdout så journald har samma tidslinje.
    const line = `[${tag}] ${msg}`;
    if (sev === "err")
        console.error(line);
    else if (sev === "warn")
        console.warn(line);
    else
        console.log(line);
}
export function getHealthLog() {
    return buf.slice();
}
