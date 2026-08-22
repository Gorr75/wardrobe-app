export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
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

  function setChromeHidden(nextHidden) {
    if (nextHidden === hidden) return;
    const headerH = header.offsetHeight || 0;
    const delta = nextHidden ? headerH : -headerH;
    if (nextHidden) app.classList.add('chrome-hidden');
    else app.classList.remove('chrome-hidden');
    hidden = nextHidden;
    content.scrollTop = Math.max(0, content.scrollTop + delta);
    lastY = content.scrollTop;
  }

  content.addEventListener(
    'scroll',
    () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        const y = content.scrollTop;
        const dy = y - lastY;
        if (y < 36) setChromeHidden(false);
        else if (dy > 14 && !hidden) setChromeHidden(true);
        else if (dy < -14 && hidden) setChromeHidden(false);
        lastY = content.scrollTop;
      });
    },
    { passive: true },
  );
}

export function homeTabsMarkup(homeTab) {
  const tabs = [
    { id: 'stores', label: 'Maisons', icon: '🏛️' },
    { id: 'journal', label: 'Journal', icon: '📓' },
    { id: 'map', label: 'Map', icon: '🗺️' },
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

export function listHeroMarkup(stats) {
  if (!stats) return '';
  return `
    <div class="list-hero header-list-hero">
      <div class="list-hero-inner list-hero-inner-4">
        <div class="list-hero-stat">
          <span class="list-hero-value">${stats.stores}</span>
          <span class="list-hero-unit">Maisons</span>
        </div>
        <div class="list-hero-stat">
          <span class="list-hero-value">${stats.entries}</span>
          <span class="list-hero-unit">Journal</span>
        </div>
      </div>
    </div>`;
}

export function cityFilterMarkup(cities, selectedCityId) {
  return `
    <div class="city-filter-row">
      <label class="sort-label" for="city-filter">City</label>
      <select id="city-filter" class="city-filter-select" aria-label="Filter by city">
        ${cities
          .map(
            (city) =>
              `<option value="${city.id}" ${selectedCityId === city.id ? 'selected' : ''}>${escapeHtml(city.name)}, ${escapeHtml(city.country)}</option>`,
          )
          .join('')}
      </select>
    </div>`;
}

export function brandIconClass(brand) {
  if (brand === 'Hermès') return 'brand-icon-hermes';
  if (brand === 'Omega') return 'brand-icon-omega';
  return 'brand-icon-chanel';
}

export function brandInitial(brand) {
  if (brand === 'Hermès') return 'H';
  if (brand === 'Omega') return 'Ω';
  return 'C';
}

