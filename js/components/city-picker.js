/**
 * components/city-picker.js — the "📍 Cairo ▾" city picker in the header.
 * Opens a frosted-glass list under the pill: cities grouped by country, a search box,
 * keyboard support (↑ ↓ Enter Esc). The browser's own dropdown can't be styled, so this replaces it.
 *
 *   App.cityPicker.markup(cityId)  the pill's HTML (used by header.js)
 *   App.cityPicker.init()          wire it up after the header is on the page
 *   App.cityPicker.set(cityId)     show another city without firing a change (used by home.js)
 *
 * A hidden <select id="city-select"> keeps the chosen value and fires "change",
 * so code that listens to #city-select keeps working.
 * Styles: css/components/city-picker.css · Owner: UI — Boudy
 */
(function (App) {
  const { $, esc, ICON, t } = App;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let panel = null, btn = null, native = null;

  function markup(cityId) {
    const c = TravelDB.city(cityId) || TravelDB.cities()[0];
    const options = TravelDB.countries().map((co) => `<optgroup label="${esc(co.name)}">${co.cityIds.map((id) => {
      const x = TravelDB.city(id);
      return `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`;
    }).join('')}</optgroup>`).join('');
    return `
      <div class="city-pick">${ICON.pin}
        <button type="button" class="city-pick__btn" id="city-btn" aria-haspopup="listbox" aria-expanded="false" title="${esc(t('chooseCity'))}">
          <span id="city-btn-label">${esc(c.name)}</span>${ICON.chev}
        </button>
        <select id="city-select" class="city-pick__native" tabindex="-1" aria-hidden="true">${options}</select>
      </div>`;
  }

  function build() {
    panel = document.createElement('div');
    panel.className = 'cp-panel';
    panel.innerHTML = `
      <label class="cp-search">${ICON.search}<input type="search" placeholder="${esc(t('searchCity'))}" aria-label="${esc(t('searchCity'))}" autocomplete="off"></label>
      <div class="cp-list" role="listbox" aria-label="${esc(t('chooseCity'))}">
        ${TravelDB.countries().map((co) => `
          <div class="cp-group" data-group>${esc(co.name)}</div>
          ${co.cityIds.map((id) => {
            const x = TravelDB.city(id);
            return `<button type="button" class="cp-opt" role="option" data-city="${x.id}" data-search="${esc(norm(x.name + ' ' + co.name))}" aria-selected="false"><span>${esc(x.name)}</span>${ICON.check}</button>`;
          }).join('')}`).join('')}
        <p class="cp-empty" hidden>${esc(t('noCity'))}</p>
      </div>`;
    document.body.append(panel);

    const input = panel.querySelector('input');
    input.addEventListener('input', () => filter(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(0, true); }
      if (e.key === 'Enter') { e.preventDefault(); const first = visible()[0]; if (first) choose(first.dataset.city); }
    });
    panel.addEventListener('click', (e) => { const o = e.target.closest('.cp-opt'); if (o) choose(o.dataset.city); });
    panel.addEventListener('keydown', (e) => {
      const o = e.target.closest('.cp-opt');
      if (!o) return;
      const list = visible(), i = list.indexOf(o);
      if (e.key === 'ArrowDown') { e.preventDefault(); move(i + 1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (i <= 0) input.focus(); else move(i - 1); }
    });
  }

  const visible = () => [...panel.querySelectorAll('.cp-opt')].filter((o) => !o.hidden);
  function move(i, first) { const list = visible(); const o = first ? list[0] : list[Math.max(0, Math.min(i, list.length - 1))]; if (o) o.focus(); }

  function filter(q) {
    const n = norm(q.trim());
    let any = false, groupHasMatch = false, group = null;
    const flush = () => { if (group) group.hidden = !groupHasMatch; };
    panel.querySelectorAll('.cp-group, .cp-opt').forEach((el) => {
      if (el.matches('.cp-group')) { flush(); group = el; groupHasMatch = false; return; }
      const show = !n || el.dataset.search.includes(n);
      el.hidden = !show; if (show) { any = true; groupHasMatch = true; }
    });
    flush();
    panel.querySelector('.cp-empty').hidden = any;
  }

  function place() {
    const r = $('.city-pick').getBoundingClientRect(), st = panel.style;
    const width = Math.min(r.width, innerWidth - 24);   // exactly as wide as the pill
    st.width = `${width}px`;
    st.top = `${Math.round(r.bottom + 8)}px`;
    st.left = `${Math.round(Math.min(Math.max(12, r.left), innerWidth - width - 12))}px`;
  }

  function open() {
    if (!panel) build();
    App.search.close();
    if (App.localePicker) App.localePicker.close();
    panel.querySelectorAll('.cp-opt').forEach((o) => o.setAttribute('aria-selected', String(o.dataset.city === native.value)));
    const input = panel.querySelector('input'); input.value = ''; filter('');
    place();
    panel.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    const cur = panel.querySelector('.cp-opt[aria-selected="true"]');
    if (cur) cur.scrollIntoView({ block: 'center' });
    input.focus({ preventScroll: true });
  }
  function close(focusBtn) {
    if (!panel || !panel.classList.contains('open')) return;
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    if (focusBtn) btn.focus();
  }
  const isOpen = () => panel && panel.classList.contains('open');

  function set(id) {
    if (!native || !TravelDB.city(id)) return;
    native.value = id;
    $('#city-btn-label').textContent = TravelDB.city(id).name;
  }
  function choose(id) {
    const changed = id !== native.value;
    set(id);
    close(true);
    if (changed) native.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function init() {
    btn = $('#city-btn'); native = $('#city-select');
    if (!btn) return;
    btn.addEventListener('click', (e) => { e.stopPropagation(); isOpen() ? close() : open(); });
    btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); open(); } });
    document.addEventListener('click', (e) => { if (isOpen() && !e.target.closest('.cp-panel, .city-pick')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(true); });
    addEventListener('resize', () => { if (isOpen()) place(); });
    addEventListener('scroll', () => { if (isOpen()) place(); }, { passive: true });
  }

  App.cityPicker = { markup, init, set, close };
})(window.App);
