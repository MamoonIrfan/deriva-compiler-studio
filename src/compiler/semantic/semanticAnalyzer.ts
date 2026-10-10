import {
  ASTNode,
  AssignmentStatementNode,
  BinaryExpressionNode,
  BlockStatementNode,
  CompilerDiagnostic,
  DataType,
  ForStatementNode,
  FunctionCallNode,
  FunctionDeclarationNode,
  IdentifierNode,
  IfStatementNode,
  LiteralNode,
  PrintStatementNode,
  ProgramNode,
  ReturnStatementNode,
  ScopeInfo,
  SymbolEntry,
  UnaryExpressionNode,
  VariableDeclarationNode,
  WhileStatementNode,
} from '../../types';
import { SymbolTableManager } from './symbolTable';

export class SemanticAnalyzer {
  private symTable: SymbolTableManager;
  private diagnostics: CompilerDiagnostic[] = [];
  private currentFunctionReturnType: DataType | null = null;
  private hasReturnedInCurrentFunction: boolean = false;

  constructor() {
    this.symTable = new SymbolTableManager();
  }

  public analyze(ast: ProgramNode): {
    symbolTable: Map<string, SymbolEntry>;
    scopes: ScopeInfo[];
    diagnostics: CompilerDiagnostic[];
  } {
    this.symTable.reset();
    this.diagnostics = [];
    this.currentFunctionReturnType = null;

    if (!ast || !ast.body) {
      return {
        symbolTable: new Map(),
        scopes: this.symTable.getScopes(),
        diagnostics: this.diagnostics,
      };
    }

    // First Pass: Hoist Function declarations
    for (const node of ast.body) {
      if (node.type === 'FunctionDeclaration') {
        this.declareFunctionSignature(node);
      }
    }

    // Second Pass: Analyze all nodes in order
    for (const node of ast.body) {
      this.analyzeNode(node);
    }

    // Check for unused variables (warnings)
    const unused = this.symTable.getUnusedVariables();
    for (const sym of unused) {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'warning',
        message: `Variable '${sym.name}' is declared but its value is never read.`,
        location: { line: sym.declaredLine, column: sym.declaredColumn },
        explanation: 'Unused variables consume memory and can indicate leftover debug or incomplete logic.',
        suggestion: "Remove the variable or prefix with '_' to ignore.",
      });
    }

    // Create a flat map of symbols for UI rendering
    const flatMap = new Map<string, SymbolEntry>();
    for (const sym of this.symTable.getAllSymbols()) {
      flatMap.set(sym.id, sym);
    }

    return {
      symbolTable: flatMap,
      scopes: this.symTable.getScopes(),
      diagnostics: this.diagnostics,
    };
  }

  private declareFunctionSignature(node: FunctionDeclarationNode) {
    const params = node.params.map((p) => ({ name: p.name, type: p.dataType }));
    const res = this.symTable.declareSymbol(
      node.name,
      'function',
      node.returnType,
      node.location,
      {
        params,
        returnType: node.returnType,
        initialized: true,
      }
    );

    if (res.error) {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: res.error,
        location: node.location,
      });
    }
  }

  private analyzeNode(node: ASTNode): DataType {
    switch (node.type) {
      case 'Program':
        for (const child of node.body) {
          this.analyzeNode(child);
        }
        return 'void';

      case 'VariableDeclaration':
        return this.analyzeVarDecl(node);

      case 'FunctionDeclaration':
        return this.analyzeFuncDecl(node);

      case 'BlockStatement':
        return this.analyzeBlock(node);

      case 'AssignmentStatement':
        return this.analyzeAssignment(node);

      case 'IfStatement':
        return this.analyzeIf(node);

      case 'WhileStatement':
        return this.analyzeWhile(node);

      case 'ForStatement':
        return this.analyzeFor(node);

      case 'ReturnStatement':
        return this.analyzeReturn(node);

      case 'PrintStatement':
        return this.analyzePrint(node);

      case 'ExpressionStatement':
        return this.analyzeNode(node.expression);

      case 'BinaryExpression':
        return this.analyzeBinary(node);

      case 'UnaryExpression':
        return this.analyzeUnary(node);

      case 'Literal':
        return this.analyzeLiteral(node);

      case 'Identifier':
        return this.analyzeIdentifier(node);

      case 'FunctionCall':
        return this.analyzeFunctionCall(node);

      default:
        return 'unknown';
    }
  }

  private analyzeVarDecl(node: VariableDeclarationNode): DataType {
    let initType: DataType = 'unknown';

    if (node.initializer) {
      initType = this.analyzeNode(node.initializer);

      if (node.dataType !== 'unknown' && initType !== 'unknown') {
        if (!this.areTypesCompatible(node.dataType, initType)) {
          this.diagnostics.push({
            phase: 'Semantic',
            severity: 'error',
            message: `Type mismatch in variable declaration '${node.name}'. Expected '${node.dataType}', found '${initType}'`,
            location: node.location,
            explanation: `Cannot initialize variable of type '${node.dataType}' with an expression of type '${initType}'.`,
            suggestion: `Cast the initializer or change '${node.name}' type to '${initType}'.`,
          });
        }
      }
    }

    const res = this.symTable.declareSymbol(
      node.name,
      'variable',
      node.dataType,
      node.location,
      {
        initialized: !!node.initializer,
      }
    );

    if (res.error) {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: res.error,
        location: node.location,
      });
    }

    if (res.warning) {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'warning',
        message: res.warning,
        location: node.location,
      });
    }

    node.inferredType = node.dataType;
    return node.dataType;
  }

  private analyzeFuncDecl(node: FunctionDeclarationNode): DataType {
    this.symTable.enterScope(`func_${node.name}`);
    const previousReturnType = this.currentFunctionReturnType;
    const previousReturned = this.hasReturnedInCurrentFunction;

    this.currentFunctionReturnType = node.returnType;
    this.hasReturnedInCurrentFunction = false;

    // Declare parameters in the local function scope
    for (const p of node.params) {
      const pRes = this.symTable.declareSymbol(p.name, 'parameter', p.dataType, p.location, {
        initialized: true,
      });
      if (pRes.error) {
        this.diagnostics.push({
          phase: 'Semantic',
          severity: 'error',
          message: pRes.error,
          location: p.location,
        });
      }
      p.inferredType = p.dataType;
    }

    // Analyze function body
    this.analyzeBlock(node.body, false);

    // If function has non-void return type, check if return occurred
    if (node.returnType !== 'void' && !this.hasReturnedInCurrentFunction) {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'warning',
        message: `Function '${node.name}' declares return type '${node.returnType}' but not all paths return a value.`,
        location: node.location,
        suggestion: `Add a 'return <${node.returnType}>;' at the end of the function body.`,
      });
    }

    this.symTable.exitScope();
    this.currentFunctionReturnType = previousReturnType;
    this.hasReturnedInCurrentFunction = previousReturned;

    node.inferredType = node.returnType;
    return node.returnType;
  }

  private analyzeBlock(node: BlockStatementNode, createScope = true): DataType {
    if (createScope) {
      this.symTable.enterScope('block');
    }

    for (const stmt of node.statements) {
      this.analyzeNode(stmt);
    }

    if (createScope) {
      this.symTable.exitScope();
    }

    node.inferredType = 'void';
    return 'void';
  }

  private analyzeAssignment(node: AssignmentStatementNode): DataType {
    const sym = this.symTable.lookupSymbol(node.target);
    const valueType = this.analyzeNode(node.value);

    if (!sym) {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Cannot assign to undeclared identifier '${node.target}'.`,
        location: node.location,
        explanation: `Variables must be declared with 'var ${node.target}: <type>' before assignment.`,
        suggestion: `Declare 'var ${node.target}: ${valueType};' first.`,
      });
      return 'unknown';
    }

    this.symTable.recordReference(node.target, node.location);
    sym.initialized = true;

    if (!this.areTypesCompatible(sym.dataType, valueType)) {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Type mismatch in assignment to '${node.target}'. Cannot assign '${valueType}' to variable of type '${sym.dataType}'.`,
        location: node.location,
      });
    }

    node.inferredType = sym.dataType;
    return sym.dataType;
  }

  private analyzeIf(node: IfStatementNode): DataType {
    const condType = this.analyzeNode(node.condition);
    if (condType !== 'bool' && condType !== 'unknown') {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Condition of 'if' statement must be boolean, got '${condType}'.`,
        location: node.location,
      });
    }

    this.analyzeNode(node.thenBranch);
    if (node.elseBranch) {
      this.analyzeNode(node.elseBranch);
    }

    node.inferredType = 'void';
    return 'void';
  }

  private analyzeWhile(node: WhileStatementNode): DataType {
    const condType = this.analyzeNode(node.condition);
    if (condType !== 'bool' && condType !== 'unknown') {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Condition of 'while' loop must be boolean, got '${condType}'.`,
        location: node.location,
      });
    }

    this.analyzeNode(node.body);
    node.inferredType = 'void';
    return 'void';
  }

  private analyzeFor(node: ForStatementNode): DataType {
    this.symTable.enterScope('for_loop');

    if (node.init) {
      this.analyzeNode(node.init);
    }
    if (node.condition) {
      const condType = this.analyzeNode(node.condition);
      if (condType !== 'bool' && condType !== 'unknown') {
        this.diagnostics.push({
          phase: 'Semantic',
          severity: 'error',
          message: `Condition of 'for' loop must be boolean, got '${condType}'.`,
          location: node.location,
        });
      }
    }
    if (node.update) {
      this.analyzeNode(node.update);
    }

    this.analyzeNode(node.body);

    this.symTable.exitScope();
    node.inferredType = 'void';
    return 'void';
  }

  private analyzeReturn(node: ReturnStatementNode): DataType {
    this.hasReturnedInCurrentFunction = true;
    let returnType: DataType = 'void';

    if (node.argument) {
      returnType = this.analyzeNode(node.argument);
    }

    if (this.currentFunctionReturnType === null) {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: "'return' statement outside of function definition.",
        location: node.location,
        explanation: 'Return statements can only be used inside functions.',
      });
      return 'unknown';
    }

    if (!this.areTypesCompatible(this.currentFunctionReturnType, returnType)) {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Function expected return type '${this.currentFunctionReturnType}', but returned '${returnType}'.`,
        location: node.location,
      });
    }

    node.inferredType = returnType;
    return returnType;
  }

  private analyzePrint(node: PrintStatementNode): DataType {
    const exprType = this.analyzeNode(node.expression);
    node.inferredType = 'void';
    return 'void';
  }

  private analyzeBinary(node: BinaryExpressionNode): DataType {
    const leftType = this.analyzeNode(node.left);
    const rightType = this.analyzeNode(node.right);

    const op = node.operator;

    // Arithmetic: +, -, *, /, %
    if (['+', '-', '*', '/', '%'].includes(op)) {
      if (op === '+' && (leftType === 'string' || rightType === 'string')) {
        node.inferredType = 'string';
        return 'string';
      }

      if (leftType === 'int' && rightType === 'int') {
        node.inferredType = 'int';
        return 'int';
      }
      if ((leftType === 'float' && rightType === 'float') || (leftType === 'int' && rightType === 'float') || (leftType === 'float' && rightType === 'int')) {
        node.inferredType = 'float';
        return 'float';
      }

      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Binary operator '${op}' not supported between types '${leftType}' and '${rightType}'.`,
        location: node.location,
      });
      node.inferredType = 'int';
      return 'int';
    }

    // Relational: <, <=, >, >=
    if (['<', '<=', '>', '>='].includes(op)) {
      if ((leftType === 'int' || leftType === 'float') && (rightType === 'int' || rightType === 'float')) {
        node.inferredType = 'bool';
        return 'bool';
      }
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Relational comparison '${op}' requires numeric operands, found '${leftType}' and '${rightType}'.`,
        location: node.location,
      });
      node.inferredType = 'bool';
      return 'bool';
    }

    // Equality: ==, !=
    if (['==', '!='].includes(op)) {
      if (this.areTypesCompatible(leftType, rightType) || this.areTypesCompatible(rightType, leftType)) {
        node.inferredType = 'bool';
        return 'bool';
      }
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Equality check '${op}' between incompatible types '${leftType}' and '${rightType}'.`,
        location: node.location,
      });
      node.inferredType = 'bool';
      return 'bool';
    }

    // Logical: &&, ||
    if (['&&', '||'].includes(op)) {
      if (leftType === 'bool' && rightType === 'bool') {
        node.inferredType = 'bool';
        return 'bool';
      }
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Logical '${op}' requires boolean operands, found '${leftType}' and '${rightType}'.`,
        location: node.location,
      });
      node.inferredType = 'bool';
      return 'bool';
    }

    node.inferredType = 'unknown';
    return 'unknown';
  }

  private analyzeUnary(node: UnaryExpressionNode): DataType {
    const operandType = this.analyzeNode(node.operand);

    if (node.operator === '-') {
      if (operandType === 'int' || operandType === 'float') {
        node.inferredType = operandType;
        return operandType;
      }
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Unary negation '-' requires numeric operand, found '${operandType}'.`,
        location: node.location,
      });
      node.inferredType = 'int';
      return 'int';
    }

    if (node.operator === '!') {
      if (operandType === 'bool') {
        node.inferredType = 'bool';
        return 'bool';
      }
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Logical NOT '!' requires boolean operand, found '${operandType}'.`,
        location: node.location,
      });
      node.inferredType = 'bool';
      return 'bool';
    }

    node.inferredType = 'unknown';
    return 'unknown';
  }

  private analyzeLiteral(node: LiteralNode): DataType {
    node.inferredType = node.dataType;
    return node.dataType;
  }

  private analyzeIdentifier(node: IdentifierNode): DataType {
    const sym = this.symTable.lookupSymbol(node.name);

    if (!sym) {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Undeclared identifier '${node.name}'.`,
        location: node.location,
        explanation: `The variable or function '${node.name}' was not declared in this or any enclosing scope.`,
        suggestion: `Declare 'var ${node.name}: int;' before using.`,
      });
      node.inferredType = 'unknown';
      return 'unknown';
    }

    this.symTable.recordReference(node.name, node.location);
    node.inferredType = sym.dataType;
    return sym.dataType;
  }

  private analyzeFunctionCall(node: FunctionCallNode): DataType {
    const sym = this.symTable.lookupSymbol(node.callee);

    if (!sym) {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Call to undefined function '${node.callee}'.`,
        location: node.location,
        suggestion: `Define function 'func ${node.callee}(...): void { ... }'`,
      });
      node.inferredType = 'unknown';
      return 'unknown';
    }

    if (sym.kind !== 'function') {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `'${node.callee}' is a ${sym.kind}, not a callable function.`,
        location: node.location,
      });
      node.inferredType = 'unknown';
      return 'unknown';
    }

    this.symTable.recordReference(node.callee, node.location);

    const expectedParams = sym.params || [];
    if (node.arguments.length !== expectedParams.length) {
      this.diagnostics.push({
        phase: 'Semantic',
        severity: 'error',
        message: `Function '${node.callee}' expects ${expectedParams.length} argument(s), but was called with ${node.arguments.length}.`,
        location: node.location,
      });
    } else {
      for (let i = 0; i < node.arguments.length; i++) {
        const argType = this.analyzeNode(node.arguments[i]);
        const expectedType = expectedParams[i].type;
        if (!this.areTypesCompatible(expectedType, argType)) {
          this.diagnostics.push({
            phase: 'Semantic',
            severity: 'error',
            message: `Argument ${i + 1} of '${node.callee}' expects '${expectedType}', but received '${argType}'.`,
            location: node.arguments[i].location,
          });
        }
      }
    }

    const returnType = sym.returnType || 'void';
    node.inferredType = returnType;
    return returnType;
  }

  private areTypesCompatible(target: DataType, source: DataType): boolean {
    if (target === source) return true;
    if (target === 'unknown' || source === 'unknown') return true;
    if (target === 'float' && source === 'int') return true; // implicit int -> float widening
    return false;
  }
}
