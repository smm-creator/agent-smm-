// PROF1Group Agent — Ukrainian Content Plan Generator
// Generates SMM content plan based on month, season, and product focus

window.ContentPlanGenerator = (function () {

  // ─── Data ─────────────────────────────────────────────────────────────────

  const MONTHS_UK = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
  ];

  const SEASONS = {
    winter: [12, 1, 2],
    spring: [3, 4, 5],
    summer: [6, 7, 8],
    autumn: [9, 10, 11]
  };

  function getSeason(month) {
    for (const [s, months] of Object.entries(SEASONS)) {
      if (months.includes(month)) return s;
    }
    return 'spring';
  }

  // ─── Seasonal product focus ───────────────────────────────────────────────

  const SEASON_THEMES = {
    winter: {
      clothing: ['Зимові куртки', 'Флісові куртки', 'Термобілизна', 'Зимові рукавички', 'Балаклави', 'Зимові берці'],
      equipment: ['Спальні мішки', 'Каремати', 'Пальники', 'Намети', 'Зимове бівачне спорядження'],
      tips: [
        'Як правильно одягатися шарами в польових умовах взимку',
        'Вибір термобілизни: матеріал і щільність',
        'Догляд за взуттям у мороз: імпрегнація та сушіння',
        'Як зберегти тепло в наметі при низьких температурах',
        'Зимова маскувальна накидка: коли і де застосовувати'
      ],
      hashtags: ['#зимоваформа', '#термобілизна', '#зимовеспорядження', '#wintergear', '#зима2026']
    },
    spring: {
      clothing: ['Демісезонні куртки', 'Тактичні сорочки', 'Штани', 'Легкі рукавички', 'Кепки'],
      equipment: ['Аптечки', 'Навігація', 'Тактичне спорядження', 'Водонепроникні мішки'],
      tips: [
        'Бруд і волога: як захистити спорядження навесні',
        'Весняне оновлення аптечки: що перевірити',
        'Вибір демісезонних берців для різних поверхонь',
        'Захист від кліщів у польових умовах',
        'Квітневе технічне обслуговування тактичного спорядження'
      ],
      hashtags: ['#весняноспорядження', '#тактика', '#springgear', '#весна2026', '#профі']
    },
    summer: {
      clothing: ['Шорти 5.11', 'Тактичні футболки', 'Легкий одяг', 'Кепки', 'Бандани', 'Сонцезахисні окуляри'],
      equipment: ['Фляги', 'Системи гідратації', 'Сонцезахист', 'Легкі рюкзаки', 'Сандалі', 'Тропічне взуття'],
      tips: [
        'Гідратація в спеку: скільки і як пити в польових умовах',
        'Захист шкіри від сонця для військових',
        'Яке взуття обрати для спеки: берці vs кросівки',
        'Літнє маскування: поради по вибору одягу',
        'Як доглядати за спорядженням у спеку та пил'
      ],
      hashtags: ['#літнєспорядження', '#summergear', '#тактика', '#літо2026', '#гідратація']
    },
    autumn: {
      clothing: ['Флісові куртки', 'Демісезонні куртки', 'Дощовики', 'Рукавички', 'Флісові балаклави'],
      equipment: ['Дощозахист', 'Водонепроникні мішки', 'Спальні мішки', 'Теплі каремати'],
      tips: [
        'Підготовка спорядження до зими: чек-ліст',
        'Захист від дощу: gore-tex vs мембрани',
        'Осінні берці: що вибрати для болота',
        'Огляд засобів імпрегнації для одягу та взуття',
        'Перехідний сезон: як не замерзнути і не перегрітись'
      ],
      hashtags: ['#осіннєспорядження', '#autumngear', '#дощозахист', '#осінь2026', '#берці']
    }
  };

  // ─── Post type templates ──────────────────────────────────────────────────

  const POST_TYPES = [
    { id: 'product', label: 'Огляд товару', cssClass: 'type-product', emoji: '🎽' },
    { id: 'tip', label: 'Тактична порада', cssClass: 'type-tip', emoji: '💡' },
    { id: 'promo', label: 'Акція / Знижка', cssClass: 'type-promo', emoji: '🏷️' },
    { id: 'seasonal', label: 'Сезонний контент', cssClass: 'type-seasonal', emoji: '📆' },
    { id: 'story', label: 'Бренд / Історія', cssClass: 'type-story', emoji: '🏪' },
    { id: 'qa', label: 'Питання-відповідь', cssClass: 'type-qa', emoji: '❓' }
  ];

  // Schedule pattern for 30 days: distribute post types evenly
  const POST_SCHEDULE = [
    'product', 'tip', 'seasonal', 'product', 'promo', 'tip',
    'product', 'story', 'tip', 'product', 'qa', 'seasonal',
    'product', 'tip', 'promo', 'product', 'tip', 'story',
    'product', 'seasonal', 'tip', 'product', 'qa', 'promo',
    'product', 'tip', 'seasonal', 'product', 'story', 'tip'
  ];

  // ─── Content templates ────────────────────────────────────────────────────

  const BRAND_CONTENT = [
    '20 років з вами: коротка історія PROF1Group',
    'Наші магазини в Україні: де знайти нас',
    'Благодійний проєкт «Коник»: як ми допомагаємо ЗСУ',
    'Чому обирають PROF1Group: відгуки клієнтів',
    'Наші партнери: бренди 5.11 Tactical, LOWA, P1G',
    'Команда PROF1Group: хто стоїть за магазином'
  ];

  const QA_TEMPLATES = [
    'Питання: Як підібрати розмір берців? Відповідаємо!',
    'Яка різниця між Gore-Tex та мембранними тканинами?',
    'Питання: Берці чи кросівки для ротації? Розбираємо плюси та мінуси',
    'Що таке система MOLLE і навіщо вона потрібна?',
    'Питання: Як доглядати за тактичним взуттям?',
    'Турнікет CAT vs SOFTT-W: який обрати?'
  ];

  const PROMO_TEMPLATES = [
    'Акція тижня: знижки на {category}',
    'Спеціальна пропозиція від {brand}',
    'Нові надходження вже в наявності!',
    'Флеш-розпродаж: обмежена кількість',
    'Комплектне рішення: знижка на набір',
    'Сезонна акція: {season} розпродаж'
  ];

  // ─── Focus-specific products ──────────────────────────────────────────────

  const FOCUS_PRODUCTS = {
    mixed: [
      'Берці LOWA Z-6S', 'Куртка 5.11 Tactical Bastion', 'Рюкзак 5.11 LVC12 21L',
      'Рукавички P1G', 'Флісова куртка Polartec', 'Бронежилет плитоноска',
      'Навушники тактичні', 'Аптечка IFAK', 'Сорочка DEFENSOR MK-2',
      'Кросівки LOWA Fortux', 'Шорти 5.11 Tactical', 'Балаклава',
      'Підсумки MOLLE', 'Турнікет CAT', 'Штани тактичні'
    ],
    clothing: [
      'Куртка 5.11 Tactical Bastion Jacket', 'Флісова куртка Monticola',
      'Термобілизна Walrus', 'Бойова сорочка DEFENSOR MK-2',
      'Тактичний убакс 5.11', 'Штани карго', 'Рукавички тактичні P1G',
      'Кепка MultiCam', 'Балаклава', 'Шкарпетки 5.11 Duty Ready'
    ],
    footwear: [
      'Берці LOWA Z-6S GTX', 'Берці LOWA Z-8 GTX', 'Кросівки LOWA Fortux',
      'Черевики LOWA Renegade', 'Черевики LOWA Innox', 'Черевики LOWA Zephyr',
      'Тактичні кросівки', 'Сандалі чоловічі', 'Демісезонне взуття',
      'Аксесуари для взуття: устілки, просочення'
    ],
    equipment: [
      'Аптечка IFAK тактична', 'Рюкзак 5.11 LVC12', 'Підсумки MOLLE',
      'Турнікет CAT', 'Плитоноска розвантажувальна', 'Ніж тактичний',
      'Ліхтар тактичний', 'Годинник тактичний', 'Коліматор', 'Кобура'
    ],
    protection: [
      'Бронежилет з плитами', 'Каска ACH', 'Тактичний шолом',
      'Навушники MSA Sordin', 'Балістичні окуляри', 'Наколінники тактичні',
      'Налокітники', 'Балістичний захист рук'
    ],
    camp: [
      'Спальний мішок', 'Карімат', 'Намет тактичний',
      'Пальник газовий', 'Казанок', 'Компас', 'Гамак',
      'Паракорд 550', 'Фляга BPA-free', 'Тент водостійкий'
    ]
  };

  // ─── Generator ────────────────────────────────────────────────────────────

  function generate(month, year, focus) {
    const season = getSeason(month);
    const seasonData = SEASON_THEMES[season];
    const products = FOCUS_PRODUCTS[focus] || FOCUS_PRODUCTS.mixed;
    const monthName = MONTHS_UK[month - 1];
    const daysInMonth = new Date(year, month, 0).getDate();
    const totalPosts = Math.min(30, daysInMonth);

    const plan = [];
    let productIdx = 0;
    let tipIdx = 0;
    let brandIdx = 0;
    let qaIdx = 0;
    let promoIdx = 0;
    let seasonIdx = 0;

    for (let day = 1; day <= totalPosts; day++) {
      const typeId = POST_SCHEDULE[(day - 1) % POST_SCHEDULE.length];
      const typeObj = POST_TYPES.find(t => t.id === typeId);
      const date = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
      const dayOfWeek = getDayOfWeek(new Date(year, month - 1, day));

      let topic = '';
      let text = '';
      let hashtags = '';

      switch (typeId) {
        case 'product': {
          const product = products[productIdx % products.length];
          productIdx++;
          topic = `${typeObj.emoji} Огляд: ${product}`;
          text = generateProductPost(product, season, monthName);
          hashtags = [...seasonData.hashtags, '#PROF1Group', '#огляд'].join(' ');
          break;
        }
        case 'tip': {
          const tip = seasonData.tips[tipIdx % seasonData.tips.length];
          tipIdx++;
          topic = `${typeObj.emoji} ${tip}`;
          text = generateTipPost(tip, season);
          hashtags = [...seasonData.hashtags, '#тактичніпоради', '#PROF1Group'].join(' ');
          break;
        }
        case 'seasonal': {
          const item = (focus === 'mixed'
            ? [...seasonData.clothing, ...seasonData.equipment]
            : products)[seasonIdx % products.length];
          seasonIdx++;
          topic = `${typeObj.emoji} Сезонне: ${item}`;
          text = generateSeasonalPost(item, season, monthName);
          hashtags = [...seasonData.hashtags, '#PROF1Group', `#${season}`].join(' ');
          break;
        }
        case 'promo': {
          const promoTpl = PROMO_TEMPLATES[promoIdx % PROMO_TEMPLATES.length];
          promoIdx++;
          const filled = promoTpl
            .replace('{category}', products[productIdx % products.length])
            .replace('{brand}', ['5.11 Tactical', 'LOWA', 'P1G', 'P1G-Tac'][promoIdx % 4])
            .replace('{season}', monthName);
          topic = `${typeObj.emoji} ${filled}`;
          text = generatePromoPost(filled, season);
          hashtags = '#акція #знижки #PROF1Group #military ' + seasonData.hashtags[0];
          break;
        }
        case 'story': {
          const storyTopic = BRAND_CONTENT[brandIdx % BRAND_CONTENT.length];
          brandIdx++;
          topic = `${typeObj.emoji} ${storyTopic}`;
          text = generateBrandPost(storyTopic);
          hashtags = '#PROF1Group #команда #militarystore #військторг';
          break;
        }
        case 'qa': {
          const qaTopic = QA_TEMPLATES[qaIdx % QA_TEMPLATES.length];
          qaIdx++;
          topic = `${typeObj.emoji} ${qaTopic}`;
          text = generateQAPost(qaTopic);
          hashtags = '#питання #відповідь #PROF1Group #тактика';
          break;
        }
      }

      plan.push({
        day,
        date,
        dayOfWeek,
        typeId,
        typeLabel: typeObj.label,
        cssClass: typeObj.cssClass,
        topic,
        text,
        hashtags
      });
    }

    return {
      month,
      year,
      monthName,
      season,
      focus,
      posts: plan
    };
  }

  // ─── Post text generators ─────────────────────────────────────────────────

  function generateProductPost(product, season, month) {
    const intros = [
      `Сьогодні розглядаємо один із найпопулярніших товарів нашого магазину — **${product}**.`,
      `**${product}** — це вибір тих, хто цінує якість і надійність у польових умовах.`,
      `Представляємо вашій увазі **${product}** — перевірене рішення для сучасного воїна.`
    ];
    const bodies = {
      winter: `Цієї зими особливо актуально мати надійне спорядження. Тестували в екстремальних умовах — результат вражає.`,
      spring: `Весняний сезон — час оновлювати спорядження. Цей товар ідеально підходить для мінливої весняної погоди.`,
      summer: `Спека не перешкода, якщо є правильне спорядження. Легкість, зручність і надійність в одному.`,
      autumn: `Осінь — сезон підготовки. Цей товар допоможе залишатися ефективним навіть у найскладніших умовах.`
    };

    return `${intros[Math.floor(Math.random() * intros.length)]}\n\n${bodies[season]}\n\n✅ В наявності в усіх магазинах PROF1Group\n🛒 Замовляй на prof1group.ua\n📍 Магазини в Києві, Львові, Харкові та інших містах`;
  }

  function generateTipPost(tip, season) {
    return `💡 **${tip}**\n\nПрактична порада від фахівців PROF1Group:\n\nЗнання правильного вибору та догляду за спорядженням може суттєво вплинути на ефективність у польових умовах.\n\n🔗 Деталі та широкий асортимент — на prof1group.ua\n\n👇 Ділись своїм досвідом у коментарях!`;
  }

  function generateSeasonalPost(item, season, month) {
    const seasonUA = { winter: 'Зима', spring: 'Весна', summer: 'Літо', autumn: 'Осінь' };
    return `📆 **${seasonUA[season]} ${month} — час для ${item}!**\n\nСезонне спорядження — не просто данина моді, а практична необхідність. Обирай правильно, щоб бути ефективним у будь-яких умовах.\n\n✔️ Великий вибір\n✔️ Гарантія якості\n✔️ Консультація фахівців\n\n🛒 prof1group.ua`;
  }

  function generatePromoPost(promo, season) {
    return `🏷️ **${promo}**\n\nНе пропусти вигідну пропозицію від PROF1Group! Обмежена кількість товарів за спеціальними цінами.\n\n⏰ Акція діє обмежений час\n🛒 Деталі на prof1group.ua\n📞 Консультація: зателефонуй або напиши нам`;
  }

  function generateBrandPost(topic) {
    return `🏪 **${topic}**\n\nPROF1Group — це 20+ років досвіду на ринку тактичного спорядження України. Ми пишаємося кожним клієнтом і кожним відвантаженим замовленням.\n\n❤️ Дякуємо за довіру!\n\n🌐 prof1group.ua`;
  }

  function generateQAPost(question) {
    return `❓ **${question}**\n\nЦе одне з найпоширеніших питань наших клієнтів. Наші фахівці підготували детальну відповідь з посиланням на конкретні товари.\n\n📖 Читай повний огляд на нашому сайті\n💬 Ставте свої питання в коментарях — відповімо!\n\n🛒 prof1group.ua`;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function getDayOfWeek(date) {
    const days = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[date.getDay()];
  }

  // ─── CSV Export ───────────────────────────────────────────────────────────

  function toCSV(plan) {
    const header = ['День', 'Дата', 'День тижня', 'Тип', 'Тема', 'Текст поста', 'Хештеги'];
    const rows = plan.posts.map(p => [
      p.day,
      p.date,
      p.dayOfWeek,
      p.typeLabel,
      p.topic,
      `"${p.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      p.hashtags
    ]);

    return [header, ...rows]
      .map(r => r.join('\t'))
      .join('\n');
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  return { generate, toCSV, POST_TYPES };

})();
