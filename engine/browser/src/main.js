/* ════════════════════════════════════════════════════════════
   ORQUESTADOR: motor + adaptador + vista + IA.
   El control principal es arrastrar cartas; los botones quedan
   para lo que no tiene representación física (pasar de fase).
   ════════════════════════════════════════════════════════════ */
let ME = 0;   // lado que te toca; lo decide el sorteo
let duel, decideAI, trivial, OCG, V, NAMES, DB;
let chainMode = "auto", chainActive = false;
let nivelBot = "duro", cerebro = null;
/* Decisiones que se resuelven solas y nunca se te muestran: colocar en
   qué zona, ordenar cartas, declarar tipo/atributo. */
let AUTO_KINDS = new Set();
let DB_RAW = {};
/* Ventana de respuesta a cadenas: si no contestas, se pasa sola.
   Solo se aplica aquí. En los "¿quieres activar el efecto?" no hay
   temporizador a propósito: dejar que caiga tiraría valor a la basura
   (por ejemplo el retorno de Sinister Serpent). */
let CHAIN_TIMEOUT = (typeof globalThis.GOAT_CHAIN_TIMEOUT === "number")
  ? globalThis.GOAT_CHAIN_TIMEOUT : 15;
let promptTimer = null;
let idle = null;            // SELECT_IDLECMD vigente
let battle = null;          // SELECT_BATTLECMD vigente
let preferredPlace = null;  // zona donde soltó el jugador

const PHNAME={1:"Draw Phase",2:"Standby Phase",4:"Main Phase 1",8:"Battle Phase",
  16:"Battle Step",32:"Damage Step",64:"Damage Step",128:"Battle Phase",
  256:"Main Phase 2",512:"End Phase"};
const LOCNAME={1:"Deck",2:"mano",4:"campo",8:"M/T",16:"Cementerio",32:"desterradas",64:"Extra"};
const ETIQUETA_NIVEL={novato:"Novato",normal:"Normal",duro:"Duro",experto:"Experto"};
/* Por qué terminó el duelo. Los códigos son los del motor. */
const MOTIVOS={0:"Puntos de vida a cero",1:"Se quedó sin cartas en el Deck",
  2:"Efecto de una carta",3:"Rendición",4:"Se acabó el tiempo"};
const T = s => (globalThis.__T ? globalThis.__T(s) : s);
let CONFIG=null;   // lo que eligió el jugador en el menú (avatares, mazos…)
/* Progreso del modo bots: qué mazo has ganado y en qué dificultad. Se
   guarda con la misma forma que lo lee el menú. */
function apuntarVictoria(){
  const reto = CONFIG?.reto;
  if(!reto?.mazoRival || !reto?.nivel) return;
  try{
    const p = JSON.parse(localStorage.getItem("goatProgreso")||"{}");
    p[reto.mazoRival] = p[reto.mazoRival] || {};
    p[reto.mazoRival][reto.nivel] = true;
    localStorage.setItem("goatProgreso", JSON.stringify(p));
  }catch(err){}
}

/* ── registro de partida ──────────────────────────────────────
   Guarda todo lo que pasa: mensajes del motor, lo que se te
   preguntó y lo que respondiste. Con el botón "Descargar log"
   sale un fichero que permite reproducir el fallo. */
const LOG=[]; let SEED=null, DECKLOG=null;
const t0=Date.now();
function snap(v, prof=0){
  if(v===null||typeof v!=="object") return typeof v==="bigint" ? v.toString()+"n" : v;
  if(prof>4) return "…";
  if(Array.isArray(v)) return v.map(x=>snap(x,prof+1));
  const o={};
  for(const k in v){ if(k==="el"||k==="_el") continue; o[k]=snap(v[k],prof+1); }
  return o;
}
function logIt(kind, data){
  // copia inmediata: si guardásemos referencias, el fichero mostraría el
  // estado final de cada carta y no el del momento del suceso
  data = snap(data);
  LOG.push({ ms:Date.now()-t0, turno:duel?.turnCount??0,
             deQuien:duel?.turnPlayer===ME?"tú":"rival",
             fase:PHNAME[duel?.phase]??"", kind, data });
  if(LOG.length>6000) LOG.splice(0,2000);
}
const queue=[]; const onEvent = e => { logIt("evento", e); queue.push(e); };
const nm = c => (NAMES[c]?.name ?? "#"+c);

