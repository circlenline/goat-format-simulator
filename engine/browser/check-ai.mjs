/* La IA debe estar viva DENTRO del HTML, no solo en los tests. */
import { readFileSync, writeFileSync } from "node:fs";
import { installDOM } from "./domstub.mjs";
installDOM();
global.localStorage={ getItem:()=>null, setItem(){} };
const html=readFileSync("./out/goat.html","utf-8");
writeFileSync("./out/_extracted.mjs", html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
console.warn=()=>{};
await import("./out/_extracted.mjs");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(2500);
const sel=document.getElementById("selNivel");
console.log("═══ IA EN EL HTML ═══");
console.log("selector de dificultad:", (sel.innerHTML.match(/value="(\w+)"/g)||[]).join(" "));
const p=document.getElementById("prompt");
let clics=0;
for(let i=0;i<260;i++){
  await sleep(80);
  if(p.style.display!=="block") continue;
  const t=String(p.innerHTML).replace(/<[^>]+>/g," ").trim();
  const btns=p.children[p.children.length-1]?.children ?? [];
  if(!btns.length) continue;
  const L=[...btns].map(b=>b.textContent);
  let k=-1;
  if(/Todas las acciones/.test(t)) k=L.findIndex(x=>/Colocar tapada|^Invocar |Terminar turno/.test(x));
  else if(L.some(x=>/Ver todas/.test(x))) k=L.findIndex(x=>/Ver todas/.test(x));
  else k=L.findIndex(x=>/Terminar turno|Battle Phase|^Sí|^Confirmar|No responder/.test(x));
  if(k<0) k=L.length-1;
  p.style.display="none"; btns[k].onclick?.(); clics++;
}
// el log guarda las decisiones razonadas de la IA
document.getElementById("btnLog").onclick=document.getElementById("btnLog").onclick;
console.log("decisiones humanas simuladas:", clics);
console.log("turno alcanzado:", String(document.getElementById("turnInfo").innerHTML).replace(/<[^>]+>/g,"").trim());
