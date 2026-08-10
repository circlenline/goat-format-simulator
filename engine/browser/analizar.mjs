/* ════════════════════════════════════════════════════════════════
   ESCÁNER DE PARTIDAS

   Juega cientos de duelos entre bots y saca los números que hacen
   falta para ajustar la IA con datos en vez de a ojo:

     · quién gana, en cuántos turnos y con cuántos LP
     · ataques buenos, ataques suicidas y ataques directos
     · qué cartas se juegan, en qué turno y cuántas se quedan muertas
       en la mano al acabar
     · cuántas partidas se atascan (nadie avanza y se llega al límite)

   Uso:  node analizar.mjs [partidas] [nivelA] [nivelB]
         node analizar.mjs 200 experto duro
   ════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import * as X from "./out/ocgcore.bundle.js";
import { scriptReader } from "./out/scripts.bundle.js";
import { GoatDuel } from "./src/duel.mjs";
import { makeAutoPlayer } from "./src/autopilot.mjs";
import { makeTrivialResolver } from "./src/trivial.js";
import { crearCerebro, NIVELES } from "./src/ai/brain.js";

const raw   = JSON.parse(readFileSync("./out/cards.subset.json","utf-8"));
const names = JSON.parse(readFileSync("./out/names.subset.json","utf-8"));
const MAZOS = JSON.parse(readFileSync("../data/mazos.json","utf-8"));
const db = new Map();
for(const k in raw){ const c=raw[k]; db.set(c.code, {...c, race:BigInt(c.race)}); }
const trivial = makeTrivialResolver(X), generico = makeAutoPlayer(X);
const nm = c => names[c]?.name ?? ("#"+c);
const barajar = (a,r)=>{ const b=[...a];
  for(let i=b.length-1;i>0;i--){ const j=(r()*(i+1))|0; [b[i],b[j]]=[b[j],b[i]]; } return b; };
const rng = s => { let x=s>>>0; return ()=>{ x^=x<<13; x^=x>>>17; x^=x<<5;
                   return ((x>>>0)%100000)/100000; }; };

/* Un duelo completo, apuntando todo lo que pasa. */
async function partida(nivelA, nivelB, semilla, mazoA, mazoB, st){
  const lib  = await X.default({ sync:true });
  const duel = new GoatDuel({ lib, X, cardDb:db, scriptReader, onEvent:()=>{} });
  const r = rng(semilla);
  await duel.create({ deck0:barajar(mazoA.main,r), deck1:barajar(mazoB.main,r),
    extra0:mazoA.extra, extra1:mazoB.extra, seed:[BigInt(semilla),7n,13n,29n] });
  const cerebros = { 0:crearCerebro({X,duel,db,names,nivel:nivelA,yo:0}),
                     1:crearCerebro({X,duel,db,names,nivel:nivelB,yo:1}) };

  let ganador=null, turnos=0;
  const jugadas = [];            // {jugador, carta, turno, tipo}
  const orig = duel.emit.bind(duel);
  duel.emit = (t, d) => {
    if(t==="win")   ganador = d.player;
    if(t==="turn")  turnos = d.turn;
    if(t==="summon" && d.code){
      const c = duel.cards.get(d.uid);
      jugadas.push({ j:c?.controller ?? duel.turnPlayer, carta:nm(d.code),
                     turno:duel.turnCount, tipo:d.kind==="flip"?"volteo":"invoca" });
    }
    if(t==="chain" && d.code)
      jugadas.push({ j:d.controller, carta:nm(d.code), turno:duel.turnCount, tipo:"activa" });
    if(t==="battle" && d.atacante){
      const j = d.atacante.controller;
      st.ataques[j]++;
      if(!d.objetivo) st.directos[j]++;
      else {
        if(d.objetivo.muere) st.matan[j]++;
        if(d.atacante.muere) st.suicidas[j]++;
        if(!d.objetivo.muere && !d.atacante.muere) st.rebotan[j]++;
      }
    }
    orig(t,d);
  };

  for(let paso=0; paso<7000 && !duel.finished; paso++){
    const q = await duel.run();
    if(!q || duel.finished) break;
    let intento=0, resp=null;
    while(intento<8 && !resp){
      resp = trivial(q) ?? cerebros[q.player]?.(q,intento) ?? generico(q,intento);
      intento++;
    }
    if(!resp) break;
    duel.respond(resp);
  }
  const enMano = [0,1].map(j => (duel.zones[j][2]??[]).filter(Boolean).map(c=>nm(c.code)));
  return { ganador, turnos, lp:{0:duel.lp[0],1:duel.lp[1]}, jugadas, enMano,
           desyncs:duel.desyncs, atascada: !duel.finished };
}

