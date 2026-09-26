import { CITIES, getStoreInstagramHandle, getStoreInstagramLabel, STORES } from './cities.js';
import { brandInitial, escapeHtml } from './frame.js';
import { formatInstagramUrl } from './staff.js';

let mapInstance = null;
let storeMarkers = [];

const BRAND_COLORS = {
  Hermès: '#f97316',
  Omega: '#ef4444',
  Chanel: '#f5f5f5',
  Cartier: '#dc2626',
  Rolex: '#166534',
  Dior: '#a8a29e',
  Tiffany: '#0891b2',
  'Louis Vuitton': '#92400e',
  YSL: '#374151',
};

export function appleMapsUrl(store) {
  const params = new URLSearchParams({
    daddr: `${store.lat},${store.lng}`,
    ll: `${store.lat},${store.lng}`,
    q: store.name,
  });
  return `https://maps.apple.com/?${params.toString()}`;
}

export function uberUrl(store) {
  let url = 'https://m.uber.com/ul/?action=setPickup&pickup=my_location';
  url += `&dropoff[nickname]=${encodeURIComponent(store.name)}`;
  url += `&dropoff[formatted_address]=${encodeURIComponent(store.address)}`;
  url += `&dropoff[latitude]=${store.lat}&dropoff[longitude]=${store.lng}`;
  return url;
}

function openNavigation(url) {
  window.location.href = url;
}

export function openAppleMaps(store) {
  openNavigation(appleMapsUrl(store));
}

export function openUber(store) {
  openNavigation(uberUrl(store));
}

export function storeNavActionsMarkup() {
  return `
    <div class="store-nav-actions">
      <button type="button" class="btn btn-primary full-width map-apple-btn">Apple Maps</button>
      <button type="button" class="btn btn-secondary full-width map-uber-btn uber-btn">Uber</button>
    </div>`;
}

export function storeInstagramMarkup(store) {
  const handle = getStoreInstagramHandle(store);
  if (!handle) return '';
  const label = getStoreInstagramLabel(store);
  return `
    <a class="map-callout-instagram contact-link" href="${escapeHtml(formatInstagramUrl(handle))}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

export function bindStoreNavActions(container, store) {
  container.querySelector('.map-apple-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    openAppleMaps(store);
  });
  container.querySelector('.map-uber-btn')?.addEventListener('click', (event) => {
    event.stopPropagation();
    openUber(store);
  });
}

function createStayPin(label, count) {
  const countHtml = typeof count === 'number' ? `<span class="stay-pin-count">${count}</span>` : '';
  return window.L.divIcon({
    className: 'stay-pin-wrap',
    html: `<div class="stay-pin"><span class="stay-pin-mark">${label}</span>${countHtml}</div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -20],
  });
}

