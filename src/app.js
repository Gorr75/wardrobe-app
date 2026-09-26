import { ALL_CITIES_MAP, CITIES, getCity, getStoreInstagramLabel, getStoreById, getStoresForFilter, isCustomStore } from './cities.js';
import { actionIconMarkup } from './icons.js';
import {
  bindKeyboardInset,
  bindStaySheet,
  brandIconClass,
  brandInitial,
  cityFilterMarkup,
  escapeHtml,
  homeTabsMarkup,
  resetPageScroll,
  unbindStaySheet,
  visitedStoresMenuMarkup,
} from './frame.js';
import {
  BRAND_SIZE_FIELDS,
  BRANDS,
  getBrandSizeSummary,
} from './brands.js';
import {
  bindStoreNavActions,
  destroyMap,
  initStoreMap,
  storeNavActionsMarkup,
} from './maps.js';
import {
  appVersionLabel,
  BACKUP_REMINDER_DAYS,
  PRIVACY_URL,
  SUPPORT_URL,
  checkWeeklyAutoBackup,
  dismissBackupReminder,
  exportAllData,
  getAutoBackupMode,
  getLastExportLabel,
  importAllData,
  maybeAutoExport,
  setAutoBackupMode,
  shouldShowBackupReminder,
} from './backup.js';
import {
  ROLE_PRESETS,
  collectUsedRoles,
  formatInstagramUrl,
  formatPhoneLink,
  getRoleBadgeClass,
  getStaffBrowseEntries,
  getStaffRoleFilter,
  getStaffSort,
  normalizeStaff,
  renderStaffAvatar,
  renderStaffCard,
  setStaffRoleFilter,
  setStaffSort,
} from './staff.js';
import {
  bindPhotoPicker,
  photoPickerMarkup,
  renderStoreThumb,
} from './photos.js';
import { normalizePurchase, renderPurchaseCard } from './purchases.js';
import {
  createId,
  deleteCustomStore,
  deleteStaff,
  DEFAULT_CITY_ID,
  geocodeAddress,
  emptyData,
  getLastVisitAt,
  getPurchasesForStore,
  getShowVisitedMenu,
  getStoreMeta,
  getVisitedStores,
  getVisitsForStore,
  loadData,
  loadHomeTab,
  loadSelectedCity,
  removeBoutiqueFromJournal,
  saveData,
  saveHomeTab,
  saveSelectedCity,
  setShowVisitedMenu,
  setStoreMeta,
  upsertCustomStore,
} from './store.js';
import { shareBoutique } from './share.js';
import {
  buildShareListPayload,
  exportShareListFile,
  getShareScopeStores,
  importSharedList,
} from './share-list.js';
import { hapticLight, isNativeApp } from './native.js';

const SWIPE_DELETE_WIDTH = 80;
const SWIPE_VISIT_WIDTH = 80;
const THEME_KEY = 'boutique-journal-theme';

function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'current';
}

function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

function applyStoredTheme() {
  document.documentElement.setAttribute('data-theme', getTheme());
}

function appearanceCardMarkup(theme, id, title, hint) {
  return `
    <button type="button" class="appearance-card ${theme === id ? 'selected' : ''}" data-appearance="${id}">
      <div class="appearance-swatch appearance-swatch-${id}" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
      <div class="appearance-card-copy">
        <strong>${title}</strong>
        <p>${hint}</p>
      </div>
      <span class="appearance-check" aria-hidden="true">✓</span>
    </button>`;
}

const state = {
  data: loadData(),
  cityId: loadSelectedCity(),
  homeTab: loadHomeTab(),
  listSearch: '',
  route: { view: 'list' },
  editingStaffId: null,
  staffFormStoreId: null,
};

const app = document.getElementById('app');

function byId(list, id) {
  return list.find((item) => item.id === id);
}

function cityStores() {
  const hidden = new Set(state.data.hiddenStoreIds || []);
  return getStoresForFilter(state.cityId, state.data.customStores || []).filter((store) => !hidden.has(store.id));
}

function findStore(storeId) {
  return getStoreById(storeId, state.data.customStores || []);
}

function visitedStoresForMenu() {
  return getVisitedStores(cityStores(), state.data.visits, state.cityId);
}

function mapViewCity() {
  return state.cityId ? getCity(state.cityId) : ALL_CITIES_MAP;
}

function showingAllCities() {
  return !state.cityId;
}

function matchesSearch(text, query) {
  return !query || text.toLowerCase().includes(query);
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatVisitDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelativeVisit(ts) {
  if (!ts) return 'Never visited';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'Visited today';
  if (days === 1) return 'Visited yesterday';
  if (days < 7) return `Visited ${days} days ago`;
  return formatVisitDate(ts);
}

async function render() {
  resetPageScroll();
  unbindStaySheet();
  destroyMap();
  switch (state.route.view) {
    case 'list':
      await renderList();
      break;
    case 'store':
      renderStoreDetail(state.route.id);
      break;
    case 'add-staff':
      renderStaffForm(state.route.storeId);
      break;
    case 'edit-staff':
      renderStaffForm(null, state.route.staffId);
      break;
    case 'edit-store':
      renderStoreEdit(state.route.id);
      break;
    case 'add-store':
      renderCustomStoreForm();
      break;
    case 'add-purchase':
      renderPurchaseForm(state.route.storeId);
      break;
    case 'edit-purchase':
      renderPurchaseForm(state.route.storeId, state.route.purchaseId);
      break;
    case 'data':
      renderSettingsView();
      break;
    default:
      await renderList();
  }
}

function daysSinceVisit(ts) {
  if (!ts) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / 86400000));
}

function stayStatMarkup(ts) {
  const days = daysSinceVisit(ts);
  if (days == null) {
    return `<div class="stay-stat"><span class="stay-stat-num">—</span><span class="stay-stat-label">new</span></div>`;
  }
  return `<div class="stay-stat"><span class="stay-stat-num">${days}</span><span class="stay-stat-label">${days === 1 ? 'day' : 'days'}</span></div>`;
}

function journalYearStats(stores) {
  const ids = new Set(stores.map((store) => store.id));
  const buckets = new Map();
  const bump = (ts, key) => {
    const year = new Date(ts).getFullYear();
    if (!Number.isFinite(year)) return;
    if (!buckets.has(year)) buckets.set(year, { visits: 0, purchases: 0 });
    buckets.get(year)[key] += 1;
  };
  for (const visit of state.data.visits) {
    if (ids.has(visit.storeId)) bump(visit.at, 'visits');
  }
  for (const purchase of state.data.purchases || []) {
    if (ids.has(purchase.storeId)) bump(purchase.purchasedAt, 'purchases');
  }
  return [...buckets.entries()].sort((a, b) => b[0] - a[0]);
}

function yearRowMarkup(year, visits, purchases) {
  const visitLabel = visits === 1 ? 'visit' : 'visits';
  const purchaseLabel = purchases === 1 ? 'purchase' : 'purchases';
  return `
    <div class="year-row">
      <span class="year-num">${year}</span>
      <span class="year-meta">${visits} ${visitLabel} · ${purchases} ${purchaseLabel}</span>
    </div>`;
}

function mostVisitedStore(stores) {
  let best = null;
  let count = 0;
  for (const store of stores) {
    const visits = state.data.visits.filter((visit) => visit.storeId === store.id).length;
    if (visits > count) {
      best = store;
      count = visits;
    }
  }
  return best ? { store: best, count } : null;
}

function homeJournalMarkup(stores) {
  const featured = mostVisitedStore(stores);
  const years = journalYearStats(stores);
  let hero = '';
  if (featured) {
    const meta = getStoreMeta(state.data, featured.store.id);
    const city = getCity(featured.store.cityId);
    const thumb = meta.image
      ? renderStoreThumb(meta.image, featured.store.brand, 'hero-photo', brandIconClass(featured.store.brand))
      : `<div class="restaurant-icon hero-photo ${brandIconClass(featured.store.brand)}">${brandInitial(featured.store.brand)}</div>`;
    hero = `
      <button type="button" class="hero-boutique" data-store-id="${escapeHtml(featured.store.id)}">
        ${thumb}
        <span class="hero-copy">
          <span class="hero-kicker">Most visited · ${featured.count} ${featured.count === 1 ? 'visit' : 'visits'}</span>
          <span class="hero-name">${escapeHtml(featured.store.name)}</span>
          <span class="hero-place">${escapeHtml(city.name)}, ${escapeHtml(city.country)}</span>
          <span class="hero-link">View boutique</span>
        </span>
      </button>`;
  }
  const yearHtml = years.map(([year, stats]) => yearRowMarkup(year, stats.visits, stats.purchases)).join('');
  return `${hero}${yearHtml ? `<div class="year-list">${yearHtml}</div>` : ''}`;
}

