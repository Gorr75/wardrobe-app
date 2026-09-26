import { actionIconMarkup, tabIconMarkup } from './icons.js';

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

export function resetPageScroll() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function bindKeyboardInset() {
  const viewport = window.visualViewport;
  if (!viewport || bindKeyboardInset.bound) return;
  bindKeyboardInset.bound = true;

  const apply = () => {
    const active = document.activeElement;
    const editing =
      active &&
      (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    const overlap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    const inset = editing && overlap > 60 ? overlap : 0;
    document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
    if (!inset || !editing) return;
    const content = document.querySelector('#app .content');
    if (content?.contains(active)) {
      active.scrollIntoView({ block: 'nearest' });
    }
  };

  viewport.addEventListener('resize', apply);
  viewport.addEventListener('scroll', apply);
  window.addEventListener('focusin', apply);
  window.addEventListener('focusout', () => {
    document.documentElement.style.setProperty('--keyboard-inset', '0px');
  });
}

export function bindChromeAutoHide(app) {
  const content = app.querySelector('.content');
  const header = app.querySelector('.header-home');
  const tabs = app.querySelector('.home-tabs');
  if (!content || !header || !tabs) {
    app.classList.remove('chrome-hidden');
    return;
  }

  app.style.setProperty('--chrome-header-h', `${header.offsetHeight}px`);
  app.style.setProperty('--chrome-tabs-h', `${tabs.offsetHeight}px`);

  let lastY = content.scrollTop;
  let hidden = app.classList.contains('chrome-hidden');
  let rafPending = false;
  let adjusting = false;

  function setChromeHidden(nextHidden) {
    if (nextHidden === hidden) return;
    const beforeTop = content.getBoundingClientRect().top;
    const beforeScroll = content.scrollTop;
    if (nextHidden) app.classList.add('chrome-hidden');
    else app.classList.remove('chrome-hidden');
    hidden = nextHidden;
    const shift = beforeTop - content.getBoundingClientRect().top;
    adjusting = true;
    content.scrollTop = Math.max(0, beforeScroll - shift);
    adjusting = false;
    lastY = content.scrollTop;
  }

  content.addEventListener(
    'scroll',
    () => {
      if (adjusting || rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const y = content.scrollTop;
        const dy = y - lastY;
        const headerH = header.offsetHeight || 0;
        if (hidden && (y <= 8 || dy < -14)) setChromeHidden(false);
        else if (dy > 14 && !hidden && y >= headerH + 24) setChromeHidden(true);
        lastY = content.scrollTop;
      });
    },
    { passive: true },
  );
}

let sheetSnapName = 'half';
let sheetAbort = null;

export function unbindStaySheet() {
  sheetAbort?.abort();
  sheetAbort = null;
}

