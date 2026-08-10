/* ════════════════════════════════════════════════════════════
   CAPA VISUAL — no sabe nada de ocgcore. Consume eventos.
   ════════════════════════════════════════════════════════════ */
const $ = s => document.querySelector(s);
/* Traducción: si no hay módulo de idiomas cargado (pruebas de node), el
   texto pasa tal cual. Ver src/i18n.js. */
const T = s => (globalThis.__T ? globalThis.__T(s) : s);
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const L = { DECK:1, HAND:2, MZONE:4, SZONE:8, GRAVE:16, REMOVED:32, EXTRA:64, FZONE:256 };
const ZKEY = { [L.DECK]:"deck", [L.HAND]:"hand", [L.MZONE]:"m", [L.SZONE]:"st",
               [L.GRAVE]:"gy", [L.REMOVED]:"banish", [L.EXTRA]:"extra", [L.FZONE]:"field" };
const ATTRCOL = { 1:["#6b2f1d","#2a0f08","FUEGO"], 2:["#1f4f68","#0a1e28","AGUA"],
  4:["#46522c","#181d0e","TIERRA"], 8:["#26513f","#0d1f18","VIENTO"],
  16:["#7a6a3a","#2a240f","LUZ"], 32:["#412croak","#170b22","OSCURIDAD"],
  64:["#4a3a5a","#1a1020","DIVINO"] };
ATTRCOL[32] = ["#412a5e","#170b22","OSCURIDAD"];
const T_MONSTER=0x1, T_SPELL=0x2, T_TRAP=0x4, T_FUSION=0x40, T_FIELD=0x80000;
const IMG_BASE = "https://images.ygoprodeck.com/images/cards/";

let grid, layer, DUEL, DB, NAMES, ME=0, useImages=true;
/* Orden visual de tu mano. Es SOLO de la vista: el motor mantiene su
   propio orden y no se toca, porque cambiarlo desincronizaría todo. */
let ordenMano = [];
function manoOrdenada(arr){
  const vivos = arr.map(c=>c.uid);
  ordenMano = ordenMano.filter(u=>vivos.includes(u));
  for(const u of vivos) if(!ordenMano.includes(u)) ordenMano.push(u);
  return [...arr].sort((a,b)=>ordenMano.indexOf(a.uid)-ordenMano.indexOf(b.uid));
}
/* Colocación provisional: al soltar una carta sobre una zona se queda ahí
   mientras decides invocar/colocar/activar. Si cancelas, vuelve a la mano.
   Antes volvía a la mano al instante y luego reaparecía en el campo, y
   parecía que la suelta no había funcionado. */
/* Cartas que el motor ha enseñado (Trap Dustshoot y compañía). Se sacan
   de la mano al centro del tablero, boca arriba y grandes, y vuelven a
   taparse solas cuando termina la cadena. */
let revelados = new Set();
export function revelar(uids){
  revelados = new Set(uids ?? []);
  layoutAll();
}
export function ocultarReveladas(){
  if(!revelados.size) return;
  revelados = new Set();
  layoutAll();
}
let previa = null;   // {uid, owner, zone, slot}
export function previaSuelta(uid, owner, zone, slot){
  previa = { uid, owner:Number(owner), zone, slot:Number(slot) };
  layoutAll();
}
export function quitarPrevia(recolocar=true){
  if(!previa) return;
  previa = null;
  if(recolocar) layoutAll();
}
export function moverEnMano(uid, destino){
  const i = ordenMano.indexOf(uid);
  if(i<0) return;
  ordenMano.splice(i,1);
  ordenMano.splice(Math.max(0,Math.min(destino, ordenMano.length)), 0, uid);
  layoutAll();
}
const els = new Map(), zoneEls = {};

/* Moneda al aire: la cara dorada es tuya, la roja del rival. */
export async function sorteo(empiezasTu){
  const cap=document.getElementById("coin");
  cap.innerHTML=`<div class="coinWrap"><div class="coinFace"></div></div>
                 <div class="coinTxt">${T("Sorteo…")}</div>`;
  cap.style.display="flex";
  const moneda=cap.querySelector(".coinWrap");
  moneda.classList.add("girando");
  await sleep(1500);
  moneda.classList.remove("girando");
  moneda.classList.add(empiezasTu ? "cara" : "cruz");
  cap.querySelector(".coinTxt").textContent = T(empiezasTu ? "Empiezas tú" : "Empieza el rival");
  cap.querySelector(".coinTxt").style.color = empiezasTu ? "var(--gold)" : "#ff8f7a";
  await sleep(1400);
  cap.style.opacity="0";
  await sleep(350);
  cap.style.display="none"; cap.style.opacity="";
}
export function initView({ duel, db, names, me=0, images=true }){
  DUEL=duel; DB=db; NAMES=names; ME=me; useImages=images;
  grid=$("#grid"); layer=$("#cardLayer");
  buildBoard();
  fitBoard();
  window.addEventListener("resize", ()=>{ fitBoard(); layoutAll(true); });
}
export function setImages(on){ useImages=on; for(const [,el] of els) el.dataset.code=""; layoutAll(true); }

