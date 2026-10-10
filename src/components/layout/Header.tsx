import React, { useState, useRef } from 'react';
import {
  Activity,
  BookOpen,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Columns3,
  Cpu,
  Expand,
  Eye,
  FileCode,
  Gauge,
  Layers,
  Layout,
  LayoutGrid,
  Maximize2,
  Moon,
  Palette,
  PanelBottom,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import { OptimizationLevel } from '../../types';
import { SAMPLE_PROGRAMS } from '../../data/samplePrograms';
import { AppTheme, THEME_OPTIONS, useTheme } from '../../context/ThemeContext';
import { LayoutPreset, PanelId } from '../../types/docking';
import { ThemeCustomizerModal } from '../modals/ThemeCustomizerModal';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  optimizationLevel: OptimizationLevel;
  setOptimizationLevel: (level: OptimizationLevel) => void;
  kRegisters: number;
  setKRegisters: (k: number) => void;
  onCompile: () => void;
  onSelectSample: (code: string) => void;
  compilationTimeMs?: number;
  hasErrors?: boolean;
  layoutPreset: LayoutPreset;
  setLayoutPreset: (preset: LayoutPreset) => void;
  onResetLayout?: () => void;
  isExplorerOpen?: boolean;
  onToggleExplorer?: () => void;
  maximizedPanel?: PanelId | null;
  onSetMaximizedPanel?: (panel: PanelId | null) => void;
  onOpenDocs?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  optimizationLevel,
  setOptimizationLevel,
  kRegisters,
  setKRegisters,
  onCompile,
  onSelectSample,
  compilationTimeMs,
  hasErrors,
  layoutPreset,
  setLayoutPreset,
  onResetLayout,
  isExplorerOpen,
  onToggleExplorer,
  maximizedPanel,
  onSetMaximizedPanel,
  onOpenDocs,
}) => {
  const { theme, setTheme, themeConfig, isLight } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const layoutPresetsList: { id: LayoutPreset; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'vscode-default',
      label: 'VS Code Default',
      icon: <PanelLeft className="w-3.5 h-3.5" />,
      desc: 'Left: Editor & Diagnostics (Split), Right: Visualizer',
    },
    {
      id: 'bottom-dock',
      label: 'Bottom Terminal Dock',
      icon: <PanelBottom className="w-3.5 h-3.5" />,
      desc: 'Top: Editor & Visualizer, Bottom: Full-width Diagnostics',
    },
    {
      id: 'unity-3col',
      label: 'Unity 3-Column',
      icon: <Columns3 className="w-3.5 h-3.5" />,
      desc: 'Col 1: Editor • Col 2: Diagnostics • Col 3: Visualizer',
    },
    {
      id: 'visualizer-left',
      label: 'Visualizer First',
      icon: <Layout className="w-3.5 h-3.5" />,
      desc: 'Left: Visualizer, Right: Editor & Diagnostics',
    },
  ];

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      tabsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header
      style={{ backgroundColor: 'var(--bg-surface)', borderBottomColor: 'var(--border-app)' }}
      className="border-b text-slate-300 shrink-0 select-none"
    >
      <div className="min-h-12 py-1.5 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
        {/* Brand & Explorer Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {onToggleExplorer && (
            <button
              onClick={onToggleExplorer}
              className={`p-1.5 rounded transition cursor-pointer ${
                isExplorerOpen
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={isExplorerOpen ? 'Hide Explorer (Ctrl+B)' : 'Show Explorer (Ctrl+B)'}
            >
              {isExplorerOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          )}

          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center font-black text-white text-xs shadow-md shadow-indigo-600/30 shrink-0 font-mono tracking-tighter">
            D
          </div>
          <div className="flex flex-col select-none shrink-0 justify-center">
            <h1
              style={{ color: 'var(--text-main)' }}
              className="text-xs sm:text-sm font-black tracking-widest uppercase font-mono leading-none flex items-center gap-1.5"
            >
              <span>DERIVA</span>
              <span className="text-slate-500 font-normal text-[9px] tracking-normal hidden md:inline">v1.0</span>
            </h1>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold tracking-wide uppercase leading-tight -mt-0.5">
              Compiler Studio
            </span>
          </div>
        </div>

        {/* Center/Right Controls Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap ml-auto min-w-0">
          {/* User Guide & Manual Button */}
          {onOpenDocs && (
            <button
              id="btn-open-user-guide"
              onClick={onOpenDocs}
              className="flex items-center gap-1.5 text-[11px] bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 px-2 sm:px-2.5 py-1.5 rounded border border-indigo-500/40 transition cursor-pointer font-semibold shadow-sm whitespace-nowrap shrink-0"
              title="Open DERIVA User Guide & Deriva Language Documentation"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="hidden sm:inline">User Guide</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-700/50 font-mono hidden md:inline">
                Docs
              </span>
            </button>
          )}

          {/* Sample Preset Picker */}
          <div className="relative group shrink-0">
            <button
              id="btn-sample-presets"
              className="flex items-center gap-1 text-[11px] bg-[#1a1f2b] hover:bg-slate-800 text-slate-200 px-2 sm:px-2.5 py-1.5 rounded border border-slate-700 transition cursor-pointer whitespace-nowrap"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-medium hidden sm:inline">Presets</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>
            <div className="absolute right-0 mt-1 w-60 sm:w-64 max-w-[calc(100vw-24px)] bg-[#131720] border border-slate-700 rounded-md shadow-2xl py-1 hidden group-hover:block z-50">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 bg-[#0b0e14]/60">
                Standard Programs
              </div>
              {SAMPLE_PROGRAMS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => onSelectSample(sample.code)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-950/60 hover:text-indigo-200 flex flex-col transition border-b border-slate-800/40 last:border-0 cursor-pointer"
                >
                  <span className="font-medium text-slate-200">{sample.name}</span>
                  <span className="text-[10px] text-slate-400">{sample.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Switcher Dropdown */}
          <div className="relative shrink-0">
            <button
              id="btn-theme-switcher"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="flex items-center gap-1.5 text-[11px] bg-[#1a1f2b] hover:bg-slate-800 text-slate-200 px-2 sm:px-2.5 py-1.5 rounded border border-slate-700 transition cursor-pointer whitespace-nowrap"
              title="Change Studio Theme"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-600 shadow-sm"
                style={{ backgroundColor: themeConfig.primaryColor }}
              />
              <span className="hidden sm:inline font-medium">{themeConfig.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {showThemeMenu && (
              <div
                className="absolute right-0 mt-1 w-56 max-w-[calc(100vw-24px)] bg-[#131720] border border-slate-700 rounded-md shadow-2xl py-1 z-50 text-[11px]"
                onMouseLeave={() => setShowThemeMenu(false)}
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 bg-[#0b0e14]/60 flex items-center justify-between">
                  <span>Workspace Themes</span>
                  <Palette className="w-3 h-3 text-indigo-400" />
                </div>
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setShowThemeMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition cursor-pointer ${
                      theme === t.id
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-600"
                        style={{ backgroundColor: t.primaryColor }}
                      />
                      <span>{t.name}</span>
                    </div>
                    {theme === t.id && <Check className="w-3 h-3 text-indigo-400" />}
                  </button>
                ))}

                <div className="border-t border-slate-800 my-1 pt-1">
                  <button
                    onClick={() => {
                      setShowThemeMenu(false);
                      setShowCustomizer(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-indigo-400 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Customize Palette & Contrast...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Layout Presets Switcher Dropdown */}
          <div className="relative shrink-0">
            <button
              id="btn-layout-switcher"
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
              className="flex items-center gap-1.5 text-[11px] bg-[#1a1f2b] hover:bg-slate-800 text-slate-200 px-2 sm:px-2.5 py-1.5 rounded border border-slate-700 transition cursor-pointer whitespace-nowrap"
              title="Change Workspace Layout"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="hidden sm:inline font-medium capitalize">
                {layoutPreset.replace('-', ' ')}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {showLayoutMenu && (
              <div
                className="absolute right-0 mt-1 w-64 max-w-[calc(100vw-24px)] bg-[#131720] border border-slate-700 rounded-md shadow-2xl py-1 z-50 text-[11px]"
                onMouseLeave={() => setShowLayoutMenu(false)}
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 bg-[#0b0e14]/60 flex items-center justify-between">
                  <span>Layout Presets</span>
                  <Layout className="w-3 h-3 text-indigo-400" />
                </div>
                {layoutPresetsList.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setLayoutPreset(preset.id);
                      setShowLayoutMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex flex-col transition cursor-pointer border-b border-slate-800/40 last:border-0 ${
                      layoutPreset === preset.id
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{preset.icon}</span>
                        <span className="text-slate-200 font-medium">{preset.label}</span>
                      </div>
                      {layoutPreset === preset.id && (
                        <Check className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">{preset.desc}</span>
                  </button>
                ))}

                {onResetLayout && (
                  <div className="border-t border-slate-800 pt-1 mt-1">
                    <button
                      onClick={() => {
                        onResetLayout();
                        setShowLayoutMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-rose-400 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Layout & Panel Sizes</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleFullscreenToggle}
            className="p-1.5 rounded bg-[#1a1f2b] hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer hidden md:flex items-center"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Optimizer & Registers Settings */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#1a1f2b] px-2 py-1 rounded border border-slate-700 text-xs">
            <span className="text-slate-400 text-[10px] font-medium">Opt:</span>
            <select
              value={optimizationLevel}
              onChange={(e) => setOptimizationLevel(e.target.value as OptimizationLevel)}
              className="bg-[#0b0e14] text-slate-200 text-[10px] rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none"
            >
              <option value="none">O0 (None)</option>
              <option value="basic">O1 (Basic)</option>
              <option value="full">O2 (Full)</option>
            </select>

            <span className="text-slate-400 text-[10px] font-medium ml-1">Regs:</span>
            <input
              type="number"
              min={2}
              max={16}
              value={kRegisters}
              onChange={(e) => setKRegisters(Math.max(2, Math.min(16, parseInt(e.target.value) || 4)))}
              className="bg-[#0b0e14] text-slate-200 text-[10px] rounded px-1 py-0.5 border border-slate-700 w-10 text-center focus:outline-none"
            />
          </div>

          {/* Mobile Settings Button (< lg) */}
          <div className="relative lg:hidden">
            <button
              onClick={() => setShowMobileSettings(!showMobileSettings)}
              className="p-1.5 rounded bg-[#1a1f2b] hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer flex items-center justify-center"
              title="Compiler & VM Settings"
              aria-label="Compiler & VM Settings"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
            </button>

            {showMobileSettings && (
              <div
                className="absolute right-0 mt-1 w-64 bg-[#131720] border border-slate-700 rounded-lg shadow-2xl p-3 z-50 text-xs space-y-3"
                onMouseLeave={() => setShowMobileSettings(false)}
              >
                <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>Engine Parameters</span>
                  <button
                    onClick={() => setShowMobileSettings(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Optimization:</span>
                  <select
                    value={optimizationLevel}
                    onChange={(e) => setOptimizationLevel(e.target.value as OptimizationLevel)}
                    className="bg-[#0b0e14] text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none"
                  >
                    <option value="none">O0 (None)</option>
                    <option value="basic">O1 (Basic)</option>
                    <option value="full">O2 (Full)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Target Registers:</span>
                  <input
                    type="number"
                    min={2}
                    max={16}
                    value={kRegisters}
                    onChange={(e) => setKRegisters(Math.max(2, Math.min(16, parseInt(e.target.value) || 4)))}
                    className="bg-[#0b0e14] text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 w-16 text-center focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => {
                    handleFullscreenToggle();
                    setShowMobileSettings(false);
                  }}
                  className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-center font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Toggle Fullscreen</span>
                </button>
              </div>
            )}
          </div>

          {/* Compile Button */}
          <button
            id="btn-run-compile"
            onClick={onCompile}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3 py-1.5 rounded font-bold text-xs shadow-sm shadow-emerald-700/30 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>RUN</span>
          </button>

          {/* Compilation Time Metric */}
          {compilationTimeMs !== undefined && (
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-[#0b0e14] border border-slate-800 text-[10px] font-mono whitespace-nowrap shrink-0">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasErrors
                    ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                    : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                }`}
              />
              <span className={hasErrors ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {hasErrors ? 'ERRORS' : `${compilationTimeMs}ms`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Pipeline Tabs Bar with Smooth Horizontal Scrolling */}
      <div className="relative flex items-center border-t border-slate-800 bg-[#0b0e14] text-xs">
        <button
          onClick={() => scrollTabs('left')}
          className="h-8 px-1.5 bg-[#0b0e14] hover:bg-slate-800 text-slate-500 hover:text-slate-300 border-r border-slate-800 transition shrink-0 cursor-pointer flex items-center justify-center"
          title="Scroll tabs left"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div
          ref={tabsScrollRef}
          className="flex-1 min-w-0 px-2 flex items-center gap-1 overflow-x-auto scrollbar-none scroll-smooth py-1"
        >
          {[
            { id: 'editor', label: '1. Lexer & Tokens', icon: Code2 },
            { id: 'parser', label: '2. Parser & Grammars', icon: Layers },
            { id: 'semantic', label: '3. Semantic & SDD', icon: Sparkles },
            { id: 'ir', label: '4. IR & TAC / DAG', icon: FileCode },
            { id: 'cfg', label: '5. CFG & Dominators', icon: Activity },
            { id: 'dataflow', label: '6. Data Flow & Chains', icon: Eye },
            { id: 'optimizer', label: '7. Optimizer & Passes', icon: Zap },
            { id: 'codegen', label: '8. Codegen & Regs', icon: Cpu },
            { id: 'vm', label: '9. VM & Execution', icon: Gauge },
            { id: 'docs', label: 'Manual & Guide', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-nav-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollTabs('right')}
          className="h-8 px-1.5 bg-[#0b0e14] hover:bg-slate-800 text-slate-500 hover:text-slate-300 border-l border-slate-800 transition shrink-0 cursor-pointer flex items-center justify-center"
          title="Scroll tabs right"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Theme Customizer Modal */}
      <ThemeCustomizerModal isOpen={showCustomizer} onClose={() => setShowCustomizer(false)} />
    </header>
  );
};
