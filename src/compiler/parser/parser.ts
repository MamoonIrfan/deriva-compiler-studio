import {
  ASTNode,
  CompilerDiagnostic,
  DataType,
  FunctionCallNode,
  FunctionDeclarationNode,
  IdentifierNode,
  LiteralNode,
  ParseTreeNode,
  ProgramNode,
  SourceLocation,
  Token,
  TokenType,
  VariableDeclarationNode,
} from '../../types';

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private diagnostics: CompilerDiagnostic[] = [];
  private parseTreeNodeCounter = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): {
    ast: ProgramNode;
    parseTree: ParseTreeNode;
    diagnostics: CompilerDiagnostic[];
  } {
    this.current = 0;
    this.diagnostics = [];
    this.parseTreeNodeCounter = 0;

    const programBody: ASTNode[] = [];
    const parseTreeChildren: ParseTreeNode[] = [];

    const startLoc: SourceLocation = this.peek()
      ? { line: this.peek().line, column: this.peek().column, startOffset: this.peek().startOffset }
      : { line: 1, column: 1, startOffset: 0 };

    while (!this.isAtEnd()) {
      try {
        const declResult = this.parseDeclaration();
        if (declResult) {
          if (declResult.ast) programBody.push(declResult.ast);
          if (declResult.cst) parseTreeChildren.push(declResult.cst);
        }
      } catch (err: any) {
        this.synchronize();
      }
    }

    const endLoc: SourceLocation = this.previous()
      ? { line: this.previous().line, column: this.previous().column, endOffset: this.previous().endOffset }
      : startLoc;

    const ast: ProgramNode = {
      id: 'node_prog_root',
      type: 'Program',
      location: { ...startLoc, endOffset: endLoc.endOffset },
      body: programBody,
    };

    const parseTree: ParseTreeNode = {
      id: 'cst_node_root',
      symbol: 'Program',
      isTerminal: false,
      children: parseTreeChildren,
      rule: 'Program -> DeclarationList',
    };

    return { ast, parseTree, diagnostics: this.diagnostics };
  }

  private parseDeclaration(): { ast: ASTNode | null; cst: ParseTreeNode } | null {
    if (this.check('KEYWORD_VAR')) {
      return this.parseVarDeclaration();
    }
    if (this.check('KEYWORD_FUNC')) {
      return this.parseFuncDeclaration();
    }
    return this.parseStatement();
  }

  private parseVarDeclaration(): { ast: VariableDeclarationNode; cst: ParseTreeNode } {
    const varToken = this.consume('KEYWORD_VAR', "Expected 'var' keyword.");
    const idToken = this.consume('IDENTIFIER', 'Expected variable name identifier.');
    
    let typeNode: ParseTreeNode | null = null;
    let dataType: DataType = 'int';

    if (this.match('DELIM_COLON')) {
      const typeRes = this.parseType();
      dataType = typeRes.type;
      typeNode = typeRes.cst;
    }

    let initializer: ASTNode | undefined = undefined;
    let initCst: ParseTreeNode | null = null;

    if (this.match('OP_ASSIGN')) {
      const exprRes = this.parseExpression();
      initializer = exprRes.ast;
      initCst = this.createCstNode('OptInit', false, [
        this.createTerminalCst(this.previous()),
        exprRes.cst,
      ], 'OptInit -> = Expr');
    } else {
      initCst = this.createCstNode('OptInit', false, [
        this.createCstNode('ε', true, [], 'ε')
      ], 'OptInit -> ε');
    }

    const semiToken = this.consume('DELIM_SEMICOLON', "Expected ';' after variable declaration.");

    const ast: VariableDeclarationNode = {
      id: `node_var_${idToken.lexeme}_${idToken.line}_${idToken.column}`,
      type: 'VariableDeclaration',
      name: idToken.lexeme,
      dataType,
      initializer,
      location: {
        line: varToken.line,
        column: varToken.column,
        startOffset: varToken.startOffset,
        endOffset: semiToken ? semiToken.endOffset : this.previous().endOffset,
      },
    };

    const cstChildren: ParseTreeNode[] = [
      this.createTerminalCst(varToken),
      this.createTerminalCst(idToken),
    ];
    if (typeNode) {
      cstChildren.push(this.createCstNode(':', true, []));
      cstChildren.push(typeNode);
    }
    if (initCst) {
      cstChildren.push(initCst);
    }
    if (semiToken) {
      cstChildren.push(this.createTerminalCst(semiToken));
    }

    const cst = this.createCstNode('VarDecl', false, cstChildren, 'VarDecl -> var id : Type OptInit ;');

    return { ast, cst };
  }

  private parseFuncDeclaration(): { ast: FunctionDeclarationNode; cst: ParseTreeNode } {
    const funcToken = this.consume('KEYWORD_FUNC', "Expected 'func' keyword.");
    const idToken = this.consume('IDENTIFIER', 'Expected function name identifier.');

    this.consume('DELIM_LPAREN', "Expected '(' after function name.");

    const params: { name: string; dataType: DataType; cst: ParseTreeNode }[] = [];
    const paramCstChildren: ParseTreeNode[] = [];

    if (!this.check('DELIM_RPAREN')) {
      do {
        const pId = this.consume('IDENTIFIER', 'Expected parameter name.');
        this.consume('DELIM_COLON', "Expected ':' after parameter name.");
        const pType = this.parseType();
        const pCst = this.createCstNode('Param', false, [
          this.createTerminalCst(pId),
          this.createCstNode(':', true, []),
          pType.cst,
        ], 'Param -> id : Type');

        params.push({
          name: pId.lexeme,
          dataType: pType.type,
          cst: pCst,
        });
        paramCstChildren.push(pCst);
      } while (this.match('DELIM_COMMA'));
    }

    this.consume('DELIM_RPAREN', "Expected ')' after parameter list.");

    let returnType: DataType = 'void';
    let returnTypeCst: ParseTreeNode | null = null;

    if (this.match('DELIM_COLON') || this.match('DELIM_ARROW')) {
      const retTypeRes = this.parseType();
      returnType = retTypeRes.type;
      returnTypeCst = retTypeRes.cst;
    }

    const bodyRes = this.parseBlock();

    const ast: FunctionDeclarationNode = {
      id: `node_func_${idToken.lexeme}_${idToken.line}`,
      type: 'FunctionDeclaration',
      name: idToken.lexeme,
      params: params.map((p) => ({
        id: `node_param_${p.name}`,
        type: 'Parameter',
        name: p.name,
        dataType: p.dataType,
        location: { line: idToken.line, column: idToken.column },
      })),
      returnType,
      body: bodyRes.ast,
      location: {
        line: funcToken.line,
        column: funcToken.column,
        startOffset: funcToken.startOffset,
        endOffset: bodyRes.ast.location.endOffset,
      },
    };

    const cst = this.createCstNode('FuncDecl', false, [
      this.createTerminalCst(funcToken),
      this.createTerminalCst(idToken),
      this.createCstNode('ParamList', false, paramCstChildren, 'ParamList -> Param ...'),
      returnTypeCst || this.createCstNode('void', true, []),
      bodyRes.cst,
    ], 'FuncDecl -> func id ( OptParamList ) : Type Block');

    return { ast, cst };
  }

  private parseBlock(): { ast: any; cst: ParseTreeNode } {
    const lbrace = this.consume('DELIM_LBRACE', "Expected '{' to start block.");
    const statements: ASTNode[] = [];
    const stmtCstChildren: ParseTreeNode[] = [];

    while (!this.check('DELIM_RBRACE') && !this.isAtEnd()) {
      const stmtRes = this.parseDeclaration();
      if (stmtRes && stmtRes.ast) {
        statements.push(stmtRes.ast);
        stmtCstChildren.push(stmtRes.cst);
      }
    }

    const rbrace = this.consume('DELIM_RBRACE', "Expected '}' after block.");

    const ast = {
      id: `node_block_${lbrace.line}_${lbrace.column}`,
      type: 'BlockStatement',
      statements,
      location: {
        line: lbrace.line,
        column: lbrace.column,
        startOffset: lbrace.startOffset,
        endOffset: rbrace ? rbrace.endOffset : this.previous().endOffset,
      },
    };

    const cst = this.createCstNode('Block', false, [
      this.createTerminalCst(lbrace),
      this.createCstNode('StatementList', false, stmtCstChildren, 'StatementList -> Statement StatementList | ε'),
      rbrace ? this.createTerminalCst(rbrace) : this.createCstNode('}', true, []),
    ], 'Block -> { StatementList }');

    return { ast, cst };
  }

  private parseStatement(): { ast: ASTNode; cst: ParseTreeNode } {
    if (this.check('KEYWORD_IF')) {
      return this.parseIfStatement();
    }
    if (this.check('KEYWORD_WHILE')) {
      return this.parseWhileStatement();
    }
    if (this.check('KEYWORD_FOR')) {
      return this.parseForStatement();
    }
    if (this.check('KEYWORD_RETURN')) {
      return this.parseReturnStatement();
    }
    if (this.check('KEYWORD_PRINT')) {
      return this.parsePrintStatement();
    }
    if (this.check('DELIM_LBRACE')) {
      return this.parseBlock();
    }

    // Check assignment vs Expression Statement
    if (this.check('IDENTIFIER') && this.isAssignOp(this.peekNext()?.type)) {
      return this.parseAssignmentStatement();
    }

    return this.parseExpressionStatement();
  }

  private parseIfStatement(): { ast: ASTNode; cst: ParseTreeNode } {
    const ifToken = this.consume('KEYWORD_IF', "Expected 'if'.");
    this.consume('DELIM_LPAREN', "Expected '(' after 'if'.");
    const condRes = this.parseExpression();
    this.consume('DELIM_RPAREN', "Expected ')' after if condition.");

    const thenRes = this.parseStatement();
    let elseRes: { ast: ASTNode; cst: ParseTreeNode } | undefined = undefined;

    if (this.match('KEYWORD_ELSE')) {
      elseRes = this.parseStatement();
    }

    const ast = {
      id: `node_if_${ifToken.line}_${ifToken.column}`,
      type: 'IfStatement',
      condition: condRes.ast,
      thenBranch: thenRes.ast,
      elseBranch: elseRes?.ast,
      location: {
        line: ifToken.line,
        column: ifToken.column,
        startOffset: ifToken.startOffset,
        endOffset: elseRes ? elseRes.ast.location.endOffset : thenRes.ast.location.endOffset,
      },
    };

    const cstChildren = [
      this.createTerminalCst(ifToken),
      condRes.cst,
      thenRes.cst,
    ];
    if (elseRes) {
      cstChildren.push(this.createCstNode('else', true, []));
      cstChildren.push(elseRes.cst);
    }

    const cst = this.createCstNode('IfStmt', false, cstChildren, 'IfStmt -> if ( Expr ) Statement OptElse');
    return { ast, cst };
  }

  private parseWhileStatement(): { ast: ASTNode; cst: ParseTreeNode } {
    const whileToken = this.consume('KEYWORD_WHILE', "Expected 'while'.");
    this.consume('DELIM_LPAREN', "Expected '(' after 'while'.");
    const condRes = this.parseExpression();
    this.consume('DELIM_RPAREN', "Expected ')' after condition.");
    const bodyRes = this.parseStatement();

    const ast = {
      id: `node_while_${whileToken.line}_${whileToken.column}`,
      type: 'WhileStatement',
      condition: condRes.ast,
      body: bodyRes.ast,
      location: {
        line: whileToken.line,
        column: whileToken.column,
        startOffset: whileToken.startOffset,
        endOffset: bodyRes.ast.location.endOffset,
      },
    };

    const cst = this.createCstNode('WhileStmt', false, [
      this.createTerminalCst(whileToken),
      condRes.cst,
      bodyRes.cst,
    ], 'WhileStmt -> while ( Expr ) Statement');

    return { ast, cst };
  }

  private parseForStatement(): { ast: ASTNode; cst: ParseTreeNode } {
    const forToken = this.consume('KEYWORD_FOR', "Expected 'for'.");
    this.consume('DELIM_LPAREN', "Expected '(' after 'for'.");

    let init: ASTNode | undefined = undefined;
    let initCst: ParseTreeNode | null = null;

    if (!this.match('DELIM_SEMICOLON')) {
      if (this.check('KEYWORD_VAR')) {
        const varRes = this.parseVarDeclaration();
        init = varRes.ast;
        initCst = varRes.cst;
      } else {
        const assignRes = this.parseAssignmentStatement();
        init = assignRes.ast;
        initCst = assignRes.cst;
      }
    }

    let cond: ASTNode | undefined = undefined;
    let condCst: ParseTreeNode | null = null;
    if (!this.check('DELIM_SEMICOLON')) {
      const condRes = this.parseExpression();
      cond = condRes.ast;
      condCst = condRes.cst;
    }
    this.consume('DELIM_SEMICOLON', "Expected ';' after for loop condition.");

    let update: ASTNode | undefined = undefined;
    let updateCst: ParseTreeNode | null = null;
    if (!this.check('DELIM_RPAREN')) {
      if (this.check('IDENTIFIER') && this.isAssignOp(this.peekNext()?.type)) {
        const idToken = this.consume('IDENTIFIER', 'Expected identifier.');
        const opToken = this.advance();
        const exprRes = this.parseExpression();
        update = {
          id: `node_for_update_${idToken.lexeme}`,
          type: 'AssignmentStatement',
          target: idToken.lexeme,
          operator: opToken.lexeme,
          value: exprRes.ast,
          location: { line: idToken.line, column: idToken.column },
        };
        updateCst = this.createCstNode('OptForUpdate', false, [
          this.createTerminalCst(idToken),
          this.createTerminalCst(opToken),
          exprRes.cst,
        ]);
      } else {
        const exprRes = this.parseExpression();
        update = exprRes.ast;
        updateCst = exprRes.cst;
      }
    }
    this.consume('DELIM_RPAREN', "Expected ')' after for clauses.");

    const bodyRes = this.parseStatement();

    const ast = {
      id: `node_for_${forToken.line}_${forToken.column}`,
      type: 'ForStatement',
      init,
      condition: cond,
      update,
      body: bodyRes.ast,
      location: {
        line: forToken.line,
        column: forToken.column,
        startOffset: forToken.startOffset,
        endOffset: bodyRes.ast.location.endOffset,
      },
    };

    const cst = this.createCstNode('ForStmt', false, [
      this.createTerminalCst(forToken),
      initCst || this.createCstNode('OptForInit', false, []),
      condCst || this.createCstNode('OptExpr', false, []),
      updateCst || this.createCstNode('OptForUpdate', false, []),
      bodyRes.cst,
    ], 'ForStmt -> for ( OptForInit ; OptExpr ; OptForUpdate ) Statement');

    return { ast, cst };
  }

  private parseAssignmentStatement(): { ast: ASTNode; cst: ParseTreeNode } {
    const idToken = this.consume('IDENTIFIER', 'Expected variable name.');
    const opToken = this.advance(); // =, +=, -=, *=, /=
    const exprRes = this.parseExpression();
    const semiToken = this.consume('DELIM_SEMICOLON', "Expected ';' after assignment.");

    const ast = {
      id: `node_assign_${idToken.lexeme}_${idToken.line}_${idToken.column}`,
      type: 'AssignmentStatement',
      target: idToken.lexeme,
      operator: opToken.lexeme,
      value: exprRes.ast,
      location: {
        line: idToken.line,
        column: idToken.column,
        startOffset: idToken.startOffset,
        endOffset: semiToken ? semiToken.endOffset : exprRes.ast.location.endOffset,
      },
    };

    const cst = this.createCstNode('AssignStmt', false, [
      this.createTerminalCst(idToken),
      this.createTerminalCst(opToken),
      exprRes.cst,
      semiToken ? this.createTerminalCst(semiToken) : this.createCstNode(';', true, []),
    ], 'AssignStmt -> id AssignOp Expr ;');

    return { ast, cst };
  }

  private parseReturnStatement(): { ast: ASTNode; cst: ParseTreeNode } {
    const retToken = this.consume('KEYWORD_RETURN', "Expected 'return'.");
    let expr: ASTNode | undefined = undefined;
    let exprCst: ParseTreeNode | null = null;

    if (!this.check('DELIM_SEMICOLON')) {
      const exprRes = this.parseExpression();
      expr = exprRes.ast;
      exprCst = exprRes.cst;
    }

    const semi = this.consume('DELIM_SEMICOLON', "Expected ';' after return value.");

    const ast = {
      id: `node_return_${retToken.line}_${retToken.column}`,
      type: 'ReturnStatement',
      argument: expr,
      location: {
        line: retToken.line,
        column: retToken.column,
        startOffset: retToken.startOffset,
        endOffset: semi ? semi.endOffset : this.previous().endOffset,
      },
    };

    const cst = this.createCstNode('ReturnStmt', false, [
      this.createTerminalCst(retToken),
      exprCst || this.createCstNode('OptExpr', false, [this.createCstNode('ε', true, [])]),
      semi ? this.createTerminalCst(semi) : this.createCstNode(';', true, []),
    ], 'ReturnStmt -> return OptExpr ;');

    return { ast, cst };
  }

  private parsePrintStatement(): { ast: ASTNode; cst: ParseTreeNode } {
    const printToken = this.consume('KEYWORD_PRINT', "Expected 'print'.");
    this.consume('DELIM_LPAREN', "Expected '(' after 'print'.");
    const exprRes = this.parseExpression();
    this.consume('DELIM_RPAREN', "Expected ')' after print argument.");
    const semi = this.consume('DELIM_SEMICOLON', "Expected ';' after print statement.");

    const ast = {
      id: `node_print_${printToken.line}_${printToken.column}`,
      type: 'PrintStatement',
      expression: exprRes.ast,
      location: {
        line: printToken.line,
        column: printToken.column,
        startOffset: printToken.startOffset,
        endOffset: semi ? semi.endOffset : this.previous().endOffset,
      },
    };

    const cst = this.createCstNode('PrintStmt', false, [
      this.createTerminalCst(printToken),
      exprRes.cst,
      semi ? this.createTerminalCst(semi) : this.createCstNode(';', true, []),
    ], 'PrintStmt -> print ( Expr ) ;');

    return { ast, cst };
  }

  private parseExpressionStatement(): { ast: ASTNode; cst: ParseTreeNode } {
    const exprRes = this.parseExpression();
    const semi = this.consume('DELIM_SEMICOLON', "Expected ';' after expression.");

    const ast = {
      id: `node_expr_stmt_${exprRes.ast.location.line}`,
      type: 'ExpressionStatement',
      expression: exprRes.ast,
      location: {
        line: exprRes.ast.location.line,
        column: exprRes.ast.location.column,
        startOffset: exprRes.ast.location.startOffset,
        endOffset: semi ? semi.endOffset : exprRes.ast.location.endOffset,
      },
    };

    const cst = this.createCstNode('ExprStmt', false, [
      exprRes.cst,
      semi ? this.createTerminalCst(semi) : this.createCstNode(';', true, []),
    ], 'ExprStmt -> Expr ;');

    return { ast, cst };
  }

  // --- Expression Parsers (Precedence climbing) ---

  private parseExpression(): { ast: ASTNode; cst: ParseTreeNode } {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): { ast: ASTNode; cst: ParseTreeNode } {
    let left = this.parseLogicalAnd();

    while (this.match('OP_OR')) {
      const op = this.previous();
      const right = this.parseLogicalAnd();
      const ast = {
        id: `node_bin_${op.lexeme}_${op.line}_${op.column}`,
        type: 'BinaryExpression',
        operator: op.lexeme,
        left: left.ast,
        right: right.ast,
        location: {
          line: left.ast.location.line,
          column: left.ast.location.column,
          startOffset: left.ast.location.startOffset,
          endOffset: right.ast.location.endOffset,
        },
      };
      const cst = this.createCstNode('LogicalOrExpr', false, [
        left.cst,
        this.createTerminalCst(op),
        right.cst,
      ], 'LogicalOrExpr -> LogicalAndExpr || LogicalOrExpr');
      left = { ast, cst };
    }

    return left;
  }

  private parseLogicalAnd(): { ast: ASTNode; cst: ParseTreeNode } {
    let left = this.parseEquality();

    while (this.match('OP_AND')) {
      const op = this.previous();
      const right = this.parseEquality();
      const ast = {
        id: `node_bin_${op.lexeme}_${op.line}_${op.column}`,
        type: 'BinaryExpression',
        operator: op.lexeme,
        left: left.ast,
        right: right.ast,
        location: {
          line: left.ast.location.line,
          column: left.ast.location.column,
          startOffset: left.ast.location.startOffset,
          endOffset: right.ast.location.endOffset,
        },
      };
      const cst = this.createCstNode('LogicalAndExpr', false, [
        left.cst,
        this.createTerminalCst(op),
        right.cst,
      ], 'LogicalAndExpr -> EqualityExpr && LogicalAndExpr');
      left = { ast, cst };
    }

    return left;
  }

  private parseEquality(): { ast: ASTNode; cst: ParseTreeNode } {
    let left = this.parseRelational();

    while (this.match('OP_EQ', 'OP_NEQ')) {
      const op = this.previous();
      const right = this.parseRelational();
      const ast = {
        id: `node_bin_${op.lexeme}_${op.line}_${op.column}`,
        type: 'BinaryExpression',
        operator: op.lexeme,
        left: left.ast,
        right: right.ast,
        location: {
          line: left.ast.location.line,
          column: left.ast.location.column,
          startOffset: left.ast.location.startOffset,
          endOffset: right.ast.location.endOffset,
        },
      };
      const cst = this.createCstNode('EqualityExpr', false, [
        left.cst,
        this.createTerminalCst(op),
        right.cst,
      ], `EqualityExpr -> RelationalExpr ${op.lexeme} RelationalExpr`);
      left = { ast, cst };
    }

    return left;
  }

  private parseRelational(): { ast: ASTNode; cst: ParseTreeNode } {
    let left = this.parseAdditive();

    while (this.match('OP_LT', 'OP_LE', 'OP_GT', 'OP_GE')) {
      const op = this.previous();
      const right = this.parseAdditive();
      const ast = {
        id: `node_bin_${op.lexeme}_${op.line}_${op.column}`,
        type: 'BinaryExpression',
        operator: op.lexeme,
        left: left.ast,
        right: right.ast,
        location: {
          line: left.ast.location.line,
          column: left.ast.location.column,
          startOffset: left.ast.location.startOffset,
          endOffset: right.ast.location.endOffset,
        },
      };
      const cst = this.createCstNode('RelationalExpr', false, [
        left.cst,
        this.createTerminalCst(op),
        right.cst,
      ], `RelationalExpr -> AdditiveExpr ${op.lexeme} AdditiveExpr`);
      left = { ast, cst };
    }

    return left;
  }

  private parseAdditive(): { ast: ASTNode; cst: ParseTreeNode } {
    let left = this.parseMultiplicative();

    while (this.match('OP_PLUS', 'OP_MINUS')) {
      const op = this.previous();
      const right = this.parseMultiplicative();
      const ast = {
        id: `node_bin_${op.lexeme}_${op.line}_${op.column}`,
        type: 'BinaryExpression',
        operator: op.lexeme,
        left: left.ast,
        right: right.ast,
        location: {
          line: left.ast.location.line,
          column: left.ast.location.column,
          startOffset: left.ast.location.startOffset,
          endOffset: right.ast.location.endOffset,
        },
      };
      const cst = this.createCstNode('AdditiveExpr', false, [
        left.cst,
        this.createTerminalCst(op),
        right.cst,
      ], `AdditiveExpr -> MultiplicativeExpr ${op.lexeme} MultiplicativeExpr`);
      left = { ast, cst };
    }

    return left;
  }

  private parseMultiplicative(): { ast: ASTNode; cst: ParseTreeNode } {
    let left = this.parseUnary();

    while (this.match('OP_MUL', 'OP_DIV', 'OP_MOD')) {
      const op = this.previous();
      const right = this.parseUnary();
      const ast = {
        id: `node_bin_${op.lexeme}_${op.line}_${op.column}`,
        type: 'BinaryExpression',
        operator: op.lexeme,
        left: left.ast,
        right: right.ast,
        location: {
          line: left.ast.location.line,
          column: left.ast.location.column,
          startOffset: left.ast.location.startOffset,
          endOffset: right.ast.location.endOffset,
        },
      };
      const cst = this.createCstNode('MultiplicativeExpr', false, [
        left.cst,
        this.createTerminalCst(op),
        right.cst,
      ], `MultiplicativeExpr -> UnaryExpr ${op.lexeme} UnaryExpr`);
      left = { ast, cst };
    }

    return left;
  }

  private parseUnary(): { ast: ASTNode; cst: ParseTreeNode } {
    if (this.match('OP_MINUS', 'OP_NOT')) {
      const op = this.previous();
      const right = this.parseUnary();
      const ast = {
        id: `node_un_${op.lexeme}_${op.line}_${op.column}`,
        type: 'UnaryExpression',
        operator: op.lexeme,
        operand: right.ast,
        location: {
          line: op.line,
          column: op.column,
          startOffset: op.startOffset,
          endOffset: right.ast.location.endOffset,
        },
      };
      const cst = this.createCstNode('UnaryExpr', false, [
        this.createTerminalCst(op),
        right.cst,
      ], `UnaryExpr -> ${op.lexeme} UnaryExpr`);
      return { ast, cst };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): { ast: ASTNode; cst: ParseTreeNode } {
    const token = this.peek();

    if (this.match('LITERAL_INT')) {
      const tok = this.previous();
      const ast = {
        id: `node_lit_${tok.line}_${tok.column}`,
        type: 'Literal',
        value: tok.value,
        raw: tok.lexeme,
        dataType: 'int' as DataType,
        location: { line: tok.line, column: tok.column, startOffset: tok.startOffset, endOffset: tok.endOffset },
      };
      const cst = this.createTerminalCst(tok);
      return { ast, cst };
    }

    if (this.match('LITERAL_FLOAT')) {
      const tok = this.previous();
      const ast = {
        id: `node_lit_${tok.line}_${tok.column}`,
        type: 'Literal',
        value: tok.value,
        raw: tok.lexeme,
        dataType: 'float' as DataType,
        location: { line: tok.line, column: tok.column, startOffset: tok.startOffset, endOffset: tok.endOffset },
      };
      const cst = this.createTerminalCst(tok);
      return { ast, cst };
    }

    if (this.match('LITERAL_STRING')) {
      const tok = this.previous();
      const ast: LiteralNode = {
        id: `node_lit_${tok.line}_${tok.column}`,
        type: 'Literal',
        value: tok.value,
        raw: tok.lexeme,
        dataType: 'string' as DataType,
        location: { line: tok.line, column: tok.column, startOffset: tok.startOffset, endOffset: tok.endOffset },
      };
      const cst = this.createTerminalCst(tok);
      return { ast, cst };
    }

    if (this.match('KEYWORD_TRUE', 'KEYWORD_FALSE')) {
      const tok = this.previous();
      const ast: LiteralNode = {
        id: `node_lit_${tok.line}_${tok.column}`,
        type: 'Literal',
        value: tok.type === 'KEYWORD_TRUE',
        raw: tok.lexeme,
        dataType: 'bool' as DataType,
        location: { line: tok.line, column: tok.column, startOffset: tok.startOffset, endOffset: tok.endOffset },
      };
      const cst = this.createTerminalCst(tok);
      return { ast, cst };
    }

    if (this.match('IDENTIFIER')) {
      const idToken = this.previous();

      // Check if function call
      if (this.match('DELIM_LPAREN')) {
        const args: ASTNode[] = [];
        const argCsts: ParseTreeNode[] = [];

        if (!this.check('DELIM_RPAREN')) {
          do {
            const argRes = this.parseExpression();
            args.push(argRes.ast);
            argCsts.push(argRes.cst);
          } while (this.match('DELIM_COMMA'));
        }

        const rparen = this.consume('DELIM_RPAREN', "Expected ')' after function arguments.");

        const ast: FunctionCallNode = {
          id: `node_call_${idToken.lexeme}_${idToken.line}_${idToken.column}`,
          type: 'FunctionCall',
          callee: idToken.lexeme,
          arguments: args,
          location: {
            line: idToken.line,
            column: idToken.column,
            startOffset: idToken.startOffset,
            endOffset: rparen ? rparen.endOffset : this.previous().endOffset,
          },
        };

        const cst = this.createCstNode('FunctionCall', false, [
          this.createTerminalCst(idToken),
          this.createCstNode('(', true, []),
          this.createCstNode('ArgList', false, argCsts, 'ArgList -> Expr , ...'),
          rparen ? this.createTerminalCst(rparen) : this.createCstNode(')', true, []),
        ], 'FunctionCall -> id ( OptArgList )');

        return { ast, cst };
      }

      // Simple identifier reference
      const ast: IdentifierNode = {
        id: `node_id_${idToken.lexeme}_${idToken.line}_${idToken.column}`,
        type: 'Identifier',
        name: idToken.lexeme,
        location: { line: idToken.line, column: idToken.column, startOffset: idToken.startOffset, endOffset: idToken.endOffset },
      };
      const cst = this.createTerminalCst(idToken);
      return { ast, cst };
    }

    if (this.match('DELIM_LPAREN')) {
      const lparen = this.previous();
      const exprRes = this.parseExpression();
      const rparen = this.consume('DELIM_RPAREN', "Expected ')' after expression.");

      const cst = this.createCstNode('PrimaryExpr', false, [
        this.createTerminalCst(lparen),
        exprRes.cst,
        rparen ? this.createTerminalCst(rparen) : this.createCstNode(')', true, []),
      ], 'PrimaryExpr -> ( Expr )');

      return { ast: exprRes.ast, cst };
    }

    // Syntax Error fallback
    const errTok = this.peek() || { line: 1, column: 1, startOffset: 0, endOffset: 0, lexeme: 'EOF' };
    this.diagnostics.push({
      phase: 'Syntax',
      severity: 'error',
      message: `Unexpected token '${errTok.lexeme}' in expression`,
      location: { line: errTok.line, column: errTok.column, startOffset: errTok.startOffset, endOffset: errTok.endOffset },
      explanation: 'Expected a literal, identifier, unary operator, or parenthesis.',
      suggestion: 'Check for missing operators, variables, or parenthesis.',
    });

    this.advance(); // skip bad token
    const fallbackAst: LiteralNode = {
      id: `node_err_${errTok.line}`,
      type: 'Literal',
      value: 0,
      raw: '0',
      dataType: 'int' as DataType,
      location: { line: errTok.line, column: errTok.column },
    };
    const fallbackCst = this.createCstNode('<error>', true, []);
    return { ast: fallbackAst, cst: fallbackCst };
  }

  private parseType(): { type: DataType; cst: ParseTreeNode } {
    if (this.match('KEYWORD_INT')) {
      return { type: 'int', cst: this.createTerminalCst(this.previous()) };
    }
    if (this.match('KEYWORD_FLOAT')) {
      return { type: 'float', cst: this.createTerminalCst(this.previous()) };
    }
    if (this.match('KEYWORD_BOOL')) {
      return { type: 'bool', cst: this.createTerminalCst(this.previous()) };
    }
    if (this.match('KEYWORD_STRING')) {
      return { type: 'string', cst: this.createTerminalCst(this.previous()) };
    }
    if (this.match('KEYWORD_VOID')) {
      return { type: 'void', cst: this.createTerminalCst(this.previous()) };
    }

    const tok = this.peek();
    this.diagnostics.push({
      phase: 'Syntax',
      severity: 'error',
      message: `Invalid type name '${tok?.lexeme || 'unknown'}'. Expected int, float, bool, string, or void.`,
      location: tok ? { line: tok.line, column: tok.column } : { line: 1, column: 1 },
      suggestion: 'Use one of: int, float, bool, string, void.',
    });

    return { type: 'int', cst: this.createCstNode('Type', false, []) };
  }

  private isAssignOp(type?: TokenType): boolean {
    return (
      type === 'OP_ASSIGN' ||
      type === 'OP_PLUS_ASSIGN' ||
      type === 'OP_MINUS_ASSIGN' ||
      type === 'OP_MUL_ASSIGN' ||
      type === 'OP_DIV_ASSIGN'
    );
  }

  private createCstNode(
    symbol: string,
    isTerminal: boolean,
    children: ParseTreeNode[] = [],
    rule?: string
  ): ParseTreeNode {
    return {
      id: `cst_${this.parseTreeNodeCounter++}`,
      symbol,
      isTerminal,
      children,
      rule,
    };
  }

  private createTerminalCst(token: Token): ParseTreeNode {
    return {
      id: `cst_t_${this.parseTreeNodeCounter++}`,
      symbol: token.lexeme,
      isTerminal: true,
      token,
      children: [],
    };
  }

  private match(...types: TokenType[]): boolean {
    for (const t of types) {
      if (this.check(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current] || this.tokens[this.tokens.length - 1];
  }

  private peekNext(): Token | undefined {
    return this.tokens[this.current + 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    const tok = this.peek();
    this.diagnostics.push({
      phase: 'Syntax',
      severity: 'error',
      message: `${message} (Found '${tok?.lexeme || 'EOF'}')`,
      location: tok ? { line: tok.line, column: tok.column, startOffset: tok.startOffset, endOffset: tok.endOffset } : undefined,
      suggestion: `Insert '${type.replace('KEYWORD_', '').replace('DELIM_', '').toLowerCase()}'`,
    });

    return tok || { id: -1, type, lexeme: '', value: null, line: 1, column: 1, startOffset: 0, endOffset: 0 };
  }

  private synchronize() {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === 'DELIM_SEMICOLON') return;

      switch (this.peek().type) {
        case 'KEYWORD_VAR':
        case 'KEYWORD_FUNC':
        case 'KEYWORD_IF':
        case 'KEYWORD_WHILE':
        case 'KEYWORD_FOR':
        case 'KEYWORD_RETURN':
        case 'KEYWORD_PRINT':
        case 'DELIM_RBRACE':
          return;
      }

      this.advance();
    }
  }
}
