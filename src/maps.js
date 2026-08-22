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

export function initStoreMap(stores, city, onOpenStore) {
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
      <button type="button" class="btn btn-primary full-width map-details-btn">View boutique</button>
      <a class="map-maps-link" href="${escapeHtml(appleMapsUrl(store))}" target="_blank" rel="noopener noreferrer">Open in Apple Maps</a>
    `;
    popup.querySelector('.map-details-btn')?.addEventListener('click', () => {
      mapInstance?.closePopup();
      onOpenStore?.(store.id);
    });
    popup.querySelector('.map-maps-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = appleMapsUrl(store);
    });
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

export function showNavigationPicker(store) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h2>Get directions</h2>
      <p class="modal-text">${escapeHtml(store.address)}</p>
      <div class="nav-actions">
        <button class="btn btn-primary full-width nav-btn" id="open-maps" type="button">Apple Maps</button>
        <button class="btn btn-secondary full-width nav-btn uber-btn" id="open-uber" type="button">Uber</button>
        <button class="btn btn-secondary full-width nav-btn" id="nav-cancel" type="button">Cancel</button>
      </div>
    </div>
  `;
  overlay.querySelector('#open-maps')?.addEventListener('click', () => {
    window.location.href = appleMapsUrl(store);
  });
  overlay.querySelector('#open-uber')?.addEventListener('click', () => {
    window.location.href = uberUrl(store);
  });
  overlay.querySelector('#nav-cancel')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
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
