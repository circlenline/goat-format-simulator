# Contributing

Bug reports are the most useful thing you can send. The game has a
**Download log** button in the top bar: it writes a text file with the
seed, both shuffled decks and every message the rules engine produced,
with timestamps. Attach it to the issue and the exact duel can be
replayed. Without it, a report is guesswork.

Good issue:

> Thousand-Eyes Restrict absorbed my face-down monster and then attacked
> with 0 ATK. Log attached, turn 12.

If you want to work on the code, `engine/browser/` is where everything
lives and `README.md` explains the layout. Two rules of the house:

1. **The two HTML files are generated.** Never edit `goat-simulador.html`
   or `deckbuilder.html` by hand — edit the sources under `engine/` and
   run `engine/rebuild.sh`.
2. **Every fix comes with a check.** The suite runs the real HTML against
   a DOM stub (`node check-*.mjs`). Every check in there exists because a
   bug got through without it.

For anything about the AI, measure before and after: `torneo.mjs` with at
least 250 games per pairing, or `duelo-versiones.mjs` against the previous
brain. At 60 games the noise is ±13 points and it will tell you whatever
you want to hear.

## People

- **[circlenline](https://github.com/circlenline)** — design, play-testing, bug hunting
- **Claude (Anthropic)** — most of the implementation, test suite and tooling
