/* ════════════════════════════════════════════════════════════════
   BANCO DE ESCENARIOS

   Monta una partida con el tablero que le pidas —cartas concretas en
   campo, mano, cementerio o deck— y la conduce con un guion. Sirve
   para comprobar RULINGS: cómo se comporta el motor en una situación
   exacta, sin depender de que salga por azar en una partida entera.

   No usa el espejo de `duel.mjs` a propósito: pregunta al motor con
   `duelQueryLocation`, así que lo que verifica es ocgcore, no nuestra
   copia del estado.
   ════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import * as X from "./out/ocgcore.bundle.js";
import { scriptReader } from "./out/scripts.bundle.js";
import { makeAutoPlayer } from "./src/autopilot.mjs";
import { makeTrivialResolver } from "./src/trivial.js";

const raw   = JSON.parse(readFileSync("./out/cards.subset.json","utf-8"));
export const NOMBRES = JSON.parse(readFileSync("./out/names.subset.json","utf-8"));
export const DB = new Map();
for(const k in raw){ const c=raw[k]; DB.set(c.code, {...c, race:BigInt(c.race)}); }

/* TRAMPA GORDA: solo las cartas del pool llevan su script Lua dentro del
   bundle. Muchas cartas de Goat existen en la base con dos códigos —el
   normal y la versión "(GOAT)" o "(Pre-Errata)"— y el que está en el pool
   suele ser el segundo. Si montas un escenario con el código equivocado,
   la carta aparece pero NO TIENE EFECTO, y el escenario miente sin dar
   ningún error. Por eso aquí se busca por nombre base y gana el del pool. */
const POOL = new Set(JSON.parse(readFileSync("../data/goat-pool.json","utf-8")).map(Number));
const base = n => String(n).replace(/\s*\((GOAT|Pre-Errata|Anime|Action Field)\)\s*$/i,"").trim();
const PORNOMBRE = new Map();
for(const code in NOMBRES){
  const n = NOMBRES[code]?.name; if(!n) continue;
  for(const clave of new Set([n, base(n)])){
    const previo = PORNOMBRE.get(clave);
    if(previo===undefined || (!POOL.has(previo) && POOL.has(+code))) PORNOMBRE.set(clave, +code);
  }
}
export function codigo(nombre){
  const c = PORNOMBRE.get(nombre) ?? PORNOMBRE.get(base(nombre));
  if(!c) throw new Error(`no existe la carta "${nombre}" en la base`);
  if(!POOL.has(c)) throw new Error(
    `"${nombre}" (${c}) no está en el pool de Goat: no lleva script y no haría nada`);
  return c;
}
export const nombre = code => NOMBRES[code]?.name ?? "#"+code;

const L = X.OcgLocation, P = X.OcgPosition, T = X.OcgMessageType;
const RELLENO = "Mystical Elf";   // vainilla inofensiva para llenar el deck

/* Monta el duelo. Cada lado se describe así:
     { monstruos:[{carta,pos}], mt:[{carta,pos}], mano:[carta], gy:[carta],
       deck:[carta] }
   Lo que falte del deck se rellena con vainillas para que nadie se deckee. */
export async function montar(lado0={}, lado1={}, opciones={}){
  const lib = await X.default({ sync:true });
  const handle = await lib.createDuel({
    flags: X.OcgDuelMode.MODE_GOAT,
    seed: (opciones.seed ?? [11n,7n,13n,29n]),
    team1:{ startingLP:8000, startingDrawCount:opciones.roboInicial ?? 5, drawCountPerTurn:1 },
    team2:{ startingLP:8000, startingDrawCount:opciones.roboInicial ?? 5, drawCountPerTurn:1 },
    cardReader: code => DB.get(code) ?? null,
    scriptReader,
    errorHandler: (t,txt)=>{ if(opciones.verErrores) console.log("[core]", String(txt)); },
  });
  if(!handle) throw new Error("createDuel devolvió null");
  for(const s of ["constant.lua","utility.lua"]) await lib.loadScript(handle, s, scriptReader(s));

  const poner = async (team, carta, location, sequence, position) =>
    lib.duelNewCard(handle, { team, duelist:0, code:codigo(carta), controller:team,
                              location, sequence, position });

  for(const [team, lado] of [[0,lado0],[1,lado1]]){
    (lado.monstruos ?? []).forEach(()=>{});
    let i=0;
    for(const m of (lado.monstruos ?? [])){
      const c = typeof m==="string" ? {carta:m} : m;
      await poner(team, c.carta, L.MZONE, c.zona ?? i, c.pos ?? P.FACEUP_ATTACK); i++;
    }
    i=0;
    for(const m of (lado.mt ?? [])){
      const c = typeof m==="string" ? {carta:m} : m;
      await poner(team, c.carta, L.SZONE, c.zona ?? i, c.pos ?? P.FACEDOWN_DEFENSE); i++;
    }
    for(const c of (lado.campo ?? []))      await poner(team, c, L.FZONE, 0, P.FACEUP_ATTACK);
    for(const c of (lado.mano  ?? []))      await poner(team, c, L.HAND, 0, P.FACEDOWN_DEFENSE);
    for(const c of (lado.gy    ?? []))      await poner(team, c, L.GRAVE, 0, P.FACEUP_ATTACK);
    for(const c of (lado.desterradas ?? []))await poner(team, c, L.REMOVED, 0, P.FACEUP_ATTACK);
    const deck = [...(lado.deck ?? [])];
    while(deck.length < (opciones.tamañoDeck ?? 20)) deck.push(RELLENO);
    for(const c of deck) await poner(team, c, L.DECK, 0, P.FACEDOWN_DEFENSE);
    for(const c of (lado.extra ?? []))      await poner(team, c, L.EXTRA, 0, P.FACEDOWN_DEFENSE);
  }
  await lib.startDuel(handle);
  return new Escenario(lib, handle, opciones);
}