function visitsSheetMarkup(stores, query) {
  const ids = new Set(stores.map((store) => store.id));
  const visits = state.data.visits
    .filter((visit) => ids.has(visit.storeId))
    .filter((visit) => {
      const store = findStore(visit.storeId);
      if (!store) return false;
      const city = getCity(store.cityId);
      return matchesSearch(`${store.name} ${store.brand} ${city.name} ${visit.note || ''}`, query);
    })
    .sort((a, b) => b.at - a.at);

  if (!visits.length) {
    return `<div class="empty-state"><div class="icon">✦</div><h2>No visits yet</h2><p>Open a boutique and log a visit.</p></div>`;
  }

  const groups = new Map();
  for (const visit of visits) {
    const year = new Date(visit.at).getFullYear();
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(visit);
  }

  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => {
      const purchases = (state.data.purchases || []).filter(
        (purchase) => ids.has(purchase.storeId) && new Date(purchase.purchasedAt).getFullYear() === year,
      ).length;
      return `
        ${yearRowMarkup(year, items.length, purchases)}
        <ul class="list visit-journal">
          ${items
            .map((visit) => {
              const store = findStore(visit.storeId);
              const city = getCity(store.cityId);
              return `
            <li>
              <button type="button" class="visit-journal-card" data-store-id="${escapeHtml(store.id)}">
                ${stayStatMarkup(visit.at)}
                <span class="info">
                  <span class="title">${escapeHtml(store.name)}</span>
                  <span class="subtitle">${escapeHtml(city.name)}</span>
                  <span class="staff-item note">${escapeHtml(formatVisitDate(visit.at))}${visit.note ? ` · ${escapeHtml(visit.note)}` : ''}</span>
                </span>
              </button>
            </li>`;
            })
            .join('')}
        </ul>`;
    })
    .join('');
}

async function renderList() {
  await checkWeeklyAutoBackup(state.data);

  const stores = cityStores();
  const isStaffMode = state.homeTab === 'staff';
  const isMapMode = state.homeTab === 'map';
  const isStoresMode = state.homeTab === 'stores';
  const query = state.listSearch.toLowerCase().trim();
  const showHeaderStats = getShowVisitedMenu();
  const visitedMenuStores = showHeaderStats && isStoresMode ? visitedStoresForMenu() : [];
  const listBodyHtml = buildListBody({ stores, query, isStaffMode, isMapMode });
  const sheetKicker = isStaffMode ? 'My clients' : isMapMode ? 'Visits' : 'My boutiques';
  const searchPlaceholder = isStaffMode ? 'Search clients…' : isMapMode ? 'Search visits…' : 'Search boutiques…';

  app.className = 'stay-stage has-home-tabs';
  app.innerHTML = `
    <div class="stage-map" id="restaurant-map" role="application" aria-label="Boutique map"></div>
    <p id="map-status" class="map-status map-status-float" hidden></p>
    <div id="map-loading" class="map-loading map-loading-float">Loading map…</div>
    <p id="map-empty" class="map-empty" hidden></p>
    <div class="map-float map-float-start">
      <button type="button" class="float-btn" id="settings-btn" aria-label="Settings">${actionIconMarkup('settings')}</button>
    </div>
    <div class="map-float map-float-end">
      ${
        isStaffMode || isStoresMode
          ? `<button type="button" class="float-btn" id="add-btn" aria-label="${escapeHtml(isStaffMode ? 'Add staff member' : 'Add boutique')}">${actionIconMarkup('add')}</button>`
          : ''
      }
      <button type="button" class="float-btn" id="map-locate-btn" aria-label="Locate me" title="Locate me">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path><circle cx="12" cy="12" r="8"></circle></svg>
      </button>
    </div>
    <section class="stay-sheet" aria-label="${escapeHtml(sheetKicker)}">
      <div class="stay-sheet-grab">
        <div class="stay-handle" aria-hidden="true"></div>
        <h1 class="sheet-kicker">${escapeHtml(sheetKicker)}</h1>
      </div>
      <div class="stay-sheet-scroll">
        <div class="search-box">
          <input id="search-input" type="search" placeholder="${escapeHtml(searchPlaceholder)}" value="${escapeHtml(state.listSearch)}" enterkeyhint="search" />
        </div>
        ${visitedStoresMenuMarkup(visitedMenuStores)}
        <div id="list-body">${listBodyHtml}</div>
      </div>
    </section>
    ${homeTabsMarkup(state.homeTab)}
  `;

  app.querySelector('#settings-btn')?.addEventListener('click', () => {
    state.route = { view: 'data' };
    render();
  });

  app.querySelector('#add-btn')?.addEventListener('click', () => {
    if (state.homeTab === 'staff') {
      state.route = { view: 'add-staff', storeId: stores[0]?.id || null };
    } else {
      state.route = { view: 'add-store' };
    }
    render();
  });

  app.querySelectorAll('.visited-store-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.route = { view: 'store', id: chip.dataset.storeId };
      render();
    });
  });

  app.querySelectorAll('[data-home-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.homeTab = btn.dataset.homeTab;
      saveHomeTab(state.homeTab);
      render();
    });
  });

  const mapReady = initStoreMap(stores, mapViewCity(), {
    onOpenStore: (id) => {
      state.route = { view: 'store', id };
      render();
    },
  });

  const searchInput = app.querySelector('#search-input');
  searchInput?.addEventListener('input', () => {
    state.listSearch = searchInput.value;
    refreshListBody();
  });

  bindListBodyEvents();
  bindCityFilterEvents();
  bindStaySheet(app);
  await mapReady;

  if (shouldShowBackupReminder()) {
    showBackupReminder();
  }
}

function buildListBody({ stores, query, isStaffMode, isMapMode }) {
  const cityFilter = cityFilterMarkup(CITIES, state.cityId);
  const allCities = showingAllCities();

  if (isMapMode) {
    return `${cityFilter}${visitsSheetMarkup(stores, query)}`;
  }

  if (isStaffMode) {
    const staffSort = getStaffSort();
    const staffRoleFilter = getStaffRoleFilter();
    const allStaffEntries = getStaffBrowseEntries(state.data.staff, cityStores(), {
      cityId: state.cityId,
      sort: staffSort,
    });
    const staffResults = getStaffBrowseEntries(state.data.staff, cityStores(), {
      query,
      cityId: state.cityId,
      roleFilter: staffRoleFilter,
      sort: staffSort,
    });
    const usedRoles = collectUsedRoles(allStaffEntries);

    const staffControlsHtml = `
      ${cityFilter}
      <div class="sort-row">
        <span class="sort-label">Sort</span>
        <div class="sort-options">
          <button type="button" class="sort-chip ${staffSort === 'name' ? 'selected' : ''}" data-staff-sort="name">Name</button>
          <button type="button" class="sort-chip ${staffSort === 'store' ? 'selected' : ''}" data-staff-sort="store">Boutique</button>
          <button type="button" class="sort-chip ${staffSort === 'role' ? 'selected' : ''}" data-staff-sort="role">Role</button>
        </div>
      </div>
      ${
        usedRoles.length
          ? `
      <div class="tag-filter-row">
        <div class="tag-filter-header">
          <span class="sort-label">Filter by role</span>
          ${staffRoleFilter ? `<button type="button" class="btn-text tag-clear-btn" id="clear-role-filters">All roles</button>` : ''}
        </div>
        <div class="tag-filter-scroll">
          <button type="button" class="tag-filter-chip ${staffRoleFilter === '' ? 'selected' : ''}" data-staff-role="">All roles</button>
          ${usedRoles
            .map(
              (role) =>
                `<button type="button" class="tag-filter-chip tag-style-${getRoleBadgeClass(role)} ${staffRoleFilter === role ? 'selected' : ''}" data-staff-role="${escapeHtml(role)}">${escapeHtml(role)}</button>`,
            )
            .join('')}
        </div>
      </div>`
          : ''
      }`;

    if (!staffResults.length) {
      return `
        ${staffControlsHtml}
        <div class="empty-state">
          <div class="icon">👤</div>
          <h2>${allStaffEntries.length === 0 ? 'No staff yet' : 'No staff found'}</h2>
          <p>${allStaffEntries.length === 0 ? 'Tap + to add your first staff member.' : 'Try another search.'}</p>
        </div>`;
    }

    return `
      ${staffControlsHtml}
      <div class="list-section-header">
        <span class="sort-label list-section-label">Staff</span>
        <span class="list-section-count">${staffResults.length}</span>
      </div>
      <ul class="list staff-browse-list">
        ${staffResults
          .map((member) => {
            const phone = member.phone?.trim() || '';
            return `
          <li>
            ${wrapSwipeRow(`
              <div class="restaurant-card staff-browse-card" data-staff-id="${member.id}" data-store-id="${member.storeId}">
                ${renderStaffAvatar(member)}
                <div class="info">
                  <div class="title">${escapeHtml(member.name)}</div>
                  <div class="subtitle">
                    <span class="role-badge ${getRoleBadgeClass(member.role)}">${escapeHtml(member.role)}</span>
                    <span class="subtitle-sep">·</span>
                    <button type="button" class="staff-restaurant-link" data-store-id="${member.storeId}">${escapeHtml(member.store.name)}${allCities ? ` · ${escapeHtml(getCity(member.store.cityId).name)}` : ''}</button>
                  </div>
                </div>
                ${
                  phone
                    ? `<a class="call-btn call-btn-list" href="tel:${formatPhoneLink(phone)}" aria-label="Call">📞</a>`
                    : ''
                }
                <span class="chevron" aria-hidden="true">›</span>
              </div>
            `)}
          </li>`;
          })
          .join('')}
      </ul>
      <p class="swipe-hint">Swipe left on staff to delete</p>`;
  }

  const filtered = stores.filter((s) => matchesSearch(`${s.name} ${s.brand} ${s.address} ${getCity(s.cityId).name}`, query));

  if (!filtered.length) {
    const catalogEmpty = !stores.length;
    return `${cityFilter}<div class="empty-state"><div class="icon">🏛️</div><h2>${catalogEmpty ? 'No boutiques' : 'No matches'}</h2><p>${catalogEmpty ? 'Tap + to add your first boutique.' : 'Try another search.'}</p></div>`;
  }

  return `
    ${cityFilter}
    ${query ? '' : homeJournalMarkup(filtered)}
    <div class="list-section-header">
      <span class="sort-label list-section-label">All boutiques</span>
      <span class="list-section-count">${filtered.length}</span>
    </div>
    <ul class="list">
      ${filtered
        .map((store) => {
          const lastVisit = getLastVisitAt(state.data.visits, store.id);
          const staffCount = state.data.staff.filter((m) => m.storeId === store.id).length;
          const customBadge = isCustomStore(store) ? `<span class="custom-store-badge">Custom</span>` : '';
          const cityName = getCity(store.cityId).name;
          return `
        <li>
          ${wrapSwipeRow(`
          <div class="restaurant-card" data-store-id="${store.id}">
            ${stayStatMarkup(lastVisit)}
            <div class="info">
              <div class="title">${escapeHtml(store.name)} ${customBadge}</div>
              <div class="subtitle">${escapeHtml(allCities ? cityName : store.address.split(',')[0])}</div>
              <div class="staff-item note">${escapeHtml(store.brand)}${staffCount ? ` · ${staffCount} staff` : ''}</div>
            </div>
          </div>
          `, { showVisit: true })}
        </li>`;
        })
        .join('')}
    </ul>
    <p class="swipe-hint">Swipe left to log a visit or delete</p>`;
}

