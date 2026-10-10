import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Code,
  Copy,
  Check,
  Play,
  Layers,
  Sparkles,
  Cpu,
  FileCode,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Lightbulb,
} from 'lucide-react';
import { USER_GUIDE_SECTIONS, DocSection } from '../../data/docsContent';

interface UserGuideVisualizerProps {
  onLoadCode?: (code: string) => void;
  onOpenFullModal?: () => void;
}

export const UserGuideVisualizer: React.FC<UserGuideVisualizerProps> = ({
  onLoadCode,
  onOpenFullModal,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(USER_GUIDE_SECTIONS[0].id);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const filteredSections = React.useMemo(() => {
    if (!searchQuery.trim()) return USER_GUIDE_SECTIONS;
    const q = searchQuery.toLowerCase().trim();
    return USER_GUIDE_SECTIONS.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.description.toLowerCase().includes(q) ||
        sec.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const activeSection = React.useMemo(() => {
    return (
      USER_GUIDE_SECTIONS.find((s) => s.id === selectedSectionId) ||
      filteredSections[0] ||
      USER_GUIDE_SECTIONS[0]
    );
  }, [selectedSectionId, filteredSections]);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLoad = (id: string, code: string) => {
    if (onLoadCode) {
      onLoadCode(code);
      setLoadedId(id);
      setTimeout(() => setLoadedId(null), 2000);
    }
  };

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col md:flex-row bg-[#0b0e14] text-slate-200 overflow-hidden font-sans">
      {/* Navigation Rail */}
      <aside className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col shrink-0 bg-[#0f131d]">
        {/* Search header */}
        <div className="p-2 border-b border-slate-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter topics..."
              className="w-full bg-[#070a13] text-xs text-slate-200 pl-7 pr-2 py-1 rounded border border-slate-700/70 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Section list */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {filteredSections.map((sec) => {
            const isSelected = activeSection.id === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setSelectedSectionId(sec.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span className="truncate">{sec.title}</span>
                {sec.badge && (
                  <span
                    className={`text-[9px] px-1 rounded font-mono ${
                      isSelected ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {sec.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal expand trigger */}
        {onOpenFullModal && (
          <div className="p-2 border-t border-slate-800 bg-[#0b0e14]">
            <button
              onClick={onOpenFullModal}
              className="w-full py-1 px-2 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Full Documentation</span>
            </button>
          </div>
        )}
      </aside>

      {/* Content panel */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 min-w-0">
        {/* Title */}
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {activeSection.category}
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                {activeSection.title}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{activeSection.description}</p>
          </div>

          {onOpenFullModal && (
            <button
              onClick={onOpenFullModal}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
            >
              <span>Full Screen</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Subsections */}
        <div className="space-y-6">
          {activeSection.subsections.map((sub) => (
            <div key={sub.id} className="space-y-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                {sub.title}
              </h3>

              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {sub.content}
              </div>

              {/* Callouts */}
              {sub.notes &&
                sub.notes.map((note, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded border border-indigo-800/40 bg-indigo-950/20 text-xs text-indigo-200 flex items-start gap-2"
                  >
                    <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{note.text}</span>
                  </div>
                ))}

              {/* Tables */}
              {sub.tables &&
                sub.tables.map((tbl, idx) => (
                  <div key={idx} className="space-y-1 my-2">
                    {tbl.caption && (
                      <span className="text-[11px] font-semibold text-slate-300">
                        {tbl.caption}
                      </span>
                    )}
                    <div className="border border-slate-800 rounded overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#131720] border-b border-slate-800 text-slate-300">
                            {tbl.headers.map((h, hIdx) => (
                              <th key={hIdx} className="px-2.5 py-1.5 font-mono text-[10px]">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {tbl.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-800/20 text-slate-300">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-2.5 py-1.5 font-mono text-[11px]">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

              {/* Code Snippet with Run & Copy */}
              {sub.codeSnippet && (
                <div className="rounded border border-slate-800 bg-[#070a13] overflow-hidden my-2">
                  <div className="px-2.5 py-1.5 bg-[#121622] border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      {sub.codeSnippet.title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(sub.id, sub.codeSnippet?.code || '')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedId === sub.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      {onLoadCode && (
                        <button
                          onClick={() => handleLoad(sub.id, sub.codeSnippet?.code || '')}
                          className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                        >
                          {loadedId === sub.id ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Loaded!</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Run in Editor</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <pre className="p-2.5 font-mono text-xs text-indigo-200 overflow-x-auto">
                    {sub.codeSnippet.code}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
