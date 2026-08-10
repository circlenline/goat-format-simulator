/* ════════════════════════════════════════════════════════════════
   BATERÍA DE CARTAS

   Escenarios montados a mano para ver qué hace el motor con cartas
   concretas. Cada uno responde a una pregunta que estaba abierta o a
   una interacción que, si se rompe, arruina una partida entera.

   Se pregunta SIEMPRE al motor (`duelQueryLocation`), nunca al espejo.
   ════════════════════════════════════════════════════════════════ */
import { montar, codigo, nombre, X, P, T, L } from "./escenario.mjs";

const R = X.OcgResponseType, IA = X.SelectIdleCMDAction, BA = X.SelectBattleCMDAction;
const pruebas=[];
const comprobar=(t,v,detalle)=>{ pruebas.push([t,!!v]); console.log(v?"  ✓":"  ✗", t, detalle?`— ${detalle}`:""); };

/* ── atajos para escribir guiones ── */
/* En la base hay dos códigos por carta (normal y "(GOAT)"/"(Pre-Errata)")
   y el del pool suele ser el segundo: al comparar nombres hay que quitar
   el paréntesis o "Sangan" nunca es igual a "Sangan (GOAT)". */
const raiz = n => String(n).replace(/\s*\((GOAT|Pre-Errata|Anime)\)\s*$/i,"").trim();
const tiene = (lista, nom) => lista.some(c=>raiz(c.nombre)===nom);
const idx = (lista, nom) => (lista??[]).findIndex(a=>a.code===codigo(nom));
const pasarIdle = m => ({ type:R.SELECT_IDLECMD, action: m.to_ep?IA.TO_EP:IA.TO_BP, index:null });
const aBatalla  = m => ({ type:R.SELECT_IDLECMD, action: m.to_bp?IA.TO_BP:IA.TO_EP, index:null });
const pasarBatalla = m => ({ type:R.SELECT_BATTLECMD, action: m.to_ep?BA.TO_EP:BA.TO_M2, index:null });
const activar = (m, nom) => { const i=idx(m.activates,nom);
  return i<0 ? null : { type:R.SELECT_IDLECMD, action:IA.SELECT_ACTIVATE, index:i }; };
const invocar = (m, nom) => { const i=idx(m.summons,nom);
  return i<0 ? null : { type:R.SELECT_IDLECMD, action:IA.SELECT_SUMMON, index:i }; };
const voltear = (m, nom) => { const i=idx(m.pos_changes,nom);
  return i<0 ? null : { type:R.SELECT_IDLECMD, action:IA.SELECT_POS_CHANGE, index:i }; };
const atacarCon = (m, nom) => { const i=idx(m.attacks,nom);
  return i<0 ? null : { type:R.SELECT_BATTLECMD, action:BA.SELECT_BATTLE, index:i }; };
const elegir = (m, i=0) => ({ type:R.SELECT_CARD, indicies:[i] });

console.log("═══ CARTAS, UNA A UNA ═══\n");

/* ────────────────────────────────────────────────────────────────
   1. MAGICIAN OF FAITH — pendiente: ¿deja elegir la mágica?
   ──────────────────────────────────────────────────────────────── */
{
  const e = await montar(
    { monstruos:[{carta:"Magician of Faith", pos:P.FACEDOWN_DEFENSE}],
      gy:["Pot of Greed","Graceful Charity"] },
    {});
  let ofrecidas=null, volteada=false;
  await e.correr((m)=>{
    /* Hay que PARAR en cuanto resuelve: si se deja correr la partida,
       el descarte por límite de mano se lleva la carta recuperada y
       parece que el efecto no funcionó. */
    if(m.type===T.SELECT_IDLECMD){
      if(ofrecidas) return "PARAR";
      if(e.turnPlayer===0 && !volteada){ const r=voltear(m,"Magician of Faith"); if(r){ volteada=true; return r; } }
      return pasarIdle(m);
    }
    if(m.type===T.SELECT_CARD && volteada && !ofrecidas){
      ofrecidas = m.selects.map(s=>nombre(s.code));
      return elegir(m, Math.max(0, idx(m.selects,"Pot of Greed")));
    }
    if(m.type===T.SELECT_BATTLECMD) return pasarBatalla(m);
    return null;
  }, 400);
  comprobar("Magician of Faith deja elegir qué mágica recupera",
    ofrecidas && ofrecidas.length===2,
    ofrecidas ? `ofreció ${ofrecidas.join(" y ")}` : "no llegó a preguntar");
  comprobar("y la elegida acaba en tu mano", tiene(e.mano(0), "Pot of Greed"),
    `mano: ${e.mano(0).map(c=>c.nombre).filter(n=>n!=="Mystical Elf").join(", ")||"solo relleno"}`);
}