function wrapSwipeRow(contentHtml, { showVisit = false } = {}) {
  return `
    <div class="swipe-row" data-swipe-actions="${showVisit ? 'visit-delete' : 'delete'}">
      <div class="swipe-behind">
        ${showVisit ? `<button class="swipe-visit-btn" type="button">Visit</button>` : ''}
        <button class="swipe-delete-btn" type="button">Delete</button>
      </div>
      <div class="swipe-front">${contentHtml}</div>
    </div>`;
}

function swipeRevealWidth(row) {
  return row?.dataset?.swipeActions === 'visit-delete' ? SWIPE_DELETE_WIDTH + SWIPE_VISIT_WIDTH : SWIPE_DELETE_WIDTH;
}

let openSwipeRow = null;

function closeAllSwipes() {
  document.querySelectorAll('.swipe-row.open, .swipe-row.is-swiping').forEach((row) => {
    row.classList.remove('open', 'is-swiping');
    const front = row.querySelector('.swipe-front');
    if (front) front.style.transform = '';
  });
  openSwipeRow = null;
}

function bindSwipeRow(row, { onTap, onDelete, onVisit }) {
  const front = row.querySelector('.swipe-front');
  const deleteBtn = row.querySelector('.swipe-delete-btn');
  const visitBtn = row.querySelector('.swipe-visit-btn');
  if (!front || !deleteBtn) return;
  const revealWidth = swipeRevealWidth(row);

  let startX = 0;
  let baseOffset = 0;
  let dragging = false;

  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllSwipes();
    hapticLight();
    onDelete();
  });

  visitBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeAllSwipes();
    hapticLight();
    if (onVisit) await onVisit();
  });

  front.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) return;
      if (openSwipeRow && openSwipeRow !== row) closeAllSwipes();
      startX = e.touches[0].clientX;
      baseOffset = row.classList.contains('open') ? -revealWidth : 0;
      dragging = true;
    },
    { passive: true },
  );

  front.addEventListener(
    'touchmove',
    (e) => {
      if (!dragging) return;
      const delta = e.touches[0].clientX - startX;
      let offset = baseOffset + delta;
      if (offset > 0) offset = 0;
      if (offset < -revealWidth) offset = -revealWidth;
      row.classList.toggle('is-swiping', offset < 0);
      front.style.transform = `translateX(${offset}px)`;
    },
    { passive: true },
  );

  front.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    row.classList.remove('is-swiping');
    const match = front.style.transform.match(/-?\d+/);
    const offset = match ? parseInt(match[0], 10) : 0;
    if (offset < -revealWidth / 2) {
      closeAllSwipes();
      row.classList.add('open');
      openSwipeRow = row;
      front.style.transform = `translateX(-${revealWidth}px)`;
    } else {
      row.classList.remove('open');
      front.style.transform = '';
      if (openSwipeRow === row) openSwipeRow = null;
    }
  });

  front.addEventListener('click', (e) => {
    if (row.classList.contains('open')) {
      e.preventDefault();
      closeAllSwipes();
      return;
    }
    if (e.target.closest('a, .call-btn, .staff-restaurant-link, .swipe-visit-btn, .edit-staff-btn, .edit-purchase-btn, [data-photo-action]')) {
      return;
    }
    if (onTap) onTap(e);
  });
}

function bindCityFilterEvents() {
  app.querySelector('#city-filter')?.addEventListener('change', (e) => {
    state.cityId = e.target.value;
    saveSelectedCity(state.cityId);
    render();
  });
  app.querySelector('#clear-city-filter')?.addEventListener('click', () => {
    state.cityId = '';
    saveSelectedCity('');
    render();
  });
}

function refreshListBody() {
  const body = app.querySelector('#list-body');
  if (!body) return;
  body.innerHTML = buildListBody({
    stores: cityStores(),
    query: state.listSearch.toLowerCase().trim(),
    isStaffMode: state.homeTab === 'staff',
    isMapMode: false,
  });
  bindListBodyEvents();
  bindCityFilterEvents();
}

function bindListBodyEvents() {
  if (state.homeTab === 'staff') {
    app.querySelectorAll('.staff-browse-list .swipe-row').forEach((row) => {
      const card = row.querySelector('.staff-browse-card');
      if (!card) return;
      const staffId = card.dataset.staffId;
      const memberName = card.querySelector('.title')?.textContent?.trim() || 'staff';
      bindSwipeRow(row, {
        onTap: () => {
          state.route = { view: 'edit-staff', staffId };
          render();
        },
        onDelete: () => {
          confirmDelete(
            `Delete ${memberName}?`,
            'This cannot be undone.',
            async () => {
              deleteStaff(state.data, staffId);
              saveData(state.data);
              refreshListBody();
            },
          );
        },
      });
    });
  } else {
    app.querySelectorAll('.list .swipe-row').forEach((row) => {
      const card = row.querySelector('.restaurant-card[data-store-id]');
      if (!card) return;
      const storeId = card.dataset.storeId;
      const store = findStore(storeId);
      if (!store) return;
      bindSwipeRow(row, {
        onTap: () => {
          state.route = { view: 'store', id: storeId };
          render();
        },
        onVisit: async () => {
          logVisit(storeId, '');
          await maybeAutoExport(state.data, 'visit');
          alert('Visit logged.');
          refreshListBody();
        },
        onDelete: () => {
          confirmDelete(
            `Delete ${store.name}?`,
            'This removes the boutique and all its staff.',
            async () => {
              removeBoutiqueFromJournal(state.data, storeId, { isCustom: isCustomStore(store) });
              saveData(state.data);
              refreshListBody();
            },
          );
        },
      });
    });
  }

  app.querySelectorAll('.staff-restaurant-link').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.route = { view: 'store', id: btn.dataset.storeId };
      render();
    });
  });

  app.querySelectorAll('[data-staff-sort]').forEach((chip) => {
    chip.addEventListener('click', () => {
      setStaffSort(chip.dataset.staffSort);
      refreshListBody();
    });
  });

  app.querySelectorAll('[data-staff-role]').forEach((chip) => {
    chip.addEventListener('click', () => {
      setStaffRoleFilter(chip.dataset.staffRole);
      refreshListBody();
    });
  });

  app.querySelector('#clear-role-filters')?.addEventListener('click', () => {
    setStaffRoleFilter('');
    refreshListBody();
  });

  app.querySelectorAll('.hero-boutique, .visit-journal-card').forEach((button) => {
    button.addEventListener('click', () => {
      state.route = { view: 'store', id: button.dataset.storeId };
      render();
    });
  });
}

