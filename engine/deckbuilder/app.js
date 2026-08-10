/* ══════════════════════════════════════════════════════════════════
   DECK BUILDER — Goat Format
   El pool se carga desde POOL (lista de passcodes). Si está vacío,
   se usa toda la base de datos y se avisa de que es provisional.
   ══════════════════════════════════════════════════════════════════ */
const IMG = "https://images.ygoprodeck.com/images/cards/";
const T_MON=0x1, T_SPELL=0x2, T_TRAP=0x4, T_FUSION=0x40;
const ATTR={1:"FUEGO",2:"AGUA",4:"TIERRA",8:"VIENTO",16:"LUZ",32:"OSCURIDAD",64:"DIVINO"};
const RACE={1:"Guerrero",2:"Mago",4:"Hada",8:"Demonio",16:"Zombi",32:"Máquina",
  64:"Aqua",128:"Piro",256:"Roca",512:"Bestia Alada",1024:"Planta",2048:"Insecto",
  4096:"Trueno",8192:"Dragón",16384:"Bestia",32768:"Bestia Guerrero",65536:"Dinosaurio",
  131072:"Pez",262144:"Serpiente Marina",524288:"Reptil",1048576:"Psíquico"};

const D = { main:[], extra:[], side:[] };
let filtro = { texto:"", tipo:"todos", atributo:0, nivel:0, soloPool:true };

const $ = s=>document.querySelector(s);
const base = c => (CARDS[c]?.alias || c);          // las variantes cuentan como la original
const nom  = c => (TEXTS[c]?.[0] ?? "#"+c);
const txt  = c => (TEXTS[c]?.[1] ?? "");
const dat  = c => CARDS[c] ?? null;

const poolSet = new Set(POOL.length ? POOL : Object.keys(CARDS).map(Number));
const hayPool = POOL.length > 0;

/* ── copias: el límite es por carta "real", contando alias ── */
function copias(code){
  const b = base(code);
  const cuenta = a => a.filter(c=>base(c)===b).length;
  return cuenta(D.main)+cuenta(D.extra)+cuenta(D.side);
}
const limite = code => (LIMITES[base(code)] ?? 3);

function puedeAñadir(code, zona){
  const d=dat(code); if(!d) return "carta desconocida";
  if(copias(code) >= limite(code))
    return limite(code)===0 ? "prohibida en Goat" : `máximo ${limite(code)} copia(s)`;
  const esExtra = !!(d.type & T_FUSION);
  if(zona==="main" && esExtra) return "va al Extra Deck";
  if(zona==="extra" && !esExtra) return "solo monstruos de Fusión";
  if(zona==="main" && D.main.length>=60) return "el Main Deck está lleno (60)";
  if(zona==="extra" && D.extra.length>=15) return "el Extra está lleno (15)";
  if(zona==="side" && D.side.length>=15) return "el Side está lleno (15)";
  return null;
}
function añadir(code, zona){
  const d=dat(code);
  if(!zona) zona = (d && (d.type & T_FUSION)) ? "extra" : "main";
  const err = puedeAñadir(code, zona);
  if(err){ aviso(err); return; }
  D[zona].push(code); pintarDeck();
}
function quitar(zona, i){ D[zona].splice(i,1); pintarDeck(); }

