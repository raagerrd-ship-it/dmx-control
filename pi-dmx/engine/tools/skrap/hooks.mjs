// Loader-krok for skrapbanken: spi-device (WS2812-ringen, nativ) -> fakeSpi.mjs.
const FAKE_SPI = new URL('./fakeSpi.mjs', import.meta.url).href;
export async function resolve(specifier, context, next) {
  if (specifier === 'spi-device') return { url: FAKE_SPI, shortCircuit: true };
  return next(specifier, context);
}