async function drain(){
  while(queue.length){
    if(rendido) return true;
    const e=queue.shift();
    switch(e.t){
      case "turn":
        V.banner(`Turno ${e.turn} — ${e.player===ME?"Tú":"Oponente"}`,
                 e.player===ME?"var(--gold)":"#ff8f7a");
        setHUD(e.player, duel.phase); await V.sleep(600); break;
      case "phase":
        chainActive=false; V.ocultarReveladas(); V.setMomento(null);
        V.setPhase(e.phase); setHUD(duel.turnPlayer,e.phase);
        await V.announcePhase(e.phase, duel.turnPlayer===ME);
        await V.sleep(90); break;
      case "draw": case "pos": V.layoutAll(); await V.sleep(e.t==="draw"?240:290); break;
      case "move":
        if(e.to?.location===32 && e.from?.location!==32)
          V.toast(`Desterrada: ${nm(e.code)}`);
        V.layoutAll(); await V.sleep(290); break;
      case "summon":
        V.alHistorial(e.code, duel.cards.get(e.uid)?.controller===ME,
                      e.kind==="flip" ? "volteo" : "invoca");
        if(e.uid){ V.glow(e.uid,true); V.layoutAll(); await V.sleep(400); V.glow(e.uid,false); }
        V.toast(`${e.kind==="special"?"Invocación especial":e.kind==="flip"?"Invocación por volteo":"Invoca"}: ${nm(e.code)}`);
        await V.sleep(180); break;
      case "chain":
        chainActive=true;
        V.alHistorial(e.code, e.controller===ME, "cadena");
        if(e.uid) V.glow(e.uid,true);
        V.toast(`Cadena ${e.link}: ${nm(e.code)}`); await V.sleep(500);
        if(e.uid) V.glow(e.uid,false); break;
      case "chainEnd": chainActive=false; V.ocultarReveladas(); break;
      /* Cartas que un efecto pone boca arriba (Trap Dustshoot, Confiscation…):
         salen al centro del tablero hasta que la cadena termina. */
      case "revelar":
        if(e.uids?.length){
          V.revelar(e.uids);
          V.toast(e.location===2 ? "Se revela la mano del rival"
                                 : `Se revelan ${e.uids.length} carta(s)`);
          await V.sleep(750);
        }
        break;
      /* Nada de cartel a pantalla completa: pasa en cada ataque. Basta con
         la etiqueta sobre Battle, el HUD y el título del panel de cadena. */
      case "damageStep":
        V.setMomento(e.on ? "damage" : null);
        setHUD(duel.turnPlayer, duel.phase);
        break;
      case "attack":
        chainActive=true; V.setMomento("ataque"); setHUD(duel.turnPlayer, duel.phase);
        await V.telegraphAttack(e.uid, e.targetUid); break;
      case "battle":  await V.animateBattle(e.uid, e.targetUid); break;
      case "attackCancelled": V.toast("Ataque anulado"); await V.sleep(220); break;
      case "damage": V.popDamage(e.amount,e.player); V.setLP(e.player,e.lp); await V.sleep(320); break;
      case "recover": case "lp": V.setLP(e.player, e.lp ?? e.value); await V.sleep(200); break;
      case "win":
        if(e.player===ME) apuntarVictoria();
        V.banner(e.player===ME?"¡HAS GANADO!":"HAS PERDIDO", e.player===ME?"var(--gold)":"#ff6a55");
        hidePanel(); V.setControles(null); V.ocultarReveladas();
        await V.sleep(1500);
        await V.pantallaFinal({
          ganaste: e.player===ME, motivo: MOTIVOS[e.reason] ?? "",
          lpMio: duel.lp[ME], lpRival: duel.lp[1-ME], turnos: duel.turnCount,
          avatarMio: CONFIG?.avatarMio, avatarRival: CONFIG?.avatarRival,
          nombreRival: CONFIG?.nombreRival });
        return true;
      case "coreError": console.warn("[core]", e.text); break;
    }
  }
  V.layoutAll(); V.fitBoard();
  return duel.finished;
}
function setHUD(player, phase){
  // el Damage Step no es una fase de la tira: se añade aparte si estamos en él
  const extra = V?.momentoTexto?.() ? ` · <b style="color:#ffb257">${V.momentoTexto()}</b>` : "";
  document.getElementById("turnInfo").innerHTML =
    `<b style="color:${player===ME?"var(--gold)":"#ff8f7a"}">${T(player===ME?"TU TURNO":"TURNO RIVAL")}</b>`+
    `<span style="opacity:.6"> · ${T(PHNAME[phase]??"")} · ${T("Turno "+duel.turnCount)}</span>${extra}`;
}

/* ── panel inferior (solo para lo que no se puede arrastrar) ── */
function panel(title, options, note){
  if(!options.length && !note) { hidePanel(); return; }
  const p=document.getElementById("prompt");
  const fase = T(PHNAME[duel?.phase] ?? "");
  const cuando = momentoPanel && momentoPanel!==fase ? ` · ${T(momentoPanel)}` : "";
  p.innerHTML=`<div class="pfase">${fase}${cuando}</div>`+
    `<div class="ptitle">${T(title)}</div>${note?`<div class="pnote">${T(note)}</div>`:""}`;
  const box=document.createElement("div"); box.className="popts";
  for(const o of options){
    const b=document.createElement("button");
    b.className="btn "+(o.primary?"gold":""); b.textContent=T(o.label);
    b.onclick=()=>{ hidePanel(); o.run(); };
    box.appendChild(b);
  }
  p.appendChild(box); p.style.display="block";
}
const RAZAS={"1":"Guerrero","2":"Mago","4":"Hada","8":"Demonio","16":"Zombi","32":"Máquina",
  "64":"Aqua","128":"Piro","256":"Roca","512":"Bestia Alada","1024":"Planta","2048":"Insecto",
  "4096":"Trueno","8192":"Dragón","16384":"Bestia","32768":"Bestia Guerrero",
  "65536":"Dinosaurio","131072":"Pez","262144":"Serpiente Marina","524288":"Reptil"};
const ATRIBUTOS={"1":"FUEGO","2":"AGUA","4":"TIERRA","8":"VIENTO","16":"LUZ",
  "32":"OSCURIDAD","64":"DIVINO"};
/* Buscador para declarar el nombre de una carta. */
function declararCarta(codigos, alElegir){
  const p=document.getElementById("prompt");
  p.innerHTML=`<div class="ptitle">${T("Declara una carta")}</div>
    <input id="buscaCarta" placeholder="${T("Escribe un nombre…")}" autocomplete="off">
    <div class="pnote" id="buscaAyuda">${codigos.length} cartas posibles</div>
    <div class="popts" id="buscaRes"></div>`;
  p.style.display="block";
  const inp=p.querySelector("#buscaCarta"), res=p.querySelector("#buscaRes");
  const pintar=()=>{
    const q=(inp.value||"").trim().toLowerCase();
    const hits=[];
    for(const c of codigos){
      const n=nm(c);
      if(!q || n.toLowerCase().includes(q)){ hits.push([c,n]); if(hits.length>=40) break; }
    }
    hits.sort((a,b)=>a[1].localeCompare(b[1]));
    res.innerHTML="";
    for(const [c,n] of hits){
      const b=document.createElement("button");
      b.className="btn"; b.textContent=n;
      b.onclick=()=>{ hidePanel(); alElegir(c); };
      res.appendChild(b);
    }
    p.querySelector("#buscaAyuda").textContent =
      q ? `${hits.length}${hits.length>=40?"+":""} coincidencias` : `${codigos.length} cartas posibles · escribe para filtrar`;
  };
  inp.oninput=pintar; pintar();
  setTimeout(()=>inp.focus?.(),30);
}
function hidePanel(){
  cancelPromptTimer();
  V?.setControles?.(null);
  document.getElementById("prompt").style.display="none";
}
function cancelPromptTimer(){
  if(promptTimer){ clearInterval(promptTimer); promptTimer=null; }
  document.getElementById("ptimer")?.remove();
}
function startPromptTimer(segundos, alAgotarse){
  cancelPromptTimer();
  const p=document.getElementById("prompt");
  const barra=document.createElement("div");
  barra.id="ptimer";
  barra.innerHTML=`<div class="ptnum"></div><div class="ptbar"><i></i></div>`;
  p.insertBefore(barra, p.firstChild);
  const relleno=barra.querySelector("i"), num=barra.querySelector(".ptnum");
  const t0=Date.now(), total=segundos*1000;
  promptTimer=setInterval(()=>{
    const queda=Math.max(0, total-(Date.now()-t0));
    relleno.style.width=(queda/total*100)+"%";
    num.textContent=Math.ceil(queda/1000)+"s";
    barra.classList.toggle("urgente", queda<5000);
    if(queda<=0){ cancelPromptTimer(); alAgotarse(); }
  },100);
}
let MSGNAME={};
function msgName(m){ return MSGNAME[m.type] ?? ("tipo "+m.type); }
/* En qué momento exacto se te está preguntando. No hace falta adivinarlo:
   el propio mensaje del motor trae el "timing". Importa sobre todo en
   batalla, donde responder en la declaración de ataque o ya dentro del
   Damage Step son dos jugadas distintas con Book of Moon en la mano. */
