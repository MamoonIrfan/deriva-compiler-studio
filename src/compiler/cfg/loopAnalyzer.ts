import { ControlFlowGraph, NaturalLoop } from '../../types';

export class LoopAnalyzer {
  public static analyze(
    cfg: ControlFlowGraph,
    domSets: Record<string, string[]> = {}
  ): NaturalLoop[] {
    const loops: NaturalLoop[] = [];
    const blocks = Array.isArray(cfg?.blocks) ? cfg.blocks : [];
    const edges = Array.isArray(cfg?.edges) ? cfg.edges : [];
    const safeDomSets = domSets || {};

    let loopCounter = 0;

    // Find all back edges: edge (u -> v) where v in Dom(u)
    for (const edge of edges) {
      if (!edge) continue;
      const u = edge.from;
      const v = edge.to;
      const domOfU = safeDomSets[u] || [];

      if (domOfU.includes(v)) {
        // v is a loop header, and (u -> v) is a back-edge
        const header = v;
        const loopBlocks = new Set<string>([header, u]);
        const stack: string[] = [];

        if (u !== header) {
          stack.push(u);
        }

        while (stack.length > 0) {
          const current = stack.pop()!;
          const currBlock = blocks.find((b) => b.id === current);
          if (!currBlock) continue;

          for (const pred of currBlock.predecessors) {
            if (!loopBlocks.has(pred)) {
              loopBlocks.add(pred);
              stack.push(pred);
            }
          }
        }

        // Find loop exits (blocks inside loop that have a successor outside loop)
        const exits = new Set<string>();
        for (const bId of loopBlocks) {
          const bObj = blocks.find((b) => b.id === bId);
          if (!bObj) continue;

          for (const succ of bObj.successors) {
            if (!loopBlocks.has(succ)) {
              exits.add(bId);
            }
          }
        }

        const loopId = `Loop_${loopCounter++}`;
        for (const bId of loopBlocks) {
          const bObj = blocks.find((b) => b.id === bId);
          if (bObj) {
            bObj.naturalLoopId = loopId;
          }
        }

        loops.push({
          id: loopId,
          header,
          backEdge: { from: u, to: v },
          blocks: Array.from(loopBlocks).sort(),
          exits: Array.from(exits).sort(),
          depth: 1,
        });
      }
    }

    // Compute nesting depths
    for (let i = 0; i < loops.length; i++) {
      for (let j = 0; j < loops.length; j++) {
        if (i !== j) {
          // If loop i is subset of loop j
          const isSubset = loops[i].blocks.every((b) => loops[j].blocks.includes(b));
          if (isSubset) {
            loops[i].depth = Math.max(loops[i].depth, loops[j].depth + 1);
          }
        }
      }
    }

    return loops;
  }
}
