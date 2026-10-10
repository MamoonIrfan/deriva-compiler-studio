[README.md](https://github.com/user-attachments/files/33277204/README.md)
<div align="center">

# DERIVA
### Compiler Studio

**An interactive, browser-based environment for exploring automata theory and the complete compiler construction pipeline.**

[**Live Application**](https://novacompiler-studio.ai.studio) · [Features](#features) · [Getting Started](#getting-started) · [Compiler Pipeline](#compiler-pipeline)

</div>

---

## Overview

**DERIVA Compiler Studio** is an educational compiler IDE that makes formal-language and compiler-construction concepts inspectable and interactive. Instead of stopping at a static diagram or an explanation, DERIVA lets learners explore automata, inspect intermediate representations, follow analyses, and execute programs in a browser-based workspace.

The studio includes an automata visualization lab and a multi-stage compiler for its custom teaching language, **Deriva**, using the **`.dev`** source-file extension.

> **Scope:** DERIVA is an educational compiler construction environment, not a general-purpose compiler for C++, Python, or other external languages. Files in other languages may be kept as references in the workspace but are not compiled by DERIVA's native pipeline.

## Features

### Interactive Automata Lab

- Construct an **ε-NFA** from a regular expression using **Thompson's construction**.
- Convert the ε-NFA into a **DFA** through **subset construction**.
- Minimize a DFA using **Hopcroft's algorithm**.
- Inspect state-transition diagrams and transition tables.
- Step through construction processes and simulate input strings with visual state/transition highlighting.
- Explore accepted and rejected inputs rather than relying on static diagrams alone.

### Compiler Construction Workspace

- **Lexical analysis:** Tokens, scanning, and automata-based exploration.
- **Syntax analysis:** Recursive-descent parsing, syntax trees, grammar sets, and educational LL/LR parsing views.
- **Semantic analysis:** Scope and symbol-table inspection, type checks, and syntax-directed concepts.
- **Intermediate representation:** Three-address code (TAC), quadruples, triples, and DAGs.
- **Control-flow analysis:** Basic blocks, control-flow graphs, dominators, postdominators, and loops.
- **Data-flow analysis:** Live variables, reaching definitions, available/very busy expressions, and use-definition relationships.
- **Optimization:** Inspect transformations such as constant folding, common subexpression elimination, dead-code elimination, and loop-related optimization.
- **Code generation:** Explore target representations including MIPS, x86, WebAssembly, and bytecode.
- **Execution:** Run and inspect programs through an integrated virtual-machine workflow.

### IDE Experience

- Browser-based code editor and project/file explorer.
- Multiple source files, tabs, and workspace organization.
- Resizable, dockable analysis panels.
- Diagnostics, compiler output, and execution traces.
- Interactive graphs, tables, and construction controls.
- Theme support and responsive workspace layouts.
- Project import/export and workspace persistence.

## Compiler Pipeline

```text
Deriva Source (.dev)
        |
        v
  1. Lexical Analysis
        |
        v
  2. Syntax Analysis
        |
        v
  3. Semantic Analysis
        |
        v
  4. Intermediate Code Generation
        |
        v
  5. Control-Flow Analysis
        |
        v
  6. Data-Flow Analysis
        |
        v
  7. Code Optimization
        |
        v
  8. Code Generation
        |
        v
  9. Virtual Machine / Execution
```

The **Automata Lab** complements this pipeline by exposing the underlying formal-language algorithms, including regular-expression construction, NFA-to-DFA conversion, minimization, and simulation.

## Example: Automata Construction

For the regular expression:

```regex
(a|b)*abb
```

DERIVA can be used to explore the corresponding ε-NFA, DFA, minimized DFA, and state transitions. The expression denotes strings over `{a, b}` that **end in `abb`**.

| Input | Expected result |
|---|---|
| `aabb` | Accepted |
| `babb` | Accepted |
| `abab` | Rejected |
| `abba` | Rejected |

## Example: Deriva Source

Create a file named `main.dev`:

```text
var x: int = 10;
var y: int = 20;
var sum: int = x + y;

if (sum > 20) {
    print(sum);
} else {
    print(0);
}

var i: int = 0;
while (i < 3) {
    print(i);
    i = i + 1;
}
```

Use the IDE to compile the program, inspect the compiler stages, and explore its execution.

## Technology Stack

| Area | Technology / approach |
|---|---|
| Frontend | React, TypeScript |
| Build tooling | Vite |
| Styling | Tailwind CSS |
| Compiler | Custom TypeScript implementation |
| Parsing | Recursive-descent parsing and educational parsing visualizations |
| Automata | Thompson construction, subset construction, Hopcroft minimization |
| Visualization | Interactive browser-based diagrams and analysis views |
| Runtime | Integrated educational virtual machine |

## Getting Started

### Use Online

Open the [live application](https://novacompiler-studio.ai.studio) in your browser.

### Run Locally

**Prerequisites:** A current Node.js LTS release and npm.

```bash
git clone https://github.com/YOUR_USERNAME/deriva-compiler-studio.git
cd deriva-compiler-studio
npm install
npm run dev
```

Open the local address printed by Vite (typically `http://localhost:5173`).

To create a production build:

```bash
npm run build
```

> Replace `YOUR_USERNAME` with the repository owner's GitHub username. If the exported project uses a different package manager or script names, follow its `package.json` instead.

## How to Explore DERIVA

1. Open the **Automata Lab** and enter a regular expression.
2. Inspect the ε-NFA, DFA, and minimized DFA, including construction steps and transition tables.
3. Enter a test string and follow its transitions through the automaton.
4. Create or open a **`.dev`** file in the editor.
5. Compile the program and inspect the lexer, parser, semantic, and intermediate-code stages.
6. Continue through control flow, data flow, optimization, code generation, and VM execution.

## Educational Focus

DERIVA is designed to help students connect **Theory of Automata** with **Compiler Construction** through interactive, inspectable algorithms and representations. Its primary goal is to make concepts easier to investigate, debug, and understand—not to replace formal proofs, textbooks, or production compilers.

## Screenshots and Demo

Screenshots and a walkthrough video can be added here after the public launch.

<!-- Example after adding an image to the repository:
![DERIVA Compiler Studio overview](docs/images/deriva-overview.png)
-->

## Contributing

Issues, bug reports, suggestions, and educational improvements are welcome. When reporting a problem, include reproduction steps, expected behavior, actual behavior, and relevant screenshots if possible.

## License

**License not yet specified.** Please add a `LICENSE` file if you intend to grant others permission to use, modify, or redistribute the source code. A public GitHub repository does not automatically make a project open source.

---

<div align="center">

**DERIVA Compiler Studio**  
*From formal languages to executable code.*

</div>
