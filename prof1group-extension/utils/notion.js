// PROF1Group Agent — Notion Integration
// Exports content plan to a Notion Database via the official Notion API.
// The user sets up a private Integration Token once (2-minute process).

window.NotionIntegration = (function () {

  const API_BASE = 'https://api.notion.com/v1';
  const NOTION_VERSION = '2022-06-28';

  // ─── Settings ─────────────────────────────────────────────────────────────

  async function getSettings() {
    const { notionToken, notionDatabaseId } = await chrome.storage.local.get([
      'notionToken', 'notionDatabaseId'
    ]);
    return { token: notionToken || null, databaseId: notionDatabaseId || null };
  }

  function headers(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION
    };
  }

  // ─── Verify connection ────────────────────────────────────────────────────

  async function verify(token, databaseId) {
    try {
      const resp = await fetch(`${API_BASE}/databases/${databaseId}`, {
        method: 'GET',
        headers: headers(token)
      });
      if (resp.status === 200) return { ok: true };
      const err = await resp.json();
      return { ok: false, error: err.message || `HTTP ${resp.status}` };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ─── Ensure database has correct schema ──────────────────────────────────

  async function ensureSchema(token, databaseId) {
    // Check existing properties and add missing ones
    const resp = await fetch(`${API_BASE}/databases/${databaseId}`, {
      method: 'GET',
      headers: headers(token)
    });
    const db = await resp.json();
    const existing = Object.keys(db.properties || {});

    const needed = {
      'Дата':        { date: {} },
      'День тижня':  { select: { options: [] } },
      'Тип':         { select: { options: [
        { name: 'Огляд товару',      color: 'blue' },
        { name: 'Тактична порада',   color: 'green' },
        { name: 'Акція / Знижка',    color: 'yellow' },
        { name: 'Сезонний контент',  color: 'purple' },
        { name: 'Бренд / Історія',   color: 'pink' },
        { name: 'Питання-відповідь', color: 'gray' }
      ]}},
      'Текст поста': { rich_text: {} },
      'Хештеги':     { rich_text: {} },
      'Статус':      { select: { options: [
        { name: 'Чернетка',    color: 'gray' },
        { name: 'Готово',      color: 'green' },
        { name: 'Опубліковано', color: 'blue' }
      ]}}
    };

    const toAdd = {};
    for (const [name, schema] of Object.entries(needed)) {
      if (!existing.includes(name)) toAdd[name] = schema;
    }

    if (Object.keys(toAdd).length > 0) {
      await fetch(`${API_BASE}/databases/${databaseId}`, {
        method: 'PATCH',
        headers: headers(token),
        body: JSON.stringify({ properties: toAdd })
      });
    }
  }

  // ─── Create a page (one post row) ────────────────────────────────────────

  function buildPagePayload(databaseId, post, year) {
    // Parse "DD.MM.YYYY" → "YYYY-MM-DD"
    const [d, m, y] = post.date.split('.');
    const isoDate = `${y}-${m}-${d}`;

    return {
      parent: { database_id: databaseId },
      properties: {
        // Title = the topic line
        'Name': {
          title: [{ text: { content: post.topic } }]
        },
        'Дата': {
          date: { start: isoDate }
        },
        'День тижня': {
          select: { name: post.dayOfWeek }
        },
        'Тип': {
          select: { name: post.typeLabel }
        },
        'Текст поста': {
          rich_text: [{ text: { content: post.text.slice(0, 2000) } }]
        },
        'Хештеги': {
          rich_text: [{ text: { content: post.hashtags } }]
        },
        'Статус': {
          select: { name: 'Чернетка' }
        }
      }
    };
  }

  // ─── Export full plan ─────────────────────────────────────────────────────

  async function exportPlan(plan, onProgress) {
    const { token, databaseId } = await getSettings();

    if (!token || !databaseId) {
      return { ok: false, error: 'Notion не налаштовано. Відкрий Налаштування → Notion.' };
    }

    // Ensure schema is correct
    try {
      await ensureSchema(token, databaseId);
    } catch (e) {
      // Non-fatal — schema may already be fine
      console.warn('[PROF1Agent Notion] Schema check failed:', e.message);
    }

    const total = plan.posts.length;
    let success = 0;
    let failed = 0;

    for (let i = 0; i < plan.posts.length; i++) {
      const post = plan.posts[i];
      onProgress && onProgress(i + 1, total, post.topic);

      try {
        const payload = buildPagePayload(databaseId, post, plan.year);
        const resp = await fetch(`${API_BASE}/pages`, {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify(payload)
        });

        if (resp.ok) {
          success++;
        } else {
          const err = await resp.json();
          console.error('[PROF1Agent Notion] Page error:', err.message);
          failed++;
        }
      } catch (e) {
        console.error('[PROF1Agent Notion] Fetch error:', e.message);
        failed++;
      }

      // Small delay to avoid rate limits (Notion: 3 req/sec)
      await new Promise(r => setTimeout(r, 350));
    }

    const dbUrl = `https://www.notion.so/${databaseId.replace(/-/g, '')}`;
    return { ok: true, success, failed, total, dbUrl };
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  return { exportPlan, verify, getSettings };

})();
