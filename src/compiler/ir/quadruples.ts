import { Quadruple, TACInstruction } from '../../types';

export class QuadrupleGenerator {
  public static fromTAC(tacList: TACInstruction[]): Quadruple[] {
    return tacList.map((inst, index) => {
      let op = String(inst.op);
      let arg1 = inst.arg1 ?? '';
      let arg2 = inst.arg2 ?? '';
      let result = inst.result ?? '';

      switch (inst.op) {
        case 'ASSIGN':
          op = '=';
          break;
        case 'ADD':
          op = '+';
          break;
        case 'SUB':
          op = '-';
          break;
        case 'MUL':
          op = '*';
          break;
        case 'DIV':
          op = '/';
          break;
        case 'MOD':
          op = '%';
          break;
        case 'NEG':
          op = 'uminus';
          break;
        case 'NOT':
          op = '!';
          break;
        case 'EQ':
          op = '==';
          break;
        case 'NEQ':
          op = '!=';
          break;
        case 'LT':
          op = '<';
          break;
        case 'LE':
          op = '<=';
          break;
        case 'GT':
          op = '>';
          break;
        case 'GE':
          op = '>=';
          break;
        case 'AND':
          op = '&&';
          break;
        case 'OR':
          op = '||';
          break;
        case 'IF_FALSE':
          op = 'if_false';
          break;
        case 'IF_TRUE':
          op = 'if_true';
          break;
        case 'GOTO':
          op = 'goto';
          break;
        case 'LABEL':
          op = 'label';
          break;
        case 'CALL':
          op = 'call';
          break;
        case 'RETURN':
          op = 'return';
          break;
        case 'PARAM':
          op = 'param';
          break;
        case 'PRINT':
          op = 'print';
          break;
      }

      return {
        index,
        op,
        arg1,
        arg2,
        result,
        tacId: inst.id,
      };
    });
  }
}
