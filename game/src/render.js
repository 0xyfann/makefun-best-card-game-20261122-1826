// render.js — every pixel of Emberfall Duel, drawn on one canvas.
// No images, no fonts fetched over the network: plain canvas shapes and
// the system sans-serif stack. The layout numbers are the single source
// of truth for hit-testing: input.js imports the same rect helpers from
// here, so the two can never drift apart.

import { ELEMENTS } from './cards.js';

export const VIEW_W = 1280;
export const VIEW_H = 800;

const CARD_W = 112;
const CARD_H = 152;
const HAND_Y = 600;
const FOE_CARD_W = 76;
const FOE_CARD_H = 104;
const FOE_HAND_Y = 18;

// The mana row sits at VIEW_H - 262 (see BUILD-NOTES tricky #3): keep the
// shield badge caption to the RIGHT of the badge, never below it, or it
// collides with these crystals.
const MANA_ROW_Y = VIEW_H - 262;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = '600') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

// ---- shared geometry (input.js uses these) ----

export function playerHandRects(match) {
  const hand = match.player.hand;
  const n = hand.length;
  const gap = 8;
  const total = n * CARD_W + (n - 1) * gap;
  const x0 = (VIEW_W - total) / 2;
  return hand.map((_, i) => ({
    x: x0 + i * (CARD_W + gap),
    y: HAND_Y,
    w: CARD_W,
    h: CARD_H,
    index: i,
  }));
}

export function foeHandRects(match) {
  const n = match.foe.hand.length;
  const gap = 6;
  const total = n * FOE_CARD_W + (n - 1) * gap;
  const x0 = (VIEW_W - total) / 2;
  return Array.from({ length: n }, (_, i) => ({
    x: x0 + i * (FOE_CARD_W + gap),
    y: FOE_HAND_Y,
    w: FOE_CARD_W,
    h: FOE_CARD_H,
  }));
}

export const endTurnRect = { x: 1010, y: 320, w: 200, h: 56 };
export const startRect = { x: VIEW_W / 2 - 130, y: 548, w: 260, h: 64 };
export const againRect = { x: VIEW_W / 2 - 130, y: 520, w: 260, h: 60 };

// ---- small pieces ----

function drawGlyph(ctx, glyph, cx, cy, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (glyph === 'triangle') {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.9, cy + size * 0.7);
    ctx.lineTo(cx - size * 0.9, cy + size * 0.7);
  } else if (glyph === 'circle') {
    ctx.arc(cx, cy, size * 0.8, 0, Math.PI * 2);
  } else if (glyph === 'diamond') {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size, cy);
  } else {
    // square
    ctx.rect(cx - size * 0.8, cy - size * 0.8, size * 1.6, size * 1.6);
  }
  ctx.closePath();
  ctx.fill();
}