export function bindStaySheet(app) {
  unbindStaySheet();
  const sheet = app.querySelector('.stay-sheet');
  const scroll = app.querySelector('.stay-sheet-scroll');
  const grab = app.querySelector('.stay-sheet-grab');
  if (!sheet || !scroll || !grab) return;
  sheetAbort = new AbortController();
  const { signal } = sheetAbort;

  const safeTop = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--safe-top') || '0';
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const snapTops = () => {
    const height = app.clientHeight || window.innerHeight;
    const grabH = grab.offsetHeight || 68;
    const tabs = app.querySelector('.home-tabs');
    const tabsH = (tabs?.offsetHeight || 58) + 18;
    const full = Math.round(safeTop() + 8);
    const half = Math.round(height * 0.55);
    const collapsed = Math.max(half + 24, height - grabH - tabsH);
    return { full, half, collapsed };
  };

  const nameForTop = (top, snaps) => {
    const entries = [
      ['full', snaps.full],
      ['half', snaps.half],
      ['collapsed', snaps.collapsed],
    ];
    return entries.reduce((best, entry) => (Math.abs(entry[1] - top) < Math.abs(best[1] - top) ? entry : best))[0];
  };

  const applyTop = (top, animate) => {
    const snaps = snapTops();
    const clamped = Math.min(snaps.collapsed, Math.max(snaps.full, top));
    sheet.style.transition = animate ? '' : 'none';
    sheet.style.top = `${clamped}px`;
    const expanded = nameForTop(clamped, snaps) === 'full';
    sheet.classList.toggle('is-full', expanded);
    scroll.style.overflowY = expanded ? 'auto' : 'hidden';
    if (!expanded) scroll.scrollTop = 0;
    if (animate || !sheet.classList.contains('is-dragging')) {
      window.dispatchEvent(new CustomEvent('boutique-sheet-top', { detail: { top: clamped } }));
    }
    return clamped;
  };

  const snaps = snapTops();
  applyTop(snaps[sheetSnapName] ?? snaps.half, false);

  let dragging = false;
  let tracking = false;
  let startY = 0;
  let startTop = 0;
  let lastY = 0;
  let lastT = 0;
  let velocity = 0;

  const currentTop = () => sheet.getBoundingClientRect().top - app.getBoundingClientRect().top;

  const finish = () => {
    if (!tracking) return;
    const wasDragging = dragging;
    dragging = false;
    tracking = false;
    sheet.classList.remove('is-dragging');
    if (!wasDragging) return;
    const snapsNow = snapTops();
    const top = currentTop();
    const points = [snapsNow.full, snapsNow.half, snapsNow.collapsed];
    let next;
    if (velocity > 0.55) {
      const below = points.filter((point) => point > top + 12);
      next = velocity > 1.2 ? snapsNow.collapsed : below[0] || snapsNow.collapsed;
    } else if (velocity < -0.55) {
      const above = points.filter((point) => point < top - 12);
      next = velocity < -1.2 ? snapsNow.full : above[above.length - 1] || snapsNow.full;
    } else {
      next = points.reduce((best, point) => (Math.abs(point - top) < Math.abs(best - top) ? point : best));
    }
    sheetSnapName = nameForTop(next, snapsNow);
    applyTop(snapsNow[sheetSnapName], true);
  };

  const onMove = (event) => {
    if (!tracking) return;
    const now = performance.now();
    const dy = event.clientY - lastY;
    const dt = Math.max(1, now - lastT);
    velocity = dy / dt;
    lastY = event.clientY;
    lastT = now;
    const delta = event.clientY - startY;
    if (!dragging) {
      if (Math.abs(delta) < 6) return;
      const expanded = sheet.classList.contains('is-full');
      if (!startOnGrab && expanded && delta < 0) {
        tracking = false;
        return;
      }
      if (!startOnGrab && expanded && scroll.scrollTop > 2 && delta > 0) {
        tracking = false;
        return;
      }
      dragging = true;
      sheet.classList.add('is-dragging');
    }
    if (event.cancelable) event.preventDefault();
    const snapsNow = snapTops();
    applyTop(Math.min(snapsNow.collapsed, Math.max(snapsNow.full, startTop + (event.clientY - startY))), false);
  };

  let startOnGrab = false;

  const onDown = (event) => {
    if (event.button != null && event.button !== 0) return;
    startOnGrab = !!event.target.closest('.stay-sheet-grab');
    const expanded = sheet.classList.contains('is-full');
    if (!startOnGrab && expanded && scroll.scrollTop > 2) return;
    tracking = true;
    dragging = false;
    startY = event.clientY;
    startTop = currentTop();
    lastY = event.clientY;
    lastT = performance.now();
    velocity = 0;
  };

  sheet.addEventListener('pointerdown', onDown, { signal });
  window.addEventListener('pointermove', onMove, { passive: false, signal });
  window.addEventListener('pointerup', finish, { signal });
  window.addEventListener('pointercancel', finish, { signal });
}

export function homeTabsMarkup(homeTab) {
  const tabs = [
    { id: 'stores', label: 'Boutiques', icon: tabIconMarkup('stores') },
    { id: 'staff', label: 'Clients', icon: tabIconMarkup('staff') },
    { id: 'map', label: 'Visits', icon: tabIconMarkup('map') },
  ];
  return `
    <nav class="home-tabs" aria-label="Main">
      ${tabs
        .map(
          (tab) => `
        <button type="button" class="home-tab ${homeTab === tab.id ? 'active' : ''}" data-home-tab="${tab.id}">
          <span class="home-tab-indicator" aria-hidden="true"></span>
          <span class="tab-icon-svg" aria-hidden="true">${tab.icon}</span>
          <span class="home-tab-label">${tab.label}</span>
        </button>`,
        )
        .join('')}
    </nav>`;
}

