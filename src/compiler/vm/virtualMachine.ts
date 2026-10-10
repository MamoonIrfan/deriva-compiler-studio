import {
  BytecodeInstruction,
  CallFrame,
  VMExecutionStep,
  VMOpCode,
  VMState,
} from '../../types';

export class VirtualMachine {
  private instructions: BytecodeInstruction[] = [];
  private ip: number = 0;
  private stack: (number | string | boolean)[] = [];
  private memory: Map<string, any> = new Map();
  private callStack: CallFrame[] = [];
  private output: string[] = [];
  private halted: boolean = false;
  private history: VMExecutionStep[] = [];
  private stepCount: number = 0;

  constructor(instructions: BytecodeInstruction[] = []) {
    this.load(instructions);
  }

  public load(instructions: BytecodeInstruction[]) {
    this.instructions = instructions;
    this.reset();
  }

  public reset() {
    this.ip = 0;
    this.stack = [];
    this.memory = new Map();
    this.callStack = [{ functionName: 'main', returnIp: -1, locals: new Map() }];
    this.output = [];
    this.halted = false;
    this.history = [];
    this.stepCount = 0;
    this.recordStep('Virtual Machine initialized');
  }

  public getState(): VMState {
    const memObj: Record<string, any> = {};
    for (const [k, v] of this.memory.entries()) {
      memObj[k] = v;
    }

    return {
      ip: this.ip,
      stack: [...this.stack],
      memory: memObj,
      callStack: JSON.parse(JSON.stringify(this.callStack)),
      output: [...this.output],
      halted: this.halted,
      stepCount: this.stepCount,
    };
  }

  public getHistory(): VMExecutionStep[] {
    return this.history;
  }

  public step(): VMState {
    if (this.halted || this.ip >= this.instructions.length) {
      this.halted = true;
      return this.getState();
    }

    const inst = this.instructions[this.ip];
    const prevIp = this.ip;
    this.ip++;
    this.stepCount++;

    let desc = '';

    switch (inst.op) {
      case VMOpCode.PUSH:
        this.stack.push(inst.operand);
        desc = `PUSH ${inst.operand}`;
        break;

      case VMOpCode.POP:
        const popped = this.stack.pop();
        desc = `POP (${popped})`;
        break;

      case VMOpCode.LOAD: {
        const varName = String(inst.operand);
        const val = this.memory.has(varName) ? this.memory.get(varName) : 0;
        this.stack.push(val);
        desc = `LOAD ${varName} = ${val}`;
        break;
      }

      case VMOpCode.STORE: {
        const varName = String(inst.operand);
        const val = this.stack.pop();
        this.memory.set(varName, val);
        desc = `STORE ${varName} = ${val}`;
        break;
      }

      case VMOpCode.ADD: {
        const b = Number(this.stack.pop());
        const a = Number(this.stack.pop());
        const res = a + b;
        this.stack.push(res);
        desc = `ADD ${a} + ${b} = ${res}`;
        break;
      }

      case VMOpCode.SUB: {
        const b = Number(this.stack.pop());
        const a = Number(this.stack.pop());
        const res = a - b;
        this.stack.push(res);
        desc = `SUB ${a} - ${b} = ${res}`;
        break;
      }

      case VMOpCode.MUL: {
        const b = Number(this.stack.pop());
        const a = Number(this.stack.pop());
        const res = a * b;
        this.stack.push(res);
        desc = `MUL ${a} * ${b} = ${res}`;
        break;
      }

      case VMOpCode.DIV: {
        const b = Number(this.stack.pop());
        const a = Number(this.stack.pop());
        const res = b !== 0 ? Math.floor(a / b) : 0;
        this.stack.push(res);
        desc = `DIV ${a} / ${b} = ${res}`;
        break;
      }

      case VMOpCode.MOD: {
        const b = Number(this.stack.pop());
        const a = Number(this.stack.pop());
        const res = b !== 0 ? a % b : 0;
        this.stack.push(res);
        desc = `MOD ${a} % ${b} = ${res}`;
        break;
      }

      case VMOpCode.EQ: {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const res = a === b;
        this.stack.push(res);
        desc = `EQ ${a} == ${b} -> ${res}`;
        break;
      }

      case VMOpCode.NEQ: {
        const b = this.stack.pop();
        const a = this.stack.pop();
        const res = a !== b;
        this.stack.push(res);
        desc = `NEQ ${a} != ${b} -> ${res}`;
        break;
      }

      case VMOpCode.LT: {
        const b = Number(this.stack.pop());
        const a = Number(this.stack.pop());
        const res = a < b;
        this.stack.push(res);
        desc = `LT ${a} < ${b} -> ${res}`;
        break;
      }

      case VMOpCode.LE: {
        const b = Number(this.stack.pop());
        const a = Number(this.stack.pop());
        const res = a <= b;
        this.stack.push(res);
        desc = `LE ${a} <= ${b} -> ${res}`;
        break;
      }

      case VMOpCode.GT: {
        const b = Number(this.stack.pop());
        const a = Number(this.stack.pop());
        const res = a > b;
        this.stack.push(res);
        desc = `GT ${a} > ${b} -> ${res}`;
        break;
      }

      case VMOpCode.GE: {
        const b = Number(this.stack.pop());
        const a = Number(this.stack.pop());
        const res = a >= b;
        this.stack.push(res);
        desc = `GE ${a} >= ${b} -> ${res}`;
        break;
      }

      case VMOpCode.JMP: {
        const target = Number(inst.operand);
        this.ip = target;
        desc = `JMP -> instruction ${target}`;
        break;
      }

      case VMOpCode.JMP_IF_FALSE: {
        const cond = this.stack.pop();
        if (!cond) {
          const target = Number(inst.operand);
          this.ip = target;
          desc = `JMP_IF_FALSE (cond=${cond}) -> jumped to ${target}`;
        } else {
          desc = `JMP_IF_FALSE (cond=${cond}) -> fallthrough`;
        }
        break;
      }

      case VMOpCode.PRINT: {
        const val = this.stack.pop();
        const text = String(val);
        this.output.push(text);
        desc = `PRINT ${text}`;
        break;
      }

      case VMOpCode.HALT:
        this.halted = true;
        desc = 'HALT';
        break;

      default:
        desc = `UNKNOWN OP ${inst.op}`;
        break;
    }

    this.recordStep(desc);
    return this.getState();
  }

  public runAll(maxSteps = 1000): VMState {
    let steps = 0;
    while (!this.halted && steps < maxSteps) {
      this.step();
      steps++;
    }
    return this.getState();
  }

  private recordStep(actionDescription: string) {
    this.history.push({
      stepNumber: this.stepCount,
      state: this.getState(),
      actionDescription,
    });
  }
}
