# Para publicar en Reddit

Dónde: **r/yugioh** (grande, pero hay interés en formatos antiguos) y sobre
todo **r/goatformat** — es pequeño pero es exactamente el público. También
vale r/yugioh101 y el Discord de Goat Format. Publica primero en el
pequeño: si allí gusta, llegas al grande con comentarios ya puestos.

Cuándo: entre semana, por la mañana en horario de EEUU (16:00-18:00 hora
peninsular) es cuando más se lee.

Título — el que mejor funciona dice qué es y qué lo diferencia:

> **I built a Goat Format simulator that runs the actual EDOPro rules engine — single HTML file, plays in your browser, with bots**

Alternativas:

> Goat Format vs bots, in one HTML file — real ocgcore rules, no install, no account
> I got tired of manual rulings on Dueling Book, so I put ocgcore in a browser tab

---

## Cuerpo del post

Copia esto tal cual y cambia la URL. Está en inglés a propósito.

---

I play Goat Format and the only real option online is Dueling Book, where
every ruling is manual. If you and your opponent disagree about SEGOC or a
damage-step timing, you argue about it. And if nobody is online, you don't
play at all.

So I built this: **a Goat Format simulator in a single HTML file**. You
download it, double-click it, and you're playing. No install, no account,
no server.

**[link to the GitHub Pages URL]**

The important part: **I didn't write the rules.** It runs
[ocgcore](https://github.com/ProjectIgnis) — the same engine EDOPro uses —
compiled to WebAssembly and started in `MODE_GOAT`. So SEGOC, ignition
priority, the six damage-step timings, attack replays, one Field Spell for
both players, 0 ATK vs 0 ATK destroying both — all of it resolves the way
it did in 2005, because it's the actual engine, not my interpretation of
the rules.

What's in it:

- The 1,685 cards legal in the format, checked against the Project Ignis banlist
- 20 tournament decks included (Goat Control, Chaos Turbo, Warrior, Zombie, Burn, Horus…)
- A deck builder with copy limits and YDK import/export
- Four bot difficulties, and a Bot Mode where you work through every deck at
  every difficulty with medals for the ones you beat
- English and Spanish
- Works on a phone in landscape

About the bots, because I think this is the part people will poke at: there
is one brain, and the lower levels are that brain with specific flaws —
"never responds during your turn", "picks attack targets at random", "plays
a worse move 35% of the time". I measured what each flaw is worth over 250
games instead of guessing, because my first attempt had four difficulties
that all played identically and I only found out by running the numbers.
Expert beats Tough 66% of the time, Tough beats Normal 71%, Normal beats
Rookie 67%.

They're heuristic bots, not search: ocgcore can't serialise a duel, so
there's no forward simulation. They will not out-play a good human. They
will punish a sloppy one.

It's AGPL-3.0 (ocgcore and the card scripts are), source is in the repo.
Card art is pulled from ygoprodeck; offline you get fallback tiles with
name and ATK/DEF and the game still works.

**What I'd like from you:** play a couple of games and tell me what's
wrong. There's a "Download log" button that dumps the seed, the shuffled
decks and every engine message — if a ruling looks off or something breaks,
attach that file and I can reproduce it exactly.

---

## Cómo responder en los comentarios

- **"¿Por qué no EDOPro?"** — EDOPro es mejor cliente y no compite con esto.
  La diferencia es que aquí abres un archivo y estás jugando, sin instalar
  nada, y en el móvil. Y trae bots, que EDOPro no tiene para Goat.
- **"¿Es legal?"** — El motor y los scripts son AGPL y el código está
  publicado bajo la misma licencia. Las imágenes de carta son de Konami y
  se cargan de ygoprodeck, no se redistribuyen.
- **"La IA hace jugadas malas"** — Sí, es heurística y no simula hacia
  delante; el motor no permite clonar un duelo. Pide el log y apúntalo.
- **"¿Multijugador?"** — No, todavía. Si hay interés, es lo siguiente.
- Cuando alguien reporte un bug, **pídele siempre el log descargado**. Sin
  él es media hora adivinando; con él es reproducible.
