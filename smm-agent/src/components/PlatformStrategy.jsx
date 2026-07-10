import { useState } from 'react';
import { Clock, Lightbulb, TrendingUp, Edit3, Check } from 'lucide-react';
import { PLATFORMS } from '../data/platforms';
import useStore from '../store/useStore';
import DonutChart from './DonutChart';

function ContentTypeCard({ ct, onPercentChange, editable }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(ct.percent);

  const save = () => {
    onPercentChange(ct.id, Number(val));
    setEditing(false);
  };

  return (
    <div className={`rounded-xl border p-4 ${ct.bgColor} border-white/10 flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{ct.icon}</span>
          <div>
            <div className={`font-semibold text-sm ${ct.textColor}`}>{ct.name}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={10} className="text-gray-500" />
              <span className="text-xs text-gray-500">{ct.bestTime}</span>
            </div>
          </div>
        </div>

        {/* Percent badge */}
        <div className="flex items-center gap-1">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={5}
                max={60}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="w-12 bg-gray-800 border border-gray-600 rounded-lg px-2 py-0.5 text-sm text-white text-center"
              />
              <span className="text-gray-400 text-sm">%</span>
              <button onClick={save} className="text-brand-400 hover:text-brand-300">
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => editable && setEditing(true)}
              className={`flex items-center gap-1 font-bold text-lg px-2 py-0.5 rounded-lg ${ct.textColor} ${editable ? 'hover:bg-white/10 cursor-pointer' : ''}`}
            >
              {ct.percent}%
              {editable && <Edit3 size={10} className="opacity-50" />}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-900/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${ct.percent}%`, backgroundColor: ct.color }}
        />
      </div>

      <p className="text-xs text-gray-400">{ct.description}</p>

      {/* Examples */}
      <div className="flex flex-wrap gap-1.5">
        {ct.examples.map((ex, i) => (
          <span key={i} className="text-xs bg-gray-900/50 text-gray-400 px-2 py-0.5 rounded-md">
            {ex}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PlatformStrategy() {
  const { selectedPlatforms, platformConfigs, updatePlatformConfig, activePlatform, setActivePlatform } = useStore();

  const getPlatformData = (id) => {
    const base = PLATFORMS[id];
    const overrides = platformConfigs[id] || {};
    return {
      ...base,
      contentTypes: base.contentTypes.map(ct => ({
        ...ct,
        ...(overrides.contentTypes?.find(o => o.id === ct.id) || {}),
      })),
    };
  };

  const handlePercentChange = (platformId, typeId, newVal) => {
    const platform = getPlatformData(platformId);
    const updated = platform.contentTypes.map(ct =>
      ct.id === typeId ? { ...ct, percent: newVal } : ct
    );
    updatePlatformConfig(platformId, { contentTypes: updated });
  };

  return (
    <div className="space-y-6">
      {/* Platform tabs */}
      <div className="flex gap-2 flex-wrap">
        {selectedPlatforms.map(id => {
          const p = PLATFORMS[id];
          return (
            <button
              key={id}
              onClick={() => setActivePlatform(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-medium text-sm transition-all ${
                activePlatform === id
                  ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                  : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
              }`}
            >
              <span>{p.icon}</span>
              {p.name}
            </button>
          );
        })}
      </div>

      {selectedPlatforms.map(id => {
        if (id !== activePlatform) return null;
        const platform = getPlatformData(id);

        return (
          <div key={id} className="space-y-6">
            {/* Header card */}
            <div className={`card border ${platform.bgClass} flex flex-col sm:flex-row gap-6`}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">{platform.icon}</span>
                  <div>
                    <h2 className="text-xl font-bold text-white">{platform.name}</h2>
                    <div className={`text-sm font-medium ${platform.textClass}`}>
                      {platform.postsPerDay} публікацій на день
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-gray-500" />
                    <span className="text-sm text-gray-400">
                      <span className="text-white font-semibold">{platform.postsPerDay * 7}</span> постів/тиждень
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lightbulb size={14} className="text-gray-500" />
                    <span className="text-sm text-gray-400">
                      <span className="text-white font-semibold">{platform.contentTypes.length}</span> типи контенту
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-3">
                  {platform.contentTypes.map(ct => (
                    <div key={ct.id} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ct.color }} />
                      <span className="text-xs text-gray-400">{ct.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Donut chart */}
              <div className="w-full sm:w-48 flex-shrink-0">
                <DonutChart data={platform.contentTypes} />
              </div>
            </div>

            {/* Content type cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Типи контенту та пропорції</h3>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Edit3 size={11} /> Клікни на % щоб редагувати
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {platform.contentTypes.map(ct => (
                  <ContentTypeCard
                    key={ct.id}
                    ct={ct}
                    editable
                    onPercentChange={(typeId, val) => handlePercentChange(id, typeId, val)}
                  />
                ))}
              </div>
            </div>

            {/* Daily schedule */}
            <DailySchedule platform={platform} />
          </div>
        );
      })}
    </div>
  );
}

function DailySchedule({ platform }) {
  const schedule = platform.contentTypes.slice(0, platform.postsPerDay);

  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Clock size={16} className="text-brand-400" />
        Щоденний розклад публікацій
      </h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-800" />
        <div className="space-y-4">
          {schedule.map((ct, idx) => (
            <div key={ct.id} className="flex items-start gap-4 relative pl-10">
              <div
                className="absolute left-2.5 w-3 h-3 rounded-full border-2 border-gray-900 top-1"
                style={{ backgroundColor: ct.color }}
              />
              <div className="flex-1 bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{ct.icon}</span>
                    <span className={`font-semibold text-sm ${ct.textColor}`}>{ct.name}</span>
                  </div>
                  <span className="text-xs font-mono bg-gray-800 text-gray-400 px-2 py-0.5 rounded-lg">
                    {ct.bestTime}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{ct.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
