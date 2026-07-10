import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ai: !!openai });
});

// Generate post idea using AI
app.post('/api/generate-post', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: 'OpenAI API key not configured' });
  }

  const { brand, platform, contentType, tone } = req.body;

  const toneMap = {
    friendly: 'дружній та теплий, з емоджі',
    professional: 'суворо професійний, без зайвих емоджі',
    inspiring: 'надихаючий та мотиваційний',
    educational: 'навчальний та структурований',
  };

  const prompt = `Ти — досвідчений SMM-спеціаліст. Напиши готовий текст поста для ${platform} у форматі "${contentType}".

Бренд: ${brand.name}
Ніша: ${brand.niche}
УТП: ${brand.usp || 'не вказано'}
Цільова аудиторія: ${brand.targetAudience}
Tone of Voice: ${toneMap[tone] || tone}

Вимоги:
- Мова: українська
- Довжина: оптимальна для ${platform} (не більше 300 слів)
- Стиль: ${toneMap[tone] || tone}
- Обов'язково: чіпляючий хук на початку, CTA в кінці
- Тип контенту: ${contentType}

Поверни тільки текст поста, без пояснень та коментарів.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.8,
    });

    res.json({ text: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate full week content plan
app.post('/api/generate-week-plan', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: 'OpenAI API key not configured' });
  }

  const { brand, platforms } = req.body;

  const prompt = `Ти — досвідчений SMM-стратег. Створи контент-план на 7 днів для бренду.

Бренд: ${brand.name}
Ніша: ${brand.niche}
УТП: ${brand.usp || 'не вказано'}
Цільова аудиторія: ${brand.targetAudience}
Мета: ${brand.goal}
Платформи: ${platforms.join(', ')}

Для кожного дня (Пн–Нд) дай конкретну тему та формат поста для кожної платформи.
Формат відповіді — JSON масив об'єктів:
{
  "day": "Понеділок",
  "posts": [
    {
      "platform": "Telegram",
      "type": "Фото/Візуал",
      "topic": "Конкретна тема поста",
      "hook": "Чіпляючий початок",
      "cta": "Заклик до дії"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const data = JSON.parse(completion.choices[0].message.content);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 SMM Agent API running on http://localhost:${PORT}`);
  console.log(`   OpenAI: ${openai ? '✅ Connected' : '⚠️  Not configured (set OPENAI_API_KEY)'}`);
});
