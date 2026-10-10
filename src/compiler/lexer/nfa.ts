import { NFA, NFAState, NFATransition, NFASimulationStep, ThompsonConstructionStep } from '../../types';

/**
 * Thompson's construction algorithm to build an NFA from regular expressions.
 */
export class NFABuilder {
  private states: NFAState[] = [];
  private stateCounter = 0;
  private constructionSteps: ThompsonConstructionStep[] = [];

  private createState(isStart = false, isAccept = false, label?: string): number {
    const id = this.stateCounter++;
    this.states.push({
      id,
      isStart,
      isAccept,
      label,
      transitions: [],
      epsilonTransitions: [],
    });
    return id;
  }

  private addTransition(from: number, char: string, to: number) {
    this.states[from].transitions.push({ char, toState: to });
  }

  private addEpsilonTransition(from: number, to: number) {
    this.states[from].epsilonTransitions.push(to);
  }

  /**
   * Build an NFA for a literal character
   */
  public buildLiteralNFA(char: string): { start: number; accept: number; alphabet: string[] } {
    if (char === 'ε' || char === '') {
      return this.buildEpsilonNFA();
    }
    const start = this.createState(false, false, `s_${char}`);
    const accept = this.createState(false, true, `acc_${char}`);
    this.addTransition(start, char, accept);
    return { start, accept, alphabet: [char] };
  }

  /**
   * Build an NFA for an epsilon transition
   */
  public buildEpsilonNFA(): { start: number; accept: number; alphabet: string[] } {
    const start = this.createState(false, false, 's_eps');
    const accept = this.createState(false, true, 'acc_eps');
    this.addEpsilonTransition(start, accept);
    return { start, accept, alphabet: [] };
  }

  /**
   * Concatenation: NFA1 . NFA2
   */
  public concat(
    nfa1: { start: number; accept: number; alphabet: string[] },
    nfa2: { start: number; accept: number; alphabet: string[] }
  ): { start: number; accept: number; alphabet: string[] } {
    this.states[nfa1.accept].isAccept = false;
    this.addEpsilonTransition(nfa1.accept, nfa2.start);
    const alphabet = Array.from(new Set([...nfa1.alphabet, ...nfa2.alphabet]));
    return { start: nfa1.start, accept: nfa2.accept, alphabet };
  }

  /**
   * Union: NFA1 | NFA2
   */
  public union(
    nfa1: { start: number; accept: number; alphabet: string[] },
    nfa2: { start: number; accept: number; alphabet: string[] }
  ): { start: number; accept: number; alphabet: string[] } {
    const start = this.createState(false, false, 'union_start');
    const accept = this.createState(false, true, 'union_accept');

    this.states[nfa1.accept].isAccept = false;
    this.states[nfa2.accept].isAccept = false;

    this.addEpsilonTransition(start, nfa1.start);
    this.addEpsilonTransition(start, nfa2.start);
    this.addEpsilonTransition(nfa1.accept, accept);
    this.addEpsilonTransition(nfa2.accept, accept);

    const alphabet = Array.from(new Set([...nfa1.alphabet, ...nfa2.alphabet]));
    return { start, accept, alphabet };
  }

  /**
   * Kleene Star: NFA*
   */
  public star(
    nfa: { start: number; accept: number; alphabet: string[] }
  ): { start: number; accept: number; alphabet: string[] } {
    const start = this.createState(false, false, 'star_start');
    const accept = this.createState(false, true, 'star_accept');

    this.states[nfa.accept].isAccept = false;

    this.addEpsilonTransition(start, nfa.start);
    this.addEpsilonTransition(start, accept);
    this.addEpsilonTransition(nfa.accept, nfa.start);
    this.addEpsilonTransition(nfa.accept, accept);

    return { start, accept, alphabet: nfa.alphabet };
  }

  /**
   * Plus: NFA+ = NFA . NFA*
   */
  public plus(
    nfa: { start: number; accept: number; alphabet: string[] }
  ): { start: number; accept: number; alphabet: string[] } {
    const start = this.createState(false, false, 'plus_start');
    const accept = this.createState(false, true, 'plus_accept');

    this.states[nfa.accept].isAccept = false;

    this.addEpsilonTransition(start, nfa.start);
    this.addEpsilonTransition(nfa.accept, nfa.start);
    this.addEpsilonTransition(nfa.accept, accept);

    return { start, accept, alphabet: nfa.alphabet };
  }

