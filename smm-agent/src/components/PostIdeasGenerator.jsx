import { useState } from 'react';
import { Sparkles, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Wand2, Loader2 } from 'lucide-react';
import { PLATFORMS } from '../data/platforms';
import useStore from '../store/useStore';
import { generatePost } from '../services/api';

const IDEAS_LIBRARY = {
  telegram: {
    photo: [
      { title: 'Фото процесу', body: '📸 Ось так виглядає наш [процес/продукт] зсередини.\n\nЛаштунки, які мало хто бачить, але ми хочемо бути відкритими з вами.\n\n👇 Напиши в коментарях — що тебе найбільше здивувало?' },
      { title: 'Результат клієнта', body: '✅ Результат нашого клієнта — [Ім\'я]\n\n[Коротко проблема] → [Результат після роботи з нами]\n\n"Цитата клієнта" — [Ім\'я]\n\n💬 Хочеш такий самий результат? Пиши нам!' },
      { title: 'Команда', body: '👥 Знайомтесь — команда [Назва бренду]!\n\nНам [кількість] осіб, і кожен — профі у своїй справі.\n\n[Факт про команду або цінності]\n\nЯкого учасника команди хочеш побачити ближче? 👇' },
    ],
    story: [
      { title: 'Опитування ЦА', body: '📊 ОПИТУВАННЯ ДНЯ\n\nЯка для тебе головна проблема в [ніша]?\n\n◻️ [Проблема 1]\n◻️ [Проблема 2]\n◻️ [Проблема 3]\n◻️ Інша (напиши в коментарях)\n\nВідповідаю кожному!' },
      { title: 'Факт по ніші', body: '🤯 ЦИ ТИ ЗНАВ?\n\n[Несподіваний факт про твою нішу]\n\nА ще: [другий цікавий факт]\n\nЗберігай, щоб не забути → 📌' },
      { title: 'Вікторина', body: '❓ ВІКТОРИНА!\n\nЯке твердження ПРАВДА про [тема]?\n\nА) [Варіант 1]\nБ) [Варіант 2]\nВ) [Варіант 3]\n\nПиши відповідь букву у коментарях — перевіримо разом!' },
    ],
    sales: [
      { title: 'Оффер дня', body: '🔥 ПРОПОЗИЦІЯ ДНЯ\n\n[Назва продукту/послуги] — [Головна вигода]\n\n✅ [Перевага 1]\n✅ [Перевага 2]\n✅ [Перевага 3]\n\n💰 Ціна: [Ціна] → Тільки сьогодні: [Ціна зі знижкою]\n\nПиши "+" у коментарях — надішлю деталі!' },
      { title: 'Кейс клієнта', body: '📈 КЕЙС: від [Результат ДО] до [Результат ПІСЛЯ]\n\nКлієнт [Ім\'я] звернувся до нас з проблемою:\n"[Формулювання проблеми]"\n\nЩо ми зробили:\n1️⃣ [Крок 1]\n2️⃣ [Крок 2]\n3️⃣ [Крок 3]\n\nРезультат: [Конкретний результат]\n\n💬 Хочеш так само? Пиши нам — обговоримо!' },
      { title: 'Відгук + CTA', body: '⭐ Відгук від [Ім\'я клієнта]\n\n"[Цитата відгуку — бажано деталізована, з конкретним результатом]"\n\n🏆 Ось чому наші клієнти повертаються:\n• [Причина 1]\n• [Причина 2]\n\nЗалишилось [X] місць на цей місяць.\n👉 [Посилання / Напиши нам]' },
    ],
    humor: [
      { title: 'Мем по ніші', body: '😂 Коли [ситуація у твоїй ніші, яка буде знайома аудиторії]\n\n[Реакція / жарт]\n\n🔁 Перешли другу — він зрозуміє!' },
      { title: 'Правда vs Очікування', body: '📌 Очікування vs Реальність у [ніша]\n\nОчікування: [Ідеалізоване уявлення]\nРеальність: [Смішна/чесна правда]\n\n😅 Хто впізнав себе — лайк! 👍' },
      { title: 'Список "If you know"', body: '📋 Ти точно [у ніші/сфері], якщо...\n\n✔️ [Пункт 1]\n✔️ [Пункт 2]\n✔️ [Пункт 3]\n✔️ [Пункт 4]\n✔️ [Пункт 5]\n\nСкільки з 5 про тебе? Пиши цифру 👇' },
    ],
  },
  instagram: {
    carousel: [
      { title: 'Топ-5 порад', body: 'Слайд 1: 🔥 5 секретів [теми], які змінять твій підхід\n\nСлайд 2-6: [Порада + коротке пояснення на кожному слайді]\n\nСлайд 7: ✅ Збережи цей пост, щоб не загубити!\n\nCaption: Яка порада тебе здивувала найбільше? Пиши в коментарях ↓' },
      { title: 'До/Після', body: 'Слайд 1: ❌ Як НЕ треба робити [дія]\n\nСлайд 2: Фото/скрін "ДО"\n\nСлайд 3: ✅ Як ТРЕБА робити\n\nСлайд 4: Фото/скрін "ПІСЛЯ"\n\nСлайд 5: 📌 Головні висновки\n\nCaption: Яка трансформація тебе вразила? 👇' },
    ],
    reel: [
      { title: 'Лайфхак 30 сек', body: 'Хук (0-3 сек): "Ніколи не роби [помилка] в [ніша]!\n\nТіло (3-25 сек): Швидкий показ правильного підходу\n\nCTA (25-30 сек): Зберігай, щоб не забути + підписуйся\n\nCaption: Рятую від [проблема] 😅 Зберігай та ділись!' },
    ],
    stories: [
      { title: 'Q&A сторіс', body: 'Слайд 1: "ПИТАЙ МЕНЕ ПРО [ТЕМА]" + стікер питань\n\nСлайд 2-5: Відповіді на питання підписників\n\nСлайд 6: "Що запитати завтра?" + стікер питань' },
    ],
    post: [
      { title: 'Цитата', body: '"[Надихаюча цитата по ніші або авторська думка]"\n\n— [Автор або @твій_нік]\n\nCaption: Ця думка змінила мій підхід до [тема]. А твій улюблений вислів? ↓' },
    ],
  },
};

