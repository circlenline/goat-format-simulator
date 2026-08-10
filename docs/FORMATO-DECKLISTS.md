# Cómo pasarme las decklists

## Formato preferido: `.ydk`

Es el formato universal de Yu-Gi-Oh (lo exportan EDOPro, YGOPro, DuelingBook,
YGOPRODeck y casi cualquier herramienta). Es texto plano con **passcodes**:

```
#created by ...
#main
55144522
79571449
73915051
73915051
#extra
63519819
!side
5318639
```

Reglas: una carta por línea, repetida tantas veces como copias. Las secciones
son `#main`, `#extra` y `!side`. Las líneas que empiezan por `#` se ignoran.

**Por qué este:** no hay ambigüedad de nombres, ni erratas, ni traducciones,
ni variantes de arte. El passcode identifica la carta sin margen de error.

## Alternativa: lista escrita a mano

Si copias una lista de un artículo o de un vídeo, también vale texto normal:

```
#main
3x Book of Moon
2 Scapegoat
Pot of Greed
Graceful Charity
#extra
3x Thousand-Eyes Restrict
!side
2x Dust Tornado
```

Acepta `3x Nombre`, `3 Nombre` o solo `Nombre` (una copia). Los nombres tienen
que ser los **oficiales en inglés**, que es como están en la base de datos.
Las que no reconozca te las lista en la consola del navegador para corregirlas.

## Cómo pasármelas

Deja los ficheros en una carpeta `mazos/` dentro de esta misma carpeta. Da igual
cuántos. Con eso puedo cargarlos en el simulador y asignárselos a la IA.

## Lo que aún me falta para que el pool sea exacto

El deck builder enseña ahora **toda** la base de datos (14.905 cartas), no solo
las legales en Goat. Para restringirlo necesito la lista oficial:

- Repo **ProjectIgnis/LFLists** en GitHub → *Code → Download ZIP*
- Dentro busca el `.lflist.conf` de Goat (abril 2005)

Ese fichero es a la vez el pool legal y los límites por carta, así que con él
el builder queda exacto: ni una carta de más, ni un límite inventado.