let zoneViewHandler=null;
export function setZoneViewHandler(fn){ zoneViewHandler=fn; }
export function openZoneView(title, cards, onPick){
  const v=document.getElementById("zoneview");
  v.innerHTML=`<div class="zvhead"><span>${T(title)}</span>
    <button class="zvclose">${T("Cerrar")}</button></div><div class="zvgrid"></div>`;
  const g=v.querySelector(".zvgrid");
  if(!cards.length) g.innerHTML=`<div class="zvempty">${T("No hay cartas aquí")}</div>`;
  for(const c of cards){
    const d=document.createElement("div");
    d.className="zvcard"+(onPick?" pickable":"");
    d.innerHTML=`<div class="card" style="position:static;width:100%;height:100%">
      <div class="inner"><div class="face front">${frontHTML(c.code)}</div></div></div>`;
    d.onmouseenter=()=>showDetail(c.code);
    if(onPick) d.onclick=()=>{ onPick(c); };
    g.appendChild(d);
  }
  v.querySelector(".zvclose").onclick=closeZoneView;
  v.style.display="flex";
}
let alCerrarVisor=null;
export function setZoneViewClose(fn){ alCerrarVisor=fn; }
export function closeZoneView(){
  document.getElementById("zoneview").style.display="none";
  const f=alCerrarVisor; if(f) setTimeout(f,0);
}

function slot(owner, zone, i, cls, label){
  const d=document.createElement("div");
  d.className="slot "+(cls||"");
  d.dataset.owner=owner; d.dataset.zone=zone; d.dataset.slot=i;
  if(label){ d.classList.add("empty-label"); d.dataset.label=T(label); }
  if(zone==="gy"||zone==="extra"||zone==="banish"){
    d.classList.add("browsable");
    d.addEventListener("click",()=>zoneViewHandler?.(owner, zone));
  }
  /* La casilla también responde al clic: si fallas la carta por unos píxeles
     —declarando un ataque, sobre todo— el clic sigue valiendo. */
  if(zone==="m"||zone==="st"||zone==="field"){
    d.classList.add("hitzona");
    d.addEventListener("click",()=>{
      if(dragging) return;
      const loc = zone==="m" ? L.MZONE : zone==="st" ? L.SZONE : L.FZONE;
      const c = DUEL?.zones?.[owner]?.[loc]?.[i];
      if(c) clickHandler?.(c);
    });
  }
  if(["deck","gy","extra","banish"].includes(zone)) d.classList.add("contable");
  zoneEls[`${owner}:${zone}:${i}`]=d; grid.appendChild(d); return d;
}
function buildBoard(){
  grid.innerHTML=""; const foe=1-ME;
  const blank=()=>{ const b=document.createElement("div"); b.className="slot blank"; grid.appendChild(b); };
  /* El lado del rival es el tuyo girado 180°, como dos tapetes enfrentados.
     Por eso hay NUEVE columnas y no ocho: con ocho, poner las desterradas
     del rival pegadas a su cementerio desplazaba sus monstruos una casilla
     y las dos filas dejaban de mirarse de frente. Con la columna extra a
     cada lado, monstruos y M/T quedan enfrentados y cada cementerio tiene
     sus desterradas al lado. */
  blank();
  slot(foe,"deck",0,"special","Deck");
  for(let i=4;i>=0;i--) slot(foe,"st",i,"st","M/T");
  slot(foe,"extra",0,"special","Extra");
  blank();

  slot(foe,"banish",0,"banish","Desterradas");
  slot(foe,"gy",0,"special","Cementerio");
  for(let i=4;i>=0;i--) slot(foe,"m",i,"","Monstruo");
  slot(foe,"field",0,"special","Campo");
  blank();

  const dv=document.createElement("div"); dv.className="divider"; grid.appendChild(dv);

  blank();
  slot(ME,"field",0,"special","Campo");
  for(let i=0;i<5;i++) slot(ME,"m",i,"","Monstruo");
  slot(ME,"gy",0,"special","Cementerio");
  slot(ME,"banish",0,"banish","Desterradas");

  blank();
  slot(ME,"extra",0,"special","Extra");
  for(let i=0;i<5;i++) slot(ME,"st",i,"st","M/T");
  slot(ME,"deck",0,"special","Deck");
  blank();
}
const nameOf = c => NAMES[c]?.name ?? `#${c}`;
const textOf = c => (NAMES[c]?.desc ?? "");
const artCode = c => (DB.get(c)?.alias || c);   // las variantes GOAT usan el arte del original

/* La imagen oficial YA es la carta entera (marco, nombre, ATK/DEF).
   Dibujar encima un marco propio solo la ensuciaba. Si la imagen no carga
   —sin internet— se muestra debajo una ficha mínima como respaldo. */
