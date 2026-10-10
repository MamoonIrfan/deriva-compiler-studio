import { CompilerDiagnostic, Token, TokenType } from '../../types';
import { KEYWORDS } from './tokens';

export class Lexer {
  private source: string;
  private length: number;
  private cursor: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private diagnostics: CompilerDiagnostic[] = [];
  private tokenIdCounter = 0;

  constructor(source: string) {
    this.source = source;
    this.length = source.length;
  }

  public tokenize(): { tokens: Token[]; diagnostics: CompilerDiagnostic[] } {
    this.cursor = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
    this.diagnostics = [];
    this.tokenIdCounter = 0;

    while (!this.isAtEnd()) {
      const startOffset = this.cursor;
      const startLine = this.line;
      const startCol = this.column;
      const char = this.advance();

      // Whitespace
      if (char === ' ' || char === '\t' || char === '\r') {
        continue;
      }

      if (char === '\n') {
        this.line++;
        this.column = 1;
        continue;
      }

      // Single-line or multi-line comment
      if (char === '/' && this.peek() === '/') {
        // Line comment
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }

      if (char === '/' && this.peek() === '*') {
        // Multi-line comment
        this.advance(); // consume '*'
        let closed = false;
        while (!this.isAtEnd()) {
          if (this.peek() === '\n') {
            this.line++;
            this.column = 1;
            this.advance();
          } else if (this.peek() === '*' && this.peekNext() === '/') {
            this.advance(); // consume '*'
            this.advance(); // consume '/'
            closed = true;
            break;
          } else {
            this.advance();
          }
        }
        if (!closed) {
          this.diagnostics.push({
            phase: 'Lexical',
            severity: 'error',
            message: 'Unterminated multi-line comment',
            location: { line: startLine, column: startCol, startOffset, endOffset: this.cursor },
            explanation: 'Multi-line comments started with /* must be closed with */',
            suggestion: 'Add */ to close the comment.',
          });
        }
        continue;
      }

      // String Literals
      if (char === '"') {
        this.scanString(startOffset, startLine, startCol);
        continue;
      }

      // Numbers (integers and floats)
      if (this.isDigit(char)) {
        this.scanNumber(char, startOffset, startLine, startCol);
        continue;
      }

      // Identifiers and Keywords
      if (this.isAlpha(char)) {
        this.scanIdentifier(char, startOffset, startLine, startCol);
        continue;
      }

      // Operators and Delimiters
      switch (char) {
        // Two-character possibilities
        case '=':
          if (this.match('=')) {
            this.addToken('OP_EQ', '==', '==', startLine, startCol, startOffset);
          } else {
            this.addToken('OP_ASSIGN', '=', '=', startLine, startCol, startOffset);
          }
          break;

        case '!':
          if (this.match('=')) {
            this.addToken('OP_NEQ', '!=', '!=', startLine, startCol, startOffset);
          } else {
            this.addToken('OP_NOT', '!', '!', startLine, startCol, startOffset);
          }
          break;

        case '<':
          if (this.match('=')) {
            this.addToken('OP_LE', '<=', '<=', startLine, startCol, startOffset);
          } else {
            this.addToken('OP_LT', '<', '<', startLine, startCol, startOffset);
          }
          break;

        case '>':
          if (this.match('=')) {
            this.addToken('OP_GE', '>=', '>=', startLine, startCol, startOffset);
          } else {
            this.addToken('OP_GT', '>', '>', startLine, startCol, startOffset);
          }
          break;

        case '&':
          if (this.match('&')) {
            this.addToken('OP_AND', '&&', '&&', startLine, startCol, startOffset);
          } else {
            this.diagnostics.push({
              phase: 'Lexical',
              severity: 'error',
              message: "Unexpected character '&'. Did you mean '&&'?",
              location: { line: startLine, column: startCol, startOffset, endOffset: this.cursor },
              suggestion: "Use '&&' for logical AND.",
            });
          }
          break;

        case '|':
          if (this.match('|')) {
            this.addToken('OP_OR', '||', '||', startLine, startCol, startOffset);
          } else {
            this.diagnostics.push({
              phase: 'Lexical',
              severity: 'error',
              message: "Unexpected character '|'. Did you mean '||'?",
              location: { line: startLine, column: startCol, startOffset, endOffset: this.cursor },
              suggestion: "Use '||' for logical OR.",
            });
          }
          break;

        case '+':
          if (this.match('=')) {
            this.addToken('OP_PLUS_ASSIGN', '+=', '+=', startLine, startCol, startOffset);
          } else {
            this.addToken('OP_PLUS', '+', '+', startLine, startCol, startOffset);
          }
          break;

        case '-':
          if (this.match('>')) {
            this.addToken('DELIM_ARROW', '->', '->', startLine, startCol, startOffset);
          } else if (this.match('=')) {
            this.addToken('OP_MINUS_ASSIGN', '-=', '-=', startLine, startCol, startOffset);
          } else {
            this.addToken('OP_MINUS', '-', '-', startLine, startCol, startOffset);
          }
          break;

        case '*':
          if (this.match('=')) {
            this.addToken('OP_MUL_ASSIGN', '*=', '*=', startLine, startCol, startOffset);
          } else {
            this.addToken('OP_MUL', '*', '*', startLine, startCol, startOffset);
          }
          break;

        case '/':
          if (this.match('=')) {
            this.addToken('OP_DIV_ASSIGN', '/=', '/=', startLine, startCol, startOffset);
          } else {
            this.addToken('OP_DIV', '/', '/', startLine, startCol, startOffset);
          }
          break;

        case '%':
          this.addToken('OP_MOD', '%', '%', startLine, startCol, startOffset);
          break;

        // Delimiters
        case '(':
          this.addToken('DELIM_LPAREN', '(', '(', startLine, startCol, startOffset);
          break;
        case ')':
          this.addToken('DELIM_RPAREN', ')', ')', startLine, startCol, startOffset);
          break;
        case '{':
          this.addToken('DELIM_LBRACE', '{', '{', startLine, startCol, startOffset);
          break;
        case '}':
          this.addToken('DELIM_RBRACE', '}', '}', startLine, startCol, startOffset);
          break;
        case '[':
          this.addToken('DELIM_LBRACKET', '[', '[', startLine, startCol, startOffset);
          break;
        case ']':
          this.addToken('DELIM_RBRACKET', ']', ']', startLine, startCol, startOffset);
          break;
        case ';':
          this.addToken('DELIM_SEMICOLON', ';', ';', startLine, startCol, startOffset);
          break;
        case ',':
          this.addToken('DELIM_COMMA', ',', ',', startLine, startCol, startOffset);
          break;
        case ':':
          this.addToken('DELIM_COLON', ':', ':', startLine, startCol, startOffset);
          break;

        default:
          this.diagnostics.push({
            phase: 'Lexical',
            severity: 'error',
            message: `Unrecognized character '${char}'`,
            location: { line: startLine, column: startCol, startOffset, endOffset: this.cursor },
            explanation: `The character '${char}' (code ${char.charCodeAt(0)}) is not a valid token in Deriva.`,
            suggestion: 'Remove or replace this character.',
          });
          this.addToken('UNKNOWN', char, char, startLine, startCol, startOffset);
          break;
      }
    }

    // Append EOF token
    this.tokens.push({
      id: this.tokenIdCounter++,
      type: 'EOF',
      lexeme: '',
      value: null,
      line: this.line,
      column: this.column,
      startOffset: this.cursor,
      endOffset: this.cursor,
    });

    return { tokens: this.tokens, diagnostics: this.diagnostics };
  }