function logVisit(storeId, note) {
  state.data.visits.push({
    id: createId('visit'),
    storeId,
    at: Date.now(),
    note: note.trim(),
  });
  saveData(state.data);
  hapticLight();
}

function addPastVisit(storeId, dateValue, note) {
  const at = new Date(`${dateValue}T12:00:00`).getTime();
  state.data.visits.push({
    id: createId('visit'),
    storeId,
    at,
    note: note.trim(),
  });
  saveData(state.data);
}

function renderStoreDetail(storeId) {
  const store = findStore(storeId);
  if (!store) {
    state.route = { view: 'list' };
    render();
    return;
  }

  const meta = getStoreMeta(state.data, storeId);
  const storeStaff = state.data.staff.filter((m) => m.storeId === storeId);
  const storeVisits = getVisitsForStore(state.data.visits, storeId);
  const storePurchases = getPurchasesForStore(state.data.purchases || [], storeId);
  const lastVisitAt = storeVisits[0]?.at || null;
  const sizeSummary = getBrandSizeSummary(state.data.brandSizes, store.brand);
  const hasBrandSizes = BRAND_SIZE_FIELDS[store.brand];

  const instagramLabel = getStoreInstagramLabel(store);
  const instagramUrl = instagramLabel ? formatInstagramUrl(instagramLabel) : '';

  app.className = 'detail-screen';
  app.innerHTML = `
    <header class="header detail-header">
      <button class="back-btn" id="back-btn" type="button" aria-label="Back">‹</button>
      <h1 class="visually-hidden">${escapeHtml(store.name)}</h1>
    </header>
    <main class="content detail-content">
      <div class="detail-hero">
        ${renderStoreThumb(meta.image, store.brand, 'detail-photo', brandIconClass(store.brand))}
      </div>
      <h2 class="detail-title">${escapeHtml(store.name)}</h2>
      <p class="detail-subtitle">${escapeHtml(store.brand)} · ${escapeHtml(getCity(store.cityId).name)}</p>
      <div class="detail-lead">
        ${stayStatMarkup(lastVisitAt)}
        <div class="detail-lead-copy">
          <div class="detail-lead-label">Since last visit</div>
          <div class="detail-lead-value">${escapeHtml(formatRelativeVisit(lastVisitAt))}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Details</div>
        <div class="card">
          <div class="address-block kv-row">
            <span class="label">Address</span>
            <span class="address-value">${escapeHtml(store.address)}</span>
          </div>
          <div class="kv-row">
            <span class="label">Staff</span>
            <span class="value">${storeStaff.length}</span>
          </div>
          <div class="kv-row">
            <span class="label">Purchases</span>
            <span class="value">${storePurchases.length}</span>
          </div>
          <div class="kv-row">
            <span class="label">Visits</span>
            <span class="value">${storeVisits.length}</span>
          </div>
          ${storeNavActionsMarkup()}
          ${
            instagramLabel
              ? `
          <a class="link-row link-row-instagram" href="${escapeHtml(instagramUrl)}" target="_blank" rel="noopener noreferrer">
            <span class="label">Instagram</span>
            <span class="link-value">${escapeHtml(instagramLabel)}</span>
          </a>`
              : ''
          }
          ${
            meta.note
              ? `
          <div class="note-block kv-row">
            <span class="label">Note</span>
            <p class="restaurant-note">${escapeHtml(meta.note)}</p>
          </div>`
              : `
          <div class="card-row kv-row">
            <span class="label">Note</span>
            <span class="value muted">No note</span>
          </div>`
          }
        </div>
        <button type="button" class="gold-expander" id="detail-more" aria-expanded="false"><span class="gold-expander-label">More</span></button>
        <div id="detail-fold" hidden>
          ${
            hasBrandSizes
              ? `
          <div class="section">
            <div class="section-header-row">
              <div class="section-title">Sizes</div>
              <button type="button" class="btn-text" id="edit-brand-sizes">Edit</button>
            </div>
            <div class="card">
              <p class="data-hint size-brand-hint">Same at every ${escapeHtml(store.brand)} boutique</p>
              <p class="brand-size-summary">${sizeSummary ? escapeHtml(sizeSummary) : '<span class="muted">No sizes yet</span>'}</p>
            </div>
          </div>`
              : ''
          }
          <button class="btn btn-primary full-width" id="edit-store-btn" type="button">${isCustomStore(store) ? 'Edit boutique' : 'Edit photo & note'}</button>
          <button class="btn btn-secondary full-width" id="share-boutique-btn" type="button">Share boutique</button>
        </div>
      </div>

      <div class="section">
        <div class="section-header-row">
          <div class="section-title">Purchases</div>
          <button type="button" class="btn-text" id="add-purchase-btn">Add</button>
        </div>
        ${
          storePurchases.length
            ? `<div class="card purchase-list-card"><div class="purchase-list">${storePurchases.map((purchase) => wrapSwipeRow(renderPurchaseCard(purchase))).join('')}</div></div>
               <p class="swipe-hint">Swipe left on purchases to delete · Tap photo to add or view</p>`
            : `<div class="empty-card">No purchases yet — tap Add to log an item with photo</div>`
        }
      </div>

      <div class="section">
        <div class="section-title">Staff</div>
        <div class="staff-actions">
          <button class="btn btn-primary full-width" id="add-staff-btn" type="button">Add staff</button>
        </div>
        ${
          storeStaff.length === 0
            ? `<div class="empty-card">No staff yet — tap the button above</div>`
            : `<div class="staff-list">${storeStaff.map((member) => wrapSwipeRow(renderStaffCard(member))).join('')}</div>
               <p class="swipe-hint">Swipe left on staff to delete</p>`
        }
      </div>

      <div class="section">
        <div class="section-title">Last visit</div>
        <div class="card visit-card">
          <div class="visit-summary">
            <span class="visit-when">${escapeHtml(formatRelativeVisit(lastVisitAt))}</span>
          </div>
          <label class="visit-note-label" for="visit-note-input">Visit note</label>
          <textarea id="visit-note-input" class="visit-note-input" rows="2" placeholder="What happened on this visit?"></textarea>
          <button class="btn btn-primary full-width" id="log-visit-btn" type="button">Log visit</button>
          <div class="visit-add-past">
            <div class="visit-add-label">Add past visit</div>
            <div class="visit-add-row">
              <input type="date" id="visit-date-input" max="${todayDateString()}" aria-label="Visit date" />
              <button class="btn btn-primary visit-add-btn" id="add-visit-date-btn" type="button">Add</button>
            </div>
          </div>
          ${
            storeVisits.length
              ? `
          <div class="visit-history">
            <div class="visit-history-title">Visit history</div>
            <ul class="visit-list">
              ${storeVisits
                .map(
                  (visit) => `
                <li class="visit-list-item">
                  <div class="visit-list-main">
                    <span class="visit-list-date">${escapeHtml(formatVisitDate(visit.at))}</span>
                    <p class="visit-list-note">${visit.note ? escapeHtml(visit.note) : '<span class="muted">No note</span>'}</p>
                  </div>
                </li>`,
                )
                .join('')}
            </ul>
          </div>`
              : `<p class="visit-empty">No visits yet</p>`
          }
        </div>
      </div>
    </main>
  `;

  bindStoreNavActions(app.querySelector('.card'), store);

  app.querySelector('#back-btn')?.addEventListener('click', () => {
    state.route = { view: 'list' };
    render();
  });
  app.querySelector('#detail-more')?.addEventListener('click', (event) => {
    const fold = app.querySelector('#detail-fold');
    const label = event.currentTarget.querySelector('.gold-expander-label');
    const open = fold?.hasAttribute('hidden');
    if (!fold || !label) return;
    if (open) fold.removeAttribute('hidden');
    else fold.setAttribute('hidden', '');
    label.textContent = open ? 'Less' : 'More';
    event.currentTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  app.querySelector('#edit-store-btn')?.addEventListener('click', () => {
    state.route = { view: 'edit-store', id: storeId };
    render();
  });
  app.querySelector('#share-boutique-btn')?.addEventListener('click', () => {
    shareBoutique(store, meta, state.data.staff, state.data.visits);
  });
  app.querySelector('#edit-brand-sizes')?.addEventListener('click', () => openBrandSizesModal(store.brand, storeId));
  app.querySelector('#add-purchase-btn')?.addEventListener('click', () => {
    state.route = { view: 'add-purchase', storeId };
    render();
  });
  app.querySelector('#add-staff-btn')?.addEventListener('click', () => {
    state.route = { view: 'add-staff', storeId };
    render();
  });

  app.querySelectorAll('.staff-list .swipe-row').forEach((row) => {
    const editBtn = row.querySelector('.edit-staff-btn');
    const memberName = row.querySelector('.contact-name')?.textContent?.trim() || 'staff';
    bindSwipeRow(row, {
      onTap: () => {
        if (editBtn) {
          state.route = { view: 'edit-staff', staffId: editBtn.dataset.id };
          render();
        }
      },
      onDelete: () => {
        const id = editBtn?.dataset.id;
        if (!id) return;
        confirmDelete(`Delete ${memberName}?`, 'This cannot be undone.', async () => {
          deleteStaff(state.data, id);
          saveData(state.data);
          renderStoreDetail(storeId);
        });
      },
    });
  });

  app.querySelectorAll('.purchase-list .swipe-row').forEach((row) => {
    const editBtn = row.querySelector('.edit-purchase-btn');
    const purchaseId = editBtn?.dataset.id;
    bindSwipeRow(row, {
      onTap: (e) => {
        const photoAction = e.target.closest('[data-photo-action]');
        if (photoAction && purchaseId) {
          e.preventDefault();
          e.stopPropagation();
          handlePurchasePhotoAction(storeId, purchaseId, photoAction.dataset.photoAction);
          return;
        }
        if (editBtn) {
          state.route = { view: 'edit-purchase', storeId, purchaseId: editBtn.dataset.id };
          render();
        }
      },
      onDelete: () => {
        const id = editBtn?.dataset.id;
        if (!id) return;
        confirmAction('Delete purchase?', 'Remove this item from your journal.', async () => {
          state.data.purchases = (state.data.purchases || []).filter((purchase) => purchase.id !== id);
          saveData(state.data);
          renderStoreDetail(storeId);
        });
      },
    });
  });

  app.querySelector('#log-visit-btn')?.addEventListener('click', async () => {
    const note = app.querySelector('#visit-note-input')?.value || '';
    logVisit(storeId, note);
    await maybeAutoExport(state.data, 'visit');
    renderStoreDetail(storeId);
  });

  app.querySelector('#add-visit-date-btn')?.addEventListener('click', async () => {
    const dateValue = app.querySelector('#visit-date-input')?.value;
    if (!dateValue) return;
    const note = app.querySelector('#visit-note-input')?.value || '';
    addPastVisit(storeId, dateValue, note);
    await maybeAutoExport(state.data, 'visit');
    renderStoreDetail(storeId);
  });
}

function renderStoreEdit(storeId) {
  const store = findStore(storeId);
  if (!store) {
    state.route = { view: 'list' };
    render();
    return;
  }

  if (isCustomStore(store)) {
    renderCustomStoreForm(storeId);
    return;
  }

  const meta = getStoreMeta(state.data, storeId);

  app.className = '';
  app.innerHTML = `
    <header class="header">
      <button class="back-btn" id="cancel-btn" type="button" aria-label="Back">‹</button>
      <h1>Edit boutique</h1>
    </header>
    <main class="content">
      <form class="form" id="store-form">
        <div class="field">
          <label>Photo</label>
          ${photoPickerMarkup({
            previewImage: meta.image,
            placeholder: 'Add boutique photo',
            placeholderClass: 'staff-photo-preview',
          })}
        </div>
        <div class="field">
          <label for="store-note">Note</label>
          <textarea id="store-note" placeholder="Your notes about this boutique">${escapeHtml(meta.note || '')}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancel-form">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </main>
  `;

  const formRoot = app.querySelector('#store-form');
  const photoPicker = bindPhotoPicker(formRoot, {
    initialImage: meta.image,
    placeholder: 'Add boutique photo',
  });

  const cancel = () => {
    state.route = { view: 'store', id: storeId };
    render();
  };

  app.querySelector('#cancel-btn')?.addEventListener('click', cancel);
  app.querySelector('#cancel-form')?.addEventListener('click', cancel);
  app.querySelector('#store-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    setStoreMeta(state.data, storeId, {
      image: photoPicker.getImagePayload(meta.image),
      note: app.querySelector('#store-note')?.value.trim() || '',
    });
    saveData(state.data);
    state.route = { view: 'store', id: storeId };
    render();
  });
}

