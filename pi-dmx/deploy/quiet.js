// LOGGBRYTAREN (2026-10-04, samma som lotus PUT /api/debug/verbose): console.log/info tysta som standard (DMX_QUIET != '0',
// agaren 09-27 "inaktivera logg tills vi sager att vi ska kolla nagot") men nu omslagbar under drift utan omstart.
// Periodiska diagnosrader fragar isLogOn() sa strangarna inte ens byggs nar loggen ar av. console.warn/error gar alltid igenom.
const origLog = console.log, origInfo = console.info;
let on = false;
export function isLogOn() { return on; }
export function setLogOn(v) {
    on = v;
    console.log = v ? origLog : () => { };
    console.info = v ? origInfo : () => { };
}
setLogOn(process.env.DMX_QUIET === '0');
if (!on)
    console.warn('[quiet] console.log avstangd (DMX_QUIET=1) - PUT /api/debug/verbose {"enabled":true} slar pa');
