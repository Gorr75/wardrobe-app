const LAST_EXPORT_KEY = 'maison-journal-last-export';
const LAST_AUTO_EXPORT_KEY = 'maison-journal-last-auto-export';
const BACKUP_REMINDER_DISMISSED_KEY = 'maison-journal-backup-dismissed';
const AUTO_BACKUP_KEY = 'maison-journal-auto-backup';
const FIRST_USE_KEY = 'maison-journal-first-use';

export const APP_VERSION = '0.1.0';
export const BACKUP_REMINDER_DAYS = 30;

let weeklyAutoExportDoneThisSession = false;

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

import { normalizeImportedData } from './store.js';

export function formatBackupDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getLastExportLabel() {
  const lastExport = parseInt(localStorage.getItem(LAST_EXPORT_KEY) || '0', 10);
  return lastExport
    ? `Last backup: ${formatBackupDate(lastExport)}`
    : 'No backup exported yet';
}

export function getAutoBackupMode() {
  return localStorage.getItem(AUTO_BACKUP_KEY) || 'off';
}

export function setAutoBackupMode(mode) {
  localStorage.setItem(AUTO_BACKUP_KEY, mode);
}

export function buildBackupPayload(data) {
  return {
    app: 'maison-journal',
    version: 2,
    exportedAt: new Date().toISOString(),
    entries: data.entries,
  };
}

export async function exportAllData(data, { silent = false, auto = false } = {}) {
  const payload = buildBackupPayload(data);
  const jsonText = JSON.stringify(payload, null, 2);
  const fileName = `maison-journal-backup-${todayDateString()}.json`;

  try {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    if (!silent) alert('Could not save the backup. Please try again.');
    throw err;
  }

  const now = Date.now();
  localStorage.setItem(LAST_EXPORT_KEY, String(now));
  if (auto) localStorage.setItem(LAST_AUTO_EXPORT_KEY, String(now));

  if (silent) {
    if (auto) alert('Automatic backup saved to your downloads folder.');
  } else {
    alert(`Backup saved.\n\n${fileName}`);
  }
}

export async function importAllData(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Could not parse JSON file');
  }
  return normalizeImportedData(parsed);
}

export async function maybeAutoExport(data, trigger) {
  const mode = getAutoBackupMode();
  if (trigger === 'visit' && mode === 'visit') {
    await exportAllData(data, { silent: true, auto: true });
  }
}

export async function checkWeeklyAutoBackup(data) {
  const mode = getAutoBackupMode();
  if (mode !== 'weekly' || weeklyAutoExportDoneThisSession) return;
  const last = parseInt(localStorage.getItem(LAST_AUTO_EXPORT_KEY) || '0', 10);
  if (Date.now() - last < 7 * 86400000) return;
  weeklyAutoExportDoneThisSession = true;
  await exportAllData(data, { silent: true, auto: true });
}

export function shouldShowBackupReminder() {
  const dismissed = parseInt(localStorage.getItem(BACKUP_REMINDER_DISMISSED_KEY) || '0', 10);
  if (Date.now() - dismissed < 7 * 86400000) return false;

  const lastExport = parseInt(localStorage.getItem(LAST_EXPORT_KEY) || '0', 10);
  const threshold = BACKUP_REMINDER_DAYS * 86400000;
  if (lastExport) return Date.now() - lastExport >= threshold;

  const firstUse = parseInt(localStorage.getItem(FIRST_USE_KEY) || '0', 10);
  if (!firstUse) {
    localStorage.setItem(FIRST_USE_KEY, String(Date.now()));
    return false;
  }
  return Date.now() - firstUse >= threshold;
}

export function dismissBackupReminder() {
  localStorage.setItem(BACKUP_REMINDER_DISMISSED_KEY, String(Date.now()));
}
