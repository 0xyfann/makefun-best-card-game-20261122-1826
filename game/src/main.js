// main.js — wires Emberfall Duel together: canvas, match, renderer,
// input, audio and the AI. Loaded as an ES module from index.html.
// No network, no assets: everything the game needs is in this folder.

import { newMatch, endTurn } from './state.js';
import { render, VIEW_W, VIEW_H } from './render.js';
import { attachInput } from './input.js';
import { audio } from './audio.js';
import { runFoeTurn } from './ai.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');

// Normal play seeds from the clock; a ?shot= scene passes its own seed.
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || Date.now() % 2147483647);
const match = newMatch(seed);
applyShot(match, params);

let lastPhase = match.phase;

function repaint() {
  render(ctx, match, ui);
  // Play the end-of-duel sting once, when the phase flips.
  if (match.phase !== lastPhase) {
    if (match.phase === 'won') audio.play('win');
    if (match.phase === 'lost') audio.play('lose');
    lastPhase = match.phase;
  }
}

function kickFoeTurn() {
  if (match.phase !== 'playing' || match.active !== 'foe') return;
  runFoeTurn(match, () => {
    repaint();
  });
}

const ui = attachInput(canvas, match, audio, {
  onChange: repaint,
  onPlayCard: () => {},
  onFoeTurnStart: kickFoeTurn,
});

// Keep painting: the "last played" flash and the hover raise are both
// time-sensitive, so a plain rAF loop is simpler than dirty tracking.
function loop() {
  repaint();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// If a shot scene starts on the foe's turn (it does not today, but keep
// the invariant), the AI would still move.
if (match.phase === 'playing' && match.active === 'foe') kickFoeTurn();
