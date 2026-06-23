// PROF1Group Agent — Options Page Logic

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  bindEvents();
});

async function loadSettings() {
  const data = await chrome.storage.local.get([
    'checkInterval', 'notifyMode', 'appsScriptUrl'
  ]);

  if (data.checkInterval) {
    document.getElementById('check-interval').value = data.checkInterval;
  }
  if (data.notifyMode) {
    document.getElementById('notify-mode').value = data.notifyMode;
  }
  if (data.appsScriptUrl) {
    document.getElementById('apps-script-url').value = data.appsScriptUrl;
    updateScriptStatus(true);
  }
}

function bindEvents() {
  document.getElementById('btn-save-monitoring').addEventListener('click', saveMonitoring);
  document.getElementById('btn-save-sheets').addEventListener('click', saveSheetsUrl);
  document.getElementById('btn-test-sheets').addEventListener('click', testSheets);
  document.getElementById('btn-clear-data').addEventListener('click', clearData);
}

async function saveMonitoring() {
  const interval = parseInt(document.getElementById('check-interval').value);
  const notifyMode = document.getElementById('notify-mode').value;

  await chrome.storage.local.set({ checkInterval: interval, notifyMode });
  chrome.runtime.sendMessage({ type: 'UPDATE_ALARM', minutes: interval });

  showStatus('save-monitoring-status', '✅ Збережено', 'ok');
}

async function saveSheetsUrl() {
  const url = document.getElementById('apps-script-url').value.trim();

  if (!url) {
    showStatus('save-sheets-status', '❌ Введіть URL', 'error');
    return;
  }

  if (!url.includes('script.google.com') && !url.includes('macros/s/')) {
    showStatus('save-sheets-status', '❌ Невірний формат URL', 'error');
    return;
  }

  await chrome.storage.local.set({ appsScriptUrl: url });
  updateScriptStatus(true);
  showStatus('save-sheets-status', '✅ Збережено', 'ok');
}

async function testSheets() {
  const url = document.getElementById('apps-script-url').value.trim();
  if (!url) {
    showStatus('save-sheets-status', '❌ Спочатку введіть URL', 'error');
    return;
  }

  showStatus('save-sheets-status', '⏳ Перевіряю...', 'ok');

  try {
    const testPayload = {
      month: 6, year: 2026, monthName: 'Тест',
      posts: [{ day: 1, date: '01.06.2026', dayOfWeek: 'Пн', type: 'Тест', topic: 'Тест зєднання', text: 'Тест', hashtags: '#тест' }]
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    if (resp.ok) {
      showStatus('save-sheets-status', '✅ Підключення успішне!', 'ok');
    } else {
      showStatus('save-sheets-status', `❌ Помилка: HTTP ${resp.status}`, 'error');
    }
  } catch (err) {
    showStatus('save-sheets-status', `❌ ${err.message}`, 'error');
  }
}

async function clearData() {
  await chrome.storage.local.remove(['knownProducts', 'latestScan', 'newItems', 'lastCheckTime']);
  showStatus('clear-status', '✅ Очищено', 'ok');
}

function updateScriptStatus(connected) {
  const el = document.getElementById('script-status');
  if (connected) {
    el.innerHTML = '<span class="badge-ok">Підключено</span>';
  } else {
    el.innerHTML = '<span class="badge-warn">Не налаштовано</span>';
  }
}

function showStatus(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = `save-status ${type}`;
  setTimeout(() => { el.textContent = ''; }, 3000);
}