const TIMINGS = [
  [4096,"Declaración de ataque"], [134217728,"Tras el combate"],
  [67108864,"Fin del Battle Step"], [16777216,"Battle Phase"],
  [64,"Invocación normal"], [128,"Invocación especial"], [256,"Invocación por volteo"],
  [512,"Al colocar monstruo"], [1024,"Al colocar M/T"], [2048,"Cambio de posición"],
  [524288,"Al destruirse"], [8388608,"Al ir al cementerio"], [2097152,"Al ir a la mano"],
  [32768,"Final de la cadena"], [8,"Inicio de la Battle Phase"], [16,"Fin de la Battle Phase"],
  [4,"Final de la Main Phase"], [32,"End Phase"], [2,"Standby Phase"], [1,"Draw Phase"],
];
/* Antes esto pegaba el momento al título de cada panel y quedaba un
   "¿Confirmas? · Damage Step" que parecía que te pedían aceptar el Damage
   Step. Ahora el momento va en su propia línea, arriba del panel, junto a
   la fase: es una referencia, no una pregunta. */
let momentoPanel = "";
const conMomento = (titulo, m) => { momentoPanel = momentoPregunta(m) || ""; return titulo; };
/* Las "descripciones" del motor llevan el código de la carta en los bits
   altos cuando el aviso es de una carta concreta. */
function cartaDeDescripcion(d){
  try{
    const b = BigInt(d ?? 0);
    if(b > 1048575n){ const c = Number(b >> 20n); if(NAMES[c]) return c; }
  }catch(e){}
  return null;
}
function momentoPregunta(m){
  const t = ((m?.hint_timing>>>0) || (m?.hint_timing_other>>>0)) >>> 0;
  /* Dentro del Damage Step manda el estado que lleva el adaptador: el
     mensaje trae varios bits a la vez y el que importa es ese. */
  if(V?.momento?.() === "damage")
    return (t & 16384) ? "Damage Step · cálculo de daño" : "Damage Step";
  for(const [bit,txt] of TIMINGS) if(t & bit) return txt;
  return V?.momentoTexto?.() ?? "";
}
function resumen(m){
  const p=o=>(o||[]).map(c=>nm(c.code));
  const r={};
  for(const k of ["summons","special_summons","monster_sets","spell_sets","activates",
                  "pos_changes","attacks","chains","selects","select_cards"])
    if(m[k]?.length) r[k]=p(m[k]);
  for(const k of ["forced","min","max","can_cancel","can_finish","to_bp","to_ep","to_m2","positions"])
    if(m[k]!==undefined) r[k]=m[k];
  return r;
}
// los mensajes del core llevan BigInt, que JSON.stringify no sabe serializar
function safeJSON(o){
  try { return JSON.stringify(o, (k,v)=> typeof v==="bigint" ? v.toString()+"n"
        : (v instanceof Map ? "[Map]" : v)); }
  catch(e){ return "(no serializable: "+e.message+")"; }
}
function respondLogged(r, etiqueta){
  logIt("tú_eliges", { accion:etiqueta, respuesta:r });
  duel.respond(r);
}
const cardAt = l => duel.at(l.controller, l.location, l.sequence);
const sameCard = (loc, card) => loc.controller===card.controller
  && loc.location===card.location && loc.sequence===card.sequence;

