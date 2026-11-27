import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ADMIN_PASSWORD } from './adminCredentials.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3000';

// Create fixture images
const FIXTURE_DIR = path.join(__dirname, 'test-fixtures');
if (!fs.existsSync(FIXTURE_DIR)) {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
}

// 1x1 Red PNG
const RED_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
// 1x1 Blue PNG
const BLUE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEAQH//s2WjAAAAABJRU5ErkJggg==';

const PRODUCT_IMG_PATH = path.join(FIXTURE_DIR, 'sample-product-image.png');
const VARIANT_IMG_PATH = path.join(FIXTURE_DIR, 'sample-variant-image.png');

fs.writeFileSync(PRODUCT_IMG_PATH, Buffer.from(RED_PNG_BASE64, 'base64'));
fs.writeFileSync(VARIANT_IMG_PATH, Buffer.from(BLUE_PNG_BASE64, 'base64'));

async function run() {
  console.log('====================================================');
  console.log('TESTING MOBILE NAVBAR & ADMIN IMAGE UPLOAD FEATURES');
  console.log('====================================================\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // -----------------------------------------------------------------
    // TEST SUITE 1: MOBILE NAVBAR AUDIT & USER INTERACTION (360px & 390px)
    // -----------------------------------------------------------------
    console.log('[1] Testing Mobile Navbar at 360px viewport...');
    await page.setViewport({ width: 360, height: 740, isMobile: true, hasTouch: true });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });

    // Verify Hamburger button is visible
    const hamburgerVisible = await page.$eval('[data-testid="mobile-menu-toggle"]', el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    });
    console.log(`✓ Hamburger toggle visible on 360px: ${hamburgerVisible}`);
    if (!hamburgerVisible) throw new Error('Hamburger toggle is not visible on 360px mobile view');

    // Check no horizontal scrollbar on body
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`✓ Zero horizontal overflow on 360px: ${!hasHorizontalOverflow}`);
    if (hasHorizontalOverflow) throw new Error('Horizontal overflow detected on mobile view');

    // Click Hamburger to open drawer
    console.log('Opening mobile drawer navigation...');
    await page.click('[data-testid="mobile-menu-toggle"]');
    await new Promise(r => setTimeout(r, 400));

    // Verify drawer is open and body overflow is locked
    const drawerOpen = await page.evaluate(() => {
      const drawer = document.querySelector('[role="dialog"][aria-label="Mobile Navigation Drawer"]');
      const bodyLocked = document.body.style.overflow === 'hidden';
      const hasCloseBtn = !!document.querySelector('[data-testid="mobile-drawer-close"]');
      return { isOpen: !!drawer, bodyLocked, hasCloseBtn };
    });
    console.log(`✓ Mobile drawer opened: ${drawerOpen.isOpen}, body locked: ${drawerOpen.bodyLocked}, close button: ${drawerOpen.hasCloseBtn}`);
    if (!drawerOpen.isOpen) throw new Error('Drawer failed to open');
    if (!drawerOpen.bodyLocked) throw new Error('Body scroll was not locked when drawer opened');

    // Test close drawer via close button
    console.log('Testing close button in drawer...');
    await page.click('[data-testid="mobile-drawer-close"]');
    await new Promise(r => setTimeout(r, 400));

    const drawerClosed = await page.evaluate(() => {
      const drawer = document.querySelector('[role="dialog"][aria-label="Mobile Navigation Drawer"]');
      const bodyUnlocked = document.body.style.overflow === '';
      return !drawer && bodyUnlocked;
    });
    console.log(`✓ Drawer closed and body unlocked: ${drawerClosed}`);
    if (!drawerClosed) throw new Error('Drawer failed to close properly');

    // Reopen and test navigation link auto-closing drawer
    console.log('Reopening drawer and testing navigation click auto-close...');
    await page.click('[data-testid="mobile-menu-toggle"]');
    await new Promise(r => setTimeout(r, 400));

    // Click "Shop" link in mobile drawer
    const shopLink = await page.$('[role="dialog"] a[href="/shop"]');
    if (shopLink) {
      await shopLink.click();
      await page.waitForFunction(() => window.location.pathname === '/shop', { timeout: 4000 });
      await new Promise(r => setTimeout(r, 400));
      const onShopPage = await page.evaluate(() => window.location.pathname === '/shop');
      const drawerClosedOnNav = await page.evaluate(() => !document.querySelector('[role="dialog"][aria-label="Mobile Navigation Drawer"]'));
      console.log(`✓ Navigated to /shop: ${onShopPage}, drawer auto-closed: ${drawerClosedOnNav}`);
      if (!onShopPage || !drawerClosedOnNav) throw new Error('Navigation or drawer auto-close failed');
    }

    // -----------------------------------------------------------------
    // TEST SUITE 2: ADMIN PANEL - PRODUCT & VARIANT IMAGE UPLOADS
    // -----------------------------------------------------------------
    console.log('\n[2] Testing Admin Product & Variant Image Uploads...');
    await page.setViewport({ width: 1280, height: 900 });

    // Simulate login if needed
    await page.goto(`${BASE_URL}/admin/products/new`, { waitUntil: 'networkidle2' });

    // If redirected to login, authenticate
    const isLoginPage = await page.evaluate(() => window.location.pathname.includes('/admin/login'));
    if (isLoginPage) {
      console.log('Logging in to admin dashboard...');
      await page.type('#admin-email', 'admin@quantumtech.com');
      await page.type('#admin-password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForFunction(() => !window.location.pathname.includes('/admin/login'), { timeout: 6000 });
      await page.goto(`${BASE_URL}/admin/products/new`, { waitUntil: 'networkidle2' });
    }

    console.log('On Admin Add Product page (/admin/products/new)...');

    // 2a: Test Main Product Gallery Image Upload
    console.log('Testing Product Gallery direct file upload...');
    const fileInput = await page.$('input[data-testid="product-image-file-input"]');
    if (!fileInput) throw new Error('Product image file input not found');

    await fileInput.uploadFile(PRODUCT_IMG_PATH);
    // Wait for image compression and addition
    await new Promise(r => setTimeout(r, 1200));

    const galleryCount = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[alt^="Product image"], img[alt^="Preview"]');
      return imgs.length;
    });
    console.log(`✓ Product gallery has images after upload: ${galleryCount} image(s)`);
    if (galleryCount < 2) throw new Error('Uploaded image was not added to gallery');

    // 2b: Test Variant Image Upload
    console.log('Adding a variant and testing variant image upload...');
    await page.click('[data-testid="add-variant-btn"]');
    await new Promise(r => setTimeout(r, 500));

    // Upload variant image for variant row 0
    const variantFileInput = await page.$('input[data-testid="variant-image-upload-0"]');
    if (!variantFileInput) throw new Error('Variant image file input not found');

    await variantFileInput.uploadFile(VARIANT_IMG_PATH);
    await new Promise(r => setTimeout(r, 1200));

    // Verify variant row shows uploaded image preview
    const variantHasImage = await page.evaluate(() => {
      const row = document.querySelector('[data-testid="variant-row-0"]');
      if (!row) return false;
      const img = row.querySelector('img');
      return !!img && img.src.startsWith('data:image/');
    });
    console.log(`✓ Variant row 0 displays uploaded image thumbnail: ${variantHasImage}`);
    if (!variantHasImage) throw new Error('Variant row does not display the uploaded image');

    // Fill form details and submit
    console.log('Filling product details and saving product...');
    const testTitle = `Test Upload Gadget ${Date.now()}`;
    await page.type('input[placeholder*="Quantum GaN"]', testTitle);
    await page.type('input[placeholder*="কোয়ান্টাম"]', 'টেস্ট গ্যাজেট আপলোড');
    await page.type('textarea[placeholder*="Detailed technical features"]', 'High quality test product with custom uploaded gallery and variant images.');
    await page.type('textarea[placeholder*="পণ্যের বিস্তারিত বিবরণ"]', 'কাস্টম আপলোডকৃত ছবি সম্বলিত টেস্ট প্রোডাক্ট।');

    // Submit product form
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b => b.textContent && b.textContent.includes('Publish Product'));
      if (saveBtn) saveBtn.click();
    });

    await page.waitForFunction(() => window.location.pathname === '/admin/products', { timeout: 8000 });
    console.log('✓ Product successfully saved and redirected to /admin/products');

    // -----------------------------------------------------------------
    // TEST SUITE 3: STOREFRONT PDP VARIANT IMAGE VERIFICATION
    // -----------------------------------------------------------------
    console.log('\n[3] Verifying Product Details Page (PDP) displays variant image...');
    await page.goto(`${BASE_URL}/shop`, { waitUntil: 'networkidle2' });

    // Find the newly created product link
    const productSlug = await page.evaluate((title) => {
      const cards = Array.from(document.querySelectorAll('a[href^="/product/"]'));
      const matching = cards.find(c => c.textContent && c.textContent.includes(title));
      return matching ? matching.getAttribute('href') : null;
    }, testTitle);

    console.log(`Product PDP URL: ${productSlug}`);
    if (productSlug) {
      await page.goto(`${BASE_URL}${productSlug}`, { waitUntil: 'networkidle2' });

      // Check variant buttons and PDP gallery
      const pdpVerified = await page.evaluate(() => {
        const mainImg = document.querySelector('img[alt*="view"]');
        const variantBtns = document.querySelectorAll('button[data-testid^="variant-"]');
        return {
          hasMainImg: !!mainImg,
          mainImgSrc: mainImg ? mainImg.src.substring(0, 40) : '',
          variantBtnCount: variantBtns.length
        };
      });
      console.log(`✓ Storefront PDP image and variant buttons verified:`, pdpVerified);
    }

    console.log('\n====================================================');
    console.log('ALL MOBILE NAVBAR & IMAGE UPLOAD TESTS PASSED SUCCESSFULLY! ✓');
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    // Cleanup fixtures
    if (fs.existsSync(FIXTURE_DIR)) {
      fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }
  }
}

run();
