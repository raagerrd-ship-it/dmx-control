/**
 * Persists the runtime config to /var/lib/audio-dmx-engine/config.json so
 * fixture changes survive reboots. Debounced saves — no thrashing when the
 * user drags sliders.
 *
 * CRASH-SAFE for a rental unit: writes are atomic (temp file + rename) so a
 * power cut mid-save can never leave a truncated/corrupt config that would
 * drop the fixture addresses. The previous good config is kept as `.bak`, and
 * load falls back main → bak → defaults if the live file is missing/corrupt.
 */

import { readFile, writeFile, mkdir, rename, copyFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { EngineConfig } from "./config.js";
import { defaultConfig } from "./config.js";

const DEFAULT_PATH = process.env.CONFIG_PATH ?? "/var/lib/audio-dmx-engine/config.json";

/** Parse + shallow-merge over defaults. Returns null if invalid (bad JSON or
 *  no fixtures array — a config missing its fixtures is treated as corrupt so
 *  we fall back to the backup instead of silently losing the addresses). */
function tryParse(raw: string): EngineConfig | null {
  try {
    const stored = JSON.parse(raw);
    const cfg = { ...defaultConfig, ...stored } as EngineConfig;
    if (!Array.isArray(cfg.fixtures)) return null;
    return cfg;
  } catch {
    return null;
  }
}

export async function loadConfig(path = DEFAULT_PATH): Promise<EngineConfig> {
  // Try the live file, then the backup — so a corrupt/half-written main file
  // never costs the operator their fixture addresses.
  for (const p of [path, `${path}.bak`]) {
    try {
      const cfg = tryParse(await readFile(p, "utf8"));
      if (cfg) {
        if (p !== path) console.warn(`[persist] main config unreadable — restored from ${p}`);
        return cfg;
      }
      console.error(`[persist] ${p} present but invalid — trying fallback`);
    } catch {
      /* missing → try next */
    }
  }
  console.warn("[persist] no valid config found — using built-in defaults");
  return { ...defaultConfig };
}

let saveTimer: NodeJS.Timeout | null = null;

export function scheduleSave(cfg: EngineConfig, path = DEFAULT_PATH, delayMs = 500) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await mkdir(dirname(path), { recursive: true });
      // Strip transient fields (identify/flash overrides) from the persisted copy.
      const { identify: _omit, flashUntil: _omit2, beat: _omit3, ...persist } = cfg;
      const data = JSON.stringify(persist, null, 2);
      // Atomic replace: write temp, keep the prior good file as .bak, then
      // rename over the live file. rename() is atomic on the same filesystem,
      // so a reader (or a power loss) never sees a half-written config.
      const tmp = `${path}.tmp`;
      await writeFile(tmp, data, "utf8");
      await copyFile(path, `${path}.bak`).catch(() => {});   // first save has no prior — ignore
      await rename(tmp, path);
    } catch (e) {
      console.error("[persist] save failed:", e);
    }
  }, delayMs);
}
