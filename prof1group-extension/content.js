// PROF1Group Agent — Content Script
// Runs on prof1group.ua pages
// Handles: cart automation, product scanning, new arrivals detection

(function () {
  'use strict';

  // ─── State ─────────────────────────────────────────────────────────────────

  let cartQueue = [];
  let cartIndex = 0;
  let cartRunning = false;

  // ─── Init ──────────────────────────────────────────────────────────────────

  // Scan products when page loads and report to background
  window.addEventListener('load', () => {
    setTimeout(() => {
      const products = scanCurrentPage();
      if (products.length > 0) {
        chrome.runtime.sendMessage({ type: 'PRODUCTS_SCANNED', products });
      }
    }, 1500);
  });

  // ─── Message Handler ────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'START_CART') {
      startCartAutomation(msg.items);
      sendResponse({ ok: true });
    }

    if (msg.type === 'STOP_CART') {
      cartRunning = false;
      cartQueue = [];
      sendResponse({ ok: true });
    }

    if (msg.type === 'SCAN_PAGE') {
      const products = scanCurrentPage();
      sendResponse({ products });
    }

    if (msg.type === 'GET_PRODUCT_INFO') {
      const info = getProductPageInfo();
      sendResponse({ info });
    }
  });

  // ─── Product Scanner ────────────────────────────────────────────────────────

  function scanCurrentPage() {
    const products = [];
    const seen = new Set();

    // Try multiple selector strategies
    const strategies = [
      { container: '.catalog-grid .product', title: '.product__title, .title', price: '.price', link: 'a', badge: '.badge, .new-label, .label-new' },
      { container: '.items-list .item', title: '.item-title, h3', price: '.price', link: 'a', badge: '.new' },
      { container: '.catalog-section .card', title: '.card-title', price: '.card-price', link: 'a', badge: '.card-badge' },
      { container: 'article', title: 'h2, h3', price: '[class*="price"]', link: 'a', badge: '[class*="new"]' },
      { container: '[class*="product-card"]', title: '[class*="name"], [class*="title"]', price: '[class*="price"]', link: 'a', badge: '[class*="new"], [class*="label"]' }
    ];

    for (const s of strategies) {
      const containers = document.querySelectorAll(s.container);
      if (containers.length < 2) continue;

      containers.forEach(el => {
        const titleEl = el.querySelector(s.title);
        const priceEl = el.querySelector(s.price);
        const linkEl = el.querySelector(s.link);
        const badgeEl = el.querySelector(s.badge);
        const imgEl = el.querySelector('img');

        if (!titleEl) return;
        const title = titleEl.textContent.trim();
        if (!title || seen.has(title)) return;
        seen.add(title);

        const url = linkEl?.href || '';
        const isNew = badgeEl
          ? /нов|new/i.test(badgeEl.textContent)
          : false;

        const availabilityEl = el.querySelector('[class*="avail"], [class*="stock"], [class*="наявн"]');
        const inStock = availabilityEl
          ? !/немає|out/i.test(availabilityEl.textContent)
          : true;

        products.push({
          title,
          price: priceEl ? priceEl.textContent.replace(/\s+/g, ' ').trim() : '',
          url,
          image: imgEl?.src || '',
          isNew,
          inStock,
          id: url || title,
          scannedAt: Date.now()
        });
      });

      if (products.length > 0) break;
    }

    return products;
  }

  // ─── Product Page Info ──────────────────────────────────────────────────────

  function getProductPageInfo() {
    const titleEl = document.querySelector('h1, .product-title, .item-title, [class*="product-name"]');
    const priceEl = document.querySelector('[class*="price"], .price');
    const sizeEls = document.querySelectorAll(
      'select[class*="size"] option, [class*="size-selector"] [class*="option"], ' +
      '.size-select option, [data-size], [class*="attr"] [class*="val"]'
    );

    const sizes = [];
    sizeEls.forEach(el => {
      const text = el.textContent.trim();
      if (text && text.length < 20 && !/вибер|select|розмір/i.test(text)) {
        sizes.push(text);
      }
    });

    const inStock = !document.querySelector('[class*="out-of-stock"], [class*="sold-out"]');

    return {
      title: titleEl?.textContent.trim() || document.title,
      price: priceEl?.textContent.replace(/\s+/g, ' ').trim() || '',
      sizes,
      inStock,
      url: location.href
    };
  }

  // ─── Cart Automation ────────────────────────────────────────────────────────

  function startCartAutomation(items) {
    cartQueue = [...items];
    cartIndex = 0;
    cartRunning = true;
    processNextCartItem();
  }

  function reportProgress(status, item, error = null) {
    chrome.runtime.sendMessage({
      type: 'CART_STATUS',
      data: { status, item, error, index: cartIndex, total: cartQueue.length }
    });
  }

  async function processNextCartItem() {
    if (!cartRunning || cartIndex >= cartQueue.length) {
      if (cartIndex >= cartQueue.length) {
        reportProgress('done', null);
      }
      return;
    }

    const item = cartQueue[cartIndex];
    reportProgress('processing', item);

    try {
      // If we're on a product page that matches, process it directly
      const currentTitle = document.querySelector('h1')?.textContent.trim().toLowerCase() || '';
      const itemName = item.name.toLowerCase();

      if (item.url && location.href.includes(item.url)) {
        await addCurrentProductToCart(item);
      } else if (item.url) {
        // Navigate to product URL
        reportProgress('navigating', item);
        window.location.href = item.url;
        // After navigation, content script re-runs and processes the item
        sessionStorage.setItem('prof1agent_cart_item', JSON.stringify(item));
        sessionStorage.setItem('prof1agent_cart_queue', JSON.stringify(cartQueue));
        sessionStorage.setItem('prof1agent_cart_index', String(cartIndex));
        return;
      } else {
        // Try to find product via search
        await searchAndAddProduct(item);
      }
    } catch (err) {
      reportProgress('error', item, err.message);
    }

    cartIndex++;
    setTimeout(() => processNextCartItem(), 1500);
  }

  // Resume cart after page navigation
  window.addEventListener('load', () => {
    const savedItem = sessionStorage.getItem('prof1agent_cart_item');
    if (!savedItem) return;

    try {
      const item = JSON.parse(savedItem);
      const queue = JSON.parse(sessionStorage.getItem('prof1agent_cart_queue') || '[]');
      const idx = parseInt(sessionStorage.getItem('prof1agent_cart_index') || '0', 10);

      sessionStorage.removeItem('prof1agent_cart_item');
      sessionStorage.removeItem('prof1agent_cart_queue');
      sessionStorage.removeItem('prof1agent_cart_index');

      cartQueue = queue;
      cartIndex = idx;
      cartRunning = true;

      setTimeout(async () => {
        await addCurrentProductToCart(item);
        cartIndex++;
        setTimeout(() => processNextCartItem(), 1500);
      }, 2000);
    } catch (e) {
      console.error('[PROF1Agent] Cart resume error:', e);
    }
  });

  async function addCurrentProductToCart(item) {
    // Step 1: Select size if required
    if (item.size) {
      const selected = await selectSize(item.size);
      if (!selected) {
        reportProgress('size_not_found', item, `Розмір "${item.size}" не знайдено`);
      }
    }

    await sleep(500);

    // Step 2: Find and click "Add to cart" button
    const cartBtn = findAddToCartButton();
    if (!cartBtn) {
      throw new Error('Кнопка "Додати в кошик" не знайдена');
    }

    if (cartBtn.disabled || cartBtn.classList.contains('disabled')) {
      throw new Error('Товар недоступний (кнопка вимкнена)');
    }

    cartBtn.click();
    reportProgress('added', item);

    await sleep(1000);

    // Close any modal that might have appeared
    closeModal();
  }

  async function selectSize(targetSize) {
    const normalized = targetSize.toString().trim().toUpperCase();

    // Strategy 1: <select> dropdown
    const selects = document.querySelectorAll('select');
    for (const sel of selects) {
      const options = [...sel.options];
      const match = options.find(opt =>
        opt.text.trim().toUpperCase() === normalized ||
        opt.value.trim().toUpperCase() === normalized
      );
      if (match) {
        sel.value = match.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }

    // Strategy 2: Clickable size buttons/spans
    const sizeSelectors = [
      '[class*="size"] [class*="item"]',
      '[class*="size"] button',
      '[class*="size"] span',
      '[class*="attr"] [class*="value"]',
      '[data-size]',
      '.sizes .size',
      '.size-block .value'
    ];

    for (const sel of sizeSelectors) {
      const btns = document.querySelectorAll(sel);
      for (const btn of btns) {
        if (btn.textContent.trim().toUpperCase() === normalized) {
          btn.click();
          await sleep(300);
          return true;
        }
      }
    }

    return false;
  }

  function findAddToCartButton() {
    const selectors = [
      'button[class*="cart"]:not([disabled])',
      'button[class*="buy"]:not([disabled])',
      '[class*="add-to-cart"]:not([disabled])',
      '[class*="buy-btn"]:not([disabled])',
      'button[id*="cart"]',
      'form[class*="cart"] button[type="submit"]',
      'form[class*="buy"] button[type="submit"]',
      '.btn-cart',
      '.buy-button',
      'button.primary:not([disabled])'
    ];

    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn) return btn;
    }

    // Fallback: text-based search
    const allButtons = document.querySelectorAll('button, [role="button"], .btn');
    for (const btn of allButtons) {
      const text = btn.textContent.trim().toLowerCase();
      if (/додати|купити|в кошик|buy|cart/i.test(text)) {
        return btn;
      }
    }

    return null;
  }

  async function searchAndAddProduct(item) {
    // Navigate to search
    const searchUrl = `https://prof1group.ua/search/?q=${encodeURIComponent(item.name)}`;
    window.location.href = searchUrl;
    sessionStorage.setItem('prof1agent_cart_item', JSON.stringify(item));
    sessionStorage.setItem('prof1agent_cart_queue', JSON.stringify(cartQueue));
    sessionStorage.setItem('prof1agent_cart_index', String(cartIndex));
  }

  function closeModal() {
    const modalClose = document.querySelector(
      '.modal .close, [class*="modal"] button[class*="close"], ' +
      '[aria-label="Close"], [aria-label="Закрити"], .fancybox-close-small'
    );
    if (modalClose) modalClose.click();
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

})();
