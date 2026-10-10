export type TokenType =
  // Keywords
  | 'KEYWORD_VAR'
  | 'KEYWORD_INT'
  | 'KEYWORD_FLOAT'
  | 'KEYWORD_BOOL'
  | 'KEYWORD_STRING'
  | 'KEYWORD_VOID'
  | 'KEYWORD_IF'
  | 'KEYWORD_ELSE'
  | 'KEYWORD_WHILE'
  | 'KEYWORD_FOR'
  | 'KEYWORD_FUNC'
  | 'KEYWORD_RETURN'
  | 'KEYWORD_PRINT'
  | 'KEYWORD_TRUE'
  | 'KEYWORD_FALSE'
  // Literals
  | 'LITERAL_INT'
  | 'LITERAL_FLOAT'
  | 'LITERAL_STRING'
  | 'LITERAL_BOOL'
  // Identifiers
  | 'IDENTIFIER'
  // Arithmetic Operators
  | 'OP_PLUS'        // +
  | 'OP_MINUS'       // -
  | 'OP_MUL'         // *
  | 'OP_DIV'         // /
  | 'OP_MOD'         // %
  // Assignment Operators
  | 'OP_ASSIGN'      // =
  | 'OP_PLUS_ASSIGN' // +=
  | 'OP_MINUS_ASSIGN'// -=
  | 'OP_MUL_ASSIGN'  // *=
  | 'OP_DIV_ASSIGN'  // /=
  // Relational Operators
  | 'OP_EQ'          // ==
  | 'OP_NEQ'         // !=
  | 'OP_LT'          // <
  | 'OP_LE'          // <=
  | 'OP_GT'          // >
  | 'OP_GE'          // >=
  // Logical Operators
  | 'OP_AND'         // &&
  | 'OP_OR'          // ||
  | 'OP_NOT'         // !
  // Delimiters & Punctuation
  | 'DELIM_LPAREN'   // (
  | 'DELIM_RPAREN'   // )
  | 'DELIM_LBRACE'   // {
  | 'DELIM_RBRACE'   // }
  | 'DELIM_LBRACKET' // [
  | 'DELIM_RBRACKET' // ]
  | 'DELIM_SEMICOLON'// ;
  | 'DELIM_COMMA'    // ,
  | 'DELIM_COLON'    // :
  | 'DELIM_ARROW'    // ->
  // Special
  | 'COMMENT'
  | 'EOF'
  | 'UNKNOWN';

export interface Token {
  id: number;
  type: TokenType;
  lexeme: string;
  value: any;
  line: number;
  column: number;
  startOffset: number;
  endOffset: number;
}

export type DataType = 'int' | 'float' | 'bool' | 'string' | 'void' | 'unknown';

export interface SourceLocation {
  line: number;
  column: number;
  startOffset?: number;
  endOffset?: number;
}

export interface CompilerDiagnostic {
  phase: 'Lexical' | 'Syntax' | 'Semantic' | 'IR' | 'Optimization' | 'Runtime';
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: SourceLocation;
  explanation?: string;
  suggestion?: string;
}

// AST Definitions
export type ASTNodeType =
  | 'Program'
  | 'VariableDeclaration'
  | 'FunctionDeclaration'
  | 'BlockStatement'
  | 'ExpressionStatement'
  | 'AssignmentStatement'
  | 'IfStatement'
  | 'WhileStatement'
  | 'ForStatement'
  | 'ReturnStatement'
  | 'PrintStatement'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'Literal'
  | 'Identifier'
  | 'FunctionCall'
  | 'Parameter';

export interface BaseASTNode {
  id: string;
  type: string;
  location: SourceLocation;
  inferredType?: DataType;
}

export interface ProgramNode extends BaseASTNode {
  type: 'Program' | string;
  body: ASTNode[];
}

export interface VariableDeclarationNode extends BaseASTNode {
  type: 'VariableDeclaration' | string;
  name: string;
  dataType: DataType;
  initializer?: ASTNode;
}

export interface ParameterNode extends BaseASTNode {
  type: 'Parameter' | string;
  name: string;
  dataType: DataType;
}

