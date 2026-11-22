// shots.js — deterministic scenes for the screenshots. The game reads
// ?shot=start|play|win|loss&seed=N from the URL; this module bends a
// fresh match into the matching state. Never used in normal play — a
// plain visit with no query string just shows the title screen.
//
// Every scene is built from the same seeded RNG, so the same seed always
// renders the same table. Screenshots are real renders of the game's own
// code, never edited or composited.

import { newMatch, startDuel, playCard, endTurn, dealDamage } from './state.js';
import { cardById } from './cards.js';

function setHand(side, ids) {
  side.hand = ids.map((id) => ({ ...cardById(id) }));
  // Remove those copies from the deck so counts stay honest.
  for (const id of ids) {
    const idx = side.deck.findIndex((c) => c.id === id);
    if (idx >= 0) side.deck.splice(idx, 1);
  }
}

// Move cards from the deck to the discard pile (for scenes whose log
// already mentions played cards — keeps Deck/Discard counts honest).
function toDiscard(side, ids) {
  for (const id of ids) {
    const idx = side.deck.findIndex((c) => c.id === id);
    if (idx >= 0) side.discard.push(side.deck.splice(idx, 1)[0]);
  }
}

// A fixed, readable mid-game hand for the play shot.
const PLAY_HAND = [
  'ember-spark',
  'cinder-burst',
  'wave-slam',
  'bark-ward',
  'tidecall',
  'ashen-drain',
  'stonewall',
];

export function applyShot(match, params) {
  const shot = params.get('shot');
  if (!shot) return match;
  const seed = Number(params.get('seed') || '1');

  if (shot === 'start') {
    // Title screen: a fresh match, untouched.
    return match;
  }

  if (shot === 'play') {
    startDuel(match);
    // A mid-game table: some damage taken, some shield up, a full hand,
    // a few log lines, and it is the player's turn with mana to spend.
    match.foe.life = 21;
    match.foe.shield = 4;
    match.player.life = 24;
    match.player.shield = 3;
    match.player.mana = 5;
    match.player.maxMana = 5;
    match.round = 3;
    setHand(match.player, PLAY_HAND);
    setHand(match.foe, ['ember-spark', 'wave-slam', 'stonewall', 'bloom']);
    match.foe.mana = 4;
    match.foe.maxMana = 4;
    // The log mentions these plays, so they belong in the discards.
    toDiscard(match.player, ['ember-spark', 'wave-slam']);
    toDiscard(match.foe, ['stonewall']);
    match.log.push('The duel begins. Your move — play a card or end the turn.');
    match.log.push('You played Ember Spark — You hit Warden for 3.');
    match.log.push('Warden played Stonewall — Warden gained 4 shield.');
    match.log.push('You played Wave Slam — You hit Warden for 4.');
    return match;
  }

  if (shot === 'win') {
    startDuel(match);
    match.phase = 'won';
    match.foe.life = 0;
    match.player.life = 11;
    match.player.shield = 2;
    match.round = 7;
    match.turnsPlayed = 13;
    setHand(match.player, ['ember-spark', 'bloom', 'stonewall']);
    toDiscard(match.player, ['cinder-burst', 'ember-spark', 'wave-slam', 'ashen-drain', 'bark-ward', 'tidecall', 'stonewall']);
    toDiscard(match.foe, ['quake', 'thorn-volley', 'ember-spark', 'wave-slam', 'stonewall', 'bloom']);
    match.log.push('You played Cinder Burst (Resonance +2!) — You hit Warden for 8.');
    match.log.push('The Ashen Warden crumbles. Victory!');
    return match;
  }

  if (shot === 'loss') {
    startDuel(match);
    match.phase = 'lost';
    match.player.life = 0;
    match.foe.life = 14;
    match.foe.shield = 5;
    match.round = 8;
    match.turnsPlayed = 15;
    setHand(match.player, ['tidecall', 'bloom']);
    toDiscard(match.player, ['ember-spark', 'wave-slam', 'bark-ward', 'stonewall', 'bloom', 'ashen-drain', 'tidecall']);
    toDiscard(match.foe, ['quake', 'cinder-burst', 'thorn-volley', 'wave-slam', 'ember-spark', 'stonewall', 'shatterstone', 'bloom']);
    match.log.push('Warden played Quake — Warden hit You for 8.');
    match.log.push('Your ember fades. The Warden stands.');
    return match;
  }

  return match;
}

// Convenience: build a match straight into a shot scene.
export function matchForShot(shot, seed) {
  const match = newMatch(seed);
  return applyShot(match, new URLSearchParams(`shot=${shot}&seed=${seed}`));
}
