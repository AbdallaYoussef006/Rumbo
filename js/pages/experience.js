/**
 * pages/experience.js — one experience in detail (experience.html?id=<id>)
 *   - Breadcrumb, photo, rating, facts, included features, map
 *   - Booking box with price and "Save to my trip"
 *   - Similar experiences in the same city
 * Owner: Functionality team (Members 2 & 3)
 */
App.start(() => {
  const { $, esc, img, params, ICON, fav, experienceCard } = App;
  const e = TravelDB.experience(params.get('id'));

  App.renderHeader({ city: e ? e.cityId : undefined });
  App.renderFooter();

  if (!e) {
    $('#page').innerHTML = `
      <div class="notice">
        <h2>Experience not found</h2>
        <p>This experience doesn't exist in our database. It may have been removed, or the link is wrong.</p>
        <a class="btn" href="home.html">Browse experiences</a>
      </div>`;
    return;
  }

  const city = TravelDB.city(e.cityId);
  const place = e.locationId ? TravelDB.location(e.locationId, e.cityId) : null;
  const deal = e.price.discountPercent > 0;
  document.title = `${e.name} — Rumbo`;

  const facts = [
    ['Category', e.subcategory || e.category],
    ['Duration', e.duration === 'Flexible' ? 'Flexible — go at your own pace' : 'See details'],
    ['Booked by', `${e.bookedCount.toLocaleString()} travelers`],
    ['Cancellation', e.freeCancellation ? 'Free cancellation' : 'Non-refundable'],
  ];
  const similar = TravelDB.experiences({ city: e.cityId, category: e.category, sort: 'rating' })
    .filter((x) => x.id !== e.id).slice(0, 4);
  const hasMap = typeof e.lat === 'number' && typeof e.lng === 'number';
  const d = 0.01;

  $('#page').innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="home.html?city=${city.id}">${esc(city.name)}</a><span>›</span>
      ${place && place.cityId === city.id && place.experienceIds.length ? `<a href="home.html?city=${city.id}&place=${place.id}#all">${esc(place.name)}</a><span>›</span>` : ''}
      <span>${esc(e.subcategory || e.category || 'Experience')}</span>
    </nav>

    <div class="exp">
      <div>
        <div class="exp__img">${img(e.image, e.name, 'style="cursor:default"')}</div>
        <span class="card__cat" style="display:block;margin-top:18px">${esc(city.name)}, ${esc(city.country)}</span>
        <h1>${esc(e.name)}</h1>
        <div class="exp__meta">
          ${e.rating ? `<span class="rating">${ICON.star}<b>${e.rating}</b> (${e.reviewCount.toLocaleString()} reviews)</span>` : '<span class="rating"><b style="color:var(--brand)">New experience</b></span>'}
          ${e.bookedCount > 50000 ? '<span class="badge" style="position:static">Bestseller</span>' : ''}
          ${e.isCombo ? '<span class="badge" style="position:static">Combo deal</span>' : ''}
        </div>

        <div class="facts">${facts.map(([k, v]) => `<div class="fact"><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>

        ${e.features.length ? `<h3 style="margin:8px 0 10px">What's included</h3>
          <ul class="features">${e.features.map((f) => `<li>✓ ${esc(f)}</li>`).join('')}</ul>` : ''}

        ${hasMap ? `<h3 style="margin:22px 0 0">Location</h3>
          <div class="map"><iframe title="Map" loading="lazy"
            src="https://www.openstreetmap.org/export/embed.html?bbox=${e.lng - d}%2C${e.lat - d}%2C${e.lng + d}%2C${e.lat + d}&layer=mapnik&marker=${e.lat}%2C${e.lng}"></iframe></div>` : ''}
      </div>

      <aside class="book">
        <div class="price">
          from ${deal ? `<s>${App.money(e.price.original)}</s>` : ''}<br><strong>${TravelDB.formatPrice(e.price)}</strong>
          <span style="color:var(--ink-3)"> / person</span>
          ${deal ? `<div class="off" style="margin:6px 0 0">Save ${e.price.discountPercent}% today</div>` : ''}
        </div>
        <button class="btn btn--ghost ${fav.has(e.id) ? 'on' : ''}" id="save-btn">${ICON.heart}<span>${fav.has(e.id) ? 'Saved to my trip' : 'Save to my trip'}</span></button>
        <a class="btn" href="my-trip.html">View my trip</a>
        <small>Prices are per person in USD and may change. ${e.freeCancellation ? 'Free cancellation available.' : ''}</small>
      </aside>
    </div>

    ${similar.length ? `
    <section>
      <div class="sec-head"><div><h2>More ${esc((e.category || 'experiences').toLowerCase())} in ${esc(city.name)}</h2><p>Top rated in the same category</p></div></div>
      <div class="grid">${similar.map(experienceCard).join('')}</div>
    </section>` : ''}`;

  const btn = $('#save-btn');
  const paint = (on) => { btn.classList.toggle('on', on); btn.querySelector('span').textContent = on ? 'Saved to my trip' : 'Save to my trip'; };
  btn.addEventListener('click', () => paint(fav.toggle(e.id)));
  document.addEventListener('favorites-changed', (ev) => { if (ev.detail.id === e.id) paint(ev.detail.on); });
});
