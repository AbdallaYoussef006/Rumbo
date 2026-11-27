/**
 * core/fx.js — the on/off switchboard for the visual effects ("fx").
 *
 * Turn any effect off by changing true → false below; the site works the same without it.
 *
 *   globe        3D globe of the 40 cities in "Explore more destinations"   js/components/globe.js
 *   tilt         cards lean toward the mouse, with a moving glass shine      js/components/tilt.js
 *   parallax     hero photo and glass panel move at different depths         js/components/parallax.js
 *   transitions  a card's photo grows into the experience page's photo       js/components/transitions.js
 *   liquidGlass  glass panels bend the photo behind them at their edges     js/components/liquid-glass.js
 *                (Chrome / Edge; other browsers get the glass rims only)
 *
 * To compare quickly without editing: open any page with ?fx=off (stays off while you browse),
 * and ?fx=on to bring the effects back.
 * People who asked their device for less motion (prefers-reduced-motion) get no moving effects.
 *
 * Each effect that is on also adds a class to <html> (fx-tilt, fx-parallax …) used by css/components/effects.css.
 */
(function (App) {
  const SWITCH = {
    globe: true,
    tilt: true,
    parallax: true,
    transitions: true,
    liquidGlass: true,
  };

  // ?fx=off / ?fx=on — remembered for this browser tab
  let off = false;
  try {
    const q = new URLSearchParams(location.search).get('fx');
    if (q === 'off') sessionStorage.setItem('rumbo:fx', 'off');
    if (q === 'on') sessionStorage.removeItem('rumbo:fx');
    off = sessionStorage.getItem('rumbo:fx') === 'off';
  } catch { /* private mode */ }

  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = { calm };
  Object.keys(SWITCH).forEach((name) => {
    // the globe and the liquid glass still show for "less motion" users — neither of them moves
    fx[name] = SWITCH[name] && !off && (name === 'globe' || name === 'liquidGlass' || !calm);
    if (fx[name]) document.documentElement.classList.add('fx-' + name);
  });
  App.fx = fx;
})(window.App);
