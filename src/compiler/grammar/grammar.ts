import { Grammar, GrammarProduction } from '../../types';

/**
 * Standard Grammar definitions for Deriva and educational sub-grammars (Arithmetic, Control Flow, Classic Expression Grammar).
 */

// Full Deriva Production Grammar
export const DERIVA_PRODUCTIONS: GrammarProduction[] = [
  { id: 0, lhs: "Program'", rhs: ['Program'] },
  { id: 1, lhs: 'Program', rhs: ['DeclarationList'] },
  { id: 2, lhs: 'DeclarationList', rhs: ['Declaration', 'DeclarationList'] },
  { id: 3, lhs: 'DeclarationList', rhs: ['ε'] },
  { id: 4, lhs: 'Declaration', rhs: ['VarDecl'] },
  { id: 5, lhs: 'Declaration', rhs: ['FuncDecl'] },
  { id: 6, lhs: 'Declaration', rhs: ['Statement'] },

  // Variable Declarations
  { id: 7, lhs: 'VarDecl', rhs: ['var', 'id', ':', 'Type', 'OptInit', ';'] },
  { id: 8, lhs: 'OptInit', rhs: ['=', 'Expr'] },
  { id: 9, lhs: 'OptInit', rhs: ['ε'] },
  { id: 10, lhs: 'Type', rhs: ['int'] },
  { id: 11, lhs: 'Type', rhs: ['float'] },
  { id: 12, lhs: 'Type', rhs: ['bool'] },
  { id: 13, lhs: 'Type', rhs: ['string'] },
  { id: 14, lhs: 'Type', rhs: ['void'] },

  // Function Declarations
  { id: 15, lhs: 'FuncDecl', rhs: ['func', 'id', '(', 'OptParamList', ')', ':', 'Type', 'Block'] },
  { id: 16, lhs: 'OptParamList', rhs: ['ParamList'] },
  { id: 17, lhs: 'OptParamList', rhs: ['ε'] },
  { id: 18, lhs: 'ParamList', rhs: ['Param', 'ParamRest'] },
  { id: 19, lhs: 'ParamRest', rhs: [',', 'Param', 'ParamRest'] },
  { id: 20, lhs: 'ParamRest', rhs: ['ε'] },
  { id: 21, lhs: 'Param', rhs: ['id', ':', 'Type'] },

  // Statements
  { id: 22, lhs: 'Block', rhs: ['{', 'StatementList', '}'] },
  { id: 23, lhs: 'StatementList', rhs: ['Statement', 'StatementList'] },
  { id: 24, lhs: 'StatementList', rhs: ['ε'] },
  { id: 25, lhs: 'Statement', rhs: ['VarDecl'] },
  { id: 26, lhs: 'Statement', rhs: ['AssignStmt'] },
  { id: 27, lhs: 'Statement', rhs: ['IfStmt'] },
  { id: 28, lhs: 'Statement', rhs: ['WhileStmt'] },
  { id: 29, lhs: 'Statement', rhs: ['ForStmt'] },
  { id: 30, lhs: 'Statement', rhs: ['ReturnStmt'] },
  { id: 31, lhs: 'Statement', rhs: ['PrintStmt'] },
  { id: 32, lhs: 'Statement', rhs: ['ExprStmt'] },
  { id: 33, lhs: 'Statement', rhs: ['Block'] },

  { id: 34, lhs: 'AssignStmt', rhs: ['id', 'AssignOp', 'Expr', ';'] },
  { id: 35, lhs: 'AssignOp', rhs: ['='] },
  { id: 36, lhs: 'AssignOp', rhs: ['+='] },
  { id: 37, lhs: 'AssignOp', rhs: ['-='] },
  { id: 38, lhs: 'AssignOp', rhs: ['*='] },
  { id: 39, lhs: 'AssignOp', rhs: ['/='] },

  { id: 40, lhs: 'IfStmt', rhs: ['if', '(', 'Expr', ')', 'Statement', 'OptElse'] },
  { id: 41, lhs: 'OptElse', rhs: ['else', 'Statement'] },
  { id: 42, lhs: 'OptElse', rhs: ['ε'] },

  { id: 43, lhs: 'WhileStmt', rhs: ['while', '(', 'Expr', ')', 'Statement'] },
  { id: 44, lhs: 'ForStmt', rhs: ['for', '(', 'OptForInit', ';', 'OptExpr', ';', 'OptForUpdate', ')', 'Statement'] },
  { id: 45, lhs: 'OptForInit', rhs: ['VarDecl'] },
  { id: 46, lhs: 'OptForInit', rhs: ['AssignStmt'] },
  { id: 47, lhs: 'OptForInit', rhs: ['ε'] },
  { id: 48, lhs: 'OptExpr', rhs: ['Expr'] },
  { id: 49, lhs: 'OptExpr', rhs: ['ε'] },
  { id: 50, lhs: 'OptForUpdate', rhs: ['id', 'AssignOp', 'Expr'] },
  { id: 51, lhs: 'OptForUpdate', rhs: ['ε'] },

  { id: 52, lhs: 'ReturnStmt', rhs: ['return', 'OptExpr', ';'] },
  { id: 53, lhs: 'PrintStmt', rhs: ['print', '(', 'Expr', ')', ';'] },
  { id: 54, lhs: 'ExprStmt', rhs: ['Expr', ';'] },

  // Expressions (Precedence Climbing / Stratified)
  { id: 55, lhs: 'Expr', rhs: ['LogicalOrExpr'] },
  { id: 56, lhs: 'LogicalOrExpr', rhs: ['LogicalAndExpr', 'LogicalOrRest'] },
  { id: 57, lhs: 'LogicalOrRest', rhs: ['||', 'LogicalAndExpr', 'LogicalOrRest'] },
  { id: 58, lhs: 'LogicalOrRest', rhs: ['ε'] },

  { id: 59, lhs: 'LogicalAndExpr', rhs: ['EqualityExpr', 'LogicalAndRest'] },
  { id: 60, lhs: 'LogicalAndRest', rhs: ['&&', 'EqualityExpr', 'LogicalAndRest'] },
  { id: 61, lhs: 'LogicalAndRest', rhs: ['ε'] },

  { id: 62, lhs: 'EqualityExpr', rhs: ['RelationalExpr', 'EqualityRest'] },
  { id: 63, lhs: 'EqualityRest', rhs: ['==', 'RelationalExpr'] },
  { id: 64, lhs: 'EqualityRest', rhs: ['!=', 'RelationalExpr'] },
  { id: 65, lhs: 'EqualityRest', rhs: ['ε'] },

  { id: 66, lhs: 'RelationalExpr', rhs: ['AdditiveExpr', 'RelationalRest'] },
  { id: 67, lhs: 'RelationalRest', rhs: ['<', 'AdditiveExpr'] },
  { id: 68, lhs: 'RelationalRest', rhs: ['<=', 'AdditiveExpr'] },
  { id: 69, lhs: 'RelationalRest', rhs: ['>', 'AdditiveExpr'] },
  { id: 70, lhs: 'RelationalRest', rhs: ['>=', 'AdditiveExpr'] },
  { id: 71, lhs: 'RelationalRest', rhs: ['ε'] },

  { id: 72, lhs: 'AdditiveExpr', rhs: ['MultiplicativeExpr', 'AdditiveRest'] },
  { id: 73, lhs: 'AdditiveRest', rhs: ['+', 'MultiplicativeExpr', 'AdditiveRest'] },
  { id: 74, lhs: 'AdditiveRest', rhs: ['-', 'MultiplicativeExpr', 'AdditiveRest'] },
  { id: 75, lhs: 'AdditiveRest', rhs: ['ε'] },

  { id: 76, lhs: 'MultiplicativeExpr', rhs: ['UnaryExpr', 'MultiplicativeRest'] },
  { id: 77, lhs: 'MultiplicativeRest', rhs: ['*', 'UnaryExpr', 'MultiplicativeRest'] },
  { id: 78, lhs: 'MultiplicativeRest', rhs: ['/', 'UnaryExpr', 'MultiplicativeRest'] },
  { id: 79, lhs: 'MultiplicativeRest', rhs: ['%', 'UnaryExpr', 'MultiplicativeRest'] },
  { id: 80, lhs: 'MultiplicativeRest', rhs: ['ε'] },

  { id: 81, lhs: 'UnaryExpr', rhs: ['-', 'UnaryExpr'] },
  { id: 82, lhs: 'UnaryExpr', rhs: ['!', 'UnaryExpr'] },
  { id: 83, lhs: 'UnaryExpr', rhs: ['PrimaryExpr'] },

  { id: 84, lhs: 'PrimaryExpr', rhs: ['id', 'OptCall'] },
  { id: 85, lhs: 'PrimaryExpr', rhs: ['num'] },
  { id: 86, lhs: 'PrimaryExpr', rhs: ['float_num'] },
  { id: 87, lhs: 'PrimaryExpr', rhs: ['str'] },
  { id: 88, lhs: 'PrimaryExpr', rhs: ['true'] },
  { id: 89, lhs: 'PrimaryExpr', rhs: ['false'] },
  { id: 90, lhs: 'PrimaryExpr', rhs: ['(', 'Expr', ')'] },

  { id: 91, lhs: 'OptCall', rhs: ['(', 'OptArgList', ')'] },
  { id: 92, lhs: 'OptCall', rhs: ['ε'] },
  { id: 93, lhs: 'OptArgList', rhs: ['ArgList'] },
  { id: 94, lhs: 'OptArgList', rhs: ['ε'] },
  { id: 95, lhs: 'ArgList', rhs: ['Expr', 'ArgRest'] },
  { id: 96, lhs: 'ArgRest', rhs: [',', 'Expr', 'ArgRest'] },
  { id: 97, lhs: 'ArgRest', rhs: ['ε'] },
];

