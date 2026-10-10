import { OptimizationLog, TACInstruction } from '../../types';

export class CommonSubexpressionEliminationPass {
  public static run(instructions: TACInstruction[]): {
    optimized: TACInstruction[];
    logs: OptimizationLog[];
  } {
    const logs: OptimizationLog[] = [];
    const availableExprs = new Map<string, string>(); // "op arg1 arg2" -> tempVar/result
    const result: TACInstruction[] = [];

    for (const inst of instructions) {
      const cloned: TACInstruction = { ...inst };

      if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'EQ', 'NEQ', 'LT', 'LE', 'GT', 'GE'].includes(cloned.op)) {
        const exprKey = `${cloned.op} ${cloned.arg1} ${cloned.arg2}`;

        if (availableExprs.has(exprKey)) {
          const prevResult = availableExprs.get(exprKey)!;
          logs.push({
            passName: 'Common Subexpression Elimination',
            tacId: cloned.id,
            description: `Replaced redundant expression ${exprKey} with ${prevResult}`,
            before: `${cloned.result} = ${exprKey}`,
            after: `${cloned.result} = ${prevResult}`,
          });

          cloned.op = 'ASSIGN';
          cloned.arg1 = prevResult;
          cloned.arg2 = undefined;
        } else {
          if (cloned.result) {
            availableExprs.set(exprKey, cloned.result);
          }
        }
      } else if (['LABEL', 'GOTO', 'IF_FALSE', 'IF_TRUE', 'CALL', 'FUNC_BEGIN'].includes(cloned.op)) {
        // Invalidate across control flow boundaries for safety
        availableExprs.clear();
      }

      // If instruction writes to a variable, remove any expressions using that variable
      if (cloned.result && cloned.op === 'ASSIGN') {
        const modifiedVar = cloned.result;
        for (const [key] of Array.from(availableExprs.entries())) {
          const parts = key.split(' ');
          if (parts[1] === modifiedVar || parts[2] === modifiedVar) {
            availableExprs.delete(key);
          }
        }
      }

      result.push(cloned);
    }

    return {
      optimized: result,
      logs,
    };
  }
}
