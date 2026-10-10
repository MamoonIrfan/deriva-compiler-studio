import { Grammar, LR1Item, LRAction, LRParsingTable, LRState } from '../../types';
import { CLR1Automaton } from './clr1';

export class LALR1ParserGenerator {
  private clr1: CLR1Automaton;
  private grammar: Grammar;
  private lalrStates: LRState<LR1Item>[] = [];
  private clrToLalrMap = new Map<number, number>();

  constructor(grammar: Grammar) {
    this.grammar = grammar;
    this.clr1 = new CLR1Automaton(grammar);
    this.buildLALR();
  }

  public getCLR1(): CLR1Automaton {
    return this.clr1;
  }

  public getLALRStates(): LRState<LR1Item>[] {
    return this.lalrStates;
  }

  public getClrToLalrMap(): Map<number, number> {
    return this.clrToLalrMap;
  }

  private getCoreKey(items: LR1Item[]): string {
    const cores = items.map((it) => `${it.productionId}:${it.dot}`).sort();
    return Array.from(new Set(cores)).join('|');
  }

  private buildLALR() {
    const clrStates = this.clr1.getStates();
    const coreGroups = new Map<string, number[]>();

    for (const state of clrStates) {
      const core = this.getCoreKey(state.items);
      if (!coreGroups.has(core)) {
        coreGroups.set(core, []);
      }
      coreGroups.get(core)!.push(state.id);
    }

    this.lalrStates = [];
    this.clrToLalrMap.clear();

    let lalrId = 0;
    const groupEntries = Array.from(coreGroups.entries());

    // Map each group to a new merged LALR state
    for (const [core, stateIds] of groupEntries) {
      const mergedItemsMap = new Map<string, LR1Item>();

      for (const sid of stateIds) {
        this.clrToLalrMap.set(sid, lalrId);
        const state = clrStates[sid];
        for (const item of state.items) {
          const key = `${item.productionId}:${item.dot}:${item.lookahead}`;
          if (!mergedItemsMap.has(key)) {
            mergedItemsMap.set(key, { ...item });
          }
        }
      }

      this.lalrStates.push({
        id: lalrId,
        items: Array.from(mergedItemsMap.values()).sort(
          (a, b) => a.productionId - b.productionId || a.dot - b.dot || a.lookahead.localeCompare(b.lookahead)
        ),
        transitions: {},
      });

      lalrId++;
    }

    // Remap transitions
    for (const clrState of clrStates) {
      const sourceLalrId = this.clrToLalrMap.get(clrState.id)!;
      const lalrState = this.lalrStates[sourceLalrId];

      for (const [sym, targetClrId] of Object.entries(clrState.transitions)) {
        const targetLalrId = this.clrToLalrMap.get(targetClrId as number)!;
        lalrState.transitions[sym] = targetLalrId;
      }
    }
  }

  public generateLALRTable(): LRParsingTable {
    const actionTable: Record<number, Record<string, LRAction[]>> = {};
    const gotoTable: Record<number, Record<string, number>> = {};
    const conflicts: { state: number; symbol: string; actions: LRAction[] }[] = [];

    const terminalsWithDollar = Array.from(new Set([...this.grammar.terminals, '$']));

    for (const state of this.lalrStates) {
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

      // 2. Reduce on lookaheads
      for (const item of state.items) {
        if (item.dot === item.rhs.length) {
          if (item.productionId === 0 && item.lookahead === '$') {
            actionTable[state.id]['$'].push({
              type: 'accept',
            });
          } else {
            // Avoid duplicate reduce actions for same production and lookahead
            const existing = actionTable[state.id][item.lookahead];
            if (!existing.some((a) => a.type === 'reduce' && a.stateOrRuleId === item.productionId)) {
              actionTable[state.id][item.lookahead].push({
                type: 'reduce',
                stateOrRuleId: item.productionId,
              });
            }
          }
        }
      }

      // 3. Conflicts
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
      kind: 'LALR1',
      states: this.lalrStates.length,
      terminals: terminalsWithDollar,
      nonTerminals: this.grammar.nonTerminals,
      actionTable,
      gotoTable,
      conflictsCount: conflicts.length,
      conflicts,
    };
  }
}
