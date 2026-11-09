/** TAKTMATNINGEN bor i analysatorn sedan a7r entempo (analyserClock.ts, ordagrant flyttad). Den här filen är bara motorns och
 *  bänkarnas namn på den (import { BeatFeed } from "./beatFeed.js") + DMX:s loggbrytare in i klockan. */
import { isLogOn } from "./quiet.js";
import { setClockLog } from "./analyserClock.js";
export { BeatFeed } from "./analyserClock.js";
setClockLog(isLogOn);
