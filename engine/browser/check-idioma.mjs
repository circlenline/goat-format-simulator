import { readFileSync, writeFileSync } from "node:fs";
import { installDOM } from "./domstub.mjs";
installDOM();
/* Esta comprobación es la excepción: aquí SÍ queremos el idioma por
   defecto, que es el inglés con el que lo va a abrir la gente. */
global.localStorage={getItem:()=>null,setItem(){}};
const html=readFileSync("./out/goat.html","utf-8");
writeFileSync("./out/_i18n.mjs", html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
console.warn=()=>{};
await import("./out/_i18n.mjs");
await new Promise(r=>setTimeout(r,400));
const T = globalThis.__T;
const casos=["Rendirse","¿Quieres responder?","Damage Step","Cementerio","Invocar Sangan",
  "Cadena 2: Book of Moon","Turno 3 — Tú","Selecciona 1 carta(s)","¿Seguro que quieres rendirte?",
  "Se revela la mano del rival","VICTORIA","Novato","Terminar turno","TU TURNO",
  "12 de 80 retos superados","Cementerio tu — 4 carta(s)","Declaración de ataque"];
const pruebas=[];
const ok=(t,v,d)=>{ pruebas.push(!!v); console.log(v?"  ✓":"  ✗", t, d?`— ${d}`:""); };
console.log("═══ IDIOMAS ═══");
ok("arranca en inglés", (globalThis.__idioma?.())==="en");
let sinTraducir=[];
for(const c of casos){ const tr=T(c); if(tr===c && !/^(Damage Step)$/.test(c)) sinTraducir.push(c); }
ok("todas las frases de muestra se traducen", sinTraducir.length===0,
   sinTraducir.length?sinTraducir.join(" · "):`${casos.length} frases, incluidas las que llevan datos dentro`);
console.log("  ejemplos: "+casos.slice(0,4).map(c=>`${c} → ${T(c)}`).join(" · "));
globalThis.__setIdioma("es");
ok("en español el texto pasa tal cual", T("Rendirse")==="Rendirse" && T("Cadena 2: Book of Moon")==="Cadena 2: Book of Moon");
globalThis.__setIdioma("en");
const c2=[
 ["el módulo de idiomas va antes que el resto", /const I18N = \(\(\)=>\{/.test(html)],
 ["la vista y el orquestador lo usan", (html.match(/globalThis\.__T \? globalThis\.__T\(s\) : s/g)||[]).length>=2],
 ["se traduce lo que ya está escrito en el HTML", /__traducirDOM\?\.\(document\.getElementById\(id\)\)/.test(html)],
 ["hay selector de idioma en Opciones", /id="mIdioma"/.test(html) && /grupo\("mIdioma"/.test(html)],
 ["y se recuerda entre partidas", /idioma:"en"/.test(html)],
];
for(const [t,v] of c2) ok(t,v);
/* Los sitios donde se coló español pese a la traducción: se generan por
   JS DESPUÉS de traducir el HTML, así que tienen que pasar por T(). */
const db=readFileSync("../deckbuilder/deckbuilder.html","utf-8");
const c3=[
 ["el botón de cadenas se traduce", /bc\.textContent = T\(ETIQ_CAD/.test(html)],
 ["el nivel del bot junto al avatar también", /T\(ETIQUETA_NIVEL\[nivelBot\]/.test(html)],
 ["las medallas del modo bots salen del texto traducido", /__T\?\.\(ETIQ\[nv\]\)/.test(html)],
 ["los botones de turno se traducen al arrancar", /"controles","phases"/.test(html)],
 ["el deck builder usa la misma tabla", /const EN = \{/.test(db) && /__traducirDOM\?\.\(document\.body\)/.test(db)],
 ["y sus avisos pasan por la traducción", /function aviso\(t\)\{\s*t = T\(t\);/.test(db)],
];
for(const [t,v] of c3) ok(t,v);
console.log(`\n${pruebas.filter(Boolean).length}/${pruebas.length}`);
process.exit(0);
