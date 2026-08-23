const { Analyser } = await import("../dist/analyser.js");
const { defaultConfig } = await import("../dist/config.js");
const RATE=48000,HOP=128; const cfg=JSON.parse(JSON.stringify(defaultConfig));
const an=new Analyser(cfg); an.setGainLock(true,1);
const bpm=128,beat=60/bpm,buf=new Float32Array(HOP); let t=0; const v=[]; let clip=0;
for(let hop=0;hop<Math.floor(60*RATE/HOP);hop++){
 for(let i=0;i<HOP;i++,t++){const tt=t/RATE,ph=(tt%beat)/beat,e8=(tt%(beat/2))/(beat/2);
  const kE=Math.exp(-ph*beat*25),hE=Math.exp(-e8*beat*90)*0.7;
  buf[i]=0.6*kE*Math.sin(2*Math.PI*58*tt)+0.25*hE*(Math.random()*2-1)+0.25*Math.sin(2*Math.PI*330*tt)*(0.6+0.4*Math.sin(tt))+0.01*(Math.random()*2-1);}
 an.setVirtualClock(hop*HOP/RATE*1000); const f=an.process(buf);
 if(hop>400){v.push(f.flux); if(f.flux>=0.999)clip++;}}
v.sort((a,b)=>a-b); const p=q=>v[Math.floor(q*(v.length-1))].toFixed(3);
console.log("flux p50/p90/p99/max:",p(0.5),p(0.9),p(0.99),v[v.length-1].toFixed(3),"klipp:",(100*clip/v.length).toFixed(2)+"%");