/* ── control por arrastre en Main Phase ── */
function armIdle(m){
  idle=m; battle=null;
  const send=(r,et)=>{ idle=null; V.setHandlers({}); V.markDraggable(new Set());
                       V.markUsable(new Set()); hidePanel();
                       // la colocación provisional deja de mandar: ahora manda el motor
                       V.quitarPrevia(false);
                       respondLogged(r,et??"main"); loop(); };
  const cancelarSuelta=(aviso)=>{ preferredPlace=null; if(aviso) V.toast(aviso); V.quitarPrevia(); };
  const R=OCG.OcgResponseType, IA=OCG.SelectIdleCMDAction;
  /* Antes se emparejaba la carta arrastrada con las listas del core por
     (controlador, zona, índice). Si el espejo se desincronizaba un puesto,
     jugabas OTRA carta: es lo que pasó con Chaos Sorcerer, que se "colocó"
     y en realidad colocó el Nobleman of Crossout. Ahora se resuelve cada
     entrada a un uid concreto y la interfaz solo trabaja con uids. */
  const acciones=new Map();   // uid -> {summon,specialSummon,monsterSet,activate,spellSet,posChange}
  const mapear=(list,clave)=>(list||[]).forEach((l,i)=>{
    const c=duel.resolve(l, l.code);
    if(!c) return;
    const e=acciones.get(c.uid) ?? {}; e[clave]=i; acciones.set(c.uid,e);
  });
  mapear(m.summons,"summon"); mapear(m.special_summons,"specialSummon");
  mapear(m.monster_sets,"monsterSet"); mapear(m.activates,"activate");
  mapear(m.spell_sets,"spellSet"); mapear(m.pos_changes,"posChange");
  const playable=new Set(acciones.keys());
  // separar: lo que se juega desde la mano vs. lo que ya está en el
  // campo y tiene efecto disponible (lo que más se pasa por alto)
  const enMano=new Set(), enCampo=new Set();
  for(const uid of playable){
    const c=duel.cards.get(uid);
    (c && c.location===2 ? enMano : enCampo).add(uid);
  }
  V.markDraggable(enMano);
  V.markUsable(enCampo);
  V.setHandlers({
    arrastre: true,
    canDrag: card => playable.has(card.uid),
    onDrop: (card, zone, slotIdx, x, y) => {
      const d=DB.get(card.code), mon=!!(d.type & 0x1), trap=!!(d.type & 0x4),
            campo=!!(d.type & 0x80000);
      const zonaOk = mon ? zone==="m"
                   : campo ? (zone==="st" || zone==="field")
                   : zone==="st";
      if(!zonaOk){
        cancelarSuelta(mon?"Los monstruos van en la zona de monstruos":"Las Mágicas y Trampas van en la zona de M/T");
        return;
      }
      /* Con reglas de 2005 el Field Spell ocupa el puesto 5 de la zona de
         M/T, no una zona aparte: sueltes donde sueltes, va ahí. */
      preferredPlace = campo ? { zone:"st", slot:5 } : { zone, slot:slotIdx };
      const a=acciones.get(card.uid);
      if(!a){ cancelarSuelta("Esa carta no se puede jugar ahora"); return; }
      const opts=[];
      const iS=a.summon??-1, iSS=a.specialSummon??-1, iMS=a.monsterSet??-1,
            iA=a.activate??-1, iSp=a.spellSet??-1;
      if(iS>=0)  opts.push({icon:"⚔", label:"Invocación normal",primary:true,
        run:()=>send({type:R.SELECT_IDLECMD,action:IA.SELECT_SUMMON,index:iS}, "Invocar "+nm(card.code))});
      if(iSS>=0) opts.push({icon:"✧", label:"Invocación especial",primary:true,
        run:()=>send({type:R.SELECT_IDLECMD,action:IA.SELECT_SPECIAL_SUMMON,index:iSS}, "Inv. especial "+nm(card.code))});
      if(iMS>=0) opts.push({icon:"⛨", label:"Colocar boca abajo",
        run:()=>send({type:R.SELECT_IDLECMD,action:IA.SELECT_MONSTER_SET,index:iMS}, "Colocar "+nm(card.code))});
      if(iA>=0)  opts.push({icon:"✦", label:"Activar",primary:true,
        run:()=>send({type:R.SELECT_IDLECMD,action:IA.SELECT_ACTIVATE,index:iA}, "Activar "+nm(card.code))});
      if(iSp>=0) opts.push({icon:"▤", label:"Colocar tapada",
        run:()=>send({type:R.SELECT_IDLECMD,action:IA.SELECT_SPELL_SET,index:iSp}, "Colocar tapada "+nm(card.code))});
      if(!opts.length){ cancelarSuelta("Esa carta no se puede jugar ahora"); return; }
      // las trampas solo se pueden colocar: sin menú
      if(trap && opts.length===1) return opts[0].run();
      if(opts.length===1) return opts[0].run();
      V.choiceMenu(x, y, nm(card.code), [...opts,
        {icon:"✕", label:"Cancelar",run:()=>cancelarSuelta()}]);
    },
    onClick: card => {
      // clic en carta propia ya en el campo: activar o cambiar posición
      const a=acciones.get(card.uid); if(!a) return;
      const iA=a.activate??-1, iP=a.posChange??-1;
      const opts=[];
      if(iA>=0) opts.push({icon:"✦", label:"Activar",primary:true,
        // sin el índice, el motor activaba la primera carta de la lista
        run:()=>send({type:R.SELECT_IDLECMD,action:IA.SELECT_ACTIVATE,index:iA},
                     "Activar "+nm(card.code))});
      if(iP>=0) opts.push({icon:"↻", label:"Cambiar posición",
        run:()=>send({type:R.SELECT_IDLECMD,action:IA.SELECT_POS_CHANGE,index:iP})});
      if(!opts.length) return;
      const r=document.querySelector(`.card[data-uid="${card.uid}"]`)?.getBoundingClientRect();
      V.choiceMenu((r?.left??300)+40,(r?.top??300),nm(card.code),
        [...opts,{icon:"✕", label:"Cancelar",run:()=>{}}]);
    },
  });
  V.setControles({
    fase: m.to_bp ? ()=>send({type:R.SELECT_IDLECMD,action:IA.TO_BP,index:null}) : null,
    faseTxt: "Battle Phase",
    fin: m.to_ep ? ()=>send({type:R.SELECT_IDLECMD,action:IA.TO_EP,index:null}) : null,
  });
  const btns=[{label:"Ver todas las acciones",run:()=>{ fullIdlePanel(m,send); }}];
  panel(PHNAME[duel.phase]??"Main Phase", btns,
        playable.size ? "Arrastra para jugar o reordenar tu mano · ✦ = efecto disponible"
                      : "No tienes jugadas disponibles");
}

function fullIdlePanel(m, send){
  const R=OCG.OcgResponseType, IA=OCG.SelectIdleCMDAction, opts=[];
  const push=(list,action,pref)=>(list||[]).forEach((c,i)=>
    opts.push({label:`${pref} ${nm(c.code)}`,run:()=>send({type:R.SELECT_IDLECMD,action,index:i})}));
  push(m.summons,IA.SELECT_SUMMON,"Invocar");
  push(m.special_summons,IA.SELECT_SPECIAL_SUMMON,"Inv. especial");
  push(m.activates,IA.SELECT_ACTIVATE,"Activar");
  push(m.monster_sets,IA.SELECT_MONSTER_SET,"Colocar");
  push(m.spell_sets,IA.SELECT_SPELL_SET,"Colocar tapada");
  push(m.pos_changes,IA.SELECT_POS_CHANGE,"Cambiar posición");
  if(m.to_bp) opts.push({label:"→ Battle Phase",primary:true,run:()=>send({type:R.SELECT_IDLECMD,action:IA.TO_BP,index:null})});
  if(m.to_ep) opts.push({label:"→ Terminar turno",run:()=>send({type:R.SELECT_IDLECMD,action:IA.TO_EP,index:null})});
  opts.push({label:"Volver",run:()=>armIdle(m)});
  panel("Todas las acciones", opts);
}

