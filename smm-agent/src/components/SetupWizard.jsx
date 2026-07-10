import { useState } from 'react';
import { ChevronRight, Sparkles, Target, Users, Mic2, Zap } from 'lucide-react';
import useStore from '../store/useStore';
import { PLATFORMS } from '../data/platforms';

const TONES = [
  { id: 'friendly', label: 'Дружній', emoji: '😊', desc: 'Тепло, з гумором, близько до аудиторії' },
  { id: 'professional', label: 'Професійний', emoji: '💼', desc: 'Чітко, по суті, з авторитетом' },
  { id: 'inspiring', label: 'Надихаючий', emoji: '✨', desc: 'Мотивація, енергія, позитив' },
  { id: 'educational', label: 'Навчальний', emoji: '🎓', desc: 'Інформативно, структуровано, детально' },
];

const GOALS = [
  { id: 'awareness', label: 'Впізнаваність', emoji: '📢', desc: 'Розширити аудиторію та охоплення' },
  { id: 'sales', label: 'Продажі', emoji: '💰', desc: 'Конвертувати підписників у клієнтів' },
  { id: 'community', label: 'Спільнота', emoji: '❤️', desc: 'Залученість та лояльність аудиторії' },
  { id: 'expertise', label: 'Експертність', emoji: '🏆', desc: 'Стати лідером думок у ніші' },
];

export default function SetupWizard({ onComplete }) {
  const { brand, setBrand, selectedPlatforms, togglePlatform } = useStore();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else onComplete();
  };

  const canProceed = () => {
    if (step === 1) return brand.name.trim() && brand.niche.trim();
    if (step === 2) return brand.targetAudience.trim() && brand.tone;
    if (step === 3) return selectedPlatforms.length > 0 && brand.goal;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center gap-3 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              i + 1 < step ? 'bg-brand-600 text-white' :
              i + 1 === step ? 'bg-brand-500 text-white ring-4 ring-brand-500/30' :
              'bg-gray-800 text-gray-500'
            }`}>
              {i + 1 < step ? '✓' : i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div className={`flex-1 h-0.5 transition-all ${i + 1 < step ? 'bg-brand-600' : 'bg-gray-800'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Brand info */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Розкажи про свій бренд</h2>
            <p className="text-gray-400">Базова інформація для побудови стратегії</p>
          </div>

          <div>
            <label className="label">Назва бренду / проекту</label>
            <input
              className="input"
              placeholder="Наприклад: CoffeeBloom, Агенція NextLevel, Аня Коваль..."
              value={brand.name}
              onChange={(e) => setBrand({ name: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Ніша / сфера діяльності</label>
            <input
              className="input"
              placeholder="Наприклад: кав'ярня, онлайн-курси з маркетингу, handmade прикраси..."
              value={brand.niche}
              onChange={(e) => setBrand({ niche: e.target.value })}
            />
          </div>

          <div>
            <label className="label">УТП — Унікальна торгова пропозиція</label>
            <textarea
              className="input resize-none h-24"
              placeholder="Що робить тебе особливим? Чому клієнти обирають тебе?"
              value={brand.usp}
              onChange={(e) => setBrand({ usp: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Step 2: Audience & tone */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Аудиторія та тон</h2>
            <p className="text-gray-400">Для кого ти пишеш і яким голосом</p>
          </div>

          <div>
            <label className="label">Цільова аудиторія</label>
            <textarea
              className="input resize-none h-24"
              placeholder="Жінки 25–35 років, підприємці, що хочуть масштабувати бізнес..."
              value={brand.targetAudience}
              onChange={(e) => setBrand({ targetAudience: e.target.value })}
            />
          </div>

          <div>
            <label className="label flex items-center gap-2"><Mic2 size={14} /> Tone of Voice</label>
            <div className="grid grid-cols-2 gap-3">
              {TONES.map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => setBrand({ tone: tone.id })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    brand.tone === tone.id
                      ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{tone.emoji}</div>
                  <div className="font-semibold text-white text-sm">{tone.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{tone.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Platforms & goal */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Платформи та мета</h2>
            <p className="text-gray-400">Де публікуємо та чого хочемо досягти</p>
          </div>

          <div>
            <label className="label flex items-center gap-2"><Zap size={14} /> Соціальні мережі</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.values(PLATFORMS).map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedPlatforms.includes(platform.id)
                      ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{platform.icon}</div>
                  <div className="font-semibold text-white text-sm">{platform.name}</div>
                  <div className="text-xs text-gray-400">{platform.postsPerDay} пост/день</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-2"><Target size={14} /> Головна мета</label>
            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setBrand({ goal: goal.id })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    brand.goal === goal.id
                      ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{goal.emoji}</div>
                  <div className="font-semibold text-white text-sm">{goal.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{goal.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="btn-secondary">
            ← Назад
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleNext}
          disabled={!canProceed()}
          className={`btn-primary flex items-center gap-2 ${!canProceed() ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {step === totalSteps ? (
            <><Sparkles size={16} /> Створити стратегію</>
          ) : (
            <>Далі <ChevronRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  );
}
