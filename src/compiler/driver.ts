import {
  CompilationSession,
  CompilerDiagnostic,
  OptimizationLevel,
} from '../types';
import { CFGBuilder } from './cfg/cfgBuilder';
import { BasicBlockPartitioner } from './cfg/basicBlocks';
import { DominatorAnalyzer } from './cfg/dominators';
import { LoopAnalyzer } from './cfg/loopAnalyzer';
import { PostDominatorAnalyzer } from './cfg/postDominators';
import { BytecodeGenerator } from './codegen/targetBytecode';
import { MIPSCodeGenerator } from './codegen/targetMips';
import { RegisterAllocator } from './codegen/registerAllocator';
import { WasmCodeGenerator } from './codegen/targetWasm';
import { X86CodeGenerator } from './codegen/targetX86';
import { AvailableExpressionsAnalyzer } from './dataflow/availableExprs';
import { LiveVariablesAnalyzer } from './dataflow/liveVariables';
import { ReachingDefinitionsAnalyzer } from './dataflow/reachingDefs';
import { UDChainsBuilder } from './dataflow/udChains';
import { VeryBusyExpressionsAnalyzer } from './dataflow/veryBusyExprs';
import { DAGBuilder } from './ir/dag';
import { IndirectTripleGenerator } from './ir/indirectTriples';
import { QuadrupleGenerator } from './ir/quadruples';
import { TACGenerator } from './ir/tacGenerator';
import { TripleGenerator } from './ir/triples';
import { Lexer } from './lexer/lexer';
import { OptimizerPipeline } from './optimizer/optimizerPipeline';
import { Parser } from './parser/parser';
import { SDDManager } from './semantic/sdd';
import { SemanticAnalyzer } from './semantic/semanticAnalyzer';
import { VirtualMachine } from './vm/virtualMachine';

