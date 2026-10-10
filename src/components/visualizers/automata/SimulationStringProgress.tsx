import React from 'react';
import { CheckCircle2, XCircle, ArrowUp, Clock, AlertTriangle, Sparkles } from 'lucide-react';

interface SimulationStringProgressProps {
  inputString: string;
  currentStepIndex: number;
  totalSteps: number;
  status: 'SIMULATING' | 'ACCEPTED' | 'REJECTED';
  reason?: string;
  machineType?: string;
  onSelectStep?: (index: number) => void;
}

export const SimulationStringProgress: React.FC<SimulationStringProgressProps> = ({
  inputString,
  currentStepIndex,
  totalSteps,
  status,
  reason,
  machineType = 'DFA',
  onSelectStep,
}) => {
  const chars = inputString.split('');
  const isEmpty = chars.length === 0;

  // In step-based simulation:
  // Step 0: 0 characters consumed, pointing to index 0
  // Step 1: 1 character consumed (index 0), pointing to index 1
  // Step k: k characters consumed, pointing to index k
  const consumedCount = Math.min(currentStepIndex, chars.length);
  const currentSymbolIndex = currentStepIndex < chars.length ? currentStepIndex : -1;

  const consumedStr = inputString.slice(0, consumedCount);
  const currentSymbol = currentSymbolIndex >= 0 ? inputString[currentSymbolIndex] : '';
  const remainingStr = currentSymbolIndex >= 0 ? inputString.slice(currentSymbolIndex + 1) : '';

  const isFailedStep = status === 'REJECTED' && currentStepIndex === totalSteps - 1;

  return (
    <div className="w-full bg-[#111622] border border-slate-800/90 rounded-xl p-3 sm:p-3.5 shadow-md flex flex-col gap-3">
      {/* Top Header: Input Stream Label & Live Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Input String Stream</span>
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            ({chars.length} {chars.length === 1 ? 'symbol' : 'symbols'})
          </span>
        </div>

        {/* Live Simulation Status Badge */}
        <div className="flex items-center gap-2">
          {status === 'SIMULATING' && (
            <div className="flex items-center gap-1.5 bg-cyan-950/80 text-cyan-300 border border-cyan-700/80 px-2.5 py-1 rounded-lg text-xs font-bold font-mono shadow-sm animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>SIMULATING</span>
              <span className="text-[10px] text-cyan-400/80 font-normal">
                (Step {currentStepIndex + 1}/{totalSteps})
              </span>
            </div>
          )}

          {status === 'ACCEPTED' && (
            <div className="flex items-center gap-1.5 bg-emerald-950/90 text-emerald-300 border border-emerald-600 px-3 py-1 rounded-lg text-xs font-bold font-mono shadow-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>✓ ACCEPTED</span>
            </div>
          )}

          {status === 'REJECTED' && (
            <div className="flex items-center gap-1.5 bg-rose-950/90 text-rose-300 border border-rose-600 px-3 py-1 rounded-lg text-xs font-bold font-mono shadow-md">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>✕ REJECTED</span>
            </div>
          )}
        </div>
      </div>

      {/* Visual Character Stream Boxes */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5">
        {isEmpty ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold">ε</span>
            <span>Empty string (0 symbols) — evaluated directly at start state</span>
          </div>
        ) : (
          chars.map((char, idx) => {
            const isConsumed = idx < consumedCount;
            const isCurrent = idx === currentSymbolIndex;
            const isFailed = isFailedStep && isCurrent;

            return (
              <div
                key={idx}
                onClick={() => onSelectStep && onSelectStep(idx + 1)}
                className={`group relative flex flex-col items-center shrink-0 cursor-pointer transition-all duration-200`}
                title={`Symbol '${char}' at index ${idx} (${
                  isConsumed ? 'Consumed' : isCurrent ? 'Currently Reading' : 'Remaining'
                })`}
              >
                {/* Character Block */}
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center font-mono font-bold text-sm sm:text-base rounded-lg border transition-all ${
                    isFailed
                      ? 'bg-rose-950/90 text-rose-200 border-rose-500 shadow-lg ring-2 ring-rose-500/40 scale-105'
                      : isCurrent
                      ? 'bg-gradient-to-b from-cyan-600 to-cyan-700 text-white border-cyan-300 shadow-lg shadow-cyan-500/30 scale-110 ring-2 ring-cyan-400/50'
                      : isConsumed
                      ? 'bg-slate-900/90 text-slate-400 border-slate-700 hover:border-slate-500'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {char}
                </div>

                {/* Subscript / State Annotation Badge */}
                <div className="mt-1.5 flex flex-col items-center">
                  {isCurrent && !isFailed && (
                    <div className="flex flex-col items-center">
                      <ArrowUp className="w-3 h-3 text-cyan-400 animate-bounce" />
                      <span className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/90 px-1 rounded border border-cyan-800">
                        CURRENT
                      </span>
                    </div>
                  )}

                  {isFailed && (
                    <div className="flex flex-col items-center">
                      <XCircle className="w-3 h-3 text-rose-400" />
                      <span className="text-[9px] font-mono font-bold text-rose-300 bg-rose-950/90 px-1 rounded border border-rose-800">
                        FAILED
                      </span>
                    </div>
                  )}

                  {isConsumed && (
                    <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5">
                      ✓ <span className="hidden sm:inline">done</span>
                    </span>
                  )}

                  {!isConsumed && !isCurrent && (
                    <span className="text-[9px] font-mono text-slate-500">
                      idx {idx}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* End of Stream / Traversal Marker */}
        {!isEmpty && (
          <div className="flex flex-col items-center ml-1 shrink-0 select-none">
            <div
              className={`w-8 h-9 sm:h-10 flex items-center justify-center font-mono text-[11px] rounded-lg border ${
                currentStepIndex >= totalSteps - 1
                  ? status === 'ACCEPTED'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600 font-bold'
                    : 'bg-rose-950/80 text-rose-300 border-rose-600 font-bold'
                  : 'bg-slate-950 text-slate-600 border-slate-800/80'
              }`}
            >
              $
            </div>
            <span className="text-[9px] font-mono text-slate-500 mt-1.5">EOF</span>
          </div>
        )}
      </div>

      {/* Breakdown Breakdown Bar: Consumed vs Current vs Remaining */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/70 text-[11px] font-mono">
        <div className="flex-1 min-w-[130px] flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-slate-400 shrink-0">Consumed:</span>
          <span className="text-emerald-300 font-bold truncate">
            {consumedStr ? `"${consumedStr}"` : 'ε (none)'}
          </span>
          <span className="text-slate-500 text-[10px] shrink-0">({consumedCount})</span>
        </div>

        <div className="flex-1 min-w-[130px] flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <ArrowUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-slate-400 shrink-0">Reading:</span>
          <span className="text-cyan-300 font-bold truncate">
            {currentSymbol ? `'${currentSymbol}'` : 'EOF (End)'}
          </span>
          {currentSymbolIndex >= 0 && (
            <span className="text-slate-500 text-[10px] shrink-0">(@ idx {currentSymbolIndex})</span>
          )}
        </div>

        <div className="flex-1 min-w-[130px] flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-slate-400 shrink-0">Remaining:</span>
          <span className="text-amber-300 font-bold truncate">
            {remainingStr ? `"${remainingStr}"` : 'None'}
          </span>
          <span className="text-slate-500 text-[10px] shrink-0">({remainingStr.length})</span>
        </div>
      </div>

      {/* Explanatory Banner / Failure Detail when Completed or Failed */}
      {reason && (
        <div
          className={`p-2.5 rounded-lg text-xs font-mono leading-relaxed border ${
            status === 'ACCEPTED'
              ? 'bg-emerald-950/40 text-emerald-200 border-emerald-800/60'
              : status === 'REJECTED'
              ? 'bg-rose-950/40 text-rose-200 border-rose-800/60'
              : 'bg-slate-900/80 text-slate-300 border-slate-800'
          }`}
        >
          <div className="flex items-start gap-2">
            {status === 'ACCEPTED' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {status === 'REJECTED' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
            {status === 'SIMULATING' && <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />}
            <span className="flex-1">{reason}</span>
          </div>
        </div>
      )}
    </div>
  );
};
