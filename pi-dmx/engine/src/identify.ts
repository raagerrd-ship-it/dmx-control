/**
 * LÅTIDENTIFIERING — vad heter låten som just spelades in?
 *
 * Strukturmodellen hör hur en låt är BYGGD men har aldrig hört just den låten,
 * och kan omöjligt veta vad den heter. Igenkänning är ett databasproblem, inte
 * ett modellproblem: det krävs fingeravtryck av tiotals miljoner inspelningar
 * under licens. Därav ACRCloud. (Sökt igenom Replicates modellutbud 2026-08-08 —
 * där finns musikGENERERING, ingen igenkänning, och det är ingen slump.)
 *
 * Fyller bara i `note`, samma fält ägaren skriver namn i för hand. Gissar den
 * fel skriver man över; hittar den inget lämnas fältet tomt. En självsäker fel
 * titel är sämre än ingen alls.
 *
 * MÄTT 2026-08-08 på två låtar ur en riktig inspelning:
 *   "Si Nos Besamos" score 100  (tvåa: en jazzlåt, 43)
 *   "JAG VILL HA DIG" score 100 (tvåa: samma låt karaoke, 40)
 * Rätt svar låg på 100 båda gångerna och tvåan under 45. Tröskeln nedan ligger
 * i det uppmätta gapet, inte på en gissning.
 */

import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";

/**
 * ENDA REGELN: score 100. Inget annat sparas.
 *
 * MATT 2026-08-08 over sex utdrag ur fyra riktiga inspelningar. Varje RATT svar
 * lag pa exakt 100; varje FEL svar lag pa 46, 43, 40, 34, 31 eller 22. Gapet ar
 * sa stort att ingen marginalregel behovs — och en marginalregel var dessutom
 * direkt skadlig: ACRCloud svarade en gang med TRE traffar pa 100 ("Supa Dupa",
 * "(Extended Mix)", "(Original Mix)" — samma lat i tre utgavor), vilket en
 * krav-pa-avstand-till-tvaan hade avvisat som tvetydigt.
 */
const REQUIRED_SCORE = 100;
/** ACRCloud behöver inte mer: 8 kHz mono räcker gott och tar utdraget från
 *  1,4 MB till under 200 kB. */
const SAMPLE_RATE = 8000;
const SAMPLE_SEC = 12;

export interface IdentifyCreds { host: string; key: string; secret: string; }
export interface IdentifyHit { title: string; artist: string; album?: string; score: number; }

/**
 * ETT UTDRAG RACKER INTE. MATT 2026-08-08 pa en riktig inspelning (181 s):
 *   mitten (85 s)  -> score  46 pa FEL lat  (korrekt avvisad, men inget namn)
 *   30 s in        -> score 100, ratt lat
 *   2/3 in (120 s) -> score 100, ratt lat
 * Laten fanns alltsa i katalogen hela tiden — mitten rakade bara vara ett parti
 * som fingeravtrycker daligt. Darfor provas flera stallen tills ett svar ar
 * sakert. Ordningen ar den uppmatta: 30 s in forst, sedan 2/3, sedan mitten.
 */
export const SAMPLE_SPOTS = [
  (durS: number) => 30,
  (durS: number) => durS * 0.66,
  (durS: number) => (durS - SAMPLE_SEC) / 2,
];

/** Langden pa ljudet i sekunder, eller 0 om filen inte gar att lasa. */
export function wavDuration(wavPath: string): number {
  try {
    const b = readFileSync(wavPath);
    let p = 12, ch = 1, rate = 0, dLen = 0;
    while (p + 8 <= b.length) {
      const id = b.toString("ascii", p, p + 4), sz = b.readUInt32LE(p + 4);
      if (id === "fmt ") { ch = b.readUInt16LE(p + 10); rate = b.readUInt32LE(p + 12); }
      else if (id === "data") { dLen = Math.min(sz, b.length - (p + 8)); break; }
      p += 8 + sz + (sz & 1);
    }
    return rate ? dLen / 2 / ch / rate : 0;
  } catch { return 0; }
}

/**
 * Klipp ut ett utdrag ur låten och samla till 8 kHz mono.
 * @param atS var utdraget borjar (sekunder). Utanfor filen → null.
 */
