/**
 * components/theme-switch.js — light / dark mode and the "plane switch" in the header.
 * The choice is saved in the browser ("rumbo:theme") and applied on every page.
 * If the user never used the switch, the site follows the system setting.
 * (Each page also has a tiny inline script in <head> that applies the saved theme before painting.)
 *
 *   App.theme.current()   'light' | 'dark'
 *   App.theme.set('dark')
 *   App.themeSwitch()     the switch's HTML (used by header.js)
 *
 * Switch design: "plane switch" by Nawsome on Uiverse.io (MIT) — styles in css/components/theme-switch.css
 * Owner: UI — Boudy
 */
(function (App) {
  const { $ } = App;

  const theme = {
    key: 'rumbo:theme',
    media: window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null,
    saved() { try { const t = localStorage.getItem(this.key); return t === 'dark' || t === 'light' ? t : null; } catch { return null; } },
    current() { return document.documentElement.dataset.theme || (this.media && this.media.matches ? 'dark' : 'light'); },
    set(t) {
      const root = document.documentElement;
      root.classList.add('theme-fade');
      root.dataset.theme = t;
      try { localStorage.setItem(this.key, t); } catch { /* private mode: still works for this page */ }
      clearTimeout(this._fade);
      this._fade = setTimeout(() => root.classList.remove('theme-fade'), 400);
      this.sync();
    },
    sync() { const box = $('#theme-input'); if (box) box.checked = this.current() === 'light'; },   // sky = light, runway = dark
    init() {
      const saved = this.saved();
      if (saved) document.documentElement.dataset.theme = saved;
      const box = $('#theme-input');
      if (box) box.addEventListener('change', () => this.set(box.checked ? 'light' : 'dark'));
      // system theme changed and the user never chose: follow it
      if (this.media) this.media.addEventListener('change', () => { if (!this.saved()) this.sync(); });
      // changed in another tab: follow it here too
      window.addEventListener('storage', (e) => {
        if (e.key === this.key) { if (e.newValue) document.documentElement.dataset.theme = e.newValue; else delete document.documentElement.dataset.theme; this.sync(); }
      });
      this.sync();
    },
  };

  /** Checked = blue sky (light mode), unchecked = runway at night (dark mode) */
  function themeSwitch() {
    return `
      <label class="plane-switch" title="Switch light / dark mode">
        <input type="checkbox" id="theme-input" aria-label="Light mode">
        <div>
          <div>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" transform="rotate(90 12 12)" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
          </div>
          <span class="street-middle"></span>
          <span class="cloud"></span>
          <span class="cloud two"></span>
        </div>
      </label>`;
  }

  Object.assign(App, { theme, themeSwitch });
})(window.App);
