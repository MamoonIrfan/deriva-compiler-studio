import { TACInstruction, Triple } from '../../types';

export class TripleGenerator {
  public static fromTAC(tacList: TACInstruction[]): Triple[] {
    const tempToTripleIndex = new Map<string, number>();
    const triples: Triple[] = [];

    for (let i = 0; i < tacList.length; i++) {
      const inst = tacList[i];
      let op = String(inst.op);
      let arg1 = inst.arg1 ?? '';
      let arg2 = inst.arg2 ?? '';

      // Replace temp names with previous triple index reference if applicable
      if (arg1 && tempToTripleIndex.has(arg1)) {
        arg1 = `(${tempToTripleIndex.get(arg1)})`;
      }
      if (arg2 && tempToTripleIndex.has(arg2)) {
        arg2 = `(${tempToTripleIndex.get(arg2)})`;
      }

      switch (inst.op) {
        case 'ASSIGN':
          op = '=';
          // In assignment: arg1 is target, arg2 is value
          const valRef = tempToTripleIndex.has(inst.arg1 ?? '')
            ? `(${tempToTripleIndex.get(inst.arg1!)})`
            : (inst.arg1 ?? '');
          arg1 = inst.result ?? '';
          arg2 = valRef;
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
          arg2 = inst.result ?? '';
          break;
        case 'IF_TRUE':
          op = 'if_true';
          arg2 = inst.result ?? '';
          break;
        case 'GOTO':
          op = 'goto';
          arg1 = inst.result ?? '';
          break;
        case 'LABEL':
          op = 'label';
          arg1 = inst.result ?? '';
          break;
        case 'CALL':
          op = 'call';
          arg1 = inst.arg1 ?? '';
          arg2 = inst.arg2 ?? '';
          break;
        case 'PRINT':
          op = 'print';
          break;
        case 'RETURN':
          op = 'return';
          break;
      }

      const tripleIndex = triples.length;
      if (inst.result && inst.result.startsWith('t')) {
        tempToTripleIndex.set(inst.result, tripleIndex);
      }

      triples.push({
        index: tripleIndex,
        op,
        arg1,
        arg2,
        tacId: inst.id,
      });
    }

    return triples;
  }
}
