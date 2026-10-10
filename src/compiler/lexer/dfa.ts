import { DFA, DFAState, DFASimulationStep, MinimizationResult, MinimizationStep, NFA, SubsetConstructionStep } from '../../types';

export class DFABuilder {
  /**
   * Compute ε-closure of a set of NFA states
   */
  public static epsilonClosure(nfa: NFA, states: number[]): number[] {
    const closure = new Set<number>(states);
    const stack = [...states];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const stateObj = nfa.states.find((s) => s.id === current);
      if (!stateObj) continue;

      for (const epsTarget of stateObj.epsilonTransitions) {
        if (!closure.has(epsTarget)) {
          closure.add(epsTarget);
          stack.push(epsTarget);
        }
      }
    }

    return Array.from(closure).sort((a, b) => a - b);
  }

  /**
   * Compute move(T, a): set of NFA states reachable from state set T on input symbol a
   */
  public static move(nfa: NFA, states: number[], symbol: string): number[] {
    const result = new Set<number>();

    for (const stateId of states) {
      const stateObj = nfa.states.find((s) => s.id === stateId);
      if (!stateObj) continue;

      for (const trans of stateObj.transitions) {
        let matches = trans.char === symbol;
        if (!matches) {
          if (trans.char === 'digit' && /[0-9]/.test(symbol)) matches = true;
          if (trans.char === 'letter' && /[a-zA-Z]/.test(symbol)) matches = true;
        }
        if (matches) {
          result.add(trans.toState);
        }
      }
    }

    return Array.from(result).sort((a, b) => a - b);
  }

  /**
   * Convert NFA to DFA using Powerset (Subset) Construction with step-by-step recording and snapshotting
   */
  public static fromNFA(nfa: NFA): { dfa: DFA; steps: SubsetConstructionStep[] } {
    const steps: SubsetConstructionStep[] = [];
    const dfaStates: DFAState[] = [];
    const dfaStateMap = new Map<string, number>();

    // Initial state: ε-closure({startState})
    const startClosure = this.epsilonClosure(nfa, [nfa.startState]);
    const startKey = startClosure.join(',');

    const acceptingNFAInStart = startClosure.filter((s) => nfa.acceptStates.includes(s));
    const isStartAccept = acceptingNFAInStart.length > 0;
    const startReason = isStartAccept
      ? `Accepting: contains NFA accept state(s) [${acceptingNFAInStart.map((s) => `S${s}`).join(', ')}]`
      : 'Non-accepting: contains no NFA accept states';

    const startDFAState: DFAState = {
      id: 0,
      nfaStates: startClosure,
      isStart: true,
      isAccept: isStartAccept,
      reason: startReason,
      transitions: {},
    };

    dfaStates.push(startDFAState);
    dfaStateMap.set(startKey, 0);

    const unmarkedQueue: number[] = [0];
    let stepCount = 1;

    const alphabet = nfa.alphabet.filter((a) => a !== 'ε');

    const cloneDFAState = (states: DFAState[]): DFA => ({
      startState: 0,
      states: states.map((s) => ({
        id: s.id,
        isStart: s.isStart,
        isAccept: s.isAccept,
        nfaStates: [...s.nfaStates],
        transitions: { ...s.transitions },
        reason: s.reason,
      })),
      acceptStates: states.filter((s) => s.isAccept).map((s) => s.id),
      alphabet,
    });

    while (unmarkedQueue.length > 0) {
      const currentDfaId = unmarkedQueue.shift()!;
      const currentDfaState = dfaStates[currentDfaId];

      for (const symbol of alphabet) {
        const moveSet = this.move(nfa, currentDfaState.nfaStates, symbol);
        if (moveSet.length === 0) continue;

        const closureSet = this.epsilonClosure(nfa, moveSet);
        if (closureSet.length === 0) continue;

        const key = closureSet.join(',');
        let targetDfaId: number;
        let isNew = false;

        if (dfaStateMap.has(key)) {
          targetDfaId = dfaStateMap.get(key)!;
        } else {
          isNew = true;
          targetDfaId = dfaStates.length;
          const acceptingNFA = closureSet.filter((s) => nfa.acceptStates.includes(s));
          const isAccept = acceptingNFA.length > 0;
          const reason = isAccept
            ? `Accepting: contains NFA accept state(s) [${acceptingNFA.map((s) => `S${s}`).join(', ')}]`
            : 'Non-accepting: contains no NFA accept states';

          const newDfaState: DFAState = {
            id: targetDfaId,
            nfaStates: closureSet,
            isStart: false,
            isAccept,
            reason,
            transitions: {},
          };
          dfaStates.push(newDfaState);
          dfaStateMap.set(key, targetDfaId);
          unmarkedQueue.push(targetDfaId);
        }

        currentDfaState.transitions[symbol] = targetDfaId;

        const explanation = isNew
          ? `From D${currentDfaId} {${currentDfaState.nfaStates.map((s) => `S${s}`).join(', ')}} on '${symbol}': move={${moveSet.map((s) => `S${s}`).join(', ')}}, ε-closure={${closureSet.map((s) => `S${s}`).join(', ')}}. Created NEW state D${targetDfaId} and transition D${currentDfaId} --('${symbol}')--> D${targetDfaId}.`
          : `From D${currentDfaId} {${currentDfaState.nfaStates.map((s) => `S${s}`).join(', ')}} on '${symbol}': move={${moveSet.map((s) => `S${s}`).join(', ')}}, ε-closure matches EXISTING state D${targetDfaId}. Added transition D${currentDfaId} --('${symbol}')--> D${targetDfaId}.`;

        steps.push({
          step: stepCount++,
          dfaStateId: currentDfaId,
          nfaStates: currentDfaState.nfaStates,
          nfaSet: currentDfaState.nfaStates,
          char: symbol,
          symbol,
          moveSet,
          moveResult: moveSet,
          closureSet,
          closureResult: closureSet,
          targetDfaStateId: targetDfaId,
          targetDFAStateId: targetDfaId,
          isNew,
          isNewState: isNew,
          explanation,
          partialDFA: cloneDFAState(dfaStates),
        });
      }
    }

    return {
      dfa: {
        startState: 0,
        states: dfaStates,
        acceptStates: dfaStates.filter((s) => s.isAccept).map((s) => s.id),
        alphabet,
      },
      steps,
    };
  }

  /**
   * Minimize DFA using textbook partition refinement (Hopcroft's algorithm)
   */
  public static minimize(dfa: DFA): MinimizationResult {
    // 1. Eliminate unreachable states from startState
    const reachable = new Set<number>();
    const reachQueue = [dfa.startState];
    reachable.add(dfa.startState);

    while (reachQueue.length > 0) {
      const cur = reachQueue.shift()!;
      const state = dfa.states.find((s) => s.id === cur);
      if (!state) continue;
      for (const target of Object.values(state.transitions)) {
        if (!reachable.has(target)) {
          reachable.add(target);
          reachQueue.push(target);
        }
      }
    }

    const reachableStates = dfa.states.filter((s) => reachable.has(s.id));
    const alphabet = dfa.alphabet;

    // 2. Initial partition: Accepting (F) and Non-accepting (S \ F)
    const acceptGroup: number[] = [];
    const nonAcceptGroup: number[] = [];

    for (const s of reachableStates) {
      if (s.isAccept) {
        acceptGroup.push(s.id);
      } else {
        nonAcceptGroup.push(s.id);
      }
    }

    let partitions: number[][] = [];
    if (acceptGroup.length > 0) partitions.push(acceptGroup.sort((a, b) => a - b));
    if (nonAcceptGroup.length > 0) partitions.push(nonAcceptGroup.sort((a, b) => a - b));

    const steps: MinimizationStep[] = [
      {
        stepNumber: 0,
        groupBefore: reachableStates.map((s) => s.id),
        splitGroups: [...partitions],
        partitions: partitions.map((p) => [...p]),
        explanation: `Initial equivalence partition: divided reachable states into accepting {${acceptGroup.map((id) => `D${id}`).join(', ')}} and non-accepting {${nonAcceptGroup.map((id) => `D${id}`).join(', ')}}.`,
      },
    ];

    let changed = true;
    let stepCount = 1;

    // Helper: find which partition contains state id
    const getPartitionIndex = (stateId: number, currentParts: number[][]): number => {
      for (let i = 0; i < currentParts.length; i++) {
        if (currentParts[i].includes(stateId)) return i;
      }
      return -1; // Trap state / no transition
    };

    // 3. Iterative partition refinement
    while (changed) {
      changed = false;
      const newPartitions: number[][] = [];

      for (const group of partitions) {
        if (group.length <= 1) {
          newPartitions.push(group);
          continue;
        }

        // Try to split group based on transitions for each symbol
        let splitOccurred = false;

        for (const symbol of alphabet) {
          // Group states by the partition index of their target state
          const targetBuckets = new Map<number, number[]>();

          for (const stateId of group) {
            const st = reachableStates.find((s) => s.id === stateId);
            const target = st ? st.transitions[symbol] : undefined;
            const targetPart = target !== undefined ? getPartitionIndex(target, partitions) : -1;

            if (!targetBuckets.has(targetPart)) {
              targetBuckets.set(targetPart, []);
            }
            targetBuckets.get(targetPart)!.push(stateId);
          }

          if (targetBuckets.size > 1) {
            // Split occurred!
            const subGroups = Array.from(targetBuckets.values()).map((sg) => sg.sort((a, b) => a - b));
            newPartitions.push(...subGroups);
            splitOccurred = true;
            changed = true;

            steps.push({
              stepNumber: stepCount++,
              symbol,
              groupBefore: [...group],
              splitGroups: subGroups,
              partitions: [...newPartitions, ...partitions.slice(partitions.indexOf(group) + 1)],
              explanation: `Refinement on symbol '${symbol}': group {${group.map((id) => `D${id}`).join(', ')}} transitions to different equivalence classes. Split into ${subGroups.length} subgroups: ${subGroups.map((sg) => `{${sg.map((id) => `D${id}`).join(', ')}}`).join(' and ')}.`,
            });
            break;
          }
        }

        if (!splitOccurred) {
          newPartitions.push(group);
        }
      }

      partitions = newPartitions;
    }

    steps.push({
      stepNumber: stepCount,
      groupBefore: [],
      splitGroups: [],
      partitions: partitions.map((p) => [...p]),
      explanation: `Partition refinement reached a fixed point with ${partitions.length} stable equivalence class(es). Constructed Minimized DFA.`,
    });

    // 4. Construct Minimized DFA
    // Identify group containing original start state
    const startPartIndex = getPartitionIndex(dfa.startState, partitions);
    // Sort partitions so start state group is state 0
    if (startPartIndex > 0) {
      const startGroup = partitions.splice(startPartIndex, 1)[0];
      partitions.unshift(startGroup);
    }

    const stateMapping: Record<number, number[]> = {};
    const originalStateToMinimized: Record<number, number> = {};

    partitions.forEach((group, minId) => {
      stateMapping[minId] = group;
      group.forEach((origId) => {
        originalStateToMinimized[origId] = minId;
      });
    });

    const minDFAStates: DFAState[] = partitions.map((group, minId) => {
      const representative = reachableStates.find((s) => s.id === group[0])!;
      const isStart = minId === 0;
      const isAccept = group.some((origId) => {
        const s = reachableStates.find((st) => st.id === origId);
        return s && s.isAccept;
      });

      const transitions: Record<string, number> = {};
      for (const symbol of alphabet) {
        const targetOrig = representative.transitions[symbol];
        if (targetOrig !== undefined && originalStateToMinimized[targetOrig] !== undefined) {
          transitions[symbol] = originalStateToMinimized[targetOrig];
        }
      }

      const allMergedNFA: number[] = [];
      group.forEach((origId) => {
        const s = reachableStates.find((st) => st.id === origId);
        if (s && s.nfaStates) {
          allMergedNFA.push(...s.nfaStates);
        }
      });
      const uniqueNFA = Array.from(new Set(allMergedNFA)).sort((a, b) => a - b);

      return {
        id: minId,
        isStart,
        isAccept,
        nfaStates: uniqueNFA,
        mergedStates: group,
        reason: isAccept
          ? `Accepting: contains merged state(s) [${group.map((id) => `D${id}`).join(', ')}] with accept conditions`
          : `Non-accepting: merged states [${group.map((id) => `D${id}`).join(', ')}] contain no accept conditions`,
        transitions,
      };
    });

    const minimizedDFA: DFA = {
      startState: 0,
      states: minDFAStates,
      acceptStates: minDFAStates.filter((s) => s.isAccept).map((s) => s.id),
      alphabet,
    };

    return {
      minimizedDFA,
      steps,
      stateMapping,
      originalStateToMinimized,
    };
  }

  /**
   * Simulate a string against a DFA with step-by-step trace and acceptance explanation
   */
  public static simulate(
    dfa: DFA,
    input: string
  ): {
    accepted: boolean;
    path: { state: number; char: string; nextState?: number }[];
    steps: DFASimulationStep[];
    reason: string;
  } {
    const path: { state: number; char: string; nextState?: number }[] = [];
    const steps: DFASimulationStep[] = [];
    let currentState = dfa.startState;

    // Initial state step
    const startObj = dfa.states.find((s) => s.id === currentState);
    steps.push({
      stepIndex: 0,
      currentState,
      symbol: 'Start',
      nextState: currentState,
      explanation: `DFA initialized at start state D${currentState} (Accepting: ${startObj?.isAccept ? 'YES' : 'NO'}).`,
      isAccepted: startObj?.isAccept,
    });

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const stateObj = dfa.states.find((s) => s.id === currentState);
      if (!stateObj) {
        const failReason = `Execution failed: state D${currentState} does not exist in DFA.`;
        return { accepted: false, path, steps, reason: failReason };
      }

      // Check direct char match or general category
      let nextState = stateObj.transitions[char];
      if (nextState === undefined) {
        if (/[0-9]/.test(char) && stateObj.transitions['digit'] !== undefined) {
          nextState = stateObj.transitions['digit'];
        } else if (/[a-zA-Z]/.test(char) && stateObj.transitions['letter'] !== undefined) {
          nextState = stateObj.transitions['letter'];
        }
      }

      path.push({ state: currentState, char, nextState });

      if (nextState === undefined) {
        steps.push({
          stepIndex: i + 1,
          currentState,
          symbol: char,
          nextState: undefined,
          explanation: `At state D${currentState}, symbol '${char}' has NO transition defined. Trapped in dead state -> REJECTED.`,
          isAccepted: false,
        });
        const rejectReason = `REJECTED: No transition from state D${currentState} on character '${char}' at index ${i}.`;
        return { accepted: false, path, steps, reason: rejectReason };
      }

      const nextObj = dfa.states.find((s) => s.id === nextState);
      steps.push({
        stepIndex: i + 1,
        currentState,
        symbol: char,
        nextState,
        explanation: `Transition: D${currentState} --('${char}')--> D${nextState} (Accepting: ${nextObj?.isAccept ? 'YES' : 'NO'}).`,
        isAccepted: nextObj?.isAccept,
      });

      currentState = nextState;
    }

    const finalState = dfa.states.find((s) => s.id === currentState);
    const accepted = !!finalState && !!finalState.isAccept;
    const reason = accepted
      ? `ACCEPTED: Traversal finished at state D${currentState}, which is an ACCEPTING state.`
      : `REJECTED: Traversal finished at state D${currentState}, which is NOT an accepting state.`;

    return { accepted, path, steps, reason };
  }
}

