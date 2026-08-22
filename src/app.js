import { BRANDS, ENTRY_TYPES } from './brands.js';
import { CITIES, getCity, getStoresForCity, STORES } from './cities.js';
import {
  bindChromeAutoHide,
  brandIconClass,
  brandInitial,
  cityFilterMarkup,
  escapeHtml,
  homeTabsMarkup,
  listHeroMarkup,
} from './frame.js';
import {
  destroyMap,
  initStoreMap,
  mapLegendMarkup,
  showNavigationPicker,
} from './maps.js';
import {
  APP_VERSION,
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
  createId,
  filterByCity,
  loadData,
  loadSelectedCity,
  resetToSeed,
  saveData,
  saveSelectedCity,
} from './store.js';

const state = {
  data: loadData(),
  cityId: loadSelectedCity(),
  homeTab: 'stores',
  listSearch: '',
  route: { view: 'list' },
  editingEntry: null,
};

const app = document.getElementById('app');

function byId(list, id) {
  return list.find((item) => item.id === id);
}

function cityContext() {
  const city = getCity(state.cityId);
  return {
    city,
    stores: getStoresForCity(state.cityId),
    entries: filterByCity(state.data.entries, state.cityId),
  };
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statsForCity({ stores, entries }) {
  return {
    stores: stores.length,
    entries: entries.length,
  };
}

function matchesSearch(text, query) {
  return !query || text.toLowerCase().includes(query);
}

async function render() {
  switch (state.route.view) {
    case 'list':
      await renderList();
      break;
    case 'store':
      renderStoreDetail(state.route.id);
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

  const { city, stores, entries } = cityContext();
  const isMapMode = state.homeTab === 'map';
  const query = state.listSearch.toLowerCase().trim();
  const stats = statsForCity({ stores, entries });
  const listBodyHtml = buildListBody({ stores, entries, query, isMapMode });

  app.className = 'has-home-tabs';
  app.classList.remove('chrome-hidden');
  app.innerHTML = `
    <header class="header header-home">
      <div class="header-home-top">
        <h1><span class="app-title-name">Maison Journal</span></h1>
        <button class="icon-btn" id="settings-btn" type="button" aria-label="Settings">⚙</button>
      </div>
      ${listHeroMarkup(stats)}
    </header>
    <main class="content ${isMapMode ? 'content-map' : ''}">
      ${
        !isMapMode
          ? `
      <div class="search-box">
        <input id="search-input" type="search" placeholder="Search ${escapeHtml(state.homeTab)}…" value="${escapeHtml(state.listSearch)}" enterkeyhint="search" />
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

  app.querySelectorAll('[data-home-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.homeTab = btn.dataset.homeTab;
      render();
    });
  });

  if (isMapMode) {
    initStoreMap(stores, city, (storeId) => {
      state.route = { view: 'store', id: storeId };
      render();
    });
  } else {
    destroyMap();
  }

  const searchInput = app.querySelector('#search-input');
  searchInput?.addEventListener('input', () => {
    state.listSearch = searchInput.value;
    refreshListBody();
  });

  app.querySelector('#city-filter')?.addEventListener('change', (e) => {
    state.cityId = e.target.value;
    saveSelectedCity(state.cityId);
    render();
  });

  bindListBodyEvents();
  if (!isMapMode) bindChromeAutoHide(app);

  if (shouldShowBackupReminder()) {
    showBackupReminder();
  }
}

