import { OptimizationLog, TACInstruction } from '../../types';

export class AlgebraicIdentitiesPass {
  public static run(instructions: TACInstruction[]): {
    optimized: TACInstruction[];
    logs: OptimizationLog[];
  } {
    const logs: OptimizationLog[] = [];
    const result: TACInstruction[] = [];

    for (const inst of instructions) {
      const cloned: TACInstruction = { ...inst };

      // x + 0 -> x
      if (cloned.op === 'ADD') {
        if (cloned.arg2 === '0') {
          logs.push({
            passName: 'Algebraic Simplification',
            tacId: cloned.id,
            description: `Simplified ${cloned.arg1} + 0 => ${cloned.arg1}`,
            before: `${cloned.result} = ${cloned.arg1} + 0`,
            after: `${cloned.result} = ${cloned.arg1}`,
          });
          cloned.op = 'ASSIGN';
          cloned.arg2 = undefined;
        } else if (cloned.arg1 === '0') {
          logs.push({
            passName: 'Algebraic Simplification',
            tacId: cloned.id,
            description: `Simplified 0 + ${cloned.arg2} => ${cloned.arg2}`,
            before: `${cloned.result} = 0 + ${cloned.arg2}`,
            after: `${cloned.result} = ${cloned.arg2}`,
          });
          cloned.op = 'ASSIGN';
          cloned.arg1 = cloned.arg2;
          cloned.arg2 = undefined;
        }
      }

      // x - 0 -> x
      if (cloned.op === 'SUB' && cloned.arg2 === '0') {
        logs.push({
          passName: 'Algebraic Simplification',
          tacId: cloned.id,
          description: `Simplified ${cloned.arg1} - 0 => ${cloned.arg1}`,
          before: `${cloned.result} = ${cloned.arg1} - 0`,
          after: `${cloned.result} = ${cloned.arg1}`,
        });
        cloned.op = 'ASSIGN';
        cloned.arg2 = undefined;
      }

      // x * 1 -> x
      if (cloned.op === 'MUL') {
        if (cloned.arg2 === '1') {
          logs.push({
            passName: 'Algebraic Simplification',
            tacId: cloned.id,
            description: `Simplified ${cloned.arg1} * 1 => ${cloned.arg1}`,
            before: `${cloned.result} = ${cloned.arg1} * 1`,
            after: `${cloned.result} = ${cloned.arg1}`,
          });
          cloned.op = 'ASSIGN';
          cloned.arg2 = undefined;
        } else if (cloned.arg1 === '1') {
          logs.push({
            passName: 'Algebraic Simplification',
            tacId: cloned.id,
            description: `Simplified 1 * ${cloned.arg2} => ${cloned.arg2}`,
            before: `${cloned.result} = 1 * ${cloned.arg2}`,
            after: `${cloned.result} = ${cloned.arg2}`,
          });
          cloned.op = 'ASSIGN';
          cloned.arg1 = cloned.arg2;
          cloned.arg2 = undefined;
        } else if (cloned.arg2 === '0' || cloned.arg1 === '0') {
          // x * 0 -> 0
          logs.push({
            passName: 'Algebraic Simplification',
            tacId: cloned.id,
            description: 'Simplified multiplication by 0 => 0',
            before: `${cloned.result} = ${cloned.arg1} * ${cloned.arg2}`,
            after: `${cloned.result} = 0`,
          });
          cloned.op = 'ASSIGN';
          cloned.arg1 = '0';
          cloned.arg2 = undefined;
        } else if (cloned.arg2 === '2') {
          // Strength reduction: x * 2 -> x + x
          logs.push({
            passName: 'Strength Reduction',
            tacId: cloned.id,
            description: `Strength reduction ${cloned.arg1} * 2 => ${cloned.arg1} + ${cloned.arg1}`,
            before: `${cloned.result} = ${cloned.arg1} * 2`,
            after: `${cloned.result} = ${cloned.arg1} + ${cloned.arg1}`,
          });
          cloned.op = 'ADD';
          cloned.arg2 = cloned.arg1;
        }
      }

      // x / 1 -> x
      if (cloned.op === 'DIV' && cloned.arg2 === '1') {
        logs.push({
          passName: 'Algebraic Simplification',
          tacId: cloned.id,
          description: `Simplified ${cloned.arg1} / 1 => ${cloned.arg1}`,
          before: `${cloned.result} = ${cloned.arg1} / 1`,
          after: `${cloned.result} = ${cloned.arg1}`,
        });
        cloned.op = 'ASSIGN';
        cloned.arg2 = undefined;
      }

      result.push(cloned);
    }

    return {
      optimized: result,
      logs,
    };
  }
}
