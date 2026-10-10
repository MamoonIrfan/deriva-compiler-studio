import React, { useState, useEffect, useMemo } from 'react';
import { DFA, MinimizationResult, NFA, SubsetConstructionStep, ThompsonConstructionStep, Token } from '../../types';
import { NFABuilder } from '../../compiler/lexer/nfa';
import { DFABuilder } from '../../compiler/lexer/dfa';
import { Play, Search, Network, GitFork, Minimize2, Table, Sparkles, AlertCircle } from 'lucide-react';
import { AutomatonGraph, GraphEdge, GraphNode } from './automata/AutomatonGraph';
import { SubsetConstructionView } from './automata/SubsetConstructionView';
import { DFACompareView } from './automata/DFACompareView';
import { TransitionTableView } from './automata/TransitionTableView';
import { ThompsonConstructionView } from './automata/ThompsonConstructionView';
import { InteractiveSimulationBar } from './automata/InteractiveSimulationBar';
import { useAutomataSimulation } from './automata/useAutomataSimulation';

interface LexerVisualizerProps {
  tokens: Token[];
  onTokenClick?: (token: Token) => void;
}

export type AutomataViewMode =
  | 'diagram'
  | 'subset'
  | 'minimization'
  | 'thompson'
  | 'table';

export const LexerVisualizer: React.FC<LexerVisualizerProps> = ({ tokens = [], onTokenClick }) => {
  const safeTokens = Array.isArray(tokens) ? tokens : [];
  const [activeSubTab, setActiveSubTab] = useState<'tokens' | 'automata'>('tokens');
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Automata state
  const [regexPattern, setRegexPattern] = useState('a(b|c)*');
  const [testString, setTestString] = useState('abcb');
  const [nfa, setNfa] = useState<NFA | null>(null);
  const [thompsonSteps, setThompsonSteps] = useState<ThompsonConstructionStep[]>([]);
  const [dfa, setDfa] = useState<DFA | null>(null);
  const [dfaSteps, setDfaSteps] = useState<SubsetConstructionStep[]>([]);
  const [minResult, setMinResult] = useState<MinimizationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Automata viewing mode
  const [automataViewMode, setAutomataViewMode] = useState<AutomataViewMode>('diagram');
  const [diagramMachineType, setDiagramMachineType] = useState<'NFA' | 'DFA' | 'MIN_DFA'>('DFA');
  const [selectedGraphState, setSelectedGraphState] = useState<number | null>(null);

  // Live simulation execution hook synchronized with diagram machine
  const diagramSim = useAutomataSimulation({
    nfa,
    dfa,
    minimizedDFA: minResult?.minimizedDFA,
    initialString: testString,
    machineType: diagramMachineType,
  });

  const handleBuildAutomata = () => {
    try {
      setErrorMsg(null);
      const { nfa: genNfa, steps: tSteps } = NFABuilder.buildWithTrace(regexPattern);
      setNfa(genNfa);
      setThompsonSteps(tSteps);

      const { dfa: genDfa, steps: sSteps } = DFABuilder.fromNFA(genNfa);
      setDfa(genDfa);
      setDfaSteps(sSteps);

      const minRes = DFABuilder.minimize(genDfa);
      setMinResult(minRes);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid regular expression syntax.');
    }
  };

  // Build once on initial load
  useEffect(() => {
    if (!nfa) {
      handleBuildAutomata();
    }
  }, []);

  const filteredTokens = safeTokens.filter((t) => {
    const matchesSearch =
      (t.lexeme || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (t.type || '').toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const tokenTypes = Array.from(new Set(safeTokens.map((t) => t.type))).sort();

  // Convert currently selected machine for the single 'diagram' view
  const { currentDiagramNodes, currentDiagramEdges, currentDiagramTitle } = useMemo(() => {
    if (diagramMachineType === 'NFA' && nfa) {
      const nodes: GraphNode[] = nfa.states.map((s) => ({
        id: s.id,
        label: `S${s.id}`,
        isStart: s.id === nfa.startState,
        isAccept: nfa.acceptStates.includes(s.id),
        reason: nfa.acceptStates.includes(s.id) ? 'NFA Accept State' : 'NFA Intermediate State',
      }));

      const edges: GraphEdge[] = [];
      nfa.states.forEach((s) => {
        s.transitions.forEach((t) => {
          edges.push({ from: s.id, to: t.toState, label: t.char, isEpsilon: t.char === 'ε' });
        });
        s.epsilonTransitions.forEach((toId) => {
          edges.push({ from: s.id, to: toId, label: 'ε', isEpsilon: true });
        });
      });

      return {
        currentDiagramNodes: nodes,
        currentDiagramEdges: edges,
        currentDiagramTitle: `Thompson NFA (${nfa.states.length} states)`,
      };
    } else if (diagramMachineType === 'MIN_DFA' && minResult) {
      const target = minResult.minimizedDFA;
      const nodes: GraphNode[] = target.states.map((s) => {
        const merged = minResult.stateMapping[s.id] || [s.id];
        return {
          id: s.id,
          label: `M${s.id}`,
          sublabel: `{${merged.map((id) => `D${id}`).join(',')}}`,
          isStart: s.isStart,
          isAccept: s.isAccept,
          reason: s.reason,
        };
      });

      const edges: GraphEdge[] = [];
      target.states.forEach((s) => {
        Object.entries(s.transitions).forEach(([char, toId]) => {
          edges.push({ from: s.id, to: Number(toId), label: char, isEpsilon: false });
        });
      });

      return {
        currentDiagramNodes: nodes,
        currentDiagramEdges: edges,
        currentDiagramTitle: `Minimized DFA (${target.states.length} states)`,
      };
    } else if (dfa) {
      const nodes: GraphNode[] = dfa.states.map((s) => ({
        id: s.id,
        label: `D${s.id}`,
        sublabel: `{${s.nfaStates.map((id) => `S${id}`).join(',')}}`,
        isStart: s.isStart,
        isAccept: s.isAccept,
        reason: s.reason,
      }));

      const edges: GraphEdge[] = [];
      dfa.states.forEach((s) => {
        Object.entries(s.transitions).forEach(([char, toId]) => {
          edges.push({ from: s.id, to: Number(toId), label: char, isEpsilon: false });
        });
      });

      return {
        currentDiagramNodes: nodes,
        currentDiagramEdges: edges,
        currentDiagramTitle: `Subset Construction DFA (${dfa.states.length} states)`,
      };
    }

    return {
      currentDiagramNodes: [],
      currentDiagramEdges: [],
      currentDiagramTitle: 'Automaton Diagram',
    };
  }, [diagramMachineType, nfa, dfa, minResult]);

  // Transition table data
  const tableTransitions = useMemo(() => {
    if (diagramMachineType === 'NFA' && nfa) {
      const list: { from: number; char: string; to: number }[] = [];
      nfa.states.forEach((s) => {
        s.transitions.forEach((t) => list.push({ from: s.id, char: t.char, to: t.toState }));
        s.epsilonTransitions.forEach((toId) => list.push({ from: s.id, char: 'ε', to: toId }));
      });
      return list;
    } else if (diagramMachineType === 'MIN_DFA' && minResult) {
      const list: { from: number; char: string; to: number }[] = [];
      minResult.minimizedDFA.states.forEach((s) => {
        Object.entries(s.transitions).forEach(([char, toId]) => {
          list.push({ from: s.id, char, to: Number(toId) });
        });
      });
      return list;
    } else if (dfa) {
      const list: { from: number; char: string; to: number }[] = [];
      dfa.states.forEach((s) => {
        Object.entries(s.transitions).forEach(([char, toId]) => {
          list.push({ from: s.id, char, to: Number(toId) });
        });
      });
      return list;
    }
    return [];
  }, [diagramMachineType, nfa, dfa, minResult]);

  const tableAlphabet = useMemo(() => {
    if (diagramMachineType === 'NFA' && nfa) return nfa.alphabet;
    if (diagramMachineType === 'MIN_DFA' && minResult) return minResult.minimizedDFA.alphabet;
    if (dfa) return dfa.alphabet;
    return [];
  }, [diagramMachineType, nfa, dfa, minResult]);

  return (
    <div className="flex flex-col h-full bg-[#0b0e14] text-slate-200 rounded-lg overflow-hidden border border-slate-800">
      {/* Top Header & Sub-Tabs */}
      <div className="min-h-10 py-1.5 flex flex-wrap items-center justify-between gap-2 px-3 bg-[#131722] border-b border-slate-800 text-xs select-none">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveSubTab('tokens')}
            className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'tokens'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Tokens Table</span>
            <span className="bg-slate-900 px-1.5 py-0.2 rounded text-[10px] text-slate-400 font-mono">
              {safeTokens.length}
            </span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab('automata');
              if (!nfa) handleBuildAutomata();
            }}
            className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'automata'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span><span className="hidden sm:inline">Interactive </span>Automata Lab<span className="hidden md:inline"> (NFA / DFA)</span></span>
          </button>
        </div>

        {activeSubTab === 'tokens' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-slate-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search tokens..."
                className="bg-[#0b0e14] text-slate-200 pl-7 pr-2 py-0.5 rounded text-[11px] border border-slate-700 focus:outline-none w-28 sm:w-36"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#0b0e14] text-slate-200 px-2 py-0.5 rounded text-[11px] border border-slate-700 focus:outline-none shrink-0"
            >
              <option value="ALL">All Types</option>
              {tokenTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Tokens Table */}
      {activeSubTab === 'tokens' && (
        <div className="flex-1 overflow-auto p-2 bg-[#0b0e14]">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-[#131720] text-[11px]">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Token Type</th>
                <th className="py-2 px-3">Lexeme</th>
                <th className="py-2 px-3">Value</th>
                <th className="py-2 px-3">Line:Col</th>
                <th className="py-2 px-3">Length</th>
              </tr>
            </thead>
            <tbody>
              {filteredTokens.map((token, idx) => (
                <tr
                  key={idx}
                  onClick={() => onTokenClick?.(token)}
                  className="border-b border-slate-800/40 hover:bg-slate-900/60 cursor-pointer transition text-[11px]"
                >
                  <td className="py-1 px-3 text-slate-500">{idx + 1}</td>
                  <td className="py-1 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        token.type.startsWith('KEYWORD_')
                          ? 'bg-purple-950/70 text-purple-300 border border-purple-800/60'
                          : token.type === 'IDENTIFIER'
                          ? 'bg-blue-950/70 text-blue-300 border border-blue-800/60'
                          : token.type.startsWith('LITERAL_')
                          ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {token.type}
                    </span>
                  </td>
                  <td className="py-1 px-3 text-emerald-400 font-semibold">
                    {token.lexeme === '\n' ? '\\n' : token.lexeme}
                  </td>
                  <td className="py-1 px-3 text-slate-400">
                    {token.value !== undefined ? String(token.value) : '-'}
                  </td>
                  <td className="py-1 px-3 text-slate-400">
                    {token.line}:{token.column}
                  </td>
                  <td className="py-1 px-3 text-slate-500">{token.lexeme.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Interactive Automata Lab */}
      {activeSubTab === 'automata' && (
        <div className="flex-1 flex flex-col p-3 overflow-auto gap-3.5 bg-[#0b0e14]">
          {/* Automaton Definition / Generation Toolbar */}
          <div className="bg-[#131720] p-2.5 sm:p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-md">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-400 font-medium text-xs font-mono">Regex:</span>
                <input
                  type="text"
                  value={regexPattern}
                  onChange={(e) => setRegexPattern(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuildAutomata()}
                  className="bg-[#0b0e14] border border-slate-700 focus:border-cyan-500 px-2.5 py-1 rounded-md font-mono text-cyan-300 text-xs outline-none w-36 sm:w-44"
                  placeholder="e.g. a(b|c)*"
                />
              </div>

              {/* Presets Quick Selector */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 font-mono shrink-0">Presets:</span>
                {[
                  { label: 'a(b|c)*', regex: 'a(b|c)*', test: 'abcb' },
                  { label: '(a|b)*abb', regex: '(a|b)*abb', test: 'aabb' },
                  { label: '(0|1)*1', regex: '(0|1)*1', test: '0101' },
                  { label: 'if|else', regex: 'if|else', test: 'if' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setRegexPattern(preset.regex);
                      setTestString(preset.test);
                      diagramSim.setInputString(preset.test);
                      setTimeout(() => {
                        try {
                          const { nfa: genNfa, steps: tSteps } = NFABuilder.buildWithTrace(preset.regex);
                          setNfa(genNfa);
                          setThompsonSteps(tSteps);
                          const { dfa: genDfa, steps: sSteps } = DFABuilder.fromNFA(genNfa);
                          setDfa(genDfa);
                          setDfaSteps(sSteps);
                          const minRes = DFABuilder.minimize(genDfa);
                          setMinResult(minRes);
                          setErrorMsg(null);
                        } catch (err: any) {
                          setErrorMsg(err.message);
                        }
                      }, 10);
                    }}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleBuildAutomata}
                className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Build Automata</span>
              </button>
            </div>
          </div>

          {/* Syntax Error Alert */}
          {errorMsg && (
            <div className="flex items-center gap-2 bg-rose-950/70 border border-rose-800 text-rose-300 px-3 py-2 rounded-lg text-xs font-mono">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="break-words break-all">{errorMsg}</span>
            </div>
          )}

          {/* Sub-Navigation for Automata Views (Authoritative 5-View Architecture) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setAutomataViewMode('diagram')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                  automataViewMode === 'diagram'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Network className="w-3.5 h-3.5 shrink-0" />
                <span>Interactive Diagram</span>
              </button>

              <button
                onClick={() => setAutomataViewMode('subset')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                  automataViewMode === 'subset'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <GitFork className="w-3.5 h-3.5 shrink-0" />
                <span>Subset Construction</span>
              </button>

              <button
                onClick={() => setAutomataViewMode('minimization')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                  automataViewMode === 'minimization'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Minimize2 className="w-3.5 h-3.5 shrink-0" />
                <span>DFA Minimization</span>
              </button>

              <button
                onClick={() => setAutomataViewMode('thompson')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                  automataViewMode === 'thompson'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Thompson NFA</span>
              </button>

              <button
                onClick={() => setAutomataViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
                  automataViewMode === 'table'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5 shrink-0" />
                <span>Transition Tables</span>
              </button>
            </div>

            {/* Transition Table Machine Switcher */}
            {automataViewMode === 'table' && (
              <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-slate-800">
                <span className="text-[11px] font-mono text-slate-400 font-semibold px-1.5">Machine:</span>
                <button
                  onClick={() => setDiagramMachineType('NFA')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                    diagramMachineType === 'NFA'
                      ? 'bg-purple-900/80 text-purple-300 border border-purple-700/60 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  NFA
                </button>
                <button
                  onClick={() => setDiagramMachineType('DFA')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                    diagramMachineType === 'DFA'
                      ? 'bg-cyan-900/80 text-cyan-300 border border-cyan-700/60 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  DFA
                </button>
                {minResult && (
                  <button
                    onClick={() => setDiagramMachineType('MIN_DFA')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer ${
                      diagramMachineType === 'MIN_DFA'
                        ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Minimized DFA
                  </button>
                )}
              </div>
            )}
          </div>

          {/* VIEW MODE 1: Interactive SVG State-Transition Diagram with Live String Execution */}
          {automataViewMode === 'diagram' && (
            <div className="space-y-3.5">
              {/* Authoritative Live Interactive String Execution Controller */}
              <InteractiveSimulationBar
                inputString={diagramSim.inputString}
                onInputChange={(str) => {
                  diagramSim.setInputString(str);
                  setTestString(str);
                }}
                currentStepIndex={diagramSim.currentStepIndex}
                totalSteps={diagramSim.totalSteps}
                isPlaying={diagramSim.isPlaying}
                speed={diagramSim.speed}
                onPlayToggle={diagramSim.handlePlayToggle}
                onReset={diagramSim.handleReset}
                onPrev={diagramSim.handlePrev}
                onNext={diagramSim.handleNext}
                onFinish={diagramSim.handleFinish}
                onSpeedChange={diagramSim.setSpeed}
                onStepChange={(idx) => diagramSim.setCurrentStepIndex(idx)}
                simulationStatus={diagramSim.simulationStatus}
                stepTitle={diagramSim.stepTitle}
                explanation={diagramSim.explanation}
                reason={diagramSim.reason}
                machineType={diagramMachineType}
                onMachineTypeChange={(type) => setDiagramMachineType(type)}
                hasMinDFA={Boolean(minResult)}
              />

              {/* Transition Diagram Execution Surface */}
              <AutomatonGraph
                nodes={currentDiagramNodes}
                edges={currentDiagramEdges}
                activeStates={diagramSim.activeStates}
                visitedStates={diagramSim.visitedStates}
                activeTransitions={diagramSim.activeTransitions}
                simulationStatus={diagramSim.simulationStatus}
                selectedState={selectedGraphState}
                onSelectState={(id) => setSelectedGraphState(id)}
                height={460}
                title={currentDiagramTitle}
              />
            </div>
          )}

          {/* VIEW MODE 2: Synchronized Subset Construction Lab */}
          {automataViewMode === 'subset' && nfa && dfa && (
            <SubsetConstructionView nfa={nfa} dfa={dfa} steps={dfaSteps} />
          )}

          {/* VIEW MODE 3: DFA Minimization & Comparison */}
          {automataViewMode === 'minimization' && dfa && minResult && (
            <DFACompareView originalDFA={dfa} minimizationResult={minResult} />
          )}

          {/* VIEW MODE 4: Thompson Steps Construction */}
          {automataViewMode === 'thompson' && nfa && (
            <ThompsonConstructionView nfa={nfa} steps={thompsonSteps} />
          )}

          {/* VIEW MODE 5: Formal Transition Table */}
          {automataViewMode === 'table' && (
            <TransitionTableView
              type={diagramMachineType}
              nodes={currentDiagramNodes}
              alphabet={tableAlphabet}
              transitions={tableTransitions}
              selectedStateId={selectedGraphState}
              onSelectState={(id) => setSelectedGraphState(id)}
            />
          )}
        </div>
      )}
    </div>
  );
};
