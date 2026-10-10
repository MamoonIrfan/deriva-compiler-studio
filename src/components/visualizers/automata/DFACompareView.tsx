import React, { useState } from 'react';
import { DFA, MinimizationResult } from '../../../types';
import { AutomatonGraph, GraphEdge, GraphNode } from './AutomatonGraph';
import { AutomataStepper } from './AutomataStepper';

interface DFACompareViewProps {
  originalDFA: DFA;
  minimizationResult: MinimizationResult;
}

export const DFACompareView: React.FC<DFACompareViewProps> = ({ originalDFA, minimizationResult }) => {
  const { minimizedDFA, steps, stateMapping } = minimizationResult;

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1000);
  const [selectedMinState, setSelectedMinState] = useState<number | null>(null);
  const [activeGraphTab, setActiveGraphTab] = useState<'both' | 'orig' | 'min'>('both');

  const currentStep = steps[currentStepIndex] || steps[0];

  // Original DFA Nodes
  const origNodes: GraphNode[] = React.useMemo(() => {
    return originalDFA.states.map((s) => ({
      id: s.id,
      label: `D${s.id}`,
      sublabel: `{${s.nfaStates.map((id) => `S${id}`).join(',')}}`,
      isStart: s.isStart,
      isAccept: s.isAccept,
      reason: s.reason,
    }));
  }, [originalDFA]);

  // Original DFA Edges
  const origEdges: GraphEdge[] = React.useMemo(() => {
    const list: GraphEdge[] = [];
    originalDFA.states.forEach((s) => {
      Object.entries(s.transitions).forEach(([char, toId]) => {
        list.push({ from: s.id, to: Number(toId), label: char, isEpsilon: false });
      });
    });
    return list;
  }, [originalDFA]);

  // Minimized DFA Nodes
  const minNodes: GraphNode[] = React.useMemo(() => {
    return minimizedDFA.states.map((s) => {
      const mergedList = stateMapping[s.id] || [s.id];
      return {
        id: s.id,
        label: `M${s.id}`,
        sublabel: `{${mergedList.map((id) => `D${id}`).join(',')}}`,
        isStart: s.isStart,
        isAccept: s.isAccept,
        reason: s.reason,
      };
    });
  }, [minimizedDFA, stateMapping]);

  // Minimized DFA Edges
  const minEdges: GraphEdge[] = React.useMemo(() => {
    const list: GraphEdge[] = [];
    minimizedDFA.states.forEach((s) => {
      Object.entries(s.transitions).forEach(([char, toId]) => {
        list.push({ from: s.id, to: Number(toId), label: char, isEpsilon: false });
      });
    });
    return list;
  }, [minimizedDFA]);

  // When a minimized state is selected, highlight its merged states in original DFA
  const highlightedOriginalStates = React.useMemo(() => {
    if (selectedMinState !== null && stateMapping[selectedMinState]) {
      return stateMapping[selectedMinState];
    }
    // Or if currently inspecting a partition split in the stepper
    if (currentStep?.groupBefore && currentStep.groupBefore.length > 0) {
      return currentStep.groupBefore;
    }
    return [];
  }, [selectedMinState, stateMapping, currentStep]);

  // Metrics
  const origStateCount = originalDFA.states.length;
  const minStateCount = minimizedDFA.states.length;
  const reduction = origStateCount > 0 ? Math.round(((origStateCount - minStateCount) / origStateCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md min-w-0">
          <span className="text-[11px] text-slate-400 uppercase font-semibold truncate block">Original States</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-200 mt-0.5 truncate">{origStateCount} states</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md min-w-0">
          <span className="text-[11px] text-slate-400 uppercase font-semibold truncate block">Minimized States</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-0.5 truncate">{minStateCount} states</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md min-w-0">
          <span className="text-[11px] text-slate-400 uppercase font-semibold truncate block">State Reduction</span>
          <div className="text-sm sm:text-base font-bold font-mono text-cyan-400 mt-0.5 truncate">
            {origStateCount - minStateCount} eliminated ({reduction}%)
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl shadow-md min-w-0">
          <span className="text-[11px] text-slate-400 uppercase font-semibold truncate block">Algorithm</span>
          <div className="text-xs sm:text-sm font-semibold font-mono text-purple-300 mt-1 truncate">Hopcroft Refinement</div>
        </div>
      </div>

      {/* Stepper for Partition Refinement */}
      {steps.length > 0 && (
        <AutomataStepper
          currentStep={currentStepIndex}
          totalSteps={steps.length}
          isPlaying={isPlaying}
          speed={speed}
          onStepChange={(idx) => setCurrentStepIndex(idx)}
          onPlayToggle={() => setIsPlaying((p) => !p)}
          onSpeedChange={(s) => setSpeed(s)}
          stepTitle={
            currentStep?.symbol
              ? `Refinement on symbol '${currentStep.symbol}'`
              : currentStepIndex === 0
              ? 'Initial Partition (Accepting vs Non-Accepting)'
              : 'Stable Partition Reached'
          }
          badge={currentStep?.symbol ? `Splitting on '${currentStep.symbol}'` : 'Partition Group'}
          badgeColor="purple"
          explanation={currentStep?.explanation}
        />
      )}

      {/* Responsive View Switcher */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveGraphTab('both')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
              activeGraphTab === 'both' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dual Comparison
          </button>
          <button
            onClick={() => setActiveGraphTab('orig')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
              activeGraphTab === 'orig' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Original DFA
          </button>
          <button
            onClick={() => setActiveGraphTab('min')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
              activeGraphTab === 'min' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Minimized DFA
          </button>
        </div>
      </div>

      {/* Dual / Responsive Graphs Comparison */}
      <div className="flex flex-wrap gap-4">
        {/* Original DFA */}
        {(activeGraphTab === 'both' || activeGraphTab === 'orig') && (
          <div className="flex-1 min-w-0 sm:min-w-[280px] w-full sm:w-auto space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1 flex-wrap gap-1">
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shrink-0" />
                <span>Original DFA</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono truncate max-w-full">
                {origStateCount} states, {origEdges.length} transitions
              </span>
            </div>
            <AutomatonGraph
              nodes={origNodes}
              edges={origEdges}
              activeStates={highlightedOriginalStates}
              height={360}
              title="Original DFA"
            />
          </div>
        )}

        {/* Minimized DFA */}
        {(activeGraphTab === 'both' || activeGraphTab === 'min') && (
          <div className="flex-1 min-w-0 sm:min-w-[280px] w-full sm:w-auto space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1 flex-wrap gap-1">
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                <span>Minimized DFA</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-mono truncate max-w-full">
                {minStateCount} states ({reduction}% smaller)
              </span>
            </div>
            <AutomatonGraph
              nodes={minNodes}
              edges={minEdges}
              selectedState={selectedMinState}
              onSelectState={(id) => setSelectedMinState(id)}
              height={360}
              title="Minimized DFA"
            />
          </div>
        )}
      </div>

      {/* State Equivalence & Partition Mapping Table */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/90 p-3.5 shadow-md">
        <h4 className="text-xs font-bold text-slate-200 tracking-wide uppercase mb-2">
          State Equivalence Classes (Partition Groups)
        </h4>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[550px] text-left text-xs font-mono border-collapse">
            <thead className="bg-slate-800 text-slate-300">
              <tr className="border-b border-slate-700">
                <th className="py-2 px-3 font-semibold">Minimized State</th>
                <th className="py-2 px-3 font-semibold">Merged Original States</th>
                <th className="py-2 px-3 font-semibold">Underlying NFA States</th>
                <th className="py-2 px-3 font-semibold">Type</th>
                <th className="py-2 px-3 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {minimizedDFA.states.map((s) => {
                const mergedList = stateMapping[s.id] || [s.id];
                const isSelected = selectedMinState === s.id;

                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedMinState(s.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-950/60 text-emerald-200 font-bold border-l-4 border-emerald-400'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-emerald-400">M{s.id}</td>
                    <td className="py-2 px-3 text-cyan-300 font-semibold">
                      {'{' + mergedList.map((id) => `D${id}`).join(', ') + '}'}
                    </td>
                    <td className="py-2 px-3 text-slate-300">
                      {'{' + s.nfaStates.map((id) => `S${id}`).join(', ') + '}'}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        {s.isStart && (
                          <span className="bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded text-[10px]">
                            Start
                          </span>
                        )}
                        {s.isAccept && (
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded text-[10px]">
                            Accepting
                          </span>
                        )}
                        {!s.isStart && !s.isAccept && (
                          <span className="text-slate-500 text-[10px]">Regular</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-[11px] truncate max-w-xs">{s.reason}</td>
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
