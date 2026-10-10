import React, { useState } from 'react';
import { CompilationSession } from '../../types';
import { Check, ChevronRight, Gauge, Layers, Sparkles, Zap } from 'lucide-react';

interface OptimizerVisualizerProps {
  session: CompilationSession;
}

export const OptimizerVisualizer: React.FC<OptimizerVisualizerProps> = ({ session }) => {
  const [selectedPassIndex, setSelectedPassIndex] = useState<number>(0);

  const passes = Array.isArray(session?.optimizationPasses) ? session.optimizationPasses : [];
  const currentPass = passes[selectedPassIndex];
  const tacLength = Array.isArray(session?.tac) ? session.tac.length : 0;

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] text-slate-200 rounded-lg overflow-hidden border border-slate-800">
      {/* Metrics Banner */}
      <div className="p-2.5 sm:p-3 bg-[#131720] border-b border-slate-800 grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono select-none shrink-0">
        <div className="p-2 bg-[#0b0e14] rounded border border-slate-800 flex flex-col min-w-0">
          <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider truncate">Initial TAC Count</span>
          <span className="text-base font-bold text-slate-200 mt-0.5 truncate">
            {passes[0] ? (passes[0].tacBefore || []).length : tacLength}
          </span>
        </div>
        <div className="p-2 bg-[#0b0e14] rounded border border-slate-800 flex flex-col min-w-0">
          <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider truncate">Optimized TAC Count</span>
          <span className="text-base font-bold text-emerald-400 mt-0.5 truncate">{tacLength}</span>
        </div>
        <div className="p-2 bg-[#0b0e14] rounded border border-slate-800 flex flex-col min-w-0">
          <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider truncate">Code Size Reduction</span>
          <span className="text-base font-bold text-indigo-400 mt-0.5 truncate">
            {session?.metrics?.optimizationReductionPercent || 0}%
          </span>
        </div>
        <div className="p-2 bg-[#0b0e14] rounded border border-slate-800 flex flex-col min-w-0">
          <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider truncate">Applied Passes</span>
          <span className="text-base font-bold text-amber-400 mt-0.5 truncate">{passes.length} Passes</span>
        </div>
      </div>

      {/* Main Diff & Pass Inspector */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden font-mono text-xs bg-[#0b0e14]">
        {/* Pass Selector Sidebar */}
        <div className="w-full md:w-64 max-h-44 md:max-h-none bg-[#131720] border-b md:border-b-0 md:border-r border-slate-800 p-2.5 overflow-auto flex flex-col gap-1 shrink-0">
          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 px-2 py-1">
            Optimization Pipeline Passes
          </span>
          {passes.map((p, idx) => {
            const isSelected = selectedPassIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => setSelectedPassIndex(idx)}
                className={`w-full text-left p-2 rounded border flex items-center justify-between transition cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-indigo-500 text-white shadow-sm'
                    : 'bg-[#0b0e14] border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold text-xs">{p.name}</span>
                  <span className="text-[10px] text-slate-500">{(p.logs || []).length} transformation(s)</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
              </button>
            );
          })}
        </div>

        {/* Selected Pass Details & TAC Diff */}
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          {currentPass ? (
            <>
              {/* Pass Actions List */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Transformations in '{currentPass.name}'
                </h4>
                {(currentPass.logs || []).length > 0 ? (
                  <div className="space-y-2">
                    {(currentPass.logs || []).map((log, lidx) => (
                      <div key={lidx} className="p-2 bg-slate-900 rounded border border-slate-800 flex flex-col gap-1">
                        <div className="font-bold text-emerald-300">{log.description}</div>
                        <div className="text-[11px] flex items-center gap-2">
                          <span className="text-rose-400 line-through">{log.before}</span>
                          <span className="text-slate-500">→</span>
                          <span className="text-emerald-400 font-bold">{log.after}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 italic">No instructions needed modification in this pass.</div>
                )}
              </div>

              {/* TAC Output after this pass */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex-1 overflow-auto">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  Resulting Intermediate Code (TAC)
                </h4>
                <div className="space-y-1">
                  {(currentPass.tacAfter || []).map((ins) => (
                    <div key={ins.id} className="text-slate-300 flex items-center gap-3 py-0.5">
                      <span className="text-slate-600 w-6 text-right select-none">{ins.id}:</span>
                      <span className="text-purple-300 font-semibold w-20">{ins.op}</span>
                      <span className="text-emerald-300">{ins.arg1}</span>
                      <span className="text-emerald-300">{ins.arg2}</span>
                      {ins.result && <span className="text-indigo-300 font-bold">→ {ins.result}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-slate-500 italic p-4">No optimization passes executed (Optimization Level is O0).</div>
          )}
        </div>
      </div>
    </div>
  );
};
