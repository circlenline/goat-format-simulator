import { readFileSync, writeFileSync } from "node:fs";
import { installDOM } from "./domstub.mjs";
installDOM();
/* Las comprobaciones buscan los textos en español, así que se fuerza
   ese idioma: el juego arranca en inglés por defecto. */
global.localStorage={getItem:k=>k==="goatConfig"?'{"idioma":"es"}':null,setItem(){}};
const h=readFileSync("./out/goat.html","utf-8");
writeFileSync("./out/_gal.mjs", h.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
console.warn=()=>{};
await import("./out/_gal.mjs");
await new Promise(r=>setTimeout(r,400));
document.getElementById("irJugar").onclick?.();
await new Promise(r=>setTimeout(r,200));
const g=document.getElementById("mGaleria");
console.log("═══ GALERÍA DE MAZOS ═══");
console.log("tarjetas:", g.children.length);
const conImagen=[...g.children].filter(c=>/cards_cropped/.test(String(c.innerHTML))).length;
console.log("con imagen de portada:", conImagen);
const nombres=[...g.children].map(c=>(String(c.innerHTML).match(/class="mzn">([^<]*)</)||[])[1]).filter(Boolean);
console.log("ejemplos:", nombres.slice(0,4).join(" · "));
console.log("Chaos Control lleva Black Luster Soldier:",
  /72989440|504700118/.test(String([...g.children].find(c=>/Chaos Control/.test(String(c.innerHTML)))?.innerHTML||""))?"✓":"(otra carta)");
