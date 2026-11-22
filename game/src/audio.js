// audio.js — synthesized WebAudio bleeps. No audio files, no network:
// every sound is an oscillator + a gain envelope. The context is created
// lazily on the first user gesture (browsers block audio before that),
// so unlock() is called from the first click / keypress.

let ctx = null;
let muted = false;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
  const ac = ensureCtx();
  if (!ac || muted) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const SOUNDS = {
  // Card played: a short bright blip.
  play: () => tone(660, 0.12, 'triangle', 0.12),
  // Not enough mana: a low dull thud.
  deny: () => tone(140, 0.15, 'square', 0.07),
  // End turn: two descending notes.
  end: () => {
    tone(520, 0.1, 'triangle', 0.1);
    tone(392, 0.14, 'triangle', 0.1, 0.09);
  },
  // Duel starts: a rising pair.
  start: () => {
    tone(392, 0.1, 'triangle', 0.11);
    tone(587, 0.16, 'triangle', 0.11, 0.1);
  },
  // Victory: a little major arpeggio.
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, i * 0.12));
  },
  // Defeat: a falling minor pair.
  lose: () => {
    tone(330, 0.25, 'sawtooth', 0.06);
    tone(233, 0.4, 'sawtooth', 0.06, 0.2);
  },
};

export const audio = {
  unlock() {
    ensureCtx();
  },
  play(name) {
    const fn = SOUNDS[name];
    if (fn) fn();
  },
  toggleMute() {
    muted = !muted;
    return muted;
  },
  isMuted() {
    return muted;
  },
};
