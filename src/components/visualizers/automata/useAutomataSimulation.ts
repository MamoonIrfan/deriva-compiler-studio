import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { DFA, DFASimulationStep, NFA, NFASimulationStep } from '../../../types';
import { DFABuilder } from '../../../compiler/lexer/dfa';
import { NFABuilder } from '../../../compiler/lexer/nfa';

export type SimulationMachineType = 'NFA' | 'DFA' | 'MIN_DFA';
export type SimulationStatus = 'SIMULATING' | 'ACCEPTED' | 'REJECTED';

interface UseAutomataSimulationProps {
  nfa: NFA | null;
  dfa: DFA | null;
  minimizedDFA?: DFA | null;
  initialString?: string;
  machineType: SimulationMachineType;
}

export function useAutomataSimulation({
  nfa,
  dfa,
  minimizedDFA,
  initialString = 'abcb',
  machineType,
}: UseAutomataSimulationProps) {
  const [inputString, setInputString] = useState<string>(initialString);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(900);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initialString if it changes externally
  useEffect(() => {
    if (initialString !== undefined && initialString !== inputString) {
      setInputString(initialString);
      setCurrentStepIndex(0);
      setIsPlaying(false);
    }
  }, [initialString]);

  // Compute simulation data using the exact real automaton
  const simulationData = useMemo(() => {
    if (machineType === 'NFA') {
      if (!nfa) return { accepted: false, steps: [] as NFASimulationStep[], reason: 'No NFA available' };
      const res = NFABuilder.simulate(nfa, inputString);
      const lastActive = res.steps[res.steps.length - 1]?.activeAfter || [];
      const reason = res.accepted
        ? `ACCEPTED: Traversal finished with active states {${lastActive.map((id) => `S${id}`).join(', ')}}, which contains accept state(s) [${nfa.acceptStates.map((id) => `S${id}`).join(', ')}].`
        : `REJECTED: Traversal finished with active states {${lastActive.map((id) => `S${id}`).join(', ')}}, containing no accept states.`;
      return {
        accepted: res.accepted,
        steps: res.steps,
        reason,
      };
    } else {
      const targetDFA = machineType === 'MIN_DFA' && minimizedDFA ? minimizedDFA : dfa;
      if (!targetDFA) return { accepted: false, steps: [] as DFASimulationStep[], reason: 'No DFA available' };
      const res = DFABuilder.simulate(targetDFA, inputString);
      return {
        accepted: res.accepted,
        steps: res.steps,
        reason: res.reason,
      };
    }
  }, [machineType, nfa, dfa, minimizedDFA, inputString]);

  const steps = simulationData.steps;
  const totalSteps = steps.length;

  // Ensure currentStepIndex stays within bounds
  useEffect(() => {
    if (currentStepIndex >= totalSteps && totalSteps > 0) {
      setCurrentStepIndex(totalSteps - 1);
    }
  }, [totalSteps, currentStepIndex]);

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < totalSteps - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, speed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, totalSteps, speed]);

  const currentStep = steps[currentStepIndex] || steps[0];

  // Derive visual active elements based on current step
  const { activeStates, activeTransitions, visitedStates, simulationStatus, stepTitle, explanation } = useMemo(() => {
    if (!currentStep) {
      return {
        activeStates: [],
        activeTransitions: [],
        visitedStates: [],
        simulationStatus: 'SIMULATING' as SimulationStatus,
        stepTitle: 'Initializing',
        explanation: 'Ready to begin string execution.',
      };
    }

    const isFinalStep = currentStepIndex >= totalSteps - 1;

    if (machineType === 'NFA') {
      const nStep = currentStep as NFASimulationStep;
      const active = nStep?.activeAfter || (steps[0] as NFASimulationStep)?.activeAfter || (nfa ? [nfa.startState] : []);
      const activeTrans = nStep?.transitionsFollowed || [];

      // Accumulate all visited states up to current step
      const visitedSet = new Set<number>();
      for (let i = 0; i <= currentStepIndex && i < steps.length; i++) {
        const s = steps[i] as NFASimulationStep;
        if (s.activeAfter) s.activeAfter.forEach((id) => visitedSet.add(id));
      }

      let status: SimulationStatus = 'SIMULATING';
      if (isFinalStep) {
        status = simulationData.accepted ? 'ACCEPTED' : 'REJECTED';
      } else if (active.length === 0) {
        status = 'REJECTED';
      }

      const stepTitle =
        currentStepIndex === 0
          ? 'Step 0: Start State & ε-Closure'
          : `Step ${currentStepIndex}/${Math.max(1, totalSteps - 1)}: Read '${inputString[currentStepIndex - 1]}'`;

      return {
        activeStates: active,
        activeTransitions: activeTrans,
        visitedStates: Array.from(visitedSet),
        simulationStatus: status,
        stepTitle,
        explanation: nStep?.explanation || 'Simulating NFA parallel states.',
      };
    } else {
      // DFA or MIN_DFA
      const targetDFA = machineType === 'MIN_DFA' && minimizedDFA ? minimizedDFA : dfa;
      const dStep = currentStep as DFASimulationStep;

      let active: number[] = [];
      let activeTrans: { from: number; to: number; char?: string }[] = [];
      const visitedList: number[] = [];

      for (let i = 0; i <= currentStepIndex && i < steps.length; i++) {
        const s = steps[i] as DFASimulationStep;
        if (i === 0 && targetDFA) {
          visitedList.push(targetDFA.startState);
        } else if (s.nextState !== undefined) {
          visitedList.push(s.nextState);
        }
      }

      if (currentStepIndex === 0) {
        active = targetDFA ? [targetDFA.startState] : [];
        activeTrans = [];
      } else if (dStep.nextState !== undefined) {
        active = [dStep.nextState];
        activeTrans = [{ from: dStep.currentState, to: dStep.nextState, char: dStep.symbol }];
      } else {
        // Trap / dead state: symbol had no transition
        active = [dStep.currentState];
        activeTrans = [];
      }

      let status: SimulationStatus = 'SIMULATING';
      if (dStep.nextState === undefined) {
        status = 'REJECTED';
      } else if (isFinalStep) {
        status = simulationData.accepted ? 'ACCEPTED' : 'REJECTED';
      }

      const stepTitle =
        currentStepIndex === 0
          ? 'Step 0: DFA Initial State'
          : `Step ${currentStepIndex}/${Math.max(1, totalSteps - 1)}: Read '${inputString[currentStepIndex - 1]}'`;

      return {
        activeStates: active,
        activeTransitions: activeTrans,
        visitedStates: Array.from(new Set(visitedList)),
        simulationStatus: status,
        stepTitle,
        explanation: dStep?.explanation || 'Simulating DFA transition path.',
      };
    }
  }, [currentStep, currentStepIndex, totalSteps, machineType, nfa, dfa, minimizedDFA, steps, simulationData, inputString]);

  // Stepper Handlers
  const handleReset = useCallback(() => {
    if (isPlaying) setIsPlaying(false);
    setCurrentStepIndex(0);
  }, [isPlaying]);

  const handlePrev = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
  }, [totalSteps]);

  const handleFinish = useCallback(() => {
    if (isPlaying) setIsPlaying(false);
    setCurrentStepIndex(Math.max(0, totalSteps - 1));
  }, [isPlaying, totalSteps]);

  const handlePlayToggle = useCallback(() => {
    setIsPlaying((prev) => {
      // If at end, loop back to start on play
      if (!prev && currentStepIndex >= totalSteps - 1) {
        setCurrentStepIndex(0);
      }
      return !prev;
    });
  }, [currentStepIndex, totalSteps]);

  const handleInputChange = useCallback(
    (newStr: string) => {
      setInputString(newStr);
      setCurrentStepIndex(0);
      if (isPlaying) setIsPlaying(false);
    },
    [isPlaying]
  );

  return {
    inputString,
    setInputString: handleInputChange,
    currentStepIndex,
    setCurrentStepIndex,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    totalSteps,
    currentStep,
    activeStates,
    activeTransitions,
    visitedStates,
    simulationStatus,
    reason: simulationData.reason,
    stepTitle,
    explanation,
    handleReset,
    handlePrev,
    handleNext,
    handleFinish,
    handlePlayToggle,
  };
}
