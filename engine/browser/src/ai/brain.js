/* ══════════════════════════════════════════════════════════════════
   CEREBRO DEL BOT — cuatro niveles sobre un mismo motor.

   Los principios están sacados del material competitivo de Goat
   (goatformat.com y el artículo de Pojo "40 Common Mistakes"):
     · La ventaja de cartas decide las partidas, no el ataque.
     · No gastes remoción en algo que puedes matar en combate.
     · Invoca ANTES de usar remoción, o regalas un Torrential Tribute.
     · Ataca primero con el monstruo fuerte para forzar el Scapegoat.
     · Guarda MST para Snatch Steal, Premature Burial o Call.
     · Sinister Serpent y Sangan valen más en la mano que colocados.
     · Thousand-Eyes Restrict sin objetivo bueno no compensa.
     · Scapegoat en tu turno te bloquea la invocación.
   ══════════════════════════════════════════════════════════════════ */
import { vistaDe } from "./view.js";
import { atk, def, poder, valorCarta, rolDe, infoDe, evaluar, ventaja,
         ganaCombate, muereAtacando } from "./evaluar.js";
import { canon } from "./knowledge.js";

export const NIVELES = ["novato","normal","duro","experto"];
const RANGO = { novato:0, normal:1, duro:2, experto:3 };

