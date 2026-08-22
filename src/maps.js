import { getStoreInstagramHandle, getStoreInstagramLabel } from './cities.js';
import { escapeHtml } from './frame.js';
import { formatInstagramUrl } from './staff.js';

let mapInstance = null;
let storeMarkers = [];

const BRAND_COLORS = {
  Hermès: '#f97316',
  Omega: '#ef4444',
  Chanel: '#f5f5f5',
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

function createMapIcon(color) {
  return window.L.divIcon({
    className: 'map-pin-wrap',
    html: `<div class="map-pin" style="background:${color}"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
}

export function destroyMap() {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    storeMarkers = [];
  }
}

export function initStoreMap(stores, city) {
  if (typeof window.L === 'undefined') return;
  const container = document.getElementById('restaurant-map');
  if (!container) return;

  destroyMap();
  mapInstance = window.L.map(container, { zoomControl: false }).setView(
    [city.center.lat, city.center.lng],
    city.zoom,
  );
  window.L.control.zoom({ position: 'topright' }).addTo(mapInstance);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
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

  for (const store of stores) {
    const marker = window.L.marker([store.lat, store.lng], {
      icon: createMapIcon(BRAND_COLORS[store.brand] || '#d4a054'),
    });
    const popup = document.createElement('div');
    popup.className = 'map-callout';
    popup.innerHTML = `
      <div class="map-callout-name">${escapeHtml(store.name)}</div>
      <div class="map-callout-address">${escapeHtml(store.address)}</div>
      <div class="map-callout-status"><span class="map-legend-dot" style="background:${BRAND_COLORS[store.brand]}"></span> ${escapeHtml(store.brand)}</div>
      ${storeInstagramMarkup(store)}
      ${storeNavActionsMarkup()}
    `;
    bindStoreNavActions(popup, store);
    marker.bindPopup(popup, {
      className: 'map-popup',
      maxWidth: 260,
    });
    marker.addTo(mapInstance);
    storeMarkers.push(marker);
  }

  if (storeMarkers.length) {
    mapInstance.fitBounds(window.L.featureGroup(storeMarkers).getBounds().pad(0.15));
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
          .map(
            ([brand, color]) =>
              `<span class="map-legend-item"><span class="map-legend-dot" style="background:${color}"></span>${brand}</span>`,
          )
          .join('')}
      </div>
    </div>`;
}