function buildListBody({ stores, entries, query, isMapMode }) {
  if (isMapMode) {
    return `
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

  const cityFilter = cityFilterMarkup(CITIES, state.cityId);

  if (state.homeTab === 'stores') {
    const filtered = stores.filter(
      (s) => matchesSearch(`${s.name} ${s.brand} ${s.address}`, query),
    );
    if (!filtered.length) {
      return `${cityFilter}<div class="empty-state"><div class="icon">🏛️</div><h2>No maisons</h2><p>Try another city or search.</p></div>`;
    }
    return `
      ${cityFilter}
      <div class="list-section-header">
        <span class="sort-label list-section-label">Maisons</span>
        <span class="list-section-count">${filtered.length}</span>
      </div>
      <ul class="list">
        ${filtered
          .map(
            (store) => `
          <li>
            <div class="card restaurant-card" data-store-id="${store.id}">
              <div class="restaurant-icon ${brandIconClass(store.brand)}">${brandInitial(store.brand)}</div>
              <div class="info">
                <div class="title">${escapeHtml(store.name)}</div>
                <div class="subtitle">${escapeHtml(store.brand)} · ${escapeHtml(store.address.split(',')[0])}</div>
              </div>
              <span class="chevron">›</span>
            </div>
          </li>`,
          )
          .join('')}
      </ul>`;
  }

  if (state.homeTab === 'journal') {
    const filtered = entries
      .filter((e) => matchesSearch(`${e.brand} ${e.type} ${e.notes}`, query))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return `
      ${cityFilter}
      <div class="section-header">
        <span class="section-title">Journal</span>
        <button type="button" class="add-staff-btn" data-add-entry>+ Entry</button>
      </div>
      ${
        filtered.length
          ? `<ul class="list">${filtered
              .map(
                (e) => `
            <li>
              <div class="card restaurant-card" data-entry-id="${e.id}">
                <div class="restaurant-icon ${brandIconClass(e.brand)}">${brandInitial(e.brand)}</div>
                <div class="info">
                  <div class="title">${escapeHtml(e.brand)} · ${escapeHtml(e.type)}</div>
                  <div class="subtitle">${formatDate(e.date)}</div>
                  ${e.notes ? `<div class="staff-item note">${escapeHtml(e.notes)}</div>` : ''}
                </div>
                <span class="chevron">›</span>
              </div>
            </li>`,
              )
              .join('')}</ul>`
          : `<div class="empty-state"><div class="icon">📓</div><h2>No entries</h2><p>Log a visit, fitting, or follow-up.</p></div>`
      }`;
  }

  return '';
}

function refreshListBody() {
  const body = app.querySelector('#list-body');
  if (!body || state.homeTab === 'map') return;
  const ctx = cityContext();
  body.innerHTML = buildListBody({
    ...ctx,
    query: state.listSearch.toLowerCase().trim(),
    isMapMode: false,
  });
  bindListBodyEvents();
}

function bindListBodyEvents() {
  app.querySelectorAll('[data-store-id]').forEach((el) => {
    el.addEventListener('click', () => {
      state.route = { view: 'store', id: el.dataset.storeId };
      render();
    });
  });

  app.querySelector('[data-add-entry]')?.addEventListener('click', () => {
    state.editingEntry = 'new';
    openEntryModal();
  });

  app.querySelectorAll('[data-entry-id]').forEach((el) => {
    el.addEventListener('click', () => {
      state.editingEntry = byId(state.data.entries, el.dataset.entryId);
      openEntryModal();
    });
  });
}

function renderStoreDetail(storeId) {
  const store = STORES.find((s) => s.id === storeId);
  if (!store) {
    state.route = { view: 'list' };
    render();
    return;
  }

  const { entries } = cityContext();
  const relatedEntries = entries.filter((e) => e.brand === store.brand);

  app.className = '';
  app.innerHTML = `
    <header class="header">
      <button class="back-btn" id="back-btn" type="button" aria-label="Back">‹</button>
      <h1>${escapeHtml(store.name)}</h1>
    </header>
    <main class="content detail-content">
      <div class="detail-hero">
        <div class="restaurant-icon detail-photo ${brandIconClass(store.brand)}" style="width:96px;height:96px;font-size:2rem;border-radius:22px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">${brandInitial(store.brand)}</div>
        <h2 class="detail-title">${escapeHtml(store.name)}</h2>
        <p class="detail-subtitle">${escapeHtml(store.brand)} · ${escapeHtml(getCity(store.cityId).name)}</p>
      </div>
      <div class="section">
        <div class="section-title">Address</div>
        <div class="card">
          <button type="button" class="address-btn" id="directions-btn">${escapeHtml(store.address)}</button>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Your journal (${relatedEntries.length})</div>
        <div class="card">
          ${
            relatedEntries.length
              ? relatedEntries
                  .slice(0, 5)
                  .map(
                    (e) => `
              <div class="card-row">
                <span class="label">${formatDate(e.date)}</span>
                <span class="value">${escapeHtml(e.type)}</span>
              </div>`,
                  )
                  .join('')
              : '<p class="data-hint" style="padding:14px 16px;">No journal entries for this maison yet.</p>'
          }
        </div>
        <button type="button" class="btn btn-secondary full-width" id="add-entry-btn" style="margin-top:8px;">+ Add entry</button>
      </div>
    </main>
  `;

  app.querySelector('#back-btn')?.addEventListener('click', () => {
    state.route = { view: 'list' };
    render();
  });
  app.querySelector('#directions-btn')?.addEventListener('click', () => showNavigationPicker(store));
  app.querySelector('#add-entry-btn')?.addEventListener('click', () => {
    state.editingEntry = 'new';
    state.prefillBrand = store.brand;
    openEntryModal();
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

function showBackupReminder() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h2>Time for a backup?</h2>
      <p class="modal-text">You have not exported a backup in over ${BACKUP_REMINDER_DAYS} days. Save one to protect your journal.</p>
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

  app.className = '';
  app.innerHTML = `
    <header class="header">
      <button class="back-btn" id="back-btn" type="button" aria-label="Back">‹</button>
      <h1>Settings <span class="version-badge">${APP_VERSION}</span></h1>
    </header>
    <main class="content">
      <div class="section settings-section">
        <div class="section-title">Backup</div>
        <div class="card settings-card">
          <p class="data-hint backup-last-hint">${escapeHtml(getLastExportLabel())}</p>
          <p class="data-hint">Export a JSON backup of your journal entries across all cities. To restore, use Import from file below.</p>
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
              <button type="button" class="sort-chip ${autoBackupMode === 'visit' ? 'selected' : ''}" data-auto-backup="visit">On entry</button>
            </div>
            <p class="data-hint auto-backup-hint">Weekly saves once per week. On entry saves when you log a journal entry. Backups download to your device.</p>
          </div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Sample data</div>
        <div class="card settings-card">
          <p class="data-hint">Replace all entries with a few demo journal notes.</p>
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

  app.querySelector('#export-btn')?.addEventListener('click', () => exportAllData(state.data));

  const importInput = app.querySelector('#import-input');
  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;
    confirmAction(
      'Replace all data?',
      'This replaces all journal entries with the backup file. Export first if you need a copy of current data.',
      async () => {
        try {
          state.data = await importAllData(file);
          saveData(state.data);
          alert('Backup imported successfully.');
          state.route = { view: 'list' };
          render();
        } catch (err) {
          alert('Could not import that file. Check that it is a valid Maison Journal backup.');
          console.error(err);
        }
      },
      'Import',
    );
  });

  app.querySelector('#reset-btn')?.addEventListener('click', () => {
    confirmAction(
      'Reset sample data?',
      'This permanently replaces all journal entries with the built-in demo notes.',
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

function openEntryModal() {
  const entry = state.editingEntry === 'new' ? null : state.editingEntry;
  const isNew = !entry;
  const defaultBrand = state.prefillBrand || entry?.brand || 'Hermès';
  state.prefillBrand = null;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog">
      <h2>${isNew ? 'New journal entry' : 'Edit entry'}</h2>
      <form class="form" id="entry-form">
        <div class="field"><label>Date</label><input name="date" type="datetime-local" required value="${entry ? toLocalInput(entry.date) : toLocalInput(new Date())}" /></div>
        <div class="field"><label>Maison</label><select name="brand">${BRANDS.map((b) => `<option ${defaultBrand === b ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
        <div class="field"><label>Type</label><select name="type">${ENTRY_TYPES.map((t) => `<option ${entry?.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label>Notes</label><textarea name="notes" required>${escapeHtml(entry?.notes || '')}</textarea></div>
        <div class="field"><label>Follow-up (optional)</label><input name="followUpDate" type="date" value="${escapeHtml(entry?.followUpDate || '')}" /></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>`;

  overlay.querySelector('#cancel-btn')?.addEventListener('click', () => {
    state.editingEntry = null;
    overlay.remove();
  });
  overlay.querySelector('#entry-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      cityId: state.cityId,
      date: new Date(form.date.value).toISOString(),
      brand: form.brand.value,
      type: form.type.value,
      notes: form.notes.value.trim(),
      followUpDate: form.followUpDate.value || null,
    };
    if (isNew) state.data.entries.push({ id: createId('entry'), ...payload });
    else Object.assign(state.editingEntry, payload);
    saveData(state.data);
    state.editingEntry = null;
    overlay.remove();
    await maybeAutoExport(state.data, 'visit');
    render();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

function toLocalInput(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

render();
