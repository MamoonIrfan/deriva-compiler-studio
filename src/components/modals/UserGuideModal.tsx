import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen,
  Search,
  X,
  Code,
  Copy,
  Check,
  Play,
  Layers,
  Sparkles,
  Cpu,
  FileCode,
  AlertCircle,
  Layout,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Info,
  Lightbulb,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Maximize2,
  Minimize2,
  Terminal,
} from 'lucide-react';
import { DocSection, DocSubsection, USER_GUIDE_SECTIONS } from '../../data/docsContent';
import { NovaCompilerDriver } from '../../compiler/driver';
import { CompilationSession } from '../../types';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCode: (code: string) => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  onLoadCode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(USER_GUIDE_SECTIONS[0].id);
  const [selectedSubsectionId, setSelectedSubsectionId] = useState<string>(
    USER_GUIDE_SECTIONS[0].subsections[0].id
  );
  const [activeTab, setActiveTab] = useState<'guide' | 'playground' | 'cheatsheet'>('guide');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [loadedSnippetId, setLoadedSnippetId] = useState<string | null>(null);

  // Playground sandbox state
  const [playgroundCode, setPlaygroundCode] = useState<string>(
    `// Live Deriva Quick Tester\nvar radius: float = 5.0;\nvar pi: float = 3.14159;\nvar area: float = pi * radius * radius;\nprint("Circle Area: ");\nprint(area);`
  );
  const [playgroundSession, setPlaygroundSession] = useState<CompilationSession | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Compile playground code
  useEffect(() => {
    if (activeTab === 'playground') {
      try {
        const session = NovaCompilerDriver.compile(playgroundCode, {
          optimizationLevel: 'O2',
          registersK: 4,
        });
        setPlaygroundSession(session);
      } catch (err) {
        // Safe fallback
      }
    }
  }, [playgroundCode, activeTab]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Categories list
  const categories = useMemo(() => {
    return [
      'All',
      'Getting Started',
      'Language Reference',
      'Compiler Pipeline',
      'Cookbook',
      'Diagnostics',
      'IDE & Tools',
    ];
  }, []);

  // Filter sections based on category and search query
  const filteredSections = useMemo(() => {
    let list = USER_GUIDE_SECTIONS;
    if (selectedCategory !== 'All') {
      list = list.filter((sec) => sec.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((sec) => {
        const matchTitle = sec.title.toLowerCase().includes(q);
        const matchDesc = sec.description.toLowerCase().includes(q);
        const matchKeywords = sec.keywords.some((k) => k.toLowerCase().includes(q));
        const matchSubsections = sec.subsections.some(
          (sub) =>
            sub.title.toLowerCase().includes(q) ||
            sub.content.toLowerCase().includes(q) ||
            sub.codeSnippet?.code.toLowerCase().includes(q)
        );
        return matchTitle || matchDesc || matchKeywords || matchSubsections;
      });
    }
    return list;
  }, [selectedCategory, searchQuery]);

  // Current active section
  const currentSection = useMemo(() => {
    return (
      USER_GUIDE_SECTIONS.find((s) => s.id === selectedSectionId) ||
      filteredSections[0] ||
      USER_GUIDE_SECTIONS[0]
    );
  }, [selectedSectionId, filteredSections]);

  const handleCopyCode = (snippetId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetId(snippetId);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const handleLoadSnippet = (snippetId: string, code: string) => {
    onLoadCode(code);
    setLoadedSnippetId(snippetId);
    setTimeout(() => setLoadedSnippetId(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-guide-title"
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #131720)',
          borderColor: 'var(--border-app, #2a324b)',
          color: 'var(--text-main, #e2e8f0)',
        }}
        className="w-full max-w-6xl h-[92vh] max-h-[900px] flex flex-col rounded-xl border shadow-2xl overflow-hidden"
      >
        {/* MODAL HEADER */}
        <header
          style={{ backgroundColor: 'var(--bg-card, #0f131d)', borderColor: 'var(--border-app, #2a324b)' }}
          className="px-3 sm:px-4 py-2.5 sm:py-3 border-b flex items-center justify-between gap-2 sm:gap-3 shrink-0 flex-wrap"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-sm shrink-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="user-guide-title" className="text-xs sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5 flex-wrap truncate">
                <span>DERIVA User Guide</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-normal">
                  Deriva v1.0
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 hidden md:block">
                Authoritative language reference, 9-stage compiler manual, and interactive laboratory
              </p>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-[#1a1f2b] p-0.5 rounded-lg border border-slate-700/60 text-xs shrink-0">
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 text-xs ${
                activeTab === 'guide'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manual</span>
            </button>
            <button
              onClick={() => setActiveTab('playground')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 text-xs ${
                activeTab === 'playground'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Tester</span>
            </button>
            <button
              onClick={() => setActiveTab('cheatsheet')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 text-xs ${
                activeTab === 'cheatsheet'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cheatsheet</span>
              <span className="sm:hidden">Cheat</span>
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Close Guide (Esc)"
            aria-label="Close Guide"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </header>

        {/* TAB 1: INTERACTIVE USER GUIDE */}
        {activeTab === 'guide' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* SIDEBAR NAVIGATION */}
            <aside
              style={{
                backgroundColor: 'var(--bg-surface, #131720)',
                borderColor: 'var(--border-app, #2a324b)',
              }}
              className="w-full md:w-72 lg:w-80 max-h-52 md:max-h-none border-b md:border-b-0 md:border-r flex flex-col shrink-0 min-h-0"
            >
              {/* Search Bar */}
              <div className="p-3 border-b border-slate-800/80">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search manual, keywords, stages..."
                    className="w-full bg-[#0b0e14] text-xs text-slate-200 pl-8 pr-7 py-1.5 rounded-md border border-slate-700/70 focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-2 pb-0.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap transition cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-[#1a1f2b] text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sections Table of Contents */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredSections.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No matching documentation topics found.
                  </div>
                ) : (
                  filteredSections.map((section) => {
                    const isSelected = selectedSectionId === section.id;
                    return (
                      <div key={section.id} className="space-y-0.5">
                        <button
                          onClick={() => {
                            setSelectedSectionId(section.id);
                            if (section.subsections.length > 0) {
                              setSelectedSubsectionId(section.subsections[0].id);
                            }
                            if (contentScrollRef.current) {
                              contentScrollRef.current.scrollTop = 0;
                            }
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                              : 'text-slate-300 hover:bg-slate-800/40 hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isSelected ? 'bg-indigo-400' : 'bg-slate-600'
                              }`}
                            />
                            <span className="truncate">{section.title}</span>
                          </div>
                          {section.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              {section.badge}
                            </span>
                          )}
                        </button>

                        {/* Subsections under active section */}
                        {isSelected && (
                          <div className="pl-4 pr-1 py-0.5 space-y-0.5 border-l border-indigo-500/20 ml-3">
                            {section.subsections.map((sub) => {
                              const isSubActive = selectedSubsectionId === sub.id;
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => {
                                    setSelectedSubsectionId(sub.id);
                                    const el = document.getElementById(`sub-${sub.id}`);
                                    if (el) {
                                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                  }}
                                  className={`w-full text-left px-2 py-1 rounded text-[11px] truncate transition cursor-pointer ${
                                    isSubActive
                                      ? 'text-indigo-300 font-medium bg-indigo-950/40'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                                  }`}
                                >
                                  {sub.title}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main
              ref={contentScrollRef}
              style={{ backgroundColor: 'var(--bg-app, #0b0e14)' }}
              className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8"
            >
              {/* Section Header */}
              <div className="border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">
                    {currentSection.category}
                  </span>
                  {currentSection.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {currentSection.badge}
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {currentSection.title}
                </h1>
                <p className="text-sm text-slate-400 mt-1">{currentSection.description}</p>
              </div>

              {/* Subsections */}
              <div className="space-y-8">
                {currentSection.subsections.map((sub) => (
                  <section key={sub.id} id={`sub-${sub.id}`} className="space-y-4 scroll-mt-6">
                    <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/60 pb-2">
                      <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />
                      {sub.title}
                    </h2>

                    {/* Formatted Markdown/Text */}
                    <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3 whitespace-pre-line font-sans">
                      {sub.content}
                    </div>

                    {/* Callout Notes */}
                    {sub.notes && sub.notes.length > 0 && (
                      <div className="space-y-2">
                        {sub.notes.map((note, nIdx) => (
                          <div
                            key={nIdx}
                            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                              note.type === 'tip'
                                ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
                                : note.type === 'warning'
                                ? 'bg-amber-950/20 border-amber-800/50 text-amber-200'
                                : 'bg-indigo-950/20 border-indigo-800/50 text-indigo-200'
                            }`}
                          >
                            {note.type === 'tip' ? (
                              <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : note.type === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            ) : (
                              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 leading-relaxed">{note.text}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tables */}
                    {sub.tables &&
                      sub.tables.map((tbl, tIdx) => (
                        <div key={tIdx} className="space-y-1.5 my-3">
                          {tbl.caption && (
                            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                              <span>{tbl.caption}</span>
                            </div>
                          )}
                          <div className="border border-slate-800 rounded-lg overflow-x-auto shadow-sm">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-[#161b26] border-b border-slate-800 text-slate-300 font-semibold">
                                  {tbl.headers.map((h, hIdx) => (
                                    <th key={hIdx} className="px-3 py-2 border-r border-slate-800/60 last:border-0 font-mono text-[11px]">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                {tbl.rows.map((row, rIdx) => (
                                  <tr
                                    key={rIdx}
                                    className="hover:bg-slate-800/30 transition text-slate-300"
                                  >
                                    {row.map((cell, cIdx) => (
                                      <td
                                        key={cIdx}
                                        className="px-3 py-2 border-r border-slate-800/40 last:border-0 font-mono text-[11px]"
                                      >
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

                    {/* Code Snippet with interactive Run & Copy */}
                    {sub.codeSnippet && (
                      <div className="my-3 rounded-lg border border-slate-800 bg-[#070a13] overflow-hidden shadow-lg">
                        {/* Snippet Header */}
                        <div className="px-3 py-2 bg-[#121622] border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Code className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-xs font-bold text-slate-200">
                              {sub.codeSnippet.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                handleCopyCode(
                                  sub.id,
                                  sub.codeSnippet?.code || ''
                                )
                              }
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] flex items-center gap-1 transition cursor-pointer"
                              title="Copy code to clipboard"
                            >
                              {copiedSnippetId === sub.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() =>
                                handleLoadSnippet(
                                  sub.id,
                                  sub.codeSnippet?.code || ''
                                )
                              }
                              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition cursor-pointer"
                              title="Load code into Studio Editor and compile immediately"
                            >
                              {loadedSnippetId === sub.id ? (
                                <>
                                  <Check className="w-3 h-3 text-white" />
                                  <span>Loaded & Running!</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Load into Editor</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Snippet Body */}
                        <div className="p-3 overflow-x-auto font-mono text-xs text-indigo-200 bg-[#070a13] leading-relaxed">
                          <pre className="selection:bg-indigo-900 selection:text-white">
                            {sub.codeSnippet.code}
                          </pre>
                        </div>
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </main>
          </div>
        )}

        {/* TAB 2: LIVE PLAYGROUND & SYNTAX TESTER */}
        {activeTab === 'playground' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Editor Side */}
            <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-indigo-400" />
                    Interactive Quick Tester
                  </h3>
                  <p className="text-xs text-slate-400">
                    Type or modify Deriva code to see real-time syntax checking & IR generation
                  </p>
                </div>
                <button
                  onClick={() => {
                    onLoadCode(playgroundCode);
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Open in Main Studio</span>
                </button>
              </div>

              <textarea
                value={playgroundCode}
                onChange={(e) => setPlaygroundCode(e.target.value)}
                rows={15}
                className="flex-1 w-full bg-[#070a13] text-indigo-200 font-mono text-xs p-3 rounded-lg border border-slate-700/80 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                spellCheck={false}
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Auto-compiles on change (O2 optimization)</span>
                <button
                  onClick={() =>
                    setPlaygroundCode(
                      `// Fibonacci Quick Check\nfunc fib(n: int): int {\n  if (n <= 1) { return n; }\n  return fib(n - 1) + fib(n - 2);\n}\nprint(fib(7));`
                    )
                  }
                  className="hover:text-indigo-400 underline cursor-pointer"
                >
                  Load Recursive Template
                </button>
              </div>
            </div>

            {/* Results Side */}
            <div className="w-full md:w-1/2 flex flex-col p-4 overflow-y-auto space-y-4 bg-[#0b0e14]">
              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Instant Compilation Results</span>
                {playgroundSession && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      playgroundSession.diagnostics.length === 0
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {playgroundSession.diagnostics.length === 0
                      ? '✓ Syntax & Semantics Clean'
                      : `${playgroundSession.diagnostics.length} Diagnostic(s)`}
                  </span>
                )}
              </h3>

              {/* Metrics Summary */}
              {playgroundSession && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#131720] border border-slate-800 p-2.5 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Tokens</span>
                    <p className="text-sm font-bold text-indigo-400 font-mono">
                      {playgroundSession.tokens.length}
                    </p>
                  </div>
                  <div className="bg-[#131720] border border-slate-800 p-2.5 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">AST Nodes</span>
                    <p className="text-sm font-bold text-cyan-400 font-mono">
                      {playgroundSession.ast?.body?.length || 0} top-level
                    </p>
                  </div>
                  <div className="bg-[#131720] border border-slate-800 p-2.5 rounded-lg text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">TAC Instructions</span>
                    <p className="text-sm font-bold text-amber-400 font-mono">
                      {playgroundSession.tac.length}
                    </p>
                  </div>
                </div>
              )}

              {/* Diagnostics if any */}
              {playgroundSession && playgroundSession.diagnostics.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Diagnostics Encountered:
                  </span>
                  {playgroundSession.diagnostics.map((diag, dIdx) => (
                    <div
                      key={dIdx}
                      className="p-2 rounded bg-rose-950/40 border border-rose-900 text-xs text-rose-200"
                    >
                      <div className="font-semibold flex items-center justify-between">
                        <span>[{diag.phase}] {diag.message}</span>
                        {diag.location && (
                          <span className="font-mono text-[10px] text-rose-300">
                            Line {diag.location.line}:{diag.location.column}
                          </span>
                        )}
                      </div>
                      {diag.suggestion && (
                        <p className="text-[11px] text-rose-300/80 mt-1">
                          Fix: {diag.suggestion}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAC Preview */}
              {playgroundSession && playgroundSession.tac.length > 0 && (
                <div className="space-y-1.5 flex-1 flex flex-col">
                  <span className="text-xs font-bold text-slate-300">
                    Generated Three-Address Code (TAC):
                  </span>
                  <div className="flex-1 min-h-[140px] bg-[#070a13] border border-slate-800 p-2.5 rounded-lg font-mono text-xs text-emerald-300 overflow-y-auto">
                    {playgroundSession.tac.map((instr, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="text-slate-600 select-none w-6 text-right">
                          {idx}
                        </span>
                        <span>{instr.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CHEATSHEET & GRAMMAR MATRIX */}
        {activeTab === 'cheatsheet' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 bg-[#0b0e14]">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Deriva Quick Syntax Cheatsheet
              </h3>
              <p className="text-xs text-slate-400">
                Single-page reference matrix of grammar rules, keywords, types, and compiler pipeline controls.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Keywords & Types */}
              <div className="bg-[#131720] border border-slate-800 rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">
                  Types & Keywords
                </h4>
                <div className="text-xs space-y-1.5 text-slate-300">
                  <p><code className="text-amber-300 font-mono font-bold">int</code> — 32-bit signed integer</p>
                  <p><code className="text-amber-300 font-mono font-bold">float</code> — 64-bit IEEE floating-point</p>
                  <p><code className="text-amber-300 font-mono font-bold">bool</code> — Boolean true / false</p>
                  <p><code className="text-amber-300 font-mono font-bold">string</code> — Double-quoted UTF-8 string</p>
                  <p><code className="text-amber-300 font-mono font-bold">void</code> — Empty function return type</p>
                  <p><code className="text-indigo-300 font-mono font-bold">var</code> — Mutable variable declaration</p>
                  <p><code className="text-indigo-300 font-mono font-bold">func</code> — Function definition</p>
                  <p><code className="text-indigo-300 font-mono font-bold">return</code> — Return value from function</p>
                  <p><code className="text-indigo-300 font-mono font-bold">print</code> — Emit to console output</p>
                </div>
              </div>

              {/* Box 2: Declarations & Control Flow */}
              <div className="bg-[#131720] border border-slate-800 rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
                  Syntax Constructs
                </h4>
                <div className="text-xs space-y-1.5 font-mono text-slate-300">
                  <div className="p-1.5 bg-[#070a13] rounded border border-slate-800">
                    <span className="text-slate-500">// Variable Declaration:</span>
                    <br />
                    <span className="text-indigo-400">var</span> count: <span className="text-amber-400">int</span> = 10;
                  </div>
                  <div className="p-1.5 bg-[#070a13] rounded border border-slate-800">
                    <span className="text-slate-500">// Function Definition:</span>
                    <br />
                    <span className="text-indigo-400">func</span> add(a: <span className="text-amber-400">int</span>, b: <span className="text-amber-400">int</span>): <span className="text-amber-400">int</span> &#123;
                    <br />
                    &nbsp;&nbsp;<span className="text-indigo-400">return</span> a + b;
                    <br />
                    &#125;
                  </div>
                  <div className="p-1.5 bg-[#070a13] rounded border border-slate-800">
                    <span className="text-slate-500">// While Loop:</span>
                    <br />
                    <span className="text-indigo-400">while</span> (i &lt; n) &#123; i += 1; &#125;
                  </div>
                  <div className="p-1.5 bg-[#070a13] rounded border border-slate-800">
                    <span className="text-slate-500">// For Loop:</span>
                    <br />
                    <span className="text-indigo-400">for</span> (<span className="text-indigo-400">var</span> i: <span className="text-amber-400">int</span> = 0; i &lt; 10; i += 1) &#123; ... &#125;
                  </div>
                </div>
              </div>

              {/* Box 3: Operator Precedence */}
              <div className="bg-[#131720] border border-slate-800 rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                  Operator Precedence (Low to High)
                </h4>
                <div className="text-xs space-y-1 font-mono text-slate-300">
                  <p><span className="text-slate-500">1:</span> || (Logical OR)</p>
                  <p><span className="text-slate-500">2:</span> && (Logical AND)</p>
                  <p><span className="text-slate-500">3:</span> ==, != (Equality)</p>
                  <p><span className="text-slate-500">4:</span> &lt;, &lt;=, &gt;, &gt;= (Relational)</p>
                  <p><span className="text-slate-500">5:</span> +, - (Additive / String concat)</p>
                  <p><span className="text-slate-500">6:</span> *, /, % (Multiplicative)</p>
                  <p><span className="text-slate-500">7:</span> -, ! (Unary Negation / NOT)</p>
                  <p><span className="text-slate-500">8:</span> literals, id, (expr), fn() (Primary)</p>
                </div>
              </div>

              {/* Box 4: Pipeline Stages & Shortcuts */}
              <div className="bg-[#131720] border border-slate-800 rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono">
                  Pipeline Stages & Shortcuts
                </h4>
                <div className="text-xs space-y-1.5 text-slate-300">
                  <p><strong>1. Lexer</strong>: Source scanning & token classification</p>
                  <p><strong>2. Parser</strong>: LL(1) recursive descent, CST & AST</p>
                  <p><strong>3. Semantic</strong>: Scope table, type checks, hoisting, SDD</p>
                  <p><strong>4. IR</strong>: Three-Address Code, Quadruples, Triples, DAG</p>
                  <p><strong>5. CFG</strong>: Basic block leaders, dominators, loops</p>
                  <p><strong>6. Data Flow</strong>: Liveness analysis, reaching defs, UD/DU</p>
                  <p><strong>7. Optimizer</strong>: O0, O1, O2 passes (constant folding, DCE)</p>
                  <p><strong>8. Codegen</strong>: MIPS, x86-64, Bytecode & Graph Coloring</p>
                  <p><strong>9. VM</strong>: Stack virtual machine execution & step debugger</p>
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                    <span className="font-bold text-slate-200">Ctrl+B</span> Toggle Explorer • <span className="font-bold text-slate-200">Esc</span> Close Modals
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <footer
          style={{ backgroundColor: 'var(--bg-card, #0f131d)', borderColor: 'var(--border-app, #2a324b)' }}
          className="px-4 py-2.5 border-t flex items-center justify-between text-xs text-slate-400 shrink-0 flex-wrap gap-2"
        >
          <div className="flex items-center gap-3">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-mono">Esc</kbd> to close</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline text-slate-500">DERIVA Compiler Studio v1.0 Production Documentation</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onLoadCode(USER_GUIDE_SECTIONS[0].subsections[1].codeSnippet?.code || '');
                onClose();
              }}
              className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer text-xs flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Load Tutorial Program</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
