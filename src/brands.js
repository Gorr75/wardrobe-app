export const CITY = 'Stockholm';

export const BRANDS = ['Hermès', 'Omega', 'Chanel'];

export const BRAND_SIZE_FIELDS = {
  Hermès: [
    { key: 'shoes', label: 'Shoes', unit: 'EU', placeholder: '38' },
    { key: 'rtw', label: 'Ready-to-wear', unit: 'FR', placeholder: '38' },
    { key: 'belt', label: 'Belt', unit: 'cm', placeholder: '85' },
    { key: 'glove', label: 'Gloves', unit: 'Hermès', placeholder: '7' },
    { key: 'ring', label: 'Ring', unit: 'EU', placeholder: '52' },
  ],
  Omega: [
    { key: 'wrist', label: 'Wrist', unit: 'mm', placeholder: '19' },
    { key: 'strap', label: 'Strap', unit: 'size', placeholder: 'Medium' },
    { key: 'case', label: 'Preferred case', unit: 'mm', placeholder: '41' },
  ],
  Chanel: [
    { key: 'shoes', label: 'Shoes', unit: 'EU', placeholder: '37' },
    { key: 'rtw', label: 'Ready-to-wear', unit: 'FR', placeholder: '36' },
    { key: 'handbag', label: 'Handbag', unit: 'style', placeholder: 'Medium Classic' },
    { key: 'ring', label: 'Ring', unit: 'EU', placeholder: '50' },
  ],
};

export const STAFF_ROLES = [
  'Sales Associate',
  'Senior Sales Associate',
  'Client Advisor',
  'Sales Manager',
  'Boutique Director',
];

export const STOCKHOLM_NEIGHBORHOODS = [
  'Östermalm',
  'Norrmalm',
  'Vasastan',
  'Djurgården',
  'Södermalm',
  'Kungsholmen',
];

export const BOUTIQUES = {
  Hermès: 'Hermès — Birger Jarlsgatan',
  Omega: 'Omega — Biblioteksgatan',
  Chanel: 'Chanel — Hamngatan',
};

export const ENTRY_TYPES = [
  'Appointment',
  'Walk-in',
  'Fitting',
  'Private viewing',
  'Follow-up',
  'After-sales',
];

export function emptyBrandSizes() {
  return Object.fromEntries(BRANDS.map((brand) => [brand, {}]));
}

export function getBrandSizeSummary(creator, brand) {
  const sizes = creator.brandSizes?.[brand] ?? {};
  const fields = BRAND_SIZE_FIELDS[brand] ?? [];
  const filled = fields
    .filter((field) => sizes[field.key])
    .map((field) => `${field.label} ${sizes[field.key]}${field.unit ? ` ${field.unit}` : ''}`);
  return filled.length ? filled.join(' · ') : 'No sizes recorded';
}
