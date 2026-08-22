import { STORES, getStoreByBrand } from './cities.js';
import { normalizeStaff } from './staff.js';

const STORAGE_KEY = 'maison-journal-v4';
const LEGACY_STORAGE_KEYS = ['maison-journal-v3', 'maison-journal-v2'];
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
  };
}

function migrateLegacyParsed(parsed) {
  if (Array.isArray(parsed.staff) && Array.isArray(parsed.visits)) {
    return {
      staff: parsed.staff.map(normalizeStaff),
      visits: parsed.visits.map(normalizeVisit),
    };
  }

  const entries = parsed.entries ?? parsed.journal;
  if (Array.isArray(entries)) {
    return {
      staff: Array.isArray(parsed.staff) ? parsed.staff.map(normalizeStaff) : [],
      visits: entries.map(entryToVisit).filter(Boolean),
    };
  }

  return null;
}

export function defaultData() {
  return seedData();
}

export function loadSelectedCity() {
  return localStorage.getItem(CITY_KEY) ?? DEFAULT_CITY_ID;
}

export function saveSelectedCity(cityId) {
  localStorage.setItem(CITY_KEY, cityId);
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
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.staff) && Array.isArray(parsed.visits)) {
        return {
          staff: parsed.staff.map(normalizeStaff),
          visits: parsed.visits.map(normalizeVisit),
        };
      }
    }

    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      const migrated = migrateLegacyParsed(JSON.parse(legacyRaw));
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
    }),
  );
}

export function createId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function filterByCityStores(stores, cityId) {
  return stores.filter((store) => store.cityId === cityId);
}

export function getVisitsForStore(visits, storeId) {
  return visits
    .filter((visit) => visit.storeId === storeId)
    .sort((a, b) => b.at - a.at);
}

export function getLastVisitAt(visits, storeId) {
  const storeVisits = getVisitsForStore(visits, storeId);
  return storeVisits.length ? storeVisits[0].at : null;
}

export function resetToSeed() {
  return defaultData();
}

export function normalizeImportedData(parsed) {
  const migrated = migrateLegacyParsed(parsed);
  if (!migrated) throw new Error('Invalid backup format');
  return migrated;
}
