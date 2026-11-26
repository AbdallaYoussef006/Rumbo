/**
 * components/popover.js — frosted-glass popovers that open centred under a field.
 * Used by the home search bar (When · Guests · Filters); reusable on any page (e.g. the trip planner).
 * The browser's own date picker and dropdowns can't be styled, so these replace them.
 *
 *   App.popover.list(anchor, { options:[{value,label}], value, onSelect(value) })
 *   App.popover.stepper(anchor, { label, value, min, max, format(n), onChange(n) })
 *   App.popover.calendar(anchor, { value:'YYYY-MM-DD'|'', min:'YYYY-MM-DD', onSelect(dateOrEmpty) })
 *   App.popover.close()
 *
 * Closes on Esc, on a click outside, or after choosing. Styles: css/components/popover.css
 * Owner: UI — Boudy
 */
(function (App) {
  const { esc, ICON, t } = App;
  let panel = null, anchorEl = null, onCloseCb = null;

  /* ---------- the shared glass panel ---------- */
  function ensure() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'gp-panel';
    panel.setAttribute('role', 'dialog');
    document.body.append(panel);
    document.addEventListener('click', (e) => {
      if (isOpen() && !panel.contains(e.target) && !(anchorEl && anchorEl.contains(e.target))) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(true); });
    addEventListener('resize', () => { if (isOpen()) place(); });
    addEventListener('scroll', () => { if (isOpen()) place(); }, { passive: true });
    return panel;
  }
  const isOpen = () => panel && panel.classList.contains('open');

  /** centred under the field; opens above it when there's no room below */
  function place() {
    const r = anchorEl.getBoundingClientRect(), st = panel.style;
    const min = Number(panel.dataset.minWidth) || 0;
    const width = Math.min(Math.max(r.width, min), innerWidth - 24);
    st.width = `${width}px`;
    st.left = `${Math.round(Math.min(Math.max(12, r.left + r.width / 2 - width / 2), innerWidth - width - 12))}px`;
    const h = panel.offsetHeight, below = innerHeight - r.bottom - 10;
    st.top = `${Math.round(h > below && r.top - 10 > below ? r.top - h - 8 : r.bottom + 8)}px`;
  }

  function open(anchor, { html, minWidth = 0, label = '', onClose } = {}) {
    ensure();
    if (isOpen()) close();
    if (App.search) App.search.close();
    if (App.cityPicker) App.cityPicker.close();
    if (App.localePicker) App.localePicker.close();
    anchorEl = anchor; onCloseCb = onClose || null;
    panel.dataset.minWidth = minWidth;
    panel.setAttribute('aria-label', label);
    panel.innerHTML = html;
    anchor.setAttribute('aria-expanded', 'true');
    anchor.classList.add('is-open');
    place();
    panel.classList.add('open');
    return panel;
  }

  function close(focusAnchor) {
    if (!isOpen()) return;
    panel.classList.remove('open');
    if (anchorEl) { anchorEl.setAttribute('aria-expanded', 'false'); anchorEl.classList.remove('is-open'); if (focusAnchor) anchorEl.focus(); }
    const cb = onCloseCb; onCloseCb = null; if (cb) cb();
  }

  /* ---------- 1. a list of options ---------- */
  function list(anchor, { options, value, onSelect, label }) {
    const p = open(anchor, {
      label,
      html: `<div class="gp-list" role="listbox">${options.map((o) =>
        `<button type="button" class="gp-opt" role="option" data-value="${esc(o.value)}" aria-selected="${o.value === value}"><span>${esc(o.label)}</span>${ICON.check}</button>`).join('')}</div>`,
    });
    p.onclick = (e) => { const o = e.target.closest('.gp-opt'); if (o) { onSelect(o.dataset.value); close(true); } };
    p.onkeydown = (e) => {
      const items = [...p.querySelectorAll('.gp-opt')], i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
    };
    (p.querySelector('.gp-opt[aria-selected="true"]') || p.querySelector('.gp-opt')).focus({ preventScroll: true });
  }

  /* ---------- 2. a − / + stepper ---------- */
  function stepper(anchor, { label, value, min = 1, max = 10, format, onChange }) {
    let n = value;
    const p = open(anchor, {
      label, minWidth: 260,
      html: `<div class="gp-step">
          <div><b>${esc(label)}</b><small>${esc(min)}–${esc(max)}</small></div>
          <div class="gp-step__ctrl">
            <button type="button" class="gp-round" data-step="-1" aria-label="−">−</button>
            <output class="gp-step__n" aria-live="polite">${n}</output>
            <button type="button" class="gp-round" data-step="1" aria-label="+">+</button>
          </div>
        </div>
        <p class="gp-step__text"></p>
        <button type="button" class="gp-done">${esc(t('done'))}</button>`,
    });
    const paint = () => {
      p.querySelector('.gp-step__n').textContent = n;
      p.querySelector('.gp-step__text').textContent = format(n);
      p.querySelector('[data-step="-1"]').disabled = n <= min;
      p.querySelector('[data-step="1"]').disabled = n >= max;
    };
    p.onclick = (e) => {
      const s = e.target.closest('[data-step]');
      if (s) { n = Math.min(max, Math.max(min, n + Number(s.dataset.step))); paint(); onChange(n); return; }
      if (e.target.closest('.gp-done')) close(true);
    };
    p.onkeydown = null;
    paint();
    p.querySelector('[data-step="1"]').focus({ preventScroll: true });
  }

  /* ---------- 3. a month calendar ---------- */
  const pad = (x) => String(x).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function calendar(anchor, { value, min, onSelect, label }) {
    const lang = App.lang;
    const firstDay = lang === 'en' || lang === 'pt' ? 0 : 1;   // Sunday or Monday first
    const sel = value ? new Date(value + 'T12:00') : null;
    const today = iso(new Date());
    let view = new Date((value || today) + 'T12:00'); view.setDate(1);
    const minMonth = min ? min.slice(0, 7) : '';
    const p = open(anchor, { label, minWidth: 300, html: '<div class="gp-cal"></div>' });

    function draw() {
      const y = view.getFullYear(), m = view.getMonth();
      const title = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(view);
      const days = [...Array(7)].map((_, i) => new Intl.DateTimeFormat(lang, { weekday: 'narrow' }).format(new Date(2024, 0, 7 + ((i + firstDay) % 7))));
      const lead = (new Date(y, m, 1).getDay() - firstDay + 7) % 7;
      const count = new Date(y, m + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push('<span></span>');
      for (let d = 1; d <= count; d++) {
        const k = `${y}-${pad(m + 1)}-${pad(d)}`;
        const off = min && k < min;
        cells.push(`<button type="button" class="gp-day${k === today ? ' is-today' : ''}${sel && k === iso(sel) ? ' is-sel' : ''}" data-day="${k}" ${off ? 'disabled' : ''}>${d}</button>`);
      }
      p.querySelector('.gp-cal').innerHTML = `
        <div class="gp-cal__head">
          <button type="button" class="gp-round gp-round--sm" data-month="-1" aria-label="‹" ${minMonth && `${y}-${pad(m + 1)}` <= minMonth ? 'disabled' : ''}>${ICON.prev}</button>
          <b>${esc(title)}</b>
          <button type="button" class="gp-round gp-round--sm" data-month="1" aria-label="›">${ICON.next}</button>
        </div>
        <div class="gp-cal__week">${days.map((d) => `<span>${esc(d)}</span>`).join('')}</div>
        <div class="gp-cal__days">${cells.join('')}</div>
        <div class="gp-cal__foot"><button type="button" class="gp-link" data-clear>${esc(t('clear'))}</button><button type="button" class="gp-link" data-today>${esc(t('today'))}</button></div>`;
      place();
    }
    p.onclick = (e) => {
      e.stopPropagation();
      const mo = e.target.closest('[data-month]');
      if (mo) { view.setMonth(view.getMonth() + Number(mo.dataset.month)); draw(); return; }
      const d = e.target.closest('[data-day]');
      if (d) { onSelect(d.dataset.day); close(true); return; }
      if (e.target.closest('[data-clear]')) { onSelect(''); close(true); return; }
      if (e.target.closest('[data-today]')) { onSelect(today); close(true); }
    };
    p.onkeydown = null;
    draw();
    (p.querySelector('.gp-day.is-sel') || p.querySelector('.gp-day.is-today') || p.querySelector('.gp-day:not([disabled])')).focus({ preventScroll: true });
  }

  App.popover = { open, close, list, stepper, calendar };
})(window.App);
