import './styles.css';
import {
  CATEGORIES,
  createId,
  exportData,
  getWearCounts,
  importData,
  loadData,
  saveData,
} from './store.js';

const state = {
  data: loadData(),
  view: 'wardrobe',
  filter: 'all',
  editingItem: null,
  editingEntry: null,
};

const app = document.getElementById('app');

function itemById(id) {
  return state.data.items.find((item) => item.id === id);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function render() {
  const wearCounts = getWearCounts(state.data.entries);
  const filteredItems =
    state.filter === 'all'
      ? state.data.items
      : state.data.items.filter((item) => item.category === state.filter);

  app.innerHTML = `
    <div class="shell">
      <header class="hero">
        <div>
          <p class="eyebrow">Wardrobe Journal</p>
          <h1>Your closet, remembered.</h1>
          <p class="lede">Track what you own, log what you wear, and build a personal style history — all in your browser.</p>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-value">${state.data.items.length}</span>
            <span class="stat-label">Pieces</span>
          </div>
          <div class="stat">
            <span class="stat-value">${state.data.entries.length}</span>
            <span class="stat-label">Journal entries</span>
          </div>
        </div>
      </header>

      <nav class="tabs" role="tablist">
        <button class="tab ${state.view === 'wardrobe' ? 'active' : ''}" data-view="wardrobe">Wardrobe</button>
        <button class="tab ${state.view === 'journal' ? 'active' : ''}" data-view="journal">Journal</button>
        <button class="tab ${state.view === 'data' ? 'active' : ''}" data-view="data">Data</button>
      </nav>

      <main>
        ${state.view === 'wardrobe' ? renderWardrobe(filteredItems, wearCounts) : ''}
        ${state.view === 'journal' ? renderJournal() : ''}
        ${state.view === 'data' ? renderDataPanel() : ''}
      </main>
    </div>

    ${state.editingItem !== null ? renderItemModal() : ''}
    ${state.editingEntry !== null ? renderEntryModal() : ''}
  `;

  bindEvents();
}

function renderWardrobe(items, wearCounts) {
  const filters = ['all', ...CATEGORIES]
    .map(
      (cat) =>
        `<button class="chip ${state.filter === cat ? 'active' : ''}" data-filter="${cat}">${
          cat === 'all' ? 'All' : cat
        }</button>`,
    )
    .join('');

  const cards =
    items.length === 0
      ? `<div class="empty">No items yet. Add your first piece to start building your wardrobe.</div>`
      : items
          .map((item) => {
            const wears = wearCounts[item.id] ?? 0;
            return `
              <article class="card" data-item-id="${item.id}">
                <div class="card-color" style="background:${item.color || '#d4cfc7'}"></div>
                <div class="card-body">
                  <div class="card-top">
                    <h3>${escapeHtml(item.name)}</h3>
                    <span class="badge">${escapeHtml(item.category)}</span>
                  </div>
                  ${item.notes ? `<p class="card-notes">${escapeHtml(item.notes)}</p>` : ''}
                  <div class="card-meta">
                    <span>Worn ${wears} time${wears === 1 ? '' : 's'}</span>
                    <div class="card-actions">
                      <button class="ghost" data-edit-item="${item.id}">Edit</button>
                      <button class="ghost danger" data-delete-item="${item.id}">Delete</button>
                    </div>
                  </div>
                </div>
              </article>
            `;
          })
          .join('');

  return `
    <section class="panel">
      <div class="panel-head">
        <h2>Wardrobe</h2>
        <button class="primary" data-add-item>Add piece</button>
      </div>
      <div class="filters">${filters}</div>
      <div class="grid">${cards}</div>
    </section>
  `;
}

function renderJournal() {
  const sorted = [...state.data.entries].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const entries =
    sorted.length === 0
      ? `<div class="empty">No journal entries yet. Log today's outfit to get started.</div>`
      : sorted
          .map((entry) => {
            const pieces = (entry.itemIds ?? [])
              .map((id) => itemById(id))
              .filter(Boolean)
              .map((item) => `<span class="tag">${escapeHtml(item.name)}</span>`)
              .join('');

            return `
              <article class="entry" data-entry-id="${entry.id}">
                <div class="entry-head">
                  <div>
                    <h3>${formatDate(entry.date)}</h3>
                    ${entry.occasion ? `<p class="entry-occasion">${escapeHtml(entry.occasion)}</p>` : ''}
                  </div>
                  <div class="entry-actions">
                    <button class="ghost" data-edit-entry="${entry.id}">Edit</button>
                    <button class="ghost danger" data-delete-entry="${entry.id}">Delete</button>
                  </div>
                </div>
                ${pieces ? `<div class="entry-tags">${pieces}</div>` : ''}
                ${entry.notes ? `<p class="entry-notes">${escapeHtml(entry.notes)}</p>` : ''}
                ${entry.rating ? `<p class="entry-rating">${'★'.repeat(entry.rating)}${'☆'.repeat(5 - entry.rating)}</p>` : ''}
              </article>
            `;
          })
          .join('');

  return `
    <section class="panel">
      <div class="panel-head">
        <h2>Journal</h2>
        <button class="primary" data-add-entry>Log outfit</button>
      </div>
      <div class="entries">${entries}</div>
    </section>
  `;
}

function renderDataPanel() {
  return `
    <section class="panel">
      <div class="panel-head">
        <h2>Your data</h2>
      </div>
      <p class="data-copy">Everything is stored locally in your browser. Export a backup anytime, or import a previous export on a new device.</p>
      <div class="data-actions">
        <button class="secondary" data-export>Export JSON</button>
        <label class="secondary file-label">
          Import JSON
          <input type="file" accept="application/json,.json" data-import hidden />
        </label>
      </div>
    </section>
  `;
}

function renderItemModal() {
  const item = state.editingItem === 'new' ? null : state.editingItem;
  const isNew = !item;

  return `
    <div class="modal-backdrop" data-close-modal>
      <form class="modal" data-item-form>
        <h2>${isNew ? 'Add piece' : 'Edit piece'}</h2>
        <label>Name<input name="name" required value="${item ? escapeAttr(item.name) : ''}" placeholder="e.g. Navy linen shirt" /></label>
        <label>Category
          <select name="category">
            ${CATEGORIES.map(
              (cat) =>
                `<option value="${cat}" ${item?.category === cat ? 'selected' : ''}>${cat}</option>`,
            ).join('')}
          </select>
        </label>
        <label>Color<input name="color" type="color" value="${item?.color || '#8b7355'}" /></label>
        <label>Notes<textarea name="notes" rows="3" placeholder="Fit, fabric, where you bought it…">${item ? escapeHtml(item.notes || '') : ''}</textarea></label>
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
  const selected = new Set(entry?.itemIds ?? []);

  const checkboxes =
    state.data.items.length === 0
      ? `<p class="empty inline">Add wardrobe pieces first, then log what you wore.</p>`
      : state.data.items
          .map(
            (item) => `
              <label class="check-row">
                <input type="checkbox" name="itemIds" value="${item.id}" ${selected.has(item.id) ? 'checked' : ''} />
                <span>${escapeHtml(item.name)} <em>${escapeHtml(item.category)}</em></span>
              </label>
            `,
          )
          .join('');

  return `
    <div class="modal-backdrop" data-close-modal>
      <form class="modal" data-entry-form>
        <h2>${isNew ? 'Log outfit' : 'Edit entry'}</h2>
        <label>Date<input name="date" type="date" required value="${entry ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10)}" /></label>
        <label>Occasion<input name="occasion" value="${entry ? escapeAttr(entry.occasion || '') : ''}" placeholder="Work, dinner, travel…" /></label>
        <fieldset>
          <legend>Pieces worn</legend>
          ${checkboxes}
        </fieldset>
        <label>Rating
          <select name="rating">
            <option value="">No rating</option>
            ${[5, 4, 3, 2, 1]
              .map(
                (n) =>
                  `<option value="${n}" ${entry?.rating === n ? 'selected' : ''}>${'★'.repeat(n)}</option>`,
              )
              .join('')}
          </select>
        </label>
        <label>Notes<textarea name="notes" rows="3" placeholder="How did it feel? Would you wear it again?">${entry ? escapeHtml(entry.notes || '') : ''}</textarea></label>
        <div class="modal-actions">
          <button type="button" class="ghost" data-close-modal>Cancel</button>
          <button type="submit" class="primary">${isNew ? 'Save entry' : 'Update'}</button>
        </div>
      </form>
    </div>
  `;
}

function bindEvents() {
  app.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      render();
    });
  });

  app.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      render();
    });
  });

  app.querySelector('[data-add-item]')?.addEventListener('click', () => {
    state.editingItem = 'new';
    render();
  });

  app.querySelector('[data-add-entry]')?.addEventListener('click', () => {
    state.editingEntry = 'new';
    render();
  });

  app.querySelectorAll('[data-edit-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.editingItem = itemById(btn.dataset.editItem);
      render();
    });
  });

  app.querySelectorAll('[data-delete-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Remove this piece from your wardrobe?')) return;
      const id = btn.dataset.deleteItem;
      state.data.items = state.data.items.filter((item) => item.id !== id);
      state.data.entries = state.data.entries.map((entry) => ({
        ...entry,
        itemIds: (entry.itemIds ?? []).filter((itemId) => itemId !== id),
      }));
      saveData(state.data);
      render();
    });
  });

  app.querySelectorAll('[data-edit-entry]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.editingEntry = state.data.entries.find((e) => e.id === btn.dataset.editEntry);
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

  app.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', (event) => {
      if (event.target !== el && !el.hasAttribute('data-close-modal')) return;
      state.editingItem = null;
      state.editingEntry = null;
      render();
    });
  });

  app.querySelector('[data-item-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const payload = {
      name: form.name.value.trim(),
      category: form.category.value,
      color: form.color.value,
      notes: form.notes.value.trim(),
    };

    if (state.editingItem === 'new') {
      state.data.items.push({ id: createId(), ...payload });
    } else {
      Object.assign(state.editingItem, payload);
    }

    saveData(state.data);
    state.editingItem = null;
    render();
  });

  app.querySelector('[data-entry-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const itemIds = [...form.querySelectorAll('input[name="itemIds"]:checked')].map(
      (input) => input.value,
    );
    const payload = {
      date: new Date(form.date.value).toISOString(),
      occasion: form.occasion.value.trim(),
      itemIds,
      rating: form.rating.value ? Number(form.rating.value) : null,
      notes: form.notes.value.trim(),
    };

    if (state.editingEntry === 'new') {
      state.data.entries.push({ id: createId(), ...payload });
    } else {
      Object.assign(state.editingEntry, payload);
    }

    saveData(state.data);
    state.editingEntry = null;
    render();
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", '&#39;');
}

render();
