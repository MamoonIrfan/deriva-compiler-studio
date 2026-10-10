import { Grammar, LRAction, LRParsingTable } from '../../types';
import { FirstFollowCalculator } from './firstFollow';
import { LR0Automaton } from './lr0';

export class SLR1ParserGenerator {
  private grammar: Grammar;
  private lr0: LR0Automaton;
  private firstFollow: FirstFollowCalculator;

  constructor(grammar: Grammar) {
    this.grammar = grammar;
    this.lr0 = new LR0Automaton(grammar);
    this.firstFollow = new FirstFollowCalculator(grammar);
  }

  public getLR0Automaton(): LR0Automaton {
    return this.lr0;
  }

  public generateSLRTable(): LRParsingTable {
    const states = this.lr0.getStates();
    const followSets = this.firstFollow.getFollowSets();
    const actionTable: Record<number, Record<string, LRAction[]>> = {};
    const gotoTable: Record<number, Record<string, number>> = {};
    const conflicts: { state: number; symbol: string; actions: LRAction[] }[] = [];

    const terminalsWithDollar = Array.from(new Set([...this.grammar.terminals, '$']));

    for (const state of states) {
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

      // 2. Reduce actions placed ONLY in FOLLOW(A)
      for (const item of state.items) {
        if (item.dot === item.rhs.length) {
          if (item.productionId === 0) {
            actionTable[state.id]['$'].push({
              type: 'accept',
            });
          } else {
            const followA = followSets[item.lhs] || [];
            for (const a of followA) {
              actionTable[state.id][a].push({
                type: 'reduce',
                stateOrRuleId: item.productionId,
              });
            }
          }
        }
      }

      // 3. Conflict detection
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
      kind: 'SLR1',
      states: states.length,
      terminals: terminalsWithDollar,
      nonTerminals: this.grammar.nonTerminals,
      actionTable,
      gotoTable,
      conflictsCount: conflicts.length,
      conflicts,
    };
  }
}
