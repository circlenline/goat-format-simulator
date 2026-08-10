import { readFileSync } from "node:fs";
const html=readFileSync("./out/goat.html","utf-8");
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const js =html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const plano=css.replace(/\s*\n\s*/g,"");
const c=[
 ["orden de la mano solo en la vista (no toca el motor)",
   /let ordenMano = \[\]/.test(js) && /function manoOrdenada/.test(js)
   && !/zones\[ME\]\[L\.HAND\]\.sort|zones\[p\]\[loc\]\.sort/.test(js)],
 ["se puede reordenar arrastrando", /function moverEnMano/.test(js) && /function indiceEnMano/.test(js)],
 ["se arrastra aunque la carta no sea jugable", /startDrag\(card, e, !!dragFilter/.test(js)],
 ["marca aparte para efectos disponibles", /function markUsable/.test(js) && /\.card\.usable \.face/.test(plano)],
 ["insignia ✦ en la carta", /className="fx"/.test(js) && /\.card \.fx\{/.test(plano)],
 ["separa mano de campo al marcar", /const enMano=new Set\(\), enCampo=new Set\(\)/.test(js)],
 ["columnas más anchas que la carta", /--colw:168px/.test(plano) && /repeat\(9,var\(--colw\)\)/.test(plano)],
 ["columna ≥ alto de carta (cabe girada)", (()=>{ const w=+(/--colw:(\d+)px/.exec(plano)?.[1]??0),
     h=+(/--ch:(\d+)px/.exec(plano)?.[1]??0); return w>=h; })()],
 ["casillas centradas en la columna", /justify-items:center/.test(plano)],
];
let ok=0; for(const [t,v] of c){ console.log(v?"  ✓":"  ✗",t); if(v) ok++; }
console.log(`\n${ok}/${c.length}`);
