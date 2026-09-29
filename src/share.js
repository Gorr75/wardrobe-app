import { getCity, getStoreInstagramLabel } from './cities.js';
import { countryName, localeTag, t } from './i18n.js';
import { appleMapsUrl, uberUrl } from './maps.js';
import { getLastVisitAt, getVisitsForStore } from './store.js';
import { formatInstagramUrl, roleLabel } from './staff.js';
import { isNativeApp } from './native.js';

export async function sharePlainText({ title, text }) {
  if (isNativeApp()) {
    try {
      await window.BoutiqueNative.shareText({ title, text });
      return;
    } catch (err) {
      console.error(err);
      if (err?.name === 'AbortError') return;
    }
  }

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
    alert(t('Copied to clipboard.'));
    return;
  }
  alert(text);
}

export function buildBoutiqueShareText(store, meta, staff, visits) {
  const city = getCity(store.cityId);
  const lines = [
    store.name,
    `${store.brand} · ${city.name}, ${countryName(city.country)}`,
    store.address,
  ];

  const instagram = getStoreInstagramLabel(store);
  if (instagram) {
    lines.push(`${t('Instagram:')} ${formatInstagramUrl(instagram.replace(/^@/, ''))}`);
  }
  if (meta?.note) lines.push(`${t('Note:')} ${meta.note}`);

  const storeVisits = getVisitsForStore(visits, store.id);
  const lastVisit = getLastVisitAt(visits, store.id);
  if (lastVisit) {
    lines.push(`${t('Last visit:')} ${new Date(lastVisit).toLocaleDateString(localeTag())}`);
    if (storeVisits[0]?.note) lines.push(`${t('Visit note:')} ${storeVisits[0].note}`);
  }

  const storeStaff = staff.filter((member) => member.storeId === store.id);
  if (storeStaff.length) {
    lines.push(t('Staff:'));
    for (const member of storeStaff.slice(0, 6)) {
      const role = member.role ? roleLabel(member.role) : '';
      lines.push(`• ${member.name}${role ? ` (${role})` : ''}`);
    }
  }

  lines.push(`${t('Apple Maps')}: ${appleMapsUrl(store)}`);
  lines.push(`${t('Uber')}: ${uberUrl(store)}`);
  lines.push('', t('Shared from Boutique Journal'));
  return lines.join('\n');
}

export function shareBoutique(store, meta, staff, visits) {
  const text = buildBoutiqueShareText(store, meta, staff, visits);
  return sharePlainText({ title: store.name, text });
}
