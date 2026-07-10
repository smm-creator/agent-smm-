# SMM Agent — AI-SMM Стратег 🎯

Інструмент для створення SMM-стратегії: платформи, типи контенту, пропорції та контент-календар.

## Можливості

- **Налаштування бренду** — назва, ніша, УТП, тон голосу, цільова аудиторія
- **5 платформ** — Telegram, Instagram, TikTok, YouTube Shorts, Facebook
- **Типи контенту та пропорції** для кожної платформи:
  - **Telegram**: Фото (25%) · Сторіс/Опитування (25%) · Продаж (25%) · Гумор (25%)
  - **Instagram**: Карусель (30%) · Reels (40%) · Stories (20%) · Пост (10%)
  - **TikTok**: Навчальний (35%) · Розважальний (30%) · Трендовий (20%) · Закулісся (15%)
  - та інші...
- **Інтерактивний контент-календар** з щотижневим розкладом
- **Бібліотека шаблонів постів** — готові тексти для кожного типу контенту
- **AI-генерація постів** через OpenAI (опціонально)
- **Візуалізація пропорцій** — donut chart для кожної платформи
- Налаштування відсотків контентних типів вручну

## Запуск

### Тільки фронтенд

```bash
cd smm-agent
npm install
npm run dev
```

Відкрий http://localhost:5173

### З AI-генерацією (потребує OpenAI API Key)

```bash
# Скопіюй .env.example
cp .env.example .env
# Додай свій OpenAI ключ у .env

# Запусти API сервер
cd server
npm install
npm start

# Запусти фронтенд (окремий термінал)
cd smm-agent
npm run dev
```

## Структура проекту

```
smm-agent/          # React + Vite фронтенд
  src/
    components/
      SetupWizard.jsx       — майстер налаштування
      StrategyOverview.jsx  — огляд стратегії
      PlatformStrategy.jsx  — платформи та типи контенту
      ContentCalendar.jsx   — контент-календар
      PostIdeasGenerator.jsx — ідеї та шаблони постів
      DonutChart.jsx        — donut chart пропорцій
    data/platforms.js       — конфіги платформ та типів контенту
    store/useStore.js       — Zustand state management
    services/api.js         — API клієнт для AI

server/             # Express API (опціонально)
  index.js          — /api/generate-post, /api/generate-week-plan
```

## Змінні середовища

| Змінна | Опис |
|--------|------|
| `OPENAI_API_KEY` | Ключ OpenAI для AI-генерації постів |
| `PORT` | Порт API сервера (за замовчуванням 3001) |
| `VITE_API_URL` | URL API для фронтенду (за замовчуванням http://localhost:3001) |
