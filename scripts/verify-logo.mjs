import puppeteer from 'puppeteer';
import path from 'path';
import { ADMIN_PASSWORD } from './adminCredentials.mjs';

const ARTIFACT_DIR = '/home/sakib/.gemini/antigravity/brain/88627019-6145-4bb3-88bf-5a4402648fd1';

async function testLogo() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 1. Desktop Dark Mode Header
  console.log('[1] Testing Storefront Header in Dark Mode...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('qt_popup_dismissed_v1', Date.now().toString());
    document.documentElement.classList.add('dark');
    localStorage.setItem('qt_theme', 'dark');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  // Screenshot header area
  const header = await page.$('header');
  await header.screenshot({ path: path.join(ARTIFACT_DIR, 'fixed_header_logo_dark.png') });
  console.log('✓ Captured fixed_header_logo_dark.png');

  // 2. Desktop Light Mode Header
  console.log('[2] Testing Storefront Header in Light Mode...');
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('qt_theme', 'light');
  });
  await new Promise(r => setTimeout(r, 400));
  await header.screenshot({ path: path.join(ARTIFACT_DIR, 'fixed_header_logo_light.png') });
  console.log('✓ Captured fixed_header_logo_light.png');

  // 3. Mobile Viewport 360px
  console.log('[3] Testing Mobile 360px Header...');
  await page.setViewport({ width: 360, height: 740 });
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('qt_theme', 'dark');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  const mobileHeader = await page.$('header');
  await mobileHeader.screenshot({ path: path.join(ARTIFACT_DIR, 'fixed_mobile_header_logo_dark.png') });
  console.log('✓ Captured fixed_mobile_header_logo_dark.png');

  // 4. Admin Portal Sidebar
  console.log('[4] Testing Admin Portal Sidebar Logo...');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle0' });
  await page.type('input[type="email"]', 'admin@quantumtech.com');
  await page.type('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'fixed_admin_logo_dark.png') });
  console.log('✓ Captured fixed_admin_logo_dark.png');

  await browser.close();
  console.log('All logo verification screenshots captured!');
}

testLogo().catch(err => {
  console.error(err);
  process.exit(1);
});
