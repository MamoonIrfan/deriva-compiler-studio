import React, { useState } from 'react';
import { ControlFlowGraph, NaturalLoop } from '../../types';
import { Activity, ArrowDownRight, GitBranch, GitCommit, Layers, RefreshCcw, Repeat } from 'lucide-react';

interface CFGVisualizerProps {
  cfg: ControlFlowGraph;
  dominatorTree: Record<string, string[]>;
  postDominatorTree: Record<string, string[]>;
  naturalLoops: NaturalLoop[];
}

export const CFGVisualizer: React.FC<CFGVisualizerProps> = ({
  cfg,
  dominatorTree = {},
  postDominatorTree = {},
  naturalLoops = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cfg' | 'dom' | 'loops'>('cfg');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const safeBlocks = Array.isArray(cfg?.blocks) ? cfg.blocks : [];
  const safeEdges = Array.isArray(cfg?.edges) ? cfg.edges : [];
  const safeLoops = Array.isArray(naturalLoops) ? naturalLoops : [];
  const safeDomTree = dominatorTree && typeof dominatorTree === 'object' ? dominatorTree : {};
  const safePostDomTree = postDominatorTree && typeof postDominatorTree === 'object' ? postDominatorTree : {};

  const selectedBlock = safeBlocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] text-slate-200 rounded-lg overflow-hidden border border-slate-800">
      {/* Sub-tabs header */}
      <div className="min-h-9 py-1 flex items-center justify-between px-2.5 sm:px-3 bg-[#1a1f2b] border-b border-slate-800 text-xs gap-2 select-none shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 py-0.5">
          {[
            { id: 'cfg', label: 'CFG' },
            { id: 'dom', label: 'Dominator Trees' },
            { id: 'loops', label: 'Natural Loops' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeSubTab === tab.id
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-slate-500 text-[10px] font-mono shrink-0 hidden sm:inline">
          {safeBlocks.length} Blocks, {safeEdges.length} Edges
        </span>
      </div>

      {/* Sub-tab 1: CFG Basic Blocks & Edges */}
      {activeSubTab === 'cfg' && (
        <div className="flex-1 overflow-auto p-3 flex flex-wrap gap-3 font-mono text-xs bg-[#0b0e14]">
          {/* Blocks Grid / Canvas */}
          <div className="flex-1 min-w-0 sm:min-w-[260px] w-full sm:w-auto overflow-auto space-y-4">
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3">
              {safeBlocks.map((block) => {
                const isEntry = block.id === cfg?.entryBlockId;
                const isExit = block.id === cfg?.exitBlockId;
                const isSelected = selectedBlockId === block.id;

                return (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    className={`p-3 rounded-lg border transition cursor-pointer flex flex-col ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/20'
                        : isEntry
                        ? 'bg-emerald-950/20 border-emerald-700/60'
                        : isExit
                        ? 'bg-rose-950/20 border-rose-700/60'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-indigo-400">{block.id}</span>
                        {block.label && <span className="text-purple-400">({block.label})</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {isEntry && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                            ENTRY
                          </span>
                        )}
                        {isExit && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                            EXIT
                          </span>
                        )}
                        {block.naturalLoopId && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                            {block.naturalLoopId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Block Instructions */}
                    <div className="space-y-1 flex-1">
                      {(block.instructions || []).map((ins) => (
                        <div key={ins.id} className="text-slate-300 text-[11px] flex items-center gap-2">
                          <span className="text-slate-600 w-5 text-right">{ins.id}:</span>
                          <span className="text-purple-300 font-semibold">{ins.op}</span>
                          <span className="text-emerald-300">{ins.arg1}</span>
                          <span className="text-emerald-300">{ins.arg2}</span>
                          {ins.result && (
                            <span className="text-indigo-300 font-bold">→ {ins.result}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Block Predecessors / Successors summary */}
                    <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Pred: [{(block.predecessors || []).join(', ') || 'none'}]</span>
                      <span>Succ: [{(block.successors || []).join(', ') || 'none'}]</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Block Inspector Sidebar */}
          <div className="w-full min-[680px]:w-72 bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col gap-3 shrink-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Block Inspector
            </h4>

            {selectedBlock ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500">Block ID:</span>{' '}
                  <span className="text-indigo-300 font-bold">{selectedBlock.id}</span>
                </div>
                <div>
                  <span className="text-slate-500">Immediate Dominator (idom):</span>{' '}
                  <span className="text-emerald-300 font-bold">
                    {selectedBlock.immediateDominator || 'None (Root)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Immediate Post-Dom (ipdom):</span>{' '}
                  <span className="text-cyan-300 font-bold">
                    {selectedBlock.immediatePostDominator || 'None (Exit)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Dominators Set Dom(B):</span>
                  <div className="p-1.5 bg-slate-900 rounded border border-slate-800 text-amber-300 mt-1">
                    &#123; {Array.from(selectedBlock.dominators || []).join(', ') || '∅'} &#125;
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Outgoing Edges:</span>
                  <div className="space-y-1 mt-1">
                    {safeEdges
                      .filter((e) => e.from === selectedBlock.id)
                      .map((e, i) => (
                        <div
                          key={i}
                          className="p-1.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]"
                        >
                          <span className="text-slate-300 font-bold">→ {e.to}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              e.type === 'conditional_true'
                                ? 'bg-emerald-950 text-emerald-300'
                                : e.type === 'conditional_false'
                                ? 'bg-rose-950 text-rose-300'
                                : e.type === 'backedge'
                                ? 'bg-amber-950 text-amber-300'
                                : 'bg-blue-950 text-blue-300'
                            }`}
                          >
                            {e.type}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 italic">Click on any basic block to inspect dominator and edge properties.</div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Dominator Tree */}
      {activeSubTab === 'dom' && (
        <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {/* Dominator Tree */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" /> Dominator Tree (idom)
            </h4>
            <div className="space-y-2 flex-1 overflow-auto">
              {Object.entries(safeDomTree).map(([parent, children]) => (
                <div key={parent} className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-indigo-400 font-bold">{parent}</span>
                  <span className="text-slate-500"> dominates → </span>
                  <span className="text-emerald-300 font-bold">
                    [{(Array.isArray(children) ? children.join(', ') : '') || 'leaves'}]
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Post-Dominator Tree */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" /> Post-Dominator Tree (ipdom)
            </h4>
            <div className="space-y-2 flex-1 overflow-auto">
              {Object.entries(safePostDomTree).map(([parent, children]) => (
                <div key={parent} className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-indigo-400 font-bold">{parent}</span>
                  <span className="text-slate-500"> post-dominates → </span>
                  <span className="text-cyan-300 font-bold">
                    [{(Array.isArray(children) ? children.join(', ') : '') || 'leaves'}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Natural Loops */}
      {activeSubTab === 'loops' && (
        <div className="flex-1 overflow-auto p-4 font-mono text-xs flex flex-col gap-4">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-amber-400 font-bold">
              Natural Loops Detected: {safeLoops.length}
            </span>
            <span className="text-slate-400 text-[11px]">
              Back-edges (n → d where d dominates n) define natural loops
            </span>
          </div>

          {safeLoops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safeLoops.map((loop) => (
                <div key={loop.id} className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold text-sm">{loop.id}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      Nesting Depth: {loop.depth}
                    </span>
                  </div>

                  <div className="space-y-1 text-slate-300 mt-2">
                    <div>
                      <span className="text-slate-500">Loop Header:</span>{' '}
                      <span className="text-indigo-400 font-bold">{loop.header}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Back-Edge:</span>{' '}
                      <span className="text-rose-400 font-bold">
                        {loop.backEdge?.from} → {loop.backEdge?.to}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Loop Blocks:</span>{' '}
                      <span className="text-emerald-300 font-bold">
                        [{(loop.blocks || []).join(', ')}]
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Loop Exits:</span>{' '}
                      <span className="text-cyan-300 font-bold">
                        [{(loop.exits || []).join(', ') || 'none'}]
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 italic p-4">No natural loops detected in this control flow graph.</div>
          )}
        </div>
      )}
    </div>
  );
};
