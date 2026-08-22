import { BRANDS } from './brands.js';

const STORAGE_KEY = 'maison-journal-v3';
const LEGACY_STORAGE_KEYS = ['maison-journal-v2'];
const CITY_KEY = 'maison-journal-city';

export const DEFAULT_CITY_ID = 'stockholm';

function normalizeEntry(entry) {
  return {
    id: entry.id || createId('entry'),
    cityId: entry.cityId || DEFAULT_CITY_ID,
    date: entry.date || new Date().toISOString(),
    brand: entry.brand || BRANDS[0],
    type: entry.type || 'Appointment',
    notes: entry.notes || '',
    followUpDate: entry.followUpDate || null,
  };
}

function seedData() {
  const now = Date.now();
  return {
    entries: [
      {
        id: 'entry-1',
        cityId: 'stockholm',
        date: new Date(now - 2 * 86400000).toISOString(),
        brand: 'Hermès',
        type: 'Private viewing',
        notes: 'Reviewed autumn silk collection. Birkin waitlist update.',
        followUpDate: new Date(now + 7 * 86400000).toISOString().slice(0, 10),
      },
      {
        id: 'entry-2',
        cityId: 'stockholm',
        date: new Date(now - 5 * 86400000).toISOString(),
        brand: 'Omega',
        type: 'Appointment',
        notes: 'Speedmaster fitting — 19 mm wrist confirmed.',
        followUpDate: null,
      },
      {
        id: 'entry-3',
        cityId: 'paris',
        date: new Date(now - 12 * 86400000).toISOString(),
        brand: 'Chanel',
        type: 'Walk-in',
        notes: 'Rue Cambon — classic flap sizes compared.',
        followUpDate: null,
      },
    ],
  };
}

function migrateLegacyParsed(parsed) {
  const entries = parsed.entries ?? parsed.journal;
  if (!Array.isArray(entries)) return null;
  return { entries: entries.map(normalizeEntry) };
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

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.entries)) {
        return { entries: parsed.entries.map(normalizeEntry) };
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: data.entries }));
}

export function createId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function filterByCity(list, cityId) {
  return list.filter((item) => item.cityId === cityId);
}

export function resetToSeed() {
  return defaultData();
}

export function normalizeImportedData(parsed) {
  const migrated = migrateLegacyParsed(parsed);
  if (!migrated) throw new Error('Invalid backup format');
  return migrated;
}

export { BRANDS };
