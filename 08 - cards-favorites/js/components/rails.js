/**
 * components/rails.js — the round ‹ › arrows next to a horizontal rail.
 * Usage in HTML: <button class="arrow" data-rail="<rail id>" data-dir="-1"> … data-dir="1">
 * Owner: Functionality team (Members 2 & 3)
 */
(function (App) {
  // draw the arrow icons
  document.querySelectorAll('.arrow[data-rail]').forEach((b) => { if (!b.innerHTML.trim()) b.innerHTML = b.dataset.dir === '1' ? App.ICON.next : App.ICON.prev; });

  document.addEventListener('click', (ev) => {
    const rail = ev.target.closest('[data-rail]');
    if (!rail) return;
    const el = document.getElementById(rail.dataset.rail);
    if (el) el.scrollBy({ left: el.clientWidth * 0.9 * Number(rail.dataset.dir), behavior: 'smooth' });
  });
})(window.App);