/* ────────────────────────────────────────────────────────────────
   2. THOUSAND-EYES RESTRICT — pendiente: absorbe tapadas y ataca con 0
   ──────────────────────────────────────────────────────────────── */
{
  const e = await montar(
    { monstruos:[{carta:"Thousand-Eyes Restrict", pos:P.FACEUP_ATTACK}] },
    { monstruos:[{carta:"Mystical Elf", pos:P.FACEDOWN_DEFENSE},
                 {carta:"Airknight Parshath", pos:P.FACEUP_ATTACK}] });
  let ofrecidas=null;
  await e.correr((m)=>{
    if(m.type===T.SELECT_IDLECMD){
      const r = activar(m,"Thousand-Eyes Restrict");
      if(r && !ofrecidas) return r;
      return pasarIdle(m);
    }
    if(m.type===T.SELECT_CARD && !ofrecidas){
      ofrecidas = m.selects.map(s=>`${nombre(s.code)}${s.position && (s.position & 0x0a) ? " (tapado)" : ""}`);
      const i = idx(m.selects,"Mystical Elf");   // a propósito: el tapado
      return elegir(m, i<0?0:i);
    }
    if(m.type===T.SELECT_BATTLECMD) return pasarBatalla(m);
    return null;
  }, 400);
  const ter = e.campo(0).find(c=>raiz(c.nombre)==="Thousand-Eyes Restrict");
  comprobar("Thousand-Eyes Restrict SÍ puede absorber un monstruo tapado",
    !!ofrecidas && ofrecidas.some(o=>o.includes("(tapado)")),
    ofrecidas ? `ofreció: ${ofrecidas.join(", ")}` : "no preguntó");
  comprobar("...y absorbiendo el tapado se queda en 0 ATK: es la jugada mala",
    ter && ter.atk === 0, ter ? `ATK ${ter.atk}` : "no quedó TER en campo");
}

/* ────────────────────────────────────────────────────────────────
   3. TRAP DUSTSHOOT — pendiente: cómo llega la mano del rival
   ──────────────────────────────────────────────────────────────── */
{
  const e = await montar(
    { mt:[{carta:"Trap Dustshoot", pos:P.FACEDOWN_DEFENSE}] },
    { mano:["Airknight Parshath","Sangan","Pot of Greed","Book of Moon"] });
  let vistas=null;
  await e.correr((m)=>{
    if(m.type===T.SELECT_IDLECMD) return vistas ? "PARAR" : pasarIdle(m);
    if(m.type===T.SELECT_CHAIN){
      const i=idx(m.selects,"Trap Dustshoot");
      if(i>=0 && !vistas) return { type:R.SELECT_CHAIN, index:i };
      return { type:R.SELECT_CHAIN, index:null };
    }
    if(m.type===T.SELECT_CARD && !vistas){
      vistas = m.selects.map(s=>({ nombre:nombre(s.code), zona:s.location }));
      return elegir(m, 0);
    }
    if(m.type===T.SELECT_BATTLECMD) return pasarBatalla(m);
    return null;
  }, 500);
  comprobar("Trap Dustshoot ofrece los monstruos de la mano rival, con su código",
    vistas && vistas.length>=1 && vistas.every(v=>v.zona===2),
    vistas ? `ofreció ${vistas.map(v=>v.nombre).join(", ")}` : "no llegó a preguntar");
  comprobar("y la carta elegida sale de la mano rival",
    vistas && !tiene(e.mano(1), raiz(vistas[0].nombre)),
    `se eligió ${vistas?vistas[0].nombre:"—"}, quedan ${e.mano(1).length} cartas`);
}