function mostCommonBrand(stores) {
  const counts = new Map();
  for (const store of stores) counts.set(store.brand, (counts.get(store.brand) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || stores[0]?.brand || '';
}

export function destroyMap() {
  if (mapInstance) {
    mapInstance.stop();
    mapInstance.remove();
    mapInstance = null;
    storeMarkers = [];
  }
}

export function initStoreMap(stores, city, { onOpenStore } = {}) {
  if (typeof window.L === 'undefined') return;
  const container = document.getElementById('restaurant-map');
  if (!container) return;

  destroyMap();
  mapInstance = window.L.map(container, {
    zoomControl: false,
    attributionControl: true,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
  }).setView([city.center.lat, city.center.lng], city.zoom);
  window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(mapInstance);

  const loadingEl = document.getElementById('map-loading');
  const emptyEl = document.getElementById('map-empty');
  if (loadingEl) loadingEl.hidden = true;

  if (!stores.length) {
    if (emptyEl) {
      emptyEl.textContent = 'No boutiques in this city.';
      emptyEl.hidden = false;
    }
    setTimeout(() => mapInstance?.invalidateSize(), 100);
    return;
  }

  if (emptyEl) emptyEl.hidden = true;

  const byCity = new Map();
  for (const store of stores) {
    if (!byCity.has(store.cityId)) byCity.set(store.cityId, []);
    byCity.get(store.cityId).push(store);
  }
  const clusterCities = byCity.size > 1;

  const openButton = (store) =>
    `<button type="button" class="btn btn-secondary full-width" data-open-store="${escapeHtml(store.id)}">Open</button>`;

  const bindOpen = (popup) => {
    popup.querySelectorAll('[data-open-store]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpenStore?.(button.dataset.openStore);
      });
    });
  };

  if (clusterCities) {
    for (const [cityId, cityStores] of byCity) {
      const place = CITIES.find((entry) => entry.id === cityId);
      if (!place) continue;
      const brand = mostCommonBrand(cityStores);
      const marker = window.L.marker([place.center.lat, place.center.lng], {
        icon: createStayPin(escapeHtml(brandInitial(brand)), cityStores.length),
      });
      const popup = document.createElement('div');
      popup.className = 'map-callout';
      popup.innerHTML = `
        <div class="map-callout-name">${escapeHtml(place.name)}</div>
        <div class="map-callout-address">${cityStores.length} boutiques</div>
        ${cityStores
          .map(
            (store) => `
          <button type="button" class="map-city-store" data-open-store="${escapeHtml(store.id)}">${escapeHtml(store.name)}</button>`,
          )
          .join('')}
      `;
      bindOpen(popup);
      marker.bindPopup(popup, { className: 'map-popup', maxWidth: 260 });
      marker.addTo(mapInstance);
      storeMarkers.push(marker);
    }
  } else {
    for (const store of stores) {
      const marker = window.L.marker([store.lat, store.lng], {
        icon: createStayPin(escapeHtml(brandInitial(store.brand))),
      });
      const popup = document.createElement('div');
      popup.className = 'map-callout';
      popup.innerHTML = `
        <div class="map-callout-name">${escapeHtml(store.name)}</div>
        <div class="map-callout-address">${escapeHtml(store.address)}</div>
        <div class="map-callout-status"><span class="map-legend-dot" style="background:${BRAND_COLORS[store.brand] || '#d4a054'}"></span> ${escapeHtml(store.brand)}</div>
        ${storeInstagramMarkup(store)}
        ${openButton(store)}
        ${storeNavActionsMarkup()}
      `;
      bindStoreNavActions(popup, store);
      bindOpen(popup);
      marker.bindPopup(popup, { className: 'map-popup', maxWidth: 260 });
      marker.addTo(mapInstance);
      storeMarkers.push(marker);
    }
  }

  if (storeMarkers.length) {
    mapInstance.invalidateSize();
    const height = mapInstance.getSize().y || container.clientHeight || 800;
    mapInstance.fitBounds(window.L.featureGroup(storeMarkers).getBounds().pad(0.2), {
      paddingTopLeft: [28, 96],
      paddingBottomRight: [28, Math.round(height * 0.48)],
    });
  }

  document.getElementById('map-locate-btn')?.addEventListener('click', () => locateUser(stores));

  setTimeout(() => mapInstance?.invalidateSize(), 100);
}

function locateUser(stores) {
  const btn = document.getElementById('map-locate-btn');
  const statusEl = document.getElementById('map-status');
  if (!navigator.geolocation || !mapInstance) return;
  btn?.classList.add('is-busy');
  btn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const points = [[lat, lng], ...stores.map((s) => [s.lat, s.lng])];
      mapInstance.fitBounds(window.L.latLngBounds(points), { padding: [36, 36], maxZoom: 14 });
      if (statusEl) statusEl.hidden = true;
      btn?.classList.remove('is-busy');
      btn.disabled = false;
    },
    () => {
      if (statusEl) {
        statusEl.textContent = 'Location unavailable';
        statusEl.dataset.tone = 'warn';
        statusEl.hidden = false;
      }
      btn?.classList.remove('is-busy');
      btn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

export function mapLegendMarkup() {
  return `
    <div class="map-legend">
      <div class="map-legend-items">
        ${Object.entries(BRAND_COLORS)
          .filter(([brand]) => STORES.some((store) => store.brand === brand))
          .map(
            ([brand, color]) =>
              `<span class="map-legend-item"><span class="map-legend-dot" style="background:${color}"></span>${brand}</span>`,
          )
          .join('')}
      </div>
    </div>`;
}
