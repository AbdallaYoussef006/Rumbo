/**
 * components/liquid-glass.js — "real" liquid glass: the photo behind a glass panel bends at its edges,
 * like looking through a thick slab of glass, with a thin rainbow fringe (the way a prism splits light).
 *
 * How it works:
 *   For each glass panel we draw a small "displacement map" picture the size of the panel.
 *   Its colours say, for every pixel, how far to shift what is behind it: nothing in the middle,
 *   more and more towards the rim, always pulling inward. An SVG filter uses that map to bend
 *   the backdrop, three times with slightly different strengths for red, green and blue.
 *   CSS then applies it with  backdrop-filter: url(#lg-…)  (see the "Liquid glass" part of effects.css).
 *
 * Only Chrome and Edge can use an SVG filter on what is behind an element. Safari and Firefox
 * keep the normal frosted blur, plus the bright glass rims from effects.css — nothing breaks.
 * Switch: liquidGlass in js/core/fx.js (or ?fx=off).
 *
 * Which panels: GLASS below. Panels that appear later (new city, new cards) are found automatically.
 */
(function (App) {
  if (!App.fx || !App.fx.liquidGlass) return;
  // Chrome, Edge, Opera, Brave… (all built on Chromium). iPhone browsers are Safari inside, so they don't match.
  const chromium = (navigator.userAgentData && navigator.userAgentData.brands.some((b) => b.brand === 'Chromium'))
    || /Chrome\/\d/.test(navigator.userAgent);
  if (!chromium || !window.CSS || !CSS.supports('backdrop-filter', 'url(#x)')) return;
  document.documentElement.classList.add('lg-refract');

  //   selector                     how wide the curved rim is (px)
  const GLASS = [
    ['.hx__panel',                  52],
    ['.hero__kicker',               14],
    ['.hero-search',                34],
    ['.header > .header__row',      30],
    ['.place__body',                22],
    ['.pic__bar',                   16],
  ];
  // how far the picture is pulled in at the very edge, as a share of the rim width.
  // Keep it under 0.5: above that the picture folds over itself and the rim looks like a hard line.
  const PULL = 0.46;
  const SPREAD = 0.08;               // how far apart red, green and blue bend (the rainbow fringe)

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  document.body.appendChild(svg);

  const filters = new Map();         // "width|height|radius|rim" → filter id (panels of the same size share one)
  let count = 0;

  /**
   * The displacement map. Red = sideways shift, green = up/down shift, 128 = no shift.
   * Uses the distance from the panel's rounded edge: 0 at the rim, `bezel` px inside it.
   */
  function drawMap(w, h, r, bezel) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h), px = img.data;
    const hx = w / 2, hy = h / 2, ix = hx - r, iy = hy - r;
    for (let y = 0; y < h; y++) {
      const dy = y + 0.5 - hy, ay = Math.abs(dy), qy = ay - iy;
      for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - hx, ax = Math.abs(dx), qx = ax - ix;
        // distance to the rounded edge (inside = positive) and the direction straight out of the edge
        let depth, nx, ny;
        if (qx > 0 && qy > 0) {
          const len = Math.hypot(qx, qy) || 1;
          depth = r - len; nx = (qx / len) * Math.sign(dx); ny = (qy / len) * Math.sign(dy);
        } else if (qx > qy) { depth = r - qx; nx = Math.sign(dx); ny = 0; }
        else { depth = r - qy; nx = 0; ny = Math.sign(dy); }
        let m = 0;
        if (depth < bezel) {
          const t = Math.max(0, depth) / bezel;          // 0 at the rim … 1 where the flat middle starts
          m = (1 - t) * (1 - t);                         // a rounded, convex lens edge
        }
        const i = (y * w + x) * 4;
        px[i] = 128 - nx * m * 127;                      // pull the picture inward
        px[i + 1] = 128 - ny * m * 127;
        px[i + 2] = 128;
        px[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (parent) parent.appendChild(n);
    return n;
  }

  function makeFilter(w, h, r, bezel) {
    const bend = 2 * PULL * bezel;                 // feDisplacementMap moves at most scale ÷ 2 px
    const id = 'lg-' + (++count);
    const f = el('filter', { id, x: 0, y: 0, width: w, height: h, filterUnits: 'userSpaceOnUse',
      primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }, svg);
    el('feImage', { href: drawMap(w, h, r, bezel), x: 0, y: 0, width: w, height: h, preserveAspectRatio: 'none', result: 'map' }, f);
    const keep = { r: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', g: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', b: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0' };
    ['r', 'g', 'b'].forEach((ch, k) => {
      el('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: bend * (1 + SPREAD * k), xChannelSelector: 'R', yChannelSelector: 'G', result: 'd' + ch }, f);
      el('feColorMatrix', { in: 'd' + ch, type: 'matrix', values: keep[ch], result: ch }, f);
    });
    el('feBlend', { in: 'r', in2: 'g', mode: 'screen', result: 'rg' }, f);
    el('feBlend', { in: 'rg', in2: 'b', mode: 'screen' }, f);
    return id;
  }

  /** give one panel the filter that fits its current size */
  function fit(node, rim) {
    const w = Math.round(node.offsetWidth), h = Math.round(node.offsetHeight);
    if (w < 8 || h < 8) return;
    const r = Math.min(parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0, w / 2, h / 2);
    const bezel = Math.round(Math.min(rim, h / 2, w / 2));
    const key = [w, h, Math.round(r), bezel].join('|');
    if (node.dataset.lg === key) return;
    let id = filters.get(key);
    if (!id) { id = makeFilter(w, h, r, bezel); filters.set(key, id); }
    node.dataset.lg = key;
    node.style.setProperty('--lg', `url(#${id})`);
  }

  // panels change size (new city, window resize) → redraw their map
  const sized = new ResizeObserver((list) => list.forEach((e) => fit(e.target, e.target._lg)));
  function scan() {
    GLASS.forEach(([sel, rim]) => document.querySelectorAll(sel).forEach((node) => {
      if (node._lg) return;
      node._lg = rim;
      fit(node, rim);
      sized.observe(node);
    }));
  }
  // new cards and panels are drawn after a city change: look again (once per frame at most)
  let pending = 0;
  new MutationObserver(() => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; scan(); }); })
    .observe(document.body, { childList: true, subtree: true });
  requestAnimationFrame(scan);
})(window.App);
