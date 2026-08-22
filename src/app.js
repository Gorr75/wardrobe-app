import './styles.css';
import {
  BOUTIQUES,
  BRAND_SIZE_FIELDS,
  BRANDS,
  CITY,
  ENTRY_TYPES,
  STAFF_ROLES,
  STOCKHOLM_NEIGHBORHOODS,
  getBrandSizeSummary,
} from './brands.js';
import {
  createId,
  exportData,
  importData,
  loadData,
  newCreator,
  resetToSeed,
  saveData,
} from './store.js';

const state = {
  data: loadData(),
  view: 'creators',
  creatorFilter: 'all',
  editingCreator: null,
  editingStaff: null,
  editingEntry: null,
  sizeBrand: 'Hermès',
};

const app = document.getElementById('app');

function byId(list, id) {
  return list.find((item) => item.id === id);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('sv-SE', {
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
  const upcoming = state.data.entries
    .filter((entry) => entry.followUpDate && new Date(entry.followUpDate) >= new Date())
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));

  app.innerHTML = `
    <div class="shell">
      <header class="hero">
        <div>
          <p class="eyebrow">Maison Journal · ${escapeHtml(CITY)}</p>
          <h1>Clienteling for the maisons.</h1>
          <p class="lede">Track Stockholm creators, brand-specific sizes, and every client interaction across Hermès, Omega, and Chanel.</p>
        </div>
        <div class="hero-stats">
          <div class="stat"><span class="stat-value">${state.data.creators.length}</span><span class="stat-label">Creators</span></div>
          <div class="stat"><span class="stat-value">${state.data.entries.length}</span><span class="stat-label">Journal entries</span></div>
          <div class="stat"><span class="stat-value">${state.data.staff.length}</span><span class="stat-label">Team</span></div>
        </div>
      </header>

      ${
        upcoming.length
          ? `<section class="alert-strip">${upcoming.length} follow-up${upcoming.length === 1 ? '' : 's'} scheduled</section>`
          : ''
      }

      <nav class="tabs">
        <button class="tab ${state.view === 'creators' ? 'active' : ''}" data-view="creators">Creators</button>
        <button class="tab ${state.view === 'journal' ? 'active' : ''}" data-view="journal">Journal</button>
        <button class="tab ${state.view === 'staff' ? 'active' : ''}" data-view="staff">Team</button>
        <button class="tab ${state.view === 'data' ? 'active' : ''}" data-view="data">Data</button>
      </nav>

      <main>
        ${state.view === 'creators' ? renderCreators() : ''}
        ${state.view === 'journal' ? renderJournal() : ''}
        ${state.view === 'staff' ? renderStaff() : ''}
        ${state.view === 'data' ? renderData() : ''}
      </main>
    </div>
    ${state.editingCreator ? renderCreatorModal() : ''}
    ${state.editingStaff !== null ? renderStaffModal() : ''}
    ${state.editingEntry !== null ? renderEntryModal() : ''}
  `;

  bindEvents();
}

