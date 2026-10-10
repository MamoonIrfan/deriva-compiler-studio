import { ControlFlowGraph } from '../../types';

export class DominatorAnalyzer {
  public static compute(cfg: ControlFlowGraph): {
    domSets: Record<string, string[]>;
    idom: Record<string, string>;
    dominatorTree: Record<string, string[]>;
  } {
    const blocks = Array.isArray(cfg?.blocks) ? cfg.blocks : [];
    if (blocks.length === 0) {
      return { domSets: {}, idom: {}, dominatorTree: {} };
    }

    const allBlockIds = blocks.map((b) => b.id);
    const dom: Map<string, Set<string>> = new Map();
    const entryId = cfg.entryBlockId || blocks[0].id;

    // Initialization:
    // Dom(Entry) = { Entry }
    // Dom(n) = all nodes for n != Entry
    for (const b of blocks) {
      if (b.id === entryId) {
        dom.set(b.id, new Set([b.id]));
      } else {
        dom.set(b.id, new Set(allBlockIds));
      }
    }

    // Iterative Fixed-point:
    // Dom(n) = { n } U (Intersection over all p in Pred(n) of Dom(p))
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 50) {
      changed = false;
      iterations++;

      for (const b of blocks) {
        if (b.id === entryId) continue;

        const preds = b.predecessors;
        let intersection: Set<string>;

        if (preds.length === 0) {
          intersection = new Set();
        } else {
          intersection = new Set(dom.get(preds[0]) || []);
          for (let i = 1; i < preds.length; i++) {
            const predDom = dom.get(preds[i]) || new Set();
            for (const item of Array.from(intersection)) {
              if (!predDom.has(item)) {
                intersection.delete(item);
              }
            }
          }
        }

        intersection.add(b.id);

        const currentDom = dom.get(b.id)!;
        if (currentDom.size !== intersection.size || Array.from(intersection).some((x) => !currentDom.has(x))) {
          dom.set(b.id, intersection);
          changed = true;
        }
      }
    }

    // Compute Immediate Dominators (idom)
    // d is idom(n) if d in Dom(n) - {n} and d does not strictly dominate any other strictly dominating node of n
    const idom: Record<string, string> = {};
    const domTree: Record<string, string[]> = {};

    for (const b of blocks) {
      domTree[b.id] = [];
    }

    for (const b of blocks) {
      if (b.id === entryId) continue;

      const strictDoms = Array.from(dom.get(b.id)!).filter((d) => d !== b.id);
      let immediateDom: string | null = null;

      for (const d of strictDoms) {
        // Check if d is dominated by all other strict dominators of b
        const isDominatedByOthers = strictDoms.every((other) => {
          if (other === d) return true;
          return dom.get(d)!.has(other);
        });

        if (isDominatedByOthers) {
          immediateDom = d;
          break;
        }
      }

      if (immediateDom) {
        idom[b.id] = immediateDom;
        domTree[immediateDom]?.push(b.id);
        b.immediateDominator = immediateDom;
      }
    }

    const domSets: Record<string, string[]> = {};
    for (const [k, v] of dom.entries()) {
      domSets[k] = Array.from(v).sort();
      const block = blocks.find((b) => b.id === k);
      if (block) {
        block.dominators = v;
      }
    }

    return {
      domSets,
      idom,
      dominatorTree: domTree,
    };
  }
}
