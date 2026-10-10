import { Grammar, GrammarProduction, LL1ParserStep, LL1ParsingTable } from '../../types';
import { FirstFollowCalculator } from './firstFollow';

export class LL1ParserGenerator {
  private grammar: Grammar;
  private firstFollow: FirstFollowCalculator;
  private table: Record<string, Record<string, GrammarProduction | null>> = {};
  private conflicts: { nonTerminal: string; terminal: string; productions: GrammarProduction[] }[] = [];

  constructor(grammar: Grammar) {
    this.grammar = grammar;
    this.firstFollow = new FirstFollowCalculator(grammar);
    this.buildTable();
  }

  public getTable(): LL1ParsingTable {
    return {
      terminals: this.grammar.terminals,
      nonTerminals: this.grammar.nonTerminals,
      table: this.table,
      conflicts: this.conflicts,
    };
  }

  public getFirstFollow(): FirstFollowCalculator {
    return this.firstFollow;
  }

  private buildTable() {
    const rawTable: Record<string, Record<string, GrammarProduction[]>> = {};

    for (const nt of this.grammar.nonTerminals) {
      rawTable[nt] = {};
      this.table[nt] = {};
      for (const t of this.grammar.terminals) {
        rawTable[nt][t] = [];
        this.table[nt][t] = null;
      }
    }

    for (const prod of this.grammar.productions) {
      if (prod.lhs.endsWith("'") && prod.id === 0) continue;

      const lhs = prod.lhs;
      const alpha = prod.rhs;
      const firstAlpha = this.firstFollow.computeFirstOfSequence(alpha);

      // Rule 1: For each terminal a in FIRST(α), add A -> α to M[A, a]
      for (const a of firstAlpha) {
        if (a !== 'ε' && rawTable[lhs] && rawTable[lhs][a]) {
          rawTable[lhs][a].push(prod);
        }
      }

      // Rule 2: If ε in FIRST(α), for each terminal b in FOLLOW(A), add A -> α to M[A, b]
      if (firstAlpha.has('ε')) {
        const followA = this.firstFollow.getFollowSets()[lhs] || [];
        for (const b of followA) {
          if (rawTable[lhs] && rawTable[lhs][b]) {
            if (!rawTable[lhs][b].some((p) => p.id === prod.id)) {
              rawTable[lhs][b].push(prod);
            }
          }
        }
      }
    }

    // Check for conflicts and populate final table
    for (const nt of this.grammar.nonTerminals) {
      for (const t of this.grammar.terminals) {
        const prods = rawTable[nt][t];
        if (prods.length > 1) {
          this.conflicts.push({
            nonTerminal: nt,
            terminal: t,
            productions: prods,
          });
          this.table[nt][t] = prods[0]; // pick first for deterministic simulation
        } else if (prods.length === 1) {
          this.table[nt][t] = prods[0];
        }
      }
    }
  }

  /**
   * Simulate predictive parsing for a token stream
   */
  public simulate(tokens: string[]): { steps: LL1ParserStep[]; success: boolean; error?: string } {
    const steps: LL1ParserStep[] = [];
    const input = [...tokens];
    if (input.length === 0 || input[input.length - 1] !== '$') {
      input.push('$');
    }

    const stack: string[] = ['$', this.grammar.startSymbol];
    let stepCount = 1;
    let inputIndex = 0;

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const currentInput = input[inputIndex] || '$';

      const currentStep: LL1ParserStep = {
        step: stepCount++,
        stack: [...stack],
        input: input.slice(inputIndex),
        action: '',
      };

      if (top === '$') {
        if (currentInput === '$') {
          currentStep.action = 'ACCEPT: Input successfully parsed by LL(1) model';
          steps.push(currentStep);
          return { steps, success: true };
        } else {
          currentStep.action = `ERROR: Reached end of stack but remaining input: ${currentInput}`;
          steps.push(currentStep);
          return { steps, success: false, error: currentStep.action };
        }
      }

      if (this.grammar.terminals.includes(top)) {
        if (top === currentInput) {
          currentStep.action = `MATCH '${top}': Pop stack and advance input`;
          steps.push(currentStep);
          stack.pop();
          inputIndex++;
        } else {
          currentStep.action = `ERROR: Terminal mismatch. Expected '${top}', found '${currentInput}'`;
          steps.push(currentStep);
          return { steps, success: false, error: currentStep.action };
        }
      } else if (this.grammar.nonTerminals.includes(top)) {
        const prod = this.table[top]?.[currentInput];
        if (!prod) {
          currentStep.action = `ERROR: No production M[${top}, ${currentInput}] in parsing table`;
          steps.push(currentStep);
          return { steps, success: false, error: currentStep.action };
        }

        currentStep.action = `APPLY ${prod.lhs} -> ${prod.rhs.join(' ')}`;
        currentStep.production = prod;
        steps.push(currentStep);

        stack.pop(); // pop non-terminal
        if (prod.rhs.length === 1 && prod.rhs[0] === 'ε') {
          // don't push epsilon
        } else {
          // Push RHS in reverse order
          for (let i = prod.rhs.length - 1; i >= 0; i--) {
            stack.push(prod.rhs[i]);
          }
        }
      } else {
        currentStep.action = `ERROR: Unknown symbol '${top}' on stack`;
        steps.push(currentStep);
        return { steps, success: false, error: currentStep.action };
      }

      if (stepCount > 300) {
        steps.push({
          step: stepCount,
          stack: [...stack],
          input: input.slice(inputIndex),
          action: 'ERROR: Parsing step limit reached (possible recursion loop)',
        });
        return { steps, success: false, error: 'Step limit reached' };
      }
    }

    return { steps, success: true };
  }
}
