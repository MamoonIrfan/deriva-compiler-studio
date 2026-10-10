import { OptimizationLevel, OptimizationLog, TACInstruction } from '../../types';
import { AlgebraicIdentitiesPass } from './algebraicIdentities';
import { ConstantFoldingPass } from './constantFolding';
import { CommonSubexpressionEliminationPass } from './cse';
import { DeadCodeEliminationPass } from './deadCodeElimination';
import { LoopInvariantCodeMotionPass } from './loopInvariant';

export interface PassRecord {
  passName: string;
  instructionsBefore: number;
  instructionsAfter: number;
  instructions: TACInstruction[];
  logs: OptimizationLog[];
}

export interface OptimizerResult {
  initialTAC: TACInstruction[];
  optimizedTAC: TACInstruction[];
  passes: PassRecord[];
  allLogs: OptimizationLog[];
  metrics: {
    initialInstructions: number;
    optimizedInstructions: number;
    reductionPercentage: number;
    eliminatedCount: number;
  };
}

export class OptimizerPipeline {
  public static run(
    initialTAC: TACInstruction[],
    level: OptimizationLevel = 'O2'
  ): OptimizerResult {
    let currentTAC = JSON.parse(JSON.stringify(initialTAC)) as TACInstruction[];
    const passes: PassRecord[] = [];
    const allLogs: OptimizationLog[] = [];

    if (level === 'O0') {
      return {
        initialTAC,
        optimizedTAC: currentTAC,
        passes: [],
        allLogs: [],
        metrics: {
          initialInstructions: initialTAC.length,
          optimizedInstructions: initialTAC.length,
          reductionPercentage: 0,
          eliminatedCount: 0,
        },
      };
    }

    // Helper to apply a pass
    const applyPass = (
      name: string,
      passFn: (ins: TACInstruction[]) => { optimized: TACInstruction[]; logs: OptimizationLog[] }
    ) => {
      const beforeCount = currentTAC.length;
      const { optimized, logs } = passFn(currentTAC);
      currentTAC = optimized;
      allLogs.push(...logs);

      passes.push({
        passName: name,
        instructionsBefore: beforeCount,
        instructionsAfter: currentTAC.length,
        instructions: JSON.parse(JSON.stringify(currentTAC)),
        logs,
      });
    };

    // Optimization Level O1: Constant Folding & Algebraic Simplification
    applyPass('Constant Folding & Propagation', (ins) => ConstantFoldingPass.run(ins));
    applyPass('Algebraic Simplification', (ins) => AlgebraicIdentitiesPass.run(ins));
    applyPass('Dead Code Elimination', (ins) => DeadCodeEliminationPass.run(ins));

    if (level === 'O2' || level === 'O3') {
      // Optimization Level O2: CSE & Second DCE pass
      applyPass('Common Subexpression Elimination', (ins) => CommonSubexpressionEliminationPass.run(ins));
      applyPass('Dead Code Elimination (Pass 2)', (ins) => DeadCodeEliminationPass.run(ins));
    }

    if (level === 'O3') {
      // Optimization Level O3: Loop Invariant Code Motion & Cleanups
      applyPass('Loop-Invariant Code Motion', (ins) => LoopInvariantCodeMotionPass.run(ins));
      applyPass('Constant Folding (Aggressive)', (ins) => ConstantFoldingPass.run(ins));
      applyPass('Dead Code Elimination (Final)', (ins) => DeadCodeEliminationPass.run(ins));
    }

    const initialCount = initialTAC.length;
    const finalCount = currentTAC.length;
    const reduction = initialCount > 0 ? Math.round(((initialCount - finalCount) / initialCount) * 100) : 0;

    return {
      initialTAC,
      optimizedTAC: currentTAC,
      passes,
      allLogs,
      metrics: {
        initialInstructions: initialCount,
        optimizedInstructions: finalCount,
        reductionPercentage: Math.max(0, reduction),
        eliminatedCount: Math.max(0, initialCount - finalCount),
      },
    };
  }
}