  /**
   * Optional: NFA? = NFA | ε
   */
  public optional(
    nfa: { start: number; accept: number; alphabet: string[] }
  ): { start: number; accept: number; alphabet: string[] } {
    const eps = this.buildEpsilonNFA();
    return this.union(nfa, eps);
  }

  private cloneCurrentNFA(startState: number, acceptStates: number[], alphabet: string[]): NFA {
    return {
      startState,
      acceptStates: [...acceptStates],
      alphabet: [...alphabet].sort(),
      states: this.states.map((s) => ({
        id: s.id,
        isStart: s.id === startState,
        isAccept: acceptStates.includes(s.id),
        label: s.label,
        transitions: s.transitions.map((t) => ({ ...t })),
        epsilonTransitions: [...s.epsilonTransitions],
      })),
    };
  }

  /**
   * Convert a regex string to an NFA with complete Thompson construction step trace
   */
  public static buildWithTrace(regex: string): { nfa: NFA; steps: ThompsonConstructionStep[] } {
    const builder = new NFABuilder();
    const tokens = builder.tokenizeRegex(regex);
    const postfix = builder.toPostfix(tokens);
    const stack: { fragment: string; nfa: { start: number; accept: number; alphabet: string[] } }[] = [];

    let stepNum = 1;

    for (const token of postfix) {
      if (token === '.') {
        const right = stack.pop()!;
        const left = stack.pop()!;
        const beforeStates = builder.states.length;
        const result = builder.concat(left.nfa, right.nfa);
        const fragment = `${left.fragment}.${right.fragment}`;
        stack.push({ fragment, nfa: result });

        const transitionsAdded = [{ from: left.nfa.accept, to: right.nfa.start, label: 'ε' }];
        const currentSnapshot = builder.cloneCurrentNFA(result.start, [result.accept], result.alphabet);

        builder.constructionSteps.push({
          stepNumber: stepNum++,
          operation: 'concat',
          fragment,
          description: `Concatenation: connected accept state S${left.nfa.accept} to start state S${right.nfa.start} via ε-transition.`,
          statesAdded: [],
          transitionsAdded,
          currentNFA: currentSnapshot,
        });
      } else if (token === '|') {
        const right = stack.pop()!;
        const left = stack.pop()!;
        const beforeCount = builder.states.length;
        const result = builder.union(left.nfa, right.nfa);
        const fragment = `(${left.fragment}|${right.fragment})`;
        stack.push({ fragment, nfa: result });

        const statesAdded = [result.start, result.accept];
        const transitionsAdded = [
          { from: result.start, to: left.nfa.start, label: 'ε' },
          { from: result.start, to: right.nfa.start, label: 'ε' },
          { from: left.nfa.accept, to: result.accept, label: 'ε' },
          { from: right.nfa.accept, to: result.accept, label: 'ε' },
        ];
        const currentSnapshot = builder.cloneCurrentNFA(result.start, [result.accept], result.alphabet);

        builder.constructionSteps.push({
          stepNumber: stepNum++,
          operation: 'union',
          fragment,
          description: `Union: introduced new start state S${result.start} and accept state S${result.accept} with 4 ε-transitions bridging branches.`,
          statesAdded,
          transitionsAdded,
          currentNFA: currentSnapshot,
        });
      } else if (token === '*') {
        const top = stack.pop()!;
        const result = builder.star(top.nfa);
        const fragment = `(${top.fragment})*`;
        stack.push({ fragment, nfa: result });

        const statesAdded = [result.start, result.accept];
        const transitionsAdded = [
          { from: result.start, to: top.nfa.start, label: 'ε' },
          { from: result.start, to: result.accept, label: 'ε' },
          { from: top.nfa.accept, to: top.nfa.start, label: 'ε' },
          { from: top.nfa.accept, to: result.accept, label: 'ε' },
        ];
        const currentSnapshot = builder.cloneCurrentNFA(result.start, [result.accept], result.alphabet);

        builder.constructionSteps.push({
          stepNumber: stepNum++,
          operation: 'star',
          fragment,
          description: `Kleene Star: created start state S${result.start} and accept state S${result.accept} with loopback and bypass ε-transitions.`,
          statesAdded,
          transitionsAdded,
          currentNFA: currentSnapshot,
        });
      } else if (token === '+') {
        const top = stack.pop()!;
        const result = builder.plus(top.nfa);
        const fragment = `(${top.fragment})+`;
        stack.push({ fragment, nfa: result });

        const statesAdded = [result.start, result.accept];
        const transitionsAdded = [
          { from: result.start, to: top.nfa.start, label: 'ε' },
          { from: top.nfa.accept, to: top.nfa.start, label: 'ε' },
          { from: top.nfa.accept, to: result.accept, label: 'ε' },
        ];
        const currentSnapshot = builder.cloneCurrentNFA(result.start, [result.accept], result.alphabet);

        builder.constructionSteps.push({
          stepNumber: stepNum++,
          operation: 'plus',
          fragment,
          description: `Positive Closure (+): created start state S${result.start} and accept state S${result.accept} with repeat loopback.`,
          statesAdded,
          transitionsAdded,
          currentNFA: currentSnapshot,
        });
      } else if (token === '?') {
        const top = stack.pop()!;
        const result = builder.optional(top.nfa);
        const fragment = `(${top.fragment})?`;
        stack.push({ fragment, nfa: result });

        const currentSnapshot = builder.cloneCurrentNFA(result.start, [result.accept], result.alphabet);
        builder.constructionSteps.push({
          stepNumber: stepNum++,
          operation: 'optional',
          fragment,
          description: `Optional (?): unioned with ε branch, permitting 0 or 1 occurrence.`,
          statesAdded: [result.start, result.accept],
          transitionsAdded: [{ from: result.start, to: result.accept, label: 'ε' }],
          currentNFA: currentSnapshot,
        });
      } else {
        // Literal or character class
        const result = builder.buildLiteralNFA(token);
        const fragment = token;
        stack.push({ fragment, nfa: result });

        const statesAdded = [result.start, result.accept];
        const transitionsAdded = token === 'ε'
          ? [{ from: result.start, to: result.accept, label: 'ε' }]
          : [{ from: result.start, to: result.accept, label: token }];
        const currentSnapshot = builder.cloneCurrentNFA(result.start, [result.accept], result.alphabet);

        builder.constructionSteps.push({
          stepNumber: stepNum++,
          operation: 'literal',
          fragment,
          description: `Literal '${token}': created base machine with start state S${result.start} and accept state S${result.accept}.`,
          statesAdded,
          transitionsAdded,
          currentNFA: currentSnapshot,
        });
      }
    }

    if (stack.length === 0) {
      const s = builder.createState(true, true, 'empty');
      const emptyNFA: NFA = {
        startState: s,
        acceptStates: [s],
        states: builder.states,
        alphabet: [],
      };
      return {
        nfa: emptyNFA,
        steps: [
          {
            stepNumber: 1,
            operation: 'empty',
            fragment: 'ε',
            description: 'Empty regex generates trivial single-state accepting NFA.',
            statesAdded: [s],
            transitionsAdded: [],
            currentNFA: emptyNFA,
          },
        ],
      };
    }

    const finalResult = stack.pop()!.nfa;
    builder.states[finalResult.start].isStart = true;
    builder.states[finalResult.accept].isAccept = true;

    const fullNFA: NFA = {
      startState: finalResult.start,
      acceptStates: [finalResult.accept],
      states: builder.states,
      alphabet: finalResult.alphabet.sort(),
    };

    return {
      nfa: fullNFA,
      steps: builder.constructionSteps,
    };
  }