export const NOVALANG_PRODUCTIONS = DERIVA_PRODUCTIONS;

export const DERIVA_GRAMMAR: Grammar = {
  startSymbol: 'Program',
  terminals: [
    'var', 'int', 'float', 'bool', 'string', 'void', 'if', 'else', 'while', 'for', 'func', 'return', 'print',
    'true', 'false', 'id', 'num', 'float_num', 'str',
    '+', '-', '*', '/', '%', '=', '+=', '-=', '*=', '/=',
    '==', '!=', '<', '<=', '>', '>=', '&&', '||', '!',
    '(', ')', '{', '}', ';', ',', ':', '->', '$'
  ],
  nonTerminals: [
    'Program', 'DeclarationList', 'Declaration', 'VarDecl', 'OptInit', 'Type', 'FuncDecl', 'OptParamList',
    'ParamList', 'ParamRest', 'Param', 'Block', 'StatementList', 'Statement', 'AssignStmt', 'AssignOp',
    'IfStmt', 'OptElse', 'WhileStmt', 'ForStmt', 'OptForInit', 'OptExpr', 'OptForUpdate', 'ReturnStmt',
    'PrintStmt', 'ExprStmt', 'Expr', 'LogicalOrExpr', 'LogicalOrRest', 'LogicalAndExpr', 'LogicalAndRest',
    'EqualityExpr', 'EqualityRest', 'RelationalExpr', 'RelationalRest', 'AdditiveExpr', 'AdditiveRest',
    'MultiplicativeExpr', 'MultiplicativeRest', 'UnaryExpr', 'PrimaryExpr', 'OptCall', 'OptArgList',
    'ArgList', 'ArgRest'
  ],
  productions: DERIVA_PRODUCTIONS,
};

