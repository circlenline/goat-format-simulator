import { readFileSync } from "node:fs";
const h=readFileSync("./out/goat.html","utf-8");
const js=h.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const css=h.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\s*\n\s*/g,"");
const c=[
 ["declarar carta ya no se resuelve solo", !/ANNOUNCE_CARD[^;]*AUTO_KINDS/.test(js) && !/AUTO_KINDS = new Set\(\[[^\]]*ANNOUNCE/.test(js)],
 ["buscador de cartas por nombre", /function declararCarta/.test(js) && /buscaCarta/.test(js)],
 ["usa los opcodes del motor para filtrar", /cardMatchesOpcode/.test(js)],
 ["declarar Tipo y Atributo con nombres", /ANNOUNCE_RACE: case T\.ANNOUNCE_ATTRIB/.test(js) && /Bestia Guerrero/.test(js)],
 ["declarar número", /Declara un número/.test(js)],
 ["la interfaz y la IA declaran antes que el piloto de reserva", /case T.ANNOUNCE_CARD: {/.test(js) && /último recurso/.test(js)],
 ["la IA declara la carta más repetida de su mazo", /declara \$\{names\[code\]/.test(js)],
 ["botón de terminar turno en rojo destacado", /#controles \.cFin\{background:linear-gradient\(180deg,#b2452f/.test(css)],
];
let ok=0; for(const [t,v] of c){ console.log(v?"  ✓":"  ✗",t); if(v) ok++; }
console.log(`${ok}/${c.length}`);
