import { ParseTreeNode } from '../../types';

export interface SDDRule {
  production: string;
  synthesized: { attribute: string; rule: string }[];
  inherited: { attribute: string; targetChild: string; rule: string }[];
}

export interface AttributeNode {
  id: string;
  nodeId: string;
  symbol: string;
  attributeName: string;
  attributeType: 'synthesized' | 'inherited';
  value: any;
  dependencies: string[]; // ids of attribute nodes this depends on
}

export interface DependencyGraph {
  nodes: AttributeNode[];
  edges: { from: string; to: string }[];
  evaluationOrder: string[];
  hasCycle: boolean;
}

export const DERIVA_SDD_RULES: SDDRule[] = [
  {
    production: 'E -> E1 + T',
    synthesized: [
      { attribute: 'val', rule: 'E.val = E1.val + T.val' },
      { attribute: 'type', rule: 'E.type = (E1.type == float || T.type == float) ? float : int' },
    ],
    inherited: [],
  },
  {
    production: 'E -> E1 - T',
    synthesized: [
      { attribute: 'val', rule: 'E.val = E1.val - T.val' },
      { attribute: 'type', rule: 'E.type = (E1.type == float || T.type == float) ? float : int' },
    ],
    inherited: [],
  },
  {
    production: 'E -> T',
    synthesized: [
      { attribute: 'val', rule: 'E.val = T.val' },
      { attribute: 'type', rule: 'E.type = T.type' },
    ],
    inherited: [],
  },
  {
    production: 'T -> T1 * F',
    synthesized: [
      { attribute: 'val', rule: 'T.val = T1.val * F.val' },
      { attribute: 'type', rule: 'T.type = (T1.type == float || F.type == float) ? float : int' },
    ],
    inherited: [],
  },
  {
    production: 'T -> F',
    synthesized: [
      { attribute: 'val', rule: 'T.val = F.val' },
      { attribute: 'type', rule: 'T.type = F.type' },
    ],
    inherited: [],
  },
  {
    production: 'F -> num',
    synthesized: [
      { attribute: 'val', rule: 'F.val = num.lexval' },
      { attribute: 'type', rule: 'F.type = int' },
    ],
    inherited: [],
  },
  {
    production: 'F -> id',
    synthesized: [
      { attribute: 'val', rule: 'F.val = lookup(id.entry).val' },
      { attribute: 'type', rule: 'F.type = lookup(id.entry).type' },
    ],
    inherited: [],
  },
  {
    production: 'VarDecl -> var id : Type',
    synthesized: [
      { attribute: 'entry', rule: 'symTab.insert(id.name, Type.type)' },
    ],
    inherited: [
      { attribute: 'scope', targetChild: 'Type', rule: 'Type.scope = VarDecl.scope' },
    ],
  },
];

export class SDDManager {
  /**
   * Decorates a parse tree with synthesized and inherited attributes
   */
  public static decorateParseTree(root: ParseTreeNode): {
    decoratedTree: ParseTreeNode;
    dependencyGraph: DependencyGraph;
  } {
    const clonedRoot = JSON.parse(JSON.stringify(root)) as ParseTreeNode;
    const attrNodes: AttributeNode[] = [];
    const edges: { from: string; to: string }[] = [];

    // Helper traversal to compute basic synthesized attributes
    this.computeAttributes(clonedRoot, 'global', attrNodes, edges);

    // Compute topological evaluation order
    const { order, hasCycle } = this.topologicalSort(attrNodes, edges);

    return {
      decoratedTree: clonedRoot,
      dependencyGraph: {
        nodes: attrNodes,
        edges,
        evaluationOrder: order,
        hasCycle,
      },
    };
  }

