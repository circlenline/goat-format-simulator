/* La ventana de respuesta debe pasarse sola si no contestas. */
import { readFileSync, writeFileSync } from "node:fs";
import { installDOM } from "./domstub.mjs";
installDOM();
globalThis.GOAT_CHAIN_TIMEOUT = 1;          // 1 s para no esperar 15 en la prueba
const html=readFileSync("./out/goat.html","utf-8");
writeFileSync("./out/_extracted.mjs", html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
console.warn=()=>{};
await import("./out/_extracted.mjs");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(2500);
const p=document.getElementById("prompt");
const titulo=()=>String(p.innerHTML).replace(/<[^>]+>/g," ").trim();

let cadenasVistas=0, pasadasSolas=0, clicsDados=0; const bloqueadas=[];
for(let i=0;i<300;i++){
  await sleep(90);
  if(p.style.display!=="block") continue;
  const t=titulo();
  if(/Quieres responder/.test(t)){
    cadenasVistas++;
    // NO tocamos nada: debe resolverse sola.
    // Comparar títulos no vale (dos ventanas seguidas se llaman igual):
    // guardamos el propio nodo de botones y miramos si lo han sustituido.
    const nodo = p.children[p.children.length-1];
    await sleep(1600);
    const sigue = p.style.display==="block" && p.children.includes(nodo);
    if(!sigue) pasadasSolas++;
    else bloqueadas.push(t.slice(0,40));
    continue;
  }
  const btns=p.children[0]?.children ?? p.children[1]?.children ?? [];
  if(!btns.length) continue;
  const labels=[...btns].map(b=>b.textContent);
  let k=labels.findIndex(l=>/Terminar turno|Battle Phase|^Sí|^Confirmar/.test(l));
  if(/Todas las acciones/.test(t)) k=labels.findIndex(l=>/Colocar tapada|Terminar turno/.test(l));
  else if(labels.some(l=>/Ver todas/.test(l))) k=labels.findIndex(l=>/Ver todas/.test(l));
  if(k<0) k=labels.length-1;
  p.style.display="none"; btns[k].onclick?.(); clicsDados++;
}
console.log("═══ CUENTA ATRÁS DE CADENAS ═══");
console.log(`ventanas de respuesta encontradas: ${cadenasVistas}`);
console.log(`  que se pasaron solas sin tocar nada: ${pasadasSolas}`);
console.log(`clics dados en el resto del juego: ${clicsDados}`);
bloqueadas.slice(0,3).forEach(b=>console.log("   ✗ bloqueada:",b));
console.log(cadenasVistas===0 ? "  (no salió ninguna en la muestra)"
  : pasadasSolas===cadenasVistas ? "  ✓ todas se resolvieron solas al agotarse el tiempo"
  : "  ✗ alguna se quedó bloqueada");
