/**
 * Persists the runtime config to /var/lib/audio-dmx-engine/config.json so
 * fixture changes survive reboots. Debounced saves — no thrashing when the
 * user drags sliders.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { EngineConfig } from "./config.js";
import { defaultConfig } from "./config.js";

const DEFAULT_PATH = process.env.CONFIG_PATH ?? "/var/lib/audio-dmx-engine/config.json";

export async function loadConfig(path = DEFAULT_PATH): Promise<EngineConfig> {
  try {
    const raw = await readFile(path, "utf8");
    const stored = JSON.parse(raw);
    // Shallow-merge over defaults so new fields added later just work.
    return { ...defaultConfig, ...stored };
  } catch {
    return { ...defaultConfig };
  }
}

let saveTimer: NodeJS.Timeout | null = null;

export function scheduleSave(cfg: EngineConfig, path = DEFAULT_PATH, delayMs = 500) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await mkdir(dirname(path), { recursive: true });
      // Strip transient fields (identify/flash overrides) from the persisted copy.
      const { identify: _omit, flashUntil: _omit2, ...persist } = cfg;
      await writeFile(path, JSON.stringify(persist, null, 2), "utf8");
    } catch (e) {
      console.error("[persist] save failed:", e);
    }
  }, delayMs);
}
