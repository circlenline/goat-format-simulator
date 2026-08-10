/* ════════════════════════════════════════════════════════════════════
   ADAPTADOR: mensajes de ocgcore  →  eventos genéricos de vista.

   Esta es la pieza clave del proyecto. Ni la vista sabe qué es ocgcore,
   ni ocgcore sabe que existe una interfaz. El día que hagas tu propio
   juego, escribes otro adaptador que emita estos mismos eventos y toda
   la capa visual se reutiliza sin tocar una línea.

   Eventos emitidos:
     turn   {player, turn}          phase  {phase}
     draw   {player, cards[]}       move   {uid, from, to}
     summon {uid, kind}             flip   {uid}
     chain  {uid, code, link}       attack {uid, targetUid}
     damage {player, amount}        lp     {player, value}
     win    {player, reason}        prompt {kind, msg}
   ════════════════════════════════════════════════════════════════════ */

export const LOC = { DECK:1, HAND:2, MZONE:4, SZONE:8, GRAVE:16, REMOVED:32,
                     EXTRA:64, OVERLAY:128, FZONE:256, PZONE:512 };
export const POS = { FACEUP_ATTACK:1, FACEDOWN_ATTACK:2, FACEUP_DEFENSE:4,
                     FACEDOWN_DEFENSE:8 };
const SLOTTED = new Set([LOC.MZONE, LOC.SZONE, LOC.FZONE, LOC.PZONE]);
// OJO: las posiciones son máscaras de bits. Una M/T colocada llega como
// FACEDOWN (0x0a), que no es igual a FACEDOWN_DEFENSE — comparar por
// igualdad hacía que las cartas tapadas del rival se vieran boca arriba.
const isFaceDown = p => !!(p & 0x0a);
const isDefense  = p => !!(p & 0x0c);

export class GoatDuel {
  constructor({ lib, X, cardDb, scriptReader, onEvent }){
    this.lib = lib; this.X = X;
    this.cardDb = cardDb; this.scriptReader = scriptReader;
    this.onEvent = onEvent ?? (()=>{});
    this.handle = null;
    this.uid = 0;
    this.cards = new Map();          // uid -> {uid, code, position, controller, location, sequence}
    this.zones = { 0:this.emptySide(), 1:this.emptySide() };
    this.lp = { 0:8000, 1:8000 };
    this.turnPlayer = 0; this.turnCount = 0; this.phase = 0;
    this.pending = null;             // pregunta del core esperando respuesta
    this.desyncs = 0;                // veces que el espejo no cuadró con el core
    this.cadena = [];                // eslabones vivos: {code, controller, uid}
    this.finished = false;
  }
  emptySide(){
    /* La zona de M/T tiene SEIS huecos, no cinco: con las reglas de 2005 el
       Field Spell no vive en FZONE, vive en el puesto 5 de la propia zona de
       magias y trampas. Con cinco huecos, un Field Spell activado se salía
       del array y la vista lo pintaba en la esquina del tablero. */
    return { [LOC.DECK]:[], [LOC.HAND]:[], [LOC.GRAVE]:[], [LOC.REMOVED]:[],
             [LOC.EXTRA]:[], [LOC.MZONE]:new Array(5).fill(null),
             [LOC.SZONE]:new Array(6).fill(null), [LOC.FZONE]:new Array(1).fill(null) };
  }
  emit(t, data){ this.onEvent({ t, ...data }); }

