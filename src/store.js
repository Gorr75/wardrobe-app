import {
  BRANDS,
  CITY,
  STOCKHOLM_NEIGHBORHOODS,
  emptyBrandSizes,
} from './brands.js';

const STORAGE_KEY = 'maison-journal-stockholm';

function seedData() {
  const staff = [
    {
      id: 'staff-1',
      name: 'Linnea Forsberg',
      role: 'Sales Manager',
      boutique: 'Hermès — Birger Jarlsgatan',
      brands: ['Hermès'],
    },
    {
      id: 'staff-2',
      name: 'Oscar Lindqvist',
      role: 'Senior Sales Associate',
      boutique: 'Omega — Biblioteksgatan',
      brands: ['Omega'],
    },
    {
      id: 'staff-3',
      name: 'Elsa Nyström',
      role: 'Client Advisor',
      boutique: 'Chanel — Hamngatan',
      brands: ['Chanel'],
    },
    {
      id: 'staff-4',
      name: 'Marcus Holm',
      role: 'Sales Associate',
      boutique: 'Chanel — Hamngatan',
      brands: ['Chanel'],
    },
  ];

  const creators = [
    {
      id: 'creator-1',
      name: 'Astrid Lindholm',
      neighborhood: 'Östermalm',
      city: CITY,
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
      name: 'Erik Bergström',
      neighborhood: 'Vasastan',
      city: CITY,
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
      name: 'Maja Ekström',
      neighborhood: 'Norrmalm',
      city: CITY,
      tags: ['Evening wear'],
      brands: ['Chanel', 'Hermès'],
      brandSizes: {
        Hermès: { shoes: '39', rtw: '40', belt: '90' },
        Omega: {},
        Chanel: { shoes: '38', rtw: '38', handbag: 'Small Classic' },
      },
      notes: 'Evening appointments only after 17:00. Silk and tweed focus.',
      primaryAssociateId: 'staff-3',
    },
    {
      id: 'creator-4',
      name: 'Sofia Arvidsson',
      neighborhood: 'Djurgården',
      city: CITY,
      tags: ['New client'],
      brands: ['Hermès', 'Omega', 'Chanel'],
      brandSizes: {
        Hermès: { shoes: '37', rtw: '36' },
        Omega: { wrist: '17', strap: 'Small', case: '38' },
        Chanel: { shoes: '36', rtw: '34' },
      },
      notes: 'Stockholm-based creator. Building cross-maison profile.',
      primaryAssociateId: 'staff-4',
    },
  ];

  const entries = [
    {
      id: 'entry-1',
      date: new Date(Date.now() - 2 * 86400000).toISOString(),
      creatorId: 'creator-1',
      staffId: 'staff-1',
      brand: 'Hermès',
      type: 'Private viewing',
      notes: 'Reviewed autumn silk collection. Discussed Kelly 25 in Etoupe.',
      followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    },
    {
      id: 'entry-2',
      date: new Date(Date.now() - 5 * 86400000).toISOString(),
      creatorId: 'creator-2',
      staffId: 'staff-2',
      brand: 'Omega',
      type: 'Appointment',
      notes: 'Speedmaster Moonwatch fitting. Confirmed 19 mm wrist preference.',
    },
    {
      id: 'entry-3',
      date: new Date(Date.now() - 1 * 86400000).toISOString(),
      creatorId: 'creator-3',
      staffId: 'staff-3',
      brand: 'Chanel',
      type: 'Fitting',
      notes: 'Tweed jacket FR 38. Client requested lookbook for gala season.',
      followUpDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    },
  ];

  return { city: CITY, creators, staff, entries };
}

export function defaultData() {
  return seedData();
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    return {
      city: parsed.city ?? CITY,
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

export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `maison-journal-stockholm-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (
          !Array.isArray(parsed.creators) ||
          !Array.isArray(parsed.staff) ||
          !Array.isArray(parsed.entries)
        ) {
          reject(new Error('Invalid maison journal file'));
          return;
        }
        resolve({
          city: parsed.city ?? CITY,
          creators: parsed.creators,
          staff: parsed.staff,
          entries: parsed.entries,
        });
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

export function newCreator() {
  return {
    id: createId('creator'),
    name: '',
    neighborhood: STOCKHOLM_NEIGHBORHOODS[0],
    city: CITY,
    tags: [],
    brands: [],
    brandSizes: emptyBrandSizes(),
    notes: '',
    primaryAssociateId: '',
  };
}

export { emptyBrandSizes };
