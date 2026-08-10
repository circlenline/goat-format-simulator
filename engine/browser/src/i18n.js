/* ════════════════════════════════════════════════════════════════
   IDIOMAS

   El código sigue escrito en español —es el idioma en el que se piensa
   el proyecto— y la traducción se aplica en los pocos sitios por donde
   pasa TODO el texto: los paneles, los avisos, los menús y las
   etiquetas del tablero. Así no hay que tocar doscientas llamadas ni
   inventarse claves: la clave es la propia frase en español.

   Los nombres y textos de las cartas ya vienen en inglés de la base, que
   es justo lo que espera la comunidad de Goat.

   Para las frases con datos dentro ("Cadena 2: Sangan") hay reglas con
   expresión regular, porque una tabla de frases exactas no puede
   cubrirlas.
   ════════════════════════════════════════════════════════════════ */

const EN = {
  /* ── barra superior y menús ── */
  "Goat Format":"Goat Format",
  "motor ocgcore · reglas 2005":"ocgcore engine · 2005 rules",
  "Cadenas":"Chains",
  "Cadenas: automáticas":"Chains: automatic",
  "Cadenas: preguntar siempre":"Chains: always ask",
  "Cadenas: no activar nada":"Chains: never activate",
  "Descargar log":"Download log",
  "Descarga el historial para enviarlo":"Download the match log to report a bug",
  "Desatascar":"Force advance",
  "Solo para depurar":"Debug only",
  "Pantalla completa":"Fullscreen",
  "Rendirse":"Surrender",
  "Termina el duelo como derrota":"Ends the duel as a loss",
  "Salir al menú":"Back to menu",
  "Motor de reglas de EDOPro · formato de abril de 2005":
    "EDOPro rules engine · April 2005 format",
  "Duelo VS":"VS Duel",
  "Modo Bots":"Bot Mode",
  "Deck Builder":"Deck Builder",
  "Opciones":"Options",
  "← Volver":"← Back",
  "Dificultad del rival":"Opponent difficulty",
  "Tu avatar":"Your avatar",
  "Tu mazo":"Your deck",
  "Mazo del rival":"Opponent deck",
  "Empezar duelo":"Start duel",
  "Al azar entre los incluidos":"Random from the included decks",
  "El mismo que el tuyo":"Same as yours",
  "Gana a cada mazo en las cuatro dificultades.":
    "Beat every deck on all four difficulties.",
  "Ventanas de respuesta":"Response windows",
  "Automáticas":"Automatic",
  "Preguntar siempre":"Always ask",
  "No activar nada":"Never activate",
  "Con \"automáticas\" solo se te pregunta cuando hay algo real a la que responder. En el turno del rival siempre se pregunta.":
    "With \"automatic\" you are only asked when there is something real to respond to. On the opponent's turn you are always asked.",
  "Tiempo para responder":"Response timer",
  "Sin límite":"No limit",
  "Idioma":"Language",
  "Español":"Spanish",
  "Inglés":"English",
  "Cargando el núcleo de reglas…":"Loading the rules core…",
  "Gira el móvil":"Rotate your phone",
  "El tablero de Goat necesita pantalla apaisada. Pon el teléfono en horizontal para jugar.":
    "The Goat board needs a landscape screen. Turn your phone sideways to play.",
  "Error al arrancar":"Failed to start",
  "Novato":"Rookie", "Normal":"Normal", "Duro":"Tough", "Experto":"Expert",
  "Pasa el ratón por una carta para ver su texto completo aquí.":
    "Hover a card to read its full text here.",
  "En Main Phase, arrastra una carta de tu mano al tablero para jugarla.":
    "In Main Phase, drag a card from your hand onto the field to play it.",

  /* ── tablero ── */
  "Deck":"Deck", "Extra":"Extra", "Campo":"Field", "Monstruo":"Monster",
  "M/T":"S/T", "Cementerio":"Graveyard", "Desterradas":"Banished",
  "Oponente":"Opponent", "Tú":"You", "tú":"you", "rival":"opponent",
  "Siguiente fase":"Next phase", "Terminar turno":"End turn",
  "Battle Phase":"Battle Phase", "Main Phase 2":"Main Phase 2",
  "Sorteo…":"Coin toss…", "Empiezas tú":"You go first", "Empieza el rival":"Opponent goes first",
  "Robo":"Draw", "Mantenimiento":"Standby", "¡A la batalla!":"To battle!",
  "Fin del turno":"End of turn",
  "Cerrar":"Close", "No hay cartas aquí":"No cards here",
  "Extra Deck":"Extra Deck", "Cartas desterradas":"Banished cards",
  "No puedes ver el Extra Deck del rival":"You can't look at your opponent's Extra Deck",

  /* ── decisiones ── */
  "Main Phase":"Main Phase",
  "Main Phase 1":"Main Phase 1",
  "Battle Step":"Battle Step",
  "¿Activar el efecto?":"Activate the effect?",
  "Arrastra para jugar o reordenar tu mano · ✦ = efecto disponible":
    "Drag to play or reorder your hand · ✦ = effect available",
  "No tienes jugadas disponibles":"No plays available",
  "Ver todas las acciones":"Show all actions",
  "Todas las acciones":"All actions",
  "Volver":"Back",
  "Invocación normal":"Normal Summon",
  "Invocación especial":"Special Summon",
  "Invocación por volteo":"Flip Summon",
  "Colocar boca abajo":"Set face-down",
  "Colocar tapada":"Set",
  "Activar":"Activate",
  "Cambiar posición":"Change position",
  "Cancelar":"Cancel",
  "Esa carta no se puede jugar ahora":"That card can't be played right now",
  "Los monstruos van en la zona de monstruos":"Monsters go in the Monster Zone",
  "Las Mágicas y Trampas van en la zona de M/T":"Spells and Traps go in the Spell/Trap Zone",
  "Haz clic en un monstruo tuyo para declarar ataque":
    "Click one of your monsters to declare an attack",
  "No puedes atacar":"You can't attack",
  "Ataque declarado":"Attack declared",
  "Ataque directo declarado":"Direct attack declared",
  "Ataque anulado":"Attack negated",
  "¿Quieres responder?":"Respond?",
  "Efecto obligatorio — elige":"Mandatory effect — choose",
  "No responder":"Don't respond",
  "Si no contestas, se pasa sola":"If you don't answer, it passes on its own",
  "Tiempo agotado: no se responde":"Time's up: no response",
  "¿Confirmas?":"Confirm?",
  "Sí":"Yes", "No":"No",
  "Elige una opción":"Choose an option",
  "¿En qué posición?":"In which position?",
  "Ataque":"Attack", "Defensa":"Defense", "Defensa boca abajo":"Face-down Defense",
  "Haz clic en las cartas marcadas, en el campo o en tu mano":
    "Click the highlighted cards, on the field or in your hand",
  "Hay cartas fuera del tablero: ábrelas para verlas":
    "Some cards are off the field: open them to look",
  "👁 Ver las cartas":"👁 Look at the cards",
  "Terminar":"Finish",
  "Declara una carta":"Declare a card",
  "Escribe un nombre…":"Type a name…",
  "Declara un Tipo":"Declare a Type",
  "Declara un Atributo":"Declare an Attribute",
  "Declara un número":"Declare a number",
  "Se revela la mano del rival":"Your opponent's hand is revealed",
  "Se ha roto algo":"Something broke",
  "Descargar log y avisar":"Download the log and report it",
  "Continuar":"Continue",

  /* ── momentos de la cadena ── */
  "Declaración de ataque":"Attack declaration",
  "Damage Step":"Damage Step",
  "Damage Step · cálculo de daño":"Damage Step · damage calculation",
  "Tras el combate":"After damage",
  "Fin del Battle Step":"End of Battle Step",
  "Inicio de la Battle Phase":"Start of Battle Phase",
  "Fin de la Battle Phase":"End of Battle Phase",
  "Final de la Main Phase":"End of Main Phase",
  "Final de la cadena":"End of chain",
  "Al colocar monstruo":"On Set monster",
  "Al colocar M/T":"On Set Spell/Trap",
  "Cambio de posición":"On position change",
  "Al destruirse":"On destruction",
  "Al ir al cementerio":"On sent to Graveyard",
  "Al ir a la mano":"On returned to hand",
  "Draw Phase":"Draw Phase", "Standby Phase":"Standby Phase", "End Phase":"End Phase",

  /* ── final del duelo y rendición ── */
  "VICTORIA":"VICTORY", "DERROTA":"DEFEAT",
  "¡HAS GANADO!":"YOU WIN!", "HAS PERDIDO":"YOU LOSE",
  "TE RINDES":"YOU SURRENDER",
  "Nuevo duelo":"New duel", "Ver el tablero":"Look at the board",
  "¿Seguro que quieres rendirte?":"Surrender this duel?",
  "El duelo termina ahora mismo y cuenta como derrota.":
    "The duel ends right now and counts as a loss.",
  "Seguir jugando":"Keep playing", "Sí, rendirme":"Yes, surrender",
  "Te has rendido":"You surrendered",
  "Te has rendido — derrota":"You surrendered — defeat",
  "Puntos de vida a cero":"Life Points reached zero",
  "Se quedó sin cartas en el Deck":"Deck out",
  "Efecto de una carta":"Card effect",
  "Rendición":"Surrender",
  "Se acabó el tiempo":"Time ran out",

  /* ── deck builder ── */
  "← Menú principal":"← Main menu",
  "Nombre del mazo":"Deck name",
  "Guardar":"Save", "Guardar como nuevo":"Save as new", "Nuevo":"New",
  "Mis mazos":"My decks",
  "Clic izquierdo: añadir al mazo.":"Left click: add to the deck.",
  "Clic derecho: añadir al Side.":"Right click: add to the Side.",
  "Buscar por nombre o texto…":"Search by name or text…",
  "Todos":"All", "Monstruos":"Monsters", "Mágicas":"Spells", "Trampas":"Traps",
  "Main Deck":"Main Deck", "Extra Deck":"Extra Deck", "Side Deck":"Side Deck",
  "Aún no has guardado ningún mazo":"You haven't saved any deck yet",
  "Mazo sin nombre":"Untitled deck",
  "Mazo borrado":"Deck deleted",
  "Mazo válido":"Valid deck",
  "El mazo está vacío":"The deck is empty",
  "Exportar para el simulador":"Export for the simulator",
  "Importar":"Import",
  "Pega aquí la lista (YDK o nombres, uno por línea):":
    "Paste the list here (YDK or card names, one per line):",
  "carta desconocida":"unknown card",
  "no identificadas:":"not recognised:",
  "prohibida en Goat":"forbidden in Goat",
  "solo monstruos de Fusión":"Fusion monsters only",
  "va al Extra Deck":"goes to the Extra Deck",
  "el Main Deck está lleno (60)":"the Main Deck is full (60)",
  "el Extra está lleno (15)":"the Extra Deck is full (15)",
  "el Side está lleno (15)":"the Side Deck is full (15)",
  "No se pudo guardar (almacenamiento del navegador)":
    "Couldn't save (browser storage)",
  "Fusión":"Fusion", "Psíquico":"Psychic",
  "Importado":"Imported", "Guardado":"Saved", "Nuevo mazo":"New deck",
  "Mis mazos":"My decks", "Buscar":"Search",

  /* ── zonas y tipos (para los textos de las cartas) ── */
  "Carta Mágica":"Spell Card", "Carta de Trampa":"Trap Card",
  "MÁGICA":"SPELL", "TRAMPA":"TRAP",
  "FUEGO":"FIRE","AGUA":"WATER","TIERRA":"EARTH","VIENTO":"WIND",
  "LUZ":"LIGHT","OSCURIDAD":"DARK","DIVINO":"DIVINE",
  "Guerrero":"Warrior","Mago":"Spellcaster","Hada":"Fairy","Demonio":"Fiend",
  "Zombi":"Zombie","Máquina":"Machine","Aqua":"Aqua","Piro":"Pyro","Roca":"Rock",
  "Bestia Alada":"Winged Beast","Planta":"Plant","Insecto":"Insect","Trueno":"Thunder",
  "Dragón":"Dragon","Bestia":"Beast","Bestia Guerrero":"Beast-Warrior",
  "Dinosaurio":"Dinosaur","Pez":"Fish","Serpiente Marina":"Sea Serpent","Reptil":"Reptile",
  "mano":"hand","campo":"field","desterradas":"banished",
};

