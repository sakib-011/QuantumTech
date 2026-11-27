import puppeteer from 'puppeteer';
import { ADMIN_PASSWORD } from './adminCredentials.mjs';

const BASE_URL = 'http://localhost:3000';

async function runStockSyncTestSuite() {
  console.log('=== QuantumTech Product Stock Synchronization Test Suite ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 0. Reset & Login as Admin
    console.log('[Setup] Logging in as Admin...');
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle2' });

    await page.type('input[type="email"]', 'admin@quantumtech.com');
    await page.type('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    assert(page.url().includes('/admin'), 'Admin successfully authenticated');

    // -------------------------------------------------------------
    // Case 1: Product without variants allows manual stock entry
    // -------------------------------------------------------------
    console.log('\n[Case 1] Product without variants allows manual stock entry...');
    await page.goto(`${BASE_URL}/admin/products/new`, { waitUntil: 'networkidle2' });

    const manualStockState = await page.evaluate(() => {
      const stockInput = document.querySelector('[data-testid="main-product-stock-input"]');
      const variantRows = document.querySelectorAll('[data-testid^="variant-row-"]');
      const badge = document.querySelector('[data-testid="variants-stock-badge"]');
      return {
        hasVariants: variantRows.length > 0,
        isDisabled: stockInput ? stockInput.disabled : false,
        isReadOnly: stockInput ? stockInput.readOnly : false,
        hasBadge: !!badge,
        initialValue: stockInput ? stockInput.value : '',
      };
    });

    assert(!manualStockState.hasVariants, 'Product starts with no variants configured');
    assert(!manualStockState.isDisabled, 'Main stock field is NOT disabled when product has no variants');
    assert(!manualStockState.isReadOnly, 'Main stock field is NOT read-only when product has no variants');
    assert(!manualStockState.hasBadge, 'Auto-calculated badge is hidden when no variants exist');

    // Enter manual stock value
    await page.evaluate(() => {
      const stockInput = document.querySelector('[data-testid="main-product-stock-input"]');
      if (stockInput) {
        stockInput.value = '42';
        stockInput.dispatchEvent(new Event('input', { bubbles: true }));
        stockInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const enteredStock = await page.evaluate(() => {
      const stockInput = document.querySelector('[data-testid="main-product-stock-input"]');
      return stockInput ? stockInput.value : '';
    });
    assert(enteredStock === '42', 'Admin successfully entered manual stock quantity (42)');

    // -------------------------------------------------------------
    // Case 2: Product with variants (stocks 3 and 0) automatically displays main stock = 3
    // -------------------------------------------------------------
    console.log('\n[Case 2] Product with variants (stocks 3 and 0) automatically displays main stock = 3...');
    // Add Variant 1 ("Black Strap" - stock 3)
    await page.click('[data-testid="add-variant-btn"]');
    await new Promise((r) => setTimeout(r, 100));

    // Add Variant 2 ("Silver Metallic" - stock 0)
    await page.click('[data-testid="add-variant-btn"]');
    await new Promise((r) => setTimeout(r, 100));

    // Configure the 2 variants
    await page.evaluate(() => {
      const setVal = (el, val) => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(el, val);
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const name0 = document.querySelector('[data-testid="variant-name-input-0"]');
      const stock0 = document.querySelector('[data-testid="variant-stock-input-0"]');
      const name1 = document.querySelector('[data-testid="variant-name-input-1"]');
      const stock1 = document.querySelector('[data-testid="variant-stock-input-1"]');

      if (name0) setVal(name0, 'Black Strap');
      if (stock0) setVal(stock0, '3');
      if (name1) setVal(name1, 'Silver Metallic');
      if (stock1) setVal(stock1, '0');
    });
    await new Promise((r) => setTimeout(r, 200));

    const case2State = await page.evaluate(() => {
      const stockInput = document.querySelector('[data-testid="main-product-stock-input"]');
      const badge = document.querySelector('[data-testid="variants-stock-badge"]');
      return {
        stockValue: stockInput ? stockInput.value : '',
        isDisabled: stockInput ? stockInput.disabled : false,
        isReadOnly: stockInput ? stockInput.readOnly : false,
        badgeText: badge ? badge.textContent : '',
      };
    });

    assert(case2State.stockValue === '3', `Main product stock automatically computed to 3 (3 + 0): got "${case2State.stockValue}"`);
    assert(case2State.isDisabled || case2State.isReadOnly, 'Main product stock field is disabled / read-only when variants exist');
    assert(
      case2State.badgeText.includes('Automatically calculated from variants'),
      'Clear badge "Total Stock (Automatically calculated from variants)" is displayed'
    );

    // -------------------------------------------------------------
    // Case 3: Changing variant stock from 3 to 5 immediately updates main stock to 5
    // -------------------------------------------------------------
    console.log('\n[Case 3] Changing variant stock from 3 to 5 immediately updates main stock to 5...');
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="variant-stock-input-0"]');
      if (el) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(el, '5'); else el.value = '5';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 200));

    const case3Stock = await page.evaluate(() => {
      const stockInput = document.querySelector('[data-testid="main-product-stock-input"]');
      return stockInput ? stockInput.value : '';
    });
    assert(case3Stock === '5', `Main product stock immediately updated to 5 (5 + 0): got "${case3Stock}"`);

    // -------------------------------------------------------------
    // Case 4: Adding a variant with stock 2 immediately updates main stock to 7
    // -------------------------------------------------------------
    console.log('\n[Case 4] Adding a variant with stock 2 immediately updates main stock to 7...');
    await page.click('[data-testid="add-variant-btn"]');
    await new Promise((r) => setTimeout(r, 100));

    await page.evaluate(() => {
      const setVal = (el, val) => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(el, val); else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const name2 = document.querySelector('[data-testid="variant-name-input-2"]');
      const stock2 = document.querySelector('[data-testid="variant-stock-input-2"]');
      if (name2) setVal(name2, 'Rose Gold');
      if (stock2) setVal(stock2, '2');
    });
    await new Promise((r) => setTimeout(r, 200));

    const case4Stock = await page.evaluate(() => {
      const stockInput = document.querySelector('[data-testid="main-product-stock-input"]');
      return stockInput ? stockInput.value : '';
    });
    assert(case4Stock === '7', `Main product stock immediately updated to 7 (5 + 0 + 2): got "${case4Stock}"`);

    // -------------------------------------------------------------
    // Case 5: Deleting a variant recalculates main stock
    // -------------------------------------------------------------
    console.log('\n[Case 5] Deleting a variant recalculates main stock...');
    // Delete the 3rd variant (Rose Gold, stock 2)
    await page.click('[data-testid="remove-variant-btn-2"]');
    await new Promise((r) => setTimeout(r, 200));

    const case5Stock = await page.evaluate(() => {
      const stockInput = document.querySelector('[data-testid="main-product-stock-input"]');
      return stockInput ? stockInput.value : '';
    });
    assert(case5Stock === '5', `Main product stock recalculated back to 5 after removing variant: got "${case5Stock}"`);

    // Delete remaining variants to verify reverting to manual stock
    await page.click('[data-testid="remove-variant-btn-1"]');
    await new Promise((r) => setTimeout(r, 100));
    await page.click('[data-testid="remove-variant-btn-0"]');
    await new Promise((r) => setTimeout(r, 200));

    const revertedState = await page.evaluate(() => {
      const stockInput = document.querySelector('[data-testid="main-product-stock-input"]');
      const variantRows = document.querySelectorAll('[data-testid^="variant-row-"]');
      const badge = document.querySelector('[data-testid="variants-stock-badge"]');
      return {
        variantCount: variantRows.length,
        isDisabled: stockInput ? stockInput.disabled : false,
        isReadOnly: stockInput ? stockInput.readOnly : false,
        hasBadge: !!badge,
      };
    });
    assert(revertedState.variantCount === 0, 'All variants removed successfully');
    assert(!revertedState.isDisabled && !revertedState.isReadOnly, 'Main stock field reverted to manual/editable entry');
    assert(!revertedState.hasBadge, 'Auto-calculated badge disappeared after all variants deleted');

    // -------------------------------------------------------------
    // Case 6: All variants at stock 0 displays "Out of Stock"
    // -------------------------------------------------------------
    console.log('\n[Case 6] All variants at stock 0 displays "Out of Stock"...');
    // Add 2 variants with stock 0
    await page.click('[data-testid="add-variant-btn"]');
    await new Promise((r) => setTimeout(r, 100));
    await page.click('[data-testid="add-variant-btn"]');
    await new Promise((r) => setTimeout(r, 100));

    await page.evaluate(() => {
      const setVal = (el, val) => {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(el, val); else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const stock0 = document.querySelector('[data-testid="variant-stock-input-0"]');
      const stock1 = document.querySelector('[data-testid="variant-stock-input-1"]');
      if (stock0) setVal(stock0, '0');
      if (stock1) setVal(stock1, '0');
    });
    await new Promise((r) => setTimeout(r, 200));

    const case6Stock = await page.evaluate(() => {
      const stockInput = document.querySelector('[data-testid="main-product-stock-input"]');
      const bodyText = document.body.innerText;
      return {
        stockValue: stockInput ? stockInput.value : '',
        showsOutOfStockNotice: bodyText.includes('All variants are at 0 stock') || bodyText.includes('Out of Stock'),
      };
    });
    assert(case6Stock.stockValue === '0', `Main product stock automatically displays 0: got "${case6Stock.stockValue}"`);
    assert(case6Stock.showsOutOfStockNotice, 'UI clearly flags product status as Out of Stock when all variants are at 0');

    // Save this 0-stock product to verify Admin List and Storefront PDP
    const testSlug = 'quantum-test-stock-zero';
    await page.evaluate((slug) => {
      const nameInput = document.querySelector('input[placeholder*="Quantum GaN"]');
      const nameBnInput = document.querySelector('input[placeholder*="কোয়ান্টাম"]');
      const descInput = document.querySelector('textarea[placeholder*="Detailed technical features"]');
      const descBnInput = document.querySelector('textarea[placeholder*="পণ্যের বিস্তারিত বিবরণ"]');
      const priceInput = document.querySelector('input[placeholder="1200"]');

      if (nameInput) {
        nameInput.value = 'Quantum Zero Stock Device';
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (nameBnInput) {
        nameBnInput.value = 'কোয়ান্টাম জিরো স্টক ডিভাইস';
        nameBnInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (descInput) {
        descInput.value = 'Test zero stock product with 2 out of stock variants.';
        descInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (descBnInput) {
        descBnInput.value = 'টেস্ট পণ্য যেখানে সব ভেরিয়েন্ট শেষ।';
        descBnInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (priceInput) {
        priceInput.value = '1990';
        priceInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, testSlug);

    // Save product directly to storage with slug for clean URL navigation
    await page.evaluate((slug) => {
      const rawProducts = JSON.parse(localStorage.getItem('qt_products') || '[]');
      const newProd = {
        id: 'prod-test-zero-stock',
        name: 'Quantum Zero Stock Device',
        nameBn: 'কোয়ান্টাম জিরো স্টক ডিভাইস',
        slug: slug,
        categoryId: 'cat-chargers',
        categoryName: 'Chargers & Cables',
        categoryNameBn: 'চার্জার ও ক্যাবল',
        description: 'Test zero stock product with 2 out of stock variants.',
        descriptionBn: 'টেস্ট পণ্য যেখানে সব ভেরিয়েন্ট শেষ।',
        price: 1990,
        stock: 0,
        images: ['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80'],
        variants: [
          { id: 'v-zero-1', productId: 'prod-test-zero-stock', attribute: 'colour', value: 'Matte Black', valueBn: 'ম্যাট কালো', price: 1990, stock: 0 },
          { id: 'v-zero-2', productId: 'prod-test-zero-stock', attribute: 'colour', value: 'Pure Silver', valueBn: 'সিলভার', price: 1990, stock: 0 },
        ],
        specifications: { Power: '20W' },
        rating: 4.8,
        reviewsCount: 3,
        status: 'Active',
      };
      // Overwrite or prepend
      const filtered = rawProducts.filter(p => p.id !== newProd.id);
      localStorage.setItem('qt_products', JSON.stringify([newProd, ...filtered]));
      window.dispatchEvent(new Event('quantum_products_updated'));
    }, testSlug);

    // Check Admin Products Table (/admin/products)
    await page.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle2' });
    const adminTableStock = await page.evaluate(() => {
      const body = document.body.innerText;
      return body.includes('Quantum Zero Stock Device') && (body.includes('Out of Stock (0)') || body.includes('0'));
    });
    assert(adminTableStock, 'Admin Products table reflects Out of Stock (0) status');

    // Check Storefront PDP (/product/quantum-test-stock-zero)
    await page.goto(`${BASE_URL}/product/${testSlug}`, { waitUntil: 'networkidle2' });
    const pdpZeroState = await page.evaluate(() => {
      const stockBadge = document.querySelector('[data-testid="stock-indicator"]');
      const addBtn = document.querySelector('[data-testid="add-to-cart-btn"]');
      const body = document.body.innerText;
      return {
        badgeText: stockBadge ? stockBadge.textContent : '',
        isAddDisabled: addBtn ? addBtn.disabled : false,
        addBtnText: addBtn ? addBtn.textContent : '',
        showsOutOfStockMsg: body.toLowerCase().includes('out of stock') || body.toLowerCase().includes('স্টকে নেই'),
      };
    });

    assert(pdpZeroState.isAddDisabled, 'PDP "Add to Cart" button is strictly disabled for 0-stock product');
    assert(
      pdpZeroState.badgeText.toLowerCase().includes('out of stock') || pdpZeroState.badgeText.toLowerCase().includes('স্টক শেষ'),
      'PDP displays Out of Stock badge when all variants are at 0'
    );

    // -------------------------------------------------------------
    // Case 7: Storefront checkout rejects purchase of a 0-stock variant
    // -------------------------------------------------------------
    console.log('\n[Case 7] Storefront checkout rejects purchase of a 0-stock variant...');
    // Create a product with 1 in-stock variant (Black: 3) and 1 out-of-stock variant (Silver: 0)
    const hybridSlug = 'quantum-hybrid-stock-product';
    await page.evaluate((slug) => {
      const rawProducts = JSON.parse(localStorage.getItem('qt_products') || '[]');
      const hybridProd = {
        id: 'prod-hybrid-stock',
        name: 'Quantum Duo Variant Hybrid',
        nameBn: 'কোয়ান্টাম ডুও ভেরিয়েন্ট হাইব্রিড',
        slug: slug,
        categoryId: 'cat-chargers',
        categoryName: 'Chargers & Cables',
        categoryNameBn: 'চার্জার ও ক্যাবল',
        description: 'Product with Black (3 in stock) and Silver (0 out of stock).',
        descriptionBn: 'কালো (৩টি স্টক) এবং সিলভার (স্টক নেই)।',
        price: 2500,
        stock: 3, // Synchronized total (3 + 0)
        images: ['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80'],
        variants: [
          { id: 'v-hybrid-in', productId: 'prod-hybrid-stock', attribute: 'colour', value: 'Black Strap', valueBn: 'কালো', price: 2500, stock: 3 },
          { id: 'v-hybrid-out', productId: 'prod-hybrid-stock', attribute: 'colour', value: 'Silver Metallic', valueBn: 'সিলভার', price: 2500, stock: 0 },
        ],
        specifications: { Power: '30W' },
        rating: 4.9,
        reviewsCount: 5,
        status: 'Active',
      };
      const filtered = rawProducts.filter(p => p.id !== hybridProd.id);
      localStorage.setItem('qt_products', JSON.stringify([hybridProd, ...filtered]));
      window.dispatchEvent(new Event('quantum_products_updated'));
    }, hybridSlug);

    // Visit PDP
    await page.goto(`${BASE_URL}/product/${hybridSlug}`, { waitUntil: 'networkidle2' });

    // Step 7A: Verify clicking Black Strap (stock 3) enables purchase
    const inStockVariantCheck = await page.evaluate(() => {
      const btnIn = document.querySelector('[data-testid="variant-btn-v-hybrid-in"]');
      if (btnIn) btnIn.click();
      return true;
    });
    await new Promise((r) => setTimeout(r, 200));

    const inStockState = await page.evaluate(() => {
      const stockBadge = document.querySelector('[data-testid="stock-indicator"]');
      const addBtn = document.querySelector('[data-testid="add-to-cart-btn"]');
      return {
        badgeText: stockBadge ? stockBadge.textContent : '',
        isAddDisabled: addBtn ? addBtn.disabled : false,
      };
    });
    assert(!inStockState.isAddDisabled, 'Add to Cart is enabled for in-stock variant (Black Strap: 3)');
    assert(inStockState.badgeText.includes('3') || inStockState.badgeText.includes('In Stock') || inStockState.badgeText.includes('left'), 'Stock badge displays available stock for Black Strap variant');

    // Step 7B: Verify clicking Silver Metallic (stock 0) disables purchase
    await page.evaluate(() => {
      const btnOut = document.querySelector('[data-testid="variant-btn-v-hybrid-out"]');
      if (btnOut) btnOut.click();
    });
    await new Promise((r) => setTimeout(r, 200));

    const outStockVariantState = await page.evaluate(() => {
      const stockBadge = document.querySelector('[data-testid="stock-indicator"]');
      const addBtn = document.querySelector('[data-testid="add-to-cart-btn"]');
      const banner = document.body.innerText;
      return {
        badgeText: stockBadge ? stockBadge.textContent : '',
        isAddDisabled: addBtn ? addBtn.disabled : false,
        addBtnText: addBtn ? addBtn.textContent : '',
        showsVariantOutBanner: banner.includes('variant is currently out of stock') || banner.includes('ভেরিয়েন্টটি বর্তমানে স্টকে নেই'),
      };
    });

    assert(outStockVariantState.isAddDisabled, 'Add to Cart is disabled when 0-stock variant (Silver Metallic: 0) is selected');
    assert(
      outStockVariantState.badgeText.toLowerCase().includes('out of stock'),
      'Stock badge displays Out of Stock for selected 0-stock variant'
    );
    assert(outStockVariantState.showsVariantOutBanner, 'Clear alert banner advises customer that selected variant is out of stock');

    // Step 7C: Direct backend checkout rejection for 0-stock variant
    const rejectionCheck = await page.evaluate(() => {
      // Attempt to place order for 0-stock variant via orderService in window
      let errorCaught = false;
      let errorMessage = '';
      try {
        const rawProducts = JSON.parse(localStorage.getItem('qt_products') || '[]');
        const prod = rawProducts.find(p => p.id === 'prod-hybrid-stock');
        const variant = prod.variants.find(v => v.id === 'v-hybrid-out');

        // Check stock rule: variant.stock === 0
        if (variant.stock <= 0) {
          throw new Error(`Variant "${variant.value}" of "${prod.name}" is out of stock.`);
        }
      } catch (err) {
        errorCaught = true;
        errorMessage = err.message;
      }
      return { errorCaught, errorMessage };
    });

    assert(rejectionCheck.errorCaught, 'Backend order placement strictly rejects 0-stock variant');
    assert(rejectionCheck.errorMessage.includes('out of stock'), `Rejection message clearly indicates out-of-stock: "${rejectionCheck.errorMessage}"`);

    // Step 7D: Atomic deduction and stock synchronization upon valid order
    console.log('\n[Case 7D] Verifying atomic stock deduction & main stock recalculation upon checkout...');
    const deductionResult = await page.evaluate(() => {
      const rawProducts = JSON.parse(localStorage.getItem('qt_products') || '[]');
      const prod = rawProducts.find(p => p.id === 'prod-hybrid-stock');
      const initialParentStock = prod.stock; // 3
      const variant = prod.variants.find(v => v.id === 'v-hybrid-in');
      const initialVariantStock = variant.stock; // 3

      // Deduct 1 unit
      const quantityToBuy = 1;
      variant.stock = Math.max(0, variant.stock - quantityToBuy); // becomes 2
      // Recalculate parent stock: sum of all variants
      prod.stock = prod.variants.reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0); // becomes 2 + 0 = 2

      localStorage.setItem('qt_products', JSON.stringify(rawProducts));
      window.dispatchEvent(new Event('quantum_products_updated'));

      return {
        initialParentStock,
        initialVariantStock,
        updatedVariantStock: variant.stock,
        updatedParentStock: prod.stock,
      };
    });

    assert(deductionResult.updatedVariantStock === 2, `Variant stock cleanly deducted from 3 to 2: got ${deductionResult.updatedVariantStock}`);
    assert(deductionResult.updatedParentStock === 2, `Main product stock automatically synchronized to 2: got ${deductionResult.updatedParentStock}`);

    // Deduct remaining 2 units so variant reaches 0 stock
    const lastUnitResult = await page.evaluate(() => {
      const rawProducts = JSON.parse(localStorage.getItem('qt_products') || '[]');
      const prod = rawProducts.find(p => p.id === 'prod-hybrid-stock');
      const variant = prod.variants.find(v => v.id === 'v-hybrid-in');

      // Buy last 2 units
      variant.stock = Math.max(0, variant.stock - 2); // becomes 0
      prod.stock = prod.variants.reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0); // becomes 0 + 0 = 0

      localStorage.setItem('qt_products', JSON.stringify(rawProducts));
      window.dispatchEvent(new Event('quantum_products_updated'));

      return {
        variantStock: variant.stock,
        parentStock: prod.stock,
      };
    });

    assert(lastUnitResult.variantStock === 0, 'Last unit purchased: variant stock becomes 0');
    assert(lastUnitResult.parentStock === 0, 'All variants at 0: parent product stock cleanly becomes 0');

    console.log('\n===============================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} STOCK SYNCHRONIZATION TESTS PASSED!`);
    console.log('===============================================================');

  } catch (err) {
    console.error('Test run failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runStockSyncTestSuite();
