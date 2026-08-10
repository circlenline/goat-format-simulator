/* Prueba la lógica del builder (límites de copias, YDK, exportación)
   en Node, ejecutando su propio código con un DOM mínimo. */
import { readFileSync } from "node:fs";
const html=readFileSync("./deckbuilder.html","utf-8");
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];

const stub=()=>({ innerHTML:"", textContent:"", value:"", className:"", style:{},
  classList:{add(){},remove(){},toggle(){}}, appendChild(){}, click(){},
  addEventListener(){}, files:[], onclick:null, oninput:null, onchange:null, title:"" });
const nodos={};
global.document={ querySelector:s=>(nodos[s] ||= stub()), createElement:stub,
  addEventListener(){}, body:stub() };
global.localStorage={ getItem:()=>null, setItem(){} };
global.Blob=class{constructor(p){this.t=p.join("")}};
global.URL={createObjectURL:()=>"blob:x"};
global.prompt=()=>null;
global.FileReader=class{};

const api = new Function(js + `
  return { D, añadir, copias, limite, importarYDK, exportarYDK,
           exportarParaSimulador, puedeAñadir, CARDS, TEXTS, init };`)();
api.init();

const codigo = n => { for(const k in api.TEXTS) if(api.TEXTS[k][0]===n) return +k; };
const BOOK=codigo("Book of Moon"), POT=codigo("Pot of Greed"),
      GOAT=codigo("Scapegoat"), TER=codigo("Thousand-Eyes Restrict");

console.log("═══ LÓGICA DEL DECK BUILDER ═══");
console.log("cartas en la base:", Object.keys(api.CARDS).length);

// límite de copias
for(let i=0;i<5;i++) api.añadir(POT);
console.log(`Pot of Greed (limitada a ${api.limite(POT)}): añadidas ${api.copias(POT)}`,
            api.copias(POT)===1 ? "✓" : "✗");
for(let i=0;i<5;i++) api.añadir(BOOK);
console.log(`Book of Moon (a ${api.limite(BOOK)}): añadidas ${api.copias(BOOK)}`,
            api.copias(BOOK)===3 ? "✓" : "✗");
for(let i=0;i<4;i++) api.añadir(GOAT);
console.log(`Scapegoat (a ${api.limite(GOAT)}): añadidas ${api.copias(GOAT)}`,
            api.copias(GOAT)===api.limite(GOAT) ? "✓" : "✗");

// las fusiones van solas al extra
api.añadir(TER);
console.log("Thousand-Eyes Restrict va al Extra:",
            api.D.extra.includes(TER) && !api.D.main.includes(TER) ? "✓" : "✗");

// ida y vuelta por YDK
const ydk=api.exportarYDK();
const antes=[...api.D.main].sort().join(",");
api.importarYDK(ydk);
const despues=[...api.D.main].sort().join(",");
console.log("YDK ida y vuelta conserva el mazo:", antes===despues ? "✓" : "✗");

// importar por nombres escritos a mano
api.importarYDK("3x Book of Moon\nPot of Greed\n2 Scapegoat\nCartaQueNoExiste");
console.log("importar por nombre:", api.D.main.length===6 ? "✓ 6 cartas" : "✗ "+api.D.main.length);

// el fichero para el simulador lleva los datos de carta dentro
const sim=JSON.parse(api.exportarParaSimulador());
console.log("export para el simulador:", sim.formato,
  "· cartas incluidas:", Object.keys(sim.cards).length,
  Object.keys(sim.cards).length>0 && sim.names[api.D.main[0]] ? "✓" : "✗");
