const SVG_ATTRS = 'viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

export const TAB_ICONS = {
  stores: `<svg ${SVG_ATTRS}><circle cx="12" cy="12" r="7.25"/><circle cx="12" cy="12" r="4.5"/><path d="M8.2 8.2 6.4 6.4M15.8 8.2l1.8-1.8M8.2 15.8 6.4 17.6M15.8 15.8l1.8 1.8"/></svg>`,
  staff: `<svg ${SVG_ATTRS}><circle cx="12" cy="8" r="3.25"/><path d="M5.5 19.5c.8-3.2 2.8-4.75 6.5-4.75s5.7 1.55 6.5 4.75"/></svg>`,
  map: `<svg ${SVG_ATTRS}><path d="M7 4.5h8.2A2.3 2.3 0 0 1 17.5 6.8V19.5H9.1A2.1 2.1 0 0 0 7 21.6V4.5z"/><path d="M7 4.5A2.1 2.1 0 0 0 4.9 6.6V19"/><path d="M10 9h5M10 12.5h5"/></svg>`,
};

export const ACTION_ICONS = {
  settings: `<svg ${SVG_ATTRS}><circle cx="12" cy="12" r="2.75"/><path d="M12 3v2.1M12 18.9V21M3 12h2.1M18.9 12H21M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M5.6 18.4l1.5-1.5M16.9 7.1l1.5-1.5"/></svg>`,
  add: `<svg ${SVG_ATTRS}><path d="M12 5v14M5 12h14"/></svg>`,
  back: `<svg ${SVG_ATTRS}><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>`,
  map: `<svg ${SVG_ATTRS}><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z"/><circle cx="12" cy="11" r="2.15"/></svg>`,
  car: `<svg ${SVG_ATTRS}><path d="M4.5 15.5h15"/><path d="M6.4 15.5 7.7 11.2A2 2 0 0 1 9.6 9.8h4.8a2 2 0 0 1 1.9 1.4l1.3 4.3"/><path d="M6 15.5v1.8M18 15.5v1.8"/><circle cx="8" cy="17.2" r="1.15"/><circle cx="16" cy="17.2" r="1.15"/></svg>`,
  instagram: `<svg ${SVG_ATTRS}><rect x="4.5" y="4.5" width="15" height="15" rx="4"/><circle cx="12" cy="12" r="3.35"/><circle cx="16.7" cy="7.4" r="0.85" fill="currentColor" stroke="none"/></svg>`,
};

export function tabIconMarkup(id) {
  return TAB_ICONS[id] || '';
}

export function actionIconMarkup(name) {
  return ACTION_ICONS[name] || '';
}
