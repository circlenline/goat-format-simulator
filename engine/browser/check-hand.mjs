/* Ninguna carta de TU mano puede quedar boca abajo, venga de donde venga. */
import { readFileSync } from "node:fs";
import * as X from "./out/ocgcore.bundle.js";
import { scriptReader } from "./out/scripts.bundle.js";
import { GoatDuel } from "./src/duel.mjs";
import { makeAutoPlayer } from "./src/autopilot.mjs";
import { makeTrivialResolver } from "./src/trivial.js";
const raw=JSON.parse(readFileSync("./out/cards.subset.json","utf-8"));
const names=JSON.parse(readFileSync("./out/names.subset.json","utf-8"));
const {deck,extra}=JSON.parse(readFileSync("./out/deck.json","utf-8"));
const db=new Map(); for(const k in raw){const c=raw[k];db.set(c.code,{...c,race:BigInt(c.race)});}
const nm=c=>names[c]?.name??("#"+c);
// misma regla que usa la vista tras el arreglo
const oculta=(loc,mia,pos)=> loc===2 ? !mia : (loc===1||loc===64) ? true : !!(pos & 0x0a);
let aMano=0, malas=[], conBits=0;
for(let p=0;p<8;p++){
  const lib=await X.default({sync:true});
  const ev=[];
  const duel=new GoatDuel({lib,X,cardDb:db,scriptReader,onEvent:e=>ev.push(e)});
  const sh=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[b[i],b[j]]=[b[j],b[i]];}return b;};
  await duel.create({deck0:sh(deck),deck1:sh(deck),extra0:extra,extra1:extra,seed:[BigInt(77+p*53),7n,13n,29n]});
  const ai=makeAutoPlayer(X), tr=makeTrivialResolver(X);
  let last=null,att=0;
  for(let s=0;s<8000;s++){
    const q=await duel.run(); if(duel.finished||!q) break;
    for(const e of ev.splice(0)){
      if(e.t==="move" && e.to?.location===2 && e.to.controller===0){
        aMano++;
        if(e.to.position & 0x0a) conBits++;
        const c=duel.cards.get(e.uid);
        if(oculta(2,true,c?.position)) malas.push(`${nm(e.code)} desde zona ${e.from.location}`);
      }
    }
    if(q!==last){last=q;att=0;}
    const r=tr(q)??ai(q,att++); if(!r) break;
    duel.respond(r); if(duel.turnCount>26) break;
  }
}
console.log("═══ CARTAS QUE VUELVEN A TU MANO ═══");
console.log(`movimientos a tu mano observados: ${aMano}`);
console.log(`  de ellos, con bits de "boca abajo": ${conBits}  ← el caso del fallo`);
console.log(`  que se pintarían del revés: ${malas.length}`);
malas.slice(0,4).forEach(m=>console.log("   ✗",m));
if(aMano && !malas.length) console.log("  ✓ ninguna carta de tu mano se pinta boca abajo");
