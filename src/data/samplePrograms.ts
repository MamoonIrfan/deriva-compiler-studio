export interface SampleProgram {
  id: string;
  name: string;
  category: 'Basics' | 'Control Flow' | 'Functions' | 'Algorithms' | 'Grammar Studies';
  description: string;
  code: string;
}

export const SAMPLE_PROGRAMS: SampleProgram[] = [
  {
    id: 'arithmetic-optimization',
    name: 'Arithmetic & Common Subexpressions',
    category: 'Basics',
    description: 'Demonstrates constant folding, algebraic simplification (x*1, x+0), and common subexpression elimination in DAG.',
    code: `// Arithmetic optimization demonstration
var a: int = 10 + 2 * 3;
var b: int = a * 1 + 0;
var c: int = (a + b) * (a + b);
var d: int = (a + b) + 5;
print(c);
print(d);`,
  },
  {
    id: 'control-flow-loops',
    name: 'Control Flow & Natural Loops',
    category: 'Control Flow',
    description: 'Shows basic block partitioning, leaders, dominator trees, and natural loop detection with back-edges.',
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
  {
    id: 'fibonacci-recursive',
    name: 'Fibonacci (Recursion & Call Frames)',
    category: 'Functions',
    description: 'Tests function scoping, parameter passing, return value propagation, and virtual machine call stack frames.',
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
  {
    id: 'collatz-conjecture',
    name: 'Collatz Conjecture (Hailstone)',
    category: 'Algorithms',
    description: 'Calculates the 3n + 1 sequence until reaching 1, with multi-path branching and loop iterations.',
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
  {
    id: 'factorial-iterative',
    name: 'Factorial & Live Variables',
    category: 'Algorithms',
    description: 'Iterative factorial computation to inspect reaching definitions, def-use chains, and register graph coloring.',
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
];
