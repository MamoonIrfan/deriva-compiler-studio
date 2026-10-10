import { ControlFlowGraph, DataFlowIteration, DataFlowResult } from '../../types';

export class VeryBusyExpressionsAnalyzer {
  public static analyze(cfg: ControlFlowGraph): DataFlowResult {
    const blocks = cfg.blocks;
    const allExpressions = new Set<string>();

    for (const b of blocks) {
      for (const inst of b.instructions) {
        if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD'].includes(inst.op) && inst.arg1 && inst.arg2) {
          allExpressions.add(`${inst.arg1} ${VeryBusyExpressionsAnalyzer.opSymbol(inst.op)} ${inst.arg2}`);
        }
      }
    }

    const allExprList = Array.from(allExpressions);
    const gen: Record<string, string[]> = {};
    const kill: Record<string, string[]> = {};

    for (const b of blocks) {
      const blockGen = new Set<string>();
      const blockKill = new Set<string>();

      for (let i = b.instructions.length - 1; i >= 0; i--) {
        const inst = b.instructions[i];
        if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD'].includes(inst.op) && inst.arg1 && inst.arg2) {
          const expr = `${inst.arg1} ${VeryBusyExpressionsAnalyzer.opSymbol(inst.op)} ${inst.arg2}`;
          blockGen.add(expr);
        }

        if (inst.result && !['LABEL', 'GOTO', 'IF_FALSE', 'IF_TRUE'].includes(inst.op)) {
          const modifiedVar = inst.result;
          for (const expr of allExprList) {
            const parts = expr.split(' ');
            if (parts[0] === modifiedVar || parts[2] === modifiedVar) {
              blockKill.add(expr);
              blockGen.delete(expr);
            }
          }
        }
      }

      gen[b.id] = Array.from(blockGen).sort();
      kill[b.id] = Array.from(blockKill).sort();
    }

    // Backward Data Flow with Intersection meet:
    // OUT[Exit] = empty
    // OUT[B] = Intersection_{S in Succ(B)} IN[S]
    // IN[B] = GEN[B] U (OUT[B] - KILL[B])
    const inSets: Record<string, Set<string>> = {};
    const outSets: Record<string, Set<string>> = {};
    const iterations: DataFlowIteration[] = [];

    const exitId = cfg.exitBlockId || (blocks[blocks.length - 1] ? blocks[blocks.length - 1].id : '');

    for (const b of blocks) {
      if (b.id === exitId) {
        inSets[b.id] = new Set(gen[b.id]);
        outSets[b.id] = new Set();
      } else {
        inSets[b.id] = new Set(allExprList);
        outSets[b.id] = new Set(allExprList);
      }
    }

    let changed = true;
    let iter = 1;

    while (changed && iter <= 30) {
      changed = false;
      const stepSnapshot: Record<string, { in: string[]; out: string[] }> = {};

      for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        if (b.id === exitId) {
          stepSnapshot[b.id] = { in: Array.from(inSets[b.id]).sort(), out: [] };
          continue;
        }

        const succs = b.successors;
        let newOut: Set<string>;

        if (succs.length === 0) {
          newOut = new Set();
        } else {
          newOut = new Set(inSets[succs[0]] || []);
          for (let s = 1; s < succs.length; s++) {
            const succIn = inSets[succs[s]] || new Set();
            for (const item of Array.from(newOut)) {
              if (!succIn.has(item)) {
                newOut.delete(item);
              }
            }
          }
        }

        const newIn = new Set<string>(gen[b.id]);
        const killSet = new Set(kill[b.id]);
        for (const item of newOut) {
          if (!killSet.has(item)) {
            newIn.add(item);
          }
        }

        if (newOut.size !== outSets[b.id].size || Array.from(newOut).some((x) => !outSets[b.id].has(x))) {
          outSets[b.id] = newOut;
          changed = true;
        }

        if (newIn.size !== inSets[b.id].size || Array.from(newIn).some((x) => !inSets[b.id].has(x))) {
          inSets[b.id] = newIn;
          changed = true;
        }

        stepSnapshot[b.id] = {
          in: Array.from(inSets[b.id]).sort(),
          out: Array.from(outSets[b.id]).sort(),
        };
      }

      iterations.push({
        iteration: iter++,
        steps: stepSnapshot,
        changed,
      });
    }

    const finalIn: Record<string, string[]> = {};
    const finalOut: Record<string, string[]> = {};
    for (const b of blocks) {
      finalIn[b.id] = Array.from(inSets[b.id] || []).sort();
      finalOut[b.id] = Array.from(outSets[b.id] || []).sort();
    }

    return {
      name: 'Very Busy Expressions',
      direction: 'backward',
      meetOp: 'intersection',
      gen,
      kill,
      iterations,
      finalIn,
      finalOut,
    };
  }

  private static opSymbol(op: string): string {
    switch (op) {
      case 'ADD':
        return '+';
      case 'SUB':
        return '-';
      case 'MUL':
        return '*';
      case 'DIV':
        return '/';
      case 'MOD':
        return '%';
      default:
        return op;
    }
  }
}
