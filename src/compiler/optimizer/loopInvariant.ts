import { OptimizationLog, TACInstruction } from '../../types';

export class LoopInvariantCodeMotionPass {
  public static run(instructions: TACInstruction[]): {
    optimized: TACInstruction[];
    logs: OptimizationLog[];
  } {
    const logs: OptimizationLog[] = [];
    const result: TACInstruction[] = [...instructions];

    // Find loops demarcated by L_while_start / L_for_start and back-edges
    let loopStartIdx = -1;
    let loopEndIdx = -1;

    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];
      if (inst.op === 'LABEL' && (inst.result?.includes('while_start') || inst.result?.includes('for_start'))) {
        loopStartIdx = i;
      }
      if (inst.op === 'GOTO' && (inst.result?.includes('while_start') || inst.result?.includes('for_start')) && loopStartIdx !== -1) {
        loopEndIdx = i;

        // Found a loop from loopStartIdx to loopEndIdx
        // Scan for instructions within loop whose operands are constant or defined outside
        const loopModifiedVars = new Set<string>();
        for (let k = loopStartIdx; k <= loopEndIdx; k++) {
          const lInst = instructions[k];
          if (lInst.result && !['LABEL', 'GOTO', 'IF_FALSE', 'IF_TRUE'].includes(lInst.op)) {
            loopModifiedVars.add(lInst.result);
          }
        }

        for (let k = loopStartIdx + 1; k < loopEndIdx; k++) {
          const candidate = instructions[k];
          if (
            ['ADD', 'SUB', 'MUL', 'DIV'].includes(candidate.op) &&
            candidate.arg1 &&
            candidate.arg2 &&
            !loopModifiedVars.has(candidate.arg1) &&
            !loopModifiedVars.has(candidate.arg2)
          ) {
            logs.push({
              passName: 'Loop Invariant Code Motion',
              tacId: candidate.id,
              description: `Hoisted loop-invariant computation ${candidate.result} = ${candidate.arg1} ${candidate.op} ${candidate.arg2} to loop pre-header`,
              before: `[In Loop] ${candidate.result} = ${candidate.op} ${candidate.arg1} ${candidate.arg2}`,
              after: `[Pre-Header] ${candidate.result} = ${candidate.op} ${candidate.arg1} ${candidate.arg2}`,
            });

            // Move before loopStartIdx
            const [moved] = result.splice(k, 1);
            result.splice(loopStartIdx, 0, moved);
            break;
          }
        }
      }
    }

    return {
      optimized: result,
      logs,
    };
  }
}
