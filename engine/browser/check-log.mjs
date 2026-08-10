import { readFileSync, writeFileSync } from "node:fs";
import { installDOM } from "./domstub.mjs";
installDOM();
/* Esta comprobación llevaba tiempo rota por dos motivos y nadie se
   enteraba: (1) desde que hay menú, el duelo no arranca solo — hay que
   pulsar "Empezar duelo"; (2) el panel tiene ahora una línea de fase
   delante, así que los botones ya no están en el primer hijo. */
global.localStorage={getItem:k=>k==="goatConfig"?'{"idioma":"es"}':null,setItem(){}};
// capturamos la descarga sin navegador
let captured=null;
global.Blob = class { constructor(parts){ this.text=parts.join(""); captured=this.text; } };
URL.createObjectURL = () => "blob:fake";   // no sustituimos URL: emscripten la usa
const html=readFileSync("./out/goat.html","utf-8");
writeFileSync("./out/_extracted.mjs", html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
console.warn=()=>{};
await import("./out/_extracted.mjs");
await new Promise(r=>setTimeout(r,300));
document.getElementById("mJugar").onclick?.();      // arranca el duelo
await new Promise(r=>setTimeout(r,2500));
const b=document.getElementById("boot"); if(String(b.innerHTML).includes("Error")) console.log("BOOT ERROR:", String(b.innerHTML).replace(/<[^>]+>/g,"").slice(0,400));
const p=document.getElementById("prompt"); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<120;i++){
  await sleep(90);
  if(p.style.display!=="block") continue;
  const title=String(p.innerHTML).replace(/<[^>]+>/g," ").trim();
  const btns=p.children[p.children.length-1]?.children??[]; if(!btns.length) break;
  const labels=[...btns].map(b=>b.textContent);
  let k=-1;
  if(/Todas las acciones/.test(title)){ k=labels.findIndex(l=>/^Colocar tapada|^Invocar /.test(l));
    if(k<0) k=labels.findIndex(l=>/Terminar turno|Battle Phase/.test(l)); }
  else if(labels.some(l=>/Ver todas/.test(l))) k=labels.findIndex(l=>/Ver todas/.test(l));
  else k=labels.findIndex(l=>/Terminar turno|Battle Phase|No responder|^Sí$|^Confirmar/.test(l));
  if(k<0) k=labels.length-1;
  p.style.display="none"; btns[k].onclick?.();
}
const bl=document.getElementById("btnLog");
if(typeof bl.onclick!=="function"){ console.log("✗ el duelo no llegó a arrancar"); process.exit(1); }
bl.onclick();
console.log("═══ MUESTRA DEL LOG DESCARGABLE ═══");
console.log(captured ? captured.split("\n").slice(0,10).join("\n") : "(no se generó)");
console.log("…");
const lines=(captured||"").split("\n");
console.log(lines.slice(12,24).map(l=>l.slice(0,150)).join("\n"));
console.log(`\ntotal de líneas: ${lines.length}`);
const ok = lines.length>20 && /semilla:/.test(captured||"") && /te_pregunta|tú_eliges|evento/.test(captured||"");
console.log(ok ? "\n✓ el log sale con contenido y con la semilla" : "\n✗ el log salió vacío o incompleto");
process.exit(ok?0:1);
