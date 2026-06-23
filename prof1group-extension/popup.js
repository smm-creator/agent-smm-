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

  function setupCartTab() {
    const btnStart = document.getElementById('btn-cart-start');
    const btnStop = document.getElementById('btn-cart-stop');
    const textarea = document.getElementById('cart-input');

    btnStart.addEventListener('click', () => startCart());
    btnStop.addEventListener('click', () => stopCart());
  }

  async function startCart() {
    const textarea = document.getElementById('cart-input');
    const raw = textarea.value.trim();
    if (!raw) {
      showCartStatus('Введіть список товарів', 'error');
      return;
    }

    const items = parseCartList(raw);
    if (items.length === 0) {
      showCartStatus('Список порожній або невірний формат', 'error');
      return;
    }

    clearLog();
    addLog(`Починаю обробку ${items.length} товарів...`, 'info');
    showCartStatus(`Запущено: 0 / ${items.length}`, 'running');

    document.getElementById('btn-cart-start').disabled = true;
    document.getElementById('btn-cart-stop').disabled = false;

    // Find active prof1group tab or open new one
    const tabs = await chrome.tabs.query({ url: 'https://prof1group.ua/*' });
    let tab;

    if (tabs.length > 0) {
      tab = tabs[0];
    } else {
      tab = await chrome.tabs.create({ url: 'https://prof1group.ua/catalog/' });
      await waitForTab(tab.id);
    }

    chrome.tabs.sendMessage(tab.id, { type: 'START_CART', items });
  }

  async function stopCart() {
    const tabs = await chrome.tabs.query({ url: 'https://prof1group.ua/*' });
    tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { type: 'STOP_CART' }));
    addLog('Зупинено.', 'warn');
    showCartStatus('Зупинено', 'error');
    document.getElementById('btn-cart-start').disabled = false;
    document.getElementById('btn-cart-stop').disabled = true;
  }

  function parseCartList(raw) {
    return raw.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|');
        return {
          name: parts[0].trim(),
          size: parts[1] ? parts[1].trim() : '',
          url: ''
        };
      });
  }

  function waitForTab(tabId) {
    return new Promise(resolve => {
      const listener = (id, info) => {
        if (id === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          setTimeout(resolve, 1500);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
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
      if (msg.type === 'CART_PROGRESS') {
        const d = msg.data;
        if (d.status === 'processing') {
          addLog(`Обробляю: ${d.item.name}${d.item.size ? ' (розмір: ' + d.item.size + ')' : ''}...`, 'info');
          showCartStatus(`Обробляю: ${d.index + 1} / ${d.total}`, 'running');
        } else if (d.status === 'added') {
          addLog(`✅ Додано: ${d.item.name}`, 'ok');
        } else if (d.status === 'error') {
          addLog(`❌ Помилка (${d.item.name}): ${d.error}`, 'error');
        } else if (d.status === 'navigating') {
          addLog(`🔗 Переходжу на сторінку товару...`, 'info');
        } else if (d.status === 'size_not_found') {
          addLog(`⚠️ Розмір "${d.item.size}" не знайдено для "${d.item.name}"`, 'warn');
        } else if (d.status === 'done') {
          addLog('✅ Готово! Перевірте кошик.', 'ok');
          showCartStatus('Завершено!', 'ok');
          document.getElementById('btn-cart-start').disabled = false;
          document.getElementById('btn-cart-stop').disabled = true;
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

})();
