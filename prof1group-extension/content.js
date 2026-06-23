// PROF1Group Agent — Content Script
// Runs on prof1group.ua pages

(function () {
  'use strict';

  let cartQueue = [];
  let cartIndex = 0;
  let cartRunning = false;

  // ─── Init: report products on page load ──────────────────────────────────

  window.addEventListener('load', () => {
    setTimeout(() => {
      const products = scanCurrentPage();
      if (products.length > 0) {
        chrome.runtime.sendMessage({ type: 'PRODUCTS_SCANNED', products });
      }
    }, 1500);

    // Resume cart automation if navigated mid-run
    resumeCartIfNeeded();
  });

  // ─── Message Handler ──────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    if (msg.type === 'SCAN_SEARCH_RESULTS') {
      const products = scanSearchResults();
      sendResponse({ products });
    }

    if (msg.type === 'GET_PRODUCT_OPTIONS') {
      const options = extractProductOptions();
      sendResponse({ options });
    }

    if (msg.type === 'RUN_CART') {
      cartQueue = msg.items;
      cartIndex = 0;
      cartRunning = true;
      processNextCartItem();
      sendResponse({ ok: true });
    }

    if (msg.type === 'STOP_CART') {
      cartRunning = false;
      cartQueue = [];
      sendResponse({ ok: true });
    }

    // Legacy: keep old SCAN_PAGE working
    if (msg.type === 'SCAN_PAGE') {
      sendResponse({ products: scanCurrentPage() });
    }

    return true; // async
  });

  // ─── Search Results Scanner ───────────────────────────────────────────────

  function scanSearchResults() {
    const results = [];
    const seen = new Set();

    // Wide net of selectors for any product listing on prof1group.ua
    const containerSelectors = [
      '.catalog-item', '.product-item', '.catalog__item',
      '.product-card', '.item-card', '[class*="product-card"]',
      '[class*="catalog-item"]', '[class*="item--product"]',
      'li[class*="item"]', '.grid__item', '.products-grid .item',
      'article[class*="product"]', '.search-result', '.search__item',
      '.goods-item', '[class*="goods-item"]'
    ];

    let containers = [];
    for (const sel of containerSelectors) {
      const els = [...document.querySelectorAll(sel)];
      if (els.length >= 1) {
        containers = els;
        break;
      }
    }

    // Fallback: find any repeating structure near product images
    if (containers.length === 0) {
      const imgs = [...document.querySelectorAll('img[src*="upload"], img[src*="product"], img[src*="catalog"]')];
      imgs.forEach(img => {
        const card = img.closest('li, article, div[class]');
        if (card && !seen.has(card)) {
          seen.add(card);
          containers.push(card);
        }
      });
    }

    containers.forEach(el => {
      const titleEl = findWithin(el, [
        'h2', 'h3', 'h4', '.product__name', '.product-name',
        '.item__name', '.item-name', '.title', '[class*="name"]',
        '[class*="title"]', 'a[href*="catalog"]'
      ]);
      const priceEl = findWithin(el, [
        '.price', '[class*="price"]', '.cost', '[class*="cost"]'
      ]);
      const linkEl = el.querySelector('a[href*="/catalog/"], a[href*="/product"]') || el.querySelector('a');
      const imgEl  = el.querySelector('img');
      const badgeEl = findWithin(el, [
        '.badge', '.new', '.label', '[class*="badge"]',
        '[class*="new"]', '[class*="label"]', '[class*="sticker"]'
      ]);

      if (!titleEl) return;
      const title = titleEl.textContent.trim();
      if (!title || title.length < 3) return;

      const url = linkEl?.href || '';
      if (seen.has(url || title)) return;
      seen.add(url || title);

      const priceText = priceEl ? priceEl.textContent.replace(/\s+/g, ' ').trim() : '';
      const isNew = badgeEl ? /нов|new/i.test(badgeEl.textContent) : false;

      const stockEl = findWithin(el, [
        '[class*="avail"]', '[class*="stock"]', '[class*="наявн"]',
        '[class*="instock"]', '[class*="quantity"]'
      ]);
      const inStock = stockEl ? !/немає|нет|out.of.stock/i.test(stockEl.textContent) : true;

      results.push({
        title,
        price: priceText,
        url,
        image: imgEl?.src || imgEl?.dataset?.src || '',
        isNew,
        inStock,
        id: url || title
      });
    });

    return results;
  }

  // ─── Product Options Extractor (runs on a product page) ──────────────────

  function extractProductOptions() {
    const sizes  = [];
    const colors = [];
    const seen = { s: new Set(), c: new Set() };

    // ── Sizes ──────────────────────────────────────────────────────────────

    // Strategy 1: <select> with size options
    document.querySelectorAll('select').forEach(sel => {
      const label = (sel.name + sel.id + sel.className + getLabel(sel)).toLowerCase();
      if (!/size|розмір|розм|размер|маркировк|rozm/i.test(label)) return;
      [...sel.options].forEach(opt => {
        const v = opt.textContent.trim();
        if (v && v.length < 25 && !/вибер|select|please|обрати|розмір/i.test(v) && !seen.s.has(v)) {
          sizes.push({ value: v, label: v, disabled: opt.disabled });
          seen.s.add(v);
        }
      });
    });

    // Strategy 2: Clickable size buttons
    if (sizes.length === 0) {
      const sizeContainerSelectors = [
        '[class*="size"]', '[class*="SIZE"]',
        '[class*="rozm"]', '[class*="variation"]',
        '[class*="attr"]', '[class*="params"]',
        '[data-type="size"]'
      ];
      for (const sel of sizeContainerSelectors) {
        document.querySelectorAll(sel).forEach(container => {
          const btns = container.querySelectorAll(
            'button, span[class*="val"], li, [class*="item"], [class*="btn"], label'
          );
          btns.forEach(btn => {
            const v = btn.textContent.trim();
            if (v && v.length < 20 && /^\d|^(XS|S|M|L|XL|XXL|XXXL|one)/i.test(v) && !seen.s.has(v)) {
              sizes.push({ value: v, label: v, disabled: btn.classList.contains('disabled') || btn.disabled });
              seen.s.add(v);
            }
          });
        });
        if (sizes.length > 0) break;
      }
    }

    // Strategy 3: radio buttons or labeled inputs for size
    if (sizes.length === 0) {
      document.querySelectorAll('input[type="radio"]').forEach(inp => {
        const lbl = inp.closest('label') || document.querySelector(`label[for="${inp.id}"]`);
        const v = (lbl?.textContent || inp.value || '').trim();
        if (v && v.length < 20 && !seen.s.has(v)) {
          sizes.push({ value: inp.value || v, label: v, disabled: inp.disabled });
          seen.s.add(v);
        }
      });
    }

    // ── Colors ─────────────────────────────────────────────────────────────

    // Strategy 1: color <select>
    document.querySelectorAll('select').forEach(sel => {
      const label = (sel.name + sel.id + sel.className + getLabel(sel)).toLowerCase();
      if (!/color|colour|колір|цвет|kolir/i.test(label)) return;
      [...sel.options].forEach(opt => {
        const v = opt.textContent.trim();
        if (v && v.length < 40 && !/вибер|select|обрати|колір/i.test(v) && !seen.c.has(v)) {
          colors.push({ value: v, label: v, swatch: '' });
          seen.c.add(v);
        }
      });
    });

    // Strategy 2: color swatches (spans/divs with background-color inline or data attributes)
    if (colors.length === 0) {
      const colorContainerSelectors = [
        '[class*="color"]', '[class*="colour"]',
        '[class*="kolir"]', '[class*="kolour"]',
        '[class*="swatch"]', '[data-type="color"]'
      ];
      for (const sel of colorContainerSelectors) {
        document.querySelectorAll(sel).forEach(container => {
          const items = container.querySelectorAll(
            'span, li, button, label, [class*="item"], [class*="swatch"]'
          );
          items.forEach(item => {
            const title = item.title || item.getAttribute('data-name') || item.getAttribute('data-value') || '';
            const text = (title || item.textContent).trim();
            const style = item.style?.backgroundColor || '';
            if (text && text.length < 50 && !seen.c.has(text)) {
              colors.push({ value: text, label: text, swatch: style });
              seen.c.add(text);
            }
          });
        });
        if (colors.length > 0) break;
      }
    }

    // Product title and price while we're here
    const titleEl = document.querySelector('h1, .product-title, [class*="product-name"], [class*="item-title"]');
    const priceEl = document.querySelector('[class*="price"], .price__current, .current-price');

    return {
      title: titleEl?.textContent.trim() || document.title,
      price: priceEl?.textContent.replace(/\s+/g, ' ').trim() || '',
      sizes,
      colors,
      url: location.href
    };
  }

  function getLabel(inputEl) {
    const id = inputEl.id;
    if (!id) return '';
    return document.querySelector(`label[for="${id}"]`)?.textContent || '';
  }

  // ─── Cart Automation ──────────────────────────────────────────────────────

  function reportProgress(status, item, error = null) {
    try {
      chrome.runtime.sendMessage({
        type: 'CART_STATUS',
        data: { status, item, error, index: cartIndex, total: cartQueue.length }
      });
    } catch (_) {}
  }

  async function processNextCartItem() {
    if (!cartRunning || cartIndex >= cartQueue.length) {
      if (cartRunning && cartIndex >= cartQueue.length) {
        reportProgress('done', null);
      }
      return;
    }

    const item = cartQueue[cartIndex];
    reportProgress('processing', item);

    try {
      if (item.url && location.href.replace(/\?.*/, '') === item.url.replace(/\?.*/, '')) {
        // Already on the right page
        await addToCartWithOptions(item);
      } else if (item.url) {
        // Navigate to product page
        reportProgress('navigating', item);
        sessionStorage.setItem('prof1agent_item', JSON.stringify(item));
        sessionStorage.setItem('prof1agent_queue', JSON.stringify(cartQueue));
        sessionStorage.setItem('prof1agent_index', String(cartIndex));
        window.location.href = item.url;
        return; // script will resume on next load
      }
    } catch (err) {
      reportProgress('error', item, err.message);
    }

    cartIndex++;
    await sleep(1200);
    processNextCartItem();
  }

  function resumeCartIfNeeded() {
    const savedItem = sessionStorage.getItem('prof1agent_item');
    if (!savedItem) return;

    try {
      const item  = JSON.parse(savedItem);
      const queue = JSON.parse(sessionStorage.getItem('prof1agent_queue') || '[]');
      const idx   = parseInt(sessionStorage.getItem('prof1agent_index') || '0', 10);

      sessionStorage.removeItem('prof1agent_item');
      sessionStorage.removeItem('prof1agent_queue');
      sessionStorage.removeItem('prof1agent_index');

      cartQueue   = queue;
      cartIndex   = idx;
      cartRunning = true;

      setTimeout(async () => {
        try {
          await addToCartWithOptions(item);
          reportProgress('added', item);
        } catch (e) {
          reportProgress('error', item, e.message);
        }
        cartIndex++;
        await sleep(1200);
        processNextCartItem();
      }, 2500);
    } catch (e) {
      console.error('[PROF1Agent] Resume error:', e);
    }
  }

  async function addToCartWithOptions(item) {
    // 1. Select color first (usually needs to be picked before size)
    if (item.color) {
      await selectOption(item.color, 'color');
      await sleep(400);
    }

    // 2. Select size
    if (item.size) {
      const ok = await selectOption(item.size, 'size');
      if (!ok) reportProgress('size_not_found', item, `Розмір "${item.size}" не знайдено`);
      await sleep(400);
    }

    // 3. Click "Add to cart"
    const btn = findAddToCartButton();
    if (!btn) throw new Error('Кнопку "Додати в кошик" не знайдено');
    if (btn.disabled) throw new Error('Кнопка вимкнена — можливо немає в наявності');

    btn.click();
    await sleep(1000);
    closeModal();
  }

  async function selectOption(value, type) {
    const normalized = value.trim().toUpperCase();

    // Try <select> elements
    const selects = document.querySelectorAll('select');
    for (const sel of selects) {
      const labelText = (sel.name + sel.id + sel.className + getLabel(sel)).toLowerCase();
      const isRight = type === 'size'
        ? /size|розмір|розм|розм/i.test(labelText) || !labelText
        : /color|colour|колір|цвет/i.test(labelText);

      if (!isRight && selects.length > 1) continue;

      const opts = [...sel.options];
      const match = opts.find(o =>
        o.text.trim().toUpperCase() === normalized ||
        o.value.trim().toUpperCase() === normalized ||
        o.text.trim().toUpperCase().includes(normalized)
      );
      if (match) {
        sel.value = match.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }

    // Try clickable buttons/spans
    const allClickable = document.querySelectorAll(
      '[class*="size"] button, [class*="size"] li, [class*="size"] span,' +
      '[class*="attr"] span, [class*="attr"] button,' +
      '[class*="color"] span, [class*="swatch"] span,' +
      '[data-size], [data-color], label[for]'
    );
    for (const el of allClickable) {
      const text = (el.title || el.textContent || el.getAttribute('data-name') || '').trim().toUpperCase();
      if (text === normalized || text.includes(normalized)) {
        el.click();
        await sleep(300);
        return true;
      }
    }

    return false;
  }

  function findAddToCartButton() {
    const selectors = [
      'button[class*="cart"]:not([disabled])',
      'button[class*="buy"]:not([disabled])',
      '[class*="add-to-cart"]:not([disabled])',
      '[class*="addtocart"]:not([disabled])',
      '[class*="buy-btn"]:not([disabled])',
      'form[action*="cart"] button[type="submit"]',
      'button[type="submit"][class*="primary"]'
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    for (const btn of document.querySelectorAll('button, [role="button"]')) {
      if (/додати|купити|в кошик|buy|add.to.cart/i.test(btn.textContent)) return btn;
    }
    return null;
  }

  function closeModal() {
    const close = document.querySelector(
      '[class*="modal"] [class*="close"], .fancybox-close-small, ' +
      '[aria-label="Close"], [aria-label="Закрити"], .modal__close'
    );
    if (close) close.click();
  }

  // ─── Generic page scanner (for "Новинки" tab) ─────────────────────────────

  function scanCurrentPage() {
    const results = [];
    const seen = new Set();

    const selectors = [
      '.catalog-item', '.product-item', '[class*="product-card"]',
      '[class*="catalog-item"]', 'article', '[class*="goods-item"]'
    ];
    for (const sel of selectors) {
      const items = document.querySelectorAll(sel);
      if (items.length < 2) continue;
      items.forEach(el => {
        const titleEl = findWithin(el, ['h2','h3','h4','[class*="name"]','[class*="title"]']);
        const priceEl = findWithin(el, ['[class*="price"]','.price']);
        const linkEl  = el.querySelector('a[href*="/catalog/"]') || el.querySelector('a');
        const imgEl   = el.querySelector('img');
        const badgeEl = findWithin(el, ['[class*="new"]','[class*="badge"]','[class*="sticker"]']);
        if (!titleEl) return;
        const title = titleEl.textContent.trim();
        if (!title || seen.has(title)) return;
        seen.add(title);
        const url = linkEl?.href || '';
        results.push({
          title, price: priceEl?.textContent.replace(/\s+/g, ' ').trim() || '',
          url, image: imgEl?.src || '',
          isNew: badgeEl ? /нов|new/i.test(badgeEl.textContent) : false,
          inStock: true, id: url || title, scannedAt: Date.now()
        });
      });
      if (results.length > 0) break;
    }
    return results;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function findWithin(el, selectors) {
    for (const s of selectors) {
      const found = el.querySelector(s);
      if (found) return found;
    }
    return null;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

})();
