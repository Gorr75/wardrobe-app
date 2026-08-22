import './styles.css';
import {
  BRAND_SIZE_FIELDS,
  BRANDS,
  ENTRY_TYPES,
  STAFF_ROLES,
  getBrandSizeSummary,
} from './brands.js';
import { CITIES, getCity, getStoreByBrand, getStoresForCity } from './cities.js';
import { appleMapsUrl, googleMapsUrl, highlightStore, initMap, uberUrl } from './maps.js';
import {
  createId,
  exportData,
  filterByCity,
  importData,
  loadData,
  loadSelectedCity,
  newCreator,
  resetToSeed,
  saveData,
  saveSelectedCity,
} from './store.js';

const state = {
  data: loadData(),
  cityId: loadSelectedCity(),
  view: 'stores',
  creatorFilter: 'all',
  selectedStoreId: null,
  sheetScrolled: false,
  editingCreator: null,
  editingStaff: null,
  editingEntry: null,
  sizeBrand: 'Hermès',
};

const app = document.getElementById('app');

function cityData() {
  return {
    city: getCity(state.cityId),
    stores: getStoresForCity(state.cityId),
    creators: filterByCity(state.data.creators, state.cityId),
    staff: filterByCity(state.data.staff, state.cityId),
    entries: filterByCity(state.data.entries, state.cityId),
  };
}

function byId(list, id) {
  return list.find((item) => item.id === id);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", '&#39;');
}

function render() {
  const { city, stores, creators, staff, entries } = cityData();
  const upcoming = entries
    .filter((entry) => entry.followUpDate && new Date(entry.followUpDate) >= new Date())
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));

  app.innerHTML = `
    <div class="app-frame">
      <div id="map" class="map-layer" aria-label="Boutique map for ${escapeHtml(city.name)}"></div>

      <section class="bottom-sheet ${state.sheetScrolled ? 'sheet-scrolled' : ''}">
        <div class="sheet-handle" aria-hidden="true"></div>

        <header class="sheet-header">
          <div class="sheet-header-main">
            <p class="eyebrow">Maison Journal</p>
            <h1>${escapeHtml(city.name)}</h1>
            <p class="lede">${escapeHtml(city.country)} · ${stores.length} maisons</p>
          </div>
          <div class="hero-stats">
            <div class="stat"><span class="stat-value">${creators.length}</span><span class="stat-label">Creators</span></div>
            <div class="stat"><span class="stat-value">${entries.length}</span><span class="stat-label">Entries</span></div>
          </div>
        </header>

        <div class="sheet-toolbar">
          <div class="city-scroll">
            ${CITIES.map(
              (c) =>
                `<button class="city-pill ${state.cityId === c.id ? 'active' : ''}" data-city="${c.id}">${escapeHtml(c.name)}</button>`,
            ).join('')}
          </div>
          ${upcoming.length ? `<p class="alert-strip">${upcoming.length} follow-up${upcoming.length === 1 ? '' : 's'} in ${escapeHtml(city.name)}</p>` : ''}
          <nav class="tabs">
            <button class="tab ${state.view === 'stores' ? 'active' : ''}" data-view="stores">Stores</button>
            <button class="tab ${state.view === 'creators' ? 'active' : ''}" data-view="creators">Creators</button>
            <button class="tab ${state.view === 'journal' ? 'active' : ''}" data-view="journal">Journal</button>
            <button class="tab ${state.view === 'staff' ? 'active' : ''}" data-view="staff">Team</button>
            <button class="tab ${state.view === 'data' ? 'active' : ''}" data-view="data">Data</button>
          </nav>
        </div>

        <div class="sheet-scroll" id="sheet-scroll">
          ${state.view === 'stores' ? renderStores(stores) : ''}
          ${state.view === 'creators' ? renderCreators(creators) : ''}
          ${state.view === 'journal' ? renderJournal(entries, creators, staff) : ''}
          ${state.view === 'staff' ? renderStaff(staff, creators) : ''}
          ${state.view === 'data' ? renderData() : ''}
        </div>
      </section>
    </div>
    ${state.editingCreator ? renderCreatorModal() : ''}
    ${state.editingStaff !== null ? renderStaffModal() : ''}
    ${state.editingEntry !== null ? renderEntryModal() : ''}
  `;

  bindEvents();
  mountMap(city, stores);
}

