import { readFileSync } from "node:fs";
const h=readFileSync("./out/goat.html","utf-8");
const js=h.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const css=h.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\s*\n\s*/g,"");
const c=[
 ["activar una carta del campo manda su índice", /action:IA\.SELECT_ACTIVATE,index:iA/.test(js) && !/IA_ACT\(/.test(js)],
 ["tercer modo de cadenas: no activar nada", /chainMode==="nunca"/.test(js) && /No activar nada/.test(h)],
 ["cartas que ya atacaron, apagadas", /markAtacadas/.test(js) && /\.card\.gastada \.face\{filter:grayscale/.test(css)],
 ["mano: lo no jugable se ve apagado", /\.card\.in-hand:not\(\.playable\) \.face\{filter:brightness/.test(css)],
 ["zona de clic ampliada en las cartas", /\.card::before\{content:"";position:absolute;inset:-9px/.test(css)],
 ["contador de cartas al pasar el ratón por los montones", /\.slot\.contable\.conCartas:hover::before\{display:grid\}/.test(css) && /function pintarContadores/.test(js)],
 ["20 mazos incluidos", (h.match(/"nombre":"/g)||[]).length>=20],
];
let ok=0; for(const [t,v] of c){ console.log(v?"  ✓":"  ✗",t); if(v) ok++; }
console.log(`${ok}/${c.length}`);
