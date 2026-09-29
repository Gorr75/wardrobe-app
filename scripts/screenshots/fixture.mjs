/** Fictional journal used only for App Store screenshots. No real maison names. */

export const BUILTIN_STORE_IDS = [
  'stockholm-hermes',
  'stockholm-omega',
  'stockholm-chanel',
  'copenhagen-hermes',
  'copenhagen-omega',
  'copenhagen-chanel',
  'london-hermes',
  'london-omega',
  'london-chanel',
  'paris-hermes',
  'paris-omega',
  'paris-chanel',
  'dubai-hermes',
  'dubai-omega',
  'dubai-chanel',
  'oslo-hermes',
  'oslo-omega',
  'oslo-chanel',
];

const day = 86400000;

export function screenshotJournal(now = Date.now()) {
  return {
    staff: [
      {
        id: 'staff-claire',
        storeId: 'custom-lumiere',
        name: 'Claire Moreau',
        role: 'Sales Advisor',
        note: 'Remembered the navy coat from March.',
        phone: '+33 6 12 34 56 78',
        email: 'claire@example.com',
        instagram: '',
        image: '',
      },
      {
        id: 'staff-julien',
        storeId: 'custom-solenne',
        name: 'Julien Petit',
        role: 'Boutique Director',
        note: 'Asked about a later fitting.',
        phone: '',
        email: '',
        instagram: '',
        image: '',
      },
      {
        id: 'staff-astrid',
        storeId: 'custom-nord',
        name: 'Astrid Lind',
        role: 'Sales Associate',
        note: 'Kept the linen aside until Saturday.',
        phone: '+46 70 123 45 67',
        email: '',
        instagram: '',
        image: '',
      },
    ],
    visits: [
      {
        id: 'visit-1',
        storeId: 'custom-lumiere',
        at: now - 2 * day,
        note: 'Looked at the spring coats.',
      },
      {
        id: 'visit-2',
        storeId: 'custom-lumiere',
        at: now - 40 * day,
        note: 'First visit. Met Claire.',
      },
      {
        id: 'visit-3',
        storeId: 'custom-nord',
        at: now - 12 * day,
        note: 'Collected the linen shirt.',
      },
    ],
    storeMeta: {
      'custom-lumiere': { image: '', note: 'Quiet corner shop. Ask for Claire.' },
      'custom-solenne': { image: '', note: '' },
      'custom-nord': { image: '', note: 'Opens late on Thursdays.' },
    },
    brandSizes: {},
    customStores: [
      {
        id: 'custom-lumiere',
        cityId: 'paris',
        brand: 'Atelier',
        name: 'Atelier Lumière',
        address: '14 Rue des Jardins, 75003 Paris',
        lat: 48.8612,
        lng: 2.3628,
        instagram: '',
        createdAt: now - 80 * day,
      },
      {
        id: 'custom-solenne',
        cityId: 'paris',
        brand: 'Maison',
        name: 'Maison Solenne',
        address: '8 Place des Tilleuls, 75004 Paris',
        lat: 48.8554,
        lng: 2.3558,
        instagram: '',
        createdAt: now - 60 * day,
      },
      {
        id: 'custom-nord',
        cityId: 'stockholm',
        brand: 'Nord',
        name: 'Nord & Linne',
        address: 'Storgatan 12, 111 23 Stockholm',
        lat: 59.3364,
        lng: 18.0742,
        instagram: '',
        createdAt: now - 30 * day,
      },
    ],
    purchases: [
      {
        id: 'purchase-1',
        storeId: 'custom-lumiere',
        name: 'Navy wool coat',
        price: '4 800 EUR',
        size: '38',
        image: '',
        purchasedAt: now - 2 * day,
      },
      {
        id: 'purchase-2',
        storeId: 'custom-nord',
        name: 'Linen shirt',
        price: '1 890 SEK',
        size: 'M',
        image: '',
        purchasedAt: now - 12 * day,
      },
    ],
    hiddenStoreIds: BUILTIN_STORE_IDS,
  };
}

export function installScreenshotFixture() {
  const journal = screenshotJournal();
  localStorage.setItem('maison-journal-v6', JSON.stringify(journal));
  localStorage.setItem('maison-journal-city', '');
  localStorage.setItem('maison-journal-home-tab', 'stores');
  localStorage.setItem('boutique-journal-theme', 'v1');
  localStorage.setItem('boutique-journal-language', 'en');
  localStorage.setItem('maison-journal-show-visited-menu', '1');
}