/* Frases con datos dentro. El orden importa: gana la primera que encaje. */
const REGLAS = [
  [/^Turno (\d+) — Tú$/,                 m=>`Turn ${m[1]} — You`],
  [/^Turno (\d+) — Oponente$/,           m=>`Turn ${m[1]} — Opponent`],
  [/^Cadena (\d+): (.+)$/,               m=>`Chain ${m[1]}: ${m[2]}`],
  [/^Invoca: (.+)$/,                     m=>`Summon: ${m[1]}`],
  [/^Invocación especial: (.+)$/,        m=>`Special Summon: ${m[1]}`],
  [/^Invocación por volteo: (.+)$/,      m=>`Flip Summon: ${m[1]}`],
  [/^Desterrada: (.+)$/,                 m=>`Banished: ${m[1]}`],
  [/^Invocar (.+)$/,                     m=>`Summon ${m[1]}`],
  [/^Inv\. especial (.+)$/,              m=>`Special Summon ${m[1]}`],
  [/^Colocar tapada (.+)$/,              m=>`Set ${m[1]}`],
  [/^Colocar (.+)$/,                     m=>`Set ${m[1]}`],
  [/^Activar (.+)$/,                     m=>`Activate ${m[1]}`],
  [/^Atacar con (.+)$/,                  m=>`Attack with ${m[1]}`],
  [/^Encadenar (.+)$/,                   m=>`Chain ${m[1]}`],
  [/^¿Activar el efecto de (.+)\?$/,     m=>`Activate the effect of ${m[1]}?`],
  [/^Selecciona (.+) carta\(s\)$/,       m=>`Select ${m[1]} card(s)`],
  [/^Elige (.+) carta\(s\)$/,            m=>`Choose ${m[1]} card(s)`],
  [/^Confirmar \((\d+)\)$/,              m=>`Confirm (${m[1]})`],
  [/^Se revelan (\d+) carta\(s\)$/,      m=>`${m[1]} card(s) revealed`],
  [/^Opción (\d+)$/,                     m=>`Option ${m[1]}`],
  [/^Cementerio tu — (\d+) carta\(s\)$/, m=>`Your Graveyard — ${m[1]} card(s)`],
  [/^Cementerio del rival — (\d+) carta\(s\)$/, m=>`Opponent's Graveyard — ${m[1]} card(s)`],
  [/^Extra Deck tu — (\d+) carta\(s\)$/, m=>`Your Extra Deck — ${m[1]} card(s)`],
  [/^Cartas desterradas (?:tu|del rival) — (\d+) carta\(s\)$/,
                                          m=>`Banished cards — ${m[1]} card(s)`],
  [/^(.+) — (\d+) carta\(s\)$/,          m=>`${T(m[1])} — ${m[2]} card(s)`],
  [/^Fin del duelo — victoria$/,          ()=>"Duel over — victory"],
  [/^Fin del duelo — derrota$/,           ()=>"Duel over — defeat"],
  [/^Nivel (\d+)$/,                       m=>`Level ${m[1]}`],
  [/^Turno (\d+)$/,                       m=>`Turn ${m[1]}`],
  [/^(\d+) turnos · (.+)$/,               m=>`${m[1]} turns · ${m[2]}`],
  [/^(\d+) turnos$/,                      m=>`${m[1]} turns`],
  [/^(\d+) de (\d+) retos superados$/,    m=>`${m[1]} of ${m[2]} challenges beaten`],
  [/^(\d+)\/(\d+) dificultades$/,         m=>`${m[1]}\/${m[2]} difficulties`],
  [/^(.+) cartas · validado contra la lista oficial$/,
                                          m=>`${m[1]} cards · checked against the official list`],
  [/^(.+) · (Novato|Normal|Duro|Experto)$/, m=>`${m[1]} · ${T(m[2])}`],
  [/^TU TURNO$/,                          ()=>"YOUR TURN"],
  [/^TURNO RIVAL$/,                       ()=>"OPPONENT'S TURN"],
];

