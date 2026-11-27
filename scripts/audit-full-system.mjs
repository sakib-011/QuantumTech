import puppeteer from 'puppeteer';
import { ADMIN_PASSWORD } from './adminCredentials.mjs';

const BASE_URL = 'http://localhost:3000';

const VIEWPORTS = [
  { name: '360px (Small Android)', width: 360, height: 740 },
  { name: '375px (iPhone SE)', width: 375, height: 667 },
  { name: '390px (iPhone 12/13/14)', width: 390, height: 844 },
  { name: '430px (iPhone Pro Max)', width: 430, height: 932 },
  { name: '768px (iPad Mini / Portrait Tablet)', width: 768, height: 1024 },
  { name: '1024px (iPad Pro / Small Laptop)', width: 1024, height: 768 },
  { name: '1280px (Standard Desktop)', width: 1280, height: 800 },
  { name: '1366px (Typical Laptop Display)', width: 1366, height: 768 },
  { name: '1440px (MacBook / QHD)', width: 1440, height: 900 },
  { name: '1920px (Full HD Desktop)', width: 1920, height: 1080 }
];

const CUSTOMER_ROUTES = [
  { path: '/', name: 'Homepage' },
  { path: '/shop', name: 'Product Catalog' },
  { path: '/category/chargers-cables', name: 'Category Page' },
  { path: '/search?q=charger', name: 'Search Results' },
  { path: '/product/q-charge-20w-fast-charger', name: 'Product Details' },
  { path: '/cart', name: 'Shopping Cart' },
  { path: '/checkout', name: 'Guest Checkout' },
  { path: '/order-confirmation/QT-261121-0001', name: 'Order Confirmation' },
  { path: '/track-order', name: 'Order Tracking' },
  { path: '/about', name: 'About Us' },
  { path: '/contact', name: 'Contact' },
  { path: '/policies', name: 'Store Policies' },
  { path: '/policies/delivery', name: 'Delivery Policy' },
  { path: '/policies/returns', name: 'Returns Policy' },
  { path: '/policies/privacy', name: 'Privacy Policy' },
  { path: '/not-found', name: '404 Not Found' }
];

const ADMIN_ROUTES = [
  { path: '/admin/login', name: 'Admin Login' },
  { path: '/admin/dashboard', name: 'Admin Dashboard' },
  { path: '/admin/products', name: 'Admin Products' },
  { path: '/admin/products/new', name: 'Admin Add Product' },
  { path: '/admin/categories', name: 'Admin Categories' },
  { path: '/admin/orders', name: 'Admin Orders' },
  { path: '/admin/orders/QT-261121-0001', name: 'Admin Order Detail' },
  { path: '/admin/reviews', name: 'Admin Reviews' },
  { path: '/admin/settings', name: 'Admin Settings' }
];

async function runAudit() {
  console.log('🔍 Starting Comprehensive QuantumTech System & Responsive Audit...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore favicon 404 or expected benign browser logs
      if (!text.includes('favicon.ico')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  try {
    // Phase 1: Customer Routes Audit
    console.log('====================================================');
    console.log('📌 PHASE 1: CUSTOMER ROUTES AUDIT');
    console.log('====================================================');

    await page.setViewport({ width: 1280, height: 800 });

    for (const route of CUSTOMER_ROUTES) {
      const targetUrl = `${BASE_URL}${route.path}`;
      const response = await page.goto(targetUrl, { waitUntil: 'networkidle2' });
      const status = response ? response.status() : 'unknown';

      // Verify no blank page
      const bodyContent = await page.evaluate(() => document.body.innerText.trim());
      const hasContent = bodyContent.length > 20;

      if (!hasContent) {
        throw new Error(`Blank page detected on route: ${route.path}`);
      }

      console.log(`✓ [${status}] ${route.name.padEnd(20)} (${route.path}) - Content length: ${bodyContent.length} chars`);
    }

    // Phase 2: Admin Routes Audit (Authenticate first)
    console.log('\n====================================================');
    console.log('📌 PHASE 2: ADMIN ROUTES AUDIT');
    console.log('====================================================');

    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'admin@quantumtech.com');
    await page.type('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✓ Admin authenticated successfully.');

    for (const route of ADMIN_ROUTES) {
      const targetUrl = `${BASE_URL}${route.path}`;
      const response = await page.goto(targetUrl, { waitUntil: 'networkidle2' });
      const status = response ? response.status() : 'unknown';

      const bodyContent = await page.evaluate(() => document.body.innerText.trim());
      const hasContent = bodyContent.length > 20;

      if (!hasContent) {
        throw new Error(`Blank page detected on admin route: ${route.path}`);
      }

      console.log(`✓ [${status}] ${route.name.padEnd(20)} (${route.path}) - Content length: ${bodyContent.length} chars`);
    }

    // Phase 3: Comprehensive Multi-Viewport Responsive Overflow Testing
    console.log('\n====================================================');
    console.log('📌 PHASE 3: MULTI-VIEWPORT RESPONSIVE AUDIT (10 VIEWPORTS)');
    console.log('====================================================');

    const testPages = [
      { path: '/', name: 'Homepage' },
      { path: '/shop', name: 'Catalog' },
      { path: '/product/q-charge-20w-fast-charger', name: 'Product Details' },
      { path: '/checkout', name: 'Checkout' },
      { path: '/track-order', name: 'Order Tracking' },
      { path: '/admin/dashboard', name: 'Admin Dashboard' },
      { path: '/admin/orders', name: 'Admin Orders Table' }
    ];

    let overflowViolations = 0;

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      process.stdout.write(`Testing viewport: ${vp.name.padEnd(35)} `);

      let vpPassed = true;
      for (const p of testPages) {
        await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'networkidle2' });
        
        const overflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientW = window.innerWidth;
          const diff = scrollW - clientW;
          return { hasOverflow: diff > 2, diff, scrollW, clientW };
        });

        if (overflow.hasOverflow) {
          console.log(`\n❌ Overflow on ${p.name} at ${vp.width}px: scrollWidth=${overflow.scrollW} > clientWidth=${overflow.clientW} (diff: ${overflow.diff}px)`);
          overflowViolations++;
          vpPassed = false;
        }
      }

      if (vpPassed) {
        console.log('✓ PASS (0px overflow on all tested views)');
      }
    }

    if (overflowViolations > 0) {
      throw new Error(`Detected ${overflowViolations} horizontal overflow violations!`);
    }

    // Phase 4: Error Logs Inspection
    console.log('\n====================================================');
    console.log('📌 PHASE 4: RUNTIME ERROR LOGS INSPECTION');
    console.log('====================================================');

    if (pageErrors.length > 0) {
      console.error('❌ Uncaught Page Errors:', pageErrors);
      throw new Error('Page errors detected!');
    } else {
      console.log('✓ Zero uncaught page errors.');
    }

    if (consoleErrors.length > 0) {
      console.warn('⚠️ Console errors noted:', consoleErrors);
    } else {
      console.log('✓ Zero console-breaking errors.');
    }

    console.log('\n====================================================');
    console.log('🎉 AUDIT COMPLETE: ALL ROUTES & RESPONSIVE CHECKS PASSED!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Audit failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runAudit();
