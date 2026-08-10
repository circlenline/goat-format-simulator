/* Verifica que el espejo de estado coincide SIEMPRE con el del core.
   Un desfase de un solo puesto hacía que jugaras una carta distinta
   a la que arrastrabas (el fallo de Chaos Sorcerer). */
import { readFileSync } from "node:fs";
import * as X from "./out/ocgcore.bundle.js";
import { scriptReader } from "./out/scripts.bundle.js";
import { GoatDuel } from "./src/duel.mjs";
import { makeAutoPlayer } from "./src/autopilot.mjs";
import { makeTrivialResolver } from "./src/trivial.js";

const raw=JSON.parse(readFileSync("./out/cards.subset.json","utf-8"));
const names=JSON.parse(readFileSync("./out/names.subset.json","utf-8"));
const {deck,extra}=JSON.parse(readFileSync("./out/deck.json","utf-8"));
const cardDb=new Map(); for(const k in raw){const c=raw[k];cardDb.set(c.code,{...c,race:BigInt(c.race)});}
const nm=c=>names[c]?.name??("#"+c);

let fallos=[], comprobaciones=0, partidas=0, turnosTot=0;
const T=X.OcgMessageType;
const LISTAS=["summons","special_summons","monster_sets","spell_sets","activates","pos_changes","attacks"];

for(let p=0;p<6;p++){
  const lib=await X.default({sync:true});
  const duel=new GoatDuel({lib,X,cardDb,scriptReader,onEvent:()=>{}});
  const sh=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[b[i],b[j]]=[b[j],b[i]];}return b;};
  await duel.create({deck0:sh(deck),deck1:sh(deck),extra0:extra,extra1:extra,
    seed:[BigInt(1000+p*97),7n,13n,29n]});
  const ai=makeAutoPlayer(X), tr=makeTrivialResolver(X);
  let last=null, att=0;
  for(let step=0;step<8000;step++){
    const q=await duel.run();
    if(duel.finished||!q) break;
    // COMPROBACIÓN: cada carta que el core ofrece debe existir en nuestro
    // espejo, en la posición que él dice y con el mismo código
    if(q.type===T.SELECT_IDLECMD||q.type===T.SELECT_BATTLECMD){
      for(const k of LISTAS) for(const l of (q[k]||[])){
        comprobaciones++;
        const directo=duel.at(l.controller,l.location,l.sequence);
        if(!directo || directo.code!==l.code)
          fallos.push(`partida ${p} · ${k}: el core dice ${nm(l.code)} en `+
            `zona ${l.location}[${l.sequence}] y el espejo tenía `+
            (directo?nm(directo.code):"nada"));
      }
    }
    if(q!==last){ last=q; att=0; }
    const r=tr(q) ?? ai(q,att++);
    if(!r) break;
    duel.respond(r);
    if(duel.turnCount>26) break;
  }
  partidas++; turnosTot+=duel.turnCount;
}
console.log("═══ SINCRONÍA MOTOR ↔ INTERFAZ ═══");
console.log(`partidas: ${partidas} · turnos totales: ${turnosTot}`);
console.log(`cartas ofrecidas comprobadas: ${comprobaciones}`);
console.log(`desajustes: ${fallos.length}`);
fallos.slice(0,8).forEach(f=>console.log("  ✗",f));
if(!fallos.length) console.log("  ✓ el espejo coincidió con el motor en todos los casos");