let idiomaActual = "en";
export function setIdioma(l){ idiomaActual = (l==="es") ? "es" : "en"; }
export function idioma(){ return idiomaActual; }

export function T(s){
  if(idiomaActual === "es" || s == null) return s;
  const t = String(s);
  const exacto = EN[t.trim()];
  if(exacto !== undefined) return t.replace(t.trim(), exacto);
  for(const [re, fn] of REGLAS){
    const m = re.exec(t.trim());
    if(m) return fn(m);
  }
  return s;
}

/* Traduce lo que ya está escrito en el HTML (menús, barra, pantalla de
   carga). Se llama al arrancar y cada vez que se repinta un menú. */
export function traducirDOM(raiz){
  if(idiomaActual === "es" || !raiz) return;
  const anda = nodo => {
    const hijos = nodo && nodo.childNodes ? [...nodo.childNodes] : [];
    for(const c of hijos){
      if(c.nodeType === 3){
        const crudo = c.nodeValue, limpio = crudo.trim();
        if(limpio){ const tr = T(limpio); if(tr !== limpio) c.nodeValue = crudo.replace(limpio, tr); }
      } else if(c.nodeType === 1){
        for(const a of ["title","placeholder","alt","data-label"]){
          const v = c.getAttribute && c.getAttribute(a);
          if(v) c.setAttribute(a, T(v));
        }
        anda(c);
      }
    }
  };
  try{ anda(raiz); }catch(e){}
}

/* Puente global: view.js y main.js viven en ámbitos separados dentro del
   HTML final, y en las pruebas de node ni siquiera existe este módulo.
   Con esto, allí donde no haya traducción el texto pasa tal cual. */
if(typeof globalThis !== "undefined"){
  globalThis.__T = T;
  globalThis.__traducirDOM = traducirDOM;
  globalThis.__setIdioma = setIdioma;
  globalThis.__idioma = idioma;
}