function renderCustomStoreForm(storeId = null) {
  const isEdit = !!storeId;
  const store = isEdit ? findStore(storeId) : null;
  if (isEdit && !store) {
    state.route = { view: 'list' };
    render();
    return;
  }
  if (isEdit && store && !isCustomStore(store)) {
    renderStoreEdit(storeId);
    return;
  }

  const meta = isEdit ? getStoreMeta(state.data, storeId) : { image: '', note: '' };
  const selectedCityId = store?.cityId || state.cityId || DEFAULT_CITY_ID || CITIES[0].id;
  const selectedBrand = store?.brand || BRANDS[0];
  const isOtherBrand = selectedBrand && !BRANDS.includes(selectedBrand);

  app.className = '';
  app.innerHTML = `
    <header class="header">
      <button class="back-btn" id="cancel-btn" type="button" aria-label="Back">‹</button>
      <h1>${isEdit ? 'Edit boutique' : 'New boutique'}</h1>
    </header>
    <main class="content">
      <form class="form" id="custom-store-form">
        <div class="field">
          <label>Photo</label>
          ${photoPickerMarkup({
            previewImage: meta.image,
            placeholder: 'Add boutique photo',
            placeholderClass: 'staff-photo-preview',
          })}
        </div>
        <div class="field">
          <label for="store-name">Name</label>
          <input id="store-name" type="text" value="${escapeHtml(store?.name || '')}" placeholder="Boutique name" required />
        </div>
        <div class="field">
          <label for="store-brand">Brand</label>
          <select id="store-brand" class="field-select">
            ${BRANDS.map((brand) => `<option value="${escapeHtml(brand)}" ${brand === selectedBrand ? 'selected' : ''}>${escapeHtml(brand)}</option>`).join('')}
            <option value="Other" ${isOtherBrand || selectedBrand === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="field" id="custom-brand-field" ${isOtherBrand || selectedBrand === 'Other' ? '' : 'hidden'}>
          <label for="store-brand-custom">Custom brand</label>
          <input id="store-brand-custom" type="text" value="${escapeHtml(isOtherBrand ? selectedBrand : '')}" placeholder="Brand name" />
        </div>
        <div class="field">
          <label for="store-city">City</label>
          <select id="store-city" class="field-select" required>
            ${CITIES.map(
              (city) =>
                `<option value="${city.id}" ${city.id === selectedCityId ? 'selected' : ''}>${escapeHtml(city.name)}, ${escapeHtml(city.country)}</option>`,
            ).join('')}
          </select>
        </div>
        <div class="field">
          <label for="store-address">Address</label>
          <input id="store-address" type="text" value="${escapeHtml(store?.address || '')}" placeholder="Street address" required />
        </div>
        <div class="field">
          <label for="store-instagram">Instagram</label>
          <input id="store-instagram" type="text" value="${escapeHtml(store?.instagram || '')}" placeholder="@boutique or brand handle" autocapitalize="none" />
        </div>
        <div class="field">
          <label for="store-note">Note</label>
          <textarea id="store-note" placeholder="Your notes about this boutique">${escapeHtml(meta.note || '')}</textarea>
        </div>
        <div class="form-actions">
          ${isEdit ? `<button type="button" class="btn btn-delete" id="delete-store-btn">Delete boutique</button>` : ''}
          <button type="button" class="btn btn-secondary" id="cancel-form">Cancel</button>
          <button type="submit" class="btn btn-primary" id="save-store-btn">Save</button>
        </div>
      </form>
    </main>
  `;

  const formRoot = app.querySelector('#custom-store-form');
  const brandSelect = app.querySelector('#store-brand');
  const customBrandField = app.querySelector('#custom-brand-field');
  const saveBtn = app.querySelector('#save-store-btn');
  const photoPicker = bindPhotoPicker(formRoot, {
    initialImage: meta.image,
    placeholder: 'Add boutique photo',
  });

  function updateBrandField() {
    const showCustom = brandSelect.value === 'Other';
    customBrandField.hidden = !showCustom;
  }

  brandSelect.addEventListener('change', updateBrandField);
  updateBrandField();

  const cancel = () => {
    if (isEdit) state.route = { view: 'store', id: storeId };
    else state.route = { view: 'list' };
    render();
  };

  app.querySelector('#cancel-btn')?.addEventListener('click', cancel);
  app.querySelector('#cancel-form')?.addEventListener('click', cancel);

  app.querySelector('#delete-store-btn')?.addEventListener('click', () => {
    confirmAction(
      'Delete boutique?',
      'This removes the boutique and all linked staff, visits, and purchases.',
      async () => {
        deleteCustomStore(state.data, storeId);
        saveData(state.data);
        state.route = { view: 'list' };
        render();
      },
      'Delete',
    );
  });

  app.querySelector('#custom-store-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = app.querySelector('#store-name')?.value.trim();
    const address = app.querySelector('#store-address')?.value.trim();
    if (!name || !address) return;

    let brand = brandSelect.value;
    if (brand === 'Other') {
      brand = app.querySelector('#store-brand-custom')?.value.trim() || 'Other';
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    const cityId = app.querySelector('#store-city')?.value || CITIES[0].id;
    const city = getCity(cityId);
    const coords = (await geocodeAddress(`${address}, ${city.name}`)) || {
      lat: city.center.lat,
      lng: city.center.lng,
    };

    const saved = upsertCustomStore(
      state.data,
      {
        cityId,
        brand,
        name,
        address,
        lat: coords.lat,
        lng: coords.lng,
        instagram: app.querySelector('#store-instagram')?.value.trim() || '',
      },
      isEdit ? storeId : null,
    );

    setStoreMeta(state.data, saved.id, {
      image: photoPicker.getImagePayload(meta.image),
      note: app.querySelector('#store-note')?.value.trim() || '',
    });
    saveData(state.data);
    state.route = { view: 'store', id: saved.id };
    render();
  });
}

