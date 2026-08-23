import { emptyBrandSizes, normalizeBrandSizes } from './brands.js';
import { CITIES, getCity, getStoreByBrand, STORES } from './cities.js';
import { normalizePurchase } from './purchases.js';
import { normalizeStaff } from './staff.js';

const STORAGE_KEY = 'maison-journal-v6';
const LEGACY_STORAGE_KEYS = ['maison-journal-v5', 'maison-journal-v4', 'maison-journal-v3', 'maison-journal-v2'];
const CITY_KEY = 'maison-journal-city';
const HOME_TAB_KEY = 'maison-journal-home-tab';
const VISITED_MENU_KEY = 'maison-journal-show-visited-menu';
const FIRST_RUN_KEY = 'boutique-journal-first-run-done';

export const DEFAULT_CITY_ID = 'stockholm';

function normalizeVisit(visit) {
  const at = typeof visit.at === 'number' ? visit.at : new Date(visit.at || visit.date).getTime();
  return {
    id: visit.id || createId('visit'),
    storeId: visit.storeId || '',
    at,
    note: visit.note || visit.notes || '',
  };
}

function normalizeStoreMeta(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const meta = {};
  for (const [storeId, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue;
    meta[storeId] = {
      image: value.image || '',
      note: value.note || '',
    };
  }
  return meta;
}

function normalizeCustomStore(store) {
  const cityId = store.cityId || DEFAULT_CITY_ID;
  const city = getCity(cityId);
  return {
    id: store.id || createId('custom'),
    cityId,
    brand: store.brand || 'Other',
    name: store.name || '',
    address: store.address || '',
    lat: typeof store.lat === 'number' ? store.lat : city.center.lat,
    lng: typeof store.lng === 'number' ? store.lng : city.center.lng,
    instagram: store.instagram || '',
    createdAt: store.createdAt || Date.now(),
  };
}

function entryToVisit(entry) {
  const store = getStoreByBrand(entry.cityId, entry.brand);
  if (!store) return null;
  const note = [entry.type, entry.notes].filter(Boolean).join(': ');
  return normalizeVisit({
    id: entry.id,
    storeId: store.id,
    at: new Date(entry.date).getTime(),
    note,
  });
}

export function emptyData() {
  return {
    staff: [],
    visits: [],
    storeMeta: {},
    brandSizes: emptyBrandSizes(),
    customStores: [],
    purchases: [],
  };
}

function seedData() {
  const hermesStockholm = STORES.find((s) => s.id === 'stockholm-hermes');
  const omegaStockholm = STORES.find((s) => s.id === 'stockholm-omega');
  const chanelParis = STORES.find((s) => s.id === 'paris-chanel');
  const now = Date.now();

  return {
    staff: [
      normalizeStaff({
        id: 'staff-1',
        storeId: hermesStockholm?.id || 'stockholm-hermes',
        name: 'Linnea Forsberg',
        role: 'Sales Manager',
        phone: '+46 70 123 45 67',
        email: 'linnea.f@example.com',
        note: 'Silk & leather goods.',
      }),
      normalizeStaff({
        id: 'staff-2',
        storeId: omegaStockholm?.id || 'stockholm-omega',
        name: 'Oscar Lindqvist',
        role: 'Senior Sales Associate',
        phone: '+46 70 987 65 43',
        note: 'Speedmaster specialist.',
      }),
    ],
    visits: [
      normalizeVisit({
        id: 'visit-1',
        storeId: hermesStockholm?.id || 'stockholm-hermes',
        at: now - 2 * 86400000,
        note: 'Private viewing — autumn silk collection.',
      }),
      normalizeVisit({
        id: 'visit-2',
        storeId: omegaStockholm?.id || 'stockholm-omega',
        at: now - 5 * 86400000,
        note: 'Speedmaster fitting, 19 mm wrist confirmed.',
      }),
      normalizeVisit({
        id: 'visit-3',
        storeId: chanelParis?.id || 'paris-chanel',
        at: now - 12 * 86400000,
        note: 'Classic flap sizes compared.',
      }),
    ],
    storeMeta: {},
    brandSizes: {
      Hermès: { shoes: '38', rtw: '38', belt: '85' },
      Omega: { wrist: '19', case: '41' },
      Chanel: {},
    },
    customStores: [],
    purchases: [],
  };
}

function normalizeDataModel(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;

  let staff = [];
  let visits = [];

  if (Array.isArray(parsed.staff)) staff = parsed.staff.map(normalizeStaff);
  if (Array.isArray(parsed.visits)) visits = parsed.visits.map(normalizeVisit);

  const entries = parsed.entries ?? parsed.journal;
  if (!visits.length && Array.isArray(entries)) {
    visits = entries.map(entryToVisit).filter(Boolean);
    if (!staff.length && Array.isArray(parsed.staff)) {
      staff = parsed.staff.map(normalizeStaff);
    }
  }

  if (!Array.isArray(parsed.staff) && !Array.isArray(parsed.visits) && !Array.isArray(entries)) {
    return null;
  }

  return {
    staff,
    visits,
    storeMeta: normalizeStoreMeta(parsed.storeMeta),
    brandSizes: normalizeBrandSizes(parsed.brandSizes),
    customStores: Array.isArray(parsed.customStores) ? parsed.customStores.map(normalizeCustomStore) : [],
    purchases: Array.isArray(parsed.purchases) ? parsed.purchases.map(normalizePurchase) : [],
  };
}

export function defaultData() {
  return seedData();
}

export function isFirstRunPending() {
  return !hasPersistedData() && localStorage.getItem(FIRST_RUN_KEY) !== '1';
}

export function markFirstRunComplete() {
  localStorage.setItem(FIRST_RUN_KEY, '1');
}

function hasPersistedData() {
  if (localStorage.getItem(STORAGE_KEY)) return true;
  return LEGACY_STORAGE_KEYS.some((key) => localStorage.getItem(key));
}

export function loadSelectedCity() {
  const value = localStorage.getItem(CITY_KEY);
  if (value === null) return '';
  return value;
}

export function saveSelectedCity(cityId) {
  if (cityId) localStorage.setItem(CITY_KEY, cityId);
  else localStorage.setItem(CITY_KEY, '');
}

export function loadHomeTab() {
  const tab = localStorage.getItem(HOME_TAB_KEY) || 'stores';
  return tab === 'staff' || tab === 'map' ? tab : 'stores';
}

export function saveHomeTab(tab) {
  localStorage.setItem(HOME_TAB_KEY, tab);
}

export function getShowVisitedMenu() {
  return localStorage.getItem(VISITED_MENU_KEY) === '1';
}

export function setShowVisitedMenu(show) {
  localStorage.setItem(VISITED_MENU_KEY, show ? '1' : '0');
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const normalized = normalizeDataModel(JSON.parse(raw));
      if (normalized) {
        markFirstRunComplete();
        return normalized;
      }
    }

    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      const migrated = normalizeDataModel(JSON.parse(legacyRaw));
      if (migrated) {
        saveData(migrated);
        markFirstRunComplete();
        return migrated;
      }
    }
  } catch {
    /* fall through */
  }

  if (isFirstRunPending()) return emptyData();
  return emptyData();
}

