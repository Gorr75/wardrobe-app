import { getCity, getStoreInstagramLabel } from './cities.js';
import { appleMapsUrl, uberUrl } from './maps.js';
import { getLastVisitAt, getVisitsForStore } from './store.js';
import { formatInstagramUrl } from './staff.js';

export async function sharePlainText({ title, text }) {
  const payload = { title: title || 'Boutique Journal', text };
  if (navigator.share) {
    try {
      await navigator.share(payload);
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    alert('Copied to clipboard.');
    return;
  }
  alert(text);
}

export function buildBoutiqueShareText(store, meta, staff, visits) {
  const city = getCity(store.cityId);
  const lines = [
    store.name,
    `${store.brand} · ${city.name}, ${city.country}`,
    store.address,
  ];

  const instagram = getStoreInstagramLabel(store);
  if (instagram) {
    lines.push(`Instagram: ${formatInstagramUrl(instagram.replace(/^@/, ''))}`);
  }
  if (meta?.note) lines.push(`Note: ${meta.note}`);

  const storeVisits = getVisitsForStore(visits, store.id);
  const lastVisit = getLastVisitAt(visits, store.id);
  if (lastVisit) {
    lines.push(`Last visit: ${new Date(lastVisit).toLocaleDateString()}`);
    if (storeVisits[0]?.note) lines.push(`Visit note: ${storeVisits[0].note}`);
  }

  const storeStaff = staff.filter((member) => member.storeId === store.id);
  if (storeStaff.length) {
    lines.push('Staff:');
    for (const member of storeStaff.slice(0, 6)) {
      lines.push(`• ${member.name}${member.role ? ` (${member.role})` : ''}`);
    }
  }

  lines.push(`Apple Maps: ${appleMapsUrl(store)}`);
  lines.push(`Uber: ${uberUrl(store)}`);
  lines.push('', 'Shared from Boutique Journal');
  return lines.join('\n');
}

export function shareBoutique(store, meta, staff, visits) {
  const text = buildBoutiqueShareText(store, meta, staff, visits);
  return sharePlainText({ title: store.name, text });
}