export interface FunctionDeclarationNode extends BaseASTNode {
  type: 'FunctionDeclaration' | string;
  name: string;
  params: ParameterNode[];
  returnType: DataType;
  body: BlockStatementNode;
}

export interface BlockStatementNode extends BaseASTNode {
  type: 'BlockStatement' | string;
  statements: ASTNode[];
}

export interface ExpressionStatementNode extends BaseASTNode {
  type: 'ExpressionStatement' | string;
  expression: ASTNode;
}

export interface AssignmentStatementNode extends BaseASTNode {
  type: 'AssignmentStatement' | string;
  target: string;
  operator: string;
  value: ASTNode;
}

export interface IfStatementNode extends BaseASTNode {
  type: 'IfStatement' | string;
  condition: ASTNode;
  thenBranch: ASTNode;
  elseBranch?: ASTNode;
}

export interface WhileStatementNode extends BaseASTNode {
  type: 'WhileStatement' | string;
  condition: ASTNode;
  body: ASTNode;
}

export interface ForStatementNode extends BaseASTNode {
  type: 'ForStatement' | string;
  init?: ASTNode;
  condition?: ASTNode;
  update?: ASTNode;
  body: ASTNode;
}

export interface ReturnStatementNode extends BaseASTNode {
  type: 'ReturnStatement' | string;
  argument?: ASTNode;
}

export interface PrintStatementNode extends BaseASTNode {
  type: 'PrintStatement' | string;
  expression: ASTNode;
}

