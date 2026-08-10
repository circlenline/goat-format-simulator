/* Comprobaciones de los cambios visuales sobre el HTML ya construido. */
import { readFileSync } from "node:fs";
const html=readFileSync("./out/goat.html","utf-8");
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const js =html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const c=[
 ["la carta es la imagen (sin marco propio)", /\.face\.front\{padding:0;border:none/.test(css.replace(/\s*\n\s*/g,""))],
 ["respaldo visible solo si la imagen no carga", /hasimg \.fallback\{opacity:0\}/.test(css.replace(/\s*\n\s*/g,""))],
 ["reverso con tu imagen incrustada", /CARD_BACK = "data:image\/jpeg;base64,/.test(js) && /face back"><img src="\$\{CARD_BACK\}|face back"><img src="/.test(js)],
 ["el reverso ya no usa el óvalo dibujado", /\.face\.back::after\{content:none\}/.test(css.replace(/\s*\n\s*/g,""))],
 ["cartel de fase", /#phasecard/.test(css) && /function announcePhase/.test(js) && /phasecard/.test(html)],
 ["fases anunciadas con nombre", /Standby Phase/.test(js) && /Battle Phase/.test(js)],
 ["iconos en el menú de acciones", /class="cico"/.test(js) && /icon:"⚔"/.test(js)],
 ["animación de daño reforzada", /rotate\(-8deg\)/.test(css)],
 ["pulso en cartas jugables", /playablePulse/.test(css)],
 ["sacudida al recibir impacto", /cubic-bezier\(\.36,\.07,\.19,\.97\)/.test(css.replace(/\s/g,""))],
];
let ok=0; for(const [t,v] of c){ console.log(v?"  ✓":"  ✗",t); if(v) ok++; }
const kb=Math.round(html.length/1024);
console.log(`\n${ok}/${c.length} · tamaño del HTML: ${kb} KB`);