/* ══════════ programa ══════════ */
const N = Number(process.argv[2] ?? 100);
const A = process.argv[3] ?? "experto";
const B = process.argv[4] ?? "duro";
if(!NIVELES.includes(A) || !NIVELES.includes(B)){
  console.log("niveles válidos:", NIVELES.join(", ")); process.exit(1);
}
const incluidos = MAZOS.filter(m=>!m.aviso && m.main.length>=40);

const st = { ataques:[0,0], directos:[0,0], matan:[0,0], suicidas:[0,0], rebotan:[0,0] };
const jugadasPorCarta = new Map();   // carta -> {veces, turnos:[], ganadas}
const muertasEnMano   = new Map();   // carta -> veces que se queda sin jugar
let ganaA=0, ganaB=0, tablas=0, turnosTot=0, atascadas=0, desyncs=0;
const t0 = Date.now();

for(let i=0;i<N;i++){
  const invertido = i%2===1;                       // se alternan los lados
  const mazo = incluidos[i % incluidos.length];    // mismo mazo los dos: mide la IA, no el mazo
  const r = await partida(invertido?B:A, invertido?A:B, 1000+i*7919, mazo, mazo, st);
  turnosTot += r.turnos; desyncs += r.desyncs;
  if(r.atascada) atascadas++;
  if(r.ganador===null) tablas++;
  else {
    const ladoA = invertido ? 1 : 0;
    (r.ganador===ladoA ? ganaA++ : ganaB++);
    for(const j of r.jugadas){
      const e = jugadasPorCarta.get(j.carta) ?? { veces:0, turnos:[], ganadas:0 };
      e.veces++; e.turnos.push(j.turno);
      if(j.j===r.ganador) e.ganadas++;
      jugadasPorCarta.set(j.carta, e);
    }
  }
  for(const lado of [0,1]) for(const c of r.enMano[lado])
    muertasEnMano.set(c, (muertasEnMano.get(c)??0)+1);
}

const media = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : 0;
const pct = (x,t) => t ? Math.round(x/t*100)+"%" : "—";
console.log(`═══ ${N} partidas · ${A} vs ${B} · ${((Date.now()-t0)/1000).toFixed(0)}s ═══\n`);
console.log(`resultado          ${A} ${ganaA} — ${ganaB} ${B}   (${pct(ganaA,ganaA+ganaB)} para ${A}`
          + `, tablas ${tablas})`);
console.log(`duración media     ${(turnosTot/N).toFixed(1)} turnos`
          + `   ·   partidas atascadas: ${atascadas}`);
console.log(`desincronizaciones ${desyncs} en total (${(desyncs/N).toFixed(1)} por partida)\n`);

console.log("── calidad de los ataques ──");
for(const [j,quien] of [[0,"lado 0"],[1,"lado 1"]]){
  const t=st.ataques[j];
  console.log(`  ${quien}: ${t} ataques · matan ${pct(st.matan[j],t)}`
    + ` · directos ${pct(st.directos[j],t)}`
    + ` · SUICIDAS ${pct(st.suicidas[j],t)}`
    + ` · sin efecto ${pct(st.rebotan[j],t)}`);
}

console.log("\n── cartas más jugadas (turno medio · % en partidas ganadas) ──");
[...jugadasPorCarta.entries()]
  .sort((a,b)=>b[1].veces-a[1].veces).slice(0,14)
  .forEach(([c,e])=>console.log(`  ${c.padEnd(42)} ${String(e.veces).padStart(4)} veces`
    + ` · turno ${media(e.turnos).toFixed(1).padStart(4)}`
    + ` · gana ${pct(e.ganadas,e.veces)}`));

console.log("\n── cartas que se quedan muertas en la mano ──");
[...muertasEnMano.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12)
  .forEach(([c,v])=>console.log(`  ${c.padEnd(42)} ${String(v).padStart(4)} veces`));
