# Cómo publicar esto en GitHub

Paso a paso, sin dar nada por sabido. Al final tienes una URL que
cualquiera abre en el móvil o en el PC, sin descargar nada.

---

## 1. Prepara la carpeta

Ya está hecha: `publicar/` tiene exactamente lo que hay que subir y nada
más. Los repos descargados de BabelCDB y CardScripts, los logs y las
copias de `versiones/` se quedan fuera a propósito — pesan y no hacen
falta para jugar ni para reconstruir el HTML.

## 2. Crea el repositorio

1. Entra en <https://github.com/new>.
2. **Repository name**: `goat-format-simulator` (o el que quieras; se verá
   en la URL).
3. **Public**.
4. **No** marques "Add a README" ni ".gitignore" ni "license": ya vienen
   en la carpeta.
5. Botón verde **Create repository**.

## 3. Sube los archivos

La forma sin línea de comandos, que para esto vale igual:

1. En la página del repo recién creado, pulsa **uploading an existing file**.
2. Arrastra **todo el contenido** de `publicar/` a la ventana del navegador
   (los archivos sueltos y las carpetas; GitHub acepta carpetas arrastradas
   desde el explorador).
3. Espera a que suba — son unos 16 MB, tarda un minuto.
4. Abajo, en **Commit changes**, escribe `Primera versión` y pulsa
   **Commit changes**.

Si prefieres la consola y tienes git instalado:

```bash
cd publicar
git init
git add .
git commit -m "Primera version"
git branch -M main
git remote add origin https://github.com/circlenline/goat-format-simulator.git
git push -u origin main
```

## 4. Enciende GitHub Pages

1. En el repo: pestaña **Settings** (arriba a la derecha).
2. Menú de la izquierda: **Pages**.
3. En **Source** elige **Deploy from a branch**.
4. **Branch**: `main`, carpeta `/ (root)`. **Save**.
5. Espera un par de minutos y recarga: arriba saldrá
   `Your site is live at https://TU-USUARIO.github.io/goat-format-simulator/`.

Esa URL abre el simulador directamente, porque `index.html` redirige al
juego. **Ese es el enlace que pegas en Reddit.**

## 5. Retoques que se notan

- **La URL del README ya está puesta** (`circlenline`). Si le pones al
  repositorio otro nombre que no sea `goat-format-simulator`, cámbiala.
- **Descripción y topics**: en la portada del repo, engranaje junto a
  "About". Descripción corta en inglés y topics `yugioh`, `goat-format`,
  `tcg`, `webassembly`, `ocgcore`.
- **Release para descargar**: pestaña **Releases** → **Create a new
  release** → tag `v1.0` → arrastra `goat-simulador.html` y
  `deckbuilder.html` como binarios. Así quien quiera jugar sin conexión
  se los baja sueltos.

## 6. Capturas que hacen falta

Sácalas tú desde el juego —yo no puedo— y déjalas en `docs/img/` con
estos nombres. Luego se referencian en el README.

| Archivo | Qué tiene que salir |
|---|---|
| `img/tablero.png` | Un duelo a media partida, con monstruos en los dos campos, alguna trampa tapada y la mano visible. Es la imagen que decide si alguien entra o no: que se vea bonita. |
| `img/panel-fase.png` | El panel de decisión durante una cadena en el Damage Step, para que se vea la línea de fase. Sirve para explicar por qué esto no es Dueling Book. |
| `img/modo-bots.png` | La pantalla de Modo Bots con alguna medalla ya ganada. |
| `img/deckbuilder.png` | El deck builder con un mazo cargado y el buscador con algo escrito. |
| `img/movil.jpg` | Foto o captura del móvil en horizontal, en mitad de un duelo. |

Recomendación: en 1920×1080, ventana maximizada y sin la barra de
marcadores del navegador. Para el móvil, con el juego en pantalla
completa.

Cuando las tengas, se añaden al README con:

```markdown
![Board](docs/img/tablero.png)
```
