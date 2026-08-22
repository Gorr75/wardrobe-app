import { getNeighborhoods, getStoreByBrand } from './cities.js';
import { BRANDS, emptyBrandSizes } from './brands.js';

const STORAGE_KEY = 'maison-journal-v2';
const CITY_KEY = 'maison-journal-city';

export const DEFAULT_CITY_ID = 'stockholm';

function boutiqueLabel(cityId, brand) {
  const store = getStoreByBrand(cityId, brand);
  return store ? `${brand} — ${store.address.split(',')[0]}` : brand;
}

function seedCity(cityId, cityName, creators, staff, entries) {
  return { cityId, creators, staff, entries };
}

function seedData() {
  const stockholm = seedCity('stockholm', 'Stockholm', [
    {
      id: 'creator-1',
      cityId: 'stockholm',
      name: 'Astrid Lindholm',
      neighborhood: 'Östermalm',
      tags: ['VIP', 'Collector'],
      brands: ['Hermès', 'Chanel'],
      brandSizes: {
        Hermès: { shoes: '38', rtw: '38', belt: '85', glove: '7', ring: '52' },
        Omega: {},
        Chanel: { shoes: '37', rtw: '36', handbag: 'Medium Classic', ring: '50' },
      },
      notes: 'Prefers neutrals and limited editions. Birkin waitlist active.',
      primaryAssociateId: 'staff-1',
    },
    {
      id: 'creator-2',
      cityId: 'stockholm',
      name: 'Erik Bergström',
      neighborhood: 'Vasastan',
      tags: ['Watch collector'],
      brands: ['Omega'],
      brandSizes: {
        Hermès: {},
        Omega: { wrist: '19', strap: 'Medium', case: '41' },
        Chanel: {},
      },
      notes: 'Interested in Speedmaster and annual service reminders.',
      primaryAssociateId: 'staff-2',
    },
    {
      id: 'creator-3',
      cityId: 'stockholm',
      name: 'Maja Ekström',
      neighborhood: 'Norrmalm',
      tags: ['Evening wear'],
      brands: ['Chanel', 'Hermès'],
      brandSizes: {
        Hermès: { shoes: '39', rtw: '40', belt: '90' },
        Omega: {},
        Chanel: { shoes: '38', rtw: '38', handbag: 'Small Classic' },
      },
      notes: 'Evening appointments only after 17:00.',
      primaryAssociateId: 'staff-3',
    },
  ], [
    { id: 'staff-1', cityId: 'stockholm', name: 'Linnea Forsberg', role: 'Sales Manager', boutique: boutiqueLabel('stockholm', 'Hermès'), brands: ['Hermès'] },
    { id: 'staff-2', cityId: 'stockholm', name: 'Oscar Lindqvist', role: 'Senior Sales Associate', boutique: boutiqueLabel('stockholm', 'Omega'), brands: ['Omega'] },
    { id: 'staff-3', cityId: 'stockholm', name: 'Elsa Nyström', role: 'Client Advisor', boutique: boutiqueLabel('stockholm', 'Chanel'), brands: ['Chanel'] },
    { id: 'staff-4', cityId: 'stockholm', name: 'Marcus Holm', role: 'Sales Associate', boutique: boutiqueLabel('stockholm', 'Chanel'), brands: ['Chanel'] },
  ], [
    { id: 'entry-1', cityId: 'stockholm', date: new Date(Date.now() - 2 * 86400000).toISOString(), creatorId: 'creator-1', staffId: 'staff-1', brand: 'Hermès', type: 'Private viewing', notes: 'Reviewed autumn silk collection.', followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) },
    { id: 'entry-2', cityId: 'stockholm', date: new Date(Date.now() - 5 * 86400000).toISOString(), creatorId: 'creator-2', staffId: 'staff-2', brand: 'Omega', type: 'Appointment', notes: 'Speedmaster fitting. 19 mm wrist confirmed.' },
  ]);

  const copenhagen = seedCity('copenhagen', 'Copenhagen', [
    { id: 'creator-cph-1', cityId: 'copenhagen', name: 'Freja Andersen', neighborhood: 'Indre By', tags: ['VIP'], brands: ['Hermès', 'Chanel'], brandSizes: { Hermès: { shoes: '37' }, Omega: {}, Chanel: { shoes: '36', rtw: '34' } }, notes: 'Prefers Amagertorv appointments.', primaryAssociateId: 'staff-cph-1' },
  ], [
    { id: 'staff-cph-1', cityId: 'copenhagen', name: 'Mette Larsen', role: 'Sales Manager', boutique: boutiqueLabel('copenhagen', 'Hermès'), brands: ['Hermès'] },
    { id: 'staff-cph-2', cityId: 'copenhagen', name: 'Jonas Nielsen', role: 'Client Advisor', boutique: boutiqueLabel('copenhagen', 'Chanel'), brands: ['Chanel'] },
  ], []);

  const london = seedCity('london', 'London', [
    { id: 'creator-lon-1', cityId: 'london', name: 'Amelia Hartley', neighborhood: 'Mayfair', tags: ['Collector'], brands: ['Hermès', 'Omega'], brandSizes: { Hermès: { shoes: '38' }, Omega: { wrist: '18', case: '39' }, Chanel: {} }, notes: 'Bond Street regular.', primaryAssociateId: 'staff-lon-1' },
  ], [
    { id: 'staff-lon-1', cityId: 'london', name: 'James Whitfield', role: 'Boutique Director', boutique: boutiqueLabel('london', 'Hermès'), brands: ['Hermès'] },
    { id: 'staff-lon-2', cityId: 'london', name: 'Priya Sharma', role: 'Senior Sales Associate', boutique: boutiqueLabel('london', 'Chanel'), brands: ['Chanel'] },
  ], []);

  const paris = seedCity('paris', 'Paris', [
    { id: 'creator-par-1', cityId: 'paris', name: 'Camille Dubois', neighborhood: '8e', tags: ['VIP'], brands: ['Chanel', 'Hermès'], brandSizes: { Hermès: { shoes: '39' }, Omega: {}, Chanel: { rtw: '36', handbag: 'Medium Classic' } }, notes: 'Rue Cambon private appointments.', primaryAssociateId: 'staff-par-1' },
  ], [
    { id: 'staff-par-1', cityId: 'paris', name: 'Julien Moreau', role: 'Sales Manager', boutique: boutiqueLabel('paris', 'Chanel'), brands: ['Chanel'] },
    { id: 'staff-par-2', cityId: 'paris', name: 'Sophie Laurent', role: 'Client Advisor', boutique: boutiqueLabel('paris', 'Hermès'), brands: ['Hermès'] },
  ], []);

  const dubai = seedCity('dubai', 'Dubai', [
    { id: 'creator-dxb-1', cityId: 'dubai', name: 'Layla Al-Mansoori', neighborhood: 'Downtown', tags: ['VIP'], brands: ['Hermès', 'Chanel', 'Omega'], brandSizes: { Hermès: { shoes: '38' }, Omega: { wrist: '17', case: '38' }, Chanel: { shoes: '37' } }, notes: 'Dubai Mall and MOE visits.', primaryAssociateId: 'staff-dxb-1' },
  ], [
    { id: 'staff-dxb-1', cityId: 'dubai', name: 'Omar Hassan', role: 'Sales Manager', boutique: boutiqueLabel('dubai', 'Hermès'), brands: ['Hermès'] },
    { id: 'staff-dxb-2', cityId: 'dubai', name: 'Nadia Rahman', role: 'Senior Sales Associate', boutique: boutiqueLabel('dubai', 'Chanel'), brands: ['Chanel'] },
  ], []);

  const oslo = seedCity('oslo', 'Oslo', [
    { id: 'creator-osl-1', cityId: 'oslo', name: 'Ingrid Solberg', neighborhood: 'Sentrum', tags: ['New client'], brands: ['Omega', 'Chanel'], brandSizes: { Hermès: {}, Omega: { wrist: '18', strap: 'Medium' }, Chanel: { shoes: '37' } }, notes: 'Karl Johans gate walk-ins.', primaryAssociateId: 'staff-osl-1' },
  ], [
    { id: 'staff-osl-1', cityId: 'oslo', name: 'Henrik Olsen', role: 'Sales Associate', boutique: boutiqueLabel('oslo', 'Omega'), brands: ['Omega'] },
    { id: 'staff-osl-2', cityId: 'oslo', name: 'Ida Berg', role: 'Client Advisor', boutique: boutiqueLabel('oslo', 'Chanel'), brands: ['Chanel'] },
  ], []);

  return {
    creators: [...stockholm.creators, ...copenhagen.creators, ...london.creators, ...paris.creators, ...dubai.creators, ...oslo.creators],
    staff: [...stockholm.staff, ...copenhagen.staff, ...london.staff, ...paris.staff, ...dubai.staff, ...oslo.staff],
    entries: stockholm.entries,
  };
}

export function defaultData() {
  return seedData();
}

export function loadSelectedCity() {
  return localStorage.getItem(CITY_KEY) ?? DEFAULT_CITY_ID;
}

export function saveSelectedCity(cityId) {
  localStorage.setItem(CITY_KEY, cityId);
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    return {
      creators: Array.isArray(parsed.creators) ? parsed.creators : [],
      staff: Array.isArray(parsed.staff) ? parsed.staff : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return defaultData();
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function filterByCity(list, cityId) {
  return list.filter((item) => item.cityId === cityId);
}

export function exportData(data, cityId) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `maison-journal-${cityId}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.creators) || !Array.isArray(parsed.staff) || !Array.isArray(parsed.entries)) {
          reject(new Error('Invalid maison journal file'));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error('Could not parse JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}

export function resetToSeed() {
  return defaultData();
}

export function newCreator(cityId) {
  return {
    id: createId('creator'),
    cityId,
    name: '',
    neighborhood: getNeighborhoods(cityId)[0],
    tags: [],
    brands: [],
    brandSizes: emptyBrandSizes(),
    notes: '',
    primaryAssociateId: '',
  };
}

export { emptyBrandSizes, BRANDS };
