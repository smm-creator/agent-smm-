import { useState } from 'react';
import { LayoutDashboard, Calendar, Lightbulb, Settings, Sparkles, ChevronRight, BarChart3 } from 'lucide-react';
import useStore from './store/useStore';
import SetupWizard from './components/SetupWizard';
import StrategyOverview from './components/StrategyOverview';
import PlatformStrategy from './components/PlatformStrategy';
import ContentCalendar from './components/ContentCalendar';
import PostIdeasGenerator from './components/PostIdeasGenerator';

const TABS = [
  { id: 'overview', label: 'Стратегія', icon: LayoutDashboard },
  { id: 'platforms', label: 'Платформи', icon: BarChart3 },
  { id: 'calendar', label: 'Календар', icon: Calendar },
  { id: 'ideas', label: 'Ідеї', icon: Lightbulb },
];

function Header({ onSettingsClick }) {
  const { brand } = useStore();
  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">SMM Agent</div>
            <div className="text-[10px] text-gray-500 leading-tight">Стратегія контенту</div>
          </div>
        </div>

        {brand.name && (
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-gray-400">{brand.name}</span>
            {brand.niche && (
              <>
                <span className="text-gray-700">/</span>
                <span className="text-gray-500">{brand.niche}</span>
              </>
            )}
          </div>
        )}

        <button onClick={onSettingsClick} className="btn-secondary py-2 px-3 flex items-center gap-1.5 text-sm">
          <Settings size={14} /> Налаштування
        </button>
      </div>
    </header>
  );
}

function NavTabs({ active, onChange }) {
  return (
    <nav className="border-b border-gray-800 bg-gray-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex gap-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-all ${
                  active === tab.id
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const { brand, activeTab, setActiveTab } = useStore();
  const [showSetup, setShowSetup] = useState(!brand.name);

  const handleSetupComplete = () => {
    setShowSetup(false);
    setActiveTab('overview');
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Header onSettingsClick={() => setShowSetup(true)} />

      {showSetup ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          {/* Hero */}
          {!brand.name && (
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 text-sm text-brand-300 mb-6">
                <Sparkles size={14} /> AI-SMM стратег у твоєму браузері
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
                Побудуй SMM стратегію<br />
                <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
                  за 2 хвилини
                </span>
              </h1>
              <p className="text-lg text-gray-400 max-w-xl mx-auto">
                Платформи, типи контенту, пропорції та контент-календар — все в одному місці для Telegram, Instagram, TikTok та інших.
              </p>
            </div>
          )}
          <SetupWizard onComplete={handleSetupComplete} />
        </main>
      ) : (
        <>
          <NavTabs active={activeTab} onChange={setActiveTab} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {activeTab === 'overview' && <StrategyOverview />}
            {activeTab === 'platforms' && <PlatformStrategy />}
            {activeTab === 'calendar' && <ContentCalendar />}
            {activeTab === 'ideas' && <PostIdeasGenerator />}
          </main>
        </>
      )}
    </div>
  );
}
