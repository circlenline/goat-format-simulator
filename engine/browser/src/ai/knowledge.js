/* ══════════════════════════════════════════════════════════════════
   CONOCIMIENTO DE CARTAS — indexado por NOMBRE, no por passcode.

   Clave del diseño: añadir un mazo nuevo debe ser añadir filas aquí,
   nunca escribir código. WindBot, la IA de EDOPro, hace lo contrario
   (un "executor" programado por mazo) y por eso solo juega bien los
   mazos que alguien programó a mano. Con 20+ mazos por delante, esto
   tiene que ser una tabla.
   ══════════════════════════════════════════════════════════════════ */

// El nombre canónico ignora las variantes: "Scapegoat (GOAT)" → "Scapegoat"
export const canon = n => String(n||"").replace(/\s*\((GOAT|Pre-errata|Anime)\)\s*$/i,"").trim();

/* rol: para qué sirve · valor: cuánto duele perderla (en "cartas")
   cuando: política de uso · notas: por qué (para el log de la IA) */
export const CARTAS = {
  // ── Motores de ventaja ──────────────────────────────────────────
  "Pot of Greed":        { rol:"draw", valor:2.0, cuando:"siempre" },
  "Graceful Charity":    { rol:"draw", valor:2.0, cuando:"conDescarteBueno",
                           nota:"Guardarla hasta tener Sinister Serpent u otro descarte gratis" },
  "Delinquent Duo":      { rol:"handRip", valor:1.8, cuando:"sinSerpentRival",
                           nota:"Si el rival tiene Sinister Serpent en mano, se neutraliza" },
  "Card Destruction":    { rol:"draw", valor:1.2, cuando:"conManoMala" },

  // ── Remoción puntual ────────────────────────────────────────────
  "Smashing Ground":     { rol:"removal", valor:1.0, cuando:"siHayAmenaza" },
  "Nobleman of Crossout":{ rol:"removal", valor:1.2, cuando:"contraBocaAbajo",
                           nota:"Solo contra monstruos colocados; desterrar mata a los flip" },
  "Ring of Destruction": { rol:"removal", valor:1.6, cuando:"amenazaGrande", rapida:true,
                           nota:"No es remoción normal: guardarla para lo gordo o para rematar" },
  "Exiled Force":        { rol:"removal", valor:1.0, cuando:"siHayAmenaza" },
  "Tribe-Infecting Virus":{ rol:"removal", valor:1.2, cuando:"conDescarteBarato" },
  "Chaos Sorcerer":      { rol:"removal", valor:1.6, cuando:"siHayAmenaza", noAtacaTrasEfecto:true },
  "D.D. Warrior Lady":   { rol:"trade", valor:1.0 },
  "Sakuretsu Armor":     { rol:"trapRemoval", valor:0.9, reactiva:true },
  "Mirror Force":        { rol:"trapMass", valor:1.6, reactiva:true },
  "Torrential Tribute":  { rol:"trapMass", valor:1.6, reactiva:true,
                           nota:"Castiga al que invoca tras haber gastado remoción" },
  "Solemn Judgment":     { rol:"counter", valor:1.4, reactiva:true, costeLP:0.5 },

  // ── Remoción masiva y de magias ─────────────────────────────────
  "Heavy Storm":         { rol:"massRemoval", valor:1.8, cuando:"jugadaDePoder",
                           nota:"Solo cuando prepara una jugada fuerte, no para limpiar por limpiar" },
  "Mystical Space Typhoon":{ rol:"spellRemoval", valor:1.0, cuando:"contraEquipoOReanimacion",
                           rapida:true,
                           nota:"Guardarla para Snatch Steal, Premature Burial o Call of the Haunted" },
  "Dust Tornado":        { rol:"spellRemoval", valor:1.0, reactiva:true },

  // ── Control y tempo ─────────────────────────────────────────────
  "Scapegoat":           { rol:"stall", valor:1.2, rapida:true, restringeInvocacion:true,
                           nota:"No usarla en tu turno: bloquea tu invocación. Encadenar en End Phase rival" },
  "Book of Moon":        { rol:"trick", valor:1.1, rapida:true,
                           nota:"Corta ataques, apaga efectos y prepara Nobleman" },
  "Tsukuyomi":           { rol:"trick", valor:1.4,
                           nota:"Reutiliza tus flip y desactiva monstruos rivales" },
  "Thousand-Eyes Restrict":{ rol:"lock", valor:2.0, cuando:"conObjetivoBueno",
                           nota:"Sin un monstruo rival fuerte que absorber, no compensa" },
  "Metamorphosis":       { rol:"fusion", valor:1.4, cuando:"conObjetivoBueno" },

  // ── Reanimación y robo ──────────────────────────────────────────
  "Premature Burial":    { rol:"revival", valor:1.3, costeLP:800, vulnerable:true },
  "Call of the Haunted": { rol:"revival", valor:1.3, vulnerable:true,
                           nota:"Mejor de forma agresiva; en defensa el rival la responde" },
  "Snatch Steal":        { rol:"equipSteal", valor:1.6, vulnerable:true },

  // ── Monstruos con función ───────────────────────────────────────
  "Sinister Serpent":    { rol:"recurso", valor:1.5, noColocar:true,
                           nota:"Vale más en la mano: protege de Delinquent Duo y alimenta descartes" },
  "Sangan":              { rol:"floater", valor:1.2, noColocar:true,
                           nota:"Colocado muere a Nobleman; se usa atacando" },
  "Mystic Tomato":       { rol:"floater", valor:1.1 },
  "Magician of Faith":   { rol:"flip", valor:1.4, colocarPreferente:true },
  "Dekoichi the Battlechanted Locomotive":{ rol:"flip", valor:1.2, colocarPreferente:true },
  "Night Assailant":     { rol:"flip", valor:1.1, colocarPreferente:true },
  "Asura Priest":        { rol:"beater", valor:1.3, atacaTodos:true },
  "Airknight Parshath":  { rol:"beater", valor:1.6, perfora:true, robaAlGolpear:true },
  "Breaker the Magical Warrior":{ rol:"beater", valor:1.4, rompeBackrow:true },
  "Black Luster Soldier - Envoy of the Beginning":{ rol:"bomba", valor:2.2 },
};

/* Cuando una carta no está en la tabla, se deduce del propio dato de
   carta. Así el motor de IA nunca se queda mudo con un mazo nuevo. */
export function conocer(nombre, datos){
  const k = CARTAS[canon(nombre)];
  if(k) return k;
  const t = datos?.type ?? 0;
  if(t & 0x1){        // monstruo
    const atk = datos.attack ?? 0;
    return { rol: atk>=1900 ? "beater" : atk>=1500 ? "beater" : "chatarra",
             valor: atk>=2400 ? 1.6 : atk>=1700 ? 1.1 : 0.8, deducido:true };
  }
  if(t & 0x4) return { rol:"trapRemoval", valor:1.0, reactiva:true, deducido:true };
  if(t & 0x2) return { rol:"spell", valor:1.0, deducido:true };
  return { rol:"desconocido", valor:1.0, deducido:true };
}
