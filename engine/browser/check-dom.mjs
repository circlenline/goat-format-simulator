/* Comprueba el HTML REAL, no el DOM simulado.
   El stub crea elementos a demanda, así que "existe el botón" siempre
   daba verde aunque el elemento no estuviera en la página. */
import { readFileSync } from "node:fs";
const html=readFileSync("./out/goat.html","utf-8");
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\s*\n\s*/g,"");
const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const necesarios=["menu","pHome","pJugar","pOpciones","irJugar","irOpciones","volver1","volver2",
  "mNiveles","mCadenas","mTiempo","mGaleria","mMazoIA","mJugar","mDeck","coin","boot","stage","grid",
  "cardLayer","prompt","controles","btnFase","btnFin","btnFaseTxt","fasesCentro","phasecard",
  "zoneview","ghost","turnInfo","lpMeVal","lpOppVal","detail","log","banner","flash","choice"];
let fallan=[];
for(const id of necesarios) if(!html.includes(`id="${id}"`)) fallan.push(id);
console.log("═══ ELEMENTOS EN EL HTML REAL ═══");
console.log(`comprobados: ${necesarios.length} · ausentes: ${fallan.length}`, fallan.length?fallan:"");
// los ids que el JS usa deben existir en el HTML
const usados=[...new Set([...js.matchAll(/getElementById\("([^"]+)"\)/g)].map(m=>m[1]))];
const huerfanos=usados.filter(id=>!html.includes(`id="${id}"`));
console.log(`ids usados por el JS: ${usados.length} · sin elemento en la página: ${huerfanos.length}`,
            huerfanos.length?huerfanos:"");
const c=[
 ["controles con estilo propio", /#controles\{position:absolute/.test(css)],
 ["botón de fase visualmente distinto", /\.cFase\{color:#04121a;background:linear-gradient\(180deg,#7fe3d0/.test(css)],
 ["tira de fases sobre el divisor, sin tapar cartas", /#fasesCentro\{position:absolute;left:50%;transform:translateX\(-50%\);z-index:6/.test(css) && /#fasesCentro \*\{pointer-events:none\}/.test(css)],
 ["la moneda se lanza tras ocultar la carga", /getElementById\("boot"\)\.style\.display="none";\s*await View\.sorteo/.test(js.replace(/\s+/g," "))],
];
let ok=0; for(const [t,v] of c){ console.log(v?"  ✓":"  ✗",t); if(v) ok++; }
console.log(`\n${ok}/${c.length} · ${fallan.length===0&&huerfanos.length===0?"✓ sin elementos huérfanos":"✗ revisar"}`);
