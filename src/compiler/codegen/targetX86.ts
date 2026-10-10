import { RegisterAllocationResult, TACInstruction } from '../../types';

export class X86CodeGenerator {
  public static generate(
    instructions: TACInstruction[],
    regAlloc?: RegisterAllocationResult
  ): string {
    const lines: string[] = [];

    lines.push('############################################################');
    lines.push('# Deriva Generated x86-64 Assembly (AT&T / System V ABI)');
    lines.push('############################################################');
    lines.push('.section .rodata');
    lines.push('format_int:');
    lines.push('  .string "%ld\\n"');
    lines.push('format_str:');
    lines.push('  .string "%s\\n"');
    lines.push('');
    lines.push('.section .text');
    lines.push('.globl main');
    lines.push('.type main, @function');
    lines.push('');
    lines.push('main:');
    lines.push('  pushq %rbp');
    lines.push('  movq %rsp, %rbp');
    lines.push('  subq $64, %rsp');
    lines.push('');

    const mapReg = (v?: string): string => {
      if (!v) return '%rax';
      if (/^[0-9]/.test(v)) return `$${v}`;
      if (regAlloc?.assignment[v]) {
        const idx = parseInt(regAlloc.assignment[v].replace('R', ''), 10);
        const regs = ['%r8', '%r9', '%r10', '%r11', '%rbx', '%r12', '%r13', '%r14'];
        return regs[idx % regs.length];
      }
      return '%rax';
    };

    for (const inst of instructions) {
      lines.push(`  # TAC [${inst.id}]: ${inst.op} ${inst.arg1 || ''} ${inst.arg2 || ''} -> ${inst.result || ''}`);

      switch (inst.op) {
        case 'LABEL':
          lines.push(`.${inst.result}:`);
          break;

        case 'ASSIGN':
          if (/^[0-9]/.test(inst.arg1 || '')) {
            lines.push(`  movq $${inst.arg1}, ${mapReg(inst.result)}`);
          } else {
            lines.push(`  movq ${mapReg(inst.arg1)}, %rax`);
            lines.push(`  movq %rax, ${mapReg(inst.result)}`);
          }
          break;

        case 'ADD':
          lines.push(`  movq ${mapReg(inst.arg1)}, %rax`);
          lines.push(`  addq ${mapReg(inst.arg2)}, %rax`);
          lines.push(`  movq %rax, ${mapReg(inst.result)}`);
          break;

        case 'SUB':
          lines.push(`  movq ${mapReg(inst.arg1)}, %rax`);
          lines.push(`  subq ${mapReg(inst.arg2)}, %rax`);
          lines.push(`  movq %rax, ${mapReg(inst.result)}`);
          break;

        case 'MUL':
          lines.push(`  movq ${mapReg(inst.arg1)}, %rax`);
          lines.push(`  imulq ${mapReg(inst.arg2)}, %rax`);
          lines.push(`  movq %rax, ${mapReg(inst.result)}`);
          break;

        case 'DIV':
          lines.push(`  movq ${mapReg(inst.arg1)}, %rax`);
          lines.push('  cqto');
          lines.push(`  idivq ${mapReg(inst.arg2)}`);
          lines.push(`  movq %rax, ${mapReg(inst.result)}`);
          break;

        case 'MOD':
          lines.push(`  movq ${mapReg(inst.arg1)}, %rax`);
          lines.push('  cqto');
          lines.push(`  idivq ${mapReg(inst.arg2)}`);
          lines.push(`  movq %rdx, ${mapReg(inst.result)}`);
          break;

        case 'EQ':
        case 'NEQ':
        case 'LT':
        case 'LE':
        case 'GT':
        case 'GE':
          lines.push(`  movq ${mapReg(inst.arg1)}, %rax`);
          lines.push(`  cmpq ${mapReg(inst.arg2)}, %rax`);
          const setOp =
            inst.op === 'EQ' ? 'sete' :
            inst.op === 'NEQ' ? 'setne' :
            inst.op === 'LT' ? 'setl' :
            inst.op === 'LE' ? 'setle' :
            inst.op === 'GT' ? 'setg' : 'setge';
          lines.push(`  ${setOp} %al`);
          lines.push('  movzbq %al, %rax');
          lines.push(`  movq %rax, ${mapReg(inst.result)}`);
          break;

        case 'GOTO':
          lines.push(`  jmp .${inst.result}`);
          break;

        case 'IF_FALSE':
          lines.push(`  cmpq $0, ${mapReg(inst.arg1)}`);
          lines.push(`  je .${inst.result}`);
          break;

        case 'IF_TRUE':
          lines.push(`  cmpq $0, ${mapReg(inst.arg1)}`);
          lines.push(`  jne .${inst.result}`);
          break;

        case 'PRINT':
          lines.push(`  movq $format_int, %rdi`);
          lines.push(`  movq ${mapReg(inst.arg1)}, %rsi`);
          lines.push('  xorq %rax, %rax');
          lines.push('  call printf');
          break;

        case 'RETURN':
          if (inst.arg1) {
            lines.push(`  movq ${mapReg(inst.arg1)}, %rax`);
          }
          lines.push('  movq %rbp, %rsp');
          lines.push('  popq %rbp');
          lines.push('  ret');
          break;
      }
    }

    lines.push('');
    lines.push('  # Return 0 from main');
    lines.push('  movq $0, %rax');
    lines.push('  movq %rbp, %rsp');
    lines.push('  popq %rbp');
    lines.push('  ret');

    return lines.join('\n');
  }
}