/* ────────────────────────────────────────────────────────────────
   4. SANGAN — muere en combate y busca
   ──────────────────────────────────────────────────────────────── */
{
  const e = await montar(
    { monstruos:[{carta:"Sangan", pos:P.FACEUP_ATTACK}] },
    { monstruos:[{carta:"Airknight Parshath", pos:P.FACEUP_ATTACK}],
      deck:["Mystical Elf"] });
  let buscado=null, atacado=false;
  await e.correr((m)=>{
    if(m.type===T.SELECT_IDLECMD) return e.turnPlayer===1 ? aBatalla(m) : pasarIdle(m);
    if(m.type===T.SELECT_BATTLECMD){
      if(!atacado){ const r=atacarCon(m,"Airknight Parshath"); if(r){ atacado=true; return r; } }
      return pasarBatalla(m);
    }
    if(m.type===T.SELECT_CARD && atacado && !buscado && m.selects.every(s=>s.location===1)){
      buscado = m.selects.map(s=>nombre(s.code));
      return elegir(m, 0);
    }
    return null;
  }, 600);
  comprobar("Sangan destruido en combate busca en el Deck",
    atacado && buscado && buscado.length>0,
    buscado ? `ofreció ${buscado.length} carta(s): ${buscado.slice(0,3).join(", ")}` : "no buscó");
  comprobar("Sangan acaba en el cementerio", tiene(e.gy(0), "Sangan"));
}

/* ────────────────────────────────────────────────────────────────
   5. SINISTER SERPENT — vuelve en TU Standby Phase, no un turno tarde
   ──────────────────────────────────────────────────────────────── */
{
  const e = await montar({ gy:["Sinister Serpent"] }, {});
  let ofrecidoEnTurno=null;
  await e.correr((m)=>{
    /* OJO: no llega como SELECT_CHAIN sino como SELECT_EFFECTYN
       ("¿activas el efecto de Sinister Serpent?"). */
    if(m.type===T.SELECT_EFFECTYN && m.code===codigo("Sinister Serpent")){
      if(ofrecidoEnTurno===null)
        ofrecidoEnTurno = { turno:e.turno, jugador:m.player, fase:e.fase };
      return { type:R.SELECT_EFFECTYN, yes:true };
    }
    if(m.type===T.SELECT_CHAIN) return { type:R.SELECT_CHAIN, index:null };
    if(m.type===T.SELECT_IDLECMD) return pasarIdle(m);
    if(m.type===T.SELECT_BATTLECMD) return pasarBatalla(m);
    return null;
  }, 600);
  comprobar("Sinister Serpent se ofrece en la Standby Phase de su dueño",
    ofrecidoEnTurno && ofrecidoEnTurno.jugador===0 && ofrecidoEnTurno.fase===2,
    ofrecidoEnTurno ? `turno ${ofrecidoEnTurno.turno}, jugador ${ofrecidoEnTurno.jugador}, fase ${ofrecidoEnTurno.fase}` : "nunca se ofreció");
  comprobar("y vuelve a la mano", tiene(e.mano(0), "Sinister Serpent"));
}

/* ────────────────────────────────────────────────────────────────
   6. SCAPEGOAT — cuatro fichas y bloquea tu invocación
   ──────────────────────────────────────────────────────────────── */
{
  const e = await montar({ mano:["Scapegoat","Airknight Parshath"] }, {});
  let activada=false, podiaInvocarDespues=null;
  await e.correr((m)=>{
    if(m.type===T.SELECT_IDLECMD){
      if(!activada){ const r=activar(m,"Scapegoat"); if(r){ activada=true; return r; } }
      else if(podiaInvocarDespues===null && e.turnPlayer===0){
        podiaInvocarDespues = (m.summons??[]).length>0;
        return "PARAR";
      }
      return pasarIdle(m);
    }
    return null;
  }, 400);
  comprobar("Scapegoat deja cuatro fichas", e.campo(0).length===4,
    `${e.campo(0).length} monstruos en campo`);
  comprobar("y bloquea la invocación normal ese turno", podiaInvocarDespues===false,
    podiaInvocarDespues===null ? "no se llegó a comprobar" : "");
}

