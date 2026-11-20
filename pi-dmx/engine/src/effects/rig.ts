/** HYRKITET (11-02, två stativ x 4 PAR = en rad på 8): effekter som tänder EN lampa i taget (eller räknar platser runt riggen) körs på
 *  8+ lampor över 4 platser om n/4 grannlampor, så mönstret sveper rummet i samma takt och täthet som på ladans 4 (effectDyn mega 4 -> 8
 *  utan detta: virvel takt 0,35 -> 0,23, glimt rum 0,47 -> 0,23). Under 8 lampor = 1 och räkningen är densamma som förut. */
/** 1AN-3AN-STILEN (ägaren 11-19): det en effekt gör på taktens etta gör trean på andra halvan - förväxlas 1 och 3 byter bara halvorna plats. */
export const halva = (lamp: number, n: number) => n < 2 ? -1 : lamp < n / 2 ? 0 : 1;
export const ettaTrea = (beatIdx: number, g: number) => { const b = ((beatIdx % 4) + 4) % 4; return g < 0 ? b === 0 || b === 2 : b === 2 * g; };
/** VÄXELN (1an-3an 11-20) för effekter som växlar två grupper varje slag: grupp 0 på 1 och 4, grupp 1 på 2 och 3 - ettan och trean på olika lampor. */
export const vaxel = (beatIdx: number) => (beatIdx ^ (beatIdx >> 1)) & 1;
export const slotSize = (n: number) => n >= 8 ? Math.floor(n / 4) : 1;