export function crearCerebro({ X, duel, db, names, nivel="normal", yo=1, log, lastre:lastreExtra }){
  const R = X.OcgResponseType, T = X.OcgMessageType;
  const IA = X.SelectIdleCMDAction, BA = X.SelectBattleCMDAction;
  const n = RANGO[nivel] ?? 1;
  /* Ablación de reglas del nivel experto. Con GOAT_AI_OFF="clave,clave"
     se apagan una a una para medir cuánto aporta cada regla en el torneo:
     así se descubre qué la hacía perder contra "duro". En el navegador
     no existe la variable, así que están todas encendidas. */
  const APAGADAS = new Set(String(
    (typeof process!=="undefined" && process.env && process.env.GOAT_AI_OFF)
    || globalThis.GOAT_AI_OFF || "").split(",").map(x=>x.trim()).filter(Boolean));
  const exp = k => n>=3 && !APAGADAS.has(k);

  /* ── LA ESCALERA DE DIFICULTAD ──
     Medido con 300 partidas por cruce, las cuatro "inteligencias" distintas
     daban el mismo bot: ninguna regla de nivel cambiaba la jugada elegida.
     Así que hay UN cerebro que juega lo mejor que sabe y los niveles de
     abajo se lastran con defectos concretos y medibles, como los bots de
     ajedrez. Cada lastre se puede apagar solo y se nota en el torneo.

       error         · probabilidad de elegir una jugada peor a propósito
       sinCadenas    · no responde nada en el turno rival
       cadenaTonta   · responde, pero con lo primero que pilla
       combateTonto  · ataca sin hacer cuentas
       objetivoTonto · elige a quién ataca al azar
       malaSeleccion · elige al azar qué descarta, busca o destruye
       sinRemocion   · no gasta remoción por iniciativa propia
       sinPosicion   · no cambia posiciones ni voltea
       sinGuardar    · gasta las cartas en cuanto puede, sin esperar momento

     Los números salen de medir cada defecto por separado con
     `medir-lastres.mjs`, no de suponerlos. */
  const LASTRE = {
    /* Medido con `medir-lastres.mjs`, 250 partidas por perfil, contra el
       cerebro limpio: novato pierde el 84%, normal el 66% y duro el 60%.
       Los números salen de ahí, no de la intuición. */
    novato:  { error:0.50, sinCadenas:true,  cadenaTonta:false, combateTonto:true,
               objetivoTonto:true, malaSeleccion:true, sinRemocion:true,
               sinPosicion:true,  sinGuardar:true },
    normal:  { error:0.35, sinCadenas:true,  cadenaTonta:false, combateTonto:true,
               objetivoTonto:true, malaSeleccion:true, sinRemocion:true,
               sinPosicion:false, sinGuardar:false },
    duro:    { error:0.20, sinCadenas:false, cadenaTonta:true,  combateTonto:false,
               objetivoTonto:true, malaSeleccion:false, sinRemocion:false,
               sinPosicion:false, sinGuardar:true },
    experto: { error:0,    sinCadenas:false, cadenaTonta:false, combateTonto:false,
               objetivoTonto:false, malaSeleccion:false, sinRemocion:false,
               sinPosicion:false, sinGuardar:false },
  };

  // `lastre` se puede forzar desde fuera para medir cuánto vale cada
  // defecto por separado (ver medir-lastres.mjs).
  const lastre = { ...(LASTRE[nivel] ?? LASTRE.normal), ...(lastreExtra ?? {}) };
  const traza = (msg,extra)=> log?.({ nivel, msg, ...extra });
  const azar = p => Math.random() < p;

  const nombreDe = c => names[c.code]?.name ?? "";
  let ultimoAtacante = null;   // para elegir bien el objetivo del ataque
  const giros = new Map();     // uid → veces que le hemos cambiado la posición
  const cartaDeLista = l => ({ code:l.code, nombre:names[l.code]?.name ?? "",
                               datos:db.get(l.code) ?? null,
                               defensa:false, bocaAbajo:false });

  /* ── ¿tengo con qué? consultas sobre la vista legal ── */
  const tieneEnMano = (v,nom) => v.mano.some(c=>canon(c.nombre)===nom);
  const enCementerio = (v,nom) => v.cementerio.some(c=>canon(c.nombre)===nom);
  const rivalUso = (v,nom) => v.cementerioRival.some(c=>canon(c.nombre)===nom)
                            || v.desterradasRival.some(c=>canon(c.nombre)===nom);
  /* La "amenaza" era solo lo que estaba boca arriba, y con un campo lleno
     de cartas tapadas el bot creía que no pasaba nada: no gastaba remoción,
     no atacaba —porque no sabía si ganaba— y el duelo se atascaba hasta el
     turno 60. Un monstruo tapado también estorba: si no hay nada a cara
     descubierta, cuenta como amenaza. */
  const amenazaMayor = v => {
    const caraArriba = v.monstruosRival.filter(c=>!c.bocaAbajo)
                        .sort((a,b)=>poder(b)-poder(a));
    if(caraArriba.length) return caraArriba[0];
    return v.monstruosRival[0] ?? null;
  };

  /* Cuánta prisa tengo. Un jugador bueno guarda cartas, pero no las
     entierra: si va por detrás o la partida se alarga, las juega. */
  function apuro(v){
    let a = 0;
    if(v.turno >= 8)  a += 0.4;
    if(v.turno >= 14) a += 0.5;
    if(ventaja(v) < 0) a += 0.5;
    if(v.lp.mio < v.lp.rival - 2000) a += 0.5;
    if(v.lp.mio <= 2500) a += 0.4;
    if(v.mano.length >= 5) a += 0.3;          // mano llena: hay que gastar
    return Math.min(a, 1.6);
  }

  /* ══════════ MAIN PHASE ══════════ */
  function mainPhase(m, intento){
    const v = vistaDe(duel, yo, db, names);
    const prisa = apuro(v);

    // ─ Novato: hace lo primero que puede, sin criterio ─
    if(n===0){
      const todo=[];
      (m.summons||[]).forEach((c,i)=>todo.push({a:IA.SELECT_SUMMON,i}));
      (m.activates||[]).forEach((c,i)=>todo.push({a:IA.SELECT_ACTIVATE,i}));
      (m.spell_sets||[]).forEach((c,i)=>todo.push({a:IA.SELECT_SPELL_SET,i}));
      (m.monster_sets||[]).forEach((c,i)=>todo.push({a:IA.SELECT_MONSTER_SET,i}));
      if(todo.length && intento<todo.length){
        const e=todo[(intento + (azar(.5)?1:0)) % todo.length];
        return { type:R.SELECT_IDLECMD, action:e.a, index:e.i };
      }
      return { type:R.SELECT_IDLECMD, action: m.to_bp?IA.TO_BP:IA.TO_EP, index:null };
    }

    const plan = [];   // {puntos, action, index, por, uid}
    const añadir = (puntos, action, index, por, uid) => plan.push({puntos, action, index, por, uid});

    /* 1. INVOCAR. En Goat el monstruo entra antes que la remoción:
          si limpias primero y luego invocas, regalas Torrential. */
    const techoRival = Math.max(0, ...v.monstruosRival.filter(c=>!c.bocaAbajo).map(c=>atk(c)));
    (m.summons||[]).forEach((l,i)=>{
      const c = cartaDeLista(l), inf = infoDe(c);
      let p = 3 + atk(c)/1000;
      /* Invocar de frente algo que el rival se come es regalarlo. En Goat
         se coloca y se espera; el escáner mostraba al bot invocando
         monstruos de 1400 delante de un 1900 turno tras turno. */
      if(techoRival && atk(c) <= techoRival && !inf.noColocar) p -= 1.6;
      if(inf.rol==="beater" || inf.rol==="bomba") p += 1.2;
      if(inf.noColocar) p += 0.4;                       // Sangan quiere atacar
      // no duplicar ATK: Snatch Steal mata dos pájaros de un tiro
      if(exp("atkDuplicado") && v.monstruos.some(x=>!x.bocaAbajo && atk(x)===atk(c))) p -= 1.5;
      // no sobreextender si el rival tiene tapadas y yo ya tengo campo
      if(n>=2 && v.monstruos.length>=2 && v.tapadasRival>0 && ventaja(v)>=0) p -= 1.4;
      añadir(p, IA.SELECT_SUMMON, i, `invocar ${c.nombre}`);
    });

    (m.special_summons||[]).forEach((l,i)=>{
      const c = cartaDeLista(l);
      añadir(4.5 + atk(c)/1000, IA.SELECT_SPECIAL_SUMMON, i, `inv. especial ${c.nombre}`);
    });

    /* 2. COLOCAR MONSTRUO boca abajo */
    (m.monster_sets||[]).forEach((l,i)=>{
      const c = cartaDeLista(l), inf = infoDe(c);
      let p = 1.6;
      if(inf.colocarPreferente) p += 1.6;               // los flip quieren ser colocados
      if(inf.noColocar) p -= 3.0;                       // Sinister y Sangan, no
      if(atk(c) < 1400) p += 0.5;
      if(v.monstruos.length===0) p += 0.6;
      // si enfrente hay algo más grande, colocarla es lo correcto
      if(techoRival && atk(c) <= techoRival) p += 1.4;
      añadir(p, IA.SELECT_MONSTER_SET, i, `colocar ${c.nombre}`);
    });

    /* 3. ACTIVAR MAGIA/TRAMPA: aquí vive casi todo el criterio */
    (m.activates||[]).forEach((l,i)=>{
      const c = cartaDeLista(l), inf = infoDe(c), nom = canon(c.nombre);
      let p = 1.0, por = `activar ${c.nombre}`;

      switch(inf.rol){
        case "draw":
          p = 5.0;
          if(exp("graceful") && nom==="Graceful Charity"){
            // solo +1 de verdad si hay descarte gratis
            const gratis = tieneEnMano(v,"Sinister Serpent") ||
                           v.mano.some(x=>rolDe(x)==="chatarra");
            p = gratis ? 5.5 : 2.0 + prisa*2.2;
            por += gratis ? " (hay descarte gratis)"
                          : (prisa>0.7 ? " (sin descarte ideal, pero hay prisa)"
                                       : " (sin descarte bueno: mejor esperar)");
          }
          break;
        case "handRip":
          p = 4.0;
          if(exp("handRip")){
            // Delinquent Duo se neutraliza con Sinister Serpent
            const serpienteFuera = rivalUso(v,"Sinister Serpent");
            const manoGrande = v.manoRival.cuantas >= 4;
            p = serpienteFuera ? 4.6 : (manoGrande && v.turno<=2 ? 3.4 : 2.2 + prisa*1.5);
          }
          break;
        case "removal": {
          const objetivo = amenazaMayor(v);
          if(!objetivo){ p = 0.2; por += " (sin objetivo)"; break; }
          // no gastes remoción en algo que matas en combate
          const puedoEnCombate = n>=2 && v.monstruos.some(x=>!x.bocaAbajo && ganaCombate(x,objetivo));
          p = puedoEnCombate ? 0.6 : 3.2 + poder(objetivo)/1500;
          if(puedoEnCombate) por += " (lo mato en combate, no la gasto)";
          if(exp("ring") && nom==="Ring of Destruction"){
            // Ring: para lo gordo o para rematar puntos de vida
            const remata = v.lp.rival <= poder(objetivo);
            const noLoMato = !v.monstruos.some(x=>!x.bocaAbajo && ganaCombate(x,objetivo));
            p = remata ? 9.0
              : poder(objetivo)>=1700 ? 3.8
              : noLoMato ? 2.4 + prisa*1.6
              : 1.0 + prisa;
            if(remata) por += " (remata la partida)";
          }
          if(n>=2 && nom==="Nobleman of Crossout"){
            const hayTapado = v.monstruosRival.some(c2=>c2.bocaAbajo);
            p = hayTapado ? 4.2 : 0.1;
          }
          break;
        }
        case "spellRemoval": {
          const objetivos = v.backrowRival.length;
          if(!objetivos){ p = 0.1; break; }
          if(exp("mst")){
            // MST se guarda para equipos y reanimaciones
            const hayJugoso = v.backrowRival.some(c2=>!c2.bocaAbajo &&
              ["equipSteal","revival"].includes(rolDe(c2)));
            p = hayJugoso ? 5.0 : 0.8 + prisa*2.0;
            por += hayJugoso ? " (sobre un equipo/reanimación)" : " (no la malgasto en tapadas)";
          } else p = 2.2;
          break;
        }
        case "massRemoval": {
          const suyas = v.backrowRival.length, mias = v.backrow.length;
          if(n>=2){
            p = (suyas>=2 && suyas>mias) ? 4.4 + suyas*0.4 : 0.4 + prisa;
            if(exp("masiva") && suyas<3 && !v.monstruos.length) p = 0.3 + prisa*1.2;
          } else p = suyas ? 3.0 : 0.2;
          break;
        }
        case "stall": {
          // Scapegoat bloquea tu propia invocación: no en tu turno
          p = (n>=2) ? 0.05 : 1.5;
          por += " (mejor encadenarla en el turno rival)";
          break;
        }
        case "revival": {
          const mejor = v.cementerio.filter(c2=>c2.datos?.type & 0x1)
                                    .sort((a,b)=>atk(b)-atk(a))[0];
          if(!mejor){ p = 0.1; break; }
          p = 3.4 + atk(mejor)/1400;
          if(n>=2 && inf.costeLP && v.lp.mio < 2000) p -= 2.0;
          if(exp("revivir") && v.tapadasRival>=2) p -= 1.0;      // te la responden
          break;
        }
        case "equipSteal": {
          const objetivo = amenazaMayor(v);
          p = objetivo ? 5.5 + poder(objetivo)/1200 : 0.1;
          break;
        }
        case "fusion": {
          // Metamorphosis: solo con objetivo que merezca la pena
          const rivalGordo = amenazaMayor(v);
          const tengoFicha = v.monstruos.some(c2=>atk(c2)===0);
          if(exp("fusion")) p = (rivalGordo && poder(rivalGordo)>=1500) ? 5.2
                     : (tengoFicha ? 2.2 + prisa*1.8 : 0.6 + prisa);
          else p = tengoFicha ? 3.0 : 1.2;
          if(exp("fusion") && !rivalGordo) por += " (sin objetivo que absorber)";
          break;
        }
        case "lock": p = 3.0; break;
        default: p = 1.2;
      }
      // lastre: un jugador flojo se guarda la remoción hasta que ya da igual
      if(lastre.sinRemocion && ["removal","massRemoval","spellRemoval","fusion","lock"].includes(inf.rol))
        p = Math.min(p, 0.1);
      if(p > 0.15) añadir(p, IA.SELECT_ACTIVATE, i, por);
    });

    /* 4. COLOCAR MAGIA/TRAMPA */
    (m.spell_sets||[]).forEach((l,i)=>{
      const c = cartaDeLista(l), inf = infoDe(c);
      let p = 1.4;
      if(inf.reactiva || inf.rapida) p += 1.4;          // trampas y rápidas quieren estar puestas
      if(n>=2 && v.backrow.length>=3) p -= 1.2;         // no cargar todo el backrow
      if(exp("cabras") && canon(c.nombre)==="Scapegoat") p += 1.2; // colocada para encadenarla luego
      añadir(p, IA.SELECT_SPELL_SET, i, `colocar ${c.nombre}`);
    });

    /* 5. CAMBIAR POSICIÓN
       TRAMPA: esto valía 0.9 fijo y el umbral para actuar es 0.8, así que
       en cuanto no había nada mejor —que es casi siempre— el bot se dedicaba
       a girar monstruos. En el log del 2026-08-09 (Horus vs PACMAN, experto)
       hizo 72 cambios de posición contra 6 invocaciones: el duelo llegó al
       turno 35 sin que ninguno de los dos pudiera avanzar. Ahora cada giro
       se puntúa por lo que consigue, y se cuentan los giros por carta para
       que no pueda entrar en bucle aunque la valoración falle.
       OJO: pos_changes NO trae la posición, solo (code, zona, índice).
       Hay que resolverla contra el espejo, como en battlePhase. */
    if(!lastre.sinPosicion) (m.pos_changes||[]).forEach((l,i)=>{
      const real = duel.resolve(l, l.code);
      const c = cartaDeLista(l), inf = infoDe(c);
      const pos = real?.position ?? 0;
      const tapada  = !!(pos & 0x0a);          // boca abajo
      const defensa = !!(pos & 0x0c);          // en defensa
      const amenaza = amenazaMayor(v);
      const techo   = amenaza ? poder(amenaza) : 0;
      // el bit FLIP no es de fiar en esta base (Des Lacooda y Medusa Worm
      // salen sin él), así que se mira también el rol de la tabla
      const esFlip = !!((c.datos?.type ?? 0) & 0x200000)
                     || inf.rol==="flip" || inf.colocarPreferente;
      let p, por = `girar ${c.nombre}`;

      /* Voltear por voltear es la trampa de este bot: el escáner contó
         Tsukuyomi volteado casi seis veces por partida. Un volteo vale lo
         que valga su efecto AHÍ: Tsukuyomi sin nada que apagar no hace
         nada, y Magician of Faith sin mágicas en el cementerio tampoco. */
      const nomC = canon(c.nombre);
      const flipSirve =
          nomC==="Tsukuyomi"        ? v.monstruosRival.some(x=>!x.bocaAbajo)
        : nomC==="Magician of Faith"? v.cementerio.some(x=>(x.datos?.type??0) & 0x2)
        : nomC==="Night Assailant"  ? v.cementerio.some(x=>(x.datos?.type??0) & 0x1)
        : true;

      if(tapada){                               // voltear = invocación por volteo
        if(esFlip && flipSirve)       { p = 2.4; por += " (invocación por volteo: dispara su efecto)"; }
        else if(esFlip)               { p = 0.2; por += " (su efecto no conseguiría nada ahora)"; }
        else if(!amenaza)             { p = 1.5; por += " (campo rival vacío: la saco a pegar)"; }
        else if(atk(c) > techo)       { p = 1.3; por += " (a cara descubierta gana el combate)"; }
        else                          { p = 0.05; por += " (descubierta se la comen)"; }
      } else if(defensa){                       // defensa → ataque
        if(!amenaza)                  { p = 1.6 + atk(c)/2500; por += " (a atacar: no hay nada delante)"; }
        else if(atk(c) > techo)       { p = 1.4; por += " (ya gana el combate)"; }
        else                          { p = 0.05; por += " (atacando no consigue nada)"; }
      } else {                                  // ataque → defensa
        if(amenaza && techo >= atk(c) && def(c) > atk(c))
                                      { p = 1.2; por += " (se refugia: no aguanta de frente)"; }
        else                          { p = 0.05; por += " (no hace falta esconderla)"; }
      }

      // freno de bucle: girar la misma carta una y otra vez nunca es un plan
      const uid = real?.uid ?? `${l.code}:${l.sequence}`;
      const yaGirada = giros.get(uid) ?? 0;
      if(yaGirada >= 2){ p = Math.min(p, 0.05); por += ` (ya girada ${yaGirada} veces)`; }

      añadir(p, IA.SELECT_POS_CHANGE, i, por, uid);
    });

    plan.sort((a,b)=>b.puntos-a.puntos);
    /* Lastre de nivel: de vez en cuando elige una jugada peor a propósito.
       No es ruido decorativo, es lo que separa novato de experto y se
       puede medir apagándolo. */
    if(lastre.error && plan.length>1 && azar(lastre.error))
      plan.unshift(plan.splice(1+((Math.random()*(plan.length-1))|0),1)[0]);

    const elegido = plan[intento];
    if(elegido && elegido.puntos > 0.8){
      traza(elegido.por, { puntos:+elegido.puntos.toFixed(2) });
      if(elegido.action===IA.SELECT_POS_CHANGE && elegido.uid!=null)
        giros.set(elegido.uid, (giros.get(elegido.uid) ?? 0) + 1);
      return { type:R.SELECT_IDLECMD, action:elegido.action, index:elegido.index };
    }
    // sin nada que merezca la pena: a la batalla o a terminar
    return { type:R.SELECT_IDLECMD,
             action: m.to_bp ? IA.TO_BP : IA.TO_EP, index:null };
  }

  /* ══════════ BATTLE PHASE ══════════ */
  function battlePhase(m, intento){
    const v = vistaDe(duel, yo, db, names);
    const ataques = (m.attacks||[]).map((l,i)=>{
      const c = duel.resolve(l, l.code);
      const mio = c ? { code:c.code, nombre:names[c.code]?.name??"",
                        datos:db.get(c.code)??null, defensa:false, bocaAbajo:false } : null;
      return { i, c:mio };
    }).filter(a=>a.c);

    if(!ataques.length)
      return { type:R.SELECT_BATTLECMD, action: m.to_m2?BA.TO_M2:BA.TO_EP, index:null };

    /* Lastre de combate: atacar con todo sin mirar. Es EL error de novato
       y el que más partidas regala, así que es el que separa los niveles. */
    if(lastre.combateTonto){
      if(intento < ataques.length)
        return { type:R.SELECT_BATTLECMD, action:BA.SELECT_BATTLE, index:ataques[intento].i };
      return { type:R.SELECT_BATTLECMD, action: m.to_m2?BA.TO_M2:BA.TO_EP, index:null };
    }

    const rivales = v.monstruosRival;
    /* Cuánto vale atacar con este monstruo, mirando TODOS los objetivos.
       El escáner de partidas decía que el 58% de los ataques no conseguían
       nada: se lanzaban contra monstruos en defensa que no podían romper.
       Un ataque que no mata ni muere es tempo regalado y, encima, se come
       la Sakuretsu del rival para nada. */
    const valeAtacar = c => {
      if(!rivales.length) return 8 + atk(c)/1000;          // directo: siempre
      let mejor = -9;
      for(const r of rivales){
        const mata = ganaCombate(c, r), muero = muereAtacando(c, r);
        let s;
        if(mata && !muero)      s = 4 + poder(r)/1000;      // te lo llevas gratis
        else if(mata && muero)  s = 1.0 + (valorCarta(r) - valorCarta(c));  // cambio
        else if(!mata && !muero) s = -0.6;                  // no pasa nada: no ataques
        else                     s = -4;                    // suicidio
        mejor = Math.max(mejor, s);
      }
      return mejor;
    };

    const puntuados = ataques.map(a=>({ ...a, p:valeAtacar(a.c) }))
                             .filter(a=>a.p > 0.2)
                             // primero el que más saca, no el más grande
                             .sort((a,b)=>b.p-a.p);

    /* Freno con motivo: si el rival tiene tapadas, aún no ha enseñado la
       trampa de masa y tú ya vas ganando, no metas todo el campo. */
    const trampasFuera = rivalUso(v,"Mirror Force") || rivalUso(v,"Torrential Tribute");
    const prudente = !trampasFuera && v.tapadasRival>=2 && v.monstruos.length>=3
                     && ventaja(v)>2 && v.lp.rival>3000;
    const lista = prudente ? puntuados.slice(0,1) : puntuados;

    if(intento < lista.length){
      ultimoAtacante = lista[intento].c;
      traza(`ataca con ${lista[intento].c.nombre}`, { valor:+lista[intento].p.toFixed(2) });
      return { type:R.SELECT_BATTLECMD, action:BA.SELECT_BATTLE, index:lista[intento].i };
    }
    return { type:R.SELECT_BATTLECMD, action: m.to_m2?BA.TO_M2:BA.TO_EP, index:null };
  }

  /* ══════════ CADENAS ══════════ */
  function cadena(m, intento){
    const v = vistaDe(duel, yo, db, names);
    const opciones = (m.selects||[]).map((l,i)=>({ i, c:cartaDeLista(l) }));
    if(!opciones.length) return { type:R.SELECT_CHAIN, index:null };
    if(m.forced) return { type:R.SELECT_CHAIN, index: intento % opciones.length };

    /* Los niveles bajos no responden en el turno rival: la mitad de las
       trampas de Goat se quedan sin usar y se nota mucho en el marcador. */
    if(lastre.sinCadenas) return { type:R.SELECT_CHAIN, index:null };
    // lastre: responde con lo primero que tenga, sin pensar si toca
    if(lastre.cadenaTonta) return { type:R.SELECT_CHAIN,
      index: azar(.4) ? ((Math.random()*opciones.length)|0) : null };

    const puntuar = o => {
      const inf = infoDe(o.c), nom = canon(o.c.nombre);
      // Scapegoat: justo lo que se encadena en el turno rival
      if(nom==="Scapegoat") return v.turnoMio ? -1 : (v.monstruos.length===0 ? 6 : 3);
      if(nom==="Book of Moon") return n>=2 ? 3.5 : 2;
      if(inf.rol==="trapMass") return v.monstruosRival.length>=2 ? 6 : 1.5;
      if(inf.rol==="trapRemoval") return 4;
      if(inf.rol==="counter") return exp("counter") ? (v.lp.mio>4000 ? 4.5 : 1) : 2;
      if(inf.rol==="removal" && inf.rapida) return 4;
      if(inf.rol==="spellRemoval") return 3;
      return 2;
    };
    /* NUNCA responder a tu propia carta. En el duelo del 2026-08-10 el
       bot experto negó su propio Trap Dustshoot con Solemn Judgment y
       pagó media vida por nada: veía "hay ventana de respuesta y tengo
       una contra-trampa" sin mirar de quién era el eslabón de arriba. */
    const arriba = duel.cadena?.[duel.cadena.length-1] ?? null;
    if(arriba && arriba.controller === yo){
      traza("no me encadeno a mi propia carta");
      return { type:R.SELECT_CHAIN, index:null };
    }
    const orden = opciones.map(o=>({...o, p:puntuar(o)}))
                          .filter(o=>o.p>2.4).sort((a,b)=>b.p-a.p);
    if(intento < orden.length){
      traza(`encadena ${orden[intento].c.nombre}`);
      return { type:R.SELECT_CHAIN, index:orden[intento].i };
    }
    return { type:R.SELECT_CHAIN, index:null };
  }

  /* ══════════ SELECCIONES ══════════ */
  function elegirCartas(m, intento){
    const lista = m.type===T.SELECT_UNSELECT_CARD ? (m.select_cards||[]) : (m.selects||[]);
    if(!lista.length) return null;

    /* Lastre: descartar, buscar o destruir a lo tonto. Aquí se decide qué
       carta se va al cementerio y qué se saca del deck, y un jugador malo
       lo hace sin mirar. */
    if(lastre.malaSeleccion && m.type!==T.SELECT_UNSELECT_CARD){
      const min = Math.max(1, m.min ?? 1), max = m.max ?? min;
      const idx = lista.map((_,i)=>i).sort(()=>Math.random()-0.5).slice(0, Math.min(max, Math.max(min,1)));
      return { type: m.type===T.SELECT_TRIBUTE?R.SELECT_TRIBUTE:R.SELECT_CARD, indicies:idx };
    }

    /* Elegir a quién atacar. Antes se cogía "la carta más valiosa", que
       es justo como un monstruo se suicida contra otro más grande. */
    const enBatalla = [8,16,32,64,128].includes(duel.phase);
    if(n>=1 && enBatalla && ultimoAtacante && m.type===T.SELECT_CARD
       && lista.every(l=>l.location===4)){
      const cand = lista.map((l,i)=>{
        const c = cartaDeLista(l);
        const objetivo = { ...c, defensa:!!(l.position & 0x0c), bocaAbajo:!!(l.position & 0x0a) };
        return { i, objetivo, gano: ganaCombate(ultimoAtacante, objetivo),
                 muero: muereAtacando(ultimoAtacante, objetivo),
                 valor: valorCarta(objetivo) + poder(objetivo)/2000 };
      });
      const buenos = cand.filter(c=>c.gano && !c.muero).sort((a,b)=>b.valor-a.valor);
      let elegido = buenos[0] ?? cand.sort((a,b)=>poder(a.objetivo)-poder(b.objetivo))[0];
      // elegir bien a quién atacas es donde está de verdad la habilidad
      if(lastre.objetivoTonto) elegido = cand[(Math.random()*cand.length)|0];
      traza(`objetivo: ${elegido.objetivo.nombre}`);
      return { type:R.SELECT_CARD, indicies:[elegido.i] };
    }
    /* Thousand-Eyes Restrict absorbe copiando el ATK del objetivo. Si
       absorbe una carta tapada se queda en 0 ATK y ataca con 0: medido en
       check-cartas.mjs (boca arriba → 1900, tapada → 0). Así que de los
       monstruos del rival, solo boca arriba, y el de más ataque. */
    if(m.type===T.SELECT_CARD && lista.length>1
       && lista.every(l=>l.location===4) && !enBatalla){
      const rivales = lista.map((l,i)=>({ i, l, c:cartaDeLista(l),
                                          tapada:!!(l.position & 0x0a) }))
                           .filter(x=>x.l.controller!==yo);
      const caraArriba = rivales.filter(x=>!x.tapada);
      if(caraArriba.length){
        const mejor = caraArriba.sort((a,b)=>poder(b.c)-poder(a.c))[0];
        traza(`objetivo boca arriba: ${mejor.c.nombre}`);
        return { type:R.SELECT_CARD, indicies:[mejor.i] };
      }
    }
    const esTributo = m.type===T.SELECT_TRIBUTE;
    const esDescarte = m.type===T.SELECT_CARD && m.selects?.every(l=>l.location===2);
    const puntuar = (l)=>{
      const c = cartaDeLista(l);
      let val = valorCarta(c);
      const inf = infoDe(c);
      if(esTributo || esDescarte){
        // sacrificar/descartar lo que menos duela; Sinister vuelve sola
        if(canon(c.nombre)==="Sinister Serpent") val = 0.1;
        if(inf.rol==="chatarra") val -= 0.4;
        return val;                            // menor es mejor
      }
      return -val - poder(c)/2000;             // destruir/robar lo más valioso
    };
    const orden = lista.map((l,i)=>({i, p:puntuar(l)})).sort((a,b)=>a.p-b.p);
    if(n===0) orden.sort(()=>Math.random()-0.5);
    const min = Math.max(1, m.min??1), max = Math.min(m.max??min, lista.length);
    /* Si es un COSTE (sacrificar, descartar) se coge el mínimo. Si es un
       BENEFICIO (buscar en el deck, recuperar del cementerio) se coge el
       máximo: Thunder Dragon deja añadir dos copias y la IA cogía una. */
    const deZonaOculta = lista.every(l=>[1,16,32].includes(l.location));
    const beneficio = !esTributo && !esDescarte && deZonaOculta;
    const cuantas = beneficio ? Math.max(min, max)
                              : Math.min(Math.max(min,1), Math.max(max,1));
    const desplaz = intento % Math.max(1, orden.length-cuantas+1);
    const idx = orden.slice(desplaz, desplaz+cuantas).map(o=>o.i);
    if(m.type===T.SELECT_UNSELECT_CARD)
      return { type:R.SELECT_UNSELECT_CARD, index: (m.can_finish && intento>=lista.length) ? null : idx[0] };
    return { type: esTributo?R.SELECT_TRIBUTE:R.SELECT_CARD, indicies: idx };
  }

  /* ══════════ POSICIÓN Y SÍ/NO ══════════ */
  function posicion(m){
    const P = X.OcgPosition;
    const v = vistaDe(duel, yo, db, names);
    const puede = p => m.positions & p;
    if(n===0) return { type:R.SELECT_POSITION, position: puede(P.FACEUP_ATTACK)?P.FACEUP_ATTACK:P.FACEUP_DEFENSE };

    /* Antes se comparaba el NÚMERO de monstruos, así que un Thousand-Eyes
       Restrict acababa en defensa aunque el rival tuviera el campo vacío.
       Lo que importa es si algo puede matarlo y si hay a quién pegar. */
    const mio = { datos: db.get(m.code) ?? null, defensa:false, bocaAbajo:false };
    const amenaza = v.monstruosRival.reduce((mx,c)=>
      Math.max(mx, c.bocaAbajo ? 1500 : poder(c)), 0);
    const campoRivalVacio = v.monstruosRival.length === 0;
    const aguanta = atk(mio) > amenaza;

    if((campoRivalVacio || aguanta) && puede(P.FACEUP_ATTACK))
      return { type:R.SELECT_POSITION, position:P.FACEUP_ATTACK };
    if(puede(P.FACEUP_DEFENSE) && def(mio) >= atk(mio))
      return { type:R.SELECT_POSITION, position:P.FACEUP_DEFENSE };
    if(puede(P.FACEUP_ATTACK)) return { type:R.SELECT_POSITION, position:P.FACEUP_ATTACK };
    if(puede(P.FACEUP_DEFENSE)) return { type:R.SELECT_POSITION, position:P.FACEUP_DEFENSE };
    return { type:R.SELECT_POSITION, position:P.FACEDOWN_DEFENSE };
  }
  function siNo(m, tipo){
    if(n===0) return { type:tipo, yes: azar(.6) };
    return { type:tipo, yes:true };     // los efectos opcionales suelen convenir
  }

  /* ══════════ ENTRADA ══════════ */
  return function decidir(m, intento=0){
    switch(m.type){
      case T.SELECT_IDLECMD:   return mainPhase(m, intento);
      case T.SELECT_BATTLECMD: return battlePhase(m, intento);
      case T.SELECT_CHAIN:     return cadena(m, intento);
      case T.SELECT_CARD:
      case T.SELECT_TRIBUTE:
      case T.SELECT_UNSELECT_CARD: return elegirCartas(m, intento);
      case T.ANNOUNCE_CARD: {
        /* Un jugador conoce su propio mazo: se declara la carta que más
           copias le quedan, que es la jugada correcta con Archfiend's Oath. */
        const mazo = duel.zones[yo]?.[1] ?? [];
        const cuenta = new Map();
        for(const c of mazo) if(c) cuenta.set(c.code, (cuenta.get(c.code)||0)+1);
        const orden=[...cuenta.entries()].sort((a,b)=>b[1]-a[1]);
        for(const [code] of orden){
          const d=db.get(code); if(!d) continue;
          let vale=true;
          try{ vale = X.cardMatchesOpcode(d, m.opcodes); }catch(e){ vale=true; }
          if(vale){ traza(`declara ${names[code]?.name ?? code}`); return { type:R.ANNOUNCE_CARD, card:code }; }
        }
        return null;
      }
      case T.SELECT_POSITION:  return posicion(m);
      case T.SELECT_EFFECTYN:  return siNo(m, R.SELECT_EFFECTYN);
      case T.SELECT_YESNO:     return siNo(m, R.SELECT_YESNO);
      default: return null;    // lo demás lo resuelve el piloto genérico
    }
  };
}
