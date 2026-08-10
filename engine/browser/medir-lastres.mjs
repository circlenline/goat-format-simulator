/* ¿Cuánto vale cada defecto?

   Enfrenta al cerebro experto contra ese MISMO cerebro con un solo
   defecto puesto. Así se sabe qué lastra de verdad y con qué números
   construir una escalera de dificultad que se note, en vez de cuatro
   niveles que juegan igual.

   Uso: node medir-lastres.mjs [partidas]
*/
import { readFileSync } from "node:fs";
import * as X from "./out/ocgcore.bundle.js";
import { scriptReader } from "./out/scripts.bundle.js";
import { GoatDuel } from "./src/duel.mjs";
import { makeAutoPlayer } from "./src/autopilot.mjs";
import { makeTrivialResolver } from "./src/trivial.js";
import { crearCerebro } from "./src/ai/brain.js";

const N = Number(process.argv[2] ?? 200);
const raw   = JSON.parse(readFileSync("./out/cards.subset.json","utf-8"));
const names = JSON.parse(readFileSync("./out/names.subset.json","utf-8"));
const { deck, extra } = JSON.parse(readFileSync("./out/deck.json","utf-8"));
const db=new Map(); for(const k in raw){const c=raw[k];db.set(c.code,{...c,race:BigInt(c.race)});}
const trivial=makeTrivialResolver(X), generico=makeAutoPlayer(X);
const barajar=(a,r)=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=(r()*(i+1))|0;[b[i],b[j]]=[b[j],b[i]];}return b;};
const rng=s=>{let x=s>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%100000)/100000;};};
const LIMPIO={ error:0, sinCadenas:false, combateTonto:false, sinPosicion:false,
               sinGuardar:false, objetivoTonto:false, malaSeleccion:false, sinRemocion:false,
               cadenaTonta:false };

async function partida(semilla, lastreB, limpioEn0){
  const lib=await X.default({sync:true});
  const duel=new GoatDuel({lib,X,cardDb:db,scriptReader,onEvent:()=>{}});
  const r=rng(semilla);
  await duel.create({deck0:barajar(deck,r),deck1:barajar(deck,r),extra0:extra,extra1:extra,
                     seed:[BigInt(semilla),7n,13n,29n]});
  const hacer=(lastre,yo)=>crearCerebro({X,duel,db,names,nivel:"experto",yo,lastre});
  const cerebros = limpioEn0
    ? { 0:hacer(LIMPIO,0), 1:hacer({...LIMPIO,...lastreB},1) }
    : { 0:hacer({...LIMPIO,...lastreB},0), 1:hacer(LIMPIO,1) };
  let ganador=null;
  const orig=duel.emit.bind(duel);
  duel.emit=(t,d)=>{ if(t==="win") ganador=d.player; orig(t,d); };
  for(let paso=0;paso<7000 && !duel.finished;paso++){
    const q=await duel.run(); if(!q||duel.finished) break;
    let i=0,resp=null;
    while(i<8&&!resp){ resp=trivial(q) ?? cerebros[q.player]?.(q,i) ?? generico(q,i); i++; }
    if(!resp) break;
    duel.respond(resp);
  }
  return ganador;
}

const CASOS = [
  ["responde a lo tonto",  { cadenaTonta:true }],
  ["NIVEL novato",  { error:0.50, sinCadenas:true, combateTonto:true, objetivoTonto:true,
                      malaSeleccion:true, sinRemocion:true, sinPosicion:true, sinGuardar:true }],
  ["NIVEL normal",  { error:0.35, sinCadenas:true, combateTonto:true, objetivoTonto:true }],
  ["NIVEL duro",    { error:0.20, cadenaTonta:true, objetivoTonto:true, sinGuardar:true }],
];
console.log(`═══ cuánto lastra cada defecto · ${N} partidas por caso ═══`);
console.log("(porcentaje = victorias del cerebro LIMPIO contra el lastrado)\n");
for(const [nombre, lastre] of CASOS){
  let limpio=0, lastrado=0, tablas=0;
  for(let i=0;i<N;i++){
    const g = await partida(1000+i*7919, lastre, i%2===0);
    if(g===null) tablas++;
    else if((g===0)===(i%2===0)) limpio++; else lastrado++;
  }
  const jug=limpio+lastrado, pct=jug?Math.round(limpio/jug*100):0;
  const err=jug?Math.round(196*Math.sqrt(0.25/jug)):0;
  const barra="█".repeat(Math.max(0,Math.round((pct-50)/2.5))).padEnd(20,"·");
  console.log(`  ${nombre.padEnd(22)} ${String(pct).padStart(3)}% ±${err}  ${barra}  (tablas ${tablas})`);
}
