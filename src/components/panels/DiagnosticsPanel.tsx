import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Filter,
  Info,
  Search,
  X,
} from 'lucide-react';
import { CompilerDiagnostic } from '../../types';

interface DiagnosticsPanelProps {
  diagnostics?: CompilerDiagnostic[];
  onDiagnosticClick?: (diagnostic: CompilerDiagnostic) => void;
  onClearDiagnostics?: () => void;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  diagnostics = [],
  onDiagnosticClick,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const safeDiagnostics = diagnostics || [];

  const errors = useMemo(() => safeDiagnostics.filter((d) => d.severity === 'error'), [safeDiagnostics]);
  const warnings = useMemo(() => safeDiagnostics.filter((d) => d.severity === 'warning'), [safeDiagnostics]);

  const uniquePhases = useMemo(() => {
    const set = new Set<string>();
    safeDiagnostics.forEach((d) => set.add(d.phase));
    return Array.from(set);
  }, [safeDiagnostics]);

  const filteredDiagnostics = useMemo(() => {
    return safeDiagnostics.filter((diag) => {
      if (filterSeverity !== 'all' && diag.severity !== filterSeverity) {
        return false;
      }
      if (selectedPhase !== 'all' && diag.phase !== selectedPhase) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMsg = diag.message.toLowerCase().includes(query);
        const matchesPhase = diag.phase.toLowerCase().includes(query);
        const matchesLoc = diag.location
          ? `ln ${diag.location.line}`.includes(query) || `line ${diag.location.line}`.includes(query)
          : false;
        const matchesSuggestion = diag.suggestion?.toLowerCase().includes(query) || false;
        if (!matchesMsg && !matchesPhase && !matchesLoc && !matchesSuggestion) {
          return false;
        }
      }
      return true;
    });
  }, [diagnostics, filterSeverity, selectedPhase, searchQuery]);

  const handleCopy = (diag: CompilerDiagnostic, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const locStr = diag.location ? `[Line ${diag.location.line}:${diag.location.column}] ` : '';
    const text = `[${diag.phase}] ${diag.severity.toUpperCase()}: ${locStr}${diag.message}${
      diag.suggestion ? ` (Tip: ${diag.suggestion})` : ''
    }`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0b0e14] text-slate-300 font-mono text-xs overflow-hidden">
      {/* Diagnostics Controls & Filter Toolbar */}
      <div className="px-2.5 py-1.5 bg-[#131720] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 select-none shrink-0">
        {/* Left: Severity Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterSeverity('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              filterSeverity === 'all'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All ({safeDiagnostics.length})
          </button>

          <button
            onClick={() => setFilterSeverity('error')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              filterSeverity === 'error'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-900/40'
                : 'text-rose-400 hover:bg-rose-950/40'
            }`}
          >
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>Errors ({errors.length})</span>
          </button>

          <button
            onClick={() => setFilterSeverity('warning')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              filterSeverity === 'warning'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-900/40'
                : 'text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Warnings ({warnings.length})</span>
          </button>
        </div>

        {/* Right: Search & Phase Dropdown */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Phase Filter */}
          {uniquePhases.length > 1 && (
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="bg-[#0b0e14] text-slate-300 text-[10px] rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none shrink-0"
            >
              <option value="all">All Phases</option>
              {uniquePhases.map((phase) => (
                <option key={phase} value={phase}>
                  {phase}
                </option>
              ))}
            </select>
          )}

          {/* Quick Search */}
          <div className="relative flex items-center shrink-0">
            <Search className="w-3 h-3 text-slate-500 absolute left-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter..."
              className="bg-[#0b0e14] text-slate-200 text-[10px] pl-6 pr-5 py-0.5 rounded border border-slate-700 w-24 sm:w-32 focus:w-36 sm:focus:w-44 transition-all focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1 text-slate-400 hover:text-white"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Diagnostics List with smooth scroll and full visibility */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1.5 bg-[#0b0e14] scrollbar-thin">
        {filteredDiagnostics.length > 0 ? (
          filteredDiagnostics.map((diag, idx) => {
            const isError = diag.severity === 'error';
            const isWarning = diag.severity === 'warning';
            const isCopied = copiedIndex === idx;

            return (
              <div
                key={idx}
                onClick={() => onDiagnosticClick?.(diag)}
                className={`group p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition hover:scale-[1.002] active:scale-[0.998] ${
                  isError
                    ? 'bg-rose-950/20 border-rose-900/60 hover:bg-rose-950/40 text-rose-200'
                    : isWarning
                    ? 'bg-amber-950/20 border-amber-900/60 hover:bg-amber-950/40 text-amber-200'
                    : 'bg-blue-950/20 border-blue-900/60 hover:bg-blue-950/40 text-blue-200'
                }`}
                title="Click to jump to line in editor"
              >
                {/* Icon */}
                {isError ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold uppercase text-[9px] tracking-wider px-1.5 py-0.5 rounded bg-[#131720] border border-slate-700 text-slate-300">
                        {diag.phase}
                      </span>
                      {diag.location && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold border border-slate-700">
                          Ln {diag.location.line}, Col {diag.location.column}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleCopy(diag, idx, e)}
                      className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center gap-1 transition"
                      title="Copy diagnostic text"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Message */}
                  <div className="mt-1 text-[11px] font-medium text-slate-100 leading-relaxed break-words">
                    {diag.message}
                  </div>

                  {/* Suggestion */}
                  {diag.suggestion && (
                    <div className="mt-1.5 text-[10px] text-indigo-300 bg-indigo-950/40 border border-indigo-900/60 rounded px-2 py-1 flex items-start gap-1.5 break-words min-w-0">
                      <span className="shrink-0">💡</span>
                      <span className="break-words min-w-0">
                        <strong className="text-indigo-200">Tip:</strong> {diag.suggestion}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : safeDiagnostics.length > 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-slate-500 text-[11px] gap-2">
            <Filter className="w-5 h-5 text-slate-600" />
            <span>No diagnostics match your active filter.</span>
            <button
              onClick={() => {
                setFilterSeverity('all');
                setSelectedPhase('all');
                setSearchQuery('');
              }}
              className="text-indigo-400 hover:underline text-[10px]"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <div>
              <div className="font-semibold text-emerald-300">Clean Compilation!</div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">
                No syntax or semantic errors found in current Deriva code.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