export const NOVALANG_GRAMMAR = DERIVA_GRAMMAR;

// Educational Grammar 1: Classic Arithmetic Expression Grammar (for LR(0), SLR, CLR, LALR demonstration)
export const ARITHMETIC_EXPR_PRODUCTIONS: GrammarProduction[] = [
  { id: 0, lhs: "E'", rhs: ['E'] },
  { id: 1, lhs: 'E', rhs: ['E', '+', 'T'] },
  { id: 2, lhs: 'E', rhs: ['T'] },
  { id: 3, lhs: 'T', rhs: ['T', '*', 'F'] },
  { id: 4, lhs: 'T', rhs: ['F'] },
  { id: 5, lhs: 'F', rhs: ['(', 'E', ')'] },
  { id: 6, lhs: 'F', rhs: ['id'] },
];

export const ARITHMETIC_EXPR_GRAMMAR: Grammar = {
  startSymbol: 'E',
  terminals: ['+', '*', '(', ')', 'id', '$'],
  nonTerminals: ['E', 'T', 'F'],
  productions: ARITHMETIC_EXPR_PRODUCTIONS,
};

// Educational Grammar 2: LL(1) Non-Left-Recursive Expression Grammar
export const LL1_EXPR_PRODUCTIONS: GrammarProduction[] = [
  { id: 0, lhs: "E'", rhs: ['E'] },
  { id: 1, lhs: 'E', rhs: ['T', "E'"] },
  { id: 2, lhs: "E'", rhs: ['+', 'T', "E'"] },
  { id: 3, lhs: "E'", rhs: ['ε'] },
  { id: 4, lhs: 'T', rhs: ['F', "T'"] },
  { id: 5, lhs: "T'", rhs: ['*', 'F', "T'"] },
  { id: 6, lhs: "T'", rhs: ['ε'] },
  { id: 7, lhs: 'F', rhs: ['(', 'E', ')'] },
  { id: 8, lhs: 'F', rhs: ['id'] },
];

export const LL1_EXPR_GRAMMAR: Grammar = {
  startSymbol: 'E',
  terminals: ['+', '*', '(', ')', 'id', '$'],
  nonTerminals: ['E', "E'", 'T', "T'", 'F'],
  productions: LL1_EXPR_PRODUCTIONS,
};

// Educational Grammar 3: Simple Statement Grammar (If/Else, Assign)
export const STATEMENT_PRODUCTIONS: GrammarProduction[] = [
  { id: 0, lhs: "S'", rhs: ['S'] },
  { id: 1, lhs: 'S', rhs: ['if', '(', 'E', ')', 'S', 'else', 'S'] },
  { id: 2, lhs: 'S', rhs: ['if', '(', 'E', ')', 'S'] },
  { id: 3, lhs: 'S', rhs: ['id', '=', 'E', ';'] },
  { id: 4, lhs: 'E', rhs: ['id'] },
  { id: 5, lhs: 'E', rhs: ['num'] },
];

export const STATEMENT_GRAMMAR: Grammar = {
  startSymbol: 'S',
  terminals: ['if', 'else', '(', ')', '=', ';', 'id', 'num', '$'],
  nonTerminals: ['S', 'E'],
  productions: STATEMENT_PRODUCTIONS,
};