export class NovaCompilerDriver {
  public static compile(
    sourceCode: string,
    options?: {
      optimizationLevel?: OptimizationLevel;
      registersK?: number;
    }
  ): CompilationSession {
    const startTime = performance.now();
    const optLevel = options?.optimizationLevel || 'O2';
    const kRegs = options?.registersK || 4;

    const allDiagnostics: CompilerDiagnostic[] = [];

    try {
      // Phase 1: Lexical Analysis
      const lexer = new Lexer(sourceCode || '');
      const { tokens, diagnostics: lexDiagnostics } = lexer.tokenize();
      if (Array.isArray(lexDiagnostics)) allDiagnostics.push(...lexDiagnostics);

      // Phase 2: Syntax Analysis (Parser)
      const parser = new Parser(tokens || []);
      const { ast, parseTree, diagnostics: parseDiagnostics } = parser.parse();
      if (Array.isArray(parseDiagnostics)) allDiagnostics.push(...parseDiagnostics);

      // Phase 3: Semantic Analysis
      const semanticAnalyzer = new SemanticAnalyzer();
      const { symbolTable, scopes, diagnostics: semDiagnostics } = semanticAnalyzer.analyze(ast);
      if (Array.isArray(semDiagnostics)) allDiagnostics.push(...semDiagnostics);

      // Phase 4: SDD & Decorated Parse Tree
      let decoratedParseTree = parseTree;
      let sddDependencyGraph;
      if (parseTree) {
        try {
          const sddResult = SDDManager.decorateParseTree(parseTree);
          decoratedParseTree = sddResult?.decoratedTree || parseTree;
          sddDependencyGraph = sddResult?.dependencyGraph;
        } catch (e: any) {
          allDiagnostics.push({
            severity: 'warning',
            phase: 'Semantic',
            message: `SDD decoration notice: ${e?.message || 'Partial decoration'}`,
          });
        }
      }

      // Phase 5: Intermediate Code Generation (TAC, Quads, Triples, Indirect Triples, DAG)
      const tacGen = new TACGenerator();
      const unoptimizedTAC = tacGen.generate(ast) || [];

      const quadruples = QuadrupleGenerator.fromTAC(unoptimizedTAC) || [];
      const triples = TripleGenerator.fromTAC(unoptimizedTAC) || [];
      const indirectTriples = IndirectTripleGenerator.fromTAC(unoptimizedTAC) || [];

      const dagBuilder = new DAGBuilder();
      const dagNodes = dagBuilder.buildFromTAC(unoptimizedTAC) || [];

      // Phase 6: Code Optimization Pipeline
      const optResult = OptimizerPipeline.run(unoptimizedTAC, optLevel);
      const activeTAC = optResult?.optimizedTAC || unoptimizedTAC;

      // Phase 7: Control Flow Analysis (CFG, Dominators, Loops)
      const blocks = BasicBlockPartitioner.partition(activeTAC);
      const cfg = CFGBuilder.build(blocks);
      const domResult = DominatorAnalyzer.compute(cfg);
      const pdomResult = PostDominatorAnalyzer.compute(cfg);
      const loops = LoopAnalyzer.analyze(cfg, domResult.domSets);

      // Phase 8: Data Flow Analysis
      const reachingDefs = ReachingDefinitionsAnalyzer.analyze(cfg);
      const liveVars = LiveVariablesAnalyzer.analyze(cfg);
      const availExprs = AvailableExpressionsAnalyzer.analyze(cfg);
      const veryBusyExprs = VeryBusyExpressionsAnalyzer.analyze(cfg);
      const udChainsResult = UDChainsBuilder.build(cfg, reachingDefs?.finalIn || {});

      // Phase 9: Register Allocation
      const graphColoringAlloc = RegisterAllocator.graphColoring(activeTAC, kRegs);
      const linearScanAlloc = RegisterAllocator.linearScan(activeTAC, kRegs);

      // Phase 10: Target Code Generation (MIPS, x86-64, WAT, Bytecode)
      const mipsCode = MIPSCodeGenerator.generate(activeTAC, graphColoringAlloc);
      const x86Code = X86CodeGenerator.generate(activeTAC, graphColoringAlloc);
      const wasmCode = WasmCodeGenerator.generate(activeTAC);
      const bytecode = BytecodeGenerator.generate(activeTAC) || [];

      // Phase 11: Stack Virtual Machine Run
      const vm = new VirtualMachine(bytecode);
      const vmFinalState = vm.runAll(2000);

      const executionTimeMs = performance.now() - startTime;

      return {
        id: `session_${Date.now()}`,
        timestamp: Date.now(),
        sourceCode,
        tokens: tokens || [],
        ast,
        parseTree: decoratedParseTree,
        symbolTable,
        scopes: scopes || [],
        sddRules: [],
        sddDependencyGraph,
        tac: activeTAC || [],
        quadruples: quadruples || [],
        triples: triples || [],
        indirectTriples: indirectTriples || [],
        dag: dagNodes || [],
        cfg: cfg || { blocks: [], edges: [], entryBlockId: '', exitBlockId: '' },
        dominatorTree: domResult?.dominatorTree || {},
        postDominatorTree: pdomResult?.pdomTree || {},
        naturalLoops: loops || [],
        dataFlow: {
          reachingDefs,
          liveVariables: liveVars,
          availableExpressions: availExprs,
          veryBusyExpressions: veryBusyExprs,
        },
        useDefChains: udChainsResult?.useDefChains || [],
        defUseChains: udChainsResult?.defUseChains || [],
        optimizationPasses: (optResult?.passes || []).map((p) => ({
          name: p.passName,
          tacBefore: unoptimizedTAC,
          tacAfter: p.instructions || [],
          appliedChanges: (p.logs || []).map((l) => l.description),
          logs: p.logs || [],
        })),
        interferenceGraph: graphColoringAlloc?.interferenceGraph || { nodes: [] },
        registerAllocations: {
          graphColoring: graphColoringAlloc || { registers: {}, spills: [], interferenceGraph: { nodes: [] } } as any,
          linearScan: linearScanAlloc || { registers: {}, spills: [] } as any,
        },
        targetCode: {
          mips: mipsCode || '',
          x86_64: x86Code || '',
          wasm: wasmCode || '',
          bytecode: bytecode || [],
        },
        vmState: vmFinalState || { ip: 0, stack: [], memory: {}, callStack: [], output: [], halted: true, stepCount: 0 },
        diagnostics: allDiagnostics,
        metrics: {
          tokenCount: tokens?.length || 0,
          astNodeCount: countASTNodes(ast),
          tacInstructionCount: activeTAC?.length || 0,
          basicBlockCount: cfg?.blocks?.length || 0,
          optimizationReductionPercent: optResult?.metrics?.reductionPercentage || 0,
          compilationTimeMs: Math.round(executionTimeMs * 100) / 100,
          memoryUsageBytes: (sourceCode || '').length * 128,
        },
      };
    } catch (err: any) {
      allDiagnostics.push({
        severity: 'error',
        phase: 'Runtime',
        message: err?.message || 'Compilation interrupted due to an unexpected error.',
      });

      const executionTimeMs = performance.now() - startTime;
      return {
        id: `session_${Date.now()}`,
        timestamp: Date.now(),
        sourceCode,
        tokens: [],
        ast: null as any,
        parseTree: null as any,
        symbolTable: new Map(),
        scopes: [],
        sddRules: [],
        sddDependencyGraph: undefined,
        tac: [],
        quadruples: [],
        triples: [],
        indirectTriples: [],
        dag: [],
        cfg: { blocks: [], edges: [], entryBlockId: '', exitBlockId: '' },
        dominatorTree: {},
        postDominatorTree: {},
        naturalLoops: [],
        dataFlow: {
          reachingDefs: { iterations: [], gen: {}, kill: {}, finalIn: {}, finalOut: {} } as any,
          liveVariables: { iterations: [], use: {}, def: {}, finalIn: {}, finalOut: {} } as any,
          availableExpressions: { iterations: [], gen: {}, kill: {}, finalIn: {}, finalOut: {} } as any,
          veryBusyExpressions: { iterations: [], use: {}, def: {}, finalIn: {}, finalOut: {} } as any,
        },
        useDefChains: [],
        defUseChains: [],
        optimizationPasses: [],
        interferenceGraph: { nodes: [] },
        registerAllocations: {
          graphColoring: { registers: {}, spills: [], interferenceGraph: { nodes: [] } } as any,
          linearScan: { registers: {}, spills: [] } as any,
        },
        targetCode: {
          mips: '',
          x86_64: '',
          wasm: '',
          bytecode: [],
        },
        vmState: { ip: 0, stack: [], memory: {}, callStack: [], output: [], halted: true, stepCount: 0 },
        diagnostics: allDiagnostics,
        metrics: {
          tokenCount: 0,
          astNodeCount: 0,
          tacInstructionCount: 0,
          basicBlockCount: 0,
          optimizationReductionPercent: 0,
          compilationTimeMs: Math.round(executionTimeMs * 100) / 100,
          memoryUsageBytes: 0,
        },
      };
    }
  }
}

function countASTNodes(node: any): number {
  if (!node || typeof node !== 'object') return 0;
  let count = 1;
  for (const key of Object.keys(node)) {
    if (key === 'location' || key === 'inferredType') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        count += countASTNodes(item);
      }
    } else if (child && typeof child === 'object' && child.type) {
      count += countASTNodes(child);
    }
  }
  return count;
}
