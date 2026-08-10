import { readFileSync, writeFileSync, existsSync } from "node:fs";
const R=f=>readFileSync(f,"utf-8");
import path from "node:path";
import { fileURLToPath } from "node:url";
const RAIZ = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const W = path.join(RAIZ, "engine", "data") + "/";
// Pool oficial de Goat si está disponible; si no, vacío (todas las cartas)
/* El pool vive en engine/data; la copia de la raíz es solo comodidad
   para E. Si se busca solo en la raíz, un clon del repo compila el
   deck builder con TODA la base en vez de con las 1.685 legales. */
const poolPath = [path.join(W,"goat-pool.json"), path.join(RAIZ,"goat-pool.json")]
                   .find(p=>existsSync(p)) ?? "";
const pool = poolPath ? R(poolPath) : "[]";
// Límites del banlist de Goat (abril 2005). Sin la lista oficial, solo
// los que son de conocimiento común en el formato.
const limitesPath = [path.join(W,"goat-limites.json"), path.join(RAIZ,"goat-limites.json")]
                      .find(p=>existsSync(p));
const limites = limitesPath ? R(limitesPath)
  : JSON.stringify({
      55144522:1, 79571449:1, 44763025:1, 45986603:1, 70828912:1, 19613556:1,
      5318639:1, 71044499:1, 83555666:1, 53582587:1, 44095762:1, 41420027:1,
      97077563:1, 8131171:1, 26202165:1, 72989439:1, 34853266:1, 33184167:1,
      73915051:2, 46411259:3, 14087893:3, 31560081:1, 9596126:1, 63519819:1,
      72892473:1, 67169062:1, 1248895:1
    });
/* La misma capa de idiomas que el simulador, para no tener dos tablas. */
const stripExports = t => t.replace(/^export\s+(const|function|class|let)/gm,"$1")
                           .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm,"");
const html = R("./plantilla.html")
  .replace("/*__I18N__*/", ()=>stripExports(R("../browser/src/i18n.js")))
  .replace("/*__CSS__*/", ()=>R("./estilo.css"))
  .replace("/*__CARDS__*/", ()=>R(W+"pool_cards.json"))
  .replace("/*__TEXTS__*/", ()=>R(W+"pool_texts.json"))
  .replace("/*__POOL__*/", ()=>pool)
  .replace("/*__LIMITES__*/", ()=>limites)
  .replace("/*__APP__*/", ()=>R("./app.js"));
writeFileSync("./deckbuilder.html", html);
console.log("deckbuilder.html:", (html.length/1024/1024).toFixed(2), "MB");
console.log("pool:", pool==="[]" ? "provisional (toda la base)" : JSON.parse(pool).length+" cartas");
