# Goat Format Simulator

A playable Yu-Gi-Oh! **Goat Format** (April 2005) simulator that runs in a single
HTML file. No install, no account, no server — download it, double-click it, play.

**[▶ Play in your browser](https://circlenline.github.io/goat-format-simulator/)**

The rules are not hand-written. The simulator runs **ocgcore**, the same rules
engine EDOPro uses, compiled to WebAssembly and started in `MODE_GOAT`, so 2005
rulings — SEGOC, the six damage-step timings, ignition priority, attack replays,
one Field Spell for both players — behave the way they did back then.

> The point of this project: playing Goat online today means Dueling Book, where
> every ruling is manual and both players have to agree on what happened. Here the
> engine resolves everything, like a real client, and you can play against bots.

---

## What's in it

| | |
|---|---|
| **Full rules engine** | ocgcore (Project Ignis / EDOPro) in `MODE_GOAT`, WebAssembly |
| **Card pool** | the 1,685 cards legal in Goat Format, checked against the official Project Ignis banlist |
| **Decks** | 20 tournament decks included (Goat Control, Chaos Turbo, Warrior, Zombie, Burn, Horus, Phoenix…) |
| **Deck builder** | search, copy limits, YDK import/export, decks saved in your browser |
| **Bots** | four difficulties, with the difference **measured**, not guessed (see below) |
| **Bot Mode** | every deck × every difficulty, with medals for the ones you beat |
| **Languages** | English and Spanish |
| **Mobile** | works in a phone browser, landscape |

Everything is inside the HTML file: the wasm engine, 1,364 Lua card scripts, the
card database, the decks and the avatars. The only thing fetched from the network
is the card artwork (from ygoprodeck). Without a connection the game still works —
cards show a fallback tile with name, ATK/DEF and level.

---

## How to play

1. Download `goat-simulador.html` and `deckbuilder.html` into the same folder.
2. Open `goat-simulador.html` with your browser.
3. **VS Duel** to pick your deck, the opponent deck and the difficulty, or
   **Bot Mode** to work through every deck at every difficulty.

**Controls**

- **Drag** a card from your hand onto the board to play it. It stays where you
  dropped it while you choose Summon / Set / Activate; cancel and it flies back.
- **Click** a monster to declare an attack, or to activate an effect (cards with
  an available effect are marked with ✦).
- Click the Graveyard, Banished or Extra Deck piles to look through them.
- The panel on the right tells you what the game is asking and **in which phase** —
  including whether a chain window is at attack declaration or inside the Damage Step,
  which is not the same thing.
- **Download log** produces a text file with the seed, the shuffled decks and every
  engine message. If you find a bug, attach it: it is what makes bugs reproducible.

On a phone: landscape, and tap **⛶** for fullscreen (the browser bars eat a third
of the screen otherwise).

---

## The bots

Four levels, and the difference between them is **measured, not asserted**. A
tournament of 250 games per pairing (`node torneo.mjs 250`), with the same decks on
both sides so the deck is not the variable:

| | vs Rookie | vs Normal | vs Tough |
|---|---|---|---|
| **Expert** | 81% | 80% | 66% |
| **Tough** | 80% | 71% | — |
| **Normal** | 67% | — | — |

There is **one** brain that plays as well as it can. The lower levels are the same
brain with specific, measurable flaws — the way chess engines are weakened:

| Flaw | What it does | Worth (win rate of the clean brain against it) |
|---|---|---|
| `sinCadenas` | never responds during your turn | 63% |
| `cadenaTonta` | responds, but with whatever it has | 57% |
| `objetivoTonto` | picks attack targets at random | 49% |
| `combateTonto` | attacks without doing the math | 51% |
| `malaSeleccion` | discards and searches at random | 49% |
| `error` | plays a worse move on purpose, x% of the time | 48–56% |

Those numbers come from `medir-lastres.mjs`, 250 games per flaw against the clean
brain. They are also the reason the ladder is built the way it is: only the flaws
that actually cost games are used to separate the levels. An earlier version had
four "intelligences" that all played the same — measuring is what found that out.

The bots are **heuristic**, not search-based: ocgcore cannot clone or serialise a
duel, so there is no forward simulation, no MCTS. Master Duel's AI works the same way.

---

## How it is built

```
ocgcore (wasm)  →  duel.mjs (adapter)  →  generic events  →  view.js (interface)
                                                          →  ai/brain.js (bots)
```

The adapter is the important piece. It translates ocgcore's messages into generic
events — `move`, `summon`, `chain`, `attack`, `damage`, `phase` — and **the visual
layer never mentions ocgcore once**. Write another adapter that emits the same
events and the whole interface works for a different card game.

```
engine/
  rebuild.sh              rebuilds everything and runs the checks
  data/                   card database, legal pool, copy limits, decks, avatars
  browser/
    src/duel.mjs          THE ADAPTER
    src/view.js           board, animations, dragging
    src/main.js           orchestrator: menus, decisions, log
    src/i18n.js           English / Spanish
    src/ai/               knowledge.js · view.js · evaluar.js · brain.js
    build-html.mjs        assembles the single-file HTML
    check-*.mjs           the test suite
    analizar.mjs          scans hundreds of games and reports statistics
    medir-lastres.mjs     measures what each bot flaw is worth
    torneo.mjs            level vs level tournaments
    escenario.mjs         builds an exact board state to test rulings
  deckbuilder/            the deck builder app
  vendor/                 ocgcore-wasm 0.1.2
```

### Building

```bash
cd engine && ./rebuild.sh
```

or by hand, from `engine/browser/`:

```bash
node build-scripts.mjs ../data/goat-pool.json   # bundles the 1,364 Lua scripts
node build-html.mjs                             # produces out/goat.html
```

Rebuilding the Lua bundle needs a copy of
[CardScripts](https://github.com/ProjectIgnis/CardScripts) next to the project;
the bundled output is committed so you do not need it just to rebuild the HTML.

### Testing

There is no browser in CI, so the suite runs the **real HTML** against a small DOM
stub. Every check exists because a bug got through without it.

```bash
node jugar.mjs          # plays a game as a human would: the most important one
node check-dom.mjs      # the elements exist in the real HTML, no orphan ids
node check-sync.mjs     # our state mirror matches the engine (6 games)
node check-reglas.mjs   # the 2005 rule switches are on, and behave
node check-cartas.mjs   # 17 rulings on 10 specific cards
node torneo.mjs 250     # the difficulty ladder is still a ladder
```

`escenario.mjs` is worth a special mention: it builds any board state you want —
specific cards in play, in hand, in the graveyard — drives the duel with a script
and asks **the engine** what happened, not our copy of the state. It is how
Thousand-Eyes Restrict, Trap Dustshoot and Magician of Faith got settled.

---

## Known limits

- **No forward search.** ocgcore cannot serialise a duel, so the AI is heuristic.
- **Card art is fetched from ygoprodeck** by passcode. Offline you get fallback tiles.
- **No multiplayer.** This is a single-player client against bots.
- About 10% of bot-vs-bot games reach the 60-turn cap: Goat mirrors grind.

## Licence

The rules engine (**ocgcore**) and the **CardScripts** are AGPL-3.0, so this project
is AGPL-3.0 too — see [LICENSE](LICENSE). Card names, text and artwork are
Konami's; nothing here is sold and no assets are redistributed beyond the card
database needed to run the engine.

## Credits

Built by **[circlenline](https://github.com/circlenline)** and **Claude**
(Anthropic), pair-programming: the design decisions, the play-testing and every
bug report came from the human side; most of the code, the test suite and the
measurement tooling were written by the model. The commit history reflects that —
commits carry a `Co-Authored-By: Claude` trailer.

- [Project Ignis](https://github.com/ProjectIgnis) — ocgcore, CardScripts, the Goat banlist
- [ocgcore-wasm](https://github.com/kevinlul/ocgcore-wasm) — the WebAssembly build
- [goatformat.com](https://www.goatformat.com/) — the historical rules reference
- Card images from [ygoprodeck](https://ygoprodeck.com/)
