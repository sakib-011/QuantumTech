import puppeteer from 'puppeteer';
import { ADMIN_PASSWORD } from './adminCredentials.mjs';

async function testThemeSystem() {
  console.log('--- Testing Theme System Across Mobile & Desktop ---');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const artifactDir = '/home/sakib/.gemini/antigravity/brain/88627019-6145-4bb3-88bf-5a4402648fd1';

  // 1. Mobile Storefront Header Theme Toggle
  console.log('\n[1] Testing Mobile Storefront Header Theme Toggle at 360px...');
  await page.setViewport({ width: 360, height: 740 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

  // Explicitly initialize in light mode
  await page.evaluate(() => {
    localStorage.setItem('quantum_theme', 'light');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  });
  await page.reload({ waitUntil: 'networkidle0' });

  const initialTheme = await page.evaluate(() => ({
    isDark: document.documentElement.classList.contains('dark'),
    stored: localStorage.getItem('quantum_theme'),
  }));
  console.log('Initial state before click:', initialTheme);

  const isToggleVisibleMobile = await page.evaluate(() => {
    const btn = document.querySelector('header [data-testid="theme-toggle-btn"]');
    if (!btn) return false;
    return btn.offsetParent !== null;
  });
  console.log('Mobile header theme toggle visible:', isToggleVisibleMobile);
  if (!isToggleVisibleMobile) {
    throw new Error('Theme toggle is NOT visible in mobile header!');
  }

  const scrollWidthBefore = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log('Mobile 360px scrollWidth (Light mode):', scrollWidthBefore);
  if (scrollWidthBefore > 360) {
    throw new Error(`Mobile 360px horizontal overflow: ${scrollWidthBefore}px`);
  }

  // Click the theme toggle on mobile top bar
  console.log('Clicking mobile header theme toggle...');
  await page.click('header [data-testid="theme-toggle-btn"]');
  await new Promise((r) => setTimeout(r, 200));

  const isDarkAfterMobileClick = await page.evaluate(() =>
    document.documentElement.classList.contains('dark') &&
    document.body.classList.contains('dark') &&
    localStorage.getItem('quantum_theme') === 'dark'
  );
  console.log('Dark mode active after mobile click:', isDarkAfterMobileClick);
  if (!isDarkAfterMobileClick) {
    throw new Error('Clicking mobile theme toggle failed to activate dark mode!');
  }

  const scrollWidthDark = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log('Mobile 360px scrollWidth (Dark mode):', scrollWidthDark);
  if (scrollWidthDark > 360) {
    throw new Error(`Mobile 360px horizontal overflow in dark mode: ${scrollWidthDark}px`);
  }

  await page.screenshot({ path: `${artifactDir}/verified_mobile_dark_header.png` });

  // 2. Mobile Drawer Theme Row Toggle
  console.log('\n[2] Testing Mobile Drawer Theme Row Toggle...');
  // Open menu drawer
  await page.click('[data-testid="mobile-menu-toggle"]');
  await new Promise((r) => setTimeout(r, 300));

  const drawerToggleRow = await page.$('[data-testid="theme-toggle-row-btn"]');
  if (!drawerToggleRow) throw new Error('Drawer theme toggle row not found!');

  // Click drawer row to switch back to light mode
  await drawerToggleRow.click();
  await new Promise((r) => setTimeout(r, 200));

  const isLightAfterDrawerClick = await page.evaluate(() =>
    !document.documentElement.classList.contains('dark') &&
    localStorage.getItem('quantum_theme') === 'light'
  );
  console.log('Light mode active after drawer click:', isLightAfterDrawerClick);
  if (!isLightAfterDrawerClick) {
    throw new Error('Clicking drawer row failed to switch to light mode!');
  }

  // 3. Mobile Admin Header Theme Toggle
  console.log('\n[3] Testing Mobile Admin Top Header Theme Toggle at 360px...');
  await page.goto('http://localhost:3000/admin/dashboard', { waitUntil: 'networkidle0' });
  if (page.url().includes('login')) {
    await page.type('input[type="email"]', 'admin@quantumtech.com');
    await page.type('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
  }

  const isAdminMobileToggleVisible = await page.evaluate(() => {
    const btn = document.querySelector('div.md\\:hidden [data-testid="theme-toggle-btn"]');
    return btn ? btn.offsetParent !== null : false;
  });
  console.log('Admin mobile header theme toggle visible:', isAdminMobileToggleVisible);
  if (!isAdminMobileToggleVisible) {
    throw new Error('Admin mobile header theme toggle is NOT visible!');
  }

  const adminMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log('Admin mobile 360px scrollWidth:', adminMobileScrollWidth);
  if (adminMobileScrollWidth > 360) {
    throw new Error(`Admin mobile horizontal overflow at 360px: ${adminMobileScrollWidth}px`);
  }

  // Click admin mobile theme toggle
  await page.click('div.md\\:hidden [data-testid="theme-toggle-btn"]');
  await new Promise((r) => setTimeout(r, 200));

  const isAdminDarkActive = await page.evaluate(() =>
    document.documentElement.classList.contains('dark') &&
    localStorage.getItem('quantum_theme') === 'dark'
  );
  console.log('Admin dark mode active:', isAdminDarkActive);
  if (!isAdminDarkActive) {
    throw new Error('Admin mobile theme toggle failed to activate dark mode!');
  }

  await page.screenshot({ path: `${artifactDir}/verified_admin_mobile_dark.png` });

  // 4. Desktop Theme Persistence on Refresh
  console.log('\n[4] Testing Desktop Theme Persistence on Refresh...');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

  const isDarkOnDesktop = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  console.log('Desktop loaded with dark mode persisted from previous step:', isDarkOnDesktop);
  if (!isDarkOnDesktop) {
    throw new Error('Dark mode did not persist to desktop visit!');
  }

  // Reload page to verify Zero-Flash theme initializer
  await page.reload({ waitUntil: 'networkidle0' });
  const isDarkAfterReload = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  console.log('Dark mode persisted after full reload:', isDarkAfterReload);
  if (!isDarkAfterReload) {
    throw new Error('Dark mode lost on reload!');
  }

  await page.screenshot({ path: `${artifactDir}/verified_desktop_dark_storefront.png` });

  console.log('\n🎉 ALL THEME SYSTEM TESTS PASSED SUCCESSFULLY!');
  await browser.close();
}

testThemeSystem().catch((err) => {
  console.error(err);
  process.exit(1);
});