function frontHTML(code){
  const d=DB.get(code);
  const mon=!!(d?.type & T_MONSTER);
  const [c1,c2,attr] = !d ? ["#333","#111",""]
    : mon ? (ATTRCOL[d.attribute] ?? ["#4a4a4a","#1a1a1a",""])
    : (d.type & T_SPELL) ? ["#14544c","#062420","MÁGICA"] : ["#5c1f42","#26081a","TRAMPA"];
  const respaldo = `<div class="fallback" style="background:linear-gradient(155deg,${c1},${c2})">
      <span class="fbname">${nameOf(code)}</span>
      ${mon?`<span class="fbstats">${d.attack}/${d.defense}</span>
             <span class="fblv">${"★".repeat(Math.min(d.level||0,8))}</span>`
           :`<span class="fbstats">${attr}</span>`}
    </div>`;
  const img = useImages
    ? `<img class="cimg" src="${IMG_BASE}${artCode(code)}.jpg" loading="lazy"
         onload="this.parentNode.classList.add('hasimg')">`
    : "";
  return respaldo + img;
}
function classOf(code){
  const d=DB.get(code); if(!d) return "";
  if(d.type & T_FUSION) return "fusion";
  if(d.type & T_SPELL) return "spell";
  if(d.type & T_TRAP) return "trap";
  return "";
}
function elFor(card){
  let el=els.get(card.uid);
  if(!el){
    el=document.createElement("div");
    el.className="card "+classOf(card.code);
    el.dataset.uid=card.uid;
    el.innerHTML=`<div class="shake"><div class="inner">
      <div class="face front"></div>
      <div class="face back"><img src="${CARD_BACK}" alt=""></div></div></div>`;
    layer.appendChild(el); els.set(card.uid, el); wire(el, card);
  }
  if(el.dataset.code !== String(card.code)){
    el.querySelector(".face.front").innerHTML = frontHTML(card.code);
    el.className = "card "+classOf(card.code);
    el.dataset.code = card.code;
  }
  return el;
}
const isFD = p => !!(p & 0x0a);
const isDef= p => !!(p & 0x0c);
const TILT=11;

