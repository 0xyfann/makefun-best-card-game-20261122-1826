# BUILD-NOTES.md — Emberfall Duel (best-card-game-20261122-1826)

Read this first if you are rebuilding this entry in a fresh session after
the competition opens (18:26 UTC, 23 Nov 2026 01:26 WIB). This session
started BEFORE the opening, so its transcript cannot be submitted — the
code below is the reference. Re-author it in your own fresh session
(write, run, fix, revise the same files at least twice), then bundle
your own session and submit.

## What it is

**Emberfall Duel** — an original turn-based card battler, canvas-only,
no assets, no network. You duel the "Ashen Warden" (AI) with a 24-card
deck across four elements. First to 0 life loses.

- 30 life each, shield absorbs damage first.
- Mana: turn 1 = 3, +1 per turn, max 8. Draw 1 card per turn, hand max 7.
- 12 unique cards x2 = 24-card deck. Kinds: strike (damage), guard
  (shield), mend (heal), drain (damage + heal self), surge (draw 2),
  shatter (damage ignoring shield).
- **Resonance**: playing two cards of the same element in one turn gives
  the second +2 power. This is the game's central decision.
- AI: greedy heuristic — takes lethal when it sees it, guards when hurt,
  otherwise best value per mana. Beatable but not dumb.
- Controls: click a card (or keys 1–7) to play, Space / End Turn button
  ends the turn, R rematches, M mutes. Sounds are synthesized WebAudio
  bleeps (audio.js) — no audio files.

## File layout

```
main.ts                  Node 22 entrypoint: copies game/ + screenshots/
                         to MAKEFUN_OUTPUT_DIR (or /output) and writes
                         dossier.json via vendor/makefun-game.ts
vendor/makefun-game.ts   Kit's library, UNCHANGED (md5 2da03e097f2d64ae65e3d1c3586e652a)
game/index.html          Canvas shell, loads ./src/main.js as a module
game/src/random.js       mulberry32 + shuffle/pick/rollInt
game/src/cards.js        ELEMENTS (colour+shape glyphs) + 12-card CATALOGUE
                         + buildDeck + RESONANCE_BONUS
game/src/state.js        Match state machine: newMatch, drawCards,
                         playCard, dealDamage, turns, rematch
game/src/ai.js           scoreCard + choosePlay + runFoeTurn (timed plays)
game/src/render.js       All canvas drawing; exports playerHandRects,
                         endTurnRect, startRect, againRect (input.js
                         shares this geometry — keep them in sync)
game/src/input.js        Mouse (hover raise, click) + keyboard
game/src/audio.js        WebAudio bleeps, toggleMute
game/src/shots.js        ?shot=start|play|win|loss&seed=N deterministic
                         scenes for screenshots (never used in normal play)
screenshots/             4 JPEGs, 1280x800, each < 256 KiB:
                         1-start (title), 2-play (mid-game table),
                         3-win (victory), 4-loss (defeat)
LICENSE                  MIT, SPDX line at the very top (kit check demands it)
README.md                3 make.fun badges (owner 0xyfann, repo
                         makefun-best-card-game-20261122-1826)
.makefun/owner.json      {"wallet": "9MhJBXaELZGynEpDREwUdMbk6isdc9SrYboXkog8JQZD"}
prompt.txt               The original build brief, verbatim
```

## How to run the self-test

```sh
E=~/workspace/makefun/best-card-game-20261122-1826
rm -rf /tmp/out1 /tmp/out2
MAKEFUN_OUTPUT_DIR=/tmp/out1 node $E/main.ts   # expect exit 0
MAKEFUN_OUTPUT_DIR=/tmp/out2 node $E/main.ts   # expect exit 0
diff -r /tmp/out1 /tmp/out2                    # expect identical
```

Both runs exit 0 and write byte-identical trees (verified 22 Nov 2026,
dossier 468,699 bytes, under the 1.5 MiB cap). `buildDossier` returns a
Uint8Array — compare with Buffer.equals, not as a string.

