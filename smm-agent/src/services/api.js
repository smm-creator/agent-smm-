const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function generatePost(brand, platform, contentType) {
  const res = await fetch(`${API_BASE}/api/generate-post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand, platform, contentType, tone: brand.tone }),
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

export async function generateWeekPlan(brand, platforms) {
  const res = await fetch(`${API_BASE}/api/generate-week-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand, platforms }),
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

export async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.json();
  } catch {
    return { ok: false, ai: false };
  }
}