/* ── Battle Phase: clic en tu monstruo → elegir objetivo ── */
function armBattle(m){
  battle=m; idle=null;
  const R=OCG.OcgResponseType, BA=OCG.SelectBattleCMDAction;
  const send=(r,et)=>{ battle=null; V.setHandlers({}); V.markTargets(new Set());
                  V.markDraggable(new Set()); V.markUsable(new Set());
                  V.markAtacadas(new Set()); hidePanel(); V.quitarPrevia(false);
                  respondLogged(r,et??"battle"); loop(); };
  const attackers=new Map();
  (m.attacks||[]).forEach((l,i)=>{ const c=duel.resolve(l, l.code); if(c) attackers.set(c.uid,i); });
  V.markDraggable(new Set(attackers.keys()));
  // los que ya atacaron quedan apagados, para verlo de un vistazo
  const mios=(duel.zones[ME]?.[4]??[]).filter(Boolean).map(c=>c.uid);
  V.markAtacadas(new Set(mios.filter(u=>!attackers.has(u))));
  V.setHandlers({
    canDrag: ()=>false,
    onClick: card => {
      const i=attackers.get(card.uid);
      if(i===undefined) return;
      send({type:R.SELECT_BATTLECMD,action:BA.SELECT_BATTLE,index:i}, "Atacar con "+nm(card.code));
    },
  });
  V.setControles({
    fase: m.to_m2 ? ()=>send({type:R.SELECT_BATTLECMD,action:BA.TO_M2,index:null}) : null,
    faseTxt: "Main Phase 2",
    fin: m.to_ep ? ()=>send({type:R.SELECT_BATTLECMD,action:BA.TO_EP,index:null}) : null,
  });
  const btns=[];
  (m.chains||[]).forEach((c,i)=>btns.push({label:`Activar ${nm(c.code)}`,
    run:()=>send({type:R.SELECT_BATTLECMD,action:BA.SELECT_CHAIN,index:i})}));
  panel("Battle Phase", btns,
    attackers.size ? "Haz clic en un monstruo tuyo para declarar ataque" : "No puedes atacar");
}

