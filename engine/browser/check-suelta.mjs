/* Fricción de juego, tanda de agosto:
   - la carta soltada se queda en la casilla mientras eliges (previa)
   - zonas de clic generosas: la carta entera y la casilla debajo
   - contadores de montón siempre visibles (el del mazo rival no salía)
   - botón de rendirse con confirmación
   Cada punto se comprueba sobre el HTML REAL y, el de rendirse, jugando. */
import { readFileSync, writeFileSync } from "node:fs";
import { installDOM } from "./domstub.mjs";
const html=readFileSync("./out/goat.html","utf-8");
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\s*\n\s*/g,"");
const js =html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];

const c=[
 ["la suelta deja la carta en la casilla",
   /function previaSuelta/.test(js) && /previaSuelta\(d\.card\.uid/.test(js)],
 ["cancelar la devuelve a la mano",
   /function quitarPrevia/.test(js) && /cancelarSuelta\(\)/.test(js)],
 ["mientras está posada no cuenta como carta de mano",
   /classList\.toggle\("in-hand", loc===L\.HAND && mine && !enPrevia\)/.test(js)],
 ["al responder al motor se suelta la previa", /V\.quitarPrevia\(false\)/.test(js)],
 ["estilo de carta posándose", /\.card\.colocando \.face\{/.test(css)],

 ["zona de clic mayor que la carta", /\.card::before\{inset:-15px\}/.test(css)],
 ["en la mano el margen es menor (no se roban el clic)", /\.card\.in-hand::before\{/.test(css)],
 ["la casilla también recoge el clic", /classList\.add\("hitzona"\)/.test(js)
   && /\.slot\.hitzona::before\{/.test(css)],
 ["la casilla resuelve qué carta hay encima", /const c = DUEL\?\.zones\?\.\[owner\]\?\.\[loc\]\?\.\[i\]/.test(js)],

 ["las cartas del montón no capturan el ratón",
   /classList\.toggle\("enMonton"/.test(js) && /\.card\.enMonton\{pointer-events:none\}/.test(css)],
 ["contador de montón visible sin pasar el ratón",
   /\.slot\.contable\.conCartas::before\{display:grid\}/.test(css)],

 ["fuera de la Main Phase no se arrastra (clic limpio)",
   /arrastrable=!!arrastre/.test(js) && /if\(arrastrable && card\.location===L\.HAND/.test(js)],
 ["la Main Phase sí arma el arrastre", /arrastre: true,/.test(js)],

 ["botón de rendirse en la barra", /id="btnRendirse"/.test(html)],
 ["rendirse pasa por confirmación", /function confirmar/.test(js)
   && /V\.confirmar\("¿Seguro que quieres rendirte\?"/.test(js)],
 ["rendirse detiene el bucle", /if\(rendido\) return;/.test(js) && /function rendirse/.test(js)],
];
console.log("═══ FRICCIÓN DE JUEGO ═══");
let ok=0; for(const [t,v] of c){ console.log(v?"  ✓":"  ✗",t); if(v) ok++; }
console.log(`${ok}/${c.length}`);

/* ── y ahora jugando de verdad: el botón abre el modal y termina el duelo ── */
installDOM();
/* Las comprobaciones buscan los textos en español, así que se fuerza
   ese idioma: el juego arranca en inglés por defecto. */
global.localStorage={getItem:k=>k==="goatConfig"?'{"idioma":"es"}':null,setItem(){}};
let primera=true; const real=Math.random;
Math.random=()=>{ if(primera){primera=false; return 0.1;} return real(); };
writeFileSync("./out/_rend.mjs", js);
console.warn=()=>{};
await import("./out/_rend.mjs");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(300);
document.getElementById("mJugar").onclick?.();
await sleep(9000);
const btn=document.getElementById("btnRendirse"), modal=document.getElementById("confirm");
console.log("\n═══ RENDIRSE ═══");
console.log("botón con manejador:", typeof btn.onclick==="function" ? "✓":"✗");
btn.onclick?.();
const txt=String(modal.innerHTML).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
console.log("modal abierto:", modal.style.display==="flex" ? "✓":"✗", "·", txt.slice(0,60));
console.log("no se rinde solo:",
  /Te has rendido/.test(String(document.getElementById("prompt").innerHTML)) ? "✗ (se rindió sin confirmar)" : "✓");
process.exit(0);
