/**
 * SMM Strategy Engine — PROF1Group
 * Генерує стратегію, пропорції контенту, формати та щоденний мікс.
 */

const StrategyEngine = (() => {
  const MONTHS_UK = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
  ];

  const DAYS_UK = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  /** Призначення контенту (пропорційність) */
  const PURPOSES = {
    visual: {
      id: 'visual',
      label: 'Фото / візуал',
      short: 'Фото',
      color: '#3d5a3d',
      desc: 'Естетичні фото товарів, lifestyle, деталі спорядження'
    },
    story: {
      id: 'story',
      label: 'Історія бренду',
      short: 'Історія',
      color: '#5c4a32',
      desc: 'Behind the scenes, команда, клієнти, цінності бренду'
    },
    sales: {
      id: 'sales',
      label: 'Продаж / акція',
      short: 'Продаж',
      color: '#8b3a2a',
      desc: 'Офери, знижки, наявність, CTA «купити зараз»'
    },
    humor: {
      id: 'humor',
      label: 'Гумор / мем',
      short: 'Гумор',
      color: '#6b5a2e',
      desc: 'Легкий тон, меми з ніші, релотабельні ситуації'
    },
    expert: {
      id: 'expert',
      label: 'Експертний',
      short: 'Експерт',
      color: '#2a4a5c',
      desc: 'Поради, гайди, порівняння, відповіді на питання'
    },
    ugc: {
      id: 'ugc',
      label: 'UGC / відгук',
      short: 'UGC',
      color: '#3a4a5c',
      desc: 'Контент клієнтів, відгуки, реальні кейси використання'
    }
  };

  /** Формати публікацій */
  const FORMATS = {
    carousel: {
      id: 'carousel',
      label: 'Карусель',
      platform: 'Instagram / Facebook',
      desc: '3–10 слайдів: огляд, гайд, до/після, чек-ліст'
    },
    photo: {
      id: 'photo',
      label: 'Фото-пост',
      platform: 'Instagram / Facebook',
      desc: 'Одне сильне зображення + текст'
    },
    stories: {
      id: 'stories',
      label: 'Stories',
      platform: 'Instagram / Facebook',
      desc: 'Серія сторіс: опитування, стікери, лінки'
    },
    reels: {
      id: 'reels',
      label: 'Reels / Shorts',
      platform: 'Instagram / TikTok / YouTube',
      desc: 'Коротке відео 15–60 сек: демо, хук, CTA'
    },
    video: {
      id: 'video',
      label: 'Відео-пост',
      platform: 'Facebook / Telegram',
      desc: 'Довше відео або огляд товару'
    },
    text: {
      id: 'text',
      label: 'Текстовий пост',
      platform: 'Telegram / Facebook',
      desc: 'Сильний текст без обовʼязкового візуалу'
    }
  };

  /** Готові мікси пропорцій за ціллю */
  const GOAL_MIXES = {
    balanced: {
      label: 'Збалансований',
      purposes: { visual: 25, story: 20, sales: 20, humor: 15, expert: 15, ugc: 5 },
      formats: { carousel: 25, photo: 20, stories: 25, reels: 20, video: 5, text: 5 }
    },
    sales: {
      label: 'Продажі',
      purposes: { visual: 20, story: 10, sales: 35, humor: 10, expert: 15, ugc: 10 },
      formats: { carousel: 30, photo: 25, stories: 20, reels: 15, video: 5, text: 5 }
    },
    engagement: {
      label: 'Залучення',
      purposes: { visual: 15, story: 20, sales: 10, humor: 30, expert: 15, ugc: 10 },
      formats: { carousel: 15, photo: 15, stories: 30, reels: 30, video: 5, text: 5 }
    },
    authority: {
      label: 'Експертність',
      purposes: { visual: 15, story: 15, sales: 10, humor: 10, expert: 40, ugc: 10 },
      formats: { carousel: 35, photo: 15, stories: 15, reels: 20, video: 10, text: 5 }
    }
  };

  /** Щоденні шаблони слотів (як у прикладі: 4 пости — фото, історія, продаж, гумор) */
  const DAILY_TEMPLATES = {
    2: [
      { purpose: 'visual', format: 'photo', slot: 'Ранок' },
      { purpose: 'sales', format: 'carousel', slot: 'Вечір' }
    ],
    3: [
      { purpose: 'visual', format: 'photo', slot: 'Ранок' },
      { purpose: 'expert', format: 'carousel', slot: 'День' },
      { purpose: 'sales', format: 'stories', slot: 'Вечір' }
    ],
    4: [
      { purpose: 'visual', format: 'photo', slot: 'Ранок' },
      { purpose: 'story', format: 'stories', slot: 'Обід' },
      { purpose: 'sales', format: 'carousel', slot: 'День' },
      { purpose: 'humor', format: 'reels', slot: 'Вечір' }
    ],
    5: [
      { purpose: 'visual', format: 'photo', slot: 'Ранок' },
      { purpose: 'expert', format: 'carousel', slot: 'Пізній ранок' },
      { purpose: 'story', format: 'stories', slot: 'Обід' },
      { purpose: 'sales', format: 'reels', slot: 'День' },
      { purpose: 'humor', format: 'stories', slot: 'Вечір' }
    ],
    6: [
      { purpose: 'visual', format: 'photo', slot: 'Ранок' },
      { purpose: 'expert', format: 'carousel', slot: 'Пізній ранок' },
      { purpose: 'story', format: 'stories', slot: 'Обід' },
      { purpose: 'sales', format: 'carousel', slot: 'День' },
      { purpose: 'ugc', format: 'photo', slot: 'Пізній день' },
      { purpose: 'humor', format: 'reels', slot: 'Вечір' }
    ]
  };

  const FOCUS_TOPICS = {
    mixed: ['Берці LOWA', 'Куртки 5.11', 'Рюкзаки', 'Аптечки IFAK', 'Рукавички P1G', 'Плитоноски'],
    clothing: ['Куртка Bastion', 'Фліс Polartec', 'Убакс DEFENSOR', 'Штани карго', 'Термобілизна'],
    footwear: ['LOWA Z-6S', 'LOWA Z-8', 'Fortux', 'Renegade', 'Innox'],
    equipment: ['Рюкзак LVC12', 'Підсумки MOLLE', 'Турнікет CAT', 'Ліхтар', 'IFAK'],
    protection: ['Плитоноска', 'Каска ACH', 'Балістичні окуляри', 'Навушники Sordin'],
    camp: ['Спальник', 'Карімат', 'Намет', 'Пальник', 'Фляга']
  };

  const IDEA_BANK = {
    visual: [
      'Крупний план текстури / фурнітури {product}',
      'Lifestyle: {product} у польових умовах',
      'Flat-lay набір: {product} + аксесуари',
      'Деталі посадки / розміру {product}'
    ],
    story: [
      'Як команда PROF1Group комплектує замовлення',
      'Історія клієнта з {product}',
      '20 років бренду — короткий факт дня',
      'За лаштунками складу / магазину'
    ],
    sales: [
      'Акція тижня на {product}',
      'В наявності: {product} — обмежена партія',
      'Комплект зі знижкою: {product} + супутнє',
      'Останні розміри {product} — CTA в Direct'
    ],
    humor: [
      'Мем: «коли нарешті прийшли берці»',
      'Ситуація: друг питає «навіщо тобі 3 куртки»',
      'Релотабельний жарт про вибір розміру',
      '«Планував купити одне — вийшов з повним рюкзаком»'
    ],
    expert: [
      'Як обрати {product}: 5 критеріїв',
      'Порівняння: {product} vs альтернатива',
      'Чек-ліст догляду за {product}',
      'Помилки новачків при виборі {product}'
    ],
    ugc: [
      'Відгук клієнта про {product}',
      'Фото з поля: реальне використання {product}',
      'Репост сторіс покупця + відповідь бренду',
      'До/після: комплектація з {product}'
    ]
  };

  const FORMAT_TIPS = {
    carousel: 'Слайд 1 — хук, 2–N — цінність, останній — CTA + профіль/сайт',
    photo: 'Одне домінантне фото, текст до 1200 символів, 3–5 хештегів',
    stories: '3–7 кадрів, опитування/стікер питання, лінк у біо або свайп',
    reels: 'Хук у перші 1–2 сек, субтитри, CTA в кінці та в описі',
    video: 'До 90 сек для стрічки, чіткий оффер у перші 10 сек',
    text: 'Сильний перший рядок, абзаци короткі, одне чітке CTA'
  };

  function clampPostsPerDay(n) {
    const v = Number(n) || 4;
    if (v <= 2) return 2;
    if (v >= 6) return 6;
    return v;
  }

  function pick(arr, i) {
    return arr[i % arr.length];
  }

  function fillProduct(template, product) {
    return template.replace(/\{product\}/g, product);
  }

  function buildProportionsFromDaily(dailySlots) {
    const counts = {};
    const formatCounts = {};
    dailySlots.forEach((s) => {
      counts[s.purpose] = (counts[s.purpose] || 0) + 1;
      formatCounts[s.format] = (formatCounts[s.format] || 0) + 1;
    });
    const total = dailySlots.length;
    const purposes = {};
    const formats = {};
    Object.keys(PURPOSES).forEach((k) => {
      purposes[k] = Math.round(((counts[k] || 0) / total) * 100);
    });
    Object.keys(FORMATS).forEach((k) => {
      formats[k] = Math.round(((formatCounts[k] || 0) / total) * 100);
    });
    // normalize rounding drift
    normalizePercents(purposes);
    normalizePercents(formats);
    return { purposes, formats };
  }

  function normalizePercents(obj) {
    const keys = Object.keys(obj).filter((k) => obj[k] > 0);
    if (!keys.length) return;
    const sum = keys.reduce((a, k) => a + obj[k], 0);
    if (sum === 100) return;
    obj[keys[0]] += 100 - sum;
  }

  function mergeMix(goalId, postsPerDay, customDaily) {
    const goal = GOAL_MIXES[goalId] || GOAL_MIXES.balanced;
    const daily = customDaily || DAILY_TEMPLATES[postsPerDay] || DAILY_TEMPLATES[4];
    const fromDaily = buildProportionsFromDaily(daily);

    // Blend goal mix with daily template (daily drives the visible schedule)
    return {
      goalLabel: goal.label,
      purposes: fromDaily.purposes,
      formats: fromDaily.formats,
      goalPurposes: goal.purposes,
      goalFormats: goal.formats,
      daily
    };
  }

  function strategyCopy(platform, goalId, focus, postsPerDay) {
    const platformLine = {
      instagram: 'Instagram: стрічка + Stories + Reels як основний канал.',
      facebook: 'Facebook: пости + Stories, акцент на охоплення 25+.',
      tiktok: 'TikTok: короткі відео, тренди, хуки без «рекламного» тону.',
      telegram: 'Telegram: текст + фото/відео, швидкі офери та експертиза.',
      multi: 'Мультиканал: єдиний меседж, адаптація формату під кожну мережу.'
    }[platform] || 'Мультиканал.';

    const goalLine = {
      balanced: 'Мета — стабільний мікс охоплення, довіри й продажів.',
      sales: 'Мета — конверсія: більше оферів і чітких CTA.',
      engagement: 'Мета — коментарі, збереження, репости, діалог.',
      authority: 'Мета — позиціонування як експерта в тактичному спорядженні.'
    }[goalId];

    return {
      positioning:
        'PROF1Group — надійний тактичний магазин з експертизою підбору спорядження. Контент говорить мовою практики, без зайвого пафосу.',
      tone:
        'Впевнений, конкретний, з легким гумором у ніші. Без агресивного «крику» в кожному пості.',
      platform: platformLine,
      goal: goalLine,
      cadence: `${postsPerDay} публікації на день за фіксованими слотами (тип + формат).`,
      focusNote: `Фокус асортименту: ${focusLabel(focus)}.`
    };
  }

  function focusLabel(focus) {
    return {
      mixed: 'змішаний асортимент',
      clothing: 'одяг та форма',
      footwear: 'взуття',
      equipment: 'тактичне спорядження',
      protection: 'засоби захисту',
      camp: 'бівачне спорядження'
    }[focus] || focus;
  }

  function generateWeekPlan(opts) {
    const {
      postsPerDay,
      focus,
      daily,
      startDate
    } = opts;
    const products = FOCUS_TOPICS[focus] || FOCUS_TOPICS.mixed;
    const start = startDate ? new Date(startDate) : new Date();
    // Monday of current week
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(start);
    monday.setDate(start.getDate() + mondayOffset);
    monday.setHours(12, 0, 0, 0);

    const week = [];
    let ideaIdx = 0;

    for (let d = 0; d < 7; d++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + d);
      const posts = daily.map((slot, si) => {
        const product = pick(products, ideaIdx + si);
        const bank = IDEA_BANK[slot.purpose] || IDEA_BANK.visual;
        const idea = fillProduct(pick(bank, ideaIdx + si), product);
        ideaIdx++;
        return {
          slot: slot.slot,
          purposeId: slot.purpose,
          purpose: PURPOSES[slot.purpose].label,
          purposeShort: PURPOSES[slot.purpose].short,
          purposeColor: PURPOSES[slot.purpose].color,
          formatId: slot.format,
          format: FORMATS[slot.format].label,
          idea,
          tip: FORMAT_TIPS[slot.format],
          product
        };
      });

      week.push({
        date: formatDate(date),
        dayName: DAYS_UK[date.getDay()],
        iso: date.toISOString().slice(0, 10),
        posts
      });
    }

    return week;
  }

  function generateMonthPlan(opts) {
    const { month, year, postsPerDay, focus, daily } = opts;
    const products = FOCUS_TOPICS[focus] || FOCUS_TOPICS.mixed;
    const daysInMonth = new Date(year, month, 0).getDate();
    const plan = [];
    let ideaIdx = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const posts = daily.map((slot, si) => {
        const product = pick(products, ideaIdx);
        const bank = IDEA_BANK[slot.purpose] || IDEA_BANK.visual;
        const idea = fillProduct(pick(bank, ideaIdx), product);
        ideaIdx++;
        return {
          slot: slot.slot,
          purposeId: slot.purpose,
          purpose: PURPOSES[slot.purpose].label,
          purposeShort: PURPOSES[slot.purpose].short,
          purposeColor: PURPOSES[slot.purpose].color,
          formatId: slot.format,
          format: FORMATS[slot.format].label,
          idea,
          tip: FORMAT_TIPS[slot.format],
          product
        };
      });

      plan.push({
        day,
        date: formatDate(date),
        dayName: DAYS_UK[date.getDay()],
        posts
      });
    }

    return plan;
  }

  function formatDate(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  }

  /**
   * Головний API: згенерувати повну стратегію
   */
  function generate(input) {
    const postsPerDay = clampPostsPerDay(input.postsPerDay);
    const goalId = input.goal || 'balanced';
    const platform = input.platform || 'instagram';
    const focus = input.focus || 'mixed';
    const month = Number(input.month) || new Date().getMonth() + 1;
    const year = Number(input.year) || new Date().getFullYear();

    // Optional custom daily mix from UI: array of {purpose, format, slot}
    let daily = DAILY_TEMPLATES[postsPerDay];
    if (Array.isArray(input.customSlots) && input.customSlots.length) {
      daily = input.customSlots.map((s, i) => ({
        purpose: s.purpose || 'visual',
        format: s.format || 'photo',
        slot: s.slot || `Слот ${i + 1}`
      }));
    }

    const mix = mergeMix(goalId, postsPerDay, daily);
    const copy = strategyCopy(platform, goalId, focus, postsPerDay);
    const week = generateWeekPlan({ postsPerDay, focus, daily, startDate: input.startDate });
    const monthPlan = generateMonthPlan({ month, year, postsPerDay, focus, daily });

    const purposeBars = Object.entries(mix.purposes)
      .filter(([, pct]) => pct > 0)
      .map(([id, pct]) => ({ ...PURPOSES[id], pct }))
      .sort((a, b) => b.pct - a.pct);

    const formatBars = Object.entries(mix.formats)
      .filter(([, pct]) => pct > 0)
      .map(([id, pct]) => ({ ...FORMATS[id], pct }))
      .sort((a, b) => b.pct - a.pct);

    return {
      meta: {
        brand: 'PROF1Group',
        platform,
        goalId,
        goalLabel: mix.goalLabel,
        focus,
        focusLabel: focusLabel(focus),
        postsPerDay,
        month,
        year,
        monthName: MONTHS_UK[month - 1],
        generatedAt: new Date().toISOString()
      },
      strategy: copy,
      dailyMix: daily.map((s) => ({
        ...s,
        purposeLabel: PURPOSES[s.purpose].label,
        purposeShort: PURPOSES[s.purpose].short,
        purposeColor: PURPOSES[s.purpose].color,
        formatLabel: FORMATS[s.format].label,
        formatDesc: FORMATS[s.format].desc,
        tip: FORMAT_TIPS[s.format]
      })),
      proportions: {
        purposes: purposeBars,
        formats: formatBars
      },
      week,
      monthPlan,
      rules: [
        'Один день = фіксований набір слотів (тип + формат).',
        'Продажний слот завжди з чітким CTA і наявністю.',
        'Гумор — без токсичності й без знецінення клієнта.',
        'Карусель: мінімум 4 слайди цінності + 1 CTA.',
        'Stories щодня підтримують стрічку, не дублюють її 1:1.'
      ]
    };
  }

  function toCSV(strategy) {
    const rows = [['Дата', 'День', 'Слот', 'Тип контенту', 'Формат', 'Ідея', 'Товар', 'Порада по формату']];
    strategy.monthPlan.forEach((day) => {
      day.posts.forEach((p) => {
        rows.push([
          day.date,
          day.dayName,
          p.slot,
          p.purpose,
          p.format,
          `"${p.idea.replace(/"/g, '""')}"`,
          p.product,
          `"${p.tip.replace(/"/g, '""')}"`
        ]);
      });
    });
    return rows.map((r) => r.join('\t')).join('\n');
  }

  return {
    generate,
    toCSV,
    PURPOSES,
    FORMATS,
    GOAL_MIXES,
    DAILY_TEMPLATES,
    MONTHS_UK
  };
})();

if (typeof window !== 'undefined') {
  window.StrategyEngine = StrategyEngine;
}
