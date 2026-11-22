// cards.js — the four elements, the 12-card catalogue, deck building,
// and the Resonance rule. Every card is plain data; state.js owns the
// rules for playing one. Keep this file free of DOM / canvas code so the
// catalogue can be imported by a headless simulator in Node.

export const RESONANCE_BONUS = 2;
// A resonating Surge draws one extra card instead of +2 (drawing 4 would
// swing the game too hard); every other kind takes the flat +2 power.
export const RESONANCE_SURGE_DRAW = 1;

export const ELEMENTS = {
  ember: {
    name: 'Ember',
    // Warm red-orange. The card frame and the mana pips use this.
    color: '#e85d3d',
    dark: '#8a2a12',
    // Glyph shape drawn on the card: 'triangle' (flame).
    glyph: 'triangle',
  },
  tide: {
    name: 'Tide',
    color: '#3d8fe8',
    dark: '#144a7a',
    glyph: 'circle',
  },
  thorn: {
    name: 'Thorn',
    color: '#46a85e',
    dark: '#1d5c2e',
    glyph: 'diamond',
  },
  stone: {
    name: 'Stone',
    color: '#9a8f80',
    dark: '#4d453c',
    glyph: 'square',
  },
};

// kind: strike = damage; guard = shield; mend = heal; drain = damage +
// heal self; surge = draw cards; shatter = damage that ignores shield.
// power is the base number the kind uses (damage / shield / heal / draws).
export const CATALOGUE = [
  { id: 'ember-spark', name: 'Ember Spark', element: 'ember', kind: 'strike', cost: 1, power: 3, text: 'Deal 3 damage.' },
  { id: 'cinder-burst', name: 'Cinder Burst', element: 'ember', kind: 'strike', cost: 3, power: 6, text: 'Deal 6 damage.' },
  { id: 'ashen-drain', name: 'Ashen Drain', element: 'ember', kind: 'drain', cost: 2, power: 3, text: 'Deal 3 damage. Heal 3.' },
  { id: 'tidecall', name: 'Tidecall', element: 'tide', kind: 'surge', cost: 2, power: 2, text: 'Draw 2 cards.' },
  { id: 'wave-slam', name: 'Wave Slam', element: 'tide', kind: 'strike', cost: 2, power: 4, text: 'Deal 4 damage.' },
  { id: 'still-waters', name: 'Still Waters', element: 'tide', kind: 'mend', cost: 2, power: 5, text: 'Restore 5 life.' },
  { id: 'thorn-volley', name: 'Thorn Volley', element: 'thorn', kind: 'strike', cost: 2, power: 5, text: 'Deal 5 damage.' },
  { id: 'bark-ward', name: 'Bark Ward', element: 'thorn', kind: 'guard', cost: 2, power: 6, text: 'Gain 6 shield.' },
  { id: 'bloom', name: 'Bloom', element: 'thorn', kind: 'mend', cost: 1, power: 3, text: 'Restore 3 life.' },
  { id: 'stonewall', name: 'Stonewall', element: 'stone', kind: 'guard', cost: 1, power: 4, text: 'Gain 4 shield.' },
  { id: 'shatterstone', name: 'Shatterstone', element: 'stone', kind: 'shatter', cost: 3, power: 5, text: 'Deal 5 damage, ignoring shield.' },
  { id: 'quake', name: 'Quake', element: 'stone', kind: 'strike', cost: 4, power: 8, text: 'Deal 8 damage.' },
];

export function cardById(id) {
  return CATALOGUE.find((c) => c.id === id);
}

// A fresh 24-card deck: two copies of each catalogue card, shuffled.
// Cards are copied by value so a match never mutates the catalogue.
export function buildDeck(rng) {
  const deck = [];
  for (const card of CATALOGUE) {
    deck.push({ ...card });
    deck.push({ ...card });
  }
  // Shuffle with the match rng.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

// Effective power of a card when played, after the Resonance bonus.
// `alreadyPlayed` is true when the same element was already played
// this turn by the same side.
export function effectivePower(card, alreadyPlayed) {
  if (!alreadyPlayed) return card.power;
  if (card.kind === 'surge') return card.power + RESONANCE_SURGE_DRAW;
  return card.power + RESONANCE_BONUS;
}
