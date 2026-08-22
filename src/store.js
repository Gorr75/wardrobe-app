import { emptyBrandSizes, normalizeBrandSizes } from './brands.js';
import { STORES, getStoreByBrand } from './cities.js';
import { normalizeStaff } from './staff.js';

const STORAGE_KEY = 'maison-journal-v5';
const LEGACY_STORAGE_KEYS = ['maison-journal-v4', 'maison-journal-v3', 'maison-journal-v2'];
const CITY_KEY = 'maison-journal-city';
const HOME_TAB_KEY = 'maison-journal-home-tab';

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
  };
}

export function defaultData() {
  return seedData();
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

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const normalized = normalizeDataModel(JSON.parse(raw));
      if (normalized) return normalized;
    }

    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      const migrated = normalizeDataModel(JSON.parse(legacyRaw));
      if (migrated) {
        saveData(migrated);
        return migrated;
      }
    }
  } catch {
    /* fall through */
  }
  return defaultData();
}

export function saveData(data) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      staff: data.staff,
      visits: data.visits,
      storeMeta: data.storeMeta || {},
      brandSizes: data.brandSizes || emptyBrandSizes(),
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

export function resetToSeed() {
  return defaultData();
}

export function normalizeImportedData(parsed) {
  const migrated = normalizeDataModel(parsed);
  if (!migrated) throw new Error('Invalid backup format');
  return migrated;
}
