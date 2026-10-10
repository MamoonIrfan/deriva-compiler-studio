import { Grammar, GrammarProduction, LRParsingTable, ShiftReduceStep, Token } from '../../types';

export class ShiftReduceSimulator {
  private table: LRParsingTable;
  private grammar: Grammar;

  constructor(table: LRParsingTable, grammar: Grammar) {
    this.table = table;
    this.grammar = grammar;
  }

  public simulate(tokens: Token[]): {
    steps: ShiftReduceStep[];
    success: boolean;
    error?: string;
  } {
    const steps: ShiftReduceStep[] = [];
    const stateStack: number[] = [0];
    const symbolStack: string[] = ['$'];

    // Ensure tokens end with $ (EOF)
    const inputTokens: Token[] = [...tokens];
    const last = inputTokens[inputTokens.length - 1];
    if (!last || last.type !== 'EOF') {
      inputTokens.push({
        id: -1,
        type: 'EOF',
        lexeme: '$',
        value: '$',
        line: last ? last.line : 1,
        column: last ? last.column + 1 : 1,
        startOffset: 0,
        endOffset: 0,
      });
    }

    let inputIndex = 0;
    let stepCount = 1;

    while (true) {
      const currentState = stateStack[stateStack.length - 1];
      const currentToken = inputTokens[inputIndex];
      const currentSymbol = this.tokenToGrammarSymbol(currentToken);

      const possibleActions = this.table.actionTable[currentState]?.[currentSymbol] || [];

      if (possibleActions.length === 0) {
        const errorStep: ShiftReduceStep = {
          step: stepCount++,
          stateStack: [...stateStack],
          symbolStack: [...symbolStack],
          inputTokens,
          currentInputIndex: inputIndex,
          actionTaken: `ERROR: No action in state ${currentState} for symbol '${currentSymbol}'`,
          status: 'error',
        };
        steps.push(errorStep);
        return { steps, success: false, error: errorStep.actionTaken };
      }

      // Pick the primary action (first if multiple)
      const action = possibleActions[0];

      if (action.type === 'shift') {
        const targetState = action.stateOrRuleId!;
        const shiftStep: ShiftReduceStep = {
          step: stepCount++,
          stateStack: [...stateStack],
          symbolStack: [...symbolStack],
          inputTokens,
          currentInputIndex: inputIndex,
          actionTaken: `SHIFT '${currentSymbol}' and push state ${targetState}`,
          status: 'shift',
        };
        steps.push(shiftStep);

        symbolStack.push(currentSymbol);
        stateStack.push(targetState);
        inputIndex++;
      } else if (action.type === 'reduce') {
        const ruleId = action.stateOrRuleId!;
        const prod = this.grammar.productions.find((p) => p.id === ruleId);
        if (!prod) {
          const errorStep: ShiftReduceStep = {
            step: stepCount++,
            stateStack: [...stateStack],
            symbolStack: [...symbolStack],
            inputTokens,
            currentInputIndex: inputIndex,
            actionTaken: `ERROR: Production id ${ruleId} not found`,
            status: 'error',
          };
          steps.push(errorStep);
          return { steps, success: false, error: errorStep.actionTaken };
        }

        const reduceStep: ShiftReduceStep = {
          step: stepCount++,
          stateStack: [...stateStack],
          symbolStack: [...symbolStack],
          inputTokens,
          currentInputIndex: inputIndex,
          actionTaken: `REDUCE by rule (${prod.id}) ${prod.lhs} -> ${prod.rhs.join(' ')}`,
          productionUsed: prod,
          status: 'reduce',
        };
        steps.push(reduceStep);

        // Pop |RHS| elements from stack (if not epsilon)
        const rhsLength = prod.rhs[0] === 'ε' ? 0 : prod.rhs.length;
        for (let i = 0; i < rhsLength; i++) {
          symbolStack.pop();
          stateStack.pop();
        }

        // Push LHS
        symbolStack.push(prod.lhs);

        // Lookup GOTO[top_state, LHS]
        const topState = stateStack[stateStack.length - 1];
        const nextState = this.table.gotoTable[topState]?.[prod.lhs];
        if (nextState === undefined) {
          const errorStep: ShiftReduceStep = {
            step: stepCount++,
            stateStack: [...stateStack],
            symbolStack: [...symbolStack],
            inputTokens,
            currentInputIndex: inputIndex,
            actionTaken: `ERROR: GOTO[${topState}, ${prod.lhs}] is undefined`,
            status: 'error',
          };
          steps.push(errorStep);
          return { steps, success: false, error: errorStep.actionTaken };
        }

        stateStack.push(nextState);
      } else if (action.type === 'accept') {
        const acceptStep: ShiftReduceStep = {
          step: stepCount++,
          stateStack: [...stateStack],
          symbolStack: [...symbolStack],
          inputTokens,
          currentInputIndex: inputIndex,
          actionTaken: 'ACCEPT: Input successfully parsed by Shift/Reduce Engine',
          status: 'accept',
        };
        steps.push(acceptStep);
        return { steps, success: true };
      } else {
        const errorStep: ShiftReduceStep = {
          step: stepCount++,
          stateStack: [...stateStack],
          symbolStack: [...symbolStack],
          inputTokens,
          currentInputIndex: inputIndex,
          actionTaken: 'ERROR: Unknown action type',
          status: 'error',
        };
        steps.push(errorStep);
        return { steps, success: false, error: errorStep.actionTaken };
      }

      if (stepCount > 250) {
        steps.push({
          step: stepCount,
          stateStack: [...stateStack],
          symbolStack: [...symbolStack],
          inputTokens,
          currentInputIndex: inputIndex,
          actionTaken: 'ERROR: Parser loop limit exceeded',
          status: 'error',
        });
        return { steps, success: false, error: 'Parser step limit reached' };
      }
    }
  }

