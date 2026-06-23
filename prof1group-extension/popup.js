// PROF1Group Agent — Popup Logic

(function () {
  'use strict';

  // ─── Init ──────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async () => {
    setupTabs();
    setupCartTab();
    setupContentTab();
    await loadLastCheckTime();
    await loadNewProducts();
    listenForMessages();
  });

  // ─── Tabs ──────────────────────────────────────────────────────────────────

  function setupTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });

    document.getElementById('btn-refresh').addEventListener('click', async () => {
      const btn = document.getElementById('btn-refresh');
      btn.textContent = '⟳';
      btn.disabled = true;
      try {
        await chrome.runtime.sendMessage({ type: 'MANUAL_CHECK' });
        await loadNewProducts();
        await loadLastCheckTime();
      } finally {
        btn.textContent = '↺';
        btn.disabled = false;
      }
    });

    document.getElementById('btn-options').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // ─── Last Check Time ───────────────────────────────────────────────────────

  async function loadLastCheckTime() {
    const { lastCheckTime } = await chrome.storage.local.get('lastCheckTime');
    const el = document.getElementById('last-check');
    if (lastCheckTime) {
      const diff = Date.now() - lastCheckTime;
      el.textContent = `Остання перевірка: ${formatTimeDiff(diff)}`;
    } else {
      el.textContent = 'Перевірка не виконувалась';
    }
  }

  function formatTimeDiff(ms) {
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'тільки що';
    if (mins < 60) return `${mins} хв тому`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} год тому`;
    return `${Math.floor(hours / 24)} дн тому`;
  }

  // ─── New Products Tab ──────────────────────────────────────────────────────

  async function loadNewProducts() {
    const { latestScan = [], newItems = [] } = await chrome.storage.local.get(['latestScan', 'newItems']);
    renderProductList(latestScan, newItems);
  }

  function renderProductList(products, newItems) {
    const list = document.getElementById('new-products-list');
    const newIds = new Set((newItems || []).map(p => p.id));

    if (!products || products.length === 0) {
      list.innerHTML = '<div class="empty-state">Натисніть ↺ щоб перевірити новинки</div>';
      return;
    }

    // Show new items first, then rest
    const sorted = [...products].sort((a, b) => {
      const aNew = newIds.has(a.id) || a.isNew;
      const bNew = newIds.has(b.id) || b.isNew;
      return bNew - aNew;
    });

    list.innerHTML = sorted.slice(0, 50).map(p => {
      const isNew = newIds.has(p.id) || p.isNew;
      const inStock = p.inStock !== false;
      return `
        <div class="product-card" onclick="chrome.tabs.create({url:'${escapeAttr(p.url || 'https://prof1group.ua/catalog/')}'})" title="${escapeAttr(p.title)}">
          ${p.image
            ? `<img src="${escapeAttr(p.image)}" alt="" onerror="this.style.display='none'">`
            : `<div style="width:48px;height:48px;background:#f3f4f6;border-radius:4px;flex-shrink:0"></div>`
          }
          <div class="product-info">
            <div class="product-title">${escapeHtml(p.title)}</div>
            ${p.price ? `<div class="product-price">${escapeHtml(p.price)}</div>` : ''}
            <div class="product-badges">
              ${isNew ? '<span class="badge badge-new">НОВИНКА</span>' : ''}
              ${inStock
                ? '<span class="badge badge-instock">В наявності</span>'
                : '<span class="badge badge-nostock">Немає</span>'
              }
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ─── Cart Tab ──────────────────────────────────────────────────────────────

  // ─── Cart Tab (new: search → results with dropdowns → queue → run) ────────

  let cartQueue = [];         // [ { title, url, size, color, image, price } ]
  let profTab   = null;       // reused background tab

  function setupCartTab() {
    const input   = document.getElementById('cart-search-input');
    const btnSearch = document.getElementById('btn-cart-search');
    const btnRun  = document.getElementById('btn-run-cart');
    const btnStop = document.getElementById('btn-cart-stop');
    const btnClear = document.getElementById('btn-queue-clear');

    btnSearch.addEventListener('click', doSearch);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    btnRun.addEventListener('click', runCart);
    btnStop.addEventListener('click', stopCart);
    btnClear.addEventListener('click', clearQueue);
  }

  // ── Search ────────────────────────────────────────────────────────────────

  async function doSearch() {
    const query = document.getElementById('cart-search-input').value.trim();
    if (!query) return;

    setSearchState(`🔍 Шукаю «${query}»<span class="dots"></span>`);
    showSection('cart-search-results', false);

    const searchUrl = `https://prof1group.ua/search/?q=${encodeURIComponent(query)}`;

    try {
      const tab = await getOrCreateProfTab(searchUrl);
      await waitForTab(tab.id, 4000);
      await sleep(2000);

      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Inline search scan (must be self-contained)
          const results = [];
          const seen = new Set();
          const containerSelectors = [
            '.catalog-item','.product-item','[class*="product-card"]',
            '[class*="catalog-item"]','article','[class*="goods-item"]',
            '.search__item','.search-result','.item'
          ];
          let containers = [];
          for (const sel of containerSelectors) {
            const els = [...document.querySelectorAll(sel)];
            if (els.length >= 1) { containers = els; break; }
          }
          // Fallback: find cards near product images
          if (containers.length === 0) {
            document.querySelectorAll('img').forEach(img => {
              const card = img.closest('li, article, div[class*="item"], div[class*="product"]');
              if (card && !seen.has(card)) { seen.add(card); containers.push(card); }
            });
          }
          function findIn(el, sels) {
            for (const s of sels) { const f = el.querySelector(s); if (f) return f; }
            return null;
          }
          containers.slice(0, 15).forEach(el => {
            const titleEl = findIn(el, ['h2','h3','h4','[class*="name"]','[class*="title"]','a']);
            const priceEl = findIn(el, ['[class*="price"]','.price']);
            const linkEl  = el.querySelector('a[href*="/catalog/"]') || el.querySelector('a');
            const imgEl   = el.querySelector('img');
            if (!titleEl) return;
            const title = titleEl.textContent.trim();
            if (!title || title.length < 3 || seen.has(title)) return;
            seen.add(title);
            results.push({
              title,
              price: priceEl ? priceEl.textContent.replace(/\s+/g,' ').trim() : '',
              url: linkEl?.href || '',
              image: imgEl?.src || imgEl?.dataset?.src || ''
            });
          });
          return results;
        }
      });

      const products = res?.result || [];

      if (products.length === 0) {
        setSearchState('😕 Нічого не знайдено. Спробуй іншу назву.');
      } else {
        setSearchState('');
        renderSearchResults(products, tab.id);
      }
    } catch (err) {
      setSearchState(`❌ Помилка: ${err.message}`);
    }
  }

  function renderSearchResults(products, tabId) {
    const container = document.getElementById('cart-search-results');
    container.innerHTML = '';
    container.classList.remove('hidden');

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'result-card';

      const imgHtml = p.image
        ? `<img class="result-img" src="${escapeAttr(p.image)}" alt="" onerror="this.style.display='none'">`
        : `<div class="result-img-placeholder">🎽</div>`;

      card.innerHTML = `
        ${imgHtml}
        <div class="result-body">
          <div class="result-title" title="${escapeAttr(p.title)}">${escapeHtml(p.title)}</div>
          ${p.price ? `<div class="result-price">${escapeHtml(p.price)}</div>` : ''}
          <div class="result-selectors">
            <select class="select-size loading" data-url="${escapeAttr(p.url)}">
              <option value="">⏳ Розміри…</option>
            </select>
            <select class="select-color loading" data-url="${escapeAttr(p.url)}">
              <option value="">⏳ Кольори…</option>
            </select>
            <button class="btn-add-queue" disabled>+ В список</button>
          </div>
        </div>
      `;

      container.appendChild(card);

      // Load sizes/colors lazily
      loadProductOptions(card, p, tabId);
    });
  }

  async function loadProductOptions(card, product, tabId) {
    if (!product.url) {
      fillSelectFallback(card);
      return;
    }

    try {
      await navigateTab(tabId, product.url);
      await waitForTab(tabId, 5000);
      await sleep(1800);

      const [res] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          function getLabel(el) {
            return el.id ? (document.querySelector(`label[for="${el.id}"]`)?.textContent || '') : '';
          }
          const sizes = []; const colors = []; const seenS = new Set(); const seenC = new Set();

          // Sizes from <select>
          document.querySelectorAll('select').forEach(sel => {
            if (!/size|розмір|розм|размер/i.test(sel.name + sel.id + sel.className + getLabel(sel))) return;
            [...sel.options].forEach(opt => {
              const v = opt.textContent.trim();
              if (v && v.length < 25 && !/вибер|select|обрати/i.test(v) && !seenS.has(v)) {
                sizes.push(v); seenS.add(v);
              }
            });
          });

          // Sizes from buttons
          if (!sizes.length) {
            for (const sel of ['[class*="size"]','[class*="rozm"]','[class*="attr"]']) {
              document.querySelectorAll(sel).forEach(cont => {
                cont.querySelectorAll('button,span,li,label').forEach(btn => {
                  const v = btn.textContent.trim();
                  if (v && v.length < 15 && /^\d|^(XS|S|M|L|XL|XXL|XXXL|one)/i.test(v) && !seenS.has(v)) {
                    sizes.push(v); seenS.add(v);
                  }
                });
              });
              if (sizes.length) break;
            }
          }

          // Colors from <select>
          document.querySelectorAll('select').forEach(sel => {
            if (!/color|colour|колір|цвет/i.test(sel.name + sel.id + sel.className + getLabel(sel))) return;
            [...sel.options].forEach(opt => {
              const v = opt.textContent.trim();
              if (v && v.length < 40 && !/вибер|select|обрати/i.test(v) && !seenC.has(v)) {
                colors.push(v); seenC.add(v);
              }
            });
          });

          // Colors from swatches
          if (!colors.length) {
            for (const sel of ['[class*="color"]','[class*="colour"]','[class*="swatch"]']) {
              document.querySelectorAll(sel).forEach(cont => {
                cont.querySelectorAll('span,li,button,label').forEach(item => {
                  const v = (item.title || item.getAttribute('data-name') || item.textContent).trim();
                  if (v && v.length < 50 && !seenC.has(v)) { colors.push(v); seenC.add(v); }
                });
              });
              if (colors.length) break;
            }
          }

          const priceEl = document.querySelector('[class*="price__current"],[class*="current-price"],[class*="price"]');
          return { sizes, colors, price: priceEl?.textContent.replace(/\s+/g,' ').trim() || '' };
        }
      });

      const opts = res?.result || { sizes: [], colors: [] };
      fillSelects(card, product, opts);
    } catch (err) {
      fillSelectFallback(card);
    }
  }

  function fillSelects(card, product, opts) {
    const sizeEl  = card.querySelector('.select-size');
    const colorEl = card.querySelector('.select-color');
    const addBtn  = card.querySelector('.btn-add-queue');

    sizeEl.classList.remove('loading');
    colorEl.classList.remove('loading');

    if (opts.sizes.length > 0) {
      sizeEl.innerHTML = `<option value="">— Розмір —</option>` +
        opts.sizes.map(s => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join('');
    } else {
      sizeEl.innerHTML = '<option value="">Без розміру</option>';
    }

    if (opts.colors.length > 0) {
      colorEl.innerHTML = `<option value="">— Колір —</option>` +
        opts.colors.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('');
    } else {
      colorEl.innerHTML = '<option value="">Без кольору</option>';
    }

    if (opts.price) {
      const priceEl = card.querySelector('.result-price');
      if (priceEl) priceEl.textContent = opts.price;
    }

    addBtn.disabled = false;
    addBtn.addEventListener('click', () => {
      const size  = sizeEl.value;
      const color = colorEl.value;
      addToQueue({ title: product.title, url: product.url, image: product.image, price: opts.price || product.price, size, color });
      addBtn.textContent = '✅';
      addBtn.disabled = true;
      setTimeout(() => { addBtn.textContent = '+ В список'; addBtn.disabled = false; }, 2000);
    });
  }

  function fillSelectFallback(card) {
    const sizeEl  = card.querySelector('.select-size');
    const colorEl = card.querySelector('.select-color');
    const addBtn  = card.querySelector('.btn-add-queue');
    sizeEl.innerHTML  = '<option value="">Введи вручну</option>';
    colorEl.innerHTML = '<option value="">Введи вручну</option>';
    sizeEl.classList.remove('loading');
    colorEl.classList.remove('loading');
    addBtn.disabled = false;
    addBtn.addEventListener('click', () => {
      const product = { title: sizeEl.dataset.url || 'Товар', url: sizeEl.dataset.url || '', image: '', price: '' };
      addToQueue({ ...product, size: sizeEl.value, color: colorEl.value });
    });
  }

  // ── Cart Queue ────────────────────────────────────────────────────────────

  function addToQueue(item) {
    cartQueue.push(item);
    renderQueue();
  }

  function clearQueue() {
    cartQueue = [];
    renderQueue();
  }

  function renderQueue() {
    const section = document.getElementById('cart-queue-section');
    const list    = document.getElementById('cart-queue-list');
    const count   = document.getElementById('queue-count');

    count.textContent = cartQueue.length;

    if (cartQueue.length === 0) {
      section.classList.add('hidden');
      list.innerHTML = '';
      return;
    }

    section.classList.remove('hidden');

    list.innerHTML = cartQueue.map((item, idx) => `
      <div class="queue-item">
        <span class="queue-item-name" title="${escapeAttr(item.title)}">${escapeHtml(item.title)}</span>
        <div class="queue-item-tags">
          ${item.size  ? `<span class="queue-tag">📐 ${escapeHtml(item.size)}</span>` : ''}
          ${item.color ? `<span class="queue-tag">🎨 ${escapeHtml(item.color)}</span>` : ''}
        </div>
        <button class="queue-item-del" data-idx="${idx}" title="Видалити">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.queue-item-del').forEach(btn => {
      btn.addEventListener('click', () => {
        cartQueue.splice(parseInt(btn.dataset.idx), 1);
        renderQueue();
      });
    });
  }

  // ── Run Cart ──────────────────────────────────────────────────────────────

  async function runCart() {
    if (cartQueue.length === 0) return;

    const btnRun  = document.getElementById('btn-run-cart');
    const btnStop = document.getElementById('btn-cart-stop');
    btnRun.classList.add('hidden');
    btnStop.classList.remove('hidden');

    clearLog();
    addLog(`▶ Починаю: ${cartQueue.length} товарів`, 'info');
    showCartStatus(`Запущено 0 / ${cartQueue.length}`, 'running');

    const tab = await getOrCreateProfTab('https://prof1group.ua/catalog/');

    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => !!window.prof1AgentReady
      });
      // If content script not ready (just opened), wait
      if (!res?.result) await waitForTab(tab.id, 3000);
    } catch (_) {}

    chrome.tabs.sendMessage(tab.id, { type: 'RUN_CART', items: cartQueue });
  }

  async function stopCart() {
    const tabs = await chrome.tabs.query({ url: 'https://prof1group.ua/*' });
    tabs.forEach(t => chrome.tabs.sendMessage(t.id, { type: 'STOP_CART' }).catch(() => {}));
    addLog('■ Зупинено', 'warn');
    showCartStatus('Зупинено', 'error');
    document.getElementById('btn-run-cart').classList.remove('hidden');
    document.getElementById('btn-cart-stop').classList.add('hidden');
  }

  // ── Tab helpers ───────────────────────────────────────────────────────────

  async function getOrCreateProfTab(url) {
    // Reuse existing prof1group tab if available
    const tabs = await chrome.tabs.query({ url: 'https://prof1group.ua/*' });
    if (tabs.length > 0) {
      if (url) await chrome.tabs.update(tabs[0].id, { url });
      return tabs[0];
    }
    const tab = await chrome.tabs.create({ url: url || 'https://prof1group.ua/', active: false });
    profTab = tab;
    return tab;
  }

  async function navigateTab(tabId, url) {
    await chrome.tabs.update(tabId, { url });
    await sleep(300);
  }

  function waitForTab(tabId, extraWait = 0) {
    return new Promise(resolve => {
      const listener = (id, info) => {
        if (id === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          setTimeout(resolve, extraWait || 500);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      // Safety timeout
      setTimeout(resolve, 12000);
    });
  }

  // ── UI Helpers ────────────────────────────────────────────────────────────

  function setSearchState(html) {
    const el = document.getElementById('cart-search-state');
    if (html) {
      el.innerHTML = html;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  function showSection(id, show) {
    document.getElementById(id).classList.toggle('hidden', !show);
  }

  // ─── Cart Status / Log ─────────────────────────────────────────────────────

  function showCartStatus(msg, type) {
    const el = document.getElementById('cart-status');
    el.textContent = msg;
    el.className = `status-box ${type}`;
    el.classList.remove('hidden');
  }

  function clearLog() {
    document.getElementById('cart-log').innerHTML = '';
  }

  function addLog(msg, type = 'info') {
    const log = document.getElementById('cart-log');
    const line = document.createElement('div');
    line.className = `log-entry-${type}`;
    const time = new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    line.textContent = `[${time}] ${msg}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  // ─── Content Plan Tab ──────────────────────────────────────────────────────

  let currentPlan = null;

  function setupContentTab() {
    // Set current month/year as default
    const now = new Date();
    document.getElementById('content-month').value = now.getMonth() + 1;
    document.getElementById('content-year').value = now.getFullYear();

    document.getElementById('btn-generate-plan').addEventListener('click', generatePlan);
    document.getElementById('btn-download-csv').addEventListener('click', downloadCSV);
    document.getElementById('btn-open-sheets').addEventListener('click', openSheets);
    document.getElementById('btn-export-notion').addEventListener('click', exportToNotion);
  }

  function generatePlan() {
    const month = parseInt(document.getElementById('content-month').value);
    const year = parseInt(document.getElementById('content-year').value);
    const focus = document.getElementById('content-focus').value;

    currentPlan = window.ContentPlanGenerator.generate(month, year, focus);
    renderPlanTable(currentPlan);

    document.getElementById('content-plan-result').classList.remove('hidden');
  }

  function renderPlanTable(plan) {
    const container = document.getElementById('plan-table-container');
    const rows = plan.posts.map(p => `
      <tr>
        <td>${p.date}<br><small style="color:#6b7280">${p.dayOfWeek}</small></td>
        <td><span class="post-type ${p.cssClass}">${p.typeLabel}</span></td>
        <td title="${escapeAttr(p.text + '\n\n' + p.hashtags)}">${escapeHtml(p.topic)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="plan-table">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Тип</th>
            <th>Тема</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function downloadCSV() {
    if (!currentPlan) return;
    const csv = window.ContentPlanGenerator.toCSV(currentPlan);
    const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([bom + csv], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url,
      filename: `Контент-план_${currentPlan.monthName}_${currentPlan.year}.csv`,
      saveAs: true
    });
  }

  async function exportToNotion() {
    if (!currentPlan) return;

    const { token, databaseId } = await window.NotionIntegration.getSettings();

    if (!token || !databaseId) {
      chrome.runtime.openOptionsPage();
      return;
    }

    const btn = document.getElementById('btn-export-notion');
    const progress = document.getElementById('notion-progress');
    const bar = document.getElementById('notion-bar');
    const progressText = document.getElementById('notion-progress-text');

    btn.disabled = true;
    btn.textContent = '⏳ Notion...';
    progress.classList.remove('hidden');
    bar.style.width = '0%';

    const result = await window.NotionIntegration.exportPlan(
      currentPlan,
      (current, total, topic) => {
        const pct = Math.round((current / total) * 100);
        bar.style.width = pct + '%';
        progressText.textContent = `${current} / ${total}: ${topic.slice(0, 40)}`;
      }
    );

    if (result.ok) {
      bar.style.width = '100%';
      progressText.textContent = `✅ Готово! ${result.success} постів додано до Notion`;
      btn.textContent = '📝 Відкрити Notion';
      btn.disabled = false;
      btn.onclick = () => chrome.tabs.create({ url: result.dbUrl });
    } else {
      progressText.textContent = `❌ ${result.error}`;
      btn.textContent = '📝 Notion';
      btn.disabled = false;
      btn.onclick = exportToNotion;
    }
  }

  async function openSheets() {
    if (!currentPlan) return;

    const url = await window.SheetsIntegration.getScriptUrl();

    if (!url) {
      // Fallback: open Google Sheets create page with instructions
      document.getElementById('sheets-setup').classList.remove('hidden');
      chrome.tabs.create({ url: 'https://docs.google.com/spreadsheets/create' });
      return;
    }

    const btnSheets = document.getElementById('btn-open-sheets');
    btnSheets.textContent = '⏳ Відправляю...';
    btnSheets.disabled = true;

    const result = await window.SheetsIntegration.sendToSheets(currentPlan);

    if (result.ok) {
      btnSheets.textContent = '✅ Відкрити Sheet';
      if (result.sheetUrl) {
        chrome.tabs.create({ url: result.sheetUrl });
      }
    } else {
      btnSheets.textContent = '❌ Помилка';
      setTimeout(() => {
        btnSheets.textContent = '📊 Відкрити Google Sheets';
        btnSheets.disabled = false;
      }, 3000);
    }
  }

  // ─── Message Listener ──────────────────────────────────────────────────────

  function listenForMessages() {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'CART_PROGRESS' || msg.type === 'CART_STATUS') {
        const d = msg.data;
        const name = d.item?.title || d.item?.name || '';
        if (d.status === 'processing') {
          const tags = [d.item?.size, d.item?.color].filter(Boolean).join(', ');
          addLog(`⏳ ${name}${tags ? ' [' + tags + ']' : ''}`, 'info');
          showCartStatus(`Обробляю: ${d.index + 1} / ${d.total}`, 'running');
        } else if (d.status === 'added') {
          addLog(`✅ Додано: ${name}`, 'ok');
        } else if (d.status === 'error') {
          addLog(`❌ ${name}: ${d.error}`, 'error');
        } else if (d.status === 'navigating') {
          addLog(`🔗 Відкриваю сторінку товару…`, 'info');
        } else if (d.status === 'size_not_found') {
          addLog(`⚠️ Розмір «${d.item?.size}» не знайдено`, 'warn');
        } else if (d.status === 'done') {
          addLog('✅ Готово! Перевірте кошик на сайті.', 'ok');
          showCartStatus('Готово!', 'ok');
          document.getElementById('btn-run-cart').classList.remove('hidden');
          document.getElementById('btn-cart-stop').classList.add('hidden');
        }
      }
    });
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

})();
