import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { PLATFORMS, WEEK_DAYS } from '../data/platforms';
import useStore from '../store/useStore';

const generateWeekCalendar = (selectedPlatforms, platformConfigs) => {
  const weeks = [];

  for (let day = 0; day < 7; day++) {
    const dayPosts = [];

    selectedPlatforms.forEach(platformId => {
      const base = PLATFORMS[platformId];
      const overrides = platformConfigs[platformId] || {};
      const contentTypes = base.contentTypes.map(ct => ({
        ...ct,
        ...(overrides.contentTypes?.find(o => o.id === ct.id) || {}),
      }));

      const postsForDay = contentTypes.slice(0, base.postsPerDay);
      postsForDay.forEach(ct => {
        dayPosts.push({
          platformId,
          platform: base,
          contentType: ct,
          id: `${platformId}-${ct.id}-day${day}`,
          text: '',
        });
      });
    });

    weeks.push({ day, posts: dayPosts });
  }

  return weeks;
};

function PostChip({ post, onRemove }) {
  const { platform, contentType } = post;
  return (
    <div
      className="group flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border border-white/10 transition-all hover:border-white/20"
      style={{ backgroundColor: `${contentType.color}15` }}
    >
      <span className="text-base leading-none">{contentType.icon}</span>
      <div className="min-w-0">
        <div className="text-white/80 truncate max-w-[80px]">{contentType.name}</div>
        <div className="text-white/40 text-[10px]">{platform.icon} {contentType.bestTime}</div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

export default function ContentCalendar() {
  const { selectedPlatforms, platformConfigs } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [customPosts, setCustomPosts] = useState({});

  const weekData = generateWeekCalendar(selectedPlatforms, platformConfigs);

  const getWeekLabel = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const fmt = (d) => d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  const getDayDate = (dayIndex) => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7 + dayIndex);
    return start;
  };

  const isToday = (dayIndex) => {
    const d = getDayDate(dayIndex);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  const totalPosts = weekData.reduce((sum, d) => sum + d.posts.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Контент-календар</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {totalPosts} публікацій на тиждень · {selectedPlatforms.length} платформ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="btn-secondary p-2">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-300 min-w-[160px] text-center">
            {getWeekLabel()}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="btn-secondary p-2">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Platform legend */}
      <div className="flex flex-wrap gap-3">
        {selectedPlatforms.map(id => {
          const p = PLATFORMS[id];
          return (
            <div key={id} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border ${p.bgClass}`}>
              <span>{p.icon}</span>
              <span className={p.textClass}>{p.name}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">{p.postsPerDay}/день</span>
            </div>
          );
        })}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekData.map(({ day, posts }) => {
          const date = getDayDate(day);
          const today = isToday(day);
          const dayCustom = customPosts[day] || [];

          return (
            <div
              key={day}
              className={`rounded-xl border p-2 min-h-[200px] flex flex-col gap-1.5 transition-colors ${
                today
                  ? 'border-brand-500/50 bg-brand-500/5'
                  : 'border-gray-800 bg-gray-900/50'
              }`}
            >
              {/* Day header */}
              <div className={`text-center pb-1.5 border-b border-gray-800 mb-0.5`}>
                <div className={`text-xs font-medium ${today ? 'text-brand-400' : 'text-gray-500'}`}>
                  {WEEK_DAYS[day]}
                </div>
                <div className={`text-sm font-bold ${today ? 'text-white' : 'text-gray-400'}`}>
                  {date.getDate()}
                </div>
                {today && (
                  <div className="text-[10px] text-brand-400 font-medium">Сьогодні</div>
                )}
              </div>

              {/* Posts */}
              <div className="flex flex-col gap-1 flex-1">
                {posts.map(post => (
                  <PostChip key={post.id} post={post} />
                ))}
                {dayCustom.map((post, i) => (
                  <PostChip
                    key={`custom-${i}`}
                    post={post}
                    onRemove={() => {
                      setCustomPosts(prev => ({
                        ...prev,
                        [day]: prev[day].filter((_, idx) => idx !== i),
                      }));
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly stats */}
      <WeeklyStats weekData={weekData} selectedPlatforms={selectedPlatforms} />
    </div>
  );
}

function WeeklyStats({ weekData, selectedPlatforms }) {
  const allPosts = weekData.flatMap(d => d.posts);
  const byType = {};

  allPosts.forEach(post => {
    const key = post.contentType.name;
    byType[key] = (byType[key] || 0) + 1;
  });

  const total = allPosts.length;

  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4">Статистика тижня</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="text-3xl font-bold text-white">{total}</div>
          <div className="text-sm text-gray-400 mt-1">Постів на тиждень</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="text-3xl font-bold text-white">{(total / 7).toFixed(1)}</div>
          <div className="text-sm text-gray-400 mt-1">Постів на день (avg)</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="text-3xl font-bold text-white">{total * 4}</div>
          <div className="text-sm text-gray-400 mt-1">Постів на місяць</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="text-3xl font-bold text-white">{selectedPlatforms.length}</div>
          <div className="text-sm text-gray-400 mt-1">Активних платформ</div>
        </div>
      </div>

      {/* By type breakdown */}
      <div className="space-y-2">
        {Object.entries(byType).map(([type, count]) => {
          const pct = Math.round((count / total) * 100);
          const post = allPosts.find(p => p.contentType.name === type);
          return (
            <div key={type} className="flex items-center gap-3">
              <span className="text-lg w-6">{post?.contentType.icon}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-300">{type}</span>
                  <span className="text-sm text-gray-400">{count} · {pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: post?.contentType.color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
