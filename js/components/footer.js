/**
 * components/footer.js — builds the dark footer on every page.
 *   App.renderFooter()
 * Styles: css/components/footer.css · Owner: UI — Boudy
 */
(function (App) {
  const { t } = App;

  function renderFooter() {
    const f = document.createElement('footer');
    f.innerHTML = `
      <div class="wrap">
        <div class="foot">
          <div>
            <img class="foot__logo" src="assets/logo/rumbo-logo-cream.png" alt="Rumbo — Travel &amp; Tours" width="150" height="50">
            <p style="margin:0;max-width:300px;line-height:1.6">${t('tagline')}</p>
          </div>
          <div><h4>${t('explore')}</h4><a href="home.html#destinations">${t('destinations')}</a><a href="home.html#all">${t('experiences')}</a><a href="planner.html">${t('planner')}</a></div>
          <div><h4>${t('yourTrip')}</h4><a href="my-trip.html">${t('favorites')}</a></div>
          <div><h4>${t('about')}</h4><a href="about.html">${t('ourTeam')}</a><a href="about.html#project">${t('project')}</a></div>
        </div>
        <div class="foot__bottom"><span>© 2026 Rumbo · Nile University</span><span>${t('pricesIn', { c: window.Locale.currency })}</span></div>
      </div>`;
    document.body.append(f);
  }

  App.renderFooter = renderFooter;
})(window.App);
