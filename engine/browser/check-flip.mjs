/* Verifica que tras una invocación por volteo la carta queda boca arriba
   en nuestro espejo, y que los destierros van a su propia zona. */
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
let flips=0, flipsMal=0, destierros=0, ejemplos=[];
for(let p=0;p<8;p++){
  const lib=await X.default({sync:true});
  const ev=[];
  const duel=new GoatDuel({lib,X,db,cardDb:db,scriptReader,onEvent:e=>ev.push(e)});
  const sh=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[b[i],b[j]]=[b[j],b[i]];}return b;};
  await duel.create({deck0:sh(deck),deck1:sh(deck),extra0:extra,extra1:extra,seed:[BigInt(500+p*31),7n,13n,29n]});
  const ai=makeAutoPlayer(X), tr=makeTrivialResolver(X);
  let last=null,att=0;
  for(let s=0;s<8000;s++){
    const q=await duel.run(); if(duel.finished||!q) break;
    for(const e of ev.splice(0)){
      if(e.t==="summon" && e.kind==="flip"){
        flips++;
        const c=duel.cards.get(e.uid);
        const bocaAbajo = !!(c?.position & 0x0a);
        if(bocaAbajo){ flipsMal++; ejemplos.push(`${nm(e.code)} sigue boca abajo (pos ${c.position})`); }
      }
      if(e.t==="move" && e.to?.location===32) destierros++;
    }
    if(q!==last){last=q;att=0;}
    // política dirigida: colocar monstruos boca abajo y voltearlos después
    let r=tr(q);
    if(!r && q.type===X.OcgMessageType.SELECT_IDLECMD && att===0){
      const IA=X.SelectIdleCMDAction, R=X.OcgResponseType;
      if(q.pos_changes?.length) r={type:R.SELECT_IDLECMD,action:IA.SELECT_POS_CHANGE,index:0};
      else if(q.monster_sets?.length) r={type:R.SELECT_IDLECMD,action:IA.SELECT_MONSTER_SET,index:0};
    }
    if(!r) r=ai(q,att++); if(!r) break;
    duel.respond(r);
    if(duel.turnCount>26) break;
  }
}
console.log("═══ VOLTEO Y DESTIERRO ═══");
console.log(`invocaciones por volteo observadas: ${flips}`);
console.log(`  de ellas, que se quedaron boca abajo: ${flipsMal}`);
ejemplos.slice(0,4).forEach(e=>console.log("   ✗",e));
console.log(`cartas desterradas observadas: ${destierros}`);
console.log(flips>0 && flipsMal===0 ? "  ✓ todos los volteos dejan la carta boca arriba" :
            flips===0 ? "  (no hubo volteos en la muestra)" : "  ✗ sigue fallando");
