/* Dos cosas que se reportaron jugando el 10 de agosto:

   1. Trap Dustshoot no enseñaba la mano del rival: se quedaba boca abajo y
      solo salía una lista de texto. El motor SÍ lo avisa, con CONFIRM_CARDS,
      pero el adaptador tiraba ese mensaje a la basura.
   2. En batalla no había forma de saber si la cadena era en la declaración
      de ataque o ya dentro del Damage Step. El Damage Step no llega como
      fase: llega con DAMAGE_STEP_START / DAMAGE_STEP_END.

   Aquí se comprueban las dos: primero que el motor manda esos mensajes,
   después que el HTML real los usa. */
import { readFileSync } from "node:fs";
import { montar, codigo, nombre, X, P, T } from "./escenario.mjs";
const R=X.OcgResponseType, IA=X.SelectIdleCMDAction, BA=X.SelectBattleCMDAction;

const pruebas=[];
const comprobar=(t,v,d)=>{ pruebas.push([t,!!v]); console.log(v?"  ✓":"  ✗", t, d?`— ${d}`:""); };

console.log("═══ EL MOTOR LO AVISA ═══");
/* 1. Trap Dustshoot enseña la mano ENTERA, no solo los monstruos elegibles */
{
  const e = await montar({ mt:[{carta:"Trap Dustshoot", pos:P.FACEDOWN_DEFENSE}] },
                         { mano:["Airknight Parshath","Sangan","Pot of Greed","Book of Moon"] });
  let hecho=false;
  await e.correr(m=>{
    if(m.type===T.SELECT_IDLECMD) return hecho?"PARAR":{type:R.SELECT_IDLECMD,action:m.to_ep?IA.TO_EP:IA.TO_BP,index:null};
    if(m.type===T.SELECT_CHAIN){
      const i=(m.selects||[]).findIndex(s=>s.code===codigo("Trap Dustshoot"));
      return i>=0 && !hecho ? {type:R.SELECT_CHAIN,index:i} : {type:R.SELECT_CHAIN,index:null};
    }
    if(m.type===T.SELECT_CARD && !hecho){ hecho=true; return {type:R.SELECT_CARD,indicies:[0]}; }
    if(m.type===T.SELECT_BATTLECMD) return {type:R.SELECT_BATTLECMD,action:m.to_ep?BA.TO_EP:BA.TO_M2,index:null};
    return null;
  }, 400);
  const conf = e.mensajes.filter(m=>m.type===T.CONFIRM_CARDS);
  const cartas = conf[0]?.cards ?? [];
  const seleccionables = e.mensajes.filter(m=>m.type===T.SELECT_CARD)[0]?.selects?.length ?? 0;
  comprobar("Trap Dustshoot manda CONFIRM_CARDS con la mano del rival",
    conf.length===1 && cartas.length>0 && cartas.every(c=>c.location===2),
    `${cartas.length} cartas, todas de la mano`);
  comprobar("y son MÁS que las elegibles: se ve la mano entera, no solo los monstruos",
    cartas.length > seleccionables, `enseñadas ${cartas.length}, elegibles ${seleccionables}`);
  comprobar("cada carta enseñada trae su código (se puede pintar la carta real)",
    cartas.every(c=>c.code>0), cartas.slice(0,3).map(c=>nombre(c.code)).join(", "));
  /* Con una sola opción legal, la regla de "resuelve solo lo que no tiene
     elección" se comía la revelación entera sin dejarte ni mirar. */
  const sel = e.mensajes.find(m=>m.type===T.SELECT_CARD);
  comprobar("la elección es sobre la mano del rival (por eso no puede automatizarse)",
    sel && sel.selects.every(s=>s.location===2 && s.controller===1),
    `${sel?.selects.length} objetivos, min ${sel?.min} max ${sel?.max}`);
}
/* 1b. En qué momento pregunta el motor durante una batalla */
{
  const e = await montar({ monstruos:[{carta:"Airknight Parshath", pos:P.FACEUP_ATTACK}],
                           mano:["Book of Moon"] },
                         { monstruos:[{carta:"Mystical Elf", pos:P.FACEUP_ATTACK}] });
  let atacado=false;
  await e.correr(m=>{
    if(m.type===T.SELECT_IDLECMD) return e.turnPlayer===0
      ? {type:R.SELECT_IDLECMD,action:m.to_bp?IA.TO_BP:IA.TO_EP,index:null}
      : {type:R.SELECT_IDLECMD,action:m.to_ep?IA.TO_EP:IA.TO_BP,index:null};
    if(m.type===T.SELECT_BATTLECMD){
      if(!atacado && (m.attacks||[]).length){ atacado=true;
        return {type:R.SELECT_BATTLECMD,action:BA.SELECT_BATTLE,index:0}; }
      return atacado ? "PARAR" : {type:R.SELECT_BATTLECMD,action:m.to_ep?BA.TO_EP:BA.TO_M2,index:null};
    }
    if(m.type===T.SELECT_CHAIN) return {type:R.SELECT_CHAIN,index:null};
    return null;
  }, 500);
  const iAtk=e.mensajes.findIndex(m=>m.type===T.ATTACK);
  const iDS =e.mensajes.findIndex(m=>m.type===T.DAMAGE_STEP_START);
  const tras = e.mensajes.map((m,i)=>({m,i}))
    .filter(x=>x.m.type===T.SELECT_CHAIN && x.m.player===0 && x.i>iAtk);
  const enDeclaracion = tras.find(x=>x.i<iDS);
  const enDamage = tras.find(x=>x.i>iDS);
  comprobar("la ventana de la declaración de ataque viene marcada con su timing",
    enDeclaracion && (enDeclaracion.m.hint_timing & 4096),
    `timing ${enDeclaracion?.m.hint_timing} (4096 = declaración de ataque)`);
  comprobar("y la del Damage Step con el suyo",
    enDamage && (enDamage.m.hint_timing & (8192|16384)),
    `timing ${enDamage?.m.hint_timing} (8192 = damage step, 16384 = cálculo)`);
}
/* 2. El Damage Step se anuncia con sus propios mensajes */
{
  const e = await montar({ monstruos:[{carta:"Airknight Parshath", pos:P.FACEUP_ATTACK}] },
                         { monstruos:[{carta:"Mystical Elf", pos:P.FACEUP_ATTACK}] });
  let atacado=false;
  await e.correr(m=>{
    if(m.type===T.SELECT_IDLECMD) return e.turnPlayer===0
      ? {type:R.SELECT_IDLECMD,action:m.to_bp?IA.TO_BP:IA.TO_EP,index:null}
      : {type:R.SELECT_IDLECMD,action:m.to_ep?IA.TO_EP:IA.TO_BP,index:null};
    if(m.type===T.SELECT_BATTLECMD){
      if(!atacado && (m.attacks||[]).length){ atacado=true;
        return {type:R.SELECT_BATTLECMD,action:BA.SELECT_BATTLE,index:0}; }
      return atacado ? "PARAR" : {type:R.SELECT_BATTLECMD,action:m.to_ep?BA.TO_EP:BA.TO_M2,index:null};
    }
    return null;
  }, 500);
  const tipos = e.mensajes.map(m=>m.type);
  const iAtaque = tipos.indexOf(T.ATTACK);
  const iInicio = tipos.indexOf(T.DAMAGE_STEP_START);
  const iFin    = tipos.lastIndexOf(T.DAMAGE_STEP_END);
  const fases   = new Set(e.mensajes.filter(m=>m.type===T.NEW_PHASE).map(m=>m.phase));
  comprobar("el Damage Step tiene principio y fin propios",
    iInicio>0 && iFin>iInicio, `START en la posición ${iInicio}, END en la ${iFin}`);
  comprobar("y va después de declarar el ataque (son dos momentos distintos)",
    iAtaque>=0 && iInicio>iAtaque, `ataque ${iAtaque} → damage step ${iInicio}`);
  comprobar("no llega como fase: por eso no puede ir en la tira de fases",
    !fases.has(32) && !fases.has(64),
    `fases anunciadas: ${[...fases].sort((a,b)=>a-b).join(", ")}`);
}

