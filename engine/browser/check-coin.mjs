/* El sorteo debe poder darte el primer turno o dárselo al rival,
   y en el segundo caso el bot debe jugar el turno 1 sin preguntarte. */
import { readFileSync, writeFileSync } from "node:fs";
import { installDOM } from "./domstub.mjs";
const forzar = Number(process.argv[2]);      // 0.1 = empiezas tú · 0.9 = empieza el rival
installDOM();
global.localStorage={ getItem:()=>null, setItem(){} };
let primera=true;
const real=Math.random;
Math.random=()=>{ if(primera){ primera=false; return forzar; } return real(); };
const html=readFileSync("./out/goat.html","utf-8");
writeFileSync("./out/_coin.mjs", html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
console.warn=()=>{};
await import("./out/_coin.mjs");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(1200);
const coin=document.getElementById("coin");
const textoMoneda=String(coin.innerHTML).replace(/<[^>]+>/g," ").trim();
await sleep(5200);
const hud=String(document.getElementById("turnInfo").innerHTML).replace(/<[^>]+>/g,"").trim();
console.log(`forzando ${forzar}:`);
console.log(`  overlay del sorteo: "${textoMoneda}"`);
console.log(`  HUD tras el reparto: "${hud}"`);