const trivial = makeTrivialResolver(X);
const generico = makeAutoPlayer(X);

export class Escenario {
  constructor(lib, handle, opciones={}){
    this.lib=lib; this.handle=handle; this.op=opciones;
    this.mensajes=[]; this.turno=0; this.fase=0; this.turnPlayer=0;
    this.finished=false; this.ganador=null; this.motivo=null;
    this.lp={0:8000,1:8000};
  }
  /* Corre hasta que el guion diga "para", o hasta el límite de pasos.
     `guion(m, ctx)` devuelve una respuesta, o null para dejar que
     conteste el piloto genérico. Si devuelve "PARAR", se detiene. */
  async correr(guion, limite=4000){
    let intento=0, ultimo=null;
    for(let paso=0; paso<limite; paso++){
      this.pendiente = null;
      const estado = await this.lib.duelProcess(this.handle);
      for(const m of this.lib.duelGetMessage(this.handle)) this.registrar(m);
      if(estado === X.OcgProcessResult.END){ this.finished=true; return "fin"; }
      if(estado !== X.OcgProcessResult.WAITING) continue;
      const m = this.pendiente;
      if(!m) return "sin pregunta";
      if(m!==ultimo){ ultimo=m; intento=0; }
      let r = guion ? guion(m, this) : null;
      if(r === "PARAR") return "parado";
      if(!r) r = trivial(m) ?? generico(m, intento);
      intento++;
      this.lib.duelSetResponse(this.handle, r);
    }
    return "límite";
  }
  registrar(m){
    this.mensajes.push(m);
    switch(m.type){
      case T.NEW_TURN:  this.turnPlayer=m.player; this.turno++; break;
      case T.NEW_PHASE: this.fase=m.phase; break;
      case T.DAMAGE:    this.lp[m.player]=Math.max(0,this.lp[m.player]-m.amount); break;
      case T.RECOVER:   this.lp[m.player]+=m.amount; break;
      case T.LPUPDATE:  this.lp[m.player]=m.lp; break;
      case T.WIN:       this.finished=true; this.ganador=m.player; this.motivo=m.reason; break;
      default:
        if(this.esPregunta(m.type)) this.pendiente=m;
    }
  }
  esPregunta(t){
    return [T.SELECT_IDLECMD,T.SELECT_BATTLECMD,T.SELECT_CHAIN,T.SELECT_EFFECTYN,
            T.SELECT_YESNO,T.SELECT_OPTION,T.SELECT_CARD,T.SELECT_UNSELECT_CARD,
            T.SELECT_PLACE,T.SELECT_DISFIELD,T.SELECT_POSITION,T.SELECT_TRIBUTE,
            T.SELECT_SUM,T.SELECT_COUNTER,T.SORT_CARD,T.ANNOUNCE_RACE,
            T.ANNOUNCE_ATTRIB,T.ANNOUNCE_NUMBER,T.ANNOUNCE_CARD].includes(t);
  }
  /* ── consultas AL MOTOR (no a un espejo nuestro) ── */
  zona(jugador, location){
    const F = X.OcgQueryFlags;
    const cartas = this.lib.duelQueryLocation(this.handle,
      { flags: F.CODE|F.POSITION|F.ATTACK|F.DEFENSE, controller:jugador, location });
    return (cartas??[]).filter(Boolean).map(c=>({ code:c.code, nombre:nombre(c.code),
                                                  pos:c.position, atk:c.attack, def:c.defense }));
  }
  campo(j){ return this.zona(j, L.MZONE); }
  mt(j){ return this.zona(j, L.SZONE); }
  mano(j){ return this.zona(j, L.HAND); }
  gy(j){ return this.zona(j, L.GRAVE); }
  fzone(j){ return this.zona(j, L.FZONE); }
  hay(j, loc, nom){ return this.zona(j, loc).some(c=>c.nombre===nom); }
  tipos(t){ return this.mensajes.filter(m=>m.type===t); }
}
export { X, L, P, T };