/* ────────────────────────────────────────────────────────────────
   7. SNATCH STEAL — te llevas el monstruo y él cobra 1000 cada Standby
   ──────────────────────────────────────────────────────────────── */
{
  const e = await montar(
    { mano:["Snatch Steal"] },
    { monstruos:[{carta:"Airknight Parshath", pos:P.FACEUP_ATTACK}] });
  let robado=false, lpTrasStandby=null;
  await e.correr((m)=>{
    if(m.type===T.SELECT_IDLECMD){
      if(!robado){ const r=activar(m,"Snatch Steal"); if(r){ robado=true; return r; } }
      if(robado && e.turno>=2 && lpTrasStandby===null){ lpTrasStandby=e.lp[1]; return "PARAR"; }
      return pasarIdle(m);
    }
    if(m.type===T.SELECT_CARD) return elegir(m,0);
    if(m.type===T.SELECT_BATTLECMD) return pasarBatalla(m);
    return null;
  }, 600);
  comprobar("Snatch Steal pasa el monstruo a tu lado del campo",
    tiene(e.campo(0), "Airknight Parshath"),
    `campo tuyo: ${e.campo(0).map(c=>c.nombre).join(", ")||"vacío"}`);
  comprobar("y el rival cobra 1000 LP en su Standby Phase",
    lpTrasStandby===9000, `LP del rival: ${lpTrasStandby}`);
}

/* ────────────────────────────────────────────────────────────────
   8. BOOK OF MOON — deja el monstruo boca abajo en defensa
   ──────────────────────────────────────────────────────────────── */
{
  const e = await montar(
    { mano:["Book of Moon"] },
    { monstruos:[{carta:"Airknight Parshath", pos:P.FACEUP_ATTACK}] });
  let usada=false;
  await e.correr((m)=>{
    if(m.type===T.SELECT_IDLECMD){
      if(!usada){ const r=activar(m,"Book of Moon"); if(r){ usada=true; return r; } }
      if(usada) return "PARAR";
      return pasarIdle(m);
    }
    if(m.type===T.SELECT_CARD) return elegir(m,0);
    return null;
  }, 400);
  const obj = e.campo(1)[0];
  comprobar("Book of Moon deja el objetivo boca abajo en defensa",
    usada && obj && (obj.pos & 0x08)!==0,
    obj ? `posición ${obj.pos} (8 = tapado en defensa)` : "no queda monstruo");
}

/* ────────────────────────────────────────────────────────────────
   9. EXODIA — las cinco piezas en la mano ganan la partida
   ──────────────────────────────────────────────────────────────── */
{
  const piezas=["Exodia the Forbidden One","Right Arm of the Forbidden One",
    "Left Arm of the Forbidden One","Right Leg of the Forbidden One",
    "Left Leg of the Forbidden One"];
  const e = await montar({ mano:piezas }, {});
  await e.correr(m => m.type===T.SELECT_IDLECMD ? pasarIdle(m) : null, 300);
  comprobar("con las cinco piezas de Exodia en la mano se gana",
    e.finished && e.ganador===0, `terminado ${e.finished}, ganador ${e.ganador}`);
}

/* ────────────────────────────────────────────────────────────────
   10. D.D. WARRIOR LADY — destierra a los dos tras el combate
   ──────────────────────────────────────────────────────────────── */
{
  const e = await montar(
    { monstruos:[{carta:"D.D. Warrior Lady", pos:P.FACEUP_ATTACK}] },
    { monstruos:[{carta:"Mystical Elf", pos:P.FACEUP_ATTACK}] });
  let atacado=false;
  await e.correr((m)=>{
    if(m.type===T.SELECT_IDLECMD) return e.turnPlayer===0 ? aBatalla(m) : pasarIdle(m);
    if(m.type===T.SELECT_BATTLECMD){
      if(!atacado){ const r=atacarCon(m,"D.D. Warrior Lady"); if(r){ atacado=true; return r; } }
      return pasarBatalla(m);
    }
    if(m.type===T.SELECT_EFFECTYN) return { type:R.SELECT_EFFECTYN, yes:true };
    return null;
  }, 600);
  const fueraTuya = tiene(e.zona(0,32), "D.D. Warrior Lady");
  const fueraSuya = tiene(e.zona(1,32), "Mystical Elf");
  comprobar("D.D. Warrior Lady se destierra a sí misma y al rival",
    atacado && fueraTuya && fueraSuya,
    `desterradas: ${fueraTuya?"ella":"—"} / ${fueraSuya?"el rival":"—"}`);
}

const ok = pruebas.filter(p=>p[1]).length;
console.log(`\n${ok}/${pruebas.length} comprobaciones de carta pasan`);
