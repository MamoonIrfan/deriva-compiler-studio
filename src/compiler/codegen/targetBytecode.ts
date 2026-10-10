import { BytecodeInstruction, TACInstruction, VMOpCode } from '../../types';

export class BytecodeGenerator {
  public static generate(instructions: TACInstruction[]): BytecodeInstruction[] {
    const bytecode: BytecodeInstruction[] = [];
    const labelOffsets = new Map<string, number>();

    // Pass 1: Emit instructions and record label offsets
    for (const inst of instructions) {
      if (inst.op === 'LABEL' && inst.result) {
        labelOffsets.set(inst.result, bytecode.length);
        continue; // Labels are stripped from physical instruction stream
      }

      switch (inst.op) {
        case 'ASSIGN':
          if (/^[0-9]/.test(inst.arg1 || '')) {
            bytecode.push({ op: VMOpCode.PUSH, operand: parseFloat(inst.arg1!), sourceLine: inst.sourceLine });
          } else if (inst.arg1 === 'true' || inst.arg1 === 'false') {
            bytecode.push({ op: VMOpCode.PUSH, operand: inst.arg1 === 'true', sourceLine: inst.sourceLine });
          } else if (inst.arg1?.startsWith('"')) {
            bytecode.push({ op: VMOpCode.PUSH, operand: inst.arg1.slice(1, -1), sourceLine: inst.sourceLine });
          } else {
            bytecode.push({ op: VMOpCode.LOAD, operand: inst.arg1, sourceLine: inst.sourceLine });
          }
          bytecode.push({ op: VMOpCode.STORE, operand: inst.result, sourceLine: inst.sourceLine });
          break;

        case 'ADD':
        case 'SUB':
        case 'MUL':
        case 'DIV':
        case 'MOD':
        case 'EQ':
        case 'NEQ':
        case 'LT':
        case 'LE':
        case 'GT':
        case 'GE':
        case 'AND':
        case 'OR':
          // Push left
          if (/^[0-9]/.test(inst.arg1 || '')) {
            bytecode.push({ op: VMOpCode.PUSH, operand: parseFloat(inst.arg1!), sourceLine: inst.sourceLine });
          } else {
            bytecode.push({ op: VMOpCode.LOAD, operand: inst.arg1, sourceLine: inst.sourceLine });
          }

          // Push right
          if (/^[0-9]/.test(inst.arg2 || '')) {
            bytecode.push({ op: VMOpCode.PUSH, operand: parseFloat(inst.arg2!), sourceLine: inst.sourceLine });
          } else {
            bytecode.push({ op: VMOpCode.LOAD, operand: inst.arg2, sourceLine: inst.sourceLine });
          }

          const opMap: Record<string, VMOpCode> = {
            ADD: VMOpCode.ADD,
            SUB: VMOpCode.SUB,
            MUL: VMOpCode.MUL,
            DIV: VMOpCode.DIV,
            MOD: VMOpCode.MOD,
            EQ: VMOpCode.EQ,
            NEQ: VMOpCode.NEQ,
            LT: VMOpCode.LT,
            LE: VMOpCode.LE,
            GT: VMOpCode.GT,
            GE: VMOpCode.GE,
            AND: VMOpCode.AND,
            OR: VMOpCode.OR,
          };

          bytecode.push({ op: opMap[inst.op] || VMOpCode.ADD, sourceLine: inst.sourceLine });
          bytecode.push({ op: VMOpCode.STORE, operand: inst.result, sourceLine: inst.sourceLine });
          break;

        case 'GOTO':
          bytecode.push({ op: VMOpCode.JMP, operand: inst.result, sourceLine: inst.sourceLine });
          break;

        case 'IF_FALSE':
          if (/^[0-9]/.test(inst.arg1 || '')) {
            bytecode.push({ op: VMOpCode.PUSH, operand: parseFloat(inst.arg1!), sourceLine: inst.sourceLine });
          } else {
            bytecode.push({ op: VMOpCode.LOAD, operand: inst.arg1, sourceLine: inst.sourceLine });
          }
          bytecode.push({ op: VMOpCode.JMP_IF_FALSE, operand: inst.result, sourceLine: inst.sourceLine });
          break;

        case 'PRINT':
          if (/^[0-9]/.test(inst.arg1 || '')) {
            bytecode.push({ op: VMOpCode.PUSH, operand: parseFloat(inst.arg1!), sourceLine: inst.sourceLine });
          } else if (inst.arg1?.startsWith('"')) {
            bytecode.push({ op: VMOpCode.PUSH, operand: inst.arg1.slice(1, -1), sourceLine: inst.sourceLine });
          } else {
            bytecode.push({ op: VMOpCode.LOAD, operand: inst.arg1, sourceLine: inst.sourceLine });
          }
          bytecode.push({ op: VMOpCode.PRINT, sourceLine: inst.sourceLine });
          break;

        case 'CALL':
          bytecode.push({
            op: VMOpCode.CALL,
            operand: inst.arg1,
            sourceLine: inst.sourceLine,
          });
          if (inst.result) {
            bytecode.push({ op: VMOpCode.STORE, operand: inst.result, sourceLine: inst.sourceLine });
          }
          break;

        case 'RETURN':
          if (inst.arg1) {
            if (/^[0-9]/.test(inst.arg1)) {
              bytecode.push({ op: VMOpCode.PUSH, operand: parseFloat(inst.arg1), sourceLine: inst.sourceLine });
            } else {
              bytecode.push({ op: VMOpCode.LOAD, operand: inst.arg1, sourceLine: inst.sourceLine });
            }
          }
          bytecode.push({ op: VMOpCode.RET, sourceLine: inst.sourceLine });
          break;
      }
    }

    bytecode.push({ op: VMOpCode.HALT });

    // Pass 2: Patch label jump targets with absolute instruction indices
    for (const b of bytecode) {
      if ((b.op === VMOpCode.JMP || b.op === VMOpCode.JMP_IF_FALSE) && typeof b.operand === 'string') {
        const target = labelOffsets.get(b.operand);
        if (target !== undefined) {
          b.operand = target;
        }
      }
    }

    return bytecode;
  }
}
