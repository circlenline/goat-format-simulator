/* Modo bots, modo sin cadenas e historial: que estén cableados de verdad
   en el HTML final, no solo en las fuentes. */
import { readFileSync } from "node:fs";
const html=readFileSync("./out/goat.html","utf-8");
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\s*\n\s*/g,"");
const js =html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const c=[
 ["pantalla de bots en el menú", /id="pBots"/.test(html) && /id="mBots"/.test(html) && /id="irBots"/.test(html)],
 ["una fila por mazo con las cuatro dificultades", /function pintarBots/.test(js) && /NIVELES\.forEach\(\(nv,i\)=>/.test(js)],
 ["el progreso se lee de localStorage", /localStorage\.getItem\("goatProgreso"\)/.test(js)],
 ["y se apunta al ganar", /function apuntarVictoria/.test(js) && /localStorage\.setItem\("goatProgreso"/.test(js)],
 ["un solo camino para empezar duelo", /function lanzarDuelo/.test(js)
   && /getElementById\("mJugar"\)\.onclick = \(\) => lanzarDuelo\(\)/.test(js)],
 ["medallas por dificultad", /#mBots \.bpip\.n2\.hecho\{/.test(css)],

 ["modo sin cadenas respeta tus disparadores del cementerio",
   /chainMode==="nunca" && !disparadorDesdeGY/.test(js)],
 ["el botón cicla los tres modos", /const CICLO=\{auto:"always", always:"nunca", nunca:"auto"\}/.test(js)],

 ["historial visual con miniaturas", /function alHistorial/.test(js) && /id="historial"/.test(html)
   && /#historial \.hcarta\{/.test(css)],
 ["apunta invocaciones y cadenas", (js.match(/V\.alHistorial\(/g)||[]).length>=2],

 ["la IA no se encadena a su propia carta", /arriba\.controller === yo/.test(js)],
 ["el adaptador sabe de quién es cada eslabón", /this\.cadena\.push\(\{ code:m\.code, controller:m\.controller/.test(js)],
 ["Thousand-Eyes: objetivo boca arriba y el más gordo", /objetivo boca arriba/.test(js)],

 ["táctil: el gesto no se lo lleva el navegador", /touch-action:none/.test(css)],
 /* Un móvil en horizontal declara ~900px de ancho: si el disparador es
    solo el ancho, se queda con la disposición de escritorio. */
 ["la disposición de móvil también entra por altura",
   /@media \(max-width:900px\), \(max-height:560px\), \(pointer:coarse\) and \(max-width:1250px\)\{/.test(css)],
 ["en móvil el panel no tapa el centro del tablero",
   /#prompt\{position:fixed;left:auto;right:34px;bottom:auto;top:38px/.test(css)],
 ["la altura es la real del navegador, no la teórica", /html,body\{height:100%;height:100dvh\}/.test(css)],
 ["hay pantalla completa para quitar las barras del móvil",
   /id="btnPantalla"/.test(html) && /async function pantallaCompleta/.test(js)
   && /requestFullscreen\(\{ navigationUI:"hide" \}\)/.test(js)],
 ["y se pide al empezar el duelo, que es cuando hay gesto del usuario",
   /globalThis\.matchMedia\?\.\("\(pointer:coarse\)"\)\?\.matches/.test(js) && /pantallaCompleta\(\);/.test(js)],
 ["se respeta el hueco del notch", /env\(safe-area-inset-top\)/.test(css)],
 ["la tira de fases del centro no roba alto en móvil",
   /#fasesCentro\{display:none\}/.test(css) && /#phases\{display:flex;right:3px/.test(css)],
 ["el tablero reserva justo lo que cuelga la mano, no un número inventado",
   /const cuelga = CW\*1\.46\*0\.80\*esc;/.test(js) && /availH\/\(h \+ cuelga\)/.test(js)],
 ["hay un escalón extra para pantallas muy bajas", /@media \(max-height:470px\)\{/.test(css)],
 ["tu mano se dibuja más grande que la del rival",
   /--mano-mia:1\.35; --mano-rival:\.58/.test(css) && /sc = mine \? ESC_MIA : ESC_RIVAL;/.test(js)],
 ["la mano del rival va apagada", /\.card\.mano-rival \.face\{opacity:\.62/.test(css)],
 ["el visor de carta no desaparece en móvil, flota a la izquierda",
   /#side\{display:block;position:absolute;left:0/.test(css)],
 ["los botones de turno siguen abajo a la derecha",
   /#controles\{right:34px;bottom:5px/.test(css)],
 ["el historial no pisa el visor de carta", /#historial\{flex-direction:row;width:auto;max-width:44vw;left:4px;top:auto;bottom:34px/.test(css)],
 ["en vertical se pide girar el móvil",
   /@media \(orientation:portrait\) and \(max-width:900px\)\{/.test(css) && /id="rotar"/.test(html)],
];
let ok=0; for(const [t,v] of c){ console.log(v?"  ✓":"  ✗",t); if(v) ok++; }
console.log(`\n${ok}/${c.length}`);
