/**
 * core/travelDB.js — tiny query layer over the travel dataset.
 *
 * Works two ways:
 *   1) <script src="data/database.js"></script> before this file  → no server needed
 *   2) Without it, TravelDB.load() fetches data/database.json      → needs a server
 *      (VS Code Live Server, `npx serve`, GitHub Pages…)
 *
 * Usage:
 *   await TravelDB.load();
 *   TravelDB.countries();                         // ranked countries
 *   TravelDB.cities({ country: 'eg' });           // cities in a country
 *   TravelDB.city('cairo');                       // one city
 *   TravelDB.locations('cairo');                  // top places that have experiences
 *   TravelDB.experiencesAt(placeId);              // experiences at one place
 *   TravelDB.experiences({ city: 'cairo', maxPrice: 50, sort: 'rating' });
 *   TravelDB.search('pyramids');                  // full-text over everything
 *   TravelDB.img(exp.image, 600);                 // resized image URL
 */
(function (global) {
  let db = null;

  const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const SORTS = {
    popularity: (a, b) => a.popularityRank - b.popularityRank,
    rating: (a, b) => (b.rating || 0) - (a.rating || 0) || b.reviewCount - a.reviewCount,
    reviews: (a, b) => b.reviewCount - a.reviewCount,
    booked: (a, b) => b.bookedCount - a.bookedCount,
    priceAsc: (a, b) => (a.price.from ?? Infinity) - (b.price.from ?? Infinity),
    priceDesc: (a, b) => (b.price.from ?? -1) - (a.price.from ?? -1),
    discount: (a, b) => b.price.discountPercent - a.price.discountPercent,
  };

  const TravelDB = {
    async load(url = 'data/database.json') {
      if (db) return db;
      if (global.TRAVEL_DB) return (db = global.TRAVEL_DB);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
      return (db = await res.json());
    },

    get meta() { return db.meta; },

    countries() { return db.countries; },

    country(id) { return db.countries.find((c) => c.id === norm(id) || c.code === id); },

    cities({ country } = {}) {
      return country ? db.cities.filter((c) => c.countryCode.toLowerCase() === norm(country)) : db.cities;
    },

    city(id) { return db.cities.find((c) => c.id === norm(id)); },

    /** Top places. By default only places that have experiences in the database. */
    locations(cityId, { all = false } = {}) {
      let list = cityId ? db.locations.filter((l) => l.cityId === norm(cityId)) : db.locations;
      if (!all) list = list.filter((l) => l.experienceIds && l.experienceIds.length);
      return list;
    },

    /** Experiences linked to one place, in popularity order. */
    experiencesAt(locationId, cityId) {
      const l = this.location(locationId, cityId);
      if (!l) return [];
      return db.experiences.filter((e) => e.cityId === l.cityId && l.experienceIds.includes(e.id));
    },

    /** One place. Pass cityId too: a few places (e.g. Pompeii) are listed under two cities. */
    location(id, cityId) {
      const c = cityId ? norm(cityId) : null;
      return db.locations.find((l) => l.id === Number(id) && (!c || l.cityId === c))
        || db.locations.find((l) => l.id === Number(id));
    },

    /**
     * Filter experiences.
     * @param {object} o
     * @param {string} [o.city]          city id, e.g. 'paris'
     * @param {string} [o.country]       country code, e.g. 'it'
     * @param {number} [o.location]      location id
     * @param {string} [o.category]      e.g. 'Tickets', 'Tours', 'Cruises'
     * @param {number} [o.minPrice]
     * @param {number} [o.maxPrice]
     * @param {number} [o.minRating]
     * @param {boolean}[o.freeCancellation]
     * @param {string} [o.sort]          popularity|rating|reviews|booked|priceAsc|priceDesc|discount
     * @param {number} [o.limit]
     */
    experiences(o = {}) {
      let list = db.experiences;
      if (o.city) list = list.filter((e) => e.cityId === norm(o.city));
      if (o.country) {
        const ids = new Set(this.cities({ country: o.country }).map((c) => c.id));
        list = list.filter((e) => ids.has(e.cityId));
      }
      if (o.location != null) {
        const l = this.location(o.location, o.city);
        const ids = new Set(l ? l.experienceIds : []);
        list = list.filter((e) => ids.has(e.id) && (!l || e.cityId === l.cityId));
      }
      if (o.category) list = list.filter((e) => norm(e.category) === norm(o.category) || norm(e.subcategory) === norm(o.category));
      if (o.minPrice != null) list = list.filter((e) => e.price.from != null && e.price.from >= o.minPrice);
      if (o.maxPrice != null) list = list.filter((e) => e.price.from != null && e.price.from <= o.maxPrice);
      if (o.minRating != null) list = list.filter((e) => (e.rating || 0) >= o.minRating);
      if (o.freeCancellation) list = list.filter((e) => e.freeCancellation);
      if (o.sort && SORTS[o.sort]) list = [...list].sort(SORTS[o.sort]);
      return o.limit ? list.slice(0, o.limit) : list;
    },

    experience(id) { return db.experiences.find((e) => e.id === Number(id)); },

    categories(cityId) {
      const set = new Set(this.experiences({ city: cityId }).map((e) => e.category).filter(Boolean));
      return [...set].sort();
    },

    search(q, limit = 30) {
      const t = norm(q).trim();
      if (!t) return { cities: [], locations: [], experiences: [] };
      const hit = (...f) => f.some((x) => norm(x).includes(t));
      return {
        cities: db.cities.filter((c) => hit(c.name, c.country)).slice(0, limit),
        locations: db.locations.filter((l) => l.experienceIds && l.experienceIds.length && hit(l.name, l.description)).slice(0, limit),
        experiences: db.experiences.filter((e) => hit(e.name, e.locationName, e.category, e.subcategory)).slice(0, limit),
      };
    },

    /** Load a resized version of a dataset image. */
    img(url, width = 600, height) {
      if (!url) return '';
      if (!/^https?:/.test(url)) return url; // local file: use as is
      const p = new URLSearchParams({ w: width, auto: 'format,compress', fit: 'crop' });
      if (height) p.set('h', height);
      return `${url}?${p}`;
    },

    formatPrice(price) {
      if (!price || price.from == null) return 'Unavailable';
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: price.currency || 'USD' }).format(price.from);
    },
  };

  global.TravelDB = TravelDB;
  if (typeof module !== 'undefined') module.exports = TravelDB;
})(typeof window !== 'undefined' ? window : globalThis);