export function saveData(data) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      staff: data.staff,
      visits: data.visits,
      storeMeta: data.storeMeta || {},
      brandSizes: data.brandSizes || emptyBrandSizes(),
      customStores: data.customStores || [],
      purchases: data.purchases || [],
    }),
  );
}

export function createId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function getStoreMeta(data, storeId) {
  return data.storeMeta?.[storeId] || { image: '', note: '' };
}

export function setStoreMeta(data, storeId, patch) {
  if (!data.storeMeta) data.storeMeta = {};
  data.storeMeta[storeId] = {
    ...getStoreMeta(data, storeId),
    ...patch,
  };
}

export function getVisitsForStore(visits, storeId) {
  return visits.filter((visit) => visit.storeId === storeId).sort((a, b) => b.at - a.at);
}

export function getLastVisitAt(visits, storeId) {
  const storeVisits = getVisitsForStore(visits, storeId);
  return storeVisits.length ? storeVisits[0].at : null;
}

export function getPurchasesForStore(purchases, storeId) {
  return purchases.filter((purchase) => purchase.storeId === storeId).sort((a, b) => b.purchasedAt - a.purchasedAt);
}

export function getVisitedStores(allStores, visits, cityId = '') {
  const visitedIds = new Set(visits.map((visit) => visit.storeId));
  let stores = allStores.filter((store) => visitedIds.has(store.id));
  if (cityId) stores = stores.filter((store) => store.cityId === cityId);
  return stores.sort((a, b) => {
    const aLast = getLastVisitAt(visits, a.id) || 0;
    const bLast = getLastVisitAt(visits, b.id) || 0;
    return bLast - aLast;
  });
}

export async function geocodeAddress(address) {
  if (!address.trim()) return null;
  try {
    const params = new URLSearchParams({ format: 'json', limit: '1', q: address.trim() });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'User-Agent': 'maison-journal/1.0' },
    });
    if (!response.ok) return null;
    const results = await response.json();
    if (!results?.length) return null;
    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
    };
  } catch {
    return null;
  }
}

export function upsertCustomStore(data, store, existingId = null) {
  if (!data.customStores) data.customStores = [];
  const normalized = normalizeCustomStore({ ...store, id: existingId || store.id || createId('custom') });
  const index = data.customStores.findIndex((item) => item.id === normalized.id);
  if (index >= 0) data.customStores[index] = normalized;
  else data.customStores.push(normalized);
  return normalized;
}

export function deleteCustomStore(data, storeId) {
  data.customStores = (data.customStores || []).filter((store) => store.id !== storeId);
  data.staff = data.staff.filter((member) => member.storeId !== storeId);
  data.visits = data.visits.filter((visit) => visit.storeId !== storeId);
  data.purchases = (data.purchases || []).filter((purchase) => purchase.storeId !== storeId);
  if (data.storeMeta?.[storeId]) delete data.storeMeta[storeId];
}

export function resetToSeed() {
  return seedData();
}

export function normalizeImportedData(parsed) {
  const migrated = normalizeDataModel(parsed);
  if (!migrated) throw new Error('Invalid backup format');
  return migrated;
}

export { CITIES };
