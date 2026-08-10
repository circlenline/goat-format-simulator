/* Menú de tres pantallas + slots de mazos compartidos con el builder. */
import { readFileSync, writeFileSync } from "node:fs";
import { installDOM } from "./domstub.mjs";
installDOM();
// simulamos un mazo guardado desde el deck builder
const guardados=[{nombre:"Chaos Turbo de prueba", main:new Array(40).fill(14087893),
                  extra:[], side:[], valido:true}];
const store={ goatDecks:JSON.stringify(guardados) };
global.localStorage={ getItem:k=>store[k]??null, setItem:(k,v)=>{store[k]=v} };
const html=readFileSync("./out/goat.html","utf-8");
writeFileSync("./out/_menu.mjs", html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
console.warn=()=>{};
await import("./out/_menu.mjs");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(400);
const P={home:"pHome",jugar:"pJugar",opciones:"pOpciones"};
console.log("═══ MENÚ ═══");
const vis=Object.entries(P).filter(([k,id])=>document.getElementById(id).hidden===false).map(([k])=>k);
console.log("pantallas:", Object.keys(P).join(", "));
console.log("visible al abrir:", vis.join(",")||"(ninguna)");
document.getElementById("irJugar").onclick?.();
const vis2=Object.entries(P).filter(([k,id])=>document.getElementById(id).hidden===false).map(([k])=>k);
console.log("tras pulsar Duelo VS:", vis2.join(",")||"(ninguna)");
document.getElementById("volver1").onclick?.();
const vis3=Object.entries(P).filter(([k,id])=>document.getElementById(id).hidden===false).map(([k])=>k);
console.log("tras Volver:", vis3.join(",")||"(ninguna)");
document.getElementById("irOpciones").onclick?.();
console.log("tras Opciones:", Object.entries(P).filter(([k,id])=>!document.getElementById(id).hidden).map(([k])=>k).join(",")||"(ninguna)");
const sel=document.getElementById("mMazos");
const ops=(String(sel.innerHTML).match(/<option[^>]*>([^<]*)</g)||[]).map(s=>s.replace(/<[^>]*>/g,""));
console.log("mazos ofrecidos:", ops);
console.log("lee los slots del deck builder:", ops.some(o=>/Chaos Turbo/.test(o)) ? "✓" : "✗");
const niv=document.getElementById("mNiveles");
console.log("niveles:", (String(niv.innerHTML).match(/>([^<]+)</g)||[]).map(x=>x.slice(1,-1)).join(" "));
console.log("controles de turno:", document.getElementById("btnFase")&&document.getElementById("btnFin")?"✓":"✗");
console.log("fases en el centro:", document.getElementById("fasesCentro")?"✓":"✗");
console.log("botón Deck Builder:", document.getElementById("mDeck") ? "✓" : "✗");