  private tokenToGrammarSymbol(token: Token): string {
    if (!token || token.type === 'EOF') return '$';

    switch (token.type) {
      case 'IDENTIFIER':
        return 'id';
      case 'LITERAL_INT':
        return 'num';
      case 'LITERAL_FLOAT':
        return 'float_num';
      case 'LITERAL_STRING':
        return 'str';
      case 'KEYWORD_TRUE':
        return 'true';
      case 'KEYWORD_FALSE':
        return 'false';
      case 'OP_PLUS':
        return '+';
      case 'OP_MINUS':
        return '-';
      case 'OP_MUL':
        return '*';
      case 'OP_DIV':
        return '/';
      case 'OP_MOD':
        return '%';
      case 'OP_ASSIGN':
        return '=';
      case 'OP_PLUS_ASSIGN':
        return '+=';
      case 'OP_MINUS_ASSIGN':
        return '-=';
      case 'OP_MUL_ASSIGN':
        return '*=';
      case 'OP_DIV_ASSIGN':
        return '/=';
      case 'OP_EQ':
        return '==';
      case 'OP_NEQ':
        return '!=';
      case 'OP_LT':
        return '<';
      case 'OP_LE':
        return '<=';
      case 'OP_GT':
        return '>';
      case 'OP_GE':
        return '>=';
      case 'OP_AND':
        return '&&';
      case 'OP_OR':
        return '||';
      case 'OP_NOT':
        return '!';
      case 'DELIM_LPAREN':
        return '(';
      case 'DELIM_RPAREN':
        return ')';
      case 'DELIM_LBRACE':
        return '{';
      case 'DELIM_RBRACE':
        return '}';
      case 'DELIM_SEMICOLON':
        return ';';
      case 'DELIM_COMMA':
        return ',';
      case 'DELIM_COLON':
        return ':';
      case 'DELIM_ARROW':
        return '->';
      case 'KEYWORD_VAR':
        return 'var';
      case 'KEYWORD_INT':
        return 'int';
      case 'KEYWORD_FLOAT':
        return 'float';
      case 'KEYWORD_BOOL':
        return 'bool';
      case 'KEYWORD_STRING':
        return 'string';
      case 'KEYWORD_VOID':
        return 'void';
      case 'KEYWORD_IF':
        return 'if';
      case 'KEYWORD_ELSE':
        return 'else';
      case 'KEYWORD_WHILE':
        return 'while';
      case 'KEYWORD_FOR':
        return 'for';
      case 'KEYWORD_FUNC':
        return 'func';
      case 'KEYWORD_RETURN':
        return 'return';
      case 'KEYWORD_PRINT':
        return 'print';
      default:
        return token.lexeme || '$';
    }
  }
}