/* ── el resto de decisiones, en panel ── */
function ask(m){
  const T=OCG.OcgMessageType, R=OCG.OcgResponseType;
  const send=(r,et)=>{ hidePanel(); V.markTargets(new Set()); V.setHandlers({});
                       V.setZoneViewClose(null); V.closeZoneView(); V.quitarPrevia(false);
                       respondLogged(r,et??msgName(m)); loop(); };
  switch(m.type){
    case T.SELECT_IDLECMD:   return armIdle(m);
    case T.SELECT_BATTLECMD: return armBattle(m);
    case T.SELECT_CHAIN: {
      const opts=(m.selects||[]).map((c,i)=>({label:`Encadenar ${nm(c.code)}`,primary:true,
        run:()=>send({type:R.SELECT_CHAIN,index:i})}));
      if(!m.forced) opts.push({label:"No responder",run:()=>send({type:R.SELECT_CHAIN,index:null})});
      /* En batalla importa MUCHO en qué momento se responde: no es lo mismo
         encadenar en la declaración de ataque que dentro del Damage Step.
         El momento no se adivina, viene en el propio mensaje del motor. */
      momentoPanel = momentoPregunta(m) || "";
      panel(m.forced?"Efecto obligatorio — elige":"¿Quieres responder?", opts,
            m.forced ? null : "Si no contestas, se pasa sola");
      if(!m.forced && CHAIN_TIMEOUT>0)
        startPromptTimer(CHAIN_TIMEOUT, ()=>{
          logIt("tiempo_agotado",{pregunta:"SELECT_CHAIN"});
          V.toast("Tiempo agotado: no se responde");
          send({type:R.SELECT_CHAIN,index:null},"sin respuesta (tiempo)");
        });
      return;
    }
    case T.SELECT_EFFECTYN:
      return panel(conMomento(`¿Activar el efecto de ${nm(m.code)}?`, m),[
        {label:"Sí",primary:true,run:()=>send({type:R.SELECT_EFFECTYN,yes:true})},
        {label:"No",run:()=>send({type:R.SELECT_EFFECTYN,yes:false})}]);
    case T.SELECT_YESNO: {
      /* El motor mete el código de la carta dentro de la descripción:
         así el panel dice de qué efecto habla en vez de "¿Confirmas?". */
      const cod = cartaDeDescripcion(m.description);
      return panel(conMomento(cod ? `¿Activar el efecto de ${nm(cod)}?` : "¿Confirmas?", m),[
        {label:"Sí",primary:true,run:()=>send({type:R.SELECT_YESNO,yes:true})},
        {label:"No",run:()=>send({type:R.SELECT_YESNO,yes:false})}]);
    }
    case T.SELECT_OPTION:
      return panel("Elige una opción",(m.options||[]).map((o,i)=>
        ({label:`Opción ${i+1}`,run:()=>send({type:R.SELECT_OPTION,index:i})})));
    case T.SELECT_POSITION: {
      const P=OCG.OcgPosition,o=[];
      if(m.positions&P.FACEUP_ATTACK)   o.push({label:"Ataque",primary:true,run:()=>send({type:R.SELECT_POSITION,position:P.FACEUP_ATTACK})});
      if(m.positions&P.FACEUP_DEFENSE)  o.push({label:"Defensa",run:()=>send({type:R.SELECT_POSITION,position:P.FACEUP_DEFENSE})});
      if(m.positions&P.FACEDOWN_DEFENSE)o.push({label:"Defensa boca abajo",run:()=>send({type:R.SELECT_POSITION,position:P.FACEDOWN_DEFENSE})});
      return panel("¿En qué posición?",o);
    }
    case T.SELECT_CARD: case T.SELECT_TRIBUTE: case T.SELECT_UNSELECT_CARD: {
      const list=m.type===T.SELECT_UNSELECT_CARD?(m.select_cards||[]):(m.selects||[]);
      const min=m.type===T.SELECT_UNSELECT_CARD?1:Math.max(1,m.min??1);
      const rt=m.type===T.SELECT_TRIBUTE?R.SELECT_TRIBUTE
             :m.type===T.SELECT_UNSELECT_CARD?R.SELECT_UNSELECT_CARD:R.SELECT_CARD;
      const chosen=[], uidOf=i=>duel.resolve(list[i], list[i].code)?.uid;
      const choose=i=>{
        if(m.type===T.SELECT_UNSELECT_CARD) return send({type:rt,index:i});
        const k=chosen.indexOf(i); k>=0?chosen.splice(k,1):chosen.push(i);
        if(chosen.length>=(m.max??min) && chosen.length>=min) return send({type:rt,indicies:[...chosen]});
        render();
      };
      // Si alguna carta elegible NO está a la vista en el tablero (cementerio,
      // deck, desterradas), abrimos un visor con las cartas para poder verlas.
      const OCULTAS=[1,16,32,64];
      const necesitaVisor = list.some(c=>OCULTAS.includes(c.location));
      const abrirVisor=()=>{
        V.openZoneView(`Elige ${min===(m.max??min)?min:`${min}-${m.max}`} carta(s)`,
          list.map((c,i)=>({code:c.code,_i:i})),
          picked=>{ V.closeZoneView(); choose(picked._i);
                    if(document.getElementById("prompt").style.display==="block" && necesitaVisor)
                      setTimeout(abrirVisor,60); });
      };
      const render=()=>{
        const opts=list.map((c,i)=>({label:`${chosen.includes(i)?"✓ ":""}${nm(c.code)} (${LOCNAME[c.location]??"?"})`,
          primary:chosen.includes(i),run:()=>choose(i)}));
        if(m.type!==T.SELECT_UNSELECT_CARD && chosen.length>=min)
          opts.unshift({label:`Confirmar (${chosen.length})`,primary:true,run:()=>send({type:rt,indicies:[...chosen]})});
        if(m.can_cancel) opts.push({label:"Cancelar",run:()=>send({type:rt,
          ...(m.type===T.SELECT_UNSELECT_CARD?{index:null}:{indicies:null})})});
        if(m.type===T.SELECT_UNSELECT_CARD && m.can_finish) opts.push({label:"Terminar",run:()=>send({type:rt,index:null})});
        if(necesitaVisor) opts.unshift({label:"👁 Ver las cartas",primary:true,run:abrirVisor});
        panel(conMomento(`Selecciona ${min===(m.max??min)?min:`${min}-${m.max}`} carta(s)`, m),opts,
              necesitaVisor ? "Hay cartas fuera del tablero: ábrelas para verlas"
                            : "Haz clic en las cartas marcadas, en el campo o en tu mano"
                              + (chosen.length?` · elegidas: ${chosen.length}`:""));
        V.setHandlers({ onClick: card=>{ const i=list.findIndex((_,k)=>uidOf(k)===card.uid); if(i>=0) choose(i); } });
        V.markTargets(new Set(list.map((_,i)=>uidOf(i)).filter(Boolean)));
      };
      /* Si cerrabas el visor, el panel de selección se quedaba detrás sin
         volver a pintarse y parecía que el juego se colgaba (el caso de
         Black Luster Soldier). Ahora cerrar el visor repinta el panel. */
      V.setZoneViewClose(()=>{ if(document.getElementById("prompt").style.display!=="block") render(); });
      render();
      if(necesitaVisor) abrirVisor();
      return;
    }
    case T.ANNOUNCE_CARD: {
      /* Archfiend's Oath y compañía piden declarar el nombre de una carta.
         Los "opcodes" del mensaje limitan qué vale (solo monstruos, etc.),
         y el propio motor trae la función para comprobarlo. */
      const candidatos=[];
      for(const k in DB_RAW){
        const code=+k, d=DB.get(code);
        if(!d) continue;
        let vale=true;
        try{ vale = OCG.cardMatchesOpcode(d, m.opcodes); }catch(e){ vale=true; }
        if(vale) candidatos.push(code);
      }
      const lista = candidatos.length ? candidatos : [...DB.keys()];
      declararCarta(lista, code=>send({type:R.ANNOUNCE_CARD, card:code},
                                      "declara "+nm(code)));
      return;
    }
    case T.ANNOUNCE_RACE: case T.ANNOUNCE_ATTRIB: {
      const esRaza = m.type===T.ANNOUNCE_RACE;
      const N = esRaza ? RAZAS : ATRIBUTOS;
      const bits=[]; const disp = esRaza ? BigInt(m.available) : m.available;
      for(let i=0;i<(esRaza?64:32);i++){
        const bit = esRaza ? (1n<<BigInt(i)) : (1<<i);
        const hay = esRaza ? ((disp>>BigInt(i))&1n)===1n : ((disp>>i)&1);
        if(hay) bits.push([bit, N[String(bit)] ?? ("#"+bit)]);
      }
      const cuantas=m.count??1, elegidas=[];
      const pinta=()=>panel(esRaza?"Declara un Tipo":"Declara un Atributo",
        bits.map(([b,n])=>({label:(elegidas.includes(b)?"✓ ":"")+n, primary:elegidas.includes(b),
          run:()=>{ elegidas.push(b);
            if(elegidas.length>=cuantas)
              send(esRaza?{type:R.ANNOUNCE_RACE,races:elegidas}
                         :{type:R.ANNOUNCE_ATTRIB,attributes:elegidas},"declara "+n);
            else pinta(); }})),
        cuantas>1?`Elige ${cuantas}`:null);
      pinta(); return;
    }
    case T.ANNOUNCE_NUMBER:
      return panel("Declara un número",(m.options||[]).map((o,i)=>
        ({label:String(o), run:()=>send({type:R.ANNOUNCE_NUMBER,value:i},"declara "+o)})));
    case T.SELECT_PLACE: case T.SELECT_DISFIELD: {
      // si el jugador acaba de soltar en una zona concreta, respetarla
      const r=placeFromDrop(m) ?? decideAI(m,0);
      return send(r);
    }
    default: {
      const r=decideAI(m,0);
      if(r) return send(r);
      return panel("Decisión no soportada ("+m.type+")",[{label:"Continuar",run:()=>loop()}]);
    }
  }
}
function placeFromDrop(m){
  if(!preferredPlace) return null;
  const want=preferredPlace; preferredPlace=null;
  const loc = want.zone==="m" ? OCG.OcgLocation.MZONE
            : want.zone==="st" ? OCG.OcgLocation.SZONE : null;
  if(!loc) return null;
  const mask=m.field_mask>>>0;
  const byteIdx = loc===OCG.OcgLocation.MZONE ? 0 : 1;   // bytes 0-1 = jugador preguntado
  const b=(mask>>>(byteIdx*8))&0xff;
  if((b>>>want.slot)&1) return null;                      // esa zona no está disponible
  return { type:OCG.OcgResponseType.SELECT_PLACE,
           places:[{player:m.player, location:loc, sequence:want.slot}] };
}

/* ── rendirse ──
   No se le pide nada al motor: el duelo simplemente se detiene aquí y
   cuenta como derrota. Responder por ti para perder sería peor: habría
   que inventarse una jugada suicida y el log quedaría mintiendo. */