function handlePurchasePhotoAction(storeId, purchaseId, action) {
  const purchase = (state.data.purchases || []).find((item) => item.id === purchaseId);
  if (!purchase) return;
  if (action === 'view') {
    openPhotoLightbox(purchase.image, purchase.name);
    return;
  }
  openPurchasePhotoModal(storeId, purchaseId);
}

function openPhotoLightbox(imageSrc, caption = '') {
  if (!imageSrc) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay photo-lightbox-overlay';
  overlay.innerHTML = `
    <div class="photo-lightbox" role="dialog" aria-modal="true">
      ${caption ? `<p class="photo-lightbox-caption">${escapeHtml(caption)}</p>` : ''}
      <img class="photo-lightbox-image" src="${escapeHtml(imageSrc)}" alt="${escapeHtml(caption || 'Purchase photo')}" />
      <button type="button" class="btn btn-secondary full-width" id="photo-lightbox-close">Close</button>
    </div>`;
  const close = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };
  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
  overlay.querySelector('#photo-lightbox-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

function openPurchasePhotoModal(storeId, purchaseId) {
  const purchase = (state.data.purchases || []).find((item) => item.id === purchaseId);
  if (!purchase) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h2>${purchase.image ? 'Change photo' : 'Add photo'}</h2>
      <p class="modal-text">${escapeHtml(purchase.name)}</p>
      <div id="purchase-photo-picker-root">
        ${photoPickerMarkup({
          previewImage: purchase.image || '',
          placeholder: 'Add item photo',
          placeholderClass: 'purchase-photo-preview',
        })}
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary modal-btn" id="purchase-photo-cancel">Cancel</button>
        <button type="button" class="btn btn-primary modal-btn" id="purchase-photo-save">Save photo</button>
      </div>
    </div>`;

  const modal = overlay.querySelector('.modal');
  const pickerRoot = overlay.querySelector('#purchase-photo-picker-root');
  const photoPicker = bindPhotoPicker(pickerRoot, {
    initialImage: purchase.image || '',
    placeholder: 'Add item photo',
  });

  const close = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
  modal.addEventListener('click', (e) => e.stopPropagation());
  overlay.querySelector('#purchase-photo-cancel')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('#purchase-photo-save')?.addEventListener('click', () => {
    const index = state.data.purchases.findIndex((item) => item.id === purchaseId);
    if (index < 0) return;
    state.data.purchases[index] = normalizePurchase({
      ...state.data.purchases[index],
      image: photoPicker.getImagePayload(purchase.image || ''),
    });
    saveData(state.data);
    close();
    renderStoreDetail(storeId);
  });
}

function renderPurchaseForm(storeId, purchaseId = null) {
  const store = findStore(storeId);
  if (!store) {
    state.route = { view: 'list' };
    render();
    return;
  }

  const isEdit = !!purchaseId;
  const purchase = isEdit ? (state.data.purchases || []).find((item) => item.id === purchaseId) : null;
  if (isEdit && !purchase) {
    state.route = { view: 'store', id: storeId };
    render();
    return;
  }

  app.className = '';
  app.innerHTML = `
    <header class="header">
      <button class="back-btn" id="cancel-btn" type="button" aria-label="Back">‹</button>
      <h1>${isEdit ? 'Edit purchase' : 'New purchase'}</h1>
    </header>
    <main class="content">
      <form class="form" id="purchase-form">
        <p class="field-hint purchase-store-hint">${escapeHtml(store.name)} · ${escapeHtml(getCity(store.cityId).name)}</p>
        <div class="field">
          <label>Photo</label>
          ${photoPickerMarkup({
            previewImage: purchase?.image || '',
            placeholder: 'Add item photo',
            placeholderClass: 'purchase-photo-preview',
          })}
          <p class="field-hint">Take a photo or choose from your library</p>
        </div>
        <div class="field">
          <label for="purchase-name">Name</label>
          <input id="purchase-name" type="text" value="${escapeHtml(purchase?.name || '')}" placeholder="Item name" required />
        </div>
        <div class="field">
          <label for="purchase-price">Price</label>
          <input id="purchase-price" type="text" value="${escapeHtml(purchase?.price || '')}" placeholder="e.g. 12 500 SEK" />
        </div>
        <div class="field">
          <label for="purchase-size">Size</label>
          <input id="purchase-size" type="text" value="${escapeHtml(purchase?.size || '')}" placeholder="e.g. 38, Medium, 41 mm" />
        </div>
        <div class="field">
          <label for="purchase-date">Purchase date</label>
          <input id="purchase-date" type="date" value="${purchase ? new Date(purchase.purchasedAt).toISOString().slice(0, 10) : todayDateString()}" max="${todayDateString()}" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancel-form">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </main>
  `;

  const formRoot = app.querySelector('#purchase-form');
  const photoPicker = bindPhotoPicker(formRoot, {
    initialImage: purchase?.image || '',
    placeholder: 'Add item photo',
  });

  const cancel = () => {
    state.route = { view: 'store', id: storeId };
    render();
  };

  app.querySelector('#cancel-btn')?.addEventListener('click', cancel);
  app.querySelector('#cancel-form')?.addEventListener('click', cancel);

  app.querySelector('#purchase-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = normalizePurchase({
      id: purchase?.id || createId('purchase'),
      storeId,
      name: app.querySelector('#purchase-name')?.value.trim(),
      price: app.querySelector('#purchase-price')?.value.trim(),
      size: app.querySelector('#purchase-size')?.value.trim(),
      image: photoPicker.getImagePayload(purchase?.image || ''),
      purchasedAt: new Date(`${app.querySelector('#purchase-date')?.value || todayDateString()}T12:00:00`).getTime(),
    });

    if (!state.data.purchases) state.data.purchases = [];
    if (isEdit) {
      const index = state.data.purchases.findIndex((item) => item.id === purchaseId);
      if (index >= 0) state.data.purchases[index] = payload;
    } else {
      state.data.purchases.push(payload);
    }

    saveData(state.data);
    state.route = { view: 'store', id: storeId };
    render();
  });
}

function openBrandSizesModal(brand, returnStoreId) {
  const sizes = { ...(state.data.brandSizes?.[brand] || {}) };
  const fields = BRAND_SIZE_FIELDS[brand] || [];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog">
      <h2>My ${escapeHtml(brand)} sizes</h2>
      <p class="modal-text">These apply at every ${escapeHtml(brand)} boutique.</p>
      <form class="form" id="sizes-form">
        ${fields
          .map(
            (field) => `
          <div class="field">
            <label>${escapeHtml(field.label)}${field.unit ? ` (${escapeHtml(field.unit)})` : ''}</label>
            <input name="${field.key}" value="${escapeHtml(sizes[field.key] || '')}" placeholder="${escapeHtml(field.placeholder)}" />
          </div>`,
          )
          .join('')}
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="sizes-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>`;

  overlay.querySelector('#sizes-cancel')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector('#sizes-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    if (!state.data.brandSizes) state.data.brandSizes = {};
    const next = {};
    for (const field of fields) {
      const value = form[field.key]?.value.trim();
      if (value) next[field.key] = value;
    }
    state.data.brandSizes[brand] = next;
    saveData(state.data);
    overlay.remove();
    if (returnStoreId) renderStoreDetail(returnStoreId);
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

function renderStaffForm(storeId, editStaffId) {
  const isEdit = !!editStaffId;
  let member = isEdit ? byId(state.data.staff, editStaffId) : null;
  if (isEdit && !member) {
    state.route = { view: 'list' };
    render();
    return;
  }

  const stores = cityStores().sort((a, b) => {
    const cityCmp = getCity(a.cityId).name.localeCompare(getCity(b.cityId).name);
    if (cityCmp !== 0) return cityCmp;
    return a.name.localeCompare(b.name);
  });

  if (!stores.length) {
    app.className = '';
    app.innerHTML = `<main class="content"><div class="empty-state"><h2>No boutiques</h2></div></main>`;
    return;
  }

  let selectedStoreId = member?.storeId || storeId;
  const storeMatch =
    stores.find((s) => s.id === selectedStoreId) ||
    (state.cityId ? stores.find((s) => s.cityId === state.cityId) : null) ||
    stores[0];
  selectedStoreId = storeMatch.id;

  app.className = '';
  app.innerHTML = `
    <header class="header">
      <button class="back-btn" id="cancel-btn" type="button" aria-label="Back">‹</button>
      <h1>${isEdit ? 'Edit staff' : 'New staff'}</h1>
    </header>
    <main class="content">
      <form class="form" id="staff-form">
        <div class="field">
          <label>Photo</label>
          ${photoPickerMarkup({
            previewImage: member?.image || '',
            placeholder: 'Add staff photo',
            placeholderClass: 'staff-photo-preview',
          })}
        </div>
        <div class="field">
          <label for="staff-store">Boutique</label>
          <select id="staff-store" class="field-select" required>
            ${stores
              .map((store) => {
                const label = `${store.name} · ${getCity(store.cityId).name}`;
                return `<option value="${store.id}" ${store.id === selectedStoreId ? 'selected' : ''}>${escapeHtml(label)}</option>`;
              })
              .join('')}
          </select>
          <p class="field-hint">${isEdit ? 'Change if they moved to another boutique.' : 'Pick which boutique they work at.'}</p>
        </div>
        <div class="field">
          <label for="name">Name</label>
          <input id="name" type="text" value="${escapeHtml(member?.name || '')}" placeholder="Full name" required />
          ${isNativeApp() ? '<button type="button" class="btn btn-secondary full-width" id="import-contact-btn">Import from Contacts</button>' : ''}
        </div>
        <div class="field">
          <label for="phone">Phone</label>
          <input id="phone" type="tel" value="${escapeHtml(member?.phone || '')}" placeholder="Phone number" />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" value="${escapeHtml(member?.email || '')}" placeholder="Email address" />
        </div>
        <div class="field">
          <label for="staff-instagram">Instagram</label>
          <input id="staff-instagram" type="text" value="${escapeHtml(member?.instagram || '')}" placeholder="@username" autocapitalize="none" />
        </div>
        <div class="field">
          <label for="role">Role</label>
          <div class="role-presets" id="role-presets">
            ${ROLE_PRESETS.map(
              (preset) =>
                `<button type="button" class="preset-chip" data-role="${escapeHtml(preset)}">${escapeHtml(preset)}</button>`,
            ).join('')}
          </div>
          <input id="role" type="text" value="${escapeHtml(member?.role || '')}" placeholder="Custom role" required />
        </div>
        <div class="field">
          <label for="note">Note</label>
          <textarea id="note" placeholder="Short note">${escapeHtml(member?.note || '')}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancel-form">Cancel</button>
          <button type="submit" class="btn btn-primary" id="save-btn">Save</button>
        </div>
      </form>
    </main>
  `;

  const nameInput = app.querySelector('#name');
  const phoneInput = app.querySelector('#phone');
  const emailInput = app.querySelector('#email');
  const noteInput = app.querySelector('#note');
  const instagramInput = app.querySelector('#staff-instagram');
  const roleInput = app.querySelector('#role');
  const storeSelect = app.querySelector('#staff-store');
  const saveBtn = app.querySelector('#save-btn');
  const formRoot = app.querySelector('#staff-form');
  const photoPicker = bindPhotoPicker(formRoot, {
    initialImage: member?.image || '',
    placeholder: 'Add staff photo',
  });

  function updatePresetHighlight() {
    const current = roleInput.value.trim();
    app.querySelectorAll('.preset-chip').forEach((chip) => {
      const preset = chip.dataset.role;
      const isMatch =
        preset === 'Other' ? current !== '' && !ROLE_PRESETS.slice(0, -1).includes(current) : current === preset;
      chip.classList.toggle('selected', isMatch);
    });
  }

  function updateSave() {
    saveBtn.disabled = !nameInput.value.trim() || !roleInput.value.trim() || !storeSelect.value;
  }

  nameInput.addEventListener('input', updateSave);
  roleInput.addEventListener('input', () => {
    updateSave();
    updatePresetHighlight();
  });
  storeSelect.addEventListener('change', updateSave);
  updateSave();
  updatePresetHighlight();

  app.querySelectorAll('.preset-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (chip.dataset.role === 'Other') {
        roleInput.value = '';
        roleInput.focus();
      } else {
        roleInput.value = chip.dataset.role;
      }
      updateSave();
      updatePresetHighlight();
    });
  });

  const cancel = () => {
    if (storeId && !isEdit) {
      state.route = { view: 'store', id: storeId };
    } else {
      state.route = { view: 'list' };
    }
    render();
  };

  app.querySelector('#cancel-btn')?.addEventListener('click', cancel);
  app.querySelector('#cancel-form')?.addEventListener('click', cancel);

  app.querySelector('#import-contact-btn')?.addEventListener('click', async () => {
    try {
      const contact = await window.BoutiqueNative.pickContact();
      if (!contact) return;
      if (contact.name) nameInput.value = contact.name;
      if (contact.phone) phoneInput.value = contact.phone;
      if (contact.email) emailInput.value = contact.email;
      if (contact.note && !noteInput.value.trim()) noteInput.value = contact.note;
      updateSave();
    } catch (err) {
      alert('Could not import that contact.');
      console.error(err);
    }
  });

  app.querySelector('#staff-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = normalizeStaff({
      storeId: storeSelect.value,
      name: nameInput.value.trim(),
      role: roleInput.value.trim(),
      phone: app.querySelector('#phone').value.trim(),
      email: app.querySelector('#email').value.trim(),
      instagram: app.querySelector('#staff-instagram').value.trim(),
      note: app.querySelector('#note').value.trim(),
      image: photoPicker.getImagePayload(member?.image || ''),
    });
    if (isEdit) {
      Object.assign(member, payload);
    } else {
      state.data.staff.push({ id: createId('staff'), ...payload });
    }
    saveData(state.data);
    const returnStoreId = payload.storeId;
    state.route = returnStoreId ? { view: 'store', id: returnStoreId } : { view: 'list' };
    render();
  });
}

