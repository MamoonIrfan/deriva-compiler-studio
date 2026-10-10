import React, { useState } from 'react';
import { Check, Info, Palette, RefreshCcw, ShieldCheck, X } from 'lucide-react';
import { AppTheme, THEME_OPTIONS, useTheme } from '../../context/ThemeContext';
import { evaluateContrast } from '../../utils/contrast';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme, customTheme, updateCustomTheme, resetCustomTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  if (!isOpen) return null;

  const currentContrast = evaluateContrast(
    theme === 'custom' ? customTheme.bgColor : '#0b0e14',
    theme === 'custom' ? customTheme.textColor : '#f8fafc'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
      <div
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-app)' }}
        className="w-full max-w-lg rounded-xl border shadow-2xl flex flex-col overflow-hidden text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div
          style={{ backgroundColor: 'var(--bg-card)', borderBottomColor: 'var(--border-app)' }}
          className="px-4 py-3 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
            <Palette className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-bold text-sm tracking-tight text-white truncate">
              <span className="hidden sm:inline">Studio Workspace Theming & Contrast</span>
              <span className="sm:hidden">Workspace Theming</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-[#0b0e14]/40 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'presets'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Professional Presets (8)
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'custom'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Palette & Contrast Guard
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
          {activeTab === 'presets' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {THEME_OPTIONS.map((opt) => {
                const isSelected = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between transition cursor-pointer relative ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                        : 'bg-[#131720] border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-700 shadow-sm shrink-0"
                            style={{ backgroundColor: opt.bgColor }}
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: opt.primaryColor }}
                          />
                          <span className="font-semibold text-slate-200 text-xs">
                            {opt.name}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-indigo-400">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {opt.description}
                      </p>
                    </div>

                    {opt.isHighContrast && (
                      <div className="mt-2 text-[9px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded w-fit">
                        WCAG AAA Compliant
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/50 flex items-start gap-2 text-indigo-300">
                <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-xs">
                    Automated WCAG AA Contrast Guarantee
                  </div>
                  <div className="text-[10px] text-indigo-300/80 leading-relaxed">
                    Custom themes actively validate foreground-to-background contrast. If you pick a dark background with dark text or a light background with light text, the system automatically corrects text luminance to prevent invisible UI components.
                  </div>
                </div>
              </div>

              {/* Color Customizers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customTheme.bgColor}
                      onChange={(e) => {
                        updateCustomTheme({ bgColor: e.target.value });
                        if (theme !== 'custom') setTheme('custom');
                      }}
                      className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={customTheme.bgColor}
                      onChange={(e) => {
                        updateCustomTheme({ bgColor: e.target.value });
                        if (theme !== 'custom') setTheme('custom');
                      }}
                      className="flex-1 bg-[#0b0e14] border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Panel Surface Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customTheme.surfaceColor}
                      onChange={(e) => {
                        updateCustomTheme({ surfaceColor: e.target.value });
                        if (theme !== 'custom') setTheme('custom');
                      }}
                      className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={customTheme.surfaceColor}
                      onChange={(e) => {
                        updateCustomTheme({ surfaceColor: e.target.value });
                        if (theme !== 'custom') setTheme('custom');
                      }}
                      className="flex-1 bg-[#0b0e14] border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Primary / Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customTheme.primaryColor}
                      onChange={(e) => {
                        updateCustomTheme({ primaryColor: e.target.value });
                        if (theme !== 'custom') setTheme('custom');
                      }}
                      className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={customTheme.primaryColor}
                      onChange={(e) => {
                        updateCustomTheme({ primaryColor: e.target.value });
                        if (theme !== 'custom') setTheme('custom');
                      }}
                      className="flex-1 bg-[#0b0e14] border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    Border Divider Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customTheme.borderColor}
                      onChange={(e) => {
                        updateCustomTheme({ borderColor: e.target.value });
                        if (theme !== 'custom') setTheme('custom');
                      }}
                      className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={customTheme.borderColor}
                      onChange={(e) => {
                        updateCustomTheme({ borderColor: e.target.value });
                        if (theme !== 'custom') setTheme('custom');
                      }}
                      className="flex-1 bg-[#0b0e14] border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Contrast Score Readout */}
              <div className="p-3 rounded-lg bg-[#0b0e14] border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Calculated Contrast Ratio
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                    {currentContrast.ratio}:1{' '}
                    <span className="text-[10px] font-sans font-normal text-slate-300">
                      ({currentContrast.scoreAAA ? 'WCAG AAA' : currentContrast.scoreAA ? 'WCAG AA' : 'Guarded'})
                    </span>
                  </div>
                </div>
                <button
                  onClick={resetCustomTheme}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition"
                >
                  <RefreshCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{ backgroundColor: 'var(--bg-card)', borderTopColor: 'var(--border-app)' }}
          className="px-4 py-2.5 border-t flex items-center justify-end"
        >
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
