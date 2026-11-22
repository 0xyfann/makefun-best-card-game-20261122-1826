# makefun-best-card-game-20261122-1826

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/0xyfann/makefun-best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/0xyfann/makefun-best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Emberfall Duel** — an original turn-based card battler. You duel the Ashen Warden with a 24-card deck across four elements: Ember, Tide, Thorn and Stone. Each card has a mana cost, a power value and an effect (damage, shield, heal, drain, draw, or shield-piercing). Play two cards of one element in a turn to trigger a Resonance bonus (+2). Mana grows each turn; reduce the Warden to 0 life before it does the same to you.

## Run it

```sh
node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` into the output directory (`MAKEFUN_OUTPUT_DIR`, or `/output` in the grader) and writes `dossier.json` there.

To play the game itself, serve `game/` with any static server and open `index.html` in desktop Chrome — it loads nothing over the network:

```sh
python3 -m http.server 8080 --directory game
```

Play with mouse or keyboard: click a card (or press 1–7) to play it, Space ends your turn, R starts a new duel, M mutes the sound.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0xyfann&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
