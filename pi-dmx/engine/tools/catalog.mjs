// Gemensam facit-laddare. EN sanningskalla for alla banker, sa de inte kan
// divergera i hur de matchar latar mot facit.
//
// bpm_catalog.tsv:  artist \t titel \t bpm \t alt-bpm
//
// VARNING om alt-kolumnen: den blandar tva olika saker -- akta oktavtvetydighet
// OCH andra inspelningar av samma lat (live/orkester). "77" for Tillfalligheternas
// spel visade sig vara Symphonia-versionen (2022, 5:13), inte studio (1990, 5:52).
// Kontrollera speltid innan ett alternativvarde tolkas som oktavfel.
//
// OCH: alla BPM-sajter aterforsaljer Spotifys audio-features. Att tva sajter sager
// samma sak ar INGEN korroborering, och den kallan har egna oktavfel. Aggregerade
// trender bar; enskilda varden inte nodvandigtvis.
import { readFileSync, existsSync } from "node:fs";

export const norm = (s) => (s || "").toLowerCase().replace(/[^a-zåäö0-9]+/g, "");

/** Vik in i analysatorns oktav [80,160) sa jamforelsen blir rattvis. */
export const fold = (b) => { while (b < 80) b *= 2; while (b >= 160) b /= 2; return b; };

const FILE = "tools/bpm_catalog.tsv";

/** Map: "artist|titel" -> {bpm, alt, artist, title}, plus "|titel" som reserv. */
export function loadCatalog(path = FILE) {
  const m = new Map();
  if (!existsSync(path)) return m;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [artist, title, bpm, alt, flag] = line.split("\t");
    if (!title || !bpm) continue;
    // variable = kallan anger uttryckligen VARIABELT tempo. Sadana latar driver
    // av konstruktion och kan inte anvandas som facit -- de raknas separat, inte
    // som fel. karaoke-version.com markerar dem uttryckligen.
    const rec = { bpm: Number(bpm), alt: alt && alt.trim() ? Number(alt) : null,
                  variable: (flag || "").trim() === "VAR", artist, title };
    m.set(norm(artist) + "|" + norm(title), rec);
    // Reserv pa enbart titel -- anvands bara om artist+titel inte traffar.
    const k = "|" + norm(title);
    if (!m.has(k)) m.set(k, rec);
  }
  return m;
}

/** Slar upp med artist+titel forst, sedan enbart titel. */
export function lookup(cat, artist, title) {
  return cat.get(norm(artist) + "|" + norm(title)) || cat.get("|" + norm(title)) || null;
}

/** Felkategori ur kvoten mot vikt facit -- kategorin sager vad som ska fixas. */
export function relation(q) {
  for (const [n, v] of [["RATT", 1], ["4/3", 4 / 3], ["3/4", 0.75], ["3/2", 1.5],
                        ["2/3", 2 / 3], ["2x", 2], ["1/2", 0.5], ["5/4", 1.25], ["4/5", 0.8]])
    if (Math.abs(q / v - 1) <= 0.05) return n;
  return "annat";
}
