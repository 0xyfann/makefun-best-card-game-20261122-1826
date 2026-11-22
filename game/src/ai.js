// ai.js — the Ashen Warden. A greedy heuristic, not a search: it takes
// lethal when it sees it, guards or heals when it is hurt, and otherwise
// plays the best value per mana. Beatable, but it punishes a player who
// leaves it at low life with mana open.
//
// The AI only ever calls the same public functions a human would
// (playCard / endTurn), so it cannot cheat on mana or hand size.

import { effectivePower } from './cards.js';
import { playCard, endTurn } from './state.js';

// How much one point of each effect is worth when scoring a card.
const VALUE = { damage: 1.0, shield: 0.85, heal: 0.9, draw: 2.2 };

// Score one card in the current position. Higher is better; a lethal
// card scores far above everything else.
export function scoreCard(match, card, resonated) {
  const me = match.foe;
  const them = match.player;
  const power = effectivePower(card, resonated);

  // Lethal: this card ends the duel right now.
  if (card.kind === 'strike' || card.kind === 'drain' || card.kind === 'shatter') {
    const through = card.kind === 'shatter' ? power : Math.max(0, power - them.shield);
    if (through >= them.life) return 1000 + power;
  }

  let value = 0;
  switch (card.kind) {
    case 'strike':
      value = power * VALUE.damage;
      break;
    case 'shatter': {
      // Worth more when the player is hiding behind shield.
      const pierce = Math.min(power, them.shield);
      value = power * VALUE.damage + pierce * 0.4;
      break;
    }
    case 'drain':
      value = power * VALUE.damage + Math.min(power, me.maxLife - me.life) * VALUE.heal;
      break;
    case 'guard':
      value = power * VALUE.shield;
      break;
    case 'mend':
      value = Math.min(power, me.maxLife - me.life) * VALUE.heal;
      break;
    case 'surge':
      value = power * VALUE.draw;
      break;
    default:
      value = power;
  }

  // Hurt (10 life or less): defence is worth much more.
  if (me.life <= 10 && (card.kind === 'guard' || card.kind === 'mend')) value *= 1.8;
  // Almost dead: healing that does not save us is worthless.
  if (me.life <= 4 && card.kind === 'mend' && power < 4) value *= 0.4;
  // A full hand makes drawing pointless.
  if (card.kind === 'surge' && me.hand.length >= 6) value *= 0.3;
  // Resonance makes a card punch above its cost.
  if (resonated) value += 1.5;

  // Value per mana, with a small nudge for cheap cards (tempo).
  return value / Math.max(1, card.cost) + (card.cost <= 1 ? 0.15 : 0);
}

// Pick the best playable card index in the foe's hand, or -1.
export function choosePlay(match) {
  const me = match.foe;
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < me.hand.length; i++) {
    const card = me.hand[i];
    if (card.cost > me.mana) continue;
    const resonated = me.playedElements.includes(card.element);
    const score = scoreCard(match, card, resonated);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

// Play the foe's whole turn with a beat between plays so the human can
// follow it. `onStep` is called after every play and at the end, so the
// renderer can repaint. Returns a stop function.
export function runFoeTurn(match, onStep) {
  let stopped = false;
  const step = () => {
    if (stopped) return;
    if (match.phase !== 'playing' || match.active !== 'foe') {
      onStep('done');
      return;
    }
    const idx = choosePlay(match);
    if (idx < 0) {
      // Nothing worth playing: end the turn.
      endTurn(match);
      onStep('done');
      return;
    }
    playCard(match, 'foe', idx);
    onStep('played');
    setTimeout(step, 650);
  };
  setTimeout(step, 700);
  return () => {
    stopped = true;
  };
}
