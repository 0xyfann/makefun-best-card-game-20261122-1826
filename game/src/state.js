// state.js — the match state machine. Pure logic, no DOM, no canvas:
// newMatch / drawCards / playCard / dealDamage / endTurn / rematch.
// The renderer and the AI both read this shape; the input layer only
// calls playCard / endTurn / rematch, never mutates state directly.

import { buildDeck, effectivePower, RESONANCE_BONUS } from './cards.js';
import { mulberry32 } from './random.js';

export const MAX_LIFE = 30;
export const HAND_LIMIT = 7;
export const MAX_MANA = 8;
export const START_HAND = 3;

// Mana on round r (1-based): 3, 4, 5, 6, 7, 8, 8, ...
export function manaForRound(round) {
  return Math.min(2 + round, MAX_MANA);
}

function makeSide(rng) {
  return {
    life: MAX_LIFE,
    maxLife: MAX_LIFE,
    shield: 0,
    mana: manaForRound(1),
    maxMana: manaForRound(1),
    deck: buildDeck(rng),
    hand: [],
    discard: [],
    // Elements this side has played on its current turn (for Resonance).
    playedElements: [],
  };
}

export function newMatch(seed) {
  const rng = mulberry32(seed >>> 0);
  const match = {
    seed: seed >>> 0,
    rng,
    round: 1,
    // 'title' | 'playing' | 'won' | 'lost'
    phase: 'title',
    // Whose turn it is while playing: 'player' | 'foe'.
    active: 'player',
    player: makeSide(rng),
    foe: makeSide(rng),
    // Battle log, newest last; the renderer shows the last 4.
    log: [],
    // Last played card, for the little "played" flash in the renderer.
    lastPlay: null,
    // Turn counter used by the stats line on the end screens.
    turnsPlayed: 0,
  };
  drawCards(match.player, START_HAND);
  drawCards(match.foe, START_HAND);
  return match;
}

export function drawCards(side, n) {
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (side.deck.length === 0) break;
    if (side.hand.length >= HAND_LIMIT) break; // extra cards are lost
    side.hand.push(side.deck.shift());
    drawn++;
  }
  return drawn;
}

function logLine(match, text) {
  match.log.push(text);
  if (match.log.length > 40) match.log.splice(0, match.log.length - 40);
}

export function otherSide(match, who) {
  return who === 'player' ? match.foe : match.player;
}

// Damage first eats shield, then life. Returns the life damage dealt.
export function dealDamage(match, target, amount, ignoreShield = false) {
  let left = amount;
  if (!ignoreShield && target.shield > 0) {
    const absorbed = Math.min(target.shield, left);
    target.shield -= absorbed;
    left -= absorbed;
  }
  if (left > 0) target.life = Math.max(0, target.life - left);
  return left;
}

function healSide(side, amount) {
  side.life = Math.min(side.maxLife, side.life + amount);
}

function addShield(side, amount) {
  side.shield += amount;
}

// Apply one card's effect. `power` is the (possibly resonated) value.
// Returns a short log fragment describing what happened.
function applyEffect(match, who, card, power) {
  const me = who === 'player' ? match.player : match.foe;
  const them = otherSide(match, who);
  const whoName = who === 'player' ? 'You' : 'Warden';
  const themName = who === 'player' ? 'Warden' : 'You';
  switch (card.kind) {
    case 'strike': {
      const blocked = Math.min(them.shield, power);
      const dealt = dealDamage(match, them, power, false);
      const note = blocked > 0 ? ` (${blocked} blocked by shield)` : '';
      return `${whoName} hit ${themName} for ${power}${note}.`;
    }
    case 'shatter': {
      const dealt = dealDamage(match, them, power, true);
      return `${whoName} shattered ${themName} for ${power} (through shield).`;
    }
    case 'guard': {
      addShield(me, power);
      return `${whoName} gained ${power} shield.`;
    }
    case 'mend': {
      const before = me.life;
      healSide(me, power);
      return `${whoName} healed ${me.life - before}.`;
    }
    case 'drain': {
      const blocked = Math.min(them.shield, power);
      const dealt = dealDamage(match, them, power, false);
      const before = me.life;
      healSide(me, power);
      const note = blocked > 0 ? ` (${blocked} blocked by shield)` : '';
      return `${whoName} drained ${power}${note} and healed ${me.life - before}.`;
    }
    case 'surge': {
      const drawn = drawCards(me, power);
      return `${whoName} drew ${drawn}.`;
    }
    default:
      return `${whoName} played ${card.name}.`;
  }
}

// Play the card at handIndex for `who`. Returns { ok, reason?, card? }.
// On success the card leaves the hand and the effect is applied.
export function playCard(match, who, handIndex) {
  if (match.phase !== 'playing') return { ok: false, reason: 'not-playing' };
  if (match.active !== who) return { ok: false, reason: 'not-your-turn' };
  const me = who === 'player' ? match.player : match.foe;
  const card = me.hand[handIndex];
  if (!card) return { ok: false, reason: 'no-card' };
  if (card.cost > me.mana) return { ok: false, reason: 'not-enough-mana' };

  const resonated = me.playedElements.includes(card.element);
  const power = effectivePower(card, resonated);
  me.mana -= card.cost;
  me.hand.splice(handIndex, 1);
  me.discard.push(card);
  if (!resonated) me.playedElements.push(card.element);

  const line = applyEffect(match, who, card, power);
  const res = resonated ? ' (Resonance +2!)' : '';
  logLine(match, `${card.name}${res} — ${line}`);
  match.lastPlay = { who, card, power, resonated, at: Date.now() };
  match.turnsPlayed += 0; // turns are counted on endTurn, not per card
  checkEnd(match);
  return { ok: true, card, power, resonated };
}

function checkEnd(match) {
  if (match.phase !== 'playing') return;
  if (match.foe.life <= 0) {
    match.phase = 'won';
    logLine(match, 'The Ashen Warden crumbles. Victory!');
  } else if (match.player.life <= 0) {
    match.phase = 'lost';
    logLine(match, 'Your ember fades. The Warden stands.');
  }
}

// End `who`'s turn and start the other side's turn. Draws a card for
// the incoming side, refills their mana for the new round, and clears
// their Resonance tracker.
export function endTurn(match) {
  if (match.phase !== 'playing') return false;
  const next = match.active === 'player' ? 'foe' : 'player';
  const incoming = next === 'player' ? match.player : match.foe;
  if (next === 'player') match.round += 1;
  const mana = manaForRound(match.round);
  incoming.maxMana = mana;
  incoming.mana = mana;
  incoming.playedElements = [];
  drawCards(incoming, 1);
  match.active = next;
  match.turnsPlayed += 1;
  return true;
}

// Start a duel from the title screen.
export function startDuel(match) {
  if (match.phase !== 'title') return;
  match.phase = 'playing';
  logLine(match, 'The duel begins. Your move — play a card or end the turn.');
}

// Reset the match in place. Callers (input.js) hold a reference to the
// match object, so we must NOT replace it — mutate it instead.
export function rematch(match) {
  const fresh = newMatch((match.seed + 1) >>> 0);
  // Keep the same object identity; wipe and refill every field.
  for (const key of Object.keys(match)) delete match[key];
  Object.assign(match, fresh);
  match.phase = 'playing';
  logLine(match, 'A new duel begins. Your move.');
  return match;
}
