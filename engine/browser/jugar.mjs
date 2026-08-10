/* Me siento yo a jugar: reproduce el caso del log (pierdes el sorteo)
   y captura cualquier excepción que rompa el bucle. */
import { readFileSync, writeFileSync } from "node:fs";
import { installDOM } from "./domstub.mjs";
installDOM();
/* Las comprobaciones buscan los textos en español, así que se fuerza
   ese idioma: el juego arranca en inglés por defecto. */
global.localStorage={getItem:k=>k==="goatConfig"?'{"idioma":"es"}':null,setItem(){}};
let primera=true; const real=Math.random;
Math.random=()=>{ if(primera){primera=false; return 0.9; } return real(); };  // pierdes el sorteo
process.on("unhandledRejection", e=>{ console.log("\n💥 EXCEPCIÓN NO CAPTURADA:\n", e?.stack||e); });
process.on("uncaughtException",  e=>{ console.log("\n💥 EXCEPCIÓN:\n", e?.stack||e); });
const html=readFileSync("./out/goat.html","utf-8");
writeFileSync("./out/_jugar.mjs", html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
console.warn=()=>{};
await import("./out/_jugar.mjs");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(300);
// elegimos los mismos mazos del log
const s=document.getElementById("mMazos"); s.value="i2"; s.onchange?.();
const r=document.getElementById("mMazoIA"); r.value="i8"; r.onchange?.();
document.getElementById("mJugar").onclick?.();
const p=document.getElementById("prompt"), ctl=document.getElementById("controles");
let acciones=0;
for(let i=0;i<200;i++){
  await sleep(140);
  const hud=String(document.getElementById("turnInfo").innerHTML).replace(/<[^>]+>/g,"").trim();
  if(p.style.display==="block"){
    const t=String(p.innerHTML).replace(/<[^>]+>/g," ").trim();
    const btns=p.children[p.children.length-1]?.children??[];
    const L=[...btns].map(b=>b.textContent);
    let k=L.findIndex(x=>/Ver todas/.test(x));
    if(/Todas las acciones/.test(t)) k=L.findIndex(x=>/^Invocar |^Colocar |Terminar turno/.test(x));
    if(k<0) k=L.length-1;
    if(L.length){ console.log(`[${hud}] panel "${t.slice(0,34)}" → ${L[k]}`);
      p.style.display="none"; btns[k].onclick?.(); acciones++; continue; }
  }
  if(ctl.style.display==="flex"){
    const bf=document.getElementById("btnFase"), bt=document.getElementById("btnFin");
    if(bf.style.display==="flex" && acciones%3===2){ console.log(`[${hud}] botón fase`); bf.onclick?.(); acciones++; continue; }
    if(bt.style.display==="flex"){ console.log(`[${hud}] terminar turno`); bt.onclick?.(); acciones++; continue; }
  }
  if(acciones>=14) break;
}
console.log(`\nacciones hechas por mí: ${acciones}`);
console.log("estado:", String(document.getElementById("turnInfo").innerHTML).replace(/<[^>]+>/g,"").trim());
console.log("panel:", p.style.display, "· controles:", ctl.style.display);
const b=document.getElementById("boot");
const txt=String(b.innerHTML);
if(/Error/.test(txt)) console.log("\n💥 ERROR OCULTO EN LA PANTALLA DE CARGA:\n"+txt.replace(/<[^>]+>/g,"").slice(0,900));