function drawManaPips(ctx, x, y, mana, maxMana) {
  for (let i = 0; i < maxMana; i++) {
    const cx = x + i * 26 + 10;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx + 9, y + 8);
    ctx.lineTo(cx, y + 16);
    ctx.lineTo(cx - 9, y + 8);
    ctx.closePath();
    if (i < mana) {
      ctx.fillStyle = '#f5b942';
      ctx.fill();
    } else {
      ctx.strokeStyle = '#6b6258';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

function drawLifeBar(ctx, x, y, w, life, maxLife, fillColor) {
  ctx.fillStyle = '#241d18';
  roundRect(ctx, x, y, w, 22, 6);
  ctx.fill();
  const frac = Math.max(0, life / maxLife);
  if (frac > 0) {
    ctx.fillStyle = fillColor;
    roundRect(ctx, x + 2, y + 2, Math.max(8, (w - 4) * frac), 18, 5);
    ctx.fill();
  }
  ctx.strokeStyle = '#5a4f43';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, 22, 6);
  ctx.stroke();
  text(ctx, `${life} / ${maxLife}`, x + w / 2, y + 16, 13, '#f5efe6', 'center', '700');
}

// Shield badge sits RIGHT of the life bar; its caption goes right of
// the badge (never below it — see BUILD-NOTES tricky #3).
function drawShield(ctx, barX, barW, y, shield) {
  const cx = barX + barW + 26;
  const cy = y + 11;
  ctx.fillStyle = shield > 0 ? '#3d8fe8' : '#3a332c';
  ctx.beginPath();
  ctx.arc(cx, cy, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cfe4ff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, String(shield), cx, cy + 5, 14, '#ffffff', 'center', '800');
  text(ctx, 'SHIELD', cx + 22, cy + 5, 11, '#b8a894', 'left', '700');
}

function drawSideHeader(ctx, name, side, x, nameY, barY, manaY, lifeColor) {
  text(ctx, name, x, nameY, 20, '#f5efe6', 'left', '800');
  drawLifeBar(ctx, x, barY, 320, side.life, side.maxLife, lifeColor);
  drawShield(ctx, x, 320, barY, side.shield);
  drawManaPips(ctx, x, manaY, side.mana, side.maxMana);
  text(ctx, `${side.mana} mana`, x + side.maxMana * 26 + 24, manaY + 13, 12, '#cbb98f', 'left', '600');
}

// ---- cards ----

function drawCard(ctx, card, rect, opts = {}) {
  const { hover = false, dim = false, faceDown = false } = opts;
  const y = hover ? rect.y - 16 : rect.y;

  ctx.save();
  if (dim) ctx.globalAlpha = 0.45;

  // Face-down (the Warden's hand): a plain back, no card data needed.
  // This branch must come first — `card` is null for a face-down card.
  if (faceDown) {
    ctx.fillStyle = '#5c2e1e';
    roundRect(ctx, rect.x, y, rect.w, rect.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#c96a3b';
    ctx.lineWidth = 2;
    roundRect(ctx, rect.x + 5, y + 5, rect.w - 10, rect.h - 10, 7);
    ctx.stroke();
    drawGlyph(ctx, 'triangle', rect.x + rect.w / 2, y + rect.h / 2, 20, '#c96a3b');
    ctx.restore();
    return;
  }

  const el = ELEMENTS[card.element];

  // Body.
  ctx.fillStyle = '#f7f1e6';
  roundRect(ctx, rect.x, y, rect.w, rect.h, 10);
  ctx.fill();
  // Element band at the top.
  ctx.fillStyle = el.color;
  roundRect(ctx, rect.x, y, rect.w, 34, 10);
  ctx.fill();
  ctx.fillRect(rect.x, y + 24, rect.w, 10);
  // Cost pip.
  ctx.fillStyle = '#2a211a';
  ctx.beginPath();
  ctx.arc(rect.x + 18, y + 17, 13, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, String(card.cost), rect.x + 18, y + 22, 15, '#ffd76a', 'center', '800');
  // Element name on the band.
  text(ctx, el.name.toUpperCase(), rect.x + rect.w - 8, y + 21, 10, '#ffffff', 'right', '800');
  // Name.
  text(ctx, card.name, rect.x + 8, y + 56, 13, '#241d18', 'left', '700');
  // Glyph + power.
  drawGlyph(ctx, el.glyph, rect.x + rect.w / 2, y + 88, 16, el.color);
  text(ctx, String(card.power), rect.x + rect.w / 2, y + 92, 26, '#241d18', 'center', '800');
  // Kind + effect text.
  text(ctx, card.kind.toUpperCase(), rect.x + rect.w / 2, y + 118, 9, '#7a6a58', 'center', '700');
  wrapText(ctx, card.text, rect.x + 8, y + 132, rect.w - 16, 10, '#4a4038');

  if (hover) {
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 3;
    roundRect(ctx, rect.x - 2, y - 2, rect.w + 4, rect.h + 4, 12);
    ctx.stroke();
  }
  ctx.restore();
}

function wrapText(ctx, str, x, y, maxW, size, color) {
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = 'left';
  const words = str.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const trial = line ? line + ' ' + word : word;
    if (ctx.measureText(trial).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += size + 3;
    } else {
      line = trial;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

// ---- screens ----

function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#171009');
  g.addColorStop(0.55, '#241a10');
  g.addColorStop(1, '#120d07');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Faint ember dots for atmosphere.
  ctx.fillStyle = 'rgba(232, 93, 61, 0.10)';
  for (let i = 0; i < 40; i++) {
    const x = (i * 317) % VIEW_W;
    const y = (i * 173) % VIEW_H;
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTitle(ctx, match) {
  drawBackground(ctx);
  text(ctx, 'EMBERFALL', VIEW_W / 2, 150, 84, '#f5efe6', 'center', '800');
  text(ctx, 'DUEL', VIEW_W / 2, 230, 84, '#e85d3d', 'center', '800');
  text(ctx, 'A turn-based card duel against the Ashen Warden', VIEW_W / 2, 272, 18, '#cbb98f', 'center', '600');

  // Element legend.
  const names = Object.values(ELEMENTS);
  const total = names.length * 130;
  names.forEach((el, i) => {
    const cx = VIEW_W / 2 - total / 2 + i * 130 + 65;
    drawGlyph(ctx, el.glyph, cx, 330, 14, el.color);
    text(ctx, el.name, cx, 356, 14, '#f5efe6', 'center', '700');
  });

  text(ctx, 'Play two cards of one element in a turn to trigger Resonance (+2 power).', VIEW_W / 2, 410, 16, '#e8dcc8', 'center', '600');
  text(ctx, 'Reduce the Warden to 0 life before it does the same to you.', VIEW_W / 2, 438, 16, '#e8dcc8', 'center', '600');
  text(ctx, 'Click a card to play it  ·  Space ends your turn  ·  R rematch  ·  M mute', VIEW_W / 2, 470, 14, '#9a8a76', 'center', '600');

  // Start button.
  ctx.fillStyle = '#e85d3d';
  roundRect(ctx, startRect.x, startRect.y, startRect.w, startRect.h, 12);
  ctx.fill();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = 2;
  roundRect(ctx, startRect.x, startRect.y, startRect.w, startRect.h, 12);
  ctx.stroke();
  text(ctx, 'BEGIN THE DUEL', VIEW_W / 2, startRect.y + 40, 20, '#ffffff', 'center', '800');
  text(ctx, 'Best of the elements wins.', VIEW_W / 2, startRect.y + 92, 13, '#9a8a76', 'center', '600');
}

function drawTable(ctx, match, ui) {
  drawBackground(ctx);

  // Foe hand (face down).
  for (const rect of foeHandRects(match)) {
    drawCard(ctx, null, rect, { faceDown: true });
  }
  drawSideHeader(ctx, 'Ashen Warden', match.foe, 40, 150, 158, 196, '#c96a3b');

  // Turn banner.
  const turnText =
    match.phase === 'playing'
      ? match.active === 'player'
        ? 'Your turn — play a card, or end the turn'
        : 'The Warden is thinking…'
      : '';
  if (turnText) text(ctx, turnText, VIEW_W / 2, 246, 16, '#e8dcc8', 'center', '600');

  // Battle log — capped at 4 displayed lines so it never runs into
  // the player row (see BUILD-NOTES tricky #4).
  text(ctx, 'BATTLE LOG', 40, 280, 12, '#9a8a76', 'left', '800');
  const lines = match.log.slice(-4);
  lines.forEach((line, i) => {
    text(ctx, line, 40, 306 + i * 26, 14, i === lines.length - 1 ? '#f5efe6' : '#b8a894', 'left', '600');
  });

  // Last-played card flash.
  if (match.lastPlay && Date.now() - match.lastPlay.at < 1200) {
    const lp = match.lastPlay;
    const label = `${lp.who === 'player' ? 'You' : 'Warden'} played ${lp.card.name}${lp.resonated ? ' — Resonance!' : ''}`;
    ctx.fillStyle = 'rgba(42, 33, 26, 0.9)';
    roundRect(ctx, VIEW_W / 2 - 210, 250, 420, 34, 8);
    ctx.fill();
    text(ctx, label, VIEW_W / 2, 273, 14, '#ffd76a', 'center', '700');
  }

  // End Turn button.
  const canEnd = match.phase === 'playing' && match.active === 'player';
  ctx.fillStyle = canEnd ? '#46a85e' : '#3a332c';
  roundRect(ctx, endTurnRect.x, endTurnRect.y, endTurnRect.w, endTurnRect.h, 10);
  ctx.fill();
  ctx.strokeStyle = canEnd ? '#bfe8c8' : '#6b6258';
  ctx.lineWidth = 2;
  roundRect(ctx, endTurnRect.x, endTurnRect.y, endTurnRect.w, endTurnRect.h, 10);
  ctx.stroke();
  text(ctx, 'END TURN', endTurnRect.x + endTurnRect.w / 2, endTurnRect.y + 35, 18, '#ffffff', 'center', '800');
  text(ctx, '[Space]', endTurnRect.x + endTurnRect.w / 2, endTurnRect.y + 76, 12, '#9a8a76', 'center', '600');

  // Player header: name, life, shield, then the mana row.
  drawSideHeader(ctx, 'You', match.player, 40, 500, 508, MANA_ROW_Y, '#46a85e');
  text(ctx, `Round ${match.round}`, VIEW_W - 40, 500, 14, '#cbb98f', 'right', '700');
  text(ctx, `Deck: ${match.player.deck.length}  ·  Discard: ${match.player.discard.length}`, VIEW_W - 40, 522, 12, '#9a8a76', 'right', '600');

  // Player hand.
  const rects = playerHandRects(match);
  rects.forEach((rect, i) => {
    const card = match.player.hand[i];
    const affordable = card.cost <= match.player.mana && match.active === 'player' && match.phase === 'playing';
    drawCard(ctx, card, rect, { hover: ui.hoverIndex === i, dim: !affordable });
  });
  text(ctx, `Your hand — ${match.player.hand.length} card${match.player.hand.length === 1 ? '' : 's'}`, 40, HAND_Y - 12, 12, '#9a8a76', 'left', '700');
}

function drawEnd(ctx, match, won) {
  drawTable(ctx, match, { hoverIndex: -1 });
  // Dim the table, then the verdict.
  ctx.fillStyle = 'rgba(10, 7, 4, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, won ? 'VICTORY!' : 'DEFEAT', VIEW_W / 2, 330, 72, won ? '#ffd76a' : '#c96a3b', 'center', '800');
  text(
    ctx,
    won ? 'The Ashen Warden crumbles to embers.' : 'Your ember fades. The Warden stands.',
    VIEW_W / 2,
    372,
    20,
    '#f5efe6',
    'center',
    '600',
  );
  // Stats line sits at y=480 so it never collides with the log or the
  // player row (see BUILD-NOTES tricky #4).
  const turns = match.turnsPlayed;
  const played = match.player.discard.length + match.foe.discard.length;
  text(ctx, `Rounds: ${match.round}  ·  Turns played: ${turns}  ·  Cards played: ${played}`, VIEW_W / 2, 480, 16, '#cbb98f', 'center', '600');

  ctx.fillStyle = won ? '#46a85e' : '#e85d3d';
  roundRect(ctx, againRect.x, againRect.y, againRect.w, againRect.h, 12);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  roundRect(ctx, againRect.x, againRect.y, againRect.w, againRect.h, 12);
  ctx.stroke();
  text(ctx, 'PLAY AGAIN  [R]', VIEW_W / 2, againRect.y + 38, 18, '#ffffff', 'center', '800');
}

export function render(ctx, match, ui = {}) {
  const safeUi = { hoverIndex: -1, ...ui };
  if (match.phase === 'title') {
    drawTitle(ctx, match);
  } else if (match.phase === 'won') {
    drawEnd(ctx, match, true);
  } else if (match.phase === 'lost') {
    drawEnd(ctx, match, false);
  } else {
    drawTable(ctx, match, safeUi);
  }
}