  // ── construcción ────────────────────────────────────────────────
  async create({ deck0, deck1, extra0=[], extra1=[], seed=[1n,2n,3n,4n], lp=8000 }){
    const { OcgDuelMode, OcgLocation, OcgPosition } = this.X;
    this.handle = await this.lib.createDuel({
      flags: OcgDuelMode.MODE_GOAT, seed,
      team1:{ startingLP:lp, startingDrawCount:5, drawCountPerTurn:1 },
      team2:{ startingLP:lp, startingDrawCount:5, drawCountPerTurn:1 },
      cardReader: code => this.cardDb.get(code) ?? null,
      scriptReader: this.scriptReader,
      errorHandler: (type, text) => this.emit("coreError", { type, text:String(text) }),
    });
    if(!this.handle) throw new Error("ocgcore: createDuel devolvió null");
    // el core no carga sus librerías solo; constant y utility arrastran el resto
    for(const name of ["constant.lua","utility.lua"])
      await this.lib.loadScript(this.handle, name, this.scriptReader(name));

    for(const [team, main, ex] of [[0,deck0,extra0],[1,deck1,extra1]]){
      for(const code of main)
        await this.lib.duelNewCard(this.handle,{ team, duelist:0, code, controller:team,
          location:OcgLocation.DECK, sequence:0, position:OcgPosition.FACEDOWN_DEFENSE });
      for(const code of ex)
        await this.lib.duelNewCard(this.handle,{ team, duelist:0, code, controller:team,
          location:OcgLocation.EXTRA, sequence:0, position:OcgPosition.FACEDOWN_DEFENSE });
    }
    // espejo local del estado: el core no nos dice qué hay en el deck
    for(const [team, main, ex] of [[0,deck0,extra0],[1,deck1,extra1]]){
      main.forEach(code => this.zones[team][LOC.DECK].push(this.newCard(code, team, LOC.DECK)));
      ex.forEach(code   => this.zones[team][LOC.EXTRA].push(this.newCard(code, team, LOC.EXTRA)));
    }
    this.lp[0]=this.lp[1]=lp;
    await this.lib.startDuel(this.handle);
    this.emit("ready", { lp });
  }
  newCard(code, controller, location){
    const c = { uid:++this.uid, code, controller, location, sequence:0,
                position:POS.FACEDOWN_DEFENSE };
    this.cards.set(c.uid, c); return c;
  }

  // ── seguimiento de posiciones ───────────────────────────────────
  // El core identifica cartas por (controlador, zona, índice), no por id.
  // Mantenemos el espejo para poder dar a cada carta un uid estable que
  // la vista pueda animar de un sitio a otro.
  at(controller, location, sequence){
    return this.zones[controller]?.[location]?.[sequence] ?? null;
  }
  /* El core identifica cartas por (controlador, zona, índice). Si nuestro
     espejo se desincroniza aunque sea un puesto, devolveríamos la carta
     equivocada — y eso hacía que jugaras una carta distinta a la que
     arrastrabas. Cuando el mensaje trae el código, lo verificamos y, si no
     cuadra, buscamos por código dentro de la misma zona. */
  resolve(loc, code){
    const z = this.zones[loc.controller]?.[loc.location];
    if(!z) return null;
    const direct = z[loc.sequence] ?? null;
    const want = code ?? loc.code;
    if(!want || (direct && direct.code === want)) return direct;
    const byCode = z.find(c => c && c.code === want);
    if(byCode){
      this.desyncs++;
      return byCode;
    }
    return direct;
  }
  remove(card){
    const z = this.zones[card.controller][card.location];
    if(!z) return;
    if(SLOTTED.has(card.location)){ const i=z.indexOf(card); if(i>=0) z[i]=null; }
    else { const i=z.indexOf(card); if(i>=0) z.splice(i,1); }
  }
  insert(card, controller, location, sequence){
    card.controller = controller; card.location = location; card.sequence = sequence;
    const z = this.zones[controller][location];
    if(!z) return;
    if(SLOTTED.has(location)) z[sequence] = card;
    else if(sequence >= 0 && sequence <= z.length) z.splice(sequence, 0, card);
    else z.push(card);
    this.reindex(controller, location);
  }
  reindex(controller, location){
    const z = this.zones[controller][location];
    if(!z || SLOTTED.has(location)) return;
    z.forEach((c,i)=>{ if(c) c.sequence = i; });
  }

  // ── bucle principal ─────────────────────────────────────────────
  async run(){
    const { OcgProcessResult } = this.X;
    while(!this.finished){
      const status = await this.lib.duelProcess(this.handle);
      for(const m of this.lib.duelGetMessage(this.handle)) this.handle_(m);
      if(status === OcgProcessResult.END){ this.finished = true; this.emit("end",{}); break; }
      if(status === OcgProcessResult.WAITING) return this.pending;   // turno de decidir
    }
    return null;
  }
  respond(response){
    this.lib.duelSetResponse(this.handle, response);
    this.pending = null;
  }