  private scanString(startOffset: number, startLine: number, startCol: number) {
    let result = '';
    let isTerminated = false;

    while (!this.isAtEnd()) {
      const char = this.advance();
      if (char === '"') {
        isTerminated = true;
        break;
      }

      if (char === '\n') {
        this.line++;
        this.column = 1;
        result += '\n';
        continue;
      }

      if (char === '\\') {
        if (this.isAtEnd()) break;
        const esc = this.advance();
        switch (esc) {
          case 'n':
            result += '\n';
            break;
          case 't':
            result += '\t';
            break;
          case 'r':
            result += '\r';
            break;
          case '"':
            result += '"';
            break;
          case '\\':
            result += '\\';
            break;
          default:
            result += esc;
        }
      } else {
        result += char;
      }
    }

    const raw = this.source.substring(startOffset, this.cursor);
    if (!isTerminated) {
      this.diagnostics.push({
        phase: 'Lexical',
        severity: 'error',
        message: 'Unterminated string literal',
        location: { line: startLine, column: startCol, startOffset, endOffset: this.cursor },
        suggestion: 'Add closing double quote (") before end of line or file.',
      });
    }

    this.addToken('LITERAL_STRING', raw, result, startLine, startCol, startOffset);
  }

  private scanNumber(firstChar: string, startOffset: number, startLine: number, startCol: number) {
    let isFloat = false;

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      this.advance();
    }

    // Check for fractional part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      isFloat = true;
      this.advance(); // consume '.'
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const raw = this.source.substring(startOffset, this.cursor);
    const value = isFloat ? parseFloat(raw) : parseInt(raw, 10);
    this.addToken(isFloat ? 'LITERAL_FLOAT' : 'LITERAL_INT', raw, value, startLine, startCol, startOffset);
  }

  private scanIdentifier(firstChar: string, startOffset: number, startLine: number, startCol: number) {
    while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_')) {
      this.advance();
    }

    const lexeme = this.source.substring(startOffset, this.cursor);
    const keywordType = KEYWORDS[lexeme];

    if (keywordType) {
      let value: any = lexeme;
      if (keywordType === 'KEYWORD_TRUE') value = true;
      if (keywordType === 'KEYWORD_FALSE') value = false;
      this.addToken(keywordType, lexeme, value, startLine, startCol, startOffset);
    } else {
      this.addToken('IDENTIFIER', lexeme, lexeme, startLine, startCol, startOffset);
    }
  }

  private addToken(
    type: TokenType,
    lexeme: string,
    value: any,
    line: number,
    column: number,
    startOffset: number
  ) {
    this.tokens.push({
      id: this.tokenIdCounter++,
      type,
      lexeme,
      value,
      line,
      column,
      startOffset,
      endOffset: this.cursor,
    });
  }

  private advance(): string {
    const char = this.source[this.cursor++];
    this.column++;
    return char;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd() || this.source[this.cursor] !== expected) {
      return false;
    }
    this.cursor++;
    this.column++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.cursor];
  }

  private peekNext(): string {
    if (this.cursor + 1 >= this.length) return '\0';
    return this.source[this.cursor + 1];
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private isAtEnd(): boolean {
    return this.cursor >= this.length;
  }
}
