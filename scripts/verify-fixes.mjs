import puppeteer from 'puppeteer';
import path from 'path';
import { ADMIN_PASSWORD } from './adminCredentials.mjs';

const ARTIFACT_DIR = '/home/sakib/.gemini/antigravity/brain/88627019-6145-4bb3-88bf-5a4402648fd1';

async function verify() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Admin login & Popups page
  console.log('[1] Logging into Admin...');
  await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', 'admin@quantumtech.com');
  await page.type('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // Go to Popups page
  console.log('[2] Navigating to Admin Popups (/admin/popups)...');
  await page.goto('http://localhost:3000/admin/popups', { waitUntil: 'networkidle0' });

  // Ensure dark mode is active
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('qt_theme', 'dark');
  });
  await new Promise(r => setTimeout(r, 400));

  // Screenshot popups page header + banner
  const bannerElement = await page.$('.bg-blue-50\\/80, [class*="bg-blue"]');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fixed_admin_popups_dark.png') });
  console.log('✓ Captured fixed_admin_popups_dark.png');

  // Also in light mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('qt_theme', 'light');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fixed_admin_popups_light.png') });
  console.log('✓ Captured fixed_admin_popups_light.png');

  // 2. Storefront Footer Trust Bar
  console.log('[3] Navigating to Storefront Footer...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

  // Suppress popup
  await page.evaluate(() => {
    localStorage.setItem('qt_popup_dismissed_v1', Date.now().toString());
    document.documentElement.classList.add('dark');
    localStorage.setItem('qt_theme', 'dark');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  // Scroll to footer trust strip
  await page.evaluate(() => {
    const footer = document.querySelector('footer');
    if (footer) footer.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fixed_footer_trust_dark.png') });
  console.log('✓ Captured fixed_footer_trust_dark.png');

  // Light mode footer
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('qt_theme', 'light');
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fixed_footer_trust_light.png') });
  console.log('✓ Captured fixed_footer_trust_light.png');

  console.log('All verification screenshots captured!');
  await browser.close();
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
