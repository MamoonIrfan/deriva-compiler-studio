import React, { useState } from 'react';
import { DFA, NFA, SubsetConstructionStep } from '../../../types';
import { AutomatonGraph, GraphEdge, GraphNode } from './AutomatonGraph';
import { AutomataStepper } from './AutomataStepper';

interface SubsetConstructionViewProps {
  nfa: NFA;
  dfa: DFA;
  steps: SubsetConstructionStep[];
}

export const SubsetConstructionView: React.FC<SubsetConstructionViewProps> = ({ nfa, dfa, steps }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1000);
  const [selectedDfaState, setSelectedDfaState] = useState<number | null>(null);
  const [activeGraphTab, setActiveGraphTab] = useState<'both' | 'nfa' | 'dfa'>('both');

  const currentStep = steps[currentStepIndex] || steps[0];

  // NFA nodes
  const nfaNodes: GraphNode[] = React.useMemo(() => {
    return nfa.states.map((s) => ({
      id: s.id,
      label: `S${s.id}`,
      isStart: s.id === nfa.startState,
      isAccept: nfa.acceptStates.includes(s.id),
      reason: nfa.acceptStates.includes(s.id) ? 'NFA Accept State' : 'NFA Regular State',
    }));
  }, [nfa]);

  // NFA edges
  const nfaEdges: GraphEdge[] = React.useMemo(() => {
    const list: GraphEdge[] = [];
    nfa.states.forEach((s) => {
      s.transitions.forEach((t) => {
        list.push({ from: s.id, to: t.toState, label: t.char, isEpsilon: t.char === 'ε' });
      });
      s.epsilonTransitions.forEach((toId) => {
        list.push({ from: s.id, to: toId, label: 'ε', isEpsilon: true });
      });
    });
    return list;
  }, [nfa]);

  // Partial DFA at current step or full DFA
  const effectiveDFA = currentStep?.partialDFA || dfa;

  const dfaNodes: GraphNode[] = React.useMemo(() => {
    return effectiveDFA.states.map((s) => ({
      id: s.id,
      label: `D${s.id}`,
      sublabel: `{${s.nfaStates.map((id) => `S${id}`).join(',')}}`,
      isStart: s.isStart,
      isAccept: s.isAccept,
      reason: s.reason,
    }));
  }, [effectiveDFA]);

  const dfaEdges: GraphEdge[] = React.useMemo(() => {
    const list: GraphEdge[] = [];
    effectiveDFA.states.forEach((s) => {
      Object.entries(s.transitions).forEach(([char, toId]) => {
        list.push({ from: s.id, to: Number(toId), label: char, isEpsilon: false });
      });
    });
    return list;
  }, [effectiveDFA]);

  // Active NFA states for current step
  const activeNFAStates = React.useMemo(() => {
    if (!currentStep) return [];
    // Combine nfaSet and closureSet
    const set = new Set<number>();
    (currentStep.nfaStates || currentStep.nfaSet || []).forEach((id) => set.add(id));
    (currentStep.closureResult || currentStep.closureSet || []).forEach((id) => set.add(id));
    return Array.from(set);
  }, [currentStep]);

  // Active DFA states for current step
  const activeDFAStates = React.useMemo(() => {
    if (!currentStep) return [];
    const list: number[] = [];
    if (currentStep.dfaStateId !== undefined) list.push(currentStep.dfaStateId);
    if (currentStep.targetDfaStateId !== undefined && !list.includes(currentStep.targetDfaStateId)) {
      list.push(currentStep.targetDfaStateId);
    }
    return list;
  }, [currentStep]);

  // Active DFA transition
  const activeDFATransitions = React.useMemo(() => {
    if (!currentStep || currentStep.dfaStateId === undefined || currentStep.targetDfaStateId === undefined) {
      return [];
    }
    return [
      {
        from: currentStep.dfaStateId,
        to: currentStep.targetDfaStateId,
        char: currentStep.char || currentStep.symbol,
      },
    ];
  }, [currentStep]);

  return (
    <div className="space-y-4">
      {/* Stepper Controller */}
      <AutomataStepper
        currentStep={currentStepIndex}
        totalSteps={steps.length}
        isPlaying={isPlaying}
        speed={speed}
        onStepChange={(idx) => setCurrentStepIndex(idx)}
        onPlayToggle={() => setIsPlaying((p) => !p)}
        onSpeedChange={(s) => setSpeed(s)}
        stepTitle={
          currentStep
            ? `Processing D${currentStep.dfaStateId} on symbol '${currentStep.char || currentStep.symbol}'`
            : undefined
        }
        badge={currentStep?.isNew ? 'New DFA State Created' : 'Target State Reused'}
        badgeColor={currentStep?.isNew ? 'emerald' : 'cyan'}
        explanation={currentStep?.explanation}
      />

      {/* Graph View Switcher for Responsive Devices */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveGraphTab('both')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
              activeGraphTab === 'both' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dual Graphs
          </button>
          <button
            onClick={() => setActiveGraphTab('nfa')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
              activeGraphTab === 'nfa' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Source NFA
          </button>
          <button
            onClick={() => setActiveGraphTab('dfa')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
              activeGraphTab === 'dfa' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Generated DFA
          </button>
        </div>
      </div>

      {/* Dual / Responsive Graph Panes */}
      <div className="flex flex-wrap gap-4">
        {/* Source NFA Graph */}
        {(activeGraphTab === 'both' || activeGraphTab === 'nfa') && (
          <div className="flex-1 min-w-0 sm:min-w-[280px] w-full sm:w-auto space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1 flex-wrap gap-1">
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shrink-0" />
                <span>Source Thompson NFA</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono truncate max-w-full">
                Active subset: {'{'}
                {activeNFAStates.map((s) => `S${s}`).join(', ')}
                {'}'}
              </span>
            </div>
            <AutomatonGraph
              nodes={nfaNodes}
              edges={nfaEdges}
              activeStates={activeNFAStates}
              height={360}
              title="NFA Active Subsets"
            />
          </div>
        )}

        {/* Generated DFA Graph */}
        {(activeGraphTab === 'both' || activeGraphTab === 'dfa') && (
          <div className="flex-1 min-w-0 sm:min-w-[280px] w-full sm:w-auto space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1 flex-wrap gap-1">
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block shrink-0" />
                <span>Generated DFA (Step Snapshot)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono truncate max-w-full">
                State: D{currentStep?.dfaStateId ?? 0} → D{currentStep?.targetDfaStateId ?? 0}
              </span>
            </div>
            <AutomatonGraph
              nodes={dfaNodes}
              edges={dfaEdges}
              activeStates={activeDFAStates}
              activeTransitions={activeDFATransitions}
              selectedState={selectedDfaState}
              onSelectState={(id) => setSelectedDfaState(id)}
              height={360}
              title="DFA Construction"
            />
          </div>
        )}
      </div>

      {/* Synchronized Subset Construction Step Table */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/90 p-3.5 shadow-md">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h4 className="text-xs font-bold text-slate-200 tracking-wide uppercase truncate">
            Subset Construction Table (Powerset Construction Steps)
          </h4>
          <span className="text-[11px] text-slate-400 font-mono shrink-0 hidden sm:inline">
            Click any row to jump to that step
          </span>
        </div>

        <div className="overflow-x-auto max-h-56 overflow-y-auto scrollbar-thin">
          <table className="w-full min-w-[640px] text-left text-xs font-mono border-collapse">
            <thead className="sticky top-0 bg-slate-800 text-slate-300 z-10">
              <tr className="border-b border-slate-700">
                <th className="py-2 px-2.5 font-semibold text-slate-400">Step</th>
                <th className="py-2 px-2.5 font-semibold">DFA State (T)</th>
                <th className="py-2 px-2.5 font-semibold">NFA States Set</th>
                <th className="py-2 px-2.5 font-semibold text-center">Symbol (a)</th>
                <th className="py-2 px-2.5 font-semibold">move(T, a)</th>
                <th className="py-2 px-2.5 font-semibold">ε-closure(move)</th>
                <th className="py-2 px-2.5 font-semibold">Target State</th>
                <th className="py-2 px-2.5 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {steps.map((s, index) => {
                const isSelected = index === currentStepIndex;
                const nfaStatesList = s.nfaStates || s.nfaSet || [];
                const moveList = s.moveResult || s.moveSet || [];
                const closureList = s.closureResult || s.closureSet || [];

                return (
                  <tr
                    key={index}
                    onClick={() => {
                      setCurrentStepIndex(index);
                      if (isPlaying) setIsPlaying(false);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/60 text-cyan-200 font-bold border-l-4 border-cyan-400'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <td className="py-1.5 px-2.5 text-slate-400">#{s.step || index + 1}</td>
                    <td className="py-1.5 px-2.5 font-bold text-cyan-400">D{s.dfaStateId}</td>
                    <td className="py-1.5 px-2.5 text-slate-300">
                      {'{' + nfaStatesList.map((id) => `S${id}`).join(', ') + '}'}
                    </td>
                    <td className="py-1.5 px-2.5 text-center font-bold text-amber-300">
                      {s.char || s.symbol}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-300">
                      {moveList.length > 0 ? '{' + moveList.map((id) => `S${id}`).join(', ') + '}' : '∅'}
                    </td>
                    <td className="py-1.5 px-2.5 text-purple-300">
                      {closureList.length > 0
                        ? '{' + closureList.map((id) => `S${id}`).join(', ') + '}'
                        : '∅'}
                    </td>
                    <td className="py-1.5 px-2.5 font-bold text-cyan-400">
                      D{s.targetDfaStateId ?? s.targetDFAStateId}
                    </td>
                    <td className="py-1.5 px-2.5">
                      {s.isNew || s.isNewState ? (
                        <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded text-[10px]">
                          + New State
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                          Existing
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
    </div>
  );
};
