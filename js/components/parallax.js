/**
 * components/parallax.js — depth in the home hero.
 *   - scrolling: the city photo moves slower than the page, so it seems far away
 *   - mouse: the photo drifts a little one way and the glass panel the other way
 * It only sets three CSS variables on #hero (--px, --py, --sy); css/components/effects.css does the moving.
 * Switch: App.fx.parallax (js/core/fx.js)
 */
(function (App) {
  if (!App.fx || !App.fx.parallax) return;
  const hero = document.getElementById('hero');
  if (!hero) return;

  const mouse = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  let tx = 0, ty = 0;        // where the mouse wants the photo
  let cx = 0, cy = 0;        // where it is now (eases toward tx, ty)
  let raf = 0, sraf = 0;

  function frame() {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    hero.style.setProperty('--px', cx.toFixed(2) + 'px');
    hero.style.setProperty('--py', cy.toFixed(2) + 'px');
    raf = (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) ? requestAnimationFrame(frame) : 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  if (mouse) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * -24;
      ty = ((e.clientY - r.top) / r.height - 0.5) * -14;
      kick();
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  }

  function onScroll() {
    sraf = 0;
    const y = Math.min(window.scrollY, hero.offsetHeight);
    hero.style.setProperty('--sy', (y * 0.28).toFixed(1) + 'px');
  }
  window.addEventListener('scroll', () => { if (!sraf) sraf = requestAnimationFrame(onScroll); }, { passive: true });
  onScroll();
})(window.App);