let rendido=false;
function rendirse(){
  if(rendido) return;
  rendido=true;
  logIt("rendicion", { turno:duel?.turnCount, lpTuyos:duel?.lp?.[ME], lpRival:duel?.lp?.[1-ME] });
  V.setHandlers({}); V.markTargets(new Set()); V.markDraggable(new Set());
  V.markUsable(new Set()); V.markAtacadas(new Set()); V.quitarPrevia(false);
  V.closeChoice(); V.closeZoneView(); hidePanel();
  V.banner("TE RINDES", "#ff6a55");
  setTimeout(()=>V.pantallaFinal({
    ganaste:false, motivo:"Te has rendido",
    lpMio:duel?.lp?.[ME], lpRival:duel?.lp?.[1-ME], turnos:duel?.turnCount,
    avatarMio:CONFIG?.avatarMio, avatarRival:CONFIG?.avatarRival,
    nombreRival:CONFIG?.nombreRival }), 900);
}

/* ── bucle ── */
let aiAttempt=0, aiLast=null;
async function loop(){
  try { await loopInterno(); }
  catch(e){
    console.error(e);
    logIt("ERROR", { msg:String(e && e.message || e), pila:String(e && e.stack||"").slice(0,400) });
    // visible SIEMPRE: antes acababa escrito en la pantalla de carga oculta
    panel("Se ha roto algo", [{label:"Descargar log y avisar",primary:true,
      run:()=>document.getElementById("btnLog").click()}], String(e && e.message || e));
  }
}
async function loopInterno(){
  while(true){
    if(rendido) return;
    const q=await duel.run();
    if(rendido) return;
    const ended=await drain();
    if(ended||duel.finished) return;
    if(!q) return;
    if(q.player===ME){
      /* Excepción a "sin elección real, resuelve solo": si lo que se elige
         está en la mano del rival, la gracia es VERLA. Aunque solo haya un
         objetivo legal hay que enseñar la mano y esperar a que pulses, o
         Trap Dustshoot pasa en un parpadeo y parece que elige por ti. */
      const miraLaManoRival = q.type===OCG.OcgMessageType.SELECT_CARD
        && (q.selects||[]).some(s => s.location===2 && s.controller!==ME);
      const auto = miraLaManoRival ? null : trivial(q);   // sin elección real → resolver solo
      if(auto){ logIt("auto", {pregunta:msgName(q), respuesta:auto}); duel.respond(auto); continue; }
      // Solo se salta la ventana de respuesta en TU turno y sin cadena en curso.
      // Durante el turno rival hay que preguntar siempre: es cuando activas
      // Call of the Haunted en su End Phase, Book of Moon en su ataque, etc.
      /* Modo "sin cadenas": no te pregunta nada... salvo lo que sale de TU
         cementerio. Si no, el retorno de Sinister Serpent se descartaba solo
         cada turno y perdías la carta sin enterarte, que era la duda que
         quedaba abierta con este modo. */
      const disparadorDesdeGY = (q.selects||[]).some(sel => sel.location === 16);
      if(q.type===OCG.OcgMessageType.SELECT_CHAIN && !q.forced
         && chainMode==="nunca" && !disparadorDesdeGY){
        duel.respond({type:OCG.OcgResponseType.SELECT_CHAIN,index:null}); continue;
      }
      // TRAMPA: saltarse la ventana entera se comía los disparadores propios.
      // Sinister Serpent se ofrece a volver del cementerio en TU Standby Phase,
      // y esto lo descartaba sin preguntar: la carta volvía un turno tarde,
      // en la siguiente ventana que sí se preguntase. Lo delató el log del
      // 2026-08-09 (T4 Standby ofrecía 511000818 y la respuesta era "no responder").
      // En las tres partidas revisadas, lo ÚNICO que se ofrece desde el
      // cementerio es Sinister Serpent; lo demás sale de la mano, de la zona
      // de magias/trampas o del campo, y eso sí se puede saltar sin perder nada.
      const disparadorPropio = q.type===OCG.OcgMessageType.SELECT_CHAIN
        && (q.selects||[]).some(s => s.location === 16);   // 16 = cementerio
      if(q.type===OCG.OcgMessageType.SELECT_CHAIN && !q.forced && !disparadorPropio
         && chainMode==="auto" && !chainActive && duel.turnPlayer===ME){
        logIt("auto",{pregunta:"SELECT_CHAIN (ventana propia sin cadena)",respuesta:"no responder"});
        duel.respond({type:OCG.OcgResponseType.SELECT_CHAIN,index:null}); continue;
      }
      // las que se resuelven solas (colocar zona, ordenar…) no son
      // preguntas de verdad: ensuciaban el log
      if(!AUTO_KINDS.has(q.type)) logIt("te_pregunta", { pregunta:msgName(q), datos:resumen(q) });
      return ask(q);
    }
    if(q!==aiLast){ aiLast=q; aiAttempt=0; }
    // el cerebro decide; el piloto genérico cubre lo que no le interesa
    // (colocación de zona, ordenar cartas, declarar tipos…)
    const r=trivial(q) ?? cerebro?.(q,aiAttempt) ?? decideAI(q,aiAttempt);
    aiAttempt++;
    if(!r){ logIt("ERROR",{msg:"la IA no supo responder a "+msgName(q)}); console.warn("IA sin respuesta",q); return; }
    logIt("ia", { pregunta:msgName(q), respuesta:r });
    duel.respond(r);
    await V.sleep(160);
  }
}

