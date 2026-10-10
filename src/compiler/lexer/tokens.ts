import { TokenType } from '../../types';

export interface TokenPattern {
  type: TokenType;
  category: 'Keyword' | 'Literal' | 'Identifier' | 'Operator' | 'Delimiter' | 'Special';
  regexStr: string;
  description: string;
  example: string;
}

export const TOKEN_PATTERNS: TokenPattern[] = [
  // Keywords
  { type: 'KEYWORD_VAR', category: 'Keyword', regexStr: 'var', description: 'Variable declaration keyword', example: 'var x: int = 10;' },
  { type: 'KEYWORD_INT', category: 'Keyword', regexStr: 'int', description: 'Integer 32-bit type keyword', example: 'int' },
  { type: 'KEYWORD_FLOAT', category: 'Keyword', regexStr: 'float', description: 'Floating-point number type keyword', example: 'float' },
  { type: 'KEYWORD_BOOL', category: 'Keyword', regexStr: 'bool', description: 'Boolean true/false type keyword', example: 'bool' },
  { type: 'KEYWORD_STRING', category: 'Keyword', regexStr: 'string', description: 'UTF-8 string literal type keyword', example: 'string' },
  { type: 'KEYWORD_VOID', category: 'Keyword', regexStr: 'void', description: 'Empty return type keyword', example: 'void' },
  { type: 'KEYWORD_IF', category: 'Keyword', regexStr: 'if', description: 'Conditional branch statement', example: 'if (x > 0) { ... }' },
  { type: 'KEYWORD_ELSE', category: 'Keyword', regexStr: 'else', description: 'Alternative branch statement', example: 'else { ... }' },
  { type: 'KEYWORD_WHILE', category: 'Keyword', regexStr: 'while', description: 'Loop construct for conditional iteration', example: 'while (i < 10) { ... }' },
  { type: 'KEYWORD_FOR', category: 'Keyword', regexStr: 'for', description: 'Iteration loop construct', example: 'for (var i = 0; i < 5; i += 1) { ... }' },
  { type: 'KEYWORD_FUNC', category: 'Keyword', regexStr: 'func', description: 'Function definition keyword', example: 'func add(a: int, b: int): int' },
  { type: 'KEYWORD_RETURN', category: 'Keyword', regexStr: 'return', description: 'Returns a value from a function', example: 'return a + b;' },
  { type: 'KEYWORD_PRINT', category: 'Keyword', regexStr: 'print', description: 'Built-in standard output statement', example: 'print(result);' },
  { type: 'KEYWORD_TRUE', category: 'Keyword', regexStr: 'true', description: 'Boolean literal constant true', example: 'true' },
  { type: 'KEYWORD_FALSE', category: 'Keyword', regexStr: 'false', description: 'Boolean literal constant false', example: 'false' },

  // Literals & Identifiers
  { type: 'LITERAL_FLOAT', category: 'Literal', regexStr: '[0-9]+\\.[0-9]+', description: 'Floating point literal', example: '3.14159' },
  { type: 'LITERAL_INT', category: 'Literal', regexStr: '[0-9]+', description: 'Unsigned integer numeric literal', example: '42' },
  { type: 'LITERAL_STRING', category: 'Literal', regexStr: '"[^"\\\\]*(\\\\.[^"\\\\]*)*"', description: 'Quoted string literal with escape sequence support', example: '"Hello, Deriva!"' },
  { type: 'IDENTIFIER', category: 'Identifier', regexStr: '[a-zA-Z_][a-zA-Z0-9_]*', description: 'User-defined variable or function identifier', example: 'totalSum_2' },

  // Operators
  { type: 'OP_EQ', category: 'Operator', regexStr: '==', description: 'Equality comparison operator', example: 'a == b' },
  { type: 'OP_NEQ', category: 'Operator', regexStr: '!=', description: 'Inequality comparison operator', example: 'a != b' },
  { type: 'OP_LE', category: 'Operator', regexStr: '<=', description: 'Less than or equal to comparison', example: 'a <= b' },
  { type: 'OP_GE', category: 'Operator', regexStr: '>=', description: 'Greater than or equal to comparison', example: 'a >= b' },
  { type: 'OP_AND', category: 'Operator', regexStr: '&&', description: 'Logical AND conjunction', example: 'a && b' },
  { type: 'OP_OR', category: 'Operator', regexStr: '||', description: 'Logical OR disjunction', example: 'a || b' },
  { type: 'OP_PLUS_ASSIGN', category: 'Operator', regexStr: '\\+=', description: 'Addition compound assignment', example: 'x += 1' },
  { type: 'OP_MINUS_ASSIGN', category: 'Operator', regexStr: '-=', description: 'Subtraction compound assignment', example: 'x -= 1' },
  { type: 'OP_MUL_ASSIGN', category: 'Operator', regexStr: '\\*=', description: 'Multiplication compound assignment', example: 'x *= 2' },
  { type: 'OP_DIV_ASSIGN', category: 'Operator', regexStr: '/=', description: 'Division compound assignment', example: 'x /= 2' },
  { type: 'DELIM_ARROW', category: 'Delimiter', regexStr: '->', description: 'Function return arrow or mapping', example: '-> int' },

  { type: 'OP_ASSIGN', category: 'Operator', regexStr: '=', description: 'Simple assignment operator', example: 'x = 5' },
  { type: 'OP_PLUS', category: 'Operator', regexStr: '\\+', description: 'Addition binary operator', example: 'a + b' },
  { type: 'OP_MINUS', category: 'Operator', regexStr: '-', description: 'Subtraction or unary negation', example: 'a - b' },
  { type: 'OP_MUL', category: 'Operator', regexStr: '\\*', description: 'Multiplication binary operator', example: 'a * b' },
  { type: 'OP_DIV', category: 'Operator', regexStr: '/', description: 'Division binary operator', example: 'a / b' },
  { type: 'OP_MOD', category: 'Operator', regexStr: '%', description: 'Modulo arithmetic operator', example: 'a % b' },
  { type: 'OP_LT', category: 'Operator', regexStr: '<', description: 'Strictly less than comparison', example: 'a < b' },
  { type: 'OP_GT', category: 'Operator', regexStr: '>', description: 'Strictly greater than comparison', example: 'a > b' },
  { type: 'OP_NOT', category: 'Operator', regexStr: '!', description: 'Logical negation unary operator', example: '!flag' },

  // Delimiters
  { type: 'DELIM_LPAREN', category: 'Delimiter', regexStr: '\\(', description: 'Left parenthesis', example: '(' },
  { type: 'DELIM_RPAREN', category: 'Delimiter', regexStr: '\\)', description: 'Right parenthesis', example: ')' },
  { type: 'DELIM_LBRACE', category: 'Delimiter', regexStr: '\\{', description: 'Left curly brace block start', example: '{' },
  { type: 'DELIM_RBRACE', category: 'Delimiter', regexStr: '\\}', description: 'Right curly brace block end', example: '}' },
  { type: 'DELIM_SEMICOLON', category: 'Delimiter', regexStr: ';', description: 'Statement terminator delimiter', example: ';' },
  { type: 'DELIM_COMMA', category: 'Delimiter', regexStr: ',', description: 'Parameter/argument separator delimiter', example: ',' },
  { type: 'DELIM_COLON', category: 'Delimiter', regexStr: ':', description: 'Type annotation delimiter', example: ':' },
];

export const KEYWORDS: Record<string, TokenType> = {
  var: 'KEYWORD_VAR',
  int: 'KEYWORD_INT',
  float: 'KEYWORD_FLOAT',
  bool: 'KEYWORD_BOOL',
  string: 'KEYWORD_STRING',
  void: 'KEYWORD_VOID',
  if: 'KEYWORD_IF',
  else: 'KEYWORD_ELSE',
  while: 'KEYWORD_WHILE',
  for: 'KEYWORD_FOR',
  func: 'KEYWORD_FUNC',
  return: 'KEYWORD_RETURN',
  print: 'KEYWORD_PRINT',
  true: 'KEYWORD_TRUE',
  false: 'KEYWORD_FALSE',
};