function confirmDelete(title, message, onConfirm, confirmLabel = 'Delete') {
  confirmAction(title, message, onConfirm, confirmLabel, 'Could not delete. Please try again.');
}

function confirmAction(title, message, onConfirm, confirmLabel = 'Confirm', errorMessage = 'Something went wrong. Please try again.') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h2>${escapeHtml(title)}</h2>
      <p class="modal-text">${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary modal-btn" id="modal-cancel" type="button">Cancel</button>
        <button class="btn btn-delete modal-btn" id="modal-confirm" type="button">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`;

  const modal = overlay.querySelector('.modal');
  const close = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
  modal.addEventListener('click', (e) => e.stopPropagation());
  overlay.querySelector('#modal-cancel')?.addEventListener('click', close);
  overlay.querySelector('#modal-confirm')?.addEventListener('click', async () => {
    try {
      await onConfirm();
      close();
    } catch (err) {
      alert(errorMessage);
      console.error(err);
    }
  });
}

function showBackupReminder() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h2>Time for a backup?</h2>
      <p class="modal-text">You have not exported a backup in over ${BACKUP_REMINDER_DAYS} days. Save one to protect your staff and visit history.</p>
      <div class="modal-actions">
        <button class="btn btn-secondary modal-btn" id="reminder-later" type="button">Remind me later</button>
        <button class="btn btn-primary modal-btn" id="reminder-export" type="button">Export now</button>
      </div>
    </div>`;

  const modal = overlay.querySelector('.modal');
  const close = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
  modal.addEventListener('click', (e) => e.stopPropagation());
  overlay.querySelector('#reminder-later')?.addEventListener('click', () => {
    dismissBackupReminder();
    close();
  });
  overlay.querySelector('#reminder-export')?.addEventListener('click', async () => {
    dismissBackupReminder();
    await exportAllData(state.data);
    close();
  });
}