function colocarFases(){
  const c=$("#fasesCentro"), st=document.getElementById("stage"),
        dv=grid?.querySelector(".divider");
  if(!c||!st||!dv) return;
  const r=dv.getBoundingClientRect(), rs=st.getBoundingClientRect();
  c.style.top = (r.top - rs.top + r.height/2 - c.offsetHeight/2) + "px";
}
export function fitBoard(){
  const st=document.getElementById("stage"), pl=document.getElementById("plane");
  if(!st||!pl||!grid) return;
  const availW=st.clientWidth-24, availH=st.clientHeight-16;
  const w=grid.offsetWidth, h=grid.offsetHeight;
  if(!w||!h) return;
  /* Debajo del tablero cuelga la mano. Reservar "un 20% más" era un número
     inventado que en el móvil se quedaba corto y las cartas se salían por
     abajo: ahora se reserva EXACTAMENTE lo que asoma, que es alto de carta
     por el trozo visible. */
  const CW = parseFloat(getComputedStyle(document.documentElement)
                .getPropertyValue("--cw")) || 116;
  const esc = parseFloat(getComputedStyle(document.documentElement)
                .getPropertyValue("--mano-mia")) || 1;
  const cuelga = CW*1.46*0.80*esc;
  const k=Math.min(1, availW/w, availH/(h + cuelga));
  pl.style.transform=`scale(${k.toFixed(3)}) rotateX(var(--tilt))`;
  requestAnimationFrame(colocarFases);
}
export function layoutAll(instant){
  const seen=new Set();
  /* Medidas y escalas, una sola vez por repintado. Las escalas de mano
     salen del CSS para que el móvil pueda agrandar TU mano y encoger la
     del rival sin tocar el código. */
  const raiz = getComputedStyle(document.documentElement);
  const CW = parseFloat(raiz.getPropertyValue("--cw")) || 116;
  const ESC_MIA   = parseFloat(raiz.getPropertyValue("--mano-mia"))   || 1;
  const ESC_RIVAL = parseFloat(raiz.getPropertyValue("--mano-rival")) || 1;
  for(const p of [0,1]) for(const loc of [L.DECK,L.HAND,L.GRAVE,L.REMOVED,L.EXTRA,L.MZONE,L.SZONE,L.FZONE]){
    let arr=DUEL.zones[p][loc]; if(!arr) continue;
    if(loc===L.HAND && p===ME) arr = manoOrdenada(arr.filter(Boolean));
    arr.forEach((card,idx)=>{
      if(!card) return; seen.add(card.uid);
      const el=elFor(card);
      if(el.style.display==="none") el.style.display="";
      el.classList.remove("apilada");
      el.style.transition = instant ? "none" : "transform .48s var(--ease), opacity .3s";
      const mine = card.controller===ME;
      let x=0,y=0,rz=0,rx=0,tz=0,sc=1,z=10;
      const enPrevia = !!(previa && previa.uid===card.uid && loc===L.HAND);
      const revelada = revelados.has(card.uid);
      if(revelada && loc===L.HAND && !mine){
        // en fila, en el centro del tablero y a tamaño legible
        const grupo = arr.filter(c=>c && revelados.has(c.uid));
        const k = grupo.indexOf(card), n2 = Math.max(1, grupo.length);
        const paso = Math.min(CW*1.06, (grid.offsetWidth-CW)/n2);
        x = grid.offsetWidth/2 - CW/2 + (k-(n2-1)/2)*paso;
        y = grid.offsetHeight*0.16;
        tz = 220; z = 400 + k; sc = 1.06;
      } else if(enPrevia){
        const p2=zonePos(previa.owner, previa.zone, previa.slot);
        x=p2.x; y=p2.y; tz=26; z=210;
      } else if(loc===L.HAND){
        /* La mano cuelga POR DEBAJO del tablero, no encima. Antes se
           dibujaba dentro del campo y con seis cartas tapaba la fila de
           M/T y media de monstruos: no se veía lo que ibas a jugar.
           Al pasar el ratón (o el dedo) la carta se levanta y se lee
           entera, así que basta con asomar dos tercios. */
        const CH = CW*1.46;
        sc = mine ? ESC_MIA : ESC_RIVAL;
        const n=arr.length, off=idx-(n-1)/2;
        const spread=Math.min(CW*0.80*sc, (grid.offsetWidth*0.62)/Math.max(n,1));
        x = grid.offsetWidth/2 - CW/2 + off*spread;
        const arc=off*off*2.2;
        /* Tu mano se dibuja más grande y asomando más; la del rival, más
           pequeña y apenas asomando: es información que no puedes usar. */
        y = mine ? grid.offsetHeight - CH*(0.16+0.16*sc) + arc
                 : -CH*(0.30+0.30*sc) - arc;
        rz = (mine?1:-1)*off*2.6; rx=-TILT; tz=mine?90:110; z=50+idx;
      } else if(loc===L.DECK||loc===L.GRAVE||loc===L.EXTRA||loc===L.REMOVED){
        /* Solo se dibujan las cartas de arriba del montón. Antes se
           pintaban las 40 y sus sombras se sumaban hasta formar una
           mancha negra (y costaba rendimiento para nada). */
        const desdeArriba = arr.length-1-idx;
        el.style.display = desdeArriba > 3 ? "none" : "";
        if(desdeArriba > 3) return;
        el.classList.toggle("apilada", desdeArriba > 0);
        const p2=zonePos(card.controller, ZKEY[loc], 0);
        const k = Math.min(desdeArriba, 3);
        x=p2.x - k*1.6; y=p2.y - k*2.2; tz=-k*0.5; z=10-k;
      } else {
        const [zk, zi] = casillaDe(loc, idx);
        const p2=zonePos(card.controller, zk, zi);
        x=p2.x; y=p2.y;
        // girar 90° solo monstruos en defensa; una M/T colocada llega con el
        // bit de defensa puesto y se veía tumbada sin motivo
        if(loc===L.MZONE && isDef(card.position)) rz=90;
        if(card.lift){ tz=40; }
      }
      el.style.zIndex=z;
      el.style.transform=`translate3d(${x}px,${y}px,${tz}px) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${sc})`;
      /* La visibilidad depende de la ZONA, no de los bits de posición.
         El core marca como "boca abajo" todo lo que está en una mano, así
         que una carta devuelta desde el cementerio (Magician of Faith)
         llegaba con posición 10 y se pintaba del revés en tu propia mano. */
      const hidden = loc===L.HAND ? !mine
                   : (loc===L.DECK || loc===L.EXTRA) ? true
                   : isFD(card.position);
      /* Las cartas de un montón no capturan el ratón: así el hover y el clic
         llegan a la casilla, que es quien enseña el contador y abre el visor.
         Con la del rival encima, el contador de su mazo no salía nunca. */
      el.classList.toggle("enMonton",
        loc===L.DECK||loc===L.GRAVE||loc===L.EXTRA||loc===L.REMOVED);
      el.classList.toggle("facedown", (enPrevia || revelada) ? false : hidden);
      el.classList.toggle("colocando", enPrevia);
      el.classList.toggle("revelada", revelada);
      el.classList.toggle("in-hand", loc===L.HAND && mine && !enPrevia);
      el.classList.toggle("mano-rival", loc===L.HAND && !mine && !revelada);
      el.classList.toggle("mine", mine);
    });
  }
  for(const [uid,el] of els) if(!seen.has(uid)){ el.remove(); els.delete(uid); }
  refreshLabels();
}
/* Con las reglas de 2005 el Field Spell no está en FZONE: el motor lo pone
   en el puesto 5 de la zona de magias y trampas. Sin esta traducción se
   pintaba en la esquina superior izquierda del tablero, fuera de sitio, y
   la casilla "Campo" no se ocupaba nunca. */
function casillaDe(loc, idx){
  if(loc===L.SZONE && idx===5) return ["field", 0];
  return [ZKEY[loc], idx];
}
function zonePos(owner, zone, i){
  const z=zoneEls[`${owner}:${zone}:${i}`];
  return z ? {x:z.offsetLeft, y:z.offsetTop} : {x:0,y:0};
}
const LOCNUM={deck:1, gy:16, extra:64, banish:32};
function pintarContadores(){
  for(const k in zoneEls){
    const [p,z] = k.split(":");
    const loc = LOCNUM[z]; if(loc===undefined) continue;
    const n=(DUEL.zones[p]?.[loc] ?? []).length;
    zoneEls[k].dataset.n = n;
    zoneEls[k].classList.toggle("conCartas", n>0);
  }
}
function refreshLabels(){
  const occ=new Set();
  for(const p of [0,1]) for(const loc of [L.MZONE,L.SZONE,L.FZONE,L.DECK,L.GRAVE,L.EXTRA]){
    const a=DUEL.zones[p][loc]; if(!a) continue;
    const slotted = loc===L.MZONE||loc===L.SZONE||loc===L.FZONE;
    a.forEach((c,i)=>{
      if(!c) return;
      const [zk, zi] = casillaDe(loc, i);
      occ.add(`${p}:${zk}:${slotted?zi:0}`);
    });
  }
  for(const k in zoneEls) zoneEls[k].classList.toggle("empty-label", !occ.has(k));
  pintarContadores();
}