  /**
   * Convert an educational simplified regex string to an NFA
   */
  public static fromRegex(regex: string): NFA {
    return this.buildWithTrace(regex).nfa;
  }

  /**
   * Step-by-step NFA simulation over an input string with epsilon-closure expansion
   */
  public static simulate(
    nfa: NFA,
    input: string
  ): { accepted: boolean; steps: NFASimulationStep[]; finalActiveStates: number[] } {
    const steps: NFASimulationStep[] = [];

    // Helper for epsilon closure
    const computeClosure = (startStates: number[]): number[] => {
      const closure = new Set<number>(startStates);
      const stack = [...startStates];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        const st = nfa.states.find((s) => s.id === cur);
        if (!st) continue;
        for (const eps of st.epsilonTransitions) {
          if (!closure.has(eps)) {
            closure.add(eps);
            stack.push(eps);
          }
        }
      }
      return Array.from(closure).sort((a, b) => a - b);
    };

    // Step 0: Initial state epsilon-closure
    const initialClosure = computeClosure([nfa.startState]);
    steps.push({
      stepIndex: 0,
      symbol: 'ε (start)',
      activeBefore: [nfa.startState],
      moveResult: [nfa.startState],
      transitionsFollowed: [],
      epsilonClosure: initialClosure,
      activeAfter: initialClosure,
      explanation: `Initialized at start state S${nfa.startState}. Applied initial ε-closure -> active states: {${initialClosure.map((id) => `S${id}`).join(', ')}}.`,
    });

