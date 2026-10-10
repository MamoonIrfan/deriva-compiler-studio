import { BasicBlock, TACInstruction } from '../../types';

export class BasicBlockPartitioner {
  public static partition(instructions: TACInstruction[]): BasicBlock[] {
    if (!instructions || !Array.isArray(instructions) || instructions.length === 0) return [];

    // Step 1: Find all Leaders
    const isLeader = new Array<boolean>(instructions.length).fill(false);
    isLeader[0] = true; // Rule 1: First instruction is a leader

    for (let i = 0; i < instructions.length; i++) {
      const inst = instructions[i];

      // Rule 2: Any target of a conditional or unconditional jump is a leader
      if (['GOTO', 'IF_TRUE', 'IF_FALSE'].includes(inst.op)) {
        const targetLabel = inst.result;
        if (targetLabel) {
          const targetIndex = instructions.findIndex(
            (ins) => ins.op === 'LABEL' && ins.result === targetLabel
          );
          if (targetIndex !== -1) {
            isLeader[targetIndex] = true;
          }
        }

        // Rule 3: Any instruction immediately following a jump is a leader
        if (i + 1 < instructions.length) {
          isLeader[i + 1] = true;
        }
      }

      if (inst.op === 'FUNC_BEGIN' || inst.op === 'LABEL') {
        isLeader[i] = true;
      }
    }

    // Step 2: Partition into Basic Blocks
    const blocks: BasicBlock[] = [];
    let currentBlockInstructions: TACInstruction[] = [];
    let blockIndex = 0;

    for (let i = 0; i < instructions.length; i++) {
      if (isLeader[i] && currentBlockInstructions.length > 0) {
        const bId = `B${blockIndex}`;
        blocks.push({
          id: bId,
          index: blockIndex,
          label: currentBlockInstructions[0]?.op === 'LABEL' ? currentBlockInstructions[0].result : undefined,
          instructions: currentBlockInstructions,
          predecessors: [],
          successors: [],
        });
        blockIndex++;
        currentBlockInstructions = [];
      }
      currentBlockInstructions.push(instructions[i]);
    }

    if (currentBlockInstructions.length > 0) {
      const bId = `B${blockIndex}`;
      blocks.push({
        id: bId,
        index: blockIndex,
        label: currentBlockInstructions[0]?.op === 'LABEL' ? currentBlockInstructions[0].result : undefined,
        instructions: currentBlockInstructions,
        predecessors: [],
        successors: [],
      });
    }

    if (blocks.length > 0) {
      blocks[0].isEntry = true;
      blocks[blocks.length - 1].isExit = true;
    }

    return blocks;
  }
}
