import { CITIES, getStoreInstagramHandle, getStoreInstagramLabel, STORES } from './cities.js';
import { MAPKIT_JWT } from './config/mapkit.js';
import { brandInitial, escapeHtml } from './frame.js';
import { formatInstagramUrl } from './staff.js';

let mapInstance = null;
let mapEngine = null;
let storeMarkers = [];
let mapGeneration = 0;
let sheetListener = null;
let userCoordinate = null;
let mapkitPromise = null;
let mapkitUnavailable = false;
let fallbackWarned = false;

const MAPKIT_SCRIPT = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.core.js';
const MAPKIT_LIBRARIES = 'map,annotations,user-location';

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

function mostCommonBrand(stores) {
  const counts = new Map();
  for (const store of stores) counts.set(store.brand, (counts.get(store.brand) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || stores[0]?.brand || '';
}

function warnFallback(reason) {
  if (fallbackWarned) return;
  fallbackWarned = true;
  console.warn('MapKit unavailable; using OpenStreetMap.', reason || '');
}

function hideMapChrome(emptyMessage) {
  const loadingEl = document.getElementById('map-loading');
  const emptyEl = document.getElementById('map-empty');
  if (loadingEl) loadingEl.hidden = true;
  if (!emptyEl) return;
  if (emptyMessage) {
    emptyEl.textContent = emptyMessage;
    emptyEl.hidden = false;
  } else {
    emptyEl.hidden = true;
  }
}

function safeTopPx() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--safe-top') || '0';
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sheetInset(container) {
  const height = container.clientHeight || window.innerHeight || 844;
  const sheet = document.querySelector('#app .stay-sheet');
  const app = document.getElementById('app');
  let sheetTop = height * 0.55;
  if (sheet && app) {
    const top = sheet.getBoundingClientRect().top - app.getBoundingClientRect().top;
    if (Number.isFinite(top)) sheetTop = top;
  }
  const topPad = Math.round(safeTopPx() + 112);
  const desiredBottom = Math.max(48, Math.round(height - sheetTop + 16));
  const maxBottom = Math.max(48, height - topPad - 80);
  return {
    top: topPad,
    right: 24,
    bottom: Math.min(desiredBottom, maxBottom),
    left: 24,
  };
}

function bindOpen(root, onOpenStore) {
  root.querySelectorAll('[data-open-store]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onOpenStore?.(button.dataset.openStore);
    });
  });
}

function openButton(store) {
  return `<button type="button" class="btn btn-secondary full-width" data-open-store="${escapeHtml(store.id)}">Open</button>`;
}

function cityCallout(place, cityStores, onOpenStore) {
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
  bindOpen(popup, onOpenStore);
  return popup;
}

function storeCallout(store, onOpenStore) {
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
  bindOpen(popup, onOpenStore);
  return popup;
}

function pinGroups(stores) {
  const byCity = new Map();
  for (const store of stores) {
    if (!byCity.has(store.cityId)) byCity.set(store.cityId, []);
    byCity.get(store.cityId).push(store);
  }
  return { byCity, clusterCities: byCity.size > 1 };
}

function pinElement(label, count) {
  const el = document.createElement('div');
  el.className = 'stay-pin';
  const mark = document.createElement('span');
  mark.className = 'stay-pin-mark';
  mark.textContent = label;
  el.append(mark);
  if (typeof count === 'number') {
    const badge = document.createElement('span');
    badge.className = 'stay-pin-count';
    badge.textContent = String(count);
    el.append(badge);
  }
  return el;
}