export async function boot({ createCore, Xns, GoatDuel, makeAutoPlayer, makeTrivialResolver,
                             scriptReader, cardsRaw, names, deck, extra, deckRival, extraRival, View, config }){
  V=View; NAMES=names; OCG=Xns; CONFIG=config??null;
  // Declarar carta, tipo, atributo o número SÍ es una decisión tuya.
  // Antes se resolvían solas y siempre salía "Pot of Greed".
  AUTO_KINDS = new Set([OCG.OcgMessageType.SELECT_PLACE,
    OCG.OcgMessageType.SELECT_DISFIELD, OCG.OcgMessageType.SORT_CARD]);
  DB_RAW = cardsRaw;
  const cardDb=new Map();
  for(const k in cardsRaw){ const c=cardsRaw[k]; cardDb.set(c.code,{...c,race:BigInt(c.race)}); }
  DB=cardDb;
  const lib=await createCore({sync:true});
  duel=new GoatDuel({ lib, X:OCG, cardDb, scriptReader, onEvent });
  decideAI=makeAutoPlayer(OCG); trivial=makeTrivialResolver(OCG);
  if(config?.nivel && NIVELES.includes(config.nivel)) nivelBot = config.nivel;
  if(config?.cadenas) chainMode = config.cadenas;
  if(typeof config?.tiempo === "number" && typeof globalThis.GOAT_CHAIN_TIMEOUT !== "number")
    CHAIN_TIMEOUT = config.tiempo;
  /* El sorteo va ANTES de nada: decide de qué lado juegas, y tanto el
     tablero como el cerebro de la IA dependen de eso. Hacerlo después
     dejaba el tablero espejado y a la IA jugando en TU sitio. */
  const empiezasTu = Math.random() < 0.5;
  ME = empiezasTu ? 0 : 1;
  logIt("sorteo", { empiezasTu });
  // la pantalla de carga tapaba la moneda: hay que quitarla antes
  document.getElementById("boot").style.display="none";
  await View.sorteo(empiezasTu);

  cerebro = crearCerebro({ X:OCG, duel, db:cardDb, names, nivel:nivelBot, yo:1-ME,
                           log: d => logIt("ia_piensa", d) });
  View.initView({ duel, db:cardDb, names, me:ME, images:true });
  const ZL={gy:16, extra:64, banish:32};
  View.setZoneViewHandler((owner, zone)=>{
    // cementerio y desterradas son información pública; el Extra Deck del
    // rival no: solo puedes mirar el tuyo
    if(zone==="extra" && Number(owner)!==ME){
      V.toast("No puedes ver el Extra Deck del rival"); return;
    }
    const arr=duel.zones[owner][ZL[zone]] ?? [];
    const quien = T(Number(owner)===ME ? "tu" : "del rival");
    const titulo = T(zone==="gy"?"Cementerio" : zone==="extra"?"Extra Deck" : "Cartas desterradas");
    View.openZoneView(`${titulo} ${quien} — ${arr.length} carta(s)`,
      [...arr].reverse());
  });

  const bc=document.getElementById("btnChain");
  const CICLO={auto:"always", always:"nunca", nunca:"auto"};
  const ETIQ_CAD={auto:"Cadenas: automáticas", always:"Cadenas: preguntar siempre",
                  nunca:"Cadenas: no activar nada"};
  const paintChain=()=>{ bc.textContent = T(ETIQ_CAD[chainMode] ?? ETIQ_CAD.auto);
                         bc.classList.toggle("peligro", chainMode==="nunca"); };
  bc.onclick=()=>{ chainMode = CICLO[chainMode] ?? "auto"; paintChain();
                   V.toast(T(ETIQ_CAD[chainMode])); }; paintChain();


  /* Avatares: el tuyo lo eliges en el menú, el rival siempre es Roland. */
  const ponAvatar=(idImg, idNom, a, quien)=>{
    const img=document.getElementById(idImg), nom=document.getElementById(idNom);
    if(img && a?.src){ img.src=a.src; img.alt=a.nombre??""; img.style.display="block"; }
    else if(img) img.style.display="none";
    if(nom && a?.nombre) nom.textContent = quien==="mio" ? a.nombre
      : `${a.nombre} · ${T(ETIQUETA_NIVEL[nivelBot] ?? nivelBot)}`;
  };
  ponAvatar("avMe","nomMe", config?.avatarMio, "mio");
  ponAvatar("avOpp","nomOpp", config?.avatarRival, "rival");

  const btnR=document.getElementById("btnRendirse");
  if(btnR) btnR.onclick=()=>{
    if(rendido || duel.finished) return;
    V.confirmar("¿Seguro que quieres rendirte?",
      "El duelo termina ahora mismo y cuenta como derrota.", rendirse);
  };

  // botón de emergencia para depurar: fuerza a la IA a pasar
  document.getElementById("btnUnstick").onclick=()=>{
    V.toast("Forzando avance…"); aiAttempt++; loop();
  };

  MSGNAME=Object.fromEntries(Object.entries(OCG.OcgMessageType).map(([k,v])=>[v,k]));
  document.getElementById("btnLog").onclick=()=>{
    const cab=[
      "GOAT FORMAT — registro de partida",
      "fecha: "+new Date().toISOString(),
      "semilla: "+SEED,
      "modo cadenas: "+chainMode,
      "nivel del rival: "+nivelBot,
      "tu mazo: "+(config?.nombreMazo??"?")+" · mazo rival: "+(config?.nombreRival??"?"),
      "desincronizaciones detectadas y corregidas: "+(duel?.desyncs??0),
      "turno actual: "+(duel?.turnCount??0)+" · fase: "+(PHNAME[duel?.phase]??""),
      "LP  tú: "+duel.lp[ME]+"   rival: "+duel.lp[1-ME],
      "mazo: "+safeJSON(DECKLOG),
      "".padEnd(70,"─"),""].join("\n");
    const cuerpo=LOG.map(e=>{
      const cab=`[${String(e.ms).padStart(6)}ms] T${e.turno} ${e.deQuien.padEnd(5)} ${String(e.fase).padEnd(14)} ${e.kind}`;
      return cab+" · "+safeJSON(e.data);
    }).join("\n");
    const blob=new Blob([cab+cuerpo],{type:"text/plain;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`goat-log-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    V.toast("Log descargado ("+LOG.length+" entradas)");
  };
  const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[b[i],b[j]]=[b[j],b[i]];}return b;};
  // cada jugador con su propio mazo
  const mioBaraja = shuffle(deck), rivalBaraja = shuffle(deckRival ?? deck);
  const s0 = ME===0 ? mioBaraja : rivalBaraja;
  const s1 = ME===0 ? rivalBaraja : mioBaraja;
  const e0 = ME===0 ? extra : (extraRival ?? extra);
  const e1 = ME===0 ? (extraRival ?? extra) : extra;
  logIt("mazos", { tuyo:config?.nombreMazo, rival:config?.nombreRival });
  SEED=(Date.now()&0xffff)+1;
  DECKLOG={ tu:mioBaraja, rival:rivalBaraja };
  await duel.create({ deck0:s0, deck1:s1, extra0:e0, extra1:e1,
    seed:[BigInt(SEED), 7n, 13n, 29n] });
  View.layoutAll(true);
  document.getElementById("boot").style.display="none";
  await loop();
}
