import { BasicBlock, ControlFlowGraph, DataFlowIteration, DataFlowResult } from '../../types';

export class ReachingDefinitionsAnalyzer {
  public static analyze(cfg: ControlFlowGraph): DataFlowResult {
    const blocks = cfg.blocks;
    const gen: Record<string, string[]> = {};
    const kill: Record<string, string[]> = {};

    // 1. Gather all definitions: d: x = ...
    const allDefs: { id: string; varName: string; tacId: number; blockId: string }[] = [];

    for (const b of blocks) {
      for (const inst of b.instructions) {
        if (inst.result && inst.op !== 'LABEL' && inst.op !== 'GOTO' && inst.op !== 'IF_FALSE' && inst.op !== 'IF_TRUE') {
          allDefs.push({
            id: `d${inst.id}`,
            varName: inst.result,
            tacId: inst.id,
            blockId: b.id,
          });
        }
      }
    }

    // 2. Compute GEN and KILL for each block
    for (const b of blocks) {
      const blockGen: string[] = [];
      const blockKill = new Set<string>();

      for (const inst of b.instructions) {
        if (inst.result && inst.op !== 'LABEL' && inst.op !== 'GOTO' && inst.op !== 'IF_FALSE' && inst.op !== 'IF_TRUE') {
          const defId = `d${inst.id}`;
          const varName = inst.result;

          // Add to GEN
          blockGen.push(defId);

          // All other definitions of the same variable elsewhere are KILLED
          for (const otherDef of allDefs) {
            if (otherDef.varName === varName && otherDef.id !== defId) {
              blockKill.add(otherDef.id);
            }
          }
        }
      }

      gen[b.id] = Array.from(new Set(blockGen)).sort();
      kill[b.id] = Array.from(blockKill).sort();
    }

    // 3. Iterative computation of IN and OUT
    // IN[B] = Union_{P in Pred(B)} OUT[P]
    // OUT[B] = GEN[B] U (IN[B] - KILL[B])
    const inSets: Record<string, Set<string>> = {};
    const outSets: Record<string, Set<string>> = {};
    const iterations: DataFlowIteration[] = [];

    for (const b of blocks) {
      inSets[b.id] = new Set();
      outSets[b.id] = new Set(gen[b.id]);
    }

    let changed = true;
    let iter = 1;

    while (changed && iter <= 30) {
      changed = false;
      const stepSnapshot: Record<string, { in: string[]; out: string[] }> = {};

      for (const b of blocks) {
        // IN[B] = Union over all preds of OUT[P]
        const newIn = new Set<string>();
        for (const predId of b.predecessors) {
          for (const item of outSets[predId] || []) {
            newIn.add(item);
          }
        }

        // OUT[B] = GEN[B] U (IN[B] - KILL[B])
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
      finalIn[b.id] = Array.from(inSets[b.id]).sort();
      finalOut[b.id] = Array.from(outSets[b.id]).sort();
    }

    return {
      name: 'Reaching Definitions',
      direction: 'forward',
      meetOp: 'union',
      gen,
      kill,
      iterations,
      finalIn,
      finalOut,
    };
  }
}