function renderStores(stores) {
  const cards = stores
    .map((store) => {
      const selected = state.selectedStoreId === store.id;
      return `
        <article class="store-card card ${selected ? 'selected' : ''}" data-store-id="${store.id}">
          <div class="store-card-head">
            <span class="brand-badge brand-${store.brand.toLowerCase().replace('è', 'e')}">${escapeHtml(store.brand)}</span>
            <button class="ghost map-pin" data-focus-store="${store.id}" aria-label="Show on map">Pin</button>
          </div>
          <h3>${escapeHtml(store.name)}</h3>
          <p class="meta">${escapeHtml(store.address)}</p>
          <div class="map-actions">
            <a class="map-link apple" href="${appleMapsUrl(store)}" target="_blank" rel="noopener">Apple Maps</a>
            <a class="map-link uber" href="${uberUrl(store)}" target="_blank" rel="noopener">Uber</a>
            <a class="map-link google" href="${googleMapsUrl(store)}" target="_blank" rel="noopener">Google Maps</a>
          </div>
        </article>
      `;
    })
    .join('');

  return `<div class="panel-inner store-list">${cards}</div>`;
}

function renderCreators(creators) {
  const filtered =
    state.creatorFilter === 'all'
      ? creators
      : creators.filter((creator) => creator.brands.includes(state.creatorFilter));

  const filters = ['all', ...BRANDS]
    .map(
      (brand) =>
        `<button class="chip ${state.creatorFilter === brand ? 'active' : ''}" data-creator-filter="${brand}">${brand === 'all' ? 'All' : brand}</button>`,
    )
    .join('');

  const cards =
    filtered.length === 0
      ? `<div class="empty">No creators in this city yet.</div>`
      : filtered
          .map((creator) => {
            const associate = byId(filterByCity(state.data.staff, state.cityId), creator.primaryAssociateId);
            const brandBadges = creator.brands
              .map((brand) => `<span class="brand-badge brand-${brand.toLowerCase().replace('è', 'e')}">${escapeHtml(brand)}</span>`)
              .join('');
            const sizeLines = creator.brands
              .map((brand) => `<p class="size-line"><strong>${escapeHtml(brand)}</strong> ${escapeHtml(getBrandSizeSummary(creator, brand))}</p>`)
              .join('');
            return `
              <article class="card">
                <div class="card-head">
                  <div><h3>${escapeHtml(creator.name)}</h3><p class="meta">${escapeHtml(creator.neighborhood)}</p></div>
                  <div class="card-actions">
                    <button class="ghost" data-edit-creator="${creator.id}">Edit</button>
                    <button class="ghost danger" data-delete-creator="${creator.id}">Remove</button>
                  </div>
                </div>
                <div class="brand-row">${brandBadges}</div>
                <div class="size-block">${sizeLines}</div>
                ${associate ? `<p class="associate">${escapeHtml(associate.name)} · ${escapeHtml(associate.role)}</p>` : ''}
              </article>
            `;
          })
          .join('');

  return `
    <div class="panel-inner">
      <div class="panel-head"><h2>Creators</h2><button class="primary" data-add-creator>Add</button></div>
      <div class="filters">${filters}</div>
      <div class="grid">${cards}</div>
    </div>
  `;
}

function renderJournal(entries, creators, staff) {
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  const items =
    sorted.length === 0
      ? `<div class="empty">No journal entries for this city.</div>`
      : sorted
          .map((entry) => {
            const creator = byId(creators, entry.creatorId);
            const member = byId(staff, entry.staffId);
            return `
              <article class="entry card">
                <div class="entry-head">
                  <div>
                    <p class="entry-date">${formatDate(entry.date)}</p>
                    <h3>${creator ? escapeHtml(creator.name) : 'Unknown'}</h3>
                    <p class="meta">${escapeHtml(entry.brand)} · ${escapeHtml(entry.type)}</p>
                  </div>
                  <div class="card-actions">
                    <button class="ghost" data-edit-entry="${entry.id}">Edit</button>
                    <button class="ghost danger" data-delete-entry="${entry.id}">Delete</button>
                  </div>
                </div>
                ${member ? `<p class="associate">${escapeHtml(member.name)} · ${escapeHtml(member.role)}</p>` : ''}
                <p class="notes">${escapeHtml(entry.notes)}</p>
              </article>
            `;
          })
          .join('');

  return `
    <div class="panel-inner">
      <div class="panel-head"><h2>Journal</h2><button class="primary" data-add-entry>New entry</button></div>
      <div class="entries">${items}</div>
    </div>
  `;
}

