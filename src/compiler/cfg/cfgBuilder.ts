import { BasicBlock, CFGEdge, ControlFlowGraph } from '../../types';

export class CFGBuilder {
  public static build(blocks: BasicBlock[]): ControlFlowGraph {
    const edges: CFGEdge[] = [];
    if (blocks.length === 0) {
      return { blocks: [], edges: [], entryBlockId: '', exitBlockId: '' };
    }

    const labelToBlockMap = new Map<string, string>();
    for (const b of blocks) {
      if (b && Array.isArray(b.instructions)) {
        for (const inst of b.instructions) {
          if (inst && inst.op === 'LABEL' && inst.result) {
            labelToBlockMap.set(inst.result, b.id);
          }
        }
      }
    }

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!block || !Array.isArray(block.instructions) || block.instructions.length === 0) continue;
      const lastInst = block.instructions[block.instructions.length - 1];

      if (!lastInst) continue;

      if (lastInst.op === 'GOTO') {
        const targetBlockId = labelToBlockMap.get(lastInst.result || '');
        if (targetBlockId) {
          CFGBuilder.addEdge(block, targetBlockId, blocks, edges, 'unconditional');
        }
      } else if (lastInst.op === 'IF_TRUE' || lastInst.op === 'IF_FALSE') {
        const jumpTargetBlockId = labelToBlockMap.get(lastInst.result || '');
        if (jumpTargetBlockId) {
          CFGBuilder.addEdge(
            block,
            jumpTargetBlockId,
            blocks,
            edges,
            lastInst.op === 'IF_TRUE' ? 'conditional_true' : 'conditional_false'
          );
        }
        // Fallthrough branch to next block
        if (i + 1 < blocks.length && blocks[i + 1]) {
          const fallthroughBlock = blocks[i + 1];
          CFGBuilder.addEdge(
            block,
            fallthroughBlock.id,
            blocks,
            edges,
            lastInst.op === 'IF_TRUE' ? 'conditional_false' : 'fallthrough'
          );
        }
      } else if (lastInst.op === 'RETURN') {
        // Function/Program exit block, no outgoing edges
      } else {
        // Normal fallthrough
        if (i + 1 < blocks.length && blocks[i + 1]) {
          const fallthroughBlock = blocks[i + 1];
          CFGBuilder.addEdge(block, fallthroughBlock.id, blocks, edges, 'fallthrough');
        }
      }
    }

    return {
      blocks,
      edges,
      entryBlockId: blocks[0]?.id || '',
      exitBlockId: blocks[blocks.length - 1]?.id || '',
    };
  }

  private static addEdge(
    fromBlock: BasicBlock,
    toBlockId: string,
    allBlocks: BasicBlock[],
    edges: CFGEdge[],
    type: CFGEdge['type']
  ) {
    const toBlock = allBlocks.find((b) => b && b.id === toBlockId);
    if (!toBlock || !fromBlock) return;

    if (!Array.isArray(fromBlock.successors)) fromBlock.successors = [];
    if (!Array.isArray(toBlock.predecessors)) toBlock.predecessors = [];

    if (!fromBlock.successors.includes(toBlockId)) {
      fromBlock.successors.push(toBlockId);
    }
    if (!toBlock.predecessors.includes(fromBlock.id)) {
      toBlock.predecessors.push(fromBlock.id);
    }

    // Check if back-edge (target index <= source index)
    let edgeType = type;
    if (toBlock.index <= fromBlock.index) {
      edgeType = 'backedge';
    }

    edges.push({
      from: fromBlock.id,
      to: toBlockId,
      type: edgeType,
    });
  }
}
