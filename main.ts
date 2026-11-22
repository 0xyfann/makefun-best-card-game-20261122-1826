// Emberfall Duel — make.fun entrypoint (Node 22, standard library only).
// SPDX-License-Identifier: MIT
//
// The entry hands the game in: it copies this repository's game/ and
// screenshots/ into the output directory and writes dossier.json there,
// using the kit's vendored library (vendor/makefun-game.ts, unchanged).
// The grader runs this file twice in a fresh container with no network;
// both runs must produce byte-identical output, so nothing here depends
// on the clock, on randomness, or on anything outside this directory.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The whole output tree is rebuilt from scratch on every run, so a
// stale file from an earlier run can never leak into the dossier.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Caps from the scorer's gate: at most 4 screenshots of 256 KiB each,
// game/ at most 993 files / 48 MiB, paths at most 1000 bytes. The text
// cap shapes how much of the source the dossier quotes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
