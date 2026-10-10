import { ControlFlowGraph } from '../../types';

export class PostDominatorAnalyzer {
  public static compute(cfg: ControlFlowGraph): {
    pdomSets: Record<string, string[]>;
    ipdom: Record<string, string>;
    pdomTree: Record<string, string[]>;
  } {
    const blocks = Array.isArray(cfg?.blocks) ? cfg.blocks : [];
    if (blocks.length === 0) {
      return { pdomSets: {}, ipdom: {}, pdomTree: {} };
    }

    const allBlockIds = blocks.map((b) => b.id);
    const pdom: Map<string, Set<string>> = new Map();
    const exitId = cfg.exitBlockId || blocks[blocks.length - 1].id;

    // Initialization:
    // PDom(Exit) = { Exit }
    // PDom(n) = all nodes for n != Exit
    for (const b of blocks) {
      if (b.id === exitId) {
        pdom.set(b.id, new Set([b.id]));
      } else {
        pdom.set(b.id, new Set(allBlockIds));
      }
    }

    // Iterative backward fixed-point:
    // PDom(n) = { n } U (Intersection over all s in Succ(n) of PDom(s))
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 50) {
      changed = false;
      iterations++;

      for (let i = blocks.length - 1; i >= 0; i--) {
        const b = blocks[i];
        if (b.id === exitId) continue;

        const succs = b.successors;
        let intersection: Set<string>;

        if (succs.length === 0) {
          intersection = new Set();
        } else {
          intersection = new Set(pdom.get(succs[0]) || []);
          for (let s = 1; s < succs.length; s++) {
            const succPDom = pdom.get(succs[s]) || new Set();
            for (const item of Array.from(intersection)) {
              if (!succPDom.has(item)) {
                intersection.delete(item);
              }
            }
          }
        }

        intersection.add(b.id);

        const currentPDom = pdom.get(b.id)!;
        if (currentPDom.size !== intersection.size || Array.from(intersection).some((x) => !currentPDom.has(x))) {
          pdom.set(b.id, intersection);
          changed = true;
        }
      }
    }

    const ipdom: Record<string, string> = {};
    const pdomTree: Record<string, string[]> = {};

    for (const b of blocks) {
      pdomTree[b.id] = [];
    }

    for (const b of blocks) {
      if (b.id === exitId) continue;

      const strictPDoms = Array.from(pdom.get(b.id)!).filter((d) => d !== b.id);
      let immediatePostDom: string | null = null;

      for (const d of strictPDoms) {
        const isPostDominatedByOthers = strictPDoms.every((other) => {
          if (other === d) return true;
          return pdom.get(d)!.has(other);
        });

        if (isPostDominatedByOthers) {
          immediatePostDom = d;
          break;
        }
      }

      if (immediatePostDom) {
        ipdom[b.id] = immediatePostDom;
        pdomTree[immediatePostDom]?.push(b.id);
        b.immediatePostDominator = immediatePostDom;
      }
    }

    const pdomSets: Record<string, string[]> = {};
    for (const [k, v] of pdom.entries()) {
      pdomSets[k] = Array.from(v).sort();
      const block = blocks.find((b) => b.id === k);
      if (block) {
        block.postDominators = v;
      }
    }

    return {
      pdomSets,
      ipdom,
      pdomTree,
    };
  }
}