console.log("\n═══ Y EL HTML LO USA ═══");
const html=readFileSync("./out/goat.html","utf-8");
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\s*\n\s*/g,"");
const js =html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const c=[
 ["el adaptador escucha CONFIRM_CARDS", /case T\.CONFIRM_CARDS/.test(js) && /this\.emit\("revelar"/.test(js)],
 ["y le fija el código a lo revelado (deja de ser secreto)", /if\(c\.code\) card\.code = c\.code;/.test(js)],
 ["la vista saca las reveladas al centro y boca arriba",
   /export function revelar|function revelar\(uids\)/.test(js) && /revelados\.has\(card\.uid\)/.test(js)],
 ["se vuelven a tapar al terminar la cadena", /case "chainEnd": chainActive=false; V\.ocultarReveladas\(\)/.test(js)],
 ["estilo de carta revelada", /\.card\.revelada \.face\{/.test(css)],
 ["el adaptador escucha el Damage Step", /case T\.DAMAGE_STEP_START/.test(js) && /this\.emit\("damageStep"/.test(js)],
 ["el momento se marca sobre Battle, no como fase nueva",
   /#fasesCentro \.fc\.conSub::after\{content:attr\(data-sub\)/.test(css) && !/512:"Damage/.test(js)],
 ["la declaración de ataque y el Damage Step son etiquetas distintas",
   /ataque:"Declaración de ataque", damage:"Damage Step"/.test(js)],
 ["el panel dice en qué fase y momento estás", /momentoPanel = momentoPregunta\(m\)/.test(js)
   && /<div class="pfase">/.test(js)],
 ["y el HUD también", /V\?\.momentoTexto\?\.\(\)/.test(js)],
 ["el momento sale del propio mensaje (hint_timing), no se adivina",
   /hint_timing>>>0/.test(js) && /\[4096,"Declaración de ataque"\]/.test(js)],
 ["también en los sí/no y en las selecciones de carta",
   (js.match(/panel\(conMomento\(/g)||[]).length >= 3],
 ["mirar la mano del rival nunca se resuelve solo",
   /miraLaManoRival/.test(js) && /s\.location===2 && s\.controller!==ME/.test(js)],
];
for(const [t,v] of c){ pruebas.push([t,v]); console.log(v?"  ✓":"  ✗", t); }
const ok=pruebas.filter(p=>p[1]).length;
console.log(`\n${ok}/${pruebas.length}`);
