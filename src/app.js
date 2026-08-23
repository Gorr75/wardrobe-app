import { ALL_CITIES_MAP, CITIES, getCity, getStoreInstagramLabel, getStoreById, getStoresForFilter, isCustomStore, STORES } from './cities.js';
import {
  bindChromeAutoHide,
  brandIconClass,
  brandInitial,
  cityFilterMarkup,
  escapeHtml,
  headerActionsMarkup,
  homeTabsMarkup,
  listHeroMarkup,
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
  mapLegendMarkup,
  storeNavActionsMarkup,
} from './maps.js';
import {
  APP_VERSION,
  appVersionLabel,
  BACKUP_REMINDER_DAYS,
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
  emptyData,
  geocodeAddress,
  getLastVisitAt,
  getPurchasesForStore,
  getShowVisitedMenu,
  getStoreMeta,
  getVisitedStores,
  getVisitsForStore,
  isFirstRunPending,
  loadData,
  loadHomeTab,
  loadSelectedCity,
  markFirstRunComplete,
  resetToSeed,
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

const SWIPE_DELETE_WIDTH = 80;
const SWIPE_VISIT_WIDTH = 80;

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

function statsForCity() {
  const stores = cityStores();
  const storeIds = new Set(stores.map((s) => s.id));
  const cityVisits = state.data.visits.filter((v) => storeIds.has(v.storeId));
  const visitedStores = new Set(cityVisits.map((v) => v.storeId));
  const cityStaff = state.data.staff.filter((m) => storeIds.has(m.storeId));
  return {
    stores: stores.length,
    visited: visitedStores.size,
    staff: cityStaff.length,
    visits: cityVisits.length,
  };
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

async function renderList() {
  await checkWeeklyAutoBackup(state.data);

  const stores = cityStores();
  const isStaffMode = state.homeTab === 'staff';
  const isMapMode = state.homeTab === 'map';
  const isStoresMode = state.homeTab === 'stores';
  const query = state.listSearch.toLowerCase().trim();
  const showHeaderStats = getShowVisitedMenu();
  const stats = showHeaderStats && !isStaffMode && !isMapMode ? statsForCity() : null;
  const visitedMenuStores = showHeaderStats && isStoresMode ? visitedStoresForMenu() : [];
  const listBodyHtml = buildListBody({ stores, query, isStaffMode, isMapMode });

  app.className = 'has-home-tabs';
  app.classList.remove('chrome-hidden');
  app.innerHTML = `
    <header class="header header-home">
      <div class="header-home-top">
        <h1><span class="app-title-name">Boutique Journal</span></h1>
        ${headerActionsMarkup({
          showAdd: isStaffMode || isStoresMode,
          addLabel: isStaffMode ? 'Add staff' : 'Add boutique',
          addAria: isStaffMode ? 'Add staff member' : 'Add boutique',
        })}
      </div>
      ${listHeroMarkup(stats)}
      ${visitedStoresMenuMarkup(visitedMenuStores)}
    </header>
    <main class="content ${isMapMode ? 'content-map' : ''}">
      ${
        !isMapMode
          ? `
      <div class="search-box">
        <input id="search-input" type="search" placeholder="${escapeHtml(isStaffMode ? 'Search staff…' : 'Search boutiques…')}" value="${escapeHtml(state.listSearch)}" enterkeyhint="search" />
      </div>`
          : ''
      }
      <div id="list-body">${listBodyHtml}</div>
    </main>
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

  if (isMapMode) {
    initStoreMap(stores, mapViewCity());
  } else {
    destroyMap();
  }

  const searchInput = app.querySelector('#search-input');
  searchInput?.addEventListener('input', () => {
    state.listSearch = searchInput.value;
    refreshListBody();
  });

  bindListBodyEvents();
  bindCityFilterEvents();
  if (!isMapMode) bindChromeAutoHide(app);

  if (shouldShowBackupReminder()) {
    showBackupReminder();
  }

  if (isFirstRunPending()) {
    showFirstRunWelcome();
  }
}

function buildListBody({ stores, query, isStaffMode, isMapMode }) {
  const cityFilter = cityFilterMarkup(CITIES, state.cityId);
  const allCities = showingAllCities();

  if (isMapMode) {
    return `
      ${cityFilter}
      ${mapLegendMarkup()}
      <div class="map-panel">
        <p id="map-status" class="map-status" hidden></p>
        <div id="map-loading" class="map-loading">Loading map…</div>
        <p id="map-empty" class="map-empty" hidden></p>
        <div id="restaurant-map" class="restaurant-map" role="application" aria-label="Boutique map"></div>
        <button type="button" class="map-locate-btn" id="map-locate-btn" aria-label="Locate me" title="Locate me">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path><circle cx="12" cy="12" r="8"></circle></svg>
        </button>
      </div>`;
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
          <p>${allStaffEntries.length === 0 ? 'Tap + to add your first contact at a boutique.' : 'Try another search.'}</p>
        </div>`;
    }

    return `
      ${staffControlsHtml}
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
    return `${cityFilter}<div class="empty-state"><div class="icon">🏛️</div><h2>No boutiques</h2><p>Try another city or search.</p></div>`;
  }

  return `
    ${cityFilter}
    <div class="list-section-header">
      <span class="sort-label list-section-label">Boutiques</span>
      <span class="list-section-count">${filtered.length}</span>
    </div>
    <ul class="list">
      ${filtered
        .map((store) => {
          const lastVisit = getLastVisitAt(state.data.visits, store.id);
          const staffCount = state.data.staff.filter((m) => m.storeId === store.id).length;
          const meta = getStoreMeta(state.data, store.id);
          const thumb = meta.image
            ? renderStoreThumb(meta.image, store.brand, '', brandIconClass(store.brand))
            : `<div class="restaurant-icon ${brandIconClass(store.brand)}">${brandInitial(store.brand)}</div>`;
          const customBadge = isCustomStore(store) ? `<span class="custom-store-badge">Custom</span>` : '';
          return `
        <li>
          ${wrapSwipeRow(`
          <div class="restaurant-card" data-store-id="${store.id}">
            ${thumb}
            <div class="info">
              <div class="title">${escapeHtml(store.name)} ${customBadge}</div>
              <div class="subtitle">${escapeHtml(store.brand)} · ${allCities ? escapeHtml(getCity(store.cityId).name) : escapeHtml(store.address.split(',')[0])}</div>
              <div class="staff-item note">${escapeHtml(formatRelativeVisit(lastVisit))}${staffCount ? ` · ${staffCount} staff` : ''}</div>
            </div>
            <span class="chevron">›</span>
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
    onDelete();
  });

  visitBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeAllSwipes();
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
  if (!body || state.homeTab === 'map') return;
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
          confirmAction(
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
          refreshListBody();
        },
        onDelete: () => {
          const isCustom = isCustomStore(store);
          confirmAction(
            isCustom ? `Delete ${store.name}?` : `Remove ${store.name}?`,
            'This removes the boutique and all linked staff, visits, and purchases.',
            async () => {
              removeBoutiqueFromJournal(state.data, storeId, { isCustom });
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
}

function logVisit(storeId, note) {
  state.data.visits.push({
    id: createId('visit'),
    storeId,
    at: Date.now(),
    note: note.trim(),
  });
  saveData(state.data);
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

  app.className = '';
  app.innerHTML = `
    <header class="header">
      <button class="back-btn" id="back-btn" type="button" aria-label="Back">‹</button>
      <h1>${escapeHtml(store.name)}</h1>
    </header>
    <main class="content detail-content">
      <div class="detail-hero">
        ${renderStoreThumb(meta.image, store.brand, 'detail-photo', brandIconClass(store.brand))}
        <h2 class="detail-title">${escapeHtml(store.name)}</h2>
        <p class="detail-subtitle">${escapeHtml(store.brand)} · ${escapeHtml(getCity(store.cityId).name)}</p>
      </div>

      <div class="section">
        <div class="section-title">Details</div>
        <div class="card">
          <div class="address-block">
            <span class="label">Address</span>
            <span class="address-value">${escapeHtml(store.address)}</span>
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
          <div class="note-block">
            <span class="label">Note</span>
            <p class="restaurant-note">${escapeHtml(meta.note)}</p>
          </div>`
              : `
          <div class="card-row">
            <span class="label">Note</span>
            <span class="value muted">No note</span>
          </div>`
          }
        </div>
        <button class="btn btn-primary full-width" id="edit-store-btn" type="button">${isCustomStore(store) ? 'Edit boutique' : 'Edit photo & note'}</button>
        <button class="btn btn-secondary full-width" id="share-boutique-btn" type="button">Share boutique</button>
      </div>

      ${
        hasBrandSizes
          ? `
      <div class="section">
        <div class="section-header-row">
          <div class="section-title">My ${escapeHtml(store.brand)} sizes</div>
          <button type="button" class="btn-text" id="edit-brand-sizes">Edit</button>
        </div>
        <div class="card">
          <p class="data-hint size-brand-hint">Same at every ${escapeHtml(store.brand)} boutique</p>
          <p class="brand-size-summary">${sizeSummary ? escapeHtml(sizeSummary) : '<span class="muted">No sizes yet</span>'}</p>
        </div>
      </div>`
          : ''
      }

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
        confirmAction(`Delete ${memberName}?`, 'This cannot be undone.', async () => {
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
        </div>
        <div class="field">
          <label for="phone">Phone</label>
          <input id="phone" type="tel" value="${escapeHtml(member?.phone || '')}" placeholder="+46 70 123 45 67" />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" value="${escapeHtml(member?.email || '')}" placeholder="name@example.com" />
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

function confirmAction(title, message, onConfirm, confirmLabel = 'Confirm') {
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
      alert('Something went wrong. Please try again.');
      console.error(err);
    }
  });
}

function showFirstRunWelcome() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal onboarding-modal" role="dialog" aria-modal="true">
      <h2>Welcome to Boutique Journal</h2>
      <p class="modal-text">Your personal luxury boutique journal. Everything stays on this device.</p>
      <ul class="onboarding-list">
        <li>Browse ${STORES.length} boutiques across 6 cities</li>
        <li>Track staff, visits, purchases, and notes</li>
        <li>Share boutique lists with friends (optional)</li>
      </ul>
      <div class="modal-actions">
        <button class="btn btn-secondary modal-btn" id="first-run-empty" type="button">Start empty</button>
        <button class="btn btn-primary modal-btn" id="first-run-sample" type="button">Load sample journal</button>
      </div>
      <label class="btn btn-secondary full-width import-label first-run-import">
        Import backup file
        <input type="file" id="first-run-import" accept=".json,application/json" hidden />
      </label>
    </div>`;

  const modal = overlay.querySelector('.modal');
  const close = () => {
    overlay.remove();
    document.body.style.overflow = '';
  };

  const finish = (data) => {
    state.data = data;
    saveData(state.data);
    markFirstRunComplete();
    close();
    render();
  };

  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
  modal.addEventListener('click', (e) => e.stopPropagation());

  overlay.querySelector('#first-run-empty')?.addEventListener('click', () => {
    finish(emptyData());
  });

  overlay.querySelector('#first-run-sample')?.addEventListener('click', () => {
    finish(resetToSeed());
  });

  overlay.querySelector('#first-run-import')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      finish(await importAllData(file));
    } catch (err) {
      alert('Could not import that backup file.');
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

  app.className = '';
  app.innerHTML = `
    <header class="header">
      <button class="back-btn" id="back-btn" type="button" aria-label="Back">‹</button>
      <h1>Settings</h1>
    </header>
    <main class="content">
      <div class="section settings-section">
        <div class="section-title">About</div>
        <div class="card settings-card">
          <div class="card-row">
            <span class="label">Boutique Journal</span>
            <span class="value">${escapeHtml(appVersionLabel())}</span>
          </div>
        </div>
      </div>
      <div class="section settings-section">
        <div class="section-title">Display</div>
        <div class="card settings-card">
          <p class="data-hint">Show the top stats bar (Visited, Staff, Visits, Boutiques) and quick shortcuts to visited boutiques on the Boutiques tab. Hide to save space.</p>
          <div class="sort-options settings-toggle-row">
            <button type="button" class="sort-chip ${showVisitedMenu ? 'selected' : ''}" data-visited-menu="1">Show</button>
            <button type="button" class="sort-chip ${!showVisitedMenu ? 'selected' : ''}" data-visited-menu="0">Hide</button>
          </div>
        </div>
      </div>
      <div class="section settings-section">
        <div class="section-title">Share lists</div>
        <div class="card settings-card">
          <p class="data-hint">Share boutique lists as JSON files — names, addresses, and notes only (no staff, visits, or purchases).</p>
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
          <p class="data-hint">Export staff, visits, purchases, custom boutiques, photos/notes, and your brand sizes. To restore, use Import from file below.</p>
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
            <p class="data-hint auto-backup-hint">Weekly saves once per week. On visit saves when you log a boutique visit. Backups download to your device.</p>
          </div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Sample data</div>
        <div class="card settings-card">
          <p class="data-hint">Replace all staff, visits, purchases, custom boutiques, and demo sizes with built-in sample data.</p>
          <button class="btn btn-delete full-width" id="reset-btn" type="button">Reset sample data</button>
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

  app.querySelectorAll('[data-visited-menu]').forEach((chip) => {
    chip.addEventListener('click', () => {
      setShowVisitedMenu(chip.dataset.visitedMenu === '1');
      renderSettingsView();
    });
  });

  app.querySelector('#export-btn')?.addEventListener('click', () => exportAllData(state.data));

  app.querySelector('#share-list-export')?.addEventListener('click', () => {
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
    const fileName = exportShareListFile(payload);
    alert(`List saved as ${fileName}. Share the file from your downloads folder.`);
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

  app.querySelector('#reset-btn')?.addEventListener('click', () => {
    confirmAction(
      'Reset sample data?',
      'This permanently replaces all staff and visits with the built-in demo data.',
      async () => {
        state.data = resetToSeed();
        saveData(state.data);
        state.route = { view: 'list' };
        render();
      },
      'Reset',
    );
  });
}

render();
