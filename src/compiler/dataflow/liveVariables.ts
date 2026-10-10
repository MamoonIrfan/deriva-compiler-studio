import { ControlFlowGraph, DataFlowIteration, DataFlowResult } from '../../types';

export class LiveVariablesAnalyzer {
  public static analyze(cfg: ControlFlowGraph): DataFlowResult {
    const blocks = cfg.blocks;
    const useSets: Record<string, string[]> = {};
    const defSets: Record<string, string[]> = {};

    // 1. Compute USE and DEF sets for each block
    for (const b of blocks) {
      const use = new Set<string>();
      const def = new Set<string>();

      for (const inst of b.instructions) {
        // Check used variables (arg1, arg2)
        if (inst.arg1 && LiveVariablesAnalyzer.isVariable(inst.arg1) && !def.has(inst.arg1)) {
          use.add(inst.arg1);
        }
        if (inst.arg2 && LiveVariablesAnalyzer.isVariable(inst.arg2) && !def.has(inst.arg2)) {
          use.add(inst.arg2);
        }

        // Check defined variable (result)
        if (inst.result && LiveVariablesAnalyzer.isVariable(inst.result) && !['LABEL', 'GOTO', 'IF_FALSE', 'IF_TRUE'].includes(inst.op)) {
          def.add(inst.result);
        }
      }

      useSets[b.id] = Array.from(use).sort();
      defSets[b.id] = Array.from(def).sort();
    }

    // 2. Iterative backward data flow:
    // OUT[B] = Union_{S in Succ(B)} IN[S]
    // IN[B] = USE[B] U (OUT[B] - DEF[B])
    const inSets: Record<string, Set<string>> = {};
    const outSets: Record<string, Set<string>> = {};
    const iterations: DataFlowIteration[] = [];

    for (const b of blocks) {
      inSets[b.id] = new Set(useSets[b.id]);
      outSets[b.id] = new Set();
    }

    let changed = true;
    let iter = 1;

    while (changed && iter <= 30) {
      changed = false;
      const stepSnapshot: Record<string, { in: string[]; out: string[] }> = {};

      for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];

        // OUT[B] = Union over succs of IN[S]
        const newOut = new Set<string>();
        for (const succId of b.successors) {
          for (const item of inSets[succId] || []) {
            newOut.add(item);
          }
        }

        // IN[B] = USE[B] U (OUT[B] - DEF[B])
        const newIn = new Set<string>(useSets[b.id]);
        const defSet = new Set(defSets[b.id]);
        for (const item of newOut) {
          if (!defSet.has(item)) {
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
      finalIn[b.id] = Array.from(inSets[b.id]).sort();
      finalOut[b.id] = Array.from(outSets[b.id]).sort();
    }

    return {
      name: 'Live Variables',
      direction: 'backward',
      meetOp: 'union',
      gen: useSets,
      kill: defSets,
      iterations,
      finalIn,
      finalOut,
    };
  }

  private static isVariable(val: string): boolean {
    if (!val) return false;
    if (/^[0-9]/.test(val) || val.startsWith('"') || val === 'true' || val === 'false') return false;
    return true;
  }
}
