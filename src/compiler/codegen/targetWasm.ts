import { TACInstruction } from '../../types';

export class WasmCodeGenerator {
  public static generate(instructions: TACInstruction[]): string {
    const lines: string[] = [];

    // Collect all local variables and temporaries
    const locals = new Set<string>();
    for (const inst of instructions) {
      if (inst.result && !['LABEL', 'GOTO', 'IF_FALSE', 'IF_TRUE'].includes(inst.op)) {
        locals.add(inst.result);
      }
      if (inst.arg1 && !/^[0-9]/.test(inst.arg1) && !inst.arg1.startsWith('"')) {
        locals.add(inst.arg1);
      }
      if (inst.arg2 && !/^[0-9]/.test(inst.arg2) && !inst.arg2.startsWith('"')) {
        locals.add(inst.arg2);
      }
    }

    lines.push('(module');
    lines.push('  ;; Deriva WebAssembly Text (WAT) Target');
    lines.push('  (import "env" "print_i32" (func $print_i32 (param i32)))');
    lines.push('  (func $main (export "main")');

    for (const loc of Array.from(locals)) {
      lines.push(`    (local $${loc} i32)`);
    }

    lines.push('');

    const pushOperand = (val?: string) => {
      if (!val) return;
      if (/^[0-9]/.test(val)) {
        lines.push(`    i32.const ${val}`);
      } else {
        lines.push(`    local.get $${val}`);
      }
    };

    for (const inst of instructions) {
      lines.push(`    ;; TAC: ${inst.op} ${inst.arg1 || ''} ${inst.arg2 || ''} -> ${inst.result || ''}`);

      switch (inst.op) {
        case 'ASSIGN':
          pushOperand(inst.arg1);
          lines.push(`    local.set $${inst.result}`);
          break;

        case 'ADD':
          pushOperand(inst.arg1);
          pushOperand(inst.arg2);
          lines.push('    i32.add');
          lines.push(`    local.set $${inst.result}`);
          break;

        case 'SUB':
          pushOperand(inst.arg1);
          pushOperand(inst.arg2);
          lines.push('    i32.sub');
          lines.push(`    local.set $${inst.result}`);
          break;

        case 'MUL':
          pushOperand(inst.arg1);
          pushOperand(inst.arg2);
          lines.push('    i32.mul');
          lines.push(`    local.set $${inst.result}`);
          break;

        case 'DIV':
          pushOperand(inst.arg1);
          pushOperand(inst.arg2);
          lines.push('    i32.div_s');
          lines.push(`    local.set $${inst.result}`);
          break;

        case 'MOD':
          pushOperand(inst.arg1);
          pushOperand(inst.arg2);
          lines.push('    i32.rem_s');
          lines.push(`    local.set $${inst.result}`);
          break;

        case 'EQ':
          pushOperand(inst.arg1);
          pushOperand(inst.arg2);
          lines.push('    i32.eq');
          lines.push(`    local.set $${inst.result}`);
          break;

        case 'NEQ':
          pushOperand(inst.arg1);
          pushOperand(inst.arg2);
          lines.push('    i32.ne');
          lines.push(`    local.set $${inst.result}`);
          break;

        case 'LT':
          pushOperand(inst.arg1);
          pushOperand(inst.arg2);
          lines.push('    i32.lt_s');
          lines.push(`    local.set $${inst.result}`);
          break;

        case 'LE':
          pushOperand(inst.arg1);
          pushOperand(inst.arg2);
          lines.push('    i32.le_s');
          lines.push(`    local.set $${inst.result}`);
          break;

        case 'GT':
          pushOperand(inst.arg1);
          pushOperand(inst.arg2);
          lines.push('    i32.gt_s');
          lines.push(`    local.set $${inst.result}`);
          break;

        case 'GE':
          pushOperand(inst.arg1);
          pushOperand(inst.arg2);
          lines.push('    i32.ge_s');
          lines.push(`    local.set $${inst.result}`);
          break;

        case 'PRINT':
          pushOperand(inst.arg1);
          lines.push('    call $print_i32');
          break;
      }
    }

    lines.push('  )');
    lines.push(')');

    return lines.join('\n');
  }
}
