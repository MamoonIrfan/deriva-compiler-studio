import { Grammar, GrammarProduction, LR1Item, LRAction, LRParsingTable, LRState } from '../../types';
import { FirstFollowCalculator } from './firstFollow';

export class CLR1Automaton {
  private grammar: Grammar;
  private firstFollow: FirstFollowCalculator;
  private states: LRState<LR1Item>[] = [];
  private stateMap = new Map<string, number>();

  constructor(grammar: Grammar) {
    this.grammar = grammar;
    this.firstFollow = new FirstFollowCalculator(grammar);
    this.buildAutomaton();
  }

  public getStates(): LRState<LR1Item>[] {
    return this.states;
  }

  public getFirstFollow(): FirstFollowCalculator {
    return this.firstFollow;
  }

  public closure(items: LR1Item[]): LR1Item[] {
    const result: LR1Item[] = [...items];
    const itemMap = new Map<string, LR1Item>();

    for (const it of items) {
      itemMap.set(this.itemToKey(it), it);
    }

    let changed = true;
    while (changed) {
      changed = false;
      const currentItems = [...result];

      for (const item of currentItems) {
        if (item.dot < item.rhs.length) {
          const B = item.rhs[item.dot];

          if (this.grammar.nonTerminals.includes(B)) {
            // beta is the sequence after B, followed by lookahead item.lookahead
            const beta = item.rhs.slice(item.dot + 1);
            const betaWithLookahead = [...beta, item.lookahead];
            const firstBetaA = this.firstFollow.computeFirstOfSequence(betaWithLookahead);

            const prods = this.grammar.productions.filter((p) => p.lhs === B);
            for (const p of prods) {
              const rhsClean = p.rhs[0] === 'ε' ? [] : p.rhs;
              for (const terminal of firstBetaA) {
                if (terminal === 'ε') continue;

                const newItem: LR1Item = {
                  productionId: p.id,
                  lhs: p.lhs,
                  rhs: rhsClean,
                  dot: 0,
                  lookahead: terminal,
                };
                const key = this.itemToKey(newItem);
                if (!itemMap.has(key)) {
                  itemMap.set(key, newItem);
                  result.push(newItem);
                  changed = true;
                }
              }
            }
          }
        }
      }
    }

    return result.sort((a, b) => a.productionId - b.productionId || a.dot - b.dot || a.lookahead.localeCompare(b.lookahead));
  }

  public goto(items: LR1Item[], symbol: string): LR1Item[] {
    const movedItems: LR1Item[] = [];

    for (const item of items) {
      if (item.dot < item.rhs.length && item.rhs[item.dot] === symbol) {
        movedItems.push({
          productionId: item.productionId,
          lhs: item.lhs,
          rhs: item.rhs,
          dot: item.dot + 1,
          lookahead: item.lookahead,
        });
      }
    }

    return this.closure(movedItems);
  }

  private buildAutomaton() {
    this.states = [];
    this.stateMap.clear();

    const startProd = this.grammar.productions[0] || {
      id: 0,
      lhs: `${this.grammar.startSymbol}'`,
      rhs: [this.grammar.startSymbol],
    };

    const initialItem: LR1Item = {
      productionId: startProd.id,
      lhs: startProd.lhs,
      rhs: startProd.rhs,
      dot: 0,
      lookahead: '$',
    };

    const startClosure = this.closure([initialItem]);
    const startKey = this.itemsToKey(startClosure);

    const startState: LRState<LR1Item> = {
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
          const newState: LRState<LR1Item> = {
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

  public generateCLRTable(): LRParsingTable {
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

      // 2. Reduce on item lookahead
      for (const item of state.items) {
        if (item.dot === item.rhs.length) {
          if (item.productionId === 0 && item.lookahead === '$') {
            actionTable[state.id]['$'].push({
              type: 'accept',
            });
          } else {
            actionTable[state.id][item.lookahead].push({
              type: 'reduce',
              stateOrRuleId: item.productionId,
            });
          }
        }
      }

      // Conflicts
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
      kind: 'CLR1',
      states: this.states.length,
      terminals: terminalsWithDollar,
      nonTerminals: this.grammar.nonTerminals,
      actionTable,
      gotoTable,
      conflictsCount: conflicts.length,
      conflicts,
    };
  }

  private itemToKey(item: LR1Item): string {
    return `${item.productionId}:${item.dot}:${item.lookahead}`;
  }

  private itemsToKey(items: LR1Item[]): string {
    return items
      .map((it) => this.itemToKey(it))
      .sort()
      .join('|');
  }
}
