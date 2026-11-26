/**
 * pages/home.js — the main page for one city (home.html)
 *   - Hero: city photo (assets/img/hero/<city>.jpg) + glass panel with stats
 *   - Search bar: When · Guests · Filters (date + guests saved as "rumbo:trip-search" for the trip planner)
 *   - "<City> in pictures" photo cards
 *   - Top experiences + must-see places rails
 *   - All experiences: category chips, filters (free cancellation, deals, under $50), sort, place filter (?place=)
 *   - Destinations grid (18 cities, "Show all 40")
 * Owner: UI — Boudy · logic — Functionality team (Members 2 & 3)
 */
App.start(() => {
  const { $, esc, img, params, ICON, experienceCard, placeCard, t, money } = App;
  $('#chip-under50').textContent = t('under', { p: money(50, true) });   // the filter itself stays at US$50

  const state = {
    city: TravelDB.city(params.get('city') || '') ? params.get('city') : 'cairo',
    place: params.get('place') ? Number(params.get('place')) : null,
    category: '',
    sort: 'popularity',
    free: false,
    deals: false,
    under50: false,
  };
  if (state.place && !TravelDB.location(state.place, state.city)) state.place = null;

  App.renderHeader({ city: state.city, overPhoto: '#hero', onCityChange: setCity });
  App.renderFooter();

  function renderCategories() {
    const cats = TravelDB.categories(state.city);
    $('#cat-strip').innerHTML = ['', ...cats].map((c) =>
      `<button class="cat ${c === state.category ? 'on' : ''}" data-cat="${esc(c)}">${c ? esc(c) : esc(t('allThings'))}</button>`).join('');
  }

  /* ---------- Hero: the city's main photo + search bar ---------- */
  const HERO_ICON = {
    people: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7.5" r="4"/><path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path d="M14.6 2.9a2 2 0 0 1 2.8 0l3.7 3.7a2 2 0 0 1 0 2.8l-.9.9a2.3 2.3 0 0 0-3.2 3.2L9.4 21.1a2 2 0 0 1-2.8 0l-3.7-3.7a2 2 0 0 1 0-2.8l.9-.9a2.3 2.3 0 0 0 3.2-3.2zM12 7.5l4.5 4.5" stroke="#000" stroke-opacity=".25" stroke-width="1.2" stroke-dasharray="1.6 1.6"/></svg>',
    tag: '<svg viewBox="0 0 24 24"><path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h6.4a2 2 0 0 1 1.4.6l8.6 8.6a2 2 0 0 1 0 2.8l-6.5 6.5a2 2 0 0 1-2.8 0L3 12.9a2 2 0 0 1-.6-1.4zM8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill-rule="evenodd"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>',
  };

  function renderHero() {
    const c = TravelDB.city(state.city);
    $('#hero-kicker').innerHTML = `${ICON.pin}${esc(t('discover', { country: c.country }))}`;
    // "Things to do in <Cairo>" — the city name is coloured, in every language
    const [before, after = ''] = t('thingsTo', { city: '\u0000' }).split('\u0000');
    $('#hero-title').innerHTML = `${esc(before)}<span class="hero__city">${esc(c.name)}</span>${esc(after)}`;
    $('#hero-sub').textContent = t('heroSub', { city: c.name });
    const rated = TravelDB.experiences({ city: c.id }).filter((e) => e.rating);
    const avg = rated.length ? (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toLocaleString(App.lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—';
    const stat = (icon, value, label) => `<div class="hero__stat"><span class="hero__ic" aria-hidden="true">${icon}</span><span><b>${value}</b>${label}</span></div>`;
    $('#hero-stats').innerHTML =
      stat(HERO_ICON.people, `${c.experienceCount}+`, t('statTop')) +
      stat(HERO_ICON.ticket, c.locationCount, t('statPlaces')) +
      stat(HERO_ICON.tag, money(c.priceFrom), t('statPrice')) +
      stat(HERO_ICON.star, avg, t('statRating'));
    document.title = `${t('thingsTo', { city: c.name })} — Rumbo`;

    // big hero photo: assets/img/hero/<city>.jpg — falls back to the normal city photo if it's missing
    $('#hero-slides').innerHTML = `<div class="hero__slide on"><img fetchpriority="high" src="assets/img/hero/${c.id}.jpg" alt="${esc(c.name)}"
      onerror="this.onerror=function(){this.onerror=null;this.src='assets/img/placeholder.svg'};this.src='${esc(c.image)}'"></div>`;
    renderHeroSearch();
  }

  /* Search bar. Date and travelers are saved as "rumbo:trip-search" so the Trip planner can use them. */
  const tripSearch = (() => { try { return JSON.parse(localStorage.getItem('rumbo:trip-search')) || {}; } catch { return {}; } })();
  const saveTripSearch = () => { try { localStorage.setItem('rumbo:trip-search', JSON.stringify(tripSearch)); } catch { /* private mode */ } };
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  if (tripSearch.date && tripSearch.date < today) delete tripSearch.date;   // a past date is no longer useful
  const guests = Math.min(10, Math.max(1, Number(tripSearch.guests) || 1));

  $('#hs-date').min = today;
  $('#hs-date').value = tripSearch.date || '';
  $('#hs-guests').innerHTML = Array.from({ length: 10 }, (_, k) => k + 1)
    .map((n) => `<option value="${n}" ${n === guests ? 'selected' : ''}>${n === 1 ? t('trav1') : t('travN', { n })}</option>`).join('');

  function renderHeroSearch() {
    const d = $('#hs-date').value;
    $('#hs-date-text').textContent = d
      ? new Date(d + 'T12:00').toLocaleDateString(App.lang, { day: 'numeric', month: 'short' })
      : t('anyDate');
    const g = Number($('#hs-guests').value);
    $('#hs-guests-text').textContent = g === 1 ? t('trav1') : t('travN', { n: g });
    const cats = TravelDB.categories(state.city);
    $('#hs-type').innerHTML = `<option value="">${esc(t('allTypes'))}</option>` +
      cats.map((cat) => `<option value="${esc(cat)}" ${cat === state.category ? 'selected' : ''}>${esc(cat)}</option>`).join('');
    $('#hs-type-text').textContent = state.category || t('allTypes');
  }
  // open the native picker when the field is clicked (the real input is invisible on top)
  $('#hs-date').addEventListener('click', (e) => { try { e.target.showPicker(); } catch { /* the browser opens it by itself */ } });
  $('#hs-date').onchange = () => { tripSearch.date = $('#hs-date').value || undefined; saveTripSearch(); renderHeroSearch(); };
  $('#hs-guests').onchange = () => { tripSearch.guests = Number($('#hs-guests').value); saveTripSearch(); renderHeroSearch(); };
  $('#hs-type').onchange = () => { $('#hs-type-text').textContent = $('#hs-type').value || t('allTypes'); };
  $('#hero-search').addEventListener('submit', (e) => {
    e.preventDefault();
    state.category = $('#hs-type').value;
    state.place = null;
    renderCategories(); renderGrid(); updateUrl();
    $('#all').scrollIntoView({ behavior: 'smooth' });
  });

  function renderRails() {
    const c = TravelDB.city(state.city);
    $('#top-title').textContent = t('topIn', { city: c.name });
    $('#places-title').textContent = t('placesIn', { city: c.name });
    $('#rail-top').innerHTML = TravelDB.experiences({ city: c.id, sort: 'popularity', limit: 10 }).map(experienceCard).join('');
    $('#rail-places').innerHTML = TravelDB.locations(c.id).map(placeCard).join('');
  }

  function renderGrid() {
    const c = TravelDB.city(state.city);
    let list = TravelDB.experiences({
      city: c.id,
      location: state.place ?? undefined,
      category: state.category || undefined,
      freeCancellation: state.free || undefined,
      maxPrice: state.under50 ? 50 : undefined,
      sort: state.sort,
    });
    if (state.deals) list = list.filter((e) => e.price.discountPercent > 0);

    const place = state.place ? TravelDB.location(state.place, state.city) : null;
    $('#place-filter').innerHTML = place
      ? `<span class="place-filter">${esc(place.name)} <button id="clear-place" aria-label="Clear place filter">×</button></span>` : '';
    $('#all-title').textContent = place ? t('at', { place: place.name })
      : state.category ? t('catIn', { cat: state.category, city: c.name }) : t('allIn', { city: c.name });
    $('#all-count').textContent = list.length === 1 ? t('res1') : t('resN', { n: list.length });
    $('#grid').innerHTML = list.length ? list.map(experienceCard).join('')
      : `<p class="empty">${esc(t('empty'))}</p>`;
    $('#chip-free').classList.toggle('on', state.free);
    $('#chip-deals').classList.toggle('on', state.deals);
    $('#chip-under50').classList.toggle('on', state.under50);
  }

  let showAllCities = false;
  function renderDestinations() {
    const all = TravelDB.cities();
    $('#dests').innerHTML = (showAllCities ? all : all.slice(0, 18)).map((c) => `
      <div class="dest ${c.id === state.city ? 'on' : ''}" data-city="${c.id}">
        <div class="dest__img">${img(c.image, c.name)}</div>
        <b>${esc(c.name)}</b><span>${esc(c.country)}</span>
      </div>`).join('');
    $('#dests-toggle').textContent = showAllCities ? t('showFewer') : t('showAll', { n: all.length });
    $('#dests-toggle').setAttribute('aria-expanded', String(showAllCities));
  }
  $('#dests-toggle').addEventListener('click', () => {
    showAllCities = !showAllCities;
    renderDestinations();
    if (!showAllCities) $('#destinations').scrollIntoView({ behavior: 'smooth' });
  });

  // City in pictures: places (open their experiences below) mixed with experiences (open the experience page)
  function renderPics() {
    const c = TravelDB.city(state.city);
    $('#pics-title').textContent = t('inPictures', { city: c.name });
    const places = TravelDB.locations(c.id).filter((l) => l.image).map((l) => ({ ...l, exp: false }));
    const exps = TravelDB.experiences({ city: c.id, sort: 'popularity' }).filter((e) => e.image).map((e) => ({ ...e, exp: true }));
    const items = [];   // place, experience, place, experience, ...
    while ((places.length || exps.length) && items.length < 16) {
      if (places.length) items.push(places.shift());
      if (exps.length) items.push(exps.shift());
    }
    $('#rail-pics').innerHTML = items.map((it) => App.picCard(it, c.id)).join('');
    $('#rail-pics').scrollLeft = 0;
  }

  function renderAll() { renderCategories(); renderHero(); renderPics(); renderRails(); renderGrid(); renderDestinations(); }

  function updateUrl() {
    const q = new URLSearchParams({ city: state.city });
    if (state.place) q.set('place', state.place);
    history.replaceState(null, '', `?${q}${location.hash}`);
  }

  function setCity(id) {
    Object.assign(state, { city: id, place: null, category: '' });
    $('#city-select').value = id;
    updateUrl();
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Page-specific clicks (cards, hearts and rails are handled in app.js)
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    const cat = t.closest('[data-cat]');
    if (cat) { state.category = cat.dataset.cat; renderCategories(); renderGrid(); renderHeroSearch(); $('#all').scrollIntoView({ behavior: 'smooth' }); return; }
    const place = t.closest('[data-place]');
    if (place) { state.place = Number(place.dataset.place); state.category = ''; renderCategories(); renderGrid(); updateUrl(); $('#all').scrollIntoView({ behavior: 'smooth' }); return; }
    if (t.closest('#clear-place')) { state.place = null; renderGrid(); updateUrl(); return; }
    const dest = t.closest('[data-city]');
    if (dest) { setCity(dest.dataset.city); }
  });

  $('#chip-free').onclick = () => { state.free = !state.free; renderGrid(); };
  $('#chip-deals').onclick = () => { state.deals = !state.deals; renderGrid(); };
  $('#chip-under50').onclick = () => { state.under50 = !state.under50; renderGrid(); };
  $('#sort-select').onchange = (e) => { state.sort = e.target.value; renderGrid(); };

  renderAll();
  if (location.hash === '#all' || state.place) setTimeout(() => $('#all').scrollIntoView(), 50);
  else if (location.hash === '#destinations') setTimeout(() => $('#destinations').scrollIntoView(), 50);
});