/* ── historial visual ──
   Miniaturas de lo que se ha jugado, en orden. El log descargable es para
   depurar; esto es para enterarte de qué pasó mientras mirabas otra cosa. */
const HISTORIAL_MAX = 24;
export function alHistorial(code, mia, tipo){
  const z = document.getElementById("historial");
  if(!z || !code) return;
  const d = document.createElement("div");
  d.className = "hcarta " + (mia ? "mia" : "suya");
  d.dataset.tipo = tipo ?? "";
  d.title = `${nameOf(code)} — ${T(mia?"tú":"rival")}`;
  d.innerHTML = useImages
    ? `<img src="${IMG_BASE}${artCode(code)}.jpg" loading="lazy" alt="">`
    : `<span class="hnom">${nameOf(code)}</span>`;
  d.onmouseenter = ()=>showDetail(code);
  d.onclick = ()=>showDetail(code);
  z.appendChild(d);
  while(z.children.length > HISTORIAL_MAX) z.removeChild(z.firstChild);
  z.scrollTop = z.scrollHeight; z.scrollLeft = z.scrollWidth;
}

/* ── panel de detalle (izquierda) ── */
export function showDetail(code){
  const d=DB.get(code); if(!d) return;
  const mon=!!(d.type & T_MONSTER);
  const attr = T(mon ? (ATTRCOL[d.attribute]?.[2] ?? "") : (d.type & T_SPELL ? "Carta Mágica":"Carta de Trampa"));
  const img = useImages ? `<img class="dimg" src="${IMG_BASE}${artCode(code)}.jpg"
      onerror="this.style.display='none'">` : "";
  $("#detail").innerHTML = `${img}
    <h3>${nameOf(code)}</h3>
    <div class="dmeta">${mon ? `${attr} · ${T("Nivel "+d.level)}` : attr}</div>
    ${mon?`<div class="dstats"><span>ATK ${d.attack}</span><span>DEF ${d.defense}</span></div>`:""}
    <div class="dtext">${textOf(code).replace(/\r?\n/g,"<br>")}</div>`;
}
/* ── interacción ── */
let clickHandler=null, dropHandler=null, dragFilter=null, arrastrable=false;
export function setHandlers({ onClick, onDrop, canDrag, arrastre=false }={}){
  clickHandler=onClick??null; dropHandler=onDrop??null; dragFilter=canDrag??null;
  /* El arrastre solo se arma en Main Phase. Fuera de ahí, tocar una carta de
     la mano tiene que ser un clic limpio (elegir descarte, elegir objetivo):
     antes salía el fantasma de arrastre y confundía. */
  arrastrable=!!arrastre;
}
export function markTargets(uids){
  for(const [uid,el] of els) el.classList.toggle("targetable", uids.has(uid));
}
export function markDraggable(uids){
  for(const [uid,el] of els) el.classList.toggle("playable", uids.has(uid));
}
/* Cartas ya en el campo cuyo efecto se puede activar ahora mismo.
   Se distingue de "jugable desde la mano" porque es lo que más se
   pasa por alto: los efectos de monstruo. */
export function markAtacadas(uids){
  for(const [uid,el] of els) el.classList.toggle("gastada", uids.has(uid));
}
export function markUsable(uids){
  for(const [uid,el] of els){
    const on = uids.has(uid);
    el.classList.toggle("usable", on);
    let insignia = el.querySelector(".fx");
    if(on && !insignia){
      insignia=document.createElement("div");
      insignia.className="fx"; insignia.textContent="✦";
      el.appendChild(insignia);
    } else if(!on && insignia) insignia.remove();
  }
}
function wire(el, card){
  el.addEventListener("pointerenter",()=>{
    const visible = revelados.has(card.uid);      // enseñada por un efecto
    const hidden = !visible && isFD(card.position) && card.controller!==ME;
    const inDeck = !visible && (card.location===L.DECK
                 || (card.location===L.EXTRA && card.controller!==ME)
                 || (card.location===L.HAND && card.controller!==ME));
    if(hidden||inDeck) return;
    showDetail(card.code);
  });
  el.addEventListener("pointerdown",e=>{
    if(arrastrable && card.location===L.HAND && card.controller===ME){
      e.preventDefault(); startDrag(card, e, !!dragFilter?.(card));
    }
  });
  el.addEventListener("click",e=>{
    e.stopPropagation();
    if(dragging) return;
    if([L.GRAVE,L.EXTRA,L.REMOVED].includes(card.location)){
      const z = card.location===L.GRAVE ? "gy" : card.location===L.EXTRA ? "extra" : "banish";
      zoneViewHandler?.(card.controller, z);
      return;
    }
    clickHandler?.(card);
  });
}
/* arrastre */
let dragging=null;
const ghost = () => $("#ghost");
function startDrag(card, e, jugable=true){
  /* Si había otra carta posada esperando decisión, se cancela: el menú de
     antes ya no tiene sentido y dejarlo abierto jugaba la carta equivocada. */
  closeChoice(); quitarPrevia();
  dragging={card, moved:false, jugable};
  card.hover=false;
  const g=ghost();
  g.innerHTML=`<div class="card" style="position:static;width:100%;height:100%">
    <div class="inner"><div class="face front">${frontHTML(card.code)}</div></div></div>`;
  g.style.display="block"; moveGhost(e);
  els.get(card.uid).classList.add("dragging");
  if(jugable){
    const d=DB.get(card.code);
    const kind = (d.type & T_MONSTER) ? "m" : "st";
    for(let i=0;i<5;i++) zoneEls[`${ME}:${kind}:${i}`]?.classList.add("drop-ok");
    // un Field Spell también se puede soltar en la casilla de Campo
    if(d.type & T_FIELD) zoneEls[`${ME}:field:0`]?.classList.add("drop-ok");
  }
  window.addEventListener("pointermove",onMove);
  window.addEventListener("pointerup",onUp);
}
function moveGhost(e){ const g=ghost(); g.style.left=e.clientX+"px"; g.style.top=e.clientY+"px"; }
function onMove(e){
  if(!dragging) return; dragging.moved=true; moveGhost(e);
  document.querySelectorAll(".slot.drop-hot").forEach(s=>s.classList.remove("drop-hot"));
  const t=slotUnder(e); if(t?.classList.contains("drop-ok")) t.classList.add("drop-hot");
}
/* Zona de suelta generosa: en vez de exigir que el cursor caiga dentro del
   hueco, buscamos la zona válida cuyo centro esté más cerca, con margen. */
