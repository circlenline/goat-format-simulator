/* Valoración del estado: cuánto de bien va la partida para el bot. */
import { conocer } from "./knowledge.js";

export const atk = c => c?.datos?.attack ?? 0;
export const def = c => c?.datos?.defense ?? 0;
// Lo que aporta un monstruo defendiendo o atacando
export const poder = c => c?.defensa ? def(c) : atk(c);

export function valorCarta(c){
  if(!c?.nombre) return 1.0;                    // desconocida: valor medio
  return conocer(c.nombre, c.datos).valor ?? 1.0;
}
export function rolDe(c){
  if(!c?.nombre) return "desconocido";
  return conocer(c.nombre, c.datos).rol;
}
export function infoDe(c){
  if(!c?.nombre) return {};
  return conocer(c.nombre, c.datos);
}

/* Ventaja de cartas: la métrica que decide las partidas de Goat. */
export function ventaja(v){
  const mias  = v.mano.length + v.monstruos.length + v.backrow.length;
  const suyas = v.manoRival.cuantas + v.monstruosRival.length + v.backrowRival.length;
  return mias - suyas;
}

/* Presión en el campo, contando solo lo que se puede ver. */
export function presion(v){
  const mio   = v.monstruos.reduce((s,c)=>s+poder(c),0);
  const suyo  = v.monstruosRival.reduce((s,c)=>s + (c.bocaAbajo?1200:poder(c)),0);
  return (mio - suyo)/1000;
}

export function evaluar(v){
  return ventaja(v)*3.0 + presion(v)*1.2 + (v.lp.mio - v.lp.rival)/2500;
}

/* ¿Puedo matar a este monstruo en combate sin perder el mío? */
export function ganaCombate(atacante, defensor){
  if(defensor.bocaAbajo) return atk(atacante) > 1600;   // apuesta razonable
  return defensor.defensa ? atk(atacante) > def(defensor)
                          : atk(atacante) > atk(defensor);
}
export function muereAtacando(atacante, defensor){
  if(defensor.bocaAbajo) return false;
  return !defensor.defensa && atk(defensor) >= atk(atacante);
}
