/** HYRKITET (11-02, två stativ x 4 PAR = en rad på 8): effekter som tänder EN lampa i taget (eller räknar platser runt riggen) körs på
 *  8+ lampor över 4 platser om n/4 grannlampor, så mönstret sveper rummet i samma takt och täthet som på ladans 4 (effectDyn mega 4 -> 8
 *  utan detta: virvel takt 0,35 -> 0,23, glimt rum 0,47 -> 0,23). Under 8 lampor = 1 och räkningen är densamma som förut. */
export const slotSize = (n: number) => n >= 8 ? Math.floor(n / 4) : 1;