function slotUnder(e){
  let best=null, bestD=Infinity;
  for(const k in zoneEls){
    const z=zoneEls[k];
    if(!z.classList.contains("drop-ok")) continue;
    const r=z.getBoundingClientRect();
    const cx=r.left+r.width/2, cy=r.top+r.height/2;
    const d=Math.hypot(e.clientX-cx, e.clientY-cy);
    if(d<bestD){ bestD=d; best=z; }
  }
  // radio de tolerancia: ancho y medio de carta
  const lim=(best?best.getBoundingClientRect().width:110)*1.6;
  return bestD<=lim ? best : null;
}
function indiceEnMano(e){
  // ¿sobre qué hueco de la mano se ha soltado?
  const mias=[...els.entries()].filter(([uid,el])=>el.classList.contains("in-hand"))
    .map(([uid,el])=>({uid, x:el.getBoundingClientRect().left + el.offsetWidth/2}))
    .sort((a,b)=>a.x-b.x);
  if(!mias.length) return null;
  let i=0;
  while(i<mias.length && e.clientX > mias[i].x) i++;
  return { indice:i, alturaOk: e.clientY > (window.innerHeight||800)*0.62 };
}
function onUp(e){
  const d=dragging; if(!d) return;
  window.removeEventListener("pointermove",onMove);
  window.removeEventListener("pointerup",onUp);
  ghost().style.display="none";
  els.get(d.card.uid)?.classList.remove("dragging");
  const t=slotUnder(e);
  document.querySelectorAll(".slot").forEach(s=>s.classList.remove("drop-ok","drop-hot"));
  dragging=null;
  if(t && t.classList.contains("slot") && String(t.dataset.owner)===String(ME)){
    // se queda donde la has soltado mientras eliges qué hacer con ella
    previaSuelta(d.card.uid, t.dataset.owner, t.dataset.zone, +t.dataset.slot);
    dropHandler?.(d.card, t.dataset.zone, +t.dataset.slot, e.clientX, e.clientY);
    return;
  }
  // soltada sobre la propia mano: reordenar
  const dest = d.moved ? indiceEnMano(e) : null;
  if(dest && dest.alturaOk){ moverEnMano(d.card.uid, dest.indice); return; }
  layoutAll();
}
/* menú contextual en el punto de suelta */
export function choiceMenu(x, y, title, options){
  const m=$("#choice");
  m.innerHTML=`<div class="ctitle">${T(title)}</div>`;
  for(const o of options){
    const b=document.createElement("button");
    b.className="cbtn"+(o.primary?" primary":"");
    b.innerHTML=`<span class="cico">${o.icon??"•"}</span><span>${T(o.label)}</span>`;
    b.onclick=()=>{ m.style.display="none"; o.run(); };
    m.appendChild(b);
  }
  m.style.display="block";
  m.style.left=Math.min(x, (window.innerWidth||1400)-230)+"px";
  m.style.top =Math.min(y, (window.innerHeight||800)-170)+"px";
}
export function closeChoice(){ $("#choice").style.display="none"; }

