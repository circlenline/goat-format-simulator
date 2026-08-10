/* El sorteo debe fijar el lado ANTES de construir el tablero y la IA.
   Si no, acabas con el punto de vista cruzado y la IA jugando tu sitio. */
import { readFileSync, writeFileSync } from "node:fs";
import { installDOM } from "./domstub.mjs";
const forzar=Number(process.argv[2]);
installDOM();
/* Las comprobaciones buscan los textos en español, así que se fuerza
   ese idioma: el juego arranca en inglés por defecto. */
global.localStorage={getItem:k=>k==="goatConfig"?'{"idioma":"es"}':null,setItem(){}};
let primera=true; const real=Math.random;
Math.random=()=>{ if(primera){primera=false; return forzar;} return real(); };
const html=readFileSync("./out/goat.html","utf-8");
writeFileSync("./out/_lado.mjs", html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
console.warn=()=>{};
await import("./out/_lado.mjs");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(300);
document.getElementById("mJugar").onclick?.();
await sleep(6500);
const hud=String(document.getElementById("turnInfo").innerHTML).replace(/<[^>]+>/g,"").trim();
const p=document.getElementById("prompt");
const tit=String(p.innerHTML).replace(/<[^>]+>/g," ").trim().slice(0,44);
console.log(`Math.random=${forzar} → ${forzar<0.5?"empiezas tú":"empieza el rival"}`);
console.log(`  HUD: ${hud}`);
console.log(`  panel: ${p.style.display==="block" ? '"'+tit+'"' : "(oculto, juega la IA)"}`);
const coherente = forzar<0.5 ? /TU TURNO/.test(hud) : /TURNO RIVAL/.test(hud);
console.log(`  ${coherente ? "✓ el lado y el turno concuerdan" : "✗ punto de vista cruzado"}`);