/* ── buscador ── */
function filtrar(){
  const q = filtro.texto.trim().toLowerCase();
  const res=[];
  for(const k in CARDS){
    const code=+k, d=CARDS[k];
    if(filtro.soloPool && hayPool && !poolSet.has(code)) continue;
    if(d.ot===8 && !hayPool) continue;              // variantes internas del motor
    if(filtro.tipo==="monstruo" && !(d.type & T_MON)) continue;
    if(filtro.tipo==="magica"   && !(d.type & T_SPELL)) continue;
    if(filtro.tipo==="trampa"   && !(d.type & T_TRAP)) continue;
    if(filtro.tipo==="fusion"   && !(d.type & T_FUSION)) continue;
    if(filtro.atributo && d.attribute!==filtro.atributo) continue;
    if(filtro.nivel && d.level!==filtro.nivel) continue;
    if(q){
      const n=(TEXTS[k]?.[0]??"").toLowerCase();
      if(!n.includes(q) && !(TEXTS[k]?.[1]??"").toLowerCase().includes(q)) continue;
    }
    res.push(code);
    if(res.length>=400) break;
  }
  res.sort((a,b)=>nom(a).localeCompare(nom(b)));
  return res;
}
function pintarResultados(){
  const res=filtrar();
  $("#conteo").textContent = `${res.length}${res.length>=400?"+":""} cartas`;
  const g=$("#grid"); g.innerHTML="";
  for(const code of res){
    const d=dat(code), el=document.createElement("div");
    el.className="cc"+(copias(code)>=limite(code)?" tope":"");
    el.title = nom(code);
    el.innerHTML=`<img loading="lazy" src="${IMG}${base(code)}.jpg" alt="">
      <span class="nm">${nom(code)}</span>
      ${limite(code)<3?`<span class="lim l${limite(code)}">${limite(code)}</span>`:""}`;
    el.onclick=()=>añadir(code);
    el.oncontextmenu=e=>{ e.preventDefault(); añadir(code,"side"); };
    el.onmouseenter=()=>detalle(code);
    g.appendChild(el);
  }
}
function detalle(code){
  const d=dat(code); if(!d) return;
  const mon=!!(d.type&T_MON);
  $("#detalle").innerHTML=`
    <img src="${IMG}${base(code)}.jpg" alt="">
    <h3>${nom(code)}</h3>
    <div class="meta">${mon ? `${ATTR[d.attribute]??""} · Nivel ${d.level} · ${RACE[+d.race]??""}`
                            : (d.type&T_SPELL?"Carta Mágica":"Carta de Trampa")}</div>
    ${mon?`<div class="stats"><span>ATK ${d.attack}</span><span>DEF ${d.defense}</span></div>`:""}
    <p>${txt(code).replace(/\r?\n/g,"<br>")}</p>`;
}

/* ── mazo ── */
function pintarDeck(){
  for(const z of ["main","extra","side"]){
    const cont=$("#"+z); cont.innerHTML="";
    const orden=[...D[z]].sort((a,b)=>{
      const A=dat(a),B=dat(b);
      const cat=x=> (x.type&T_MON)?0:(x.type&T_SPELL)?1:2;
      return cat(A)-cat(B) || (B.attack??0)-(A.attack??0) || nom(a).localeCompare(nom(b));
    });
    D[z]=orden;
    orden.forEach((code,i)=>{
      const el=document.createElement("div");
      el.className="dc"; el.title=nom(code);
      el.innerHTML=`<img loading="lazy" src="${IMG}${base(code)}.jpg" alt="">`;
      el.onclick=()=>quitar(z,i);
      el.onmouseenter=()=>detalle(code);
      cont.appendChild(el);
    });
    $("#n"+z).textContent = D[z].length;
  }
  const m=D.main.length;
  const ok = m>=40 && m<=60 && D.extra.length<=15 && D.side.length<=15;
  $("#estado").textContent = ok ? "Mazo válido" : (m<40?`Faltan ${40-m} cartas`:`Sobran ${m-60}`);
  $("#estado").className = ok ? "ok" : "mal";
  const mon=D.main.filter(c=>dat(c).type&T_MON).length;
  const mag=D.main.filter(c=>dat(c).type&T_SPELL).length;
  const tra=D.main.filter(c=>dat(c).type&T_TRAP).length;
  $("#reparto").textContent = `${mon} monstruos · ${mag} mágicas · ${tra} trampas`;
  guardar(); pintarResultados();
}
function aviso(t){
  t = T(t);
  const a=$("#aviso"); a.textContent=t; a.classList.add("ver");
  clearTimeout(aviso._t); aviso._t=setTimeout(()=>a.classList.remove("ver"),1900);
}

