const STORAGE_KEY = 'wardrobe-journal-data';

const defaultData = () => ({
  items: [],
  entries: [],
});

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return defaultData();
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createId() {
  return crypto.randomUUID();
}

export const CATEGORIES = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Accessories',
  'Other',
];

export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `wardrobe-journal-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.items) || !Array.isArray(parsed.entries)) {
          reject(new Error('Invalid wardrobe journal file'));
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

export function getWearCounts(entries) {
  const counts = {};
  for (const entry of entries) {
    for (const itemId of entry.itemIds ?? []) {
      counts[itemId] = (counts[itemId] ?? 0) + 1;
    }
  }
  return counts;
}
