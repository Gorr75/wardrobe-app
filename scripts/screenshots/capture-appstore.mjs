/**
 * App Store screenshots at 1242×2688 (414×896 viewport, deviceScaleFactor 3).
 * Serve a CAPACITOR=1 production build, then:
 *   node scripts/screenshots/capture-appstore.mjs http://127.0.0.1:4173
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { screenshotJournal } from './fixture.mjs';

const baseUrl = process.argv[2] || 'http://127.0.0.1:4173/';
const outDir = process.argv[3] || '/opt/cursor/artifacts/app-store';

const shots = [
  { name: '01-map.png', setup: setupMap },
  { name: '02-city-list.png', setup: setupCityList },
  { name: '03-boutique-detail.png', setup: setupDetail },
  { name: '04-journal.png', setup: setupJournal },
  { name: '05-settings.png', setup: setupSettings },
];

async function setSheet(page, snap) {
  await page.evaluate((name) => {
    const app = document.getElementById('app');
    const sheet = app.querySelector('.stay-sheet');
    const scroll = app.querySelector('.stay-sheet-scroll');
    const grab = app.querySelector('.stay-sheet-grab');
    if (!sheet || !scroll || !grab) return;
    const height = app.clientHeight || window.innerHeight;
    const grabH = grab.offsetHeight || 68;
    const tabs = app.querySelector('.home-tabs');
    const tabsH = (tabs?.offsetHeight || 58) + 18;
    const half = Math.round(height * 0.55);
    const tops = {
      full: 8,
      half,
      collapsed: Math.max(half + 24, height - grabH - tabsH),
    };
    sheet.style.transition = 'none';
    sheet.style.top = `${tops[name]}px`;
    const expanded = name === 'full';
    sheet.classList.toggle('is-full', expanded);
    scroll.style.overflowY = expanded ? 'auto' : 'hidden';
    if (!expanded) scroll.scrollTop = 0;
    window.dispatchEvent(new CustomEvent('boutique-sheet-top', { detail: { top: tops[name] } }));
  }, snap);
}

async function waitForMap(page) {
  await page.waitForSelector('.stay-sheet', { timeout: 15000 });
  await page.waitForFunction(
    () => document.querySelector('.stay-pin, .leaflet-container, canvas'),
    { timeout: 20000 },
  ).catch(() => {});
  await page.waitForTimeout(800);
}

async function setupMap(page) {
  await waitForMap(page);
  await page.evaluate(() => {
    const app = document.getElementById('app');
    const sheet = app.querySelector('.stay-sheet');
    const scroll = app.querySelector('.stay-sheet-scroll');
    const height = app.clientHeight || window.innerHeight;
    const top = Math.round(height * 0.46);
    sheet.style.transition = 'none';
    sheet.style.top = `${top}px`;
    sheet.classList.remove('is-full');
    scroll.style.overflowY = 'hidden';
    window.dispatchEvent(new CustomEvent('boutique-sheet-top', { detail: { top } }));
  });
  await page.waitForSelector('text=My boutiques');
  await page.waitForTimeout(400);
}

async function setupCityList(page) {
  await waitForMap(page);
  await setSheet(page, 'full');
  await page.selectOption('#city-filter', 'paris');
  await page.waitForSelector('text=Atelier Lumière');
  await page.waitForTimeout(300);
}

async function setupDetail(page) {
  await waitForMap(page);
  await setSheet(page, 'full');
  await page.selectOption('#city-filter', 'paris');
  await page.locator('.restaurant-card', { hasText: 'Atelier Lumière' }).click();
  await page.waitForSelector('#add-staff-btn');
  await page.locator('#add-staff-btn').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
}

async function setupJournal(page) {
  await waitForMap(page);
  await page.locator('[data-home-tab="map"]').click();
  await page.waitForSelector('text=Looked at the spring coats');
  await setSheet(page, 'full');
  await page.waitForTimeout(300);
}

async function setupSettings(page) {
  await waitForMap(page);
  await page.locator('#settings-btn').click();
  await page.waitForSelector('text=Language');
  await page.waitForSelector('text=Version 1 – Navy & Gold');
  await page.evaluate(() => {
    const content = document.querySelector('.content');
    const theme = [...document.querySelectorAll('.section-title')].find((el) => el.textContent.trim() === 'Theme');
    if (!content || !theme) return;
    const top = theme.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop;
    content.scrollTop = Math.max(0, top - 240);
  });
  await page.waitForTimeout(200);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  viewport: { width: 414, height: 896 },
  deviceScaleFactor: 3,
  locale: 'en-US',
});
await context.addInitScript((data) => {
  localStorage.setItem('maison-journal-v6', JSON.stringify(data));
  localStorage.setItem('maison-journal-city', '');
  localStorage.setItem('maison-journal-home-tab', 'stores');
  localStorage.setItem('boutique-journal-theme', 'v1');
  localStorage.setItem('boutique-journal-language', 'en');
  localStorage.setItem('maison-journal-show-visited-menu', '1');
}, screenshotJournal());
await mkdir(outDir, { recursive: true });

for (const shot of shots) {
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await shot.setup(page);
  const file = path.join(outDir, shot.name);
  await page.screenshot({ path: file, fullPage: false });
  console.log('wrote', file);
  await page.close();
}

await browser.close();
