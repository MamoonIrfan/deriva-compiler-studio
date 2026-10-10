import { OptimizationLog, TACInstruction } from '../../types';

export class ConstantFoldingPass {
  public static run(instructions: TACInstruction[]): {
    optimized: TACInstruction[];
    logs: OptimizationLog[];
  } {
    const logs: OptimizationLog[] = [];
    const knownConstants = new Map<string, number | boolean | string>();
    const result: TACInstruction[] = [];

    for (const inst of instructions) {
      const cloned: TACInstruction = { ...inst };

      // Invalidate if result is reassigned
      if (cloned.result && !['LABEL', 'GOTO', 'IF_FALSE', 'IF_TRUE'].includes(cloned.op)) {
        // Will set or delete below
      }

      // Constant Propagation: substitute known constant into arg1
      if (cloned.arg1 && knownConstants.has(cloned.arg1)) {
        const val = knownConstants.get(cloned.arg1)!;
        const oldArg1 = cloned.arg1;
        cloned.arg1 = String(val);
        logs.push({
          passName: 'Constant Propagation',
          tacId: cloned.id,
          description: `Propagated constant ${oldArg1} = ${val}`,
          before: `${inst.result || ''} = ${inst.op} ${inst.arg1} ${inst.arg2 || ''}`,
          after: `${cloned.result || ''} = ${cloned.op} ${cloned.arg1} ${cloned.arg2 || ''}`,
        });
      }

      // Constant Propagation: substitute known constant into arg2
      if (cloned.arg2 && knownConstants.has(cloned.arg2)) {
        const val = knownConstants.get(cloned.arg2)!;
        const oldArg2 = cloned.arg2;
        cloned.arg2 = String(val);
        logs.push({
          passName: 'Constant Propagation',
          tacId: cloned.id,
          description: `Propagated constant ${oldArg2} = ${val}`,
          before: `${inst.result || ''} = ${inst.op} ${inst.arg1} ${inst.arg2 || ''}`,
          after: `${cloned.result || ''} = ${cloned.op} ${cloned.arg1} ${cloned.arg2 || ''}`,
        });
      }

      // Constant Folding for Binary operations
      if (
        cloned.arg1 !== undefined &&
        cloned.arg2 !== undefined &&
        ConstantFoldingPass.isNumeric(cloned.arg1) &&
        ConstantFoldingPass.isNumeric(cloned.arg2) &&
        ['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'EQ', 'NEQ', 'LT', 'LE', 'GT', 'GE'].includes(cloned.op)
      ) {
        const n1 = parseFloat(cloned.arg1);
        const n2 = parseFloat(cloned.arg2);
        let foldedVal: number | boolean | null = null;

        switch (cloned.op) {
          case 'ADD':
            foldedVal = n1 + n2;
            break;
          case 'SUB':
            foldedVal = n1 - n2;
            break;
          case 'MUL':
            foldedVal = n1 * n2;
            break;
          case 'DIV':
            if (n2 !== 0) foldedVal = n1 / n2;
            break;
          case 'MOD':
            if (n2 !== 0) foldedVal = n1 % n2;
            break;
          case 'EQ':
            foldedVal = n1 === n2;
            break;
          case 'NEQ':
            foldedVal = n1 !== n2;
            break;
          case 'LT':
            foldedVal = n1 < n2;
            break;
          case 'LE':
            foldedVal = n1 <= n2;
            break;
          case 'GT':
            foldedVal = n1 > n2;
            break;
          case 'GE':
            foldedVal = n1 >= n2;
            break;
        }

        if (foldedVal !== null) {
          logs.push({
            passName: 'Constant Folding',
            tacId: cloned.id,
            description: `Folded ${n1} ${cloned.op} ${n2} => ${foldedVal}`,
            before: `${cloned.result} = ${cloned.op} ${cloned.arg1} ${cloned.arg2}`,
            after: `${cloned.result} = ${foldedVal}`,
          });

          cloned.op = 'ASSIGN';
          cloned.arg1 = String(foldedVal);
          cloned.arg2 = undefined;

          if (cloned.result) {
            knownConstants.set(cloned.result, foldedVal);
          }
        }
      } else if (cloned.op === 'ASSIGN' && cloned.arg1 !== undefined && cloned.result) {
        if (ConstantFoldingPass.isNumeric(cloned.arg1)) {
          knownConstants.set(cloned.result, parseFloat(cloned.arg1));
        } else if (cloned.arg1 === 'true' || cloned.arg1 === 'false') {
          knownConstants.set(cloned.result, cloned.arg1 === 'true');
        } else if (cloned.arg1.startsWith('"') && cloned.arg1.endsWith('"')) {
          knownConstants.set(cloned.result, cloned.arg1);
        } else {
          knownConstants.delete(cloned.result);
        }
      } else if (cloned.result) {
        knownConstants.delete(cloned.result);
      }

      result.push(cloned);
    }

    return {
      optimized: result,
      logs,
    };
  }

  private static isNumeric(val: string): boolean {
    return !isNaN(Number(val)) && !isNaN(parseFloat(val));
  }
}
