/**
 * components/favorites.js — saving experiences to "My trip" (the heart buttons).
 *
 *   App.fav.all()        ids of saved experiences
 *   App.fav.has(id)      is it saved?
 *   App.fav.toggle(id)   save / remove, returns the new state
 *   App.updateFavCount() refresh the number on the header heart
 *
 * Saved in this browser (localStorage "rumbo:favorites"). Fires a "favorites-changed" event.
 * Any button with data-fav="<experience id>" works as a heart automatically.
 * Owner: Functionality team (Members 2 & 3)
 */
(function (App) {
  const fav = {
    key: 'rumbo:favorites',
    all() {
      try {
        const saved = localStorage.getItem(this.key) ?? localStorage.getItem('rehla:favorites'); // keeps favorites saved before the rename
        return JSON.parse(saved) || [];
      } catch { return []; }
    },
    has(id) { return this.all().includes(Number(id)); },
    toggle(id) {
      id = Number(id);
      const list = this.all();
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      try { localStorage.setItem(this.key, JSON.stringify(next)); } catch { /* private mode: ignore */ }
      updateFavCount();
      document.dispatchEvent(new CustomEvent('favorites-changed', { detail: { id, on: next.includes(id) } }));
      return next.includes(id);
    },
  };

  function updateFavCount() { const el = App.$('#fav-count'); if (el) el.textContent = fav.all().length; }

  // every heart on the page: [data-fav]
  document.addEventListener('click', (ev) => {
    const heart = ev.target.closest('[data-fav]');
    if (!heart) return;
    ev.preventDefault(); ev.stopPropagation();
    const on = fav.toggle(heart.dataset.fav);
    document.querySelectorAll(`[data-fav="${heart.dataset.fav}"]`).forEach((b) => b.classList.toggle('on', on));
  });

  Object.assign(App, { fav, updateFavCount });
})(window.App);
