import { GOOGLE_PLACES_API_KEY, IOS_BUNDLE_ID } from '../config/places-key.js';

const PLACE_ID_KEY = 'boutique-journal-place-ids';
const PLACES_BASE = 'https://places.googleapis.com/v1';
const sessionPhotos = new Map();

function readPlaceIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLACE_ID_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePlaceId(storeId, placeId) {
  const all = readPlaceIds();
  if (placeId) all[storeId] = placeId;
  else delete all[storeId];
  try {
    localStorage.setItem(PLACE_ID_KEY, JSON.stringify(all));
  } catch {
    /* cache is optional */
  }
}

function placesHeaders(fieldMask) {
  const headers = {
    'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
    'X-Ios-Bundle-Identifier': IOS_BUNDLE_ID,
  };
  if (fieldMask) headers['X-Goog-FieldMask'] = fieldMask;
  return headers;
}

async function placesFetch(url, { method = 'GET', fieldMask, body } = {}) {
  const headers = placesHeaders(fieldMask);
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  return response.json();
}

function firstPhoto(photos) {
  const photo = Array.isArray(photos) ? photos.find((item) => item?.name) : null;
  if (!photo) return null;
  const attributions = Array.isArray(photo.authorAttributions)
    ? photo.authorAttributions
        .map((attr) => ({
          displayName: attr?.displayName || '',
          uri: attr?.uri || '',
        }))
        .filter((attr) => attr.displayName || attr.uri)
    : [];
  return { name: photo.name, attributions };
}

async function photoFromPlaceId(placeId) {
  const data = await placesFetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    fieldMask: 'photos.name,photos.authorAttributions',
  });
  return firstPhoto(data?.photos);
}

async function searchPlace(store) {
  const textQuery = `${store.brand} ${store.address}`.trim();
  if (!textQuery) return null;
  const data = await placesFetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    fieldMask: 'places.id,places.photos.name,places.photos.authorAttributions',
    body: { textQuery, maxResultCount: 1 },
  });
  const place = data?.places?.[0];
  if (!place?.id) return null;
  writePlaceId(store.id, place.id);
  return firstPhoto(place.photos);
}

async function mediaUri(photoName) {
  const url = `${PLACES_BASE}/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true`;
  const data = await placesFetch(url);
  return data?.photoUri || '';
}

/**
 * Places photo for a boutique with no user photo and no bundled photo.
 * Caches the place id only. The image URL lives in memory for this session.
 * Returns null when the key is missing or the request fails.
 */
export async function loadPlacePhoto(store) {
  if (!GOOGLE_PLACES_API_KEY || !store?.id || !store.address) return null;
  if (sessionPhotos.has(store.id)) return sessionPhotos.get(store.id);
  try {
    const cachedId = readPlaceIds()[store.id];
    let photo = cachedId ? await photoFromPlaceId(cachedId) : null;
    if (!photo) {
      if (cachedId) writePlaceId(store.id, '');
      photo = await searchPlace(store);
    }
    if (!photo?.name) return null;
    const src = await mediaUri(photo.name);
    if (!src) return null;
    const result = { src, attributions: photo.attributions };
    sessionPhotos.set(store.id, result);
    return result;
  } catch {
    return null;
  }
}

export function forgetPlacePhoto(storeId) {
  sessionPhotos.delete(storeId);
}
