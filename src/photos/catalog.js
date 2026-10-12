import londonChanel from './catalog/london-chanel.jpg';
import parisChanel from './catalog/paris-chanel.jpg';
import parisHermes from './catalog/paris-hermes.jpg';

/** Free Commons storefronts. See PHOTO_CREDITS.md. Keyed by seeded store id. */
export const CATALOG_PHOTOS = {
  'paris-chanel': {
    src: parisChanel,
    author: 'Polymagou',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Chanel,_382_rue_Saint-Honor%C3%A9,_Paris_1er.jpg',
  },
  'london-chanel': {
    src: londonChanel,
    author: 'Tom Page',
    license: 'CC BY-SA 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Chanel_158-159_New_Bond_Street_-_2024-12-14.jpg',
  },
  'paris-hermes': {
    src: parisHermes,
    author: 'Gryffindor',
    license: 'Public domain',
    licenseUrl: 'https://commons.wikimedia.org/wiki/File:Rue_du_Faubourg-Saint-Honor%C3%A9,_Paris_May_2006.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rue_du_Faubourg-Saint-Honor%C3%A9,_Paris_May_2006.jpg',
  },
};

export function getCatalogPhoto(storeId) {
  return CATALOG_PHOTOS[storeId] || null;
}
