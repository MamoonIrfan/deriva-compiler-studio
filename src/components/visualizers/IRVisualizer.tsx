import React, { useState } from 'react';
import { DAGNode, IndirectTriple, Quadruple, TACInstruction, Triple } from '../../types';
import { Code2, GitMerge, ListOrdered, Share2, Table } from 'lucide-react';

interface IRVisualizerProps {
  tac: TACInstruction[];
  quadruples: Quadruple[];
  triples: Triple[];
  indirectTriples: IndirectTriple[];
  dag: DAGNode[];
}

export const IRVisualizer: React.FC<IRVisualizerProps> = ({
  tac = [],
  quadruples = [],
  triples = [],
  indirectTriples = [],
  dag = [],
}) => {
  const safeTac = Array.isArray(tac) ? tac : [];
  const safeQuads = Array.isArray(quadruples) ? quadruples : [];
  const safeTriples = Array.isArray(triples) ? triples : [];
  const safeIndirect = Array.isArray(indirectTriples) ? indirectTriples : [];
  const safeDag = Array.isArray(dag) ? dag : [];

  const [activeSubTab, setActiveSubTab] = useState<'tac' | 'quads' | 'triples' | 'indirect' | 'dag'>('tac');

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] text-slate-200 rounded-lg overflow-hidden border border-slate-800">
      {/* Sub-tabs header */}
      <div className="min-h-9 py-1 flex items-center justify-between px-2.5 sm:px-3 bg-[#1a1f2b] border-b border-slate-800 text-xs gap-2 select-none shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 py-0.5">
          {[
            { id: 'tac', label: 'TAC' },
            { id: 'quads', label: 'Quadruples' },
            { id: 'triples', label: 'Triples' },
            { id: 'indirect', label: 'Indirect Triples' },
            { id: 'dag', label: 'Expression DAG' },
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

        <span className="text-slate-500 text-[10px] font-mono shrink-0 hidden sm:inline">{safeTac.length} instructions</span>
      </div>

      {/* Sub-tab 1: TAC Viewer */}
      {activeSubTab === 'tac' && (
        <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-[#0b0e14]">
          <div className="bg-[#131720] p-3 rounded border border-slate-800 space-y-1">
            {safeTac.map((inst) => {
              const isLabel = inst.op === 'LABEL' || inst.op === 'FUNC_BEGIN' || inst.op === 'FUNC_END';
              return (
                <div
                  key={inst.id}
                  className={`flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 py-1 px-2 rounded hover:bg-slate-900 transition ${
                    isLabel ? 'font-bold text-purple-300' : 'text-slate-200'
                  }`}
                >
                  <span className="text-slate-600 w-8 text-right select-none shrink-0">{inst.id}:</span>
                  <span className="w-24 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inst.op === 'ASSIGN'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : ['ADD', 'SUB', 'MUL', 'DIV', 'MOD'].includes(inst.op)
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : ['GOTO', 'IF_FALSE', 'IF_TRUE'].includes(inst.op)
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {inst.op}
                    </span>
                  </span>

                  <span className="flex-1 min-w-0">
                    {inst.op === 'ASSIGN' ? (
                      <span>
                        <span className="text-indigo-300 font-bold">{inst.result}</span> ={' '}
                        <span className="text-emerald-300">{inst.arg1}</span>
                      </span>
                    ) : ['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'EQ', 'NEQ', 'LT', 'LE', 'GT', 'GE', 'AND', 'OR'].includes(
                        inst.op
                      ) ? (
                      <span>
                        <span className="text-indigo-300 font-bold">{inst.result}</span> ={' '}
                        <span className="text-emerald-300">{inst.arg1}</span>{' '}
                        <span className="text-purple-300 font-bold">{inst.op}</span>{' '}
                        <span className="text-emerald-300">{inst.arg2}</span>
                      </span>
                    ) : inst.op === 'IF_FALSE' ? (
                      <span>
                        if_false <span className="text-emerald-300">{inst.arg1}</span> goto{' '}
                        <span className="text-amber-300 font-bold">{inst.result}</span>
                      </span>
                    ) : inst.op === 'GOTO' ? (
                      <span>
                        goto <span className="text-amber-300 font-bold">{inst.result}</span>
                      </span>
                    ) : inst.op === 'LABEL' ? (
                      <span className="text-purple-400 font-bold">{inst.result}:</span>
                    ) : (
                      <span>
                        {inst.arg1 && <span className="text-emerald-300 mr-2">{inst.arg1}</span>}
                        {inst.arg2 && <span className="text-emerald-300 mr-2">{inst.arg2}</span>}
                        {inst.result && <span className="text-indigo-300 font-bold">{inst.result}</span>}
                      </span>
                    )}
                  </span>

                  {inst.sourceLine && (
                    <span className="text-slate-600 text-[10px] shrink-0">line {inst.sourceLine}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Quadruples Table */}
      {activeSubTab === 'quads' && (
        <div className="flex-1 overflow-auto p-4 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                  <th className="py-2 px-3">Index</th>
                  <th className="py-2 px-3">Op</th>
                  <th className="py-2 px-3">Arg1</th>
                  <th className="py-2 px-3">Arg2</th>
                  <th className="py-2 px-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {safeQuads.map((q) => (
                  <tr key={q.index} className="border-b border-slate-800/40 hover:bg-slate-900/30">
                    <td className="py-1.5 px-3 text-slate-500 font-bold">({q.index})</td>
                    <td className="py-1.5 px-3 text-purple-300 font-bold">{q.op}</td>
                    <td className="py-1.5 px-3 text-emerald-300">{q.arg1 || '-'}</td>
                    <td className="py-1.5 px-3 text-emerald-300">{q.arg2 || '-'}</td>
                    <td className="py-1.5 px-3 text-indigo-300 font-bold">{q.result || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Triples Table */}
      {activeSubTab === 'triples' && (
        <div className="flex-1 overflow-auto p-4 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                  <th className="py-2 px-3">Index</th>
                  <th className="py-2 px-3">Op</th>
                  <th className="py-2 px-3">Arg1</th>
                  <th className="py-2 px-3">Arg2</th>
                </tr>
              </thead>
              <tbody>
                {safeTriples.map((t) => (
                  <tr key={t.index} className="border-b border-slate-800/40 hover:bg-slate-900/30">
                    <td className="py-1.5 px-3 text-slate-500 font-bold">({t.index})</td>
                    <td className="py-1.5 px-3 text-purple-300 font-bold">{t.op}</td>
                    <td className="py-1.5 px-3 text-emerald-300">{t.arg1 || '-'}</td>
                    <td className="py-1.5 px-3 text-emerald-300">{t.arg2 || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 4: Indirect Triples Table */}
      {activeSubTab === 'indirect' && (
        <div className="flex-1 overflow-auto p-4 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                  <th className="py-2 px-3">Execution Index</th>
                  <th className="py-2 px-3">Pointer</th>
                  <th className="py-2 px-3">Op</th>
                  <th className="py-2 px-3">Arg1</th>
                  <th className="py-2 px-3">Arg2</th>
                </tr>
              </thead>
              <tbody>
                {safeIndirect.map((it) => (
                  <tr key={it.index} className="border-b border-slate-800/40 hover:bg-slate-900/30">
                    <td className="py-1.5 px-3 text-slate-500 font-bold">{it.index}</td>
                    <td className="py-1.5 px-3 text-indigo-400 font-bold">→ ({it.pointer})</td>
                    <td className="py-1.5 px-3 text-purple-300 font-bold">{it.triple?.op}</td>
                    <td className="py-1.5 px-3 text-emerald-300">{it.triple?.arg1 || '-'}</td>
                    <td className="py-1.5 px-3 text-emerald-300">{it.triple?.arg2 || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 5: Expression DAG */}
      {activeSubTab === 'dag' && (
        <div className="flex-1 overflow-auto p-4 font-mono text-xs flex flex-col gap-4">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <span className="text-indigo-400 font-bold truncate">
              Expression DAG: {safeDag.length} Nodes (Common subexpressions merged)
            </span>
            <span className="text-slate-400 text-[11px] shrink-0">
              Leaf nodes = Identifiers/Constants, Interior nodes = Binary Operations
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {safeDag.map((node) => (
              <div
                key={node.id}
                className={`flex-1 min-w-[200px] p-3 rounded-lg border ${
                  node.isLeaf
                    ? 'bg-slate-950/60 border-slate-800'
                    : 'bg-indigo-950/20 border-indigo-800/50'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className={node.isLeaf ? 'text-emerald-400' : 'text-purple-400 text-sm'}>
                    {node.isLeaf ? `Leaf: ${node.label}` : `Op: ${node.label}`}
                  </span>
                  <span className="text-[10px] text-slate-500">{node.id}</span>
                </div>

                {!node.isLeaf && (
                  <div className="text-[11px] text-slate-400 mb-2 pl-1">
                    <div>Left: <span className="text-indigo-300">{node.left}</span></div>
                    <div>Right: <span className="text-indigo-300">{node.right}</span></div>
                  </div>
                )}

                {node.variables && node.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {node.variables.map((v, vidx) => (
                      <span
                        key={vidx}
                        className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-indigo-300 border border-slate-700 font-bold"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
