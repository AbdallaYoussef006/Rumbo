/**
 * components/locale-picker.js — the "🌐 English ▾" and "USD ▾" buttons in the header
 * and the Language / Currency panel they open.
 * Choosing an option saves it (core/locale.js) and reloads the page in that language / currency.
 *
 *   App.localeButton()   the two buttons' HTML (used by header.js)
 *   App.localePicker     .open('lang'|'cur') · .close()
 *
 * Styles: css/components/locale-picker.css · Owner: Functionality team (Members 2 & 3)
 */
(function (App) {
  const { $, esc, ICON, t } = App;
  const L = window.Locale;

  function localeButton() {
    return `<span class="loc-group" id="loc-btn">
        <button type="button" class="loc-btn" data-loc-open="lang" aria-haspopup="dialog" aria-expanded="false" title="${t('language')}">${ICON.globe}<span class="loc-btn__lang">${esc(L.langInfo().native)}</span>${ICON.chev}</button>
        <button type="button" class="loc-btn" data-loc-open="cur" aria-haspopup="dialog" aria-expanded="false" title="${t('currency')}"><span>${L.currency}</span>${ICON.chev}</button>
      </span>`;
  }

  const localePicker = {
    tab: 'lang',
    el: null,
    init() {
      const btn = $('#loc-btn');
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        const b = e.target.closest('[data-loc-open]');
        if (!b) return;
        e.stopPropagation();
        const tab = b.dataset.locOpen;
        if (this.el && this.el.classList.contains('open') && this.tab === tab) this.close(); else this.open(tab);
      });
      document.addEventListener('click', (e) => { if (this.el && this.el.classList.contains('open') && !e.target.closest('.loc-panel, #loc-btn')) this.close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.el && this.el.classList.contains('open')) { const b = btn.querySelector(`[data-loc-open="${this.tab}"]`); this.close(); if (b) b.focus(); } });
      window.addEventListener('resize', () => { if (this.el && this.el.classList.contains('open')) this.place(); });
    },
    build() {
      const el = document.createElement('div');
      el.className = 'loc-panel';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', `${t('language')} / ${t('currency')}`);
      el.innerHTML = `
        <div class="loc-tabs" role="tablist">
          <button type="button" role="tab" class="loc-tab" data-loc-tab="lang">${t('language')}</button>
          <button type="button" role="tab" class="loc-tab" data-loc-tab="cur">${t('currency')}</button>
        </div>
        <div class="loc-body"></div>`;
      el.addEventListener('click', (e) => {
        const tb = e.target.closest('[data-loc-tab]');
        if (tb) { this.show(tb.dataset.locTab); return; }
        const o = e.target.closest('[data-lang]');
        if (o) { if (o.dataset.lang === L.lang) this.close(); else L.setLang(o.dataset.lang); return; }
        const c = e.target.closest('[data-cur]');
        if (c) { if (c.dataset.cur === L.currency) this.close(); else L.setCurrency(c.dataset.cur); }
      });
      document.body.append(el);
      this.el = el;
    },
    show(tab) {
      this.tab = tab;
      this.el.querySelectorAll('[data-loc-tab]').forEach((b) => { const on = b.dataset.locTab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
      const opt = (attr, code, title, sub, on) =>
        `<button type="button" class="loc-opt ${on ? 'on' : ''}" ${attr}="${code}" aria-pressed="${on}"><span><b>${esc(title)}</b><small>${esc(sub)}</small></span>${on ? ICON.check : ''}</button>`;
      let html;
      if (tab === 'lang') {
        html = `<div class="loc-grid">${L.LANGS.map((l) => opt('data-lang', l.code, l.native, l.english, l.code === L.lang)).join('')}</div>`;
      } else {
        const all = L.currencies();
        const cur = (c) => opt('data-cur', c.code, c.symbol ? `${c.code} ${c.symbol}` : c.code, c.name, c.code === L.currency);
        html = `<h4 class="loc-h">${t('suggested')}</h4><div class="loc-grid">${all.filter((c) => L.SUGGESTED.includes(c.code)).map(cur).join('')}</div>
          <h4 class="loc-h loc-h--line">${t('more')}</h4><div class="loc-grid">${all.filter((c) => !L.SUGGESTED.includes(c.code)).map(cur).join('')}</div>
          <p class="loc-note">${t('ratesNote')}</p>`;
      }
      const body = this.el.querySelector('.loc-body');
      body.innerHTML = html;
      body.scrollTop = 0;
    },
    open(tab) {
      if (!this.el) this.build();
      App.search.close();
      if (App.cityPicker) App.cityPicker.close();
      this.show(tab);
      this.place();
      this.el.classList.add('open');
      document.querySelectorAll('[data-loc-open]').forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.locOpen === tab)));
      const first = this.el.querySelector('.loc-opt.on') || this.el.querySelector('.loc-tab');
      if (first) first.focus({ preventScroll: true });
    },
    place() {   // sit under the button, 16px from the screen edges
      const r = $('#loc-btn').getBoundingClientRect(), st = this.el.style;
      st.top = `${Math.round(r.bottom + 8)}px`;
      if (innerWidth <= 760) { st.left = '16px'; st.right = '16px'; st.width = 'auto'; }
      else { st.left = 'auto'; st.right = `${Math.max(16, Math.round(innerWidth - r.right))}px`; st.width = ''; }
    },
    close() {
      if (!this.el) return;
      this.el.classList.remove('open');
      document.querySelectorAll('[data-loc-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    },
  };

  Object.assign(App, { localeButton, localePicker });
})(window.App);
