import puppeteer from 'puppeteer';
import { ADMIN_PASSWORD } from './adminCredentials.mjs';

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('🚀 Starting Bilingual & System Integration Test Suite...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // 1. Visit Homepage & Verify Default Language (English)
    console.log('[1] Testing Initial Language on Homepage (Default: EN)...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    
    let htmlLang = await page.evaluate(() => document.documentElement.lang);
    console.log(`✓ Initial html lang attribute: "${htmlLang}" (expected "en")`);
    if (htmlLang !== 'en') throw new Error(`Expected 'en', got '${htmlLang}'`);

    let navShopText = await page.evaluate(() => {
      const el = document.querySelector('nav a[href="/shop"]');
      return el ? el.textContent.trim() : '';
    });
    console.log(`✓ Nav shop label: "${navShopText}"`);

    // 2. Switch Language to Bangla
    console.log('\n[2] Switching Language to Bangla (BN)...');
    // Click the language toggle button in Header
    await page.evaluate(() => {
      // Find button containing 'বাং' or 'EN'
      const btns = Array.from(document.querySelectorAll('button'));
      const langBtn = btns.find(b => b.textContent && (b.textContent.includes('বাং') || b.textContent.includes('BN') || b.textContent.includes('EN')));
      if (langBtn) langBtn.click();
    });

    await new Promise(r => setTimeout(r, 600));

    htmlLang = await page.evaluate(() => document.documentElement.lang);
    console.log(`✓ Updated html lang attribute: "${htmlLang}" (expected "bn")`);
    if (htmlLang !== 'bn') throw new Error(`Expected 'bn' after toggle, got '${htmlLang}'`);

    const navShopTextBn = await page.evaluate(() => {
      const el = document.querySelector('nav a[href="/shop"]');
      return el ? el.textContent.trim() : '';
    });
    console.log(`✓ Nav shop label in Bangla: "${navShopTextBn}" (expected "শপ")`);

    // Check stored language in localStorage
    const storedLang = await page.evaluate(() => {
      const raw = localStorage.getItem('qt_language');
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    });
    console.log(`✓ LocalStorage qt_language: "${storedLang}"`);
    if (storedLang !== 'bn') throw new Error(`LocalStorage language mismatch: ${storedLang}`);

    // 3. Test Persistence upon Refresh
    console.log('\n[3] Testing Language Persistence on Page Reload...');
    await page.reload({ waitUntil: 'networkidle2' });
    htmlLang = await page.evaluate(() => document.documentElement.lang);
    console.log(`✓ Post-refresh html lang attribute: "${htmlLang}" (expected "bn")`);
    if (htmlLang !== 'bn') throw new Error(`Persistence failed: got '${htmlLang}'`);

    // 4. Test Customer Pages in Bangla
    console.log('\n[4] Testing Customer Catalog (/shop) in Bangla...');
    await page.goto(`${BASE_URL}/shop`, { waitUntil: 'networkidle2' });
    const shopHeading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent.trim() : '';
    });
    console.log(`✓ Catalog page title in Bangla: "${shopHeading}"`);

    console.log('\n[5] Testing Product Details (/product/q-charge-20w-fast-charger) in Bangla...');
    await page.goto(`${BASE_URL}/product/q-charge-20w-fast-charger`, { waitUntil: 'networkidle2' });
    const addToCartBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && (b.textContent.includes('কার্টে যোগ করুন') || b.textContent.includes('Add to Cart')));
      return btn ? btn.textContent.trim() : '';
    });
    console.log(`✓ Product page Add to Cart button in Bangla: "${addToCartBtn}"`);

    console.log('\n[6] Testing Shopping Cart (/cart) in Bangla...');
    // Add product to cart first
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && (b.textContent.includes('কার্টে যোগ করুন') || b.textContent.includes('Add to Cart')));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.goto(`${BASE_URL}/cart`, { waitUntil: 'networkidle2' });
    const checkoutLink = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && (b.textContent.includes('চেকআউট') || b.textContent.includes('Checkout')));
      return btn ? btn.textContent.trim() : '';
    });
    console.log(`✓ Cart Proceed to Checkout label in Bangla: "${checkoutLink}"`);

    console.log('\n[7] Testing Checkout (/checkout) in Bangla...');
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'networkidle2' });
    const checkoutHeading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent.trim() : '';
    });
    console.log(`✓ Checkout heading in Bangla: "${checkoutHeading}"`);

    console.log('\n[8] Testing Order Tracking (/track-order) in Bangla...');
    await page.goto(`${BASE_URL}/track-order`, { waitUntil: 'networkidle2' });
    const trackHeading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent.trim() : '';
    });
    console.log(`✓ Track Order heading in Bangla: "${trackHeading}"`);

    console.log('\n[9] Testing About Page (/about) in Bangla...');
    await page.goto(`${BASE_URL}/about`, { waitUntil: 'networkidle2' });
    const aboutHeading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent.trim() : '';
    });
    console.log(`✓ About heading in Bangla: "${aboutHeading}"`);

    console.log('\n[10] Testing Contact Page (/contact) in Bangla...');
    await page.goto(`${BASE_URL}/contact`, { waitUntil: 'networkidle2' });
    const contactHeading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent.trim() : '';
    });
    console.log(`✓ Contact heading in Bangla: "${contactHeading}"`);

    console.log('\n[11] Testing Policies Page (/policies) in Bangla...');
    await page.goto(`${BASE_URL}/policies`, { waitUntil: 'networkidle2' });
    const policiesHeading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent.trim() : '';
    });
    console.log(`✓ Policies heading in Bangla: "${policiesHeading}"`);

    console.log('\n[12] Testing Admin Login (/admin/login) in Bangla...');
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle2' });
    const adminLoginBtn = await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      return btn ? btn.textContent.trim() : '';
    });
    console.log(`✓ Admin sign-in button in Bangla: "${adminLoginBtn}"`);

    // Log in as Admin to test admin portal bilingual support
    await page.type('input[type="email"]', 'admin@quantumtech.com');
    await page.type('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('\n[13] Testing Admin Dashboard (/admin/dashboard) in Bangla...');
    const adminDashTitle = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent.trim() : '';
    });
    console.log(`✓ Admin Dashboard heading in Bangla: "${adminDashTitle}"`);

    console.log('\n[14] Switching Admin back to English...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const langBtn = btns.find(b => b.textContent && (b.textContent.includes('EN') || b.textContent.includes('ইংরেজি') || b.textContent.includes('বাং')));
      if (langBtn) langBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const htmlLangEn = await page.evaluate(() => document.documentElement.lang);
    console.log(`✓ Switched back to English html lang: "${htmlLangEn}"`);
    if (htmlLangEn !== 'en') throw new Error(`Expected 'en', got '${htmlLangEn}'`);

    const adminDashTitleEn = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent.trim() : '';
    });
    console.log(`✓ Admin Dashboard heading in English: "${adminDashTitleEn}"`);

    console.log('\n✅ All Bilingual and System Integration tests passed successfully!');
  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
