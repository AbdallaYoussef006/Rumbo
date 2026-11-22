/**
 * components/globe.js — the 3D globe in "Explore more destinations" (home page).
 *
 * A dotted Earth you can spin, with a glowing pin on each of the 40 cities.
 *   - drag to rotate (it keeps gliding a little), it turns slowly by itself when left alone
 *   - click / tap a pin → the globe flies to that city and the card beside it shows the city
 *   - the ‹ › buttons step through the cities from west to east (also works with the keyboard)
 *   - "Explore <city>" opens that city (home.js gives the function to call)
 *   - a dashed flight arc joins the city you are in and the city you are previewing
 *   - zoom: the + / − buttons, pinch, or the mouse wheel after you click the globe;
 *     it also zooms by itself when you pick a city in a crowded area
 *   - cities that would overlap are grouped into one bubble with a number; zoom in (or click it) and it splits
 *   - "Explore <city>": a small plane flies the arc from the city you are in, lands, and only then the page changes city
 *     (click the globe to skip the flight)
 *
 *   App.globe.mount(element, { city, onExplore })   build it inside the element
 *   App.globe.setCity(cityId)                        the page changed city → turn there
 *
 * No library: it is drawn on a <canvas> with plain maths (orthographic projection).
 *   - land shape: data/land-dots.js (RUMBO_LAND = lat×10, lng×10, …)
 *   - cities + coordinates: TravelDB.cities()
 *   - colours: CSS variables --g-… in css/components/globe.css (light + dark)
 * It stops drawing when it is off-screen, so it costs nothing while you read the rest of the page.
 * Switch: App.fx.globe (js/core/fx.js)
 */