/* ── YDK: el formato universal de Yu-Gi-Oh ── */
function exportarYDK(){
  const L=["#created by Goat Deck Builder","#main",...D.main,"#extra",...D.extra,"!side",...D.side];
  return L.join("\n")+"\n";
}
function importarYDK(texto){
  const nuevo={main:[],extra:[],side:[]};
  let z="main", desconocidas=[], porNombre=0;
  const porNom = {};
  for(const k in TEXTS) porNom[(TEXTS[k][0]||"").toLowerCase()] = +k;
  for(let linea of texto.split(/\r?\n/)){
    linea=linea.trim(); if(!linea) continue;
    if(/^#main/i.test(linea)){ z="main"; continue; }
    if(/^#extra/i.test(linea)){ z="extra"; continue; }
    if(/^!side/i.test(linea)){ z="side"; continue; }
    if(linea.startsWith("#")) continue;
    if(/^\d{5,9}$/.test(linea)){                       // passcode
      const c=+linea;
      if(CARDS[c]) nuevo[(CARDS[c].type & T_FUSION) && z==="main" ? "extra" : z].push(c);
      else desconocidas.push(linea);
      continue;
    }
    // lista escrita a mano: "3x Book of Moon" o "Book of Moon"
    const m=/^(\d+)\s*[x×]?\s+(.*)$/i.exec(linea);
    const veces = m ? +m[1] : 1;
    const nombre = (m ? m[2] : linea).trim().toLowerCase();
    const code = porNom[nombre];
    if(code){ for(let i=0;i<veces;i++)
        nuevo[(CARDS[code].type & T_FUSION) && z==="main" ? "extra" : z].push(code);
      porNombre+=veces;
    } else desconocidas.push(linea);
  }
  D.main=nuevo.main; D.extra=nuevo.extra; D.side=nuevo.side;
  pintarDeck();
  aviso(`${T("Importado")}: ${D.main.length}+${D.extra.length}`+
        (porNombre?` · ${porNombre} por nombre`:"")+
        (desconocidas.length?` · ${desconocidas.length} sin identificar`:""));
  if(desconocidas.length) console.warn("no identificadas:", desconocidas);
}
/* Fichero para el simulador: lleva los datos de carta que necesita,
   así el simulador no tiene que llevar toda la base dentro. */
function exportarParaSimulador(){
  const usados=[...new Set([...D.main,...D.extra,...D.side])];
  const cards={}, names={};
  for(const c of usados){
    cards[c]=CARDS[c]; names[c]={name:TEXTS[c][0],desc:TEXTS[c][1]};
    const a=CARDS[c]?.alias;
    if(a && CARDS[a]){ cards[a]=CARDS[a]; names[a]={name:TEXTS[a][0],desc:TEXTS[a][1]}; }
  }
  return JSON.stringify({ formato:"goat-deck-v1", nombre:$("#nombreMazo").value||"Mazo sin nombre",
    main:D.main, extra:D.extra, side:D.side, cards, names }, null, 0);
}
function bajar(nombre, contenido, tipo="text/plain"){
  const b=new Blob([contenido],{type:tipo+";charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=nombre;
  document.body.appendChild(a); a.click(); a.remove();
}
/* ══ Slots de mazos ═════════════════════════════════════════════
   Se guardan en localStorage con la misma clave que lee el simulador,
   así los mazos que montes aquí aparecen allí para elegirlos. */
const CLAVE="goatDecks";
let slots=[], slotActivo=null;
function leerSlots(){
  try{ slots=JSON.parse(localStorage.getItem(CLAVE)||"[]"); }catch(e){ slots=[]; }
  if(!Array.isArray(slots)) slots=[];
}
function escribirSlots(){
  try{ localStorage.setItem(CLAVE, JSON.stringify(slots)); }
  catch(e){ aviso("No se pudo guardar (almacenamiento del navegador)"); }
}
function guardar(){   // autoguardado del borrador en curso
  try{ localStorage.setItem("goatBorrador",
    JSON.stringify({...D, nombre:$("#nombreMazo").value, slot:slotActivo})); }catch(e){}
}
function cargarGuardado(){
  leerSlots();
  try{
    const j=JSON.parse(localStorage.getItem("goatBorrador")||"null");
    if(j){ D.main=j.main||[]; D.extra=j.extra||[]; D.side=j.side||[];
           if(j.nombre) $("#nombreMazo").value=j.nombre;
           slotActivo=j.slot ?? null; }
  }catch(e){}
  pintarSlots();
}
function valido(){ return D.main.length>=40 && D.main.length<=60; }
function guardarSlot(comoNuevo){
  const nombre=($("#nombreMazo").value||"").trim() || "Mazo sin nombre";
  if(!D.main.length){ aviso("El mazo está vacío"); return; }
  const datos={ nombre, main:[...D.main], extra:[...D.extra], side:[...D.side],
                valido:valido(), fecha:Date.now() };
  if(!comoNuevo && slotActivo!=null && slots[slotActivo]){
    slots[slotActivo]=datos; aviso(`${T("Guardado")}: ${nombre}`);
  } else {
    slots.push(datos); slotActivo=slots.length-1; aviso(`${T("Nuevo mazo")}: ${nombre}`);
  }
  escribirSlots(); pintarSlots(); guardar();
}
function cargarSlot(i){
  const s=slots[i]; if(!s) return;
  D.main=[...s.main]; D.extra=[...s.extra]; D.side=[...(s.side||[])];
  $("#nombreMazo").value=s.nombre; slotActivo=i;
  pintarDeck(); pintarSlots(); aviso(`Cargado: ${s.nombre}`);
}
function borrarSlot(i){
  const s=slots[i]; if(!s) return;
  if(!confirm(`¿Borrar "${s.nombre}"?`)) return;
  slots.splice(i,1);
  if(slotActivo===i) slotActivo=null; else if(slotActivo>i) slotActivo--;
  escribirSlots(); pintarSlots(); aviso("Mazo borrado");
}
function pintarSlots(){
  const c=$("#slots"); if(!c) return;
  c.innerHTML="";
  if(!slots.length){
    c.innerHTML='<div class="vacio">Aún no has guardado ningún mazo</div>';
  }
  slots.forEach((s,i)=>{
    const el=document.createElement("div");
    el.className="slot"+(i===slotActivo?" act":"")+(s.valido?"":" inval");
    el.innerHTML=`<span class="sn">${s.nombre}</span>
      <span class="sc">${s.main.length}${s.extra.length?"+"+s.extra.length:""}</span>
      <button class="sx" title="Borrar">✕</button>`;
    el.onclick=e=>{ if(e.target.classList.contains("sx")) return; cargarSlot(i); };
    el.querySelector(".sx").onclick=e=>{ e.stopPropagation(); borrarSlot(i); };
    c.appendChild(el);
  });
  $("#nSlots").textContent = slots.length;
}

/* ── arranque ── */
function init(){
  $("#buscar").oninput=e=>{ filtro.texto=e.target.value; pintarResultados(); };
  $("#fTipo").onchange=e=>{ filtro.tipo=e.target.value; pintarResultados(); };
  $("#fAtr").onchange=e=>{ filtro.atributo=+e.target.value; pintarResultados(); };
  $("#fNivel").onchange=e=>{ filtro.nivel=+e.target.value; pintarResultados(); };
  $("#btnYdk").onclick=()=>bajar(($("#nombreMazo").value||"mazo")+".ydk", exportarYDK());
  $("#btnSim").onclick=()=>bajar(($("#nombreMazo").value||"mazo")+".goatdeck.json",
                                 exportarParaSimulador(), "application/json");
  $("#btnVaciar").onclick=()=>{ D.main=[];D.extra=[];D.side=[]; pintarDeck(); };
  $("#btnImportar").onclick=()=>$("#ficheroYdk").click();
  $("#ficheroYdk").onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=()=>importarYDK(String(r.result)); r.readAsText(f);
  };
  $("#pegar").onclick=()=>{
    const t=prompt("Pega aquí la lista (YDK o nombres, uno por línea):");
    if(t) importarYDK(t);
  };
  $("#nombreMazo").oninput=guardar;
  $("#btnGuardar").onclick=()=>guardarSlot(false);
  $("#btnGuardarComo").onclick=()=>guardarSlot(true);
  $("#btnNuevo").onclick=()=>{ D.main=[];D.extra=[];D.side=[];
    slotActivo=null; $("#nombreMazo").value=""; pintarDeck(); pintarSlots(); };
  const av=$("#avisoPool");
  if(!hayPool) av.style.display="block";
  cargarGuardado(); pintarDeck();
}
document.addEventListener("DOMContentLoaded", init);