function stayPinIcon(label, count) {
  const countHtml = typeof count === 'number' ? `<span class="stay-pin-count">${count}</span>` : '';
  return window.L.divIcon({
    className: 'stay-pin-wrap',
    html: `<div class="stay-pin"><span class="stay-pin-mark">${label}</span>${countHtml}</div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -20],
  });
}

function teardownEngine() {
  const engine = mapEngine;
  const instance = mapInstance;
  mapInstance = null;
  mapEngine = null;
  storeMarkers = [];
  userCoordinate = null;
  if (!instance) return;
  try {
    if (engine === 'leaflet') {
      instance.stop?.();
      instance.remove();
    } else {
      instance.destroy();
    }
  } catch (err) {
    console.warn('Map teardown failed', err);
  }
}

function resetContainer(container) {
  container.replaceChildren();
  container.className = 'stage-map';
}

export function destroyMap() {
  mapGeneration += 1;
  if (sheetListener) {
    window.removeEventListener('boutique-sheet-top', sheetListener);
    sheetListener = null;
  }
  teardownEngine();
}

function bindLocate() {
  document.getElementById('map-locate-btn')?.addEventListener('click', () => locateUser());
}

function applyMapPadding(animate) {
  const container = document.getElementById('restaurant-map');
  if (!container || !mapInstance) return;
  const inset = sheetInset(container);
  if (mapEngine === 'mapkit') {
    const padding = new window.mapkit.Padding(inset.top, inset.right, inset.bottom, inset.left);
    mapInstance.padding = padding;
    const items = [...storeMarkers];
    if (userCoordinate) items.push(userCoordinate);
    if (!items.length) return;
    try {
      mapInstance.showItems(items, { padding, animate: !!animate });
    } catch (err) {
      console.warn('MapKit could not fit pins', err);
    }
    return;
  }
  if (mapEngine === 'leaflet' && storeMarkers.length) {
    mapInstance.invalidateSize();
    mapInstance.fitBounds(window.L.featureGroup(storeMarkers).getBounds().pad(0.18), {
      paddingTopLeft: [inset.left, inset.top],
      paddingBottomRight: [inset.right, inset.bottom],
      animate: !!animate,
    });
  }
}

function loadMapKit() {
  if (mapkitUnavailable) return Promise.reject(new Error('MapKit unavailable'));
  if (!mapkitPromise) {
    mapkitPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => fail(new Error('MapKit load timed out')), 8000);
      let settled = false;
      const fail = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(err);
      };
      const succeed = () => {
        if (settled) return;
        if (!window.mapkit?.Map || !window.mapkit?.Annotation) {
          fail(new Error('MapKit libraries missing'));
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve(window.mapkit);
      };

      window.__boutiqueMapKitReady = () => {
        try {
          window.mapkit.init({
            authorizationCallback(done) {
              done(MAPKIT_JWT);
            },
          });
        } catch (err) {
          fail(err);
          return;
        }
        const onError = (event) => {
          window.mapkit.removeEventListener('error', onError);
          window.mapkit.removeEventListener('configuration-change', onReady);
          fail(new Error(event?.message || 'MapKit authorization failed'));
        };
        const onReady = () => {
          window.mapkit.removeEventListener('error', onError);
          window.mapkit.removeEventListener('configuration-change', onReady);
          succeed();
        };
        window.mapkit.addEventListener('error', onError);
        window.mapkit.addEventListener('configuration-change', onReady);
      };

      const script = document.createElement('script');
      script.src = MAPKIT_SCRIPT;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.libraries = MAPKIT_LIBRARIES;
      script.dataset.callback = '__boutiqueMapKitReady';
      script.addEventListener('error', () => fail(new Error('MapKit script failed to load')));
      document.head.appendChild(script);
    }).catch((err) => {
      mapkitPromise = null;
      mapkitUnavailable = true;
      throw err;
    });
  }
  return mapkitPromise;
}

function mountMapKit(container, stores, city, { onOpenStore }) {
  const mapkit = window.mapkit;
  const inset = sheetInset(container);
  const padding = new mapkit.Padding(inset.top, inset.right, inset.bottom, inset.left);
  const center = new mapkit.Coordinate(city.center.lat, city.center.lng);
  const span = new mapkit.CoordinateSpan(0.08, 0.08);
  const options = {
    region: new mapkit.CoordinateRegion(center, span),
    mapType: mapkit.Map.MapTypes?.Standard,
    showsZoomControl: false,
    showsMapTypeControl: false,
    showsUserLocationControl: false,
    isRotationEnabled: true,
    padding,
  };
  if (mapkit.Map.ColorSchemes?.Light) options.colorScheme = mapkit.Map.ColorSchemes.Light;
  if (mapkit.FeatureVisibility) {
    options.showsCompass = mapkit.FeatureVisibility.Adaptive;
    options.showsScale = mapkit.FeatureVisibility.Hidden;
  }

  const map = new mapkit.Map(container, options);
  mapInstance = map;
  mapEngine = 'mapkit';
  container.classList.add('mapkit-stage');

  const selectPin = (annotation, selected) => {
    annotation?.element?.classList.toggle('is-selected', selected);
  };
  map.addEventListener('select', (event) => selectPin(event.annotation, true));
  map.addEventListener('deselect', (event) => selectPin(event.annotation, false));

  const addPin = (lat, lng, label, count, callout) => {
    let element = null;
    const annotation = new mapkit.Annotation(new mapkit.Coordinate(lat, lng), () => {
      element = pinElement(label, count);
      return element;
    }, {
      size: { width: 48, height: 48 },
      anchorOffset: new DOMPoint(0, 0),
      callout: {
        calloutElementForAnnotation() {
          return callout();
        },
      },
    });
    annotation.addEventListener('select', () => (annotation.element || element)?.classList.add('is-selected'));
    annotation.addEventListener('deselect', () => (annotation.element || element)?.classList.remove('is-selected'));
    map.addAnnotation(annotation);
    storeMarkers.push(annotation);
  };

  if (!stores.length) {
    hideMapChrome('No boutiques in this city.');
    bindLocate();
    return;
  }

  const { byCity, clusterCities } = pinGroups(stores);
  if (clusterCities) {
    for (const [cityId, cityStores] of byCity) {
      const place = CITIES.find((entry) => entry.id === cityId);
      if (!place) continue;
      const brand = mostCommonBrand(cityStores);
      addPin(place.center.lat, place.center.lng, brandInitial(brand), cityStores.length, () =>
        cityCallout(place, cityStores, onOpenStore),
      );
    }
  } else {
    for (const store of stores) {
      addPin(store.lat, store.lng, brandInitial(store.brand), null, () => storeCallout(store, onOpenStore));
    }
  }

  hideMapChrome();
  applyMapPadding(false);
  bindLocate();
}

function mountLeaflet(container, stores, city, { onOpenStore }) {
  if (typeof window.L === 'undefined') {
    console.warn('OpenStreetMap fallback is unavailable.');
    hideMapChrome();
    return;
  }
  resetContainer(container);
  mapInstance = window.L.map(container, {
    zoomControl: false,
    attributionControl: true,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
  }).setView([city.center.lat, city.center.lng], city.zoom);
  mapEngine = 'leaflet';
  window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(mapInstance);

  if (!stores.length) {
    hideMapChrome('No boutiques in this city.');
    setTimeout(() => mapInstance?.invalidateSize(), 100);
    bindLocate();
    return;
  }

  const { byCity, clusterCities } = pinGroups(stores);
  if (clusterCities) {
    for (const [cityId, cityStores] of byCity) {
      const place = CITIES.find((entry) => entry.id === cityId);
      if (!place) continue;
      const brand = mostCommonBrand(cityStores);
      const marker = window.L.marker([place.center.lat, place.center.lng], {
        icon: stayPinIcon(escapeHtml(brandInitial(brand)), cityStores.length),
      });
      const popup = cityCallout(place, cityStores, onOpenStore);
      marker.bindPopup(popup, { className: 'map-popup', maxWidth: 260 });
      marker.on('popupopen', () => marker.getElement()?.querySelector('.stay-pin')?.classList.add('is-selected'));
      marker.on('popupclose', () => marker.getElement()?.querySelector('.stay-pin')?.classList.remove('is-selected'));
      marker.addTo(mapInstance);
      storeMarkers.push(marker);
    }
  } else {
    for (const store of stores) {
      const marker = window.L.marker([store.lat, store.lng], {
        icon: stayPinIcon(escapeHtml(brandInitial(store.brand))),
      });
      const popup = storeCallout(store, onOpenStore);
      marker.bindPopup(popup, { className: 'map-popup', maxWidth: 260 });
      marker.on('popupopen', () => marker.getElement()?.querySelector('.stay-pin')?.classList.add('is-selected'));
      marker.on('popupclose', () => marker.getElement()?.querySelector('.stay-pin')?.classList.remove('is-selected'));
      marker.addTo(mapInstance);
      storeMarkers.push(marker);
    }
  }

  hideMapChrome();
  applyMapPadding(false);
  bindLocate();
  setTimeout(() => mapInstance?.invalidateSize(), 100);
}

function placeUserDot(coordinate) {
  if (!mapInstance || mapEngine !== 'mapkit' || !window.mapkit?.Annotation) return;
  if (mapInstance.__userDot) {
    mapInstance.removeAnnotation(mapInstance.__userDot);
  }
  const dot = new window.mapkit.Annotation(coordinate, () => {
    const el = document.createElement('div');
    el.className = 'user-location-dot';
    return el;
  }, {
    size: { width: 18, height: 18 },
    anchorOffset: new DOMPoint(0, 0),
  });
  mapInstance.addAnnotation(dot);
  mapInstance.__userDot = dot;
}

function locateUser() {
  const btn = document.getElementById('map-locate-btn');
  const statusEl = document.getElementById('map-status');
  if (!navigator.geolocation || !mapInstance) return;
  btn?.classList.add('is-busy');
  if (btn) btn.disabled = true;
  const finish = () => {
    btn?.classList.remove('is-busy');
    if (btn) btn.disabled = false;
  };
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      if (mapEngine === 'mapkit' && window.mapkit) {
        userCoordinate = new window.mapkit.Coordinate(lat, lng);
        let showed = false;
        try {
          mapInstance.showsUserLocation = true;
          showed = mapInstance.showsUserLocation === true;
        } catch (err) {
          console.warn('MapKit user location annotation unavailable', err);
        }
        if (!showed) placeUserDot(userCoordinate);
        applyMapPadding(true);
      } else if (mapEngine === 'leaflet') {
        const points = [[lat, lng], ...storeMarkers.map((marker) => [marker.getLatLng().lat, marker.getLatLng().lng])];
        mapInstance.fitBounds(window.L.latLngBounds(points), { padding: [36, 36], maxZoom: 14 });
      }
      if (statusEl) statusEl.hidden = true;
      finish();
    },
    () => {
      if (statusEl) {
        statusEl.textContent = 'Location unavailable';
        statusEl.dataset.tone = 'warn';
        statusEl.hidden = false;
      }
      finish();
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

export async function initStoreMap(stores, city, { onOpenStore } = {}) {
  destroyMap();
  const generation = mapGeneration;
  const container = document.getElementById('restaurant-map');
  if (!container) return;

  const onSheet = () => {
    if (generation !== mapGeneration) return;
    applyMapPadding(true);
  };
  sheetListener = onSheet;
  window.addEventListener('boutique-sheet-top', onSheet);

  const alive = () => generation === mapGeneration && container.isConnected;

  if (!mapkitUnavailable) {
    try {
      await loadMapKit();
      if (!alive()) return;
      mountMapKit(container, stores, city, { onOpenStore });
      return;
    } catch (err) {
      if (!alive()) return;
      warnFallback(err?.message || err);
      teardownEngine();
      resetContainer(container);
    }
  } else if (alive()) {
    warnFallback();
  }

  if (!alive()) return;
  mountLeaflet(container, stores, city, { onOpenStore });
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
