/* ══════════════════════════════════════════════════════════════════
   VISTA LEGAL DEL BOT — juega limpio.

   La IA corre en el mismo proceso que tú, así que técnicamente podría
   leerte la mano. Este módulo es la frontera: recorta el estado a lo
   que un jugador honesto ve desde su silla. Si algún día quieres un
   bot tramposo, se cambia aquí y en ningún otro sitio.
   ══════════════════════════════════════════════════════════════════ */
const L = { DECK:1, HAND:2, MZONE:4, SZONE:8, GRAVE:16, REMOVED:32, EXTRA:64 };
const bocaAbajo = p => !!(p & 0x0a);

export function vistaDe(duel, yo, db, names){
  const rival = 1-yo;
  const carta = (c, oculta) => c && ({
    uid:c.uid, code: oculta ? null : c.code,
    nombre: oculta ? null : (names[c.code]?.name ?? null),
    datos: oculta ? null : db.get(c.code) ?? null,
    pos:c.position, bocaAbajo:bocaAbajo(c.position),
    defensa: !!(c.position & 0x0c), mia: c.controller===yo,
    sec:c.sequence,
  });
  const lista = (p, loc, oculta=false) =>
    (duel.zones[p][loc] ?? []).filter(Boolean).map(c=>carta(c,oculta));
  const campo = (p, loc) => (duel.zones[p][loc] ?? [])
    .map(c => c ? carta(c, bocaAbajo(c.position) && c.controller!==yo) : null);

  return {
    yo, rival,
    lp: { mio: duel.lp[yo], rival: duel.lp[rival] },
    turnoMio: duel.turnPlayer===yo,
    turno: duel.turnCount,
    fase: duel.phase,
    mano:        lista(yo, L.HAND),
    manoRival:   { cuantas: (duel.zones[rival][L.HAND]??[]).length },  // solo el número
    monstruos:   campo(yo, L.MZONE).filter(Boolean),
    monstruosRival: campo(rival, L.MZONE).filter(Boolean),
    backrow:     campo(yo, L.SZONE).filter(Boolean),
    backrowRival:campo(rival, L.SZONE).filter(Boolean),
    // el backrow tapado del rival: sabemos que existe, no qué es
    tapadasRival: (duel.zones[rival][L.SZONE]??[]).filter(c=>c&&bocaAbajo(c.position)).length,
    cementerio:      lista(yo, L.GRAVE),
    cementerioRival: lista(rival, L.GRAVE),
    desterradas:      lista(yo, L.REMOVED),
    desterradasRival: lista(rival, L.REMOVED),
    extra: lista(yo, L.EXTRA),
    deckRestante: (duel.zones[yo][L.DECK]??[]).length,
  };
}
