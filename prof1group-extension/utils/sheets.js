// PROF1Group Agent — Google Sheets Integration via Apps Script
// No API keys required: uses user's own Google Apps Script web app

window.SheetsIntegration = (function () {

  const STORAGE_KEY = 'appsScriptUrl';

  async function getScriptUrl() {
    const { appsScriptUrl } = await chrome.storage.local.get(STORAGE_KEY);
    return appsScriptUrl || null;
  }

  async function sendToSheets(plan) {
    const url = await getScriptUrl();
    if (!url) {
      return { ok: false, error: 'Apps Script URL не налаштовано. Відкрий Налаштування.' };
    }

    const payload = {
      month: plan.month,
      year: plan.year,
      monthName: plan.monthName,
      posts: plan.posts.map(p => ({
        day: p.day,
        date: p.date,
        dayOfWeek: p.dayOfWeek,
        type: p.typeLabel,
        topic: p.topic,
        text: p.text,
        hashtags: p.hashtags
      }))
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}` };
      }

      const result = await response.json();
      return { ok: true, sheetUrl: result.sheetUrl };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  return { sendToSheets, getScriptUrl };

})();
