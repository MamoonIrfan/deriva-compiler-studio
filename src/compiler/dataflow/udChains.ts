import { ControlFlowGraph, DefUseChain, UseDefChain } from '../../types';

export class UDChainsBuilder {
  public static build(
    cfg: ControlFlowGraph,
    reachingDefsIn: Record<string, string[]>
  ): { useDefChains: UseDefChain[]; defUseChains: DefUseChain[] } {
    const useDefChains: UseDefChain[] = [];
    const defUseMap = new Map<number, { variable: string; defTacId: number; defBlockId: string; useTacIds: Set<number> }>();

    // Map each defId (e.g., 'd4') to its TAC instruction ID
    const defIdToTacId = (defId: string) => parseInt(defId.replace('d', ''), 10);

    for (const block of cfg.blocks) {
      // Local reaching definitions tracked through the block
      const currentDefs = new Map<string, number[]>(); // varName -> tacIds

      // Initialize with IN[block]
      for (const defStr of reachingDefsIn[block.id] || []) {
        const tacId = defIdToTacId(defStr);
        // Find which variable this def corresponds to
        for (const b of cfg.blocks) {
          const inst = b.instructions.find((i) => i.id === tacId);
          if (inst && inst.result) {
            if (!currentDefs.has(inst.result)) {
              currentDefs.set(inst.result, []);
            }
            currentDefs.get(inst.result)!.push(tacId);
          }
        }
      }

      for (const inst of block.instructions) {
        // 1. Check Uses
        const usedVars = [inst.arg1, inst.arg2].filter(
          (v): v is string => !!v && !/^[0-9]/.test(v) && !v.startsWith('"') && v !== 'true' && v !== 'false'
        );

        for (const uv of usedVars) {
          const defs = currentDefs.get(uv) || [];
          useDefChains.push({
            variable: uv,
            useTacId: inst.id,
            useBlockId: block.id,
            defTacIds: [...defs],
          });

          for (const dId of defs) {
            if (!defUseMap.has(dId)) {
              defUseMap.set(dId, {
                variable: uv,
                defTacId: dId,
                defBlockId: block.id,
                useTacIds: new Set(),
              });
            }
            defUseMap.get(dId)!.useTacIds.add(inst.id);
          }
        }

        // 2. Check Defs
        if (inst.result && !['LABEL', 'GOTO', 'IF_FALSE', 'IF_TRUE'].includes(inst.op)) {
          currentDefs.set(inst.result, [inst.id]);

          if (!defUseMap.has(inst.id)) {
            defUseMap.set(inst.id, {
              variable: inst.result,
              defTacId: inst.id,
              defBlockId: block.id,
              useTacIds: new Set(),
            });
          }
        }
      }
    }

    const defUseChains: DefUseChain[] = Array.from(defUseMap.values()).map((d) => ({
      variable: d.variable,
      defTacId: d.defTacId,
      defBlockId: d.defBlockId,
      useTacIds: Array.from(d.useTacIds).sort((a, b) => a - b),
    }));

    return {
      useDefChains,
      defUseChains,
    };
  }
}
