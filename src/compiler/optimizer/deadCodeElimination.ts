import { OptimizationLog, TACInstruction } from '../../types';

export class DeadCodeEliminationPass {
  public static run(instructions: TACInstruction[]): {
    optimized: TACInstruction[];
    logs: OptimizationLog[];
  } {
    const logs: OptimizationLog[] = [];

    // Step 1: Count variable usages across all instructions
    const usageCounts = new Map<string, number>();

    for (const inst of instructions) {
      if (inst.arg1 && DeadCodeEliminationPass.isVariable(inst.arg1)) {
        usageCounts.set(inst.arg1, (usageCounts.get(inst.arg1) || 0) + 1);
      }
      if (inst.arg2 && DeadCodeEliminationPass.isVariable(inst.arg2)) {
        usageCounts.set(inst.arg2, (usageCounts.get(inst.arg2) || 0) + 1);
      }
      // If GOTO or IF_FALSE/TRUE targets a label, that label is used
      if (['GOTO', 'IF_FALSE', 'IF_TRUE'].includes(inst.op) && inst.result) {
        usageCounts.set(inst.result, (usageCounts.get(inst.result) || 0) + 1);
      }
    }

    const filtered: TACInstruction[] = [];

    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];

      // Check unused temporary definitions (t0, t1, ...)
      if (
        inst.result &&
        inst.result.startsWith('t') &&
        !['PRINT', 'RETURN', 'CALL', 'PARAM', 'LABEL', 'FUNC_BEGIN', 'FUNC_END'].includes(inst.op)
      ) {
        const uses = usageCounts.get(inst.result) || 0;
        if (uses === 0) {
          logs.push({
            passName: 'Dead Code Elimination',
            tacId: inst.id,
            description: `Eliminated unused temporary assignment to ${inst.result}`,
            before: `${inst.result} = ${inst.op} ${inst.arg1 || ''} ${inst.arg2 || ''}`,
            after: '(Removed)',
          });
          continue; // Skip dead instruction
        }
      }

      // Check redundant jump to next immediate instruction
      if (inst.op === 'GOTO' && i + 1 < instructions.length) {
        const nextInst = instructions[i + 1];
        if (nextInst.op === 'LABEL' && nextInst.result === inst.result) {
          logs.push({
            passName: 'Dead Code Elimination',
            tacId: inst.id,
            description: `Eliminated redundant jump to immediate next label ${inst.result}`,
            before: `goto ${inst.result}`,
            after: '(Removed)',
          });
          continue;
        }
      }

      // Check unreferenced labels (except func entry labels)
      if (inst.op === 'LABEL' && !inst.result?.startsWith('func_')) {
        const uses = usageCounts.get(inst.result || '') || 0;
        if (uses === 0) {
          logs.push({
            passName: 'Dead Code Elimination',
            tacId: inst.id,
            description: `Eliminated unreferenced label ${inst.result}`,
            before: `label ${inst.result}`,
            after: '(Removed)',
          });
          continue;
        }
      }

      filtered.push(inst);
    }

    return {
      optimized: filtered,
      logs,
    };
  }

  private static isVariable(val: string): boolean {
    if (!val) return false;
    if (/^[0-9]/.test(val) || val.startsWith('"') || val === 'true' || val === 'false') return false;
    return true;
  }
}
