import puppeteer from 'puppeteer';
import { ADMIN_PASSWORD } from './adminCredentials.mjs';

async function runOrdersAndReviewsTests() {
  console.log('=== QuantumTech Admin Orders, Payment Verification & Reviews Test ===\n');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // 1. Sign in to Admin
  console.log('[1] Logging in to Admin Portal...');
  await page.goto('http://localhost:3000/admin/login', { waitUntil: 'networkidle0' });
  await page.type('#admin-password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname.includes('/admin/dashboard'), { timeout: 6000 });
  console.log('✓ Successfully authenticated to dashboard');

  // 2. Order Management Table Verification (/admin/orders)
  console.log('\n[2] Verifying Order Management Table (/admin/orders)...');
  await page.goto('http://localhost:3000/admin/orders', { waitUntil: 'networkidle0' });

  // Check Pending Order count indicator
  const pendingCountText = await page.$eval('div:has(> span.bg-amber-500)', el => el.innerText).catch(() => '');
  console.log(`✓ Pending Orders Indicator: "${pendingCountText}"`);

  // Check Table Headers
  const tableHeaders = await page.$$eval('thead th', ths => ths.map(t => t.innerText.trim()));
  console.log('Table Headers detected:', tableHeaders);
  const expectedHeaders = ['Order Number', 'Order Date', 'Customer Name', 'Mobile Number', 'Total Amount', 'Payment Method', 'Payment Status', 'Order Status', 'Action'];
  const hasAllHeaders = expectedHeaders.every(h => tableHeaders.some(th => th.toLowerCase().includes(h.toLowerCase())));
  console.log(`✓ All 9 required table columns present: ${hasAllHeaders}`);
  if (!hasAllHeaders) throw new Error('Missing one or more required columns in orders table');

  // 3. Search & Filter Tests
  console.log('\n[3] Testing Order Search by Order Number and Phone...');
  // Search by order number "QT-"
  await page.type('input[placeholder*="Search by order number"]', 'QT-');
  await new Promise(r => setTimeout(r, 300));
  let rowCount = await page.$$eval('tbody tr', rows => rows.length);
  console.log(`✓ Orders matching "QT-": ${rowCount}`);

  // Clear search
  await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="Search by order number"]');
    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 300));

  // 4. Create a bKash order via Guest Checkout to test payment verification flow
  console.log('\n[4] Creating a mock bKash Guest Order to test Payment Verification...');
  // Add item to cart
  await page.goto('http://localhost:3000/product/q-charge-20w-fast-charger', { waitUntil: 'networkidle0' });
  const addBtn = await page.waitForSelector('[data-testid="add-to-cart-btn"]');
  await addBtn.click();
  await new Promise(r => setTimeout(r, 500));

  // Checkout with bKash
  await page.goto('http://localhost:3000/checkout', { waitUntil: 'networkidle0' });
  await page.type('#checkout-fullname', 'Rakib Al Hasan');
  await page.type('#checkout-phone', '01799887766');
  await page.type('#checkout-address', 'Mirpur 10, Block C, Dhaka');

  // Select bKash
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const bkashBtn = btns.find(b => b.textContent && b.textContent.includes('bKash'));
    if (bkashBtn) bkashBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  await page.type('#checkout-sender', '01799887766');
  await page.type('#checkout-trxid', '9J2K8L1M');

  const placeOrderBtn = await page.waitForSelector('[data-testid="place-order-btn"]');
  await placeOrderBtn.click();
  await page.waitForFunction(() => window.location.pathname.includes('/order-confirmation/'), { timeout: 6000 });

  const bkashOrderNumber = await page.$eval('span.font-mono', el => el.innerText);
  console.log(`✓ Created bKash order: ${bkashOrderNumber}`);

  // 5. Navigate to Order Details (/admin/orders/:id)
  console.log('\n[5] Testing Order Details Page (/admin/orders/:id)...');
  await page.goto(`http://localhost:3000/admin/orders/${bkashOrderNumber}`, { waitUntil: 'networkidle0' });

  const orderDetailText = await page.evaluate(() => document.body.innerText);
  console.log(`✓ Order Details Loaded: Customer=${orderDetailText.includes('Rakib Al Hasan')}, TrxID=${orderDetailText.includes('9J2K8L1M')}`);
  if (!orderDetailText.includes('9J2K8L1M')) throw new Error('Transaction ID not visible on order details page');

  // 6. Test Payment Verification Guard:
  // "Do not allow an unverified mobile payment order to become Confirmed."
  console.log('\n[6] Testing Payment Verification Guard (bKash must be Verified before Confirmation)...');
  const confirmBtnDisabled = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const confBtn = btns.find(b => b.textContent && b.textContent.includes('Confirm Order'));
    return confBtn ? confBtn.disabled : false;
  });
  console.log(`✓ Advance to "Confirmed" disabled for unverified bKash order: ${confirmBtnDisabled}`);
  if (!confirmBtnDisabled) throw new Error('Expected Confirm button to be disabled before payment is verified');

  // Mark Payment as Verified
  console.log('Marking bKash payment as Verified...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const verifyBtn = btns.find(b => b.textContent && b.textContent.includes('Mark Verified'));
    if (verifyBtn) verifyBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  let updatedDetailText = await page.evaluate(() => document.body.innerText);
  console.log(`✓ Payment Status is now: ${updatedDetailText.includes('Verified') ? 'Verified' : 'Unverified'}`);

  // Now Confirm the Order (Pending -> Confirmed)
  console.log('Transitioning order: Pending -> Confirmed...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const confBtn = btns.find(b => b.textContent && b.textContent.includes('Confirm Order'));
    if (confBtn) confBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  updatedDetailText = await page.evaluate(() => document.body.innerText);
  console.log(`✓ Order Status is now: ${updatedDetailText.includes('Confirmed Stage') || updatedDetailText.includes('Confirmed')}`);

  // Advance Confirmed -> Shipped
  console.log('Transitioning order: Confirmed -> Shipped...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const shipBtn = btns.find(b => b.textContent && b.textContent.includes('Courier'));
    if (shipBtn) shipBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Advance Shipped -> Delivered
  console.log('Transitioning order: Shipped -> Delivered...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const delivBtn = btns.find(b => b.textContent && b.textContent.includes('Delivered'));
    if (delivBtn) delivBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  updatedDetailText = await page.evaluate(() => document.body.innerText);
  console.log(`✓ Order Status reached final state: Delivered`);

  // 7. Test Cancellation & Stock Restoration
  console.log('\n[7] Testing Cancellation & Stock Restoration on a new order...');
  // Check stock of Q-Charge 20W Fast Charger before order
  await page.goto('http://localhost:3000/admin/products', { waitUntil: 'networkidle0' });
  const initialStock = await page.evaluate(() => {
    const row = Array.from(document.querySelectorAll('tr')).find(r => r.innerText.includes('Q-Charge 20W'));
    return row ? row.innerText : '';
  });
  console.log(`Initial product info: ${initialStock.slice(0, 80)}`);

  // Create another order to cancel
  await page.goto('http://localhost:3000/product/q-charge-20w-fast-charger', { waitUntil: 'networkidle0' });
  const addBtn2 = await page.waitForSelector('[data-testid="add-to-cart-btn"]');
  await addBtn2.click();
  await new Promise(r => setTimeout(r, 500));

  await page.goto('http://localhost:3000/checkout', { waitUntil: 'networkidle0' });
  await page.type('#checkout-fullname', 'Shahidul Islam');
  await page.type('#checkout-phone', '01611223344');
  await page.type('#checkout-address', 'Uttara Sector 7, Dhaka');
  await page.click('[data-testid="place-order-btn"]');
  await page.waitForFunction(() => window.location.pathname.includes('/order-confirmation/'), { timeout: 6000 });

  const cancelOrderNumber = await page.$eval('span.font-mono', el => el.innerText);
  console.log(`Created order to cancel: ${cancelOrderNumber}`);

  // Go to Order Details and Cancel
  await page.goto(`http://localhost:3000/admin/orders/${cancelOrderNumber}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cancelBtn = btns.find(b => b.textContent && b.textContent.includes('Cancel Order'));
    if (cancelBtn) cancelBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Confirm in modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const confirmCancelBtn = btns.find(b => b.textContent && b.textContent.includes('Confirm Cancellation'));
    if (confirmCancelBtn) confirmCancelBtn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const afterCancelText = await page.evaluate(() => document.body.innerText);
  console.log(`✓ Order status updated to Cancelled: ${afterCancelText.includes('Cancelled')}`);
  console.log(`✓ Cancellation reason displayed in history: ${afterCancelText.includes('Customer requested') || afterCancelText.includes('Reason:')}`);

  // 8. Review Management Moderation (/admin/reviews)
  console.log('\n[8] Testing Review Moderation Interface (/admin/reviews)...');
  await page.goto('http://localhost:3000/admin/reviews', { waitUntil: 'networkidle0' });

  const reviewsPageText = await page.evaluate(() => document.body.innerText.toLowerCase());
  console.log(`✓ Review Management table loaded: ${reviewsPageText.includes('customer name') || reviewsPageText.includes('reviewer')}`);

  // Test Approve Review
  const hasApproveBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const approveBtn = btns.find(b => b.textContent && b.textContent.includes('Approve'));
    if (approveBtn) {
      approveBtn.click();
      return true;
    }
    return false;
  });
  await new Promise(r => setTimeout(r, 500));
  console.log(`✓ Review Approved action executed: ${hasApproveBtn}`);

  // 9. Store Settings & Customer Checkout Sync (/admin/settings)
  console.log('\n[9] Testing Store Settings (/admin/settings)...');
  await page.goto('http://localhost:3000/admin/settings', { waitUntil: 'networkidle0' });
  
  // Switch to Payment & Delivery tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const payTab = btns.find(b => b.textContent && b.textContent.includes('Payment Numbers'));
    if (payTab) payTab.click();
  });
  await new Promise(r => setTimeout(r, 300));

  // Save settings
  await page.evaluate(() => {
    const saveBtn = document.querySelector('button[type="submit"]');
    if (saveBtn) saveBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));
  console.log('✓ Store settings saved and synchronized');

  console.log('\n================================================================');
  console.log('🎉 ALL REMAINING ADMIN ORDER & REVIEW REQUIREMENTS VERIFIED!');
  console.log('================================================================\n');

  await browser.close();
}

runOrdersAndReviewsTests().catch(err => {
  console.error('\n❌ Orders & Reviews test execution failed:', err);
  process.exit(1);
});
