// FALSK spi-device: open/setOptions/transfer lyckas, callbacken direkt (ringens tick allokerar som pa Pi:n).
const dev = { setOptions(o, cb) { cb?.(null); return dev; }, transfer(msg, cb) { cb?.(null, msg); return dev; }, close(cb) { cb?.(null); } };
export function open(bus, d, cb) { setTimeout(() => cb?.(null), 1); return dev; }
export default { open };
