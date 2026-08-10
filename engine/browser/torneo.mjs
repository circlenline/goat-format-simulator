/* Enfrenta los niveles entre sí. Si "experto" no gana claramente a
   "novato", la IA no vale para nada por muy bonita que sea. */
import { readFileSync } from "node:fs";
import * as X from "./out/ocgcore.bundle.js";
import { scriptReader } from "./out/scripts.bundle.js";
import { GoatDuel } from "./src/duel.mjs";
import { makeAutoPlayer } from "./src/autopilot.mjs";
import { makeTrivialResolver } from "./src/trivial.js";
import { crearCerebro, NIVELES } from "./src/ai/brain.js";

const raw=JSON.parse(readFileSync("./out/cards.subset.json","utf-8"));
const names=JSON.parse(readFileSync("./out/names.subset.json","utf-8"));
const {deck,extra}=JSON.parse(readFileSync("./out/deck.json","utf-8"));
const db=new Map(); for(const k in raw){const c=raw[k];db.set(c.code,{...c,race:BigInt(c.race)});}
const trivial=makeTrivialResolver(X), generico=makeAutoPlayer(X);
const barajar=(a,r)=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=(r()* (i+1))|0;[b[i],b[j]]=[b[j],b[i]];}return b;};
function rng(s){ let x=s>>>0; return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return ((x>>>0)%100000)/100000;}; }

async function partida(nivelA, nivelB, semilla){
  const lib=await X.default({sync:true});
  const duel=new GoatDuel({lib,X,cardDb:db,scriptReader,onEvent:()=>{}});
  const r=rng(semilla);
  await duel.create({ deck0:barajar(deck,r), deck1:barajar(deck,r),
    extra0:extra, extra1:extra, seed:[BigInt(semilla),7n,13n,29n] });
  const cerebros = {
    0: crearCerebro({X,duel,db,names,nivel:nivelA,yo:0}),
    1: crearCerebro({X,duel,db,names,nivel:nivelB,yo:1}),
  };
  let ganador=null, motivo=null;
  const orig=duel.emit.bind(duel);
  duel.onEvent = e => { if(e.t==="win"){ ganador=e.player; motivo=e.reason; } };
  let last=null, att=0;
  for(let s=0;s<12000;s++){
    const q=await duel.run();
    if(duel.finished||!q) break;
    if(q!==last){ last=q; att=0; }
    const r2 = trivial(q) ?? cerebros[q.player](q,att) ?? generico(q,att);
    att++;
    if(!r2) break;
    duel.respond(r2);
    if(duel.turnCount>60) break;      // tablas por longitud
  }
  return { ganador, turnos:duel.turnCount,
           lp:[duel.lp[0],duel.lp[1]], desyncs:duel.desyncs };
}

/* Por defecto los cruces que interesan. Con GOAT_PARES="a:b,c:d" se
   pueden pedir otros, y con GOAT_PARES=todos los seis posibles: hacía
   falta para descubrir que "duro" y "normal" estaban del revés. */
const TODOS = [];
for(let i=0;i<NIVELES.length;i++) for(let j=i+1;j<NIVELES.length;j++)
  TODOS.push([NIVELES[j], NIVELES[i]]);   // el más fuerte primero
const PARES = process.env.GOAT_PARES === "todos" ? TODOS
  : process.env.GOAT_PARES ? process.env.GOAT_PARES.split(",").map(p=>p.split(":"))
  : [["experto","novato"],["experto","normal"],["duro","novato"],
     ["experto","duro"],["normal","novato"]];
const N = Number(process.argv[2] ?? 12);
console.log(`═══ TORNEO · ${N} partidas por cruce ═══\n`);
let desyncTotal=0;
for(const [A,B] of PARES){
  let ga=0, gb=0, tablas=0, turnos=0;
  for(let i=0;i<N;i++){
    // se alternan los lados para que empezar no decida el resultado
    const invertido = i%2===1;
    const r = await partida(invertido?B:A, invertido?A:B, 1000+i*7919);
    turnos += r.turnos; desyncTotal += r.desyncs;
    if(r.ganador===null) tablas++;
    else {
      const ganaA = invertido ? r.ganador===1 : r.ganador===0;
      ganaA ? ga++ : gb++;
    }
  }
  const jug = ga+gb;
  const pct = jug? Math.round(ga/jug*100) : 0;
  const barra = "█".repeat(Math.round(pct/5)).padEnd(20,"·");
  console.log(`${A.padEnd(8)} vs ${B.padEnd(8)}  ${String(ga).padStart(2)}-${String(gb).padEnd(2)}`+
              `  ${barra} ${pct}%   (tablas ${tablas}, ${Math.round(turnos/N)} turnos de media)`);
}
console.log(`\ndesincronizaciones durante todo el torneo: ${desyncTotal}`);
