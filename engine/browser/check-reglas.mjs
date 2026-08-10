/* ════════════════════════════════════════════════════════════════
   ¿ESTAMOS JUGANDO CON LAS REGLAS DE 2005?

   Dos comprobaciones distintas:
   1) qué interruptores de reglas históricas enciende MODE_GOAT, uno a uno,
      cruzados con la lista de diferencias de goatformat.com;
   2) partidas montadas a mano donde esas reglas se ven de verdad.

   Lo primero es barato y no puede fallar en silencio. Lo segundo es lo
   que demuestra que el interruptor hace lo que dice.
   ════════════════════════════════════════════════════════════════ */
import { montar, X, P, T, L } from "./escenario.mjs";

const M = X.OcgDuelMode, GOAT = M.MODE_GOAT;
const activo = f => (GOAT & f) === f && f !== 0n;

/* Las 20 diferencias históricas de goatformat.com, con el interruptor del
   motor que las implementa (o "—" si no es cosa de un flag). */
const LISTA = [
 ["1  el que empieza roba en el turno 1",            M.FIRST_TURN_DRAW],
 ["2  Main/Fusion Deck sin límite de tamaño",        null, "no lo controla el motor: lo controla el deck builder"],
 ["3  solo un Field Spell activo entre los dos",     M.ONE_FACEUP_FIELD],
 ["4  prioridad para efectos de ignición",           M.OBSOLETE_IGNITION],
 ["5  replay de ataque histórico",                   M.STORE_ATTACK_REPLAYS],
 ["6  Trampa Continua: activar ≠ usar su efecto",    M.USE_TRAPS_IN_NEW_CHAIN],
 ["7  verificación de mano/deck",                    null, "regla de torneo presencial; no aplica"],
 ["8  Failure to Find (buscar sin objetivo)",        null, "va en el script Lua de cada carta"],
 ["9  SEGOC histórico",                              M.TCG_SEGOC_NONPUBLIC | M.TCG_SEGOC_FIRSTTRIGGER],
 ["10 seis ventanas en el Damage Step",              M.SIX_STEP_BATLLE_STEP],
 ["11 procedimiento de match/tablas",                null, "no hay matches todavía"],
 ["12 triggers detectados en mitad de cadena",       M.TRIGGER_WHEN_PRIVATE_KNOWLEDGE],
 ["13 Relinquished/TER como equipo",                 M.EQUIP_NOT_SENT_IF_MISSING_TARGET],
 ["14 cambiar posición de un monstruo recién robado",M.CAN_REPOS_IF_NON_SUMPLAYER],
 ["15 0 ATK contra 0 ATK: mueren los dos",           M.ZERO_ATK_DESTROYED],
 ["16 costes de LP y activar sin cartas para robar", null, "va en el script Lua de cada carta"],
 ["17 bucles infinitos",                             null, "lo resuelve el motor, no hay flag"],
 ["18 reglas antiguas de Union",                     null, "va en el script Lua de cada carta"],
 ["19 respuestas al descarte de final de turno",     M.TRIGGER_WHEN_PRIVATE_KNOWLEDGE],
 ["20 una sola cadena por subpaso del Damage Step",  M.SINGLE_CHAIN_IN_DAMAGE_SUBSTEP],
];
console.log("═══ INTERRUPTORES DE REGLAS QUE ENCIENDE MODE_GOAT ═══");
let cubiertas=0, fuera=0;
for(const [texto, flag, nota] of LISTA){
  if(flag === null){ console.log(`  ·  ${texto} — ${nota}`); fuera++; continue; }
  const on = activo(flag);
  console.log(`  ${on?"✓":"✗"}  ${texto}`);
  if(on) cubiertas++;
}
console.log(`\n${cubiertas} de ${LISTA.length-fuera} diferencias van por interruptor del motor y están encendidas.`);
console.log(`${fuera} no dependen del motor (scripts Lua, deck builder o reglas de torneo).`);

/* Interruptores encendidos que NO están en la lista de arriba: conviene
   verlos para saber qué más cambia respecto al juego moderno. */
const NOMBRES = X.ocgDuelModeString;
const extra=[];
for(const [bit, nom] of NOMBRES){
  if(String(nom).startsWith("mode_")) continue;
  if((GOAT & bit) === bit && bit!==0n) extra.push(nom);
}
console.log("\ntodos los interruptores activos:", extra.join(", "));

