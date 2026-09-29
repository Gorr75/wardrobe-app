import fr from './locales/fr.js';
import sv from './locales/sv.js';

const STORAGE_KEY = 'boutique-journal-language';

/** English is the default. Swedish is released. French is offered and marked Beta in the picker. */
export const LANGUAGES = [
  { id: 'en', label: 'English', beta: false },
  { id: 'sv', label: 'Svenska', beta: false },
  { id: 'fr', label: 'Français', beta: true },
];

const CATALOGS = { sv, fr };

const LOCALE_TAGS = {
  en: 'en',
  sv: 'sv-SE',
  fr: 'fr-FR',
};

const COUNTRY_NAMES = {
  Sweden: { sv: 'Sverige', fr: 'Suède' },
  Denmark: { sv: 'Danmark', fr: 'Danemark' },
  'United Kingdom': { sv: 'Storbritannien', fr: 'Royaume-Uni' },
  France: { sv: 'Frankrike', fr: 'France' },
  UAE: { sv: 'Förenade Arabemiraten', fr: 'Émirats arabes unis' },
  Norway: { sv: 'Norge', fr: 'Norvège' },
};

export function getLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return LANGUAGES.some((language) => language.id === stored) ? stored : 'en';
}

export function setLanguage(id) {
  const next = LANGUAGES.some((language) => language.id === id) ? id : 'en';
  localStorage.setItem(STORAGE_KEY, next);
  document.documentElement.lang = next;
}

export function applyStoredLanguage() {
  document.documentElement.lang = getLanguage();
}

export function localeTag() {
  return LOCALE_TAGS[getLanguage()] || 'en';
}

export function t(key, vars) {
  const language = getLanguage();
  let text = (language !== 'en' && CATALOGS[language]?.[key]) || key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function countryName(name) {
  const language = getLanguage();
  if (language === 'en') return name;
  return COUNTRY_NAMES[name]?.[language] || name;
}
