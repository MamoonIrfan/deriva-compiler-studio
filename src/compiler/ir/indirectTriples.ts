import { IndirectTriple, TACInstruction } from '../../types';
import { TripleGenerator } from './triples';

export class IndirectTripleGenerator {
  public static fromTAC(tacList: TACInstruction[]): IndirectTriple[] {
    const triples = TripleGenerator.fromTAC(tacList);
    // In indirect triples, pointer array indexes the execution order of triples
    return triples.map((triple, index) => ({
      index,
      pointer: triple.index,
      triple,
    }));
  }
}