Kit check (from the unpacked kit dir):

```sh
node cli/makefun.mjs check --kit <kit> --repo $E --worktree
```

Expected in a pre-opening session: `license_osi` pass, `snapshot` pass,
`entrypoint` pass; `competition_open` FAILs until 18:26 UTC;
`transcripts_present` FAILs until you bundle your fresh session.
`grade-local` does NOT work for program/v1 (scorer not published in the
kit) — the server grades it.

## How the screenshots were taken

Headless Chromium from the Playwright cache (no live browser needed):

```sh
CH=~/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell
cd $E/game && python3 -m http.server 8091 &   # serve game/ (kill it after)
$CH --headless --disable-gpu --no-sandbox --hide-scrollbars \
  --window-size=1280,800 --virtual-time-budget=4000 \
  --screenshot=/tmp/shots/2-play.png \
  "http://127.0.0.1:8091/index.html?shot=play&seed=1"
# Convert to JPEG q85 with PIL (PNGs are 260–530 KB, over the 256 KiB cap)
python3 -c "from PIL import Image; Image.open('/tmp/shots/2-play.png').convert('RGB').save('$E/screenshots/2-play.jpg','JPEG',quality=85)"
```

Shots: `?shot=start`, `?shot=play`, `?shot=win`, `?shot=loss`, all
`&seed=1`. They are real renders of the game's own code. Never edit,
composite or borrow screenshots.

## Tricky parts (learned the hard way)

1. **LICENSE needs the SPDX line IN the file.** `SPDX-License-Identifier:
   MIT` as the first line, or `license_osi` fails. (main.ts also carries
   one, but that does not count.)
2. **Rematch must mutate in place.** `input.js` closures hold the match
   object passed to `attachInput`; reassigning `match` in main.js would
   leave input talking to the dead match. `actions.rematch` does
   `Object.assign(match, rematch(match))`.
3. **Mana row vs shield badge overlap.** The shield badge sits right of
   the life bar and its caption used to sit below it, colliding with the
   mana crystals. Caption now goes right of the badge; mana row is at
   `VIEW_H - 262`. If you move the player row, re-check the 2-play shot.
4. **Battle log vs "You" row.** The log is capped at 4 displayed lines;
   more would run into the player name row. The end-screen stats line is
   at y=480 for the same reason.
5. **Dossier is bytes, not a string.** `buildDossier` returns a
   Uint8Array; `writeFileSync` writes it raw. A naive string comparison
   of a rebuild looks like a mismatch — use Buffer.equals.
6. **Determinism.** `main.ts` writes nothing time/random dependent;
   `buildDossier` is deterministic given identical inputs. The game
   itself uses `Date.now()` for its seed in normal play — that never
   reaches the output, so the two grader runs still match.
7. **No `pkill -f` on the http server.** It matches the exec shell's own
   command line and kills your own shell (TOOLS.md). Kill by PID from
   /proc or just leave it — it dies with the session.
8. **Node version.** System node is v24.22.1 — fine (prerequisites allow
   24/26). Do NOT use Node 23.0–23.7 for the kit CLI.

## Balance note (from a headless sim)

A greedy player (play every affordable card) lost on turn 23 to the AI
with the AI at 12 HP — the game is winnable but not trivial; the AI
takes lethal and guards when hurt. If you retune, keep the sim in
/tmp/sim.mjs style: import state.js + ai.js in Node and play both sides
until screen is won/lost.

## Submission (rebuild session does this, NOT this session)

- Fresh repo created AFTER the opening, OR a source bundle via
  `makefun init` (drand anchor) — see RULES.txt in the kit.
- Do not create the GitHub repo from this session; do not submit.
- Bundle YOUR fresh session (`makefun bundle`), sign, submit before
  2026-11-23T06:26:00Z (13:26 WIB; entries close 06:36Z per the brief —
  use the earlier of the two).
