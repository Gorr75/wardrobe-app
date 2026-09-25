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

export function homeTabsMarkup(homeTab) {
  const tabs = [
    { id: 'stores', label: 'Boutiques', icon: tabIconMarkup('stores') },
    { id: 'staff', label: 'Staff', icon: tabIconMarkup('staff') },
    { id: 'map', label: 'Map', icon: tabIconMarkup('map') },
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

