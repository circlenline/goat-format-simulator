/* Comprobación dirigida del fallo de Call of the Haunted:
   ¿se te ofrece la ventana de respuesta durante el turno RIVAL? */
import { readFileSync, writeFileSync } from "node:fs";
import { installDOM } from "./domstub.mjs";
installDOM();
/* Las etiquetas que busca están en español y el juego arranca en
   inglés: se fuerza el idioma. Y desde que hay menú, el duelo no
   empieza solo: hay que pulsar "Empezar duelo". */
global.localStorage={getItem:k=>k==="goatConfig"?'{"idioma":"es"}':null,setItem(){}};
const html=readFileSync("./out/goat.html","utf-8");
writeFileSync("./out/_extracted.mjs", html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
console.warn=()=>{};
await import("./out/_extracted.mjs");
await new Promise(r=>setTimeout(r,300));
document.getElementById("mJugar").onclick?.();
await new Promise(r=>setTimeout(r,2500));
const p=document.getElementById("prompt"), turn=document.getElementById("turnInfo");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let enTurnoRival=0, total=0; const rivalTitles=new Set();
for(let i=0;i<300;i++){
  await sleep(90);
  if(p.style.display!=="block") continue;
  const title=String(p.innerHTML).replace(/<[^>]+>/g," ").trim();
  const rival=/TURNO RIVAL/.test(String(turn.innerHTML));
  if(rival) rivalTitles.add(title.slice(0,46));
  total++; if(rival) enTurnoRival++;
  const btns=p.children[p.children.length-1]?.children??[]; if(!btns.length) break;
  const labels=[...btns].map(b=>b.textContent);
  let k=-1;
  if(/Todas las acciones/.test(title)){
    // prioridad: colocar trampas/mágicas tapadas para tener con qué responder
    k=labels.findIndex(l=>/^Colocar tapada/.test(l));
    if(k<0) k=labels.findIndex(l=>/^Invocar /.test(l));
    if(k<0) k=labels.findIndex(l=>/Terminar turno|Battle Phase/.test(l));
  } else if(/Main Phase/.test(title) && labels.some(l=>/Ver todas/.test(l))){
    k=labels.findIndex(l=>/Ver todas/.test(l));
  } else {
    k=labels.findIndex(l=>/Encadenar/.test(l));      // si podemos responder, respondemos
    if(k<0) k=labels.findIndex(l=>/Terminar turno|Battle Phase|No responder|^Sí$|^Confirmar/.test(l));
  }
  if(k<0) k=labels.length-1;
  p.style.display="none"; btns[k].onclick?.();
}
console.log("decisiones ofrecidas al jugador:", total);
console.log("  de ellas, durante el TURNO RIVAL:", enTurnoRival);
if(rivalTitles.size) console.log("  qué te preguntó:", [...rivalTitles].slice(0,5));
console.log(enTurnoRival>0
  ? "  ✓ el juego SÍ te da ventana de respuesta en el turno del rival"
  : "  ✗ nunca te pregunta en el turno rival — el fallo seguiría ahí");
