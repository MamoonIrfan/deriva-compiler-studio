import { RegisterAllocationResult, TACInstruction } from '../../types';

export class MIPSCodeGenerator {
  public static generate(
    instructions: TACInstruction[],
    regAlloc?: RegisterAllocationResult
  ): string {
    const lines: string[] = [];
    const strings: { label: string; value: string }[] = [];
    let strCounter = 0;

    // Scan for string literals in TAC to put in .data section
    for (const inst of instructions) {
      if (inst.arg1?.startsWith('"') && inst.arg1?.endsWith('"')) {
        const lbl = `str_${strCounter++}`;
        strings.push({ label: lbl, value: inst.arg1 });
      }
    }

    lines.push('############################################################');
    lines.push('# Deriva Generated MIPS-32 Assembly');
    lines.push('############################################################');
    lines.push('.data');
    lines.push('  newline: .asciiz "\\n"');
    for (const s of strings) {
      lines.push(`  ${s.label}: .asciiz ${s.value}`);
    }

    lines.push('');
    lines.push('.text');
    lines.push('.globl main');
    lines.push('');
    lines.push('main:');
    lines.push('  # Setup frame pointer');
    lines.push('  addiu $sp, $sp, -32');
    lines.push('  sw $ra, 28($sp)');
    lines.push('  sw $fp, 24($sp)');
    lines.push('  move $fp, $sp');
    lines.push('');

    const mapReg = (v?: string): string => {
      if (!v) return '$zero';
      if (/^[0-9]/.test(v)) {
        return v; // literal number
      }
      if (regAlloc?.assignment[v]) {
        const regNum = parseInt(regAlloc.assignment[v].replace('R', ''), 10);
        return `$t${regNum % 8}`;
      }
      // Default fallback
      return `$t0`;
    };

    for (const inst of instructions) {
      lines.push(`  # TAC [${inst.id}]: ${inst.op} ${inst.arg1 || ''} ${inst.arg2 || ''} -> ${inst.result || ''}`);

      switch (inst.op) {
        case 'LABEL':
          lines.push(`${inst.result}:`);
          break;

        case 'ASSIGN':
          if (/^[0-9]/.test(inst.arg1 || '')) {
            lines.push(`  li ${mapReg(inst.result)}, ${inst.arg1}`);
          } else {
            lines.push(`  move ${mapReg(inst.result)}, ${mapReg(inst.arg1)}`);
          }
          break;

        case 'ADD':
          if (/^[0-9]/.test(inst.arg2 || '')) {
            lines.push(`  addi ${mapReg(inst.result)}, ${mapReg(inst.arg1)}, ${inst.arg2}`);
          } else {
            lines.push(`  add ${mapReg(inst.result)}, ${mapReg(inst.arg1)}, ${mapReg(inst.arg2)}`);
          }
          break;

        case 'SUB':
          lines.push(`  sub ${mapReg(inst.result)}, ${mapReg(inst.arg1)}, ${mapReg(inst.arg2)}`);
          break;

        case 'MUL':
          lines.push(`  mul ${mapReg(inst.result)}, ${mapReg(inst.arg1)}, ${mapReg(inst.arg2)}`);
          break;

        case 'DIV':
          lines.push(`  div ${mapReg(inst.arg1)}, ${mapReg(inst.arg2)}`);
          lines.push(`  mflo ${mapReg(inst.result)}`);
          break;

        case 'MOD':
          lines.push(`  div ${mapReg(inst.arg1)}, ${mapReg(inst.arg2)}`);
          lines.push(`  mfhi ${mapReg(inst.result)}`);
          break;

        case 'EQ':
          lines.push(`  seq ${mapReg(inst.result)}, ${mapReg(inst.arg1)}, ${mapReg(inst.arg2)}`);
          break;

        case 'NEQ':
          lines.push(`  sne ${mapReg(inst.result)}, ${mapReg(inst.arg1)}, ${mapReg(inst.arg2)}`);
          break;

        case 'LT':
          lines.push(`  slt ${mapReg(inst.result)}, ${mapReg(inst.arg1)}, ${mapReg(inst.arg2)}`);
          break;

        case 'LE':
          lines.push(`  sle ${mapReg(inst.result)}, ${mapReg(inst.arg1)}, ${mapReg(inst.arg2)}`);
          break;

        case 'GT':
          lines.push(`  sgt ${mapReg(inst.result)}, ${mapReg(inst.arg1)}, ${mapReg(inst.arg2)}`);
          break;

        case 'GE':
          lines.push(`  sge ${mapReg(inst.result)}, ${mapReg(inst.arg1)}, ${mapReg(inst.arg2)}`);
          break;

        case 'GOTO':
          lines.push(`  j ${inst.result}`);
          break;

        case 'IF_FALSE':
          lines.push(`  beqz ${mapReg(inst.arg1)}, ${inst.result}`);
          break;

        case 'IF_TRUE':
          lines.push(`  bnez ${mapReg(inst.arg1)}, ${inst.result}`);
          break;

        case 'PRINT':
          if (inst.arg1?.startsWith('"')) {
            lines.push('  li $v0, 4');
            lines.push(`  la $a0, str_${strCounter - 1}`);
            lines.push('  syscall');
          } else {
            lines.push('  li $v0, 1');
            lines.push(`  move $a0, ${mapReg(inst.arg1)}`);
            lines.push('  syscall');
          }
          // Print newline
          lines.push('  li $v0, 4');
          lines.push('  la $a0, newline');
          lines.push('  syscall');
          break;

        case 'CALL':
          lines.push(`  jal func_${inst.arg1}`);
          if (inst.result) {
            lines.push(`  move ${mapReg(inst.result)}, $v0`);
          }
          break;

        case 'RETURN':
          if (inst.arg1) {
            lines.push(`  move $v0, ${mapReg(inst.arg1)}`);
          }
          lines.push('  move $sp, $fp');
          lines.push('  lw $ra, 28($sp)');
          lines.push('  lw $fp, 24($sp)');
          lines.push('  addiu $sp, $sp, 32');
          lines.push('  jr $ra');
          break;
      }
    }

    lines.push('');
    lines.push('  # Exit program');
    lines.push('  li $v0, 10');
    lines.push('  syscall');

    return lines.join('\n');
  }
}