  private static computeAttributes(
    node: ParseTreeNode,
    currentScope: string,
    attrNodes: AttributeNode[],
    edges: { from: string; to: string }[]
  ): Record<string, any> {
    node.attributes = node.attributes || {};

    // Inherited attribute: Scope
    node.attributes['scope'] = currentScope;
    const scopeAttrId = `attr_${node.id}_scope`;
    attrNodes.push({
      id: scopeAttrId,
      nodeId: node.id,
      symbol: node.symbol,
      attributeName: 'scope',
      attributeType: 'inherited',
      value: currentScope,
      dependencies: [],
    });

    if (node.isTerminal) {
      if (node.token) {
        node.attributes['lexval'] = node.token.value ?? node.token.lexeme;
        node.attributes['line'] = node.token.line;
        node.attributes['column'] = node.token.column;

        const valAttrId = `attr_${node.id}_val`;
        attrNodes.push({
          id: valAttrId,
          nodeId: node.id,
          symbol: node.symbol,
          attributeName: 'val',
          attributeType: 'synthesized',
          value: node.attributes['lexval'],
          dependencies: [],
        });
      }
      return node.attributes;
    }

    // Process children
    const childAttributes: Record<string, any>[] = [];
    for (const child of node.children) {
      const nextScope = node.symbol === 'FuncDecl' ? `func_${child.symbol}` : currentScope;
      childAttributes.push(this.computeAttributes(child, nextScope, attrNodes, edges));
    }

    // Compute Synthesized Attributes for current non-terminal
    let val: any = undefined;
    let type: string = 'void';

    if (node.symbol === 'AdditiveExpr' || node.symbol === 'MultiplicativeExpr') {
      const leftVal = childAttributes[0]?.['val'];
      const rightVal = childAttributes[2]?.['val'];
      const op = node.children[1]?.symbol;

      if (leftVal !== undefined && rightVal !== undefined && typeof leftVal === 'number' && typeof rightVal === 'number') {
        if (op === '+') val = leftVal + rightVal;
        if (op === '-') val = leftVal - rightVal;
        if (op === '*') val = leftVal * rightVal;
        if (op === '/') val = rightVal !== 0 ? leftVal / rightVal : 'div_zero';
        if (op === '%') val = rightVal !== 0 ? leftVal % rightVal : 'div_zero';
      } else {
        val = leftVal;
      }
      type = (childAttributes[0]?.['type'] === 'float' || childAttributes[2]?.['type'] === 'float') ? 'float' : 'int';
    } else if (node.symbol === 'PrimaryExpr' || node.symbol === 'UnaryExpr') {
      val = childAttributes[0]?.['val'];
      type = childAttributes[0]?.['type'] || 'int';
    } else if (childAttributes.length > 0) {
      val = childAttributes[0]?.['val'];
      type = childAttributes[0]?.['type'] || 'void';
    }

    node.attributes['val'] = val;
    node.attributes['type'] = type;

    const synAttrId = `attr_${node.id}_val`;
    const depIds: string[] = [];

    for (const child of node.children) {
      const childAttrId = `attr_${child.id}_val`;
      if (attrNodes.some((n) => n.id === childAttrId)) {
        depIds.push(childAttrId);
        edges.push({ from: childAttrId, to: synAttrId });
      }
    }

    attrNodes.push({
      id: synAttrId,
      nodeId: node.id,
      symbol: node.symbol,
      attributeName: 'val',
      attributeType: 'synthesized',
      value: val,
      dependencies: depIds,
    });

    return node.attributes;
  }

  private static topologicalSort(
    nodes: AttributeNode[],
    edges: { from: string; to: string }[]
  ): { order: string[]; hasCycle: boolean } {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const n of nodes) {
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
    }

    for (const e of edges) {
      if (adj.has(e.from)) {
        adj.get(e.from)!.push(e.to);
      }
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      order.push(curr);

      for (const neighbor of adj.get(curr) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    const hasCycle = order.length < nodes.length;
    return { order, hasCycle };
  }
}

export const NOVALANG_SDD_RULES = DERIVA_SDD_RULES;
