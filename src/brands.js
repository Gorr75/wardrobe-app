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
    { key: 'case', label: 'Case', unit: 'mm', placeholder: '41' },
  ],
  Chanel: [
    { key: 'shoes', label: 'Shoes', unit: 'EU', placeholder: '37' },
    { key: 'rtw', label: 'Ready-to-wear', unit: 'FR', placeholder: '36' },
    { key: 'handbag', label: 'Handbag', unit: 'style', placeholder: 'Medium Classic' },
    { key: 'ring', label: 'Ring', unit: 'EU', placeholder: '50' },
  ],
};

export function emptyBrandSizes() {
  return Object.fromEntries(BRANDS.map((brand) => [brand, {}]));
}

export function normalizeBrandSizes(raw) {
  const base = emptyBrandSizes();
  if (!raw || typeof raw !== 'object') return base;
  for (const brand of BRANDS) {
    if (raw[brand] && typeof raw[brand] === 'object') {
      base[brand] = { ...raw[brand] };
    }
  }
  return base;
}

export function getBrandSizeSummary(sizes, brand) {
  const values = sizes?.[brand] ?? {};
  const fields = BRAND_SIZE_FIELDS[brand] ?? [];
  const filled = fields
    .filter((field) => values[field.key])
    .map((field) => {
      const unit = field.unit ? ` ${field.unit}` : '';
      return `${field.label} ${values[field.key]}${unit}`;
    });
  return filled.join(' · ');
}

export function hasBrandSizes(sizes, brand) {
  return Boolean(getBrandSizeSummary(sizes, brand));
}
