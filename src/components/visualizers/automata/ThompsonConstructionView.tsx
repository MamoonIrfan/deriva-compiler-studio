import React, { useState } from 'react';
import { NFA, ThompsonConstructionStep } from '../../../types';
import { AutomatonGraph, GraphEdge, GraphNode } from './AutomatonGraph';
import { AutomataStepper } from './AutomataStepper';

interface ThompsonConstructionViewProps {
  nfa: NFA;
  steps: ThompsonConstructionStep[];
}

export const ThompsonConstructionView: React.FC<ThompsonConstructionViewProps> = ({ nfa, steps }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(steps.length > 0 ? steps.length - 1 : 0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1200);

  const currentStep = steps[currentStepIndex] || steps[0];
  const activeNFA = currentStep?.currentNFA || nfa;

  // Convert current snapshot NFA to nodes & edges
  const nodes: GraphNode[] = React.useMemo(() => {
    return activeNFA.states.map((s) => ({
      id: s.id,
      label: `S${s.id}`,
      isStart: s.isStart,
      isAccept: s.isAccept,
      reason: s.isAccept ? 'Accepting State' : s.isStart ? 'Start State' : undefined,
    }));
  }, [activeNFA]);

  const edges: GraphEdge[] = React.useMemo(() => {
    const list: GraphEdge[] = [];
    activeNFA.states.forEach((s) => {
      s.transitions.forEach((t) => {
        list.push({ from: s.id, to: t.toState, label: t.char, isEpsilon: t.char === 'ε' });
      });
      s.epsilonTransitions.forEach((toId) => {
        list.push({ from: s.id, to: toId, label: 'ε', isEpsilon: true });
      });
    });
    return list;
  }, [activeNFA]);

  // Active / newly introduced states and transitions in this step
  const activeStates = currentStep?.statesAdded || [];
  const activeTransitions = currentStep?.transitionsAdded || [];

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
            ? `Operation: ${currentStep.operation.toUpperCase()} (Sub-expression: "${currentStep.fragment}")`
            : 'Thompson Construction'
        }
        badge={currentStep?.operation}
        badgeColor={
          currentStep?.operation === 'literal'
            ? 'cyan'
            : currentStep?.operation === 'concat'
            ? 'blue'
            : currentStep?.operation === 'union'
            ? 'purple'
            : 'emerald'
        }
        explanation={currentStep?.description}
      />

      {/* SVG Automaton Graph */}
      <AutomatonGraph
        nodes={nodes}
        edges={edges}
        activeStates={activeStates}
        activeTransitions={activeTransitions}
        height={380}
        title="Thompson NFA Construction Snapshot"
      />

      {/* Construction History List */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/90 p-3.5 shadow-md">
        <h4 className="text-xs font-bold text-slate-200 tracking-wide uppercase mb-2">
          Thompson Construction Operations History
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
          {steps.map((st, idx) => {
            const isCurrent = idx === currentStepIndex;
            return (
              <div
                key={idx}
                onClick={() => {
                  setCurrentStepIndex(idx);
                  if (isPlaying) setIsPlaying(false);
                }}
                className={`p-2.5 rounded-lg border text-xs font-mono cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>
                    #{st.stepNumber} {st.operation.toUpperCase()}
                  </span>
                  <span className="text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                    "{st.fragment}"
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-sans leading-tight">
                  {st.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