    let currentActive = initialClosure;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const activeBefore = [...currentActive];
      const moveSet = new Set<number>();
      const transitionsFollowed: { from: number; to: number; char: string }[] = [];

      for (const stId of currentActive) {
        const st = nfa.states.find((s) => s.id === stId);
        if (!st) continue;
        for (const trans of st.transitions) {
          let matches = trans.char === char;
          if (!matches) {
            if (trans.char === 'digit' && /[0-9]/.test(char)) matches = true;
            if (trans.char === 'letter' && /[a-zA-Z]/.test(char)) matches = true;
          }
          if (matches) {
            moveSet.add(trans.toState);
            transitionsFollowed.push({ from: stId, to: trans.toState, char: trans.char });
          }
        }
      }

      const moveArr = Array.from(moveSet).sort((a, b) => a - b);
      const afterClosure = computeClosure(moveArr);

      steps.push({
        stepIndex: i + 1,
        symbol: char,
        activeBefore,
        moveResult: moveArr,
        transitionsFollowed,
        epsilonClosure: afterClosure,
        activeAfter: afterClosure,
        explanation: moveArr.length > 0
          ? `On input '${char}': moved from {${activeBefore.map((id) => `S${id}`).join(', ')}} via ${transitionsFollowed.length} transition(s) to {${moveArr.map((id) => `S${id}`).join(', ')}}. Expanded by ε-closure to {${afterClosure.map((id) => `S${id}`).join(', ')}}.`
          : `On input '${char}': no valid transitions from active states {${activeBefore.map((id) => `S${id}`).join(', ')}}. Active set becomes empty (REJECTED path).`,
      });

      currentActive = afterClosure;
      if (currentActive.length === 0) {
        // Trapped in dead state
        break;
      }
    }

    const accepted = currentActive.some((id) => nfa.acceptStates.includes(id));
    return {
      accepted,
      steps,
      finalActiveStates: currentActive,
    };
  }

  private tokenizeRegex(regex: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < regex.length) {
      const char = regex[i];
      if (char === '\\' && i + 1 < regex.length) {
        tokens.push(regex[i + 1]);
        i += 2;
      } else if (char === '[' && regex.indexOf(']', i) !== -1) {
        const end = regex.indexOf(']', i);
        const inside = regex.substring(i + 1, end);
        if (inside === '0-9') {
          tokens.push('digit');
        } else if (inside.includes('a-z') || inside.includes('a-zA-Z')) {
          tokens.push('letter');
        } else {
          tokens.push(inside);
        }
        i = end + 1;
      } else {
        tokens.push(char);
        i++;
      }
    }
    return tokens;
  }

  private toPostfix(tokens: string[]): string[] {
    // Insert explicit concatenation operators '.'
    const withConcat: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const c1 = tokens[i];
      withConcat.push(c1);
      if (i + 1 < tokens.length) {
        const c2 = tokens[i + 1];
        const isC1Operand = !['|', '(', '.'].includes(c1);
        const isC2Operand = !['|', ')', '*', '+', '?', '.'].includes(c2);
        if (isC1Operand && isC2Operand) {
          withConcat.push('.');
        }
      }
    }

    const precedence: Record<string, number> = {
      '*': 3,
      '+': 3,
      '?': 3,
      '.': 2,
      '|': 1,
    };

    const output: string[] = [];
    const opStack: string[] = [];

    for (const token of withConcat) {
      if (token === '(') {
        opStack.push(token);
      } else if (token === ')') {
        while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
          output.push(opStack.pop()!);
        }
        opStack.pop(); // Pop '('
      } else if (['*', '+', '?', '.', '|'].includes(token)) {
        while (
          opStack.length > 0 &&
          opStack[opStack.length - 1] !== '(' &&
          (precedence[opStack[opStack.length - 1]] || 0) >= (precedence[token] || 0)
        ) {
          output.push(opStack.pop()!);
        }
        opStack.push(token);
      } else {
        output.push(token);
      }
    }

    while (opStack.length > 0) {
      output.push(opStack.pop()!);
    }

    return output;
  }
}