function renderStaff(staff, creators) {
  const cards =
    staff.length === 0
      ? `<div class="empty">No team members in this city.</div>`
      : staff
          .map((member) => {
            const count = creators.filter((c) => c.primaryAssociateId === member.id).length;
            return `
              <article class="card">
                <div class="card-head">
                  <div><h3>${escapeHtml(member.name)}</h3><p class="role">${escapeHtml(member.role)}</p></div>
                  <div class="card-actions">
                    <button class="ghost" data-edit-staff="${member.id}">Edit</button>
                    <button class="ghost danger" data-delete-staff="${member.id}">Remove</button>
                  </div>
                </div>
                <p class="meta">${escapeHtml(member.boutique)}</p>
                <p class="associate">${count} primary creator${count === 1 ? '' : 's'}</p>
              </article>
            `;
          })
          .join('');

  return `
    <div class="panel-inner">
      <div class="panel-head"><h2>Team</h2><button class="primary" data-add-staff>Add</button></div>
      <div class="grid">${cards}</div>
    </div>
  `;
}

function renderData() {
  return `
    <div class="panel-inner">
      <div class="panel-head"><h2>Data</h2></div>
      <p class="panel-copy">Export all cities or reset to sample data.</p>
      <div class="data-actions">
        <button class="secondary" data-export>Export JSON</button>
        <label class="secondary file-label">Import JSON<input type="file" accept="application/json,.json" data-import hidden /></label>
        <button class="ghost danger" data-reset>Reset sample data</button>
      </div>
    </div>
  `;
}