/* ══════════ AHORA, JUGANDO ══════════ */
const pruebas=[];
const comprobar=(t,v,detalle)=>{ pruebas.push([t,v,detalle]); console.log(v?"  ✓":"  ✗", t, detalle?`— ${detalle}`:""); };

console.log("\n═══ LAS MISMAS REGLAS, EN PARTIDAS MONTADAS A MANO ═══");

/* 1. El que empieza roba en el turno 1: llega a Main Phase con 6 cartas. */
{
  const e = await montar({}, {});
  await e.correr(m => m.type===T.SELECT_IDLECMD ? "PARAR" : null, 200);
  const t = e.turnPlayer;
  comprobar("el jugador que empieza tiene 6 cartas en su primera Main Phase",
    e.mano(t).length===6 && e.mano(1-t).length===5,
    `mano del que empieza ${e.mano(t).length}, del otro ${e.mano(1-t).length}`);
}

/* 2. Dos monstruos de 0 ATK chocan y mueren los dos (regla de 2005). */
{
  const e = await montar(
    { monstruos:[{carta:"Ojama Green", pos:P.FACEUP_ATTACK}] },
    { monstruos:[{carta:"Chaos Necromancer", pos:P.FACEUP_ATTACK}] });
  let ataques=0;
  await e.correr((m,ctx)=>{
    if(m.type===T.SELECT_IDLECMD)
      return { type:X.OcgResponseType.SELECT_IDLECMD,
               action: m.to_bp ? X.SelectIdleCMDAction.TO_BP : X.SelectIdleCMDAction.TO_EP, index:null };
    if(m.type===T.SELECT_BATTLECMD){
      if(m.attacks?.length && !ataques){ ataques++;
        return { type:X.OcgResponseType.SELECT_BATTLECMD,
                 action:X.SelectBattleCMDAction.SELECT_BATTLE, index:0 }; }
      if(ataques) return "PARAR";
      return { type:X.OcgResponseType.SELECT_BATTLECMD,
               action: m.to_ep ? X.SelectBattleCMDAction.TO_EP : X.SelectBattleCMDAction.TO_M2, index:null };
    }
    return null;
  }, 600);
  const vivos = e.campo(0).length + e.campo(1).length;
  const enGY = e.gy(0).some(c=>c.nombre==="Ojama Green") && e.gy(1).some(c=>c.nombre==="Chaos Necromancer");
  comprobar("0 ATK ataca a 0 ATK y se destruyen los dos", ataques>0 && vivos===0 && enGY,
    `ataques declarados ${ataques}, monstruos en pie ${vivos}`);
}

/* 3. Solo puede haber un Field Spell en toda la mesa. */
{
  const e = await montar({ mano:["Umi"] }, { mano:["Wasteland"] });
  let activadas=0;
  await e.correr((m)=>{
    if(m.type===T.SELECT_IDLECMD){
      // en la mano solo hay el Field Spell y vainillas: la única activación
      // posible es la que nos interesa
      if((m.activates??[]).length && activadas<2){
        activadas++;
        return { type:X.OcgResponseType.SELECT_IDLECMD,
                 action:X.SelectIdleCMDAction.SELECT_ACTIVATE, index:0 };
      }
      if(activadas>=2) return "PARAR";
      return { type:X.OcgResponseType.SELECT_IDLECMD,
               action: X.SelectIdleCMDAction.TO_EP, index:null };
    }
    return null;
  }, 600);
  /* OJO: con reglas de 2005 el Field Spell NO vive en FZONE. El motor lo
     pone en el puesto 5 de la zona de magias y trampas. Descubrirlo aquí
     explicó por qué la casilla "Campo" del tablero no se ocupaba nunca. */
  const enMesa = [...e.mt(0), ...e.mt(1)].filter(c=>["Umi","Wasteland"].includes(c.nombre));
  const enFZone = e.fzone(0).length + e.fzone(1).length;
  comprobar("con dos Field Spells solo queda uno en la mesa",
    activadas>=2 && enMesa.length===1 && e.gy(0).some(c=>c.nombre==="Umi"),
    `en mesa ${enMesa.map(c=>c.nombre).join("+")||"ninguno"}, el otro al cementerio`);
  comprobar("el Field Spell ocupa el puesto 5 de la zona de M/T, no FZONE",
    enFZone===0 && enMesa.length===1,
    "por eso la vista traduce SZONE[5] a la casilla de Campo");
}

const ok = pruebas.filter(p=>p[1]).length;
console.log(`\n${ok}/${pruebas.length} escenarios se comportan como en 2005`);
