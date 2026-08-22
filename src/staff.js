import { escapeHtml } from './frame.js';

export const ROLE_PRESETS = [
  'Sales Associate',
  'Senior Sales Associate',
  'Client Advisor',
  'Sales Manager',
  'Boutique Director',
  'Other',
];

const STAFF_SORT_KEY = 'maison-journal-staff-sort';
const STAFF_ROLE_FILTER_KEY = 'maison-journal-staff-role-filter';

export function getStaffSort() {
  return localStorage.getItem(STAFF_SORT_KEY) || 'name';
}

export function setStaffSort(next) {
  localStorage.setItem(STAFF_SORT_KEY, next);
}

export function getStaffRoleFilter() {
  return localStorage.getItem(STAFF_ROLE_FILTER_KEY) || '';
}

export function setStaffRoleFilter(next) {
  if (next) localStorage.setItem(STAFF_ROLE_FILTER_KEY, next);
  else localStorage.removeItem(STAFF_ROLE_FILTER_KEY);
}

export function normalizeStaff(member) {
  return {
    id: member.id,
    storeId: member.storeId || '',
    name: member.name || '',
    role: member.role || '',
    note: member.note || '',
    phone: member.phone || '',
    email: member.email || '',
    instagram: member.instagram || '',
    image: member.image || '',
  };
}

export function getRoleBadgeClass(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('director') || r.includes('manager')) return 'badge-manager';
  if (r.includes('senior') || r.includes('advisor')) return 'badge-server';
  return 'badge-default';
}

export function formatPhoneLink(phone) {
  return phone.replace(/[^\d+]/g, '');
}

export function formatInstagramUrl(handle) {
  const value = handle.trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const user = value.replace(/^@/, '');
  return `https://instagram.com/${encodeURIComponent(user)}`;
}

export function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function renderStaffAvatar(member) {
  if (member.image) {
    return `<img class="staff-avatar" src="${escapeHtml(member.image)}" alt="" />`;
  }
  return `<div class="staff-avatar staff-avatar-initials" aria-hidden="true">${escapeHtml(getInitials(member.name))}</div>`;
}

export function collectUsedRoles(staff) {
  const roles = new Set();
  for (const member of staff) {
    if (member.role) roles.add(member.role);
  }
  return [...roles].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function sortStaffEntries(entries, sort) {
  const copy = [...entries];
  if (sort === 'store') {
    return copy.sort((a, b) => {
      const storeCmp = a.store.name.localeCompare(b.store.name, undefined, { sensitivity: 'base' });
      if (storeCmp !== 0) return storeCmp;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }
  if (sort === 'role') {
    return copy.sort((a, b) => {
      const roleCmp = a.role.localeCompare(b.role, undefined, { sensitivity: 'base' });
      if (roleCmp !== 0) return roleCmp;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }
  return copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function getStaffBrowseEntries(staff, stores, { query = '', cityId = '', roleFilter = '', sort = 'name' } = {}) {
  const storeById = Object.fromEntries(stores.map((s) => [s.id, s]));
  let entries = staff
    .map((member) => ({ ...member, store: storeById[member.storeId] }))
    .filter((member) => member.store);

  if (cityId) {
    entries = entries.filter((member) => member.store.cityId === cityId);
  }

  if (roleFilter) {
    entries = entries.filter((member) => member.role === roleFilter);
  }

  const q = query.trim().toLowerCase();
  if (q) {
    entries = entries.filter(
      (member) =>
        member.name.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q) ||
        (member.note || '').toLowerCase().includes(q) ||
        (member.phone || '').toLowerCase().includes(q) ||
        (member.email || '').toLowerCase().includes(q) ||
        member.store.name.toLowerCase().includes(q) ||
        member.store.brand.toLowerCase().includes(q),
    );
  }

  return sortStaffEntries(entries, sort);
}

export function renderStaffCard(member) {
  const phone = member.phone?.trim() || '';
  const email = member.email?.trim() || '';
  return `
    <div class="contact-card">
      ${renderStaffAvatar(member)}
      <div class="contact-body">
        <div class="contact-header">
          <span class="contact-name">${escapeHtml(member.name)}</span>
          <span class="role-badge ${getRoleBadgeClass(member.role)}">${escapeHtml(member.role)}</span>
          ${
            phone
              ? `<a class="call-btn" href="tel:${formatPhoneLink(phone)}" aria-label="Call" title="Call">📞</a>`
              : ''
          }
        </div>
        ${phone ? `<a class="contact-link" href="tel:${formatPhoneLink(phone)}">${escapeHtml(phone)}</a>` : ''}
        ${email ? `<a class="contact-link" href="mailto:${encodeURIComponent(email)}">${escapeHtml(email)}</a>` : ''}
        ${
          member.instagram
            ? `<a class="contact-link" href="${escapeHtml(formatInstagramUrl(member.instagram))}" target="_blank" rel="noopener noreferrer">${escapeHtml(member.instagram)}</a>`
            : ''
        }
        ${member.note ? `<p class="contact-note">${escapeHtml(member.note)}</p>` : ''}
        <div class="contact-actions">
          <button class="btn-text edit-staff-btn" type="button" data-id="${member.id}">Edit</button>
        </div>
      </div>
    </div>`;
}
