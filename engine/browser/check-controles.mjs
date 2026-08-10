/* Los controles de turno tienen que APARECER cuando te toca decidir. */
import { readFileSync, writeFileSync } from "node:fs";
import { installDOM } from "./domstub.mjs";
installDOM();
/* Las comprobaciones buscan los textos en español, así que se fuerza
   ese idioma: el juego arranca en inglés por defecto. */
global.localStorage={getItem:k=>k==="goatConfig"?'{"idioma":"es"}':null,setItem(){}};
let primera=true; const real=Math.random;
Math.random=()=>{ if(primera){primera=false; return 0.1;} return real(); };  // empiezas tú
const html=readFileSync("./out/goat.html","utf-8");
writeFileSync("./out/_ctl.mjs", html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
console.warn=()=>{};
await import("./out/_ctl.mjs");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(300);
const coin=document.getElementById("coin");
document.getElementById("mJugar").onclick?.();
await sleep(900);
console.log("═══ SORTEO Y CONTROLES ═══");
console.log("carga oculta durante el sorteo:", document.getElementById("boot").style.display==="none" ? "✓":"✗");
console.log("moneda visible:", coin.style.display==="flex" ? "✓":"✗",
            "· texto:", String(coin.innerHTML).replace(/<[^>]+>/g," ").trim().slice(0,30));
await sleep(11000);
const ctl=document.getElementById("controles");
const bf=document.getElementById("btnFase"), bt=document.getElementById("btnFin");
console.log("controles visibles en tu Main Phase:", ctl.style.display==="flex" ? "✓":"✗");
console.log("  botón de fase:", bf.style.display, "· texto:",
            document.getElementById("btnFaseTxt").textContent);
console.log("  botón de fin:", bt.style.display, "· con manejador:", typeof bt.onclick==="function"?"✓":"✗");
// pasar a Battle Phase con el botón verde
// pasamos turno con el botón y esperamos a un turno con Battle Phase
for(let i=0;i<6;i++){
  if(typeof bt.onclick==="function" && bt.style.display==="flex"){ bt.onclick(); }
  await sleep(3000);
  if(bf.style.display==="flex"){
    console.log("\nen un turno con Battle Phase disponible:");
    console.log("  botón de fase visible ✓ · texto:", document.getElementById("btnFaseTxt").textContent);
    bf.onclick();
    await sleep(3000);
    console.log("  tras pulsarlo →", String(document.getElementById("turnInfo").innerHTML).replace(/<[^>]+>/g,"").trim());
    console.log("  ahora el botón dice:", document.getElementById("btnFaseTxt").textContent,
                "· fin visible:", document.getElementById("btnFin").style.display);
    break;
  }
}
