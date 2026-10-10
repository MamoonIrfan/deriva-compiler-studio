import { ControlFlowGraph, DataFlowIteration, DataFlowResult } from '../../types';

export class AvailableExpressionsAnalyzer {
  public static analyze(cfg: ControlFlowGraph): DataFlowResult {
    const blocks = cfg.blocks;
    const allExpressions = new Set<string>();

    // 1. Gather all binary arithmetic expressions
    for (const b of blocks) {
      for (const inst of b.instructions) {
        if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD'].includes(inst.op) && inst.arg1 && inst.arg2) {
          allExpressions.add(`${inst.arg1} ${AvailableExpressionsAnalyzer.opSymbol(inst.op)} ${inst.arg2}`);
        }
      }
    }

    const allExprList = Array.from(allExpressions);
    const gen: Record<string, string[]> = {};
    const kill: Record<string, string[]> = {};

    // 2. Compute GEN and KILL
    for (const b of blocks) {
      const blockGen = new Set<string>();
      const blockKill = new Set<string>();

      for (const inst of b.instructions) {
        if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD'].includes(inst.op) && inst.arg1 && inst.arg2) {
          const expr = `${inst.arg1} ${AvailableExpressionsAnalyzer.opSymbol(inst.op)} ${inst.arg2}`;
          blockGen.add(expr);
        }

        // If an instruction modifies variable x, all expressions containing x are killed
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

    // 3. Iterative Forward Data Flow with Intersection meet:
    // IN[Entry] = empty
    // IN[B] = Intersection_{P in Pred(B)} OUT[P]
    // OUT[B] = GEN[B] U (IN[B] - KILL[B])
    const inSets: Record<string, Set<string>> = {};
    const outSets: Record<string, Set<string>> = {};
    const iterations: DataFlowIteration[] = [];

    const entryId = cfg.entryBlockId || (blocks[0] ? blocks[0].id : '');

    for (const b of blocks) {
      if (b.id === entryId) {
        inSets[b.id] = new Set();
        outSets[b.id] = new Set(gen[b.id]);
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

      for (const b of blocks) {
        if (b.id === entryId) {
          stepSnapshot[b.id] = { in: [], out: Array.from(outSets[b.id]).sort() };
          continue;
        }

        const preds = b.predecessors;
        let newIn: Set<string>;

        if (preds.length === 0) {
          newIn = new Set();
        } else {
          newIn = new Set(outSets[preds[0]] || []);
          for (let p = 1; p < preds.length; p++) {
            const predOut = outSets[preds[p]] || new Set();
            for (const item of Array.from(newIn)) {
              if (!predOut.has(item)) {
                newIn.delete(item);
              }
            }
          }
        }

        const newOut = new Set<string>(gen[b.id]);
        const killSet = new Set(kill[b.id]);
        for (const item of newIn) {
          if (!killSet.has(item)) {
            newOut.add(item);
          }
        }

        if (newIn.size !== inSets[b.id].size || Array.from(newIn).some((x) => !inSets[b.id].has(x))) {
          inSets[b.id] = newIn;
          changed = true;
        }

        if (newOut.size !== outSets[b.id].size || Array.from(newOut).some((x) => !outSets[b.id].has(x))) {
          outSets[b.id] = newOut;
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
      name: 'Available Expressions',
      direction: 'forward',
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
