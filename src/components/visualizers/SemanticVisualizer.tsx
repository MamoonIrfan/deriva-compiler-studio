import React, { useState } from 'react';
import { ParseTreeNode, ScopeInfo, SymbolEntry } from '../../types';
import { DependencyGraph, NOVALANG_SDD_RULES } from '../../compiler/semantic/sdd';
import { AlertTriangle, CheckCircle, Database, GitBranch, Layers, ShieldCheck } from 'lucide-react';

interface SemanticVisualizerProps {
  symbolTable: Map<string, SymbolEntry> | null;
  scopes: ScopeInfo[];
  parseTree: ParseTreeNode | null;
  sddDependencyGraph?: DependencyGraph;
}

export const SemanticVisualizer: React.FC<SemanticVisualizerProps> = ({
  symbolTable,
  scopes = [],
  parseTree,
  sddDependencyGraph,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'symbols' | 'sdd' | 'depgraph'>('symbols');
  const [selectedScopeId, setSelectedScopeId] = useState<number | 'ALL'>('ALL');

  const safeScopes = Array.isArray(scopes) ? scopes : [];

  const symbolsList: SymbolEntry[] = React.useMemo(() => {
    if (!symbolTable) return [];
    if (symbolTable instanceof Map || typeof (symbolTable as any).values === 'function') {
      return Array.from((symbolTable as any).values());
    }
    if (Array.isArray(symbolTable)) {
      return symbolTable;
    }
    if (typeof symbolTable === 'object') {
      return Object.values(symbolTable);
    }
    return [];
  }, [symbolTable]);

  const filteredSymbols = symbolsList.filter((s) => {
    if (selectedScopeId === 'ALL') return true;
    return s.scopeId === selectedScopeId;
  });

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] text-slate-200 rounded-lg overflow-hidden border border-slate-800">
      {/* Sub-tabs */}
      <div className="min-h-9 py-1 flex items-center justify-between px-2.5 sm:px-3 bg-[#1a1f2b] border-b border-slate-800 text-xs select-none gap-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 py-0.5">
          <button
            onClick={() => setActiveSubTab('symbols')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'symbols'
                ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Symbol Table ({symbolsList.length})
          </button>
          <button
            onClick={() => setActiveSubTab('sdd')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'sdd'
                ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SDD
          </button>
          <button
            onClick={() => setActiveSubTab('depgraph')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'depgraph'
                ? 'bg-slate-800 text-indigo-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Attribute Graph
          </button>
        </div>

        {activeSubTab === 'symbols' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-400 text-[11px]">Scope:</span>
            <select
              value={selectedScopeId}
              onChange={(e) => setSelectedScopeId(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value, 10))}
              className="bg-[#0b0e14] text-slate-200 px-2 py-0.5 rounded text-[11px] border border-slate-700 focus:outline-none"
            >
              <option value="ALL">All Scopes</option>
              {safeScopes.map((s) => (
                <option key={s.id} value={s.id}>
                  Scope {s.id} ({s.name})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Sub-tab 1: Scoped Symbol Table */}
      {activeSubTab === 'symbols' && (
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          {/* Scope Hierarchy Tree */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Scope Hierarchy Tree
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              {safeScopes.map((sc) => (
                <div
                  key={sc.id}
                  className={`px-2.5 py-1 rounded border flex items-center gap-2 ${
                    sc.level === 0
                      ? 'bg-purple-950/40 border-purple-800/60 text-purple-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-bold">Scope #{sc.id}</span>
                  <span className="text-slate-400">({sc.name})</span>
                  <span className="text-[10px] text-slate-500">
                    {sc.parentId !== null ? `parent: #${sc.parentId}` : 'root'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Symbol Table entries */}
          <div className="flex-1 overflow-auto bg-slate-950 p-3 rounded-lg border border-slate-800 scrollbar-thin">
            <table className="w-full min-w-[560px] text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                  <th className="py-2 px-3">Identifier</th>
                  <th className="py-2 px-3">Kind</th>
                  <th className="py-2 px-3">Data Type</th>
                  <th className="py-2 px-3">Scope</th>
                  <th className="py-2 px-3">Declared</th>
                  <th className="py-2 px-3">References</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSymbols.map((sym) => {
                  const refs = Array.isArray(sym.references) ? sym.references : [];
                  const isUnused = sym.kind === 'variable' && refs.length === 0;
                  return (
                    <tr key={sym.id} className="border-b border-slate-800/40 hover:bg-slate-900/40">
                      <td className="py-2 px-3 font-bold text-indigo-300">{sym.name}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            sym.kind === 'function'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : sym.kind === 'parameter'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {sym.kind}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-emerald-400 font-bold">{sym.dataType}</td>
                      <td className="py-2 px-3 text-slate-400">
                        Scope #{sym.scopeId} ({sym.scopeName})
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        Line {sym.declaredLine}:{sym.declaredColumn}
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {refs.length > 0 ? (
                          <span>{refs.map((r) => `L${r.line}`).join(', ')}</span>
                        ) : (
                          <span className="text-slate-600">0 refs</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {isUnused ? (
                          <span className="flex items-center gap-1 text-amber-400 text-[11px] font-semibold">
                            <AlertTriangle className="w-3 h-3" /> Unused
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 2: SDD Rules */}
      {activeSubTab === 'sdd' && (
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-3 font-mono text-xs">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
              Syntax-Directed Definition Schema (Attributes & Semantic Rules)
            </h4>
            <div className="space-y-3">
              {NOVALANG_SDD_RULES.map((rule, idx) => (
                <div key={idx} className="p-3 bg-slate-900 rounded border border-slate-800">
                  <div className="text-purple-300 font-bold text-sm mb-2">{rule.production}</div>
                  <div className="space-y-1 pl-3">
                    {rule.synthesized.map((s, sidx) => (
                      <div key={sidx} className="text-emerald-300">
                        <span className="text-slate-500 font-semibold">[Synthesized]</span> {s.rule}
                      </div>
                    ))}
                    {rule.inherited.map((inh, iidx) => (
                      <div key={iidx} className="text-cyan-300">
                        <span className="text-slate-500 font-semibold">[Inherited]</span> {inh.rule}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Attribute Dependency Graph */}
      {activeSubTab === 'depgraph' && (
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4 font-mono text-xs">
          {sddDependencyGraph ? (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 font-semibold">Topological Evaluation Order:</span>
                  <span className="text-emerald-400 font-bold">
                    {sddDependencyGraph.hasCycle ? 'CYCLE DETECTED (Circular Dependency)' : 'S-Attributed / L-Attributed Valid'}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] shrink-0">
                  {sddDependencyGraph.nodes.length} attribute nodes, {sddDependencyGraph.edges.length} dependency edges
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {/* Node evaluation list */}
                <div className="flex-1 min-w-[280px] bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-auto">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
                    Topological Evaluation Order
                  </h4>
                  <div className="space-y-1.5">
                    {sddDependencyGraph.evaluationOrder.map((nodeId, idx) => {
                      const node = sddDependencyGraph.nodes.find((n) => n.id === nodeId);
                      return (
                        <div
                          key={nodeId}
                          className="flex items-center gap-2 p-1.5 bg-slate-900 rounded border border-slate-800 text-slate-300"
                        >
                          <span className="text-slate-500 w-6 font-bold">#{idx + 1}</span>
                          <span className="text-purple-300 font-bold">{node?.symbol}.{node?.attributeName}</span>
                          <span className="text-slate-500">=</span>
                          <span className="text-emerald-300">{String(node?.value)}</span>
                          <span className="text-[10px] ml-auto px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {node?.attributeType}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dependency Edges List */}
                <div className="flex-1 min-w-[280px] bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-auto">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
                    Attribute Dependency Edges (u → v)
                  </h4>
                  <div className="space-y-1">
                    {sddDependencyGraph.edges.map((e, idx) => (
                      <div key={idx} className="p-1 text-slate-300 flex items-center gap-2">
                        <span className="text-indigo-400 font-bold">{e.from}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-emerald-400 font-bold">{e.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 italic p-4">No Dependency Graph available.</div>
          )}
        </div>
      )}
    </div>
  );
};
