/**
 * WS2812B LED-ring (Electrokit 12-LED, 40 mm) → visuell återkoppling för vredet.
 *
 * Varför SPI (GPIO10 MOSI, pin 19) och inte den vanliga PWM-metoden (GPIO18)?
 * Codec Zero använder I²S på GPIO18–21 → PWM0/PCM krockar med ljudet. SPI0 är
 * ledig och kan bit-banga WS2812:s 800 kHz-protokoll deterministiskt genom
 * att köra SPI @ 2.4 MHz och koda varje LED-bit som 3 SPI-bitar:
 *   WS2812 "0" = 0b100      (T0H ≈ 0.42 µs, T0L ≈ 0.83 µs)
 *   WS2812 "1" = 0b110      (T1H ≈ 0.83 µs, T1L ≈ 0.42 µs)
 * Toleransen på riktiga WS2812B är ±150 ns → ligger komfortabelt inom spec.
 *
 * Visualisering:
 *  - Antal tända LEDs = round(intensity * 12), delvis-tänd sista LED för smooth
 *  - Färg lerp:  chill (kall cyan)  →  fest (varm orange)  →  galet (röd)
 *  - Beat-puls: +18% ljusstyrka på `beat`-frame, ebbar ut på ~150 ms
 *  - Blackout-läge: helt släckt
 *  - Master-clamp: 40% av full brightness (5V-drift, håller strömmen låg och
 *    hindrar färgen från att blekas till vitt vid full styrka)
 */

import SPI from "spi-device";

const N_LEDS = 12;
const SPI_SPEED_HZ = 2_400_000;   // 2.4 MHz → 3 SPI-bitar = 1 WS2812-bit @ 800 kHz
const RESET_BYTES = 42;           // ~140 µs låg-linje (>50 µs krav) mellan frames

// 3-bit-mönster för varje WS2812-bit → förberäknad LUT byte→9-bit
// (för en full byte returnerar vi 3 SPI-bytes).
const BIT0 = 0b100;
const BIT1 = 0b110;

/** Koda en byte (8 bitar) → 3 SPI-bytes (24 bitar). */
function encodeByte(v: number, out: Uint8Array, offset: number) {
  // 24-bit register: högsta biten först
  let reg = 0;
  for (let i = 7; i >= 0; i--) reg = (reg << 3) | ((v >> i) & 1 ? BIT1 : BIT0);
  out[offset]     = (reg >> 16) & 0xff;
  out[offset + 1] = (reg >> 8) & 0xff;
  out[offset + 2] = reg & 0xff;
}

// Färgankare (RGB 0..255) — matchar mood-anchors i moods.ts.
const CHILL: [number, number, number] = [10, 120, 200];    // sval cyan/blå
const FEST:  [number, number, number] = [255, 140, 20];    // varm orange
const GALET: [number, number, number] = [255, 25, 25];     // röd
const MAX_BRIGHT = 0.40;    // 40% ceiling — se doc-kommentar

function lerpColor(x: number): [number, number, number] {
  // 0..0.5 → chill→fest, 0.5..1 → fest→galet
  const [a, b] = x < 0.5 ? [CHILL, FEST] : [FEST, GALET];
  const t = x < 0.5 ? x * 2 : (x - 0.5) * 2;
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export interface KnobRingOptions {
  bus?: number;     // default 0 (SPI0)
  device?: number;  // default 0 (CE0 — vi använder ändå bara MOSI)
  fps?: number;     // default 30
}

export interface RingState {
  intensity: number;     // 0..1
  blackout: boolean;
  beat: boolean;         // en-frame-puls från analysern
}

export class KnobRing {
  private spi: SPI.SpiDevice | null = null;
  private timer: NodeJS.Timeout | null = null;
  private txBuf: Uint8Array;
  private state: RingState = { intensity: 0.5, blackout: false, beat: false };
  private beatPulse = 0;   // 0..1, avklingar

  constructor(private opts: KnobRingOptions = {}) {
    // Layout: [reset låg] [N_LEDS * 3 färgbytes * 3 SPI-bytes] [reset låg]
    this.txBuf = new Uint8Array(RESET_BYTES + N_LEDS * 3 * 3 + RESET_BYTES);
  }

  start() {
    const bus = this.opts.bus ?? 0;
    const dev = this.opts.device ?? 0;
    this.spi = SPI.open(bus, dev, (err: Error | null) => {
      if (err) { console.error("[ring] spi open failed:", err.message); this.spi = null; return; }
      this.spi!.setOptions({ mode: SPI.MODE0, maxSpeedHz: SPI_SPEED_HZ, bitsPerWord: 8 }, (e: Error | null) => {
        if (e) console.error("[ring] spi setOptions:", e.message);
      });
    });
    const interval = Math.round(1000 / (this.opts.fps ?? 30));
    this.timer = setInterval(() => this.tick(), interval);
  }

  /** Anropas från motor-loopen: mata in senaste tillstånd. `beat` = true bara
   *  den frame slaget föll (mock-UI:t skickar samma en-frame-puls). */
  update(s: Partial<RingState>) {
    if (s.intensity !== undefined) this.state.intensity = Math.max(0, Math.min(1, s.intensity));
    if (s.blackout !== undefined) this.state.blackout = s.blackout;
    if (s.beat) this.beatPulse = 1;
  }

  private tick() {
    if (!this.spi) return;
    // Beat-avklingning: exp(-dt/tau), tau ≈ 150 ms, tick ≈ 33 ms
    this.beatPulse *= 0.80;
    if (this.beatPulse < 0.01) this.beatPulse = 0;

    const { intensity, blackout } = this.state;
    const [r, g, b] = blackout ? [0, 0, 0] : lerpColor(intensity);
    const litFloat = blackout ? 0 : intensity * N_LEDS;
    const litFull = Math.floor(litFloat);
    const partial = litFloat - litFull;

    // Global brightness: intensity ↗ → ökar (0.35 vid chill, 1.0 vid galet) × MAX_BRIGHT,
    // plus beat-puff +18%.
    const bright = MAX_BRIGHT * (0.35 + 0.65 * intensity) * (1 + 0.18 * this.beatPulse);

    let off = RESET_BYTES;
    for (let i = 0; i < N_LEDS; i++) {
      let scale: number;
      if (blackout) scale = 0;
      else if (i < litFull) scale = 1;
      else if (i === litFull) scale = partial;
      else scale = 0;
      const k = scale * bright;
      // WS2812 wire order är GRB
      encodeByte(Math.round(g * k), this.txBuf, off);     off += 3;
      encodeByte(Math.round(r * k), this.txBuf, off);     off += 3;
      encodeByte(Math.round(b * k), this.txBuf, off);     off += 3;
    }

    const msg: SPI.SpiMessage = [{
      byteLength: this.txBuf.length,
      sendBuffer: Buffer.from(this.txBuf.buffer, this.txBuf.byteOffset, this.txBuf.byteLength),
      speedHz: SPI_SPEED_HZ,
    }];
    this.spi.transfer(msg, (err: Error | null) => {
      if (err) console.error("[ring] spi tx:", err.message);
    });
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    // Släck ringen mjukt vid avslut
    this.state.blackout = true;
    this.tick();
    setTimeout(() => this.spi?.close(() => {}), 50);
  }
}
