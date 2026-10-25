/**
 * core/app.js — the shared toolbox every page uses. Creates the global `App` object.
 *
 *   App.$(selector)          querySelector shortcut
 *   App.esc(text)            escape text before putting it in HTML
 *   App.img(src, alt)        <img> with lazy loading and a placeholder if the file is missing
 *   App.ICON.<name>          inline SVG icons
 *   App.params               the page's ?query parameters
 *   App.t(key) / App.money() text in the chosen language / price in the chosen currency (core/locale.js)
 *   App.start(run)           loads the database, then runs the page code
 *
 * The components in js/components/ add more to App (header, footer, cards, favorites…).
 *
 * Script order on every page (see any .html file):
 *   data/database.js → core/travelDB.js → core/locale.js → core/app.js → components/*.js → pages/<page>.js
 *
 * Owner: Boudy (team lead) · used by everyone
 */
(function () {
  const PLACEHOLDER = 'assets/img/placeholder.svg';
  const L = window.Locale;   // language + currency

  const $ = (s, root = document) => root.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const params = new URLSearchParams(location.search);

  const ICON = {
    heart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    star: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.5 5.7 21l1.5-7L2 9.3l7-.8z"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    prev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m15 18-6-6 6-6"/></svg>',
    next: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m9 18 6-6-6-6"/></svg>',
    globe: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5s-1.3 6.7-3.9 9.5c-2.6-2.8-3.9-6-3.9-9.5s1.3-6.7 3.9-9.5z"/></svg>',
    chev: '<svg class="i-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    plane: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M21.5 2.5 2.8 10.2l7.4 2.9 2.9 7.4z"/><path d="m21.5 2.5-11.3 10.6"/></svg>',
    calendar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17.5h2"/></svg>',
    user: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5"/></svg>',
    check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  };

  /** <img> tag with lazy loading and a local fallback if the file is ever missing. */
  const img = (src, alt = '', extra = '') =>
    `<img ${extra} loading="lazy" src="${esc(src || PLACEHOLDER)}" alt="${esc(alt)}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">`;

  /* ---------------- Start a page ---------------- */
  function showError() {
    const main = document.querySelector('main') || document.body;
    main.innerHTML = `
      <div class="notice">
        <h2>Database not found</h2>
        <p>This page needs the <b>data/</b>, <b>js/</b> and <b>assets/</b> folders next to it.
        Extract the whole project folder (don't open a file from inside the .zip), then open <b>index.html</b> again.</p>
      </div>`;
  }

  /** Loads the database, runs the page code, then translates any data-i18n text. */
  function start(run) {
    if (!window.TravelDB || !window.Locale) { showError(); return; }
    TravelDB.load().then(
      () => { run(); L.apply(); },
      (err) => { console.warn(err); showError(); },
    );
  }

  window.App = {
    $, esc, params, ICON, img, start,
    t: L.t, money: L.money, get lang() { return L.lang; },
  };
})();
