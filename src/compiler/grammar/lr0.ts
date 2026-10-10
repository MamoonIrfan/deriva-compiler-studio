import { Grammar, GrammarProduction, LR0Item, LRAction, LRParsingTable, LRState } from '../../types';

export class LR0Automaton {
  private grammar: Grammar;
  private states: LRState<LR0Item>[] = [];
  private stateMap = new Map<string, number>();

  constructor(grammar: Grammar) {
    this.grammar = grammar;
    this.buildAutomaton();
  }

  public getStates(): LRState<LR0Item>[] {
    return this.states;
  }

  /**
   * Compute closure of a set of LR(0) items
   */
  public closure(items: LR0Item[]): LR0Item[] {
    const result: LR0Item[] = [...items];
    const itemSet = new Set<string>(items.map((it) => this.itemToString(it)));
    let changed = true;

    while (changed) {
      changed = false;
      const currentItems = [...result];

      for (const item of currentItems) {
        if (item.dot < item.rhs.length) {
          const symbolAfterDot = item.rhs[item.dot];

          if (this.grammar.nonTerminals.includes(symbolAfterDot)) {
            // Find all productions for symbolAfterDot
            const prods = this.grammar.productions.filter((p) => p.lhs === symbolAfterDot);
            for (const p of prods) {
              const newItem: LR0Item = {
                productionId: p.id,
                lhs: p.lhs,
                rhs: p.rhs[0] === 'ε' ? [] : p.rhs,
                dot: 0,
              };
              const key = this.itemToString(newItem);
              if (!itemSet.has(key)) {
                itemSet.add(key);
                result.push(newItem);
                changed = true;
              }
            }
          }
        }
      }
    }

    return result.sort((a, b) => a.productionId - b.productionId || a.dot - b.dot);
  }

  /**
   * Compute GOTO(I, X) where I is a set of items and X is a grammar symbol
   */
  public goto(items: LR0Item[], symbol: string): LR0Item[] {
    const movedItems: LR0Item[] = [];

    for (const item of items) {
      if (item.dot < item.rhs.length && item.rhs[item.dot] === symbol) {
        movedItems.push({
          productionId: item.productionId,
          lhs: item.lhs,
          rhs: item.rhs,
          dot: item.dot + 1,
        });
      }
    }

    return this.closure(movedItems);
  }

  private buildAutomaton() {
    this.states = [];
    this.stateMap.clear();

    // Start with augmented production: S' -> .S
    const startProd = this.grammar.productions[0] || {
      id: 0,
      lhs: `${this.grammar.startSymbol}'`,
      rhs: [this.grammar.startSymbol],
    };

    const initialItem: LR0Item = {
      productionId: startProd.id,
      lhs: startProd.lhs,
      rhs: startProd.rhs,
      dot: 0,
    };

    const startClosure = this.closure([initialItem]);
    const startKey = this.itemsToKey(startClosure);

    const startState: LRState<LR0Item> = {
      id: 0,
      items: startClosure,
      transitions: {},
    };

    this.states.push(startState);
    this.stateMap.set(startKey, 0);

    const queue: number[] = [0];
    const allSymbols = [...this.grammar.terminals.filter((t) => t !== '$'), ...this.grammar.nonTerminals];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentState = this.states[currentId];

      for (const sym of allSymbols) {
        const gotoItems = this.goto(currentState.items, sym);
        if (gotoItems.length === 0) continue;

        const key = this.itemsToKey(gotoItems);
        let targetId: number;

        if (this.stateMap.has(key)) {
          targetId = this.stateMap.get(key)!;
        } else {
          targetId = this.states.length;
          const newState: LRState<LR0Item> = {
            id: targetId,
            items: gotoItems,
            transitions: {},
          };
          this.states.push(newState);
          this.stateMap.set(key, targetId);
          queue.push(targetId);
        }

        currentState.transitions[sym] = targetId;
      }
    }
  }

  /**
   * Generate LR(0) Parsing Table
   */
  public generateLR0Table(): LRParsingTable {
    const actionTable: Record<number, Record<string, LRAction[]>> = {};
    const gotoTable: Record<number, Record<string, number>> = {};
    const conflicts: { state: number; symbol: string; actions: LRAction[] }[] = [];

    const terminalsWithDollar = Array.from(new Set([...this.grammar.terminals, '$']));

    for (const state of this.states) {
      actionTable[state.id] = {};
      gotoTable[state.id] = {};

      for (const t of terminalsWithDollar) {
        actionTable[state.id][t] = [];
      }
      for (const nt of this.grammar.nonTerminals) {
        if (state.transitions[nt] !== undefined) {
          gotoTable[state.id][nt] = state.transitions[nt];
        }
      }

      // 1. Shift actions
      for (const [sym, targetState] of Object.entries(state.transitions)) {
        if (this.grammar.terminals.includes(sym) && sym !== '$') {
          actionTable[state.id][sym].push({
            type: 'shift',
            stateOrRuleId: targetState as number,
          });
        }
      }

      // 2. Reduce and Accept actions
      for (const item of state.items) {
        if (item.dot === item.rhs.length) {
          if (item.productionId === 0) {
            // S' -> S .
            actionTable[state.id]['$'].push({
              type: 'accept',
            });
          } else {
            // In LR(0), reduce on ALL terminals
            for (const t of terminalsWithDollar) {
              actionTable[state.id][t].push({
                type: 'reduce',
                stateOrRuleId: item.productionId,
              });
            }
          }
        }
      }

      // Check conflicts
      for (const t of terminalsWithDollar) {
        const acts = actionTable[state.id][t];
        if (acts.length > 1) {
          conflicts.push({
            state: state.id,
            symbol: t,
            actions: acts,
          });
        }
      }
    }

    return {
      kind: 'LR0',
      states: this.states.length,
      terminals: terminalsWithDollar,
      nonTerminals: this.grammar.nonTerminals,
      actionTable,
      gotoTable,
      conflictsCount: conflicts.length,
      conflicts,
    };
  }

  private itemToString(item: LR0Item): string {
    const rhsCopy = [...item.rhs];
    rhsCopy.splice(item.dot, 0, '•');
    return `${item.lhs} -> ${rhsCopy.join(' ')}`;
  }

  private itemsToKey(items: LR0Item[]): string {
    return items
      .map((it) => `${it.productionId}:${it.dot}`)
      .sort()
      .join('|');
  }
}