/* Final del duelo: pantalla completa, no un menú de tres líneas. */
export async function pantallaFinal({ ganaste, motivo, lpMio, lpRival, turnos,
                                      avatarMio, avatarRival, nombreRival, onNuevo }){
  const c=document.getElementById("fin");
  if(!c) return;
  c.className = ganaste ? "gana" : "pierde";
  c.innerHTML=`
    <div class="finLuz"></div>
    <div class="finCaja">
      <div class="finTitulo">${T(ganaste?"VICTORIA":"DERROTA")}</div>
      <div class="finSub">${T(motivo??"")}</div>
      <div class="finDuelistas">
        <div class="finD ${ganaste?"gana":""}">
          ${avatarMio?.src?`<img src="${avatarMio.src}" alt="">`:""}
          <span class="finN">${avatarMio?.nombre??T("Tú")}</span>
          <span class="finLP">${lpMio} LP</span>
        </div>
        <div class="finVs">VS</div>
        <div class="finD ${ganaste?"":"gana"}">
          ${avatarRival?.src?`<img src="${avatarRival.src}" alt="">`:""}
          <span class="finN">${avatarRival?.nombre??T("Oponente")}</span>
          <span class="finLP">${lpRival} LP</span>
        </div>
      </div>
      <div class="finDatos">${T(`${turnos} turnos`)}${nombreRival?` · ${nombreRival}`:""}</div>
      <div class="finBotones">
        <button class="finBtn primario">${T("Nuevo duelo")}</button>
        <button class="finBtn">${T("Ver el tablero")}</button>
      </div>
    </div>`;
  c.style.display="flex";
  requestAnimationFrame(()=>c.classList.add("visible"));
  const btns=c.querySelectorAll(".finBtn");
  if(btns[0]) btns[0].onclick=()=>{ onNuevo ? onNuevo() : location.reload(); };
  if(btns[1]) btns[1].onclick=()=>{ c.classList.remove("visible");
    setTimeout(()=>{ c.style.display="none"; },400); };
}

/* Confirmación modal para lo que no tiene vuelta atrás (rendirse). */
export function confirmar(titulo, texto, alSi, etiquetaSi="Sí, rendirme"){
  const c=document.getElementById("confirm");
  c.innerHTML=`<div class="cfcaja">
    <div class="cftit">${T(titulo)}</div>
    <div class="cftxt">${T(texto??"")}</div>
    <div class="cfbtns">
      <button class="cfno">${T("Seguir jugando")}</button>
      <button class="cfsi">${T(etiquetaSi)}</button>
    </div></div>`;
  c.style.display="flex";
  const caja=c.querySelector(".cfcaja");
  c.querySelector(".cfno").onclick=()=>{ c.style.display="none"; };
  c.querySelector(".cfsi").onclick=()=>{ c.style.display="none"; alSi?.(); };
  if(caja) caja.onclick=e=>e.stopPropagation?.();
  c.onclick=()=>{ c.style.display="none"; };
}

/* ── efectos ── */
export function toast(t){
  const d=document.createElement("div"); d.className="toast"; d.textContent=T(t);
  $("#log").appendChild(d);
  setTimeout(()=>{ d.style.transition=".4s"; d.style.opacity=0; setTimeout(()=>d.remove(),400); },2000);
}
export function banner(t,color){
  const b=$("#banner"); b.textContent=T(t); b.style.color=color||"var(--gold)";
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
}
export function setLP(player,v){
  const isMe=player===ME;
  const el=$(isMe?"#lpMeVal":"#lpOppVal"), box=$(isMe?"#lpMe":"#lpOpp");
  const from=+el.textContent||0, t0=performance.now();
  box.classList.add("hurt"); setTimeout(()=>box.classList.remove("hurt"),700);
  (function step(t){ const k=Math.min(1,(t-t0)/450);
    el.textContent=Math.round(from+(v-from)*(1-Math.pow(1-k,3)));
    if(k<1) requestAnimationFrame(step); })(t0);
}
const PHASE_TXT={1:["Draw Phase","Robo"],2:["Standby Phase","Mantenimiento"],
  4:["Main Phase 1",""],8:["Battle Phase","¡A la batalla!"],16:["Battle Step",""],
  32:["Damage Step",""],64:["Damage Step",""],128:["Battle Phase",""],
  256:["Main Phase 2",""],512:["End Phase","Fin del turno"]};
let ultimaFase=null;
export async function announcePhase(ph, mia){
  const [t,sub]=PHASE_TXT[ph] ?? ["",""];
  if(!t || t===ultimaFase) return;
  ultimaFase=t;
  const c=$("#phasecard");
  c.className = "show " + (mia ? "mine" : "foe");
  c.innerHTML=`<div class="pcmain">${T(t)}</div>${sub?`<div class="pcsub">${T(sub)}</div>`:""}`;
  await sleep(760);
  c.className="";
}
const FASES=[["DP","Draw"],["SP","Standby"],["M1","Main 1"],["BP","Battle"],
             ["M2","Main 2"],["EP","End"]];
export function setPhase(ph){
  const map={1:"DP",2:"SP",4:"M1",8:"BP",16:"BP",32:"BP",64:"BP",128:"BP",256:"M2",512:"EP"};
  const id=map[ph]||"M1";
  document.querySelectorAll(".ph").forEach(e=>e.classList.toggle("on", e.dataset.p===id));
  // misma información en el centro del campo, que es donde se mira
  const c=$("#fasesCentro");
  if(c){
    if(!c.children.length)
      c.innerHTML = FASES.map(([k,n])=>`<div class="fc" data-p="${k}">${n}</div>`).join("");
    for(const el of c.children) el.classList.toggle("on", el.dataset.p===id);
    colocarFases();
  }
}
/* El Damage Step no es una fase más y no va en la tira: se marca encima de
   Battle. Sin esto no se sabía si una cadena era en la declaración de
   ataque o ya dentro del cálculo de daño, que es cuando cambian las cosas
   que se pueden activar. */
