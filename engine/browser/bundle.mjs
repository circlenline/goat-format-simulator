import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const RAIZ = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
// el dist del paquete compilado de ocgcore vive en engine/vendor
const D = path.join(RAIZ, "engine", "vendor", "dist") + "/";
const read=f=>readFileSync(D+f,"utf-8").replace(/\/\/# sourceMappingURL=.*\n?/g,"");
const exportsOf=s=>{const m=s.match(/export\{([^}]*)\}/);
  return m? m[1].split(",").map(p=>{const t=p.trim().split(/\s+/);
    return {local:t[0], ext:t[2]??t[0]};}) : [];};
const strip=s=>s.replace(/export\{[^}]*\}\s*;?\s*/g,"");

// Cada módulo va dentro de su propio ámbito (IIFE) para que no choquen
// los identificadores minificados, y devuelve sus exports como objeto.
function mod(file, imports={}){
  const src=read(file), ex=exportsOf(src);
  let body=strip(src).replace(/import"[^"]*";?/g,"");   // imports de solo efecto
  // resolver "import{x as y}from './chunk-*.js'"
  body=body.replace(/import\{([^}]*)\}from"([^"]*)";?/g,(_,spec,from)=>
    spec.split(",").map(p=>{const t=p.trim().split(/\s+/);
      const ext=t[0], local=t[2]??t[0];
      return `var ${local}=${imports[from]}.${ext};`;}).join(""));
  return `(()=>{${body}\nreturn {${ex.map(e=>`${e.ext}:${e.local}`).join(",")}};})()`;
}

const parts=[];
parts.push(`const __cL=${mod("chunk-L5TW24SS.js")};`);
parts.push(`const __c6=${mod("chunk-6GYI7QPM.js")};`);
const imp={"./chunk-L5TW24SS.js":"__cL","./chunk-6GYI7QPM.js":"__c6"};
parts.push(`const __wasm=${mod("ocgcore.sync-ORIXRHXI.js",imp)}.default;`);
parts.push(`const __glue=${mod("ocgcore.sync-MMMSWPBB.js",imp)}.default;`);

let index=read("index.js")
 .replace(/import"[^"]*";?/g,"")
 .replace(/async function (\w+)\(\)\{return\(await import\("\.\/ocgcore\.sync-MMMSWPBB\.js"\)\)\.default\}/,"async function $1(){return __glue}")
 .replace(/async function (\w+)\(\)\{return\(await import\("\.\/ocgcore\.sync-ORIXRHXI\.js"\)\)\.default\.buffer\}/,"async function $1(){return __wasm.buffer}")
 .replace(/async function (\w+)\(\)\{return\(await import\("\.\/ocgcore\.jspi-[^"]*"\)\)\.default(\.buffer)?\}/g,
          "async function $1(){throw new Error('bundle sync: JSPI no incluido')}");

const out=`// ocgcore-wasm 0.1.2 — bundle autocontenido, wasm incrustado en base64.
// Núcleo de ProjectIgnis / EDOPro (AGPL-3.0). Empaquetado por n1xx1 (MIT).
${parts.join("\n")}
${index}
`;
writeFileSync("./ocgcore.bundle.js",out);
console.log("ocgcore.bundle.js:",(out.length/1024/1024).toFixed(2),"MB");
