import React, { useState } from 'react';
import { CompilationSession, DataFlowResult, DefUseChain, UseDefChain } from '../../types';
import { Eye, Layers, Link2, RefreshCw } from 'lucide-react';

interface DataFlowVisualizerProps {
  session: CompilationSession;
}

export const DataFlowVisualizer: React.FC<DataFlowVisualizerProps> = ({ session }) => {
  const [activeAnalysis, setActiveAnalysis] = useState<
    'reachingDefs' | 'liveVariables' | 'availableExpressions' | 'veryBusyExpressions'
  >('reachingDefs');

  const [activeSubTab, setActiveSubTab] = useState<'iterations' | 'chains'>('iterations');

  const fallbackDataFlow: DataFlowResult = {
    name: 'Analysis',
    direction: 'forward',
    meetOp: 'union',
    gen: {},
    kill: {},
    finalIn: {},
    finalOut: {},
    iterations: [],
  };

  const currentDataFlow: DataFlowResult = session?.dataFlow?.[activeAnalysis] || fallbackDataFlow;
  const blockIds = (session?.cfg?.blocks || []).map((b) => b.id);
  const iterations = Array.isArray(currentDataFlow.iterations) ? currentDataFlow.iterations : [];
  const useDefChains = Array.isArray(session?.useDefChains) ? session.useDefChains : [];
  const defUseChains = Array.isArray(session?.defUseChains) ? session.defUseChains : [];

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] text-slate-200 rounded-lg overflow-hidden border border-slate-800">
      {/* Sub-tabs header */}
      <div className="min-h-9 py-1 flex items-center justify-between px-2.5 sm:px-3 bg-[#1a1f2b] border-b border-slate-800 text-xs gap-2 select-none shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 py-0.5">
          {(['reachingDefs', 'liveVariables', 'availableExpressions', 'veryBusyExpressions'] as const).map(
            (analysisKey) => {
              const labelMap: Record<string, string> = {
                reachingDefs: 'Reaching Defs',
                liveVariables: 'Live Variables',
                availableExpressions: 'Available Expressions',
                veryBusyExpressions: 'Very Busy Exprs',
              };
              return (
                <button
                  key={analysisKey}
                  onClick={() => setActiveAnalysis(analysisKey)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                    activeAnalysis === analysisKey
                      ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {labelMap[analysisKey]}
                </button>
              );
            }
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setActiveSubTab('iterations')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'iterations' ? 'bg-[#0b0e14] text-indigo-300 border border-slate-700' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Iterations
          </button>
          <button
            onClick={() => setActiveSubTab('chains')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'chains' ? 'bg-[#0b0e14] text-indigo-300 border border-slate-700' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Chains
          </button>
        </div>
      </div>

      {activeSubTab === 'iterations' && (
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4 font-mono text-xs">
          {/* Analysis metadata card */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="text-indigo-400 font-bold text-sm">{currentDataFlow.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase font-bold">
                Direction: {currentDataFlow.direction}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 uppercase font-bold">
                Meet: {currentDataFlow.meetOp}
              </span>
            </div>
            <div className="text-slate-400 text-[11px]">
              {iterations.length} iterations to reach fixed point
            </div>
          </div>

          {/* GEN & KILL sets table */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto scrollbar-thin">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
              Block Transfer Sets (GEN / USE & KILL / DEF)
            </h4>
            <table className="w-full min-w-[560px] text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                  <th className="py-2 px-3">Block</th>
                  <th className="py-2 px-3">GEN[B] / USE[B]</th>
                  <th className="py-2 px-3">KILL[B] / DEF[B]</th>
                  <th className="py-2 px-3">Final IN[B]</th>
                  <th className="py-2 px-3">Final OUT[B]</th>
                </tr>
              </thead>
              <tbody>
                {blockIds.map((bId) => (
                  <tr key={bId} className="border-b border-slate-800/40 hover:bg-slate-900/30">
                    <td className="py-2 px-3 font-bold text-indigo-300">{bId}</td>
                    <td className="py-2 px-3 text-emerald-300 break-words max-w-[200px]">
                      &#123; {(currentDataFlow.gen?.[bId] || []).join(', ') || '∅'} &#125;
                    </td>
                    <td className="py-2 px-3 text-rose-300 break-words max-w-[200px]">
                      &#123; {(currentDataFlow.kill?.[bId] || []).join(', ') || '∅'} &#125;
                    </td>
                    <td className="py-2 px-3 text-amber-300 font-semibold break-words max-w-[200px]">
                      &#123; {(currentDataFlow.finalIn?.[bId] || []).join(', ') || '∅'} &#125;
                    </td>
                    <td className="py-2 px-3 text-cyan-300 font-semibold break-words max-w-[200px]">
                      &#123; {(currentDataFlow.finalOut?.[bId] || []).join(', ') || '∅'} &#125;
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Iteration-by-iteration Step Logs */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              Iterative Fixed-Point Step Log
            </h4>
            <div className="space-y-3">
              {iterations.map((iter) => (
                <div key={iter.iteration} className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800/60 font-bold flex-wrap gap-1">
                    <span className="text-indigo-400">Iteration #{iter.iteration}</span>
                    <span className={iter.changed ? 'text-amber-400 text-[10px]' : 'text-emerald-400 text-[10px]'}>
                      {iter.changed ? 'Changes detected (continue)' : 'Fixed point reached (converged)'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(iter.steps || {}).map(([bId, state]) => (
                      <div key={bId} className="flex-1 min-w-[160px] p-2 bg-slate-950/60 rounded border border-slate-800 text-[11px] overflow-hidden">
                        <div className="font-bold text-slate-300 mb-1">{bId}</div>
                        <div className="break-words">
                          <span className="text-slate-500">IN:</span>{' '}
                          <span className="text-amber-300 break-words">&#123; {(state?.in || []).join(', ') || '∅'} &#125;</span>
                        </div>
                        <div className="break-words">
                          <span className="text-slate-500">OUT:</span>{' '}
                          <span className="text-cyan-300 break-words">&#123; {(state?.out || []).join(', ') || '∅'} &#125;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: UD and DU Chains */}
      {activeSubTab === 'chains' && (
        <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {/* Use-Def Chains */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Use-Def (UD) Chains
            </h4>
            <div className="space-y-2 overflow-auto flex-1">
              {useDefChains.map((ud, idx) => (
                <div key={idx} className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-emerald-300">Variable '{ud.variable}'</span>
                    <span className="text-slate-500 text-[10px]">Use at TAC #{ud.useTacId} ({ud.useBlockId})</span>
                  </div>
                  <div className="text-slate-400 mt-1 pl-2 text-[11px]">
                    Reaching Defs: <span className="text-amber-300">[{(ud.defTacIds || []).map((d) => `TAC #${d}`).join(', ') || 'None'}]</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Def-Use Chains */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Def-Use (DU) Chains
            </h4>
            <div className="space-y-2 overflow-auto flex-1">
              {defUseChains.map((du, idx) => (
                <div key={idx} className="p-2 bg-slate-900 rounded border border-slate-800">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-emerald-300">Variable '{du.variable}'</span>
                    <span className="text-slate-500 text-[10px]">Def at TAC #{du.defTacId} ({du.defBlockId})</span>
                  </div>
                  <div className="text-slate-400 mt-1 pl-2 text-[11px]">
                    Target Uses: <span className="text-cyan-300">[{(du.useTacIds || []).map((u) => `TAC #${u}`).join(', ') || 'Dead definition (0 uses)'}]</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
