import { DAGNode, TACInstruction } from '../../types';

export class DAGBuilder {
  private nodes: Map<string, DAGNode> = new Map();
  private varToNodeId: Map<string, string> = new Map();
  private nodeCounter = 0;

  public buildFromTAC(instructions: TACInstruction[]): DAGNode[] {
    this.nodes.clear();
    this.varToNodeId.clear();
    this.nodeCounter = 0;

    for (const inst of instructions) {
      if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'EQ', 'NEQ', 'LT', 'LE', 'GT', 'GE', 'AND', 'OR'].includes(inst.op)) {
        const leftId = this.getOrCreateLeaf(inst.arg1 || '');
        const rightId = this.getOrCreateLeaf(inst.arg2 || '');

        const opSymbol = this.opToSymbol(inst.op);
        const opKey = `${opSymbol}(${leftId},${rightId})`;

        let opNodeId = this.findMatchingNode(opSymbol, leftId, rightId);

        if (!opNodeId) {
          opNodeId = `dag_node_${this.nodeCounter++}`;
          const newNode: DAGNode = {
            id: opNodeId,
            label: opSymbol,
            isLeaf: false,
            variables: inst.result ? [inst.result] : [],
            left: leftId,
            right: rightId,
            children: [leftId, rightId],
          };
          this.nodes.set(opNodeId, newNode);
        } else {
          // Common subexpression found! Attach variable name to existing DAG node
          const existingNode = this.nodes.get(opNodeId)!;
          if (inst.result && !existingNode.variables.includes(inst.result)) {
            existingNode.variables.push(inst.result);
          }
        }

        if (inst.result) {
          this.varToNodeId.set(inst.result, opNodeId);
        }
      } else if (inst.op === 'ASSIGN') {
        const src = inst.arg1 || '';
        const dest = inst.result || '';

        const srcNodeId = this.getOrCreateLeaf(src);
        const srcNode = this.nodes.get(srcNodeId);
        if (srcNode && dest && !srcNode.variables.includes(dest)) {
          srcNode.variables.push(dest);
        }
        if (dest) {
          this.varToNodeId.set(dest, srcNodeId);
        }
      }
    }

    return Array.from(this.nodes.values());
  }

  private getOrCreateLeaf(valueOrVar: string): string {
    if (!valueOrVar) {
      const dummyId = `dag_leaf_${this.nodeCounter++}`;
      this.nodes.set(dummyId, { id: dummyId, label: '?', isLeaf: true, variables: [], children: [] });
      return dummyId;
    }

    // If it is a known variable pointing to a node, return that node
    if (this.varToNodeId.has(valueOrVar)) {
      return this.varToNodeId.get(valueOrVar)!;
    }

    // Check if leaf already exists for literal/identifier
    for (const [id, node] of this.nodes.entries()) {
      if (node.isLeaf && node.label === valueOrVar) {
        return id;
      }
    }

    const leafId = `dag_leaf_${this.nodeCounter++}`;
    const leafNode: DAGNode = {
      id: leafId,
      label: valueOrVar,
      isLeaf: true,
      variables: [valueOrVar],
      children: [],
    };
    this.nodes.set(leafId, leafNode);
    this.varToNodeId.set(valueOrVar, leafId);
    return leafId;
  }

  private findMatchingNode(op: string, leftId: string, rightId: string): string | null {
    for (const [id, node] of this.nodes.entries()) {
      if (!node.isLeaf && node.label === op && node.left === leftId && node.right === rightId) {
        return id;
      }
    }
    return null;
  }

  private opToSymbol(op: string): string {
    switch (op) {
      case 'ADD':
        return '+';
      case 'SUB':
        return '-';
      case 'MUL':
        return '*';
      case 'DIV':
        return '/';
      case 'MOD':
        return '%';
      case 'EQ':
        return '==';
      case 'NEQ':
        return '!=';
      case 'LT':
        return '<';
      case 'LE':
        return '<=';
      case 'GT':
        return '>';
      case 'GE':
        return '>=';
      case 'AND':
        return '&&';
      case 'OR':
        return '||';
      default:
        return op;
    }
  }
}
