import { readFileSync } from "node:fs";
const html=readFileSync("./out/goat.html","utf-8");
const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\s*\n\s*/g,"");
const c=[
 ["solo se dibujan las cartas de arriba del montón", /desdeArriba > 3 \? "none"/.test(js)],
 ["las de debajo no proyectan sombra", /\.card\.apilada \.face\{box-shadow:0 0 0 1px/.test(css)],
 ["se recupera la visibilidad al salir del montón", /if\(el\.style\.display==="none"\) el\.style\.display=""/.test(js)],
];
let ok=0; for(const [t,v] of c){ console.log(v?"  ✓":"  ✗",t); if(v) ok++; }
console.log(`${ok}/${c.length}`);
