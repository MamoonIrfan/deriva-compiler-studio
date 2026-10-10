import React, { useState } from 'react';
import { Grammar, ParseTreeNode, ProgramNode, ShiftReduceStep, Token } from '../../types';
import { FirstFollowCalculator } from '../../compiler/grammar/firstFollow';
import { LL1ParserGenerator } from '../../compiler/grammar/ll1';
import { SLR1ParserGenerator } from '../../compiler/grammar/slr1';
import { LALR1ParserGenerator } from '../../compiler/grammar/lalr1';
import { ShiftReduceSimulator } from '../../compiler/grammar/shiftReduce';
import { DERIVA_GRAMMAR, ARITHMETIC_EXPR_GRAMMAR, LL1_EXPR_GRAMMAR } from '../../compiler/grammar/grammar';
import { ChevronDown, ChevronRight, Play } from 'lucide-react';
import { Lexer } from '../../compiler/lexer/lexer';

interface ParserVisualizerProps {
  ast: ProgramNode | null;
  parseTree: ParseTreeNode | null;
}

export const ParserVisualizer: React.FC<ParserVisualizerProps> = ({ ast, parseTree }) => {
  const [activeSubTab, setActiveSubTab] = useState<'ast' | 'cpt' | 'grammar' | 'tables' | 'simulator'>('ast');
  const [selectedGrammarKey, setSelectedGrammarKey] = useState<'deriva' | 'arithmetic' | 'll1_expr'>('arithmetic');
  const [selectedTableAlgo, setSelectedTableAlgo] = useState<'ll1' | 'slr1' | 'lalr1'>('slr1');

  // Simulator test string
  const [simInput, setSimInput] = useState('a + b * c');
  const [simSteps, setSimSteps] = useState<ShiftReduceStep[]>([]);
  const [simAccepted, setSimAccepted] = useState<boolean | null>(null);

  const activeGrammar: Grammar =
    selectedGrammarKey === 'deriva'
      ? DERIVA_GRAMMAR
      : selectedGrammarKey === 'll1_expr'
      ? LL1_EXPR_GRAMMAR
      : ARITHMETIC_EXPR_GRAMMAR;

  const firstFollow = new FirstFollowCalculator(activeGrammar);
  const firstSets = firstFollow.getFirstSets();
  const followSets = firstFollow.getFollowSets();

  const handleSimulate = () => {
    try {
      const slrGen = new SLR1ParserGenerator(activeGrammar);
      const slrTable = slrGen.generateSLRTable();
      const simulator = new ShiftReduceSimulator(slrTable, activeGrammar);

      // Tokenize input string
      const lexer = new Lexer(simInput);
      const { tokens } = lexer.tokenize();

      const res = simulator.simulate(tokens);
      setSimSteps(res.steps);
      setSimAccepted(res.success);
    } catch (err) {
      console.error(err);
      setSimAccepted(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] text-slate-200 rounded-lg overflow-hidden border border-slate-800">
      {/* Sub-tabs header */}
      <div className="min-h-9 py-1 flex items-center justify-between px-2.5 sm:px-3 bg-[#1a1f2b] border-b border-slate-800 text-xs flex-wrap gap-2 select-none shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 py-0.5">
          {[
            { id: 'ast', label: 'AST' },
            { id: 'cpt', label: 'Parse Tree (CST)' },
            { id: 'grammar', label: 'FIRST / FOLLOW' },
            { id: 'tables', label: 'Parsing Tables' },
            { id: 'simulator', label: 'Shift/Reduce' },
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

        {/* Grammar switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-400 text-[11px]">Grammar:</span>
          <select
            value={selectedGrammarKey}
            onChange={(e) => setSelectedGrammarKey(e.target.value as any)}
            className="bg-[#0b0e14] text-slate-200 px-2 py-0.5 rounded text-[11px] border border-slate-700 focus:outline-none"
          >
            <option value="arithmetic">Arithmetic (E → E + T)</option>
            <option value="ll1_expr">LL(1) Expression</option>
            <option value="deriva">Full Deriva</option>
          </select>
        </div>
      </div>

      {/* View 1: AST Interactive Tree */}
      {activeSubTab === 'ast' && (
        <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-[#0b0e14]">
          {ast ? (
            <ASTTreeNodeView node={ast} />
          ) : (
            <div className="text-slate-500 italic p-4">No AST available. Write valid Deriva code to generate AST.</div>
          )}
        </div>
      )}

      {/* View 2: Concrete Parse Tree */}
      {activeSubTab === 'cpt' && (
        <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-[#0b0e14]">
          {parseTree ? (
            <ParseTreeNodeView node={parseTree} />
          ) : (
            <div className="text-slate-500 italic p-4">No Parse Tree available.</div>
          )}
        </div>
      )}

      {/* View 3: Grammar & FIRST / FOLLOW Sets */}
      {activeSubTab === 'grammar' && (
        <div className="flex-1 overflow-auto p-3 flex flex-wrap gap-3 bg-[#0b0e14]">
          {/* Productions List */}
          <div className="flex-1 min-w-0 sm:min-w-[260px] w-full sm:w-auto bg-[#131720] p-3 rounded border border-slate-800 flex flex-col">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-2">
              Grammar Productions ({activeGrammar.name || selectedGrammarKey})
            </h4>
            <div className="space-y-1 font-mono text-xs overflow-auto flex-1">
              {activeGrammar.productions.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-300 py-0.5">
                  <span className="text-slate-500 w-6 font-bold">({p.id})</span>
                  <span className="text-purple-300 font-bold">{p.lhs}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-emerald-300">{p.rhs.join(' ') || 'ε'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FIRST and FOLLOW Table */}
          <div className="flex-1 min-w-0 sm:min-w-[260px] w-full sm:w-auto bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col overflow-x-auto scrollbar-thin">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
              FIRST & FOLLOW Sets
            </h4>
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-2">Non-Terminal</th>
                  <th className="py-2 px-2">FIRST(A)</th>
                  <th className="py-2 px-2">FOLLOW(A)</th>
                </tr>
              </thead>
              <tbody>
                {activeGrammar.nonTerminals.map((nt) => {
                  const fSet = firstSets[nt] || [];
                  const flSet = followSets[nt] || [];
                  return (
                    <tr key={nt} className="border-b border-slate-800/50 hover:bg-slate-900">
                      <td className="py-2 px-2 text-purple-300 font-bold">{nt}</td>
                      <td className="py-2 px-2 text-amber-300">&#123; {fSet.join(', ') || '∅'} &#125;</td>
                      <td className="py-2 px-2 text-cyan-300">&#123; {flSet.join(', ') || '∅'} &#125;</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 4: Parsing Tables (LL1 / SLR1 / LALR1) */}
      {activeSubTab === 'tables' && (
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 font-semibold">Algorithm:</span>
            {(['ll1', 'slr1', 'lalr1'] as const).map((algo) => (
              <button
                key={algo}
                onClick={() => setSelectedTableAlgo(algo)}
                className={`px-3 py-1 rounded uppercase text-[11px] font-bold transition cursor-pointer ${
                  selectedTableAlgo === algo
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {algo.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto bg-slate-950 p-3 rounded-lg border border-slate-800">
            <LRTableView grammar={activeGrammar} algo={selectedTableAlgo} />
          </div>
        </div>
      )}

      {/* View 5: Shift / Reduce Simulator */}
      {activeSubTab === 'simulator' && (
        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs flex-wrap">
            <span className="text-slate-400 font-semibold shrink-0">Input Expression:</span>
            <input
              type="text"
              value={simInput}
              onChange={(e) => setSimInput(e.target.value)}
              className="flex-1 min-w-[120px] bg-slate-900 border border-slate-700 px-3 py-1.5 rounded font-mono text-emerald-300 text-xs"
              placeholder="e.g. a + b * c"
            />
            <button
              onClick={handleSimulate}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 sm:px-4 py-1.5 rounded font-semibold transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simulate Parse</span>
            </button>

            {simAccepted !== null && (
              <span
                className={`px-3 py-1 rounded text-xs font-bold shrink-0 whitespace-nowrap ${
                  simAccepted
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-rose-950 text-rose-300 border border-rose-700'
                }`}
              >
                {simAccepted ? 'PARSE ACCEPTED' : 'PARSE ERROR'}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto bg-slate-950 p-3 rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                  <th className="py-2 px-3">Step</th>
                  <th className="py-2 px-3">State Stack</th>
                  <th className="py-2 px-3">Symbol Stack</th>
                  <th className="py-2 px-3">Input Lookahead</th>
                  <th className="py-2 px-3">Action Taken</th>
                </tr>
              </thead>
              <tbody>
                {simSteps.map((s) => (
                  <tr key={s.step} className="border-b border-slate-800/40 hover:bg-slate-900/40">
                    <td className="py-1.5 px-3 text-slate-500 font-bold">{s.step}</td>
                    <td className="py-1.5 px-3 text-indigo-300">[{s.stateStack.join(', ')}]</td>
                    <td className="py-1.5 px-3 text-purple-300 font-semibold">{s.symbolStack.join(' ')}</td>
                    <td className="py-1.5 px-3 text-emerald-300 font-semibold">
                      {s.inputTokens.slice(s.currentInputIndex).map((t) => t.lexeme).join(' ')}
                    </td>
                    <td className="py-1.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          s.actionTaken.startsWith('Shift')
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : s.actionTaken.startsWith('Reduce')
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : s.actionTaken === 'Accept'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {s.actionTaken}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for AST Tree View
const ASTTreeNodeView: React.FC<{ node: any; depth?: number }> = ({ node, depth = 0 }) => {
  const [collapsed, setCollapsed] = useState(false);

  if (!node || typeof node !== 'object') {
    return <span className="text-slate-400">{String(node)}</span>;
  }

  const keys = Object.keys(node).filter((k) => k !== 'type' && k !== 'location' && k !== 'inferredType');
  const hasChildren = keys.length > 0;

  return (
    <div className="pl-3 border-l border-slate-800 my-1">
      <div
        className="flex items-center gap-1.5 py-0.5 cursor-pointer hover:text-indigo-300"
        onClick={() => setCollapsed(!collapsed)}
      >
        {hasChildren ? (
          collapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <span className="w-3.5 h-3.5 inline-block" />
        )}
        <span className="font-bold text-indigo-400">{node.type}</span>
        {node.inferredType && (
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            :{node.inferredType}
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="pl-3 space-y-1">
          {keys.map((key) => {
            const val = node[key];
            if (Array.isArray(val)) {
              return (
                <div key={key} className="pl-2 border-l border-slate-800/60">
                  <span className="text-slate-500 text-[11px] font-semibold">{key}: [</span>
                  {val.map((item, idx) => (
                    <ASTTreeNodeView key={idx} node={item} depth={depth + 1} />
                  ))}
                  <span className="text-slate-500 text-[11px] font-semibold">]</span>
                </div>
              );
            } else if (val && typeof val === 'object' && val.type) {
              return (
                <div key={key} className="pl-2 border-l border-slate-800/60">
                  <span className="text-slate-500 text-[11px] font-semibold">{key}:</span>
                  <ASTTreeNodeView node={val} depth={depth + 1} />
                </div>
              );
            } else {
              return (
                <div key={key} className="text-slate-400 pl-4">
                  <span className="text-slate-500">{key}: </span>
                  <span className="text-emerald-300 font-semibold">{String(val)}</span>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
};

// Sub-component for Parse Tree Node View
const ParseTreeNodeView: React.FC<{ node: ParseTreeNode }> = ({ node }) => {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="pl-3 border-l border-slate-800 my-1">
      <div
        className="flex items-center gap-1.5 py-0.5 cursor-pointer hover:text-indigo-300"
        onClick={() => setCollapsed(!collapsed)}
      >
        {hasChildren ? (
          collapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        ) : (
          <span className="w-3.5 h-3.5 inline-block" />
        )}
        <span className={node.isTerminal ? 'font-bold text-emerald-400' : 'font-bold text-purple-400'}>
          {node.symbol}
        </span>
        {node.token && (
          <span className="text-[10px] text-amber-300 bg-amber-950/60 px-1 rounded border border-amber-800/40">
            '{node.token.lexeme}'
          </span>
        )}
        {node.attributes?.['val'] !== undefined && (
          <span className="text-[10px] text-cyan-300">
            [val={String(node.attributes['val'])}]
          </span>
        )}
      </div>

      {!collapsed && hasChildren && (
        <div className="pl-3">
          {node.children.map((child) => (
            <ParseTreeNodeView key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

// Sub-component for LR Table
const LRTableView: React.FC<{ grammar: Grammar; algo: 'll1' | 'slr1' | 'lalr1' }> = ({ grammar, algo }) => {
  if (algo === 'll1') {
    const llGen = new LL1ParserGenerator(grammar);
    const table = llGen.getTable();
    return (
      <div className="overflow-x-auto font-mono text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900 text-slate-300">
              <th className="py-2 px-3">Non-Terminal</th>
              {table.terminals.map((t) => (
                <th key={t} className="py-2 px-2 text-emerald-400">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.nonTerminals.map((nt) => (
              <tr key={nt} className="border-b border-slate-800/40 hover:bg-slate-900/30">
                <td className="py-2 px-3 font-bold text-purple-300">{nt}</td>
                {table.terminals.map((t) => {
                  const prod = table.table[nt]?.[t];
                  return (
                    <td key={t} className="py-1.5 px-2 text-slate-400">
                      {prod ? (
                        <span className="text-indigo-300 font-semibold">
                          {prod.lhs} → {prod.rhs.join(' ')}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const lrTable =
    algo === 'slr1'
      ? new SLR1ParserGenerator(grammar).generateSLRTable()
      : new LALR1ParserGenerator(grammar).generateLALRTable();
  const stateIds = Array.from({ length: lrTable.states }, (_, i) => i);
  const terminals = Array.from(new Set([...lrTable.terminals, '$']));

  return (
    <div className="overflow-x-auto font-mono text-xs scrollbar-thin">
      <table className="w-full min-w-[500px] text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900 text-slate-300">
            <th className="py-2 px-3">State</th>
            {terminals.map((t) => (
              <th key={t} className="py-2 px-2 text-emerald-400">{t}</th>
            ))}
            {lrTable.nonTerminals.map((nt) => (
              <th key={nt} className="py-2 px-2 text-purple-400">{nt}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stateIds.map((stId) => (
            <tr key={stId} className="border-b border-slate-800/40 hover:bg-slate-900/30">
              <td className="py-1.5 px-3 text-indigo-400 font-bold bg-slate-950/60">{stId}</td>
              {terminals.map((t) => {
                const actions = lrTable.actionTable[stId]?.[t] || [];
                return (
                  <td key={t} className="py-1.5 px-2 text-slate-400">
                    {actions.map((act, actIdx) => (
                      <span
                        key={actIdx}
                        className={`mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          act.type === 'shift'
                            ? 'bg-blue-950 text-blue-300'
                            : act.type === 'reduce'
                            ? 'bg-amber-950 text-amber-300'
                            : act.type === 'accept'
                            ? 'bg-emerald-950 text-emerald-300'
                            : 'bg-rose-950 text-rose-300'
                        }`}
                      >
                        {act.type === 'shift'
                          ? `s${act.stateOrRuleId}`
                          : act.type === 'reduce'
                          ? `r${act.stateOrRuleId}`
                          : act.type}
                      </span>
                    ))}
                  </td>
                );
              })}
              {lrTable.nonTerminals.map((nt) => {
                const target = lrTable.gotoTable[stId]?.[nt];
                return (
                  <td key={nt} className="py-1.5 px-2 text-slate-400 font-bold">
                    {target !== undefined ? target : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
