// input.js — mouse + keyboard for Emberfall Duel. Hit-testing reuses
// the rects render.js exports, so a layout change never silently breaks
// clicking. The input layer never mutates the match except through
// state.js (playCard / endTurn / rematch / startDuel).
//
// Callbacks (all optional):
//   onChange()        — repaint after any state change
//   onPlayCard(ok)    — a card was (or was not) played
//   onEndTurn()       — the turn ended
//   onFoeTurnStart()  — the foe's turn began (main.js kicks the AI)

import { playerHandRects, endTurnRect, startRect, againRect } from './render.js';
import { playCard, endTurn, rematch, startDuel } from './state.js';

function inside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function attachInput(canvas, match, audio, hooks = {}) {
  const ui = { hoverIndex: -1 };
  const emit = (name, arg) => {
    if (typeof hooks[name] === 'function') hooks[name](arg);
  };

  function canvasPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function tryPlay(index) {
    if (match.phase !== 'playing' || match.active !== 'player') return;
    const result = playCard(match, 'player', index);
    if (result.ok) {
      audio.play('play');
      emit('onPlayCard', result);
    } else if (result.reason === 'not-enough-mana') {
      audio.play('deny');
    }
    emit('onChange');
  }

  function tryEndTurn() {
    if (match.phase !== 'playing' || match.active !== 'player') return;
    if (endTurn(match)) {
      audio.play('end');
      emit('onChange');
      emit('onFoeTurnStart');
    }
  }

  function tryStart() {
    if (match.phase !== 'title') return;
    startDuel(match);
    audio.unlock();
    audio.play('start');
    emit('onChange');
  }

  function tryAgain() {
    if (match.phase !== 'won' && match.phase !== 'lost') return;
    rematch(match);
    audio.play('start');
    emit('onChange');
  }

  canvas.addEventListener('mousemove', (event) => {
    const { x, y } = canvasPos(event);
    let hover = -1;
    if (match.phase === 'playing') {
      for (const rect of playerHandRects(match)) {
        // The hovered card is raised 16px; accept the raised area too.
        const raised = { ...rect, y: rect.y - 16 };
        if (inside(raised, x, y)) hover = rect.index;
      }
    }
    if (hover !== ui.hoverIndex) {
      ui.hoverIndex = hover;
      canvas.style.cursor = hover >= 0 ? 'pointer' : 'default';
      emit('onChange');
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (ui.hoverIndex !== -1) {
      ui.hoverIndex = -1;
      emit('onChange');
    }
  });

  canvas.addEventListener('click', (event) => {
    const { x, y } = canvasPos(event);
    if (match.phase === 'title') {
      if (inside(startRect, x, y)) tryStart();
      return;
    }
    if (match.phase === 'won' || match.phase === 'lost') {
      if (inside(againRect, x, y)) tryAgain();
      return;
    }
    // Playing: end-turn button first, then the hand.
    if (inside(endTurnRect, x, y)) {
      tryEndTurn();
      return;
    }
    for (const rect of playerHandRects(match)) {
      const raised = { ...rect, y: rect.y - 16 };
      if (inside(raised, x, y)) {
        tryPlay(rect.index);
        return;
      }
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key;
    if (key >= '1' && key <= '7') {
      tryPlay(Number(key) - 1);
      return;
    }
    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      if (match.phase === 'title') tryStart();
      else if (match.phase === 'won' || match.phase === 'lost') tryAgain();
      else tryEndTurn();
      return;
    }
    if (key === 'r' || key === 'R') {
      if (match.phase === 'won' || match.phase === 'lost') tryAgain();
      else if (match.phase === 'playing') {
        rematch(match);
        emit('onChange');
      }
      return;
    }
    if (key === 'm' || key === 'M') {
      audio.toggleMute();
      emit('onChange');
    }
  });

  return ui;
}
