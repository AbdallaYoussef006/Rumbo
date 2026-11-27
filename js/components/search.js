/**
 * components/search.js — live search box in the header.
 * Type → shows matching cities, places and experiences (TravelDB.search).
 *
 *   App.search.render(text)   show results for the text
 *   App.search.close()        hide results and clear the box
 *
 * Owner: Functionality team (Members 2 & 3)
 */
(function (App) {
  const { $, esc, img, t } = App;

  function close() {
    const box = $('#search-results'), input = $('#search-input');
    if (box) box.classList.remove('open');
    if (input) input.value = '';
  }

  function render(q) {
    const box = $('#search-results');
    if (!q.trim()) { box.classList.remove('open'); return; }
    const r = TravelDB.search(q, 6);
    const item = (src, title, sub, href) =>
      `<a class="sr-item" href="${href}">${img(src)}<div><b>${esc(title)}</b><span>${esc(sub)}</span></div></a>`;
    let html = '';
    if (r.cities.length) html += `<div class="sr-group">${t('cities')}</div>` + r.cities.map((c) => item(c.image, c.name, c.country, `home.html?city=${c.id}`)).join('');
    if (r.locations.length) html += `<div class="sr-group">${t('places')}</div>` + r.locations.map((l) => item(l.image, l.name, TravelDB.city(l.cityId).name, `home.html?city=${l.cityId}&place=${l.id}#all`)).join('');
    if (r.experiences.length) html += `<div class="sr-group">${t('experiences')}</div>` + r.experiences.map((e) => item(e.image, e.name, `${TravelDB.city(e.cityId).name} · ${t('from')} ${TravelDB.formatPrice(e.price)}`, `experience.html?id=${e.id}`)).join('');
    box.innerHTML = html || `<div class="sr-group">${t('noResults')}</div>`;
    box.classList.add('open');
  }

  // click outside the search box or press Esc → close
  document.addEventListener('click', (ev) => {
    if (ev.target.closest('.search, [data-fav], [data-rail], [data-exp]')) return;
    const box = $('#search-results'); if (box) box.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  App.search = { render, close };
  App.closeSearch = close;   // short name used by pages
})(window.App);
