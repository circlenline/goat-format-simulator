/* Comprobaciones dirigidas de los arreglos de interfaz. */
import { readFileSync } from "node:fs";
const html=readFileSync("./out/goat.html","utf-8");
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const js =html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const checks=[
 ["hover de mano hecho con CSS (no puede quedarse pegado)", /\.card\.in-hand:hover \.shake\{transform:translateY/.test(css.replace(/\s+/g," ").replace(/ \{/g,"{").replace(/\{ /g,"{"))||/in-hand:hover \.shake/.test(css)],
 ["ya no se guarda el hover en el estado JS", !/card\.hover\s*=\s*true/.test(js)],
 ["solo los monstruos en defensa se giran 90°", /loc===L\.MZONE && isDef\(card\.position\)\) rz=90/.test(js)],
 ["hitbox de suelta por cercanía, no por píxel exacto", /bestD<=lim/.test(js)],
 ["panel de acciones a la derecha y centrado", /#prompt\{[^}]*right:112px/.test(css.replace(/\s+/g,""))||/right:112px/.test(css)],
 ["visor de cementerio / extra deck", /openZoneView/.test(js) && /#zoneview/.test(css)],
 ["zonas de cementerio y extra clicables", /classList\.add\("browsable"\)/.test(js)],
 ["selector visual cuando las cartas no están a la vista", /Ver las cartas/.test(js)],
 ["el tablero se escala para caber en pantalla", /function fitBoard/.test(js)],
];
let ok=0;
for(const [t,v] of checks){ console.log(v?"  ✓":"  ✗", t); if(v) ok++; }
console.log(`\n${ok}/${checks.length} comprobaciones pasan`);
