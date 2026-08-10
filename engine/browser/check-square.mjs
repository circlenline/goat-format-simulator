import { readFileSync } from "node:fs";
const css=readFileSync("./out/goat.html","utf-8").match(/<style>([\s\S]*?)<\/style>/)[1];
const radios=[...css.matchAll(/border-radius:\s*([^;}\n]+)/g)].map(m=>m[1].trim());
const grandes=radios.filter(r=>[...r.matchAll(/([\d.]+)px/g)].some(n=>+n[1]>3));
const redondos=[...css.matchAll(/border-radius:\s*50%/g)].length;
console.log("═══ ESQUINAS ═══");
console.log("reglas de border-radius:", radios.length);
console.log("con radio mayor de 3px:", grandes.length, grandes.slice(0,4));
console.log("círculos intencionados (50%):", redondos);
const comp=[
 ["botones rectos", /\.btn\{[^}]*border-radius:2px/.test(css.replace(/\s*\n\s*/g,""))||/#prompt,#choice,#side,#grid,\.lp,\.ph,\.btn[^{]*\{border-radius:2px\}/.test(css.replace(/\s*\n\s*/g,""))],
 ["casillas rectas", /\.slot\{border-radius:2px\}/.test(css.replace(/\s*\n\s*/g,""))],
 ["cartas casi rectas", /\.face,\.cimg,\.face\.back img,\.fallback\{border-radius:2px\}/.test(css.replace(/\s*\n\s*/g,""))],
 ["avisos ya no son pastillas", /\.toast\{border-radius:2px\}/.test(css.replace(/\s*\n\s*/g,""))],
 ["marco de tapete con bisel", /inset 0 0 0 1px rgba\(0,0,0,\.55\)/.test(css.replace(/\s/g,"").replace(/inset0001px/,"inset 0 0 0 1px"))||/inset 0 0 0 1px/.test(css)],
];
let ok=0; for(const [t,v] of comp){ console.log(v?"  ✓":"  ✗",t); if(v) ok++; }
console.log(`${ok}/${comp.length}`);