export function sampleForIdentify(wavPath: string, atS?: number): Buffer | null {
  const b = readFileSync(wavPath);
  let p = 12, ch = 1, rate = 0, dOff = 0, dLen = 0;
  while (p + 8 <= b.length) {
    const id = b.toString("ascii", p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === "fmt ") { ch = b.readUInt16LE(p + 10); rate = b.readUInt32LE(p + 12); }
    else if (id === "data") { dOff = p + 8; dLen = Math.min(sz, b.length - dOff); break; }
    p += 8 + sz + (sz & 1);
  }
  if (!rate || !dLen) return null;
  const i16 = new Int16Array(b.buffer, b.byteOffset + dOff, dLen >> 1);
  const frames = Math.floor(i16.length / ch);
  const need = SAMPLE_SEC * rate;
  if (frames < need) return null;
  const start = atS === undefined
    ? Math.floor((frames - need) / 2)
    : Math.max(0, Math.min(frames - need, Math.floor(atS * rate)));

  const step = Math.max(1, Math.round(rate / SAMPLE_RATE));
  const outRate = Math.round(rate / step);
  const outN = Math.floor(need / step);
  const out = Buffer.alloc(44 + outN * 2);
  out.write("RIFF", 0); out.writeUInt32LE(36 + outN * 2, 4); out.write("WAVE", 8);
  out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22); out.writeUInt32LE(outRate, 24);
  out.writeUInt32LE(outRate * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write("data", 36); out.writeUInt32LE(outN * 2, 40);
  for (let i = 0; i < outN; i++) {
    let acc = 0, n = 0;
    for (let k = 0; k < step; k++) {
      const f = start + i * step + k;
      if (f >= frames) break;
      acc += ch === 1 ? i16[f] : (i16[f * ch] + i16[f * ch + 1]) / 2;
      n++;
    }
    let v = Math.round(acc / Math.max(1, n));
    if (v > 32767) v = 32767; else if (v < -32768) v = -32768;
    out.writeInt16LE(v, 44 + i * 2);
  }
  return out;
}

/** Fråga ACRCloud. Returnerar null när svaret inte är tillräckligt säkert. */
export async function identify(sample: Buffer, creds: IdentifyCreds): Promise<IdentifyHit | null> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  // Signaturen är HMAC-SHA1 över exakt den här strängen, base64. Radbrytningarna
  // ingår. MÄTT: ETT felläst tecken i hemligheten ger kod 3014 "invalid
  // signature" — inte "invalid key" — så felet pekar bort från sin egen orsak.
  const stringToSign = ["POST", "/v1/identify", creds.key, "audio", "1", timestamp].join("\n");
  const signature = createHmac("sha1", creds.secret).update(Buffer.from(stringToSign, "utf-8")).digest("base64");

  const bd = "----acr" + Date.now().toString(36);
  const parts: Buffer[] = [];
  const field = (name: string, value: string): void => {
    parts.push(Buffer.from(`--${bd}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  };
  field("access_key", creds.key);
  field("data_type", "audio");
  field("signature_version", "1");
  field("signature", signature);
  field("sample_bytes", String(sample.length));
  field("timestamp", timestamp);
  parts.push(Buffer.from(`--${bd}\r\nContent-Disposition: form-data; name="sample"; filename="s.wav"\r\nContent-Type: audio/wav\r\n\r\n`));
  parts.push(sample);
  parts.push(Buffer.from(`\r\n--${bd}--\r\n`));

  const res = await fetch(`https://${creds.host}/v1/identify`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${bd}` },
    body: Buffer.concat(parts),
  });
  const txt = await res.text();
  let j: any;
  try { j = JSON.parse(txt); } catch { throw new Error(`svaret var inte JSON: ${txt.slice(0, 120)}`); }
  const code = j?.status?.code;
  // 1001 = "no result" och är ett HELT normalt svar: egen musik, en livespelning
  // eller en remix som inte finns i katalogen. Inget fel, bara inget namn.
  if (code === 1001) return null;
  if (code !== 0) throw new Error(`ACRCloud ${code}: ${j?.status?.msg}`);

  const music: any[] = j?.metadata?.music ?? [];
  if (!music.length) return null;
  const top = [...music].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  if ((top.score ?? 0) < REQUIRED_SCORE) return null;

  return {
    title: String(top.title ?? "").trim(),
    artist: (top.artists ?? []).map((a: any) => a.name).filter(Boolean).join(", "),
    album: top.album?.name,
    score: top.score ?? 0,
  };
}

/** "Titel — Artist", eller bara titeln om artist saknas. */
export function formatNote(h: IdentifyHit): string {
  return h.artist ? `${h.title} — ${h.artist}` : h.title;
}
