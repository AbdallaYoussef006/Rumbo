/**
 * components/header.js — builds the top bar on every page.
 *
 *   App.renderHeader({ city, onCityChange, overPhoto })
 *     city          city selected in the picker (default: ?city= or Cairo)
 *     onCityChange  function(cityId) — if missing, changing city opens home.html?city=…
 *     overPhoto     CSS selector of a hero photo (home page): the bar is clear glass
 *                   with white text until the photo is scrolled past
 *
 * Contains: logo (→ splash screen) · city picker · live search · language & currency ·
 * light/dark switch · Destinations · Trip planner · favourites counter · Sign in / user.
 * Uses: search.js, locale-picker.js, theme-switch.js, favorites.js
 * Styles: css/components/header.css · Owner: UI — Boudy · logic — Functionality team (Members 2 & 3)
 */
(function (App) {
  const { $, esc, ICON, t, params } = App;

  /* Signed-in user (saved by js/features/auth.js after a successful sign-in) */
  function currentUser() { try { return JSON.parse(localStorage.getItem('rumbo:user')); } catch { return null; } }
  function userChip() {
    const u = currentUser();
    if (!u) return `<a class="sign-in-link hide-md nav-ic" href="index.html#login">${ICON.user}<span>${t('signIn')}</span></a>`;
    const initial = esc((u.name || u.email || '?').trim().charAt(0).toUpperCase());
    const pic = u.photo ? `<img src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
    return `<span class="user-chip" title="${esc(u.email)}"><span class="user-chip__avatar">${initial}${pic}</span>` +
           `<span class="user-chip__name hide-md">${esc((u.name || '').split(' ')[0])}</span>` +
           `<button type="button" class="user-chip__out" id="logout-btn">${t('logOut')}</button></span>`;
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#logout-btn')) return;
    try { localStorage.removeItem('rumbo:user'); } catch { /* ignore */ }
    location.href = 'index.html';
  });

  function renderHeader(opts = {}) {
    const city = opts.city || params.get('city') || 'cairo';
    const header = document.createElement('header');
    header.className = 'header';
    header.innerHTML = `
      <div class="wrap header__row">
        <a class="logo" href="index.html" aria-label="Rumbo — Travel &amp; Tours, back to the start screen" title="Back to the start screen"><img class="logo__img logo__img--light" src="assets/logo/rumbo-logo-navy.png" alt="Rumbo — Travel &amp; Tours" width="132" height="44"><img class="logo__img logo__img--dark" src="assets/logo/rumbo-logo-cream.png" alt="" width="132" height="44"></a>
        <label class="city-pick">${ICON.pin}<select id="city-select" aria-label="Choose city">
          ${TravelDB.countries().map((co) => `<optgroup label="${esc(co.name)}">${co.cityIds.map((id) => {
            const c = TravelDB.city(id);
            return `<option value="${c.id}" ${c.id === city ? 'selected' : ''}>${esc(c.name)}</option>`;
          }).join('')}</optgroup>`).join('')}
        </select></label>
        <div class="search">
          ${ICON.search}
          <input id="search-input" type="search" placeholder="${esc(t('search'))}" autocomplete="off">
          <div class="search__results" id="search-results"></div>
        </div>
        <nav class="nav">
          ${App.localeButton()}
          ${App.themeSwitch()}
          <a class="hide-md nav-ic" href="home.html?city=${city}#destinations">${ICON.plane}<span>${t('destinations')}</span></a>
          <a class="hide-md nav-ic" href="planner.html">${ICON.calendar}<span>${t('planner')}</span></a>
          <a class="fav-link" href="my-trip.html" title="${t('myTrip')}">${ICON.heart}<span class="fav-count" id="fav-count">0</span></a>
          ${userChip()}
        </nav>
      </div>`;
    document.body.prepend(header);

    $('#city-select').addEventListener('change', (e) => {
      App.search.close();
      if (opts.onCityChange) opts.onCityChange(e.target.value);
      else location.href = `home.html?city=${e.target.value}`;
    });
    $('#search-input').addEventListener('input', (e) => App.search.render(e.target.value));
    App.theme.init();
    App.localePicker.init();

    // labels -> icons only when the bar can't fit everything (small screen, zoom, long language)
    const row = header.querySelector('.header__row');
    const fitNav = () => {
      header.classList.remove('nav-compact');
      if (row.scrollWidth > row.clientWidth + 1) header.classList.add('nav-compact');
    };
    fitNav();
    addEventListener('resize', fitNav);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNav);

    // home page: clear glass with white text over the photo, until it is scrolled past
    if (opts.overPhoto) {
      document.body.classList.add('has-photo-header');
      const wide = matchMedia('(min-width: 761px)');
      const update = () => {
        const photo = document.querySelector(opts.overPhoto);
        const limit = photo ? photo.getBoundingClientRect().bottom - header.offsetHeight - 40 : 0;
        header.classList.toggle('on-photo', wide.matches && limit > 0);
      };
      addEventListener('scroll', update, { passive: true });
      addEventListener('resize', update);
      update();
    }
    App.updateFavCount();
  }

  App.renderHeader = renderHeader;
})(window.App);
