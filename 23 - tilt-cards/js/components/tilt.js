/**
 * components/tilt.js — 3D tilt: a card leans toward the mouse and a soft glass shine follows the cursor.
 * Works on every photo card: experience cards, place cards, "in pictures" cards and destination photos.
 * Only on devices with a real mouse (phones and tablets keep the normal tap behaviour).
 * Switch: App.fx.tilt (js/core/fx.js) · look: css/components/effects.css
 */
(function (App) {
  if (!App.fx || !App.fx.tilt) return;
  if (!window.matchMedia || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  const CARDS = '.card__img, .place, .pic, .dest__img';
  const MAX = 7;                     // biggest lean, in degrees
  let card = null, raf = 0, x = 0, y = 0;

  function paint() {
    raf = 0;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (x - r.left) / r.width));    // 0 = left edge, 1 = right edge
    const py = Math.min(1, Math.max(0, (y - r.top) / r.height));
    card.style.setProperty('--ry', ((px - 0.5) * 2 * MAX).toFixed(2) + 'deg');
    card.style.setProperty('--rx', ((0.5 - py) * 2 * MAX).toFixed(2) + 'deg');
    card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
  }

  function leave() {
    if (card) card.classList.remove('is-tilt');
    card = null;
  }

  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest ? e.target.closest(CARDS) : null;
    if (el !== card) { leave(); card = el; if (card) card.classList.add('is-tilt'); }
    if (!card) return;
    x = e.clientX; y = e.clientY;
    if (!raf) raf = requestAnimationFrame(paint);
  }, { passive: true });
  document.addEventListener('pointerleave', leave);
  window.addEventListener('blur', leave);
  window.addEventListener('scroll', leave, { passive: true });
})(window.App);