function renderCreatorModal() {
  const creator = state.editingCreator === 'new' ? newCreator(state.cityId) : state.editingCreator;
  const isNew = state.editingCreator === 'new';
  const neighborhoods = getCity(state.cityId).neighborhoods;
  const cityStaff = filterByCity(state.data.staff, state.cityId);

  const brandChecks = BRANDS.map(
    (brand) => `<label class="check-row"><input type="checkbox" name="brands" value="${brand}" ${creator.brands.includes(brand) ? 'checked' : ''} /><span>${brand}</span></label>`,
  ).join('');

  const sizeTabs = BRANDS.map(
    (brand) => `<button type="button" class="chip ${state.sizeBrand === brand ? 'active' : ''}" data-size-brand="${brand}">${brand}</button>`,
  ).join('');

  const sizeFields = (BRAND_SIZE_FIELDS[state.sizeBrand] ?? [])
    .map(
      (field) => `
        <label>${field.label} <span class="unit">(${field.unit})</span>
          <input name="size-${state.sizeBrand}-${field.key}" value="${escapeAttr(creator.brandSizes?.[state.sizeBrand]?.[field.key] ?? '')}" placeholder="${escapeAttr(field.placeholder)}" />
        </label>
      `,
    )
    .join('');

  const associateOptions = [
    '<option value="">Unassigned</option>',
    ...cityStaff.map(
      (m) => `<option value="${m.id}" ${creator.primaryAssociateId === m.id ? 'selected' : ''}>${escapeHtml(m.name)} · ${escapeHtml(m.role)}</option>`,
    ),
  ].join('');

  return `
    <div class="modal-backdrop" data-close-modal>
      <form class="modal modal-wide" data-creator-form>
        <h2>${isNew ? 'Add creator' : 'Edit creator'}</h2>
        <label>Name<input name="name" required value="${escapeAttr(creator.name)}" /></label>
        <label>Neighborhood<select name="neighborhood">${neighborhoods.map((n) => `<option ${creator.neighborhood === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <fieldset><legend>Maisons</legend>${brandChecks}</fieldset>
        <fieldset><legend>Brand sizes</legend><div class="filters">${sizeTabs}</div><div class="size-form">${sizeFields}</div></fieldset>
        <label>Primary associate<select name="primaryAssociateId">${associateOptions}</select></label>
        <label>Notes<textarea name="notes" rows="3">${escapeHtml(creator.notes ?? '')}</textarea></label>
        <div class="modal-actions"><button type="button" class="ghost" data-close-modal>Cancel</button><button type="submit" class="primary">Save</button></div>
      </form>
    </div>
  `;
}

function renderStaffModal() {
  const member = state.editingStaff === 'new' ? null : state.editingStaff;
  const isNew = !member;
  const brandChecks = BRANDS.map(
    (brand) => `<label class="check-row"><input type="checkbox" name="brands" value="${brand}" ${member?.brands?.includes(brand) ? 'checked' : ''} /><span>${brand}</span></label>`,
  ).join('');

  const boutiqueOptions = BRANDS.map((brand) => {
    const store = getStoreByBrand(state.cityId, brand);
    const label = store ? `${brand} — ${store.address.split(',')[0]}` : brand;
    return `<option ${member?.boutique?.startsWith(brand) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');

  return `
    <div class="modal-backdrop" data-close-modal>
      <form class="modal" data-staff-form>
        <h2>${isNew ? 'Add team member' : 'Edit team member'}</h2>
        <label>Name<input name="name" required value="${escapeAttr(member?.name ?? '')}" /></label>
        <label>Role<select name="role">${STAFF_ROLES.map((r) => `<option ${member?.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
        <label>Boutique<select name="boutique">${boutiqueOptions}</select></label>
        <fieldset><legend>Maisons</legend>${brandChecks}</fieldset>
        <div class="modal-actions"><button type="button" class="ghost" data-close-modal>Cancel</button><button type="submit" class="primary">Save</button></div>
      </form>
    </div>
  `;
}

function renderEntryModal() {
  const entry = state.editingEntry === 'new' ? null : state.editingEntry;
  const isNew = !entry;
  const creators = filterByCity(state.data.creators, state.cityId);
  const staff = filterByCity(state.data.staff, state.cityId);

  return `
    <div class="modal-backdrop" data-close-modal>
      <form class="modal" data-entry-form>
        <h2>${isNew ? 'New entry' : 'Edit entry'}</h2>
        <label>Date<input name="date" type="datetime-local" required value="${entry ? toLocalInput(entry.date) : toLocalInput(new Date())}" /></label>
        <label>Creator<select name="creatorId" required><option value="">Select</option>${creators.map((c) => `<option value="${c.id}" ${entry?.creatorId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select></label>
        <label>Team member<select name="staffId" required><option value="">Select</option>${staff.map((m) => `<option value="${m.id}" ${entry?.staffId === m.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}</select></label>
        <label>Maison<select name="brand">${BRANDS.map((b) => `<option ${entry?.brand === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
        <label>Type<select name="type">${ENTRY_TYPES.map((t) => `<option ${entry?.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>Notes<textarea name="notes" rows="4" required>${escapeHtml(entry?.notes ?? '')}</textarea></label>
        <label>Follow-up<input name="followUpDate" type="date" value="${entry?.followUpDate?.slice(0, 10) ?? ''}" /></label>
        <div class="modal-actions"><button type="button" class="ghost" data-close-modal>Cancel</button><button type="submit" class="primary">Save</button></div>
      </form>
    </div>
  `;
}

function toLocalInput(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function mountMap(city, stores) {
  const container = document.getElementById('map');
  initMap(container, city, stores, (storeId) => {
    state.selectedStoreId = storeId;
    highlightStore(storeId, stores);
    render();
  });
}

function bindEvents() {
  const scroller = document.getElementById('sheet-scroll');
  scroller?.addEventListener(
    'scroll',
    () => {
      const scrolled = scroller.scrollTop > 48;
      if (scrolled !== state.sheetScrolled) {
        state.sheetScrolled = scrolled;
        document.querySelector('.bottom-sheet')?.classList.toggle('sheet-scrolled', scrolled);
      }
    },
    { passive: true },
  );

  app.querySelectorAll('[data-city]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.cityId = btn.dataset.city;
      state.selectedStoreId = null;
      state.sheetScrolled = false;
      saveSelectedCity(state.cityId);
      render();
    });
  });

  app.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      render();
    });
  });

  app.querySelectorAll('[data-focus-store]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedStoreId = btn.dataset.focusStore;
      highlightStore(state.selectedStoreId, getStoresForCity(state.cityId));
      render();
    });
  });

  app.querySelectorAll('[data-creator-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.creatorFilter = btn.dataset.creatorFilter;
      render();
    });
  });

  app.querySelector('[data-add-creator]')?.addEventListener('click', () => {
    state.editingCreator = 'new';
    state.sizeBrand = 'Hermès';
    render();
  });

  app.querySelectorAll('[data-edit-creator]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.editingCreator = byId(state.data.creators, btn.dataset.editCreator);
      state.sizeBrand = state.editingCreator?.brands?.[0] ?? 'Hermès';
      render();
    });
  });

  app.querySelectorAll('[data-delete-creator]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Remove this creator?')) return;
      const id = btn.dataset.deleteCreator;
      state.data.creators = state.data.creators.filter((c) => c.id !== id);
      state.data.entries = state.data.entries.filter((e) => e.creatorId !== id);
      saveData(state.data);
      render();
    });
  });

  app.querySelector('[data-add-staff]')?.addEventListener('click', () => {
    state.editingStaff = 'new';
    render();
  });

  app.querySelectorAll('[data-edit-staff]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.editingStaff = byId(state.data.staff, btn.dataset.editStaff);
      render();
    });
  });

  app.querySelectorAll('[data-delete-staff]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Remove this team member?')) return;
      const id = btn.dataset.deleteStaff;
      state.data.staff = state.data.staff.filter((s) => s.id !== id);
      state.data.creators = state.data.creators.map((c) => (c.primaryAssociateId === id ? { ...c, primaryAssociateId: '' } : c));
      state.data.entries = state.data.entries.filter((e) => e.staffId !== id);
      saveData(state.data);
      render();
    });
  });

  app.querySelector('[data-add-entry]')?.addEventListener('click', () => {
    state.editingEntry = 'new';
    render();
  });

  app.querySelectorAll('[data-edit-entry]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.editingEntry = byId(state.data.entries, btn.dataset.editEntry);
      render();
    });
  });

  app.querySelectorAll('[data-delete-entry]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this entry?')) return;
      state.data.entries = state.data.entries.filter((e) => e.id !== btn.dataset.deleteEntry);
      saveData(state.data);
      render();
    });
  });

  app.querySelector('[data-export]')?.addEventListener('click', () => exportData(state.data, state.cityId));
  app.querySelector('[data-import]')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      state.data = await importData(file);
      saveData(state.data);
      render();
    } catch (error) {
      alert(error.message);
    }
    event.target.value = '';
  });

  app.querySelector('[data-reset]')?.addEventListener('click', () => {
    if (!confirm('Reset all sample data?')) return;
    state.data = resetToSeed();
    saveData(state.data);
    render();
  });

  app.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', (event) => {
      if (event.target !== el && !el.hasAttribute('data-close-modal')) return;
      state.editingCreator = null;
      state.editingStaff = null;
      state.editingEntry = null;
      render();
    });
  });

  app.querySelectorAll('[data-size-brand]').forEach((btn) => {
    btn.addEventListener('click', () => {
      persistCreatorFormDraft();
      state.sizeBrand = btn.dataset.sizeBrand;
      render();
    });
  });

  app.querySelector('[data-creator-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const brands = [...form.querySelectorAll('input[name="brands"]:checked')].map((i) => i.value);
    const brandSizes = { Hermès: {}, Omega: {}, Chanel: {} };
    for (const brand of BRANDS) {
      for (const field of BRAND_SIZE_FIELDS[brand]) {
        const input = form.querySelector(`[name="size-${brand}-${field.key}"]`);
        if (input?.value.trim()) brandSizes[brand][field.key] = input.value.trim();
      }
    }
    const payload = {
      cityId: state.cityId,
      name: form.name.value.trim(),
      neighborhood: form.neighborhood.value,
      tags: [],
      brands,
      brandSizes,
      notes: form.notes.value.trim(),
      primaryAssociateId: form.primaryAssociateId.value,
    };
    if (state.editingCreator === 'new') {
      state.data.creators.push({ id: createId('creator'), ...payload });
    } else {
      Object.assign(state.editingCreator, payload);
    }
    saveData(state.data);
    state.editingCreator = null;
    render();
  });

  app.querySelector('[data-staff-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const payload = {
      cityId: state.cityId,
      name: form.name.value.trim(),
      role: form.role.value,
      boutique: form.boutique.value,
      brands: [...form.querySelectorAll('input[name="brands"]:checked')].map((i) => i.value),
    };
    if (state.editingStaff === 'new') {
      state.data.staff.push({ id: createId('staff'), ...payload });
    } else {
      Object.assign(state.editingStaff, payload);
    }
    saveData(state.data);
    state.editingStaff = null;
    render();
  });

  app.querySelector('[data-entry-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const payload = {
      cityId: state.cityId,
      date: new Date(form.date.value).toISOString(),
      creatorId: form.creatorId.value,
      staffId: form.staffId.value,
      brand: form.brand.value,
      type: form.type.value,
      notes: form.notes.value.trim(),
      followUpDate: form.followUpDate.value || null,
    };
    if (state.editingEntry === 'new') {
      state.data.entries.push({ id: createId('entry'), ...payload });
    } else {
      Object.assign(state.editingEntry, payload);
    }
    saveData(state.data);
    state.editingEntry = null;
    render();
  });
}

function persistCreatorFormDraft() {
  const form = app.querySelector('[data-creator-form]');
  if (!form || state.editingCreator === null) return;
  const target = state.editingCreator === 'new' ? newCreator(state.cityId) : state.editingCreator;
  if (!target.brandSizes) target.brandSizes = { Hermès: {}, Omega: {}, Chanel: {} };
  for (const brand of BRANDS) {
    for (const field of BRAND_SIZE_FIELDS[brand]) {
      const input = form.querySelector(`[name="size-${brand}-${field.key}"]`);
      if (input) target.brandSizes[brand][field.key] = input.value.trim();
    }
  }
  if (state.editingCreator === 'new') state.editingCreator = target;
}

render();