(function (App) {
  if (!App.fx || !App.fx.globe) return;
  const { esc, t } = App;
  const RAD = Math.PI / 180;
  const MAX_TILT = 55;                 // how far north/south the view may tip, in degrees
  const SPIN = 5;                      // idle spin, degrees per second
  const REST = 6000;                   // after you touch it, wait this long before it spins again (ms)
  const MAX_ZOOM = 5;                  // closest zoom (1 = the whole Earth)
  const AUTO_ZOOM = 2.4;               // the closest it zooms by itself
  const GROUP_PX = 17;                 // cities closer than this on screen become one bubble

  /** latitude/longitude → a point on a ball of radius 1 (x right, y up, z toward you) */
  const ball = (lat, lng) => {
    const p = lat * RAD, l = lng * RAD;
    return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wrap = (deg) => ((deg + 540) % 360) - 180;                 // keep a longitude between -180 and 180
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const angle = (a, b) => Math.acos(clamp(dot3(a, b), -1, 1));     // angle between two points on the ball
  const toLatLng = (v) => [Math.asin(clamp(v[1], -1, 1)) / RAD, Math.atan2(v[0], v[2]) / RAD];
  /** the point a share k (0…1) of the way from a to b along the shortest path on the ball */
  const along = (a, b, om, k) => {
    if (om < 1e-4) return b;
    const s1 = Math.sin((1 - k) * om) / Math.sin(om), s2 = Math.sin(k * om) / Math.sin(om);
    return [a[0] * s1 + b[0] * s2, a[1] * s1 + b[1] * s2, a[2] * s1 + b[2] * s2];
  };

  let G = null;    // the one globe on the page

  function mount(root, opts) {
    if (!root || !window.RUMBO_LAND) return;
    const cities = TravelDB.cities().filter((c) => typeof c.lat === 'number' && typeof c.lng === 'number')
      .map((c) => ({ ...c, v: ball(c.lat, c.lng) }));
    // how close each city's nearest neighbour is → how far to zoom in when that city is chosen
    cities.forEach((c) => { c.near = Math.min(...cities.filter((o) => o !== c).map((o) => angle(c.v, o.v))); });
    const order = [...cities].sort((a, b) => a.lng - b.lng);       // west → east, for the ‹ › buttons
    const land = [];
    for (let i = 0; i < RUMBO_LAND.length; i += 2) land.push(ball(RUMBO_LAND[i] / 10, RUMBO_LAND[i + 1] / 10));

    root.innerHTML = `
      <div class="globe__side">
        <span class="globe__kicker">${App.ICON.globe}<span>${esc(t('globeTitle'))}</span></span>
        <div class="globe__card" id="globe-card"></div>
        <div class="globe__nav">
          <button type="button" class="arrow" data-step="-1" aria-label="Previous city">${App.ICON.prev}</button>
          <button type="button" class="arrow" data-step="1" aria-label="Next city">${App.ICON.next}</button>
          <span class="globe__hint">${esc(t('globeHint'))}</span>
        </div>
      </div>
      <div class="globe__stage">
        <canvas class="globe__canvas" role="img" aria-label="${esc(t('globeTitle'))}"></canvas>
        <div class="globe__zoom">
          <button type="button" data-zoom="1" aria-label="Zoom in">+</button>
          <button type="button" data-zoom="-1" aria-label="Zoom out">−</button>
        </div>
      </div>`;

    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const start = cities.find((c) => c.id === opts.city) || cities[0];

    G = {
      root, canvas, ctx, cities, order, land, opts,
      here: start.id,                      // the city the page is showing
      pick: start.id,                      // the city previewed on the globe
      hover: null,
      lng: start.lng, lat: clamp(start.lat, -MAX_TILT, MAX_TILT),     // the point of the Earth facing you
      zoom: 1, zoomTo: 1,                  // now / where the zoom is heading
      groups: [], groupKey: '',            // city bubbles for the current zoom (see group())
      trip: null, landAt: 0,               // the plane flight after "Explore", and when it last landed
      touch: new Map(), pinch: null, armed: false,
      vx: 0, vy: 0,                        // glide speed after a drag (degrees per frame)
      drag: null, fly: null,
      idleAt: performance.now() + 1500,    // when it may start spinning by itself
      size: 0, dpr: 1, R: 0, R0: 0,
      visible: false, raf: 0, last: 0, dash: 0,
      col: {},
    };

    readColours();
    paintCard();
    resize();

    // redraw only while on screen and the tab is open
    new IntersectionObserver((en) => { G.visible = en[0].isIntersecting; loop(); }, { rootMargin: '120px' }).observe(canvas);
    document.addEventListener('visibilitychange', loop);
    new ResizeObserver(resize).observe(canvas);
    // light / dark switch → new colours
    new MutationObserver(readColours).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColours);

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', (ev) => { G.drag = null; G.touch.delete(ev.pointerId); G.pinch = null; });
    canvas.addEventListener('pointerleave', () => { G.armed = false; if (!G.drag) { G.hover = null; canvas.style.cursor = ''; } });
    // mouse wheel zooms only after you click the globe, so scrolling the page never gets stuck on it
    canvas.addEventListener('wheel', (ev) => {
      if (!G.armed && !ev.ctrlKey) return;
      ev.preventDefault();
      zoomBy(Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.012 : 0.0022)));
    }, { passive: false });

    root.addEventListener('click', (ev) => {
      const step = ev.target.closest('[data-step]');
      if (step) {
        const i = order.findIndex((c) => c.id === G.pick);
        select(order[(i + Number(step.dataset.step) + order.length) % order.length].id);
        return;
      }
      const z = ev.target.closest('[data-zoom]');
      if (z) { zoomBy(Number(z.dataset.zoom) > 0 ? 1.7 : 1 / 1.7); return; }
      if (ev.target.closest('#globe-go')) { ev.stopPropagation(); explore(); }
    });
  }

  /* ---------- colours (from CSS, so light and dark are set in globe.css) ---------- */
  function readColours() {
    if (!G) return;
    const cs = getComputedStyle(G.root);
    const v = (name) => cs.getPropertyValue(name).trim();
    G.col = {
      ocean1: v('--g-ocean-1'), ocean2: v('--g-ocean-2'), rim: v('--g-rim'), glow: v('--g-glow'),
      dot: v('--g-dot'), pin: v('--g-pin'), here: v('--g-here'), arc: v('--g-arc'),
      labelBg: v('--g-label-bg'), labelInk: v('--g-label-ink'), shine: v('--g-shine'), groupInk: v('--g-group-ink'),
    };
  }

  /* ---------- the card beside the globe ---------- */
  function paintCard() {
    const c = G.cities.find((x) => x.id === G.pick);
    const n = c.experienceCount;
    document.getElementById('globe-card').innerHTML = `
      <div class="globe__photo">${App.img(c.image, c.name)}</div>
      <div class="globe__info">
        <b>${esc(c.name)}</b>
        <span>${esc(c.country)}</span>
        <small>${esc(n === 1 ? t('exp1') : t('expN', { n }))} · ${esc(t('from'))} ${esc(App.money(c.priceFrom))}</small>
        <button type="button" class="btn" id="globe-go">${esc(t('globeGo', { city: c.name }))}${App.ICON.next}</button>
      </div>`;
  }

  /* ---------- choosing a city ---------- */
  /** the zoom at which this city stands clear of its nearest neighbour */
  const zoomFor = (c) => clamp(26 / ((G.R0 / G.dpr || 215) * c.near), 1, AUTO_ZOOM);
  const tiltMax = () => Math.min(72, MAX_TILT + (G.zoom - 1) * 8);          // zoomed in, you may look further north/south

  /** turn (and zoom) the globe so this point faces you */
  function flyTo(lat, lng, zoom, ms) {
    G.fly = { t0: performance.now(), ms: App.fx.calm ? 1 : ms || 950,
      fromLng: G.lng, fromLat: G.lat, dLng: wrap(lng - G.lng), dLat: clamp(lat, -68, 68) - G.lat, z0: G.zoom, z1: zoom };
    G.zoomTo = zoom;
    G.vx = G.vy = 0;
    G.idleAt = performance.now() + REST;
    loop();
  }

  function select(id) {
    const c = G.cities.find((x) => x.id === id);
    if (!c) return;
    G.pick = id;
    paintCard();
    flyTo(c.lat, c.lng, zoomFor(c));
  }

  function setCity(id) {
    if (!G || !G.cities.some((c) => c.id === id)) return;
    G.here = id;
    select(id);
  }

  /* ---------- zoom ---------- */
  function zoomBy(f) {
    if (G.trip) return;
    G.fly = null;
    G.zoomTo = clamp(G.zoomTo * f, 1, MAX_ZOOM);
    G.idleAt = performance.now() + REST;
    loop();
  }

  /**
   * Group the cities for the current zoom: cities that would sit closer than GROUP_PX on screen share one bubble.
   * It depends only on the zoom (not on where the globe is turned), so bubbles never flicker while it spins.
   * The city you are in and the city you are previewing always keep their own pin.
   */
  function group() {
    const zq = Math.round(G.zoom * 10) / 10, key = zq + '|' + G.here + '|' + G.pick + '|' + G.R0;
    if (key === G.groupKey) return G.groups;
    G.groupKey = key;
    const limit = zq >= MAX_ZOOM - 0.05 ? 0 : GROUP_PX / ((G.R0 / G.dpr) * zq);      // as an angle
    const out = [];
    for (const c of G.cities) {
      const solo = c.id === G.here || c.id === G.pick;
      const g = solo ? null : out.find((o) => !o.solo && angle(o.v, c.v) < limit);
      if (!g) { out.push({ solo, list: [c], v: c.v }); continue; }
      g.list.push(c);
      const m = [0, 1, 2].map((i) => g.list.reduce((a, x) => a + x.v[i], 0)), len = Math.hypot(m[0], m[1], m[2]);
      g.v = [m[0] / len, m[1] / len, m[2] / len];                                   // the middle of the group
    }
    return (G.groups = out);
  }

  /** click on a bubble → fly to it and zoom in just enough for it to split */
  function openGroup(g) {
    let near = Infinity;
    for (const a of g.list) for (const b of g.list) if (a !== b) near = Math.min(near, angle(a.v, b.v));
    const [lat, lng] = toLatLng(g.v);
    flyTo(lat, lng, clamp(Math.max(G.zoom * 1.6, (GROUP_PX + 9) / ((G.R0 / G.dpr) * near)), 1, MAX_ZOOM), 800);
  }

  /* ---------- "Explore": the plane flies from the city you are in to the chosen city, then the page changes ---------- */
  function explore() {
    const id = G.pick;
    if (G.trip) { land(); return; }                                 // second click = skip
    if (id === G.here || App.fx.calm || !G.visible) { G.opts.onExplore(id); return; }
    const a = G.cities.find((x) => x.id === G.here), b = G.cities.find((x) => x.id === id);
    const om = angle(a.v, b.v), r0 = G.R0 / G.dpr;
    G.trip = {
      id, a: a.v, b: b.v, om, t0: performance.now(),
      ms: clamp(1700 + om * 1100, 1700, 3200),
      high: 0.07 + om * 0.07,                                       // longer trips fly higher
      z0: G.zoom, zc: clamp(150 / (r0 * om), 1, AUTO_ZOOM), z1: zoomFor(b),   // zoom so the whole trip is easy to see
      fromLng: G.lng, fromLat: G.lat, k: 0,
    };
    G.fly = null; G.vx = G.vy = 0; G.hover = null;
    G.root.classList.add('is-flying');
    loop();
  }

  function land() {
    const tr = G.trip;
    if (!tr) return;
    G.trip = null;
    G.root.classList.remove('is-flying');
    const [lat, lng] = toLatLng(tr.b);
    G.lng = lng; G.lat = clamp(lat, -68, 68); G.zoom = G.zoomTo = tr.z1;
    G.landAt = performance.now();
    G.idleAt = G.landAt + REST;
    setTimeout(() => G.opts.onExplore(tr.id), 380);                 // let the landing ring show, then change the page
  }

  /* ---------- mouse / touch ---------- */
  const at = (ev) => { const r = G.canvas.getBoundingClientRect(); return [(ev.clientX - r.left) * G.dpr, (ev.clientY - r.top) * G.dpr]; };

  /** the pin or bubble under the pointer (a group: { solo, list, v }) */
  function pinAt(x, y) {
    let best = null, bestD = 15 * G.dpr;
    for (const g of group()) {
      const p = project(g.v);
      if (p[2] <= 0.05) continue;
      const d = Math.hypot(p[0] - x, p[1] - y) - (g.list.length > 1 ? 5 * G.dpr : 0);
      if (d < bestD) { bestD = d; best = g; }
    }
    return best;
  }
  const hoverKey = (g) => (g ? g.list[0].id + ':' + g.list.length : null);

  function onDown(ev) {
    if (G.trip) { land(); return; }                    // click during the flight = skip it
    const [x, y] = at(ev);
    G.armed = true;
    G.touch.set(ev.pointerId, [x, y]);
    if (G.touch.size === 2) {                          // two fingers → pinch zoom
      const [a, b] = [...G.touch.values()];
      G.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z: G.zoomTo };
      G.drag = null;
      return;
    }
    G.drag = { x, y, x0: x, y0: y, moved: false };
    G.fly = null; G.vx = G.vy = 0;
    G.canvas.setPointerCapture(ev.pointerId);
  }
  function onMove(ev) {
    const [x, y] = at(ev);
    if (G.touch.has(ev.pointerId)) G.touch.set(ev.pointerId, [x, y]);
    if (G.pinch && G.touch.size === 2) {
      const [a, b] = [...G.touch.values()];
      G.zoom = G.zoomTo = clamp(G.pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / G.pinch.d, 1, MAX_ZOOM);
      G.idleAt = performance.now() + REST;
      loop();
      return;
    }
    if (G.drag) {
      const k = 57.3 / G.R;                            // pixels → degrees
      const dx = (x - G.drag.x) * k, dy = (y - G.drag.y) * k;
      if (Math.hypot(x - G.drag.x0, y - G.drag.y0) > 5 * G.dpr) G.drag.moved = true;
      G.lng = wrap(G.lng - dx);
      G.lat = clamp(G.lat + dy, -tiltMax(), tiltMax());
      G.vx = -dx; G.vy = dy;
      G.drag.x = x; G.drag.y = y;
      G.idleAt = performance.now() + REST;
      G.canvas.style.cursor = 'grabbing';
    } else if (!G.trip) {
      const g = pinAt(x, y);
      G.hover = hoverKey(g);
      G.canvas.style.cursor = g ? 'pointer' : 'grab';
    }
    loop();
  }
  function onUp(ev) {
    G.touch.delete(ev.pointerId);
    if (G.pinch) { if (!G.touch.size) G.pinch = null; return; }
    const d = G.drag; G.drag = null;
    G.canvas.style.cursor = 'grab';
    if (!d) return;
    if (!d.moved) {                                    // a click, not a drag
      const [x, y] = at(ev);
      const g = pinAt(x, y);
      if (g) g.list.length > 1 ? openGroup(g) : select(g.list[0].id);
    }
  }

  /* ---------- drawing ---------- */
  function resize() {
    const w = G.canvas.clientWidth;
    if (!w) return;
    G.dpr = Math.min(2, window.devicePixelRatio || 1);
    G.size = Math.round(w * G.dpr);
    G.canvas.width = G.canvas.height = G.size;
    G.R0 = G.size * 0.43;                  // the globe's radius at zoom 1
    draw();
  }

  let cosL = 1, sinL = 0, cosP = 1, sinP = 0;
  /** point on the ball → [screen x, screen y, depth] (depth > 0 means it faces you) */
  function project(v, lift) {
    const s = lift || 1;
    const x1 = v[0] * cosL - v[2] * sinL, z1 = v[0] * sinL + v[2] * cosL;
    const y = v[1] * cosP - z1 * sinP, z = v[1] * sinP + z1 * cosP;
    const c = G.size / 2;
    return [c + G.R * x1 * s, c - G.R * y * s, z];
  }

  function draw() {
    const { ctx, size, col, dpr } = G;
    if (!size) return;
    const R = (G.R = G.R0 * G.zoom);
    const c = size / 2, zs = Math.sqrt(G.zoom);
    const lens = size * 0.488, zoomed = clamp((G.zoom - 1) * 2.5, 0, 1);     // zoomed in, you look through a round window
    cosL = Math.cos(G.lng * RAD); sinL = Math.sin(G.lng * RAD);
    cosP = Math.cos(G.lat * RAD); sinP = Math.sin(G.lat * RAD);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath(); ctx.arc(c, c, lens, 0, 7); ctx.clip();

    // soft glow around the planet
    let g = ctx.createRadialGradient(c, c, R * 0.92, c, c, R * 1.16);
    g.addColorStop(0, col.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);

    // the ball itself, lit from the top-left
    g = ctx.createRadialGradient(c - R * 0.38, c - R * 0.42, R * 0.05, c, c, R);
    g.addColorStop(0, col.ocean1); g.addColorStop(1, col.ocean2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(c, c, R, 0, 7); ctx.fill();
    ctx.lineWidth = 1.2 * dpr; ctx.strokeStyle = col.rim; ctx.stroke();

    // land dots: far side very faint (glass-ball look), near side brighter toward the middle
    const far = [], b1 = [], b2 = [], b3 = [];
    for (const v of G.land) {
      const p = project(v);
      if (p[0] < -4 || p[1] < -4 || p[0] > size + 4 || p[1] > size + 4) continue;      // outside the window
      (p[2] < 0 ? far : p[2] < 0.35 ? b1 : p[2] < 0.7 ? b2 : b3).push(p);
    }
    ctx.fillStyle = col.dot;
    const dots = (list, alpha, r) => {
      ctx.globalAlpha = alpha; ctx.beginPath();
      for (const p of list) { ctx.moveTo(p[0] + r, p[1]); ctx.arc(p[0], p[1], r, 0, 7); }
      ctx.fill();
    };
    dots(far, 0.09, 0.9 * dpr * zs);
    dots(b1, 0.38, 1.05 * dpr * zs);
    dots(b2, 0.68, 1.3 * dpr * zs);
    dots(b3, 0.95, 1.55 * dpr * zs);
    ctx.globalAlpha = 1;

    drawArc();

    // glass shine on top
    g = ctx.createRadialGradient(c - R * 0.45, c - R * 0.5, 0, c - R * 0.45, c - R * 0.5, R * 0.95);
    g.addColorStop(0, col.shine); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, R, 0, 7); ctx.fill();

    drawPins();
    if (G.trip) drawPlane();
    ctx.restore();

    if (zoomed) {                                       // the rim of the round window
      ctx.globalAlpha = zoomed; ctx.lineWidth = 1.4 * dpr; ctx.strokeStyle = col.rim;
      ctx.beginPath(); ctx.arc(c, c, lens - dpr, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  /** dashed flight arc from the city you are in to the city you are previewing */
  function drawArc() {
    const tr = G.trip;
    if (!tr && G.pick === G.here) return;
    const a = tr ? tr.a : G.cities.find((x) => x.id === G.here).v, b = tr ? tr.b : G.cities.find((x) => x.id === G.pick).v;
    const om = angle(a, b);
    if (om < 0.004) return;
    const { ctx, dpr, col } = G;
    const N = 56, high = tr ? tr.high : 0.04 + om * 0.05;           // longer trips fly higher
    const path = (to) => {                                           // the arc from the start up to the share `to`
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= N; i++) {
        const k = (i / N) * to;
        const p = project(along(a, b, om, k), 1 + high * Math.sin(Math.PI * k));
        if (p[2] > 0.12) { pen ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); pen = true; } else pen = false;
      }
    };
    ctx.save();
    ctx.beginPath(); ctx.arc(G.size / 2, G.size / 2, G.R * 1.05 + (tr ? high * G.R : 0), 0, 7); ctx.clip();     // the arc ends at the horizon
    ctx.lineWidth = 2 * dpr; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col.arc;
    ctx.setLineDash([2 * dpr, 7 * dpr]); ctx.lineDashOffset = -G.dash;
    path(1); ctx.stroke();
    if (tr && tr.k > 0) {                                            // the glowing trail behind the plane
      ctx.setLineDash([]);
      ctx.shadowColor = col.arc; ctx.shadowBlur = 10 * dpr;
      ctx.lineWidth = 3 * dpr; path(tr.k); ctx.stroke();
      ctx.shadowBlur = 0; ctx.lineWidth = 1.2 * dpr; ctx.strokeStyle = 'rgba(255,255,255,.9)'; path(tr.k); ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * The little plane. It is flat shapes drawn with light and dark sides, and it looks 3D because it:
   * rises off the globe (bigger in the middle of the trip), leans into its turns, and drops a shadow on the ground.
   */
  function drawPlane() {
    const tr = G.trip, { ctx, dpr } = G;
    const k = tr.k, up = Math.sin(Math.PI * k);                      // 0 on the ground … 1 at the top of the arc
    const pos = (kk) => project(along(tr.a, tr.b, tr.om, kk), 1 + tr.high * Math.sin(Math.PI * kk));
    const p = pos(k), q = pos(Math.min(1, k + 0.015)), o = pos(Math.max(0, k - 0.015));
    if (p[2] < 0.05) return;
    const head = k > 0.98 ? Math.atan2(p[1] - o[1], p[0] - o[0]) : Math.atan2(q[1] - p[1], q[0] - p[0]);
    const before = Math.atan2(p[1] - o[1], p[0] - o[0]);
    let turn = head - before; turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    const bank = k > 0.03 && k < 0.97 ? clamp(turn * 9, -0.45, 0.45) : 0;      // lean into the turn
    const s = dpr * (8.5 + 8 * up);

    const shape = (wingL, wingR) => {                                // nose points right (+x)
      ctx.beginPath();
      ctx.moveTo(2.1, 0);
      ctx.quadraticCurveTo(1.7, -0.3, 0.75, -0.3);
      ctx.lineTo(-0.35, -2.0 * wingL); ctx.lineTo(-0.85, -2.0 * wingL); ctx.lineTo(-0.2, -0.3);
      ctx.lineTo(-1.35, -0.26); ctx.lineTo(-1.8, -0.85 * wingL); ctx.lineTo(-2.1, -0.85 * wingL); ctx.lineTo(-1.85, 0);
      ctx.lineTo(-2.1, 0.85 * wingR); ctx.lineTo(-1.8, 0.85 * wingR); ctx.lineTo(-1.35, 0.26);
      ctx.lineTo(-0.2, 0.3); ctx.lineTo(-0.85, 2.0 * wingR); ctx.lineTo(-0.35, 2.0 * wingR); ctx.lineTo(0.75, 0.3);
      ctx.quadraticCurveTo(1.7, 0.3, 2.1, 0);
      ctx.closePath();
    };
    const wl = 1 - bank, wr = 1 + bank;

    // shadow on the ground: further away and softer the higher the plane is
    const g0 = project(along(tr.a, tr.b, tr.om, k));
    ctx.save();
    ctx.translate(g0[0] + up * 7 * dpr, g0[1] + up * 10 * dpr); ctx.rotate(head); ctx.scale(s * 0.82, s * 0.82);
    ctx.globalAlpha = 0.30 - 0.14 * up; ctx.fillStyle = '#04182E';
    ctx.filter = `blur(${(1 + 2.5 * up) * dpr}px)`;
    shape(wl, wr); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(p[0], p[1]); ctx.rotate(head); ctx.scale(s, s);
    ctx.shadowColor = 'rgba(4,24,46,.45)'; ctx.shadowBlur = 6 * dpr; ctx.shadowOffsetY = 2 * dpr;
    shape(wl, wr); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.shadowColor = 'transparent';
    // the side away from the light is darker
    ctx.save(); shape(wl, wr); ctx.clip();
    const lightUp = Math.sin(head) > 0 ? 1 : -1;                     // which side of the plane faces the top-left light
    ctx.fillStyle = 'rgba(21,60,110,.26)';
    ctx.fillRect(-2.4, lightUp > 0 ? 0 : -2.6, 4.8, 2.6);
    ctx.restore();
    // body highlight + cockpit
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 0.16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-1.6, 0); ctx.lineTo(1.5, 0); ctx.stroke();
    ctx.fillStyle = G.col.dot;
    ctx.beginPath(); ctx.ellipse(1.42, 0, 0.3, 0.15, 0, 0, 7); ctx.fill();
    // outline so it reads on light and dark
    ctx.lineWidth = 0.09; ctx.strokeStyle = 'rgba(4,45,94,.55)'; shape(wl, wr); ctx.stroke();
    ctx.restore();
  }

  function drawPins() {
    const { ctx, dpr, col } = G;
    const pulse = (performance.now() % 1800) / 1800;
    const labels = [], size = G.size;
    const list = group();
    const order = [...list].sort((a, b) => a.solo - b.solo);        // the two special pins are drawn on top
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    for (const g of order) {
      const p = project(g.v);
      if (p[2] <= 0.02 || p[0] < -20 || p[1] < -20 || p[0] > size + 20 || p[1] > size + 20) continue;
      const fade = clamp(p[2] * 3, 0, 1);              // pins soften near the edge
      const hot = hoverKey(g) === G.hover;
      if (g.list.length > 1) {                         // a bubble: several cities, with how many
        const n = g.list.length, r = (8 + Math.min(4, n * 0.5) + (hot ? 1.5 : 0)) * dpr;
        ctx.globalAlpha = fade * 0.28; ctx.beginPath(); ctx.arc(p[0], p[1], r + 4 * dpr, 0, 7); ctx.fillStyle = col.pin; ctx.fill();
        ctx.globalAlpha = fade;
        ctx.beginPath(); ctx.arc(p[0], p[1], r + 1.6 * dpr, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill();
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fillStyle = col.pin; ctx.fill();
        ctx.font = `800 ${11 * dpr}px "Plus Jakarta Sans",system-ui,sans-serif`;
        ctx.fillStyle = col.groupInk; ctx.fillText(String(n), p[0], p[1] + 0.5 * dpr);
        if (hot) labels.push([g.list.slice(0, 2).map((x) => x.name).join(', ') + (n > 2 ? ` +${n - 2}` : ''), p, fade, r]);
        continue;
      }
      const c = g.list[0];
      const here = c.id === G.here, pick = c.id === G.pick;
      const r = (here || pick ? 5 : hot ? 4.8 : Math.min(3.8, 2.6 + 0.45 * (G.zoom - 1))) * dpr;
      ctx.globalAlpha = fade;
      if (here || pick) {                              // pulsing ring
        ctx.beginPath(); ctx.arc(p[0], p[1], r + 12 * dpr * pulse, 0, 7);
        ctx.strokeStyle = here ? col.here : col.pin; ctx.globalAlpha = fade * (1 - pulse) * 0.8; ctx.lineWidth = 1.6 * dpr; ctx.stroke();
        ctx.globalAlpha = fade;
      }
      ctx.beginPath(); ctx.arc(p[0], p[1], r + (here || pick || hot ? 2.2 : 1.4) * dpr, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fillStyle = here ? col.here : col.pin; ctx.fill();
      // the name steps aside while the plane is right on top of it (taking off / landing)
      const busy = G.trip && ((here && G.trip.k < 0.22) || (pick && G.trip.k > 0.78));
      if ((here || pick || hot) && !busy) labels.push([c.name, p, fade, r]);
    }
    // the plane just landed → a ring opens out from the city
    const since = performance.now() - G.landAt;
    if (G.landAt && since < 900) {
      const c = G.cities.find((x) => x.id === G.pick), p = project(c.v), k = since / 900;
      ctx.globalAlpha = (1 - k) * 0.9; ctx.lineWidth = 2.4 * dpr; ctx.strokeStyle = col.arc;
      ctx.beginPath(); ctx.arc(p[0], p[1], (6 + 34 * k) * dpr, 0, 7); ctx.stroke();
    }
    // name labels, drawn last so they sit on top of every pin
    ctx.font = `700 ${12.5 * dpr}px "Plus Jakarta Sans",system-ui,sans-serif`;
    for (const [name, p, fade, r] of labels) {
      const w = ctx.measureText(name).width + 18 * dpr, h = 24 * dpr;
      const x = clamp(p[0], w / 2 + 2, G.size - w / 2 - 2), y = Math.max(h / 2 + 2, p[1] - r - 17 * dpr);
      ctx.globalAlpha = fade;
      ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = col.labelBg; ctx.fill();
      ctx.fillStyle = col.labelInk; ctx.fillText(name, x, y + 0.5 * dpr);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- animation loop (runs only while visible) ---------- */
  function loop() {
    if (!G || G.raf || !G.visible || document.hidden) return;
    G.last = performance.now();
    G.raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    G.raf = 0;
    if (!G.visible || document.hidden) return;
    const dt = Math.min(50, now - G.last); G.last = now;
    G.dash = (G.dash + dt * 0.03 * G.dpr) % 1000;

    if (G.trip) {                                       // the plane is in the air: the globe follows a little behind it
      const tr = G.trip, k = Math.min(1, (now - tr.t0) / tr.ms);
      tr.k = easeInOut(k);
      const cam = easeInOut(clamp((k - 0.1) / 0.9, 0, 1));
      const [lat, lng] = toLatLng(along(tr.a, tr.b, tr.om, cam));
      const join = easeInOut(clamp(k / 0.3, 0, 1));                 // glide from where the globe was onto the route
      G.lng = wrap(tr.fromLng + wrap(lng - tr.fromLng) * join);
      G.lat = tr.fromLat + (clamp(lat, -68, 68) - tr.fromLat) * join;
      const zin = easeInOut(clamp(k / 0.3, 0, 1)), zout = easeInOut(clamp((k - 0.72) / 0.28, 0, 1));
      G.zoom = G.zoomTo = (tr.z0 + (tr.zc - tr.z0) * zin) * (1 - zout) + tr.z1 * zout;
      if (k >= 1) land();
    } else if (G.fly) {                                 // turning to a chosen city
      const f = G.fly, k = Math.min(1, (now - f.t0) / f.ms), e = easeInOut(k);
      G.lng = wrap(f.fromLng + f.dLng * e);
      G.lat = f.fromLat + f.dLat * e;
      // long turns pull back a little on the way, so you see where you are going
      const far = clamp((Math.abs(f.dLng) + Math.abs(f.dLat) - 25) / 60, 0, 1);
      const dip = (Math.min(f.z0, f.z1) - 1) * far * Math.sin(Math.PI * k);
      G.zoom = Math.max(1, f.z0 + (f.z1 - f.z0) * e - dip);
      if (k >= 1) { G.zoom = f.z1; G.fly = null; }
    } else if (!G.drag) {
      if (Math.abs(G.zoom - G.zoomTo) > 0.002) G.zoom += (G.zoomTo - G.zoom) * Math.min(1, dt * 0.012);   // smooth zoom
      else G.zoom = G.zoomTo;
      G.lat = clamp(G.lat, -tiltMax(), tiltMax());
      if (Math.abs(G.vx) > 0.01 || Math.abs(G.vy) > 0.01) {        // gliding after a drag
        G.lng = wrap(G.lng + G.vx); G.lat = clamp(G.lat + G.vy, -tiltMax(), tiltMax());
        G.vx *= 0.94; G.vy *= 0.94;
      } else if (!App.fx.calm && !G.hover && now > G.idleAt) {      // idle → slow spin
        G.lng = wrap(G.lng + (SPIN / G.zoom) * dt / 1000);
      }
    }
    draw();
    G.raf = requestAnimationFrame(frame);
  }

  App.globe = { mount, setCity };
})(window.App);
