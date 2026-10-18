// Förladdas (--import) när bänkarna körs med Node 18 (Pi:ernas version, skräpjakten 10-18): där ärvs performance.now som skrivskyddad
// egenskap från prototypen, så bänkarnas virtuella klocka (performance.now = ...) kastar. Lägg en skrivbar egen egenskap på objektet.
//   <node18>/node.exe --import file:///<engine>/tools/skrap/n18compat.mjs tools/allocProf.mjs ...
if (!Object.getOwnPropertyDescriptor(performance, "now")) Object.defineProperty(performance, "now", { value: performance.now.bind(performance), writable: true, configurable: true });