let momentoActual = null;
export const MOMENTOS = { ataque:"Declaración de ataque", damage:"Damage Step" };
export function setMomento(m){
  momentoActual = MOMENTOS[m] ? m : null;
  const txt = momentoActual ? MOMENTOS[momentoActual] : "";
  const marcar = el => {
    if(!el || el.dataset.p!=="BP") return;
    el.dataset.sub = txt;
    el.classList.toggle("conSub", !!txt);
    el.classList.toggle("enDamage", momentoActual==="damage");
  };
  for(const el of ($("#fasesCentro")?.children ?? [])) marcar(el);
  document.querySelectorAll(".ph").forEach(marcar);
}
export function momento(){ return momentoActual; }
export function momentoTexto(){ return momentoActual ? MOMENTOS[momentoActual] : ""; }

/* Botones fijos de turno: "siguiente fase" y "terminar turno". */
export function setControles(cfg){
  const z=$("#controles"), bf=$("#btnFase"), bt=$("#btnFin");
  if(!z) return;
  if(!cfg){ z.style.display="none"; return; }
  z.style.display="flex";
  bf.style.display = cfg.fase ? "flex" : "none";
  if(cfg.fase){ $("#btnFaseTxt").textContent = T(cfg.faseTxt ?? "Siguiente fase"); bf.onclick=cfg.fase; }
  bt.style.display = cfg.fin ? "flex" : "none";
  if(cfg.fin) bt.onclick=cfg.fin;
}
export function flash(){ const f=$("#flash"); f.style.transition="none"; f.style.opacity=".5";
  requestAnimationFrame(()=>{ f.style.transition="opacity .35s"; f.style.opacity="0"; }); }
export function popDamage(v,player){
  const d=document.createElement("div"); d.className="dmg"; d.textContent="-"+v;
  const W=window.innerWidth||1400, H=window.innerHeight||800;
  d.style.left=W*0.5+"px"; d.style.top=(player===ME?H*0.70:H*0.28)+"px";
  document.body.appendChild(d); setTimeout(()=>d.remove(),1000);
}
/* declaración de ataque: telegrafía, todavía sin cálculo de daño */
export async function telegraphAttack(uid, targetUid){
  const a=els.get(uid); if(!a) return;
  a.classList.add("declaring");
  const arrow=document.createElement("div"); arrow.className="atkArrow";
  const ar=a.getBoundingClientRect();
  const t=targetUid?els.get(targetUid):null;
  const tr=t?t.getBoundingClientRect()
            :{left:(window.innerWidth||1400)/2-40, top:(window.innerHeight||800)*0.22, width:80, height:0};
  const x1=ar.left+ar.width/2, y1=ar.top+ar.height/2;
  const x2=tr.left+tr.width/2, y2=tr.top+(tr.height||0)/2;
  const len=Math.hypot(x2-x1,y2-y1), ang=Math.atan2(y2-y1,x2-x1)*180/Math.PI;
  arrow.style.left=x1+"px"; arrow.style.top=y1+"px";
  arrow.style.width=len+"px"; arrow.style.transform=`rotate(${ang}deg)`;
  document.body.appendChild(arrow);
  if(t) t.classList.add("underAttack");
  toast(targetUid ? "Ataque declarado" : "Ataque directo declarado");
  await sleep(620);
  arrow.remove(); a.classList.remove("declaring"); t?.classList.remove("underAttack");
}
/* choque real, en el damage step */
export async function animateBattle(uid,targetUid){
  const el=els.get(uid); if(!el) return;
  const start=el.style.transform;
  el.classList.add("attacking");
  const tEl=targetUid?els.get(targetUid):null;
  if(tEl){
    const a=el.getBoundingClientRect(), b=tEl.getBoundingClientRect();
    el.style.transition="transform .24s cubic-bezier(.6,0,.9,.5)";
    el.style.transform=start.replace(/translate3d\(([^)]+)\)/,(m,p)=>{
      const [x,y,z]=p.split(",").map(parseFloat);
      return `translate3d(${x+(b.left-a.left)*0.8}px,${y+(b.top-a.top)*0.8}px,${z+70}px)`;});
    await sleep(250); flash(); tEl.classList.add("hit");
    setTimeout(()=>tEl.classList.remove("hit"),340);
  } else {
    el.style.transition="transform .26s cubic-bezier(.6,0,.9,.5)";
    el.style.transform=start.replace(/translate3d\(([^)]+)\)/,(m,p)=>{
      const [x,y,z]=p.split(",").map(parseFloat);
      const dy=(DUEL.cards.get(uid)?.controller===ME?-1:1)*grid.offsetHeight*0.38;
      return `translate3d(${x}px,${y+dy}px,${z+90}px)`;});
    await sleep(270); flash();
  }
  el.style.transition="transform .4s var(--ease)"; el.style.transform=start;
  await sleep(360); el.classList.remove("attacking");
}
export function glow(uid,on){ els.get(uid)?.classList.toggle("glow",on); }
export { sleep };
