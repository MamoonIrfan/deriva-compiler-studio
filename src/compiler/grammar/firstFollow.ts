import { FirstFollowIteration, Grammar, GrammarProduction } from '../../types';

export class FirstFollowCalculator {
  private grammar: Grammar;
  private firstSets: Map<string, Set<string>> = new Map();
  private followSets: Map<string, Set<string>> = new Map();
  private nullableSymbols: Set<string> = new Set();
  private iterations: FirstFollowIteration[] = [];

  constructor(grammar: Grammar) {
    this.grammar = grammar;
    this.compute();
  }

  public getFirstSets(): Record<string, string[]> {
    const res: Record<string, string[]> = {};
    for (const [k, v] of this.firstSets.entries()) {
      res[k] = Array.from(v).sort();
    }
    return res;
  }

  public getFollowSets(): Record<string, string[]> {
    const res: Record<string, string[]> = {};
    for (const [k, v] of this.followSets.entries()) {
      res[k] = Array.from(v).sort();
    }
    return res;
  }

  public getNullableSymbols(): string[] {
    return Array.from(this.nullableSymbols).sort();
  }

  public getIterations(): FirstFollowIteration[] {
    return this.iterations;
  }

  /**
   * Compute FIRST of a sequence of symbols (α = X1 X2 ... Xk)
   */
  public computeFirstOfSequence(sequence: string[]): Set<string> {
    const result = new Set<string>();
    if (sequence.length === 0 || (sequence.length === 1 && sequence[0] === 'ε')) {
      result.add('ε');
      return result;
    }

    let allNullable = true;
    for (const sym of sequence) {
      if (sym === 'ε') continue;

      if (this.grammar.terminals.includes(sym)) {
        result.add(sym);
        allNullable = false;
        break;
      }

      const firstOfSym = this.firstSets.get(sym) || new Set<string>();
      for (const t of firstOfSym) {
        if (t !== 'ε') {
          result.add(t);
        }
      }

      if (!firstOfSym.has('ε')) {
        allNullable = false;
        break;
      }
    }

    if (allNullable) {
      result.add('ε');
    }

    return result;
  }

  private compute() {
    // 1. Initialize FIRST sets
    for (const t of this.grammar.terminals) {
      this.firstSets.set(t, new Set([t]));
    }
    for (const nt of this.grammar.nonTerminals) {
      this.firstSets.set(nt, new Set());
      this.followSets.set(nt, new Set());
    }

    // Add $ (end of input) to FOLLOW(startSymbol)
    const startSym = this.grammar.startSymbol;
    if (this.followSets.has(startSym)) {
      this.followSets.get(startSym)!.add('$');
    }

    let stepCounter = 1;

    // 2. Compute Nullability and FIRST sets iteratively until fixed point
    let changed = true;
    let iterCount = 1;

    while (changed) {
      changed = false;
      const snapshot: Record<string, string[]> = {};

      for (const prod of this.grammar.productions) {
        if (prod.lhs.endsWith("'") && prod.id === 0) continue; // Skip augmented root if any

        const lhs = prod.lhs;
        const currentFirst = this.firstSets.get(lhs)!;
        const currentSize = currentFirst.size;

        if (prod.rhs.length === 1 && prod.rhs[0] === 'ε') {
          if (!currentFirst.has('ε')) {
            currentFirst.add('ε');
            this.nullableSymbols.add(lhs);
            changed = true;
          }
          continue;
        }

        let rhsAllNullable = true;
        for (const symbol of prod.rhs) {
          if (this.grammar.terminals.includes(symbol)) {
            if (!currentFirst.has(symbol)) {
              currentFirst.add(symbol);
              changed = true;
            }
            rhsAllNullable = false;
            break;
          }

          const symFirst = this.firstSets.get(symbol) || new Set<string>();
          for (const item of symFirst) {
            if (item !== 'ε' && !currentFirst.has(item)) {
              currentFirst.add(item);
              changed = true;
            }
          }

          if (!symFirst.has('ε')) {
            rhsAllNullable = false;
            break;
          }
        }

        if (rhsAllNullable) {
          if (!currentFirst.has('ε')) {
            currentFirst.add('ε');
            this.nullableSymbols.add(lhs);
            changed = true;
          }
        }

        if (currentFirst.size > currentSize) {
          this.iterations.push({
            step: stepCounter++,
            symbol: lhs,
            action: `FIRST(${lhs}) += ${Array.from(currentFirst).join(', ')} from rule ${lhs} -> ${prod.rhs.join(' ')}`,
            sets: this.getFirstSets(),
          });
        }
      }

      iterCount++;
      if (iterCount > 50) break; // guard against infinite loops
    }

    // 3. Compute FOLLOW sets iteratively until fixed point
    changed = true;
    iterCount = 1;

    while (changed) {
      changed = false;

      for (const prod of this.grammar.productions) {
        const lhs = prod.lhs;

        for (let i = 0; i < prod.rhs.length; i++) {
          const B = prod.rhs[i];
          if (!this.grammar.nonTerminals.includes(B)) continue;

          const followB = this.followSets.get(B)!;
          const currentSize = followB.size;

          const beta = prod.rhs.slice(i + 1);
          const firstBeta = this.computeFirstOfSequence(beta);

          // Add FIRST(β) \ {ε} to FOLLOW(B)
          for (const item of firstBeta) {
            if (item !== 'ε' && !followB.has(item)) {
              followB.add(item);
              changed = true;
            }
          }

          // If β is nullable (or empty), add FOLLOW(A) to FOLLOW(B)
          if (firstBeta.has('ε') || beta.length === 0) {
            const followA = this.followSets.get(lhs) || new Set<string>();
            for (const item of followA) {
              if (!followB.has(item)) {
                followB.add(item);
                changed = true;
              }
            }
          }

          if (followB.size > currentSize) {
            this.iterations.push({
              step: stepCounter++,
              symbol: B,
              action: `FOLLOW(${B}) += { ${Array.from(followB).join(', ')} } using rule ${lhs} -> ${prod.rhs.join(' ')}`,
              sets: this.getFollowSets(),
            });
          }
        }
      }

      iterCount++;
      if (iterCount > 50) break;
    }
  }
}
