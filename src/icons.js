const SVG_ATTRS = 'viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

export const TAB_ICONS = {
  stores: `<svg ${SVG_ATTRS}><circle cx="12" cy="12" r="7.25"/><circle cx="12" cy="12" r="4.5"/><path d="M8.2 8.2 6.4 6.4M15.8 8.2l1.8-1.8M8.2 15.8 6.4 17.6M15.8 15.8l1.8 1.8"/></svg>`,
  staff: `<svg ${SVG_ATTRS}><circle cx="12" cy="8" r="3.25"/><path d="M5.5 19.5c.8-3.2 2.8-4.75 6.5-4.75s5.7 1.55 6.5 4.75"/></svg>`,
  map: `<svg ${SVG_ATTRS}><path d="M4 6.5 9 4.5v13L4 19.5V6.5z"/><path d="M9 4.5 15 6.5v13l-6-2V4.5z"/><path d="M15 6.5 20 4.5v13l-5 2V6.5z"/></svg>`,
};

export const ACTION_ICONS = {
  settings: `<svg ${SVG_ATTRS}><circle cx="12" cy="12" r="2.75"/><path d="M12 3v2.1M12 18.9V21M3 12h2.1M18.9 12H21M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M5.6 18.4l1.5-1.5M16.9 7.1l1.5-1.5"/></svg>`,
  add: `<svg ${SVG_ATTRS}><path d="M12 5v14M5 12h14"/></svg>`,
};

export function tabIconMarkup(id) {
  return TAB_ICONS[id] || '';
}

export function actionIconMarkup(name) {
  return ACTION_ICONS[name] || '';
}
