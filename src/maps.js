import L from 'leaflet';

let mapInstance = null;
let markersLayer = null;
let currentCityId = null;

export function appleMapsUrl(store) {
  const query = encodeURIComponent(`${store.name}, ${store.address}`);
  return `https://maps.apple.com/?q=${query}&ll=${store.lat},${store.lng}`;
}

export function uberUrl(store) {
  const nickname = encodeURIComponent(store.name);
  return `https://m.uber.com/looking?drop[0]=${store.lat}&drop[1]=${store.lng}&drop[2]=${nickname}`;
}

export function googleMapsUrl(store) {
  const query = encodeURIComponent(`${store.name}, ${store.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function initMap(container, city, stores, onSelectStore) {
  if (!container) return null;

  if (mapInstance && currentCityId === city.id) {
    setMarkers(stores, onSelectStore);
    fitStores(stores);
    setTimeout(() => mapInstance.invalidateSize(), 80);
    return mapInstance;
  }

  destroyMap();
  currentCityId = city.id;

  mapInstance = L.map(container, {
    zoomControl: false,
    attributionControl: false,
  }).setView([city.center.lat, city.center.lng], city.zoom);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
  }).addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);
  setMarkers(stores, onSelectStore);
  fitStores(stores);

  L.control.zoom({ position: 'topright' }).addTo(mapInstance);
  setTimeout(() => mapInstance.invalidateSize(), 120);
  return mapInstance;
}

function setMarkers(stores, onSelectStore) {
  if (!markersLayer) return;
  markersLayer.clearLayers();

  for (const store of stores) {
    const marker = L.circleMarker([store.lat, store.lng], {
      radius: 9,
      color: brandColor(store.brand),
      fillColor: brandColor(store.brand),
      fillOpacity: 0.92,
      weight: 2,
    });
    marker.bindPopup(`<strong>${store.brand}</strong><br>${store.address}`);
    marker.on('click', () => onSelectStore?.(store.id));
    marker.addTo(markersLayer);
  }
}

function fitStores(stores) {
  if (!mapInstance || !stores.length) return;
  const bounds = L.latLngBounds(stores.map((s) => [s.lat, s.lng]));
  mapInstance.fitBounds(bounds.pad(0.25));
}

export function highlightStore(storeId, stores) {
  const store = stores.find((s) => s.id === storeId);
  if (!store || !mapInstance) return;
  mapInstance.flyTo([store.lat, store.lng], 16, { duration: 0.8 });
}

function brandColor(brand) {
  if (brand === 'Hermès') return '#f97316';
  if (brand === 'Omega') return '#ef4444';
  return '#f5f5f5';
}

export function destroyMap() {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
    markersLayer = null;
    currentCityId = null;
  }
}
