import {
  ASTNode,
  AssignmentStatementNode,
  BinaryExpressionNode,
  BlockStatementNode,
  ForStatementNode,
  FunctionCallNode,
  FunctionDeclarationNode,
  IdentifierNode,
  IfStatementNode,
  LiteralNode,
  PrintStatementNode,
  ProgramNode,
  ReturnStatementNode,
  TACInstruction,
  TACOp,
  UnaryExpressionNode,
  VariableDeclarationNode,
  WhileStatementNode,
} from '../../types';

export class TACGenerator {
  private instructions: TACInstruction[] = [];
  private tempCounter = 0;
  private labelCounter = 0;
  private tacIdCounter = 0;

  public generate(ast: ProgramNode): TACInstruction[] {
    this.instructions = [];
    this.tempCounter = 0;
    this.labelCounter = 0;
    this.tacIdCounter = 0;

    if (!ast || !ast.body) {
      return this.instructions;
    }

    for (const node of ast.body) {
      this.generateNode(node);
    }

    return this.instructions;
  }

  private newTemp(): string {
    return `t${this.tempCounter++}`;
  }

  private newLabel(prefix = 'L'): string {
    return `${prefix}${this.labelCounter++}`;
  }

  private emit(
    op: TACOp,
    arg1?: string,
    arg2?: string,
    result?: string,
    sourceLine?: number,
    comment?: string
  ): TACInstruction {
    const inst: TACInstruction = {
      id: this.tacIdCounter++,
      op,
      arg1,
      arg2,
      result,
      sourceLine,
      comment,
    };
    this.instructions.push(inst);
    return inst;
  }

  private generateNode(node: ASTNode): string | undefined {
    switch (node.type) {
      case 'Program':
        for (const stmt of node.body) {
          this.generateNode(stmt);
        }
        return undefined;

      case 'VariableDeclaration':
        return this.generateVarDecl(node);

      case 'FunctionDeclaration':
        return this.generateFuncDecl(node);

      case 'BlockStatement':
        return this.generateBlock(node);

      case 'AssignmentStatement':
        return this.generateAssignment(node);

      case 'IfStatement':
        return this.generateIf(node);

      case 'WhileStatement':
        return this.generateWhile(node);

      case 'ForStatement':
        return this.generateFor(node);

      case 'ReturnStatement':
        return this.generateReturn(node);

      case 'PrintStatement':
        return this.generatePrint(node);

      case 'ExpressionStatement':
        return this.generateNode(node.expression);

      case 'BinaryExpression':
        return this.generateBinary(node);

      case 'UnaryExpression':
        return this.generateUnary(node);

      case 'Literal':
        return this.generateLiteral(node);

      case 'Identifier':
        return this.generateIdentifier(node);

      case 'FunctionCall':
        return this.generateFunctionCall(node);

      default:
        return undefined;
    }
  }

  private generateVarDecl(node: VariableDeclarationNode): string {
    if (node.initializer) {
      const val = this.generateNode(node.initializer);
      if (val !== undefined) {
        this.emit('ASSIGN', val, undefined, node.name, node.location.line, `var ${node.name} init`);
      }
    }
    return node.name;
  }

  private generateFuncDecl(node: FunctionDeclarationNode): undefined {
    const funcLabel = `func_${node.name}`;
    this.emit('FUNC_BEGIN', node.name, undefined, undefined, node.location.line);
    this.emit('LABEL', undefined, undefined, funcLabel, node.location.line);

    // Process parameters
    for (const p of node.params) {
      this.emit('PARAM', p.name, undefined, undefined, p.location.line);
    }

    // Function body
    this.generateNode(node.body);

    this.emit('FUNC_END', node.name, undefined, undefined, node.location.line);
    return undefined;
  }

  private generateBlock(node: BlockStatementNode): undefined {
    for (const stmt of node.statements) {
      this.generateNode(stmt);
    }
    return undefined;
  }

  private generateAssignment(node: AssignmentStatementNode): string {
    const val = this.generateNode(node.value);
    const op = node.operator;

    if (op === '=') {
      this.emit('ASSIGN', val, undefined, node.target, node.location.line);
    } else {
      // Compound assignment e.g. +=, -=, *=, /=
      const arithOp = op.slice(0, -1);
      let tacOp: TACOp = 'ADD';
      if (arithOp === '-') tacOp = 'SUB';
      if (arithOp === '*') tacOp = 'MUL';
      if (arithOp === '/') tacOp = 'DIV';

      const temp = this.newTemp();
      this.emit(tacOp, node.target, val, temp, node.location.line);
      this.emit('ASSIGN', temp, undefined, node.target, node.location.line);
    }

    return node.target;
  }