  handle_(m){
    const T = this.X.OcgMessageType;
    switch(m.type){
      case T.NEW_TURN:
        this.turnPlayer = m.player; this.turnCount++;
        this.emit("turn",{ player:m.player, turn:this.turnCount }); break;
      case T.NEW_PHASE:
        this.phase = m.phase; this.emit("phase",{ phase:m.phase }); break;

      case T.DRAW: {
        const drawn = [];
        for(const d of (m.drawn ?? [])){
          const code = d.code ?? d;
          const deck = this.zones[m.player][LOC.DECK];
          // el core roba de arriba; nuestro espejo no conoce el orden real,
          // así que reasignamos el código a la carta que sacamos
          const card = deck.pop() ?? this.newCard(code, m.player, LOC.DECK);
          this.remove(card); card.code = code;
          this.insert(card, m.player, LOC.HAND, this.zones[m.player][LOC.HAND].length);
          card.position = POS.FACEUP_ATTACK;
          drawn.push(card);
        }
        this.emit("draw",{ player:m.player, cards:drawn }); break;
      }
      case T.MOVE: {
        const from = m.from, to = m.to;
        let card = this.resolve(from, m.card);
        if(!card){ // aparición no rastreada (fichas, cartas del deck rival…)
          card = this.newCard(m.card, to.controller, to.location);
        } else this.remove(card);
        card.code = m.card || card.code;
        const prev = { controller:from.controller, location:from.location,
                       sequence:from.sequence, position:card.position };
        this.insert(card, to.controller, to.location, to.sequence);
        card.position = to.position ?? card.position;
        this.reindex(from.controller, from.location);
        this.emit("move",{ uid:card.uid, code:card.code, from:prev,
          to:{ controller:to.controller, location:to.location, sequence:to.sequence,
               position:card.position, faceDown:isFaceDown(card.position),
               defense:isDefense(card.position) } });
        break;
      }
      case T.POS_CHANGE: {
        const card = this.resolve(m, m.code);
        if(card){ card.position = m.position;
          this.emit("pos",{ uid:card.uid, faceDown:isFaceDown(m.position),
                            defense:isDefense(m.position) }); }
        break;
      }
      case T.SET: this.emit("set",{ code:m.code, controller:m.controller,
                    location:m.location, sequence:m.sequence }); break;
      case T.SUMMONING:
      case T.SPSUMMONING:
      case T.FLIPSUMMONING: {
        const card = this.resolve(m, m.code);
        // el core no envía POS_CHANGE en una invocación por volteo: la
        // posición nueva viaja dentro de este mismo mensaje
        if(card && m.position != null) card.position = m.position;
        const kind = m.type===T.SUMMONING ? "normal"
                   : m.type===T.SPSUMMONING ? "special" : "flip";
        this.emit("summon",{ uid:card?.uid, code:m.code, kind,
                             faceDown:isFaceDown(card?.position ?? 0),
                             defense:isDefense(card?.position ?? 0) }); break;
      }
      case T.CHAINING: {
        const card = this.resolve(m, m.code);
        /* Quién ha puesto cada eslabón. Hace falta para que la IA no se
           encadene a sí misma: negaba su propio Trap Dustshoot con Solemn
           Judgment y pagaba media vida por nada. */
        this.cadena.push({ code:m.code, controller:m.controller, uid:card?.uid ?? null });
        this.emit("chain",{ uid:card?.uid, code:m.code, link:m.chain_size,
                            controller:m.controller }); break;
      }
      case T.BATTLE: {
        const a=this.at(m.card.controller,m.card.location,m.card.sequence);
        const t=m.target?this.at(m.target.controller,m.target.location,m.target.sequence):null;
        /* El mensaje trae quién muere y con cuánto: con eso se puede medir
           si la IA ataca bien o se suicida (ver analizar.mjs). */
        this.emit("battle",{ uid:a?.uid, targetUid:t?.uid ?? null,
          atacante:{ atk:m.card.attack, def:m.card.defense, muere:!!m.card.destroyed,
                     controller:m.card.controller },
          objetivo: m.target ? { atk:m.target.attack, def:m.target.defense,
                     muere:!!m.target.destroyed, controller:m.target.controller } : null });
        break;
      }
      case T.ATTACK_DISABLED: this.emit("attackCancelled",{}); break;
      case T.SUMMONED: case T.SPSUMMONED: case T.FLIPSUMMONED:
        this.emit("summoned",{}); break;
      case T.CHAIN_SOLVED: this.emit("chainSolved",{ link:m.chain_size }); break;
      case T.CHAIN_END:    this.cadena.length=0; this.emit("chainEnd",{}); break;
      case T.ATTACK: {
        const a = this.at(m.card.controller, m.card.location, m.card.sequence);
        const t = m.target ? this.at(m.target.controller, m.target.location, m.target.sequence) : null;
        this.emit("attack",{ uid:a?.uid, targetUid:t?.uid ?? null }); break;
      }
      case T.DAMAGE:
        this.lp[m.player] = Math.max(0, this.lp[m.player] - m.amount);
        this.emit("damage",{ player:m.player, amount:m.amount, lp:this.lp[m.player] }); break;
      case T.RECOVER:
        this.lp[m.player] += m.amount;
        this.emit("recover",{ player:m.player, amount:m.amount, lp:this.lp[m.player] }); break;
      case T.PAY_LPCOST:
        this.lp[m.player] = Math.max(0, this.lp[m.player] - m.amount);
        this.emit("damage",{ player:m.player, amount:m.amount, lp:this.lp[m.player], cost:true }); break;
      case T.LPUPDATE:
        this.lp[m.player] = m.lp; this.emit("lp",{ player:m.player, value:m.lp }); break;
      case T.WIN:
        this.finished = true; this.emit("win",{ player:m.player, reason:m.reason }); break;
      case T.SHUFFLE_DECK: this.emit("shuffle",{ player:m.player }); break;
      /* Delinquent Duo, Graceful Charity y los descartes al azar hacen que el
         core baraje la mano. Si no reordenamos igual, nuestro espejo queda
         desfasado para siempre: era la causa de jugar la carta equivocada. */
      case T.SHUFFLE_HAND:
      case T.SHUFFLE_EXTRA: {
        const loc = m.type===T.SHUFFLE_HAND ? LOC.HAND : LOC.EXTRA;
        const zone = this.zones[m.player][loc];
        const pool = [...zone];
        const nuevo = [];
        for(const code of (m.cards ?? [])){
          let i = pool.findIndex(c => c && c.code === code);
          if(i < 0) i = pool.findIndex(c => c);          // no debería pasar
          if(i >= 0) nuevo.push(pool.splice(i,1)[0]);
        }
        for(const resto of pool) if(resto) nuevo.push(resto);
        zone.length = 0; zone.push(...nuevo);
        this.reindex(m.player, loc);
        this.emit("reorder",{ player:m.player, location:loc });
        break;
      }
      /* El motor avisa de qué cartas se enseñan (Trap Dustshoot, Confiscation,
         Mind Crush, mirar la cima del deck…). Antes se ignoraba y por eso la
         mano del rival seguía tapada mientras te pedía elegir de una lista.
         Al revelarse dejan de ser secretas: se les fija el código. */
      case T.CONFIRM_CARDS: {
        const vistas=[];
        for(const c of (m.cards ?? [])){
          /* OJO: del DECK ni se pregunta. Nuestro orden del mazo es ficticio
             —el motor baraja por su cuenta— así que buscar ahí una carta
             concreta siempre "repara" y disparaba el contador de
             desincronizaciones: 30 por partida de puro ruido, tapando las
             de verdad. Además, fijar el código ahí pisaría otra carta. */
          if(c.location === LOC.DECK || c.location === LOC.EXTRA) continue;
          const card = this.resolve(c, c.code);
          if(!card) continue;
          if(c.code) card.code = c.code;
          vistas.push(card);
        }
        this.emit("revelar", { player:m.player, uids:vistas.map(c=>c.uid),
                               codes:vistas.map(c=>c.code),
                               location: m.cards?.[0]?.location ?? 0 });
        break;
      }
      /* El Damage Step no llega como fase: llega con sus propios avisos.
         Sin esto no había forma de saber si una cadena era en la
         declaración de ataque o ya dentro del cálculo de daño. */
      case T.DAMAGE_STEP_START: this.emit("damageStep",{ on:true }); break;
      case T.DAMAGE_STEP_END:   this.emit("damageStep",{ on:false }); break;
      case T.RETRY: this.emit("retry",{}); break;
      default:
        if(this.isQuestion(m.type)){ this.pending = m; this.emit("prompt",{ msg:m }); }
    }
  }
  isQuestion(t){
    const T = this.X.OcgMessageType;
    return [T.SELECT_IDLECMD,T.SELECT_BATTLECMD,T.SELECT_CHAIN,T.SELECT_EFFECTYN,
            T.SELECT_YESNO,T.SELECT_OPTION,T.SELECT_CARD,T.SELECT_UNSELECT_CARD,
            T.SELECT_PLACE,T.SELECT_DISFIELD,T.SELECT_POSITION,T.SELECT_TRIBUTE,
            T.SELECT_SUM,T.SELECT_COUNTER,T.SORT_CARD,T.ANNOUNCE_RACE,
            T.ANNOUNCE_ATTRIB,T.ANNOUNCE_NUMBER,T.ANNOUNCE_CARD].includes(t);
  }
}
