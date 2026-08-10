// Empaqueta en un módulo JS las librerías Lua + los scripts de las cartas
// que necesite la lista de mazos. Sin esto habría que servir 53 MB de ficheros.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// la raíz del proyecto es la carpeta que contiene engine/
const RAIZ = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const S = path.join(RAIZ, "CardScripts-master", "CardScripts-master");
const DIRS=["","official","goat","pre-errata","pre-release"];
const find=b=>{ for(const d of DIRS){ const f=path.join(S,d,b); if(existsSync(f)) return f; } return null; };

const LIBS=["constant.lua","utility.lua","debug_utility.lua","chain.lua",
  "cards_specific_functions.lua","deprecated_functions.lua",
  "card_counter_constants.lua","archetype_setcode_constants.lua",
  ...readdirSync(S).filter(f=>f.startsWith("proc_"))];

const codes=JSON.parse(readFileSync(process.argv[2],"utf-8"));
const cardsRaw=JSON.parse(readFileSync(path.join(RAIZ,"engine","data","full_cards.json"),"utf-8"));
const bundle={}; let missing=[], viaAlias=0;
for(const name of LIBS){ const f=find(name); if(f) bundle[name]=readFileSync(f,"utf-8"); else missing.push(name); }
for(const code of new Set(codes)){
  const b=`c${code}.lua`;
  let f=find(b);
  if(!f){
    // Las variantes (arte alternativo, pre-errata) no llevan script propio:
    // heredan el de la carta a la que apuntan con "alias". Igual que hace EDOPro.
    const alias=cardsRaw[code]?.alias;
    if(alias){ f=find(`c${alias}.lua`); if(f) viaAlias++; }
  }
  if(f) bundle[b]=readFileSync(f,"utf-8"); else missing.push(b);
}
const js=`// Scripts Lua empaquetados (ProjectIgnis CardScripts, AGPL-3.0)
export const SCRIPTS = ${JSON.stringify(bundle)};
export function scriptReader(name){
  const b = name.split(/[\\\\/]/).pop();
  return SCRIPTS[b] ?? null;
}
`;
writeFileSync("./out/scripts.bundle.js", js);
console.log(`scripts.bundle.js: ${(js.length/1024).toFixed(0)} KB · ${Object.keys(bundle).length} archivos`);
console.log("  resueltos por alias:", viaAlias);
if(missing.length) console.log("  sin script (cartas normales sin efecto):", missing.length, missing.slice(0,6).join(" "));