function IdeaCard({ idea, platformId, contentTypeId, brand }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const platform = PLATFORMS[platformId];
  const contentType = platform?.contentTypes.find(ct => ct.id === contentTypeId);

  const personalized = idea.body
    .replace(/\[Назва бренду\]/g, brand.name || 'Ваш бренд')
    .replace(/\[ніша\]/g, brand.niche || 'вашої ніші')
    .replace(/\[нішу\]/g, brand.niche || 'вашу нішу')
    .replace(/\[ніші\]/g, brand.niche || 'вашої ніші');

  const displayText = aiText || personalized;

  const copyText = async () => {
    await navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateAI = async () => {
    setAiLoading(true);
    setExpanded(true);
    try {
      const result = await generatePost(
        brand,
        platform?.name,
        contentType?.name
      );
      setAiText(result.text);
    } catch {
      setAiText('⚠️ AI недоступний. Переконайтесь, що OPENAI_API_KEY налаштований у .env файлі.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="card border-gray-800 hover:border-gray-700 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{contentType?.icon}</span>
          <div>
            <div className={`text-xs font-medium ${contentType?.textColor}`}>
              {platform?.icon} {platform?.name} · {contentType?.name}
            </div>
            <div className="font-semibold text-white text-sm mt-0.5">{idea.title}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateAI}
            disabled={aiLoading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-brand-500/40 bg-brand-500/10 text-brand-300 hover:bg-brand-500/20 transition-all disabled:opacity-50"
            title="Згенерувати через AI"
          >
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
            AI
          </button>
          <button
            onClick={copyText}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              copied
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
            }`}
          >
            {copied ? <><Check size={12} /> Скопійовано</> : <><Copy size={12} /> Копіювати</>}
          </button>
        </div>
      </div>

      {aiText && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-brand-400">
          <Wand2 size={10} /> Згенеровано AI
        </div>
      )}

      <div
        className={`bg-gray-800/50 rounded-xl p-3 font-mono text-xs text-gray-300 leading-relaxed transition-all overflow-hidden ${
          expanded ? '' : 'max-h-24'
        }`}
        style={{ whiteSpace: 'pre-line' }}
      >
        {aiLoading ? (
          <div className="flex items-center gap-2 text-brand-400">
            <Loader2 size={14} className="animate-spin" />
            Генерую унікальний текст для {brand.name}...
          </div>
        ) : displayText}
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 mt-2 transition-colors"
      >
        {expanded ? <><ChevronUp size={12} /> Згорнути</> : <><ChevronDown size={12} /> Розгорнути</>}
      </button>
    </div>
  );
}

export default function PostIdeasGenerator() {
  const { selectedPlatforms, brand } = useStore();
  const [activePlatform, setActivePlatform] = useState(selectedPlatforms[0]);
  const [activeType, setActiveType] = useState('all');

  const platform = PLATFORMS[activePlatform];
  const platformIdeas = IDEAS_LIBRARY[activePlatform] || {};

  const filteredIdeas = [];
  Object.entries(platformIdeas).forEach(([typeId, ideas]) => {
    if (activeType === 'all' || activeType === typeId) {
      ideas.forEach(idea => filteredIdeas.push({ idea, typeId }));
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Ідеї для постів</h2>
        <p className="text-sm text-gray-400 mt-0.5">Готові шаблони для кожного типу контенту</p>
      </div>

      {/* Platform selector */}
      <div className="flex gap-2 flex-wrap">
        {selectedPlatforms.map(id => (
          <button
            key={id}
            onClick={() => { setActivePlatform(id); setActiveType('all'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-medium text-sm transition-all ${
              activePlatform === id
                ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
            }`}
          >
            {PLATFORMS[id].icon} {PLATFORMS[id].name}
          </button>
        ))}
      </div>

      {/* Content type filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveType('all')}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
            activeType === 'all' ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-600'
          }`}
        >
          Всі типи
        </button>
        {platform?.contentTypes.map(ct => (
          <button
            key={ct.id}
            onClick={() => setActiveType(ct.id)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${
              activeType === ct.id
                ? `border-transparent ${ct.bgColor} ${ct.textColor}`
                : 'border-gray-700 text-gray-500 hover:border-gray-600'
            }`}
          >
            {ct.icon} {ct.name}
          </button>
        ))}
      </div>

      {/* Ideas grid */}
      {filteredIdeas.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredIdeas.map(({ idea, typeId }, i) => (
            <IdeaCard
              key={i}
              idea={idea}
              platformId={activePlatform}
              contentTypeId={typeId}
              brand={brand}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-gray-400">Ідеї для цього типу контенту ще додаються</div>
          <div className="text-sm text-gray-600 mt-1">Обери інший тип або платформу</div>
        </div>
      )}

      {/* Prompt tips */}
      <div className="card border-brand-500/20 bg-brand-500/5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <div className="font-semibold text-white mb-1">Як адаптувати шаблон?</div>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>Замінюй текст у [дужках] на свої дані</li>
              <li>Додай локальний контекст та специфіку своєї ніші</li>
              <li>Зроби CTA конкретним — посилання, номер, "@менеджер"</li>
              <li>Тестуй різні хуки на початку та міряй залученість</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
