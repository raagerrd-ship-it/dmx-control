/**
 * Loader för essentia.js WASM. Laddas lazy — bara när Live Analysis aktiveras.
 * WASM-binären ligger i /public/wasm/essentia-wasm.web.wasm.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let essentiaInstance: any = null;
let loadPromise: Promise<unknown> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadEssentia(): Promise<any> {
  if (essentiaInstance) return essentiaInstance;
  if (!loadPromise) {
    loadPromise = (async () => {
      // Emscripten-modulen använder locateFile för att hitta .wasm
      const wasmModule = await import("essentia.js/dist/essentia-wasm.web.js");
      const EssentiaWASM = (wasmModule as any).EssentiaWASM ?? (wasmModule as any).default;
      // Emscripten factory tar en Module-config med locateFile
      const module = await (EssentiaWASM as any)({
        locateFile: (path: string) => `${import.meta.env.BASE_URL}wasm/${path}`,
      });
      const core = await import("essentia.js/dist/essentia.js-core.es.js");
      const Essentia = (core as any).Essentia ?? (core as any).default;
      essentiaInstance = new Essentia(module);
      return essentiaInstance;
    })();
  }
  await loadPromise;
  return essentiaInstance;
}
