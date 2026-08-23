import { CITIES, getCity, getStoreById, STORES } from './cities.js';
import { getStoreMeta, upsertCustomStore } from './store.js';

const LIST_TYPE = 'boutique-journal-list';

function slugify(value) {
  return (value || 'list')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function normalizeName(value) {
  return (value || '').trim().toLowerCase();
}

function boutiqueToExport(store, meta) {
  return {
    storeId: store.id,
    cityId: store.cityId,
    brand: store.brand,
    name: store.name,
    address: store.address,
    lat: store.lat,
    lng: store.lng,
    instagram: store.instagram || '',
    note: meta?.note || '',
    image: meta?.image || '',
  };
}

export function buildShareListPayload(name, stores, data) {
  return {
    type: LIST_TYPE,
    version: 1,
    name: name.trim(),
    exportedAt: new Date().toISOString(),
    boutiques: stores.map((store) => boutiqueToExport(store, getStoreMeta(data, store.id))),
  };
}

export function exportShareListFile(payload) {
  const slug = slugify(payload.name);
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `boutique-list-${slug}-${date}.json`;
  const jsonText = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return fileName;
}

function findCatalogStore(entry) {
  if (entry.storeId) {
    const byId = STORES.find((store) => store.id === entry.storeId);
    if (byId) return byId;
  }
  return STORES.find(
    (store) =>
      store.cityId === entry.cityId &&
      store.brand === entry.brand &&
      normalizeName(store.name) === normalizeName(entry.name),
  );
}

export function importSharedList(data, payload) {
  if (!payload || payload.type !== LIST_TYPE || !Array.isArray(payload.boutiques)) {
    throw new Error('Invalid boutique list file');
  }

  let added = 0;
  let updated = 0;

  for (const entry of payload.boutiques) {
    const catalogStore = findCatalogStore(entry);
    if (catalogStore) {
      const existingMeta = getStoreMeta(data, catalogStore.id);
      const nextMeta = {
        image: entry.image || existingMeta.image,
        note: entry.note || existingMeta.note,
      };
      if (nextMeta.image !== existingMeta.image || nextMeta.note !== existingMeta.note) {
        data.storeMeta[catalogStore.id] = nextMeta;
        updated += 1;
      }
      continue;
    }

    const customMatch = (data.customStores || []).find(
      (store) =>
        store.cityId === entry.cityId &&
        store.brand === entry.brand &&
        normalizeName(store.name) === normalizeName(entry.name),
    );

    if (customMatch) {
      upsertCustomStore(data, {
        ...customMatch,
        address: entry.address || customMatch.address,
        lat: entry.lat ?? customMatch.lat,
        lng: entry.lng ?? customMatch.lng,
        instagram: entry.instagram || customMatch.instagram,
      }, customMatch.id);
      if (entry.note || entry.image) {
        data.storeMeta[customMatch.id] = {
          image: entry.image || getStoreMeta(data, customMatch.id).image,
          note: entry.note || getStoreMeta(data, customMatch.id).note,
        };
      }
      updated += 1;
      continue;
    }

    const saved = upsertCustomStore(data, {
      cityId: entry.cityId || CITIES[0].id,
      brand: entry.brand || 'Other',
      name: entry.name || `${entry.brand || 'Boutique'} ${getCity(entry.cityId).name}`,
      address: entry.address || '',
      lat: entry.lat,
      lng: entry.lng,
      instagram: entry.instagram || '',
    });
    if (entry.note || entry.image) {
      data.storeMeta[saved.id] = { image: entry.image || '', note: entry.note || '' };
    }
    added += 1;
  }

  return { added, updated, total: payload.boutiques.length };
}

export function getShareScopeStores(data, scope, cityId = '') {
  let stores = [...STORES, ...(data.customStores || [])];
  if (scope === 'city' && cityId) {
    stores = stores.filter((store) => store.cityId === cityId);
  }
  if (scope === 'visited') {
    const visitedIds = new Set(data.visits.map((visit) => visit.storeId));
    stores = stores.filter((store) => visitedIds.has(store.id));
  }
  return stores;
}
