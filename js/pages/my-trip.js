/**
 * pages/my-trip.js — the saved favourites (my-trip.html)
 *   - Summary: count, total price per person, cities
 *   - Grid of saved experiences (updates when a heart is clicked)
 * Owner: Functionality team (Members 2 & 3)
 */
App.start(() => {
  const { $, fav, experienceCard } = App;
  App.renderHeader();
  App.renderFooter();

  function render() {
    const items = fav.all().map((id) => TravelDB.experience(id)).filter(Boolean);
    if (!items.length) {
      $('#summary').innerHTML = '';
      $('#list').innerHTML = `
        <div class="notice">
          <h2>No saved experiences yet</h2>
          <p>Tap the heart on any experience to save it here and build your trip.</p>
          <a class="btn" href="home.html">Find experiences</a>
        </div>`;
      return;
    }
    const total = items.reduce((s, e) => s + (e.price.from || 0), 0);
    const cities = [...new Set(items.map((e) => TravelDB.city(e.cityId).name))];
    $('#summary').innerHTML = `
      <div class="trip-sum">
        <div><b>${items.length}</b>saved experience${items.length === 1 ? '' : 's'}</div>
        <div><b>${App.money(total)}</b>total per person (from)</div>
        <div><b>${cities.length}</b>${cities.length === 1 ? 'city' : 'cities'}: ${cities.join(', ')}</div>
      </div>`;
    $('#list').innerHTML = `<div class="grid">${items.map(experienceCard).join('')}</div>`;
  }

  document.addEventListener('favorites-changed', render);
  render();
});