export function visitedStoresMenuMarkup(stores) {
  if (!stores.length) return '';
  return `
    <div class="visited-stores-menu" aria-label="Visited boutiques">
      <div class="visited-stores-scroll">
        ${stores
          .map(
            (store) =>
              `<button type="button" class="visited-store-chip" data-store-id="${escapeHtml(store.id)}">${escapeHtml(store.name)}</button>`,
          )
          .join('')}
      </div>
    </div>`;
}

export function listHeroMarkup(stats) {
  if (!stats) return '';
  return `
    <div class="list-hero header-list-hero">
      <div class="list-hero-inner list-hero-inner-4">
        <div class="list-hero-stat">
          <span class="list-hero-value">${stats.visited}</span>
          <span class="list-hero-unit">Visited</span>
        </div>
        <div class="list-hero-stat">
          <span class="list-hero-value">${stats.staff}</span>
          <span class="list-hero-unit">Staff</span>
        </div>
        <div class="list-hero-stat">
          <span class="list-hero-value">${stats.visits}</span>
          <span class="list-hero-unit">Visits</span>
        </div>
        <div class="list-hero-stat">
          <span class="list-hero-value">${stats.stores}</span>
          <span class="list-hero-unit">Boutiques</span>
        </div>
      </div>
    </div>`;
}

export function headerActionsMarkup({ showAdd, addLabel, addAria }) {
  return `
    <div class="header-actions">
      <button type="button" class="header-action" id="settings-btn" aria-label="Settings">
        <span class="header-action-indicator" aria-hidden="true"></span>
        <span class="tab-icon-svg" aria-hidden="true">${actionIconMarkup('settings')}</span>
        <span class="header-action-label">Settings</span>
      </button>
      ${
        showAdd
          ? `
      <button type="button" class="header-action header-action-add" id="add-btn" aria-label="${escapeHtml(addAria)}">
        <span class="header-action-indicator" aria-hidden="true"></span>
        <span class="tab-icon-svg" aria-hidden="true">${actionIconMarkup('add')}</span>
        <span class="header-action-label">${escapeHtml(addLabel)}</span>
      </button>`
          : ''
      }
    </div>`;
}

export function cityFilterMarkup(cities, selectedCityId) {
  return `
    <div class="city-filter-row">
      <label class="sort-label" for="city-filter">City</label>
      <select id="city-filter" class="city-filter-select" aria-label="Filter by city">
        <option value="" ${selectedCityId === '' ? 'selected' : ''}>All cities</option>
        ${cities
          .map(
            (city) =>
              `<option value="${city.id}" ${selectedCityId === city.id ? 'selected' : ''}>${escapeHtml(city.name)}, ${escapeHtml(city.country)}</option>`,
          )
          .join('')}
      </select>
      ${selectedCityId ? `<button type="button" class="btn-text tag-clear-btn" id="clear-city-filter">All cities</button>` : ''}
    </div>`;
}

export function brandIconClass(brand) {
  const map = {
    Hermès: 'brand-icon-hermes',
    Omega: 'brand-icon-omega',
    Chanel: 'brand-icon-chanel',
    Cartier: 'brand-icon-cartier',
    Rolex: 'brand-icon-rolex',
    Dior: 'brand-icon-dior',
    Tiffany: 'brand-icon-tiffany',
    'Louis Vuitton': 'brand-icon-lv',
    YSL: 'brand-icon-ysl',
  };
  return map[brand] || 'brand-icon-custom';
}

export function brandInitial(brand) {
  const map = {
    Hermès: 'H',
    Omega: 'Ω',
    Chanel: 'C',
    Cartier: 'C',
    Rolex: 'R',
    Dior: 'D',
    Tiffany: 'T',
    'Louis Vuitton': 'L',
    YSL: 'Y',
  };
  if (map[brand]) return map[brand];
  const trimmed = (brand || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