export interface BinaryExpressionNode extends BaseASTNode {
  type: 'BinaryExpression' | string;
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpressionNode extends BaseASTNode {
  type: 'UnaryExpression' | string;
  operator: string;
  operand: ASTNode;
}

export interface LiteralNode extends BaseASTNode {
  type: 'Literal' | string;
  value: any;
  raw: string;
  dataType: DataType;
}

export interface IdentifierNode extends BaseASTNode {
  type: 'Identifier' | string;
  name: string;
}

export interface FunctionCallNode extends BaseASTNode {
  type: 'FunctionCall' | string;
  callee: string;
  arguments: ASTNode[];
}

export type ASTNode =
  | ProgramNode
  | VariableDeclarationNode
  | ParameterNode
  | FunctionDeclarationNode
  | BlockStatementNode
  | ExpressionStatementNode
  | AssignmentStatementNode
  | IfStatementNode
  | WhileStatementNode
  | ForStatementNode
  | ReturnStatementNode
  | PrintStatementNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | LiteralNode
  | IdentifierNode
  | FunctionCallNode
  | any;

// Automata Definitions (NFA / DFA)
export interface NFATransition {
  char: string;
  toState: number;
}

export interface NFAState {
  id: number;
  isStart?: boolean;
  isAccept?: boolean;
  label?: string;
  transitions: NFATransition[];
  epsilonTransitions: number[];
}

export interface NFA {
  states: NFAState[];
  startState: number;
  acceptStates: number[];
  alphabet: string[];
}

export interface DFAState {
  id: number;
  isStart?: boolean;
  isAccept?: boolean;
  nfaStates: number[];
  transitions: Record<string, number>;
  mergedStates?: number[];
  reason?: string;
}

export interface DFA {
  states: DFAState[];
  startState: number;
  acceptStates?: number[];
  alphabet: string[];
}

export interface SubsetConstructionStep {
  step?: number;
  dfaStateId?: number;
  nfaStates?: number[];
  nfaSet?: number[];
  symbol?: string;
  char?: string;
  moveResult?: number[];
  moveSet?: number[];
  closureResult?: number[];
  closureSet?: number[];
  targetDFAStateId?: number;
  targetDfaStateId?: number;
  isNewState?: boolean;
  isNew?: boolean;
  explanation?: string;
  partialDFA?: DFA;
}

export interface ThompsonConstructionStep {
  stepNumber: number;
  operation: 'literal' | 'concat' | 'union' | 'star' | 'plus' | 'optional' | 'empty';
  fragment: string;
  description: string;
  statesAdded: number[];
  transitionsAdded: { from: number; to: number; label: string }[];
  currentNFA: NFA;
}

export interface NFASimulationStep {
  stepIndex: number;
  symbol: string;
  activeBefore: number[];
  moveResult: number[];
  transitionsFollowed: { from: number; to: number; char: string }[];
  epsilonClosure: number[];
  activeAfter: number[];
  explanation: string;
}

export interface DFASimulationStep {
  stepIndex: number;
  currentState: number;
  symbol: string;
  nextState?: number;
  explanation: string;
  isAccepted?: boolean;
}

export interface MinimizationStep {
  stepNumber: number;
  symbol?: string;
  groupBefore: number[];
  splitGroups: number[][];
  partitions: number[][];
  explanation: string;
}

export interface MinimizationResult {
  minimizedDFA: DFA;
  steps: MinimizationStep[];
  stateMapping: Record<number, number[]>;
  originalStateToMinimized: Record<number, number>;
}

// Parse Tree Definitions
export interface ParseTreeNode {
  id: string;
  symbol: string;
  isTerminal: boolean;
  token?: Token;
  children: ParseTreeNode[];
  rule?: string;
  attributes?: Record<string, any>;
}

// Symbol Table Definitions
export type SymbolKind = 'variable' | 'function' | 'parameter';

export interface SymbolEntry {
  id: string;
  name: string;
  kind: SymbolKind;
  dataType: DataType;
  scopeId: number;
  scopeName: string;
  declaredLine: number;
  declaredColumn: number;
  initialized: boolean;
  value?: any;
  references: SourceLocation[];
  params?: { name: string; type: DataType }[];
  returnType?: DataType;
}

export interface ScopeInfo {
  id: number;
  parentId: number | null;
  name: string;
  level: number;
  symbols: Map<string, SymbolEntry>;
}

// SDD Rule definitions
export interface SDDRule {
  production: string;
  synthesized: { attribute: string; rule: string }[];
  inherited: { attribute: string; rule: string }[];
}

// Three-Address Code (TAC) Definitions
export type TACOp =
  | 'ASSIGN'
  | 'ADD'
  | 'SUB'
  | 'MUL'
  | 'DIV'
  | 'MOD'
  | 'NEG'
  | 'NOT'
  | 'EQ'
  | 'NEQ'
  | 'LT'
  | 'LE'
  | 'GT'
  | 'GE'
  | 'AND'
  | 'OR'
  | 'GOTO'
  | 'IF_TRUE'
  | 'IF_FALSE'
  | 'LABEL'
  | 'FUNC_BEGIN'
  | 'FUNC_END'
  | 'PARAM'
  | 'CALL'
  | 'RETURN'
  | 'PRINT';

export interface TACInstruction {
  id: number;
  op: TACOp;
  arg1?: string;
  arg2?: string;
  result?: string;
  sourceLine?: number;
  comment?: string;
  isDead?: boolean;
}

// Quadruples, Triples, Indirect Triples
export interface Quadruple {
  index: number;
  op: string;
  arg1: string;
  arg2: string;
  result: string;
  tacId: number;
}

export interface Triple {
  index: number;
  op: string;
  arg1: string;
  arg2: string;
  tacId: number;
}

export interface IndirectTriple {
  index: number;
  pointer: number;
  triple: Triple;
}

// DAG (Directed Acyclic Graph)
export interface DAGNode {
  id: string;
  label: string;
  isLeaf: boolean;
  value?: any;
  variables: string[];
  left?: string;
  right?: string;
  children: string[];
}

// Basic Blocks and CFG
export interface BasicBlock {
  id: string;
  index: number;
  label?: string;
  instructions: TACInstruction[];
  predecessors: string[];
  successors: string[];
  isEntry?: boolean;
  isExit?: boolean;
  dominators?: Set<string>;
  immediateDominator?: string;
  postDominators?: Set<string>;
  immediatePostDominator?: string;
  dominanceFrontier?: Set<string>;
  naturalLoopId?: string;
}

export interface CFGEdge {
  from: string;
  to: string;
  type: 'fallthrough' | 'conditional_true' | 'conditional_false' | 'unconditional' | 'backedge';
}

export interface ControlFlowGraph {
  blocks: BasicBlock[];
  edges: CFGEdge[];
  entryBlockId: string;
  exitBlockId: string;
}

export interface NaturalLoop {
  id: string;
  header: string;
  backEdge: { from: string; to: string };
  blocks: string[];
  exits: string[];
  depth: number;
}

// Data Flow Analysis
export interface DataFlowStep {
  blockId: string;
  gen: string[];
  kill: string[];
  in: string[];
  out: string[];
}

export interface DataFlowIteration {
  iteration: number;
  steps: Record<string, { in: string[]; out: string[] }>;
  changed: boolean;
}

export interface DataFlowResult {
  name: string;
  direction: 'forward' | 'backward';
  meetOp: 'union' | 'intersection';
  gen: Record<string, string[]>;
  kill: Record<string, string[]>;
  iterations: DataFlowIteration[];
  finalIn: Record<string, string[]>;
  finalOut: Record<string, string[]>;
}

export interface UseDefChain {
  variable: string;
  useTacId: number;
  useBlockId: string;
  defTacIds: number[];
}

export interface DefUseChain {
  variable: string;
  defTacId: number;
  defBlockId: string;
  useTacIds: number[];
}

// Optimization Definitions
export type OptimizationLevel = 'O0' | 'O1' | 'O2' | 'O3';

export interface OptimizationLog {
  passName: string;
  description: string;
  before: string;
  after: string;
  tacId?: number;
}

export interface OptimizationPassResult {
  passName: string;
  instructions: TACInstruction[];
  logs: OptimizationLog[];
}

export interface OptimizerPipelineResult {
  optimizedTAC: TACInstruction[];
  passes: OptimizationPassResult[];
  metrics: {
    initialInstructionCount: number;
    finalInstructionCount: number;
    reductionPercentage: number;
    deadCodeRemovedCount: number;
    constantsFoldedCount: number;
    algebraicIdentitiesCount: number;
    cseCount: number;
    licmCount: number;
  };
}

// Grammar, FIRST/FOLLOW, LR/LL Definitions
export interface GrammarProduction {
  id: number;
  lhs: string;
  rhs: string[];
}

export interface Grammar {
  name?: string;
  startSymbol: string;
  terminals: string[];
  nonTerminals: string[];
  productions: GrammarProduction[];
}

export interface FirstFollowIteration {
  step?: number;
  iteration?: number;
  changed?: boolean;
  symbol?: string;
  action?: string;
  sets?: Record<string, string[]>;
  firstSets?: Record<string, string[]>;
  followSets?: Record<string, string[]>;
}

export interface LR0Item {
  productionId: number;
  dot: number;
  lhs: string;
  rhs: string[];
}

export interface LR1Item {
  productionId: number;
  dot: number;
  lhs: string;
  rhs: string[];
  lookahead: string;
}

export interface LRState<T = any> {
  id: number;
  items: T[];
  transitions: Record<string, number>;
}

export interface LRAction {
  type: 'shift' | 'reduce' | 'accept' | 'error';
  stateOrRuleId?: number;
}

export interface LRParsingTable {
  kind?: string;
  states: number;
  terminals: string[];
  nonTerminals: string[];
  actionTable: Record<number, Record<string, LRAction[]>>;
  gotoTable: Record<number, Record<string, number>>;
  conflictsCount?: number;
  conflicts?: { state: number; symbol: string; actions: LRAction[] }[];
}

export interface LL1ParsingTable {
  terminals: string[];
  nonTerminals: string[];
  table: Record<string, Record<string, GrammarProduction | null>>;
  conflicts?: { nonTerminal: string; terminal: string; productions: GrammarProduction[] }[];
}

export interface LL1ParserStep {
  step: number;
  stack: string[];
  input?: string[];
  inputTokens?: Token[];
  currentInputIndex?: number;
  action?: string;
  actionTaken?: string;
  production?: GrammarProduction;
  appliedProduction?: GrammarProduction;
}

export interface ShiftReduceStep {
  step: number;
  stateStack: number[];
  symbolStack: string[];
  inputTokens: Token[];
  currentInputIndex: number;
  actionTaken: string;
  appliedProduction?: GrammarProduction;
  status?: string;
  productionUsed?: GrammarProduction;
}

// Target Codegen & Register Allocation
export interface LiveRange {
  variable: string;
  start: number;
  end: number;
}

export interface InterferenceGraphNode {
  id?: string;
  variable: string;
  neighbors?: Set<string>;
  degree: number;
  color?: string;
  spilled?: boolean;
}

export interface InterferenceGraph {
  nodes: any;
  edges?: { u: string; v: string }[];
}

export interface RegisterAllocationResult {
  method?: string;
  assignment: Record<string, string>;
  spilledVariables: string[];
  liveRanges: any;
  interferenceGraph?: InterferenceGraph;
}

// Virtual Machine & Bytecode
export enum VMOpCode {
  PUSH = 'PUSH',
  POP = 'POP',
  LOAD = 'LOAD',
  STORE = 'STORE',
  ADD = 'ADD',
  SUB = 'SUB',
  MUL = 'MUL',
  DIV = 'DIV',
  MOD = 'MOD',
  EQ = 'EQ',
  NEQ = 'NEQ',
  LT = 'LT',
  LE = 'LE',
  GT = 'GT',
  GE = 'GE',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  NEG = 'NEG',
  JMP = 'JMP',
  JMP_IF_FALSE = 'JMP_IF_FALSE',
  JMP_IF_TRUE = 'JMP_IF_TRUE',
  CALL = 'CALL',
  RET = 'RET',
  PRINT = 'PRINT',
  HALT = 'HALT',
}

export interface BytecodeInstruction {
  op: VMOpCode | string;
  operand?: any;
  targetLabel?: string;
  comment?: string;
  sourceLine?: number;
}

export interface CallFrame {
  functionName: string;
  returnIp: number;
  locals: Map<string, any> | Record<string, any>;
}

export interface VMState {
  ip: number;
  stack: any[];
  memory: Record<string, any>;
  callStack: CallFrame[];
  output: string[];
  halted: boolean;
  stepCount: number;
}

export interface VMExecutionStep {
  stepNumber: number;
  state: VMState;
  actionDescription: string;
}

// Full Session
export interface CompilationSession {
  id: string;
  timestamp: number;
  sourceCode: string;
  tokens: Token[];
  ast: ProgramNode | null;
  parseTree: ParseTreeNode | null;
  symbolTable: Map<string, SymbolEntry> | null;
  scopes: ScopeInfo[];
  sddRules: SDDRule[];
  sddDependencyGraph?: any;
  tac: TACInstruction[];
  quadruples: Quadruple[];
  triples: Triple[];
  indirectTriples: IndirectTriple[];
  dag: DAGNode[];
  cfg: ControlFlowGraph;
  dominatorTree: Record<string, string[]>;
  postDominatorTree: Record<string, string[]>;
  naturalLoops: NaturalLoop[];
  dataFlow: {
    reachingDefs: DataFlowResult;
    liveVariables: DataFlowResult;
    availableExpressions: DataFlowResult;
    veryBusyExpressions: DataFlowResult;
  };
  useDefChains: UseDefChain[];
  defUseChains: DefUseChain[];
  optimizationPasses: {
    name: string;
    tacBefore: TACInstruction[];
    tacAfter: TACInstruction[];
    appliedChanges: string[];
    logs: OptimizationLog[];
  }[];
  interferenceGraph: InterferenceGraph;
  registerAllocations: {
    graphColoring: RegisterAllocationResult;
    linearScan: RegisterAllocationResult;
  };
  targetCode: {
    mips: string;
    x86_64: string;
    wasm: string;
    bytecode: BytecodeInstruction[];
  };
  vmState: VMState;
  diagnostics: CompilerDiagnostic[];
  metrics: {
    tokenCount: number;
    astNodeCount: number;
    tacInstructionCount: number;
    basicBlockCount: number;
    optimizationReductionPercent: number;
    compilationTimeMs: number;
    memoryUsageBytes: number;
  };
}
