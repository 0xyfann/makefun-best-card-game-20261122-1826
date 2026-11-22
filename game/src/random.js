// random.js — small seeded RNG (mulberry32) plus deck helpers.
// The game seeds from Date.now() in normal play; screenshot scenes pass
// an explicit seed so renders are reproducible. Nothing here touches the
// DOM, so state.js / ai.js can import it in Node for headless sims.

// mulberry32: a tiny, fast, good-enough PRNG for a card game.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle, in place, driven by the given rng.
export function shuffle(deck, rng) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

// Pick a random element of an array (or undefined when empty).
export function pick(arr, rng) {
  if (!arr.length) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

// Inclusive integer in [min, max].
export function rollInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