function renderCreators() {
  const filtered =
    state.creatorFilter === 'all'
      ? state.data.creators
      : state.data.creators.filter((creator) => creator.brands.includes(state.creatorFilter));

  const filters = ['all', ...BRANDS]
    .map(
      (brand) =>
        `<button class="chip ${state.creatorFilter === brand ? 'active' : ''}" data-creator-filter="${brand}">${
          brand === 'all' ? 'All maisons' : brand
        }</button>`,
    )
    .join('');

  const cards =
    filtered.length === 0
      ? `<div class="empty">No creators yet. Add your first Stockholm client to begin.</div>`
      : filtered
          .map((creator) => {
            const associate = byId(state.data.staff, creator.primaryAssociateId);
            const brandBadges = creator.brands
              .map((brand) => `<span class="brand-badge brand-${brand.toLowerCase().replace('è', 'e')}">${escapeHtml(brand)}</span>`)
              .join('');
            const sizeLines = creator.brands
              .map(
                (brand) =>
                  `<p class="size-line"><strong>${escapeHtml(brand)}</strong> ${escapeHtml(getBrandSizeSummary(creator, brand))}</p>`,
              )
              .join('');

            return `
              <article class="card creator-card">
                <div class="card-head">
                  <div>
                    <h3>${escapeHtml(creator.name)}</h3>
                    <p class="meta">${escapeHtml(creator.neighborhood)}, ${escapeHtml(creator.city)}</p>
                  </div>
                  <div class="card-actions">
                    <button class="ghost" data-edit-creator="${creator.id}">Edit</button>
                    <button class="ghost danger" data-delete-creator="${creator.id}">Remove</button>
                  </div>
                </div>
                <div class="brand-row">${brandBadges}</div>
                ${creator.tags?.length ? `<div class="tag-row">${creator.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
                <div class="size-block">${sizeLines || '<p class="muted">No brand sizes recorded.</p>'}</div>
                ${creator.notes ? `<p class="notes">${escapeHtml(creator.notes)}</p>` : ''}
                ${associate ? `<p class="associate">Primary: ${escapeHtml(associate.name)} · ${escapeHtml(associate.role)}</p>` : ''}
              </article>
            `;
          })
          .join('');

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Creators</h2>
          <p class="panel-copy">Stockholm client list with per-maison sizing.</p>
        </div>
        <button class="primary" data-add-creator>Add creator</button>
      </div>
      <div class="filters">${filters}</div>
      <div class="grid">${cards}</div>
    </section>
  `;
}

function renderJournal() {
  const sorted = [...state.data.entries].sort((a, b) => new Date(b.date) - new Date(a.date));

  const entries =
    sorted.length === 0
      ? `<div class="empty">No journal entries yet. Log a client interaction to start.</div>`
      : sorted
          .map((entry) => {
            const creator = byId(state.data.creators, entry.creatorId);
            const staffMember = byId(state.data.staff, entry.staffId);
            return `
              <article class="entry card">
                <div class="entry-head">
                  <div>
                    <p class="entry-date">${formatDate(entry.date)}</p>
                    <h3>${creator ? escapeHtml(creator.name) : 'Unknown creator'}</h3>
                    <p class="meta">${escapeHtml(entry.brand)} · ${escapeHtml(entry.type)}</p>
                  </div>
                  <div class="card-actions">
                    <button class="ghost" data-edit-entry="${entry.id}">Edit</button>
                    <button class="ghost danger" data-delete-entry="${entry.id}">Delete</button>
                  </div>
                </div>
                ${staffMember ? `<p class="associate">${escapeHtml(staffMember.name)} · ${escapeHtml(staffMember.role)}</p>` : ''}
                <p class="notes">${escapeHtml(entry.notes)}</p>
                ${entry.followUpDate ? `<p class="follow-up">Follow-up: ${formatDate(entry.followUpDate)}</p>` : ''}
              </article>
            `;
          })
          .join('');

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Journal</h2>
          <p class="panel-copy">Appointments, fittings, and follow-ups across the maisons.</p>
        </div>
        <button class="primary" data-add-entry>New entry</button>
      </div>
      <div class="entries">${entries}</div>
    </section>
  `;
}

function renderStaff() {
  const cards =
    state.data.staff.length === 0
      ? `<div class="empty">No team members yet. Add sales associates and managers.</div>`
      : state.data.staff
          .map((member) => {
            const clientCount = state.data.creators.filter(
              (creator) => creator.primaryAssociateId === member.id,
            ).length;
            const brandBadges = member.brands
              .map((brand) => `<span class="brand-badge brand-${brand.toLowerCase().replace('è', 'e')}">${escapeHtml(brand)}</span>`)
              .join('');
            return `
              <article class="card staff-card">
                <div class="card-head">
                  <div>
                    <h3>${escapeHtml(member.name)}</h3>
                    <p class="role">${escapeHtml(member.role)}</p>
                  </div>
                  <div class="card-actions">
                    <button class="ghost" data-edit-staff="${member.id}">Edit</button>
                    <button class="ghost danger" data-delete-staff="${member.id}">Remove</button>
                  </div>
                </div>
                <p class="meta">${escapeHtml(member.boutique)}</p>
                <div class="brand-row">${brandBadges}</div>
                <p class="associate">${clientCount} primary creator${clientCount === 1 ? '' : 's'}</p>
              </article>
            `;
          })
          .join('');

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Team</h2>
          <p class="panel-copy">Sales associates, client advisors, and boutique leadership.</p>
        </div>
        <button class="primary" data-add-staff>Add team member</button>
      </div>
      <div class="grid">${cards}</div>
    </section>
  `;
}

function renderData() {
  return `
    <section class="panel">
      <div class="panel-head"><h2>Data</h2></div>
      <p class="panel-copy">All data stays in your browser. Export backups or reset to the Stockholm sample list.</p>
      <div class="data-actions">
        <button class="secondary" data-export>Export JSON</button>
        <label class="secondary file-label">Import JSON<input type="file" accept="application/json,.json" data-import hidden /></label>
        <button class="ghost danger" data-reset>Reset to Stockholm sample</button>
      </div>
    </section>
  `;
}

function renderCreatorModal() {
  const creator = state.editingCreator === 'new' ? newCreator() : state.editingCreator;
  const isNew = state.editingCreator === 'new';
  if (!creator.brandSizes) creator.brandSizes = { Hermès: {}, Omega: {}, Chanel: {} };

  const brandChecks = BRANDS.map(
    (brand) => `
      <label class="check-row">
        <input type="checkbox" name="brands" value="${brand}" ${creator.brands.includes(brand) ? 'checked' : ''} />
        <span>${brand}</span>
      </label>
    `,
  ).join('');

  const sizeTabs = BRANDS.map(
    (brand) =>
      `<button type="button" class="chip ${state.sizeBrand === brand ? 'active' : ''}" data-size-brand="${brand}">${brand}</button>`,
  ).join('');

  const sizeFields = (BRAND_SIZE_FIELDS[state.sizeBrand] ?? [])
    .map(
      (field) => `
        <label>${field.label} <span class="unit">(${field.unit})</span>
          <input
            name="size-${state.sizeBrand}-${field.key}"
            value="${escapeAttr(creator.brandSizes[state.sizeBrand]?.[field.key] ?? '')}"
            placeholder="${escapeAttr(field.placeholder)}"
          />
        </label>
      `,
    )
    .join('');

  const associateOptions = [
    '<option value="">Unassigned</option>',
    ...state.data.staff.map(
      (member) =>
        `<option value="${member.id}" ${creator.primaryAssociateId === member.id ? 'selected' : ''}>${escapeHtml(member.name)} · ${escapeHtml(member.role)}</option>`,
    ),
  ].join('');

  return `
    <div class="modal-backdrop" data-close-modal>
      <form class="modal modal-wide" data-creator-form>
        <h2>${isNew ? 'Add creator' : 'Edit creator'}</h2>
        <div class="form-grid">
          <label>Name<input name="name" required value="${escapeAttr(creator.name)}" placeholder="Client name" /></label>
          <label>Neighborhood
            <select name="neighborhood">
              ${STOCKHOLM_NEIGHBORHOODS.map(
                (n) => `<option ${creator.neighborhood === n ? 'selected' : ''}>${n}</option>`,
              ).join('')}
            </select>
          </label>
        </div>
        <label>Tags <span class="unit">(comma-separated)</span>
          <input name="tags" value="${escapeAttr((creator.tags ?? []).join(', '))}" placeholder="VIP, Collector" />
        </label>
        <fieldset><legend>Maisons</legend>${brandChecks}</fieldset>
        <fieldset>
          <legend>Brand sizes</legend>
          <div class="filters">${sizeTabs}</div>
          <div class="size-form">${sizeFields}</div>
        </fieldset>
        <label>Primary associate
          <select name="primaryAssociateId">${associateOptions}</select>
        </label>
        <label>Notes<textarea name="notes" rows="3">${escapeHtml(creator.notes ?? '')}</textarea></label>
        <div class="modal-actions">
          <button type="button" class="ghost" data-close-modal>Cancel</button>
          <button type="submit" class="primary">${isNew ? 'Add creator' : 'Save'}</button>
        </div>
      </form>
    </div>
  `;
}

function renderStaffModal() {
  const member = state.editingStaff === 'new' ? null : state.editingStaff;
  const isNew = !member;
  const brandChecks = BRANDS.map(
    (brand) => `
      <label class="check-row">
        <input type="checkbox" name="brands" value="${brand}" ${member?.brands?.includes(brand) ? 'checked' : ''} />
        <span>${brand}</span>
      </label>
    `,
  ).join('');

  const boutiqueOptions = Object.values(BOUTIQUES)
    .map(
      (boutique) =>
        `<option ${member?.boutique === boutique ? 'selected' : ''}>${escapeHtml(boutique)}</option>`,
    )
    .join('');

  return `
    <div class="modal-backdrop" data-close-modal>
      <form class="modal" data-staff-form>
        <h2>${isNew ? 'Add team member' : 'Edit team member'}</h2>
        <label>Name<input name="name" required value="${escapeAttr(member?.name ?? '')}" /></label>
        <label>Role
          <select name="role">
            ${STAFF_ROLES.map(
              (role) => `<option ${member?.role === role ? 'selected' : ''}>${role}</option>`,
            ).join('')}
          </select>
        </label>
        <label>Boutique<select name="boutique">${boutiqueOptions}</select></label>
        <fieldset><legend>Maisons</legend>${brandChecks}</fieldset>
        <div class="modal-actions">
          <button type="button" class="ghost" data-close-modal>Cancel</button>
          <button type="submit" class="primary">${isNew ? 'Add' : 'Save'}</button>
        </div>
      </form>
    </div>
  `;
}

function renderEntryModal() {
  const entry = state.editingEntry === 'new' ? null : state.editingEntry;
  const isNew = !entry;

  const creatorOptions = state.data.creators.map(
    (creator) =>
      `<option value="${creator.id}" ${entry?.creatorId === creator.id ? 'selected' : ''}>${escapeHtml(creator.name)}</option>`,
  );
  const staffOptions = state.data.staff.map(
    (member) =>
      `<option value="${member.id}" ${entry?.staffId === member.id ? 'selected' : ''}>${escapeHtml(member.name)} · ${escapeHtml(member.role)}</option>`,
  );

  return `
    <div class="modal-backdrop" data-close-modal>
      <form class="modal" data-entry-form>
        <h2>${isNew ? 'New journal entry' : 'Edit entry'}</h2>
        <label>Date<input name="date" type="datetime-local" required value="${entry ? toLocalInput(entry.date) : toLocalInput(new Date())}" /></label>
        <label>Creator<select name="creatorId" required><option value="">Select creator</option>${creatorOptions}</select></label>
        <label>Team member<select name="staffId" required><option value="">Select associate</option>${staffOptions}</select></label>
        <div class="form-grid">
          <label>Maison
            <select name="brand">${BRANDS.map((brand) => `<option ${entry?.brand === brand ? 'selected' : ''}>${brand}</option>`).join('')}</select>
          </label>
          <label>Type
            <select name="type">${ENTRY_TYPES.map((type) => `<option ${entry?.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select>
          </label>
        </div>
        <label>Notes<textarea name="notes" rows="4" required>${escapeHtml(entry?.notes ?? '')}</textarea></label>
        <label>Follow-up date<input name="followUpDate" type="date" value="${entry?.followUpDate?.slice(0, 10) ?? ''}" /></label>
        <div class="modal-actions">
          <button type="button" class="ghost" data-close-modal>Cancel</button>
          <button type="submit" class="primary">${isNew ? 'Save entry' : 'Update'}</button>
        </div>
      </form>
    </div>
  `;
}

function toLocalInput(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function bindEvents() {
  app.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
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
      if (!confirm('Remove this creator from the Stockholm list?')) return;
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
      state.data.creators = state.data.creators.map((c) =>
        c.primaryAssociateId === id ? { ...c, primaryAssociateId: '' } : c,
      );
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
      if (!confirm('Delete this journal entry?')) return;
      state.data.entries = state.data.entries.filter((e) => e.id !== btn.dataset.deleteEntry);
      saveData(state.data);
      render();
    });
  });

  app.querySelector('[data-export]')?.addEventListener('click', () => exportData(state.data));

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
    if (!confirm('Reset to the Stockholm sample creators, team, and journal?')) return;
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
      name: form.name.value.trim(),
      neighborhood: form.neighborhood.value,
      city: CITY,
      tags: form.tags.value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
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

  const target = state.editingCreator === 'new' ? newCreator() : state.editingCreator;
  if (!target.brandSizes) target.brandSizes = { Hermès: {}, Omega: {}, Chanel: {} };

  for (const brand of BRANDS) {
    for (const field of BRAND_SIZE_FIELDS[brand]) {
      const input = form.querySelector(`[name="size-${brand}-${field.key}"]`);
      if (input) target.brandSizes[brand][field.key] = input.value.trim();
    }
  }

  if (state.editingCreator === 'new') {
    state.editingCreator = target;
  }
}

render();
