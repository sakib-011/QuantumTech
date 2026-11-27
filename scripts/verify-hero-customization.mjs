import puppeteer from 'puppeteer';
import path from 'path';
import { ADMIN_PASSWORD } from './adminCredentials.mjs';

const ARTIFACT_DIR = '/home/sakib/.gemini/antigravity/brain/88627019-6145-4bb3-88bf-5a4402648fd1';

async function run() {
  console.log('Starting Hero Customization Verification...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  try {
    // 1. Log in as admin
    console.log('[1] Logging into admin...');
    await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'admin@quantumtech.com');
    await page.type('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // 2. Go to Admin Settings
    console.log('[2] Navigating to Admin Settings (/admin/settings)...');
    await page.goto('http://localhost:3000/admin/settings', { waitUntil: 'networkidle0' });

    // 3. Click Hero Section & Banner tab
    console.log('[3] Switching to Hero Section & Banner tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const heroBtn = buttons.find(b => b.textContent && (b.textContent.includes('Hero Section & Banner') || b.textContent.includes('হিরো সেকশন')));
      if (heroBtn) heroBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // 4. Update Hero customization fields with native property setter
    console.log('[4] Updating Hero customization fields...');
    await page.evaluate(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const nativeTextAreaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;

      const inputs = Array.from(document.querySelectorAll('input'));
      const textareas = Array.from(document.querySelectorAll('textarea'));

      const titleLine1 = inputs.find(i => i.placeholder === 'Gear up.');
      if (titleLine1) {
        nativeSetter.call(titleLine1, 'Next-Gen Power.');
        titleLine1.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const titleLine2 = inputs.find(i => i.placeholder === 'Charge fast.');
      if (titleLine2) {
        nativeSetter.call(titleLine2, 'Built for Champions.');
        titleLine2.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const badgeInput = inputs.find(i => i.placeholder === 'NEW ARRIVALS 2026');
      if (badgeInput) {
        nativeSetter.call(badgeInput, 'EXCLUSIVE 2026 PRO LINE');
        badgeInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const subtitle = textareas.find(t => t.placeholder && t.placeholder.includes('Quality verified'));
      if (subtitle) {
        nativeTextAreaSetter.call(subtitle, 'Engineered for speed, durability, and supreme charging efficiency.');
        subtitle.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Provide a banner image URL via ImageUploadInput
    console.log('[4b] Providing custom banner image URL...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const pasteBtn = buttons.find(b => b.textContent && b.textContent.includes('Paste URL'));
      if (pasteBtn) pasteBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const testBannerUrl = 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1200&q=80';
    await page.evaluate((url) => {
      const urlInput = document.querySelector('input[type="url"]');
      if (urlInput) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(urlInput, url);
        urlInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const buttons = Array.from(document.querySelectorAll('button'));
      const applyBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Apply');
      if (applyBtn) applyBtn.click();
    }, testBannerUrl);

    await new Promise(r => setTimeout(r, 600));

    // Capture screenshot of Admin Hero Settings
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_hero_settings_tab_configured.png'), fullPage: true });
    console.log('✓ Captured admin_hero_settings_tab_configured.png');

    // 5. Save settings
    console.log('[5] Saving settings...');
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    });
    await new Promise(r => setTimeout(r, 1200));

    // Verify localStorage has the values
    const lsSettings = await page.evaluate(() => JSON.parse(localStorage.getItem('qt_settings')));
    console.log('Saved settings verified in storage:');
    console.log(' - heroTitleLine1:', lsSettings?.heroTitleLine1);
    console.log(' - heroTitleLine2:', lsSettings?.heroTitleLine2);
    console.log(' - heroBadgeText:', lsSettings?.heroBadgeText);
    console.log(' - heroBannerImage:', lsSettings?.heroBannerImage ? 'UNSPLASH URL SET' : 'NONE');

    // 6. Navigate to Storefront Homepage
    console.log('[6] Navigating to Storefront (http://localhost:3000/)...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

    // Verify hero content updated
    const heroHeadingText = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.innerText : '';
    });
    console.log('Hero Heading on Storefront:', JSON.stringify(heroHeadingText));

    const heroImgSrc = await page.evaluate(() => {
      const img = document.querySelector('section img[alt*="QuantumTech"]');
      return img ? img.src : '';
    });
    console.log('Hero Image src on Storefront:', heroImgSrc);

    if (!heroHeadingText.includes('Next-Gen Power.')) {
      throw new Error(`Expected heading to include "Next-Gen Power.", but got: ${heroHeadingText}`);
    }
    if (!heroHeadingText.includes('Built for Champions.')) {
      throw new Error(`Expected heading to include "Built for Champions.", but got: ${heroHeadingText}`);
    }
    if (!heroImgSrc.includes('unsplash')) {
      throw new Error(`Expected hero image to be unsplash image, but got: ${heroImgSrc}`);
    }

    console.log('✓ Verified: Storefront Hero heading and custom banner updated dynamically!');

    // Take screenshot of Storefront Hero
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'storefront_custom_hero.png'), fullPage: false });
    console.log('✓ Captured storefront_custom_hero.png');

    // Test Dark Mode
    console.log('[7] Testing Dark Mode appearance...');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('qt_theme', 'dark');
    });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'storefront_custom_hero_dark.png'), fullPage: false });
    console.log('✓ Captured storefront_custom_hero.png (dark)');

    // Test Mobile Viewport 360px
    console.log('[8] Testing 360px mobile viewport zero horizontal overflow...');
    await page.setViewport({ width: 360, height: 740 });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`Mobile 360px Check: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);

    if (scrollWidth > clientWidth) {
      throw new Error(`Horizontal overflow detected! scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`);
    }
    console.log('✓ Zero horizontal overflow on 360px mobile view!');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_storefront_custom_hero.png'), fullPage: false });
    console.log('✓ Captured mobile_storefront_custom_hero.png');

    console.log('\n===========================================');
    console.log('🎉 HERO CUSTOMIZATION VERIFICATION 100% SUCCESSFUL!');
    console.log('===========================================');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
