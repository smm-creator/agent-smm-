import { Target, TrendingUp, Users, Mic2, CheckCircle2, AlertCircle } from 'lucide-react';
import { PLATFORMS, CONTENT_PILLARS } from '../data/platforms';
import useStore from '../store/useStore';

const GOAL_LABELS = {
  awareness: 'Впізнаваність бренду',
  sales: 'Збільшення продажів',
  community: 'Побудова спільноти',
  expertise: 'Позиціонування як експерта',
};

const TONE_LABELS = {
  friendly: 'Дружній та теплий',
  professional: 'Професійний та авторитетний',
  inspiring: 'Надихаючий та мотивуючий',
  educational: 'Навчальний та структурований',
};

const PILLARS_BY_GOAL = {
  awareness: [
    { id: 'entertainment', percent: 35 },
    { id: 'educational', percent: 30 },
    { id: 'personal', percent: 20 },
    { id: 'sales', percent: 10 },
    { id: 'ugc', percent: 5 },
  ],
  sales: [
    { id: 'sales', percent: 35 },
    { id: 'ugc', percent: 25 },
    { id: 'educational', percent: 20 },
    { id: 'entertainment', percent: 15 },
    { id: 'personal', percent: 5 },
  ],
  community: [
    { id: 'personal', percent: 35 },
    { id: 'entertainment', percent: 25 },
    { id: 'ugc', percent: 20 },
    { id: 'educational', percent: 15 },
    { id: 'sales', percent: 5 },
  ],
  expertise: [
    { id: 'educational', percent: 45 },
    { id: 'personal', percent: 20 },
    { id: 'ugc', percent: 15 },
    { id: 'sales', percent: 15 },
    { id: 'entertainment', percent: 5 },
  ],
};

function PillarBar({ pillar, percent }) {
  const data = CONTENT_PILLARS.find(p => p.id === pillar.id);
  if (!data) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xl w-7 text-center">{data.icon}</span>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className={`text-sm font-medium ${data.color}`}>{data.name}</span>
          <span className="text-sm text-gray-400">{percent}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${percent}%`,
              background: 'linear-gradient(90deg, #5c69f0, #7c3aed)',
            }}
          />
        </div>
        <div className="text-xs text-gray-600 mt-0.5">{data.desc}</div>
      </div>
    </div>
  );
}

export default function StrategyOverview() {
  const { brand, selectedPlatforms, platformConfigs } = useStore();

  const pillars = PILLARS_BY_GOAL[brand.goal] || PILLARS_BY_GOAL.awareness;

  const totalPostsPerWeek = selectedPlatforms.reduce((sum, id) => {
    return sum + (PLATFORMS[id]?.postsPerDay || 0) * 7;
  }, 0);

  const completeness = [
    { label: 'Назва бренду', done: !!brand.name },
    { label: 'Ніша', done: !!brand.niche },
    { label: 'УТП', done: !!brand.usp },
    { label: 'Цільова аудиторія', done: !!brand.targetAudience },
    { label: 'Tone of Voice', done: !!brand.tone },
    { label: 'Мета стратегії', done: !!brand.goal },
    { label: 'Платформи (2+)', done: selectedPlatforms.length >= 2 },
  ];
  const doneCount = completeness.filter(c => c.done).length;
  const pct = Math.round((doneCount / completeness.length) * 100);

  return (
    <div className="space-y-6">
      {/* Brand card */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{brand.name || 'Ваш бренд'}</h2>
            <div className="text-gray-400 mt-0.5">{brand.niche || 'Ніша не вказана'}</div>
          </div>
          <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-4 py-2">
            <div className="text-2xl font-bold text-brand-400">{pct}%</div>
            <div className="text-xs text-gray-400">заповнено</div>
          </div>
        </div>

        {brand.usp && (
          <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4 mb-4">
            <div className="text-xs text-brand-400 font-medium mb-1 uppercase tracking-wide">УТП</div>
            <p className="text-gray-300 text-sm">{brand.usp}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoBlock icon={<Target size={16} />} label="Мета" value={GOAL_LABELS[brand.goal] || '—'} />
          <InfoBlock icon={<Mic2 size={16} />} label="Тон" value={TONE_LABELS[brand.tone] || '—'} />
          <InfoBlock icon={<Users size={16} />} label="Аудиторія" value={brand.targetAudience || '—'} truncate />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: '📅', value: totalPostsPerWeek, label: 'Постів/тиждень' },
          { icon: '📱', value: selectedPlatforms.length, label: 'Платформи' },
          { icon: '🎯', value: totalPostsPerWeek * 4, label: 'Постів/місяць' },
          { icon: '🧩', value: '4', label: 'Типи контенту' },
        ].map((kpi, i) => (
          <div key={i} className="card text-center py-4">
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <div className="text-2xl font-bold text-white">{kpi.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Content pillars */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp size={18} className="text-brand-400" />
          <h3 className="font-bold text-white">Пропорції контентних стовпів</h3>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          Оптимальний розподіл для цілі "<span className="text-white">{GOAL_LABELS[brand.goal]}</span>"
        </p>
        <div className="space-y-4">
          {pillars.map(p => (
            <PillarBar key={p.id} pillar={p} percent={p.percent} />
          ))}
        </div>
      </div>

      {/* Platforms summary */}
      <div className="card">
        <h3 className="font-bold text-white mb-4">Платформи у стратегії</h3>
        <div className="space-y-3">
          {selectedPlatforms.map(id => {
            const p = PLATFORMS[id];
            return (
              <div key={id} className={`flex items-center justify-between p-4 rounded-xl border ${p.bgClass}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <div className={`font-semibold ${p.textClass}`}>{p.name}</div>
                    <div className="text-xs text-gray-400">
                      {p.postsPerDay} постів/день · {p.contentTypes.length} типи контенту
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">{p.postsPerDay * 7}</div>
                  <div className="text-xs text-gray-500">постів/тиждень</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completeness checklist */}
      <div className="card">
        <h3 className="font-bold text-white mb-4">Заповненість профілю</h3>
        <div className="space-y-2">
          {completeness.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              {item.done
                ? <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                : <AlertCircle size={16} className="text-gray-600 flex-shrink-0" />
              }
              <span className={`text-sm ${item.done ? 'text-gray-300' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ icon, label, value, truncate }) {
  return (
    <div className="bg-gray-800/50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
        {icon} {label}
      </div>
      <div className={`text-sm text-white font-medium ${truncate ? 'line-clamp-2' : ''}`}>
        {value}
      </div>
    </div>
  );
}