  private generateIf(node: IfStatementNode): undefined {
    const cond = this.generateNode(node.condition);
    const labelElse = node.elseBranch ? this.newLabel('L_else_') : undefined;
    const labelEnd = this.newLabel('L_end_if_');

    const falseTarget = labelElse || labelEnd;
    this.emit('IF_FALSE', cond, undefined, falseTarget, node.location.line);

    // Then branch
    this.generateNode(node.thenBranch);

    if (node.elseBranch) {
      this.emit('GOTO', undefined, undefined, labelEnd, node.location.line);
      this.emit('LABEL', undefined, undefined, labelElse, node.location.line);
      this.generateNode(node.elseBranch);
    }

    this.emit('LABEL', undefined, undefined, labelEnd, node.location.line);
    return undefined;
  }

  private generateWhile(node: WhileStatementNode): undefined {
    const labelStart = this.newLabel('L_while_start_');
    const labelEnd = this.newLabel('L_while_end_');

    this.emit('LABEL', undefined, undefined, labelStart, node.location.line);
    const cond = this.generateNode(node.condition);
    this.emit('IF_FALSE', cond, undefined, labelEnd, node.location.line);

    this.generateNode(node.body);
    this.emit('GOTO', undefined, undefined, labelStart, node.location.line);
    this.emit('LABEL', undefined, undefined, labelEnd, node.location.line);
    return undefined;
  }

  private generateFor(node: ForStatementNode): undefined {
    const labelStart = this.newLabel('L_for_start_');
    const labelEnd = this.newLabel('L_for_end_');

    if (node.init) {
      this.generateNode(node.init);
    }

    this.emit('LABEL', undefined, undefined, labelStart, node.location.line);

    if (node.condition) {
      const cond = this.generateNode(node.condition);
      this.emit('IF_FALSE', cond, undefined, labelEnd, node.location.line);
    }

    this.generateNode(node.body);

    if (node.update) {
      this.generateNode(node.update);
    }

    this.emit('GOTO', undefined, undefined, labelStart, node.location.line);
    this.emit('LABEL', undefined, undefined, labelEnd, node.location.line);
    return undefined;
  }

  private generateReturn(node: ReturnStatementNode): undefined {
    if (node.argument) {
      const val = this.generateNode(node.argument);
      this.emit('RETURN', val, undefined, undefined, node.location.line);
    } else {
      this.emit('RETURN', undefined, undefined, undefined, node.location.line);
    }
    return undefined;
  }

  private generatePrint(node: PrintStatementNode): undefined {
    const val = this.generateNode(node.expression);
    this.emit('PRINT', val, undefined, undefined, node.location.line);
    return undefined;
  }

  private generateBinary(node: BinaryExpressionNode): string {
    const left = this.generateNode(node.left)!;
    const right = this.generateNode(node.right)!;
    const result = this.newTemp();

    let op: TACOp = 'ADD';
    switch (node.operator) {
      case '+':
        op = 'ADD';
        break;
      case '-':
        op = 'SUB';
        break;
      case '*':
        op = 'MUL';
        break;
      case '/':
        op = 'DIV';
        break;
      case '%':
        op = 'MOD';
        break;
      case '==':
        op = 'EQ';
        break;
      case '!=':
        op = 'NEQ';
        break;
      case '<':
        op = 'LT';
        break;
      case '<=':
        op = 'LE';
        break;
      case '>':
        op = 'GT';
        break;
      case '>=':
        op = 'GE';
        break;
      case '&&':
        op = 'AND';
        break;
      case '||':
        op = 'OR';
        break;
    }

    this.emit(op, left, right, result, node.location.line);
    return result;
  }

  private generateUnary(node: UnaryExpressionNode): string {
    const operand = this.generateNode(node.operand)!;
    const result = this.newTemp();

    const op: TACOp = node.operator === '-' ? 'NEG' : 'NOT';
    this.emit(op, operand, undefined, result, node.location.line);
    return result;
  }

  private generateLiteral(node: LiteralNode): string {
    if (node.dataType === 'string') {
      return JSON.stringify(node.value);
    }
    return String(node.value);
  }

  private generateIdentifier(node: IdentifierNode): string {
    return node.name;
  }

  private generateFunctionCall(node: FunctionCallNode): string {
    const argTemps: string[] = [];

    for (const arg of node.arguments) {
      const val = this.generateNode(arg)!;
      argTemps.push(val);
    }

    for (const arg of argTemps) {
      this.emit('PARAM', arg, undefined, undefined, node.location.line);
    }

    const result = this.newTemp();
    this.emit('CALL', node.callee, String(argTemps.length), result, node.location.line);
    return result;
  }
}
