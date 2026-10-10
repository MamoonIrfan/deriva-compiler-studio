import { TokenType } from '../types';

export interface DocSection {
  id: string;
  title: string;
  category: 'Getting Started' | 'Language Reference' | 'Compiler Pipeline' | 'Cookbook' | 'Diagnostics' | 'IDE & Tools';
  description: string;
  iconName: string;
  badge?: string;
  keywords: string[];
  subsections: DocSubsection[];
}

export interface DocSubsection {
  id: string;
  title: string;
  content: string; // Markdown / formatted text
  codeSnippet?: {
    title: string;
    description: string;
    code: string;
    highlights?: number[];
  };
  tables?: {
    caption: string;
    headers: string[];
    rows: string[][];
  }[];
  notes?: {
    type: 'info' | 'tip' | 'warning' | 'important';
    text: string;
  }[];
}

export const USER_GUIDE_SECTIONS: DocSection[] = [
  {
    id: 'intro',
    title: '1. Introduction to Deriva',
    category: 'Getting Started',
    description: 'Overview of Deriva, design principles, and your first program in DERIVA Compiler Studio.',
    iconName: 'BookOpen',
    badge: 'Core',
    keywords: ['introduction', 'deriva', 'overview', 'first program', 'hello world', 'principles', 'start'],
    subsections: [
      {
        id: 'what-is-deriva',
        title: 'What is Deriva?',
        content: `**Deriva** is a statically typed, procedural, statement-oriented programming language engineered specifically for compiler construction pedagogy and intermediate representation research.

Deriva pairs modern, familiar syntax (reminiscent of TypeScript, Rust, and Go) with a rigorous, transparent compiler pipeline that reveals every internal representation—from raw character scanning to stack-based virtual machine execution.

### Key Architectural Characteristics
- **Static Typing**: Explicit primitive types (\`int\`, \`float\`, \`bool\`, \`string\`, \`void\`) with automatic type checking and safe widening from \`int\` to \`float\`.
- **Function Hoisting**: Two-pass semantic analysis permits calling functions declared later in the file.
- **Statement & Expression Clarity**: Clean C-style block structures (\`{ ... }\`) with explicit statement terminators (\`;\`).
- **Structured Control Flow**: Standard conditional branching (\`if\` / \`else\`) and bounded iteration (\`while\`, \`for\`).
- **Standard Output**: First-class \`print(...)\` built-in statement for console and runtime output tracking.`,
        notes: [
          {
            type: 'info',
            text: 'Deriva does not require complex class hierarchies or external packages. Everything executes within the self-contained DERIVA virtual machine and target code generators.',
          },
        ],
      },
      {
        id: 'first-program',
        title: 'Your First Deriva Program',
        content: `Writing a Deriva program is straightforward. Every statement must terminate with a semicolon (\`;\`). Variables are declared with the \`var\` keyword, and output is emitted using \`print(...)\`.`,
        codeSnippet: {
          title: 'Hello Deriva & Variable Arithmetic',
          description: 'A complete working program declaring variables, performing arithmetic, and emitting output.',
          code: `// Welcome to Deriva!
var greeting: string = "Hello, DERIVA Compiler Studio!";
print(greeting);

var base: int = 15;
var multiplier: int = 4;
var result: int = base * multiplier + 10;

print("Computed Result: ");
print(result);`,
        },
        notes: [
          {
            type: 'tip',
            text: 'Click "Load into Editor" on any code example to instantly inject it into the Studio Code Editor and trigger live compilation across all 9 pipeline stages.',
          },
        ],
      },
    ],
  },
  {
    id: 'lexical-structure',
    title: '2. Lexical Structure & Tokens',
    category: 'Language Reference',
    description: 'Keywords, literal formats, identifier rules, operators, and delimiter specifications.',
    iconName: 'Code',
    badge: 'Stage 1',
    keywords: ['lexer', 'tokens', 'keywords', 'literals', 'identifiers', 'operators', 'delimiters', 'comments'],
    subsections: [
      {
        id: 'lexical-basics',
        title: 'Whitespace, Comments & Encoding',
        content: `Deriva sources are parsed as UTF-8 character sequences.

- **Whitespace**: Spaces, tabs, carriage returns, and newlines are treated as token separators and discarded during scanning (except within string literals).
- **Single-Line Comments**: Begin with \`//\` and extend to the end of the line.
- **Multi-Line Comments**: Delimited by \`/*\` and \`*/\`. Nested block comments are scanned until the closing delimiter. Unterminated block comments trigger a Lexical Diagnostic.`,
        codeSnippet: {
          title: 'Comment Examples',
          description: 'Single-line and multi-line comments in Deriva.',
          code: `// This is a single-line comment
var x: int = 10; // Inline comment

/* This is a multi-line comment
   spanning multiple lines.
   It will be completely ignored by the scanner. */
var y: int = 20;`,
        },
      },
      {
        id: 'keywords-table',
        title: 'Reserved Keywords (15 Keywords)',
        content: `Deriva reserves exactly 15 keywords. Keywords cannot be used as variable names, parameter names, or function identifiers.`,
        tables: [
          {
            caption: 'Authoritative Deriva Keyword Reference',
            headers: ['Keyword', 'Token Category', 'Description', 'Example Usage'],
            rows: [
              ['var', 'Keyword', 'Declares a mutable variable', 'var count: int = 0;'],
              ['int', 'Type Keyword', '32-bit signed integer primitive type', 'var age: int = 25;'],
              ['float', 'Type Keyword', 'Floating-point numeric primitive type', 'var pi: float = 3.14159;'],
              ['bool', 'Type Keyword', 'Boolean truth value type (true/false)', 'var active: bool = true;'],
              ['string', 'Type Keyword', 'UTF-8 string literal sequence type', 'var name: string = "Deriva";'],
              ['void', 'Type Keyword', 'Empty return type for functions', 'func logMsg(): void { ... }'],
              ['if', 'Keyword', 'Conditional branch statement', 'if (x > 0) { ... }'],
              ['else', 'Keyword', 'Alternative conditional branch', 'else { ... }'],
              ['while', 'Keyword', 'Pre-condition loop construct', 'while (i < 10) { ... }'],
              ['for', 'Keyword', 'Bounded loop with init, cond, update', 'for (var i = 0; i < 5; i += 1) { ... }'],
              ['func', 'Keyword', 'Function declaration keyword', 'func add(a: int, b: int): int { ... }'],
              ['return', 'Keyword', 'Returns a value from a function', 'return a + b;'],
              ['print', 'Keyword', 'Emits an expression to standard output', 'print(result);'],
              ['true', 'Literal Keyword', 'Boolean constant true literal', 'var flag: bool = true;'],
              ['false', 'Literal Keyword', 'Boolean constant false literal', 'var flag: bool = false;'],
            ],
          },
        ],
      },
      {
        id: 'literals-identifiers',
        title: 'Literals and Identifiers',
        content: `Deriva recognizes four concrete literal formats and one identifier specification:

1. **Integer Literals**: One or more digits \`[0-9]+\`. Evaluated as 32-bit signed integers (e.g. \`0\`, \`42\`, \`1024\`).
2. **Float Literals**: One or more digits, a decimal point, and one or more digits \`[0-9]+\\.[0-9]+\` (e.g. \`3.14\`, \`0.5\`, \`99.99\`).
3. **String Literals**: Double-quoted sequences supporting backslash escape characters (\`\\n\`, \`\\t\`, \`\\"\`, \`\\\\\`). Example: \`"Hello\\nWorld"\`.
4. **Boolean Literals**: The reserved keywords \`true\` and \`false\`.
5. **Identifiers**: Begin with an ASCII letter or underscore (\`[a-zA-Z_]\`), followed by letters, digits, or underscores (\`[a-zA-Z0-9_]*\`). Identifiers are case-sensitive (\`totalSum\` and \`Totalsum\` are distinct).`,
      },
      {
        id: 'operators-delimiters',
        title: 'Operators and Delimiters',
        content: `Operators in Deriva are grouped by their syntactic roles.`,
        tables: [
          {
            caption: 'Complete Operator Reference',
            headers: ['Operator', 'Category', 'Associativity', 'Description', 'Example'],
            rows: [
              ['+', 'Arithmetic / String', 'Left-to-Right', 'Addition or String concatenation', 'a + b'],
              ['-', 'Arithmetic / Unary', 'Left-to-Right / Right (unary)', 'Subtraction or numeric negation', 'a - b, -x'],
              ['*', 'Arithmetic', 'Left-to-Right', 'Multiplication', 'a * b'],
              ['/', 'Arithmetic', 'Left-to-Right', 'Division (integer truncation or float)', 'a / b'],
              ['%', 'Arithmetic', 'Left-to-Right', 'Modulo / Remainder operator', 'a % b'],
              ['==', 'Equality', 'Left-to-Right', 'Value equality comparison', 'a == b'],
              ['!=', 'Equality', 'Left-to-Right', 'Value inequality comparison', 'a != b'],
              ['<', 'Relational', 'Left-to-Right', 'Strictly less than', 'a < b'],
              ['<=', 'Relational', 'Left-to-Right', 'Less than or equal to', 'a <= b'],
              ['>', 'Relational', 'Left-to-Right', 'Strictly greater than', 'a > b'],
              ['>=', 'Relational', 'Left-to-Right', 'Greater than or equal to', 'a >= b'],
              ['&&', 'Logical', 'Left-to-Right', 'Logical AND conjunction', 'a && b'],
              ['||', 'Logical', 'Left-to-Right', 'Logical OR disjunction', 'a || b'],
              ['!', 'Logical / Unary', 'Right-to-Left', 'Logical NOT negation', '!isValid'],
              ['=', 'Assignment', 'Right-to-Left', 'Simple variable assignment', 'x = 5;'],
              ['+=', 'Compound Assign', 'Right-to-Left', 'Addition compound assignment', 'x += 1;'],
              ['-=', 'Compound Assign', 'Right-to-Left', 'Subtraction compound assignment', 'x -= 1;'],
              ['*=', 'Compound Assign', 'Right-to-Left', 'Multiplication compound assignment', 'x *= 2;'],
              ['/=', 'Compound Assign', 'Right-to-Left', 'Division compound assignment', 'x /= 2;'],
              ['->', 'Delimiter', 'N/A', 'Function return type arrow (alternative to :)', 'func f(): int or -> int'],
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'type-system',
    title: '3. Type System & Semantics',
    category: 'Language Reference',
    description: 'Type compatibility rules, implicit widening, string concatenation, and scoping rules.',
    iconName: 'Sparkles',
    badge: 'Stage 3',
    keywords: ['types', 'typing', 'widening', 'coercion', 'scope', 'symbol table', 'semantics'],
    subsections: [
      {
        id: 'primitive-types',
        title: 'Primitive Data Types',
        content: `Deriva features five distinct primitive types:

- \`int\`: 32-bit signed integer values (\`-2,147,483,648\` to \`2,147,483,647\`).
- \`float\`: IEEE-754 double precision floating-point numbers.
- \`bool\`: Boolean values representing logical states (\`true\` or \`false\`).
- \`string\`: UTF-8 encoded text sequences.
- \`void\`: Represents the absence of a value; used strictly as a function return type.`,
      },
      {
        id: 'type-widening-rules',
        title: 'Type Compatibility & Implicit Widening',
        content: `Deriva implements a strict type checker with one safe implicit promotion:

### 1. Int to Float Widening
Whenever a binary arithmetic operation (\`+\`, \`-\`, \`*\`, \`/\`, \`%\`) has one \`int\` and one \`float\` operand, the integer is automatically promoted to \`float\`, and the expression evaluates to \`float\`.
Similarly, assigning an \`int\` expression to a variable declared as \`float\` is permitted:
\`\`\`deriva
var ratio: float = 10; // Allowed: int 10 widened to float 10.0
\`\`\`

### 2. String Concatenation Overload
The \`+\` operator is overloaded: if either operand is of type \`string\`, the operation performs string concatenation and the resulting type is \`string\`.

### 3. Disallowed Conversions
- Assigning a \`float\` to an \`int\` without explicit truncation is rejected with a **Semantic Error**.
- Non-boolean values cannot be used directly in \`if\`, \`while\`, or \`for\` conditions (no "truthy/falsy" coercions).
- Binary operators \`&&\` and \`||\` strictly require both operands to be \`bool\`.`,
        codeSnippet: {
          title: 'Type Widening & String Concatenation',
          description: 'Illustrating automatic widening and string concatenation.',
          code: `var count: int = 5;
var factor: float = 2.5;

// int count promoted to float in binary multiplication
var scaled: float = count * factor; // Type: float

// String concatenation using overloaded '+'
var message: string = "Scaled total is: " + scaled;
print(message);`,
        },
      },
      {
        id: 'scoping-rules',
        title: 'Lexical Scoping & Symbol Resolution',
        content: `Deriva employs block-level lexical scoping:

- **Global Scope**: Top-level variables and functions reside in the global symbol table.
- **Function Scope**: Parameters and local variables declared inside a function body belong to that function's scope.
- **Block Scope**: Any block enclosed in curly braces \`{ ... }\` (including \`if\`, \`while\`, \`for\` bodies) introduces an inner scope.
- **Shadowing**: An identifier declared in an inner scope shadows an identifier with the same name in an outer scope. When the inner scope exits, the outer identifier becomes visible again.
- **Unused Variable Detection**: The compiler tracks every symbol reference. Declaring a variable that is never read generates a helpful **Semantic Warning**.`,
      },
    ],
  },
  {
    id: 'statements-grammar',
    title: '4. Statements & Grammar Reference',
    category: 'Language Reference',
    description: 'Complete grammar specification for variable declarations, functions, loops, and conditions.',
    iconName: 'Layers',
    badge: 'Stage 2',
    keywords: ['grammar', 'ebnf', 'statements', 'loops', 'functions', 'precedence', 'ast'],
    subsections: [
      {
        id: 'variable-declarations',
        title: 'Variable Declarations',
        content: `Variables are declared using the \`var\` keyword. An explicit type annotation is strongly recommended. Initializers are optional (defaulting to zero-values if omitted).

### Syntax
\`\`\`deriva
var <identifier>: <type> [= <expression>];
\`\`\`

Examples:
\`\`\`deriva
var score: int = 100;
var pi: float = 3.14159;
var title: string = "DERIVA";
var uninitialized: int; // default 0
\`\`\``,
      },
      {
        id: 'function-declarations',
        title: 'Function Declarations & Hoisting',
        content: `Functions are declared with the \`func\` keyword. Parameters must specify explicit types. The return type can be annotated with \`: <type>\` or \`-> <type>\`. If omitted, the return type defaults to \`void\`.

### Function Hoisting
Deriva performs a multi-pass semantic analysis. All function signatures in a file are cataloged in the symbol table before function bodies are analyzed. You may call a function before its lexical declaration in the source file!

### Syntax
\`\`\`deriva
func <name>(<p1>: <type1>, <p2>: <type2>): <returnType> {
  // statements
  return <expr>;
}
\`\`\``,
        codeSnippet: {
          title: 'Recursive Function Declaration',
          description: 'Demonstrating function declaration, typed parameters, and return statements.',
          code: `// Functions can be called before declaration due to hoisting
var ans: int = computeFactorial(5);
print("5! = ");
print(ans);

func computeFactorial(n: int): int {
  if (n <= 1) {
    return 1;
  }
  return n * computeFactorial(n - 1);
}`,
        },
      },
      {
        id: 'control-flow-statements',
        title: 'Control Flow (If, While, For)',
        content: `Deriva provides standard procedural control flow constructs.

### 1. Conditional Branching (\`if\` / \`else\`)
The condition expression must evaluate to \`bool\`. Braces \`{ ... }\` are required around the branch bodies.
\`\`\`deriva
if (x > 0) {
  print("positive");
} else {
  print("non-positive");
}
\`\`\`

### 2. While Loops (\`while\`)
Repeatedly executes the loop body as long as the condition evaluates to \`true\`.
\`\`\`deriva
var i: int = 0;
while (i < 5) {
  print(i);
  i += 1;
}
\`\`\`

### 3. For Loops (\`for\`)
Accepts an optional initializer (variable declaration or assignment), an optional condition, and an optional update expression.
\`\`\`deriva
for (var i: int = 0; i < 10; i += 1) {
  print(i);
}
\`\`\``,
      },
      {
        id: 'operator-precedence',
        title: 'Operator Precedence Hierarchy',
        content: `Expressions are parsed using standard precedence climbing from lowest to highest binding power:`,
        tables: [
          {
            caption: 'Operator Precedence Table (Lowest to Highest)',
            headers: ['Level', 'Category', 'Operators', 'Associativity', 'AST Production'],
            rows: [
              ['1 (Lowest)', 'Logical OR', '||', 'Left-to-Right', 'LogicalOrExpr'],
              ['2', 'Logical AND', '&&', 'Left-to-Right', 'LogicalAndExpr'],
              ['3', 'Equality', '==, !=', 'Left-to-Right', 'EqualityExpr'],
              ['4', 'Relational', '<, <=, >, >=', 'Left-to-Right', 'RelationalExpr'],
              ['5', 'Additive', '+, -', 'Left-to-Right', 'AdditiveExpr'],
              ['6', 'Multiplicative', '*, /, %', 'Left-to-Right', 'MultiplicativeExpr'],
              ['7', 'Unary', '-, !', 'Right-to-Left', 'UnaryExpr'],
              ['8 (Highest)', 'Primary', 'literals, identifiers, (expr), calls', 'N/A', 'PrimaryExpr'],
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'pipeline-deep-dive',
    title: '5. Compiler Pipeline Deep Dive',
    category: 'Compiler Pipeline',
    description: 'In-depth guide to each of the 9 stages in the DERIVA Compiler Studio pipeline.',
    iconName: 'Cpu',
    badge: '9 Stages',
    keywords: ['pipeline', 'stages', 'lexer', 'parser', 'cst', 'ast', 'sdd', 'ir', 'tac', 'cfg', 'dataflow', 'optimizer', 'codegen', 'vm'],
    subsections: [
      {
        id: 'stage-1-lexer',
        title: 'Stage 1: Lexer & Token Scanner',
        content: `### What Happens Here
The Lexer transforms raw source code text into a linear sequence of atomic **Tokens**. Each token contains:
- **TokenType**: e.g., \`KEYWORD_VAR\`, \`IDENTIFIER\`, \`LITERAL_INT\`, \`OP_PLUS\`.
- **Lexeme**: The exact source substring matched (e.g. \`"var"\`, \`"sum"\`, \`"42"\`).
- **Source Coordinates**: Line number, column index, startOffset, endOffset for precise error reporting and visual code highlighting.

### In the Studio Visualizer
The **Lexer Visualizer** displays every scanned token in a color-coded table, categorizes them (Keyword, Literal, Identifier, Operator, Delimiter), and highlights corresponding source code locations upon selection.`,
      },
      {
        id: 'stage-2-parser',
        title: 'Stage 2: Parser & Syntax Trees (CST & AST)',
        content: `### What Happens Here
The Parser applies a recursive descent predictive algorithm to parse the token sequence against Deriva's formal LL(1) grammar:
- **Concrete Syntax Tree (CST / Parse Tree)**: Captures every terminal and non-terminal grammar rule expansion (e.g. \`VarDecl -> var id : Type OptInit ;\`).
- **Abstract Syntax Tree (AST)**: A condensed, structural representation stripped of delimiters and punctuation, representing program hierarchy (e.g., \`Program\`, \`FunctionDeclaration\`, \`BinaryExpression\`).

### In the Studio Visualizer
The **Parser Visualizer** provides interactive, collapsible tree explorers for both the CST and AST, allowing you to trace grammar reductions and inspect node properties.`,
      },
      {
        id: 'stage-3-semantic',
        title: 'Stage 3: Semantic Analysis & SDD',
        content: `### What Happens Here
Semantic Analysis validates program correctness beyond syntax:
- **Symbol Table Construction**: Builds hierarchical scope tables tracking variable declarations, data types, memory offsets, and initialization status.
- **Function Hoisting**: Pre-registers function signatures across scopes before analyzing statements.
- **Type Checking**: Validates operator operand types, return statement expressions, and argument lists.
- **Syntax-Directed Definition (SDD)**: Computes synthesized and inherited attributes, rendering an attribute dependency graph.

### In the Studio Visualizer
Inspect active scopes, declared identifiers, type signatures, usage counters, and the SDD attribute evaluation graph.`,
      },
      {
        id: 'stage-4-ir',
        title: 'Stage 4: Intermediate Representation (IR)',
        content: `### What Happens Here
Translates the high-level AST into target-independent intermediate representations:
- **Three-Address Code (TAC)**: Linear instructions where each operation has at most one operator and at most three operands (\`t0 = a + b\`).
- **Quadruples**: Fixed four-field tuples \`(op, arg1, arg2, result)\`.
- **Triples**: Pointer-based tuples \`(op, arg1, arg2)\` referencing previous instruction indices.
- **Indirect Triples**: An instruction array of pointers into an ordered triple table.
- **Directed Acyclic Graph (DAG)**: Detects and merges identical subexpressions within basic blocks.

### In the Studio Visualizer
Toggle seamlessly between TAC listing, Quadruple matrix, Triples view, and the visual DAG tree.`,
      },
      {
        id: 'stage-5-cfg',
        title: 'Stage 5: Control Flow Graph (CFG)',
        content: `### What Happens Here
The CFG structures linear TAC into graph topology:
- **Leader Identification**: First instruction, targets of conditional/unconditional jumps, and instructions immediately following jumps become block leaders.
- **Basic Block Partitioning**: Sequences of instructions with single-entry and single-exit.
- **Edge Classification**: Fallthrough, conditional (true/false branches), and unconditional jumps.
- **Dominator & Post-Dominator Trees**: Identifies which blocks strictly dominate others.
- **Natural Loops**: Detects back-edges (\`tail -> head\` where head dominates tail) and calculates loop invariants.

### In the Studio Visualizer
Interactive node-graph visualizer showing basic blocks, colored branch edges, dominator trees, and detected natural loops.`,
      },
      {
        id: 'stage-6-dataflow',
        title: 'Stage 6: Data Flow Analysis',
        content: `### What Happens Here
Applies classical iterative bit-vector fixed-point algorithms:
- **Liveness Analysis**: Backward analysis computing \`IN[B]\` and \`OUT[B]\` sets from \`USE\` and \`DEF\` sets. Identifies which variables are live at each program point.
- **Reaching Definitions**: Forward analysis tracking where each variable definition may reach without being overwritten (\`GEN\` and \`KILL\` sets).
- **Use-Def (UD) & Def-Use (DU) Chains**: Explicit associations between definitions and their consumption points.

### In the Studio Visualizer
Interactive step-by-step iteration tables showing fixed-point convergence, live variable ranges, and definition chains.`,
      },
      {
        id: 'stage-7-optimizer',
        title: 'Stage 7: Compiler Optimizer',
        content: `### What Happens Here
Transforms IR to improve execution speed and reduce code size without altering program semantics:
- **Constant Folding**: Evaluates constant expressions at compile time (\`2 * 5 -> 10\`).
- **Algebraic Simplification**: Eliminates identity operations (\`x + 0 -> x\`, \`x * 1 -> x\`).
- **Dead Code Elimination (DCE)**: Removes instructions defining variables that are never live.
- **Common Subexpression Elimination (CSE)**: Reuses pre-computed subexpression values identified by DAG analysis.
- **Loop-Invariant Code Motion (LICM)**: Hoists invariant computations out of loop bodies.

### Studio Optimization Levels
- **O0 (None)**: Baseline unoptimized TAC.
- **O1 (Basic)**: Constant folding and algebraic simplification.
- **O2 (Full)**: Full pipeline including CSE, DCE, and loop invariant hoisting.`,
      },
      {
        id: 'stage-8-codegen',
        title: 'Stage 8: Target Code Generator & Registers',
        content: `### What Happens Here
Emits concrete assembly or bytecode for target architectures:
- **Target Emission**: Supports **MIPS Assembly**, **x86-64 AT&T Assembly**, and **Stack Bytecode**.
- **Register Allocation via Graph Coloring**: Builds an interference graph from variable live ranges. Uses Chaitin-Briggs K-coloring algorithm to assign virtual temporaries to physical machine registers (\`$t0-$t9\` for MIPS, \`%rax, %rbx, %rcx...\` for x86).
- **Spill Handling**: Variables that cannot be colored within K registers are safely spilled to stack slots.

### In the Studio Visualizer
Switch between assembly architectures, adjust physical register count K (2 to 16), and inspect the register interference graph.`,
      },
      {
        id: 'stage-9-vm',
        title: 'Stage 9: Virtual Machine Runtime',
        content: `### What Happens Here
Executes compiled bytecode inside an in-browser stack-based runtime:
- **Instruction Pointer (IP)**: Points to the current bytecode instruction.
- **Operand Stack**: Evaluates push, pop, binary math, and comparison operations.
- **Call Frame Stack**: Manages function activation records, local variable slots, and return addresses.
- **Console Output Buffer**: Collects and renders output generated by \`print(...)\` statements.

### In the Studio Visualizer
Run programs at full speed, step through instructions one-by-one, inspect the stack and frame registers, and view standard output.`,
      },
    ],
  },
  {
    id: 'cookbook',
    title: '6. Code Examples & Cookbook',
    category: 'Cookbook',
    description: 'Pre-built, thoroughly tested Deriva programs ready to run in the compiler.',
    iconName: 'FileCode',
    badge: '5 Examples',
    keywords: ['cookbook', 'examples', 'fibonacci', 'collatz', 'factorial', 'loops', 'arithmetic', 'samples'],
    subsections: [
      {
        id: 'example-arithmetic',
        title: '1. Arithmetic Optimization & CSE',
        content: `Demonstrates constant folding (\`10 + 2 * 3 -> 16\`), algebraic simplification (\`a * 1 + 0 -> a\`), and common subexpression elimination (\`(a + b)\` computed once).`,
        codeSnippet: {
          title: 'Arithmetic & Common Subexpressions',
          description: 'Constant folding, identity simplification, and DAG CSE.',
          code: `// Arithmetic optimization demonstration
var a: int = 10 + 2 * 3;
var b: int = a * 1 + 0;
var c: int = (a + b) * (a + b);
var d: int = (a + b) + 5;
print(c);
print(d);`,
        },
      },
      {
        id: 'example-loops',
        title: '2. Control Flow & Natural Loops',
        content: `Demonstrates basic block partitioning, loop-invariant code hoisting (\`factor = 2 * 5\`), and branching.`,
        codeSnippet: {
          title: 'Control Flow & Natural Loops',
          description: 'Basic blocks, leaders, and natural loop detection.',
          code: `// Loop invariant and control flow
var sum: int = 0;
var i: int = 0;
var n: int = 10;
var factor: int = 2 * 5; // Loop invariant

while (i < n) {
  sum += i * factor;
  i += 1;
}

if (sum > 100) {
  print("Sum is large: ");
  print(sum);
} else {
  print("Sum is small: ");
  print(sum);
}`,
        },
      },
      {
        id: 'example-fibonacci',
        title: '3. Recursive Fibonacci (Call Frames)',
        content: `Demonstrates function recursion, call stack frame allocation, parameter passing, and return value handling.`,
        codeSnippet: {
          title: 'Fibonacci Recursion',
          description: 'Recursive function calls and VM stack execution.',
          code: `// Recursive Fibonacci calculation
func fib(n: int): int {
  if (n <= 1) {
    return n;
  }
  return fib(n - 1) + fib(n - 2);
}

var result: int = fib(6);
print("Fibonacci(6) = ");
print(result);`,
        },
      },
      {
        id: 'example-collatz',
        title: '4. Collatz Conjecture (Hailstone)',
        content: `Computes the 3n + 1 sequence with multi-path branching and modulo arithmetic.`,
        codeSnippet: {
          title: 'Collatz Hailstone Algorithm',
          description: 'Modulo division, branching, and iterative sequence calculation.',
          code: `// Collatz 3n + 1 sequence generator
var n: int = 7;
var steps: int = 0;

print("Initial: ");
print(n);

while (n != 1) {
  if (n % 2 == 0) {
    n = n / 2;
  } else {
    n = 3 * n + 1;
  }
  steps += 1;
}

print("Total Collatz steps: ");
print(steps);`,
        },
      },
      {
        id: 'example-factorial',
        title: '5. Iterative Factorial & Dataflow',
        content: `Iterative factorial computation designed to inspect reaching definitions, def-use chains, and register allocation.`,
        codeSnippet: {
          title: 'Factorial & Live Variables',
          description: 'Iterative multiplication with live range analysis.',
          code: `// Factorial with live ranges and dataflow
var num: int = 5;
var fact: int = 1;
var counter: int = 1;

while (counter <= num) {
  fact *= counter;
  counter += 1;
}

print("Factorial: ");
print(fact);`,
        },
      },
    ],
  },
  {
    id: 'diagnostics-guide',
    title: '7. Diagnostics & Error Troubleshooting',
    category: 'Diagnostics',
    description: 'Understanding compiler error messages, severity levels, and how to fix common issues.',
    iconName: 'AlertCircle',
    badge: 'Help',
    keywords: ['errors', 'diagnostics', 'troubleshooting', 'type mismatch', 'undeclared', 'syntax error', 'fix'],
    subsections: [
      {
        id: 'diagnostic-phases',
        title: 'Diagnostic Phases & Severities',
        content: `DERIVA diagnostics are tagged with the specific compiler phase that detected the issue:

- **Lexical**: Invalid characters, unterminated string literals, unterminated block comments.
- **Syntax**: Missing semicolons, unmatched parentheses/braces, malformed statements.
- **Semantic**: Type mismatches, undeclared identifiers, invalid return statements, argument count mismatches.
- **Runtime**: Division by zero, stack overflow, illegal VM instructions.

### Severity Levels
- **Error**: Halts downstream stages. Prevents target code generation and VM execution.
- **Warning**: Non-fatal issue (e.g. unused declared variable). Compilation succeeds.
- **Info**: Informational notices regarding optimization opportunities.`,
      },
      {
        id: 'common-errors-table',
        title: 'Common Errors and Solutions',
        content: `Below is a catalog of frequent compiler errors and their direct resolutions:`,
        tables: [
          {
            caption: 'Compiler Diagnostics Troubleshooting Matrix',
            headers: ['Error Message', 'Phase', 'Root Cause', 'Recommended Solution'],
            rows: [
              [
                "Expected ';' after variable declaration",
                'Syntax',
                'Omitted statement terminator semicolon',
                'Add \`;\` at the end of the line (e.g. \`var x: int = 10;\`).',
              ],
              [
                "Undeclared identifier 'x'",
                'Semantic',
                'Variable or function name used before declaration or out of scope',
                'Declare the variable using \`var x: int = ...;\` prior to usage.',
              ],
              [
                "Type mismatch in variable declaration. Expected 'int', found 'string'",
                'Semantic',
                'Attempting to assign a string literal to an integer variable',
                'Change variable type to \`string\` or provide an integer value.',
              ],
              [
                "Condition of 'if' statement must be boolean, got 'int'",
                'Semantic',
                "Non-boolean expression used in 'if' condition (Deriva has no truthy/falsy coercion)",
                "Use an explicit comparison operator (e.g. \`if (x != 0)\` instead of \`if (x)\`).",
              ],
              [
                "'return' statement outside of function definition",
                'Semantic',
                "'return' keyword placed at global scope outside any 'func' body",
                'Wrap the code in a function or remove the return statement.',
              ],
              [
                "Function 'foo' expects 2 argument(s), but was called with 1",
                'Semantic',
                'Incorrect number of arguments in function call',
                'Pass all required typed arguments matching the function signature.',
              ],
              [
                "Variable 'x' is declared but its value is never read",
                'Semantic (Warning)',
                'Variable initialized or declared but never referenced in any expression',
                'Use the variable, remove it, or ignore the warning.',
              ],
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'studio-ide-guide',
    title: '8. Studio IDE Workspace & Shortcuts',
    category: 'IDE & Tools',
    description: 'Mastering docking layouts, panel resizing, drag-and-drop, theme selection, and keyboard shortcuts.',
    iconName: 'Layout',
    badge: 'Tools',
    keywords: ['ide', 'shortcuts', 'docking', 'layout', 'themes', 'workspace', 'registers', 'optimizer'],
    subsections: [
      {
        id: 'workspace-docking',
        title: 'Docking Presets & Layout Customization',
        content: `DERIVA Compiler Studio features a flexible multi-panel IDE workspace:

- **VS Code Default**: Left split with Editor and Diagnostics stacked vertically; Right side hosts the Stage Visualizer.
- **Bottom Terminal Dock**: Top split with Editor on the left and Visualizer on the right; Bottom hosts full-width Diagnostics.
- **Unity 3-Column**: Column 1: Editor; Column 2: Diagnostics; Column 3: Visualizer.
- **Visualizer First**: Stage visualizer takes prominent left position; Editor and Diagnostics placed on the right.

### Drag & Drop Panels
Click and drag any panel header tab to swap positions between slots seamlessly!`,
      },
      {
        id: 'keyboard-shortcuts',
        title: 'Keyboard Shortcuts Reference',
        content: `Accelerate your compiler workflow with keyboard shortcuts:`,
        tables: [
          {
            caption: 'Studio Keyboard Shortcuts',
            headers: ['Shortcut', 'Action', 'Scope'],
            rows: [
              ['Ctrl + B / Cmd + B', 'Toggle Left Project Explorer Sidebar', 'Global'],
              ['Escape', 'Exit Maximized Panel / Close User Guide Modal', 'Global'],
              ['Ctrl + Enter / Cmd + Enter', 'Trigger Instant Manual Compilation', 'Code Editor'],
              ['Alt + Click (on Error)', 'Jump directly to source line and column', 'Diagnostics'],
            ],
          },
        ],
      },
      {
        id: 'compiler-controls',
        title: 'Optimizer & Register Allocation Controls',
        content: `The top studio header provides live controls to benchmark compiler optimizations:

- **Optimization Level Selector**:
  - \`O0\`: Raw TAC with no optimizations applied.
  - \`O1\`: Basic optimizations (Constant Folding, Algebraic Simplification).
  - \`O2\`: Full optimizations (CSE, Dead Code Elimination, Loop Invariant Hoisting).
- **Physical Register Count (K)**:
  - Configure K between \`2\` and \`16\` physical registers.
  - Decreasing K forces graph coloring spills; observe how stack push/pop instructions increase in the Codegen stage!`,
      },
    ],
  },
];
