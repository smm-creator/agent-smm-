// PROF1Group Agent — Background Service Worker
// Monitors new arrivals, manages alarms, triggers notifications

const ALARM_NAME = 'checkNewProducts';
const CATALOG_URL = 'https://prof1group.ua/catalog/';
const STORAGE_KEY_PRODUCTS = 'knownProducts';
const STORAGE_KEY_LAST_CHECK = 'lastCheckTime';
const DEFAULT_INTERVAL_MINUTES = 30;

// ─── Initialization ───────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const { checkInterval = DEFAULT_INTERVAL_MINUTES } = await chrome.storage.local.get('checkInterval');
  setupAlarm(checkInterval);
  console.log('[PROF1Agent] Installed, alarm set for every', checkInterval, 'min');
});

chrome.runtime.onStartup.addListener(async () => {
  const { checkInterval = DEFAULT_INTERVAL_MINUTES } = await chrome.storage.local.get('checkInterval');
  setupAlarm(checkInterval);
});

function setupAlarm(minutes) {
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: minutes,
      periodInMinutes: minutes
    });
  });
}

// ─── Alarm Handler ────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkForNewProducts();
  }
});

// ─── Product Check ────────────────────────────────────────────────────────────

async function checkForNewProducts() {
  console.log('[PROF1Agent] Checking for new products...');

  try {
    // Find existing prof1group tabs first
    const tabs = await chrome.tabs.query({ url: 'https://prof1group.ua/*' });

    if (tabs.length > 0) {
      // Use existing tab
      const result = await injectAndScan(tabs[0].id);
      await processProductData(result);
    } else {
      // Open a background tab to scan
      const tab = await chrome.tabs.create({
        url: CATALOG_URL,
        active: false
      });

      // Wait for page to load then scan
      await waitForTabLoad(tab.id);
      const result = await injectAndScan(tab.id);
      chrome.tabs.remove(tab.id);
      await processProductData(result);
    }

    await chrome.storage.local.set({ lastCheckTime: Date.now() });
  } catch (err) {
    console.error('[PROF1Agent] Check failed:', err);
  }
}

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        // Extra wait for JS rendering
        setTimeout(resolve, 2000);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function injectAndScan(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: scanPageForProducts
  });
  return results?.[0]?.result || [];
}

// This function runs in the page context
function scanPageForProducts() {
  const products = [];

  // Selectors for different page types on prof1group.ua
  const selectors = [
    '.product-item',
    '.catalog-item',
    '.item-card',
    '[class*="product"]',
    '[class*="item"]',
    '.card',
    'article'
  ];

  for (const sel of selectors) {
    const items = document.querySelectorAll(sel);
    if (items.length > 3) {
      items.forEach((el) => {
        const titleEl = el.querySelector('h2, h3, h4, .title, .name, [class*="title"], [class*="name"]');
        const priceEl = el.querySelector('.price, [class*="price"]');
        const linkEl = el.querySelector('a[href*="/catalog/"]') || el.querySelector('a');
        const imgEl = el.querySelector('img');
        const badgeEl = el.querySelector('.badge, .new, [class*="new"], [class*="badge"], [class*="label"]');

        if (titleEl) {
          products.push({
            title: titleEl.textContent.trim(),
            price: priceEl ? priceEl.textContent.trim() : '',
            url: linkEl ? linkEl.href : '',
            image: imgEl ? imgEl.src : '',
            isNew: badgeEl ? badgeEl.textContent.toLowerCase().includes('нов') : false,
            id: linkEl ? linkEl.href : titleEl.textContent.trim()
          });
        }
      });
      if (products.length > 0) break;
    }
  }

  return products;
}

async function processProductData(newProducts) {
  if (!newProducts || newProducts.length === 0) return;

  const { knownProducts = [] } = await chrome.storage.local.get(STORAGE_KEY_PRODUCTS);
  const knownIds = new Set(knownProducts.map(p => p.id));

  const actuallyNew = newProducts.filter(p => p.id && !knownIds.has(p.id));
  const newItems = newProducts.filter(p => p.isNew);

  if (actuallyNew.length > 0) {
    await notifyNewArrivals(actuallyNew);

    // Merge into known products (keep last 500)
    const merged = [...knownProducts, ...actuallyNew].slice(-500);
    await chrome.storage.local.set({ knownProducts: merged });
  }

  // Always store latest batch for popup display
  await chrome.storage.local.set({ latestScan: newProducts, newItems });
}

async function notifyNewArrivals(items) {
  const count = items.length;
  const title = count === 1
    ? `🆕 Нова позиція на PROF1Group!`
    : `🆕 ${count} нових позицій на PROF1Group!`;

  const body = items.slice(0, 3).map(p => p.title).join('\n') +
    (count > 3 ? `\n...та ще ${count - 3}` : '');

  await chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message: body,
    priority: 1,
    buttons: [{ title: 'Відкрити сайт' }]
  });
}

// ─── Notification Click ───────────────────────────────────────────────────────

chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
  if (buttonIndex === 0) {
    chrome.tabs.create({ url: CATALOG_URL });
  }
  chrome.notifications.clear(id);
});

chrome.notifications.onClicked.addListener((id) => {
  chrome.tabs.create({ url: CATALOG_URL });
  chrome.notifications.clear(id);
});

// ─── Message Handling ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'MANUAL_CHECK') {
    checkForNewProducts().then(() => sendResponse({ ok: true }));
    return true; // async
  }

  if (msg.type === 'UPDATE_ALARM') {
    setupAlarm(msg.minutes);
    chrome.storage.local.set({ checkInterval: msg.minutes });
    sendResponse({ ok: true });
  }

  if (msg.type === 'CART_STATUS') {
    // Broadcast cart status to popup
    chrome.runtime.sendMessage({ type: 'CART_PROGRESS', data: msg.data });
  }

  if (msg.type === 'PRODUCTS_SCANNED') {
    processProductData(msg.products);
  }
});
