/**
 * components/cards.js — HTML templates for the three card types (styles: css/components/cards.css)
 *
 *   App.experienceCard(exp)   ticket / tour card: photo, badge, heart, glass rating pill, price
 *   App.placeCard(place)      tall photo card for a must-see place (glass name panel + rating pill)
 *   App.picCard(item, cityId) photo card for "<City> in pictures" (place or experience)
 *
 * Clicking anything with data-exp="<id>" opens experience.html?id=<id>.
 * Owner: Functionality team (Members 2 & 3) · look: UI — Boudy
 */
(function (App) {
  const { esc, img, ICON, t } = App;
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>';

  function experienceCard(e) {
    const deal = e.price.discountPercent > 0;
    const rating = e.rating
      ? `<span class="glass-rate">${STAR}<b>${e.rating}</b><small>(${e.reviewCount.toLocaleString()})</small></span>`
      : `<span class="glass-rate glass-rate--new">${t('new')}</span>`;
    return `
      <article class="card" data-exp="${e.id}">
        <div class="card__img">
          ${img(e.image, e.name)}
          ${deal ? `<span class="badge badge--deal">${t('off', { n: e.price.discountPercent })}</span>`
                 : e.bookedCount > 50000 ? `<span class="badge">${t('bestseller')}</span>` : ''}
          <button class="heart ${App.fav.has(e.id) ? 'on' : ''}" data-fav="${e.id}" aria-label="${t('favorites')}">${ICON.heart}</button>
          ${rating}
        </div>
        <span class="card__cat">${esc(e.subcategory || e.category || 'Experience')}</span>
        <h3 class="card__title">${esc(e.name)}</h3>
        ${e.freeCancellation ? `<span class="tag-free">✓ ${t('freeCancel')}</span>` : ''}
        <div class="price">
          ${t('from')} ${deal ? `<s>${App.money(e.price.original)}</s>` : ''}<strong>${TravelDB.formatPrice(e.price)}</strong>${deal ? `<span class="off">${t('save', { n: e.price.discountPercent })}</span>` : ''}
        </div>
      </article>`;
  }

  function placeCard(l) {
    const n = l.experienceCount;
    return `
      <article class="place" data-place="${l.id}" data-place-city="${l.cityId}">
        ${img(l.image, l.name)}
        ${l.rating ? `<span class="glass-rate place__rate">${STAR}<b>${Number(l.rating).toLocaleString(App.lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b></span>` : ''}
        <div class="place__body">
          <h3>${esc(l.name)}</h3>
          <span>${n === 1 ? t('exp1') : t('expN', { n })}${l.startingPrice ? ` · ${t('from')} ${TravelDB.formatPrice(l.startingPrice)}` : ''}</span>
        </div>
      </article>`;
  }

  /** item = a place or an experience with `exp: true|false` added */
  function picCard(it, cityId) {
    const attrs = it.exp ? `data-exp="${it.id}"` : `data-place="${it.id}" data-place-city="${cityId}"`;
    return `<article class="pic" ${attrs} tabindex="0" role="link" aria-label="${esc(it.name)}" title="${esc(it.name)}">
        ${img(it.image, it.name)}
        ${it.exp ? `<button class="heart ${App.fav.has(it.id) ? 'on' : ''}" data-fav="${it.id}" aria-label="${esc(t('favorites'))}">${ICON.heart}</button>` : ''}
        <span class="pic__bar">
          <span class="pic__name">${ICON.pin}<span>${esc(it.name)}</span></span>
          ${it.rating ? `<span class="pic__rate">${STAR}${Number(it.rating).toLocaleString(App.lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>` : ''}
        </span>
      </article>`;
  }

  // open an experience when its card is clicked (the heart inside is handled by favorites.js)
  document.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-fav]')) return;
    const exp = ev.target.closest('[data-exp]');
    if (exp) location.href = `experience.html?id=${exp.dataset.exp}`;
  });
  // keyboard: Enter on a focused photo card opens it
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('pic')) e.target.click(); });

  Object.assign(App, { experienceCard, placeCard, picCard });
})(window.App);