function renderSettingsView() {
  const autoBackupMode = getAutoBackupMode();
  const showVisitedMenu = getShowVisitedMenu();
  const theme = getTheme();

  app.className = '';
  app.innerHTML = `
    <header class="header">
      <button class="back-btn" id="back-btn" type="button" aria-label="Back">‹</button>
      <h1>
        <span class="app-title-block">
          <span>Settings</span>
          <span class="version-badge">${escapeHtml(appVersionLabel())}</span>
        </span>
      </h1>
    </header>
    <main class="content">
      <div class="section settings-section">
        <div class="section-title">Theme</div>
        <div class="card settings-card">
          <div class="appearance-options">
            ${appearanceCardMarkup(theme, 'current', 'Current', 'Warm gold dark')}
            ${appearanceCardMarkup(theme, 'light', 'Light', 'Cream paper')}
            ${appearanceCardMarkup(theme, 'midnight', 'Midnight', 'Cool night')}
          </div>
        </div>
      </div>
      <div class="section settings-section">
        <div class="section-title">Show / hide info</div>
        <div class="card settings-card">
          <div class="sort-options settings-toggle-row settings-info-toggle">
            <button type="button" class="sort-chip ${showVisitedMenu ? 'selected' : ''}" data-visited-menu="1">Show</button>
            <button type="button" class="sort-chip ${!showVisitedMenu ? 'selected' : ''}" data-visited-menu="0">Hide</button>
          </div>
        </div>
      </div>
      <div class="section settings-section">
        <div class="section-title">Share lists</div>
        <div class="card settings-card">
          <p class="data-hint">Share boutique names, addresses, and notes as a JSON file (no staff, visits, or purchases). On iPhone, use the share sheet or Files → On My iPhone → Boutique Journal.</p>
          <div class="share-list-scope">
            <label class="sort-label" for="share-list-scope">Scope</label>
            <select id="share-list-scope" class="city-filter-select">
              <option value="all">All boutiques</option>
              <option value="city" ${state.cityId ? 'selected' : ''}>Filtered city${state.cityId ? ` (${escapeHtml(getCity(state.cityId).name)})` : ''}</option>
              <option value="visited">Visited only</option>
            </select>
          </div>
          <div class="field share-list-name-field">
            <label for="share-list-name">List name</label>
            <input id="share-list-name" type="text" value="My boutique list" />
          </div>
          <button class="btn btn-secondary full-width" id="share-list-export" type="button">Share boutique list</button>
          <label class="btn btn-secondary full-width import-label">
            Import shared list
            <input type="file" id="share-list-import" accept=".json,application/json" hidden />
          </label>
        </div>
      </div>
      <div class="section settings-section">
        <div class="section-title">Backup</div>
        <div class="card settings-card">
          <p class="data-hint backup-last-hint">${escapeHtml(getLastExportLabel())}</p>
          <p class="data-hint">To restore, use Import from file. On iPhone, exported backups are in Files → On My iPhone → Boutique Journal.</p>
          <button class="btn btn-secondary full-width" id="export-btn" type="button">Export to file</button>
          <label class="btn btn-secondary full-width import-label">
            Import from file
            <input type="file" id="import-input" accept=".json,application/json" hidden />
          </label>
          <div class="auto-backup-block">
            <span class="sort-label">Auto-backup</span>
            <div class="sort-options auto-backup-options">
              <button type="button" class="sort-chip ${autoBackupMode === 'off' ? 'selected' : ''}" data-auto-backup="off">Off</button>
              <button type="button" class="sort-chip ${autoBackupMode === 'weekly' ? 'selected' : ''}" data-auto-backup="weekly">Weekly</button>
              <button type="button" class="sort-chip ${autoBackupMode === 'visit' ? 'selected' : ''}" data-auto-backup="visit">On visit</button>
            </div>
            <p class="data-hint auto-backup-hint">Weekly and visit modes save a backup file to Files → On My iPhone → Boutique Journal (and may open the share sheet).</p>
          </div>
        </div>
      </div>
      <div class="section settings-section">
        <div class="section-title">Journal</div>
        <div class="card settings-card">
          <p class="data-hint">Removes staff, visits, purchases, notes, sizes, and boutiques you added. The built-in catalogue stays. Export a backup first if you need a copy.</p>
          <button class="btn btn-delete full-width settings-action-btn" id="clear-journal-btn" type="button">Clear journal</button>
        </div>
      </div>
      <div class="section settings-section">
        <div class="section-title">About</div>
        <div class="card settings-card settings-about">
          <a class="btn btn-secondary full-width settings-link" id="support-link" href="${escapeHtml(SUPPORT_URL)}" target="_blank" rel="noopener noreferrer">Support</a>
          <a class="btn btn-secondary full-width settings-link" id="privacy-link" href="${escapeHtml(PRIVACY_URL)}" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </div>
      </div>
    </main>
  `;

  app.querySelector('#back-btn')?.addEventListener('click', () => {
    state.route = { view: 'list' };
    render();
  });

  app.querySelectorAll('[data-auto-backup]').forEach((chip) => {
    chip.addEventListener('click', () => {
      setAutoBackupMode(chip.dataset.autoBackup);
      renderSettingsView();
    });
  });

  app.querySelectorAll('[data-appearance]').forEach((card) => {
    card.addEventListener('click', () => {
      setTheme(card.dataset.appearance);
      renderSettingsView();
    });
  });

  app.querySelectorAll('[data-visited-menu]').forEach((chip) => {
    chip.addEventListener('click', () => {
      setShowVisitedMenu(chip.dataset.visitedMenu === '1');
      renderSettingsView();
    });
  });

  app.querySelector('#export-btn')?.addEventListener('click', () => exportAllData(state.data));

  app.querySelector('#clear-journal-btn')?.addEventListener('click', () => {
    confirmAction(
      'Clear journal?',
      'This permanently removes staff, visits, purchases, notes, sizes, and boutiques you added. The built-in catalogue stays.',
      () => {
        state.data = emptyData();
        saveData(state.data);
        state.listSearch = '';
        state.route = { view: 'list' };
        render();
      },
      'Clear journal',
    );
  });

  app.querySelector('#share-list-export')?.addEventListener('click', async () => {
    const scope = app.querySelector('#share-list-scope')?.value || 'all';
    const name = app.querySelector('#share-list-name')?.value.trim() || 'My boutique list';
    if (scope === 'city' && !state.cityId) {
      alert('Choose a city on the home screen first, or select All boutiques.');
      return;
    }
    const cityScope = scope === 'city' ? state.cityId : '';
    const stores = getShareScopeStores(state.data, scope, cityScope);
    if (!stores.length) {
      alert('No boutiques in this scope to share.');
      return;
    }
    const payload = buildShareListPayload(name, stores, state.data);
    const fileName = await exportShareListFile(payload);
    alert(
      isNativeApp()
        ? `List saved. Use the share sheet, or find it in Files → On My iPhone → Boutique Journal.\n\n${fileName}`
        : `List saved as ${fileName}. Share the file from your downloads folder.`,
    );
  });

  const shareListImport = app.querySelector('#share-list-import');
  shareListImport?.addEventListener('change', async () => {
    const file = shareListImport.files?.[0];
    shareListImport.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const result = importSharedList(state.data, payload);
      saveData(state.data);
      alert(`Imported ${result.total} boutiques (${result.added} new, ${result.updated} updated).`);
    } catch (err) {
      alert('Could not import that list file.');
      console.error(err);
    }
  });

  const importInput = app.querySelector('#import-input');
  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;
    confirmAction(
      'Replace all data?',
      'This replaces all staff, visits, photos, notes, and sizes with the backup file. Export first if you need a copy of current data.',
      async () => {
        try {
          state.data = await importAllData(file);
          saveData(state.data);
          alert('Backup imported successfully.');
          state.route = { view: 'list' };
          render();
        } catch (err) {
          alert('Could not import that file. Check that it is a valid Boutique Journal backup.');
          console.error(err);
        }
      },
      'Import',
    );
  });

}

applyStoredTheme();
bindKeyboardInset();
render();
window.BoutiqueNative?.hideSplash?.();
